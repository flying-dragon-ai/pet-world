import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureGarden, petLevelOf, petAgeOf, DEFAULT_GARDEN } from '../../src/domain/pet.js';
import {
  breedKeyOf, petRefOf, sizeTypeOf, breedSizeTypeOf, sizeScaleOf,
  weightDeviation, heightDeviation, bcsOf, bcsLabelOf, growthStageOf, sizeSummaryOf,
} from '../../src/domain/pet.js';
import { BREED_SIZES, CAT_SIZES, BREED_ALIAS, SIZE_SCALE, BCS_LABELS } from '../../src/data/pet-sizes.js';
import { migrate } from '../../src/data/migrations.js';

test('ensureGarden 首次访问补齐四维与任务表', () => {
  const pet = { id: 'p1' };
  const garden = ensureGarden(pet);
  assert.equal(garden, pet.g);
  assert.equal(garden.satiety, DEFAULT_GARDEN.satiety);
  assert.deepEqual(garden.tasks, {});
  assert.equal(ensureGarden(pet), garden, '第二次返回同一对象');
});

test('ensureGarden 保留已有数值', () => {
  const pet = { g: { satiety: 12, mood: 34, clean: 56, vitality: 78, growth: 90 } };
  const garden = ensureGarden(pet);
  assert.equal(garden.satiety, 12);
  assert.deepEqual(garden.tasks, {}, '缺 tasks 时补上');
});

test('ensureGarden 传 null 也安全', () => {
  const garden = ensureGarden(null);
  assert.equal(garden.satiety, DEFAULT_GARDEN.satiety);
});

test('家园等级：每 120 成长值一级，封顶 9 级', () => {
  assert.equal(petLevelOf({ growth: 0 }), 1);
  assert.equal(petLevelOf({ growth: 119 }), 1);
  assert.equal(petLevelOf({ growth: 120 }), 2);
  assert.equal(petLevelOf({ growth: 420 }), 4);
  assert.equal(petLevelOf({ growth: 99999 }), 9);
  assert.equal(petLevelOf(undefined), 1);
});

test('年龄文案：月龄 / 岁 / 未知', () => {
  const today = new Date('2026-10-30T00:00:00');
  assert.equal(petAgeOf({ birth: '2026-07-30' }, today), '3个月');
  assert.equal(petAgeOf({ birth: '2023-10-30' }, today), '3岁');
  assert.equal(petAgeOf({}, today), '未知');
  assert.equal(petAgeOf({ birth: 'not-a-date' }, today), '未知');
  assert.equal(petAgeOf({ birth: '2026-10-30' }, today), '1个月', '不足一个月按 1 个月');
});

/* ==================== 宠物体型：身高 / 体重 / 体型类型 ==================== */

test('品种名 → 参考表 key：精确 / 中文别名 / 子串 / 未收录', () => {
  assert.equal(breedKeyOf('金毛寻回犬'), 'Golden Retriever');
  assert.equal(breedKeyOf('柯基'), 'Pembroke Welsh Corgi');
  assert.equal(breedKeyOf('中华田园猫（橘）'), '中华田园猫', '表名是子串时也能命中');
  assert.equal(breedKeyOf('拉布拉多混血'), 'Labrador Retriever', '别名是子串时也能命中');
  assert.equal(breedKeyOf('布偶猫'), '布偶猫', '猫表精确命中');
  assert.equal(breedKeyOf('不存在的品种'), null);
  assert.equal(breedKeyOf(''), null);
  assert.equal(breedKeyOf(undefined), null);
});

test('品种参考值：身高体重区间 + 组别 + 活力服从', () => {
  const ref = petRefOf({ species: '狗', breed: '金毛寻回犬' });
  assert.equal(ref.key, 'Golden Retriever');
  assert.deepEqual(ref.height, [54.61, 60.96]);
  assert.deepEqual(ref.weight, [24.95, 34.02]);
  assert.equal(ref.group, '运动犬');
  assert.equal(ref.energy, 100);
  assert.equal(petRefOf({ species: '猫', breed: '中华田园猫（橘）' }).key, '中华田园猫');
  assert.equal(petRefOf({ species: '狗', breed: '不存在的品种' }), null);
  assert.equal(petRefOf(null), null);
});

