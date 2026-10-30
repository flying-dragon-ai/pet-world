/**
 * 世界状态网关（应用层）。
 *
 * 把 domain/world.js 的纯函数接到 store 上，并负责三件"副作用"：
 *   1. 读写存档（save）；
 *   2. 通知世界面板刷新（钩子注册，避免与视图互相 import）；
 *   3. 弹出事件卡 / 解锁卡（模态框属于 UI 层）。
 *
 * 视图层统一从这里拿 worldPet / worldLevel / payAndGain，不直接碰 S.world。
 */
import { S, save } from '../app/store.js';
import { now } from '../app/clock.js';
import { esc } from '../app/dom.js';
import { openModal } from '../app/ui.js';
import { registerActions } from '../app/actions.js';
import { VENUE_UNLOCK_LEVEL } from '../app/config.js';
import {
  ensureWorldPet, worldLevelOf, missingAttrs, applyCostAndGain, applyGain,
  pendingEvents, negate, attrDeltaText, attrDeltaHTML, settleOffline, WELCOME_BACK_HOURS,
} from '../domain/world.js';
import { ATTR_NAMES } from '../data/world-tables.js';
import { curPet } from './pets.js';

/** 世界面板刷新 / 3D 挂起恢复：由视图在启动时注册，避免双向依赖 */
const hooks = {
  refreshPanel: () => {},
  suspendStage: () => {},
  resumeStage: () => {},
};

export function registerWorldHooks(next) {
  Object.assign(hooks, next);
}

/* ---------------- 读 ---------------- */

/** 取当前（或指定）宠物的世界档案，首次访问自动建档 */
export function worldPet(pid) {
  return ensureWorldPet(S.world, pid || S.curPet);
}

export function worldLevel() {
  return worldLevelOf(worldPet().attr.growth);
}

/** 运动馆/娱乐馆是否已解锁 */
export function venuesUnlocked() {
  return worldLevel() >= VENUE_UNLOCK_LEVEL;
}

/** 不够付的属性 key（空数组 = 付得起） */
export function canPay(cost) {
  return missingAttrs(worldPet(), cost);
}

/** 缺属性的中文提示，例如「饥饿值、体力值」 */
export function lackNames(cost) {
  return canPay(cost).map((k) => attrKeyName(k)).join('、');
}

/* ---------------- 写 ---------------- */

/**
 * 扣属性 + 加属性，然后落盘并刷新面板。
 * @param {Record<string,number>} cost
 * @param {Record<string,number>} gain
 * @param {() => void} [extra] 结算后追加的副作用（改课程等级、加金币等）
 */
export function payAndGain(cost, gain, extra) {
  applyCostAndGain(worldPet(), cost, gain);
  if (extra) extra();
  save();
  hooks.refreshPanel();
}

/** 真实养宠行为 → 世界成长值；跨过 Lv.30 时弹解锁卡 */
export function addWorldGrowth(n) {
  const w = worldPet();
  const before = worldLevel();
  w.attr.growth = Math.min(9999, w.attr.growth + n);
  save();
  const after = worldLevel();
  const crossedUnlock = after > before && before < VENUE_UNLOCK_LEVEL && after >= VENUE_UNLOCK_LEVEL;
  if (crossedUnlock) {
    setTimeout(() => {
      openModal(
        '<div style="text-align:center"><div style="font-size:44px">🏟️</div>' +
        '<div style="font-size:17px;font-weight:900;margin-top:8px">成长等级达到 Lv.' + after + '</div>' +
        '<div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">「' + esc(curPet().name) + '」长大了！<br>' +
        '<b style="color:#8B5CF6">运动馆</b>与<b style="color:#E8709A">娱乐馆</b>已解锁，<br>去消耗金币A锻炼玩耍吧～</div>' +
        '<button class="btn" onclick="app.closeModal();app.gotoWorldFromCard()">去看看</button></div>');
    }, 300);
  }
  return after;
}

/** 金币A 是否够 */
export function canAfford(price) {
  return (S.world.coinA || 0) >= price;
}

export function spendCoins(n) {
  S.world.coinA -= n;
}

export function earnCoins(n) {
  S.world.coinA = (S.world.coinA || 0) + n;
}

/* ---------------- 事件与离线结算 ---------------- */

/** 条件满足的战功事件 → 入账勋章 + 发奖励 + 弹卡 */
export function checkWorldEvents() {
  const w = worldPet();
  const ready = pendingEvents(S.world, w);
  ready.forEach((ev) => {
    S.world.medals.push(ev.medal.id);
    applyGain(w, ev.gain || {});
    save();
    setTimeout(() => showEventCard(ev), 450);
  });
  return ready.length;
}

function showEventCard(ev) {
  hooks.suspendStage();
  openModal(
    '<div style="text-align:center">' +
    '<div style="font-size:44px;animation:floatUp 2.4s ease infinite">' + ev.icon + '</div>' +
    '<div style="font-size:17px;font-weight:900;margin-top:8px">触发战功事件：' + ev.title + '</div>' +
    '<div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">' +
    ev.story(worldPet(), { loginDays: S.world.loginDays, petName: curPet().name }) + '</div>' +
    '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,rgba(245,208,97,.2),rgba(217,160,60,.1));border:1.5px solid rgba(217,160,60,.5);border-radius:16px;padding:10px 18px;margin-bottom:14px">' +
    '<span style="font-size:20px">🎖️</span><div style="text-align:left">' +
    '<div style="font-size:13px;font-weight:900;color:#C77E12">获得战功勋章「' + ev.medal.n + '」</div>' +
    '<div style="font-size:10px;color:var(--sub)">' + attrDeltaHTML(ev.gain || {}) + '</div></div></div>' +
    '<button class="btn" onclick="app.closeModal();app.resumeStage()">收下勋章</button></div>');
}

/**
 * 离线衰减结算 + 「主人回来了」卡片。
 * @returns {boolean} 触发欢迎卡时 true
 */
export function settleWorld() {
  if (!S || !S.world) return false;
  const result = settleOffline(S.world, S.pets.map((p) => p.id), now(), (id) => worldPet(id));
  save();
  hooks.refreshPanel();
  if (result.skipped) return false;
  if (result.hours > WELCOME_BACK_HOURS) {
    showWelcomeBackCard(result.before[S.curPet] || { hunger: 0, mood: 0 });
    return true;
  }
  return false;
}

function showWelcomeBackCard(before) {
  const w = worldPet();
  openModal(
    '<div style="text-align:center"><div style="font-size:44px">🏡</div>' +
    '<div style="font-size:17px;font-weight:900;margin-top:8px">主人回来了！</div>' +
    '<div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">离开期间「' + esc(curPet().name) + '」在世界小院自主生活，<br>' +
    '属性按离线规则衰减（饥饿 -2/h 下限 0 · 心情 -1/h 下限 20）：<br>' +
    '饥饿值 ' + Math.round(w.attr.hunger) + '（原 ' + Math.round(before.hunger) + '） · 心情值 ' + Math.round(w.attr.mood) + '（原 ' + Math.round(before.mood) + '）<br>快去喂喂它、陪陪它吧～</div>' +
    '<button class="btn" onclick="app.closeModal();app.openWorld()">回世界看看</button></div>');
}

/* ---------------- 小工具 ---------------- */

/** 属性 key → 中文名 */
export function attrKeyName(key) {
  return ATTR_NAMES[key] || key;
}

export { negate, attrDeltaText, attrDeltaHTML };

registerActions('world-state', {
  worldPet, worldLevel, canPay, payAndGain, addWorldGrowth, settleWorld, checkWorldEvents,
});
