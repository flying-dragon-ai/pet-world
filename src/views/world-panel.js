/**
 * 世界面板（竖屏 App 内的人宠世界主界面）。
 *
 * 结构：顶部金币 + 六维条 + 勇气滑块 + 六个入口 + tab 内容区。
 * 所有数值改动都走 views/world-state.js（写入 + 落盘 + 刷新），
 * 面板本身只负责"读状态、拼模板、把点击变成一次动作"。
 */
import { S, save } from '../app/store.js';
import { today } from '../app/clock.js';
import { $, esc, scrollIntoViewSoft } from '../app/dom.js';
import { openModal, closeModal, toast } from '../app/ui.js';
import { go, registerPage } from '../app/router.js';
import { registerActions } from '../app/actions.js';
import { ui } from '../app/ui-state.js';
import { VENUE_UNLOCK_LEVEL, GROWTH_PER_LEVEL } from '../app/config.js';
import {
  COURSES, JOBS, GOODS, VENUES, ATTR_NAMES, ATTR_ROWS, MEDALS,
} from '../data/world-tables.js';
import { curPet, petSVG } from './pets.js';
import {
  worldPet, worldLevel, canPay, payAndGain, lackNames, addWorldGrowth,
  checkWorldEvents, registerWorldHooks, spendCoins, earnCoins,
  negate, attrDeltaHTML, attrDeltaText,
} from './world-state.js';
import { enterStage, suspendStage, resumeStage, isStageSuspended, stageWeather, sendStageToast, registerStageHooks } from './w3d/index.js';

const WORLD_TABS = [
  ['home', '总览'], ['school', '学院'], ['jobs', '打工'], ['shop', '商城'],
  ['sport', '运动'], ['fun', '娱乐'], ['medal', '战功'],
];

const ENTRIES = [
  { tab: 'school', n: '学院', ic: '🎓', d: '上学提属性' },
  { tab: 'jobs', n: '打工', ic: '💼', d: '赚金币A' },
  { tab: 'shop', n: '商城', ic: '🛒', d: '食物清洁品' },
  { tab: 'sport', n: '运动', ic: '🏟️', d: '强体魄提勇气', locked: true },
  { tab: 'fun', n: '娱乐', ic: '🎡', d: '放松心情', locked: true },
  { tab: 'medal', n: '战功', ic: '🎖️', d: '勋章收藏' },
];

/* ---------------- 进入世界 ---------------- */

/**
 * 点击首页入口：先走加载进度条，再进 3D 舞台。
 * 进度条是纯视觉，跑完即调用 worldEnter()。
 */
export function openWorld() {
  const overlay = $('worldLoad');
  const petName = curPet().name;
  $('wlPetName').textContent = petName;
  $('wlFill').style.width = '0%';
  $('wlPct').textContent = '0%';

  const tips = ['正在布置小院草坪…', '正在唤醒「' + petName + '」…', '正在同步四维属性…', '正在生成今日天气…'];
  let pct = 0;
  $('wlTip').innerHTML = tips[0];
  overlay.classList.add('show');
  clearInterval(ui.worldLoadTimer);

  ui.worldLoadTimer = setInterval(() => {
    pct = Math.min(100, pct + 3 + Math.random() * 7);
    $('wlFill').style.width = pct + '%';
    $('wlPct').textContent = Math.floor(pct) + '%';
    const tip = tips[Math.min(tips.length - 1, Math.floor(pct / 28))];
    if ($('wlTip').dataset.t !== tip) {
      $('wlTip').dataset.t = tip;
      $('wlTip').innerHTML = tip;
    }
    if (pct >= 100) {
      clearInterval(ui.worldLoadTimer);
      setTimeout(() => { overlay.classList.remove('show'); worldEnter(); }, 250);
    }
  }, 70);
}

/** 真正进世界：按天累计登录天数（同一天只算一次），然后进 3D + 检查事件 */
export function worldEnter() {
  const day = today();
  let firstToday = false;
  if (S.world.lastLoginDate !== day) {
    S.world.lastLoginDate = day;
    S.world.loginDays++;
    firstToday = true;
  }
  enterStage();
  if (firstToday) sendStageToast('欢迎回到人宠世界，第 ' + S.world.loginDays + ' 天');
  checkWorldEvents();
  return S.world.loginDays;
}

