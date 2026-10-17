/* ============ 成长记录页（M4，V1.7.4 改版：成长数据 + 健康记录双Tab，健康记录模块由宠物档案迁入） ============ */
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
  /* V1.7.4 顶部双Tab：成长数据 / 健康记录 */
  const seg='<div style="display:flex;gap:8px;padding:12px 16px 0">'+[['growth','📈 成长数据'],['rec','📋 健康记录 <span class="chip" style="font-size:9px;padding:1px 7px;background:'+(healthTab==='rec'?'rgba(255,255,255,.3)':'rgba(74,144,217,.12)')+';color:'+(healthTab==='rec'?'#fff':'var(--blue-d)')+'">'+S.records.filter(r=>r.pet===p.id).length+'</span>']].map(t=>'<button class="rTab'+(healthTab===t[0]?' act':'')+'" style="flex:1;padding:10px 0;font-size:13px" onclick="healthTab=\''+t[0]+'\';renderHealth()">'+t[1]+'</button>').join('')+'</div>';
  let body='';
  if(healthTab==='rec'){
    /* ===== 健康记录模块（V1.7.4 由宠物档案页迁入） ===== */
    const allRecs=S.records.filter(r=>r.pet===p.id);
    const cnt=t=>allRecs.filter(r=>r.type===t).length;
    const typeRecs=allRecs.filter(r=>r.type===recType).sort((a,b)=>b.date.localeCompare(a.date));
    body=
    '<div style="display:flex;gap:7px;margin-bottom:12px;overflow-x:auto;scrollbar-width:none">'+RTYPES.map(t=>'<button class="rTab'+(recType===t.id?' act':'')+'" style="'+(recType===t.id?'':'background:rgba(255,255,255,.55)')+'" onclick="recType=\''+t.id+'\';renderHealth()">'+t.n+' '+cnt(t.id)+'</button>').join('')+'</div>'+
    '<div style="display:flex;gap:7px;margin-bottom:12px">'+[['记录总数',allRecs.length],['本月新增',allRecs.filter(r=>r.date>='2026-10-01').length],['待复诊/到期',allRecs.filter(r=>r.next&&r.next>=today()).length]].map(s=>'<div class="card" style="flex:1;padding:10px 6px;text-align:center"><div style="font-size:16px;font-weight:800;color:var(--blue-d)">'+s[1]+'</div><div style="font-size:9.5px;color:var(--sub);margin-top:2px">'+s[0]+'</div></div>').join('')+'</div>'+
    (typeRecs.length?typeRecs.map(r=>recCard(r)).join(''):'<div class="card" style="padding:26px;text-align:center;font-size:12px;color:var(--sub)">暂无'+RTYPES.find(t=>t.id===recType).n+'记录</div>')+
    '<button class="btn" style="margin-top:12px" onclick="openRecForm()"><svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-plus"/></svg> 添加'+RTYPES.find(t=>t.id===recType).n+'记录</button>'+
    '<div style="font-size:10px;color:#A8B2BE;text-align:center;margin-top:10px">V1.7.4 起健康记录由「宠物档案」迁入本页，与成长数据统一管理</div>';
  }else{
    body=
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
    '<div class="card" style="padding:14px 15px;margin-bottom:12px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px"><b style="font-size:13.5px">数据记录</b><button class="btn btn-sm btn-ghost" style="width:auto;padding:5px 12px;font-size:10.5px" onclick="healthTab=\'rec\';renderHealth()">健康记录 ›</button></div>'+
    recs.map(d=>'<div style="display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid rgba(0,0,0,.05)"><svg class="icon icon-s" style="color:var(--blue-d)"><use href="#i-chart"/></svg><div style="flex:1"><div style="font-size:12.5px;font-weight:600">'+kNames[d.k]+'：'+d.v+(d.k==='weight'?'kg':d.k==='water'?'ml':'')+'</div><div style="font-size:10px;color:var(--sub)">'+fmtTs(d.ts)+' · 记录人 '+d.by+(d.fixed?' · <span style="color:#E8A23A">已修正，原值 '+d.orig+'kg</span>':'')+'</div></div>'+(d.fixed?'':'<button class="btn btn-sm btn-ghost" style="padding:5px 10px;font-size:10px" onclick="fixDaily(\''+d.ts+'\')">修正</button>')+'</div>').join('')+
    '</div>';
  }
  $('health-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">成长记录 · '+p.name+'</b><span style="margin-left:auto;font-size:11px;color:var(--blue-d);cursor:pointer" onclick="exportPdf()">导出PDF</span></div>'+
  seg+
  '<div style="padding:14px 16px">'+body+'</div>';
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
