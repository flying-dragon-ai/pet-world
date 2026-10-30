/**
 * 健康记录共享件：记录类型表、记录卡片、快捷打卡、提醒剩余天数。
 *
 * 这几个东西同时被首页 / 健康页 / 档案页使用，独立成一个叶子模块，
 * 避免三个视图模块互相 import 形成循环依赖。
 */
import { $ } from '../app/dom.js';
import { S } from '../app/store.js';
import { toast } from '../app/ui.js';
import { formatRelativeTime } from '../app/format.js';
import { curPet, petGarden } from './pets.js';
import { today } from './../app/clock.js';
import { esc } from './../app/dom.js';
import { save } from './../app/store.js';
import { openModal } from './../app/ui.js';
import { awardPoints } from './points.js';
import { registerActions } from './../app/actions.js';

export function quickAdd(k,v){
  const d=S.daily.filter(x=>x.pet===S.curPet&&x.k===k&&new Date(x.ts).toDateString()===new Date().toDateString());
  if(k!=='weight'&&d.length){
    openModal('<div style="font-size:15px;font-weight:800;margin-bottom:8px">今天已录入过该项</div><div style="font-size:12.5px;color:var(--sub);margin-bottom:16px">同日重复录入：覆盖将替换今天的数据</div><div style="display:flex;gap:10px"><button class="btn btn-ghost" onclick="app.closeModal()">取消</button><button class="btn" onclick="app.closeModal();app.commitDailyRecord(\''+k+'\','+v+',\'overwrite\')">覆盖（默认）</button><button class="btn btn-ghost" onclick="app.closeModal();app.commitDailyRecord(\''+k+'\','+v+',\'append\')">新增</button></div>');
    return;
  }
  S.daily.push({pet:S.curPet,k,v,ts:Date.now(),by:S.user.nick});
  petGarden(curPet()).tasks.health=today();awardPoints(15,'健康打卡');
  if(k==='weight'){curPet().weight=v;toast('体重已记录并同步档案基线')}
  save();
}

export function rmDays(id){const r=S.reminders.find(x=>x.id===id);if(!r)return '-';const d=Math.ceil((new Date(r.next)-new Date())/864e5);return d<0?0:d}

export const RTYPES=[
  {id:'vaccine',n:'疫苗',i:'i-shield',c:'#4CA876'},
  {id:'deworm',n:'驱虫',i:'i-drop',c:'#3AB5C0'},
  {id:'care',n:'洗护',i:'i-leaf',c:'#8B7DE8'},
  {id:'medical',n:'就医',i:'i-med',c:'#F05B5B'},
  {id:'diet',n:'饮食',i:'i-bowl',c:'#E8945A'}
];

export function recCard(r){
  const t=RTYPES.find(x=>x.id===r.type);
  const fields={vaccine:[['品牌',r.brand],['批号',r.batch],['医院',r.hospital],['方式',r.way],['下次到期',r.next]],
  deworm:[['类型',r.dtype],['药品',r.drug],['给药',r.dway],['下次到期',r.next]],
  care:[['项目',r.items],['场所',r.place]],
  medical:[['医院',r.hospital],['诊断',r.diag],['处方',r.rx],['复诊',r.revisit]],
  diet:[['分量',r.gram?r.gram+'g':''],['餐次',r.meals]]}[r.type].filter(f=>f[1]);
  return '<div class="card record-item" style="padding:13px 15px;margin-bottom:10px"><div style="display:flex;align-items:center;gap:8px;margin-bottom:7px"><span class="chip" style="background:'+t.c+'1c;color:'+t.c+';font-size:10px">'+t.n+'</span><b style="font-size:13.5px">'+esc(r.name)+'</b><span style="font-size:10.5px;color:var(--sub)">'+r.date+'</span><span style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:10px;color:var(--sub)"><div style="width:16px;height:16px;border-radius:50%;background:#DCE9FA;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:800;color:#5B8DEF">'+(r.by||'我')[0]+'</div>'+(r.by||'我')+'</span></div>'+
  (fields.length?'<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px">'+fields.map(f=>'<span style="font-size:10.5px;color:var(--sub);background:rgba(0,0,0,.03);padding:3px 8px;border-radius:8px">'+f[0]+'：'+esc(f[1])+'</span>').join('')+'</div>':'')+
  (r.note?'<div style="font-size:11.5px;color:#666">'+esc(r.note)+'</div>':'')+
  '<div style="display:flex;gap:14px;margin-top:8px;font-size:11px;color:var(--blue-d)"><span style="cursor:pointer" onclick="app.editRec(\''+r.id+'\')">编辑</span><span style="cursor:pointer;color:#F05B5B" onclick="app.deleteRecord(\''+r.id+'\')">删除</span></div></div>';
}