/** 事件卡/解锁卡里的「去看看」：3D 已挂起则恢复，否则重新走加载屏 */
export function gotoWorldFromCard() {
  if (isStageSuspended()) resumeStage();
  else openWorld();
}

/* ---------------- 面板渲染 ---------------- */

function statBar(row, value) {
  const percent = row.key === 'growth'
    ? Math.min(100, (value % GROWTH_PER_LEVEL) / GROWTH_PER_LEVEL * 100)
    : Math.min(100, value);
  return '<div class="wstat"><div class="wt"><span>' + row.icon + ' ' + ATTR_NAMES[row.key] + '</span><b>' + Math.round(value) + '</b></div>' +
    '<div class="statbar"><div class="statfill" style="width:' + percent + '%;background:linear-gradient(90deg,' + row.color + 'aa,' + row.color + ')"></div></div></div>';
}

function entryTile(entry, level) {
  const locked = entry.locked && level < VENUE_UNLOCK_LEVEL;
  return '<div class="card chov" style="padding:12px 4px;text-align:center;cursor:pointer;position:relative;' + (locked ? 'opacity:.55' : '') + '" onclick="app.openWTab(\'' + entry.tab + '\')">' +
    (locked ? '<span style="position:absolute;top:5px;right:7px;font-size:11px">🔒</span>' : '') +
    '<div style="font-size:22px">' + entry.ic + '</div>' +
    '<div style="font-size:11.5px;font-weight:800;margin-top:4px">' + entry.n + '</div>' +
    '<div style="font-size:9px;color:var(--sub);margin-top:2px">' + (locked ? 'Lv.' + VENUE_UNLOCK_LEVEL + ' 解锁' : entry.d) + '</div></div>';
}

/** 世界主界面（#pg-world） */
export function renderWorld() {
  const pet = curPet();
  const w = worldPet();
  const level = worldLevel();
  const A = w.attr;
  const weather = stageWeather() || 'sunny';
  const weatherText = { sunny: '晴 ☀️', overcast: '阴 ☁️', rain: '小雨 🌧' }[weather] || '晴 ☀️';

  const header = '<div class="subhdr" style="margin:-12px -16px 12px">' +
    '<span style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--blue-d);font-size:12px;font-weight:800" onclick="app.resumeStage()"><svg class="icon"><use href="#i-back"/></svg>返回世界</span>' +
    '<b style="font-size:15px">虚拟人宠世界</b>' +
    '<span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;color:#C77E12;background:rgba(245,208,97,.18);padding:4px 11px;border-radius:999px">🪙 金币A ' + S.world.coinA + '</span></div>';

  const petCard = '<div class="card" style="padding:14px 16px;margin-bottom:12px">' +
    '<div style="display:flex;gap:13px;align-items:center;margin-bottom:12px">' +
    '<div style="width:74px;height:74px;flex:none;border-radius:24px;background:linear-gradient(160deg,#DCEBFB,#EFE6D6);display:flex;align-items:center;justify-content:center">' + petSVG(pet, 66, 'happy') + '</div>' +
    '<div style="flex:1"><div style="font-size:16px;font-weight:900">' + pet.name + ' <span class="chip" style="font-size:9px;background:rgba(139,92,246,.13);color:#8B5CF6">世界 Lv.' + level + '</span></div>' +
    '<div style="font-size:10.5px;color:var(--sub);margin-top:3px">已入驻人宠世界 ' + S.world.loginDays + ' 天 · 挂机生活中</div>' +
    '<div style="font-size:10px;color:#8A99AB;margin-top:3px">天气：' + weatherText + ' · 季节：秋（院里落叶）</div></div></div>' +
    ATTR_ROWS.map((row) => statBar(row, A[row.key])).join('') +
    '</div>';

  const courageCard = '<div class="card" style="padding:14px 16px;margin-bottom:12px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:13px">性格二元属性</b><span style="font-size:10px;color:var(--sub)">按百分比拖动调整</span></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;margin:6px 0 10px"><span style="color:#F5A623">勇气值 ' + w.courage + '%</span><span style="color:#8B5CF6">胆小值 ' + (100 - w.courage) + '%</span></div>' +
    '<input type="range" min="0" max="100" step="1" value="' + w.courage + '" class="crg" id="crgRange" oninput="app.onCourage(this.value)" onchange="app.commitCourage()">' +
    '<div style="font-size:10px;color:var(--sub);margin-top:8px;line-height:1.6">勇气值>50%：第5天登录可触发「独自外出追蝴蝶」战功事件；胆小值高：陌生人来访会躲起来</div></div>';

  const entries = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px">' +
    ENTRIES.map((e) => entryTile(e, level)).join('') + '</div>';

  const tabs = '<div style="display:flex;gap:8px;margin-bottom:12px">' +
    WORLD_TABS.map(([id, label]) => '<button class="wtab' + (ui.worldTab === id ? ' act' : '') + '" onclick="app.openWTab(\'' + id + '\')">' + label + '</button>').join('') + '</div>' +
    '<div id="wTabBody"></div>';

  $('world-body').innerHTML = header + petCard + courageCard + entries + tabs;
  renderWorldTabBody();
  return $('world-body');
}

