/**
 * 打架系统平衡模拟（开发工具，不进产品包）。
 *
 * 用途：改完 src/data/battle-tables.js 或 src/domain/battle.js 的数值后，
 * 跑一下看胜率曲线是否合理 —— 新手别太难、中期有挑战、毕业能碾压。
 *
 * 当前档位（400 局/格，seed 0..399）：
 *   新手 Lv1  → 前 5 个对手基本稳赢；后 3 个（边牧/哈士奇/金毛）0%
 *   中期 Lv20 → 边牧约五五开；哈士奇与金毛是墙
 *   毕业 Lv60 → 前 7 个稳碾；流浪金毛（最终 BOSS）约 90%+
 * 这三档反过来就是回归锚点，见 dev/test/battle.test.js「难度阶梯」用例。
 *
 * 用法：node dev/balance.mjs
 */
import { makeRng, battleStats, foeStats, resolveBattle } from '../src/domain/battle.js';
import { BATTLE_FOES } from '../src/data/battle-tables.js';

const PET = { id: 'p3', name: '尖尖', species: '狗', breed: '金毛寻回犬', weight: 20.5, height: 50 };

const PROFILES = [
  ['新手 Lv1   勇气60/攻击30/体力85', { courage: 60, aggression: 30, attr: { stamina: 85 } }, 1],
  ['中期 Lv20  勇气70/攻击75/体力90', { courage: 70, aggression: 75, attr: { stamina: 90 } }, 20],
  ['毕业 Lv60  勇气95/攻击95/体力100', { courage: 95, aggression: 95, attr: { stamina: 100 } }, 60],
];

const RUNS = 400;

for (const [label, w, lv] of PROFILES) {
  const mine = battleStats(PET, w, lv);
  console.log('\n== ' + label + ' → 面板 ' + JSON.stringify(mine));
  for (const f of BATTLE_FOES) {
    const foe = foeStats(f);
    let win = 0, draw = 0, lose = 0, rounds = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = resolveBattle({ mine, foe, rng: makeRng(i * 31 + 7) });
      if (r.outcome === 'win') win++;
      else if (r.outcome === 'draw') draw++;
      else lose++;
      rounds += r.rounds;
    }
    const pct = (n) => String(Math.round((n / RUNS) * 100)).padStart(3) + '%';
    console.log(
      '  ' + f.n.padEnd(10, '　') + '[' + foe.size + ']' +
      ' 胜' + pct(win) + ' 平' + pct(draw) + ' 负' + pct(lose) +
      ' 平均 ' + (rounds / RUNS).toFixed(1) + ' 回合',
    );
  }
}
