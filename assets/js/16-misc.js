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
  if(t==='profile'){profTab=(m.link[1]==='vaccine')?'health':'family';recType='vaccine';renderProfile();go('profile');toast('深链直达：档案提醒管理页并展开该条提醒')}
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
/* ============ 活动组局（M6，V1.5新增，对标“粗门”） ============ */
let actCat='全部',actCity='全部';
function renderAct(){
  const cats=['全部','宠物活动','宠物比赛','宠物市集'];
  const cities=['全部',...new Set(S.acts.map(a=>a.city.split('·')[0]))];
  const list=S.acts.filter(a=>(actCat==='全部'||a.type===actCat)&&(actCity==='全部'||a.city.startsWith(actCity)));
  $('act-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">活动组局</b><span style="margin-left:auto;font-size:11px;color:var(--blue-d);cursor:pointer;font-weight:700" onclick="hostEntry()">'+(S.hostApplied?'＋发布活动':'主理人入驻')+'</span></div>'+
  '<div class="card" style="display:flex;align-items:center;gap:8px;padding:10px 13px;margin-bottom:10px"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-pin"/></svg><span style="flex:1;font-size:12px;font-weight:600">IP定位：北京 · 已为你推荐同城活动</span><button class="btn btn-sm btn-ghost" style="padding:5px 11px" onclick="actCitySheet()">手选城市</button></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:10px;overflow-x:auto;scrollbar-width:none">'+cities.map(c=>'<button class="rTab'+(c===actCity?' act':'')+'" onclick="actCity=\''+c+'\';renderAct()">'+c+'</button>').join('')+'</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none">'+cats.map(c=>'<button class="rTab'+(c===actCat?' act':'')+'" onclick="actCat=\''+c+'\';renderAct()">'+c+'</button>').join('')+'</div>'+
  (list.length?list.map(a=>
   '<div class="card chov record-item" style="overflow:hidden;margin-bottom:12px;cursor:pointer" onclick="actDetail(\''+a.id+'\')">'+
   '<div style="position:relative;height:130px"><img src="'+a.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="chip" style="position:absolute;top:10px;left:10px;background:rgba(255,255,255,.9);color:var(--blue-d)">'+a.type+' · '+a.cat+'</span><span class="chip" style="position:absolute;top:10px;right:10px;background:'+(a.fee==='免费'?'rgba(59,183,134,.92)':'rgba(240,91,91,.92)')+';color:#fff">'+a.fee+'</span></div>'+
   '<div style="padding:11px 14px 13px"><div style="font-size:14px;font-weight:800">'+esc(a.title)+'</div>'+
   '<div style="display:flex;gap:12px;margin-top:7px;font-size:10.5px;color:var(--sub);flex-wrap:wrap"><span style="display:flex;align-items:center;gap:3px"><svg class="icon icon-s"><use href="#i-cal"/></svg>'+a.time+'</span><span style="display:flex;align-items:center;gap:3px"><svg class="icon icon-s"><use href="#i-pin"/></svg>'+a.city+'</span></div>'+
   '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span style="font-size:10.5px;color:var(--sub)">主理人 '+esc(a.host)+(a.hostCert?' <span class="chip" style="font-size:8.5px;padding:1px 6px;background:rgba(217,160,60,.15);color:#C77E12">已认证</span>':'')+'</span><span style="font-size:10.5px;color:var(--blue-d);font-weight:700">'+a.joined+' 人已报名</span></div></div></div>'
  ).join(''):'<div class="card" style="padding:34px;text-align:center;color:var(--sub);font-size:13px">该城市暂无此类活动，换个分类或城市看看</div>')+
  '<div class="card" style="padding:12px 14px;margin-bottom:10px;font-size:11px;color:var(--sub);line-height:1.7">📎 携宠旅游攻略在「<span style="color:var(--blue-d);cursor:pointer" onclick="go(\'travel\')">携宠旅游</span>」 · 宠物比赛完赛后可为宠物录入成绩并领取电子奖状</div>';
}
function actCitySheet(){
  const cities=[...new Set(S.acts.map(a=>a.city.split('·')[0]))].concat(['广州','深圳','杭州','三亚','大理']);
  openSheet('手选城市',[...new Set(cities)].map(c=>'<button class="rTab'+(c===actCity?' act':'')+'" style="margin:0 8px 10px 0" onclick="actCity=\''+c+'\';closeSheet();renderAct()">'+c+'</button>').join(''));
}
function actDetail(id){
  const a=S.acts.find(x=>x.id===id);if(!a)return;
  window._actId=id;
  openSheet(a.title,
  '<div style="height:150px;border-radius:16px;overflow:hidden;margin-bottom:12px;position:relative"><img src="'+a.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="chip" style="position:absolute;top:10px;left:10px;background:rgba(255,255,255,.9);color:var(--blue-d)">'+a.type+' · '+a.cat+'</span></div>'+
  '<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px;font-size:12px">'+
    [['时间',a.time,'i-cal'],['地点',a.city+' · '+a.addr,'i-pin'],['费用',a.fee,'i-coin'],['主理人',a.host+(a.hostCert?'（已认证主理人）':''),'i-user']].map(r=>'<div style="display:flex;align-items:center;gap:8px"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#'+r[2]+'"/></svg><span style="color:var(--sub);flex:none">'+r[0]+'</span><b>'+r[1]+'</b></div>').join('')+
  '</div>'+
  '<div style="font-size:12.5px;color:#555;line-height:1.7;margin-bottom:12px">'+esc(a.desc)+'</div>'+
  (a.prize?'<div class="card" style="padding:9px 12px;font-size:11.5px;margin-bottom:12px;background:rgba(217,160,60,.08);border-color:rgba(217,160,60,.3)">🏆 奖励：'+a.prize+'</div>':'')+
  '<div style="font-size:11px;color:var(--sub);margin-bottom:12px">已报名 '+a.joined+' / '+(a.cap>100?'不限':a.cap)+' 人 · 报名后主理人会拉群发布集合信息</div>'+
  '<div style="display:flex;gap:8px">'+
   (a.type==='宠物比赛'?'<button class="btn btn-ghost btn-sm" style="flex:1" onclick="openCertDemo()">赛后奖状演示</button><button class="btn btn-sm" style="flex:1" onclick="actJoin()">报名参赛</button>':
    a.type==='宠物市集'?(a.cat==='领养信息'?'<button class="btn btn-sm" style="flex:1" onclick="closeSheet();toast(\'已预约到访，请携带身份证件（演示）\')">预约到访</button>':'<button class="btn btn-sm" style="flex:1" onclick="boothApply()">'+(a.cat==='摊位报名'?'申请摊位':'参与互换')+'</button>'):
    '<button class="btn btn-sm" style="flex:1" onclick="actJoin()">立即报名</button>')+
  '</div>');
}
function actJoin(){
  const a=S.acts.find(x=>x.id===window._actId);if(!a)return;
  confirmDlg('报名确认','「'+esc(a.title)+'」\n时间：'+a.time+'\n地点：'+a.city+' · '+a.addr,'确认报名',()=>{
    a.joined++;save();closeSheet();renderAct();toast('报名成功！主理人将拉群通知集合信息');
  });
}
function boothApply(){
  const a=S.acts.find(x=>x.id===window._actId);if(!a)return;
  confirmDlg('提交申请',a.cat==='摊位报名'?'摊位费用 '+a.fee+'，申请后主理人将审核并联系你安排位置':'参与免费，请按时到场并遵守互换规则','提交申请',()=>{
    a.joined++;save();closeSheet();renderAct();toast('申请已提交，等待主理人审核');
  });
}
function openCertDemo(){
  const a=S.acts.find(x=>x.id===window._actId);if(!a)return;
  const p=curPet();
  openSheet('赛后成绩 · 电子奖状',
  '<div style="font-size:11.5px;color:var(--sub);margin-bottom:10px">比赛结束后可为宠物录入成绩，自动生成专属电子奖状（演示以「'+p.name+'」为例）</div>'+
  '<div style="font-size:12px;font-weight:700;margin-bottom:6px">名次</div><div style="display:flex;gap:8px;margin-bottom:10px">'+['冠军','亚军','季军','优胜奖'].map((r,i)=>'<button class="skuBtn cr'+(i===1?' act':'')+'" style="flex:1" onclick="document.querySelectorAll(\'.cr\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\')">'+r+'</button>').join('')+'</div>'+
  '<input class="input" id="certScore" placeholder="成绩（如 9.2 分 / 25.6秒）" style="margin-bottom:12px" value="9.2 分">'+
  '<button class="btn" onclick="showCert()">生成电子奖状</button>');
}
function showCert(){
  const a=S.acts.find(x=>x.id===window._actId);if(!a)return;
  const p=curPet();
  const rank=(document.querySelector('.cr.act')||{textContent:'优胜奖'}).textContent;
  const score=($('certScore')&&$('certScore').value.trim())||'9.2 分';
  closeSheet();
  openModal('<div style="position:relative;border:3px solid #D9A03C;border-radius:20px;padding:22px 16px;text-align:center;background:linear-gradient(160deg,#FFFBF0,#FFF4DE);overflow:hidden">'+
  '<div style="position:absolute;top:-20px;right:-20px;width:90px;height:90px;border-radius:50%;background:rgba(217,160,60,.12)"></div>'+
  '<div style="font-size:10px;letter-spacing:4px;color:#C77E12;font-weight:800">CERTIFICATE · 电子奖状</div>'+
  '<div style="font-size:32px;margin:6px 0">🏆</div>'+
  '<div style="font-size:18px;font-weight:900">'+p.name+'</div>'+
  '<div style="font-size:12px;color:var(--sub);margin:8px 0 4px">在「'+esc(a.title)+'」中荣获</div>'+
  '<div style="font-size:20px;font-weight:900;color:#C77E12">'+rank+'</div>'+
  '<div style="font-size:11.5px;color:var(--sub);margin-top:8px">成绩：'+esc(score)+' · 主办：'+esc(a.host)+'</div>'+
  '<div style="font-size:10px;color:#B4BDC8;margin-top:12px">宠物数字管家 · '+a.time.split(' ')[0]+'</div>'+
  '</div><button class="btn" style="margin-top:14px" onclick="closeModal();toast(\'奖状已保存至相册\')">保存到相册</button>');
}
function hostEntry(){
  if(!S.hostApplied){
    openModal('<div style="font-weight:900;font-size:15px;margin-bottom:4px">申请主理人身份</div><div style="font-size:11px;color:var(--sub);margin-bottom:12px">认证后可发布活动/比赛/市集招募（审核模拟秒过）</div><input class="input" id="hsNick" value="'+esc(S.user.nick)+'" style="margin-bottom:8px" placeholder="主理人昵称"><input class="input" id="hsPhone" inputmode="numeric" maxlength="11" placeholder="联系电话" style="margin-bottom:8px"><input class="input" id="hsYears" inputmode="numeric" placeholder="养宠年限（年）" style="margin-bottom:14px"><button class="btn" onclick="hostApply()">提交认证</button>');
  } else openHostForm();
}
function hostApply(){
  const ph=$('hsPhone').value.trim(),y=$('hsYears').value.trim();
  if(!/^1[3-9]\d{9}$/.test(ph)){toast('请输入正确的联系电话');return}
  if(!y){toast('请填写养宠年限');return}
  $('modalBox').innerHTML='<div style="text-align:center;padding:12px 0"><div class="spin" style="border-color:rgba(58,123,213,.25);border-top-color:var(--blue-d)"></div><div style="font-size:12.5px;color:var(--sub);margin-top:12px">资质审核中…</div></div>';
  setTimeout(()=>{if(!$('modalWrap').classList.contains('show'))return;S.hostApplied=true;save();closeModal();renderAct();toast('主理人认证通过！现在可以发布活动了')},1100);
}
function openHostForm(){
  window._hostCat='遛宠聚会';
  openSheet('发布活动',
  '<div style="font-size:12px;font-weight:700;margin-bottom:6px">活动类型</div><div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'+['遛宠聚会','宠物野餐','狗狗社交','宠物训练局'].map(c=>'<button class="skuBtn hc'+(c==='遛宠聚会'?' act':'')+'" onclick="document.querySelectorAll(\'.hc\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');window._hostCat=\''+c+'\'">'+c+'</button>').join('')+'</div>'+
  '<input class="input" id="hfTitle" placeholder="活动标题（必填）" style="margin-bottom:8px"><input class="input" id="hfTime" placeholder="时间（如 11-20 周六 09:00）" style="margin-bottom:8px"><input class="input" id="hfAddr" placeholder="地点（城市·区域 详细地址）" style="margin-bottom:8px"><textarea class="input" id="hfDesc" rows="3" placeholder="活动说明（内容/要求/注意事项）" style="margin-bottom:12px;resize:none"></textarea>'+
  '<button class="btn" onclick="hostPublish()">发布（先审后发，≤5s）</button>');
}
function hostPublish(){
  const t=$('hfTitle').value.trim(),tm=$('hfTime').value.trim(),ad=$('hfAddr').value.trim();
  if(!t||!tm||!ad){toast('请完整填写标题、时间与地点');return}
  const city=ad.split(' ')[0].split('·')[0]||'北京';
  S.acts.unshift({id:uid(),type:'宠物活动',cat:window._hostCat||'遛宠聚会',title:t,city:city,addr:ad,time:tm,fee:'免费',joined:1,cap:30,img:'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=400&fit=crop',host:S.user.nick,hostCert:true,desc:($('hfDesc').value.trim()||'详情咨询主理人')});
  save();closeSheet();actCat='宠物活动';renderAct();toast('发布成功，已同步至同城活动列表');
}
/* ============ 积分中心（M11） ============ */
function renderPoints(){
  const wk=['一','二','三','四','五','六','日'];
  const done=S.checkin.last===today();
  $('points-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'me\')"><use href="#i-back"/></svg><b style="font-size:15px">积分中心</b></div>'+
  '<div class="card" style="padding:18px 16px;margin-bottom:14px;background:linear-gradient(135deg,rgba(217,160,60,.16),rgba(232,148,90,.1))"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:11px;color:var(--sub)">当前积分</div><div style="font-size:34px;font-weight:900;color:#C77E12">'+S.points+'</div></div><div style="text-align:right"><div style="font-size:11px;color:var(--sub)">连续签到</div><div style="font-size:20px;font-weight:900;color:#C77E12">'+S.checkin.streak+' 天</div></div></div>'+
  '<div style="display:flex;gap:6px;margin-top:14px">'+wk.map((w,i)=>'<div class="calCell'+(i<S.checkin.streak%7?' done':'')+(i===(new Date().getDay()===0?6:new Date().getDay()-1)&&!done?' today':'')+'"><b>'+(i<S.checkin.streak%7?'+10':'+10')+'</b><span>周'+w+'</span></div>').join('')+'</div>'+
  '<button class="btn" style="margin-top:12px;'+(done?'background:linear-gradient(135deg,#B9C4D2,#9AA9BC);box-shadow:none':'')+'" '+(done?'disabled':'')+' onclick="checkin()">'+(done?'今日已签到':'签到 +10 积分')+'</button></div>'+
  '<div class="card" style="padding:14px 16px;margin-bottom:14px"><b style="font-size:14px">赚积分</b><div style="display:flex;gap:9px;margin-top:10px">'+
  [['每日签到','+10','i-cal'],['健康打卡','+15','i-med'],['社区发帖','+20','i-edit'],['订单返积分','1%返','i-cart']].map(t=>'<div class="card chov" style="flex:1;padding:10px 4px;text-align:center;cursor:pointer" onclick="'+(t[2]==='i-cal'?'checkin()':t[2]==='i-med'?'go(\'health\')':t[2]==='i-edit'?'go(\'publish\')':'go(\'orders\')')+'"><svg class="icon" style="color:#C77E12;margin:auto"><use href="#'+t[2]+'"/></svg><div style="font-size:10.5px;font-weight:700;margin-top:4px">'+t[0]+'</div><div style="font-size:11px;font-weight:800;color:#C77E12">'+t[1]+'</div></div>').join('')+'</div></div>'+
  '<div class="card" style="padding:14px 16px"><b style="font-size:14px">积分明细</b>'+
  S.ptHist.slice(0,15).map(h=>'<div style="display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05)"><div style="width:30px;height:30px;border-radius:10px;background:rgba(217,160,60,.13);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#C77E12"><use href="#i-coin"/></svg></div><div style="flex:1"><div style="font-size:12.5px;font-weight:600">'+h.src+'</div><div style="font-size:10px;color:var(--sub)">'+fmtTs(h.ts)+'</div></div><b style="color:'+(h.n>0?'#3BB786':'#F05B5B')+'">'+(h.n>0?'+':'')+h.n+'</b></div>').join('')+'</div>';
}
function checkin(){
  if(S.checkin.last===today()){toast('今天已签到过啦');return}
  S.checkin.last=today();S.checkin.streak++;
  addPts(10,'每日签到');save();
  if($('pg-points').classList.contains('on'))renderPoints();
  toast('签到成功 +10积分');
}
/* ============ 设置 ============ */
function renderSettings(){
  const row=(t,d,k)=>'<div style="display:flex;align-items:center;gap:11px;padding:13px 2px;border-top:1px solid rgba(0,0,0,.05)"><div style="flex:1"><div style="font-size:13px;font-weight:600">'+t+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:2px">'+d+'</div></div><button class="tog'+(S.set[k]?' on':'')+'" onclick="S.set[\''+k+'\']=!S.set[\''+k+'\'];save();renderSettings();applySet(\''+k+'\')"></button></div>';
  $('settings-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'me\')"><use href="#i-back"/></svg><b style="font-size:15px">设置</b></div>'+
  '<div style="padding:12px 16px">'+
  '<div class="card" style="padding:5px 16px;margin-bottom:14px">'+
  row('推送通知','健康提醒类不可关','push')+
  row('AI 上下文注入','开启后AI回答自动携带宠物档案','context')+
  row('每日一问','AI主页每日一问卡片','dailyQ')+
  row('移动网络视频自动播放','默认关闭，开启后流量提醒一次','autoPlay')+
  row('模拟无网络','演示全局离线态','offline')+
  '</div>'+
  '<div class="card" style="padding:5px 16px;margin-bottom:14px">'+
  '<div style="display:flex;align-items:center;padding:13px 2px;cursor:pointer" onclick="exportData()"><div style="flex:1"><div style="font-size:13px;font-weight:600">导出我的数据</div><div style="font-size:10.5px;color:var(--sub)">导出全部档案/记录/订单JSON备份（保存到本地）</div></div><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-dl"/></svg></div>'+
  '<div style="display:flex;align-items:center;padding:13px 2px;border-top:1px solid rgba(0,0,0,.05);cursor:pointer" onclick="toast(\'缓存 23.6MB，清理不影响云端与本页数据\')"><div style="flex:1"><div style="font-size:13px;font-weight:600">清理缓存</div><div style="font-size:10.5px;color:var(--sub)">当前 23.6MB</div></div><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-right"/></svg></div>'+
  '</div>'+
  '<div class="card" style="padding:5px 16px;margin-bottom:14px">'+
  '<div style="display:flex;align-items:center;padding:13px 2px;cursor:pointer" onclick="acctSheet()"><div style="flex:1"><div style="font-size:13px;font-weight:600">账号与安全</div><div style="font-size:10.5px;color:var(--sub)">退出登录 / 注销账号</div></div><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-right"/></svg></div>'+
  '<div style="display:flex;align-items:center;padding:13px 2px;border-top:1px solid rgba(0,0,0,.05)"><div style="flex:1"><div style="font-size:13px;font-weight:600">关于</div><div style="font-size:10.5px;color:var(--sub)">宠物数字管家 V1.7.0 人宠世界版 · 已是最新</div></div></div>'+
  '</div>'+
  '<button class="btn btn-ghost" style="color:#F05B5B;border-color:rgba(240,91,91,.35)" onclick="confirmDlg(\'重置演示数据\',\'将清空本地所有演示数据并恢复初始预置数据\',\'重置\',()=>{S=seed();save();location.reload()},\'danger\')">重置演示数据</button>'+
  '</div>';
}
function applySet(k){
  if(k==='offline'){$('offlineBan').classList.toggle('show',S.set.offline);renderLiveFab()}
  if(k==='dailyQ'&&$('pg-ai').classList.contains('on'))renderAI();
  if(k==='context')toast(S.set.context?'AI将携带档案上下文':'已切换通用模式');
}
function exportData(){
  const blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='宠物数字管家-数据备份-'+today()+'.json';
  a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),3000);
  toast('数据已导出保存为JSON文件');
}
function acctSheet(){
  openSheet('账号与安全',
  '<div class="card" style="padding:11px 13px;font-size:11.5px;color:var(--sub);margin-bottom:12px;line-height:1.7">当前登录：138****6688 · 单点登录开启 · token 静默续期中</div>'+
  '<button class="btn btn-ghost" style="margin-bottom:10px" onclick="confirmDlg(\'退出登录\',\'退出后需重新验证手机号登录\',\'退出\',()=>{S.loggedIn=false;save();location.reload()})">退出登录</button>'+
  '<button class="btn btn-ghost" style="margin-bottom:10px" onclick="closeSheet();kickDemo()">模拟：其他设备登录</button>'+
  '<button class="btn btn-ghost" style="color:#F05B5B;border-color:rgba(240,91,91,.3)" onclick="cancelAcct()">注销账号（7天冷静期）</button>');
}
function cancelAcct(){
  openModal('<div style="font-size:15px;font-weight:900;margin-bottom:8px">注销账号</div><div style="font-size:12px;color:var(--sub);line-height:1.7;margin-bottom:12px">注销将删除：档案/健康记录/相册/虚拟形象/订单/积分，社区内容将匿名化。进入 <b style="color:var(--ink)">7天冷静期</b>，期间登录即自动取消注销。</div><label style="display:flex;gap:8px;font-size:12px;align-items:center;margin-bottom:14px;cursor:pointer"><input type="checkbox" id="acctOk" style="accent-color:var(--blue-d)">我已了解并确认上述说明</label><button class="btn" onclick="doCancelAcct()">输入验证码二次确认（模拟）</button>');
}
function doCancelAcct(){
  if(!$('acctOk').checked){toast('请先勾选「我已了解」');return}
  closeModal();toast('已提交注销申请：冷静期7天，期间登录将自动取消');
}

/* ============ 删除宠物档案============ */
function delPet(){
  const p=curPet();
  confirmDlg('删除宠物档案','将删除「'+p.name+'」的档案、健康记录、提醒与家园数据，操作不可恢复','确认删除',()=>{
    S.pets=S.pets.filter(x=>x.id!==p.id);
    S.records=S.records.filter(r=>r.pet!==p.id);
    S.reminders=S.reminders.filter(r=>r.pet!==p.id);
    S.daily=S.daily.filter(d=>d.pet!==p.id);
    if(S.pets.length){S.curPet=S.pets[0].id;save();renderProfile();toast('已删除，已自动切换至「'+curPet().name+'」')}
    else{save();window._editPet=null;profTab='health';go('petedit');toast('档案已清空，请新建宠物')}
  },'danger');
}

/* ============ 形象生成向导============ */
const FURS=[['经典橘','#F5B85C'],['奶白','#F1EDE4'],['银灰','#B9BFC9'],['玄黑','#6B6B78'],['奶棕','#C9955C']];
const AW_ACC=[['无',''],['红项圈','collar'],['蝴蝶结','bow'],['小围巾','scarf'],['生日帽','hat']];
const AWSAMPLE=['https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=300&h=300&fit=crop'];
function openAvatarWizard(){window._aw={step:1,img:'',fur:'',acc:'',pat:'',low:false};openModal('');renderAW()}
function renderAW(){
  const a=window._aw,p=curPet();let h='';
  if(a.step===1){
    h='<div style="font-size:16px;font-weight:900;margin-bottom:4px">生成虚拟形象 · 1/4 上传照片</div><div style="font-size:11px;color:var(--sub);margin-bottom:12px">上传后本地预检：清晰度 / 宠物面部占比≥15% / 光照</div>'+
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px">'+AWSAMPLE.map((im,i)=>'<div style="height:70px;border-radius:12px;overflow:hidden;cursor:pointer;'+(a.img===im?'outline:2.5px solid var(--blue-d)':'')+'" onclick="awPick('+i+')"><img src="'+im+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>').join('')+'</div>'+
    '<div style="font-size:10.5px;color:#9AA9BC;margin-bottom:10px;cursor:pointer;text-decoration:underline" onclick="awLow()">模拟：光线过暗的照片（预检不通过演示）</div>'+
    (a.low?'<div class="emg" style="padding:9px 12px;font-size:11.5px;color:#D94343;margin-bottom:10px;border-color:rgba(240,91,91,.35)">光照检测未通过：光线有点暗，找个亮一点的地方再拍一张吧</div>':'')+
    (a.img&&!a.low?'<button class="btn" onclick="awCheck()">开始质量检测</button>':'');
  } else if(a.step===1.5){
    h='<div style="text-align:center;padding:10px 0"><div class="spin" style="border-color:rgba(58,123,213,.25);border-top-color:var(--blue-d)"></div><div style="font-size:12.5px;color:var(--sub);margin-top:12px">正在检测照片质量…</div></div>';
  } else if(a.step===1.7){
    h='<div style="font-size:16px;font-weight:900;margin-bottom:8px">质量检测结果</div>'+
    [['清晰度','✓ 通过'],['面部占比','✓ 32%（≥15%）'],['光照','✓ 通过']].map(r=>'<div style="display:flex;justify-content:space-between;padding:8px 2px;border-bottom:1px solid rgba(0,0,0,.05);font-size:12.5px"><span>'+r[0]+'</span><b style="color:#3BB786">'+r[1]+'</b></div>').join('')+
    '<button class="btn" style="margin-top:14px" onclick="window._aw.step=2;renderAW()">通过，开始生成</button>';
  } else if(a.step===2){
    h='<div style="font-size:16px;font-weight:900;margin-bottom:4px">生成虚拟形象 · 2/4 AI生成</div><div style="text-align:center;padding:8px 0"><div class="spin" style="border-color:rgba(58,123,213,.25);border-top-color:var(--blue-d)"></div><div style="font-size:12.5px;color:var(--sub);margin-top:12px">AI 正在为 '+p.name+' 生成3D虚拟形象<br>（≤15s，演示已加速）</div></div>';
    setTimeout(()=>{if(window._aw.step===2&&$('modalWrap').classList.contains('show')){window._aw.step=3;renderAW()}},1800);
  } else if(a.step===3){
    const prev={...p,fur:a.fur,acc:a.acc};
    h='<div style="font-size:16px;font-weight:900;margin-bottom:6px">生成虚拟形象 · 3/4 六项微调</div>'+
    '<div style="text-align:center;margin-bottom:10px"><div style="width:120px;height:120px;display:inline-block">'+petSVG(prev,120,'happy')+'</div></div>'+
    '<div style="font-size:11px;font-weight:700;margin-bottom:5px">毛色</div><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">'+FURS.map(f=>'<button class="skuBtn'+(a.fur===f[1]?' act':'')+'" style="padding:6px 10px" onclick="awSet(\'fur\',\''+f[1]+'\')">'+f[0]+'</button>').join('')+'</div>'+
    '<div style="font-size:11px;font-weight:700;margin-bottom:5px">配饰</div><div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap">'+AW_ACC.map(x=>'<button class="skuBtn'+(a.acc===x[1]?' act':'')+'" style="padding:6px 10px" onclick="awSet(\'acc\',\''+x[1]+'\')">'+x[0]+'</button>').join('')+'</div>'+
    '<div style="font-size:11px;font-weight:700;margin-bottom:5px">花纹 · 眼型 · 体型（组合记录）</div><div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">'+['纯色·圆眼·标准','斑点·杏眼·偏瘦','条纹·圆眼·圆润'].map(t=>'<button class="skuBtn'+(a.pat===t?' act':'')+'" style="padding:6px 10px" onclick="awSet(\'pat\',\''+t+'\')">'+t+'</button>').join('')+'</div>'+
    '<div style="display:flex;gap:8px"><button class="btn btn-ghost" style="flex:1" onclick="window._aw.step=2;renderAW()">重新生成</button><button class="btn" style="flex:1" onclick="window._aw.step=4;renderAW()">下一步</button></div>';
  } else {
    const prev={...p,fur:a.fur,acc:a.acc};
    h='<div style="font-size:16px;font-weight:900;margin-bottom:6px">生成虚拟形象 · 4/4 定稿</div>'+
    '<div style="text-align:center;margin-bottom:8px"><div style="width:110px;height:110px;display:inline-block">'+petSVG(prev,110,'happy')+'</div></div>'+
    '<div class="card" style="padding:9px 12px;font-size:11px;color:var(--warn);margin-bottom:10px;background:rgba(245,166,35,.1);border-color:rgba(245,166,35,.35)">定稿后模型与配饰不可修改，请确认预览效果</div>'+
    '<div style="display:flex;gap:8px"><button class="btn btn-ghost" style="flex:1" onclick="window._aw.step=3;renderAW()">返回微调</button><button class="btn" style="flex:1" onclick="awDone()">确认并进入家园</button></div>';
  }
  $('modalBox').innerHTML=h;
}
function awPick(i){window._aw.img=AWSAMPLE[i];window._aw.low=false;renderAW()}
function awLow(){window._aw.low=true;renderAW()}
function awCheck(){window._aw.step=1.5;renderAW();setTimeout(()=>{if(window._aw.step===1.5&&$('modalWrap').classList.contains('show')){window._aw.step=1.7;renderAW()}},1000)}
function awSet(k,v){window._aw[k]=v;renderAW()}
function awDone(){
  const a=window._aw,p=curPet();
  p.fur=a.fur||'';p.acc=a.acc||'';p.pat=a.pat||'';
  save();closeModal();
  openWorld();
  toast('形象已定稿，「'+p.name+'」换新形象入驻世界');
}


