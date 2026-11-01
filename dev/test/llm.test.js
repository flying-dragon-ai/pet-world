import test from 'node:test';
import assert from 'node:assert/strict';

import {
  chat, refuse, setLlmBackend, getLlmBackend, isLlmFailure,
  makeSseBackend, LLM_CODES, DEFAULT_TIMEOUT_MS,
} from '../../src/app/llm.js';

/** 每个用例结束都把后端还原成默认的本地演示后端 */
function withBackend(fn, t) {
  t.after(() => setLlmBackend(null));
  setLlmBackend(fn);
}

/** 造一个可读流：把若干段字符串按顺序喂进去 */
function streamOf(chunks, opts) {
  const enc = new TextEncoder();
  const o = opts || {};
  return new ReadableStream({
    start(c) {
      for (const s of chunks) c.enqueue(enc.encode(s));
      if (!o.hold) c.close();
    },
  });
}

/** 假 fetch：返回一个 SSE 流 */
function fakeFetch(chunks, opts) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, body: streamOf(chunks, opts) };
  };
  fn.calls = calls;
  return fn;
}

const SSE = 'data: ';

test('出口契约：错误码全集固定为四个，refuse 不流式', () => {
  assert.deepEqual(LLM_CODES, ['timeout', 'aborted', 'upstream', 'parse']);
  assert.deepEqual(refuse('不提供剂量'), { text: '不提供剂量', stopped: false });
  assert.equal(isLlmFailure({ ok: false, code: 'timeout' }), true);
  assert.equal(isLlmFailure({ text: 'x', stopped: false }), false);
  assert.equal(isLlmFailure(null), false);
});

test('默认后端是本地演示后端，setLlmBackend 能换掉也能还原', (t) => {
  t.after(() => setLlmBackend(null));
  setLlmBackend(null);
  const local = getLlmBackend();
  assert.equal(typeof local, 'function');

  const mine = async () => ({ text: 'ok', stopped: false });
  setLlmBackend(mine);
  assert.equal(getLlmBackend(), mine);
  setLlmBackend('不是函数');
  assert.equal(getLlmBackend(), local, '非函数参数视为还原默认后端');
});

test('超时归一：后端永挂也一定返回 code:timeout', async (t) => {
  let deltas = 0;
  withBackend(() => new Promise(() => { /* 永不 resolve，也不理会 signal */ }), t);
  const t0 = Date.now();
  const res = await chat({
    question: 'q', scene: 'ask', timeoutMs: 40,
    onDelta: () => { deltas += 1; },
  });
  assert.equal(isLlmFailure(res), true);
  assert.equal(res.code, 'timeout');
  assert.equal(res.reason, 'timeout');
  assert.equal(res.stopped, true);
  assert.equal(res.text, '');
  assert.equal(deltas, 0);
  assert.ok(Date.now() - t0 < 2000, '不能等满后端自己挂多久');
});

test('超时归一：后端守着 signal 主动 return 也算 timeout，不算 aborted', async (t) => {
  withBackend(({ signal, onDelta }) => new Promise((resolve) => {
    onDelta('已吐一半');
    signal.addEventListener('abort', () => resolve({ text: '已吐一半', stopped: true, reason: 'aborted' }));
  }), t);
  const res = await chat({ question: 'q', scene: 'ask', timeoutMs: 30, onDelta: () => {} });
  assert.equal(res.code, 'timeout');
  assert.equal(res.reason, 'timeout');
});

