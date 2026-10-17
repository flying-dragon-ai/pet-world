/* ============ 离线结算============ */
/* ============ 首页（V1.6：AI搜索框 / 形象照片切换 / 点击宠物看成长档案 / 磁贴tab化 / 今日任务模块） ============ */
var heroImgMode=true,homeSvcTab='svc';
const SVC_TABS=[
  ['svc','宠物服务',[['宠物商城','精选好物 · AI导购','i-cart','#E8945A',"go('mall')"],['人宠世界','虚拟挂机 · 上学打工','i-paw','#8B5CF6',"openWorld()"]]],
  ['care','健康陪伴',[['健康打卡','数据记录 · 周报','i-med','#4CA876',"go('health')"],['成长相册','时光记忆 · 宠物照片','i-img','#3AB5C0',"profTab='album';go('profile')"]]],
  ['out','出行组局',[['活动组局','遛宠聚会 · 赛事市集','i-cal','#F05B5B',"go('act')"],['携宠旅游','友好目的地攻略','i-pin','#8B7DE8',"go('travel')"]]]
];
function toggleHeroImg(){heroImgMode=!heroImgMode;renderHome();toast(heroImgMode?'已切换显示真实照片':'已切换显示动态卡通头像')}
function aiSearchGo(){
  const i=$('homeSearch');const q=i&&i.value.trim();
  openChat('ask',q||('我家'+curPet().name+'最近状态怎么样？'));
  if(i)i.value='';
}
function aiSearchVoice(){
  if(window._vbusy)return;window._vbusy=true;
  toast('正在聆听…');
  setTimeout(()=>{
    window._vbusy=false;
    const T=['我家'+curPet().name+'今天呕吐了两次，持续约2小时，需要就医吗',curPet().name+'每天该喂多少克','这周'+curPet().name+'体重变化正常吗','推荐适合'+curPet().name+'的猫粮'];
    openChat('ask',T[Math.floor(Math.random()*T.length)]);
    toast('语音识别完成（演示），已发送给AI');
  },1200);
}
function openPetGrowCard(){
  const p=curPet(),g=petGarden(p),lvl=petLevel(p);
  const cnt=t=>S.records.filter(r=>r.pet===p.id&&r.type===t).length;
  const ws2=[...S.daily.filter(d=>d.pet===p.id&&d.k==='weight')].sort((a,b)=>a.ts-b.ts);
  const rms=S.reminders.filter(r=>r.pet===p.id).slice(0,3);
  const nextGrow=lvl*120;
  openSheet(p.name+' 的成长档案',
  '<div style="display:flex;gap:13px;align-items:center;margin-bottom:12px"><div style="width:64px;height:64px;border-radius:20px;overflow:hidden;flex:none">'+petImgTag(p)+'</div><div style="flex:1"><div style="font-size:17px;font-weight:900">'+p.name+' <span class="chip" style="font-size:9.5px">'+p.gender+'</span> <span class="chip" style="font-size:9.5px;background:rgba(217,160,60,.15);color:#C77E12">Lv.'+lvl+'</span></div><div style="font-size:11px;color:var(--sub);margin-top:3px">'+p.species+' · '+p.breed+' · '+petAge(p)+' · '+Math.round(p.weight*2)+'斤'+(p.height?' · 身高'+p.height+'cm · 身长'+p.bodyLen+'cm':'')+' · '+p.neuter+'</div></div></div>'+
  (((p.personality&&p.personality.length)||p.important)?'<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px">'+((p.personality||[]).map(x=>'<span class="chip" style="font-size:9.5px">性格·'+x+'</span>').join(''))+(p.important?'<span class="chip" style="font-size:9.5px;background:rgba(245,166,35,.13);color:#C77E12">⚠ 重要提示：'+esc(p.important)+'</span>':'')+'</div>':'')+
  '<div class="card" style="padding:12px 14px;margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-bottom:5px"><span>成长值 '+g.growth+'</span><span>距下一级还差 '+Math.max(0,nextGrow-g.growth)+'</span></div><div class="statbar"><div class="statfill" style="width:'+Math.min(100,g.growth/nextGrow*100)+'%"></div></div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><span class="chip" style="font-size:10px;background:rgba(232,148,90,.12);color:#E8945A">饱食 '+Math.round(g.satiety)+'</span><span class="chip" style="font-size:10px;background:rgba(232,112,154,.12);color:#E8709A">心情 '+Math.round(g.mood)+'</span><span class="chip" style="font-size:10px;background:rgba(58,181,192,.12);color:#3AB5C0">清洁 '+Math.round(g.clean)+'</span><span class="chip" style="font-size:10px;background:rgba(91,141,239,.12);color:#5B8DEF">活力 '+Math.round(g.vitality)+'</span></div></div>'+
  '<div class="card" style="padding:12px 14px;margin-bottom:10px"><b style="font-size:12.5px">档案记录</b><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+[['疫苗',cnt('vaccine')],['驱虫',cnt('deworm')],['洗护',cnt('care')],['就医',cnt('medical')],['饮食',cnt('diet')]].map(x=>'<span class="chip" style="font-size:10px">'+x[0]+' '+x[1]+' 条</span>').join('')+'<span class="chip" style="font-size:10px;background:rgba(59,183,134,.13);color:#3A9C6B">最近体重 '+(ws2.length?ws2[ws2.length-1].v+'kg':'待记录')+'</span></div></div>'+
  (rms.length?'<div class="card" style="padding:12px 14px;margin-bottom:10px"><b style="font-size:12.5px">近期提醒</b>'+rms.map(r=>'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--sub);margin-top:7px"><span>'+esc(r.name)+'</span><b style="color:'+(rmDays(r.id)<=7?'#F05B5B':'var(--ink)')+'">'+rmDays(r.id)+' 天后</b></div>').join('')+'</div>':'')+
  '<div style="display:flex;gap:8px;margin-top:6px"><button class="btn btn-ghost" style="flex:1" onclick="closeSheet();switchPetSheet()">切换宠物</button><button class="btn" style="flex:1" onclick="closeSheet();go(\'profile\')">查看完整档案</button></div>');
}
function renderHome(){
  const p=curPet(),g=petGarden(p);
  const mood=g.mood>=60?'happy':(g.mood>=30?'normal':'sick');
  const unread=S.msgs.filter(m=>!m.read).length;
  const HK=[['feed','给'+p.name+'喂食一次','+10','i-bowl','#E8945A',"quickFeed()"],['touch','抚摸'+p.name+' 3次','+10','i-heart','#E8709A',"openWorld()"],['health','完成一次健康打卡','+15','i-med','#4CA876',"go('health')"]];
  const taskDone=HK.filter(t=>g.tasks[t[0]]===today()).length;
  const recentW=[...S.daily.filter(d=>d.pet===p.id&&d.k==='weight')].sort((a,b)=>a.ts-b.ts);
  const lastW=recentW.length?recentW[recentW.length-1].v:p.weight;
  const lastWaterRec=[...S.daily.filter(d=>d.pet===p.id&&d.k==='water')].sort((a,b)=>a.ts-b.ts);
  const lastWater=lastWaterRec.length?lastWaterRec[lastWaterRec.length-1].v:null;
  const moodTxt=mood==='happy'?'心情很好':mood==='normal'?'状态平稳':'有点没精神';
  const hour=new Date().getHours();
  const hello=hour<6?'夜深了':hour<11?'早上好':hour<14?'中午好':hour<18?'下午好':'晚上好';
  $('home-body').innerHTML=
  /* V1.6 首页顶部AI搜索框（文字回车/点发送 → AI聊天；麦克风 → 语音识别后发送） */
  '<div class="card" style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px">'+
    '<svg class="icon icon-s" style="color:#8FA8C9;flex:none"><use href="#i-search"/></svg>'+
    '<input id="homeSearch" placeholder="问问 AI：症状 / 喂养 / 行为…" style="flex:1;min-width:0;border:none;outline:none;background:transparent;font-size:13px;color:var(--ink)" onkeydown="if(event.key===\'Enter\')aiSearchGo()">'+
    '<span title="发送给AI" onclick="aiSearchGo()" style="width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#5B8DEF,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer;box-shadow:0 4px 10px rgba(58,123,213,.35)"><svg class="icon icon-s" style="color:#fff"><use href="#i-send"/></svg></span>'+
    '<span title="语音提问" onclick="aiSearchVoice()" style="width:30px;height:30px;border-radius:50%;background:rgba(74,144,217,.1);display:flex;align-items:center;justify-content:center;flex:none;cursor:pointer"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-mic"/></svg></span>'+
  '</div>'+
  '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;padding:2px 2px 0">'+
    '<div><div style="font-size:15px;font-weight:800;letter-spacing:.3px">'+hello+'，'+esc(S.user.nick)+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:2px">今天也要好好照顾毛孩子哦</div></div>'+
    '<div style="position:relative;cursor:pointer" onclick="go(\'messages\')"><svg class="icon icon-l" style="color:#7C8CA0"><use href="#i-bell"/></svg>'+(unread?'<span class="dot-badge bell-badge">'+unread+'</span>':'<span class="bell-badge" style="display:none"></span>')+'</div>'+
  '</div>'+
  '<div class="hero14">'+
    '<div class="hero-grid"></div>'+
    '<div style="display:flex;gap:14px;align-items:flex-end;position:relative">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="font-size:9.5px;letter-spacing:3px;color:rgba(255,255,255,.55);font-weight:700">MY PET · '+p.species.toUpperCase()+'</div>'+
        '<div style="font-size:33px;font-weight:200;letter-spacing:1px;line-height:1.15;margin-top:6px">'+p.name+'</div>'+
        '<div style="font-size:11.5px;color:rgba(255,255,255,.75);margin-top:6px;line-height:1.6">'+p.breed+' · '+petAge(p)+' · '+Math.round(p.weight*2)+'斤'+(p.height?' · 身高'+p.height+'cm · 身长'+p.bodyLen+'cm':' · '+p.weight+'kg')+'</div>'+
        '<div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">'+
          '<button class="hero-cta" style="background:#fff;color:#16233B" onclick="openChat(\'ask\',\'我家'+p.name+'最近状态怎么样？\')"><svg class="icon icon-s" style="color:#3A7BD5"><use href="#i-spark"/></svg>问 AI</button>'+
          '<button class="hero-cta" style="background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.45)" onclick="switchPetSheet()">切换宠物</button>'+
        '</div>'+
      '</div>'+
      '<div style="position:relative;flex:none;cursor:pointer" onclick="openPetGrowCard()" title="点击查看成长档案"><div class="hero-pet">'+(heroImgMode?petImgTag(p):petSVG(p,102,mood))+'</div><button title="形象/照片切换" onclick="event.stopPropagation();toggleHeroImg()" style="position:absolute;right:-2px;bottom:4px;width:27px;height:27px;border-radius:50%;border:none;cursor:pointer;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:3"><svg class="icon" style="width:13px;height:13px;color:#3A7BD5"><use href="#i-img"/></svg></button></div>'+
    '</div>'+
    '<div class="hero-stats">'+
      '<div><div class="hs-n">'+(p.height!=null?p.height+'<b>cm</b>':lastW+'<b>kg</b>')+'</div><div class="hs-l">'+(p.height!=null?'身高':'体重')+'</div></div>'+
      '<div><div class="hs-n">'+Math.round(g.satiety)+'</div><div class="hs-l">饱食</div></div>'+
      '<div><div class="hs-n">'+Math.round(g.mood)+'</div><div class="hs-l">心情</div></div>'+
      '<div><div class="hs-n">Lv.'+petLevel(p)+'</div><div class="hs-l">成长</div></div>'+
    '</div>'+
  '</div>'+
  renderLiveStrip()+
  '<div class="card" style="padding:11px 14px 4px;margin-bottom:14px">'+
    '<div style="display:flex;gap:6px">'+SVC_TABS.map(t=>'<button class="rTab'+(homeSvcTab===t[0]?' act':'')+'" style="flex:1;padding:7px 0" onclick="homeSvcTab=\''+t[0]+'\';renderHome()">'+t[1]+'</button>').join('')+'</div>'+
    '<div style="margin-top:2px">'+(SVC_TABS.find(t=>t[0]===homeSvcTab)||SVC_TABS[0])[2].map((it,i)=>'<div style="display:flex;align-items:center;gap:11px;padding:11px 2px;cursor:pointer;'+(i?'border-top:1px solid rgba(0,0,0,.05)':'')+'" onclick="'+it[4]+'"><div style="width:36px;height:36px;border-radius:12px;background:'+it[3]+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+it[3]+'"><use href="#'+it[2]+'"/></svg></div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700">'+it[0]+'</div><div style="font-size:10px;color:var(--sub);margin-top:1px">'+it[1]+'</div></div><svg class="icon icon-s" style="color:#C9D2DD;flex:none"><use href="#i-right"/></svg></div>').join('')+'</div>'+
  '</div>'+
  '<div class="card" style="padding:15px 16px;margin-bottom:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:13.5px">健康概览</b><span style="font-size:11px;color:var(--blue-d);cursor:pointer;font-weight:700" onclick="go(\'health\')">周报详情 ›</span></div>'+
    '<div class="stat-strip">'+
      '<div><div class="bignum" style="color:#5B8DEF">'+Math.round(g.vitality)+'</div><div style="font-size:10px;color:var(--sub);margin-top:2px">活力值</div></div>'+
      '<div><div class="bignum" style="color:#3AB5C0">'+Math.round(g.clean)+'</div><div style="font-size:10px;color:var(--sub);margin-top:2px">清洁度</div></div>'+
      '<div><div class="bignum" style="color:#E8945A">'+(lastWater!=null?lastWater:'--')+'<b>'+(lastWater!=null?'ml':'')+'</b></div><div style="font-size:10px;color:var(--sub);margin-top:2px">最近饮水</div></div>'+
    '</div>'+
    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><span class="chip" style="background:rgba(76,168,118,.13);color:#3A9C6B"><svg class="icon icon-s"><use href="#i-shield"/></svg>疫苗 313 天后</span><span class="chip"><svg class="icon icon-s"><use href="#i-drop"/></svg>驱虫 78 天后</span><span class="chip" style="background:rgba(232,148,90,.12);color:#E8945A">洗澡 '+rmDays('rm3')+' 天后</span></div>'+
  '</div>'+
  '<div class="card" style="padding:13px 15px;margin-bottom:14px">'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-weight:800;font-size:13.5px">今日任务 <span style="color:var(--blue-d)">'+taskDone+'/3</span></div><span style="font-size:10px;color:var(--sub)">'+(taskDone===3?'全部完成，奖励已到账':'完成可领积分')+'</span></div>'+
    '<div class="statbar" style="margin-bottom:2px"><div class="statfill" style="width:'+(taskDone/3*100)+'%"></div></div>'+
    HK.map(t=>{
      const done=g.tasks[t[0]]===today();
      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(0,0,0,.05)">'+
      '<div style="width:34px;height:34px;border-radius:11px;background:'+t[4]+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+t[4]+'"><use href="#'+t[3]+'"/></svg></div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;'+(done?'color:#9AA9BC;text-decoration:line-through':'')+'">'+t[1]+'</div><div style="font-size:9.5px;color:var(--sub);margin-top:1px">奖励 '+t[2]+' 积分</div></div>'+
      (done?'<span class="chip" style="background:rgba(59,183,134,.13);color:#2E9C6F;font-size:10px;flex:none">已完成</span>':'<button class="btn btn-sm" style="width:auto;padding:6px 13px;flex:none" onclick="'+t[5]+'">去完成</button>')+
      '</div>';
    }).join('')+
  '</div>';
  renderTabBadges();
}
function rmDays(id){const r=S.reminders.find(x=>x.id===id);if(!r)return '-';const d=Math.ceil((new Date(r.next)-new Date())/864e5);return d<0?0:d}
function quickWater(){if(!needNet())return;S.daily.push({pet:S.curPet,k:'water',v:180,ts:Date.now(),by:S.user.nick});const g=petGarden(curPet());g.tasks.water=true;g.vitality=Math.min(100,g.vitality+3);addPts(5,'快捷打卡-喝水');save();toast('已记录饮水 180ml，虚拟宠物活力+3')}
function quickClean(){if(!needNet())return;const g=petGarden(curPet());g.clean=Math.min(100,g.clean+8);g.tasks.clean=true;w3dGain({clean:8});addPts(5,'快捷打卡-铲屎');save();toast('铲屎完成，清洁度+8，世界清洁值+8')}
function quickFeed(){if(!needNet())return;const p=curPet(),g=petGarden(p);g.satiety=Math.min(100,g.satiety+8);if(!g.tasks.feed||g.tasks.feed!==today())g.tasks.feed=today();w3dGain({hunger:8});addPts(5,'快捷打卡-喂食');save();renderHome();toast('喂食打卡完成：'+p.name+'饱食+8，世界饥饿值+8')}
function openSearch(){
  openSheet('全局搜索', '<input class="input" id="gSearch" placeholder="输入关键词，聚合社区/商品/旅游" oninput="doSearch(this.value)"><div id="gSearchRes" style="margin-top:12px;font-size:12px;color:var(--sub)">支持搜索社区帖子、商城商品、携宠目的地</div>');
}
function doSearch(kw){
  kw=kw.trim();
  if(!kw){$('gSearchRes').innerHTML='<div style="font-size:12px;color:var(--sub)">输入关键词试试：猫 / 狗 / 玩具 / 海滩</div>';return}
  const posts=S.posts.filter(p=>(p.title+p.txt).includes(kw)).slice(0,5).map(p=>'<div style="padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:13px;cursor:pointer" onclick="closeSheet();go(\'community\')"><svg class="icon icon-s" style="vertical-align:-3px;color:#8B7DE8"><use href="#i-compass"/></svg> '+esc(p.title)+'</div>').join('');
  const prods=S.products.filter(p=>p.name.includes(kw)).slice(0,5).map(p=>'<div style="padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:13px;cursor:pointer" onclick="closeSheet();openProduct(\''+p.id+'\')"><svg class="icon icon-s" style="vertical-align:-3px;color:#E8945A"><use href="#i-cart"/></svg> '+esc(p.name)+' <span style="color:var(--danger);font-weight:700">¥'+p.price+'</span></div>').join('');
  const dests=S.dests.filter(d=>(d.name+d.city+d.txt).includes(kw)).slice(0,5).map(d=>'<div style="padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:13px;cursor:pointer" onclick="closeSheet();go(\'travel\')"><svg class="icon icon-s" style="vertical-align:-3px;color:#5B8DEF"><use href="#i-pin"/></svg> '+esc(d.name)+'</div>').join('');
  $('gSearchRes').innerHTML='<div style="margin:8px 0 4px;font-weight:700;font-size:12px">社区</div>'+(posts||'<div style="color:#B4BDC8;font-size:12px;padding:4px 0">无结果</div>')+'<div style="margin:10px 0 4px;font-weight:700;font-size:12px">商品</div>'+(prods||'<div style="color:#B4BDC8;font-size:12px;padding:4px 0">无结果</div>')+'<div style="margin:10px 0 4px;font-weight:700;font-size:12px">旅游</div>'+(dests||'<div style="color:#B4BDC8;font-size:12px;padding:4px 0">无结果</div>');
}


