/**
 * App 外壳：状态栏时间、手机框缩放、底部 tab 红点、离线横幅。
 * 这些元素在 index.html 里是静态的，只做局部刷新，不参与任何业务规则。
 */
import { $, $$ } from './dom.js';
import { fmtHourMinute } from './clock.js';
import { S } from './store.js';
import { registerActions } from './actions.js';
import { ui } from './ui-state.js';

/**
 * 手机框缩放：桌面浏览器里按视口等比缩小，窄屏（真机）不缩放。
 * 缩放比例写进 ui.phoneScale，供拖拽等需要"屏幕位移 → 内容位移"换算的地方使用。
 */
function fitPhone() {
  const phone = $('phone');
  if (!phone) return;
  if (window.innerWidth <= 500) {
    phone.style.transform = '';
    ui.phoneScale = 1;
    return;
  }
  const scale = Math.min(1, (window.innerHeight - 24) / 850, (window.innerWidth - 24) / 392);
  ui.phoneScale = scale;
  if (scale < 1) {
    phone.style.transformOrigin = 'center center';
    phone.style.transform = 'scale(' + scale + ')';
  } else {
    phone.style.transform = '';
  }
}

function tickStatusBarTime() {
  const el = $('sbTime');
  if (el) el.textContent = fmtHourMinute();
}

/** 未读消息数 → 首页铃铛红点 */
export function renderTabBadges() {
  const unread = (S.msgs || []).filter((m) => !m.read).length;
  const bell = document.querySelector('#home-body .bell-badge');
  if (!bell) return;
  bell.style.display = unread ? 'flex' : 'none';
  bell.textContent = unread;
}

/** 离线状态 → 顶部提示条 */
export function renderOfflineBanner() {
  const bar = $('offlineBan');
  if (bar) bar.classList.toggle('show', !!(S.set && S.set.offline));
}

export function startShellClock() {
  tickStatusBarTime();
  setInterval(tickStatusBarTime, 30_000);
}

export function startShellLayout() {
  fitPhone();
  window.addEventListener('resize', fitPhone);
}

/** 网络门禁：离线模式下阻断需要联网的动作 */
export function needNet(quiet) {
  if (S.set.offline) {
    if (!quiet) window.app.toast('当前无网络，请检查网络连接');
    return false;
  }
  return true;
}

/** 调试/演示用：刷新所有外壳视觉状态 */
function refreshShell() {
  renderTabBadges();
  renderOfflineBanner();
  tickStatusBarTime();
}

export { fitPhone };

registerActions('shell', { needNet, renderTabBadges, refreshShell, fitPhone });

/** 供其它模块读取的快捷入口（避免各自 import 一堆） */
export const shell = { renderTabBadges, renderOfflineBanner, fitPhone };
export { $$ };
