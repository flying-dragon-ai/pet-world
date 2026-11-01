/**
 * AI 出口（端口层）—— 全项目**唯一**允许调用模型的地方。
 *
 * 三层职责分清楚：
 *   1. 默认后端 = 本地演示语料（离线、零配置、结果可复现）；
 *   2. setLlmBackend(fn) 装真后端，视图层（src/views/ai.js）一行都不用改；
 *   3. makeSseBackend() 是给「真 HTTP + SSE」现成拼好的后端工厂（可注入 fetchImpl，能单测）。
 *
 * 后端函数约定：
 *   async ({pet, question, scene, prompt, messages, onDelta, signal}) => 结果
 *   - onDelta(text)：每产出一段就调一次，传的是**到目前为止的完整文本**（不是增量切片的拼装，
 *     视图直接整体赋值即可 —— 本地演示后端一直是这个语义，SSE 后端也归一成这个语义）
 *   - signal：AbortSignal。用户点「停止生成」/ 超时 都会 abort，后端要尽快 return
 *
 * 结果只有两种形状（视图据此收尾）：
 *   成功 {text, stopped, reason?}
 *   失败 {ok:false, code:'timeout'|'aborted'|'upstream'|'parse', message, text?, stopped, reason}
 *   —— code 是给视图看的唯一判据，不要用 message 做分支。
 *
 * ⚠️ 真接 API 时的安全底线：**API Key 不能进前端**（浏览器里的任何东西对用户都是明文）。
 *    前端直连上游 = 把 Key 发给所有用户。生产必须走自己的服务端代理（Worker / 边缘函数），
 *    由代理注入 Key，前端只认自己的域名。
 */
import { localAnswer } from '../domain/ai-local.js';
import { isEmergency } from '../domain/ai-prompt.js';
import { createParser } from '../vendor/eventsource-parser.js';

/** 错误码全集（视图只认这四个） */
export const LLM_CODES = ['timeout', 'aborted', 'upstream', 'parse'];

/** 只有这两种「还没吐过字」才值得重试；parse 是内容形态问题，aborted 是用户意图 */
const RETRYABLE = { upstream: true, timeout: true };

/** 默认超时：本地演示后端逐字吐完大约 5-8 秒，30s 留足余量 */
export const DEFAULT_TIMEOUT_MS = 30000;

/** 自定义后端（null = 用本地演示后端） */
let backend = null;

/** 装上真模型后端 */
export function setLlmBackend(fn) {
  backend = typeof fn === 'function' ? fn : null;
}

/** 当前生效的后端 */
export function getLlmBackend() {
  return backend || localBackend;
}

/** 构造一个归一化的失败结果 */
function fail(code, message, extra) {
  return Object.assign({
    ok: false,
    code: LLM_CODES.indexOf(code) >= 0 ? code : 'upstream',
    message: String(message || ''),
    text: '',
    stopped: true,
    reason: code,
  }, extra || {});
}

/** 是否是 llm.chat 的失败结果（视图的收尾分支判据） */
export function isLlmFailure(res) {
  return !!(res && res.ok === false && res.code);
}

/** 可中断的等待 */
function sleep(ms, signal) {
  return new Promise((resolve) => {
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      if (signal) signal.removeEventListener('abort', done);
      resolve();
    }
    if (signal) {
      if (signal.aborted) { done(); return; }
      signal.addEventListener('abort', done);
    }
  });
}

/**
 * 本地演示后端：算出整段答复，再按打字机节奏吐出来。
 * 急症场景下会在中途「被打断」（模拟模型输出被截断），由视图弹急诊引导。
 */
async function localBackend({ pet, question, scene, onDelta, signal }) {
  const full = localAnswer(pet, question, scene);
  const cutAt = isEmergency(question) ? Math.floor(full.length * 0.18) : -1;
  let i = 0;
  while (i < full.length) {
    if (signal && signal.aborted) return { text: full.slice(0, i), stopped: true, reason: 'aborted' };
    if (cutAt > 0 && i >= cutAt) {
      onDelta(full.slice(0, cutAt));
      return { text: full.slice(0, cutAt), stopped: true, reason: 'emergency' };
    }
    i += 1 + Math.floor(Math.random() * 2);
    onDelta(full.slice(0, Math.min(i, full.length)));
    await sleep(26, signal);
  }
  return { text: full, stopped: false };
}

/**
 * 跑一次（不重试），把「超时 / 中断 / 上游报错 / 解析失败」统一成错误码。
 *
 * 为什么要 Promise.race 而不是只靠 signal：真实 fetch 会响应 signal，但任何不守规矩的后端
 * （包括本地演示后端卡在 await 里）都会让 await 永挂。race 保证 chat() 一定有结果返回。
 */