/* ============ 健康数据打卡（M4） ============ */
function quickAdd(k,v){
  const d=S.daily.filter(x=>x.pet===S.curPet&&x.k===k&&new Date(x.ts).toDateString()===new Date().toDateString());
  if(k!=='weight'&&d.length){
    openModal('<div style="font-size:15px;font-weight:800;margin-bottom:8px">今天已录入过该项</div><div style="font-size:12.5px;color:var(--sub);margin-bottom:16px">同日重复录入：覆盖将替换今天的数据</div><div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn" onclick="closeModal();S.daily=S.daily.filter(x=>!(x.pet===S.curPet&&x.k===\''+k+'\'));S.daily.push({pet:S.curPet,k:\''+k+'\',v:'+v+',ts:Date.now(),by:S.user.nick});petGarden(curPet()).tasks.health=today();addPts(15,\'健康打卡\');save();renderHealth();toast(\'已覆盖今日数据\')">覆盖（默认）</button><button class="btn btn-ghost" onclick="closeModal();S.daily.push({pet:S.curPet,k:\''+k+'\',v:'+v+',ts:Date.now(),by:S.user.nick});petGarden(curPet()).tasks.health=today();addPts(15,\'健康打卡\');save();renderHealth();toast(\'已新增记录\')">新增</button></div>');
    return;
  }
  S.daily.push({pet:S.curPet,k,v,ts:Date.now(),by:S.user.nick});
  petGarden(curPet()).tasks.health=today();addPts(15,'健康打卡');
  if(k==='weight'){curPet().weight=v;toast('体重已记录并同步档案基线')}
  save();
}
