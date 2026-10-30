/**
 * 通用浮层：toast / 底部面板（sheet）/ 模态框（modal）/ 二次确认。
 *
 * 全部是"短命 UI"，不认识任何业务数据；调用方传 HTML 片段进来。
 * 控制台式全局变量（window._cfcb 之类）在这里被消灭：确认回调存在闭包里。
 */
import { $ } from './dom.js';
import { registerActions } from './actions.js';

const TOAST_MS = 2000;

/** 关掉模态框之后要做的恢复动作（例如重新显示直播悬浮球） */
const modalCloseHooks = [];

export function onModalClose(hook) {
  modalCloseHooks.push(hook);
}

export function toast(message) {
  const box = $('toast');
  if (!box) return;
  box.textContent = message;
  box.classList.add('show');
  clearTimeout(box._tm);
  box._tm = setTimeout(() => box.classList.remove('show'), TOAST_MS);
}

export function openSheet(title, html) {
  $('sheetTitle').textContent = title;
  $('sheetBody').innerHTML = html;
  $('mask').classList.add('show');
  $('sheet').classList.add('show');
}

export function closeSheet() {
  $('mask').classList.remove('show');
  $('sheet').classList.remove('show');
}

export function openModal(html) {
  $('modalBox').innerHTML = html;
  $('modalWrap').classList.add('show');
}

export function closeModal() {
  $('modalWrap').classList.remove('show');
  $('modalWrap').onclick = null;
  modalCloseHooks.forEach((hook) => hook());
}

let confirmCallback = null;

/**
 * 二次确认。确认后先关弹窗再执行回调，与旧行为保持一致。
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.body
 * @param {string} [opts.okText]
 * @param {() => void} opts.onOk
 * @param {'danger'|'primary'} [opts.style]
 */
export function confirmDialog({ title, body, okText = '确定', onOk, style = 'primary' }) {
  confirmCallback = onOk;
  const danger = style === 'danger';
  const buttonStyle = danger ? 'background:linear-gradient(135deg,#F05B5B,#D94343)' : '';
  openModal(
    `<div style="font-size:16px;font-weight:800;margin-bottom:10px">${title}</div>` +
    `<div style="font-size:13px;color:var(--sub);line-height:1.6;margin-bottom:18px">${body}</div>` +
    `<div style="display:flex;gap:10px">` +
    `<button class="btn btn-ghost" onclick="app.closeModal()">取消</button>` +
    `<button class="btn ${danger ? 'btn-danger' : ''}" style="${buttonStyle}" onclick="app.confirmOk()">${okText}</button>` +
    `</div>`,
  );
}

function confirmOk() {
  const cb = confirmCallback;
  confirmCallback = null;
  closeModal();
  if (cb) cb();
}

registerActions('ui', { toast, openSheet, closeSheet, openModal, closeModal, confirmOk });