async function runAttempt(opt, timeoutMs) {
  const be = getLlmBackend();
  const ext = opt.signal || null;
  const ctl = new AbortController();
  let dead = false;
  let timedOut = false;
  let emitted = 0;
  let timer = null;
  let resolveTimeout = null;
  let resolveAbort = null;
  let onExt = null;
  let lastText = '';
  const waiters = [];

  const kill = () => { dead = true; ctl.abort(); };

  if (ext) {
    waiters.push(new Promise((r) => { resolveAbort = r; }));
    onExt = () => { kill(); resolveAbort('aborted'); };
    if (ext.aborted) { kill(); resolveAbort('aborted'); }
    else ext.addEventListener('abort', onExt);
  }
  if (timeoutMs > 0) {
    waiters.push(new Promise((r) => { resolveTimeout = r; }));
    timer = setTimeout(() => {
      timedOut = true;
      kill();
      resolveTimeout('timeout');
    }, timeoutMs);
  }

  const cleanup = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (ext && onExt) ext.removeEventListener('abort', onExt);
    onExt = null;
  };

  // 后端拿到的是归一化后的 onDelta：超时/中断之后迟到的增量一律丢掉
  // lastText 是失败时的「已生成部分」——视图因此可以不记状态地决定保留多少
  const onDelta = (text) => {
    if (dead) return;
    emitted += 1;
    lastText = String(text == null ? '' : text);
    if (typeof opt.onDelta === 'function') opt.onDelta(lastText);
  };

  let outcome;
  try {
    const call = Promise.resolve().then(() => be({
      pet: opt.pet === undefined ? null : opt.pet,
      question: String(opt.question || ''),
      scene: String(opt.scene || 'ask'),
      prompt: String(opt.prompt || ''),
      messages: Array.isArray(opt.messages) ? opt.messages : [],
      onDelta,
      signal: ctl.signal,
    }));
    outcome = waiters.length ? await Promise.race([call].concat(waiters)) : await call;
  } catch (e) {
    cleanup();
    if (timedOut) return fail('timeout', '模型响应超时（' + timeoutMs + 'ms）', { emitted, text: lastText });
    if (ctl.signal.aborted) return fail('aborted', '已取消生成', { emitted, text: lastText });
    return fail('upstream', '后端抛错：' + (e && e.message ? e.message : e), { emitted, text: lastText });
  }
  cleanup();

  if (outcome === 'timeout' || outcome === 'aborted') {
    return timedOut
      ? fail('timeout', '模型响应超时（' + timeoutMs + 'ms）', { emitted, text: lastText })
      : fail('aborted', '已取消生成', { emitted, text: lastText });
  }
  // 后端自己也会返回错误对象（比如 SSE 后端的上游 5xx），原样透传
  if (outcome && outcome.ok === false) {
    return fail(outcome.code, outcome.message, { emitted, text: outcome.text || lastText });
  }
  if (timedOut) return fail('timeout', '模型响应超时（' + timeoutMs + 'ms）', { emitted, text: lastText });
  if (ctl.signal.aborted) {
    return fail('aborted', '已取消生成', { emitted, text: String((outcome && outcome.text) || lastText) });
  }

  return {
    text: String((outcome && outcome.text) || ''),
    stopped: !!(outcome && outcome.stopped),
    reason: outcome ? outcome.reason : undefined,
  };
}

/**
 * 统一的流式对话出口（向后兼容：老调用方只传 pet/question/scene/onDelta/signal 照旧能跑）。
 * @param {{pet?: object|null, question: string, scene: string, prompt?: string,
 *          messages?: Array, onDelta: (text: string) => void, signal?: AbortSignal,
 *          timeoutMs?: number, retries?: number}} input
 * @returns {Promise<{text: string, stopped: boolean, reason?: string}
 *                  | {ok: false, code: string, message: string}>}
 */
export async function chat(input) {
  const opt = Object.assign({}, input || {});
  const timeoutMs = opt.timeoutMs === undefined ? DEFAULT_TIMEOUT_MS : Math.max(0, Number(opt.timeoutMs) || 0);
  const retries = Math.max(0, Math.floor(Number(opt.retries) || 0));
  const ext = opt.signal || null;

  let res = null;
  for (let attempt = 0; ; attempt += 1) {
    res = await runAttempt(opt, timeoutMs);
    const emitted = res.emitted || 0;
    if (res.ok !== false) return res;
    // 重试的三条铁律：错误可重试 / 还没吐过字（否则文本会重复）/ 没被用户中断 / 还有次数
    const canRetry = RETRYABLE[res.code] && !emitted && !(ext && ext.aborted) && attempt < retries;
    if (!canRetry) break;
  }
  const out = Object.assign({}, res);
  delete out.emitted;
  return out;
}

/** 拒答类回复不走流式，直接给一句 */
export function refuse(text) {
  return { text, stopped: false };
}

/* ------------------------------------------------------------------ *
 * 真 HTTP 后端（OpenAI 兼容 /chat/completions + SSE）
 * ------------------------------------------------------------------ */

