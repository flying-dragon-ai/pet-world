/**
 * 宠物档案与家园四维（纯函数层）。
 *
 * 与"人宠世界"的六维（hunger/clean/mood/stamina/wisdom/growth）不同，
 * 家园四维是 App 内的日常养成：satiety/mood/clean/vitality + growth。
 *
 * 本层还负责「宠物体型」相关的规则（身高 / 体重 / 体型类型 / 体况评分），
 * 全部是纯函数：数据来自 src/data/pet-sizes.js，不碰 DOM、不碰 store。
 */
import { BREED_SIZES, CAT_SIZES, BREED_ALIAS, SIZE_SCALE, BCS_LABELS, breedKeyOf, breedRefOf } from '../data/pet-sizes.js';

/** 家园四维默认值（旧存档缺失时补齐） */
export const DEFAULT_GARDEN = {
  satiety: 70,
  mood: 68,
  clean: 82,
  vitality: 60,
  growth: 120,
  touchCount: 0,
  tasks: {},
};

/** 取（必要时创建）宠物的家园四维 */
export function ensureGarden(pet) {
  if (!pet) return { ...DEFAULT_GARDEN, tasks: {} };
  if (!pet.g) pet.g = { ...DEFAULT_GARDEN, tasks: {} };
  if (!pet.g.tasks) pet.g.tasks = {};
  return pet.g;
}

/** 家园等级：成长值每 120 点 1 级，封顶 9 级 */
export function petLevelOf(garden) {
  return Math.min(9, 1 + Math.floor(((garden && garden.growth) || 0) / 120));
}

/**
 * 月龄/年龄文案：不足 1 岁显示"n个月"，否则"n岁"（按自然月差计算）。
 * @param {{birth?: string}} pet
 * @param {Date} [today] 便于测试注入
 */
export function petAgeOf(pet, today = new Date()) {
  if (!pet || !pet.birth) return '未知';
  const b = new Date(pet.birth);
  if (Number.isNaN(b.getTime())) return '未知';
  let months = (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth());
  if (months < 1) months = 1;
  return months < 12 ? months + '个月' : (months / 12).toFixed(0) + '岁';
}

/* ==================== 体型：身高 / 体重 / 体型类型 ==================== */

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * 品种名 → 参考表 key（转发到数据层）。
 * @param {string} breed
 * @returns {string|null}
 */
export { breedKeyOf };

/**
 * 品种参考值（转发到数据层）。
 * @param {{breed?: string, species?: string}} pet
 */
export function petRefOf(pet) {
  if (!pet) return null;
  return breedRefOf(pet.breed, pet.species);
}

/** 物种对应的体型分级表（鸟/异宠没有分级，返回 null） */

export function sizeScaleOf(species) {
  return SIZE_SCALE[species] || null;
}

/**
 * 体型类型：由**当前体重**按物种阈值分级。
 * 犬：迷你 <4kg / 小型 4–12 / 中型 12–25 / 大型 25–45 / 巨型 ≥45
 * 猫：小型 <4kg / 中型 4–6 / 大型 ≥6
 * @param {{species?: string, weight?: number}} pet
 * @returns {string|null}
 */
export function sizeTypeOf(pet) {
  if (!pet) return null;
  const scale = sizeScaleOf(pet.species);
  if (!scale) return null;
  const w = Number(pet.weight);
  if (!Number.isFinite(w) || w <= 0) return null;
  for (const s of scale) if (w < s.max) return s.name;
  return scale[scale.length - 1].name;
}

/**
 * 品种典型体型（按成年体重区间中点分级），与"当前体型"区分开。
 * @param {{breed?: string, species?: string}} pet
 * @returns {string|null}
 */
export function breedSizeTypeOf(pet) {
  const ref = petRefOf(pet);
  if (!ref) return null;
  const mid = ref.weight[0] != null && ref.weight[1] != null
    ? (ref.weight[0] + ref.weight[1]) / 2
    : (ref.weight[0] || ref.weight[1]);
  if (!mid) return null;
  return sizeTypeOf({ species: pet.species, weight: mid });
}

