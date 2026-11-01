import test from 'node:test';
import assert from 'node:assert/strict';

import {
  makeRng, battleStats, foeStats, resolveBattle, injuryOf, rewardOf, settleOf, INJURY_CAP,
} from '../../src/domain/battle.js';
import { BATTLE_FOES, FOE_BY_ID, BATTLE_INJURY } from '../../src/data/battle-tables.js';
import { defaultWorldPet, pendingEvents } from '../../src/domain/world.js';
import { WORLD_EVENTS } from '../../src/data/world-tables.js';
import { BATTLE_MAX_ROUNDS } from '../../src/app/config.js';

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
  assert.equal(s.spd, 55, '50 × 体型1 + 等级20 × 0.25（等级决定先手权）');
});

test('战斗面板：速度随等级提升（Lv.1 与 Lv.60 不能同速）', () => {
  const w = { courage: 60, aggression: 30, attr: { stamina: 85 } };
  const lv1 = battleStats(JIN, w, 1);
  const lv60 = battleStats(JIN, w, 60);
  assert.equal(lv1.spd, 50);
  assert.equal(lv60.spd, 65);
  assert.ok(lv60.spd > lv1.spd);
  assert.equal(battleStats(JIN, w, 0).level, 1, '等级下限 1');
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
  const raw = FOE_BY_ID.f8;
  const f = foeStats(raw);
  assert.equal(f.size, '大型', '金毛是大型犬');
  assert.equal(f.atk, Math.round(raw.atk * 1.1), '攻击乘了大型系数');
  assert.equal(f.spd, Math.round(raw.spd * 0.9 + raw.lv * 0.25), '速度乘了大型系数 + 等级加速');
  // 同一个面板换成长得更小的品种：更快、更弱
  const tiny = foeStats({ ...raw, breed: '吉娃娃' });
  assert.equal(tiny.size, '迷你型');
  assert.ok(tiny.atk < f.atk, '迷你犬攻击更低');
  assert.ok(tiny.spd > f.spd, '迷你犬速度更快');
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
  assert.deepEqual(r1, r2, '整个结算对象必须一模一样');
});

test('回合结算：不同 seed 至少能打出不同结果', () => {
  const mine = battleStats(JIN, { courage: 70, aggression: 75, attr: { stamina: 90 } }, 20);
  const foe = foeStats(FOE_BY_ID.f6);
  const seen = new Set();
  for (let seed = 0; seed < 32; seed++) {
    const r = resolveBattle({ mine, foe, rng: makeRng(seed) });
    seen.add(JSON.stringify([r.outcome, r.rounds, r.log.map((l) => l.dmg)]));
  }
  assert.ok(seen.size > 1, '不同 seed 应产生不同伤害序列，实际只有 ' + seen.size + ' 种');
});

test('回合结算：胜负两条分支都能覆盖到', () => {
  const mine = battleStats(JIN, { courage: 70, aggression: 75, attr: { stamina: 90 } }, 20);
  const foe = foeStats(FOE_BY_ID.f6);
  const outcomes = new Set();
  for (let seed = 0; seed < 40; seed++) outcomes.add(resolveBattle({ mine, foe, rng: makeRng(seed) }).outcome);
  assert.ok(outcomes.has('win'), '应有赢的种子');
  assert.ok(outcomes.has('lose'), '应有输的种子');
  assert.ok(![...outcomes].some((o) => !['win', 'lose', 'draw'].includes(o)), '结果枚举只能有三种');
});

