/* ============ 社区（V1.5：狗/猫/鸟/异宠四区 + 视频帖 + 动态用户主页） ============ */
let comZone='推荐';
function renderCommunity(){
  const zones=['推荐','狗区','猫区','鸟区','异宠区'];
  const posts=comZone==='推荐'?S.posts:S.posts.filter(p=>p.zone===comZone);
  $('community-body').innerHTML=
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><div style="font-size:19px;font-weight:900">社区</div><div style="display:flex;align-items:center;gap:10px"><div style="position:relative;cursor:pointer" onclick="openNotifSheet()" title="互动消息"><svg class="icon icon-l" style="color:#7C8CA0"><use href="#i-msg"/></svg>'+notifBadge()+'</div><div style="width:32px;height:32px;border-radius:50%;overflow:hidden;cursor:pointer;border:1.5px solid rgba(74,144,217,.4)" onclick="openUserHome(S.user.nick)" title="我的主页"><img src="'+S.user.avatar+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><button class="btn btn-sm" style="display:flex;align-items:center;gap:4px;padding:8px 14px" onclick="go(\'publish\')"><svg class="icon icon-s"><use href="#i-edit"/></svg>发布</button></div></div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none">'+zones.map(z=>'<button class="rTab'+(z===comZone?' act':'')+'" onclick="comZone=\''+z+'\';renderCommunity()">'+z+'</button>').join('')+'</div>'+
  (posts.length?posts.map(po=>{
    const liked=S.myLikes[po.id],faved=S.myFavs[po.id];
    return '<div class="card chov record-item" style="padding:15px 16px;margin-bottom:12px">'+
    '<div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;cursor:pointer" onclick="openUserHome(\''+po.auth+'\')"><div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex:none"><img src="'+po.authImg+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div><div style="font-size:12.5px;font-weight:700">'+po.auth+'</div><div style="font-size:10px;color:var(--sub)">'+fmtTs(po.time)+' · '+po.zone+' · IP属地：'+esc(po.ip||'北京')+'</div></div><span style="margin-left:auto;cursor:pointer;color:#9AA9BC" onclick="event.stopPropagation();postMore(\''+po.id+'\')"><svg class="icon icon-s"><use href="#i-more"/></svg></span></div>'+
    '<div style="font-size:14.5px;font-weight:800;margin-bottom:5px;cursor:pointer" onclick="openPost(\''+po.id+'\')">'+esc(po.title)+'</div>'+
    '<div style="font-size:12.5px;color:#666;line-height:1.55;margin-bottom:9px">'+esc(po.txt)+'</div>'+
    '<div style="position:relative;height:150px;border-radius:14px;overflow:hidden;margin-bottom:10px;cursor:pointer" onclick="openPost(\''+po.id+'\')"><img src="'+po.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)">'+(po.media==='视频'?'<span class="vplay"><svg class="icon icon-s" style="color:#fff;margin-left:2px"><use href="#i-play"/></svg></span><span class="vdur">'+(po.dur||'00:45')+'</span>':'')+'</div>'+
    '<div style="display:flex;gap:22px;color:#8A99AB;font-size:11.5px">'+
      '<span style="display:flex;align-items:center;gap:4px;cursor:pointer;color:'+(liked?'#F05B5B':'#8A99AB')+'" onclick="likePost(\''+po.id+'\')"><svg class="icon icon-s"><use href="#i-heart"/></svg>'+(po.likes+(liked?1:0))+'</span>'+
      '<span style="display:flex;align-items:center;gap:4px;cursor:pointer" onclick="openPost(\''+po.id+'\')"><svg class="icon icon-s"><use href="#i-msg"/></svg>'+po.cmts.length+'</span>'+
      '<span style="display:flex;align-items:center;gap:4px;cursor:pointer;color:'+(faved?'#E8A23A':'#8A99AB')+'" onclick="favPost(\''+po.id+'\')"><svg class="icon icon-s"><use href="#i-star"/></svg>'+(po.favs+(faved?1:0))+'</span>'+
      '<span style="display:flex;align-items:center;gap:4px;cursor:pointer" onclick="toast(\'已生成分享海报\')"><svg class="icon icon-s"><use href="#i-share"/></svg>分享</span>'+
    '</div></div>';
  }).join(''):'<div class="card" style="padding:34px;text-align:center;color:var(--sub);font-size:13px">该分区还没有内容，发一条试试</div>');
}
function likePost(id){const po=S.posts.find(p=>p.id===id);if(S.myLikes[id]){delete S.myLikes[id]}else{S.myLikes[id]=1;po.likes++}save();renderCommunity()}
function favPost(id){const po=S.posts.find(p=>p.id===id);if(S.myFavs[id]){delete S.myFavs[id];po.favs--}else{S.myFavs[id]=1;po.favs++;addPts(2,'互动-收藏')}save();renderCommunity();toast(S.myFavs[id]?'已收藏，可在「我的-收藏」查看':'已取消收藏')}
function postMore(id){
  openSheet('帖子操作',
  '<div style="display:flex;flex-direction:column;gap:4px">'+
  '<button class="btn btn-ghost btn-sm" style="width:100%;padding:12px" onclick="closeSheet();toast(\'已提交举报，将进入先审后发流程\')">举报该内容</button>'+
  '<button class="btn btn-ghost btn-sm" style="width:100%;padding:12px" onclick="closeSheet();toast(\'已加入黑名单：双方互不可见内容\')">加入黑名单</button>'+
  '<button class="btn btn-ghost btn-sm" style="width:100%;padding:12px" onclick="closeSheet();toast(\'已生成分享图（含二维码海报）\')">站外分享</button>'+
  '<button class="btn btn-ghost btn-sm" style="width:100%;padding:12px;color:#F05B5B" onclick="closeSheet()">取消</button></div>');
}
/* ---- V1.6 社区互动消息（微信式：红点提醒→点击进入查看） ---- */
function notifBadge(){const un=(S.notifs||[]).filter(n=>!n.read).length;return un?'<span class="dot-badge">'+un+'</span>':''}
function openNotifSheet(){
  const list=S.notifs||[];
  openSheet('互动消息',
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:11px;color:var(--sub)">点赞 / 评论 / 回复 / 关注 都会在这里提醒你</span><span style="font-size:10.5px;color:var(--blue-d);cursor:pointer;font-weight:700" onclick="S.notifs.forEach(n=>n.read=true);save();openNotifSheet();if($(\'pg-community\').classList.contains(\'on\'))renderCommunity();toast(\'已全部标记已读\')">全部已读</span></div>'+
  (list.length?list.map(n=>{
    const ic={like:'#F05B5B',cmt:'#5B8DEF',reply:'#4CA876',follow:'#E8A23A'}[n.type]||'#F05B5B';
    const act={like:'赞了',cmt:'评论了',reply:'回复了你',follow:'关注了你'}[n.type]||'互动了';
    const mainTxt=(n.txt||'').replace(/^(赞了|评论了|回复了你|关注了你)/,'');
    const hasQuote=mainTxt.includes('：');
    const quote=hasQuote?mainTxt.split('：').slice(1).join('：'):'';
    return '<div style="display:flex;gap:10px;padding:11px 4px;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer;'+(n.read?'opacity:.62':'')+'" onclick="readNotif(\''+n.id+'\')">'+
    '<div style="width:38px;height:38px;border-radius:50%;overflow:hidden;flex:none"><img src="'+n.userImg+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
    '<div style="flex:1;min-width:0"><div style="font-size:12.5px;line-height:1.5"><b>'+esc(n.user)+'</b> <span style="color:'+ic+'">'+act+esc(hasQuote?mainTxt.split('：')[0]:mainTxt)+'</span></div>'+
    (quote?'<div style="font-size:11px;color:#666;margin-top:3px;background:rgba(0,0,0,.03);border-radius:8px;padding:5px 9px;display:inline-block">'+esc(quote)+'</div>':'')+
    '<div style="font-size:10px;color:var(--sub);margin-top:3px">'+fmtTs(n.ts)+'</div></div>'+
    (!n.read?'<span style="width:7px;height:7px;border-radius:50%;background:var(--danger);flex:none;margin-top:7px"></span>':'<span style="flex:none;color:#C9D2DD;align-self:center"><svg class="icon icon-s"><use href="#i-right"/></svg></span>')+
    '</div>';
  }).join(''):'<div style="text-align:center;color:var(--sub);font-size:12.5px;padding:30px 0">暂无互动消息</div>')+
  '<button class="btn btn-ghost btn-sm" style="margin-top:12px;width:100%" onclick="simNotif()">⚡ 演示：模拟收到一条新互动</button>');
}
function readNotif(id){
  const n=(S.notifs||[]).find(x=>x.id===id);if(!n)return;
  n.read=true;save();
  const po=n.postId?S.posts.find(p=>p.id===n.postId):null;
  closeSheet();
  if(po){go('community');openPost(n.postId)}
  else if(n.type==='follow'){openUserHome(n.user)}
  else{if($('pg-community').classList.contains('on'))renderCommunity();toast('该互动内容已失效')}
}
function simNotif(){
  const mine=S.posts.find(p=>p.auth===S.user.nick);
  const U=[['小鱼干','https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&h=80&fit=crop'],['尖尖妈','https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=80&h=80&fit=crop'],['遛狗冠军','https://images.unsplash.com/photo-1600275669439-14e40452d20b?w=80&h=80&fit=crop']];
  const u=U[Math.floor(Math.random()*U.length)];
  let n;
  if(mine){
    const k=Math.random();
    if(k<0.4)n={id:uid(),type:'like',user:u[0],userImg:u[1],postId:mine.id,txt:'赞了你的帖子',ts:Date.now(),read:false};
    else if(k<0.75)n={id:uid(),type:'cmt',user:u[0],userImg:u[1],postId:mine.id,txt:'评论了你的帖子：太可爱了吧，求同款！',ts:Date.now(),read:false};
    else n={id:uid(),type:'reply',user:u[0],userImg:u[1],postId:mine.id,txt:'回复了你：同款铲屎官，握手',ts:Date.now(),read:false};
  }else{
    n={id:uid(),type:'like',user:u[0],userImg:u[1],postId:'po1',txt:'赞了你的评论',ts:Date.now(),read:false};
  }
  S.notifs.unshift(n);save();
  openNotifSheet();
  if($('pg-community').classList.contains('on'))renderCommunity();
  toast('收到新互动：'+n.user+' '+(n.txt||'').split('：')[0]);
}
function openUserHome(name){
  const un=name||'柯基屁股协会';
  const mine=un===S.user.nick;
  const ups=S.posts.filter(p=>p.auth===un);
  const img=mine?S.user.avatar:(ups.length?ups[0].authImg:'https://images.unsplash.com/photo-1600275669439-14e40452d20b?w=120&h=120&fit=crop');
  const inter=[];
  S.posts.forEach(po=>{po.cmts.forEach(c=>{if(c.u===un&&!c.del)inter.push({t:po.title,x:c.t2,ts:c.ts});(c.replies||[]).forEach(r=>{if(r.u===un)inter.push({t:po.title,x:r.t2,ts:r.ts})})})});
  openSheet((mine?'我的主页':esc(un)+' 的主页'),
  '<div style="text-align:center;padding:6px 0 14px">'+
  '<div style="width:64px;height:64px;border-radius:50%;margin:0 auto 8px;overflow:hidden"><img src="'+img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
  '<div style="font-weight:800">'+esc(un)+(mine?' <span class="chip" style="font-size:9px">我</span>':'')+'</div>'+
  '<div style="font-size:11px;color:var(--sub);margin:3px 0 2px">'+(mine?'养宠 3 年 · '+S.pets.length+' 只宠物 · 认证铲屎官':(ups.length?esc(ups[0].zone)+' · 认证铲屎官':'社区成员'))+'</div>'+
  '<div style="font-size:10px;color:#A8B2BE;margin-bottom:8px">IP属地：'+(mine?esc(S.user.ip||'北京'):esc(ups.length?(ups[0].ip||'北京'):'北京'))+'</div>'+
  '<div style="display:flex;justify-content:center;gap:24px;font-size:11.5px;color:var(--sub)"><span><b style="color:var(--ink);font-size:15px">'+ups.length+'</b><br>帖子</span><span><b style="color:var(--ink);font-size:15px">'+(mine?96:'2.4k')+'</b><br>粉丝</span><span><b style="color:var(--ink);font-size:15px">'+(mine?32:56)+'</b><br>关注</span></div>'+
  (mine?'':'<button class="btn" style="margin-top:14px" onclick="toast(\'已关注 '+esc(un)+'，后续动态将推送给你\')">+ 关注</button>')+
  '</div>'+
  '<div style="font-weight:800;font-size:13px;margin:6px 0 8px">TA的帖子（'+ups.length+'）</div>'+
  (ups.length?ups.map(p=>'<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer" onclick="closeSheet();openPost(\''+p.id+'\')"><div style="width:56px;height:44px;border-radius:10px;overflow:hidden;flex:none;position:relative"><img src="'+p.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)">'+(p.media==='视频'?'<span class="vplay" style="width:22px;height:22px"><svg class="icon" style="width:10px;height:10px;color:#fff;margin-left:1px"><use href="#i-play"/></svg></span>':'')+'</div><div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(p.title)+'</div><div style="font-size:10px;color:var(--sub)">'+fmtTs(p.time)+' · '+p.zone+' · ♥'+p.likes+' · 评论'+p.cmts.length+'</div></div></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12px;padding:14px 0">还没有发过帖子</div>')+
  '<div style="font-weight:800;font-size:13px;margin:14px 0 8px">互动记录</div>'+
  (inter.length?inter.slice(0,6).map(r=>'<div style="padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:11.5px;color:#555;line-height:1.5"><b style="color:var(--blue-d)">评论</b> 《'+esc(r.t.length>14?r.t.slice(0,14)+'…':r.t)+'》：'+esc(r.x)+' <span style="font-size:9.5px;color:#B4BDC8">'+fmtTs(r.ts)+'</span></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12px;padding:14px 0">暂无互动记录</div>'));
}
function openPost(id){
  const po=S.posts.find(p=>p.id===id);
  if(window._pid!==id)window._replyCmt=null;
  window._pid=id;
  const liked=S.myLikes[id],faved=S.myFavs[id];
  const rc=window._replyCmt&&window._replyCmt.pid===id?window._replyCmt:null;
  openSheet('帖子详情',
  '<div style="display:flex;align-items:center;gap:9px;margin-bottom:10px;cursor:pointer" onclick="closeSheet();openUserHome(\''+po.auth+'\')"><div style="width:34px;height:34px;border-radius:50%;overflow:hidden;flex:none"><img src="'+po.authImg+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div><div style="font-size:12.5px;font-weight:700">'+po.auth+'</div><div style="font-size:10px;color:var(--sub)">'+fmtTs(po.time)+' · '+po.zone+' · IP属地：'+esc(po.ip||'北京')+'</div></div></div>'+
  '<div style="font-size:15px;font-weight:800;margin-bottom:6px">'+esc(po.title)+'</div>'+
  '<div style="font-size:13px;color:#555;line-height:1.6;margin-bottom:10px">'+esc(po.txt)+'</div>'+
  '<div style="height:160px;border-radius:14px;overflow:hidden;margin-bottom:14px;position:relative"><img src="'+po.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)">'+(po.media==='视频'?'<span class="vplay" style="width:46px;height:46px"><svg class="icon" style="width:18px;height:18px;color:#fff;margin-left:3px"><use href="#i-play"/></svg></span><span class="vdur" style="font-size:10px">'+(po.dur||'00:45')+'</span><div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:rgba(255,255,255,.85);padding-top:60px">点击播放（演示视频）</div>':'')+'</div>'+
  '<div style="font-weight:800;font-size:13px;margin-bottom:8px">评论 '+po.cmts.filter(c=>!c.del).length+'</div><div id="cmtList">'+
  po.cmts.map((c,i)=>{
    if(c.del)return '<div style="padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05);font-size:11.5px;color:#B4BDC8;font-style:italic">该评论已删除</div>';
    const delBtn=c.u===S.user.nick?'<span style="cursor:pointer;color:#C9D2DD;font-size:10.5px;margin-left:8px" onclick="delCmt(\''+po.id+'\','+i+')">删除</span>':'';
    const repBtn='<span style="cursor:pointer;color:var(--blue-d);font-size:10.5px;margin-left:8px" onclick="startReply('+i+')">回复</span>';
    const replies=(c.replies||[]).map((r,ri)=>{
      const rRep='<span style="cursor:pointer;color:var(--blue-d);font-size:10px;margin-left:8px" onclick="startReply('+i+',\''+r.u+'\')">回复</span>';
      const rDel=r.u===S.user.nick?'<span style="cursor:pointer;color:#C9D2DD;font-size:10px;margin-left:8px" onclick="delReply(\''+po.id+'\','+i+','+ri+')">删除</span>':'';
      return '<div style="display:flex;gap:8px;padding:7px 0 0 0"><div style="width:22px;height:22px;border-radius:50%;background:#EFE7FA;flex:none;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#8B7DE8">'+r.u[0]+'</div><div style="flex:1"><div style="font-size:11px;font-weight:700">'+esc(r.u)+(r.to?' <span style="color:#8A99AB;font-weight:400">回复</span> <b>'+esc(r.to)+'</b>':'')+' <span style="color:#B4BDC8;font-weight:400;font-size:9.5px">'+fmtTs(r.ts)+'</span>'+rRep+rDel+'</div><div style="font-size:12px;margin-top:1px">'+esc(r.t2)+'</div></div></div>';
    }).join('');
    return '<div style="padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05)"><div style="display:flex;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:#DCE9FA;flex:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#5B8DEF">'+c.u[0]+'</div><div style="flex:1"><div style="font-size:11.5px;font-weight:700"><span style="cursor:pointer" onclick="closeSheet();openUserHome(\''+c.u+'\')">'+c.u+'</span> <span style="color:#B4BDC8;font-weight:400;font-size:10px">'+fmtTs(c.ts)+'</span>'+repBtn+delBtn+'</div><div style="font-size:12.5px;margin-top:2px">'+esc(c.t2)+'</div></div></div>'+
    (replies?'<div style="background:rgba(0,0,0,.035);border-radius:10px;padding:7px 11px 8px;margin:7px 0 0 36px">'+replies+'</div>':'')+'</div>';
  }).join('')+'</div>'+
  (rc?'<div style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--blue-d);margin-top:10px;background:rgba(74,144,217,.08);border-radius:9px;padding:6px 10px"><span>正在回复 <b>'+esc(rc.to)+'</b></span><span style="cursor:pointer;color:#B4BDC8;margin-left:auto" onclick="cancelReply()">取消 ×</span></div>':'')+
  '<div style="display:flex;gap:8px;margin-top:10px"><input class="input" id="cmtIn" placeholder="'+(rc?'回复 '+esc(rc.to)+'：':'友善评论，社区更温暖~')+'" onkeydown="if(event.key===\'Enter\')addCmt()"><button class="btn btn-sm" style="flex:none" onclick="addCmt()">发送</button></div>');
}
function startReply(i,to){
  const po=S.posts.find(p=>p.id===window._pid);if(!po)return;
  const c=po.cmts[i];if(!c||c.del){toast('原评论不可回复');return}
  window._replyCmt={pid:window._pid,i:i,to:to||c.u};
  openPost(window._pid);
  setTimeout(()=>{const inp=$('cmtIn');if(inp)inp.focus()},80);
}
function cancelReply(){window._replyCmt=null;openPost(window._pid)}
function addCmt(){
  const v=$('cmtIn').value.trim();if(!v){toast('评论不能为空');return}
  const po=S.posts.find(p=>p.id===window._pid);
  const rc=window._replyCmt;
  if(rc&&rc.pid===window._pid){
    const c=po.cmts[rc.i];
    if(!c||c.del){window._replyCmt=null;openPost(window._pid);toast('原评论已删除');return}
    c.replies=c.replies||[];
    c.replies.push({u:S.user.nick,to:rc.to,t2:v,ts:Date.now()});
    window._replyCmt=null;save();openPost(window._pid);addPts(3,'互动-回复');toast('回复成功');
  }else{
    po.cmts.push({u:S.user.nick,t2:v,ts:Date.now(),del:false,replies:[]});
    save();openPost(window._pid);addPts(3,'互动-评论');toast('评论成功');
  }
}
function delCmt(pid,i){
  const po=S.posts.find(p=>p.id===pid);const c=po.cmts[i];
  confirmDlg('删除评论','删除该评论及其下 '+((c.replies||[]).length)+' 条回复，楼层位置将显示「该评论已删除」占位','删除',()=>{c.del=true;save();openPost(pid);toast('已删除，占位将保留至下次刷新')},'danger');
}
function delReply(pid,i,ri){
  const po=S.posts.find(p=>p.id===pid);
  po.cmts[i].replies.splice(ri,1);save();openPost(pid);toast('已删除该条回复');
}
/* ---- 发布页（V1.5：文字/图文/视频三种类型，时间序列朋友圈式） ---- */
let pubImg='',pubMedia='图文',pubZone='推荐',pubVid=false;
function renderPublish(){
  const p=curPet();
  const sampleImgs=['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop','https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop','https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=300&fit=crop'];
  $('publish-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'community\')"><use href="#i-back"/></svg><b style="font-size:15px">发布笔记</b><span style="margin-left:auto"></span></div>'+
  '<div style="padding:16px">'+
  '<div style="display:flex;gap:8px;margin-bottom:12px">'+['推荐','狗区','猫区','鸟区','异宠区'].map(z=>'<button class="rTab zoneT'+(z===pubZone?' act':'')+'" onclick="document.querySelectorAll(\'#pg-publish .zoneT\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');pubZone=\''+z+'\'">'+z+'</button>').join('')+'</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center"><span style="font-size:11px;color:var(--sub);flex:none">内容类型</span>'+['文字','图文','视频'].map(m=>'<button class="rTab mediaT'+(m===pubMedia?' act':'')+'" onclick="document.querySelectorAll(\'#pg-publish .mediaT\').forEach(b=>b.classList.remove(\'act\'));this.classList.add(\'act\');pubMedia=\''+m+'\';renderPublish()">'+m+'</button>').join('')+'</div>'+
  '<input class="input" id="pubTitle" placeholder="标题（AI可帮写）" style="margin-bottom:10px">'+
  '<textarea class="input" id="pubTxt" rows="5" placeholder="分享你和毛孩子的日常…" style="margin-bottom:10px;resize:none"></textarea>'+
  (pubMedia==='文字'?'<div style="font-size:11px;color:#A8B2BE;margin-bottom:12px">纯文字帖子：适合求助、科普与日常碎碎念</div>':
  '<div style="font-size:12px;color:var(--sub);margin-bottom:8px">'+(pubMedia==='视频'?'选择视频（演示示例视频）':'配图')+'</div>'+
  '<div style="display:flex;gap:8px;margin-bottom:14px"><div id="pubImgBox" onclick="pickPubImg()" style="position:relative;width:84px;height:84px;border-radius:14px;border:1.5px dashed rgba(58,123,213,.4);display:flex;align-items:center;justify-content:center;color:#8FA8C9;cursor:pointer;background:rgba(255,255,255,.4);overflow:hidden">'+(pubImg?'<img src="'+pubImg+'" style="width:100%;height:100%;object-fit:cover">'+(pubMedia==='视频'?'<span class="vplay" style="width:30px;height:30px"><svg class="icon" style="width:12px;height:12px;color:#fff;margin-left:1px"><use href="#i-play"/></svg></span><span class="vdur">'+(window._pubDur||'00:45')+'</span>':''):'<svg class="icon icon-l"><use href="#i-plus"/></svg>')+'</div><div style="font-size:10.5px;color:var(--sub);align-self:flex-end">'+(pubMedia==='视频'?'从示例视频库选择，发布后展示播放封面':'从示例图库选择')+'</div></div>')+
  '<div class="card" style="padding:11px 14px;display:flex;align-items:center;gap:9px;margin-bottom:14px;cursor:pointer" onclick="aiWrite()"><div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#8FB6EE,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div><div style="flex:1"><b style="font-size:13px">AI 帮我写</b><div style="font-size:10.5px;color:var(--sub)">基于'+p.name+'的档案生成标题与文案草稿</div></div><svg class="icon icon-s" style="color:#B9C4D2"><use href="#i-right"/></svg></div>'+
  '<button class="btn" onclick="pubSubmit()">发布（先审后发，≤5s）</button>'+
  '<div style="font-size:10.5px;color:#A8B2BE;text-align:center;margin-top:10px">发布成功 +20积分（每日上限与互动同池）· 人宠世界成长值+10 · 内容经机审通过后展示</div>'+
  '</div>';
}
function pickPubImg(){
  if(pubMedia==='视频'){
    const vids=[['https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=400&fit=crop','00:45'],['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop','01:20']];
    openSheet('选择示例视频','<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px">'+vids.map(v=>'<div style="position:relative;height:110px;border-radius:14px;overflow:hidden;cursor:pointer" onclick="pubImg=\''+v[0]+'\';window._pubDur=\''+v[1]+'\';pubVid=true;closeSheet();renderPublish()"><img src="'+v[0]+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"><span class="vplay" style="width:34px;height:34px"><svg class="icon icon-s" style="color:#fff;margin-left:2px"><use href="#i-play"/></svg></span><span class="vdur">'+v[1]+'</span></div>').join('')+'</div>');
    return;
  }
  const sampleImgs=['https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=300&fit=crop','https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop','https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=300&fit=crop','https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop'];
  openSheet('选择配图','<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:9px">'+sampleImgs.map(im=>'<div style="height:110px;border-radius:14px;overflow:hidden;cursor:pointer" onclick="pubImg=\''+im+'\';pubVid=false;closeSheet();renderPublish()"><img src="'+im+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>').join('')+'</div>');
}
function aiWrite(){
  const p=curPet();
  openModal('<div style="text-align:center;padding:6px 0"><div class="spin" style="border-color:rgba(58,123,213,.25);border-top-color:var(--blue-d)"></div><div style="font-size:12.5px;color:var(--sub);margin-top:12px">AI 正在结合「'+p.name+'」的档案生成草稿…</div></div>');
  setTimeout(()=>{
    closeModal();
    $('pubTitle').value='谁家的猫这么黏人？哦，是我的';
    $('pubTxt').value='养'+p.breed+'的日常就是：下班进门一秒被扑倒，写稿时键盘上长猫，睡觉时胸口压着一只'+p.weight+'kg的「暖宝宝」。'+p.name+'不会说话，但我知道，它把我当成了全世界。\n\n—— 由AI帮写生成，发布前可编辑';
    toast('草稿已生成，编辑后即可发布');
  },1200);
}
function pubSubmit(){
  const t=$('pubTitle').value.trim(),x=$('pubTxt').value.trim();
  if(!t||!x){toast('标题和正文都要填哦');return}
  if(pubMedia!=='文字'&&!pubImg){toast(pubMedia==='视频'?'请选择一段示例视频':'请至少选择一张配图');return}
  if(!needNet())return;
  S.posts.unshift({id:uid(),zone:pubZone||'推荐',auth:S.user.nick,authImg:S.user.avatar,time:Date.now(),title:t,txt:x,img:pubImg||(pubMedia==='视频'?'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=400&fit=crop':'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=400&fit=crop'),likes:0,cmts:[],favs:0,media:pubMedia,dur:window._pubDur||'00:45',ip:S.user.ip||'北京'});
  addPts(20,'社区发帖');addWorldGrowth(10,'社区发帖');save();pubImg='';pubVid=false;window._pubDur='00:45';
  toast('审核通过，发布成功（+20积分 · 成长值+10）');
  comZone='推荐';go('community');
}