/**
 * 体重偏差：当前体重 vs 品种成年体重区间中点。
 * @returns {{ratio:number, diff:number, mid:number, label:'偏轻'|'标准'|'偏重'}|null}
 */
export function weightDeviation(pet) {
  const ref = petRefOf(pet);
  const w = Number(pet && pet.weight);
  if (!ref || !Number.isFinite(w) || w <= 0) return null;
  const lo = ref.weight[0], hi = ref.weight[1];
  const mid = lo != null && hi != null ? (lo + hi) / 2 : (lo || hi);
  if (!mid) return null;
  const ratio = w / mid;
  const label = ratio < 0.85 ? '偏轻' : ratio > 1.15 ? '偏重' : '标准';
  return { ratio: round2(ratio), diff: round1(w - mid), mid: round1(mid), label };
}

/**
 * 身高偏差：档案身高 vs 品种成年身高区间中点。
 * @returns {{ratio:number, diff:number, mid:number, label:'偏矮'|'标准'|'偏高'}|null}
 */
export function heightDeviation(pet) {
  const ref = petRefOf(pet);
  const h = Number(pet && pet.height);
  if (!ref || !Number.isFinite(h) || h <= 0) return null;
  const lo = ref.height[0], hi = ref.height[1];
  const mid = (lo + hi) / 2;
  if (!mid) return null;
  const ratio = h / mid;
  const label = ratio < 0.9 ? '偏矮' : ratio > 1.1 ? '偏高' : '标准';
  return { ratio: round2(ratio), diff: round1(h - mid), mid: round1(mid), label };
}

/**
 * 体况评分 BCS（1–9）：按体重/品种标准比值线性映射。
 * 这是**近似估算**，不是兽医触诊结论：
 *   ratio 0.75 → 3 分，1.00 → 5 分（理想），1.25 → 7 分。
 * @returns {number|null}
 */
export function bcsOf(pet) {
  const d = weightDeviation(pet);
  if (!d) return null;
  const b = Math.round(3 + (d.ratio - 0.75) * 8);
  return Math.min(9, Math.max(1, b));
}

/** 体况评分的中文标签（消瘦/偏瘦/理想/偏胖/肥胖） */
export function bcsLabelOf(pet) {
  const b = bcsOf(pet);
  return b == null ? '' : BCS_LABELS[b] || '';
}

/**
 * 生长阶段：幼年 / 成年 / 老年（犬 7 岁、猫 10 岁为界）。
 * @param {{birth?: string, species?: string}} pet
 * @param {Date} [today]
 */
export function growthStageOf(pet, today = new Date()) {
  if (!pet || !pet.birth) return '未知';
  const b = new Date(pet.birth);
  if (Number.isNaN(b.getTime())) return '未知';
  const months = (today.getFullYear() - b.getFullYear()) * 12 + (today.getMonth() - b.getMonth());
  if (months < 12) return '幼年';
  const oldAt = pet.species === '猫' ? 10 : pet.species === '狗' ? 7 : 8;
  return months / 12 > oldAt ? '老年' : '成年';
}

/**
 * 一行式体型摘要，给档案卡 / 3D HUD 用。
 * 例：'中型 · 偏轻 4.5kg · 体况 偏瘦'
 * @returns {string}
 */
export function sizeSummaryOf(pet) {
  if (!pet) return '';
  const parts = [];
  const type = sizeTypeOf(pet);
  if (type) parts.push(type);
  const d = weightDeviation(pet);
  if (d && d.label !== '标准') parts.push(d.label + Math.abs(d.diff) + 'kg');
  const bcs = bcsLabelOf(pet);
  if (bcs) parts.push('体况 ' + bcs);
  return parts.join(' · ');
}
