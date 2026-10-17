/* ============ 启动 ============ */
function boot(){
  const d=new Date();const f=x=>String(x).padStart(2,'0');
  $('sbTime').textContent=f(d.getHours())+':'+f(d.getMinutes());
  setInterval(()=>{const n=new Date();$('sbTime').textContent=f(n.getHours())+':'+f(n.getMinutes())},30000);
  $('offlineBan').classList.toggle('show',S.set.offline);
  fitPhone();
  window.addEventListener('resize',fitPhone);
  document.addEventListener('pointermove',lvDragMove,{passive:true});
  document.addEventListener('pointerup',lvDragEnd);
  document.addEventListener('pointercancel',lvDragEnd);
  if(S.loggedIn&&!S.onboarded){$('onb').classList.add('show');onbShow()}
  if(S.loggedIn){go('home');liveOpen(false)}else go('login');
  if(S.loggedIn)setTimeout(settleWorld,800);
}
window.addEventListener('beforeunload',()=>{if(S&&S.world)S.world.lastLeave=Date.now();save()});
boot();