/** 打开某个子 tab（home 就是主界面本身） */
function openWTab(tab) {
  ui.worldTab = tab;
  if (tab === 'home') {
    go('world');
  } else {
    renderWorld();
    setTimeout(() => scrollIntoViewSoft($('wTabBody')), 50);
  }
}

/** 子 tab 内容 */
function renderWorldTabBody() {
  const el = $('wTabBody');
  if (!el) return;
  const renderer = TAB_RENDERERS[ui.worldTab];
  el.innerHTML = renderer ? renderer() : '';
}

const TAB_RENDERERS = {
  home: renderOverviewTab,
  school: renderSchoolTab,
  jobs: renderJobsTab,
  shop: renderShopTab,
  sport: () => renderVenueTab('sport'),
  fun: () => renderVenueTab('fun'),
  medal: renderMedalTab,
};

function renderOverviewTab() {
  const w = worldPet();
  const level = worldLevel();
  const lines = [
    w.jobLv > 0 ? '💼 已完成打工 ' + w.jobLv + ' 次 · 累计获得金币A' : '',
    '🎓 课程结业进度：' + ['未结业', '初级', '进阶', '高级'][w.courseLv] + '（影响可接打工等级）',
    '🦋 勇气值 ' + w.courage + '% · ' + (w.courage > 50 ? '有机会触发「蝶舞之约」' : '胆小值偏高，容易躲起来'),
    '🏟️ 运动馆/娱乐馆：' + (level >= VENUE_UNLOCK_LEVEL
      ? '已解锁，消耗金币A锻炼玩耍'
      : '成长等级 Lv.' + VENUE_UNLOCK_LEVEL + ' 解锁（当前 Lv.' + level + '）· 发帖+10 / 更新宠物日常+5 成长值'),
  ].filter(Boolean);
  return '<div class="card" style="padding:13px 15px"><b style="font-size:12.5px">最近动态</b>' +
    lines.map((t) => '<div style="font-size:11px;color:var(--sub);margin-top:7px">' + t + '</div>').join('') + '</div>';
}

function renderSchoolTab() {
  const w = worldPet();
  const rows = COURSES.map((c) => {
    const locked = w.courseLv < (c.need || 0);
    const lack = canPay(c.cost);
    const lockChip = locked
      ? '<span class="chip" style="font-size:9px;background:rgba(0,0,0,.06);color:#8A99AB">需先结业' + COURSES[c.need - 1].n + '</span>'
      : '<span class="chip" style="font-size:9px;background:rgba(59,183,134,.13);color:#3A9C6B">可报名</span>';
    return '<div class="card" style="padding:13px 15px;margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">' + c.n + '</b>' + lockChip + '</div>' +
      '<div style="font-size:10.5px;color:var(--sub);margin-top:3px">' + c.sub + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span>' + attrDeltaHTML(negate(c.cost)) + '</span><span>' + attrDeltaHTML(c.gain) + '</span></div>' +
      (lack.length ? '<div style="font-size:10px;color:#F05B5B;margin-top:7px">⚠ ' + lackNames(c.cost) + '不足，先喂食/洗护恢复</div>' : '') +
      '<button class="btn btn-sm" style="width:auto;padding:7px 18px;margin-top:9px" ' + (locked || lack.length ? 'disabled' : '') + ' onclick="app.doCourse(' + c.id + ')">去上课（30分钟）</button></div>';
  }).join('');
  return rows + '<div style="font-size:10px;color:#8A99AB;margin-top:4px">课程随版本更新 · 连续上课心情小幅下降，记得课后陪玩</div>';
}

