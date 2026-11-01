import { registerActions } from './../app/actions.js';
import { today } from './../app/clock.js';
import { $, esc, mdToHtml, uid } from './../app/dom.js';
import { go } from './../app/router.js';
import { S, save } from './../app/store.js';
import { openSheet, toast } from './../app/ui.js';
import { curPet, petAge } from './pets.js';
import { formatRelativeTime } from './../app/format.js';
import { shopPicks } from './mall.js';
import { needNet } from './../app/shell.js';
import { registerPage } from './../app/router.js';
import { closeSheet } from './../app/ui.js';
import * as llm from './../app/llm.js';
import { AI_SCENES, isRiskQuestion, isEmergency, buildSystemPrompt, composeMessages, sceneOf } from './../domain/ai-prompt.js';
import { localGreeting, localRefusal } from './../domain/ai-local.js';
/* 九大场景定义在 domain/ai-prompt.js（接真模型时也只有这一份） */
const SCENES = AI_SCENES;
const scn = sceneOf;
function ctxPet(){return S.set.context?curPet():null}
function ctxTag(){const p=ctxPet();if(!p)return '<span class="chip" style="background:rgba(0,0,0,.06);color:#8A99AB;cursor:pointer" onclick="app.toggleCtx()"><svg class="icon icon-s"><use href="#i-x"/></svg>通用模式（未注入档案）</span>';return '<span class="chip" style="cursor:pointer" onclick="app.toggleCtx()" title="点击切换上下文开关"><svg class="icon icon-s"><use href="#i-paw"/></svg>已注入档案：'+p.name+' · '+p.breed+' · '+petAge(p)+' · '+p.weight+'kg</span>'}
function toggleCtx(){S.set.context=!S.set.context;save();if($('ctxChip'))$('ctxChip').innerHTML=ctxTag();if($('pg-ai').classList.contains('on'))renderAI();toast(S.set.context?'已开启档案上下文注入':'已切换通用模式')}

