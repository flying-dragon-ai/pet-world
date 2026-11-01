/**
 * 宠物打架结算（纯函数层）。
 *
 * 伤害公式借用了 Pokémon Showdown 的经典结构（MIT License，https://github.com/smogon/pokemon-showdown）：
 *   baseDamage = ((2 * level / 5 + 2) * power * attack) / defense / 50
 * 只借**结构**，招式、物种、数值全部是本项目自己的（不碰任何宝可梦数据）。
 *
 * 两个关键设计：
 *   1. 随机数由参数注入（makeRng），同一 seed 必得同一结果 —— 可单测、可复现；
 *   2. 结算过程只依赖入参，不读 store / 不碰 DOM —— 符合本项目 domain 层的约定。
 */
import { sizeTypeOf, breedSizeTypeOf } from './pet.js';
import { BATTLE_MAX_ROUNDS } from '../app/config.js';

/** 体型对攻击 / 速度的系数（大型犬力气大但转身慢，小型猫灵活但没力气） */
const SIZE_ATK = { 迷你型: 0.85, 小型: 0.95, 中型: 1, 大型: 1.1, 巨型: 1.2 };
const SIZE_SPD = { 迷你型: 1.25, 小型: 1.15, 中型: 1, 大型: 0.9, 巨型: 0.8 };

const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * 可播种的伪随机数发生器（32 位 LCG）。
 * 抄的是 pokemon-showdown「同 seed 可复盘」的**模式**，实现是 10 行自写。
 * @param {number} seed
 * @returns {() => number} 返回 [0,1) 的函数
 */