test('体型类型按当前体重分级（犬 迷你/小型/中型/大型/巨型）', () => {
  assert.equal(sizeTypeOf({ species: '狗', weight: 3 }), '迷你型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 4 }), '小型', '4kg 归小型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 11.9 }), '小型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 12 }), '中型', '12kg 归中型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 20.5 }), '中型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 25 }), '大型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 45 }), '巨型');
  assert.equal(sizeTypeOf({ species: '狗', weight: 0 }), null, '没有体重就分不了级');
});

test('体型类型按物种用不同阈值（猫 小型/中型/大型）', () => {
  assert.equal(sizeTypeOf({ species: '猫', weight: 3.9 }), '小型');
  assert.equal(sizeTypeOf({ species: '猫', weight: 5.2 }), '中型');
  assert.equal(sizeTypeOf({ species: '猫', weight: 6 }), '大型');
  assert.equal(sizeTypeOf({ species: '鸟', weight: 1 }), null, '鸟没有体型分级');
  assert.equal(sizeTypeOf({ species: '异宠', weight: 2 }), null);
  assert.equal(sizeScaleOf('狗').length, 5);
  assert.equal(sizeScaleOf('猫').length, 3);
});

test('体重偏差：跟品种成年体重中点比（尖尖 20.5kg 的金毛偏轻）', () => {
  const d = weightDeviation({ species: '狗', breed: '金毛寻回犬', weight: 20.5 });
  assert.equal(d.label, '偏轻');
  assert.equal(d.mid, 29.5);
  assert.equal(d.diff, -9);
  assert.equal(d.ratio, 0.7);
  assert.equal(weightDeviation({ species: '狗', breed: '金毛寻回犬', weight: 29.5 }).label, '标准');
  assert.equal(weightDeviation({ species: '狗', breed: '金毛寻回犬', weight: 40 }).label, '偏重');
  assert.equal(weightDeviation({ species: '狗', breed: '不存在的品种', weight: 10 }), null, '没收录的品种算不了');
});

test('品种典型体型：按成年体重中点分级', () => {
  assert.equal(breedSizeTypeOf({ species: '狗', breed: '金毛寻回犬' }), '大型', '金毛 29.5kg 属大型犬');
  assert.equal(breedSizeTypeOf({ species: '狗', breed: '吉娃娃' }), '迷你型');
  assert.equal(breedSizeTypeOf({ species: '狗', breed: '大丹犬' }), '巨型');
  assert.equal(breedSizeTypeOf({ species: '狗', breed: '柯基' }), '中型', '柯基 13.2kg 按体重阈值属中型');
});

test('体况评分 BCS 1–9（近似估算，不替代兽医触诊）', () => {
  assert.equal(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 20.5 }), 3);
  assert.equal(bcsLabelOf({ species: '狗', breed: '金毛寻回犬', weight: 20.5 }), '偏瘦');
  assert.equal(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 29.5 }), 5);
  assert.equal(bcsLabelOf({ species: '狗', breed: '金毛寻回犬', weight: 29.5 }), '理想');
  assert.equal(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 40 }), 8);
  assert.equal(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 44 }), 9);
  assert.equal(bcsOf({ species: '狗', breed: '不存在的品种', weight: 10 }), null);
  assert.ok(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 1 }) >= 1, '不会小于 1');
  assert.ok(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 90 }) <= 9, '不会大于 9');
});

test('身高偏差：跟品种成年肩高中点比', () => {
  const d = heightDeviation({ species: '狗', breed: '金毛寻回犬', height: 50 });
  assert.equal(d.label, '偏矮');
  assert.equal(d.mid, 57.8);
  assert.equal(heightDeviation({ species: '狗', breed: '金毛寻回犬', height: 58 }).label, '标准');
  assert.equal(heightDeviation({ species: '狗', breed: '金毛寻回犬' }), null, '没填身高就跳过');
});