function renderJobsTab() {
  const w = worldPet();
  const rows = JOBS.map((j) => {
    const locked = w.courseLv < j.need;
    const lack = canPay(j.cost);
    const chip = locked
      ? '<span class="chip" style="font-size:9px;background:rgba(0,0,0,.06);color:#8A99AB">需' + COURSES[j.need - 1].n + '结业</span>'
      : '<span class="chip" style="font-size:9px;background:rgba(245,208,97,.18);color:#C77E12">🪙 +' + j.gain.coinA + '</span>';
    return '<div class="card" style="padding:13px 15px;margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">' + j.n + '</b>' + chip + '</div>' +
      '<div style="font-size:10.5px;color:var(--sub);margin-top:3px">' + j.sub + '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span>' + attrDeltaHTML(negate(j.cost)) + '</span><span>' + attrDeltaHTML({ growth: j.gain.growth }) + '</span>' +
      '<span style="font-size:10.5px;font-weight:700;color:#C77E12">金币A+' + j.gain.coinA + '</span></div>' +
      (lack.length ? '<div style="font-size:10px;color:#F05B5B;margin-top:7px">⚠ ' + lackNames(j.cost) + '不足</div>' : '') +
      '<button class="btn btn-sm" style="width:auto;padding:7px 18px;margin-top:9px" ' + (locked || lack.length ? 'disabled' : '') + ' onclick="app.doJob(' + j.id + ')">去打工</button></div>';
  }).join('');
  return rows + '<div style="font-size:10px;color:#8A99AB;margin-top:4px">打工是人宠世界唯一获取金币A的途径 · 工作随版本更新</div>';
}

function renderShopTab() {
  const pet = curPet();
  const balance = '<div class="card" style="padding:12px 15px;margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
    '<span style="font-size:12px;color:var(--sub)">金币A余额</span><b style="font-size:16px;color:#C77E12;margin-left:auto">🪙 ' + S.world.coinA + '</b></div>';
  const rows = GOODS.map((g) =>
    '<div class="card" style="padding:12px 15px;margin-bottom:10px;display:flex;align-items:center;gap:11px">' +
    '<div style="width:42px;height:42px;border-radius:14px;background:' + g.c + '1c;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none">' + g.ic + '</div>' +
    '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">' + g.n + '</div>' +
    '<div style="font-size:10.5px;color:var(--sub);margin-top:2px">' + g.d + '</div></div>' +
    '<button class="btn btn-sm" style="width:auto;padding:7px 13px;flex:none" ' + (S.world.coinA < g.price ? 'disabled' : '') + ' onclick="app.buyGood(\'' + g.id + '\')">🪙 ' + g.price + '</button></div>').join('');
  return balance + rows +
    '<div style="font-size:10px;color:#8A99AB;margin-top:4px">购买后立即给「' + esc(pet.name) + '」使用 · 金币A来自打工，非基础商品需金币B（充值）</div>';
}

