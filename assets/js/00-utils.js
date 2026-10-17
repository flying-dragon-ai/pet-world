/* ============ 工具 ============ */
const $=id=>document.getElementById(id);
function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
function toast(m){const t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.remove('show'),2000)}
function openSheet(title,html){$('sheetTitle').textContent=title;$('sheetBody').innerHTML=html;$('mask').classList.add('show');$('sheet').classList.add('show')}
function closeSheet(){$('mask').classList.remove('show');$('sheet').classList.remove('show')}
function openModal(html){$('modalBox').innerHTML=html;$('modalWrap').classList.add('show')}
function closeModal(){$('modalWrap').classList.remove('show');$('modalWrap').onclick=null;const f=$('liveFab');if(f&&live.open)f.style.display='block'}
function confirmDlg(title,body,okTxt,cb,style){window._cfcb=cb;openModal(`<div style="font-size:16px;font-weight:800;margin-bottom:10px">${title}</div><div style="font-size:13px;color:var(--sub);line-height:1.6;margin-bottom:18px">${body}</div><div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="closeModal()">取消</button><button class="btn ${style==='danger'?'btn-danger':''}" style="${style==='danger'?'background:linear-gradient(135deg,#F05B5B,#D94343)':''}" onclick="closeModal();window._cfcb&&window._cfcb()">${okTxt}</button></div>`)}
function fmtTs(ts){const d=new Date(ts),n=new Date();const f=x=>String(x).padStart(2,'0');const sameDay=d.toDateString()===n.toDateString();const yd=new Date(n-864e5);if(sameDay)return f(d.getHours())+':'+f(d.getMinutes());if(d.toDateString()===yd.toDateString())return '昨天';return (d.getMonth()+1)+'月'+d.getDate()+'日'}
function needNet(quiet){if(S.set.offline){if(!quiet)toast('当前无网络，请检查网络连接');return false}return true}
function imgErr(el){const d=document.createElement('div');d.className='imgfb';d.style.width='100%';d.style.height='100%';d.style.position='absolute';d.style.inset='0';d.innerHTML='<svg class="icon icon-l" style="color:rgba(58,123,213,.4)"><use href="#i-paw"/></svg>';if(el.parentElement&&getComputedStyle(el.parentElement).position==='static')el.parentElement.style.position='relative';el.replaceWith(d)}
function addPts(n,src){S.points+=n;S.ptHist.unshift({n,src,ts:Date.now()});save();renderTabBadges()}
function uid(){return 'x'+Math.random().toString(36).slice(2,9)}