/* ============ 单点登录顶下线============ */
function kickDemo(){
  openModal('<div style="text-align:center"><svg class="icon icon-l" style="color:var(--warn);margin:auto"><use href="#i-alert"/></svg><div style="font-weight:900;font-size:15px;margin:8px 0">您的账号已在另一台设备登录</div><div style="font-size:12px;color:var(--sub);margin-bottom:14px;line-height:1.7">为保障账号安全，本设备已退出登录状态。<br>重新登录后将自动回跳当前页面并恢复上下文。</div><div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="kickLogout()">退出</button><button class="btn" onclick="kickRelogin()">重新登录</button></div></div>');
}
function kickRelogin(){closeModal();toast('模拟重新登录成功，已回跳原页面并恢复上下文')}
function kickLogout(){closeModal();S.loggedIn=false;save();location.reload()}

/* ============ 设备绑定向导============ */
function bindWizard(){
  openModal('<div style="font-weight:900;font-size:15px;margin-bottom:4px">添加设备</div><div style="font-size:11px;color:var(--sub);margin-bottom:12px">绑定中断（来电/切后台）将保留进度；权限拒绝提供说明页（演示简化）</div><button class="btn btn-sm btn-ghost" style="margin-bottom:12px" onclick="toast(\'已打开扫码（演示），请使用序列号方式\')">扫码绑定（演示）</button><input class="input" id="snIn" placeholder="或输入设备序列号（≥4位，如 882310）" style="margin-bottom:10px"><button class="btn" onclick="bindConnect()">下一步</button>');
}
function bindConnect(){
  const sn=$('snIn').value.trim();
  if(sn.length<4){toast('请输入至少4位序列号');$('snIn').classList.add('shake');setTimeout(()=>$('snIn').classList.remove('shake'),450);return}
  openModal('<div style="text-align:center;padding:10px 0"><div class="spin" style="border-color:rgba(58,123,213,.25);border-top-color:var(--blue-d)"></div><div style="font-size:12.5px;color:var(--sub);margin-top:12px">设备联网中…（配网 2.4G Wi-Fi）</div></div>');
  setTimeout(()=>{
    if(!$('modalWrap').classList.contains('show'))return;
    openModal('<div style="font-weight:900;font-size:15px;margin-bottom:10px">给设备起个名字</div><input class="input" id="devName" value="阳台摄像头" style="margin-bottom:12px"><button class="btn" onclick="bindDone()">完成绑定</button>');
  },1300);
}
function bindDone(){
  const n=$('devName').value.trim()||('摄像头'+((S.devices||[]).length+1));
  if(!S.devices)S.devices=[];
  S.devices.push(n);save();closeModal();
  mon.dev=S.devices.length-1;
  renderMonitor();toast('「'+n+'」绑定成功，已加入设备列表');
}

