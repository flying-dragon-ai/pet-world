/**
 * 宠物档案与家园四维（纯函数层）。
 *
 * 与"人宠世界"的六维（hunger/clean/mood/stamina/wisdom/growth）不同，
 * 家园四维是 App 内的日常养成：satiety/mood/clean/vitality + growth。
 */

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
