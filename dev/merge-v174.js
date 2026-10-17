/* V1.7.4 合并构建：以 archive/宠物数字管家APPV1.7.4.html 为底座，
 * 删旧家园/旧人宠世界/旧boot，移植本项目宠物世界（20-world/30-w3d/99-boot 不动），
 * 重挂成长钩子，输出 assets/css/app.css + assets/js/*.js + index.html。
 * 用法：node dev/merge-v174.js（所有替换断言命中，失败即中止不写盘）
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SRC = fs.readFileSync(path.join(ROOT, 'archive/宠物数字管家APPV1.7.4.html'), 'utf8');
const L = SRC.split('\n');
const g = (a, b) => L.slice(a - 1, b).join('\n');

/* 替换并断言命中次数 */
function rep(s, from, to, n = 1) {
  const cnt = s.split(from).length - 1;
  if (cnt !== n) throw new Error('替换命中 ' + cnt + ' 次（预期 ' + n + '）：' + from.slice(0, 60));
  return s.split(from).join(to);
}
function repRe(s, re, to, n = 1) {
  const m = s.match(re);
  if (!m || m.length !== n) throw new Error('正则命中异常：' + re);
  return s.replace(re, to);
}

const out = {};
const staged = [];

/* ---------- 00-utils ---------- */
out['00-utils.js'] = g(357, 371);

/* ---------- 01-data（删 S.garden 迁移 + 补 lastLeave 迁移） ---------- */
let d = g(372, 586);
d = rep(d, "    if(!S.garden.owned)S.garden.owned=[];\n", '');
d = rep(d, "if(!p.g)p.g={satiety:(i===0?(S.garden.satiety||64):70),mood:(i===0?(S.garden.mood||70):66),clean:(i===0?(S.garden.clean||80):78),vitality:(i===0?(S.garden.vitality||58):64),growth:(i===0?(S.garden.growth||130):86),touchCount:0,tasks:S.garden.tasks||{}}",
  "if(!p.g)p.g={satiety:(i===0?64:70),mood:(i===0?70:66),clean:(i===0?80:78),vitality:(i===0?58:64),growth:(i===0?130:86),touchCount:0,tasks:{}}");
d = rep(d, "    S.garden={lastVisit:S.garden.lastVisit||Date.now(),coin:S.garden.coin||80,food:S.garden.food||2,owned:S.garden.owned||[]};\n", '');
d = rep(d, "if(S&&!S.world){\n  S.world={coinA:30,loginDays:0,lastLoginDate:'',medals:[],pets:{}};\n  save();\n}",
  "if(S&&!S.world){\n  S.world={coinA:30,loginDays:0,lastLoginDate:'',medals:[],pets:{}};\n  save();\n}\nif(S&&S.world&&S.world.lastLeave===undefined){S.world.lastLeave=Date.now();save()}");
out['01-data.js'] = d;

/* ---------- 02-core（MAIN/render map/tabTo 去家园） ---------- */
let c = g(587, 639);
c = rep(c, "const MAIN=['home','menu','garden','ai','community','me'];", "const MAIN=['home','menu','ai','community','me'];");
c = rep(c, "{document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('act',b.dataset.tab===pg));const bc=$('btnCenter');if(bc)bc.classList.toggle('act',pg==='garden')}",
  "{document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('act',b.dataset.tab===pg))}");
c = rep(c, "garden:'Garden',ai:'AI'", "ai:'AI'");
c = rep(c, "function tabTo(pg){if(pg==='garden')enterGarden();go(pg)}", "function tabTo(pg){go(pg)}");
out['02-core.js'] = c;

/* ---------- 03-petsvg（pickPet/gardenFlash 去家园） ---------- */
let p3 = g(640, 689);
p3 = rep(p3, "if(id===S.curPet){closeSheet();toast('当前已是「'+curPet().name+'」');if($('pg-garden').classList.contains('on')){renderGarden();gardenFlash()}return}",
  "if(id===S.curPet){closeSheet();toast('当前已是「'+curPet().name+'」');return}");
p3 = rep(p3, "const R={home:'Home',garden:'Garden',ai:'AI',", "const R={home:'Home',ai:'AI',");
p3 = rep(p3, "  if(pid==='garden'){renderGarden();gardenFlash()}\n  else if(R[pid]", "  if(R[pid]");
p3 = rep(p3, "function gardenFlash(){const el=$('petBig');if(el){el.classList.remove('fadeUp');void el.offsetWidth;el.classList.add('fadeUp')}}\n", '');
out['03-petsvg.js'] = p3;

