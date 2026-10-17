/* ============ 导航 ============ */
const MAIN=['home','menu','ai','community','me'];
let navFrom={};
function go(pg,keep){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  const el=$('pg-'+pg);if(el)el.classList.add('on');
  $('tabbar').classList.toggle('hidden',!MAIN.includes(pg));
  if(MAIN.includes(pg)){document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('act',b.dataset.tab===pg))}
  (window['render'+({home:'Home',ai:'AI',community:'Community',me:'Me',profile:'Profile',petedit:'PetEdit',health:'Health',monitor:'Monitor',mall:'Mall',malldetail:'MallDetail',cart:'Cart',orders:'Orders',messages:'Messages',publish:'Publish',travel:'Travel',points:'Points',settings:'Settings',act:'Act',world:'World',menu:'Menu',care:'Care',rescue:'Rescue'}[pg])]||function(){})();
}
function tabTo(pg){go(pg)}
function renderTabBadges(){const un=S.msgs.filter(m=>!m.read).length;const bell=document.querySelector('#home-body .bell-badge');if(bell){bell.style.display=un?'flex':'none';bell.textContent=un}}

/* ============ 登录============ */
let codeLeft=0,codeErr=0,lockLeft=0;
function lgPhoneIn(){const v=$('lgPhone');v.value=v.value.replace(/\D/g,'').slice(0,11)}
function sendCode(){
  const p=$('lgPhone').value;
  if(!/^1[3-9]\d{9}$/.test(p)){toast('请输入正确的11位手机号（13-19号段）');$('codeRow').classList.add('shake');setTimeout(()=>$('codeRow').classList.remove('shake'),400);return}
  if(lockLeft>0){toast('该手机号已锁定，请'+lockLeft+'秒后再试');return}
  codeLeft=60;codeErr=0;
  const b=$('btnSend');b.disabled=true;
  const tm=setInterval(()=>{b.textContent=(--codeLeft)+'s 后重发';if(codeLeft<=0){clearInterval(tm);b.disabled=false;b.textContent='获取验证码'}},1000);
  toast('验证码已发送（Demo请输入 888888）');
}
function doLogin(){
  if(!$('lgAgree').checked){toast('请先阅读并勾选用户协议与隐私政策');return}
  const p=$('lgPhone').value,c=$('lgCode').value;
  if(!/^1[3-9]\d{9}$/.test(p)){toast('请输入正确的11位手机号');return}
  if(lockLeft>0){toast('该手机号已锁定，请'+lockLeft+'秒后再试');return}
  if(c!=='888888'){
    codeErr++;
    $('lgCode').classList.add('shake');setTimeout(()=>$('lgCode').classList.remove('shake'),450);
    if(codeErr>=5){lockLeft=600;toast('失败次数过多，该手机号已锁定10分钟');return}
    if(codeErr>=3){toast('该验证码已作废，请重新获取');codeLeft=0;const b=$('btnSend');b.disabled=false;b.textContent='获取验证码'}
    else toast('验证码错误，还可尝试'+(5-codeErr)+'次');
    return;
  }
  S.loggedIn=true;S.isGuest=false;save();
  if(!S.onboarded){$('onb').classList.add('show');onbStep=0;onbShow()}
  else{toast('登录成功，欢迎回来');go('home')}
}
function guestLogin(){S.loggedIn=true;S.isGuest=true;save();toast('体验数据仅保存在本机，注册后可云端保存');go('home')}
let onbStep=0;
const ONB=[
  {t:'AI 全场景养宠顾问',d:'九大场景随问随答，档案上下文注入，回答贴合你家宠物的真实情况',i:'i-spark',g:'linear-gradient(135deg,#8FB6EE,#3A7BD5)'},
  {t:'虚拟家园 · 线上陪伴',d:'真实健康数据联动虚拟宠物状态，喂食抚摸玩耍，情感陪伴不断线',i:'i-paw',g:'linear-gradient(135deg,#F0B36A,#E8945A)'},
  {t:'一站式养宠服务',d:'监控看护 · 健康档案 · 社区 · 电商 · 3D玩偶定制 · 携宠旅游，一个APP全搞定',i:'i-home',g:'linear-gradient(135deg,#9AD3A8,#4CA876)'}
];
function onbShow(){const o=ONB[onbStep];$('onbT').textContent=o.t;$('onbD').textContent=o.d;$('onbArt').style.background=o.g;$('onbArt').innerHTML='<svg viewBox="0 0 24 24" style="width:70px;height:70px;stroke:#fff;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"><use href="#'+o.i+'"/></svg>';$('onbNext').textContent=onbStep===2?'开始使用':'下一步';document.querySelectorAll('.onb-dot').forEach((d,i)=>d.classList.toggle('act',i===onbStep))}
function onbNext(){if(onbStep<2){onbStep++;onbShow()}else finOnb()}
function finOnb(){S.onboarded=true;save();$('onb').classList.remove('show');go('home')}

