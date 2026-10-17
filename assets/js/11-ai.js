/* ============ AI 助手 ============ */
const SCENES=[
  {id:'ask',n:'健康问诊',i:'i-med',c:'#F05B5B',d:'症状分析·就医建议'},
  {id:'care',n:'日常养护',i:'i-leaf',c:'#4CA876',d:'喂养洗护·行为习惯'},
  {id:'feed',n:'喂养计算器',i:'i-bowl',c:'#E8945A',d:'按档案算喂食量'},
  {id:'watch',n:'看护解读',i:'i-video',c:'#8B7DE8',d:'监控画面AI解读'},
  {id:'attr',n:'异常归因',i:'i-zap',c:'#E8A23A',d:'健康数据异常分析'},
  {id:'shop',n:'商品导购',i:'i-cart',c:'#3AB5C0',d:'结合档案推荐'},
  {id:'write',n:'发帖帮写',i:'i-edit',c:'#E8709A',d:'标题文案一键生成'},
  {id:'trip',n:'旅行规划',i:'i-pin',c:'#5B8DEF',d:'携宠行程·清单'},
  {id:'doll',n:'定制顾问',i:'i-gift',c:'#D9A03C',d:'玩偶尺寸·配饰'}
];
const scn=id=>SCENES.find(s=>s.id===id)||SCENES[0];
function ctxPet(){return S.set.context?curPet():null}
function ctxTag(){const p=ctxPet();if(!p)return '<span class="chip" style="background:rgba(0,0,0,.06);color:#8A99AB;cursor:pointer" onclick="toggleCtx()"><svg class="icon icon-s"><use href="#i-x"/></svg>通用模式（未注入档案）</span>';return '<span class="chip" style="cursor:pointer" onclick="toggleCtx()" title="点击切换上下文开关"><svg class="icon icon-s"><use href="#i-paw"/></svg>已注入档案：'+p.name+' · '+p.breed+' · '+petAge(p)+' · '+p.weight+'kg</span>'}
function toggleCtx(){S.set.context=!S.set.context;save();if($('ctxChip'))$('ctxChip').innerHTML=ctxTag();if($('pg-ai').classList.contains('on'))renderAI();toast(S.set.context?'已开启档案上下文注入':'已切换通用模式')}