test('生长阶段：幼年 / 成年 / 老年（犬 7 岁、猫 10 岁为界）', () => {
  const today = new Date('2026-10-30T00:00:00');
  assert.equal(growthStageOf({ birth: '2026-07-30', species: '狗' }, today), '幼年');
  assert.equal(growthStageOf({ birth: '2023-04-12', species: '猫' }, today), '成年');
  assert.equal(growthStageOf({ birth: '2015-01-01', species: '狗' }, today), '老年');
  assert.equal(growthStageOf({ birth: '2013-01-01', species: '猫' }, today), '老年');
  assert.equal(growthStageOf({}, today), '未知');
});

test('体型摘要一行文案', () => {
  assert.equal(
    sizeSummaryOf({ species: '狗', breed: '金毛寻回犬', weight: 20.5 }),
    '中型 · 偏轻9kg · 体况 偏瘦',
  );
  assert.equal(sizeSummaryOf({ species: '狗', breed: '金毛寻回犬', weight: 29.5 }), '大型 · 体况 理想');
  assert.equal(sizeSummaryOf(null), '');
});

/* ==================== 规格对齐：参考表规模与别名完整性 ==================== */

test('参考表规模：276 个犬种 / 29 条猫参考 / 5 档犬 3 档猫', () => {
  assert.equal(Object.keys(BREED_SIZES).length, 276, 'akcdata 转出的犬种数');
  assert.equal(Object.keys(CAT_SIZES).length, 29, '手写猫表条数');
  assert.equal(SIZE_SCALE['狗'].length, 5);
  assert.equal(SIZE_SCALE['猫'].length, 3);
  // 阈值口径：犬 迷你<4 / 小型4-12 / 中型12-25 / 大型25-45 / 巨型≥45
  assert.deepEqual(SIZE_SCALE['狗'].map((s) => s.max), [4, 12, 25, 45, Infinity]);
  // 猫：小型<4 / 中型4-6 / 大型≥6
  assert.deepEqual(SIZE_SCALE['猫'].map((s) => s.max), [4, 6, Infinity]);
  assert.deepEqual(Object.keys(BCS_LABELS).map(Number), [1, 2, 3, 4, 5, 6, 7, 8, 9], 'BCS 1–9 全档有文案');
});

test('别名表零悬挂：每个中文别名都指向真实存在的参考记录', () => {
  const dangling = Object.entries(BREED_ALIAS)
    .filter(([, en]) => !BREED_SIZES[en] && !CAT_SIZES[en])
    .map(([cn, en]) => cn + '→' + en);
  assert.deepEqual(dangling, [], '别名指向不存在的 key 会让体型静默退化成 null');
});

test('常见品种别名回归（打架对手库也靠这张表拿体型）', () => {
  assert.equal(breedKeyOf('泰迪'), 'Poodle (Toy)', '泰迪 = 玩具贵宾');
  assert.equal(breedKeyOf('泰迪混血'), 'Poodle (Toy)', '混血走子串');
  assert.equal(breedKeyOf('贵宾犬'), 'Poodle (Miniature)');
  assert.equal(breedKeyOf('标准贵宾'), 'Poodle (Standard)');
  assert.equal(breedKeyOf('巨型雪纳瑞'), 'Giant Schnauzer', '长名优先，不能被「雪纳瑞」抢先命中');
  assert.equal(breedKeyOf('雪纳瑞'), 'Miniature Schnauzer');
  assert.equal(breedKeyOf('比特犬'), 'American Staffordshire Terrier');
  assert.equal(breedKeyOf('苏牧'), 'Collie');
  assert.equal(breedKeyOf('猎鹿犬'), 'Scottish Deerhound');
  assert.equal(breedKeyOf('纽波利顿'), 'Neapolitan Mastiff');
  assert.equal(breedKeyOf('猎狐梗'), 'Smooth Fox Terrier');
});

