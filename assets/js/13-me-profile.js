/* ============ 我的 ============ */
function renderMe(){
  const ent=[
    ['我的宠物','i-paw','#E8945A','go(\'profile\')'],
    ['我的订单','i-cart','#5B8DEF','go(\'orders\')'],
    ['我的收藏','i-star','#E8A23A','openFavs()'],
    ['活动组局','i-cal','#F05B5B','go(\'act\')'],
    ['玩偶定制','i-gift','#E8709A','openDoll()'],
    ['积分中心','i-coin','#D9A03C','go(\'points\')'],
    ['帮助与反馈','i-msg','#4CA876','openHelp()'],
    ['设置','i-set','#8A99AB','go(\'settings\')']
  ];
  $('me-body').innerHTML=
  '<div class="card chov" style="padding:18px 16px;margin-bottom:14px;display:flex;align-items:center;gap:13px;cursor:pointer" onclick="openUserHome(S.user.nick)"><div style="width:62px;height:62px;border-radius:22px;overflow:hidden;flex:none"><img src="'+S.user.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1"><div style="font-size:17px;font-weight:900">'+esc(S.user.nick)+(S.isGuest?' <span class="chip" style="font-size:9px">游客·数据仅存本机</span>':'')+'</div><div style="font-size:11.5px;color:var(--sub);margin-top:3px">养宠 3 年 · '+S.pets.length+' 只宠物 · 家园 Lv.'+petLevel(curPet())+'</div></div><svg class="icon" style="color:#B9C4D2"><use href="#i-right"/></svg></div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px">'+
  [['积分',S.points,'i-coin','go(\'points\')'],['宠物',S.pets.length,'i-paw','go(\'profile\')'],['订单',S.orders.length,'i-cart','go(\'orders\')']].map(s=>'<div class="card chov" style="padding:13px 6px;text-align:center;cursor:pointer" onclick="'+s[3]+'"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#'+s[2]+'"/></svg><div style="font-size:19px;font-weight:900;margin-top:3px">'+s[1]+'</div><div style="font-size:11px;color:var(--sub)">'+s[0]+'</div></div>').join('')+'</div>'+
  '<div class="card" style="padding:6px 16px">'+ent.map((e,i)=>'<div style="display:flex;align-items:center;gap:11px;padding:13px 2px;cursor:pointer;'+(i?'border-top:1px solid rgba(0,0,0,.05)':'')+'" onclick="'+e[3]+'"><div style="width:34px;height:34px;border-radius:11px;background:'+e[2]+'18;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+e[2]+'"><use href="#'+e[1]+'"/></svg></div><span style="flex:1;font-size:13.5px;font-weight:600">'+e[0]+'</span><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-right"/></svg></div>').join('')+'</div>';
}
function editUser(){
  openSheet('编辑资料',
  '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px"><div style="width:56px;height:56px;border-radius:18px;overflow:hidden;flex:none"><img src="'+S.user.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="font-size:11px;color:var(--sub)">头像上传后异步机审，未通过自动回退默认头像</div></div>'+
  '<div style="font-size:12px;font-weight:700;margin-bottom:6px">昵称（2-16字，每7天可改1次）</div>'+
  '<input class="input" id="nickIn" maxlength="16" value="'+esc(S.user.nick)+'" style="margin-bottom:8px">'+
  '<div id="nickHint" style="font-size:10.5px;color:#A8B2BE;margin-bottom:14px">'+(S.lastEditNick?('下次可修改：'+new Date(S.lastEditNick+7*864e5).toLocaleDateString()):'')+'</div>'+
  '<button class="btn" onclick="saveNick()">保存</button>');
}
function saveNick(){
  const v=$('nickIn').value.trim();
  if(v.length<2){toast('昵称至少2个字');return}
  if(['傻','蠢','骂'].some(x=>v.includes(x))){$('nickIn').classList.add('shake');setTimeout(()=>$('nickIn').classList.remove('shake'),450);toast('昵称含违规内容请修改');return}
  if(S.lastEditNick&&Date.now()-S.lastEditNick<7*864e5){toast('每7天可修改1次昵称，剩余 '+Math.ceil((S.lastEditNick+7*864e5-Date.now())/864e5)+' 天');return}
  S.user.nick=v;S.lastEditNick=Date.now();save();closeSheet();renderMe();toast('资料已更新');
}
function openFavs(){
  const favPosts=S.posts.filter(p=>S.myFavs[p.id]);
  const favDest=S.dests.filter(d=>S.myFavs['d_'+d.id]);
  openSheet('我的收藏',
  '<div style="display:flex;gap:8px;margin-bottom:12px"><button class="rTab act" onclick="favTab(0,this)">帖子 ('+favPosts.length+')</button><button class="rTab" onclick="favTab(1,this)">目的地 ('+favDest.length+')</button></div>'+
  '<div id="favP">'+(favPosts.length?favPosts.map(p=>'<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05)"><div style="width:56px;height:44px;border-radius:10px;overflow:hidden;flex:none"><img src="'+p.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.title)+'</div><div style="font-size:10px;color:var(--sub)">'+p.auth+' · '+p.zone+'区</div></div></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12px;padding:20px 0">暂无收藏，去社区逛逛</div>')+'</div>'+
  '<div id="favD" style="display:none">'+(favDest.length?favDest.map(d=>'<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05)"><div style="width:56px;height:44px;border-radius:10px;overflow:hidden;flex:none"><img src="'+d.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(d.name)+'</div><div style="font-size:10px;color:var(--sub)">'+d.city+' · '+d.pet+'</div></div></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12px;padding:20px 0">暂无收藏，去旅游看看</div>')+'</div>');
}
function favTab(i,btn){document.querySelectorAll('#sheetBody .rTab').forEach(b=>b.classList.remove('act'));btn.classList.add('act');$('favP').style.display=i?'none':'block';$('favD').style.display=i?'block':'none'}
function openDoll(){
  const p=curPet();
  openSheet('3D 玩偶定制（M8）',
  '<div style="display:flex;gap:10px;margin-bottom:14px"><div style="width:110px;height:110px;border-radius:18px;background:linear-gradient(135deg,#FBE0C4,#F5B85C);display:flex;align-items:center;justify-content:center;flex:none">'+petSVG(p,90,'happy')+'</div><div style="font-size:12px;color:var(--sub);line-height:1.7">基于「'+p.name+'」的照片生成3D玩偶预览。<br>建议尺寸：15cm 等比缩小款（适配 '+p.weight+'kg）<br>材质：短毛水晶绒 · 还原'+p.breed+'毛色</div></div>'+
  '<div style="font-size:12px;font-weight:700;margin-bottom:8px">配饰</div><div style="display:flex;gap:8px;margin-bottom:14px">'+['迷你项圈','橘色围兜','蝴蝶结'].map((a,i)=>'<button class="skuBtn'+(i===0?' act':'')+'" onclick="document.querySelectorAll(\'#sheetBody .skuBtn\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\')">'+a+'</button>').join('')+'</div>'+
  '<div class="card" style="padding:10px 13px;font-size:11px;color:var(--warn);margin-bottom:14px;background:rgba(245,166,35,.1);border-color:rgba(245,166,35,.35)">定稿后模型与配饰不可修改，请确认预览效果</div>'+
  '<button class="btn" onclick="closeSheet();dollOrder()">模拟下单 · ¥199</button>');
}
function dollOrder(){
  if(!needNet())return;
  const p=curPet();
  S.orders.unshift({id:'OD'+Date.now(),items:[{pid:'doll',name:'3D玩偶定制 · '+p.name,sku:'15cm·项圈',price:199,qty:1,img:p.img,custom:true}],amount:199,usedPts:0,status:'待支付',ts:Date.now(),addr:'北京市朝阳区 幸福家园 3-2-501'});
  save();toast('定制订单已创建（带定制徽标），去订单支付');go('orders');
}
function openHelp(){
  openSheet('帮助与反馈',
  '<div style="font-weight:800;font-size:13px;margin:4px 0 8px">常见问题</div>'+
  ['如何邀请家人共享宠物？|档案-共享-邀请码，24小时内有效','验证码收不到？|检查号段拦截，或稍后重发','虚拟形象如何重新生成？|家园-形象管理-重新生成','订单取消后积分何时返还？|取消成功即时原路返还'].map(f=>{const[a,b]=f.split('|');return '<div style="padding:10px 0;border-bottom:1px solid rgba(0,0,0,.05)"><div style="font-size:12.5px;font-weight:700">'+a+'</div><div style="font-size:11.5px;color:var(--sub);margin-top:3px">'+b+'</div></div>'}).join('')+
  '<div style="font-weight:800;font-size:13px;margin:16px 0 8px">意见反馈</div>'+
  '<textarea class="input" rows="3" placeholder="描述你遇到的问题（≤500字）" style="resize:none;margin-bottom:10px"></textarea>'+
  '<button class="btn" onclick="closeSheet();toast(\'反馈已提交，编号 FB20261015，状态：已收到\')">提交反馈</button>');
}

/* ============ 宠物档案（M2） ============ */
let profTab='health',recType='vaccine';
const RTYPES=[
  {id:'vaccine',n:'疫苗',i:'i-shield',c:'#4CA876'},
  {id:'deworm',n:'驱虫',i:'i-drop',c:'#3AB5C0'},
  {id:'care',n:'洗护',i:'i-leaf',c:'#8B7DE8'},
  {id:'medical',n:'就医',i:'i-med',c:'#F05B5B'},
  {id:'diet',n:'饮食',i:'i-bowl',c:'#E8945A'}
];
function renderProfile(){
  const p=curPet();
  const tabs=[['health','健康记录'],['album','成长相册'],['remind','提醒'],['family','共享'],['monitor','监控']];
  $('profile-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'me\')"><use href="#i-back"/></svg><b style="font-size:15px">宠物档案</b><span style="margin-left:auto;cursor:pointer" onclick="window._editPet=\''+p.id+'\';go(\'petedit\')"><svg class="icon"><use href="#i-edit"/></svg></span></div>'+
  '<div class="card" style="margin:12px 16px 14px;padding:16px;display:flex;gap:13px;align-items:center"><div style="width:74px;height:74px;border-radius:24px;overflow:hidden;flex:none">'+petImgTag(p)+'</div><div style="flex:1"><div style="font-size:18px;font-weight:900">'+p.name+' <span class="chip" style="font-size:9.5px">'+p.gender+'</span></div><div style="font-size:11.5px;color:var(--sub);margin-top:3px;line-height:1.6">'+p.species+' · '+p.breed+' · '+petAge(p)+' · '+p.weight+'kg<br>绝育：'+p.neuter+' · 过敏/忌口：'+(p.note||'无')+'</div>'+((p.personality&&p.personality.length)?'<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px">'+p.personality.map(x=>'<span class="chip" style="font-size:9px;padding:2px 8px">性格·'+x+'</span>').join('')+'</div>':'')+(p.important?'<div style="font-size:10.5px;color:#C77E12;margin-top:5px;display:flex;align-items:center;gap:4px;font-weight:600"><svg class="icon icon-s"><use href="#i-alert"/></svg>重要提示：'+esc(p.important)+'</div>':'')+'<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-sm btn-ghost" style="flex:1" onclick="openAvatarWizard()">'+(p.fur||p.acc?'重做虚拟形象':'生成虚拟形象')+'</button><button class="btn btn-sm btn-ghost" style="flex:1;color:#F05B5B;border-color:rgba(240,91,91,.3)" onclick="delPet()">删除档案</button></div></div></div>'+
  '<div style="display:flex;gap:7px;padding:0 16px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none">'+tabs.map(t=>'<button class="rTab'+(profTab===t[0]?' act':'')+'" onclick="profTab=\''+t[0]+'\';renderProfile()">'+t[1]+'</button>').join('')+'</div>'+
  '<div id="profBody" style="padding:0 16px">'+profBody(p)+'</div>';
}
function profBody(p){
  if(profTab==='health'){
    const recs=S.records.filter(r=>r.pet===p.id&&r.type===recType).sort((a,b)=>b.date.localeCompare(a.date));
    return '<div style="display:flex;gap:7px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none">'+RTYPES.map(t=>'<button class="rTab'+(recType===t.id?' act':'')+'" style="'+(recType===t.id?'':'background:rgba(255,255,255,.5)')+'" onclick="recType=\''+t.id+'\';renderProfile()">'+t.n+'</button>').join('')+'</div>'+
    (recs.length?recs.map(r=>recCard(r)).join(''):'<div class="card" style="padding:26px;text-align:center;font-size:12px;color:var(--sub)">暂无'+RTYPES.find(t=>t.id===recType).n+'记录</div>')+
    '<button class="btn" style="margin-top:12px" onclick="openRecForm()"><svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-plus"/></svg> 添加'+RTYPES.find(t=>t.id===recType).n+'记录</button>';
  }
  if(profTab==='album'){
    return '<div style="font-size:11px;color:var(--sub);margin-bottom:10px">上传失败自动重试1次，失败条目角标红色感叹号· 上传前压缩至1920px · 更新日常使人宠世界成长值+5</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px">'+petAlbum(p).map(im=>'<div style="height:100px;border-radius:13px;overflow:hidden;position:relative"><img src="'+im+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>').join('')+'</div><button class="btn btn-ghost" onclick="uploadAlbumPhoto()">+ 上传照片</button>';
  }
  if(profTab==='remind'){
    const rms=S.reminders.filter(r=>r.pet===p.id);
    return '<div class="card" style="padding:10px 14px;font-size:11px;color:var(--sub);margin-bottom:12px">推送时刻统一为当天 09:30，到期前 7/3/1 天分级提醒</div>'+
    rms.map(r=>'<div class="card" style="padding:13px 15px;margin-bottom:9px;display:flex;align-items:center;gap:11px"><div style="width:36px;height:36px;border-radius:12px;background:rgba(74,144,217,.12);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-cal"/></svg></div><div style="flex:1"><div style="font-size:13px;font-weight:700">'+r.name+'</div><div style="font-size:10.5px;color:var(--sub)">每 '+r.cycle+' 天 · 下次 '+r.next+' · '+rmDays(r.id)+' 天后</div></div>'+(rmDays(r.id)<=7?'<span class="chip" style="background:rgba(240,91,91,.12);color:#F05B5B;font-size:10px">即将到期</span>':'')+'<button class="btn btn-sm btn-ghost" style="padding:6px 11px" onclick="doneRemind(\''+r.id+'\')">完成</button></div>').join('')+
    '<button class="btn btn-ghost" style="margin-top:6px" onclick="openRemindForm()">+ 自定义周期提醒（上限20条）</button>';
  }
  if(profTab==='family'){
    return '<div class="card" style="padding:13px 15px;margin-bottom:10px;display:flex;align-items:center;gap:10px"><div style="flex:1"><div style="font-size:13px;font-weight:700">邀请码：PQ7K2M</div><div style="font-size:10.5px;color:var(--sub)">24h内有效 · 单码1次 · 成员上限5人</div></div><button class="btn btn-sm" onclick="toast(\'邀请码已复制\')">复制</button></div>'+
    S.family.map((f,i)=>'<div class="card" style="padding:11px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px"><div style="width:38px;height:38px;border-radius:13px;overflow:hidden;flex:none"><img src="'+f.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1"><div style="font-size:13px;font-weight:700">'+f.nick+'</div><div style="font-size:10.5px;color:var(--sub)">'+f.role+' · '+(f.role==='所有者'?'可管理一切':'可记数据/看监控，不可删档/下单')+'</div></div>'+(f.role!=='所有者'?'<button class="btn btn-sm btn-ghost" style="padding:6px 11px;color:#F05B5B" onclick="confirmDlg(\'移除成员\',\'移除后「'+f.nick+'」将立即失去该宠物共享权限\',\'移除\',()=>{S.family.splice('+i+',1);save();renderProfile();toast(\'已移除并站内信通知\')},\'danger\')">移除</button>':'')+'</div>').join('')+
    '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-ghost" style="flex:1" onclick="joinDemo(1)">模拟：输入失效码</button><button class="btn btn-ghost" style="flex:1" onclick="joinDemo(2)">模拟：满员加入</button></div>';
  }
  if(profTab==='monitor'){
    return '<div class="card" style="padding:12px 14px;font-size:11px;color:var(--sub);margin-bottom:10px">共享成员视角：仅实时预览+截图，云台/录制/设置按钮隐藏</div>'+
    '<div class="card chov" style="padding:13px 15px;margin-bottom:9px;display:flex;align-items:center;gap:11px;cursor:pointer" onclick="go(\'monitor\')"><div style="width:40px;height:40px;border-radius:13px;background:rgba(59,183,134,.13);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="color:#3BB786"><use href="#i-video"/></svg></div><div style="flex:1"><div style="font-size:13px;font-weight:700">客厅摄像头</div><div style="font-size:10.5px;color:#3BB786">在线 · 信号强</div></div><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-right"/></svg></div>'+
    '<div class="card chov" style="padding:13px 15px;display:flex;align-items:center;gap:11px;cursor:pointer" onclick="go(\'monitor\')"><div style="width:40px;height:40px;border-radius:13px;background:rgba(59,183,134,.13);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="color:#3BB786"><use href="#i-video"/></svg></div><div style="flex:1"><div style="font-size:13px;font-weight:700">卧室摄像头</div><div style="font-size:10.5px;color:#3BB786">在线 · 信号中</div></div><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-right"/></svg></div>';
  }
}
/* 成长相册（更新宠物日常）：照片持久化于宠物家园状态，上传使人宠世界成长值+5 */
const ALBUM_POOL=['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=300&h=300&fit=crop','https://images.unsplash.com/photo-1600275669439-14e40452d20b?w=300&h=300&fit=crop'];
function petAlbum(p){const g=petGarden(p);if(!g.album||!g.album.length)g.album=ALBUM_POOL.slice(0,6);return g.album}
function uploadAlbumPhoto(){
  const p=curPet();const alb=petAlbum(p);
  const cand=ALBUM_POOL.filter(u=>!alb.includes(u));
  const pool=cand.length?cand:ALBUM_POOL;
  alb.unshift(pool[Math.floor(Math.random()*pool.length)]);
  save();renderProfile();
  addWorldGrowth(5,'更新宠物日常');
  toast('已添加 1 张照片至成长相册 · 成长值+5');
}
function recCard(r){
  const t=RTYPES.find(x=>x.id===r.type);
  const fields={vaccine:[['品牌',r.brand],['批号',r.batch],['医院',r.hospital],['方式',r.way],['下次到期',r.next]],
  deworm:[['类型',r.dtype],['药品',r.drug],['给药',r.dway],['下次到期',r.next]],
  care:[['项目',r.items],['场所',r.place]],
  medical:[['医院',r.hospital],['诊断',r.diag],['处方',r.rx],['复诊',r.revisit]],
  diet:[['分量',r.gram?r.gram+'g':''],['餐次',r.meals]]}[r.type].filter(f=>f[1]);
  return '<div class="card record-item" style="padding:13px 15px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><span class="chip" style="background:'+t.c+'1c;color:'+t.c+';font-size:10px">'+t.n+'</span><b style="font-size:13.5px">'+esc(r.name)+'</b><span style="font-size:10.5px;color:var(--sub)">'+r.date+'</span><span style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:10px;color:var(--sub)"><div style="width:16px;height:16px;border-radius:50%;background:#DCE9FA;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#5B8DEF">'+(r.by||'我')[0]+'</div>'+(r.by||'我')+'</span></div>'+
  (fields.length?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">'+fields.map(f=>'<span style="font-size:10.5px;color:var(--sub);background:rgba(0,0,0,.03);padding:3px 8px;border-radius:8px">'+f[0]+'：'+esc(f[1])+'</span>').join('')+'</div>':'')+
  (r.note?'<div style="font-size:11.5px;color:#666">'+esc(r.note)+'</div>':'')+
  '<div style="display:flex;gap:14px;margin-top:8px;font-size:11px;color:var(--blue-d)"><span style="cursor:pointer" onclick="editRec(\''+r.id+'\')">编辑</span><span style="cursor:pointer;color:#F05B5B" onclick="confirmDlg(\'删除记录\',\'删除后不可恢复，操作将记录日志\',\'删除\',()=>{S.records=S.records.filter(x=>x.id!==\''+r.id+'\');save();renderProfile();toast(\'已删除\')},\'danger\')">删除</span></div></div>';
}
function openRecForm(r){
  const t=RTYPES.find(x=>x.id===recType);
  const F={
    vaccine:'<input class="input recf" data-k="name" data-req="1" placeholder="疫苗名称（必填）" style="margin-bottom:8px"><input class="input recf" data-k="brand" placeholder="品牌/厂家" style="margin-bottom:8px"><input class="input recf" data-k="batch" placeholder="批号" style="margin-bottom:8px"><input class="input recf" data-k="hospital" placeholder="接种医院" style="margin-bottom:8px"><input class="input recf" data-k="next" placeholder="下次到期日（如2027-09-20）" style="margin-bottom:8px"><input class="input recf" data-k="note" placeholder="备注 ≤200字">',
    deworm:'<input class="input recf" data-k="name" data-req="1" placeholder="药品名称（必填）" style="margin-bottom:8px"><div style="display:flex;gap:8px;margin-bottom:8px">'+['体内','体外','内外同驱'].map(x=>'<button class="skuBtn rdw" style="flex:1" onclick="document.querySelectorAll(\'.rdw\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');window._dtype=\''+x+'\'">'+x+'</button>')+'</div><input class="input recf" data-k="next" placeholder="下次到期日" style="margin-bottom:8px"><input class="input recf" data-k="note" placeholder="备注">',
    care:'<input class="input recf" data-k="name" data-req="1" placeholder="服务项目（如 洗澡+剪指甲）" style="margin-bottom:8px"><input class="input recf" data-k="place" placeholder="洗护场所（家中/门店）" style="margin-bottom:8px"><input class="input recf" data-k="note" placeholder="备注">',
    medical:'<input class="input recf" data-k="name" data-req="1" placeholder="医院名称（必填）" style="margin-bottom:8px"><input class="input recf" data-k="doc" placeholder="科室/医生" style="margin-bottom:8px"><input class="input recf" data-k="diag" data-req="1" placeholder="诊断结论（必填 ≤200字）" style="margin-bottom:8px"><input class="input recf" data-k="rx" placeholder="处方摘要" style="margin-bottom:8px"><input class="input recf" data-k="note" placeholder="备注">',
    diet:'<input class="input recf" data-k="name" data-req="1" placeholder="食物名称（必填）" style="margin-bottom:8px"><input class="input recf" data-k="gram" placeholder="单次分量（克）" style="margin-bottom:8px"><input class="input recf" data-k="note" placeholder="备注">'
  };
  window._dtype='体内';
  openSheet((r?'编辑':'添加')+t.n+'记录',
  '<input class="input recf" data-k="date" data-req="1" placeholder="日期（如2026-10-15）" value="'+(r?r.date:today())+'" style="margin-bottom:8px">'+F[recType]+
  '<button class="btn" style="margin-top:14px" onclick="saveRec('+(r?"'"+r.id+"'":"null")+')">保存</button>');
}
function editRec(id){const r=S.records.find(x=>x.id===id);openRecForm(r)}
function saveRec(id){
  const ks={};let bad=null;
  document.querySelectorAll('#sheetBody .recf').forEach(i=>{
    ks[i.dataset.k]=i.value.trim();
    if(i.dataset.req&&!i.value.trim()&&!bad){bad=i.dataset.k;i.classList.add('shake');setTimeout(()=>i.classList.remove('shake'),450)}
  });
  if(bad){toast('有必填项未填写');return}
  if(id){
    const r=S.records.find(x=>x.id===id);Object.assign(r,ks);if(recType==='deworm')r.dtype=window._dtype;
    toast('记录已更新');
  }else{
    const base={id:uid(),pet:S.curPet,type:recType,by:S.user.nick,...ks};
    if(recType==='deworm')base.dtype=window._dtype;
    S.records.unshift(base);addWorldGrowth(5,'更新宠物日常');toast('保存成功，记录人标识已落库 · 成长值+5');
  }
  save();closeSheet();renderProfile();
}
function doneRemind(id){
  const r=S.reminders.find(x=>x.id===id);
  const d=new Date(r.next);d.setDate(d.getDate()+r.cycle);
  const f=x=>x.toISOString().slice(0,10);
  r.next=f(d);save();renderProfile();
  toast('已完成，下次提醒顺延至 '+r.next);
}
function openRemindForm(){
  openSheet('自定义提醒','<input class="input" id="rmName" placeholder="名称（如 修剪脚毛）" style="margin-bottom:8px"><input class="input" id="rmCycle" inputmode="numeric" placeholder="周期天数（1-365）" style="margin-bottom:8px"><input class="input" id="rmNext" placeholder="首次提醒日（如2026-11-01）" style="margin-bottom:8px"><button class="btn" style="margin-top:10px" onclick="saveRemind()">保存</button>');
}
function saveRemind(){
  const n=$('rmName').value.trim(),c=+$('rmCycle').value,nx=$('rmNext').value.trim();
  if(!n||!c||!nx){toast('请填写完整');return}
  if(S.reminders.filter(r=>r.pet===S.curPet).length>=20){toast('提醒已达上限20条');return}
  S.reminders.push({id:uid(),pet:S.curPet,name:n,cycle:c,next:nx,note:''});save();closeSheet();renderProfile();toast('已创建，推送时刻 09:30');
}
function joinDemo(k){
  if(k===1)toast('邀请码已过期，请联系所有者重新生成');
  else toast('共享成员已达上限，请联系所有者移除成员后再加入');
}
function renderPetEdit(){
  const p=S.pets.find(x=>x.id===window._editPet)||{species:'猫',gender:'弟弟',neuter:'未绝育'};
  const opt=(k,vals,cur)=>vals.map(v=>'<button class="skuBtn'+(v===cur?' act':'')+'" data-g="'+k+'" data-v="'+v+'" onclick="document.querySelectorAll(\'[data-g=' + k + ']\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\')">'+v+'</button>').join('');
  $('petedit-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'profile\')"><use href="#i-back"/></svg><b style="font-size:15px">'+(window._editPet?'编辑':'新建')+'宠物档案</b><span style="margin-left:auto"></span></div>'+
  '<div style="padding:16px">'+
  '<div style="display:flex;gap:8px;margin-bottom:12px"><div style="width:72px;height:72px;border-radius:22px;border:1.5px dashed rgba(58,123,213,.4);overflow:hidden;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.4);color:#8FA8C9"><svg class="icon icon-l"><use href="#i-camera"/></svg></div><div style="font-size:10.5px;color:var(--sub);align-self:flex-end">拍照/相册 · 权限拒绝时提供说明页+去设置</div></div>'+
  '<input class="input pf" data-k="name" placeholder="昵称 ≤12字（必填）" value="'+(p.name||'')+'" style="margin-bottom:8px">'+
  '<div style="font-size:11px;color:var(--sub);margin:6px 0">物种</div><div style="display:flex;gap:8px;margin-bottom:10px">'+opt('species',['猫','狗','鸟','异宠'],p.species)+'</div>'+
  '<input class="input pf" data-k="breed" placeholder="品种" value="'+(p.breed||'')+'" style="margin-bottom:8px">'+
  '<div style="font-size:11px;color:var(--sub);margin:6px 0">性别</div><div style="display:flex;gap:8px;margin-bottom:10px">'+opt('gender',['弟弟','妹妹'],p.gender)+'</div>'+
  '<input class="input pf" data-k="birth" placeholder="生日（如2023-04-12，上限当天）" value="'+(p.birth||'')+'" style="margin-bottom:8px">'+
  '<input class="input pf" data-k="weight" inputmode="decimal" placeholder="当前体重 0.1~100kg" value="'+(p.weight||'')+'" style="margin-bottom:8px">'+
  '<div style="font-size:11px;color:var(--sub);margin:6px 0">绝育状态</div><div style="display:flex;gap:8px;margin-bottom:10px">'+opt('neuter',['已绝育','未绝育','未知'],p.neuter)+'</div>'+
  '<div style="font-size:11px;color:var(--sub);margin:6px 0">性格属性（可多选）</div><div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">'+['活泼','粘人','高冷','胆小','贪吃','拆家'].map(v=>'<button class="skuBtn'+((p.personality||[]).includes(v)?' act':'')+'" data-pg="personality" data-v="'+v+'" onclick="this.classList.toggle(\'act\')">'+v+'</button>').join('')+'</div>'+
  '<input class="input pf" data-k="note" placeholder="备注：过敏史/忌口 ≤100字（AI导购入参）" value="'+(p.note||'')+'" style="margin-bottom:8px">'+
  '<input class="input pf" data-k="important" placeholder="重要提示：过敏/禁忌/用药提醒（≤50字）" value="'+(p.important||'')+'" style="margin-bottom:14px">'+
  '<button class="btn" onclick="savePet()">保存档案</button></div>';
}
function renderPetedit(){renderPetEdit()}
function savePet(){
  const kv={};let bad=null;
  document.querySelectorAll('#pg-petedit .pf').forEach(i=>{kv[i.dataset.k]=i.value.trim();if(i.dataset.k==='name'&&!i.value.trim()&&!bad){bad=1;i.classList.add('shake');setTimeout(()=>i.classList.remove('shake'),450)}});
  if(bad){toast('昵称为必填项，红框定位');return}
  document.querySelectorAll('#pg-petedit [data-g]').forEach(b=>{if(b.classList.contains('act'))kv[b.dataset.g]=b.dataset.v});
  kv.personality=[...new Set([...document.querySelectorAll('#pg-petedit [data-pg="personality"].act')].map(b=>b.dataset.v))];
  if(!kv.personality.length)kv.personality=['活泼'];
  if(!kv.species)kv.species='猫';if(!kv.gender)kv.gender='弟弟';if(!kv.neuter)kv.neuter='未绝育';
  const imgMap={'猫':'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=200&h=200&fit=crop','狗':'https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=200&h=200&fit=crop','鸟':'https://images.unsplash.com/photo-1552728084-7afe55122d02?w=200&h=200&fit=crop','异宠':'https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=200&h=200&fit=crop'};
  if(window._editPet){const p=S.pets.find(x=>x.id===window._editPet);Object.assign(p,kv);if(kv.weight)p.weight=+kv.weight;toast('档案已更新')}
  else{
    const np={id:uid(),owner:true,img:imgMap[kv.species],color:'',chip:'',...kv,weight:+(kv.weight||0)||''};
    S.pets.push(np);S.curPet=np.id;window._editPet=null;
    save();
    openModal('<div style="text-align:center"><div style="width:90px;margin:0 auto">'+petSVG(np,90,'happy')+'</div><div style="font-size:16px;font-weight:900;margin-top:8px">建档成功！</div><div style="font-size:12px;color:var(--sub);margin:8px 0 14px">是否立即为「'+np.name+'」生成专属虚拟形象？</div><div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="closeModal();go(\'profile\')">稍后再说</button><button class="btn" onclick="closeModal();openAvatarWizard()">立即生成</button></div></div>');
    return;
  }
  save();go('profile');
}

/* ============ 健康数据页（M4） ============ */
function renderHealth(){
  const p=curPet();
  const ws=S.daily.filter(d=>d.pet===p.id&&d.k==='weight').sort((a,b)=>a.ts-b.ts).slice(-7);
  const pts=ws.map((d,i)=>{const x=20+i*(300/(Math.max(ws.length-1,1)));const y=110-((d.v-4.8)/0.7)*80;return [x,Math.max(20,Math.min(110,y)),d]}).filter(pt=>pt[2]);
  const path=pts.map((pt,i)=>(i?'L':'M')+pt[0].toFixed(1)+' '+pt[1].toFixed(1)).join(' ');
  const todayDone=S.daily.some(d=>d.pet===p.id&&new Date(d.ts).toDateString()===new Date().toDateString());
  const kNames={weight:'体重',water:'饮水量',poop:'便便',spirit:'精神',skin:'皮肤'};
  const recs=[...S.daily.filter(d=>d.pet===p.id)].sort((a,b)=>b.ts-a.ts).slice(0,12);
  /* 异常数据标红 + AI归因入口（PRD 模块二 5.2） */
  let abnHtml='';
  if(ws.length>=2){
    const pw=ws[ws.length-2].v,cw=ws[ws.length-1].v;
    if(pw>0&&(pw-cw)/pw>=0.05)abnHtml+='<div class="abn"><svg class="icon icon-s" style="color:#D94343;flex:none"><use href="#i-alert"/></svg><div style="flex:1;font-size:12px;color:#D94343;font-weight:700">体重骤降 '+((pw-cw)/pw*100).toFixed(1)+'%（'+pw+'→'+cw+'kg）</div><button class="btn btn-sm" style="width:auto;padding:6px 10px" onclick="openChat(\'attr\',\'体重从'+pw+'kg降到'+cw+'kg，生成异常归因报告\')">AI 归因</button></div>';
  }
  const softCnt=S.daily.filter(d=>d.pet===p.id&&d.k==='poop'&&Date.now()-d.ts<7*864e5&&d.v<=2).length;
  if(softCnt>=2)abnHtml+='<div class="abn"><svg class="icon icon-s" style="color:#D94343;flex:none"><use href="#i-alert"/></svg><div style="flex:1;font-size:12px;color:#D94343;font-weight:700">近7日出现 '+softCnt+' 次软便/腹泻倾向</div><button class="btn btn-sm" style="width:auto;padding:6px 10px" onclick="openChat(\'attr\',\''+p.name+'近7日软便'+softCnt+'次，生成异常归因报告\')">AI 归因</button></div>';
  $('health-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">健康管理 · '+p.name+'</b><span style="margin-left:auto;font-size:11px;color:var(--blue-d);cursor:pointer" onclick="exportPdf()">导出PDF</span></div>'+
  '<div style="padding:14px 16px">'+
  (abnHtml?'<div style="margin-bottom:12px">'+abnHtml+'</div>':'')+
  '<div class="card" style="padding:15px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:14px">体重趋势（近'+ws.length+'次）</b><span style="font-size:11px;color:var(--sub)">曲线取当日最后一次</span></div>'+
  '<svg viewBox="0 0 340 130" style="width:100%">'+
    '<line x1="20" y1="110" x2="330" y2="110" stroke="rgba(58,123,213,.2)"/><line x1="20" y1="63" x2="330" y2="63" stroke="rgba(58,123,213,.12)" stroke-dasharray="4 4"/><line x1="20" y1="20" x2="330" y2="20" stroke="rgba(58,123,213,.12)" stroke-dasharray="4 4"/>'+
    '<text x="20" y="118" font-size="9" fill="#A8B2BE">4.8kg</text><text x="20" y="59" font-size="9" fill="#A8B2BE">5.15kg</text><text x="20" y="16" font-size="9" fill="#A8B2BE">5.5kg</text>'+
    '<path d="'+path+'" stroke="url(#wgrad)" stroke-width="3" fill="none" class="wline" stroke-linecap="round"/>'+
    '<defs><linearGradient id="wgrad" x1="0" x2="1"><stop offset="0" stop-color="#8FB6EE"/><stop offset="1" stop-color="#3A7BD5"/></linearGradient></defs>'+
    pts.map((pt,i)=>'<g class="wdot" style="animation-delay:'+(0.3+i*0.12)+'s"><circle cx="'+pt[0]+'" cy="'+pt[1]+'" r="4.5" fill="#fff" stroke="#3A7BD5" stroke-width="2.5"/>'+((pts.length>6&&i%2)||i===pts.length-1?'<text x="'+(pt[0]-8)+'" y="'+(pt[1]-10)+'" font-size="9" fill="#5B8DEF" font-weight="700">'+pt[2].v+'kg</text>':'')+'</g>').join('')+
  '</svg></div>'+
  '<div class="card" style="padding:14px 15px;margin-bottom:12px"><b style="font-size:13.5px">今日快捷录入</b><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px">'+
  [['体重','weight'],['饮水','water'],['便便','poop'],['精神','spirit'],['皮肤','skin']].map(q=>'<button class="btn btn-ghost btn-sm" style="display:flex;flex-direction:column;gap:1px;padding:8px 0" onclick="openAdd(\''+q[1]+'\')"><b>'+q[0]+'</b><span style="font-size:9px;font-weight:400">'+(q[1]==='weight'?(ws.length?ws[ws.length-1].v+'kg':'待录入'):'点录入')+'</span></button>').join('')+'</div>'+
  (todayDone?'<div style="font-size:10px;color:#3BB786;margin-top:8px">今日已完成打卡 · +15积分已发放</div>':'<div style="font-size:10px;color:var(--warn);margin-top:8px">今日未打卡，完成后虚拟宠物将同步获得活力</div>')+'</div>'+
  '<div class="card" style="padding:14px 15px;margin-bottom:12px;background:linear-gradient(135deg,rgba(76,168,118,.1),rgba(59,183,134,.05))"><div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:13.5px">健康周报</b><span class="chip" style="background:rgba(59,183,134,.15);color:#2E9C6F;font-size:10px">数据完整 7/7</span></div><div style="font-size:11.5px;color:var(--sub);margin-top:6px;line-height:1.7">本周体重稳定（5.1→5.25kg），饮水/精神记录连续7天无异常。<br>AI建议：零食热量偏高，建议控制在15g/日内；维持当前主粮方案。</div><div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-sm" style="flex:1" onclick="tabTo(\'ai\');openChat(\'attr\',\'生成本周健康周报的归因分析\')">AI 归因</button><button class="btn btn-sm btn-ghost" style="flex:1" onclick="toast(\'分享海报已生成，可保存或站外分享\')">生成分享海报</button></div></div>'+
  '<div class="card" style="padding:14px 15px"><b style="font-size:13.5px">数据记录</b>'+
  recs.map(d=>'<div style="display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05)"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-chart"/></svg><div style="flex:1"><div style="font-size:12.5px;font-weight:600">'+kNames[d.k]+'：'+d.v+(d.k==='weight'?'kg':d.k==='water'?'ml':'')+'</div><div style="font-size:10px;color:var(--sub)">'+fmtTs(d.ts)+' · 记录人 '+d.by+(d.fixed?' · <span style="color:#E8A23A">已修正，原值 '+d.orig+'kg</span>':'')+'</div></div>'+(d.fixed?'':'<button class="btn btn-sm btn-ghost" style="padding:5px 10px;font-size:10px" onclick="fixDaily(\''+d.ts+'\')">修正</button>')+'</div>').join('')+
  '</div></div>';
}
function openAdd(k){
  const labels={weight:'今日体重（kg）',water:'今日饮水量（ml）',poop:'便便状态（1-5档）',spirit:'精神状态（1-5档）',skin:'皮肤状态（1-5档，5为最佳）'};
  openSheet('录入 · '+labels[k],'<input class="input" id="dvIn" inputmode="decimal" placeholder="'+(k==='poop'||k==='spirit'||k==='skin'?'1（差）~ 5（好），如 4':'如 '+(k==='weight'?'5.2':'180'))+'" style="margin-bottom:10px"><div style="font-size:10.5px;color:#A8B2BE;margin-bottom:14px">'+(k==='weight'?'同日多次录入：多条并存，曲线取当日最后一次':'同日重复录入将提示覆盖或新增')+'</div><button class="btn" onclick="submitDaily(\''+k+'\')">提交 · 触发异常判定</button>');
}
function submitDaily(k){
  const v=+$('dvIn').value;
  if(!v||v<=0){toast('请输入有效数值');return}
  const dup=S.daily.filter(x=>x.pet===S.curPet&&x.k===k&&k!=='weight'&&new Date(x.ts).toDateString()===new Date().toDateString()).length;
  closeSheet();
  quickAdd(k,v);
  const gg=petGarden(curPet());gg.vitality=Math.min(100,gg.vitality+5);
  save();
  if($('pg-health').classList.contains('on'))renderHealth();
  if(!dup)toast('录入完成：健康判定通过，虚拟'+curPet().name+'活力+5');
}
function fixDaily(ts){
  const d=S.daily.find(x=>x.ts===ts);if(!d)return;
  openSheet('修正记录','<div style="font-size:12px;color:var(--sub);margin-bottom:10px">当前值：'+d.v+'（'+(d.k==='weight'?'kg':d.k==='water'?'ml':'档')+'）</div><input class="input" id="fxIn" inputmode="decimal" placeholder="输入修正后的值" style="margin-bottom:12px"><button class="btn" onclick="doFix('+ts+')">确认修正</button>');
}
function doFix(ts){
  const d=S.daily.find(x=>x.ts===ts);const v=+$('fxIn').value;
  if(!v){toast('请输入数值');return}
  d.orig=d.v;d.v=v;d.fixed=true;d.by=S.user.nick;
  save();closeSheet();renderHealth();toast('已修正（原值 '+d.orig+'），并重新触发异常判定');
}
function exportPdf(){
  openSheet('导出健康记录 PDF','<div style="font-size:12px;font-weight:700;margin-bottom:8px">选择导出范围</div><div style="display:flex;gap:8px;margin-bottom:14px">'+['近1个月','近3个月','近1年','全部'].map((r,i)=>'<button class="skuBtn'+(i===1?' act':'')+'" onclick="document.querySelectorAll(\'#sheetBody .skuBtn\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\')">'+r+'</button>').join('')+'</div><div style="font-size:11px;color:var(--sub);margin-bottom:14px">导出内容：范围内记录时间轴 + 体重趋势图 + 档案基础信息</div><button class="btn" onclick="closeSheet();toast(\'PDF已生成（≤5s），已保存至本地并支持分享\')">生成 PDF（演示）</button>');
}
