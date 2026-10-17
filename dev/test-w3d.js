/* V1.8 3D 宠物世界 — node 桩件 harness
 * 用法：node test-w3d.js
 * 覆盖：世界逻辑回归 / 离线结算（12h 下限保底）/ 舞台旋转判定 / 3D 互动数值与冷却 / 快捷打卡联动 / 家园清除回归
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ---------- 0. 语法检查（拆分后：按 index.html 中外链顺序逐文件检查并拼接） ---------- */
const scripts = [...html.matchAll(/<script src="(assets\/js\/(?!vendor\/)[^"]+)"><\/script>/g)].map(m => m[1]);
if (scripts.length < 10) throw new Error('预期 >=10 个模块 script，实际 ' + scripts.length);
const src = scripts.map(s => {
  const c = fs.readFileSync(path.join(ROOT, s), 'utf8');
  new Function(c);
  return c;
}).join('\n');

/* ---------- 1. DOM / 浏览器桩件 ---------- */
const store = {};
globalThis.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};
function mkEl(tag) {
  const el = {
    _cls: new Set(), style: {}, dataset: {}, children: [],
    innerHTML: '', textContent: '', value: '', id: tag || '',
    classList: {
      add: (...c) => c.forEach(x => el._cls.add(x)),
      remove: (...c) => c.forEach(x => el._cls.delete(x)),
      toggle: (c, f) => { if (f === undefined) f = !el._cls.has(c); f ? el._cls.add(c) : el._cls.delete(c); },
      contains: c => el._cls.has(c)
    },
    appendChild(c) { el.children.push(c); return c; },
    remove() {}, replaceWith() {},
    querySelector: () => mkEl(), querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    setAttribute() {}, getAttribute: () => null,
    focus() {}, blur() {}, click() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
    offsetWidth: 100, offsetHeight: 100, parentElement: null
  };
  return el;
}
const _els = {};
globalThis.document = {
  getElementById: id => _els[id] || (_els[id] = mkEl(id)),
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: t => mkEl(t),
  addEventListener() {}, body: mkEl('body')
};
globalThis.window = globalThis;
globalThis.innerWidth = 1280; globalThis.innerHeight = 720;
globalThis.devicePixelRatio = 1;
globalThis.addEventListener = () => {};
globalThis.getComputedStyle = () => ({ position: 'static' });
globalThis.requestAnimationFrame = () => 0;
const _intervals = [];
globalThis.setInterval = fn => { _intervals.push(fn); return _intervals.length; };
globalThis.clearInterval = () => {};
globalThis.setTimeout = fn => { if (typeof fn === 'function') fn(); return 0; }; // 立即执行，事件卡片同步可测
globalThis.clearTimeout = () => {};
/* THREE 故意不定义：验证「WebGL/3D 引擎不可用 → 舞台内降级提示而非白屏」路径不抛错 */

/* ---------- 2. 注入并导出内部函数 ---------- */
const exportTail = `
;globalThis.X={
  getS:()=>S, setS:(v)=>{S=v}, $,
  worldPet,worldLevel,addWorldGrowth,payAndGain,canPay,checkWorldEvents,settleVenue,buyGood,attrDeltaTxt,neg,
  settleWorld,w3dNeedRotate,w3dAct,w3dGain,feed,quickClean,worldEnter,w3dEnter,
  WCOURSES,WJOBS,WGOODS,WVENUES,WEVENTS,WMEDALS,WSPORT_UNLOCK_LV,MAIN,tabTo,petGarden,curPet,today,
  W3D_MODELS,W3D_SPOTS
};`;
eval(src + exportTail);
const X = globalThis.X;
const S = () => X.getS();
const modalHTML = () => X.$('modalBox').innerHTML;

/* ---------- 3. 断言 ---------- */
let pass = 0, fail = 0; const fails = [];
function ok(cond, name) { if (cond) { pass++; } else { fail++; fails.push(name); console.log('  ✗ ' + name); } }
function eq(a, b, name) { ok(a === b, name + '（期望 ' + b + '，实际 ' + a + '）'); }
function grp(t) { console.log('· ' + t); }

