import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultWorldPet, ensureWorldPet, worldLevelOf, capFor, applyCost, applyGain,
  applyCostAndGain, missingAttrs, negate, attrDeltaText, attrDeltaHTML,
  pendingEvents, settleOffline, WELCOME_BACK_HOURS,
} from '../../src/domain/world.js';
import { COURSES, JOBS, GOODS, VENUES, WORLD_EVENTS, MEDALS } from '../../src/data/world-tables.js';

/* ---------- 六维与等级曲线 ---------- */

test('新宠入世界：勇气 60、六维齐全', () => {
  const w = defaultWorldPet();
  assert.equal(w.courage, 60);
  assert.deepEqual(Object.keys(w.attr), ['hunger', 'clean', 'mood', 'stamina', 'wisdom', 'growth']);
  assert.equal(w.courseLv, 0);
  assert.equal(w.jobLv, 0);
});

test('成长值 → 等级：每 50 点一级，1–100 级', () => {
  assert.equal(worldLevelOf(0), 1);
  assert.equal(worldLevelOf(49), 1);
  assert.equal(worldLevelOf(50), 2);
  assert.equal(worldLevelOf(1450), 30);
  assert.equal(worldLevelOf(2000), 41);
  assert.equal(worldLevelOf(9999), 100);
  assert.equal(worldLevelOf(undefined), 1);
});

test('属性上限：普通 100，成长/智慧 9999', () => {
  assert.equal(capFor('hunger'), 100);
  assert.equal(capFor('growth'), 9999);
  assert.equal(capFor('wisdom'), 9999);
});

/* ---------- 消耗与收益 ---------- */

test('applyGain 按各自上限封顶，且不会低于 0', () => {
  const w = defaultWorldPet();
  w.attr.growth = 9995;
  applyGain(w, { growth: 10 });
  assert.equal(w.attr.growth, 9999);

  w.attr.hunger = 50;
  applyGain(w, { hunger: 999 });
  assert.equal(w.attr.hunger, 100);

  w.attr.hunger = 10;
  applyGain(w, { hunger: -999 });
  assert.equal(w.attr.hunger, 0);
});

test('applyCost 扣属性有 0 保底', () => {
  const w = defaultWorldPet();
  w.attr.hunger = 5;
  applyCost(w, { hunger: 30 });
  assert.equal(w.attr.hunger, 0);
});

test('applyCostAndGain 先扣后加', () => {
  const w = defaultWorldPet();
  w.attr.hunger = 50;
  w.attr.mood = 50;
  applyCostAndGain(w, { hunger: 10 }, { mood: 7 });
  assert.equal(w.attr.hunger, 40);
  assert.equal(w.attr.mood, 57);
});

test('missingAttrs 检出不足项', () => {
  const w = defaultWorldPet();
  w.attr.hunger = 50;
  w.attr.clean = 10;
  assert.deepEqual(missingAttrs(w, { hunger: 60, clean: 10 }), ['hunger']);
  assert.deepEqual(missingAttrs(w, { hunger: 1 }), []);
});

test('negate 与数值文案', () => {
  assert.deepEqual(negate({ mood: 7, hunger: 6 }), { mood: -7, hunger: -6 });
  assert.equal(attrDeltaText({ mood: 7, hunger: -6 }), '心情值+7 饥饿值-6');
  assert.match(attrDeltaHTML({ mood: 7 }), /#3BB786/);
  assert.match(attrDeltaHTML({ hunger: -6 }), /#F05B5B/);
});

/* ---------- 事件引擎 ---------- */

test('蝶舞之约：登录满 5 天且勇气 > 50 才触发，只触发一次', () => {
  const world = { loginDays: 4, medals: [] };
  const w = defaultWorldPet();
  w.courage = 60;
  assert.equal(pendingEvents(world, w).length, 0, '天数不够不触发');

  world.loginDays = 5;
  assert.equal(pendingEvents(world, w).length, 1);

  w.courage = 40;
  assert.equal(pendingEvents(world, w).length, 0, '勇气不足不触发');

  w.courage = 60;
  world.medals.push('butterfly');
  assert.equal(pendingEvents(world, w).length, 0, '已获得不重复发放');
});

test('事件表与战功目录一一对应', () => {
  assert.equal(MEDALS.length, WORLD_EVENTS.length);
  assert.equal(MEDALS[0].id, 'butterfly');
  assert.equal(WORLD_EVENTS[0].gain.growth, 5);
});

/* ---------- 离线结算 ---------- */

test('离线不足 0.2h 不衰减，但会推进 lastLeave', () => {
  const world = { lastLeave: 1000 };
  const pets = { p1: defaultWorldPet() };
  pets.p1.attr.hunger = 80;
  const result = settleOffline(world, ['p1'], 1000 + 60_000, (id) => pets[id]);
  assert.equal(result.skipped, true);
  assert.equal(pets.p1.attr.hunger, 80);
  assert.equal(world.lastLeave, 1000 + 60_000);
});

test('离线 12h：饥饿 -24（下限 0）、心情 -12（下限 20），多宠物同步衰减', () => {
  const hour = 3_600_000;
  const now = 1_000_000_000;
  const world = { lastLeave: now - 12 * hour };
  const pets = { p1: defaultWorldPet(), p2: defaultWorldPet() };
  pets.p1.attr.hunger = 10;
  pets.p1.attr.mood = 25;
  pets.p2.attr.hunger = 100;
  pets.p2.attr.mood = 100;

  const result = settleOffline(world, ['p1', 'p2'], now, (id) => pets[id]);
  assert.equal(result.skipped, false);
  assert.equal(pets.p1.attr.hunger, 0);
  assert.equal(pets.p1.attr.mood, 20);
  assert.equal(pets.p2.attr.hunger, 76);
  assert.equal(pets.p2.attr.mood, 88);
  assert.equal(result.before.p1.hunger, 10, 'before 记录用于「主人回来了」卡片');
});

test('离线时长上限 240h（防止改系统时间导致属性归零）', () => {
  const hour = 3_600_000;
  const now = 5_000_000_000;
  const world = { lastLeave: now - 10_000 * hour };
  const pets = { p1: defaultWorldPet() };
  pets.p1.attr.hunger = 100;
  pets.p1.attr.mood = 100;
  settleOffline(world, ['p1'], now, (id) => pets[id]);
  assert.equal(pets.p1.attr.hunger, Math.max(0, 100 - 240 * 2));
  assert.equal(pets.p1.attr.mood, 20);
});

test('超过 8h 才弹欢迎卡', () => {
  assert.equal(WELCOME_BACK_HOURS, 8);
});

/* ---------- 数值表 ---------- */

test('课程 / 打工 / 商品 / 场馆 的规模与关键数值', () => {
  assert.equal(COURSES.length, 3);
  assert.equal(JOBS.length, 3);
  assert.deepEqual(JOBS.map((j) => j.gain.coinA), [5, 15, 25]);
  assert.equal(GOODS.length, 4);
  assert.equal(VENUES.sport.items.length, 6);
  assert.equal(VENUES.fun.items.length, 6);
  assert.equal(VENUES.sport.name, '运动馆');
  assert.equal(VENUES.fun.name, '娱乐馆');
});

test('ensureWorldPet 建档并修正 NaN', () => {
  const world = {};
  const w = ensureWorldPet(world, 'p9');
  assert.equal(world.pets.p9, w);
  w.attr.hunger = NaN;
  ensureWorldPet(world, 'p9');
  assert.equal(w.attr.hunger, 0);
});
