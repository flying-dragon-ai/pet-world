import test from 'node:test';
import assert from 'node:assert/strict';

import {
  makeRng, battleStats, foeStats, resolveBattle, injuryOf, rewardOf,
} from '../../src/domain/battle.js';
import { BATTLE_FOES, FOE_BY_ID, BATTLE_INJURY } from '../../src/data/battle-tables.js';
import { defaultWorldPet, pendingEvents } from '../../src/domain/world.js';
import { WORLD_EVENTS } from '../../src/data/world-tables.js';

const JIN = { id: 'p3', name: '尖尖', species: '狗', breed: '金毛寻回犬', weight: 20.5, height: 50 };

test('makeRng：同 seed 必得同一串随机数', () => {
  const a = makeRng(12345);
  const b = makeRng(12345);
  const c = makeRng(54321);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  const seqC = [c(), c(), c()];
  assert.deepEqual(seqA, seqB, '同 seed 同结果');
  assert.notDeepEqual(seqA, seqC, '不同 seed 不同结果');
  seqA.forEach((v) => assert.ok(v >= 0 && v < 1, '落在 [0,1)'));
});

test('战斗面板：我的宠物由档案 + 二元属性 + 体型算出', () => {
  const s = battleStats(JIN, { courage: 60, aggression: 30, attr: { stamina: 85 } }, 20);
  assert.equal(s.size, '中型', '20.5kg 的金毛按体重阈值是中型');
  assert.equal(s.level, 20);
  assert.equal(s.hp, 96, '36 + 体力85 × 0.7');
  assert.equal(s.atk, 42, '(攻击30×0.6 + 勇气60×0.4) × 体型1');
  assert.equal(s.def, 70, '(包容70×0.5 + 35)');
  assert.equal(s.spd, 50);
});

test('战斗面板：体型影响攻击与速度（大型犬更猛但更慢）', () => {
  const w = { courage: 60, aggression: 30, attr: { stamina: 85 } };
  const mid = battleStats({ species: '狗', weight: 20 }, w, 20);
  const big = battleStats({ species: '狗', weight: 40 }, w, 20);
  const tiny = battleStats({ species: '狗', weight: 3 }, w, 20);
  assert.equal(big.size, '大型');
  assert.ok(big.atk > mid.atk, '大型犬攻击更高');
  assert.ok(big.spd < mid.spd, '大型犬速度更低');
  assert.ok(tiny.spd > mid.spd, '迷你犬速度更快');
  assert.ok(tiny.atk < mid.atk, '迷你犬攻击更低');
});

test('对手面板：由品种推体型并套用体型系数', () => {
  const f = foeStats(FOE_BY_ID.f8);
  assert.equal(f.size, '大型', '金毛是大型犬');
  assert.ok(f.atk > FOE_BY_ID.f8.atk, '攻击乘了大型系数');
  assert.ok(f.spd < FOE_BY_ID.f8.spd, '速度乘了大型系数');
  assert.equal(foeStats(FOE_BY_ID.f1).size, '中型', '中华田园猫按体重是中型');
});

test('回合结算：同 seed 结果完全可复现', () => {
  const mine = battleStats(JIN, { courage: 60, aggression: 30, attr: { stamina: 85 } }, 20);
  const foe = foeStats(FOE_BY_ID.f5);
  const r1 = resolveBattle({ mine, foe, rng: makeRng(777) });
  const r2 = resolveBattle({ mine, foe, rng: makeRng(777) });
  assert.equal(r1.outcome, r2.outcome);
  assert.equal(r1.rounds, r2.rounds);
  assert.deepEqual(r1.log, r2.log);
});

test('回合结算：日志与胜负自洽，血量不会为负', () => {
  const mine = battleStats(JIN, { courage: 90, aggression: 90, attr: { stamina: 100 } }, 40);
  const foe = foeStats(FOE_BY_ID.f1);
  const r = resolveBattle({ mine, foe, rng: makeRng(42) });
  assert.ok(['win', 'lose', 'draw'].includes(r.outcome));
  assert.ok(r.rounds >= 1 && r.rounds <= 8, '回合数不超过上限');
  assert.ok(r.myHp >= 0 && r.foeHp >= 0, '血量不为负');
  r.log.forEach((l) => {
    assert.ok(l.dmg >= 1, '每一下至少造成 1 点伤害');
    assert.ok(l.left >= 0);
    assert.ok(['me', 'foe'].includes(l.side));
  });
  if (r.outcome === 'win') assert.ok(r.foeHp <= 0 && r.myHp > 0);
  if (r.outcome === 'lose') assert.ok(r.myHp <= 0);
});

