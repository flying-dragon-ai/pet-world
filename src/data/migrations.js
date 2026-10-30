/**
 * 存档迁移：把任意历史版本的数据补齐到当前结构。
 *
 * 原则：
 * 1. 迁移只做"补字段 / 改名 / 补默认"，不改用户已有内容；
 * 2. 结构对不上（版本不认识）就整体回到出厂存档，避免半新半旧的状态；
 * 3. 迁移函数接收 state 并返回 state，不碰全局，方便单测。
 */
import { seed, seedNotifs, dogP3, v17extra, ACTS, NEWPRODS } from './seed.js';
import { now } from '../app/clock.js';
import { SCHEMA_VERSION } from '../app/config.js';

export function migrateV3(S){
  const zmap={'猫猫':'猫区','狗狗':'狗区','异宠':'异宠区'};
  (S.posts||[]).forEach(po=>{if(zmap[po.zone])po.zone=zmap[po.zone];if(!po.media)po.media='图文';});
  if(!(S.posts||[]).some(p=>p.zone==='鸟区')){
    S.posts.push({id:'po7',zone:'鸟区',auth:'玄凤小张',authImg:'https://images.unsplash.com/photo-1552728084-7afe55122d02?w=80&h=80&fit=crop',time:Date.now()-4*3600e3,title:'玄凤学会了《小星星》前两个音',txt:'练了整整两个月，终于会吹《小星星》前两个音了，掌声在哪里！',img:'https://images.unsplash.com/photo-1552728084-7afe55122d02?w=600&h=400&fit=crop',likes:156,cmts:[],favs:33,media:'图文'});
  }
  const cmap={'主粮':'猫粮','用品':'宠物家居','清洁':'洗护用品'};
  (S.products||[]).forEach(pr=>{if(cmap[pr.cat])pr.cat=cmap[pr.cat]});
  NEWPRODS.forEach(np=>{if(!S.products.find(p=>p.id===np.id))S.products.push(np)});
  (S.pets||[]).forEach(p=>{if(!p.personality)p.personality=['活泼'];if(p.important===undefined)p.important=''});
  if(!S.acts||!S.acts.length)S.acts=ACTS.slice();
  if(S.hostApplied===undefined)S.hostApplied=false;
  if(!S.views)S.views=[];
  S.v = 3;
  return S;
}

const CURRENT_PET_NAMES = { p1: '小可爱', p2: '小乐', p3: '尖尖' };

/** v1 → v2：补设备、宠物家园属性、评论时间戳字段 */
function migrateV1toV2(S) {
  if (!S.devices) S.devices = ['客厅摄像头', '卧室摄像头'];
  (S.pets || []).forEach((p, i) => {
    p.acc = p.acc || '';
    p.fur = p.fur || '';
    if (!p.g) {
      p.g = {
        satiety: i === 0 ? 64 : 70,
        mood: i === 0 ? 70 : 66,
        clean: i === 0 ? 80 : 78,
        vitality: i === 0 ? 58 : 64,
        growth: i === 0 ? 130 : 86,
        touchCount: 0,
        tasks: {},
      };
    }
  });
  (S.posts || []).forEach((po) => (po.cmts || []).forEach((c) => {
    if (c.ts === undefined) c.ts = typeof c.t === 'number' ? c.t : now();
    if (c.t2 === undefined) c.t2 = typeof c.t === 'string' ? c.t : '（历史评论）';
    if (!c.replies) c.replies = [];
    if (c.del === undefined) c.del = false;
  }));
  S.v = 2;
  return S;
}

/** 宠物改名兜底（V1.7.3） */
function renamePets(S) {
  (S.pets || []).forEach((p) => {
    const want = CURRENT_PET_NAMES[p.id];
    if (want && p.name !== want) p.name = want;
  });
}

/** V1.7.1 新增模块数据兜底：缺失的 key 逐个补，已有的不动 */
function fillV17Extras(S) {
  const extra = v17extra();
  Object.keys(extra).forEach((k) => {
    if (S[k] === undefined) S[k] = extra[k];
  });
  if (S.user && !S.user.ip) S.user.ip = '北京';
  (S.posts || []).forEach((po) => { if (!po.ip) po.ip = '北京'; });
}

/** V1.7 虚拟人宠世界状态兜底 */
function ensureWorld(S) {
  if (!S.world) S.world = { coinA: 30, loginDays: 0, lastLoginDate: '', medals: [], pets: {} };
  if (S.world.lastLeave === undefined) S.world.lastLeave = now();
  if (!S.world.pets) S.world.pets = {};
  if (!Array.isArray(S.world.medals)) S.world.medals = [];
  return S;
}

/**
 * 把磁盘上的存档迁移到当前结构。
 * @param {object} saved 解析后的存档
 * @returns {object} 可直接使用的状态（必要时是全新出厂存档）
 */
export function migrate(saved) {
  let S = saved;
  if (!S || typeof S !== 'object') return seed();

  if (S.v === 1) S = migrateV1toV2(S);
  if (S.v === 2) S = migrateV3(S);
  if (S.v !== SCHEMA_VERSION) return seed();

  if (!S.notifs) S.notifs = seedNotifs();
  if (!Array.isArray(S.pets)) S.pets = [];
  if (!S.pets.some((p) => p.id === 'p3')) {
    S.pets.push(dogP3());
    S.curPet = 'p3';
  }
  renamePets(S);
  if (S.user && S.user.nick === '铲屎官Leo') S.user.nick = '奎因';
  fillV17Extras(S);
  return ensureWorld(S);
}
