/**
 * 人宠世界的数值表（纯数据，无副作用）。
 *
 * 改数值、加课程/商品/场馆/事件都只改这里；规则逻辑在 src/domain/world.js。
 * 事件表的 `story` 是纯函数：(petWorld, ctx) → HTML 文案，ctx 提供宠物名与登录天数，
 * 保持数据层不反向依赖视图层。
 */
import { VENUE_UNLOCK_LEVEL, STREET_FIGHT_IMPULSE, STREET_FIGHT_AGGRESSION } from '../app/config.js';

/** 学费：上课消耗 / 收益 */
export const COURSES = [
  { id: 1, n: '初级课程', sub: '宠物行为习惯课 · 基础体能课', cost: { hunger: 10, clean: 15, mood: 5, stamina: 10 }, gain: { wisdom: 5, growth: 5 } },
  { id: 2, n: '进阶课程', sub: '厨艺课 · 治愈陪伴课 · 才艺课', cost: { hunger: 15, clean: 20, mood: 10, stamina: 15 }, gain: { wisdom: 10, growth: 10 }, need: 1 },
  { id: 3, n: '高级课程', sub: '口才课 · 动物教育心理学 · 导盲搜救课', cost: { hunger: 20, clean: 25, mood: 15, stamina: 20 }, gain: { wisdom: 15, growth: 15 }, need: 2 },
];

/** 打工：唯一金币A 产出途径 */
export const JOBS = [
  { id: 1, n: '初级打工', sub: '送外卖服务 · 猫咖狗咖被撸一天', cost: { hunger: 10, clean: 15, mood: 5, stamina: 10 }, gain: { growth: 5, coinA: 5 }, need: 1 },
  { id: 2, n: '进阶打工', sub: '治愈陪伴师 · 甜品店烘焙师 · 宠物模特走秀', cost: { hunger: 15, clean: 20, mood: 10, stamina: 15 }, gain: { growth: 10, coinA: 15 }, need: 2 },
  { id: 3, n: '高级打工', sub: '直播带货 · 猫狗学校讲师 · 导盲搜救', cost: { hunger: 20, clean: 25, mood: 15, stamina: 20 }, gain: { growth: 15, coinA: 25 }, need: 3 },
];

/** 世界商城：即时使用的消耗品 */
export const GOODS = [
  { id: 'foodA', n: '食物A', ic: '🐟', c: '#E8945A', price: 3, eff: { hunger: 5 }, d: '普通口粮，饥饿值+5' },
  { id: 'foodB', n: '食物B', ic: '🍖', c: '#F05B5B', price: 5, eff: { hunger: 15 }, d: '营养大餐，饥饿值+15' },
  { id: 'clnA', n: '清洁用品A', ic: '🧴', c: '#3AB5C0', price: 4, eff: { clean: 8 }, d: '免洗泡沫，清洁值+8' },
  { id: 'clnB', n: '清洁用品B', ic: '🛁', c: '#5B8DEF', price: 8, eff: { clean: 20 }, d: '香波洗护套装，清洁值+20' },
];

