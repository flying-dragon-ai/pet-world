/* ============ 删除宠物档案============ */
function delPet(){
  const p=curPet();
  confirmDlg('删除宠物档案','将删除「'+p.name+'」的档案、健康记录、提醒与家园数据，操作不可恢复','确认删除',()=>{
    S.pets=S.pets.filter(x=>x.id!==p.id);
    S.records=S.records.filter(r=>r.pet!==p.id);
    S.reminders=S.reminders.filter(r=>r.pet!==p.id);
    S.daily=S.daily.filter(d=>d.pet!==p.id);
    if(S.pets.length){S.curPet=S.pets[0].id;save();renderProfile();toast('已删除，已自动切换至「'+curPet().name+'」')}
    else{save();window._editPet=null;profTab='album';go('petedit');toast('档案已清空，请新建宠物')}
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
    '<div style="display:flex;gap:8px"><button class="btn btn-ghost" style="flex:1" onclick="window._aw.step=3;renderAW()">返回微调</button><button class="btn" style="flex:1" onclick="awDone()">确认并进入人宠世界</button></div>';
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
  toast('形象已定稿，「'+p.name+'」换新形象入驻人宠世界');
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