export function makeRng(seed) {
  let s = (Math.floor(seed) >>> 0) || 1;
  return function rng() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * 我方宠物的战斗面板。
 * @param {{species?: string, weight?: number, breed?: string}} pet 档案
 * @param {{courage?: number, aggression?: number, attr?: {stamina?: number}}} w 世界档案
 * @param {number} [level] 家园等级
 */
export function battleStats(pet, w, level = 20) {
  const aggression = clamp(num(w && w.aggression, 30), 0, 100);
  const courage = clamp(num(w && w.courage, 60), 0, 100);
  const stamina = clamp(num(w && w.attr && w.attr.stamina, 80), 0, 100);
  const size = sizeTypeOf(pet) || '中型';
  const sa = SIZE_ATK[size] != null ? SIZE_ATK[size] : 1;
  const ss = SIZE_SPD[size] != null ? SIZE_SPD[size] : 1;
  return {
    level: Math.max(1, Math.floor(level)),
    size,
    hp: Math.round(36 + stamina * 0.7),
    atk: Math.round((aggression * 0.6 + courage * 0.4) * sa),
    def: Math.round((100 - aggression) * 0.5 + 35),
    spd: Math.round(50 * ss),
  };
}

/**
 * 对手 NPC 的战斗面板（体型由品种参考值推出来，跟我方同一套规则）。
 * @param {{species?: string, breed?: string, atk?: number, def?: number, spd?: number, hp?: number, lv?: number}} foe
 */
export function foeStats(foe) {
  const size = breedSizeTypeOf({ species: foe.species, breed: foe.breed }) || '中型';
  const sa = SIZE_ATK[size] != null ? SIZE_ATK[size] : 1;
  const ss = SIZE_SPD[size] != null ? SIZE_SPD[size] : 1;
  return {
    level: Math.max(1, Math.floor(num(foe.lv, 10))),
    size,
    hp: Math.round(num(foe.hp, 70)),
    atk: Math.round(num(foe.atk, 35) * sa),
    def: Math.round(num(foe.def, 35) * sa),
    spd: Math.round(num(foe.spd, 50) * ss),
  };
}

/** 伤害整体系数：调它就能整体调快/调慢节奏（2.2 ≈ 4 回合分胜负） */
const DAMAGE_SCALE = 2.2;

/**
 * 等级项。
 *
 * Pokémon Showdown 的原始公式用 (2*level/5 + 2) 做等级系数，是**线性**的：
 * Lv.1 与 Lv.60 差 10 倍，直接搬过来会导致高等级一击秒杀。
 * 这里压缩成温和成长（Lv.1 → 6.12，Lv.60 → 13.2），
 * 让「等级」主要通过六维属性（勇气/攻击/体力）而不是公式本身体现。
 */
function levelTerm(level) {
  return 6 + Math.max(0, level) * 0.12;
}

/**
 * 单次伤害：宝可梦式结构（等级 → 攻击 / 防御 → 归一）+ ±10% 浮动。
 * 结构借自 https://github.com/smogon/pokemon-showdown （MIT License），
 * 但等级项与归一常数都按本项目的节奏重调过。
 */
function damageOf(attacker, defender, rng) {
  const base = (levelTerm(attacker.level) * attacker.atk) / defender.def * DAMAGE_SCALE;
  const variance = 0.9 + rng() * 0.2;
  return Math.max(1, Math.round(base * variance));
}

/**
 * 回合结算。
 * @param {{mine: object, foe: object, rng: () => number}} input
 * @returns {{outcome:'win'|'lose'|'draw', rounds:number, log:Array, myHp:number, foeHp:number}}
 */
export function resolveBattle({ mine, foe, rng }) {
  const m = { hp: mine.hp, atk: mine.atk, def: mine.def, spd: mine.spd, level: mine.level || 20 };
  const f = { hp: foe.hp, atk: foe.atk, def: foe.def, spd: foe.spd, level: foe.level || 20 };
  const log = [];
  let rounds = 0;

  while (m.hp > 0 && f.hp > 0 && rounds < BATTLE_MAX_ROUNDS) {
    rounds++;
    // 速度高者先手；同速我方先手（保证结果确定）
    const order = m.spd >= f.spd ? ['me', 'foe'] : ['foe', 'me'];
    for (const side of order) {
      if (m.hp <= 0 || f.hp <= 0) break;
      const A = side === 'me' ? m : f;
      const D = side === 'me' ? f : m;
      const dmg = damageOf(A, D, rng);
      D.hp = Math.max(0, D.hp - dmg);
      log.push({ round: rounds, side, dmg, left: D.hp });
    }
  }

  let outcome = 'draw';
  if (m.hp <= 0 && f.hp <= 0) outcome = 'draw';
  else if (f.hp <= 0) outcome = 'win';
  else if (m.hp <= 0) outcome = 'lose';

  return { outcome, rounds, log, myHp: m.hp, foeHp: f.hp };
}

/**
 * 负伤判定：赢了也可能挂彩，输了大概率带伤。
 * @param {{outcome: string}} result
 * @param {() => number} rng
 * @returns {'none'|'mild'|'scratch'|'hurt'}
 */
export function injuryOf(result, rng) {
  const roll = rng();
  if (result.outcome === 'win') return roll > 0.85 ? 'mild' : 'none';
  if (result.outcome === 'draw') return roll > 0.75 ? 'none' : roll > 0.4 ? 'mild' : 'scratch';
  // 输了：多数是擦伤，约三成轻伤，约四分之一要上医院
  return roll > 0.7 ? 'mild' : roll > 0.25 ? 'scratch' : 'hurt';
}

/**
 * 打完之后的成长值 / 金币收益。
 * @param {{outcome: string, rounds: number}} result
 * @returns {{growth: number, coinA: number}}
 */
export function rewardOf(result) {
  const base = result.outcome === 'win' ? 12 : result.outcome === 'draw' ? 5 : 2;
  // 打得越久说明越胶着，多给一点成长
  return { growth: base + Math.max(0, result.rounds - 3), coinA: result.outcome === 'win' ? 8 : result.outcome === 'draw' ? 3 : 0 };
}