/** 从一帧 JSON 里取出文本片段：兼容 OpenAI / Anthropic / 简化版三种写法 */
function chunkText(obj) {
  if (!obj || typeof obj !== 'object') return '';
  const c = obj.choices && obj.choices[0];
  if (c) {
    if (c.delta && typeof c.delta.content === 'string') return c.delta.content;
    if (c.message && typeof c.message.content === 'string') return c.message.content;
    if (typeof c.text === 'string') return c.text;
  }
  if (obj.delta && typeof obj.delta.text === 'string') return obj.delta.text;
  if (typeof obj.text === 'string') return obj.text;
  return '';
}

/**
 * 造一个走 SSE 的真后端。
 *
 * 注意：**纯前端直连上游会把 Key 暴露给所有用户**。这里的 endpoint 应当指向你自己的服务端
 * 代理（由代理注入 Key），而不是 api.openai.com 之类的上游域名。
 *
 * @param {{endpoint: string, fetchImpl?: Function, headers?: object, model?: string,
 *          body?: object, timeoutMs?: number}} opts
 * @returns {(input: object) => Promise<object>} 符合后端约定的函数
 */
export function makeSseBackend(opts) {
  const o = opts || {};
  const endpoint = String(o.endpoint || '');
  const fetchImpl = o.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  const headers = Object.assign({ 'Content-Type': 'application/json' }, o.headers || {});
  const extraBody = o.body || {};
  const model = o.model;
  const timeoutMs = Math.max(0, Number(o.timeoutMs) || 0);

  return async function sseBackend({ prompt, messages, question, onDelta, signal }) {
    if (!endpoint) return fail('parse', 'SSE 后端未配置 endpoint');
    if (typeof fetchImpl !== 'function') return fail('upstream', '当前环境没有 fetch');

    const msgs = (Array.isArray(messages) && messages.length)
      ? messages
      : [{ role: 'system', content: String(prompt || '') }, { role: 'user', content: String(question || '') }];
    const body = Object.assign({ stream: true, messages: msgs }, model ? { model } : {}, extraBody);

    // 后端自己的超时（chat() 那层还有一个兜底 race，这里是给直接调后端的人用的）
    const local = new AbortController();
    let ownTimer = null;
    if (timeoutMs > 0) ownTimer = setTimeout(() => local.abort(), timeoutMs);
    const onOuterAbort = () => local.abort();
    if (signal) {
      if (signal.aborted) local.abort();
      else signal.addEventListener('abort', onOuterAbort);
    }
    const done = () => {
      if (ownTimer) clearTimeout(ownTimer);
      if (signal) signal.removeEventListener('abort', onOuterAbort);
    };

    let res;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: local.signal,
      });
    } catch (e) {
      done();
      if (local.signal.aborted) return fail('aborted', '已取消生成');
      return fail('upstream', '网络错误：' + (e && e.message ? e.message : e));
    }

    if (!res || res.ok === false) {
      done();
      return fail('upstream', '上游返回 ' + ((res && res.status) || 0));
    }

    let text = '';
    let bad = '';
    let sawDone = false;
    const emit = () => { if (typeof onDelta === 'function') onDelta(text); };

    const parser = createParser({
      onEvent: (ev) => {
        const d = ev && ev.data;
        if (!d) return;
        if (d === '[DONE]') { sawDone = true; return; }
        let obj;
        try {
          obj = JSON.parse(d);
        } catch (e) {
          bad = bad || '上游分帧不是合法 JSON';
          return;
        }
        const piece = chunkText(obj);
        if (piece) { text += piece; emit(); }
      },
    });

    // 环境不给 body.getReader（比如某些 polyfill）就退化成整包
    if (!res.body || typeof res.body.getReader !== 'function') {
      done();
      const whole = String(res.text || '');
      if (whole) {
        const lines = whole.split(/\r?\n/).filter((l) => l.indexOf('data:') === 0);
        for (const line of lines) {
          const d = line.slice(5).trim();
          if (d === '[DONE]') { sawDone = true; break; }
          try {
            const piece = chunkText(JSON.parse(d));
            if (piece) text += piece;
          } catch (e) { bad = '上游分帧不是合法 JSON'; }
        }
        if (text) emit();
      }
      if (bad) return fail('parse', bad);
      return { text, stopped: false };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    try {
      while (!sawDone) {
        const step = await reader.read();
        if (step.done) break;
        parser.feed(decoder.decode(step.value, { stream: true }));
        if (bad) break;
        if (local.signal.aborted) break;
      }
    } catch (e) {
      done();
      if (local.signal.aborted) return fail('aborted', '已取消生成', { text });
      return fail('upstream', '读流失败：' + (e && e.message ? e.message : e), { text });
    }
    done();
    if (typeof reader.cancel === 'function' && (sawDone || bad || local.signal.aborted)) {
      try {
        const p = reader.cancel();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) { /* 已经关了就算了 */ }
    }
    if (bad) return fail('parse', bad, { text });
    if (local.signal.aborted) return fail('aborted', '已取消生成', { text });
    return { text, stopped: false };
  };
}
