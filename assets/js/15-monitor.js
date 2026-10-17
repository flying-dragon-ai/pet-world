/* ============ 智能监控（M3，V1.5补齐：收音/24h回看/引导页/萌系加载/AI预警） ============ */
let mon={dev:0,night:false,rec:false,fail:0,shots:0,mute:true};
const PB_SEGS=[{h:8,m:12,dur:5,evt:'宠物活动'},{h:12,m:30,dur:3,evt:'进食饮水'},{h:14,m:32,dur:8,evt:'剧烈跑动'},{h:19,m:4,dur:12,evt:'独处看家'}];
function renderMonitor(){
  const p=curPet();
  const DEVS=S.devices||[];
  if(!DEVS.length){
    $('monitor-body').innerHTML=
    '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">智能监控</b></div>'+
    '<div style="padding:60px 40px;text-align:center"><div style="width:96px;height:96px;margin:0 auto 16px;border-radius:32px;background:rgba(74,144,217,.1);display:flex;align-items:center;justify-content:center"><svg class="icon" style="width:44px;height:44px;color:var(--blue-d)"><use href="#i-camera"/></svg></div><div style="font-size:16px;font-weight:900">还没有绑定设备</div><div style="font-size:12px;color:var(--sub);margin:8px 0 18px;line-height:1.7">添加家用智能宠物摄像头后<br>即可随时查看毛孩子的实时状态</div><button class="btn" onclick="bindWizard()"><svg class="icon icon-s"><use href="#i-plus"/></svg>立即添加设备</button></div>';
    return;
  }
  if(mon.dev>=DEVS.length)mon.dev=0;
  $('monitor-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">智能监控</b><span style="margin-left:auto;font-size:11.5px;color:var(--blue-d);cursor:pointer;display:flex;align-items:center;gap:2px" onclick="devSheet()">'+DEVS[mon.dev]+' <svg class="icon icon-s"><use href="#i-down"/></svg></span></div>'+
  '<div style="padding:12px 16px">'+
  '<div id="liveBox" style="position:relative;height:230px;border-radius:22px;overflow:hidden;background:linear-gradient(160deg,#B8CFE8 0%,#D9E7F5 40%,#E8D9C4 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.5)">'+
    '<div id="liveScene" style="position:absolute;inset:0;transition:transform .4s ease">'+
      '<div style="position:absolute;left:8%;top:12%;width:26%;height:52%;background:rgba(255,255,255,.45);border-radius:8px"></div>'+
      '<div style="position:absolute;right:10%;top:20%;width:20%;height:10%;background:rgba(120,150,190,.35);border-radius:4px"></div>'+
      '<div style="position:absolute;right:14%;bottom:12%;width:34%;height:22%;background:rgba(210,190,160,.6);border-radius:10px"></div>'+
      '<div class="livepet" style="position:absolute;left:38%;bottom:8%">'+petSVG(p,86,'happy')+'</div>'+
    '</div>'+
    '<div style="position:absolute;top:10px;left:10px;display:flex;gap:6px;align-items:center"><span style="background:rgba(240,91,91,.9);color:#fff;font-size:10px;font-weight:800;padding:2px 8px;border-radius:6px;display:flex;align-items:center;gap:4px"><span style="width:6px;height:6px;border-radius:50%;background:#fff;animation:ty 1s infinite"></span>LIVE</span><span class="glass" style="font-size:10px;padding:2px 8px;border-radius:6px;color:#4A6285" id="liveClock">'+new Date().toLocaleTimeString()+'</span>'+(mon.mute?'<span class="glass" style="font-size:10px;padding:2px 8px;border-radius:6px;color:#8A99AB">🔇 已静音</span>':'<span class="glass" style="font-size:10px;padding:2px 8px;border-radius:6px;color:#3A9C6B">🔊 收音中</span>')+'</div>'+
    '<div id="liveOv" style="display:none;position:absolute;inset:0;background:rgba(40,55,80,.55);backdrop-filter:blur(2px);z-index:3"></div>'+
    '<div id="monLoad" style="position:absolute;inset:0;background:linear-gradient(160deg,#CFE0F2,#E8EFE7);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;z-index:6;transition:opacity .3s"><div style="width:56px;height:56px;animation:bob 1.5s ease-in-out infinite">'+petSVG(p,56,'happy')+'</div><div style="font-size:11.5px;color:#4A6285;font-weight:700">正在连接「'+DEVS[mon.dev]+'」…</div><div class="spin" style="width:20px;height:20px;border-width:2.5px;border-color:rgba(74,144,217,.25);border-top-color:#3A7BD5"></div></div>'+
  '</div>'+
  '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">'+
    '<button class="btn btn-sm btn-ghost" style="display:flex;align-items:center;gap:5px" onclick="shot()"><svg class="icon icon-s"><use href="#i-camera"/></svg>截图</button>'+
    '<button class="btn btn-sm btn-ghost" style="display:flex;align-items:center;gap:5px" id="recBtn" onclick="rec()"><svg class="icon icon-s"><use href="#i-video"/></svg>'+(mon.rec?'停止录制（60s上限）':'录制 60s')+'</button>'+
    '<button class="btn btn-sm btn-ghost" style="display:flex;align-items:center;gap:5px" onclick="mon.night=!mon.night;renderMonitor();toast(mon.night?\'夜视已开启\':\'夜视已关闭\')"><svg class="icon icon-s"><use href="#i-moon"/></svg>夜视</button>'+
    '<button class="btn btn-sm btn-ghost" style="display:flex;align-items:center;gap:5px" onclick="mon.mute=!mon.mute;renderMonitor();toast(mon.mute?\'已静音\':\'已开启收音，可远程听到宠物的声音\')"><svg class="icon icon-s"><use href="#i-mic"/></svg>'+(mon.mute?'已静音':'收音中')+'</button>'+
    '<button class="btn btn-sm btn-ghost" style="display:flex;align-items:center;gap:5px" onclick="toast(\'演示版暂不支持横屏全屏\')"><svg class="icon icon-s"><use href="#i-max"/></svg>全屏</button>'+
  '</div>'+
  '<div style="display:flex;gap:14px;align-items:center;margin-top:14px"><div style="display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:5px"><span></span><button class="btn btn-ghost" style="padding:0;width:44px" onclick="ptz(\'up\')">▲</button><span></span><button class="btn btn-ghost" style="padding:0;width:44px" onclick="ptz(\'left\')">◀</button><button class="btn btn-ghost" style="padding:0;width:44px;font-size:11px" onclick="ptz(\'c\')">回中</button><button class="btn btn-ghost" style="padding:0;width:44px" onclick="ptz(\'right\')">▶</button><span></span><button class="btn btn-ghost" style="padding:0;width:44px" onclick="ptz(\'down\')">▼</button><span></span></div><div style="font-size:10.5px;color:var(--sub);line-height:1.7;flex:1">云台点按 15°，长按连续<br>画面随云台移动</div><div style="flex:none"><button class="btn btn-sm" style="display:flex;align-items:center;gap:5px" onclick="aiWatch()" id="aiWatchBtn"><svg class="icon icon-s"><use href="#i-spark"/></svg>AI 解读</button></div></div>'+
  '<div id="aiWatchRes" style="margin-top:12px"></div>'+
  '<div style="display:flex;gap:8px;margin:14px 0 10px"><button class="btn btn-sm btn-ghost" style="flex:1" onclick="weakNet()">模拟弱网（重连成功）</button><button class="btn btn-sm btn-ghost" style="flex:1" onclick="deadNet()">模拟彻底断网</button></div>'+
  '<div style="font-weight:800;font-size:14px;margin:6px 0 8px;display:flex;justify-content:space-between;align-items:center">24小时回看 <span style="font-size:10.5px;color:var(--sub);font-weight:500">移动侦测录像 · 保留7天</span></div>'+
  '<div class="card" style="padding:12px 14px;margin-bottom:14px">'+
    '<div style="display:flex;align-items:flex-end;gap:2.5px;height:48px">'+Array.from({length:24},(_,h)=>{const seg=PB_SEGS.find(s=>s.h===h);const hh=seg?34:10+((h*7)%3)*4;return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer" onclick="tapHour('+h+')"><div style="width:100%;height:'+hh+'px;border-radius:3px;background:'+(seg?'linear-gradient(180deg,#5B8DEF,#3A7BD5)':'rgba(58,123,213,.14)')+'"></div><span style="font-size:7.5px;color:'+(seg?'var(--blue-d)':'#B4BDC8')+'">'+h+'</span></div>'}).join('')+'</div>'+
    '<div style="font-size:10px;color:var(--sub);margin-top:8px">今日已录制 '+PB_SEGS.length+' 段动静片段 · 点击蓝色柱形查看回放</div>'+
  '</div>'+
  '<div style="font-weight:800;font-size:14px;margin:6px 0 8px;display:flex;justify-content:space-between;align-items:center">异动事件流 <span style="display:flex;align-items:center;gap:8px"><span style="font-size:10px;color:var(--warn);font-weight:700;cursor:pointer" onclick="simAlert()">⚡模拟AI预警</span><span style="font-size:10.5px;color:var(--sub);font-weight:500">保留30天</span></span></div>'+
  '<div id="evtList">'+
  [['宠物剧烈跑动','14:32','客厅','从猫爬架跳下后快速跑动，触发中灵敏度告警','i-zap','#E8A23A'],
   ['长时间停留','11:18','客厅','窗台停留超过15分钟，情绪平稳','i-clock','#5B8DEF'],
   ['独处计时','昨天 19:04','客厅','无人状态持续2小时，宠物自主活动','i-moon','#8B7DE8']].map(e=>'<div class="card chov" style="padding:12px 14px;margin-bottom:8px;cursor:pointer;display:flex;gap:10px" onclick="evtSheet(\''+e[0]+'\',\''+e[1]+'\',\''+e[3]+'\')"><div style="width:34px;height:34px;border-radius:11px;background:'+e[5]+'1c;display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:'+e[5]+'"><use href="#'+e[4]+'"/></svg></div><div style="flex:1"><div style="font-size:12.5px;font-weight:700">'+e[0]+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:1px">'+e[1]+' · '+e[2]+'</div></div><svg class="icon icon-s" style="color:#C9D2DD;align-self:center"><use href="#i-right"/></svg></div>').join('')+
  '</div></div>';
  if(mon.night){$('liveScene').style.filter='brightness(.45) saturate(.5) hue-rotate(20deg)'}
  if(!window._monTick){window._monTick=setInterval(()=>{const c=$('liveClock');if(c)c.textContent=new Date().toLocaleTimeString()},1000)}
  setTimeout(()=>{const l=$('monLoad');if(l){l.style.opacity='0';setTimeout(()=>{if(l&&l.parentNode)l.remove()},320)}},950);
}
function tapHour(h){
  const seg=PB_SEGS.find(s=>s.h===h);
  if(seg)openPlayback(seg);
  else toast(h+':00-'+(h+1)+':00 无移动侦测录像');
}
function fmtMMSS(s){s=Math.max(0,Math.round(s));const f=x=>String(x).padStart(2,'0');return f(Math.floor(s/60))+':'+f(s%60)}
function pbClockStr(seg,t){const tot=seg.h*3600+seg.m*60+Math.floor(t);const f=x=>String(x).padStart(2,'0');return f(Math.floor(tot/3600))+':'+f(Math.floor(tot%3600/60))+':'+f(tot%60)}
function openPlayback(seg){
  const p=curPet();
  openModal(
  '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><b style="font-size:14.5px">回放 · '+fmtMMSS(seg.h*60+seg.m).replace(/^0/,'')+'</b><span class="chip">'+seg.evt+' · '+seg.dur+'分钟</span></div>'+
  '<div style="position:relative;height:190px;border-radius:16px;overflow:hidden;background:linear-gradient(160deg,#2E4A7A,#101828)">'+
    '<div style="position:absolute;inset:0;opacity:.5"><div style="position:absolute;left:8%;top:14%;width:26%;height:50%;background:rgba(255,255,255,.14);border-radius:8px"></div><div style="position:absolute;right:12%;bottom:10%;width:34%;height:22%;background:rgba(255,255,255,.1);border-radius:10px"></div></div>'+
    '<div style="position:absolute;left:50%;top:52%;transform:translateX(-50%)">'+petSVG(p,96,'happy')+'</div>'+
    '<span style="position:absolute;top:8px;left:10px;font-size:10px;color:#fff;background:rgba(0,0,0,.4);padding:2px 8px;border-radius:6px" id="pbClock">'+pbClockStr(seg,0)+'</span>'+
    '<span style="position:absolute;top:8px;right:10px;font-size:10px;color:#fff;background:rgba(58,123,213,.85);padding:2px 8px;border-radius:6px;font-weight:700">回放</span>'+
  '</div>'+
  '<div style="display:flex;align-items:center;gap:10px;margin-top:12px">'+
    '<button id="pbPlay" class="btn btn-sm" style="width:auto;padding:8px 13px" onclick="pbToggle()"><svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-stop"/></svg> 暂停</button>'+
    '<div style="flex:1;height:6px;border-radius:3px;background:rgba(58,123,213,.15);overflow:hidden"><div id="pbBar" style="height:100%;width:0%;background:linear-gradient(90deg,#6FA6F0,#3A7BD5)"></div></div>'+
    '<span id="pbLeft" style="font-size:10.5px;color:var(--sub);flex:none">'+fmtMMSS(seg.dur*60)+'</span>'+
  '</div>'+
  '<div style="display:flex;gap:6px;margin-top:10px">'+[0.5,1,2].map(sp=>'<button class="skuBtn pbSp'+(sp===1?' act':'')+'" style="flex:1;padding:6px" onclick="pbSpeed('+sp+',this)">'+sp+'x</button>').join('')+'</div>'+
  '<div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-sm btn-ghost" style="flex:1" onclick="closeModal();tabTo(\'ai\');openChat(\'watch\',\'帮我解读回放：'+seg.evt+'\')">AI 解读片段</button><button class="btn btn-ghost btn-sm" style="flex:1" onclick="pbClose();closeModal();toast(\'片段已保存至相册\')">保存片段</button></div>');
  window._pb={t:0,seg,sp:1,playing:true,tm:setInterval(pbTick,300)};
}
function pbTick(){
  const pb=window._pb;if(!pb||!pb.playing)return;
  const total=pb.seg.dur*60;
  pb.t+=total/40*pb.sp;
  if(pb.t>=total){pb.t=total;pb.playing=false;clearInterval(pb.tm);const b=$('pbPlay');if(b)b.innerHTML='<svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-play"/></svg> 重播'}
  const bar=$('pbBar');if(bar)bar.style.width=(pb.t/total*100)+'%';
  const left=$('pbLeft');if(left)left.textContent=fmtMMSS(total-pb.t);
  const clock=$('pbClock');if(clock)clock.textContent=pbClockStr(pb.seg,pb.t);
}
function pbToggle(){
  const pb=window._pb;if(!pb)return;
  const b=$('pbPlay');
  if(pb.playing){pb.playing=false;if(b)b.innerHTML='<svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-play"/></svg> 播放'}
  else{if(pb.t>=pb.seg.dur*60)pb.t=0;pb.playing=true;if(pb.tm)clearInterval(pb.tm);pb.tm=setInterval(pbTick,300);if(b)b.innerHTML='<svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-stop"/></svg> 暂停'}
}
function pbSpeed(sp,btn){
  const pb=window._pb;if(!pb)return;pb.sp=sp;
  document.querySelectorAll('.pbSp').forEach(b=>b.classList.remove('act'));btn.classList.add('act');
  toast('已切换至 '+sp+'x 倍速');
}
function pbClose(){const pb=window._pb;if(pb&&pb.tm)clearInterval(pb.tm);window._pb=null}
function simAlert(){
  if(!needNet())return;
  const DEVS=S.devices||[];
  S.msgs.unshift({id:uid(),cat:'系统',icon:'zap',title:'AI 异动预警',txt:(DEVS[mon.dev]||'客厅摄像头')+'检测到「宠物剧烈跑动」，AI分析：活跃度正常，无应激表现',ts:Date.now(),read:false,link:['monitor']});
  save();renderTabBadges();
  openModal('<div class="emg" style="border-color:rgba(245,166,35,.5);background:linear-gradient(135deg,rgba(245,166,35,.12),rgba(245,166,35,.05))"><div style="display:flex;align-items:center;gap:8px;color:#C77E12;font-weight:900;font-size:15px"><svg class="icon"><use href="#i-alert"/></svg>AI 异常预警</div><div style="font-size:12.5px;line-height:1.7;margin-top:8px;color:var(--ink)">'+(DEVS[mon.dev]||'客厅摄像头')+' 14:32 检测到「'+curPet().name+'剧烈跑动」<br>AI 归因：刚睡醒精力释放，活跃度与近7日均值一致，无需干预。<br>预警已推送至消息中心。</div><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-sm btn-ghost" style="flex:1" onclick="closeModal();go(\'messages\')">查看消息</button><button class="btn btn-sm" style="flex:1" onclick="closeModal()">知道了</button></div></div>');
}
function devSheet(){
  const DEVS=S.devices||['客厅摄像头','卧室摄像头'];
  openSheet('切换设备',DEVS.map((d,i)=>'<div style="display:flex;align-items:center;gap:10px;padding:12px 6px;border-bottom:1px solid rgba(0,0,0,.05);cursor:pointer'+(i===mon.dev?';font-weight:800':'')+'" onclick="mon.dev='+i+';closeSheet();renderMonitor();toast(\'已切换至\'+\''+d+'\')"><div style="width:44px;height:34px;border-radius:8px;background:linear-gradient(135deg,#B8CFE8,#E8D9C4);position:relative;flex:none"><span style="position:absolute;top:3px;left:3px;width:6px;height:6px;border-radius:50%;background:#3BB786"></span></div><div style="flex:1">'+d+(i===mon.dev?' <span class="chip" style="font-size:9px;padding:2px 7px">当前</span>':'')+'</div><span style="font-size:10.5px;color:#3BB786">在线</span></div>').join('')+'<div style="display:flex;align-items:center;gap:10px;padding:12px 6px;cursor:pointer;color:var(--blue-d)" onclick="closeSheet();bindWizard()"><svg class="icon"><use href="#i-plus"/></svg>添加设备</div>');
}
function ptz(dir){
  const sc=$('liveScene');if(!sc)return;
  const st=sc.style.transform||'translate(0,0)';
  let m=st.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);let x=0,y=0;
  if(m){x=+m[1];y=+m[2]}
  if(dir==='up')y-=10;if(dir==='down')y+=10;if(dir==='left')x-=10;if(dir==='right')x+=10;if(dir==='c'){x=0;y=0}
  sc.style.transform='translate('+Math.max(-40,Math.min(40,x))+'px,'+Math.max(-30,Math.min(30,y))+'px)';
}
function shot(){
  if(!needNet())return;
  mon.shots++;
  const lb=$('liveBox');
  lb.insertAdjacentHTML('beforeend','<div style="position:absolute;inset:0;background:#fff;z-index:5;animation:shotF .35s forwards"></div>');
  setTimeout(()=>{const f=lb.querySelector('[style*="shotF"],div[style*="z-index:5"]');if(f)f.remove()},380);
  toast('截图已保存至相册（带水印）');
}
function rec(){
  if(!needNet())return;
  mon.rec=!mon.rec;renderMonitor();
  toast(mon.rec?'开始录制，60s上限':'录制已停止，已保存至相册');
}
function aiWatch(){
  if(!needNet())return;
  const btn=$('aiWatchBtn');btn.disabled=true;btn.style.opacity=.6;
  const res=$('aiWatchRes');
  res.innerHTML='<div class="card" style="padding:14px;display:flex;gap:8px;align-items:center"><div class="typing" style="padding:0 4px"><i></i><i></i><i></i></div><span style="font-size:12px;color:var(--sub)">AI 正在识别画面…</span></div>';
  setTimeout(()=>{
    btn.disabled=false;btn.style.opacity=1;
    if(mon.fail>=0&&window._forceAiFail){
      mon.fail++;
      if(mon.fail>=3){res.innerHTML='<div class="card" style="padding:14px;font-size:12.5px;color:var(--sub)">连续3次识别失败，可稍后再试或直接问诊 <button class="btn btn-sm" style="margin-left:8px" onclick="tabTo(\'ai\');openChat(\'ask\',\'监控里'+curPet().name+'状态好像不对\')">继续问诊</button></div>';window._forceAiFail=false;mon.fail=0;return}
      res.innerHTML='<div class="card" style="padding:14px;font-size:12.5px;color:var(--sub)">识别失败：画面模糊，未检测到清晰宠物轮廓<button class="btn btn-sm btn-ghost" style="margin-left:8px" disabled id="retryAi" onclick="window._forceAiFail=true;aiWatch()">重新识别</button></div>';
      setTimeout(()=>{const b=$('retryAi');if(b)b.disabled=false},5000);
      toast('重新识别按钮已5秒防抖置灰');
      return;
    }
    mon.fail=0;
    res.innerHTML='<div class="card fadeUp" style="padding:14px"><div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-spark"/></svg><b style="font-size:13px">AI 看护解读</b><span class="chip" style="font-size:9px;margin-left:auto">≤5s返回</span></div>'+
    [['行为','画面中'+curPet().name+'刚从猫爬架跳下，正在窗台附近缓慢踱步巡逻，动作流畅。'],['情绪','尾巴自然下垂摆动，耳朵朝前，整体情绪平稳偏好奇。'],['异常','未发现跛行、喘息异常或应激表现。当前活动量与近7日均值接近。']].map(s=>'<div style="display:flex;gap:8px;margin-bottom:7px"><span style="flex:none;font-size:10px;font-weight:800;color:#fff;background:var(--blue-d);border-radius:6px;padding:2px 7px;height:fit-content">'+s[0]+'</span><span style="font-size:12px;line-height:1.6;color:#555">'+s[1]+'</span></div>').join('')+
    '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn btn-sm btn-ghost" style="flex:1" onclick="window._forceAiFail=true;aiWatch()">模拟识别失败</button><button class="btn btn-sm" style="flex:1" onclick="tabTo(\'ai\');openChat(\'watch\',\'帮我看看监控里'+curPet().name+'在干嘛\')">追问AI</button></div></div>';
  },2000);
}
function weakNet(){
  const ov=$('liveOv');ov.style.display='block';
  ov.innerHTML='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#fff"><div class="spin"></div><div style="font-size:12px;margin-top:10px">重连中…</div></div>';
  setTimeout(()=>{ov.style.display='none';ov.innerHTML='';toast('已恢复播放')},2200);
}
function deadNet(){
  const ov=$('liveOv');ov.style.display='block';
  ov.innerHTML='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;color:#fff"><div class="spin"></div><div style="font-size:12px;margin-top:10px">重连中… 1/3</div></div>';
  setTimeout(()=>{ov.querySelector('div div:last-child').textContent='重连中… 2/3'},1800);
  setTimeout(()=>{ov.querySelector('div div:last-child').textContent='重连中… 3/3'},3400);
  setTimeout(()=>{
    ov.innerHTML='<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center"><svg class="icon icon-l" style="color:#fff;margin:auto"><use href="#i-alert"/></svg><div style="font-size:12.5px;color:#fff;margin:8px 0 12px">网络不稳定，请检查网络后重试</div><button class="btn btn-sm" style="width:auto;padding:8px 22px" onclick="ovHide()">重试</button></div>';
  },5000);
}
function ovHide(){const ov=$('liveOv');ov.style.display='none';ov.innerHTML='';toast('已恢复播放')}
function evtSheet(t,time,desc){
  openSheet('事件详情', '<div style="font-size:16px;font-weight:900;margin-bottom:4px">'+t+'</div><div style="font-size:11px;color:var(--sub);margin-bottom:12px">'+time+' · 触发推送并写入事件流</div><div class="card" style="height:140px;background:linear-gradient(160deg,#B8CFE8,#E8D9C4);margin-bottom:12px;display:flex;align-items:center;justify-content:center;color:#4A6285;font-size:11px">回放画面定位中…</div><div style="font-size:12.5px;color:#555;line-height:1.7;margin-bottom:14px">'+desc+'</div><div style="display:flex;gap:8px"><button class="btn btn-sm" style="flex:1" onclick="closeSheet();tabTo(\'ai\');openChat(\'watch\',\'帮我解读事件：'+t+'\')">AI解读</button><button class="btn btn-sm btn-ghost" style="flex:1" onclick="closeSheet();toast(\'已保存截图\')">保存截图</button></div>');
}