/* ---------- 10-home（首页 + 健康打卡；跳过离线结算与家园段；快捷打卡联动 + feed 指 3D 世界） ---------- */
let h = g(710, 834) + '\n' + g(925, 936);
h = rep(h, "function quickClean(){if(!needNet())return;const g=petGarden(curPet());g.clean=Math.min(100,g.clean+8);g.tasks.clean=true;addPts(5,'快捷打卡-铲屎');save();toast('铲屎完成，清洁度+8')}",
  "function quickClean(){if(!needNet())return;const g=petGarden(curPet());g.clean=Math.min(100,g.clean+8);g.tasks.clean=true;w3dGain({clean:8});addPts(5,'快捷打卡-铲屎');save();toast('铲屎完成，清洁度+8，世界清洁值+8')}");
h = rep(h, "function feed(){go('garden');setTimeout(()=>gardenAct('feed'),350)}", "function feed(){openWorld()}");
h = rep(h, '"go(\'garden\')"', '"openWorld()"', 2);
h = rep(h, "S.garden.tasks.health=today()", "petGarden(curPet()).tasks.health=today()", 3);
out['10-home.js'] = h;

/* ---------- 11-ai ---------- */
out['11-ai.js'] = g(937, 1186);

/* ---------- 12-community（发帖成长钩子） ---------- */
let cm = g(1187, 1396);
cm = rep(cm, "addPts(20,'社区发帖');save();", "addPts(20,'社区发帖');addWorldGrowth(10,'社区发帖');save();");
cm = rep(cm, "toast('审核通过，发布成功（+20积分）');", "toast('审核通过，发布成功（+20积分 · 成长值+10）');");
cm = rep(cm, "发布成功 +20积分（每日上限与互动同池）· 发布内容经机审通过后展示", "发布成功 +20积分（每日上限与互动同池）· 人宠世界成长值+10 · 内容经机审通过后展示");
out['12-community.js'] = cm;

/* ---------- 13-me-profile（相册真上传 + 记录成长钩子） ---------- */
let mp = g(1397, 1616);
mp = repRe(mp, /const OCT=\[[^\]]*\];/, "const OCT=petAlbum(p);");
mp = rep(mp, "[['📷','照片总数','10 张'],['🗓️','本月新增','6 张'],['🏆','最早记录','2026.9']]",
  "[['📷','照片总数',(OCT.length+4)+' 张'],['🗓️','本月新增',OCT.length+' 张'],['🏆','最早记录','2026.9']]");
mp = rep(mp, '2026年10月</b><span class="chip" style="font-size:9.5px">6 张</span>',
  '2026年10月</b><span class="chip" style="font-size:9.5px">\'+OCT.length+\' 张</span>');
mp = rep(mp, 'onclick="toast(\\\'已添加 1 张照片至成长相册（演示）\\\')"', 'onclick="uploadAlbumPhoto()"');
mp = rep(mp, "S.records.unshift(base);toast('保存成功，记录人标识已落库');",
  "S.records.unshift(base);addWorldGrowth(5,'更新宠物日常');toast('保存成功，记录人标识已落库 · 成长值+5');");
/* 从现行 13-me-profile.js 移植相册函数组 */
const curMp = fs.readFileSync(path.join(ROOT, 'assets/js/13-me-profile.js'), 'utf8');
const albStart = curMp.indexOf('/* 成长相册（更新宠物日常）');
if (albStart < 0) throw new Error('现行 13-me-profile.js 未找到相册函数组');
const albEnd = curMp.indexOf('function recCard');
if (albEnd < 0) throw new Error('现行 13-me-profile.js 未找到 recCard 边界');
mp += '\n' + curMp.slice(albStart, albEnd).replace(/\n+$/, '');
out['13-me-profile.js'] = mp;

/* ---------- 14-grow / 15-monitor / 16-mall / 17-misc / 18-service / 19-act ---------- */
out['14-grow.js'] = g(1617, 1699);
out['15-monitor.js'] = g(1700, 1870);
out['16-mall.js'] = g(1871, 2069);
out['17-misc.js'] = g(2070, 2113);
out['18-service.js'] = g(2114, 2304);
out['19-act.js'] = g(2305, 2483);

