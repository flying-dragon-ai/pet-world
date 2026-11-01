/**
 * 宠物出门打架（视图层）。
 *
 * 流程：
 *   家园面板「出门打架」入口 → 选对手 → 回合结算 → 战报卡 → 属性/金币落盘；
 *   或者「街头大战」事件自动触发 → 应战 / 回避 → 同一条结算通路。
 *
 * 规则全部在 src/domain/battle.js，这里只做「读状态 → 拼模板 → 调一次动作」。
 */
import { registerActions } from './../app/actions.js';
import { esc } from './../app/dom.js';
import { S, save } from './../app/store.js';
import { openModal, closeModal, openSheet, closeSheet, toast } from './../app/ui.js';
import { now } from './../app/clock.js';
import { curPet } from './pets.js';
import { worldPet, worldLevel, payAndGain, earnCoins, registerWorldHooks } from './world-state.js';
import { resolveBattle, battleStats, foeStats, makeRng, injuryOf, rewardOf } from './../domain/battle.js';
import { BATTLE_FOES, FOE_BY_ID, BATTLE_INJURY, BATTLE_RESULT_TITLE } from './../data/battle-tables.js';
import { sizeTypeOf } from './../domain/pet.js';

/** 打一次固定要花的体力 */
const BASE_STAMINA_COST = 10;

/** 战力估算（给玩家看的相对值） */
function powerOf(s) {
  return Math.round(s.atk + s.def + s.spd + s.hp / 10);
}

function myPanel() {
  return battleStats(curPet(), worldPet(), worldLevel());
}

