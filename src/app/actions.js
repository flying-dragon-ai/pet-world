/**
 * 动作注册表（Action Registry）——页面里所有 DOM 事件的唯一入口。
 *
 * 背景：这个 App 用模板字符串渲染，事件直接写在 HTML 里（onclick="app.feed()"）。
 * 与其让每个函数泄漏成 window 全局，不如显式登记：
 *   - 视图模块在文件末尾 `registerActions('home', { feed, quickClean })` 声明对外暴露的动作；
 *   - 内联事件统一写 `app.动作名(...)`，由这里查表派发；
 *   - 名字拼错不会静默失败：控制台明确指出"未注册的动作"；
 *   - 测试断言"页面里出现的每个 app.xxx 都已注册"，等价于模板层的接口契约检查。
 *
 * 依赖方向：这一层不认识任何业务模块，业务模块单向依赖它。
 */
const registry = new Map();
const owners = new Map();

/**
 * 登记一批动作。同名重复登记属于缺陷（多半是复制粘贴遗留），直接抛错。
 * @param {string} owner 归属模块名，仅用于报错与调试
 * @param {Record<string, Function>} map
 */
export function registerActions(owner, map) {
  const dup = [];
  for (const name of Object.keys(map)) {
    if (registry.has(name)) dup.push(`${name}（已属于 ${owners.get(name)}）`);
  }
  if (dup.length) {
    throw new Error(`[actions] ${owner} 重复注册：${dup.join('、')}`);
  }
  for (const [name, fn] of Object.entries(map)) {
    if (typeof fn !== 'function') throw new TypeError(`[actions] ${owner}.${name} 不是函数`);
    registry.set(name, fn);
    owners.set(name, owner);
  }
}

export function hasAction(name) {
  return registry.has(name);
}

export function getAction(name) {
  return registry.get(name);
}

export function actionNames() {
  return [...registry.keys()];
}

export function actionOwner(name) {
  return owners.get(name);
}

/** 按名派发；缺失时打日志并返回 undefined（不要让 UI 线程崩掉） */
export function invoke(name, ...args) {
  const fn = registry.get(name);
  if (!fn) {
    console.error(`[actions] 未注册的动作：${name}`);
    return undefined;
  }
  return fn(...args);
}

/**
 * 安装 window.app 桥。
 * 用 Proxy 而非逐个挂函数：动作随时可注册，查找永远是最新的，且不会污染名字空间。
 */
export function installActionBridge(target = globalThis) {
  const bridge = new Proxy(Object.create(null), {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      if (prop === '__names') return actionNames();
      return registry.get(prop) || ((...args) => invoke(prop, ...args));
    },
    has(_target, prop) {
      return typeof prop === 'string' && registry.has(prop);
    },
  });
  target.app = bridge;
  return bridge;
}