/* ---------- 21-petwiz（跳过家园装扮；awDone 指 3D 世界） ---------- */
let pw = g(2484, 2547) + '\n' + g(2564, 2591);
pw = rep(pw, '确认并进入家园', '确认并进入人宠世界');
pw = rep(pw, "  tabTo('garden');", "  openWorld();");
pw = rep(pw, "toast('形象已定稿，「'+p.name+'」换新形象入驻家园');", "toast('形象已定稿，「'+p.name+'」换新形象入驻人宠世界');");
out['21-petwiz.js'] = pw;

/* ---------- 22-live ---------- */
out['22-live.js'] = g(2592, 2806);

/* ---------- 语法自检（写盘前） ---------- */
Object.entries(out).forEach(([n, s]) => { new Function(s); staged.push([n, s]); });

/* ---------- app.css：V1.7.4 样式 + 现行 V1.8 3D 样式块 ---------- */
const curCss = fs.readFileSync(path.join(ROOT, 'assets/css/app.css'), 'utf8');
const v8i = curCss.indexOf('/* ===== V1.8 3D');
if (v8i < 0) throw new Error('现行 app.css 未找到 V1.8 样式块');
const css = g(10, 184) + '\n' + curCss.slice(v8i).replace(/\n+$/, '') + '\n';

/* ---------- index.html ---------- */
const curHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const ds = curHtml.indexOf('<!-- V1.8 3D 宠物世界');
const de = curHtml.indexOf('<script src="assets/js/00-utils.js">');
if (ds < 0 || de < 0) throw new Error('现行 index.html 未找到 w3dStage DOM 块');
const w3dDom = curHtml.slice(ds, de).replace(/\n+$/, '');

let head = g(1, 8);
head = rep(head, '<title>宠物数字管家 V1.7.4 - 人宠世界版</title>', '<title>宠物数字管家 V1.8.1 - 3D宠物世界版</title>');
let body = g(186, 355);
body = rep(body, '  <section class="page nopad" id="pg-garden"><div id="garden-body" style="height:100%"></div></section>\n', '');
body = rep(body, '<button class="ai-center" id="btnCenter" title="家园" onclick="tabTo(\'garden\')">',
  '<button class="ai-center" id="btnCenter" title="人宠世界" onclick="openWorld()">');

const ORDER = ['00-utils', '01-data', '02-core', '03-petsvg', '10-home', '11-ai', '12-community',
  '13-me-profile', '14-grow', '15-monitor', '16-mall', '17-misc', '18-service', '19-act',
  '21-petwiz', '22-live', '20-world', '30-w3d', '99-boot'];
staged.forEach(([n]) => { if (!ORDER.includes(n.replace('.js', ''))) throw new Error('模块未列入加载顺序：' + n); });
ORDER.slice(0, 3).forEach(() => {});
const tags = ORDER.map(n => '<script src="assets/js/' + n + '.js"></script>').join('\n');

const html = [head,
  '<script src="assets/js/vendor/three.min.js"></script>',
  '<script src="assets/js/vendor/GLTFLoader.js"></script>',
  '<link rel="stylesheet" href="assets/css/app.css">',
  body, '', w3dDom, '', tags, '</body>', '</html>'].join('\n');

/* ---------- 守护：旧世界/家园符号不得残留 ---------- */
['renderGarden', 'enterGarden', 'settleGarden', 'gardenAct', 'claimTask', 'openGardenTasks',
 'demoAway', 'openDecoSheet', 'buyAcc', 'equipAcc', 'showMissYou', 'gardenFlash', 'S.garden.',
 "go('garden')", "tabTo('garden')"].forEach(sym => {
  const hit = staged.some(([, s]) => s.includes(sym)) || html.includes(sym);
  if (hit) throw new Error('残留符号：' + sym);
});

/* ---------- 写盘 ---------- */
staged.forEach(([n, s]) => fs.writeFileSync(path.join(ROOT, 'assets/js', n), s + '\n'));
['14-monitor.js', '15-mall.js', '16-misc.js', '17-live.js'].forEach(n => {
  const f = path.join(ROOT, 'assets/js', n);
  if (fs.existsSync(f)) fs.unlinkSync(f);
});
fs.writeFileSync(path.join(ROOT, 'assets/css/app.css'), css);
fs.writeFileSync(path.join(ROOT, 'index.html'), html + '\n');
console.log('MERGE OK · 模块 ' + staged.length + ' 个 · index.html ' + html.split('\n').length + ' 行 · app.css ' + css.split('\n').length + ' 行');
