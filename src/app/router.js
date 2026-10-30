/**
 * 页面路由。
 *
 * 页面 = 一个 id + 一个 render 函数，通过 `registerPage` 显式登记（打开/关闭都走这里）。
 * 旧实现用 `window['render'+Name]()` 按字符串拼函数名，拼错只会静默白屏；
 * 现在拼错在控制台直接指出"未注册的页面"。
 *
 * 依赖方向：router 不认识任何具体页面，页面依赖 router。
 */
import { $, $$ } from './dom.js';
import { registerActions } from './actions.js';

/** 底部 tab 对应的页面（决定 tabbar 显隐与高亮） */
export const TAB_PAGES = ['home', 'menu', 'ai', 'community', 'me'];

/** @type {Map<string, {render: () => void}>} */
const pages = new Map();

let currentPage = null;

/**
 * @param {string} id 页面 id（对应 DOM 里的 #pg-<id>）
 * @param {{render?: () => void}} impl
 */
export function registerPage(id, impl = {}) {
  if (pages.has(id)) throw new Error(`[router] 页面重复注册：${id}`);
  pages.set(id, { render: impl.render || (() => {}) });
}

export function currentPageId() {
  return currentPage;
}

/**
 * 切页：隐藏所有 .page，显示目标页，按需切换 tabbar，最后触发渲染。
 * @param {string} id
 */
export function go(id) {
  const page = pages.get(id);
  if (!page) console.warn(`[router] 未注册的页面：${id}`);

  const target = $('pg-' + id);
  if (target) {
    $$('.page').forEach((p) => p.classList.remove('on'));
    target.classList.add('on');
  }

  const isTab = TAB_PAGES.includes(id);
  const tabbar = $('tabbar');
  if (tabbar) tabbar.classList.toggle('hidden', !isTab);
  if (isTab) {
    $$('.tbtn').forEach((b) => b.classList.toggle('act', b.dataset.tab === id));
  }

  currentPage = id;
  if (page) page.render();
  return id;
}

/** 重新渲染当前页（切换宠物、改设置后保持视野不动） */
export function refreshCurrentPage() {
  const page = currentPage && pages.get(currentPage);
  if (page) page.render();
}

/** 底部 tab 点击（语义同 go，保留独立名字让模板读起来更清楚） */
export function tabTo(id) {
  return go(id);
}

registerActions('router', { go, tabTo });