/* ==================== 规格对齐：真实档案回归用例 ==================== */

/** 「尖尖」：seed.js 里的金毛，档案写 20.5kg / 50cm（品种标准 24.95–34.02kg / 54.61–60.96cm） */
const JIANJIAN = { id: 'p3', name: '尖尖', species: '狗', breed: '金毛寻回犬', weight: 20.5, height: 50 };
/** 「小乐」：seed.js 里的柯基，11.6kg（Pembroke 标准 12.70–13.61kg） */
const XIAOLE = { id: 'p2', name: '小乐', species: '狗', breed: '柯基', weight: 11.6 };

test('回归：尖尖（金毛 20.5kg/50cm）→ 中型 · 偏轻 · 偏矮', () => {
  assert.equal(sizeTypeOf(JIANJIAN), '中型', '按当前体重 20.5kg 归中型');
  assert.equal(breedSizeTypeOf(JIANJIAN), '大型', '按品种成年体重（29.5kg 中点）归大型');
  const w = weightDeviation(JIANJIAN);
  assert.equal(w.label, '偏轻');
  assert.equal(w.mid, 29.5);
  assert.ok(w.diff < -8 && w.diff > -10, '比品种中点轻约 9kg');
  assert.equal(heightDeviation(JIANJIAN).label, '偏矮');
  assert.equal(bcsOf(JIANJIAN), 3);
  assert.equal(bcsLabelOf(JIANJIAN), '偏瘦');
  assert.ok(sizeSummaryOf(JIANJIAN).indexOf('中型') === 0);
  assert.ok(sizeSummaryOf(JIANJIAN).indexOf('偏轻') > 0);
});

test('回归：小乐（柯基 11.6kg）→ 落在标准区间附近', () => {
  const d = weightDeviation(XIAOLE);
  assert.equal(d.label, '标准', '11.6 / 13.155 ≈ 0.88，仍在 ±15% 带内');
  assert.ok(Math.abs(d.diff) < 2, '偏差不到 2kg');
  assert.equal(sizeTypeOf(XIAOLE), '小型', '按体重 11.6kg 属小型（品种典型是中型，正好体现两套口径）');
  assert.equal(breedSizeTypeOf(XIAOLE), '中型');
  assert.ok(bcsOf(XIAOLE) >= 4 && bcsOf(XIAOLE) <= 5, '体况在理想附近');
});

test('体况评分：极端值被夹在 1–9，且随体重单调不减', () => {
  assert.equal(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 0.5 }), 1, '极瘦夹到 1');
  assert.equal(bcsOf({ species: '狗', breed: '金毛寻回犬', weight: 200 }), 9, '极胖夹到 9');
  let prev = 0;
  for (let w = 1; w <= 80; w += 0.5) {
    const b = bcsOf({ species: '狗', breed: '金毛寻回犬', weight: w });
    assert.ok(b >= 1 && b <= 9, 'BCS 越界：' + w + 'kg → ' + b);
    assert.ok(b >= prev, 'BCS 非单调：' + w + 'kg → ' + b + ' 小于上一档 ' + prev);
    prev = b;
  }
  assert.equal(prev, 9, '扫到 80kg 一定到顶');
});

test('品种未收录：不抛异常，参考值类一律 null，体型仍按体重判定', () => {
  const alien = { species: '狗', breed: '火星犬', weight: 9 };
  assert.equal(petRefOf(alien), null);
  assert.equal(breedSizeTypeOf(alien), null);
  assert.equal(weightDeviation(alien), null);
  assert.equal(heightDeviation(alien), null);
  assert.equal(bcsOf(alien), null);
  assert.equal(bcsLabelOf(alien), '');
  assert.equal(sizeTypeOf(alien), '小型', '品种没收录也能按体重分级');
  assert.equal(sizeSummaryOf(alien), '小型');
  assert.doesNotThrow(() => sizeSummaryOf({}));
  assert.doesNotThrow(() => sizeSummaryOf({ species: '狗', breed: null, weight: null }));
  assert.equal(sizeSummaryOf({}), '');
});

