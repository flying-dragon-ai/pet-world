/**
 * DOM 小工具。
 *
 * 只做"取元素 / 转义 / 反馈"这类与业务无关的动作。
 * 模板字符串是这个项目的渲染方式，因此这里给的是拼 HTML 时最常用的几件东西。
 */
import { registerActions } from './actions.js';

/** getElementById 的短别名（全项目统一用 $） */
export const $ = (id) => document.getElementById(id);

/** querySelectorAll → 真数组，省掉 Array.from 噪音 */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/**
 * 把外部文本安全塞进模板字符串（属性值与文本节点都可用）。
 * 只处理 HTML 语境；要放进 onclick 里的 JS 字符串，必须用 jsArg()。 */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"]/g, (c) => ESCAPES[c]);
}

/**
 * 把值放进「双引号属性内的 JS 字符串字面量」—— 模板里的 onclick="app.动作(X)" 就是这种语境。
 *
 * 这是最容易被漏掉的一类 XSS 面：esc() 不转义单引号，昵称里塞一个 x')||alert(1)||(' 就能
 * 跳出字符串、在属性里执行。JSON.stringify 先吃掉引号与反斜杠，esc() 再吃掉双引号，
 * 于是无论内容是什么，解析器看到的永远只是一段完整的字符串字面量。
 * 用法：onclick="app.openUserHome(' + jsArg(nick) + ')" —— X 本身就是字面量，外面不要再包引号。
 */
export function jsArg(value) {
  return esc(JSON.stringify(value == null ? '' : String(value)));
}

/**
 * Markdown → 安全 HTML。
 *
 * 用 vendor 的 marked 解析，再用 DOMPurify 消毒。
 * **消毒这一步不能省**：Markdown 渲染出来的是 HTML，esc() 挡不住，
 * 一旦漏掉就是 XSS 入口。vendor 缺失时退回纯转义，保证不会渲染出裸标签。
 */
export function mdToHtml(text) {
  const s = String(text ?? '');
  if (!s) return '';
  const m = typeof window !== 'undefined' ? window.marked : null;
  const p = typeof window !== 'undefined' ? window.DOMPurify : null;
  if (!m || !p) return esc(s);
  try {
    const html = m.parse(s, { breaks: true, gfm: true });
    return p.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    return esc(s);
  }
}

/** 抖动一下，用于表单校验失败的即时反馈 */
export function shake(el, ms = 400) {
  if (!el) return;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), ms);
}

export function show(el) {
  if (el) el.classList.add('show');
}

export function hide(el) {
  if (el) el.classList.remove('show');
}

export function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
  return el;
}

/** 图片加载失败 → 换成品牌占位块（远程图片全部可能挂） */
export function imgErr(img) {
  const holder = document.createElement('div');
  holder.className = 'imgfb';
  holder.style.cssText = 'width:100%;height:100%;position:absolute;inset:0';
  holder.innerHTML = '<svg class="icon icon-l" style="color:rgba(58,123,213,.4)"><use href="#i-paw"/></svg>';
  const parent = img.parentElement;
  if (parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  img.replaceWith(holder);
}

/** 元素在容器内滚动到可见处（面板 tab 切换用） */
export function scrollIntoViewSoft(el, behavior = 'smooth') {
  if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior });
}

/** 生成短 id（存档内的临时对象 id，不要求全局唯一） */
export function uid(prefix = 'x') {
  return prefix + Math.random().toString(36).slice(2, 9);
}

/* 模板层通过 app.imgErr(this) 兜底远程图片 */
registerActions('dom', { imgErr });
