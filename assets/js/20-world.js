/* ============ V1.7 虚拟人宠世界 ============ */
/* 课程/打工/商品数值表（V1.7 需求） */
const WCOURSES=[
  {id:1,n:'初级课程',sub:'宠物行为习惯课 · 基础体能课',cost:{hunger:10,clean:15,mood:5,stamina:10},gain:{wisdom:5,growth:5}},
  {id:2,n:'进阶课程',sub:'厨艺课 · 治愈陪伴课 · 才艺课',cost:{hunger:15,clean:20,mood:10,stamina:15},gain:{wisdom:10,growth:10},need:1},
  {id:3,n:'高级课程',sub:'口才课 · 动物教育心理学 · 导盲搜救课',cost:{hunger:20,clean:25,mood:15,stamina:20},gain:{wisdom:15,growth:15},need:2}
];
const WJOBS=[
  {id:1,n:'初级打工',sub:'送外卖服务 · 猫咖狗咖被撸一天',cost:{hunger:10,clean:15,mood:5,stamina:10},gain:{growth:5,coinA:5},need:1},
  {id:2,n:'进阶打工',sub:'治愈陪伴师 · 甜品店烘焙师 · 宠物模特走秀',cost:{hunger:15,clean:20,mood:10,stamina:15},gain:{growth:10,coinA:15},need:2},
  {id:3,n:'高级打工',sub:'直播带货 · 猫狗学校讲师 · 导盲搜救',cost:{hunger:20,clean:25,mood:15,stamina:20},gain:{growth:15,coinA:25},need:3}
];
const WGOODS=[
  {id:'foodA',n:'食物A',ic:'🐟',c:'#E8945A',price:3,eff:{hunger:5},d:'普通口粮，饥饿值+5'},
  {id:'foodB',n:'食物B',ic:'🍖',c:'#F05B5B',price:5,eff:{hunger:15},d:'营养大餐，饥饿值+15'},
  {id:'clnA',n:'清洁用品A',ic:'🧴',c:'#3AB5C0',price:4,eff:{clean:8},d:'免洗泡沫，清洁值+8'},
  {id:'clnB',n:'清洁用品B',ic:'🛁',c:'#5B8DEF',price:8,eff:{clean:20},d:'香波洗护套装，清洁值+20'}
];
/* 运动馆/娱乐馆（PRD 4.5，需求3）：成长等级 Lv.30 解锁；消耗饥饿值/体力值 + 金币A，增强特定属性；非基础项目预留金币B（充值） */
const WVENUES={
  sport:{name:'运动馆',ic:'🏟️',items:[
    {id:'frisbee',n:'宠物飞盘',ic:'🥏',cost:{hunger:8,stamina:10},coin:3,gain:{mood:4,growth:5},crg:1,d:'草坪接飞盘，勇气小幅提升'},
    {id:'swim',n:'宠物游泳',ic:'🏊',cost:{hunger:10,stamina:14},coin:5,gain:{mood:6,growth:8},crg:2,d:'恒温泳池，全身锻炼'},
    {id:'gym',n:'宠物健身房',ic:'🏋️',cost:{hunger:12,stamina:18},coin:8,gain:{growth:10,wisdom:2},crg:2,d:'专业器械，体能特训'},
    {id:'bungee',n:'宠物蹦极',ic:'🪂',cost:{hunger:15,stamina:22},coin:12,gain:{growth:14},crg:5,d:'高空挑战，勇气大幅提升'},
    {id:'skate',n:'宠物溜冰',ic:'⛸️',cost:{hunger:12,stamina:16},coin:8,gain:{mood:8,growth:9},crg:2,d:'冰场滑行，平衡感训练'},
    {id:'dive',n:'宠物潜水',ic:'🤿',cost:{hunger:15,stamina:20},coin:12,gain:{growth:13,wisdom:3},crg:4,d:'深水探险，胆识特训'}
  ]},
  fun:{name:'娱乐馆',ic:'🎡',items:[
    {id:'party',n:'宠物轰趴馆',ic:'🎉',cost:{hunger:8,stamina:8},coin:5,gain:{mood:10,growth:5},d:'社交派对，认识新朋友'},
    {id:'ktv',n:'宠物KTV',ic:'🎤',cost:{hunger:6,stamina:8},coin:5,gain:{mood:12,growth:5},d:'一展歌喉，心情大好'},
    {id:'park',n:'宠物游乐场',ic:'🎡',cost:{hunger:10,stamina:12},coin:8,gain:{mood:15,growth:8},d:'旋转木马与滑梯，玩到不想回家'},
    {id:'cinema',n:'宠物电影院',ic:'🎬',cost:{hunger:5,stamina:5},coin:4,gain:{mood:8,wisdom:2,growth:4},d:'宠物专场影片，安静长见识'},
    {id:'arcade',n:'宠物电玩城',ic:'🎮',cost:{hunger:8,stamina:10},coin:8,gain:{mood:12,wisdom:3,growth:7},d:'益智电玩，反应力训练'},
    {id:'craft',n:'宠物手作馆',ic:'🧶',cost:{hunger:6,stamina:8},coin:6,gain:{mood:10,wisdom:4,growth:6},d:'随机刷新：给妈妈做拼豆带回家'}
  ]}
};
const WNAMES={hunger:'饥饿值',clean:'清洁值',mood:'心情值',stamina:'体力值',wisdom:'智慧值',growth:'成长值'};
let wTab='home';
function worldPet(pid){
  const id=pid||S.curPet;
  if(!S.world.pets[id])S.world.pets[id]={courage:60,attr:{hunger:80,clean:80,mood:70,stamina:85,wisdom:0,growth:0},courseLv:0,jobLv:0};
  const w=S.world.pets[id];
  Object.keys(w.attr).forEach(k=>{if(typeof w.attr[k]!=='number'||isNaN(w.attr[k]))w.attr[k]=0});
  return w;
}
/* 世界成长等级：成长值每 50 点 1 级（沿用 V1.7 曲线，取消 9 级封顶，PRD level 1–100） */
function worldLevel(){return Math.min(100,1+Math.floor(worldPet().attr.growth/50))}
/* 运动馆/娱乐馆解锁所需成长等级（需求3） */
const WSPORT_UNLOCK_LV=30;
/* 真实养宠行为 → 世界成长值（双向联动，需求3）：社区发帖+10 / 更新宠物日常+5 */
function addWorldGrowth(n,why){
  const w=worldPet();
  const lv0=worldLevel();
  w.attr.growth=Math.min(9999,w.attr.growth+n);
  save();
  const lv1=worldLevel();
  if(lv1>lv0&&lv0<WSPORT_UNLOCK_LV&&lv1>=WSPORT_UNLOCK_LV){
    setTimeout(()=>{if(window._w3d&&!_w3d.suspended)w3dSuspend();openModal('<div style="text-align:center"><div style="font-size:44px">🏟️</div><div style="font-size:17px;font-weight:900;margin-top:8px">成长等级达到 Lv.'+lv1+'</div><div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">「'+esc(curPet().name)+'」长大了！<br><b style="color:#8B5CF6">运动馆</b>与<b style="color:#E8709A">娱乐馆</b>已解锁，<br>去消耗金币A锻炼玩耍吧～</div><button class="btn" onclick="closeModal();(window._w3d&&_w3d.suspended?w3dResume():openWorld())">去看看</button></div>')},300);
  }
  return lv1;
}
/* toast 用纯文本版数值变动串（toast 不支持 HTML） */
function attrDeltaTxt(o){return Object.keys(o).map(k=>WNAMES[k]+(o[k]>0?'+':'-')+Math.abs(o[k])).join(' ')}
/* 进入游戏：加载进度条 → 登录结算（第5天彩蛋） → 进世界 */
function openWorld(){
  const ov=$('worldLoad');
  $('wlPetName').textContent=curPet().name;
  $('wlFill').style.width='0%';$('wlPct').textContent='0%';
  const tips=['正在布置小院草坪…','正在唤醒「'+curPet().name+'」…','正在同步四维属性…','正在生成今日天气…'];
  let ti=0;pct=0;
  $('wlTip').innerHTML=tips[0];
  ov.classList.add('show');
  clearInterval(window._wlT);
  window._wlT=setInterval(()=>{
    pct=Math.min(100,pct+3+Math.random()*7);
    $('wlFill').style.width=pct+'%';
    $('wlPct').textContent=Math.floor(pct)+'%';
    const nt=tips[Math.min(tips.length-1,Math.floor(pct/28))];
    if($('wlTip').dataset.t!==nt){$('wlTip').dataset.t=nt;$('wlTip').innerHTML=nt}
    if(pct>=100){
      clearInterval(window._wlT);
      setTimeout(()=>{ov.classList.remove('show');worldEnter()},250);
    }
  },70);
}
function worldEnter(){
  const t=today();
  let firstDay=false;
  if(S.world.lastLoginDate!==t){S.world.lastLoginDate=t;S.world.loginDays++;firstDay=true;save()}
  w3dEnter();
  if(firstDay)w3dMsg('欢迎回到人宠世界，第 '+S.world.loginDays+' 天');
  checkWorldEvents();
}
/* ============ 特定事件与战功系统（通用引擎） ============
 * 规则（PRD 4.8 / V1.7 需求2）：属性值>50% 且达到登录天数 → 旅行青蛙式自动触发 → 卡片弹窗结算 + 战功勋章
 * 新增事件只需向 WEVENTS 追加配置：attr 取值器、阈值、最早登录天数、事件文案、战功、属性奖励 */