test('回合结算：日志与胜负自洽，血量不会为负', () => {
  const mine = battleStats(JIN, { courage: 90, aggression: 90, attr: { stamina: 100 } }, 40);
  const foe = foeStats(FOE_BY_ID.f1);
  const r = resolveBattle({ mine, foe, rng: makeRng(42) });
  assert.ok(['win', 'lose', 'draw'].includes(r.outcome));
  assert.ok(r.rounds >= 1 && r.rounds <= BATTLE_MAX_ROUNDS, '回合数不超过上限');
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

test('负伤上限：每种结果都卡在 INJURY_CAP 以内（赢不会进医院）', () => {
  const order = ['none', 'mild', 'scratch', 'hurt'];
  ['win', 'draw', 'lose'].forEach((outcome) => {
    const cap = order.indexOf(INJURY_CAP[outcome]);
    for (let i = 0; i < 200; i++) {
      const level = injuryOf({ outcome }, makeRng(i));
      assert.ok(order.indexOf(level) <= cap, outcome + ' 抽出了越级的负伤：' + level);
    }
  });
  assert.equal(INJURY_CAP.win, 'mild', '赢了最多轻伤');
  assert.equal(INJURY_CAP.lose, 'hurt', '输了才可能受伤');
  const unusable = injuryOf({ outcome: 'no-such-outcome' }, makeRng(0.1));
  assert.equal(unusable, 'hurt', '未知结果走最重档但不抛异常');
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

/* ==================== 净收支（settleOf）与负伤上限 ==================== */

test('净收支：负伤消耗严格不超过 BATTLE_INJURY 声明的上限', () => {
  const results = [
    { outcome: 'win', rounds: 4 },
    { outcome: 'draw', rounds: 6 },
    { outcome: 'lose', rounds: 3 },
  ];
  Object.keys(BATTLE_INJURY).forEach((level) => {
    const declared = BATTLE_INJURY[level].cost;
    results.forEach((r) => {
      const s = settleOf(r, level);
      assert.equal(s.injury, level);
      Object.keys(s.cost).forEach((a) => {
        assert.ok(s.cost[a] <= (declared[a] || 0), level + '.' + a + ' 超出声明上限');
        assert.ok(s.cost[a] >= 0, '消耗量不能是负数');
      });
      Object.keys(declared).forEach((a) => {
        assert.ok(Object.prototype.hasOwnProperty.call(s.cost, a), level + ' 漏了 ' + a + ' 的消耗');
      });
    });
  });
});

test('净收支：负伤越重代价越大，未知负伤退化成无伤', () => {
  const r = { outcome: 'lose', rounds: 4 };
  const order = ['none', 'mild', 'scratch', 'hurt'];
  for (let i = 1; i < order.length; i++) {
    const prev = settleOf(r, order[i - 1]).cost;
    const cur = settleOf(r, order[i]).cost;
    assert.ok((cur.stamina || 0) >= (prev.stamina || 0), order[i] + ' 体力消耗不该更少');
    assert.ok((cur.mood || 0) >= (prev.mood || 0), order[i] + ' 心情消耗不该更少');
  }
  const bogus = settleOf(r, 'no-such-injury');
  assert.equal(bogus.injury, 'none');
  assert.deepEqual(bogus.cost, {});
});

test('净收支：赢了加心情，输了没有金币', () => {
  const win = settleOf({ outcome: 'win', rounds: 4 }, 'none');
  assert.equal(win.gain.mood, 6);
  assert.ok(win.coinA > 0);
  assert.equal(win.gain.growth, rewardOf({ outcome: 'win', rounds: 4 }).growth, '成长值口径与 rewardOf 一致');
  const lose = settleOf({ outcome: 'lose', rounds: 5 }, 'hurt');
  assert.equal(lose.coinA, 0);
  assert.equal(lose.gain.mood, undefined, '输了不掉心情（心情由负伤扣）');
  assert.equal(lose.cost.stamina, BATTLE_INJURY.hurt.cost.stamina);
});

/* ==================== 对手库：原创 + 体型换算 + 难度阶梯 ==================== */

test('对手库：8 个原创对手，名字唯一，面板落在合理区间', () => {
  assert.equal(BATTLE_FOES.length, 8);
  assert.equal(new Set(BATTLE_FOES.map((f) => f.n)).size, 8, '对手名字不能重复');
  assert.equal(new Set(BATTLE_FOES.map((f) => f.id)).size, 8, '对手 id 不能重复');
  ['atk', 'def', 'spd', 'hp', 'lv'].forEach((k) => {
    BATTLE_FOES.forEach((f) => assert.ok(f[k] > 0 && f[k] <= 120, f.n + '.' + k + ' 超范围'));
  });
  // 难度阶梯：id 序 = 由弱到强
  const power = BATTLE_FOES.map((f) => { const s = foeStats(f); return s.atk + s.def + s.hp; });
  for (let i = 1; i < power.length; i++) assert.ok(power[i] >= power[i - 1], '第 ' + (i + 1) + ' 个对手比前一个弱');
  // 每只都能换算出体型（体型系数靠 pet-sizes 的品种表，别名断了就会退化成中型）
  BATTLE_FOES.forEach((f) => {
    const s = foeStats(f);
    assert.ok(['迷你型', '小型', '中型', '大型', '巨型'].includes(s.size), f.n + ' 体型异常：' + s.size);
  });
  assert.equal(foeStats(FOE_BY_ID.f2).size, '迷你型', '泰迪（玩具贵宾 1.81–2.72kg）是迷你型');
});

test('难度阶梯：最终 BOSS 是一道墙 —— 新手/中期 0%，毕业也只在 10%~45%（平衡模拟的回归锚点）', () => {
  const boss = foeStats(FOE_BY_ID.f8);
  const rate = (w, lv) => {
    const mine = battleStats(JIN, w, lv);
    let win = 0;
    for (let seed = 0; seed < 24; seed++) {
      if (resolveBattle({ mine, foe: boss, rng: makeRng(seed * 31 + 7) }).outcome === 'win') win++;
    }
    return win / 24;
  };
  const rookie = rate({ courage: 60, aggression: 30, attr: { stamina: 85 } }, 1);
  const graduate = rate({ courage: 95, aggression: 95, attr: { stamina: 100 } }, 60);
  const mid = rate({ courage: 70, aggression: 75, attr: { stamina: 90 } }, 20);
  assert.equal(rookie, 0, 'Lv.1 不该打赢最终 BOSS');
  assert.equal(mid, 0, 'Lv.20 也不该打赢最终 BOSS');
  assert.ok(graduate > 0 && graduate <= 0.45, '毕业 Lv.60 对最终 BOSS 应是一场硬仗（10%~45%），实际胜率 ' + graduate);
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
