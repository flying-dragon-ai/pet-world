/* ============ V1.8 3D 宠物世界（three.js 横屏舞台，PRD 4.1/4.2） ============ */
let _w3d=null;
/* 竖屏视口判定（单测锚点）：竖屏 → 舞台内容旋转90°恒为横屏，横屏/桌面 → 直接铺满 */
function w3dNeedRotate(w,h){return h>w}
/* 物种 → GLTF 模型（运行时 CDN，8s 超时/失败 → 程序化球体拼装兜底） */
const W3D_FOX='https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/Fox/glTF-Binary/Fox.glb';
const W3D_MODELS={
  '猫':{url:W3D_FOX,scale:0.8},
  '狗':{url:W3D_FOX,scale:1.0},
  '鸟':{url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Parrot.glb',scale:1},
  '异宠':{url:'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Flamingo.glb',scale:1}
};
/* 建筑热点 → 系统面板 tab（运动/娱乐 成长等级 Lv.30 解锁） */
const W3D_SPOTS=[
  {tab:'school',n:'学院',ic:'🎓',c:0x8B5CF6,x:-8,z:-6.6},
  {tab:'jobs',n:'打工小镇',ic:'💼',c:0xC77E12,x:-2.6,z:-8.8},
  {tab:'shop',n:'商城',ic:'🛒',c:0xE8945A,x:3,z:-8.4},
  {tab:'medal',n:'战功墙',ic:'🎖️',c:0xD9A03C,x:8.4,z:-6.2},
  {tab:'sport',n:'运动场',ic:'🏟️',c:0x3BB786,x:-8.8,z:1.6,lock:true},
  {tab:'fun',n:'娱乐馆',ic:'🎡',c:0xE8709A,x:8.8,z:2,lock:true}
];
function w3dEnter(){
  const st=$('w3dStage');st.classList.add('show');
  try{if(typeof screen!=='undefined'&&screen.orientation&&screen.orientation.lock)screen.orientation.lock('landscape').catch(function(){})}catch(e){}
  if(!window.THREE){w3dFallback('3D 引擎未加载：请确认 three.min.js / GLTFLoader.js 与页面同目录');return}
  if(!_w3d){
    try{w3dInit()}catch(e){_w3d=null;w3dFallback('当前环境不支持 WebGL，请更换浏览器或设备');return}
  }else if(_w3d.petId!==S.curPet){
    w3dRemovePet();w3dLoadPet();
  }
  _w3d.suspended=false;
  w3dLayout();w3dHudRefresh();
}
function w3dFallback(msg){
  const f=$('w3dFall');
  if(f){f.style.display='flex';const t=f.querySelector('.w3d-fall-t');if(t)t.textContent=msg}
  const gl=$('w3dGL');if(gl)gl.style.display='none';
}
/* 舞台挂起（隐藏、状态保留）；面板「返回世界」→ w3dResume 恢复，不重计登录天数 */
function w3dSuspend(){if(!_w3d)return;_w3d.suspended=true;$('w3dStage').classList.remove('show')}
function w3dResume(){
  if(!_w3d){go('home');return}
  _w3d.suspended=false;
  $('w3dStage').classList.add('show');
  w3dLayout();w3dHudRefresh();
}
function w3dExit(){
  if(_w3d)_w3d.suspended=true;
  $('w3dStage').classList.remove('show');
  try{if(typeof screen!=='undefined'&&screen.orientation&&screen.orientation.unlock)screen.orientation.unlock()}catch(e){}
  go('home');
}
function w3dLayout(){
  if(!_w3d)return;
  const w=window.innerWidth,h=window.innerHeight;
  const rot=w3dNeedRotate(w,h);
  _w3d.rotated=rot;
  const bw=rot?h:w,bh=rot?w:h;
  _w3d.viewW=bw;_w3d.viewH=bh;
  const box=$('w3dBox');
  box.style.width=bw+'px';box.style.height=bh+'px';
  box.style.transform='translate(-50%,-50%)'+(rot?' rotate(90deg)':'');
  const tip=$('w3dTip');if(tip)tip.style.display=rot?'block':'none';
  _w3d.renderer.setSize(bw,bh);
  _w3d.camera.aspect=bw/bh;_w3d.camera.updateProjectionMatrix();
}
/* 世界六维属性增减（0-100 / 成长·智慧 9999 封顶，HUD 联动） */
function w3dGain(o){
  const w=worldPet();
  Object.keys(o).forEach(function(k){
    const cap=(k==='growth'||k==='wisdom')?9999:100;
    w.attr[k]=Math.max(0,Math.min(cap,(w.attr[k]||0)+o[k]));
  });
  save();
  if(_w3d)_w3d.hudDirty=true;
}
/* 手动互动：抚摸/喂食/玩耍/洗澡（单按钮 3s 冷却，全部作用于世界六维属性） */
function w3dAct(act){
  const now=Date.now();
  window._w3dCd=window._w3dCd||{};
  if(now-(window._w3dCd[act]||0)<3000){w3dMsg('冷却中，稍等一下再试');return}
  const p=curPet(),w=worldPet(),g=petGarden(p);
  if(act==='play'&&w.attr.stamina<12){w3dMsg(p.name+'累了，趴下来休息一会儿吧');return}
  window._w3dCd[act]=now;
  document.querySelectorAll('.w3d-act').forEach(function(b){if(b.dataset&&b.dataset.act===act){b.classList.add('cd');setTimeout(function(){b.classList.remove('cd')},3000)}});
  if(act==='touch'){
    w3dGain({mood:9});
    g.touchCount=(g.touchCount||0)+1;
    if(g.touchCount>=3&&g.tasks.touch!==today())g.tasks.touch=today();
    w3dFx('♥','#E8709A');w3dSay('好舒服呀～');w3dEmote('happy');
    w3dMsg('抚摸：'+p.name+'很开心，心情值+9');
  }else if(act==='feed'){
    w3dGain({hunger:18});addWorldGrowth(3,'喂食');
    if(g.tasks.feed!==today())g.tasks.feed=today();
    w3dFx('🐟','#E8945A');w3dSay('吧唧吧唧，真好吃！');w3dEmote('happy');
    w3dMsg('喂食成功：饥饿值+18，成长值+3');
  }else if(act==='play'){
    w3dGain({mood:7,stamina:-10,hunger:-6});
    w3dFx('✦','#5B8DEF');w3dEmote('play');
    w3dMsg('玩耍：心情+7 体力-10 饥饿-6');
  }else if(act==='bath'){
    w3dGain({clean:20});
    w3dFx('🫧','#3AB5C0');w3dSay('洗香香了！');
    w3dMsg('洗澡：清洁值+20');
  }
  save();
}
function w3dEmote(kind){
  if(!_w3d)return;
  _w3d.ai.state=kind==='play'?'play':'jump';
  _w3d.ai.t=kind==='play'?2.6:1.4;
}
/* 舞台内提示（舞台隐藏时退回 App toast） */
function w3dMsg(t){
  const st=$('w3dStage'),el=$('w3dToast');
  if(!st||!st.classList.contains('show')||!el){toast(t);return}
  el.textContent=t;el.classList.add('show');
  clearTimeout(el._tm);el._tm=setTimeout(function(){el.classList.remove('show')},2000);
}
function w3dSay(t){if(!_w3d)return;_w3d.say=t;_w3d.sayUntil=_w3d.clock.elapsedTime+3}
function w3dFx(icon,color){
  if(!_w3d||!_w3d.pet)return;
  const v=_w3d.pet.position.clone();v.y+=1.7;v.project(_w3d.camera);
  const x=(v.x*0.5+0.5)*_w3d.viewW,y=(-v.y*0.5+0.5)*_w3d.viewH;
  const box=$('w3dFx');if(!box)return;
  for(let i=0;i<3;i++){
    const s=document.createElement('span');s.className='w3d-fx-i';s.textContent=icon;
    s.style.left=(x+(Math.random()*56-28))+'px';s.style.top=(y+(Math.random()*14-7))+'px';
    s.style.color=color;s.style.animationDelay=(i*0.12)+'s';
    box.appendChild(s);setTimeout(function(){s.remove()},1500);
  }
}
/* 离线结算（世界版，替换原家园 settleGarden）：饥饿 -2/h 下限0、心情 -1/h 下限20；离开 >8h 弹「主人回来了」 */
function settleWorld(){
  if(!S||!S.world)return false;
  const now=Date.now();
  const last=S.world.lastLeave||now;
  S.world.lastLeave=now;
  const hrs=Math.min((now-last)/36e5,240);
  if(hrs<0.2){save();return false}
  const before={};
  S.pets.forEach(function(pp){const wp=worldPet(pp.id);before[pp.id]={h:wp.attr.hunger,m:wp.attr.mood};
    wp.attr.hunger=Math.max(0,wp.attr.hunger-hrs*2);
    wp.attr.mood=Math.max(20,wp.attr.mood-hrs*1);});
  save();
  if(hrs>8){showBackCard(before[S.curPet]||{h:0,m:0});return true}
  return false;
}
function showBackCard(before){
  const w=worldPet();
  openModal('<div style="text-align:center"><div style="font-size:44px">🏡</div><div style="font-size:17px;font-weight:900;margin-top:8px">主人回来了！</div><div style="font-size:12.5px;color:var(--sub);margin:10px 0;line-height:1.8">离开期间「'+esc(curPet().name)+'」在世界小院自主生活，<br>属性按离线规则衰减（饥饿 -2/h 下限 0 · 心情 -1/h 下限 20）：<br>饥饿值 '+Math.round(w.attr.hunger)+'（原 '+Math.round(before.h)+'） · 心情值 '+Math.round(w.attr.mood)+'（原 '+Math.round(before.m)+'）<br>快去喂喂它、陪陪它吧～</div><button class="btn" onclick="closeModal();openWorld()">回世界看看</button></div>');
}
/* ---------- three.js 场景搭建 ---------- */
function w3dInit(){
  const gl=$('w3dGL');
  const renderer=new THREE.WebGLRenderer({antialias:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  gl.appendChild(renderer.domElement);
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(50,16/9,0.1,220);
  _w3d={renderer:renderer,scene:scene,camera:camera,rotated:false,viewW:1280,viewH:720,
    cam:{theta:0.55,phi:1.02,r:16,tx:0,ty:1.1,tz:0},
    pet:null,petInner:null,petId:null,mixer:null,actions:null,curAnim:null,
    ai:{state:'idle',t:2.5,target:null},
    buildings:[],signs:[],_signLk:null,
    weather:'sunny',weatherT:60,leaves:null,leafSpd:null,rain:null,rainSpd:null,
    shelter:new THREE.Vector3(5.6,0,-2.9),
    ray:new THREE.Raycaster(),ptrs:new Map(),moved:0,pinch0:0,
    suspended:false,clock:new THREE.Clock(),bubbleT:0,hudT:0,hudDirty:true,
    say:'',sayUntil:0,sun:null,amb:null,fbParts:null};
  w3dBuildScene();
  w3dLoadPet();
  w3dBindInput();
  window.addEventListener('resize',function(){if($('w3dStage').classList.contains('show'))w3dLayout()});
  renderer.setAnimationLoop(w3dTick);
}
function w3dBuildScene(){
  const s=_w3d.scene;
  const amb=new THREE.AmbientLight(0xffffff,0.72);s.add(amb);_w3d.amb=amb;
  const sun=new THREE.DirectionalLight(0xfff2d9,0.95);sun.position.set(9,15,7);s.add(sun);_w3d.sun=sun;
  /* 草坪庭院 */
  const grass=new THREE.Mesh(new THREE.CircleGeometry(34,48),new THREE.MeshLambertMaterial({color:0x7CBF6A}));
  grass.rotation.x=-Math.PI/2;s.add(grass);
  const inner=new THREE.Mesh(new THREE.CircleGeometry(12.6,40),new THREE.MeshLambertMaterial({color:0x8CCB78}));
  inner.rotation.x=-Math.PI/2;inner.position.y=0.01;s.add(inner);
  /* 篱笆（留出入口） */
  const fenceMat=new THREE.MeshLambertMaterial({color:0xB9906B});
  for(let i=0;i<26;i++){
    const a=i/26*Math.PI*2;
    if(a>Math.PI*0.42&&a<Math.PI*0.58)continue;
    const post=new THREE.Mesh(new THREE.BoxGeometry(0.16,0.85,0.16),fenceMat);
    post.position.set(Math.cos(a)*12.6,0.42,Math.sin(a)*12.6);s.add(post);
  }
  /* 石板路 */
  const stoneMat=new THREE.MeshLambertMaterial({color:0xD8D2C4});
  for(let i=0;i<5;i++){
    const st=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.5,0.06,10),stoneMat);
    st.position.set((i%2?0.28:-0.22),0.03,10.8-i*1.7);s.add(st);
  }
  /* 树（秋色） */
  [[-6.2,-4.4,0xD9822B],[7.4,4.6,0xC94F3D],[-4.2,7.2,0xE0A13C]].forEach(function(t){
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.24,1.5,8),new THREE.MeshLambertMaterial({color:0x8A6238}));
    trunk.position.set(t[0],0.75,t[1]);s.add(trunk);
    const c1=new THREE.Mesh(new THREE.ConeGeometry(1.25,2.1,8),new THREE.MeshLambertMaterial({color:t[2]}));
    c1.position.set(t[0],2.4,t[1]);s.add(c1);
    const c2=new THREE.Mesh(new THREE.ConeGeometry(0.85,1.5,8),new THREE.MeshLambertMaterial({color:t[2]}));
    c2.position.set(t[0],3.5,t[1]);s.add(c2);
  });
  /* 花丛 */
  for(let i=0;i<8;i++){
    const a=Math.random()*Math.PI*2,r=3.5+Math.random()*7;
    const fl=new THREE.Mesh(new THREE.SphereGeometry(0.16,8,8),new THREE.MeshLambertMaterial({color:[0xF5D061,0xE8709A,0xFFFFFF,0x8B5CF6][i%4]}));
    fl.position.set(Math.cos(a)*r,0.14,Math.sin(a)*r);s.add(fl);
  }
  /* 坡顶小屋 + 屋檐（雨天躲避点） */
  const house=new THREE.Group();
  const base=new THREE.Mesh(new THREE.BoxGeometry(4,2.5,3.4),new THREE.MeshLambertMaterial({color:0xF2E3C9}));
  base.position.y=1.25;house.add(base);
  const roof=new THREE.Mesh(new THREE.ConeGeometry(3.3,1.9,4),new THREE.MeshLambertMaterial({color:0xC9603F}));
  roof.rotation.y=Math.PI/4;roof.scale.set(1.18,1,1);roof.position.y=3.4;house.add(roof);
  const door=new THREE.Mesh(new THREE.BoxGeometry(0.9,1.5,0.1),new THREE.MeshLambertMaterial({color:0x8A6238}));
  door.position.set(-0.6,0.75,1.72);house.add(door);
  const win=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.8,0.1),new THREE.MeshLambertMaterial({color:0xBEE3F8}));
  win.position.set(0.9,1.5,1.72);house.add(win);
  const eave=new THREE.Mesh(new THREE.BoxGeometry(4.4,0.12,1.5),new THREE.MeshLambertMaterial({color:0xB9906B}));
  eave.position.set(0,2.15,2.35);house.add(eave);
  house.position.set(5.6,0,-5.6);
  s.add(house);
  /* 建筑热点（低多边形建筑 + Canvas 纹理招牌） */
  W3D_SPOTS.forEach(function(sp){
    const g=new THREE.Group();g.userData.tab=sp.tab;
    const b=new THREE.Mesh(new THREE.BoxGeometry(2.1,1.7,1.9),new THREE.MeshLambertMaterial({color:0xF5EFE2}));
    b.position.y=0.85;g.add(b);
    const rf=new THREE.Mesh(new THREE.ConeGeometry(1.7,1,4),new THREE.MeshLambertMaterial({color:sp.c}));
    rf.rotation.y=Math.PI/4;rf.position.y=2.2;g.add(rf);
    const cv=document.createElement('canvas');cv.width=256;cv.height=128;
    const tex=new THREE.CanvasTexture(cv);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.9,0.95),new THREE.MeshBasicMaterial({map:tex,transparent:true}));
    sign.position.set(0,1.15,0.98);g.add(sign);
    const rec={cv:cv,ctx:cv.getContext('2d'),tex:tex,spot:sp};
    _w3d.signs.push(rec);w3dDrawSign(rec);
    g.position.set(sp.x,0,sp.z);
    g.lookAt(0,1,0);
    s.add(g);_w3d.buildings.push(g);
  });
  /* 秋季落叶粒子 */
  const leafN=90,lp=new Float32Array(leafN*3),lc=new Float32Array(leafN*3),spd=[];
  const pal=[[0.85,0.51,0.17],[0.79,0.31,0.24],[0.88,0.63,0.24]];
  for(let i=0;i<leafN;i++){
    lp[i*3]=(Math.random()-0.5)*36;lp[i*3+1]=Math.random()*10;lp[i*3+2]=(Math.random()-0.5)*36;
    const c=pal[i%3];lc[i*3]=c[0];lc[i*3+1]=c[1];lc[i*3+2]=c[2];
    spd.push(0.4+Math.random()*0.7);
  }
  const lg=new THREE.BufferGeometry();
  lg.setAttribute('position',new THREE.BufferAttribute(lp,3));
  lg.setAttribute('color',new THREE.BufferAttribute(lc,3));
  const leaves=new THREE.Points(lg,new THREE.PointsMaterial({size:0.22,vertexColors:true,transparent:true,opacity:0.95}));
  s.add(leaves);_w3d.leaves=leaves;_w3d.leafSpd=spd;
  /* 雨粒子 */
  const rainN=420,rp=new Float32Array(rainN*3),rs=[];
  for(let i=0;i<rainN;i++){rp[i*3]=(Math.random()-0.5)*40;rp[i*3+1]=Math.random()*16;rp[i*3+2]=(Math.random()-0.5)*40;rs.push(16+Math.random()*8)}
  const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));
  const rain=new THREE.Points(rg,new THREE.PointsMaterial({size:0.13,color:0x9FB8D8,transparent:true,opacity:0.75}));
  rain.visible=false;s.add(rain);_w3d.rain=rain;_w3d.rainSpd=rs;
  w3dWeather(true);
}
/* 天空渐变 + 光照随天气切换（晴/阴/小雨） */
function w3dSetSky(kind){
  const cv=document.createElement('canvas');cv.width=4;cv.height=128;
  const c=cv.getContext('2d');const gr=c.createLinearGradient(0,0,0,128);
  if(kind==='sunny'){gr.addColorStop(0,'#3E7CD6');gr.addColorStop(0.6,'#8FC2F2');gr.addColorStop(1,'#E8F4FF')}
  else if(kind==='overcast'){gr.addColorStop(0,'#5E6E84');gr.addColorStop(0.7,'#9AABC0');gr.addColorStop(1,'#C9D6E2')}
  else{gr.addColorStop(0,'#3A4A63');gr.addColorStop(0.7,'#6B7E97');gr.addColorStop(1,'#93A5B8')}
  c.fillStyle=gr;c.fillRect(0,0,4,128);
  _w3d.scene.background=new THREE.CanvasTexture(cv);
  if(_w3d.sun)_w3d.sun.intensity=kind==='sunny'?0.95:(kind==='overcast'?0.55:0.32);
  if(_w3d.amb)_w3d.amb.intensity=kind==='sunny'?0.72:(kind==='overcast'?0.6:0.5);
}
function w3dWeather(first){
  const r=Math.random();
  const w=r<0.6?'sunny':(r<0.85?'overcast':'rain');
  _w3d.weather=w;_w3d.weatherT=90+Math.random()*60;
  w3dSetSky(w);
  if(_w3d.rain)_w3d.rain.visible=(w==='rain');
  if(w==='rain'&&!first)w3dSay('下雨了，'+curPet().name+'跑去屋檐躲雨…');
}
function w3dDrawSign(rec){
  const ctx=rec.ctx,sp=rec.spot;
  const locked=sp.lock&&worldLevel()<WSPORT_UNLOCK_LV;
  ctx.clearRect(0,0,256,128);
  ctx.fillStyle=locked?'rgba(110,116,128,0.95)':'#'+sp.c.toString(16).padStart(6,'0');
  ctx.beginPath();
  if(ctx.roundRect)ctx.roundRect(6,6,244,116,20);else ctx.rect(6,6,244,116);
  ctx.fill();
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='44px sans-serif';ctx.fillText(sp.ic,128,48);
  ctx.font='bold 30px sans-serif';ctx.fillText(sp.n+(locked?' 🔒':''),128,96);
  rec.tex.needsUpdate=true;
}
function w3dSignRefresh(){
  if(!_w3d||!_w3d.signs)return;
  const lk=worldLevel()<WSPORT_UNLOCK_LV;
  if(_w3d._signLk!==lk){_w3d._signLk=lk;_w3d.signs.forEach(w3dDrawSign)}
}
/* 宠物模型：GLTF 加载（8s 超时 → 程序化兜底） */
function w3dLoadPet(){
  const p=curPet();const cfg=W3D_MODELS[p.species]||W3D_MODELS['猫'];
  _w3d.petId=S.curPet;
  let done=false;
  const to=setTimeout(function(){if(!done){done=true;w3dUseFallbackPet()}},8000);
  try{
    const loader=new THREE.GLTFLoader();
    loader.load(cfg.url,function(g){
      if(done)return;done=true;clearTimeout(to);
      const model=g.scene;
      /* 归一化到目标身高（源模型尺度不一），猫0.8/狗1.0 */
      const bb=new THREE.Box3().setFromObject(model);
      const hgt=Math.max(bb.max.y-bb.min.y,0.001);
      const targetH=(p.species==='鸟'||p.species==='异宠')?1.0:1.25;
      model.scale.setScalar(cfg.scale*targetH/hgt);
      const bb2=new THREE.Box3().setFromObject(model);
      const cx=(bb2.max.x+bb2.min.x)/2,cz=(bb2.max.z+bb2.min.z)/2;
      model.position.set(-cx,-bb2.min.y,-cz);
      w3dMountPet(model,g.animations||[]);
    },undefined,function(){if(!done){done=true;clearTimeout(to);w3dUseFallbackPet()}});
  }catch(e){if(!done){done=true;clearTimeout(to);w3dUseFallbackPet()}}
}
function w3dMountPet(model,clips){
  const grp=new THREE.Group();grp.userData.pet=true;
  grp.add(model);
  const blob=new THREE.Mesh(new THREE.CircleGeometry(0.75,24),new THREE.MeshBasicMaterial({color:0x1B3A22,transparent:true,opacity:0.22}));
  blob.rotation.x=-Math.PI/2;blob.position.y=0.02;grp.add(blob);
  _w3d.scene.add(grp);
  _w3d.pet=grp;_w3d.petInner=model;
  if(clips&&clips.length){
    _w3d.mixer=new THREE.AnimationMixer(model);
    const pick=function(re){return clips.find(function(c){return re.test(c.name)})};
    const idle=pick(/survey|idle/i)||clips[0],walk=pick(/walk/i)||idle,run=pick(/run|gallop|fly/i)||walk;
    _w3d.actions={idle:_w3d.mixer.clipAction(idle),walk:_w3d.mixer.clipAction(walk),run:_w3d.mixer.clipAction(run)};
    _w3d.actions.idle.play();_w3d.curAnim=_w3d.actions.idle;
  }
  if(_w3d.weather==='rain'){_w3d.ai.state='walkShelter';_w3d.ai.target=_w3d.shelter.clone()}
}
/* 程序化球体拼装兜底模型（动画手写） */
function w3dUseFallbackPet(){
  if(!_w3d)return;
  const grp=new THREE.Group();grp.userData.pet=true;
  const mat=new THREE.MeshLambertMaterial({color:0xE8A25C});
  const cream=new THREE.MeshLambertMaterial({color:0xFBE3C4});
  const body=new THREE.Mesh(new THREE.SphereGeometry(0.55,20,16),mat);
  body.scale.set(1,0.85,1.25);body.position.y=0.6;grp.add(body);
  const head=new THREE.Mesh(new THREE.SphereGeometry(0.36,20,16),mat);
  head.position.set(0,1.18,0.45);grp.add(head);
  const muz=new THREE.Mesh(new THREE.SphereGeometry(0.18,12,10),cream);
  muz.position.set(0,1.1,0.74);grp.add(muz);
  const earL=new THREE.Mesh(new THREE.ConeGeometry(0.13,0.3,6),mat);
  earL.position.set(-0.2,1.5,0.36);grp.add(earL);
  const earR=earL.clone();earR.position.x=0.2;grp.add(earR);
  const tail=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.1,0.7,8),mat);
  tail.position.set(0,0.85,-0.72);tail.rotation.x=-0.9;grp.add(tail);
  const legs=[];
  [[-0.26,0.32],[0.26,0.32],[-0.26,-0.32],[0.26,-0.32]].forEach(function(l){
    const leg=new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.5,8),mat);
    leg.position.set(l[0],0.25,l[1]);grp.add(leg);legs.push(leg);
  });
  const blob=new THREE.Mesh(new THREE.CircleGeometry(0.75,24),new THREE.MeshBasicMaterial({color:0x1B3A22,transparent:true,opacity:0.22}));
  blob.rotation.x=-Math.PI/2;blob.position.y=0.02;grp.add(blob);
  _w3d.scene.add(grp);
  _w3d.pet=grp;_w3d.petInner=null;_w3d.mixer=null;_w3d.actions=null;
  _w3d.fbParts={body:body,head:head,tail:tail,legs:legs};
}
function w3dRemovePet(){
  if(!_w3d||!_w3d.pet)return;
  _w3d.scene.remove(_w3d.pet);
  _w3d.pet=null;_w3d.petInner=null;_w3d.mixer=null;_w3d.actions=null;_w3d.fbParts=null;
}
/* AnimationMixer 状态机（交叉淡入 0.3s） */
function w3dPlayAnim(name,ts){
  if(!_w3d||!_w3d.actions)return;
  const next=_w3d.actions[name]||_w3d.actions.idle;
  if(!next)return;
  if(_w3d.curAnim!==next){
    next.reset().fadeIn(0.3).play();
    if(_w3d.curAnim)_w3d.curAnim.fadeOut(0.3);
    _w3d.curAnim=next;
  }
  next.timeScale=ts||1;
}
/* 自主 AI：待机3–6s → 随机游走 → 原地玩耍 → 低体力趴睡 → 下雨躲檐；情绪映射：开心蹦跳/委屈慢走/困倦趴睡 */
function w3dAiTick(dt){
  const ai=_w3d.ai,pet=_w3d.pet;
  if(!pet)return;
  ai.t-=dt;
  const A=worldPet().attr;
  const upset=A.hunger<30||A.clean<30;
  const sleepy=A.stamina<25;
  const happy=A.mood>=70;
  if(_w3d.weather==='rain'&&ai.state!=='shelter'&&ai.state!=='walkShelter'){ai.state='walkShelter';ai.target=_w3d.shelter.clone()}
  if(ai.state==='idle'){
    pet.position.y=0;
    w3dPlayAnim('idle');
    if(ai.t<=0){
      if(sleepy){ai.state='sleep';ai.t=8+Math.random()*4}
      else if(_w3d.weather!=='rain'&&Math.random()<0.55){ai.state='walk';ai.target=w3dRandomPoint()}
      else{ai.state='play';ai.t=2.5+Math.random()*2}
    }
  }else if(ai.state==='walk'||ai.state==='walkShelter'){
    const sp=upset?0.9:(happy?2.6:1.7);
    w3dPlayAnim(sp>2.2?'run':'walk',upset?0.6:1);
    const dir=ai.target.clone().sub(pet.position);dir.y=0;
    const d=dir.length();
    if(d<0.3){
      if(ai.state==='walkShelter'){ai.state='shelter';ai.t=9999}
      else{ai.state='idle';ai.t=3+Math.random()*3}
    }else{
      dir.normalize();
      pet.position.addScaledVector(dir,sp*dt);
      pet.rotation.y=Math.atan2(dir.x,dir.z);
      const rr=Math.hypot(pet.position.x,pet.position.z);
      if(rr>11.5){pet.position.x*=11.5/rr;pet.position.z*=11.5/rr}
    }
  }else if(ai.state==='shelter'){
    pet.position.y=0;
    w3dPlayAnim('idle');
    if(_w3d.weather!=='rain'){ai.state='idle';ai.t=1.2}
  }else if(ai.state==='play'||ai.state==='jump'){
    w3dPlayAnim('idle');
    const k=ai.state==='jump'?7:(happy?6:4);
    const h=happy||ai.state==='jump'?0.34:0.18;
    pet.position.y=Math.abs(Math.sin(_w3d.clock.elapsedTime*k))*h;
    pet.rotation.y+=dt*(happy?2.2:1.1);
    if(ai.t<=0){pet.position.y=0;ai.state='idle';ai.t=3+Math.random()*3}
  }else if(ai.state==='sleep'){
    pet.position.y=0;
    w3dPlayAnim('idle',0.35);
    if(A.stamina<100){A.stamina=Math.min(100,A.stamina+3*dt);_w3d.hudDirty=true}
    if(A.stamina>55&&ai.t<=0){ai.state='idle';ai.t=2}
  }
  /* 兜底模型的手写动画 */
  if(_w3d.fbParts){
    const t=_w3d.clock.elapsedTime,fb=_w3d.fbParts;
    const walking=ai.state==='walk'||ai.state==='walkShelter';
    fb.body.position.y=0.6+Math.sin(t*3)*0.03;
    fb.head.position.y=1.18+(ai.state==='sleep'?-0.22:Math.sin(t*3)*0.04);
    fb.tail.rotation.z=Math.sin(t*(happy?8:3))*0.4;
    fb.legs.forEach(function(leg,i){leg.rotation.x=walking?Math.sin(t*10+(i%2?Math.PI:0))*0.5:0});
  }
}
function w3dRandomPoint(){
  for(let i=0;i<6;i++){
    const a=Math.random()*Math.PI*2,r=2+Math.random()*7.5;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(!W3D_SPOTS.some(function(s){return Math.hypot(x-s.x,z-s.z)<2.8}))return new THREE.Vector3(x,0,z);
  }
  return new THREE.Vector3(0,0,4);
}
/* 情绪气泡（Zzz / 委屈吐槽 / 躲雨） */
function w3dAutoBubble(){
  const st=_w3d.ai.state,A=worldPet().attr;
  if(st==='sleep')return '💤 Zzz…';
  if(st==='shelter'||st==='walkShelter')return '🌧 躲雨中…';
  const slot=Math.floor(_w3d.clock.elapsedTime/2.4);
  if(A.hunger<30)return ['肚子咕咕叫了…','想吃饭饭','饿了，没力气跑'][slot%3];
  if(A.clean<30)return ['身上痒痒的…','想洗个泡泡浴'][slot%2];
  return '';
}
function w3dBubbleTick(){
  const b=$('w3dBubble');if(!b||!_w3d.pet)return;
  const txt=_w3d.say||w3dAutoBubble();
  if(txt){
    b.textContent=txt;b.style.display='block';
    const v=_w3d.pet.position.clone();v.y+=2.1;v.project(_w3d.camera);
    b.style.left=((v.x*0.5+0.5)*_w3d.viewW)+'px';
    b.style.top=((-v.y*0.5+0.5)*_w3d.viewH-14)+'px';
  }else b.style.display='none';
}
/* 输入：拖动小角度环绕 / 滚轮·双指缩放 / 点按射线（点宠物=抚摸，点建筑=进面板） */
function w3dPtrDist(){
  const p=[..._w3d.ptrs.values()];
  if(p.length<2)return 0;
  return Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);
}
function w3dContentDelta(dx,dy){
  if(_w3d.rotated)return{du:dy,dv:-dx};
  return{du:dx,dv:dy};
}
function w3dNdc(e){
  const cx=window.innerWidth/2,cy=window.innerHeight/2;
  let lx,ly;
  if(_w3d.rotated){lx=_w3d.viewW/2+(e.clientY-cy);ly=_w3d.viewH/2-(e.clientX-cx)}
  else{lx=_w3d.viewW/2+(e.clientX-cx);ly=_w3d.viewH/2+(e.clientY-cy)}
  return new THREE.Vector2(lx/_w3d.viewW*2-1,-(ly/_w3d.viewH*2-1));
}
function w3dBindInput(){
  const el=_w3d.renderer.domElement;
  el.style.touchAction='none';
  el.addEventListener('pointerdown',function(e){
    _w3d.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    _w3d.moved=0;
    if(_w3d.ptrs.size===2)_w3d.pinch0=w3dPtrDist();
  });
  el.addEventListener('pointermove',function(e){
    if(!_w3d.ptrs.has(e.pointerId))return;
    const prev=_w3d.ptrs.get(e.pointerId);
    const dx=e.clientX-prev.x,dy=e.clientY-prev.y;
    _w3d.ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
    _w3d.moved+=Math.abs(dx)+Math.abs(dy);
    if(_w3d.ptrs.size===1){
      const d=w3dContentDelta(dx,dy);
      _w3d.cam.theta=Math.max(-0.5,Math.min(1.6,_w3d.cam.theta-d.du*0.004));
      _w3d.cam.phi=Math.max(0.55,Math.min(1.35,_w3d.cam.phi-d.dv*0.003));
    }else if(_w3d.ptrs.size===2){
      const d=w3dPtrDist();
      if(_w3d.pinch0)_w3d.cam.r=Math.max(8,Math.min(26,_w3d.cam.r*_w3d.pinch0/d));
      _w3d.pinch0=d;
    }
  });
  const up=function(e){
    const wasTap=_w3d.ptrs.size===1&&_w3d.moved<8;
    _w3d.ptrs.delete(e.pointerId);_w3d.pinch0=0;
    if(wasTap)w3dTap(e);
  };
  el.addEventListener('pointerup',up);
  el.addEventListener('pointercancel',up);
  el.addEventListener('wheel',function(e){
    e.preventDefault();
    _w3d.cam.r=Math.max(8,Math.min(26,_w3d.cam.r*(1+(e.deltaY>0?0.08:-0.08))));
  },{passive:false});
}
function w3dTap(e){
  const n=w3dNdc(e);
  _w3d.ray.setFromCamera(n,_w3d.camera);
  if(_w3d.pet){
    const hit=_w3d.ray.intersectObject(_w3d.pet,true);
    if(hit.length){w3dAct('touch');return}
  }
  const hits=_w3d.ray.intersectObjects(_w3d.buildings,true);
  if(hits.length){
    let o=hits[0].object;
    while(o&&!o.userData.tab)o=o.parent;
    if(o)w3dOpenTab(o.userData.tab);
  }
}
/* 点击建筑：舞台挂起 → 系统面板；运动/娱乐 Lv.30 解锁 */
function w3dOpenTab(t){
  const locked=(t==='sport'||t==='fun')&&worldLevel()<WSPORT_UNLOCK_LV;
  if(locked){w3dMsg('成长等级 Lv.'+WSPORT_UNLOCK_LV+' 解锁（当前 Lv.'+worldLevel()+'）');return}
  w3dSuspend();go('world');openWTab(t);
}
/* HUD：顶部六维属性紧凑条 + 金币A + 世界等级 */
function w3dHudRefresh(){
  if(!_w3d)return;
  const A=worldPet().attr;
  const bars=[['hunger','🍖','#E8945A'],['clean','🫧','#3AB5C0'],['mood','💗','#E8709A'],['stamina','⚡','#5B8DEF'],['wisdom','📖','#8B5CF6'],['growth','🌱','#3BB786']];
  const el=$('w3dStats');
  if(el)el.innerHTML=bars.map(function(b){
    const v=b[0]==='growth'?Math.min(100,(A.growth%50)/50*100):Math.min(100,A[b[0]]);
    return '<div class="w3d-mini" title="'+WNAMES[b[0]]+'"><span>'+b[1]+'</span><div class="w3d-mbar"><i style="width:'+v+'%;background:'+b[2]+'"></i></div><b>'+Math.round(A[b[0]])+'</b></div>';
  }).join('');
  const coin=$('w3dCoin');
  if(coin)coin.textContent='🪙 '+S.world.coinA+' · Lv.'+worldLevel();
  _w3d.hudDirty=false;
  w3dSignRefresh();
}
/* 帧循环（requestAnimationFrame + delta） */
function w3dTick(){
  if(!_w3d||_w3d.suspended)return;
  const st=$('w3dStage');if(!st||!st.classList.contains('show'))return;
  const dt=Math.min(_w3d.clock.getDelta(),0.05);
  if(_w3d.mixer)_w3d.mixer.update(dt);
  /* 天气轮换 */
  _w3d.weatherT-=dt;
  if(_w3d.weatherT<=0)w3dWeather(false);
  /* 落叶粒子 */
  if(_w3d.leaves){
    const lp=_w3d.leaves.geometry.attributes.position;
    for(let i=0;i<_w3d.leafSpd.length;i++){
      let y=lp.getY(i)-_w3d.leafSpd[i]*dt;
      lp.setX(i,lp.getX(i)+Math.sin(_w3d.clock.elapsedTime+i)*dt*0.5);
      if(y<0){y=8+Math.random()*4;lp.setX(i,(Math.random()-0.5)*36);lp.setZ(i,(Math.random()-0.5)*36)}
      lp.setY(i,y);
    }
    lp.needsUpdate=true;
  }
  /* 雨粒子 */
  if(_w3d.rain&&_w3d.rain.visible){
    const rp=_w3d.rain.geometry.attributes.position;
    for(let i=0;i<_w3d.rainSpd.length;i++){
      let y=rp.getY(i)-_w3d.rainSpd[i]*dt;
      if(y<0)y=14+Math.random()*4;
      rp.setY(i,y);
    }
    rp.needsUpdate=true;
  }
  w3dAiTick(dt);
  /* 相机环绕 */
  const c=_w3d.cam;
  _w3d.camera.position.set(
    c.tx+c.r*Math.sin(c.phi)*Math.sin(c.theta),
    c.ty+c.r*Math.cos(c.phi),
    c.tz+c.r*Math.sin(c.phi)*Math.cos(c.theta));
  _w3d.camera.lookAt(c.tx,c.ty,c.tz);
  /* 气泡与吐槽 */
  if(_w3d.say&&_w3d.clock.elapsedTime>_w3d.sayUntil)_w3d.say='';
  _w3d.bubbleT-=dt;
  if(_w3d.bubbleT<=0){_w3d.bubbleT=0.25;w3dBubbleTick()}
  /* HUD（脏标记 + 2Hz 心跳） */
  _w3d.hudT-=dt;
  if(_w3d.hudDirty||_w3d.hudT<=0){_w3d.hudT=0.5;w3dHudRefresh()}
  _w3d.renderer.render(_w3d.scene,_w3d.camera);
}