/* V1.5 豆包式聊天布局：进入AI页默认底部输入框，欢迎页+快捷提问+场景chips */
const SYMS=['呕吐','拉稀','皮肤病','泪痕','关节不适','食欲不振','打喷嚏'];
function renderAI(){
  const p=curPet();
  const dq=(S.dailyQKey===today())||!S.set.dailyQ;
  const active=CH.active&&CH.sess;
  $('ai-body').innerHTML=
  '<div style="flex:none;display:flex;align-items:center;gap:9px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.5)">'+
    '<div style="width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#6FA6F0,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div>'+
    '<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:900;line-height:1.2">AI 宠物助手</div><div style="font-size:9px;color:var(--sub);margin-top:1px">大模型驱动 · 九大场景随问随答</div></div>'+
    '<svg class="icon" style="cursor:pointer;color:#7C8CA0" onclick="openSessions()"><use href="#i-clock"/></svg>'+
    '<svg class="icon" style="cursor:pointer;color:#7C8CA0" onclick="aiNewChat()"><use href="#i-plus"/></svg>'+
  '</div>'+
  '<div id="chatMsgs" style="flex:1;min-height:0;overflow-y:auto;padding:12px 16px 6px;scrollbar-width:none"></div>'+
  '<div id="emgBar" style="flex:none;padding:0 16px"></div>'+
  '<div style="flex:none;padding:7px 14px 92px;background:rgba(255,255,255,.62);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.7)">'+
    '<div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px">'+SCENES.map(s=>'<button class="scene-pill'+(s.id===CH.scene?' act':'')+'" onclick="switchScene(\''+s.id+'\')"><svg class="icon icon-s" style="color:'+(s.id===CH.scene?'#fff':s.c)+'"><use href="#'+s.i+'"/></svg><span>'+s.n+'</span></button>').join('')+'</div>'+
    (CH.scene==='ask'?'<div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px">'+SYMS.map(s=>'<button class="scene-pill" style="padding:5px 11px;font-size:11px;background:rgba(240,91,91,.07);border-color:rgba(240,91,91,.28)" onclick="symTap(\''+s+'\')"><span>'+s+'</span></button>').join('')+'</div>':'')+
    '<div style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.85);border-radius:22px;padding:5px 5px 5px 7px;border:1px solid rgba(255,255,255,.75);box-shadow:0 4px 16px rgba(58,123,213,.1)">'+
      '<button id="micBtn" onclick="voiceIn()"><svg class="icon icon-s"><use href="#i-mic"/></svg></button>'+
      '<input id="chatIn" placeholder="向AI提问，或点击上方标签快速输入…" onkeydown="if(event.key===\'Enter\')sendMsg()" style="flex:1;min-width:0;border:none;outline:none;background:transparent;padding:9px 6px;font-size:13.5px;color:var(--ink)">'+
      '<button id="sendBtn" style="width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#5B8DEF,#3A7BD5);color:#fff;box-shadow:0 6px 14px rgba(58,123,213,.4)" onclick="sendMsg()"><svg class="icon icon-s"><use href="#i-send"/></svg></button>'+
    '</div>'+
    '<div style="font-size:9px;color:#A8B2BE;margin-top:6px;text-align:center">内容由AI生成，仅供参考，不能替代兽医诊疗</div>'+
  '</div>';
  if(active)renderMsgs();else $('chatMsgs').innerHTML=welcomeInner(dq);
  sceneTpl();
}
function welcomeInner(dq){
  const p=curPet();
  const recent=S.aiSess.filter(s=>s.msgs.length>0).slice(0,3);
  const QS=[
    ['ask','我家'+p.name+'今天呕吐了两次，持续约2小时，需要就医吗？'],
    ['feed','按档案帮我算一下'+p.name+'每天该喂多少克'],
    ['attr','这周体重变化正常吗？帮我归因分析'],
    ['shop','结合档案和过敏史，推荐一款合适的猫粮'],
    ['write','帮我把'+p.name+'的日常写成一条社区帖子'],
    ['trip','周末带'+p.name+'周边一日游，帮我规划行程']
  ];
  return '<div style="text-align:center;padding:14px 0 4px" class="fadeUp">'+
  '<div style="width:62px;height:62px;margin:0 auto 10px;border-radius:22px;background:linear-gradient(135deg,#6FA6F0,#3A7BD5);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(58,123,213,.35)"><svg class="icon" style="width:30px;height:30px;color:#fff"><use href="#i-spark"/></svg></div>'+
  '<div style="font-size:18.5px;font-weight:900">你好，我是 AI 养宠助手</div>'+
  '<div style="font-size:11.5px;color:var(--sub);margin-top:6px">'+(ctxPet()?'已注入「'+ctxPet().name+'」的档案，回答更贴合它的实际情况':'通用模式：未注入档案')+'</div>'+
  '<div style="margin-top:8px">'+ctxTag()+'</div></div>'+
  (dq?'':'<div class="card chov" style="padding:12px 14px;margin-top:12px;position:relative;cursor:pointer" onclick="askDQ()"><div style="position:absolute;top:10px;right:12px;cursor:pointer;color:#B9C4D2" onclick="event.stopPropagation();S.dailyQKey=today();save();renderAI()"><svg class="icon icon-s"><use href="#i-x"/></svg></div><div style="display:flex;gap:10px;align-items:center"><div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#6FA6F0,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="width:16px;height:16px;color:#fff"><use href="#i-spark"/></svg></div><div><div style="font-weight:800;font-size:13px">每日一问</div><div style="font-size:11.5px;color:var(--sub);margin-top:2px">'+p.name+'最近总是凌晨跑酷，是白天睡多了吗？</div></div></div></div>')+
  '<div style="font-weight:800;font-size:13px;margin:14px 2px 8px">猜你想问 <span style="font-size:10px;color:var(--sub);font-weight:500">点击直接提问</span></div>'+
  QS.map(q=>{const sc=scn(q[0]);return '<div class="card chov" style="padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;gap:9px;cursor:pointer" onclick="quickAsk(\''+q[0]+'\',\''+q[1]+'\')"><div style="width:30px;height:30px;border-radius:10px;background:'+sc.c+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+sc.c+'"><use href="#'+sc.i+'"/></svg></div><div style="flex:1;font-size:12px;color:#444;line-height:1.5">'+q[1]+'</div><svg class="icon icon-s" style="color:#C9D2DD;flex:none"><use href="#i-right"/></svg></div>'}).join('')+
  '<div style="font-weight:800;font-size:13px;margin:12px 2px 8px">九大场景</div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+SCENES.map(s=>'<div class="card chov" style="padding:10px 4px;text-align:center;cursor:pointer" onclick="openChat(\''+s.id+'\')"><div style="width:36px;height:36px;border-radius:12px;background:'+s.c+'1d;margin:0 auto 6px;display:flex;align-items:center;justify-content:center"><svg class="icon icon-s" style="color:'+s.c+'"><use href="#'+s.i+'"/></svg></div><div style="font-size:10.5px;font-weight:700">'+s.n+'</div><div style="font-size:8.5px;color:var(--sub);margin-top:1px">'+s.d+'</div></div>').join('')+'</div>'+
  (recent.length?'<div style="font-weight:800;font-size:13px;margin:14px 2px 8px;display:flex;justify-content:space-between;align-items:center">最近会话 <span style="font-size:10.5px;color:var(--blue-d);cursor:pointer;font-weight:700" onclick="openSessions()">全部 ›</span></div>'+recent.map(ss=>'<div class="card chov" style="padding:10px 12px;margin-bottom:7px;cursor:pointer;display:flex;align-items:center;gap:9px" onclick="openSess(\''+ss.id+'\')"><div style="width:30px;height:30px;border-radius:10px;background:'+scn(ss.scene).c+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+scn(ss.scene).c+'"><use href="#'+scn(ss.scene).i+'"/></svg></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.title||scn(ss.scene).n)+'</div><div style="font-size:10px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.last||'')+'</div></div><span style="font-size:9.5px;color:var(--sub);flex:none">'+fmtTs(ss.ts)+'</span></div>').join(''):'')+
  '<div style="height:8px"></div>';
}
function quickAsk(id,pre){openChat(id,pre)}
function switchScene(id){
  if(CH.scene===id)return;
  CH.scene=id;
  let s=S.aiSess.find(x=>x.scene===id&&x.msgs.length===0);
  if(!s)s=newChat(id);
  CH.sess=s;CH.msgs=s.msgs;CH.active=false;CH.emgShown=false;
  save();renderAI();toast('已切换至「'+scn(id).n+'」');
}
function aiNewChat(){CH.sess=newChat(CH.scene);CH.msgs=CH.sess.msgs;CH.active=false;CH.emgShown=false;save();renderAI();toast('已开启新对话')}
function aiGreet(scene){return '你好！我是宠物数字管家AI助手，已进入「'+scn(scene).n+'」场景。'+(ctxPet()?'我已读取「'+curPet().name+'」的档案，会结合它的实际情况回答。':'当前为通用模式，可在设置中开启档案上下文。')+'有什么可以帮你？'}
function symTap(s){
  const i=$('chatIn');if(!i)return;
  const p=ctxPet();
  i.value='我家'+(p?p.name:'宠物')+'出现「'+s+'」症状，持续约2小时，精神状态一般，请帮我分析可能原因、居家护理方法和就医指征';
  i.focus();
  toast('已填入症状模板，可修改持续时间后发送');
}
function voiceIn(){
  const b=$('micBtn');if(!b||window._voiceBusy)return;window._voiceBusy=true;
  b.classList.add('rec');
  toast('正在聆听…');
  setTimeout(()=>{
    b.classList.remove('rec');window._voiceBusy=false;
    const p=ctxPet(),pn=p?p.name:'宠物';
    const T={ask:'我家'+pn+'今天呕吐了两次，持续大约两小时，精神还行，需要现在就医吗',care:'多久给'+pn+'洗一次澡比较合适',feed:pn+(p&&p.weight?'体重'+p.weight+'kg':'')+'，每天应该喂多少克',watch:'帮我看看监控里'+pn+'在干嘛',attr:'这周体重涨了，帮我分析一下原因',shop:'推荐一款适合'+pn+'的粮食，注意过敏忌口',write:'帮我写一条晒'+pn+'的社区帖子',trip:'周末带'+pn+'去周边一日游怎么安排',doll:'想给'+pn+'定制玩偶，选什么尺寸'};
    const i=$('chatIn');if(i){i.value=T[CH.scene]||T.ask;i.focus()}
    toast('语音识别完成（演示），可直接发送');
  },1300);
}
function askDQ(){openChat('care','我家猫最近总是凌晨跑酷，是白天睡多了吗？')}
function openSessions(){
  const list=S.aiSess.filter(s=>s.msgs.length>0);
  openSheet('会话记录',
  (list.length?list.map(ss=>'<div style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer" onclick="closeSheet();openSess(\''+ss.id+'\')"><div style="width:34px;height:34px;border-radius:11px;background:'+scn(ss.scene).c+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+scn(ss.scene).c+'"><use href="#'+scn(ss.scene).i+'"/></svg></div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.title||scn(ss.scene).n)+' <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:'+scn(ss.scene).c+'1a;color:'+scn(ss.scene).c+'">'+scn(ss.scene).n+'</span></div><div style="font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.last||'点击继续会话')+'</div></div><div style="text-align:right;flex:none"><div style="font-size:10px;color:var(--sub)">'+fmtTs(ss.ts)+'</div>'+(ss.gen?'<div style="font-size:9px;color:#E8A23A;font-weight:700">生成中</div>':'')+'</div></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12.5px;padding:30px 0">暂无历史会话</div>')+
  (list.length?'<button class="btn btn-ghost" style="margin-top:14px" onclick="S.aiSess=[];save();closeSheet();renderAI();toast(\'已清空全部会话\')">清空会话</button>':''));
}

/* ---- 对话状态（V1.5：AI主Tab即聊天页） ---- */
let CH={sess:null,scene:'ask',msgs:[],stream:null,emgShown:false,active:false};
function newChat(scene,pre){const s={id:uid(),scene,title:'',last:'',msgs:[],ts:Date.now()};S.aiSess.unshift(s);if(S.aiSess.length>50)S.aiSess.pop();return s}
function openChat(scene,pre){
  CH.scene=scene;
  let s=S.aiSess.find(x=>x.scene===scene&&x.msgs.length===0);
  if(!s)s=newChat(scene);
  CH.sess=s;CH.msgs=s.msgs;CH.active=true;CH.emgShown=false;
  if(!CH.msgs.length&&!pre){CH.msgs.push({r:'ai',t:aiGreet(scene),ts:Date.now()});if(!s.title)s.title=scn(scene).n}
  save();go('ai');
  if(pre){setTimeout(()=>{const i=$('chatIn');if(i){i.value=pre;sendMsg()}},420)}
}
function openSess(id){const s=S.aiSess.find(x=>x.id===id);if(!s)return;CH.sess=s;CH.scene=s.scene;CH.msgs=s.msgs;CH.emgShown=false;CH.active=true;if(s.gen){s.gen=false;save()}go('ai')}
function sceneSheet(){
  openSheet('切换AI场景',SCENES.map(s=>'<div style="display:flex;align-items:center;gap:12px;padding:11px 6px;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer;'+(s.id===CH.scene?'font-weight:800':'')+'" onclick="closeSheet();switchScene(\''+s.id+'\')"><div style="width:36px;height:36px;border-radius:12px;background:'+s.c+'1c;display:flex;align-items:center;justify-content:center"><svg class="icon icon-s" style="color:'+s.c+'"><use href="#'+s.i+'"/></svg></div><div style="flex:1"><div style="font-size:13.5px">'+s.n+(s.id===CH.scene?' <span class="chip" style="font-size:9px;padding:2px 7px">当前</span>':'')+'</div><div style="font-size:10.5px;color:var(--sub)">'+s.d+'</div></div></div>').join(''));
}
function sceneTpl(){const tips={ask:'例如：'+curPet().name+'今天呕吐了两次怎么办？',care:'例如：多久给'+curPet().name+'洗一次澡合适？',feed:'例如：'+curPet().name+'每天应该喂多少克？',watch:'例如：帮我看看监控里'+curPet().name+'在干嘛',attr:'例如：这周体重涨了是正常的吗',shop:'例如：推荐适合'+curPet().name+'的猫粮',write:'例如：帮我写一条晒'+curPet().name+'的帖子',trip:'例如：周末带'+curPet().name+'去大理两日游怎么安排',doll:'例如：想给'+curPet().name+'定制玩偶，选什么尺寸'};$('chatIn').placeholder=tips[CH.scene]}
function renderMsgs(){
  const box=$('chatMsgs');if(!box)return;
  box.innerHTML=CH.msgs.map(m=>{
    if(m.r==='me')return '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><div style="max-width:78%;background:linear-gradient(135deg,#5B8DEF,#3A7BD5);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;font-size:13.5px;line-height:1.6">'+esc(m.t)+'</div></div>';
    if(m.r==='cards')return '<div class="msg-ai" style="margin:0 0 12px 38px"><div style="font-size:11px;color:var(--sub);margin-bottom:6px">结合档案为你挑选，可直接下单：</div>'+m.items.map(it=>'<div class="card" style="display:flex;gap:9px;padding:9px;margin-bottom:8px;align-items:center"><div style="width:44px;height:44px;border-radius:11px;overflow:hidden;flex:none"><img src="'+it.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.name+'</div><div style="color:var(--danger);font-weight:800;font-size:12.5px;margin-top:1px">¥'+it.price+'</div></div><div style="display:flex;flex-direction:column;gap:4px;flex:none"><button class="btn btn-sm btn-ghost" style="padding:3px 10px;font-size:10.5px" onclick="addCartById(\''+it.id+'\')">加购</button><button class="btn btn-sm" style="padding:3px 10px;font-size:10.5px" onclick="quickBuy(\''+it.id+'\')">购买</button></div></div>').join('')+'</div>';
    if(m.emg)return '<div class="emg" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:7px;color:#D94343;font-weight:900;font-size:14px"><svg class="icon"><use href="#i-alert"/></svg>急诊提示</div><div style="font-size:12.5px;line-height:1.7;margin-top:6px">'+m.t+'</div></div>';
    const fb=m.fb!==undefined?'<div style="display:flex;gap:14px;margin-top:8px;align-items:center"><span style="font-size:10.5px;color:var(--sub)">'+(m.stop?'已停止生成':'这条回答有帮助吗')+'</span><span style="cursor:pointer" onclick="fbMsg(\''+m.id+'\',1)"><svg class="icon icon-s" style="color:'+(m.fb===1?'#4CA876':'#B9C4D2')+'"><use href="#i-heart"/></svg></span><span style="cursor:pointer" onclick="fbMsg(\''+m.id+'\',0)"><svg class="icon icon-s" style="color:'+(m.fb===0?'#F05B5B':'#B9C4D2')+'"><use href="#i-x"/></svg></span>'+(m.fb===0?'<span class="chip" style="font-size:9px">已归档badcase，可继续追问</span>':'')+'</div>':'';
    const sceneTag='<span style="font-size:9px;padding:1px 7px;border-radius:6px;background:'+scn(CH.scene).c+'1a;color:'+scn(CH.scene).c+';margin-left:6px">'+scn(CH.scene).n+'</span>';
    return '<div class="msg-ai" style="display:flex;gap:8px;margin-bottom:12px"><div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#8FB6EE,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div><div style="max-width:82%"><div style="background:rgba(255,255,255,.75);padding:10px 13px;border-radius:4px 16px 16px 16px;font-size:13px;line-height:1.65" class="qTxt">'+m.t+(m.stop?'<span style="color:#A8B2BE;font-size:11px">（回答已停止）</span>':'')+'</div>'+fb+'</div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
}
function fbMsg(id,v){const m=CH.msgs.find(x=>x.id===id);if(!m)return;m.fb=v;CH.sess.msgs=CH.msgs;save();renderMsgs();if(v===0)toast('已记录反馈，将用于优化');if(v===1)toast('感谢反馈！')}
const EMG_KW=['呕吐','抽搐','误食','中毒','呼吸困难','出血','昏迷','不省'];
const RISK_KW=['剂量','毫克','用量','药量','吃多少药'];
function aiReply(q){
  const p=ctxPet(),pn=p?p.name:'宠物',br=p?p.breed:'',age=p?petAge(p):'',w=p?p.weight:'';
  const gen=[
    '根据您提供的描述，初步判断属于常见情况，不用过度紧张。结合'+pn+'的档案（'+br+'，'+age+'，'+w+'kg），建议先居家观察24小时：保持环境安静、提供充足饮水、记录症状变化。如48小时内未缓解或出现精神萎靡、拒食拒水，请及时携带最近的健康记录就医。可以在「档案-健康记录」导出PDF供医生参考。',
    '结合'+pn+'的当前档案数据（体重'+w+'kg，处于标准区间），这个情况通常与日常习惯有关。建议：1）保持规律作息，减少环境应激；2）饮食维持七日不变，观察食欲与排便；3）每日在健康页打卡记录。若出现连续异常，我会自动生成归因分析报告，首页健康概览也会标红提醒。'
  ];
  const R={
    ask:'【可能原因】结合'+pn+'的情况（'+br+'，'+age+'），常见原因包括：进食过快、环境应激、轻微肠胃不适。\n【居家观察】1.禁食4-6小时观察精神状态；2.少量多次提供温水；3.记录发生频率与伴随表现。\n【就医信号】出现持续症状、精神萎靡、拒食超过24小时，请尽快就医。\n【提醒】以上为科普级参考，不能替代兽医面诊。',
    care:gen[Math.floor(Math.random()*gen.length)],
    feed:p?('根据档案计算：\n【基础热量】'+pn+'体重 '+w+'kg × '+('猫'===p.species?'60 kcal/kg（成猫系数）':'系数按体型 45-55 kcal/kg')+' ≈ '+Math.round(w*('猫'===p.species?60:50))+' kcal/天\n【换算克数】以主粮约3.5kcal/g计算 ≈ '+Math.round(w*('猫'===p.species?60:50)/3.5)+'g/天，分 2-3 餐\n【个性化调整】已考虑绝育状态：'+p.neuter+'，若活动量小可下调10%\n【过敏提示】档案标注：'+(p.note||'无已知过敏')+'，选粮请避开相关成分。'):'请先在档案中完善宠物体重信息，可获得精准计算。',
    watch:'【行为】画面中'+pn+'刚从猫爬架跳下，正在窗台附近缓慢踱步巡逻。\n【情绪】尾巴自然下垂摆动，耳朵朝前，整体情绪平稳偏好奇。\n【异常】未发现踱步异常或应激表现。当前时段活动量与近7日均值接近。建议保持监控，我会在异动时推送提醒。',
    attr:'【异常项】近7日体重曲线整体上行，'+pn+'从 5.10kg → '+w+'kg（+4.9%）。\n【可能归因】1.近期换粮热量偏高（档案显示10-10新增冻干零食）；2.绝育后代谢下降（档案：已绝育）；3.运动量偏少（活力值58）。\n【建议】将零食控制在15g/日以内，恢复每日15分钟逗猫互动；若4周内继续上升超过10%，建议体检排查。\n【联动】家园虚拟形象已同步「微胖」状态提示。',
    shop:('结合'+pn+'档案的推荐：\n1.【主粮】室内成猫粮 K36 —— 适合室内活动量，含膳食纤维排毛球，适配当前体重 '+w+'kg 的每日热量\n2.【饮水】智能饮水机 —— 档案显示饮水打卡正常，升级循环过滤可继续巩固\n3.【互动】逗猫棒套装 —— 档案活力值58偏低，建议每日互动15分钟提升活力\n【安全提示】已自动排除含牛肉成分商品（档案过敏史：'+(p&&p.note||'无')+'）。\n以上为AI推荐，仅供参考。点商品详情页可直接加购。'),
    write:'已为您生成草稿：\n【标题备选】\n1.《'+pn+'的一百种撒娇方式》\n2.《谁家的猫这么黏人？哦，是我的》\n3.《凌晨五点，我被'+pn+'踩醒的第N天》\n【正文草稿】\n养'+br+'的日常就是：下班进门一秒被扑倒，写稿时键盘上长猫，睡觉时胸口压着一只'+w+'kg的「暖宝宝」。它不会说话，但我知道，它把我当成了全世界。\n（生成内容需编辑确认后发布）',
    trip:'【行程规划】周末两日携宠 '+pn+' 大理行：\nD1 上午：驱车/高铁抵达，入住「宠物友好民宿」（档案提示：需提前报备体重'+w+'kg）\nD1 下午：洱海生态廊道慢行（牵绳），傍晚草地撒欢\nD2 上午：宠物友好咖啡店打卡，返程\n【携宠清单】便携水碗、常用药（续档案过敏提示）、疫苗本（档案显示猫三联在有效期内）、应急联系卡\n【提示】大理紫外线强，注意毛发防晒与补水。需要我导出清单到收藏吗？',
    doll:'【定制建议】为'+pn+'定制3D玩偶：\n【尺寸】档案体重'+w+'kg，建议 15cm 等比缩小款，还原度最佳\n【材质】短毛水晶绒（还原'+br+'毛色纹理）\n【配饰】推荐搭配迷你项圈+同款橘色围兜，与档案照片一致度更高\n【定稿提示】定稿后模型与配饰不可修改，请仔细确认360°预览效果。\n可在「定制专区」直接下单，订单将标记「定制」徽标。'
  };
  /* 症状标签命中：区分「居家可护理 / 必须就医」（PRD 模块二 5.3） */
  if(CH.scene==='ask'){
    const SYM_R=[
      ['呕吐','【可能原因】进食过快、换粮应激、毛球刺激（'+pn+'为'+br+'，'+age+'）。\n【居家可护理】✅ 禁食4-6小时（保留饮水）\n✅ 少量多次喂温水，观察是否再吐\n✅ 换粮遵循七日过渡法\n【禁忌事项】❌ 不要自行喂人用止吐药\n❌ 24小时内停喂零食与油腻食物\n【必须就医信号】⚠ 一日内呕吐≥3次、呕吐物带血/异物、伴随精神萎靡或腹痛，请立即就医。'],
      ['拉稀','【可能原因】饮食不当、受凉或轻度肠胃炎（'+br+'，'+age+'）。\n【居家可护理】✅ 保证饮水，可喂宠物益生菌\n✅ 换易消化食物观察24-48小时\n✅ 注意腹部保暖\n【禁忌事项】❌ 禁喂牛奶与高油食物\n❌ 不要盲目使用止泻药\n【必须就医信号】⚠ 便中带血、腹泻超过24小时、明显脱水（皮肤回弹差），请立即就医。'],
      ['皮肤病','【可能原因】过敏性皮炎、真菌/螨虫感染（'+br+'常见）。\n【居家可护理】✅ 佩戴伊丽莎白圈防止舔咬\n✅ 保持患处干燥，环境定期消毒\n【禁忌事项】❌ 不要使用人用皮肤药膏\n❌ 未确诊前不要频繁洗浴\n【必须就医信号】⚠ 大面积脱毛、皮肤破溃渗液、快速扩散，需皮肤镜检后对症用药。'],
      ['泪痕','【可能原因】鼻泪管偏短、饮食偏咸或轻度结膜炎（档案：曾有结膜炎史）。\n【居家可护理】✅ 每日用宠物湿巾轻柔清洁\n✅ 降低主粮盐分，修剪眼周毛发\n【禁忌事项】❌ 不要使用人用眼药水\n【必须就医信号】⚠ 分泌物变黄绿、眼睑红肿、频繁抓眼，请排查结膜/角膜问题。'],
      ['关节','【可能原因】运动损伤或体重偏大加重关节负担（当前'+w+'kg）。\n【居家可护理】✅ 控制体重，减少高处跳跃\n✅ 补充软骨素类保健品，铺设防滑垫\n【禁忌事项】❌ 急性肿痛期不要热敷按摩\n【必须就医信号】⚠ 持续跛行、拒碰患肢、关节肿胀，请拍片排查。'],
      ['食欲不振','【可能原因】天气变化、食物单一或轻微口腔不适。\n【居家可护理】✅ 观察24小时精神与饮水\n✅ 温粮加热提高气味诱食\n【禁忌事项】❌ 不要强行灌食\n【必须就医信号】⚠ 完全拒食超过24小时或伴黄疸/呕吐，立即就医。'],
      ['打喷嚏','【可能原因】粉尘刺激、温差着凉或上呼吸道早期感染（'+age+'）。\n【居家可护理】✅ 保暖、保持空气流通\n✅ 观察是否伴随眼部分泌物\n【禁忌事项】❌ 不要使用人用感冒药\n【必须就医信号】⚠ 脓性鼻涕、咳嗽或发烧，请尽快检测猫鼻支/杯状病毒。']
    ];
    const hit=SYM_R.find(s=>q.includes(s[0]));
    if(hit)return hit[1];
    return R.ask;
  }
  return R[CH.scene]||gen[0];
}
function sendMsg(){
  const inp=$('chatIn');const q=(inp&&inp.value||'').trim();
  if(!q){toast('请输入问题');return}
  if(!needNet())return;
  const ensureActive=()=>{if(!CH.active||!CH.sess){CH.sess=newChat(CH.scene);CH.msgs=CH.sess.msgs;CH.active=true}};
  if(RISK_KW.some(k=>q.includes(k))){
    ensureActive();
    CH.msgs.push({r:'me',t:q,ts:Date.now()});
    CH.msgs.push({r:'ai',id:uid(),t:'抱歉，涉及药品剂量的问题无法直接回答。药物使用剂量必须遵兽医处方，'+(ctxPet()?'请携带'+curPet().name+'的档案记录线下就医。':'请线下就医。'),ts:Date.now()});
    if(!CH.sess.title)CH.sess.title=q.slice(0,15);
    saveSess();renderAI();const ni=$('chatIn');if(ni)ni.value='';return;
  }
  ensureActive();
  CH.msgs.push({r:'me',t:q,ts:Date.now()});
  if(!CH.sess.title)CH.sess.title=q.slice(0,15);
  CH.emgShown=false;
  renderAI();
  const ni=$('chatIn');if(ni)ni.value='';
  const isEmg=EMG_KW.some(k=>q.includes(k));
  streamReply(q,isEmg);
}
function streamReply(q,isEmg){
  const m={r:'ai',id:uid(),t:'',ts:Date.now()};
  CH.msgs.push(m);
  const box=$('chatMsgs');
  box.insertAdjacentHTML('beforeend','<div id="streaming" style="display:flex;gap:8px;margin-bottom:12px"><div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#8FB6EE,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div><div style="max-width:82%"><div id="stTxt" style="background:rgba(255,255,255,.75);padding:10px 13px;border-radius:4px 16px 16px 16px;font-size:13px;line-height:1.65" class="qTxt"></div><div style="display:flex;justify-content:center;margin-top:6px"><button class="btn btn-sm btn-ghost" id="stopBtn" onclick="stopGen()"><svg class="icon icon-s"><use href="#i-stop"/></svg> 停止生成</button></div></div></div>');
  box.scrollTop=box.scrollHeight;
  $('sendBtn').disabled=true;
  const full=aiReply(q);
  let i=0;
  const abortAt=isEmg?Math.floor(full.length*0.18):-1;
  CH.stream=setInterval(()=>{
    i+=1+Math.floor(Math.random()*2);
    const st=$('stTxt');if(!st){clearInterval(CH.stream);return}
    if(abortAt>0&&i>=abortAt){
      clearInterval(CH.stream);CH.stream=null;
      m.t='（内容已中止）';m.stop=false;
      showEmg();
      finishStream();
      return;
    }
    if(i>=full.length){
      clearInterval(CH.stream);CH.stream=null;
      m.t=full;finishStream();
      if(CH.scene==='shop'&&!isEmg){const picks=shopPicks();if(picks.length){CH.msgs.push({r:'cards',items:picks});saveSess();renderMsgs()}}
      return;
    }
    st.innerHTML=esc(full.slice(0,i))+'<span style="opacity:.4">▍</span>';
    box.scrollTop=box.scrollHeight;
  },26);
}
function finishStream(){
  const el=$('streaming');if(el)el.remove();
  $('sendBtn').disabled=false;
  saveSess();renderMsgs();
}
function stopGen(){
  if(!CH.stream)return;
  clearInterval(CH.stream);CH.stream=null;
  const m=CH.msgs[CH.msgs.length-1];
  const st=$('stTxt');
  if(st&&st.textContent){m.t=esc2keep(st.textContent.replace('▍',''));}
  else m.t='（已停止）';
  m.stop=true;
  finishStream();
  toast('已停止生成：已输出内容保留，不扣减重新生成次数');
}
function esc2keep(s){return s}
function showEmg(){
  const p=ctxPet();
  CH.msgs.push({r:'ai',emg:true,t:'检测到「'+(p?p.name:'您的宠物')+'」可能存在急症风险（如持续呕吐/抽搐/误食），请立即联系宠物医院！<br>· 24h急诊：安安宠物医院 010-6400-8888<br>· 距离您 2.3km · 中山路42号<br>点击「我知道了」收起急诊引导。',ts:Date.now()});
  CH.emgShown=true;
  renderMsgs();
  $('emgBar').innerHTML='<div class="emg" style="display:flex;align-items:center;gap:8px;padding:10px 14px;margin-bottom:8px"><svg class="icon" style="color:#D94343"><use href="#i-alert"/></svg><span style="flex:1;font-size:11.5px;color:#D94343;font-weight:700">疑似急症！请尽快就医</span><button class="btn btn-sm" style="width:auto;padding:6px 12px;background:linear-gradient(135deg,#F05B5B,#D94343)" onclick="closeEmg()">我知道了</button></div>';
}
function closeEmg(){$('emgBar').innerHTML='';CH.emgShown=false}
function saveSess(){CH.sess.msgs=CH.msgs;CH.sess.last=CH.msgs.filter(m=>m.r==='me').slice(-1)[0]?.t||CH.msgs[CH.msgs.length-1]?.t||'';CH.sess.ts=Date.now();save()}