/* V1.5 豆包式聊天布局：进入AI页默认底部输入框，欢迎页+快捷提问+场景chips */
const SYMS=['呕吐','拉稀','皮肤病','泪痕','关节不适','食欲不振','打喷嚏'];
export function renderAI(){
  const p=curPet();
  const dq=(S.dailyQKey===today())||!S.set.dailyQ;
  const active=CH.active&&CH.sess;
  $('ai-body').innerHTML=
  '<div style="flex:none;display:flex;align-items:center;gap:9px;padding:8px 16px;border-bottom:1px solid rgba(255,255,255,.5)">'+
    '<div style="width:34px;height:34px;border-radius:12px;background:linear-gradient(135deg,#6FA6F0,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div>'+
    '<div style="flex:1;min-width:0"><div style="font-size:14.5px;font-weight:900;line-height:1.2">AI 宠物助手</div><div style="font-size:9px;color:var(--sub);margin-top:1px">大模型驱动 · 九大场景随问随答</div></div>'+
    '<svg class="icon" style="cursor:pointer;color:#7C8CA0" onclick="app.openSessions()"><use href="#i-clock"/></svg>'+
    '<svg class="icon" style="cursor:pointer;color:#7C8CA0" onclick="app.aiNewChat()"><use href="#i-plus"/></svg>'+
  '</div>'+
  '<div id="chatMsgs" style="flex:1;min-height:0;overflow-y:auto;padding:12px 16px 6px;scrollbar-width:none"></div>'+
  '<div id="emgBar" style="flex:none;padding:0 16px"></div>'+
  '<div style="flex:none;padding:7px 14px 92px;background:rgba(255,255,255,.62);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.7)">'+
    '<div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px">'+SCENES.map(s=>'<button class="scene-pill'+(s.id===CH.scene?' act':'')+'" onclick="app.switchScene(\''+s.id+'\')"><svg class="icon icon-s" style="color:'+(s.id===CH.scene?'#fff':s.c)+'"><use href="#'+s.i+'"/></svg><span>'+s.n+'</span></button>').join('')+'</div>'+
    (CH.scene==='ask'?'<div style="display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;margin-bottom:8px">'+SYMS.map(s=>'<button class="scene-pill" style="padding:5px 11px;font-size:11px;background:rgba(240,91,91,.07);border-color:rgba(240,91,91,.28)" onclick="app.symTap(\''+s+'\')"><span>'+s+'</span></button>').join('')+'</div>':'')+
    '<div style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.85);border-radius:22px;padding:5px 5px 5px 7px;border:1px solid rgba(255,255,255,.75);box-shadow:0 4px 16px rgba(58,123,213,.1)">'+
      '<button id="micBtn" onclick="app.voiceIn()"><svg class="icon icon-s"><use href="#i-mic"/></svg></button>'+
      '<input id="chatIn" placeholder="向AI提问，或点击上方标签快速输入…" onkeydown="if(event.key===\'Enter\')app.sendMsg()" style="flex:1;min-width:0;border:none;outline:none;background:transparent;padding:9px 6px;font-size:13.5px;color:var(--ink)">'+
      '<button id="sendBtn" style="width:38px;height:38px;border-radius:50%;border:none;cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#5B8DEF,#3A7BD5);color:#fff;box-shadow:0 6px 14px rgba(58,123,213,.4)" onclick="app.sendMsg()"><svg class="icon icon-s"><use href="#i-send"/></svg></button>'+
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
  (dq?'':'<div class="card chov" style="padding:12px 14px;margin-top:12px;position:relative;cursor:pointer" onclick="app.askDQ()"><div style="position:absolute;top:10px;right:12px;cursor:pointer;color:#B9C4D2" onclick="app.dismissDailyQuestion()"><svg class="icon icon-s"><use href="#i-x"/></svg></div><div style="display:flex;gap:10px;align-items:center"><div style="width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,#6FA6F0,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="width:16px;height:16px;color:#fff"><use href="#i-spark"/></svg></div><div><div style="font-weight:800;font-size:13px">每日一问</div><div style="font-size:11.5px;color:var(--sub);margin-top:2px">'+p.name+'最近总是凌晨跑酷，是白天睡多了吗？</div></div></div></div>')+
  '<div style="font-weight:800;font-size:13px;margin:14px 2px 8px">猜你想问 <span style="font-size:10px;color:var(--sub);font-weight:500">点击直接提问</span></div>'+
  QS.map(q=>{const sc=scn(q[0]);return '<div class="card chov" style="padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;gap:9px;cursor:pointer" onclick="app.quickAsk(\''+q[0]+'\',\''+q[1]+'\')"><div style="width:30px;height:30px;border-radius:10px;background:'+sc.c+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+sc.c+'"><use href="#'+sc.i+'"/></svg></div><div style="flex:1;font-size:12px;color:#444;line-height:1.5">'+q[1]+'</div><svg class="icon icon-s" style="color:#C9D2DD;flex:none"><use href="#i-right"/></svg></div>'}).join('')+
  '<div style="font-weight:800;font-size:13px;margin:12px 2px 8px">九大场景</div>'+
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">'+SCENES.map(s=>'<div class="card chov" style="padding:10px 4px;text-align:center;cursor:pointer" onclick="app.openChat(\''+s.id+'\')"><div style="width:36px;height:36px;border-radius:12px;background:'+s.c+'1d;margin:0 auto 6px;display:flex;align-items:center;justify-content:center"><svg class="icon icon-s" style="color:'+s.c+'"><use href="#'+s.i+'"/></svg></div><div style="font-size:10.5px;font-weight:700">'+s.n+'</div><div style="font-size:8.5px;color:var(--sub);margin-top:1px">'+s.d+'</div></div>').join('')+'</div>'+
  (recent.length?'<div style="font-weight:800;font-size:13px;margin:14px 2px 8px;display:flex;justify-content:space-between;align-items:center">最近会话 <span style="font-size:10.5px;color:var(--blue-d);cursor:pointer;font-weight:700" onclick="app.openSessions()">全部 ›</span></div>'+recent.map(ss=>'<div class="card chov" style="padding:10px 12px;margin-bottom:7px;cursor:pointer;display:flex;align-items:center;gap:9px" onclick="app.openSess(\''+ss.id+'\')"><div style="width:30px;height:30px;border-radius:10px;background:'+scn(ss.scene).c+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+scn(ss.scene).c+'"><use href="#'+scn(ss.scene).i+'"/></svg></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.title||scn(ss.scene).n)+'</div><div style="font-size:10px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.last||'')+'</div></div><span style="font-size:9.5px;color:var(--sub);flex:none">'+formatRelativeTime(ss.ts)+'</span></div>').join(''):'')+
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
function aiGreet(scene){return localGreeting(scene,ctxPet())}
function symTap(s){
  const i=$('chatIn');if(!i)return;
  const p=ctxPet();
  i.value='我家'+(p?p.name:'宠物')+'出现「'+s+'」症状，持续约2小时，精神状态一般，请帮我分析可能原因、居家护理方法和就医指征';
  i.focus();
  toast('已填入症状模板，可修改持续时间后发送');
}
function voiceIn(){
  const b=$('micBtn');if(!b||ui.voiceBusy)return;ui.voiceBusy=true;
  b.classList.add('rec');
  toast('正在聆听…');
  setTimeout(()=>{
    b.classList.remove('rec');ui.voiceBusy=false;
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
  (list.length?list.map(ss=>'<div style="display:flex;align-items:center;gap:10px;padding:11px 4px;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer" onclick="app.closeSheet();app.openSess(\''+ss.id+'\')"><div style="width:34px;height:34px;border-radius:11px;background:'+scn(ss.scene).c+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+scn(ss.scene).c+'"><use href="#'+scn(ss.scene).i+'"/></svg></div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.title||scn(ss.scene).n)+' <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:'+scn(ss.scene).c+'1a;color:'+scn(ss.scene).c+'">'+scn(ss.scene).n+'</span></div><div style="font-size:11px;color:var(--sub);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ss.last||'点击继续会话')+'</div></div><div style="text-align:right;flex:none"><div style="font-size:10px;color:var(--sub)">'+formatRelativeTime(ss.ts)+'</div>'+(ss.gen?'<div style="font-size:9px;color:#E8A23A;font-weight:700">生成中</div>':'')+'</div></div>').join(''):'<div style="text-align:center;color:var(--sub);font-size:12.5px;padding:30px 0">暂无历史会话</div>')+
  (list.length?'<button class="btn btn-ghost" style="margin-top:14px" onclick="app.clearAllSessions()">清空会话</button>':''));
}

/* ---- 对话状态（V1.5：AI主Tab即聊天页） ---- */
let CH={sess:null,scene:'ask',msgs:[],stream:null,emgShown:false,active:false,abort:null};
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
  openSheet('切换AI场景',SCENES.map(s=>'<div style="display:flex;align-items:center;gap:12px;padding:11px 6px;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer;'+(s.id===CH.scene?'font-weight:800':'')+'" onclick="app.closeSheet();app.switchScene(\''+s.id+'\')"><div style="width:36px;height:36px;border-radius:12px;background:'+s.c+'1c;display:flex;align-items:center;justify-content:center"><svg class="icon icon-s" style="color:'+s.c+'"><use href="#'+s.i+'"/></svg></div><div style="flex:1"><div style="font-size:13.5px">'+s.n+(s.id===CH.scene?' <span class="chip" style="font-size:9px;padding:2px 7px">当前</span>':'')+'</div><div style="font-size:10.5px;color:var(--sub)">'+s.d+'</div></div></div>').join(''));
}
function sceneTpl(){const tips={ask:'例如：'+curPet().name+'今天呕吐了两次怎么办？',care:'例如：多久给'+curPet().name+'洗一次澡合适？',feed:'例如：'+curPet().name+'每天应该喂多少克？',watch:'例如：帮我看看监控里'+curPet().name+'在干嘛',attr:'例如：这周体重涨了是正常的吗',shop:'例如：推荐适合'+curPet().name+'的猫粮',write:'例如：帮我写一条晒'+curPet().name+'的帖子',trip:'例如：周末带'+curPet().name+'去大理两日游怎么安排',doll:'例如：想给'+curPet().name+'定制玩偶，选什么尺寸'};$('chatIn').placeholder=tips[CH.scene]}
function renderMsgs(){
  const box=$('chatMsgs');if(!box)return;
  box.innerHTML=CH.msgs.map(m=>{
    if(m.r==='me')return '<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><div style="max-width:78%;background:linear-gradient(135deg,#5B8DEF,#3A7BD5);color:#fff;padding:10px 14px;border-radius:16px 16px 4px 16px;font-size:13.5px;line-height:1.6">'+esc(m.t)+'</div></div>';
    if(m.r==='cards')return '<div class="msg-ai" style="margin:0 0 12px 38px"><div style="font-size:11px;color:var(--sub);margin-bottom:6px">结合档案为你挑选，可直接下单：</div>'+m.items.map(it=>'<div class="card" style="display:flex;gap:9px;padding:9px;margin-bottom:8px;align-items:center"><div style="width:44px;height:44px;border-radius:11px;overflow:hidden;flex:none"><img src="'+it.img+'" style="width:100%;height:100%;object-fit:cover" onerror="app.imgErr(this)"></div><div style="flex:1;min-width:0"><div style="font-size:11.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+it.name+'</div><div style="color:var(--danger);font-weight:800;font-size:12.5px;margin-top:1px">¥'+it.price+'</div></div><div style="display:flex;flex-direction:column;gap:4px;flex:none"><button class="btn btn-sm btn-ghost" style="padding:3px 10px;font-size:10.5px" onclick="app.addCartById(\''+it.id+'\')">加购</button><button class="btn btn-sm" style="padding:3px 10px;font-size:10.5px" onclick="app.quickBuy(\''+it.id+'\')">购买</button></div></div>').join('')+'</div>';
    if(m.emg)return '<div class="emg" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:7px;color:#D94343;font-weight:900;font-size:14px"><svg class="icon"><use href="#i-alert"/></svg>急诊提示</div><div style="font-size:12.5px;line-height:1.7;margin-top:6px">'+m.t+'</div></div>';
    const fb=m.fb!==undefined?'<div style="display:flex;gap:14px;margin-top:8px;align-items:center"><span style="font-size:10.5px;color:var(--sub)">'+(m.stop?'已停止生成':'这条回答有帮助吗')+'</span><span style="cursor:pointer" onclick="app.fbMsg(\''+m.id+'\',1)"><svg class="icon icon-s" style="color:'+(m.fb===1?'#4CA876':'#B9C4D2')+'"><use href="#i-heart"/></svg></span><span style="cursor:pointer" onclick="app.fbMsg(\''+m.id+'\',0)"><svg class="icon icon-s" style="color:'+(m.fb===0?'#F05B5B':'#B9C4D2')+'"><use href="#i-x"/></svg></span>'+(m.fb===0?'<span class="chip" style="font-size:9px">已归档badcase，可继续追问</span>':'')+'</div>':'';
    const sceneTag='<span style="font-size:9px;padding:1px 7px;border-radius:6px;background:'+scn(CH.scene).c+'1a;color:'+scn(CH.scene).c+';margin-left:6px">'+scn(CH.scene).n+'</span>';
    return '<div class="msg-ai" style="display:flex;gap:8px;margin-bottom:12px"><div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#8FB6EE,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div><div style="max-width:82%"><div style="background:rgba(255,255,255,.75);padding:10px 13px;border-radius:4px 16px 16px 16px;font-size:13px;line-height:1.65" class="qTxt">'+mdToHtml(m.t)+(m.stop?'<span style="color:#A8B2BE;font-size:11px">（回答已停止）</span>':'')+'</div>'+fb+'</div></div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
}
function fbMsg(id,v){const m=CH.msgs.find(x=>x.id===id);if(!m)return;m.fb=v;CH.sess.msgs=CH.msgs;save();renderMsgs();if(v===0)toast('已记录反馈，将用于优化');if(v===1)toast('感谢反馈！')}
function sendMsg(){
  const inp=$('chatIn');const q=(inp&&inp.value||'').trim();
  if(!q){toast('请输入问题');return}
  if(!needNet())return;
  const ensureActive=()=>{if(!CH.active||!CH.sess){CH.sess=newChat(CH.scene);CH.msgs=CH.sess.msgs;CH.active=true}};
  if(isRiskQuestion(q)){
    ensureActive();
    CH.msgs.push({r:'me',t:q,ts:Date.now()});
    CH.msgs.push({r:'ai',id:uid(),t:localRefusal(ctxPet()),ts:Date.now()});
    if(!CH.sess.title)CH.sess.title=q.slice(0,15);
    saveSess();renderAI();const ni=$('chatIn');if(ni)ni.value='';return;
  }
  ensureActive();
  CH.msgs.push({r:'me',t:q,ts:Date.now()});
  if(!CH.sess.title)CH.sess.title=q.slice(0,15);
  CH.emgShown=false;
  renderAI();
  const ni=$('chatIn');if(ni)ni.value='';
  streamReply(q);
}
/**
 * 流式回复：数据来源是 app/llm.js 这个端口（现在是本地语料，将来换真模型只改端口）。
 * 视图只负责「把增量显示出来」，不关心内容从哪来。
 */
function streamReply(q){
  const m={r:'ai',id:uid(),t:'',ts:Date.now()};
  CH.msgs.push(m);
  const box=$('chatMsgs');
  box.insertAdjacentHTML('beforeend','<div id="streaming" style="display:flex;gap:8px;margin-bottom:12px"><div style="width:30px;height:30px;border-radius:10px;background:linear-gradient(135deg,#8FB6EE,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div><div style="max-width:82%"><div id="stTxt" style="background:rgba(255,255,255,.75);padding:10px 13px;border-radius:4px 16px 16px 16px;font-size:13px;line-height:1.65" class="qTxt"></div><div style="display:flex;justify-content:center;margin-top:6px"><button class="btn btn-sm btn-ghost" id="stopBtn" onclick="app.stopGen()"><svg class="icon icon-s"><use href="#i-stop"/></svg> 停止生成</button></div></div></div>');
  box.scrollTop=box.scrollHeight;
  $('sendBtn').disabled=true;

  const pet=ctxPet();
  const prompt=buildSystemPrompt(pet,CH.scene);
  const messages=composeMessages(CH.msgs.slice(0,-1),prompt);
  const ac=new AbortController();
  CH.abort=ac;

  llm.chat({
    pet,
    question:q,
    scene:CH.scene,
    prompt,
    messages,
    signal:ac.signal,
    onDelta:(delta)=>{
      m.t=delta;
      const st=$('stTxt');
      if(st){st.innerHTML=mdToHtml(delta)+'<span style="opacity:.4">▍</span>';box.scrollTop=box.scrollHeight;}
    },
  }).then((res)=>{
    CH.abort=null;
    m.t=res.text||m.t;
    if(res.reason==='emergency'){m.t='（内容已中止）';m.stop=false;showEmg();}
    else if(res.stopped){m.stop=true;}
    finishStream();
    if(CH.scene==='shop'&&!isEmergency(q)&&!res.stopped&&res.text){
      const picks=shopPicks();if(picks.length){CH.msgs.push({r:'cards',items:picks});saveSess();renderMsgs();}
    }
  }).catch(()=>{
    CH.abort=null;
    finishStream();
    toast('生成失败，请重试');
  });
}
function finishStream(){
  const el=$('streaming');if(el)el.remove();
  $('sendBtn').disabled=false;
  saveSess();renderMsgs();
}
function stopGen(){
  if(CH.abort){CH.abort.abort();CH.abort=null;}
  const m=CH.msgs[CH.msgs.length-1];
  if(m&&m.r==='ai'&&m.t)m.stop=true;
  finishStream();
  toast('已停止生成：已输出内容保留，不扣减重新生成次数');
}
function showEmg(){
  const p=ctxPet();
  CH.msgs.push({r:'ai',emg:true,t:'检测到「'+(p?p.name:'您的宠物')+'」可能存在急症风险（如持续呕吐/抽搐/误食），请立即联系宠物医院！<br>· 24h急诊：安安宠物医院 010-6400-8888<br>· 距离您 2.3km · 中山路42号<br>点击「我知道了」收起急诊引导。',ts:Date.now()});
  CH.emgShown=true;
  renderMsgs();
  $('emgBar').innerHTML='<div class="emg" style="display:flex;align-items:center;gap:8px;padding:10px 14px;margin-bottom:8px"><svg class="icon" style="color:#D94343"><use href="#i-alert"/></svg><span style="flex:1;font-size:11.5px;color:#D94343;font-weight:700">疑似急症！请尽快就医</span><button class="btn btn-sm" style="width:auto;padding:6px 12px;background:linear-gradient(135deg,#F05B5B,#D94343)" onclick="app.closeEmg()">我知道了</button></div>';
}
function closeEmg(){$('emgBar').innerHTML='';CH.emgShown=false}
function saveSess(){CH.sess.msgs=CH.msgs;CH.sess.last=CH.msgs.filter(m=>m.r==='me').slice(-1)[0]?.t||CH.msgs[CH.msgs.length-1]?.t||'';CH.sess.ts=Date.now();save()}

registerActions('ai', { aiNewChat, askDQ, closeEmg, fbMsg, openChat, openSess, openSessions, quickAsk, renderAI, sendMsg, stopGen, switchScene, symTap, toggleCtx, voiceIn });

/* ---------------- 页面登记 ---------------- */
registerPage('ai', { render: renderAI });

/** 关掉"每日一问"卡片：记下今天已答，重渲染 */
function dismissDailyQuestion() {
  S.dailyQKey = today();
  save();
  renderAI();
}

/** 清空全部历史会话 */
function clearAllSessions() {
  S.aiSess = [];
  save();
  closeSheet();
  renderAI();
  toast('已清空全部会话');
}

registerActions('ai-extra', { dismissDailyQuestion, clearAllSessions });
