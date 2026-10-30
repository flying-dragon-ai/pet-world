import test from 'node:test';
import assert from 'node:assert/strict';

import { ensureGarden, petLevelOf, petAgeOf, DEFAULT_GARDEN } from '../../src/domain/pet.js';

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