/** 运动馆 / 娱乐馆：Lv.30 解锁，消耗饥饿/体力 + 金币A */
export const VENUES = {
  sport: {
    name: '运动馆',
    ic: '🏟️',
    items: [
      { id: 'frisbee', n: '宠物飞盘', ic: '🥏', cost: { hunger: 8, stamina: 10 }, coin: 3, gain: { mood: 4, growth: 5 }, crg: 1, d: '草坪接飞盘，勇气小幅提升' },
      { id: 'swim', n: '宠物游泳', ic: '🏊', cost: { hunger: 10, stamina: 14 }, coin: 5, gain: { mood: 6, growth: 8 }, crg: 2, d: '恒温泳池，全身锻炼' },
      { id: 'gym', n: '宠物健身房', ic: '🏋️', cost: { hunger: 12, stamina: 18 }, coin: 8, gain: { growth: 10, wisdom: 2 }, crg: 2, d: '专业器械，体能特训' },
      { id: 'bungee', n: '宠物蹦极', ic: '🪂', cost: { hunger: 15, stamina: 22 }, coin: 12, gain: { growth: 14 }, crg: 5, d: '高空挑战，勇气大幅提升' },
      { id: 'skate', n: '宠物溜冰', ic: '⛸️', cost: { hunger: 12, stamina: 16 }, coin: 8, gain: { mood: 8, growth: 9 }, crg: 2, d: '冰场滑行，平衡感训练' },
      { id: 'dive', n: '宠物潜水', ic: '🤿', cost: { hunger: 15, stamina: 20 }, coin: 12, gain: { growth: 13, wisdom: 3 }, crg: 4, d: '深水探险，胆识特训' },
    ],
  },
  fun: {
    name: '娱乐馆',
    ic: '🎡',
    items: [
      { id: 'party', n: '宠物轰趴馆', ic: '🎉', cost: { hunger: 8, stamina: 8 }, coin: 5, gain: { mood: 10, growth: 5 }, d: '社交派对，认识新朋友' },
      { id: 'ktv', n: '宠物KTV', ic: '🎤', cost: { hunger: 6, stamina: 8 }, coin: 5, gain: { mood: 12, growth: 5 }, d: '一展歌喉，心情大好' },
      { id: 'park', n: '宠物游乐场', ic: '🎡', cost: { hunger: 10, stamina: 12 }, coin: 8, gain: { mood: 15, growth: 8 }, d: '旋转木马与滑梯，玩到不想回家' },
      { id: 'cinema', n: '宠物电影院', ic: '🎬', cost: { hunger: 5, stamina: 5 }, coin: 4, gain: { mood: 8, wisdom: 2, growth: 4 }, d: '宠物专场影片，安静长见识' },
      { id: 'arcade', n: '宠物电玩城', ic: '🎮', cost: { hunger: 8, stamina: 10 }, coin: 8, gain: { mood: 12, wisdom: 3, growth: 7 }, d: '益智电玩，反应力训练' },
      { id: 'craft', n: '宠物手作馆', ic: '🧶', cost: { hunger: 6, stamina: 8 }, coin: 6, gain: { mood: 10, wisdom: 4, growth: 6 }, d: '随机刷新：给妈妈做拼豆带回家' },
    ],
  },
};

/** 六维属性显示名 */
export const ATTR_NAMES = {
  hunger: '饥饿值',
  clean: '清洁值',
  mood: '心情值',
  stamina: '体力值',
  wisdom: '智慧值',
  growth: '成长值',
};

/** 六维属性在 UI 里的顺序 / 配色 / 图标（面板与 HUD 共用一份） */
export const ATTR_ROWS = [
  { key: 'hunger', color: '#E8945A', icon: '🍖' },
  { key: 'clean', color: '#3AB5C0', icon: '🫧' },
  { key: 'mood', color: '#E8709A', icon: '💗' },
  { key: 'stamina', color: '#5B8DEF', icon: '⚡' },
  { key: 'wisdom', color: '#8B5CF6', icon: '📖' },
  { key: 'growth', color: '#3BB786', icon: '🌱' },
];

/**
 * 战功事件表：属性条件 + 登录天数达标 → 自动触发一次，发勋章与属性奖励。
 * 新增事件只需往这里追加一条。
 *
 * 条件两种写法：
 *   - `value(w) > threshold`：单值阈值；
 *   - `test(w)`：复合条件（多个二元属性同时满足），例如「街头大战」。
 */
export const WORLD_EVENTS = [
  {
    id: 'butterfly',
    icon: '🦋',
    title: '独自外出追蝴蝶',
    value: (w) => w.courage,
    threshold: 50,
    minLoginDay: 5,
    gain: { growth: 5 },
    story: (w, ctx) =>
      `第 ${ctx.loginDays} 天的午后，阳光正好。<br>「${ctx.petName}」鼓起勇气独自跑出院子，<br>追着一只蝴蝶在草丛里玩了整整一个下午～<br><b style="color:#D9A03C">勇气值 ${w.courage}%（>50%）</b>，符合触发条件`,
    medal: { id: 'butterfly', n: '蝶舞之约', ic: '🦋', d: '勇气值>50%时，登录家园系统第5天触发「独自外出追蝴蝶」事件获得' },
  },
  {
    id: 'streetfight',
    icon: '🥊',
    title: '街头大战',
    test: (w) => w.impulse > STREET_FIGHT_IMPULSE && w.aggression > STREET_FIGHT_AGGRESSION,
    minLoginDay: 3,
    battle: true,
    gain: { growth: 2 },
    story: (w, ctx) =>
      `第 ${ctx.loginDays} 天，「${ctx.petName}」叼着球出门散步，<br>在街角撞上了另一只不讲理的家伙——<br><b style="color:#F05B5B">冲动值 ${w.impulse}% · 攻击值 ${w.aggression}%</b>（均 >60%），<br>谁也没打算先让一步。`,
    medal: { id: 'streetfight', n: '街头硬汉', ic: '🥊', d: '冲动值与攻击值同时>60%时触发「街头大战」事件获得' },
  },
];

