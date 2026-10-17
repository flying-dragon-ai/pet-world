/* ============ 商城（M7，V1.5：PRD七分类 + 浏览足迹） ============ */
let mallCat='全部';
function renderMall(){
  const cats=['全部','猫粮','狗粮','零食','保健品','洗护用品','玩具','宠物家居','医疗用品'];
  const prods=mallCat==='全部'?S.products:S.products.filter(p=>p.cat===mallCat);
  const views=(S.views||[]).map(id=>S.products.find(p=>p.id===id)).filter(Boolean).slice(0,6);
  $('mall-body').innerHTML=
  '<div class="subhdr" style="margin:-12px -16px 12px"><svg class="icon" style="cursor:pointer" onclick="go(\'home\')"><use href="#i-back"/></svg><b style="font-size:15px">宠物商城</b><div style="position:relative;cursor:pointer;margin-left:auto" onclick="go(\'cart\')"><svg class="icon icon-l" style="color:#7C8CA0"><use href="#i-cart"/></svg>'+(S.cart.length?'<span class="dot-badge">'+S.cart.length+'</span>':'')+'</div></div>'+
  '<div class="card" style="display:flex;align-items:center;gap:9px;padding:10px 14px;margin-bottom:12px;cursor:pointer" onclick="tabTo(\'ai\');openChat(\'shop\',\'帮我推荐适合'+curPet().name+'的商品\')"><svg class="icon" style="color:var(--blue-d)"><use href="#i-spark"/></svg><span style="font-size:12.5px;color:var(--blue-d);font-weight:600">AI 帮我选：结合档案与过敏史推荐</span><svg class="icon icon-s" style="margin-left:auto;color:#B9C4D2"><use href="#i-right"/></svg></div>'+
  /* V1.7 定制宠物入口由首页迁入商城 */
  '<div class="card chov" style="display:flex;align-items:center;gap:11px;padding:12px 14px;margin-bottom:12px;cursor:pointer;background:linear-gradient(135deg,rgba(232,112,154,.10),rgba(139,92,246,.08));border-color:rgba(232,112,154,.35)" onclick="openDoll()"><div style="width:40px;height:40px;border-radius:14px;background:rgba(232,112,154,.14);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon" style="color:#E8709A"><use href="#i-gift"/></svg></div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:800">定制宠物 <span class="chip" style="font-size:9px;background:rgba(232,112,154,.14);color:#E8709A;padding:2px 7px">3D玩偶</span></div><div style="font-size:10.5px;color:var(--sub);margin-top:2px">专属毛孩子周边 · 15cm等比缩小款</div></div><svg class="icon icon-s" style="color:#C9D2DD"><use href="#i-right"/></svg></div>'+
  (views.length?'<div style="display:flex;justify-content:space-between;align-items:center;margin:2px 2px 8px"><span style="font-size:12px;font-weight:800">最近浏览</span><span style="font-size:10px;color:var(--sub);cursor:pointer" onclick="S.views=[];save();renderMall()">清空</span></div><div style="display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-bottom:12px">'+views.map(v=>'<div style="width:64px;flex:none;cursor:pointer" onclick="openProduct(\''+v.id+'\')"><div style="width:64px;height:64px;border-radius:12px;overflow:hidden"><img src="'+v.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="font-size:9px;color:var(--sub);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+v.name.slice(0,8)+'</div></div>').join('')+'</div>':'')+
  '<div style="display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;scrollbar-width:none">'+cats.map(c=>'<button class="rTab'+(c===mallCat?' act':'')+'" onclick="mallCat=\''+c+'\';renderMall()">'+c+'</button>').join('')+'</div>'+
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:11px">'+prods.map(pr=>{
    const off=pr.stock<=0,low=pr.stock>0&&pr.stock<=10;
    return '<div class="card chov" style="overflow:hidden;cursor:pointer" onclick="openProduct(\''+pr.id+'\')"><div style="position:relative;height:110px"><img src="'+pr.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)">'+(off?'<div style="position:absolute;inset:0;background:rgba(255,255,255,.55);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#8A99AB">已售罄 · 补货中</div>':'')+'</div><div style="padding:9px 11px 11px"><div style="font-size:12px;font-weight:700;line-height:1.4;height:33px;overflow:hidden">'+pr.name+'</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:5px"><span style="color:var(--danger);font-weight:900;font-size:14px">¥'+pr.price+'</span>'+(low?'<span style="font-size:9.5px;color:var(--danger);font-weight:700">仅剩'+pr.stock+'件</span>':off?'<span style="font-size:9.5px;color:#8A99AB">库存0</span>':'<span style="font-size:9.5px;color:var(--sub)">库存'+pr.stock+'</span>')+'</div></div></div>';
  }).join('')+'</div>';
}
let curProd=null;
function openProduct(id){
  const pr=S.products.find(p=>p.id===id);curProd=pr;curSku=0;
  /* 数据逻辑：商城浏览数据留存（PRD 六-4） */
  S.views=[id,...(S.views||[]).filter(x=>x!==id)].slice(0,10);save();
  go('malldetail');
}
let curSku=0;
function renderMallDetail(){
  const pr=curProd;if(!pr){go('mall');return}
  const off=pr.stock<=0,low=pr.stock>0&&pr.stock<=10;
  $('malldetail-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'mall\')"><use href="#i-back"/></svg><b style="font-size:15px">商品详情</b><span style="margin-left:auto;cursor:pointer" onclick="go(\'cart\')"><svg class="icon"><use href="#i-cart"/></svg></span></div>'+
  '<div style="padding:14px 16px">'+
  '<div style="height:200px;border-radius:20px;overflow:hidden;margin-bottom:12px"><img src="'+pr.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div>'+
  '<div style="display:flex;align-items:baseline;gap:8px"><span style="font-size:22px;font-weight:900;color:var(--danger)">¥'+pr.price+'</span><span class="chip">'+pr.cat+'</span>'+(low?'<span class="chip" style="background:rgba(240,91,91,.12);color:#F05B5B;font-size:10px">库存紧张 · 仅剩'+pr.stock+'件</span>':'')+'</div>'+
  '<div style="font-size:15px;font-weight:800;margin-top:8px;line-height:1.5">'+pr.name+'</div>'+
  '<div style="font-size:12px;color:var(--sub);margin-top:8px;line-height:1.7">'+pr.desc+'</div>'+
  '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:12px">'+['正品保证','7天无理由','过敏成分AI预警','极速退款'].map(t=>'<span class="chip" style="background:rgba(76,168,118,.12);color:#3A9C6B;font-size:10px"><svg class="icon icon-s"><use href="#i-check"/></svg>'+t+'</span>').join('')+'</div>'+
  '<div style="font-size:12px;font-weight:700;margin:16px 0 8px">规格</div><div style="display:flex;gap:8px;margin-bottom:18px">'+pr.skus.map((s,i)=>'<button class="skuBtn'+(i===curSku?' act':'')+'" onclick="curSku='+i+';renderMallDetail()">'+s+'</button>').join('')+'</div>'+
  '<div class="card chov" style="padding:11px 14px;display:flex;align-items:center;gap:9px;margin-bottom:16px;cursor:pointer" onclick="aiGuide()"><div style="width:32px;height:32px;border-radius:10px;background:linear-gradient(135deg,#8FB6EE,#3A7BD5);display:flex;align-items:center;justify-content:center;flex:none"><svg class="icon icon-s" style="color:#fff"><use href="#i-spark"/></svg></div><b style="font-size:13px;color:var(--blue-d)">AI 帮我选</b><svg class="icon icon-s" style="margin-left:auto;color:#B9C4D2"><use href="#i-right"/></svg></div>'+
  '<div style="display:flex;gap:10px"><button class="btn btn-ghost" style="flex:1" onclick="addCart(1)">加入购物车</button><button class="btn" style="flex:1" '+(off?'disabled':'')+' onclick="addCart(2)">'+(off?'补货中':'立即购买')+'</button></div>'+
  (off?'<div style="font-size:10.5px;color:#8A99AB;text-align:center;margin-top:10px">库存=0时购买按钮置灰为「补货中」</div>':'')+'</div>';
}
function aiGuide(){
  const p=curPet();
  openSheet('AI 商品导购',
  '<div style="font-size:12px;color:var(--sub);margin-bottom:10px">已注入「'+p.name+'」档案：'+p.species+' · '+p.weight+'kg · 过敏：'+(p.note||'无')+'</div>'+
  '<div class="card" style="padding:12px 14px;margin-bottom:10px;font-size:12.5px;line-height:1.7">分析：'+p.name+'当前体重'+p.weight+'kg处于标准区间，若选择本商品建议按标注喂食量的中位数喂食；已核对成分表，未命中档案过敏原（'+(p.note||'无记录')+'）。</div>'+
  '<div style="display:flex;gap:8px"><button class="btn btn-sm btn-ghost" style="flex:1" onclick="closeSheet();toast(\'已生成对比清单\')">生成对比</button><button class="btn btn-sm" style="flex:1" onclick="closeSheet();addCart(1)">加入购物车</button></div>');
}
function addCart(mode){
  if(!needNet())return;
  const pr=curProd;
  const ex=S.cart.find(c=>c.pid===pr.id&&c.sku===pr.skus[curSku]);
  if(ex)ex.qty++;
  else S.cart.push({pid:pr.id,sku:pr.skus[curSku],qty:1,sel:true});
  save();
  if(mode===2){go('cart')}
  else{toast('已加入购物车');renderMallDetail()}
}
function renderCart(){
  const items=S.cart.map(c=>({...c,prod:S.products.find(p=>p.id===c.pid)}));
  const valid=items.filter(c=>c.prod&&c.prod.stock>0);
  const invalid=items.filter(c=>c.prod&&c.prod.stock<=0);
  const sel=valid.filter(c=>c.sel);
  const total=sel.reduce((s,c)=>s+c.prod.price*c.qty,0);
  window._cartTotal=total;
  $('cart-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'mall\')"><use href="#i-back"/></svg><b style="font-size:15px">购物车</b><span style="margin-left:auto;font-size:11px;color:var(--blue-d);cursor:pointer" onclick="S.cart.forEach(c=>c.sel=true);save();renderCart()">全选</span></div>'+
  '<div style="padding:12px 16px 120px">'+
  (items.length?'':'<div class="card" style="padding:34px;text-align:center"><svg class="icon icon-l" style="color:#C9D2DD;margin:auto"><use href="#i-cart"/></svg><div style="font-size:13px;color:var(--sub);margin-top:10px">购物车空空的</div><button class="btn btn-sm" style="margin-top:12px;width:auto;padding:8px 20px" onclick="go(\'mall\')">去逛逛</button></div>')+
  valid.map((c,i)=>'<div class="card" style="padding:12px 14px;margin-bottom:9px;display:flex;gap:10px;align-items:center"><span style="width:20px;height:20px;border-radius:50%;border:2px solid '+(c.sel?'var(--blue-d)':'#C9D2DD')+';background:'+(c.sel?'var(--blue-d)':'transparent')+';cursor:pointer;flex:none;display:flex;align-items:center;justify-content:center" onclick="c.sel=!c.sel;save();renderCart()">'+(c.sel?'<svg class="icon" style="width:12px;height:12px;color:#fff"><use href="#i-check"/></svg>':'')+'</span><div style="width:56px;height:56px;border-radius:13px;overflow:hidden;flex:none"><img src="'+c.prod.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:700;line-height:1.4">'+c.prod.name+'</div><div style="font-size:10px;color:var(--sub);margin-top:2px">'+c.sku+'</div><span style="color:var(--danger);font-weight:800;font-size:13px">¥'+c.prod.price+'</span></div><div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px"><div style="display:flex;gap:8px;align-items:center"><button class="btn btn-sm btn-ghost" style="width:26px;padding:3px 0" onclick="cartQty(\''+c.pid+'\',\''+c.sku+'\',-1)">−</button><b style="font-size:13px">'+c.qty+'</b><button class="btn btn-sm btn-ghost" style="width:26px;padding:3px 0" onclick="cartQty(\''+c.pid+'\',\''+c.sku+'\',1)">+</button></div><span style="font-size:10px;color:#8A99AB;cursor:pointer" onclick="cartDel(\''+c.pid+'\',\''+c.sku+'\')">删除</span></div></div>').join('')+
  (invalid.length?'<div style="font-weight:800;font-size:13px;margin:16px 0 8px;color:#8A99AB">失效区</div>'+invalid.map(c=>'<div class="card" style="padding:12px 14px;margin-bottom:9px;display:flex;gap:10px;align-items:center;opacity:.6"><span class="chip" style="background:rgba(240,91,91,.12);color:#F05B5B;font-size:9.5px">库存不足</span><div style="width:56px;height:56px;border-radius:13px;overflow:hidden;flex:none"><img src="'+c.prod.img+'" style="width:100%;height:100%;object-fit:cover;filter:grayscale(.8)" onerror="imgErr(this)"></div><div style="flex:1;font-size:12px;font-weight:700">'+c.prod.name+'</div><span style="font-size:10.5px;color:#8A99AB;cursor:pointer" onclick="cartDel(\''+c.pid+'\',\''+c.sku+'\')">移除</span></div>').join(''):'')+
  '</div>'+
  (sel.length?'<div class="glass" style="position:absolute;bottom:0;left:0;right:0;padding:14px 18px;display:flex;align-items:center;gap:12px;border-radius:22px 22px 0 0;z-index:5"><div style="flex:1"><div style="font-size:16px;font-weight:900;color:var(--danger)">¥'+total+'</div><div style="font-size:10px;color:var(--sub)">已选 '+sel.length+' 件 · 提交时二次校验库存</div></div><button class="btn" style="width:130px" onclick="checkout()">去结算</button></div>':'');
}
function cartQty(pid,sku,d){
  const c=S.cart.find(x=>x.pid===pid&&x.sku===sku);
  c.qty+=d;if(c.qty<1)c.qty=1;if(c.qty>99)c.qty=99;
  save();renderCart();
}
function cartDel(pid,sku){S.cart=S.cart.filter(x=>!(x.pid===pid&&x.sku===sku));save();renderCart();toast('已移除')}
function checkout(){
  if(!needNet())return;
  const sel=S.cart.filter(c=>c.sel);
  const bad=sel.find(c=>(S.products.find(p=>p.id===c.pid)||{stock:0}).stock<=0);
  if(bad){const bp=S.products.find(p=>p.id===bad.pid);toast('['+bp.name+'] 库存不足');bad.sel=false;save();renderCart();return}
  const items=sel.map(c=>({pid:c.pid,name:S.products.find(p=>p.id===c.pid).name,sku:c.sku,price:S.products.find(p=>p.id===c.pid).price,qty:c.qty,img:S.products.find(p=>p.id===c.pid).img}));
  const amount=items.reduce((s,i)=>s+i.price*i.qty,0);
  window._ck={items,amount};
  openSheet('确认订单',
  '<div class="card" style="padding:11px 13px;margin-bottom:12px;display:flex;gap:9px;align-items:center"><svg class="icon" style="color:var(--blue-d)"><use href="#i-pin"/></svg><div style="flex:1;font-size:12.5px;font-weight:700">北京市朝阳区 幸福家园 3-2-501</div><span style="font-size:10.5px;color:var(--blue-d)">修改</span></div>'+
  items.map(i=>'<div style="display:flex;gap:9px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.05)"><div style="width:44px;height:44px;border-radius:10px;overflow:hidden;flex:none"><img src="'+i.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1"><div style="font-size:12px;font-weight:700">'+i.name+'</div><div style="font-size:10px;color:var(--sub)">'+i.sku+' ×'+i.qty+'</div></div><span style="font-size:12.5px;font-weight:700;color:var(--danger)">¥'+i.price*i.qty+'</span></div>').join('')+
  '<div style="display:flex;justify-content:space-between;font-size:12.5px;margin:12px 0 4px"><span style="color:var(--sub)">积分抵扣（上限50%）</span><span style="font-weight:700">-<span id="ckPts">0</span> 积分</span></div>'+
  '<input class="input" id="ptsIn" inputmode="numeric" placeholder="输入抵扣积分（≤'+Math.min(S.points,Math.floor(amount/2))+'，上限为应付50%）" style="margin-bottom:8px" oninput="ckPts()">'+
  '<div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900"><span>应付</span><span style="color:var(--danger)">¥<span id="ckAmt">'+amount+'</span></span></div>'+
  '<button class="btn" style="margin-top:14px" onclick="submitOrder()">模拟支付（15分钟倒计时）</button>');
}
function ckPts(){
  const max=Math.min(S.points,Math.floor(window._ck.amount/2));
  let v=Math.min(+$('ptsIn').value||0,max);
  $('ptsIn').value=v;
  $('ckPts').textContent=v;
  $('ckAmt').textContent=Math.max(0,window._ck.amount-Math.floor(v/100));
  window._ck.pts=v;
}
function submitOrder(){
  const ck=window._ck;
  const items=ck.items;
  const amount=ck.amount;
  const pts=ck.pts||0;
  S.orders.unshift({id:'OD'+Date.now(),items,amount,usedPts:pts,status:'待支付',ts:Date.now(),addr:'北京市朝阳区 幸福家园 3-2-501'});
  S.cart=S.cart.filter(c=>!c.sel);
  save();closeSheet();
  toast('订单已创建（待支付），15分钟内有效');
  go('orders');
}
/* ============ AI导购快速下单闭环 ============ */
function shopPicks(){
  const sp=ctxPet()?ctxPet().species:'猫';
  const ids=sp==='狗'?['g4','g6','g3']:['g1','g4','g6'];
  return ids.map(id=>S.products.find(p=>p.id===id)).filter(p=>p&&p.stock>0);
}
function addCartById(pid){
  if(!needNet())return;
  const pr=S.products.find(p=>p.id===pid);if(!pr)return;
  const ex=S.cart.find(c=>c.pid===pid&&c.sku===pr.skus[0]);
  if(ex)ex.qty++;else S.cart.push({pid:pid,sku:pr.skus[0],qty:1,sel:true});
  save();toast('「'+pr.name+'」已加入购物车');
}
function quickBuy(pid){
  if(!needNet())return;
  const pr=S.products.find(p=>p.id===pid);if(!pr)return;
  if(pr.stock<=0){toast('「'+pr.name+'」库存不足');return}
  const o={id:'OD'+Date.now(),items:[{pid:pr.id,name:pr.name,sku:pr.skus[0],price:pr.price,qty:1,img:pr.img}],amount:pr.price,usedPts:0,status:'待支付',ts:Date.now(),addr:'北京市朝阳区 幸福家园 3-2-501'};
  S.orders.unshift(o);save();
  payOrder(o.id);
}
function logiSheet(id){
  const o=S.orders.find(x=>x.id===id);if(!o)return;
  const steps=[['已下单','订单提交成功',1],['商家拣货','商品已出库打包',1],['已发货','中通快递 7382 8866 2210 已揽收',1],['运输中','包裹正发往 北京朝阳转运中心',0],['派送/签收','预计明日 18:00 前送达',0]];
  openSheet('物流信息',
  '<div style="display:flex;align-items:center;gap:9px;margin-bottom:14px"><div style="width:40px;height:40px;border-radius:11px;overflow:hidden;flex:none"><img src="'+o.items[0].img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)"></div><div style="flex:1;font-size:11px;color:var(--sub);word-break:break-all">'+o.id+'<br>收货：'+o.addr+'</div><button class="btn btn-sm btn-ghost" style="padding:5px 10px;font-size:10.5px;flex:none" onclick="toast(\'快递单号已复制\')">复制单号</button></div>'+
  steps.map((s,i)=>'<div style="display:flex;gap:10px"><div style="display:flex;flex-direction:column;align-items:center"><div style="width:16px;height:16px;border-radius:50%;flex:none;background:'+(s[2]?'var(--blue-d)':'#D5DEE9')+';'+(i===2?'box-shadow:0 0 0 4px rgba(58,123,213,.18)':'')+'"></div>'+(i<steps.length-1?'<div style="width:2px;flex:1;min-height:26px;background:'+(s[2]?'rgba(58,123,213,.4)':'#E4EAF2')+'"></div>':'')+'</div><div style="padding-bottom:'+(i<steps.length-1?'14px':'0')+'"><div style="font-size:12.5px;font-weight:'+(s[2]?'800':'600')+';color:'+(s[2]?'var(--ink)':'#9AA9BC')+'">'+s[0]+'</div><div style="font-size:10.5px;color:var(--sub);margin-top:1px">'+s[1]+'</div></div></div>').join(''));
}

/* ============ 订单 ============ */
let ordTab='全部';
function renderOrders(){
  const tabs=['全部','待支付','待发货','待收货','已完成'];
  const os=ordTab==='全部'?S.orders:S.orders.filter(o=>o.status===ordTab);
  $('orders-body').innerHTML=
  '<div class="subhdr"><svg class="icon" style="cursor:pointer" onclick="go(\'me\')"><use href="#i-back"/></svg><b style="font-size:15px">我的订单</b></div>'+
  '<div style="display:flex;gap:7px;padding:10px 16px 12px;overflow-x:auto;scrollbar-width:none">'+tabs.map(t=>{const n=t==='全部'?S.orders.length:S.orders.filter(o=>o.status===t).length;return '<button class="rTab'+(ordTab===t?' act':'')+'" onclick="ordTab=\''+t+'\';renderOrders()">'+t+(n?' '+n:'')+'</button>'}).join('')+'</div>'+
  '<div style="padding:0 16px 30px">'+
  (os.length?os.map(o=>{
    const main={待支付:['去支付','payOrder(\''+o.id+'\')'],待发货:['查看物流','logiSheet(\''+o.id+'\')'],待收货:['确认收货','confirmRecv(\''+o.id+'\')'],已完成:['再次购买','reBuy(\''+o.id+'\')']}[o.status];
    return '<div class="card" style="padding:14px 15px;margin-bottom:11px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:11px;color:var(--sub)">'+fmtTs(o.ts)+'</span><span class="ordbadge" style="background:'+({待支付:'rgba(245,166,35,.15)',待发货:'rgba(91,141,239,.14)',待收货:'rgba(139,125,232,.14)',已完成:'rgba(59,183,134,.14)'}[o.status])+';color:'+({待支付:'#C77E12',待发货:'#3A7BD5',待收货:'#7A68D8',已完成:'#2E9C6F'}[o.status])+'">'+o.status+'</span></div>'+
    o.items.map(i=>'<div style="display:flex;gap:9px;margin-bottom:8px"><div style="width:52px;height:52px;border-radius:12px;overflow:hidden;flex:none;position:relative"><img src="'+i.img+'" style="width:100%;height:100%;object-fit:cover" onerror="imgErr(this)">'+(i.custom?'<span style="position:absolute;bottom:0;right:0;font-size:8px;background:#E8709A;color:#fff;padding:1px 4px;border-radius:6px 0 8px">定制</span>':'')+'</div><div style="flex:1"><div style="font-size:12px;font-weight:700;line-height:1.4">'+i.name+'</div><div style="font-size:10px;color:var(--sub)">'+i.sku+' ×'+i.qty+'</div></div></div>').join('')+
    '<div style="display:flex;justify-content:space-between;align-items:center;margin:4px 2px 10px"><span style="font-size:11px;color:var(--sub)">订单号 '+o.id+(o.usedPts?' · 积分抵扣'+o.usedPts:'')+'</span><span style="font-size:15px;font-weight:900;color:var(--danger)">¥'+(o.amount-Math.floor((o.usedPts||0)/100))+'</span></div>'+
    '<div style="display:flex;gap:8px;justify-content:flex-end">'+(o.status==='待支付'?'<button class="btn btn-sm btn-ghost" style="color:#F05B5B" onclick="cancelOrder(\''+o.id+'\')">取消订单</button>':'')+(main?'<button class="btn btn-sm" style="width:auto;padding:7px 16px" onclick="'+main[1]+'">'+main[0]+'</button>':'')+'</div></div>';
  }).join(''):'<div class="card" style="padding:30px;text-align:center;color:var(--sub);font-size:13px">暂无相关订单</div>')+'</div>';
}
function payOrder(id){
  const o=S.orders.find(x=>x.id===id);
  openModal('<div style="text-align:center;padding:4px 0"><b style="font-size:15px">模拟支付</b><div style="font-size:26px;font-weight:900;color:var(--danger);margin:12px 0">¥'+(o.amount-Math.floor((o.usedPts||0)/100))+'</div><div style="font-size:11px;color:var(--sub);margin-bottom:14px">支付渠道：全流程模拟（3.4 非目标）</div><button class="btn" onclick="doPay(\''+id+'\')">确认支付</button></div>');
}
function doPay(id){
  const o=S.orders.find(x=>x.id===id);
  o.status='待发货';
  if(o.usedPts){S.points-=o.usedPts;S.ptHist.unshift({n:-o.usedPts,src:'下单积分抵扣',ts:Date.now()})}
  save();closeModal();renderOrders();
  toast('支付成功，订单已进入待发货');
}
function cancelOrder(id){
  const o=S.orders.find(x=>x.id===id);
  openSheet('取消订单', ['不想买了','信息填错了','拍重复了','其他原因'].map(r=>'<button class="btn btn-ghost btn-sm" style="width:100%;padding:12px;margin-bottom:8px" onclick="doCancel(\''+id+'\',\''+r+'\')"> '+r+'</button>').join(''));
}
function doCancel(id,reason){
  const o=S.orders.find(x=>x.id===id);
  o.status='已取消';
  if(o.usedPts){S.points+=o.usedPts;S.ptHist.unshift({n:o.usedPts,src:'订单取消-积分原路返还',ts:Date.now()})}
  save();closeSheet();renderOrders();
  toast('订单已取消（'+reason+'），已抵扣积分已原路返还');
}
function confirmRecv(id){
  const o=S.orders.find(x=>x.id===id);
  confirmDlg('确认收货','确认已收到全部商品？确认后订单完成', '确认收货', ()=>{
    o.status='已完成';
    const back=Math.min(200,Math.round(o.amount*1/100));
    S.points+=back;S.ptHist.unshift({n:back,src:'订单返积分 '+o.id+'',ts:Date.now()});
    save();renderOrders();
    toast('确认收货成功，订单返积分 +'+back+'（金额×1%）');
  });
}
function reBuy(id){
  const o=S.orders.find(x=>x.id===id);
  o.items.forEach(i=>{if(S.products.find(p=>p.id===i.pid)){const ex=S.cart.find(c=>c.pid===i.pid&&c.sku===i.sku);if(ex)ex.qty+=i.qty;else S.cart.push({pid:i.pid,sku:i.sku,qty:i.qty,sel:true})}});
  save();toast('已重新加入购物车');go('cart');
}
