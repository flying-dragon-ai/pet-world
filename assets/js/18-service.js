/* ============ V1.7.1 服务菜单（M-menu） ============ */
function renderMenu(){
  const items=[
    ['上门宠护','喂猫喂狗 · 遛狗代步','i-bowl','#3AB5C0',"go('care')"],
    ['人宠世界','虚拟挂机 · 上学打工','i-paw','#8B5CF6',"openWorld()"],
    ['活动组局','遛宠聚会 · 赛事市集','i-cal','#F05B5B',"go('act')"],
    ['携宠旅游','友好目的地攻略','i-pin','#8B7DE8',"go('travel')"],
    ['宠物商城','精选好物 · AI导购','i-cart','#E8945A',"go('mall')"],
    ['流浪救助','救助家园 · 领养到家','i-heart','#4CA876',"go('rescue')"]
  ];
  $('menu-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">服务菜单</b><span style="margin-left:auto;font-size:11px;color:var(--sub)">全部养宠服务入口</span></div>'+
  '<div class="card" style="padding:16px 15px;margin-bottom:12px;background:linear-gradient(135deg,rgba(95,150,235,.2),rgba(139,125,232,.12))"><div style="display:flex;align-items:center;gap:10px"><div style="width:42px;height:42px;border-radius:14px;background:rgba(74,144,217,.16);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="color:var(--blue-d)"><use href="#i-paw"/></svg></div><div><b style="font-size:14px">一站式养宠服务</b><div style="font-size:10.5px;color:var(--sub);margin-top:2px">商城 · 娱乐 · 出行 · 到家服务 · 公益救助</div></div></div></div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">'+items.map(it=>
    '<div class="card chov" style="position:relative;padding:16px 14px;cursor:pointer" onclick="'+it[4]+'">'+
    '<div style="width:42px;height:42px;border-radius:14px;background:'+it[3]+'1c;display:flex;align-items:center;justify-content:center;margin-bottom:10px"><svg class="icon" style="color:'+it[3]+'"><use href="#'+it[2]+'"/></svg></div>'+
    '<div style="font-size:13.5px;font-weight:800">'+it[0]+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:3px">'+it[1]+'</div>'+
    '<svg class="icon icon-s" style="position:absolute;top:14px;right:12px;color:#C9D2DD"><use href="#i-right"/></svg></div>').join('')+'</div>'+
  '<div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:12px">更多服务持续上线 · 有需要可在「我的-帮助与反馈」告诉我们</div>';
}
/* ============ V1.7.1 上门宠护（M-care：喂猫喂狗遛狗 · 派单接单） ============ */
let careCat='全部';
function renderCare(){
  const cats=['全部','喂猫','喂狗','遛狗'];
  const pros=(S.carePros||[]).filter(pr=>careCat==='全部'||pr.tags.includes(careCat));
  const pend=(S.careOrders||[]).filter(o=>o.status!=='已完成').length;
  $('care-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'menu\')"><use href="#i-back"/></svg><b style="font-size:15px">上门宠护</b><span style="margin-left:auto;display:flex;gap:10px"><span style="font-size:11px;color:var(--blue-d);font-weight:700;cursor:pointer" onclick="myCareOrders()">我的服务单'+(pend?'·'+pend:'')+'</span><span style="font-size:11px;color:#E8945A;font-weight:700;cursor:pointer" onclick="careGrabSheet()">接单大厅</span></span></div>'+
  '<div class="card" style="display:flex;align-items:center;gap:8px;padding:10px 13px;margin-bottom:10px"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-pin"/></svg><span style="flex:1;font-size:12px;font-weight:600">IP定位：北京 · 12 位认证服务者在线</span><button class="btn btn-sm btn-ghost" style="padding:5px 11px" onclick="toast(\'演示：城市切换即将上线\')">切换城市</button></div>'+
  '<div class="card" style="padding:11px 13px;margin-bottom:10px;font-size:11px;color:var(--sub);line-height:1.7">服务流程：<b style="color:var(--ink)">下单预约 → 服务者接单 → 上门服务 → 验收评价</b>；服务者均通过实名认证并缴纳保证金，服务全程可查看保险说明。</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none">'+cats.map(c=>'<button class="rTab'+(c===careCat?' act':'')+'" onclick="careCat=\''+c+'\';renderCare()">'+c+'</button>').join('')+'</div>'+
  (pros.length?pros.map(pr=>
    '<div class="card chov" style="padding:13px 15px;margin-bottom:11px">'+
    '<div style="display:flex;gap:11px;align-items:flex-start">'+
    '<div style="width:48px;height:48px;border-radius:16px;overflow:hidden;flex:none"><img src="'+pr.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
    '<div style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:6px"><b style="font-size:13.5px">'+esc(pr.name)+'</b>'+(pr.on?'<span class="chip" style="font-size:9px;background:rgba(59,183,134,.13);color:#3A9C6F">可接单</span>':'<span class="chip" style="font-size:9px;background:rgba(0,0,0,.06);color:#8A99AB">忙碌中</span>')+'</div>'+
    '<div style="font-size:10.5px;color:var(--sub);margin-top:3px">★ '+pr.score+' · 已接单 '+pr.orders+' 次 · '+pr.dist+'</div>'+
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">'+pr.tags.map(t=>'<span class="chip" style="font-size:9.5px">'+t+'</span>').join('')+'</div></div>'+
    '<div style="flex:none;text-align:right"><div style="color:var(--danger);font-weight:900;font-size:14px">¥'+pr.price+'<span style="font-size:9px;color:var(--sub);font-weight:400">/次</span></div><button class="btn btn-sm" style="width:auto;padding:6px 13px;margin-top:7px" onclick="careBook(\''+pr.id+'\')">预约</button></div>'+
    '</div></div>').join(''):'<div class="card" style="padding:30px;text-align:center;color:var(--sub);font-size:12.5px">该服务暂无在线服务者，换个分类看看</div>')+
  '<div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:6px">上门宠护 · 派单接单演示环境 · 实际下单请以正式版为准</div>';
}
function careBook(id){
  const pr=(S.carePros||[]).find(x=>x.id===id);if(!pr)return;
  window._cbTag=pr.tags[0];window._cbTime='今天 18:00';
  openSheet('预约 · '+esc(pr.name),
  '<div style="display:flex;gap:11px;align-items:center;margin-bottom:12px"><div style="width:52px;height:52px;border-radius:18px;overflow:hidden;flex:none"><img src="'+pr.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1"><b style="font-size:13.5px">'+esc(pr.name)+'</b><div style="font-size:10.5px;color:var(--sub);margin-top:2px">★ '+pr.score+' · 已接单 '+pr.orders+' 次 · '+pr.dist+'</div></div><span class="chip" style="flex:none">'+(pr.on?'可接单':'忙碌中')+'</span></div>'+
  '<div style="font-size:12.5px;color:#555;line-height:1.7;margin-bottom:12px">'+esc(pr.desc)+'</div>'+
  '<div style="font-weight:800;font-size:12.5px;margin-bottom:6px">服务项目</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+pr.tags.map(t=>'<button class="skuBtn cbt'+(t===window._cbTag?' act':'')+'" onclick="document.querySelectorAll(\'.cbt\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');window._cbTag=\''+t+'\'">'+t+'</button>').join('')+'</div>'+
  '<div style="font-weight:800;font-size:12.5px;margin-bottom:6px">上门时间</div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+['今天 18:00','今天 20:00','明天 10:00','明天 16:00'].map(t=>'<button class="skuBtn cbt2'+(t===window._cbTime?' act':'')+'" onclick="document.querySelectorAll(\'.cbt2\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');window._cbTime=\''+t+'\'">'+t+'</button>').join('')+'</div>'+
  '<input class="input" id="cbAddr" value="北京市朝阳区 幸福家园 3-2-501" style="margin-bottom:8px" placeholder="上门地址（必填）">'+
  '<input class="input" id="cbNote" placeholder="备注：宠物性格/喂食要求/门禁方式（选填）" style="margin-bottom:12px">'+
  '<div style="display:flex;justify-content:space-between;font-size:13px;font-weight:900;margin-bottom:12px"><span>预计费用</span><span style="color:var(--danger)">¥'+pr.price+' / 次</span></div>'+
  '<button class="btn" onclick="careSubmit(\''+pr.id+'\')">提交预约</button>'+
  '<div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:8px">提交后由服务者确认接单，可随时在「我的服务单」跟进</div>');
}
function careSubmit(id){
  const pr=(S.carePros||[]).find(x=>x.id===id);if(!pr)return;
  const addr=($('cbAddr')&&$('cbAddr').value.trim())||'';
  if(!addr){toast('请填写上门地址');return}
  const o={id:uid(),pro:pr.name,img:pr.img,tag:window._cbTag,time:window._cbTime,addr:addr,note:($('cbNote')&&$('cbNote').value.trim())||'',price:pr.price,status:'待接单',ts:Date.now()};
  S.careOrders.unshift(o);save();closeSheet();renderCare();
  toast('预约成功，等待 '+pr.name+' 接单');
  setTimeout(()=>{
    const oo=(S.careOrders||[]).find(x=>x.id===o.id);
    if(oo&&oo.status==='待接单'){oo.status='已接单';save();if($('pg-care').classList.contains('on'))renderCare();toast('「'+oo.pro+'」已接单，将按时上门服务')}
  },2500);
}
function myCareOrders(){
  const list=S.careOrders||[];
  const stc={'待接单':['rgba(245,166,35,.15)','#C77E12'],'已接单':['rgba(91,141,239,.14)','#3A7BD5'],'服务中':['rgba(139,125,232,.14)','#7A68D8'],'已完成':['rgba(59,183,134,.14)','#2E9C6F'],'已取消':['rgba(0,0,0,.05)','#8A99AB']};
  openSheet('我的服务单',
  (list.length?list.map(o=>{
    const c=stc[o.status]||stc['已取消'];
    let act='';
    if(o.status==='待接单')act='<button class="btn btn-sm btn-ghost" style="width:auto;padding:6px 12px;color:#F05B5B" onclick="careCancel(\''+o.id+'\')">取消预约</button>';
    else if(o.status==='已接单')act='<button class="btn btn-sm" style="width:auto;padding:6px 12px" onclick="careServe(\''+o.id+'\')">模拟上门服务</button>';
    else if(o.status==='服务中')act='<button class="btn btn-sm" style="width:auto;padding:6px 12px" onclick="careDone(\''+o.id+'\')">确认完成+评价</button>';
    return '<div class="card" style="padding:12px 14px;margin-bottom:9px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:12.5px">'+esc(o.pro)+' · '+o.tag+'</b><span class="ordbadge" style="background:'+c[0]+';color:'+c[1]+'">'+o.status+'</span></div>'+
    '<div style="font-size:11px;color:var(--sub);line-height:1.7">时间：'+o.time+'<br>地址：'+esc(o.addr)+(o.note?'<br>备注：'+esc(o.note):'')+'</div>'+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span style="color:var(--danger);font-weight:900;font-size:13px">¥'+o.price+'</span>'+act+'</div></div>';
  }).join(''):'<div style="text-align:center;color:var(--sub);font-size:12.5px;padding:30px 0">暂无服务单，去预约一次上门宠护吧</div>'));
}
function careCancel(id){
  confirmDlg('取消预约','取消后服务者将收到通知，预约金原路退回（演示）','确认取消',()=>{
    const o=(S.careOrders||[]).find(x=>x.id===id);if(o)o.status='已取消';save();myCareOrders();renderCare();toast('已取消预约');
  });
}
function careServe(id){
  const o=(S.careOrders||[]).find(x=>x.id===id);if(!o)return;
  o.status='服务中';save();myCareOrders();toast('服务者已上门，服务进行中（演示）');
}
function careDone(id){
  const o=(S.careOrders||[]).find(x=>x.id===id);if(!o)return;
  confirmDlg('确认完成','确认服务已完成？提交后将进行五星好评（演示）','确认完成',()=>{
    o.status='已完成';save();myCareOrders();renderCare();addPts(10,'上门宠护-完成服务单');toast('服务已完成，+10积分，感谢你的评价');
  });
}
function careGrabSheet(){
  const gigs=S.careGigs||[];
  openSheet('接单大厅（服务者视角）',
  '<div style="font-size:11px;color:var(--sub);margin-bottom:10px;line-height:1.7">申请成为服务者后可在此抢单：平台按距离/评分派单，服务者确认接单后需按时上门；服务完成雇主验收后结算。</div>'+
  '<button class="btn btn-sm btn-ghost" style="width:100%;margin-bottom:12px" onclick="toast(\'资质提交成功，认证审核中（演示）\')">申请成为服务者（实名+保证金）</button>'+
  (gigs.length?gigs.map(g=>'<div class="card" style="padding:12px 14px;margin-bottom:9px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><b style="font-size:12.5px">'+esc(g.who)+' · '+g.tag+'</b><span style="color:var(--danger);font-weight:900">¥'+g.price+'</span></div><div style="font-size:11px;color:var(--sub);line-height:1.6">'+g.time+' · '+esc(g.addr)+' · '+g.dist+'</div><button class="btn btn-sm" style="width:auto;padding:6px 16px;margin-top:8px" onclick="careGrab(\''+g.id+'\')">立即抢单</button></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12.5px;padding:24px 0">暂无可抢订单，稍后再来看看</div>'));
}
function careGrab(id){
  const g=(S.careGigs||[]).find(x=>x.id===id);if(!g)return;
  confirmDlg('确认抢单','「'+esc(g.who)+'」的'+g.tag+'服务\n时间：'+g.time+'\n地点：'+g.addr+'\n佣金 ¥'+g.price+'（平台抽成10%）','确认抢单',()=>{
    S.careGigs=(S.careGigs||[]).filter(x=>x.id!==id);save();closeSheet();careGrabSheet();toast('抢单成功！请尽快联系雇主确认上门细节');
  });
}
/* ============ V1.7.1 流浪救助（M-rescue：救助动态 + 领养专区） ============ */
let rescueTab='rescue';
function renderRescue(){
  const tabs=[['rescue','救助动态'],['adopt','领养专区']];
  let body='';
  if(rescueTab==='rescue'){
    const list=S.rescues||[];
    body='<div class="card" style="padding:11px 13px;margin-bottom:12px;font-size:11px;color:var(--sub);line-height:1.7">救助流程：<b style="color:var(--ink)">上报线索 → 志愿者就近响应 → 救助站收容治疗 → 康复后开放领养</b>；本月社区已协同救助 <b style="color:var(--ink)">26</b> 只流浪动物。</div>'+
    (list.length?list.map(r=>{
      const c={'待救助':['rgba(240,91,91,.12)','#F05B5B'],'救助中':['rgba(245,166,35,.15)','#C77E12'],'已获救':['rgba(59,183,134,.14)','#2E9C6F']}[r.status]||['rgba(0,0,0,.06)','#8A99AB'];
      return '<div class="card chov" style="overflow:hidden;margin-bottom:12px;cursor:pointer" onclick="openRescue(\''+r.id+'\')">'+
      '<div style="position:relative;height:130px"><img src="'+r.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="chip" style="position:absolute;top:10px;left:10px;background:'+c[0]+';color:'+c[1]+'">'+r.status+'</span></div>'+
      '<div style="padding:11px 14px 13px"><div style="font-size:13.5px;font-weight:800">'+esc(r.title)+'</div>'+
      '<div style="font-size:10.5px;color:var(--sub);margin-top:5px;display:flex;gap:10px;flex-wrap:wrap"><span style="display:flex;align-items:center;gap:3px"><svg class="icon icon-s"><use href="#i-pin"/></svg>'+esc(r.addr)+'</span><span>IP属地：'+esc(r.ip)+'</span><span>'+fmtTs(r.ts)+'</span></div></div></div>';
    }).join(''):'<div class="card" style="padding:30px;text-align:center;color:var(--sub);font-size:12.5px">暂无救助动态</div>');
  }else{
    const list=S.adopts||[];
    body='<div class="card" style="padding:11px 13px;margin-bottom:12px;font-size:11px;color:var(--sub);line-height:1.7">领养须知：<b style="color:var(--ink)">年满18周岁 · 科学喂养 · 不散养 · 接受回访</b>；领养代替购买，拒绝冲动领养。</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">'+(list.length?list.map(a=>
      '<div class="card chov" style="overflow:hidden;cursor:pointer;position:relative" onclick="openAdopt(\''+a.id+'\')">'+
      '<div style="position:relative;height:110px"><img src="'+a.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="chip" style="position:absolute;top:8px;left:8px;background:rgba(255,255,255,.9);color:'+(a.status==='待领养'?'var(--blue-d)':'#C77E12')+'">'+a.status+'</span></div>'+
      '<div style="padding:9px 11px 11px"><div style="font-size:13px;font-weight:800">'+esc(a.name)+' <span style="font-size:9px;color:var(--sub);font-weight:400">'+a.gender+'</span></div><div style="font-size:10px;color:var(--sub);margin-top:2px">'+esc(a.breed)+' · '+a.age+'</div><div style="font-size:9.5px;color:#3A9C6F;margin-top:4px">'+esc(a.vac)+'</div></div></div>').join(''):'<div class="card" style="grid-column:1/-1;padding:30px;text-align:center;color:var(--sub);font-size:12.5px">暂无可领养毛孩子</div>')+'</div>';
  }
  $('rescue-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'menu\')"><use href="#i-back"/></svg><b style="font-size:15px">流浪救助</b><span style="margin-left:auto;font-size:11px;color:var(--blue-d);font-weight:700;cursor:pointer" onclick="rescueReport()">上报流浪动物</span></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:12px">'+tabs.map(t=>'<button class="rTab'+(rescueTab===t[0]?' act':'')+'" style="flex:1" onclick="rescueTab=\''+t[0]+'\';renderRescue()">'+t[1]+'</button>').join('')+'</div>'+
  body;
}
function openRescue(id){
  const r=(S.rescues||[]).find(x=>x.id===id);if(!r)return;
  const c={'待救助':['rgba(240,91,91,.12)','#F05B5B'],'救助中':['rgba(245,166,35,.15)','#C77E12'],'已获救':['rgba(59,183,134,.14)','#2E9C6F']}[r.status]||['rgba(0,0,0,.06)','#8A99AB'];
  openSheet('救助详情',
  '<div style="height:150px;border-radius:16px;overflow:hidden;margin-bottom:12px;position:relative"><img src="'+r.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="chip" style="position:absolute;top:10px;left:10px;background:'+c[0]+';color:'+c[1]+'">'+r.status+'</span></div>'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:6px">'+esc(r.title)+'</div>'+
  '<div style="font-size:10.5px;color:var(--sub);margin-bottom:10px">'+esc(r.addr)+' · IP属地：'+esc(r.ip)+' · '+fmtTs(r.ts)+'</div>'+
  '<div style="font-size:12.5px;color:#555;line-height:1.7;margin-bottom:14px">'+esc(r.desc)+'</div>'+
  (r.status==='待救助'?'<button class="btn" onclick="joinRescue(\''+r.id+'\')">参与救助（就近响应）</button><div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:8px">提交后救助站将在2小时内与你联系</div>':
   r.status==='救助中'?'<button class="btn btn-ghost" onclick="toast(\'救助进展：已由志愿者接管，将在24小时内更新动态\')">查看救助进展</button>':
   '<button class="btn" onclick="rescueTab=\'adopt\';closeSheet();renderRescue()">它已获救 · 去领养专区看看</button>'));
}
function joinRescue(id){
  const r=(S.rescues||[]).find(x=>x.id===id);if(!r)return;
  confirmDlg('参与救助','你将作为第一响应人协助「'+esc(r.title)+'」的救助，救助站将同步跟进治疗与安置。','我愿意参与',()=>{
    r.status='救助中';save();closeSheet();renderRescue();addPts(15,'流浪救助-参与救助');toast('感谢你的爱心！+15积分，救助站将尽快响应');
  });
}
function rescueReport(){
  window._rType='流浪猫';
  openSheet('上报流浪动物',
  '<div style="font-weight:800;font-size:12.5px;margin-bottom:6px">动物类型</div><div style="display:flex;gap:8px;margin-bottom:12px">'+['流浪猫','流浪狗'].map(t=>'<button class="skuBtn rt'+(t==='流浪猫'?' act':'')+'" style="flex:1" onclick="document.querySelectorAll(\'.rt\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');window._rType=\''+t+'\'">'+t+'</button>').join('')+'</div>'+
  '<input class="input" id="rpAddr" placeholder="发现位置（如 朝阳·十里堡地铁口B口）" style="margin-bottom:8px">'+
  '<textarea class="input" id="rpDesc" rows="3" placeholder="情况描述：毛色/体型/伤情/性格等（必填）" style="margin-bottom:12px;resize:none"></textarea>'+
  '<button class="btn" onclick="submitReport()">提交上报</button>'+
  '<div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:8px">提交后将同步至社区救助动态，并通知就近救助站</div>');
}
function submitReport(){
  const addr=($('rpAddr')&&$('rpAddr').value.trim())||'';
  const desc=($('rpDesc')&&$('rpDesc').value.trim())||'';
  if(!addr||!desc){toast('请填写发现位置与情况描述');return}
  S.rescues.unshift({id:uid(),title:window._rType+'待救助 · '+addr.split('·').pop().trim(),img:'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop',addr:addr,status:'待救助',desc:desc,ts:Date.now(),ip:S.user.ip||'北京'});
  save();closeSheet();rescueTab='rescue';renderRescue();addPts(5,'流浪救助-上报线索');
  toast('上报成功，+5积分！已通知就近救助站');
}
function openAdopt(id){
  const a=(S.adopts||[]).find(x=>x.id===id);if(!a)return;
  openSheet('领养 · '+esc(a.name),
  '<div style="height:150px;border-radius:16px;overflow:hidden;margin-bottom:12px"><img src="'+a.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
  '<div style="font-size:15px;font-weight:900;margin-bottom:6px">'+esc(a.name)+' <span class="chip" style="font-size:9.5px">'+a.gender+'</span><span class="chip" style="font-size:9.5px;background:rgba(59,183,134,.13);color:#3A9C6F">'+a.status+'</span></div>'+
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"><span class="chip" style="font-size:10px">'+esc(a.breed)+'</span><span class="chip" style="font-size:10px">'+a.age+'</span><span class="chip" style="font-size:10px;background:rgba(59,183,134,.13);color:#3A9C6F">'+esc(a.vac)+'</span></div>'+
  '<div style="font-size:12.5px;color:#555;line-height:1.7;margin-bottom:10px">'+esc(a.desc)+'</div>'+
  '<div class="card" style="padding:10px 12px;font-size:11px;color:var(--sub);line-height:1.7;margin-bottom:14px"><b style="color:var(--ink)">领养要求</b>：'+esc(a.req)+'</div>'+
  (a.status==='待领养'?'<button class="btn" onclick="applyAdopt(\''+a.id+'\')">申请领养</button><div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:8px">提交后救助站将在48小时内电话回访</div>':'<button class="btn btn-ghost" disabled>审核中，请耐心等待</button>'));
}
function applyAdopt(id){
  const a=(S.adopts||[]).find(x=>x.id===id);if(!a)return;
  confirmDlg('领养承诺','我承诺：科学喂养、不散养、不遗弃，配合救助站的回访与家访。','我承诺并提交申请',()=>{
    a.status='审核中';save();closeSheet();renderRescue();addPts(10,'流浪救助-申请领养');
    toast('申请已提交！+10积分，救助站将在48小时内电话回访');
  });
}
