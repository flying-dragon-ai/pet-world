#!/usr/bin/env node
/**
 * 浏览器级冒烟（jsdom 真实 DOM + 真实 bundle）。
 *
 * 覆盖：启动 → 游客登录 → 首页 → 世界加载屏 → 3D 舞台（jsdom 无 WebGL → 降级）
 *       → 退场 → 世界面板七个 tab → 手动互动 → 战力事件卡 → 每个页面都能渲染
 *       → 页面里出现的每个 app.xxx 都已注册 → 控制台零报错 → 存档落盘
 *
 * 用法：npm run build && node dev/smoke.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(path.join(DIST, 'bundle.js'))) {
  console.error('缺少 dist/bundle.js，请先运行 npm run build');
  process.exit(2);
}

/* 只取本地文件：CDN（tailwind / font-awesome）在 jsdom 里没有意义，直接剥掉 */
const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
  .replace(/<script src="https:\/\/[^"]+"><\/script>/g, '')
  .replace(/<link[^>]+https:\/\/[^>]+>/g, '')
  .replace(/<script src="(bundle\.js|assets\/js\/vendor\/[^"]+)"><\/script>/g, '');

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (e) => errors.push('jsdomError: ' + ((e.detail && e.detail.message) || e.message)));
virtualConsole.on('error', (m) => errors.push('console.error: ' + m));
virtualConsole.on('warn', (m) => errors.push('console.warn: ' + m));

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, name) {
  if (cond) {
    pass++;
  } else {
    fail++;
    failures.push(name);
    console.log('  ✗ ' + name);
  }
}
function group(title) {
  console.log('· ' + title);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.addEventListener('error', (e) => errors.push('window.onerror: ' + e.message));

  const run = (file) => window.eval(fs.readFileSync(path.join(DIST, file), 'utf8'));
  const $ = (id) => window.document.getElementById(id);
  const has = (id, needle) => ($(id) ? $(id).innerHTML.includes(needle) : false);
  const state = () => window.__petWorld.state();

  run('assets/js/vendor/three.min.js');
  run('assets/js/vendor/GLTFLoader.js');
  run('bundle.js');
  await sleep(50);

  group('启动与登录');
  ok(!$('pg-login').classList.contains('on') === false, '未登录 → 停在登录页');
  ok(typeof window.app === 'object', '动作桥 app 已安装');
  ok(typeof window.ui === 'object', '瞬时状态 ui 已安装');
  window.app.guestLogin();
  await sleep(50);
  ok($('pg-home').classList.contains('on'), '游客登录 → 进入首页');
  ok(has('home-body', '今日任务'), '首页渲染出「今日任务」');

  group('V1.7.5 合并：首页「日常护理」磁贴');
  ok(has('home-body', '健康管理'), '磁贴一：健康管理');
  ok(has('home-body', '成长记录'), '磁贴二：成长记录');
  window.app.openHomeEntry('health');
  await sleep(20);
  ok($('pg-health').classList.contains('on'), '点「健康管理」→ 健康页');
  ok(has('health-body', '健康管理'), '健康页标题已对齐为「健康管理」');
  window.app.go('home');
  window.app.openHomeEntry('album');
  await sleep(20);
  ok($('pg-profile').classList.contains('on'), '点「成长记录」→ 档案页');
  ok(has('profile-body', '成长记录'), '档案页相册 tab 已对齐为「成长记录」');
  group('V1.7.5(2) 合并：服务子页返回键回服务菜单');
  for (const [page, name] of [['mall', '宠物商城'], ['travel', '携宠旅游'], ['act', '活动组局']]) {
    window.app.go(page);
    await sleep(20);
    const back = window.document.querySelector('#pg-' + page + ' .subhdr svg');
    ok(!!back, name + '：返回键存在');
    if (back) back.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(20);
    ok($('pg-menu').classList.contains('on'), name + '：返回键 → 服务菜单');
  }
  group('世界加载屏 → 3D 舞台降级');
  const days0 = state().world.loginDays;
  window.app.openWorld();
  ok($('worldLoad').classList.contains('show'), '加载屏出现');
  await sleep(2600);
  ok(!$('worldLoad').classList.contains('show'), '加载屏自动关闭');
  ok(state().world.loginDays === days0 + 1, '进入世界 → 登录天数 +1');
  ok($('w3dStage').classList.contains('show'), '横屏舞台已打开');
  ok($('w3dFall').style.display === 'flex', 'jsdom 无 WebGL → 舞台内降级提示（不白屏）');

  group('退场 → 世界面板');
  window.app.w3dExit();
  await sleep(30);
  ok(!$('w3dStage').classList.contains('show'), '返回键关闭舞台');
  window.app.go('world');
  await sleep(30);
  ok(has('world-body', '返回世界'), '面板渲染出「返回世界」');
  ok(has('world-body', '金币A'), '面板渲染出金币A');
  for (const tab of ['school', 'jobs', 'shop', 'sport', 'fun', 'medal', 'home']) {
    window.app.openWTab(tab);
    await sleep(20);
    const body = $('wTabBody') ? $('wTabBody').innerHTML : '';
    ok(tab === 'home' ? has('world-body', '金币A') : body.length > 30, '面板 tab 渲染正常：' + tab);
  }

  group('手动互动数值');
  window.app.go('home');
  const world = () => state().world.pets[state().curPet];
  const before = world().attr.hunger;
  window.ui.w3dCooldowns = {};
  ok(window.app.w3dAct('feed') === true, '喂食生效');
  ok(world().attr.hunger === Math.min(100, before + 15), '喂食 → 饥饿值 +15');
  ok(window.app.w3dAct('feed') === false, '3 秒冷却内第二次喂食被拒绝');
  window.ui.w3dCooldowns = {};
  const stamina0 = world().attr.stamina;
  world().attr.stamina = 4;
  ok(window.app.w3dAct('play') === false, '体力不足时玩耍被拒绝');
  world().attr.stamina = stamina0;
  window.ui.w3dCooldowns = {};

  group('战功事件卡');
  state().world.loginDays = 5;
  world().courage = 60;
  state().world.medals = [];
  window.app.checkWorldEvents();
  await sleep(600);
  ok($('modalWrap').classList.contains('show'), '触发事件 → 弹窗出现');
  ok(has('modalBox', '蝶舞之约'), '事件卡内容正确');
  window.app.closeModal();

  group('家园：主题 / 外观 / 家具 / 战功（V1.10 对齐 2D 小游戏）');
  window.app.go('world');
  window.app.openWTab('decor');
  await sleep(30);
  ok(has('world-body', '家园主题'), '家园 tab 渲染出主题区');
  ok(has('world-body', '宠物外观'), '家园 tab 渲染出外观区');
  ok(has('world-body', '院子家具'), '家园 tab 渲染出家具区');
  ok(has('world-body', '性格画像'), '家园 tab 渲染出派生性格画像');
  ok(has('world-body', '思念模式'), '家园 tab 渲染出思念模式');

  const coins0 = state().world.coinA;
  state().world.coinA = 200;
  ok(window.app.buyHomeTheme('sakura') === true, '买主题成功');
  ok(state().world.home.themes.includes('sakura'), '主题已入库');
  ok(state().world.home.theme === 'sakura', '买完自动切到该主题');
  ok(state().world.coinA === 200 - 30, '主题扣金币A');
  ok(window.app.useHomeTheme('fresh') === true, '切回默认主题');
  ok(state().world.home.theme === 'fresh', '主题已切回');

  ok(window.app.buyHomeOutfit('tophat') === true, '买外观成功');
  ok(state().world.home.outfit.worn.hat === 'tophat', '外观买完直接穿戴');
  ok(window.app.toggleHomeOutfit('tophat') === true, '脱下外观');
  ok(state().world.home.outfit.worn.hat === null, '外观已脱下');

  const coins1 = state().world.coinA;
  ok(window.app.buyHomeFurniture('sofa') === true, '买家具成功');
  ok(state().world.home.furniture.some((f) => f.id === 'sofa'), '家具已入库');
  ok(state().world.coinA === coins1 - 20, '家具扣金币A');
  ok(window.app.placeHomeFurniture('sofa', 1) === true, '家具换机位');
  ok(state().world.home.furniture.find((f) => f.id === 'sofa').slot === 1, '机位已更新');
  ok(window.app.removeHomeFurniture('sofa') === true, '家具收回仓库');
  ok(state().world.coinA === coins1, '收回家具退还金币A');

  state().world.medals = ['butterfly', 'scholar'];
  ok(window.app.homeMerit() === 6, '战功值 = 勋章数 × 3');
  const mem0 = !!state().world.home.memorial;
  window.app.toggleMemorial();
  ok(state().world.home.memorial !== mem0, '思念模式开关可切换');
  state().world.home.memorial = false;

  group('社区发帖 → 家园事件');
  const mood0 = world().attr.mood;
  const evt = window.app.applyPostEvent('今天带它去打针了');
  ok(evt && evt.kind === 'alert', '打针类帖子 → 警觉事件');
  ok(world().attr.mood < mood0, '事件让心情下降');

  group('每个页面都能渲染');
  const pages = window.document.querySelectorAll('.page');
  const pageIds = [...pages].map((p) => p.id.replace('pg-', ''));
  for (const id of pageIds) {
    let threw = false;
    try {
      window.app.go(id);
    } catch (e) {
      threw = true;
      errors.push('go(' + id + ') 抛错: ' + e.message);
    }
    await sleep(10);
    ok(!threw, '切页无异常：' + id);
  }

  group('动作契约（页面里的 app.xxx 都已注册）');
  const registered = new Set(window.app.__names);
  const html2 = window.document.body.innerHTML;
  const used = new Set([...html2.matchAll(/app\.([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]));
  const missing = [...used].filter((n) => !registered.has(n));
  ok(missing.length === 0, '所有内联动作已注册' + (missing.length ? ' → ' + missing.join(',') : ''));
  ok(registered.size > 60, '注册动作数量 > 60（实际 ' + registered.size + '）');

  group('持久化');
  const saved = JSON.parse(window.localStorage.getItem('pet_butler_demo_v1'));
  ok(saved && saved.world && saved.world.loginDays >= 1, '存档写入 localStorage');
  ok(!('garden' in saved), '旧家园字段已从存档移除');

  group('控制台错误');
  const real = errors.filter((e) => !/Could not load|stylesheet|Not implemented|WebGL|getContext|canvas/i.test(e));
  ok(real.length === 0, '页面级 JS 错误 = 0' + (real.length ? ' → ' + real[0] : ''));
  if (real.length) real.slice(0, 10).forEach((e) => console.log('    ' + e));

  console.log('\n========================================');
  console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
  if (fail) {
    failures.forEach((f) => console.log('  - ' + f));
    process.exit(1);
  }
  console.log('SMOKE ALL GREEN');
  process.exit(0);
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(2);
});