test('体型是派生值：纯函数不往宠物对象上写字段（体型类型不落盘）', () => {
  const pet = { species: '狗', breed: '柯基', weight: 11.6, height: 27 };
  const snapshot = JSON.stringify(pet);
  sizeTypeOf(pet); breedSizeTypeOf(pet); weightDeviation(pet);
  heightDeviation(pet); bcsOf(pet); bcsLabelOf(pet); sizeSummaryOf(pet); growthStageOf(pet);
  assert.equal(JSON.stringify(pet), snapshot, '派生函数必须是只读的');
  assert.equal('sizeType' in pet, false);
});

/* ==================== 存档迁移（只读校验 migrations.js 的行为） ==================== */

/**
 * 老存档样本：V1.10 之前的样子 ——
 * 无 height、有拼接的 pat、无 build/pattern/eye，世界档案无 impulse/aggression/battle。
 */
function oldSave() {
  return {
    v: 3,
    pets: [
      { id: 'old1', name: '老狗', species: '狗', breed: '柯基', weight: 11.6, pat: '斑点·杏眼·偏瘦' },
      { id: 'old2', name: '老猫', species: '猫', breed: '橘猫', weight: 4.2 },
      { id: 'old3', name: '野种', species: '狗', breed: '不存在的品种', weight: 8, pat: '纯色·圆眼·圆润' },
      { id: 'old4', name: '鸟', species: '鸟', breed: '玄凤鹦鹉', weight: 0.1, height: '' },
    ],
    world: {
      coinA: 30,
      medals: [],
      pets: { old1: { courage: 60, attr: { hunger: 80, clean: 80, mood: 70, stamina: 85, wisdom: 0, growth: 0 } } },
    },
    notifs: [],
  };
}

const byId = (list, id) => list.find((p) => p.id === id);

test('迁移：老存档补 height / build / pattern / eye，且 pat 已拆开', () => {
  const S = migrate(oldSave());
  const p1 = byId(S.pets, 'old1');
  assert.equal(p1.pattern, '斑点');
  assert.equal(p1.eye, '杏眼');
  assert.equal(p1.build, '偏瘦', '第三段是体格');
  assert.equal(p1.height, 25, '缺 height 时按品种成年身高下限补（柯基 25.4cm → 25）');

  const p2 = byId(S.pets, 'old2');
  assert.equal(p2.build, '标准', '没有 pat 的老档案默认标准');
  assert.equal(p2.pattern, '');
  assert.equal(p2.eye, '');
  assert.equal(p2.height, 23, '橘猫身高下限 23cm');

  const p3 = byId(S.pets, 'old3');
  assert.equal(p3.height, '', '品种未收录时留空，不能瞎补');
  assert.equal(p3.build, '圆润');

  const p4 = byId(S.pets, 'old4');
  assert.equal(p4.height, '', '本来就空且品种不在表里 → 仍然留空');
  assert.equal(p4.build, '标准');
});

test('迁移：老存档的世界档案补 impulse / aggression / battle 战绩', () => {
  const S = migrate(oldSave());
  const w = S.world.pets.old1;
  assert.equal(w.impulse, 40, '冲动值兜底 40');
  assert.equal(w.aggression, 30, '攻击值兜底 30');
  assert.deepEqual(w.battle, { win: 0, draw: 0, lose: 0, last: null });
  assert.ok(Array.isArray(S.world.firedEvents), '战斗去重口径依赖 firedEvents');
});

test('迁移：已经迁移过的存档再跑一遍不变（幂等）', () => {
  const once = migrate(oldSave());
  const twice = migrate(JSON.parse(JSON.stringify(once)));
  const pick = (S) => S.pets.map((p) => [p.id, p.height, p.build, p.pattern, p.eye]).sort();
  assert.deepEqual(pick(twice), pick(once));
  assert.deepEqual(twice.world.pets.old1.battle, once.world.pets.old1.battle);
});