function renderVenueTab(type) {
  const group = VENUES[type];
  const level = worldLevel();
  const growth = worldPet().attr.growth;
  if (level < VENUE_UNLOCK_LEVEL) {
    const need = VENUE_UNLOCK_LEVEL * GROWTH_PER_LEVEL;
    return '<div class="card" style="padding:26px 18px;text-align:center">' +
      '<div style="font-size:38px">🔒</div>' +
      '<div style="font-size:14.5px;font-weight:900;margin-top:8px">' + group.name + '未解锁</div>' +
      '<div style="font-size:11.5px;color:var(--sub);margin:8px 0 12px;line-height:1.8">成长等级达到 <b style="color:#8B5CF6">Lv.' + VENUE_UNLOCK_LEVEL + '</b> 后开放（当前 Lv.' + level + '）<br>社区发帖 +10 · 更新宠物日常 +5 · 上课/打工也可累积成长值</div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--sub);margin-bottom:5px"><span>成长值 ' + Math.round(growth) + '</span><span>目标 ' + need + '</span></div>' +
      '<div class="statbar"><div class="statfill" style="width:' + Math.min(100, growth / need * 100) + '%;background:linear-gradient(90deg,#B79BF2,#8B5CF6)"></div></div></div>';
  }
  const balance = '<div class="card" style="padding:12px 15px;margin-bottom:10px;display:flex;align-items:center;gap:8px">' +
    '<span style="font-size:12px;color:var(--sub)">' + group.name + ' · 金币A余额</span><b style="font-size:16px;color:#C77E12;margin-left:auto">🪙 ' + S.world.coinA + '</b></div>';
  const rows = group.items.map((item) => {
    const lack = canPay(item.cost);
    const poor = S.world.coinA < item.coin;
    return '<div class="card" style="padding:13px 15px;margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:11px"><div style="width:42px;height:42px;border-radius:14px;background:rgba(139,92,246,.1);display:flex;align-items:center;justify-content:center;font-size:20px;flex:none">' + item.ic + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">' + item.n + '</div>' +
      '<div style="font-size:10.5px;color:var(--sub);margin-top:2px">' + item.d + '</div></div>' +
      '<button class="btn btn-sm" style="width:auto;padding:7px 13px;flex:none" ' + (lack.length || poor ? 'disabled' : '') + ' onclick="app.doVenue(\'' + type + '\',\'' + item.id + '\')">🪙 ' + item.coin + '</button></div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span>' + attrDeltaHTML(negate(item.cost)) + '</span><span>' + attrDeltaHTML(item.gain) + '</span>' +
      (item.crg ? '<span style="font-size:10.5px;font-weight:700;color:#F5A623">勇气值+' + item.crg + '</span>' : '') + '</div>' +
      (lack.length ? '<div style="font-size:10px;color:#F05B5B;margin-top:6px">⚠ ' + lackNames(item.cost) + '不足，先喂食恢复</div>' : '') +
      (poor ? '<div style="font-size:10px;color:#F05B5B;margin-top:6px">⚠ 金币A不足，先去打工赚钱</div>' : '') + '</div>';
  }).join('');
  return balance + rows + '<div style="font-size:10px;color:#8A99AB;margin-top:4px">基础项目消耗金币A（打工产出）· 运动提升勇气值，娱乐恢复心情 · 场馆随版本更新</div>';
}

function renderMedalTab() {
  const rows = MEDALS.map((m) => {
    const owned = S.world.medals.includes(m.id);
    return '<div class="wmedal ' + (owned ? 'on' : '') + '">' +
      '<div class="mi" style="background:' + (owned ? 'rgba(245,208,97,.25)' : 'rgba(0,0,0,.05)') + ';filter:' + (owned ? 'none' : 'grayscale(1) opacity(.45)') + '">' + m.ic + '</div>' +
      '<div style="flex:1"><div style="font-size:12.5px;font-weight:800">' + m.n +
      (owned ? ' <span class="chip" style="font-size:9px;background:rgba(217,160,60,.16);color:#C77E12">已获得</span>' : '') + '</div>' +
      '<div style="font-size:10px;color:var(--sub);margin-top:2px;line-height:1.6">' + m.d + '</div></div></div>';
  }).join('');
  return rows + '<div style="font-size:10px;color:#8A99AB;margin-top:4px">特定事件与战功系统：属性值决定触发哪类事件与战功，更多战功随版本更新</div>';
}

/* ---------------- 交互 ---------------- */

/** 勇气滑块拖动：只改数值与标签，松手才落盘 */
function onCourage(value) {
  const w = worldPet();
  w.courage = Math.max(0, Math.min(100, parseInt(value, 10) || 0));
  const box = $('crgRange');
  if (!box) return;
  const labels = box.parentElement.querySelectorAll('span');
  if (labels.length >= 2) {
    labels[0].textContent = '勇气值 ' + w.courage + '%';
    labels[1].textContent = '胆小值 ' + (100 - w.courage) + '%';
  }
}

function commitCourage() {
  worldPet(); // 确保已建档
  save();
  renderWorld();
}

function doCourse(id) {
  const course = COURSES.find((x) => x.id === id);
  const lack = canPay(course.cost);
  if (lack.length) {
    toast(lackNames(course.cost) + '不足，无法上课');
    return;
  }
  openModal('<div style="text-align:center"><div style="font-size:38px">🎓</div>' +
    '<div style="font-size:15.5px;font-weight:900;margin-top:6px">报名「' + course.n + '」</div>' +
    '<div style="font-size:11.5px;color:var(--sub);margin:10px 0;line-height:1.8">上课时长：30分钟（演示立即结算）<br>' +
    '消耗：' + attrDeltaHTML(negate(course.cost)) + '<br>结业收益：' + attrDeltaHTML(course.gain) + '</div>' +
    '<div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="app.closeModal()">再想想</button>' +
    '<button class="btn" onclick="app.confirmCourse(' + course.id + ')">确认上课</button></div></div>');
}