/**
 * V1.10：新增 6 枚战功 —— 两枚登录时按状态判定（scholar / worker），
 * 四枚由 3D 世界内的运行时引擎触发（runtime: true，登录时不再自动判定）。
 * 勋章目录由事件表派生，所以面板与 3D HUD 看到的永远是同一份。
 */
export const EXTRA_WORLD_EVENTS = [
  {
    id: 'scholar',
    icon: '🎓',
    title: '三课结业',
    test: (w) => (w.courseLv || 0) >= 3,
    minLoginDay: 1,
    gain: { wisdom: 5, growth: 10 },
    story: () => '三阶课程全部修完，<br>它在院子里把学到的本事演示了一遍，<br>聪明得让人心虚。',
    medal: { id: 'scholar', n: '三课结业', ic: '🎓', d: '修完全部三阶课程后获得' },
  },
  {
    id: 'worker',
    icon: '💰',
    title: '打工皇帝',
    test: (w) => (w.jobLv || 0) >= 5,
    minLoginDay: 1,
    gain: { growth: 10, coinA: 20 },
    story: () => '打工累计满 5 次，<br>它已经是小镇上小有名气的「打工皇帝」，<br>赚回来的金币够买一整排罐头。',
    medal: { id: 'worker', n: '打工皇帝', ic: '💰', d: '累计打工 5 次后获得' },
  },
  {
    id: 'demolish',
    icon: '🔨',
    title: '拆家现场',
    runtime: true,
    gain: {},
    story: () => '捣蛋值爆表，<br>趁主人不注意啃了沙发角、抓了抓墙皮！',
    medal: { id: 'demolish', n: '拆家小能手', ic: '🔨', d: '捣蛋值≥60% 且清洁值偏低时，在院子里触发拆家事件' },
  },
  {
    id: 'explorer',
    icon: '🧭',
    title: '探险时间',
    runtime: true,
    gain: {},
    story: () => '探索欲爆棚，<br>在院子里嗅啊嗅，挖出了一个小宝藏！',
    medal: { id: 'explorer', n: '小小探险家', ic: '🧭', d: '智慧值≥30 且成长值≥100 时触发探险事件' },
  },
  {
    id: 'lazy',
    icon: '😴',
    title: '躺平一整天',
    runtime: true,
    gain: {},
    story: () => '体力见底，<br>它在院子里躺了一整天，尾巴一抖一抖的。',
    medal: { id: 'lazy', n: '躺平大师', ic: '😴', d: '体力值≤20 且心情值≤40 时，触发躺平事件' },
  },
  {
    id: 'rainday',
    icon: '☔',
    title: '雨中等待',
    runtime: true,
    gain: {},
    story: () => '外面下起了小雨，<br>它安静地待在屋檐下，陪着你一起看雨滴落在院子里。',
    medal: { id: 'rainday', n: '雨中等待', ic: '☔', d: '雨天在院子里陪主人看雨时触发' },
  },
];

/** 战功目录由事件表派生 */
export const MEDALS = WORLD_EVENTS.concat(EXTRA_WORLD_EVENTS).map((e) => e.medal);

/** 全部可判定事件（登录时判定 + 运行时判定） */
export const ALL_WORLD_EVENTS = WORLD_EVENTS.concat(EXTRA_WORLD_EVENTS);

export const VENUE_UNLOCK = VENUE_UNLOCK_LEVEL;