/* ---------- A. 世界数据与等级曲线 ---------- */
grp('A. 世界数据与等级曲线');
{
  const w = X.worldPet();
  eq(w.courage, 60, 'worldPet 默认勇气值');
  eq(Object.keys(w.attr).join(','), 'hunger,clean,mood,stamina,wisdom,growth', 'worldPet 六维属性键');
  w.attr.growth = 0; eq(X.worldLevel(), 1, 'growth=0 → Lv.1');
  w.attr.growth = 49; eq(X.worldLevel(), 1, 'growth=49 → Lv.1');
  w.attr.growth = 50; eq(X.worldLevel(), 2, 'growth=50 → Lv.2（50/级）');
  w.attr.growth = 1450; eq(X.worldLevel(), X.WSPORT_UNLOCK_LV, 'growth=1450 → Lv.30（运动馆解锁线）');
  w.attr.growth = 9999; eq(X.worldLevel(), 100, 'growth=9999 → Lv.100（无 9 级封顶）');
  w.attr.growth = 2000; eq(X.worldLevel(), 41, 'growth=2000 → Lv.41');
  const w2 = X.worldPet('p2');
  ok(w2 !== w && typeof w2.attr.hunger === 'number', 'worldPet(pid) 参数化独立档案');
  w.attr.growth = 0;
}

/* ---------- B. 支付与收益 ---------- */
grp('B. payAndGain / canPay');
{
  const w = X.worldPet();
  w.attr.hunger = 50; w.attr.clean = 10;
  ok(X.canPay({ hunger: 60, clean: 10 }).join() === 'hunger', 'canPay 检出饥饿不足');
  w.attr.growth = 9995;
  X.payAndGain({}, { growth: 10 });
  eq(w.attr.growth, 9999, 'payAndGain 收益 9999 封顶（V1.7.1 修复回归）');
  X.payAndGain({ hunger: 999 }, {});
  eq(w.attr.hunger, 0, 'payAndGain 消耗 0 保底');
}

/* ---------- C. 成长值联动与解锁卡 ---------- */
grp('C. addWorldGrowth 与 Lv.30 解锁卡');
{
  const w = X.worldPet();
  w.attr.growth = 1440;
  X.$('modalBox').innerHTML = '';
  X.addWorldGrowth(10, '社区发帖');
  eq(w.attr.growth, 1450, '发帖 +10 成长值');
  ok(modalHTML().includes('运动馆'), '跨 Lv.30 弹「运动馆/娱乐馆已解锁」卡');
  X.$('modalBox').innerHTML = '';
  X.addWorldGrowth(5, '更新宠物日常');
  eq(w.attr.growth, 1455, '日常 +5 成长值');
  ok(!modalHTML().includes('运动馆'), '已在 30 级之上不重复弹解锁卡');
  eq(X.attrDeltaTxt({ mood: 7, hunger: -6 }), '心情值+7 饥饿值-6', 'attrDeltaTxt 纯文本格式');
}

/* ---------- D. 事件引擎（蝶舞之约） ---------- */
grp('D. 事件引擎');
{
  const w = X.worldPet();
  S().world.loginDays = 5; w.courage = 60; w.attr.growth = 0;
  S().world.medals = [];
  X.$('modalBox').innerHTML = '';
  X.checkWorldEvents();
  ok(S().world.medals.includes('butterfly'), 'loginDays=5 + 勇气60 → 蝶舞之约勋章入账');
  eq(w.attr.growth, 5, '事件奖励 成长+5');
  ok(modalHTML().includes('蝶舞之约'), '事件结算卡片弹出');
  X.checkWorldEvents();
  eq(S().world.medals.filter(m => m === 'butterfly').length, 1, '一次性事件不重复发放');
  w.courage = 40; S().world.medals = [];
  X.checkWorldEvents();
  eq(S().world.medals.length, 0, '勇气40 → 不触发');
  w.courage = 60;
}