const WEVENTS=[
  {id:'butterfly',icon:'🦋',title:'独自外出追蝴蝶',
   val:w=>w.courage,threshold:50,minLoginDay:5,
   gain:{growth:5},
   story:w=>'第 '+S.world.loginDays+' 天的午后，阳光正好。<br>「'+esc(curPet().name)+'」鼓起勇气独自跑出院子，<br>追着一只蝴蝶在草丛里玩了整整一个下午～<br><b style="color:#D9A03C">勇气值 '+w.courage+'%（>50%）</b>，符合触发条件',
   medal:{id:'butterfly',n:'蝶舞之约',ic:'🦋',d:'勇气值>50%时，登录家园系统第5天触发「独自外出追蝴蝶」事件获得'}}
];
/* 战功目录由事件表派生，战功页自动列出全部已配置勋章 */
const WMEDALS=WEVENTS.map(e=>e.medal);
function checkWorldEvents(){
  const w=worldPet();
  WEVENTS.forEach(ev=>{
    if(S.world.loginDays>=ev.minLoginDay&&ev.val(w)>ev.threshold&&!S.world.medals.includes(ev.medal.id)){
      S.world.medals.push(ev.medal.id);
      Object.keys(ev.gain||{}).forEach(k=>{w.attr[k]=Math.min(9999,w.attr[k]+ev.gain[k])});
      save();
      setTimeout(()=>showEventCard(ev),450);
    }
  });
}
/* 事件结算卡片（弹窗模式出现一张卡片） */
function showEventCard(ev){
  if(window._w3d&&!_w3d.suspended)w3dSuspend();
  openModal(
    '<div style="text-align:center">'+
    '<div style="font-size:44px;animation:floatUp 2.4s ease infinite">'+ev.icon+'</div>'+
    '<div style="font-size:17px;font-weight:900;margin-top:8px">触发战功事件：'+ev.title+'</div>'+
    '<div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">'+ev.story(worldPet())+'</div>'+
    '<div style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,rgba(245,208,97,.2),rgba(217,160,60,.1));border:1.5px solid rgba(217,160,60,.5);border-radius:16px;padding:10px 18px;margin-bottom:14px"><span style="font-size:20px">🎖️</span><div style="text-align:left"><div style="font-size:13px;font-weight:900;color:#C77E12">获得战功勋章「'+ev.medal.n+'」</div><div style="font-size:10px;color:var(--sub)">'+attrDeltaStr(ev.gain||{})+'</div></div></div>'+
    '<button class="btn" onclick="closeModal();w3dResume()">收下勋章</button></div>');
}
function attrDeltaStr(o,sign){
  return Object.keys(o).map(k=>{
    const isAdd=o[k]>0;
    const cls=isAdd?'#3BB786':'#F05B5B';
    return '<span style="font-size:10.5px;font-weight:700;color:'+cls+'">'+WNAMES[k]+(isAdd?'+':'-')+Math.abs(o[k])+'</span>';
  }).join(' ');
}
function canPay(cost){
  const w=worldPet();
  const lack=Object.keys(cost).filter(k=>w.attr[k]<cost[k]);
  return lack;
}
function payAndGain(cost,gain,extra){
  const w=worldPet();
  Object.keys(cost).forEach(k=>{w.attr[k]=Math.max(0,w.attr[k]-cost[k])});
  Object.keys(gain).forEach(k=>{w.attr[k]=Math.min(9999,w.attr[k]+gain[k])});
  if(extra)extra();
  save();renderWorld();
}
function renderWorld(){
  const p=curPet(),w=worldPet();
  const lvl=worldLevel();
  const A=w.attr;
  const bars=[['hunger','#E8945A','🍖'],['clean','#3AB5C0','🫧'],['mood','#E8709A','💗'],['stamina','#5B8DEF','⚡'],['wisdom','#8B5CF6','📖'],['growth','#3BB786','🌱']];
  const body=
  '<div class="subhdr" style="margin:-12px -16px 12px"><span style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:var(--blue-d);font-size:12px;font-weight:800" onclick="w3dResume()"><svg class="icon"><use href="#i-back"/></svg>返回世界</span><b style="font-size:15px">虚拟人宠世界</b><span style="margin-left:auto;display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:800;color:#C77E12;background:rgba(245,208,97,.18);padding:4px 11px;border-radius:999px">🪙 金币A '+S.world.coinA+'</span></div>'+
  /* 宠物 + 属性 */
  '<div class="card" style="padding:14px 16px;margin-bottom:12px">'+
    '<div style="display:flex;gap:13px;align-items:center;margin-bottom:12px"><div style="width:74px;height:74px;flex:none;border-radius:24px;background:linear-gradient(160deg,#DCEBFB,#EFE6D6);display:flex;align-items:center;justify-content:center">'+petSVG(p,66,'happy')+'</div><div style="flex:1"><div style="font-size:16px;font-weight:900">'+p.name+' <span class="chip" style="font-size:9px;background:rgba(139,92,246,.13);color:#8B5CF6">世界 Lv.'+lvl+'</span></div><div style="font-size:10.5px;color:var(--sub);margin-top:3px">已入驻人宠世界 '+S.world.loginDays+' 天 · 挂机生活中</div><div style="font-size:10px;color:#8A99AB;margin-top:3px">天气：'+(window._w3d?({sunny:"晴 ☀️",overcast:"阴 ☁️",rain:"小雨 🌧"})[_w3d.weather]:"晴 ☀️")+' · 季节：秋（院里落叶）</div></div></div>'+
    bars.map(b=>'<div class="wstat"><div class="wt"><span>'+b[2]+' '+WNAMES[b[0]]+'</span><b>'+Math.round(A[b[0]])+'</b></div><div class="statbar"><div class="statfill" style="width:'+(b[0]==='growth'?Math.min(100,(A.growth%50)/50*100):Math.min(100,A[b[0]]))+'%;background:linear-gradient(90deg,'+b[1]+'aa,'+b[1]+')"></div></div></div>').join('')+
  '</div>'+
  /* 勇气/胆小 拖动条 */
  '<div class="card" style="padding:14px 16px;margin-bottom:12px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:13px">性格二元属性</b><span style="font-size:10px;color:var(--sub)">按百分比拖动调整</span></div>'+
    '<div style="display:flex;justify-content:space-between;font-size:11.5px;font-weight:800;margin:6px 0 10px"><span style="color:#F5A623">勇气值 '+w.courage+'%</span><span style="color:#8B5CF6">胆小值 '+(100-w.courage)+'%</span></div>'+
    '<input type="range" min="0" max="100" step="1" value="'+w.courage+'" class="crg" id="crgRange" oninput="onCourage(this.value)" onchange="save();renderWorld()">'+
    '<div style="font-size:10px;color:var(--sub);margin-top:8px;line-height:1.6">勇气值>50%：第5天登录可触发「独自外出追蝴蝶」战功事件；胆小值高：陌生人来访会躲起来</div>'+
  '</div>'+
  /* 四大模块入口 */
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:12px">'+
    [['学院','🎓','上学提属性','school'],['打工','💼','赚金币A','jobs'],['商城','🛒','食物清洁品','shop'],['运动','🏟️','强体魄提勇气','sport'],['娱乐','🎡','放松心情','fun'],['战功','🎖️','勋章收藏','medal']].map(m=>{const lk=(m[3]==='sport'||m[3]==='fun')&&lvl<WSPORT_UNLOCK_LV;return '<div class="card chov" style="padding:12px 4px;text-align:center;cursor:pointer;position:relative;'+(lk?'opacity:.55':'')+'" onclick="openWTab(\''+m[3]+'\')">'+(lk?'<span style="position:absolute;top:5px;right:7px;font-size:11px">🔒</span>':'')+'<div style="font-size:22px">'+m[1]+'</div><div style="font-size:11.5px;font-weight:800;margin-top:4px">'+m[0]+'</div><div style="font-size:9px;color:var(--sub);margin-top:2px">'+(lk?'Lv.'+WSPORT_UNLOCK_LV+' 解锁':m[2])+'</div></div>'}).join('')+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:12px">'+[['home','总览'],['school','学院'],['jobs','打工'],['shop','商城'],['sport','运动'],['fun','娱乐'],['medal','战功']].map(t=>'<button class="wtab'+(wTab===t[0]?' act':'')+'" onclick="openWTab(\''+t[0]+'\')">'+t[1]+'</button>').join('')+'</div>'+
  '<div id="wTabBody"></div>';
  $('world-body').innerHTML=body;
  renderWTab();
}
function openWTab(t){wTab=t;if(t==='home')go('world');renderWorld();if(t!=='home')setTimeout(()=>{const el=$('wTabBody');if(el&&el.scrollIntoView)el.scrollIntoView({behavior:'smooth'})},50)}
function renderWTab(){
  const p=curPet(),w=worldPet(),A=w.attr;
  const el=$('wTabBody');if(!el)return;
  if(wTab==='home'){
    el.innerHTML='<div class="card" style="padding:13px 15px"><b style="font-size:12.5px">最近动态</b>'+
    (w.jobLv>0?'<div style="font-size:11px;color:var(--sub);margin-top:7px">💼 已完成打工 '+w.jobLv+' 次 · 累计获得金币A</div>':'')+
    '<div style="font-size:11px;color:var(--sub);margin-top:7px">🎓 课程结业进度：'+['未结业','初级','进阶','高级'][w.courseLv]+'（影响可接打工等级）</div>'+
    '<div style="font-size:11px;color:var(--sub);margin-top:7px">🦋 勇气值 '+w.courage+'% · '+(w.courage>50?'有机会触发「蝶舞之约」':'胆小值偏高，容易躲起来')+'</div>'+
    '<div style="font-size:11px;color:var(--sub);margin-top:7px">🏟️ 运动馆/娱乐馆：'+(worldLevel()>=WSPORT_UNLOCK_LV?'已解锁，消耗金币A锻炼玩耍':'成长等级 Lv.'+WSPORT_UNLOCK_LV+' 解锁（当前 Lv.'+worldLevel()+'）· 发帖+10 / 更新宠物日常+5 成长值')+'</div></div>';
  }
  else if(wTab==='school'){
    el.innerHTML=WCOURSES.map(c=>{
      const locked=w.courseLv<(c.need||0);
      const lack=canPay(c.cost);
      return '<div class="card" style="padding:13px 15px;margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">'+c.n+'</b>'+(locked?'<span class="chip" style="font-size:9px;background:rgba(0,0,0,.06);color:#8A99AB">需先结业'+WCOURSES[c.need-1].n+'</span>':'<span class="chip" style="font-size:9px;background:rgba(59,183,134,.13);color:#3A9C6B">可报名</span>')+'</div>'+
      '<div style="font-size:10.5px;color:var(--sub);margin-top:3px">'+c.sub+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span style="'+attrDeltaStyle()+'">'+attrDeltaStr(neg(c.cost))+'</span><span>'+attrDeltaStr(c.gain)+'</span></div>'+
      (lack.length?'<div style="font-size:10px;color:#F05B5B;margin-top:7px">⚠ '+lack.map(k=>WNAMES[k]).join('、')+'不足，先喂食/洗护恢复</div>':'')+
      '<button class="btn btn-sm" style="width:auto;padding:7px 18px;margin-top:9px" '+(locked||lack.length?'disabled':'')+' onclick="doCourse('+c.id+')">去上课（30分钟）</button></div>';
    }).join('')+'<div style="font-size:10px;color:#8A99AB;margin-top:4px">课程随版本更新 · 连续上课心情小幅下降，记得课后陪玩</div>';
  }
  else if(wTab==='jobs'){
    el.innerHTML=WJOBS.map(j=>{
      const locked=w.courseLv<j.need;
      const lack=canPay(j.cost);
      return '<div class="card" style="padding:13px 15px;margin-bottom:10px">'+
      '<div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13px">'+j.n+'</b>'+(locked?'<span class="chip" style="font-size:9px;background:rgba(0,0,0,.06);color:#8A99AB">需'+WCOURSES[j.need-1].n+'结业</span>':'<span class="chip" style="font-size:9px;background:rgba(245,208,97,.18);color:#C77E12">🪙 +'+j.gain.coinA+'</span>')+'</div>'+
      '<div style="font-size:10.5px;color:var(--sub);margin-top:3px">'+j.sub+'</div>'+
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span>'+attrDeltaStr(neg(j.cost))+'</span><span>'+attrDeltaStr({growth:j.gain.growth})+'</span><span style="font-size:10.5px;font-weight:700;color:#C77E12">金币A+'+j.gain.coinA+'</span></div>'+
      (lack.length?'<div style="font-size:10px;color:#F05B5B;margin-top:7px">⚠ '+lack.map(k=>WNAMES[k]).join('、')+'不足</div>':'')+
      '<button class="btn btn-sm" style="width:auto;padding:7px 18px;margin-top:9px" '+(locked||lack.length?'disabled':'')+' onclick="doJob('+j.id+')">去打工</button></div>';
    }).join('')+'<div style="font-size:10px;color:#8A99AB;margin-top:4px">打工是人宠世界唯一获取金币A的途径 · 工作随版本更新</div>';
  }
  else if(wTab==='shop'){
    el.innerHTML='<div class="card" style="padding:12px 15px;margin-bottom:10px;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--sub)">金币A余额</span><b style="font-size:16px;color:#C77E12;margin-left:auto">🪙 '+S.world.coinA+'</b></div>'+
    WGOODS.map(g=>'<div class="card" style="padding:12px 15px;margin-bottom:10px;display:flex;align-items:center;gap:11px">'+
    '<div style="width:42px;height:42px;border-radius:14px;background:'+g.c+'1c;display:flex;align-items:center;justify-content:center;font-size:20px;flex:none">'+g.ic+'</div>'+
    '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">'+g.n+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:2px">'+g.d+'</div></div>'+
    '<button class="btn btn-sm" style="width:auto;padding:7px 13px;flex:none" '+(S.world.coinA<g.price?'disabled':'')+' onclick="buyGood(\''+g.id+'\')">🪙 '+g.price+'</button></div>').join('')+
    '<div style="font-size:10px;color:#8A99AB;margin-top:4px">购买后立即给「'+esc(p.name)+'」使用 · 金币A来自打工，非基础商品需金币B（充值）</div>';
  }
  else if(wTab==='sport'||wTab==='fun'){
    const grp=WVENUES[wTab];const lv=worldLevel();
    if(lv<WSPORT_UNLOCK_LV){
      const need=WSPORT_UNLOCK_LV*50;
      el.innerHTML='<div class="card" style="padding:26px 18px;text-align:center">'+
      '<div style="font-size:38px">🔒</div>'+
      '<div style="font-size:14.5px;font-weight:900;margin-top:8px">'+grp.name+'未解锁</div>'+
      '<div style="font-size:11.5px;color:var(--sub);margin:8px 0 12px;line-height:1.8">成长等级达到 <b style="color:#8B5CF6">Lv.'+WSPORT_UNLOCK_LV+'</b> 后开放（当前 Lv.'+lv+'）<br>社区发帖 +10 · 更新宠物日常 +5 · 上课/打工也可累积成长值</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--sub);margin-bottom:5px"><span>成长值 '+Math.round(A.growth)+'</span><span>目标 '+need+'</span></div><div class="statbar"><div class="statfill" style="width:'+Math.min(100,A.growth/need*100)+'%;background:linear-gradient(90deg,#B79BF2,#8B5CF6)"></div></div></div>';
    }else{
      el.innerHTML='<div class="card" style="padding:12px 15px;margin-bottom:10px;display:flex;align-items:center;gap:8px"><span style="font-size:12px;color:var(--sub)">'+grp.name+' · 金币A余额</span><b style="font-size:16px;color:#C77E12;margin-left:auto">🪙 '+S.world.coinA+'</b></div>'+
      grp.items.map(v=>{
        const lack=canPay(v.cost);const poor=S.world.coinA<v.coin;
        return '<div class="card" style="padding:13px 15px;margin-bottom:10px">'+
        '<div style="display:flex;align-items:center;gap:11px"><div style="width:42px;height:42px;border-radius:14px;background:rgba(139,92,246,.1);display:flex;align-items:center;justify-content:center;font-size:20px;flex:none">'+v.ic+'</div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">'+v.n+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:2px">'+v.d+'</div></div>'+
        '<button class="btn btn-sm" style="width:auto;padding:7px 13px;flex:none" '+(lack.length||poor?'disabled':'')+' onclick="doVenue(\''+wTab+'\',\''+v.id+'\')">🪙 '+v.coin+'</button></div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px"><span>'+attrDeltaStr(neg(v.cost))+'</span><span>'+attrDeltaStr(v.gain)+'</span>'+(v.crg?'<span style="font-size:10.5px;font-weight:700;color:#F5A623">勇气值+'+v.crg+'</span>':'')+'</div>'+
        (lack.length?'<div style="font-size:10px;color:#F05B5B;margin-top:6px">⚠ '+lack.map(k=>WNAMES[k]).join('、')+'不足，先喂食恢复</div>':'')+
        (poor?'<div style="font-size:10px;color:#F05B5B;margin-top:6px">⚠ 金币A不足，先去打工赚钱</div>':'')+'</div>';
      }).join('')+'<div style="font-size:10px;color:#8A99AB;margin-top:4px">基础项目消耗金币A（打工产出）· 运动提升勇气值，娱乐恢复心情 · 场馆随版本更新</div>';
    }
  }
  else if(wTab==='medal'){
    const all=WMEDALS;
    el.innerHTML=all.map(m=>{
      const on=S.world.medals.includes(m.id);
      return '<div class="wmedal '+(on?'on':'')+'"><div class="mi" style="background:'+(on?'rgba(245,208,97,.25)':'rgba(0,0,0,.05)')+';filter:'+(on?'none':'grayscale(1) opacity(.45)')+'">'+m.ic+'</div><div style="flex:1"><div style="font-size:12.5px;font-weight:800">'+m.n+(on?' <span class="chip" style="font-size:9px;background:rgba(217,160,60,.16);color:#C77E12">已获得</span>':'')+'</div><div style="font-size:10px;color:var(--sub);margin-top:2px;line-height:1.6">'+m.d+'</div></div></div>';
    }).join('')+'<div style="font-size:10px;color:#8A99AB;margin-top:4px">特定事件与战功系统：属性值决定触发哪类事件与战功，更多战功随版本更新</div>';
  }
}
function attrDeltaStyle(){return ''}
function neg(o){const r={};Object.keys(o).forEach(k=>r[k]=-Math.abs(o[k]));return r}
function onCourage(v){
  const w=worldPet();w.courage=Math.max(0,Math.min(100,parseInt(v)||0));save();
  const box=$('crgRange');
  if(box){const lab=box.parentElement.querySelectorAll('span');if(lab.length>=2){lab[0].textContent='勇气值 '+w.courage+'%';lab[1].textContent='胆小值 '+(100-w.courage)+'%'}}
}
function doCourse(id){
  const c=WCOURSES.find(x=>x.id===id);const lack=canPay(c.cost);
  if(lack.length){toast(lack.map(k=>WNAMES[k]).join('、')+'不足，无法上课');return}
  openModal('<div style="text-align:center"><div style="font-size:38px">🎓</div><div style="font-size:15.5px;font-weight:900;margin-top:6px">报名「'+c.n+'」</div>'+
  '<div style="font-size:11.5px;color:var(--sub);margin:10px 0;line-height:1.8">上课时长：30分钟（演示立即结算）<br>消耗：'+attrDeltaStr(neg(c.cost))+'<br>结业收益：'+attrDeltaStr(c.gain)+'</div>'+
  '<div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="closeModal()">再想想</button><button class="btn" onclick="closeModal();payAndGain('+JSON.stringify(c.cost).replace(/"/g,'&quot;')+','+JSON.stringify(c.gain).replace(/"/g,'&quot;')+',()=>{worldPet().courseLv=Math.max(worldPet().courseLv,'+c.id+')});toast(\'结业！\'+c.n+\' 完成，智慧值与成长值已提升\')">确认上课</button></div></div>');
}
function doJob(id){
  const j=WJOBS.find(x=>x.id===id);const w=worldPet();
  if(w.courseLv<j.need){toast('需先在学院结业'+WCOURSES[j.need-1].n);return}
  const lack=canPay(j.cost);
  if(lack.length){toast(lack.map(k=>WNAMES[k]).join('、')+'不足，无法打工');return}
  openModal('<div style="text-align:center"><div style="font-size:38px">💼</div><div style="font-size:15.5px;font-weight:900;margin-top:6px">指派「'+j.n+'」</div>'+
  '<div style="font-size:11.5px;color:var(--sub);margin:10px 0;line-height:1.8">'+j.sub+'<br>消耗：'+attrDeltaStr(neg(j.cost))+'<br>收益：成长值+'+j.gain.growth+' · 金币A+'+j.gain.coinA+'</div>'+
  '<div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="closeModal()">再想想</button><button class="btn" onclick="closeModal();payAndGain('+JSON.stringify(j.cost).replace(/"/g,'&quot;')+',{growth:'+j.gain.growth+'},()=>{S.world.coinA+=' + j.gain.coinA + ';worldPet().jobLv++});toast(\'打工完成！金币A+'+j.gain.coinA+'\')">确认打工</button></div></div>');
}
function buyGood(id){
  const g=WGOODS.find(x=>x.id===id);
  if(S.world.coinA<g.price){toast('金币A不足，去打工小镇赚金币吧');return}
  S.world.coinA-=g.price;
  payAndGain({},g.eff);
  toast('已使用'+g.n+'：'+attrDeltaStr(g.eff));
}
/* 运动/娱乐场馆：校验 → 确认 → 结算（金币A + 属性消耗/收益 + 勇气值提升） */
function doVenue(type,id){
  const v=WVENUES[type].items.find(x=>x.id===id);
  const lack=canPay(v.cost);
  if(lack.length){toast(lack.map(k=>WNAMES[k]).join('、')+'不足，先喂食/休息恢复');return}
  if(S.world.coinA<v.coin){toast('金币A不足，先去打工赚钱');return}
  openModal('<div style="text-align:center"><div style="font-size:38px">'+v.ic+'</div><div style="font-size:15.5px;font-weight:900;margin-top:6px">进入「'+v.n+'」</div>'+
  '<div style="font-size:11.5px;color:var(--sub);margin:10px 0;line-height:1.8">'+v.d+'<br>消耗：'+attrDeltaStr(neg(v.cost))+' · 金币A-'+v.coin+'<br>收益：'+attrDeltaStr(v.gain)+(v.crg?' · 勇气值+'+v.crg:'')+'</div>'+
  '<div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="closeModal()">再想想</button><button class="btn" onclick="closeModal();settleVenue(\''+type+'\',\''+v.id+'\')">确认进入</button></div></div>');
}
function settleVenue(type,id){
  const v=WVENUES[type].items.find(x=>x.id===id);const w=worldPet();
  S.world.coinA-=v.coin;
  if(v.crg)w.courage=Math.min(100,w.courage+v.crg);
  w.venue=(w.venue||0)+1;
  payAndGain(v.cost,v.gain);
  toast(v.n+'结束：'+attrDeltaTxt(v.gain)+(v.crg?' · 勇气值+'+v.crg:''));
}

