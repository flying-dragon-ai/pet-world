/**
 * AI 出口（端口层）。
 *
 * **以后接真大模型，只需要改这一个文件。**
 *
 * 现在：默认后端是「本地演示语料」——离线、零配置、结果可复现。
 * 将来：调用 setLlmBackend(你的函数) 换成真模型，视图层（src/views/ai.js）一行都不用改。
 *
 * 后端函数约定：
 *   async ({pet, question, scene, prompt, messages, onDelta, signal}) => {text, stopped, reason}
 *   - onDelta(delta)：收到一段增量就调一次（视图负责把它显示出来）
 *   - signal：AbortSignal，用户点「停止生成」时 abort，后端要尽快 return
 *   - reason：可选，'emergency' 表示这是急症场景下的中断，视图据此弹急诊引导
 *
 * ⚠️ 真接 API 时的安全底线：**API Key 不能进前端**（浏览器里的任何东西对用户都是明文）。
 *    必须经自己的服务端代理转发，否则等于把 Key 发给所有用户。
 */
import { localAnswer } from '../domain/ai-local.js';
import { isEmergency } from '../domain/ai-prompt.js';

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
 * 统一的流式对话出口。
 * @param {{pet?: object|null, question: string, scene: string, prompt?: string,
 *          messages?: Array, onDelta: (delta: string) => void, signal?: AbortSignal}} input
 * @returns {Promise<{text: string, stopped: boolean, reason?: string}>}
 */
export function chat(input) {
  const be = getLlmBackend();
  return be(input);
}

/** 拒答类回复不走流式，直接给一句 */
export function refuse(text) {
  return { text, stopped: false };
}
