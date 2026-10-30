/**
 * 人宠世界的数值表（纯数据，无副作用）。
 *
 * 改数值、加课程/商品/场馆/事件都只改这里；规则逻辑在 src/domain/world.js。
 * 事件表的 `story` 是纯函数：(petWorld, ctx) → HTML 文案，ctx 提供宠物名与登录天数，
 * 保持数据层不反向依赖视图层。
 */
import { VENUE_UNLOCK_LEVEL } from '../app/config.js';

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
];

/** 战功目录由事件表派生 */
export const MEDALS = WORLD_EVENTS.map((e) => e.medal);

export const VENUE_UNLOCK = VENUE_UNLOCK_LEVEL;
