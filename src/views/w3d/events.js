/**
 * 3D 世界内的运行时事件（对齐《虚拟宠物家园》2D 小游戏的 Events）。
 *
 * 两类：
 *   1. 战功事件 —— 条件满足时触发，发勋章 + 属性奖励（规则在 domain/w3d.js 的 RUNTIME_EVENTS）；
 *   2. 生活小事件 —— 无门槛的日常彩蛋（松鼠 / 白日梦 / 歪头杀 / 袜子失踪案）。
 *
 * 事件日志写进 S.world.home.logs，竖屏面板的「家园」页可以看到。
 */
import { S, save } from '../../app/store.js';
import { worldPet, awardHomeMedal, pushHomeLog } from '../world-state.js';
import { derivedTraits, RUNTIME_EVENTS, LIFE_EVENTS, homePostEvent } from '../../domain/w3d.js';
import { applyGain } from '../../domain/world.js';
import { curPet } from '../pets.js';
import { sayInStage, sendStageToast, spawnFx } from './fx.js';
import { getStage } from './ctx.js';

/** 战功事件最小间隔（毫秒），对齐 HTML 的 45~105 秒 */
const MEDAL_GAP_MS = 45000;
/** 生活小事件最小间隔 */
const LIFE_GAP_MS = 70000;

let lastMedalAt = 0;
let lastLifeAt = 0;

/** 每个 tick 调用一次：判断要不要触发事件 */
export function tickEvents(at) {
  const s = getStage();
  if (!s || !s.pet) return;
  const pet = curPet();
  const w = worldPet();
  const traits = derivedTraits(w, pet);
  const ctx = { attr: w.attr, traits, weather: s.weather };

  if (at - lastMedalAt > MEDAL_GAP_MS) {
    const earned = S.world.medals || [];
    const ready = RUNTIME_EVENTS.find((ev) => !earned.includes(ev.id) && ev.need(ctx));
    if (ready) {
      lastMedalAt = at;
      fireMedal(ready, w, pet);
      return;
    }
  }

  if (at - lastLifeAt > LIFE_GAP_MS) {
    lastLifeAt = at;
    const ev = LIFE_EVENTS[Math.floor(Math.random() * LIFE_EVENTS.length)];
    fireLife(ev, w, pet);
  }
}

/** 战功事件：发勋章 + 属性变化 + 舞台反馈 */
function fireMedal(ev, world, pet) {
  applyGain(world, ev.gain || {});
  const isNew = awardHomeMedal(ev.id);
  spawnFx(ev.ic, '#D9A03C');
  sayInStage(ev.line);
  sendStageToast(ev.ic + ' ' + ev.n + '：' + ev.line);
  pushHomeLog(ev.ic + ' ' + ev.n + (isNew ? '（新勋章）' : '') + ' · ' + pet.name);
  save();
}

/** 生活小事件 */
function fireLife(ev, world, pet) {
  applyGain(world, ev.gain || {});
  spawnFx(ev.ic, '#8B5CF6');
  sayInStage(ev.line);
  sendStageToast(ev.ic + ' ' + ev.n + '：' + ev.line);
  pushHomeLog(ev.ic + ' ' + ev.n + ' · ' + pet.name);
  save();
}

/**
 * 社区发帖 → 家园事件（对齐 HTML 小游戏的 Events.fromPost）。
 * 社区页发完帖调用这里，宠物会有反应，必要时点亮战功。
 * @param {string} text 帖子正文
 * @returns {{kind: string, line: string}} 事件描述
 */
export function applyPostEvent(text) {
  const pet = curPet();
  const w = worldPet();
  const traits = derivedTraits(w, pet);
  // 规则在 domain/w3d.js，这里把结果落到状态上
  const result = postEventOf(text, traits);
  if (result.mood) applyGain(w, { mood: result.mood });
  if (result.stamina) applyGain(w, { stamina: result.stamina });
  if (result.growth) applyGain(w, { growth: result.growth });
  if (result.medal) awardHomeMedal(result.medal);
  pushHomeLog('社区同步 · ' + result.kind + ' · ' + pet.name);
  save();
  return result;
}

/** 转发到领域层规则（保持 domain 单一来源） */
function postEventOf(text, traits) {
  return homePostEvent(text, { traits });
}