/** 同一天同一只宠物打同一个对手，结果可复现（用日期+宠物 id 做种子） */
function seedFor(petId, foeId) {
  const day = Math.floor(now() / 86400000);
  let h = 0;
  const key = day + '|' + petId + '|' + foeId;
  for (let i = 0; i < key.length; i++) h = (Math.imul(h, 31) + key.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ---------------- 选对手 ---------------- */

function openBattlePicker() {
  const mine = myPanel();
  const body = BATTLE_FOES.map((f) => {
    const s = foeStats(f);
    const stars = Math.max(1, Math.min(5, Math.round(s.atk / 16)));
    const gap = powerOf(s) - powerOf(mine);
    const tag = gap > 25 ? '<span style="color:#F05B5B;font-weight:700">强于你</span>'
      : gap < -25 ? '<span style="color:#3BB786;font-weight:700">弱于你</span>'
        : '<span style="color:#8A99AB">势均力敌</span>';
    return '<div class="card" style="padding:12px 14px;margin-bottom:9px;cursor:pointer" onclick="app.startBattle(\'' + f.id + '\')">' +
      '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="font-size:26px;line-height:1;flex:none">' + f.ic + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13.5px;font-weight:800">' + esc(f.n) + '</div>' +
          '<div style="font-size:10.5px;color:var(--sub);margin-top:2px">' + esc(f.breed) + ' · ' + s.size +
            ' · 难度 ' + '★'.repeat(stars) + '☆'.repeat(5 - stars) + '</div>' +
        '</div>' +
        '<div style="font-size:10.5px;text-align:right;flex:none">' + tag +
          '<div style="color:var(--sub);margin-top:2px">战力 ' + powerOf(s) + '</div></div>' +
      '</div>' +
      '<div style="font-size:11px;color:#666;line-height:1.6;margin-top:7px">' + esc(f.d) + '</div>' +
      '<div style="display:flex;gap:12px;margin-top:7px;font-size:10.5px;color:var(--sub)">' +
        '<span>攻 ' + s.atk + '</span><span>防 ' + s.def + '</span><span>速 ' + s.spd + '</span><span>体力 ' + s.hp + '</span>' +
      '</div>' +
    '</div>';
  }).join('');

  openSheet('出门打架 · 选对手',
    '<div style="font-size:11px;color:var(--sub);line-height:1.7;margin-bottom:10px;padding:9px 11px;background:rgba(58,123,213,.07);border-radius:11px">' +
      '「' + esc(curPet().name) + '」当前面板：攻 ' + mine.atk + ' · 防 ' + mine.def + ' · 速 ' + mine.spd +
      ' · 体力 ' + mine.hp + '（' + mine.size + '）<br>每场消耗体力 ' + BASE_STAMINA_COST + '，负伤会让心情与体力额外打折' +
    '</div>' + body);
}

/* ---------------- 结算 ---------------- */

/**
 * 打完一场：算结果 → 落盘 → 出战报卡。
 * @param {object} foe 对手配置
 * @param {object} [opts] { medalId, medal, eventId }
 */
function runBattle(foe, opts) {
  const p = curPet();
  const mine = battleStats(p, worldPet(), worldLevel());
  const fs = foeStats(foe);
  const rng = makeRng(seedFor(p.id, foe.id));
  const result = resolveBattle({ mine, foe: fs, rng });
  const injury = injuryOf(result, rng);
  const reward = rewardOf(result);
  const inj = BATTLE_INJURY[injury];

  const cost = { stamina: BASE_STAMINA_COST + (inj.cost.stamina || 0), mood: inj.cost.mood || 0 };
  const gain = { growth: reward.growth };
  if (result.outcome === 'win') gain.mood = 6;

  // 记录战绩
  const w = worldPet();
  w.battle = w.battle || { win: 0, draw: 0, lose: 0, last: null };
  w.battle[result.outcome]++;
  w.battle.last = { foe: foe.n, outcome: result.outcome, at: now() };

  // 事件触发的战斗：应战即视为事件已触发（无论输赢都不再重复弹）
  if (opts && opts.eventId) {
    if (!Array.isArray(S.world.firedEvents)) S.world.firedEvents = [];
    if (S.world.firedEvents.indexOf(opts.eventId) < 0) S.world.firedEvents.push(opts.eventId);
  }
  // 打赢才发勋章
  let gotMedal = null;
  if (opts && opts.medal && result.outcome === 'win') {
    if (!S.world.medals.includes(opts.medal.id)) S.world.medals.push(opts.medal.id);
    gotMedal = opts.medal;
  }

  payAndGain(cost, gain, () => { earnCoins(reward.coinA); });
  save();

  showResultCard({ foe, mine, fs, result, injury, inj, reward, gotMedal, cost });
}

function showResultCard(o) {
  const { foe, mine, fs, result, inj, reward, gotMedal, cost } = o;
  const title = BATTLE_RESULT_TITLE[result.outcome] || '战斗结束';
  const color = result.outcome === 'win' ? '#3BB786' : result.outcome === 'lose' ? '#F05B5B' : '#E8A23A';
  const rounds = result.log.map((l) => {
    const who = l.side === 'me' ? '我方' : esc(foe.n);
    return '<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;border-bottom:1px solid rgba(0,0,0,.04)">' +
      '<span style="color:' + (l.side === 'me' ? '#3A7BD5' : '#F05B5B') + '">' + (l.side === 'me' ? '我方' : foe.n) + '</span>' +
      '<span>造成 ' + l.dmg + ' 伤害 · 剩余 ' + l.left + '</span></div>';
  }).join('');
  openModal(
    '<div style="text-align:center">' +
      '<div style="font-size:40px">' + foe.ic + '</div>' +
      '<div style="font-size:17px;font-weight:900;margin-top:6px;color:' + color + '">' + title + '</div>' +
      '<div style="font-size:12px;color:var(--sub);margin:6px 0 12px;line-height:1.7">' +
        '「' + esc(curPet().name) + '」' + mine.size + ' vs ' + esc(foe.n) + ' ' + fs.size + '<br>' +
        '打了 ' + result.rounds + ' 个回合 · 我方剩余体力 ' + result.myHp + ' · 对方剩余 ' + result.foeHp + '</div>' +
      '<div style="text-align:left;font-size:11.5px;font-weight:800;margin-bottom:5px">回合记录</div>' +
      '<div style="max-height:150px;overflow-y:auto;text-align:left">' + rounds + '</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center">' +
        '<span class="chip" style="font-size:10px;background:rgba(240,91,91,.1);color:#F05B5B">' + inj.ic + ' ' + inj.n + '</span>' +
        '<span class="chip" style="font-size:10px;background:rgba(59,183,134,.12);color:#2E9C6B">成长值 +' + reward.growth + '</span>' +
        (reward.coinA ? '<span class="chip" style="font-size:10px;background:rgba(245,166,35,.14);color:#C77E12">金币A +' + reward.coinA + '</span>' : '') +
        '<span class="chip" style="font-size:10px;background:rgba(0,0,0,.05);color:#8A99AB">体力 -' + cost.stamina + '</span>' +
      '</div>' +
      (gotMedal ? '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,rgba(245,208,97,.2),rgba(217,160,60,.1));border:1.5px solid rgba(217,160,60,.5);border-radius:16px;padding:9px 16px;margin-top:12px">' +
        '<span style="font-size:19px">' + gotMedal.ic + '</span><div style="text-align:left">' +
        '<div style="font-size:12.5px;font-weight:900;color:#C77E12">获得战功勋章「' + esc(gotMedal.n) + '」</div>' +
        '<div style="font-size:9.5px;color:var(--sub)">' + esc(gotMedal.d) + '</div></div></div>' : '') +
      '<button class="btn" style="margin-top:14px" onclick="app.closeModal()">收下</button>' +
    '</div>');
}

/** 选对手 → 开打 */
function startBattle(foeId) {
  const foe = FOE_BY_ID[foeId];
  if (!foe) { toast('对手不存在'); return; }
  closeSheet();
  const mine = myPanel();
  if (mine.hp < 20) { toast('体力太低，先休息一下再出门'); return; }
  runBattle(foe);
}

/* ---------------- 事件触发（街头大战） ---------------- */

/** 世界事件触发时的应战 / 回避弹窗（由 world-state 通过钩子调用） */
export function showBattlePrompt(ev) {
  const p = curPet();
  openModal(
    '<div style="text-align:center">' +
      '<div style="font-size:44px">' + ev.icon + '</div>' +
      '<div style="font-size:17px;font-weight:900;margin-top:8px">触发战功事件：' + ev.title + '</div>' +
      '<div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">' +
        ev.story(worldPet(), { loginDays: S.world.loginDays, petName: p.name }) + '</div>' +
      '<div style="display:flex;gap:10px">' +
        '<button class="btn btn-ghost" onclick="app.declineStreetFight()">回避</button>' +
        '<button class="btn" onclick="app.acceptStreetFight()">应战！</button>' +
      '</div>' +
    '</div>');
}

/** 应战：按攻击值挑一个势均力敌的对手 */
function acceptStreetFight() {
  closeModal();
  const w = worldPet();
  const aggression = w.aggression || 30;
  const pool = BATTLE_FOES.filter((f) => Math.abs(f.atk - aggression) < 26);
  const foe = pool.length ? pool[Math.floor(Math.random() * pool.length)] : BATTLE_FOES[0];
  runBattle(foe, { eventId: 'streetfight', medal: { id: 'streetfight', n: '街头硬汉', ic: '🥊', d: '冲动值与攻击值同时>60%时触发「街头大战」事件，打赢可得' } });
}

/** 回避：事件记为已触发，不再重复弹，但不发勋章 */
function declineStreetFight() {
  closeModal();
  if (!Array.isArray(S.world.firedEvents)) S.world.firedEvents = [];
  if (S.world.firedEvents.indexOf('streetfight') < 0) S.world.firedEvents.push('streetfight');
  save();
  toast('你把「' + curPet().name + '」拉回了家 —— 这次没打起来');
}

/* ---------------- 战绩面板 ---------------- */

function openBattleRecord() {
  const w = worldPet();
  const b = w.battle || { win: 0, draw: 0, lose: 0, last: null };
  const mine = myPanel();
  const total = b.win + b.draw + b.lose;
  openSheet('打架战绩',
    '<div style="display:flex;gap:9px;margin-bottom:12px">' +
      [['胜', b.win, '#3BB786'], ['平', b.draw, '#E8A23A'], ['负', b.lose, '#F05B5B']].map((r) =>
        '<div style="flex:1;text-align:center;padding:11px 6px;background:rgba(255,255,255,.6);border-radius:13px;border:1px solid rgba(0,0,0,.05)">' +
          '<div style="font-size:20px;font-weight:900;color:' + r[2] + '">' + r[1] + '</div>' +
          '<div style="font-size:10.5px;color:var(--sub);margin-top:2px">' + r[0] + '</div></div>').join('') +
    '</div>' +
    '<div style="font-size:11.5px;color:var(--sub);line-height:1.8">' +
      '当前体型：' + (sizeTypeOf(curPet()) || '—') + ' · 面板 攻' + mine.atk + ' 防' + mine.def + ' 速' + mine.spd + ' 体力' + mine.hp + '<br>' +
      '累计出战 ' + total + ' 场' +
      (b.last ? '<br>最近一场：' + esc(b.last.foe) + ' · ' + (BATTLE_RESULT_TITLE[b.last.outcome] || b.last.outcome) : '') +
      '<br><span style="color:#C77E12">提示：冲动值与攻击值同时拉过 60%，回家路上会触发「街头大战」事件。</span>' +
    '</div>');
}

registerActions('battle', { acceptStreetFight, declineStreetFight, openBattlePicker, openBattleRecord, startBattle });

/* world-state 通过钩子回调，避免 views 之间互相 import 造成环 */
registerWorldHooks({ battlePrompt: showBattlePrompt });
