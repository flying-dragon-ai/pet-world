/**
 * 人宠世界规则（纯函数层）。
 *
 * 这一层不认识 DOM、不认识 localStorage、也不 import store：
 * 一切输入通过参数传入，输出是新的数值或"发生了什么"的描述。
 * 好处是这些规则可以脱离浏览器直接单测（见 dev/test/world.test.js）。
 */
import { ATTR_CAP, ATTR_CAP_HIGH, GROWTH_PER_LEVEL, WORLD_MAX_LEVEL } from '../app/config.js';
import { ATTR_NAMES, ALL_WORLD_EVENTS } from '../data/world-tables.js';

/** 新宠入世界时的初始六维 */
export function defaultWorldPet() {
  return {
    courage: 60,
    impulse: 40,
    aggression: 30,
    attr: { hunger: 80, clean: 80, mood: 70, stamina: 85, wisdom: 0, growth: 0 },
    courseLv: 0,
    jobLv: 0,
  };
}

/** 取（必要时创建）某只宠物的世界档案 */
export function ensureWorldPet(world, petId) {
  if (!world.pets) world.pets = {};
  if (!world.pets[petId]) world.pets[petId] = defaultWorldPet();
  const w = world.pets[petId];
  Object.keys(w.attr || {}).forEach((k) => {
    if (typeof w.attr[k] !== 'number' || Number.isNaN(w.attr[k])) w.attr[k] = 0;
  });
  return w;
}

/** 成长值 → 世界等级（每 50 点 1 级，1–100 级） */
export function worldLevelOf(growth) {
  return Math.min(WORLD_MAX_LEVEL, 1 + Math.floor((growth || 0) / GROWTH_PER_LEVEL));
}

/** 属性上限：成长/智慧可到 9999，其余 100 */
export function capFor(key) {
  return key === 'growth' || key === 'wisdom' ? ATTR_CAP_HIGH : ATTR_CAP;
}

/** 扣属性（0 保底） */
export function applyCost(worldPet, cost) {
  Object.keys(cost).forEach((k) => {
    worldPet.attr[k] = Math.max(0, (worldPet.attr[k] || 0) - cost[k]);
  });
  return worldPet;
}

/** 加属性（按每项的上限封顶） */
export function applyGain(worldPet, gain, cap = ATTR_CAP_HIGH) {
  Object.keys(gain).forEach((k) => {
    const limit = Math.min(capFor(k), cap);
    worldPet.attr[k] = Math.max(0, Math.min(limit, (worldPet.attr[k] || 0) + gain[k]));
  });
  return worldPet;
}

/** 消耗 + 收益一次完成 */
export function applyCostAndGain(worldPet, cost, gain) {
  applyCost(worldPet, cost);
  applyGain(worldPet, gain);
  return worldPet;
}

/** 哪几项属性不够付这笔消耗（返回属性 key 数组，空数组=付得起） */
export function missingAttrs(worldPet, cost) {
  return Object.keys(cost).filter((k) => (worldPet.attr[k] || 0) < cost[k]);
}

/** 把消耗表转成负数表，便于用同一套渲染 */
export function negate(cost) {
  const out = {};
  Object.keys(cost).forEach((k) => { out[k] = -Math.abs(cost[k]); });
  return out;
}

/** 纯文本版数值变动（toast 不支持 HTML） */
export function attrDeltaText(delta) {
  return Object.keys(delta)
    .map((k) => ATTR_NAMES[k] + (delta[k] > 0 ? '+' : '-') + Math.abs(delta[k]))
    .join(' ');
}

/** HTML 版数值变动（绿加红减） */
export function attrDeltaHTML(delta) {
  return Object.keys(delta).map((k) => {
    const isAdd = delta[k] > 0;
    const color = isAdd ? '#3BB786' : '#F05B5B';
    const text = ATTR_NAMES[k] + (isAdd ? '+' : '-') + Math.abs(delta[k]);
    return `<span style="font-size:10.5px;font-weight:700;color:${color}">${text}</span>`;
  }).join(' ');
}

/**
 * 当前满足条件、且还没发放过的事件。
 *
 * 事件条件有两种写法：
 *   - `value(w) > threshold`：单值阈值（勇气值 > 50）；
 *   - `test(w)`：复合条件（冲动值 > 60 **且** 攻击值 > 60），用于「街头大战」。
 * @returns {Array<object>} 事件配置数组
 */
export function pendingEvents(world, worldPet, events = ALL_WORLD_EVENTS) {
  const earned = world.medals || [];
  const fired = world.firedEvents || [];
  return events.filter((ev) => {
    if (ev.runtime) return false; // 运行时事件由 3D 世界内的引擎触发，不在登录时判定
    if ((world.loginDays || 0) < ev.minLoginDay) return false;
    if (fired.includes(ev.id)) return false;
    const ready = ev.test ? !!ev.test(worldPet) : ev.value(worldPet) > ev.threshold;
    return ready && !earned.includes(ev.medal.id);
  });
}

/**
 * 离线衰减结算。
 *
 * 规则：饥饿 -2/h 下限 0，心情 -1/h 下限 20；离开不足 0.2h 不衰减（避免切页就掉属性）。
 * 无论是否衰减，都会把 lastLeave 推进到 at。
 *
 * @param {{lastLeave?: number}} world
 * @param {string[]} petIds 需要一起衰减的宠物
 * @param {number} at 当前时间戳
 * @returns {{skipped: boolean, hours: number, before: Record<string, {hunger: number, mood: number}>}}
 */
export function settleOffline(world, petIds, at, getPetWorld) {
  const last = world.lastLeave || at;
  world.lastLeave = at;
  const hours = Math.min((at - last) / 3_600_000, 240);
  const before = {};

  petIds.forEach((id) => {
    const w = getPetWorld(id);
    before[id] = { hunger: w.attr.hunger, mood: w.attr.mood };
  });

  if (hours < 0.2) return { skipped: true, hours, before };

  petIds.forEach((id) => {
    const w = getPetWorld(id);
    w.attr.hunger = Math.max(0, w.attr.hunger - hours * 2);
    w.attr.mood = Math.max(20, w.attr.mood - hours * 1);
  });
  return { skipped: false, hours, before };
}

/** 离线超过这个小时数才弹「主人回来了」卡片 */
export const WELCOME_BACK_HOURS = 8;