/* ---------- E. 数值表 / 场馆 / 商城 ---------- */
grp('E. 课程/打工/商城/场馆');
{
  eq(X.WCOURSES.length, 3, '三档课程');
  eq(X.WJOBS.length, 3, '三档打工');
  eq(X.WJOBS.map(j => j.gain.coinA).join(), '5,15,25', '打工金币A 5/15/25');
  eq(X.WGOODS.length, 4, '四件商品');
  eq(X.WVENUES.sport.items.length, 6, '运动馆 6 项');
  eq(X.WVENUES.fun.items.length, 6, '娱乐馆 6 项');
  const w = X.worldPet();
  w.attr.hunger = 100; w.attr.clean = 100; w.attr.mood = 80; w.attr.stamina = 100;
  S().world.coinA = 30; w.courage = 50;
  X.settleVenue('sport', 'frisbee'); // coin3 crg1 cost{hunger8,stamina10} gain{mood4,growth5}
  eq(S().world.coinA, 27, '场馆结算扣金币A');
  eq(w.courage, 51, '运动项目勇气值+1');
  eq(w.attr.mood, 84, '场馆收益心情+4');
  eq(w.attr.hunger, 92, '场馆消耗饥饿-8');
  X.buyGood('foodB'); // price5 eff hunger15
  eq(S().world.coinA, 22, '购买食物B扣金币');
  eq(w.attr.hunger, 107, '食物B饥饿+15（沿用 payAndGain 9999 上限，V1.7 既有行为）');
  S().world.coinA = 0;
  X.buyGood('clnB');
  eq(S().world.coinA, 0, '金币不足拒绝购买');
  S().world.coinA = 30;
}

/* ---------- F. 离线结算（世界版，新增） ---------- */
grp('F. settleWorld 离线结算');
{
  const w = X.worldPet();
  S().world.lastLeave = Date.now();
  eq(X.settleWorld(), false, '<0.2h 返回 false 不衰减');
  w.attr.hunger = 10; w.attr.mood = 25;
  const w2 = X.worldPet('p2'); w2.attr.hunger = 100; w2.attr.mood = 100;
  S().world.lastLeave = Date.now() - 12 * 36e5;
  X.$('modalBox').innerHTML = '';
  const r = X.settleWorld();
  eq(r, true, '>8h 返回 true');
  eq(w.attr.hunger, 0, '12h → 饥饿 -24 下限 0 保底');
  eq(w.attr.mood, 20, '12h → 心情 -12 下限 20 保底');
  eq(w2.attr.hunger, 76, '多宠物同步衰减（p2 饥饿 100-24）');
  eq(w2.attr.mood, 88, '多宠物同步衰减（p2 心情 100-12）');
  ok(modalHTML().includes('主人回来了'), '>8h 弹「主人回来了」欢迎卡');
  ok(Date.now() - S().world.lastLeave < 5000, 'lastLeave 已刷新');
  w.attr.hunger = 80; w.attr.mood = 70; w2.attr.hunger = 80; w2.attr.mood = 70;
}

/* ---------- G. 舞台旋转判定（新增） ---------- */
grp('G. w3dNeedRotate 旋转判定');
{
  eq(X.w3dNeedRotate(390, 844), true, '竖屏视口（390×844）→ 旋转 90°');
  eq(X.w3dNeedRotate(844, 390), false, '横屏视口（844×390）→ 不转');
  eq(X.w3dNeedRotate(1280, 720), false, '桌面横屏（1280×720）→ 不转');
  eq(X.w3dNeedRotate(500, 500), false, '方形视口 → 不转');
}

/* ---------- H. 3D 手动互动（世界六维 + 3s 冷却） ---------- */
grp('H. w3dAct 手动互动');
{
  const w = X.worldPet(), g = X.petGarden(X.curPet());
  globalThis._w3dCd = {};
  w.attr.hunger = 50; w.attr.mood = 50; w.attr.clean = 90; w.attr.stamina = 50; w.attr.growth = 0;
  g.tasks = {}; g.touchCount = 0; g.satiety = 50;
  X.w3dAct('feed');
  eq(w.attr.hunger, 68, '3D 喂食：饥饿值+18');
  eq(w.attr.growth, 3, '3D 喂食：成长值+3');
  eq(g.tasks.feed, X.today(), '3D 喂食标记今日喂食任务');
  const h0 = w.attr.hunger;
  X.w3dAct('feed');
  eq(w.attr.hunger, h0, '3s 冷却内第二次喂食无效');
  globalThis._w3dCd = {};
  X.w3dAct('touch');
  globalThis._w3dCd = {}; // 冷却按按钮计 3s，清键位模拟时间流逝
  X.w3dAct('touch');
  globalThis._w3dCd = {};
  X.w3dAct('touch');
  eq(w.attr.mood, 77, '抚摸三次：心情 50+27');
  eq(g.touchCount, 3, '抚摸计数 3');
  eq(g.tasks.touch, X.today(), '抚摸 3 次标记今日抚摸任务');
  globalThis._w3dCd = {};
  X.w3dAct('play');
  eq(w.attr.mood, 84, '玩耍：心情+7');
  eq(w.attr.stamina, 40, '玩耍：体力-10');
  eq(w.attr.hunger, 62, '玩耍：饥饿-6');
  globalThis._w3dCd = {};
  w.attr.stamina = 10;
  const m0 = w.attr.mood;
  X.w3dAct('play');
  eq(w.attr.mood, m0, '体力<12 玩耍被拒绝');
  ok(!globalThis._w3dCd.play, '被拒绝的玩耍不消耗冷却');
  globalThis._w3dCd = {};
  X.w3dAct('bath');
  eq(w.attr.clean, 100, '洗澡：清洁+20（100 封顶）');
  X.w3dGain({ mood: 999, hunger: -999 });
  eq(w.attr.mood, 100, 'w3dGain 心情 100 封顶');
  eq(w.attr.hunger, 0, 'w3dGain 饥饿 0 保底');
  w.attr.hunger = 80; w.attr.mood = 70; w.attr.clean = 80; w.attr.stamina = 85; w.attr.growth = 0;
}