test('中断：用户 abort 后 reason/code 都是 aborted，迟到的增量不再外泄', async (t) => {
  let late = 0;
  withBackend(({ signal, onDelta }) => new Promise((resolve) => {
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      onDelta('第' + n + '段');
      if (n === 1) ac.abort();
    }, 6);
    signal.addEventListener('abort', () => {
      clearInterval(timer);
      // 故意在 abort 之后再多吐两次（真实后端收尾时常见）
      onDelta('迟到1');
      onDelta('迟到2');
      resolve({ text: '第1段', stopped: true, reason: 'aborted' });
    });
  }), t);

  const ac = new AbortController();
  const seen = [];
  const res = await chat({
    question: 'q', scene: 'ask', signal: ac.signal,
    onDelta: (x) => { seen.push(x); if (x.indexOf('迟到') === 0) late += 1; },
  });
  assert.equal(ac.signal.aborted, true);
  assert.equal(res.code, 'aborted');
  assert.equal(res.reason, 'aborted');
  assert.equal(res.stopped, true);
  assert.equal(late, 0, 'abort 之后的 onDelta 必须被吃掉');
  assert.deepEqual(seen, ['第1段']);
});

test('重试：可重试错误重试一次并最终成功', async (t) => {
  let n = 0;
  withBackend(async ({ onDelta }) => {
    n += 1;
    if (n === 1) return { ok: false, code: 'upstream', message: '上游 502' };
    onDelta('恢复了');
    return { text: '恢复了', stopped: false };
  }, t);
  const res = await chat({ question: 'q', scene: 'ask', retries: 1, onDelta: () => {} });
  assert.equal(n, 2);
  assert.equal(res.text, '恢复了');
  assert.equal(isLlmFailure(res), false);
});

test('重试：最多只重试 retries 次，不会无限循环', async (t) => {
  let n = 0;
  withBackend(async () => { n += 1; return { ok: false, code: 'upstream', message: '一直 500' }; }, t);
  const res = await chat({ question: 'q', scene: 'ask', retries: 1 });
  assert.equal(n, 2, 'retries:1 = 首次 + 1 次重试');
  assert.equal(res.code, 'upstream');

  n = 0;
  const res0 = await chat({ question: 'q', scene: 'ask' });
  assert.equal(n, 1, '默认不重试（向后兼容）');
  assert.equal(res0.code, 'upstream');
});

test('重试：已经吐过字就不再重试（否则文本会重复）', async (t) => {
  let n = 0;
  withBackend(async ({ onDelta }) => {
    n += 1;
    onDelta('半截话');
    return { ok: false, code: 'upstream', message: '吐到一半断了' };
  }, t);
  const res = await chat({ question: 'q', scene: 'ask', retries: 3, onDelta: () => {} });
  assert.equal(n, 1);
  assert.equal(res.code, 'upstream');
  assert.equal(res.text, '半截话');
});

test('重试：aborted / parse 不重试', async (t) => {
  let n = 0;
  withBackend(async () => { n += 1; return { ok: false, code: 'parse', message: '不是 JSON' }; }, t);
  await chat({ question: 'q', scene: 'ask', retries: 3 });
  assert.equal(n, 1);
});

test('重试：后端抛异常归一为 upstream', async (t) => {
  withBackend(async () => { throw new Error('boom'); }, t);
  const res = await chat({ question: 'q', scene: 'ask' });
  assert.equal(res.code, 'upstream');
  assert.ok(res.message.indexOf('boom') >= 0);
});

test('正常返回：仍是 {text, stopped, reason}，不带 ok/code', async (t) => {
  withBackend(async ({ onDelta }) => {
    onDelta('一');
    onDelta('一二');
    return { text: '一二', stopped: false };
  }, t);
  const res = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.deepEqual(res, { text: '一二', stopped: false, reason: undefined });
  assert.equal('ok' in res, false);
  assert.equal('code' in res, false);
});

/* ---------------- SSE 后端 ---------------- */