function confirmCourse(id) {
  const course = COURSES.find((x) => x.id === id);
  closeModal();
  payAndGain(course.cost, course.gain, () => {
    const w = worldPet();
    w.courseLv = Math.max(w.courseLv, course.id);
  });
  toast('结业！' + course.n + ' 完成，智慧值与成长值已提升');
}

function doJob(id) {
  const job = JOBS.find((x) => x.id === id);
  const w = worldPet();
  if (w.courseLv < job.need) {
    toast('需先在学院结业' + COURSES[job.need - 1].n);
    return;
  }
  const lack = canPay(job.cost);
  if (lack.length) {
    toast(lackNames(job.cost) + '不足，无法打工');
    return;
  }
  openModal('<div style="text-align:center"><div style="font-size:38px">💼</div>' +
    '<div style="font-size:15.5px;font-weight:900;margin-top:6px">指派「' + job.n + '」</div>' +
    '<div style="font-size:11.5px;color:var(--sub);margin:10px 0;line-height:1.8">' + job.sub + '<br>' +
    '消耗：' + attrDeltaHTML(negate(job.cost)) + '<br>收益：成长值+' + job.gain.growth + ' · 金币A+' + job.gain.coinA + '</div>' +
    '<div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="app.closeModal()">再想想</button>' +
    '<button class="btn" onclick="app.confirmJob(' + job.id + ')">确认打工</button></div></div>');
}

function confirmJob(id) {
  const job = JOBS.find((x) => x.id === id);
  closeModal();
  payAndGain(job.cost, { growth: job.gain.growth }, () => {
    earnCoins(job.gain.coinA);
    worldPet().jobLv++;
  });
  toast('打工完成！金币A+' + job.gain.coinA);
}

function buyGood(id) {
  const good = GOODS.find((x) => x.id === id);
  if (!canAffordGood(good)) {
    toast('金币A不足，去打工小镇赚金币吧');
    return;
  }
  spendCoins(good.price);
  payAndGain({}, good.eff);
  toast('已使用' + good.n + '：' + attrDeltaHTML(good.eff));
}

function canAffordGood(good) {
  return S.world.coinA >= good.price;
}

function doVenue(type, id) {
  const item = VENUES[type].items.find((x) => x.id === id);
  const lack = canPay(item.cost);
  if (lack.length) {
    toast(lackNames(item.cost) + '不足，先喂食/休息恢复');
    return;
  }
  if (S.world.coinA < item.coin) {
    toast('金币A不足，先去打工赚钱');
    return;
  }
  openModal('<div style="text-align:center"><div style="font-size:38px">' + item.ic + '</div>' +
    '<div style="font-size:15.5px;font-weight:900;margin-top:6px">进入「' + item.n + '」</div>' +
    '<div style="font-size:11.5px;color:var(--sub);margin:10px 0;line-height:1.8">' + item.d + '<br>' +
    '消耗：' + attrDeltaHTML(negate(item.cost)) + ' · 金币A-' + item.coin + '<br>' +
    '收益：' + attrDeltaHTML(item.gain) + (item.crg ? ' · 勇气值+' + item.crg : '') + '</div>' +
    '<div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="app.closeModal()">再想想</button>' +
    '<button class="btn" onclick="app.settleVenue(\'' + type + '\',\'' + item.id + '\')">确认进入</button></div></div>');
}

function settleVenue(type, id) {
  const item = VENUES[type].items.find((x) => x.id === id);
  spendCoins(item.coin);
  payAndGain(item.cost, item.gain, () => {
    const w = worldPet();
    if (item.crg) w.courage = Math.min(100, w.courage + item.crg);
    w.venue = (w.venue || 0) + 1;
  });
  toast(item.n + '结束：' + attrDeltaText(item.gain) + (item.crg ? ' · 勇气值+' + item.crg : ''));
}

/* ---------------- 注册 ---------------- */

registerPage('world', { render: renderWorld });

registerWorldHooks({
  refreshPanel: () => {
    if ($('wTabBody')) renderWorld();
  },
  suspendStage,
  resumeStage,
});

registerStageHooks({ openPanelTab: openWTab });

registerActions('world-panel', {
  openWorld,
  worldEnter,
  renderWorld,
  openWTab,
  gotoWorldFromCard,
  onCourage,
  commitCourage,
  doCourse,
  confirmCourse,
  doJob,
  confirmJob,
  buyGood,
  doVenue,
  settleVenue,
});
