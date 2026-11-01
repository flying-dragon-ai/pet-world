import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureGarden, petLevelOf, petAgeOf, DEFAULT_GARDEN } from '../../src/domain/pet.js';
import {
  breedKeyOf, petRefOf, sizeTypeOf, breedSizeTypeOf, sizeScaleOf,
  weightDeviation, heightDeviation, bcsOf, bcsLabelOf, growthStageOf, sizeSummaryOf,
} from '../../src/domain/pet.js';

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
