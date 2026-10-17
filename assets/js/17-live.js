/* ============ 直播模块（V1.4） ============ */
const LVROOMS=[
  {id:'lv1',title:'年糕的干饭直播间',anchor:'铲屎官Leo',avatar:'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop',cover:'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop',tag:'主粮秒杀',pid:'g1',viewers:1204,likes:3600},
  {id:'lv2',title:'布丁的户外撒欢日常',anchor:'柯基屁股协会',avatar:'https://images.unsplash.com/photo-1600275669439-14e40452d20b?w=80&h=80&fit=crop',cover:'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop',tag:'新品试用',pid:'g6',viewers:866,likes:2100},
  {id:'lv3',title:'深夜诊室：猫行为答疑',anchor:'安安宠物医院',avatar:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop',cover:'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=300&fit=crop',tag:'专家在线',pid:'g4',viewers:542,likes:980}
];
const LVCMTS=['主粮链接上了！','年糕太可爱了吧','已拍两袋','主播声音好治愈','柯基屁股申请出战','这个价格真香','求摸猫教程','刚进来，在讲什么？','铲屎官集合','主播求抱抱'];
const live={open:false,playing:false,mini:false,x:null,y:null,room:0,viewers:0,likes:0,cIdx:0,tm:null};
function renderLiveStrip(){
  return '<div style="margin-bottom:14px">'+
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:0 2px">'+
    '<div style="display:flex;align-items:center;gap:7px"><span class="live-dot"></span><b style="font-size:13.5px">Live</b><span style="font-size:10px;color:var(--sub)">'+LVROOMS.length+' 个直播中</span></div>'+
    (live.open?'<span style="font-size:10.5px;color:var(--sub)">小窗播放中</span>':'<span style="font-size:10.5px;color:var(--blue-d);cursor:pointer;font-weight:700" onclick="liveOpen(true)">开启小窗 ›</span>')+
  '</div>'+
  '<div style="display:flex;gap:9px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px">'+LVROOMS.map((r,i)=>
    '<div class="tile" style="min-width:150px;padding:0" onclick="live.room='+i+';liveExpand()">'+
      '<div style="position:relative;height:86px;background:#0B1220"><img src="'+r.cover+'" style="width:100%;height:100%;object-fit:cover;opacity:.9" onerror="imgErr(this)">'+
      '<span style="position:absolute;top:6px;left:6px;font-size:8.5px;color:#fff;background:rgba(255,77,79,.92);padding:2px 7px;border-radius:999px;display:flex;align-items:center;gap:3px;font-weight:800"><span class="live-dot" style="background:#fff;width:5px;height:5px"></span>LIVE</span>'+
      '<span style="position:absolute;bottom:6px;left:6px;font-size:9px;color:#fff;background:rgba(0,0,0,.55);padding:2px 7px;border-radius:999px">'+r.viewers.toLocaleString()+' 人观看</span>'+
      '<span style="position:absolute;top:6px;right:6px;font-size:8.5px;color:#fff;background:rgba(58,123,213,.9);padding:2px 7px;border-radius:999px;font-weight:700">'+r.tag+'</span></div>'+
      '<div style="padding:8px 10px 10px"><div style="font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.title+'</div><div style="font-size:9.5px;color:var(--sub);margin-top:2px">'+r.anchor+'</div></div>'+
    '</div>').join('')+'</div></div>';
}
function liveOpen(auto){
  live.open=true;
  renderLiveFab();
  if($('pg-home').classList.contains('on'))renderHome();
  if(auto&&!live.playing)toast('直播小窗已开启：点击画面即可播放，支持拖动 / 最小化 / 关闭');
}
function liveClose(){
  live.open=false;live.playing=false;live.mini=false;
  if(live.tm){clearInterval(live.tm);live.tm=null}
  const el=$('liveFab');if(el)el.remove();
  if($('pg-home').classList.contains('on'))renderHome();
  toast('已关闭直播小窗，可在首页直播区重新打开');
}
function liveMin(){live.mini=!live.mini;renderLiveFab()}
function liveToMini(){
  closeModal();
  live.open=true;live.mini=false;
  renderLiveFab();
  if($('pg-home').classList.contains('on'))renderHome();
  toast('已收起至悬浮小窗：可拖动 / 最小化 / 关闭');
}
function livePlay(){
  const r=LVROOMS[live.room];
  live.playing=true;live.viewers=r.viewers;live.likes=r.likes;live.cIdx=0;
  if(live.tm)clearInterval(live.tm);
  live.tm=setInterval(liveTick,1300);
  renderLiveFab();
  toast('正在播放「'+r.title+'」');
}
function liveTick(){
  if(!live.playing||!live.open)return;
  if(S.set.offline)return;
  live.viewers+=Math.floor(Math.random()*9)+1;
  live.likes+=Math.floor(Math.random()*24)+3;
  document.querySelectorAll('.lvV').forEach(n=>n.textContent=live.viewers.toLocaleString()+' 人观看');
  document.querySelectorAll('.lvL').forEach(n=>n.textContent=live.likes.toLocaleString());
  live.cIdx++;
  if(live.cIdx%2===0){
    const c=LVCMTS[live.cIdx%LVCMTS.length];
    document.querySelectorAll('.lvCs').forEach(box=>{const s=document.createElement('div');s.className='lv-c';s.textContent=c;box.appendChild(s);while(box.children.length>3)box.removeChild(box.firstChild)});
  }
  if(Math.random()<.5)spawnHearts();
}
function spawnHearts(){
  document.querySelectorAll('.lvHeartZone').forEach(z=>{
    const s=document.createElement('span');
    s.textContent='♥';
    s.style.cssText='position:absolute;font-size:'+(9+Math.random()*9)+'px;color:#FF6B81;left:'+(55+Math.random()*35)+'%;bottom:6px;animation:hUp 1.2s ease forwards;pointer-events:none';
    z.appendChild(s);setTimeout(()=>s.remove(),1250);
  });
}
function lvLike(){
  live.likes+=3;
  document.querySelectorAll('.lvL').forEach(n=>n.textContent=live.likes.toLocaleString());
  for(let i=0;i<3;i++)setTimeout(spawnHearts,i*120);
}
function lvSend(){
  const v=$('lvIn')?$('lvIn').value.trim():'';
  if(!v)return;
  document.querySelectorAll('.lvCs').forEach(box=>{const s=document.createElement('div');s.className='lv-c';s.textContent=S.user.nick+'：'+v;box.appendChild(s);while(box.children.length>4)box.removeChild(box.firstChild)});
  if($('lvIn'))$('lvIn').value='';
}
function liveSceneHTML(r,big){
  const prod=S.products.find(p=>p.id===r.pid);
  return '<div style="position:absolute;inset:0;overflow:hidden">'+
    '<img src="'+r.cover+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;filter:saturate(1.1)" onerror="imgErr(this)">'+
    '<div style="position:absolute;left:'+(big?'27%':'23%')+';bottom:0">'+petSVG(curPet(),big?118:76,'happy')+'</div>'+
    (prod?'<div style="position:absolute;left:6px;top:'+(big?'48%':'52%')+';background:rgba(255,255,255,.94);border-radius:10px;padding:'+(big?'6px 9px':'4px 7px')+';display:flex;gap:6px;align-items:center;max-width:72%"><span style="font-size:8px;background:var(--danger);color:#fff;padding:1px 5px;border-radius:6px;font-weight:800;flex:none">讲解中</span><span style="font-size:'+(big?'10px':'8.5px')+';font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:86px">'+prod.name+'</span><span style="font-size:'+(big?'11px':'9.5px')+';color:var(--danger);font-weight:900;flex:none">¥'+prod.price+'</span></div>':'')+
    '<div style="position:absolute;right:8px;bottom:'+(big?'12px':'36px')+';display:flex;flex-direction:column;gap:3px;align-items:center">'+
      ['🧡','💙','🤍'].map((h,i)=>'<span style="font-size:'+(big?'14px':'10px')+';opacity:'+(0.9-i*0.25)+';animation:lvFloat '+(2+i*0.7)+'s ease-in-out infinite;animation-delay:'+(i*0.4)+'s">'+h+'</span>').join('')+
    '</div>'+
    '<div class="lvCs" style="position:absolute;left:6px;bottom:6px;right:'+(big?'100px':'54px')+';display:flex;flex-direction:column;gap:2px;pointer-events:none;z-index:2"></div>'+
    '<div class="lvHeartZone" style="position:absolute;inset:0;pointer-events:none;z-index:2"></div>'+
  '</div>';
}
function renderLiveFab(){
  let el=$('liveFab');
  if(!live.open){if(el)el.remove();return}
  if(!el){el=document.createElement('div');el.id='liveFab';el.className='live-fab';$('phone').appendChild(el)}
  const r=LVROOMS[live.room];
  const off=S.set.offline;
  el.className='live-fab'+(live.mini?' mini':'');
  if(live.x!=null){el.style.left=live.x+'px';el.style.top=live.y+'px';el.style.right='auto';el.style.bottom='auto'}
  else{el.style.left='';el.style.right='12px';el.style.top='';el.style.bottom='96px'}
  if(live.mini){
    if(live.x!=null){
      live.x=Math.max(4,Math.min(live.x,($('phone').offsetWidth||392)-146));
      live.y=Math.max(4,Math.min(live.y,($('phone').offsetHeight||850)-128));
      el.style.left=live.x+'px';el.style.top=live.y+'px';el.style.right='auto';el.style.bottom='auto';
    }
    el.innerHTML=
    '<div style="display:flex;align-items:center;gap:6px;padding:8px 8px 8px 12px">'+
      '<span data-act="restore" title="点击恢复悬浮小窗" style="flex:1;min-width:0;display:flex;align-items:center;gap:7px;cursor:pointer">'+
        (live.playing?'<span class="live-dot" style="width:9px;height:9px"></span><b style="font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">直播中</b>':'<svg class="icon" style="width:13px;height:13px;color:#fff;flex:none"><use href="#i-play"/></svg><b style="font-size:11px;color:rgba(255,255,255,.7)">已暂停</b>')+
      '</span>'+
      '<span class="lv-btn" data-act="expand" title="展开全屏直播间" style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.14)"><svg class="icon" style="width:12px;height:12px"><use href="#i-max"/></svg></span>'+
      '<span class="lv-btn" data-act="close" title="关闭直播" style="width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,.14)"><svg class="icon" style="width:12px;height:12px"><use href="#i-x"/></svg></span>'+
    '</div>';
    el.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',function(e){
      e.stopPropagation();
      const a=this.getAttribute('data-act');
      if(a==='restore'){live.mini=false;renderLiveFab();toast('已恢复悬浮小窗，可拖动 / 最小化 / 关闭')}
      else if(a==='expand'){liveExpand()}
      else if(a==='close'){liveClose()}
    }));
    return;
  }
  el.innerHTML=
  '<div class="lv-head" onpointerdown="lvDragStart(event)" ondblclick="liveMin()">'+
    '<svg class="icon" style="width:12px;height:12px;color:rgba(255,255,255,.65)"><use href="#i-more"/></svg>'+
    '<span style="flex:1;min-width:0;font-size:9.5px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.title+'</span>'+
    (LVROOMS.length>1?'<span class="lv-btn" title="切换直播间" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();lvSwitchRoom()"><svg class="icon" style="width:11px;height:11px"><use href="#i-refresh"/></svg></span>':'')+
    '<span class="lv-btn" title="最小化" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();liveMin()"><svg class="icon" style="width:11px;height:11px"><use href="#i-down"/></svg></span>'+
    '<span class="lv-btn" title="关闭" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation();liveClose()"><svg class="icon" style="width:11px;height:11px"><use href="#i-x"/></svg></span>'+
  '</div>'+
  '<div class="lv-stage" onclick="lvStageTap()">'+
    (live.playing?liveSceneHTML(r):'<img src="'+r.cover+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85" onerror="imgErr(this)">')+
    (live.playing?'<span class="lvV" style="position:absolute;top:6px;left:6px;font-size:9px;color:#fff;background:rgba(0,0,0,.5);padding:2px 7px;border-radius:8px;z-index:2">'+live.viewers.toLocaleString()+' 人观看</span>':'')+
    (!live.playing?'<div style="position:absolute;inset:0;background:rgba(8,14,30,.55);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;z-index:2">'+
      '<div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.92);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.4)"><svg class="icon" style="width:16px;height:16px;color:#16233B;margin-left:2px"><use href="#i-play"/></svg></div>'+
      '<div style="font-size:9.5px;color:rgba(255,255,255,.88)">'+(off?'网络不可用，暂时无法播放':'点击播放 · '+r.anchor+' 直播中')+'</div></div>':'')+
    (live.playing&&off?'<div class="lv-buffer"><div class="spin"></div><div style="font-size:9.5px;color:#fff">网络不稳定，正在缓冲…</div><button class="btn btn-sm" style="width:auto;padding:4px 12px;font-size:10px" onclick="event.stopPropagation();S.set.offline=false;save();applySet(\'offline\');toast(\'网络已恢复\')">重试</button></div>':'')+
  '</div>'+
  '<div class="lv-foot" onclick="lvStageTap()">'+
    '<span style="flex:1;min-width:0;font-size:9px;color:rgba(255,255,255,.6)">'+(live.playing?'秒杀进行中 · 点此全屏':'未播放')+'</span>'+
    '<span class="lv-btn" onclick="event.stopPropagation();liveExpand()">全屏</span>'+
  '</div>';
}
function lvSwitchRoom(){
  live.room=(live.room+1)%LVROOMS.length;
  if(live.playing){const r=LVROOMS[live.room];live.viewers=r.viewers;live.likes=r.likes}
  renderLiveFab();
  if(live.playing)toast('已切换至「'+LVROOMS[live.room].title+'」');
}
function lvStageTap(){
  if(!live.playing){
    if(S.set.offline){toast('当前无网络，无法播放直播');return}
    livePlay();
  } else liveExpand();
}
function liveExpand(){
  const r=LVROOMS[live.room];
  if(!live.playing){
    if(S.set.offline){toast('当前无网络，无法播放直播');return}
    livePlay();
  }
  const prod=S.products.find(p=>p.id===r.pid);
  openModal(
  '<style>#lvIn::placeholder{color:rgba(255,255,255,.35)}</style>'+
  '<div style="margin:-12px -10px -10px;background:linear-gradient(170deg,#1A2540 0%,#0E1729 100%);border-radius:22px;padding:14px 13px 13px;color:#fff;box-shadow:0 24px 60px rgba(5,10,25,.6)">'+
    '<div style="display:flex;align-items:center;gap:9px;margin-bottom:11px">'+
      '<div style="width:40px;height:40px;border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 2px rgba(255,255,255,.22)"><img src="'+r.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
      '<div style="flex:1;min-width:0"><div style="font-size:13.5px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+r.anchor+'<span style="font-size:9px;font-weight:700;color:#FF6B81;background:rgba(255,107,129,.15);border:1px solid rgba(255,107,129,.35);border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:1px">主播</span></div><div style="font-size:10px;color:rgba(255,255,255,.55);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px">'+r.title+'</div></div>'+
      '<span class="lv-btn" style="width:auto;height:28px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.12);gap:4px;font-size:11px;font-weight:700" title="收起至悬浮小窗" onclick="liveToMini()"><svg class="icon" style="width:12px;height:12px"><use href="#i-down"/></svg>收起</span>'+
      '<span class="lv-btn" style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.12)" title="关闭直播" onclick="liveClose();closeModal()"><svg class="icon" style="width:13px;height:13px"><use href="#i-x"/></svg></span>'+
    '</div>'+
    '<div style="position:relative;height:236px;border-radius:18px;overflow:hidden;background:#0B1220;box-shadow:0 12px 32px rgba(0,0,0,.45)">'+liveSceneHTML(r,true)+
      '<div style="position:absolute;top:9px;left:9px;display:flex;gap:6px;z-index:2"><span style="font-size:9.5px;color:#fff;background:rgba(255,77,79,.92);padding:3px 9px;border-radius:999px;display:flex;align-items:center;gap:4px;font-weight:800"><span class="live-dot" style="background:#fff;width:5px;height:5px"></span>LIVE</span><span class="lvV" style="font-size:9.5px;color:#fff;background:rgba(0,0,0,.5);padding:3px 9px;border-radius:999px">'+live.viewers.toLocaleString()+' 人观看</span></div>'+
      (S.set.offline?'<div class="lv-buffer"><div class="spin"></div><div style="font-size:10px;color:#fff">网络不稳定，正在缓冲…</div></div>':'')+
    '</div>'+
    '<div style="display:flex;gap:8px;margin-top:11px;align-items:stretch">'+
      (prod?'<div style="flex:1;display:flex;gap:9px;padding:9px 10px;align-items:center;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:14px;min-width:0"><div style="width:42px;height:42px;border-radius:11px;overflow:hidden;flex:none"><img src="'+prod.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1;min-width:0"><div style="font-size:9.5px;color:#FF8A65;font-weight:800">讲解中 · 限时 ¥'+prod.price+'</div><div style="font-size:10.5px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:1px">'+prod.name+'</div></div><button style="border:none;cursor:pointer;flex:none;padding:7px 12px;border-radius:999px;background:linear-gradient(135deg,#FF7A45,#FF4D4F);color:#fff;font-size:11px;font-weight:800;box-shadow:0 6px 14px rgba(255,77,79,.35)" onclick="closeModal();quickBuy(\''+prod.id+'\')">去抢购</button></div>':'')+
      '<button style="border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.07);cursor:pointer;width:52px;flex:none;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;border-radius:14px" onclick="lvLike()"><svg class="icon icon-s" style="color:#FF6B81"><use href="#i-heart"/></svg><span class="lvL" style="font-size:9px;font-weight:800;color:#fff">'+live.likes.toLocaleString()+'</span></button>'+
    '</div>'+
    '<div style="display:flex;gap:8px;margin-top:11px"><input id="lvIn" placeholder="说点什么，为主播打call…" style="flex:1;min-width:0;border:none;outline:none;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:10px 14px;font-size:12.5px;color:#fff" onkeydown="if(event.key===\'Enter\')lvSend()"><button class="btn btn-sm" style="width:66px;flex:none" onclick="lvSend()">发送</button></div>'+
  '</div>');
  const mw=$('modalWrap');
  mw.onclick=function(e){if(e.target===mw)liveToMini()};
  const f=$('liveFab');
  if(f)f.style.display='none';
  toast('点击空白处可收起至悬浮小窗');
}
/* 拖拽（支持缩放后的坐标换算） */
let lvDrag={on:false,moved:false,sx:0,sy:0,ox:0,oy:0};
function lvDragStart(e){
  if(live.mini)return;
  if(e.target.closest&&e.target.closest('.lv-btn'))return;
  lvDrag.on=true;lvDrag.moved=false;
  lvDrag.sx=e.clientX;lvDrag.sy=e.clientY;
  const el=$('liveFab');
  lvDrag.ox=el.offsetLeft;lvDrag.oy=el.offsetTop;
}
function lvDragMove(e){
  if(!lvDrag.on)return;
  const sc=window.__phoneScale||1;
  const dx=(e.clientX-lvDrag.sx)/sc,dy=(e.clientY-lvDrag.sy)/sc;
  if(Math.abs(dx)>3||Math.abs(dy)>3)lvDrag.moved=true;
  const phone=$('phone');
  const el=$('liveFab');if(!el)return;
  let nx=lvDrag.ox+dx,ny=lvDrag.oy+dy;
  nx=Math.max(4,Math.min(nx,phone.offsetWidth-el.offsetWidth-4));
  ny=Math.max(4,Math.min(ny,phone.offsetHeight-el.offsetHeight-84));
  el.style.left=nx+'px';el.style.top=ny+'px';el.style.right='auto';el.style.bottom='auto';
  live.x=nx;live.y=ny;
}
function lvDragEnd(){lvDrag.on=false}

/* ============ 多端适配缩放 ============ */
function fitScale(w,h){return Math.min(1,(h-24)/850,(w-24)/392)}
function fitPhone(){
  const p=$('phone');if(!p)return;
  if(window.innerWidth<=500){p.style.transform='';window.__phoneScale=1;return}
  const s=fitScale(window.innerWidth,window.innerHeight);
  window.__phoneScale=s;
  if(s<1){p.style.transformOrigin='center center';p.style.transform='scale('+s+')'}
  else p.style.transform='';
}

