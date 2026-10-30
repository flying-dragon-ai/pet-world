/**
 * 3D 互动规则（纯函数层）：横屏判定 + 四个手动互动的数值表 + 冷却。
 *
 * 3D 场景本身在 views/w3d/，这里只放"抚摸加什么属性"这类可以脱离 WebGL 单测的规则。
 */
import { W3D_ACTION_COOLDOWN_MS } from '../app/config.js';

/** 竖屏视口 → 舞台内容旋转 90°（手机上恒定横屏体验） */
export function needRotate(width, height) {
  return height > width;
}

/**
 * 四个手动互动的效果表。
 * gain 直接作用于世界六维；task 表示要打今日任务卡；minStamina 是不满足就拒绝的门槛。
 */
export const MANUAL_ACTIONS = {
  touch: { gain: { mood: 9 }, fxIcon: '♥', fxColor: '#E8709A', say: '好舒服呀～', emote: 'happy', countsTouch: true },
  feed: { gain: { hunger: 18 }, growth: 3, fxIcon: '🐟', fxColor: '#E8945A', say: '吧唧吧唧，真好吃！', emote: 'happy', task: 'feed' },
  play: { gain: { mood: 7, stamina: -10, hunger: -6 }, fxIcon: '✦', fxColor: '#5B8DEF', emote: 'play', minStamina: 12 },
  bath: { gain: { clean: 20 }, fxIcon: '🫧', fxColor: '#3AB5C0', say: '洗香香了！' },
};

/** 该互动是否还在冷却中 */
export function onCooldown(cooldowns, act, at, ms = W3D_ACTION_COOLDOWN_MS) {
  const last = cooldowns[act];
  if (!last) return false; // 从没按过 = 不在冷却
  return at - last < ms;
}

/** 体力不足时返回 true（只有玩耍有门槛） */
export function lacksStamina(action, stamina) {
  return typeof action.minStamina === 'number' && stamina < action.minStamina;
}