/* ---------- I. 首页快捷打卡 → 世界属性（新增 E 项联动） ---------- */
grp('I. 快捷打卡联动世界属性');
{
  const w = X.worldPet(), g = X.petGarden(X.curPet());
  w.attr.hunger = 50; w.attr.clean = 50; g.satiety = 50; g.clean = 50; g.tasks = {};
  ok(typeof X.feed === 'function' && X.feed.toString().includes('openWorld'), '喂食入口 feed() → openWorld()（跳转 3D 宠物世界）');
  X.quickClean();
  eq(w.attr.clean, 58, '铲屎打卡 → 世界清洁+8');
  eq(g.clean, 58, '铲屎打卡 → 家园清洁+8');
  w.attr.hunger = 80; w.attr.clean = 80;
}

/* ---------- J. 世界进入与登录天数 ---------- */
grp('J. worldEnter / 3D 降级');
{
  const d0 = S().world.loginDays;
  S().world.lastLoginDate = '2000-01-01';
  X.worldEnter(); // THREE 不存在 → w3dFallback 降级路径
  eq(S().world.loginDays, d0 + 1, '进入世界登录天数+1');
  X.worldEnter();
  eq(S().world.loginDays, d0 + 1, '同日重复进入天数不重复+1');
  eq(X.$('w3dFall').style.display, 'flex', 'WebGL/3D 引擎不可用 → 舞台内降级提示（不白屏不崩溃）');
  eq(X.$('w3dStage').classList.contains('show'), true, '降级时舞台仍可控展示');
}

/* ---------- K. 家园清除回归（源码级） ---------- */
grp('K. 家园系统清除回归');
{
  ok(!X.MAIN.includes('garden'), 'MAIN 已移除 garden');
  ok(!/function (enterGarden|renderGarden|settleGarden|gardenAct|claimTask|openGardenTasks|demoAway|openDecoSheet|buyAcc|equipAcc|showMissYou|gardenFlash)\b/.test(src), '家园函数组已删除');
  ok(!/id="pg-garden"/.test(html), 'pg-garden 页面已删除');
  ok(!/S\.garden\./.test(src), '无 S.garden.* 残留访问');
  ok(!/go\('garden'\)/.test(src), '无 go(\'garden\') 残留调用');
  ok(/<script src="assets\/js\/vendor\/three\.min\.js"><\/script>/.test(html) && /<script src="assets\/js\/vendor\/GLTFLoader\.js"><\/script>/.test(html), 'three.js 本地引用已在 head');
  ok(fs.existsSync(path.join(ROOT, 'assets/js/vendor/three.min.js')) && fs.existsSync(path.join(ROOT, 'assets/js/vendor/GLTFLoader.js')), 'three.min.js / GLTFLoader.js 备料存在');
  ok(/id="w3dStage"/.test(html), 'w3dStage 舞台 DOM 已挂载');
  ok(/data-tab="garden"/.test(html) === false, 'tabbar 家园按钮已改造');
}

/* ---------- 结果 ---------- */
console.log('\n========================================');
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
if (fail) { console.log('失败项：'); fails.forEach(f => console.log('  - ' + f)); process.exit(1); }
console.log('ALL GREEN');