test('SSE：分帧顺序、累计文本、[DONE] 收尾', async (t) => {
  t.after(() => setLlmBackend(null));
  const fetchImpl = fakeFetch([
    SSE + '{"choices":[{"delta":{"content":"你好"}}]}\n\n',
    SSE + '{"choices":[{"delta":{"content":"，我是"}}]}\n\n',
    SSE + '{"choices":[{"delta":{"content":"助手"}}]}\n\ndata: [DONE]\n\n',
    SSE + '{"choices":[{"delta":{"content":"这段不该被读到"}}]}\n\n',
  ]);
  setLlmBackend(makeSseBackend({ endpoint: '/api/chat', fetchImpl, timeoutMs: 0 }));
  const seen = [];
  const res = await chat({
    question: '在吗', scene: 'ask', prompt: 'SYSTEM',
    onDelta: (x) => seen.push(x),
  });
  assert.deepEqual(seen, ['你好', '你好，我是', '你好，我是助手'], 'onDelta 收到的是累计文本，顺序稳定');
  assert.equal(res.text, '你好，我是助手');
  assert.equal(res.stopped, false);
  assert.equal(fetchImpl.calls.length, 1);
  const body = JSON.parse(fetchImpl.calls[0].init.body);
  assert.equal(body.stream, true);
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[0].content, 'SYSTEM');
  assert.equal(body.messages[1].role, 'user');
});

test('SSE：上游 500 归一为 code:upstream', async (t) => {
  t.after(() => setLlmBackend(null));
  const fetchImpl = async () => ({ ok: false, status: 500, body: null });
  setLlmBackend(makeSseBackend({ endpoint: '/api/chat', fetchImpl }));
  const res = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.equal(res.code, 'upstream');
  assert.ok(res.message.indexOf('500') >= 0);
});

test('SSE：abort 中途中断，已生成的部分保留在 text 里', async (t) => {
  t.after(() => setLlmBackend(null));
  // hold = 不主动关流，模拟还在持续输出的上游
  const fetchImpl = fakeFetch([
    SSE + '{"choices":[{"delta":{"content":"A"}}]}\n\n',
    SSE + '{"choices":[{"delta":{"content":"B"}}]}\n\n',
  ], { hold: true });
  setLlmBackend(makeSseBackend({ endpoint: '/api/chat', fetchImpl }));
  const ac = new AbortController();
  let first = false;
  const res = await chat({
    question: 'q', scene: 'ask', signal: ac.signal,
    onDelta: () => { if (!first) { first = true; ac.abort(); } },
  });
  assert.equal(res.code, 'aborted');
  assert.equal(res.reason, 'aborted');
  assert.equal(res.text, 'A');
});

test('SSE：分帧不是合法 JSON → code:parse', async (t) => {
  t.after(() => setLlmBackend(null));
  const fetchImpl = fakeFetch([SSE + '{这不是 JSON\n\n']);
  setLlmBackend(makeSseBackend({ endpoint: '/api/chat', fetchImpl }));
  const res = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.equal(res.code, 'parse');
});

test('SSE：没配 endpoint / 没 fetch 都给出明确错误码', async (t) => {
  t.after(() => setLlmBackend(null));
  setLlmBackend(makeSseBackend({ endpoint: '' }));
  const a = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.equal(a.code, 'parse');

  setLlmBackend(makeSseBackend({ endpoint: '/api/chat', fetchImpl: null }));
  const b = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.equal(b.code, 'upstream');
});

test('SSE：网络异常归一为 upstream', async (t) => {
  t.after(() => setLlmBackend(null));
  setLlmBackend(makeSseBackend({
    endpoint: '/api/chat',
    fetchImpl: async () => { throw new Error('ECONNREFUSED'); },
  }));
  const res = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.equal(res.code, 'upstream');
  assert.ok(res.message.indexOf('ECONNREFUSED') >= 0);
});

test('SSE：没有 body.getReader 时退化成整包解析', async (t) => {
  t.after(() => setLlmBackend(null));
  const whole = SSE + '{"choices":[{"delta":{"content":"整"}}]}\n\n' +
    SSE + '{"choices":[{"delta":{"content":"包"}}]}\n\ndata: [DONE]\n\n';
  setLlmBackend(makeSseBackend({ endpoint: '/api/chat', fetchImpl: async () => ({ ok: true, status: 200, text: whole }) }));
  const res = await chat({ question: 'q', scene: 'ask', onDelta: () => {} });
  assert.equal(res.text, '整包');
});

test('默认超时常量是个正整数（视图不传也有一层兜底）', () => {
  assert.ok(Number.isInteger(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0);
});
