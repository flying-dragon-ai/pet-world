/* ============ 消息中心（M10） ============ */
let msgTab='互动';
function renderMessages(){
  const cats=['互动','系统','健康','订单'];
  const ms=S.msgs.filter(m=>m.cat===msgTab);
  $('messages-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">消息中心</b><span style="margin-left:auto;font-size:11px;color:var(--blue-d);cursor:pointer" onclick="S.msgs.forEach(m=>m.read=true);save();renderMessages();toast(\'已全部标记已读\')">全部已读</span></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px">'+cats.map(c=>'<button class="rTab'+(c===msgTab?' act':'')+'" onclick="msgTab=\''+c+'\';renderMessages()">'+c+'</button>').join('')+'</div>'+
  (ms.length?ms.map(m=>'<div class="card chov" style="padding:13px 15px;margin-bottom:9px;display:flex;gap:11px;cursor:pointer;'+(m.read?'opacity:.65':'')+'" onclick="readMsg(\''+m.id+'\')"><div style="width:38px;height:38px;border-radius:13px;background:rgba(74,144,217,.12);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="color:var(--blue-d)"><use href="#'+m.icon+'"/></svg></div><div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><b style="font-size:13px">'+m.title+'</b>'+(m.read?'':'<span style="width:7px;height:7px;border-radius:50%;background:var(--danger)"></span>')+'</div><div style="font-size:11.5px;color:var(--sub);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+m.txt+'</div></div><span style="font-size:10px;color:var(--sub);flex:none">'+fmtTs(m.ts)+'</span></div>').join(''):'<div class="card" style="padding:26px;text-align:center;font-size:12.5px;color:var(--sub)">暂无消息</div>')+
  '<div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:8px">点击消息按深链路由表直达目标页并定位上下文</div>';
}
function readMsg(id){
  const m=S.msgs.find(x=>x.id===id);m.read=true;save();renderTabBadges();
  const t=m.link[0];
  if(t==='profile'){if(m.link[1]==='vaccine'){healthTab='rec';recType='vaccine';renderHealth();go('health');toast('深链直达：成长记录 · 健康记录（V1.7.4 已迁移至此）')}else{profTab='family';renderProfile();go('profile');toast('深链直达：档案共享管理页')}}
  else if(t==='monitor'){go('monitor');toast('深链直达：事件流定位 14:32')}
  else if(t==='community'){go('community');openNotifSheet();toast('深链直达：互动消息（赞/评论/回复）')}
  else if(t==='orders'){ordTab='全部';go('orders')}
  else go('community');
}
/* ============ 携宠旅游（M9） ============ */
let travCity='全部';
function renderTravel(){
  const cities=['全部',...new Set(S.dests.map(d=>d.city))];
  const ds=travCity==='全部'?S.dests:S.dests.filter(d=>d.city===travCity);
  $('travel-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">携宠旅游</b><button class="btn btn-sm" style="margin-left:auto;display:flex;align-items:center;gap:4px" onclick="tabTo(\'ai\');openChat(\'trip\',\'周末带'+curPet().name+'两日游怎么安排？\')"><svg class="icon icon-s"><use href="#i-spark"/></svg>AI 行程</button></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none">'+cities.map(c=>'<button class="rTab'+(c===travCity?' act':'')+'" onclick="travCity=\''+c+'\';renderTravel()">'+c+'</button>').join('')+'</div>'+
  ds.map(d=>'<div class="card chov" style="overflow:hidden;margin-bottom:12px;cursor:pointer" onclick="destSheet(\''+d.id+'\')"><div style="position:relative;height:140px"><img src="'+d.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="chip" style="position:absolute;top:10px;left:10px;background:rgba(255,255,255,.85);color:var(--blue-d)">'+d.city+' · '+d.scene+'</span><span style="position:absolute;top:10px;right:10px;cursor:pointer" onclick="event.stopPropagation();favDest(\''+d.id+'\')"><svg class="icon" style="color:'+(S.myFavs['d_'+d.id]?'#E8A23A':'rgba(255,255,255,.85)')+'"><use href="#i-star"/></svg></span></div><div style="padding:11px 14px 13px"><div style="font-size:14px;font-weight:800">'+d.name+'</div><div style="display:flex;gap:6px;margin-top:7px;flex-wrap:wrap">'+d.tags.map(t=>'<span class="chip" style="font-size:10px">'+t+'</span>').join('')+'</div></div></div>').join('');
}
function favDest(id){
  if(S.myFavs['d_'+id])delete S.myFavs['d_'+id];else S.myFavs['d_'+id]=1;
  save();renderTravel();
  toast(S.myFavs['d_'+id]?'已收藏，可在「我的-收藏-目的地」查看':'已取消收藏');
}
function destSheet(id){
  const d=S.dests.find(x=>x.id===id);
  openSheet(d.name,
  '<div style="height:150px;border-radius:16px;overflow:hidden;margin-bottom:12px"><img src="'+d.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
  '<div style="display:flex;gap:6px;margin-bottom:10px">'+d.tags.map(t=>'<span class="chip" style="font-size:10.5px">'+t+'</span>').join('')+'<span class="chip" style="background:rgba(76,168,118,.13);color:#3A9C6B;font-size:10.5px">'+d.pet+'</span></div>'+
  '<div style="font-size:12.5px;color:#555;line-height:1.7;margin-bottom:14px">'+d.txt+'</div>'+
  '<div class="card" style="padding:11px 13px;font-size:11.5px;color:var(--sub);margin-bottom:14px;line-height:1.7">【携宠清单】便携水碗 · 常用药 · 疫苗本（当前宠物：'+curPet().name+'，疫苗在有效期内）· 应急联系卡 · 拾便袋</div>'+
  '<div style="display:flex;gap:8px"><button class="btn btn-sm" style="flex:1" onclick="closeSheet();tabTo(\'ai\');openChat(\'trip\',\'帮我规划'+d.city+'两日携宠行程\')">AI 规划行程</button><button class="btn btn-sm btn-ghost" style="flex:1" onclick="closeSheet();toast(\'清单已保存到收藏\')">收藏清单</button></div>');
}