test('强打弱必胜，弱打强必败（面板差距足够大时）', () => {
  const strong = battleStats(JIN, { courage: 100, aggression: 100, attr: { stamina: 100 } }, 60);
  const weak = foeStats(FOE_BY_ID.f1);
  const r = resolveBattle({ mine: strong, foe: weak, rng: makeRng(9) });
  assert.equal(r.outcome, 'win');

  const timid = battleStats(JIN, { courage: 0, aggression: 0, attr: { stamina: 5 } }, 1);
  const boss = foeStats(FOE_BY_ID.f8);
  const r2 = resolveBattle({ mine: timid, foe: boss, rng: makeRng(9) });
  assert.equal(r2.outcome, 'lose');
});

test('负伤判定：赢了基本没事，输了大概率带伤', () => {
  assert.equal(injuryOf({ outcome: 'win' }, makeRng(1)), 'none');
  assert.equal(injuryOf({ outcome: 'lose' }, makeRng(0.1)), 'hurt');
  const loseLevels = ['none', 'mild', 'scratch', 'hurt'];
  for (let i = 0; i < 40; i++) {
    assert.ok(loseLevels.includes(injuryOf({ outcome: 'lose' }, makeRng(i))));
  }
});

test('奖励：赢 > 平 > 负，金币只有赢和平有', () => {
  assert.ok(rewardOf({ outcome: 'win', rounds: 4 }).growth > rewardOf({ outcome: 'draw', rounds: 4 }).growth);
  assert.ok(rewardOf({ outcome: 'draw', rounds: 4 }).growth > rewardOf({ outcome: 'lose', rounds: 4 }).growth);
  assert.equal(rewardOf({ outcome: 'lose', rounds: 4 }).coinA, 0);
  assert.ok(rewardOf({ outcome: 'win', rounds: 6 }).growth > rewardOf({ outcome: 'win', rounds: 3 }).growth, '打得越久成长越多');
});

test('负伤表：消耗量是正数（结算时按扣属性处理）', () => {
  Object.keys(BATTLE_INJURY).forEach((k) => {
    const c = BATTLE_INJURY[k].cost;
    Object.keys(c).forEach((a) => assert.ok(c[a] >= 0, k + '.' + a + ' 应为非负消耗量'));
  });
});

test('世界档案默认带冲动值与攻击值', () => {
  const w = defaultWorldPet();
  assert.equal(w.impulse, 40);
  assert.equal(w.aggression, 30);
});

test('战功事件：街头大战用复合条件（冲动且攻击都高）', () => {
  const ev = WORLD_EVENTS.find((e) => e.id === 'streetfight');
  assert.ok(ev, '街头大战事件存在');
  assert.equal(ev.battle, true);
  const world = { loginDays: 5, medals: [], firedEvents: [] };
  assert.equal(pendingEvents(world, { impulse: 70, aggression: 70 }).length, 1, '两个都高才触发');
  assert.equal(pendingEvents(world, { impulse: 70, aggression: 30 }).length, 0, '攻击不够不触发');
  assert.equal(pendingEvents(world, { impulse: 30, aggression: 70 }).length, 0, '冲动不够不触发');
  assert.equal(pendingEvents(world, { impulse: 70, aggression: 70, courage: 90 }).length, 2, '勇气事件也满足条件');
});

test('战功事件：触发过的战斗事件不再重复弹', () => {
  const world = { loginDays: 5, medals: [], firedEvents: ['streetfight'] };
  const ready = pendingEvents(world, { impulse: 70, aggression: 70, courage: 90 });
  assert.equal(ready.filter((e) => e.id === 'streetfight').length, 0);
});

test('战功事件：登录天数不够就不触发', () => {
  const world = { loginDays: 1, medals: [], firedEvents: [] };
  assert.equal(pendingEvents(world, { impulse: 90, aggression: 90 }).length, 0);
});
