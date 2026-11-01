/**
 * 启动入口。
 *
 * 顺序很重要：
 *   1. 装上 app / ui 两个桥（模板层的内联事件依赖它们）
 *   2. 读存档（首次进 = 出厂存档）
 *   3. 初始化外壳（状态栏、手机框缩放、离线横幅）
 *   4. 按登录态落到首页或登录页
 *   5. 登录用户做一次离线结算（3D 世界属性衰减）
 *
 * 视图模块在这里被 import，靠它们的副作用登记页面与动作 ——
 * 这就是"谁存在"的唯一清单，删页面时不会漏改。
 */
import { $ } from './app/dom.js';
import { S, save, loadState } from './app/store.js';
import { installActionBridge } from './app/actions.js';
import { installUiState } from './app/ui-state.js';
import { go } from './app/router.js';
import { startShellClock, startShellLayout, renderOfflineBanner } from './app/shell.js';

/* 视图：import 即登记页面 / 动作 */
import './views/auth.js';
import './views/home.js';
import './views/ai.js';
import './views/community.js';
import './views/profile.js';
import './views/grow.js';
import './views/monitor.js';
import './views/mall.js';
import './views/misc.js';
import './views/service.js';
import './views/act.js';
import './views/petwizard.js';
import './views/live.js';
import './views/world-panel.js';
import './views/battle.js';

import { resumeOnboardingIfNeeded } from './views/auth.js';
import { settleWorld } from './views/world-state.js';
import { bindLiveDrag, liveOpen } from './views/live.js';

/** 离线结算延迟一点，避免和首屏渲染抢帧 */
const SETTLE_DELAY_MS = 800;

function boot() {
  installActionBridge();
  installUiState();

  loadState();

  startShellClock();
  startShellLayout();
  renderOfflineBanner();
  bindLiveDrag();

  if (S.loggedIn && !S.onboarded) resumeOnboardingIfNeeded();

  if (S.loggedIn) {
    go('home');
    liveOpen(false);
    setTimeout(settleWorld, SETTLE_DELAY_MS);
  } else {
    go('login');
  }
}

/* 关页面前把"离开时间"写进存档，下次回来才能算离线衰减 */
window.addEventListener('beforeunload', () => {
  if (S && S.world) S.world.lastLeave = Date.now();
  save();
});

/** 首屏骨架已在 HTML 里，脚本一跑就能切页；DOM 未就绪时等一次 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/** 供调试/演示脚本使用：暴露少量只读入口（不参与业务） */
window.__petWorld = {
  version: 'V1.10.1',
  state: () => S,
  goto: go,
  root: () => $('phone'),
};
