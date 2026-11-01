/**
 * 3D 互动规则（纯函数层）：横屏判定 + 四个手动互动的数值表 + 冷却。
 *
 * 3D 场景本身在 views/w3d/，这里只放"抚摸加什么属性"这类可以脱离 WebGL 单测的规则。
 */
import { W3D_ACTION_COOLDOWN_MS } from '../app/config.js';
import { THEMES, OUTFITS, FURNITURE } from '../data/w3d-assets.js';

/** 竖屏视口 → 舞台内容旋转 90°（手机上恒定横屏体验） */
export function needRotate(width, height) {
  return height > width;
}

/**
 * 四个手动互动的效果表。
 * gain 直接作用于世界六维；task 表示要打今日任务卡；minStamina 是不满足就拒绝的门槛。
 */
/**
 * 手动互动的效果表（数值对齐《虚拟宠物家园》2D 小游戏）。
 * gain 直接作用于世界六维；task 表示要打今日任务卡；minStamina 是不满足就拒绝的门槛。
 */
export const MANUAL_ACTIONS = {
  touch: { gain: { mood: 3, stamina: 1 }, fxIcon: '💗', fxColor: '#E8709A', say: '歪头…好喜欢主人摸摸', emote: 'wag', countsTouch: true },
  feed: { gain: { hunger: 15, mood: 2, stamina: 3 }, growth: 3, fxIcon: '🍖', fxColor: '#E8945A', say: '嗷呜嗷呜真好吃！', emote: 'eat', task: 'feed' },
  play: { gain: { mood: 8, stamina: -3, hunger: -2 }, fxIcon: '🎾', fxColor: '#5B8DEF', say: '接住啦！汪！', emote: 'happy', minStamina: 5 },
  bath: { gain: { clean: 20, mood: 2 }, fxIcon: '🫧', fxColor: '#3AB5C0', say: '抖一抖，甩干水！', emote: 'shake' },
  lie: { gain: { stamina: 8, mood: 4 }, fxIcon: '💤', fxColor: '#8B5CF6', say: '躺在大垫子上～呼…', emote: 'lie' },
};

/** 该互动是否还在冷却中 */
export function onCooldown(cooldowns, act, at, ms = W3D_ACTION_COOLDOWN_MS) {
  const last = cooldowns[act];
  if (!last) return false; // 从没按过 = 不在冷却
  return at - last < ms;
}

/** 体力不足时返回 true（只有玩耍有门槛） */
export function lacksStamina(action, stamina) {
  return typeof action.minStamina === 'number' && stamina < action.minStamina;
}

/* ==========================================================================
   V1.10：与《虚拟宠物家园》2D 小游戏对齐的纯规则
   —— 心情表情 / 挂机衰减 / 四季 / 派生性格 / 自主行为 / 对话 / 事件
   ========================================================================== */

const clamp100 = (v) => Math.max(0, Math.min(100, v));

/** 心情表情：与 HTML 小游戏 moodEmoji 同口径 */
export function moodEmoji(attr) {
  const a = attr || {};
  const m = a.mood || 0;
  const h = a.hunger || 0;
  const c = a.clean || 0;
  const e = a.stamina || 0;
  if (h < 25 || c < 25) return '🥺';
  if (e < 20) return '😪';
  if (m >= 75) return '🤩';
  if (m >= 45) return '😊';
  return '😕';
}

/** 挂机衰减速率（每秒），与 HTML 小游戏 tick() 一致 */
export const DECAY_PER_SECOND = {
  hunger: 1 / 38,
  clean: 1 / 55,
  mood: 1 / 70,
  stamina: 1 / 40,
};

/**
 * 在线挂机衰减（就地修改世界六维）。
 * @param {object} attr 世界六维
 * @param {number} seconds 经过秒数
 * @param {boolean} sleeping 睡着时不回体力
 */
export function decayAttrs(attr, seconds, sleeping) {
  if (!attr || !(seconds > 0)) return attr;
  attr.hunger = clamp100(attr.hunger - seconds * DECAY_PER_SECOND.hunger);
  attr.clean = clamp100(attr.clean - seconds * DECAY_PER_SECOND.clean);
  attr.mood = clamp100(attr.mood - seconds * DECAY_PER_SECOND.mood);
  if (!sleeping && attr.hunger > 30) {
    attr.stamina = clamp100(attr.stamina + seconds * DECAY_PER_SECOND.stamina);
  }
  return attr;
}

/** 自然日索引（本地时区），用于季节轮转 */
export function dayIndexOf(ts) {
  const d = new Date(ts);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/** 季节序号：每 7 天一季，四季轮转 */
export function seasonIndexOf(dayIndex) {
  return Math.floor((dayIndex || 0) / 7) % 4;
}

/**
 * 派生性格：把项目已有的一二元属性 + 六维 + 抚摸次数，折算成 2D 小游戏那套六性格值。
 * 不新增存档字段，纯派生，随时可重算。
 * @param {object} worldPet 世界档案
 * @param {object} pet 宠物档案（取 g.touchCount）
 */
export function derivedTraits(worldPet, pet) {
  const w = worldPet || {};
  const attr = w.attr || {};
  const g = (pet && pet.g) || {};
  const n = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));
  return {
    courage: n(w.courage),
    mischief: n(w.impulse),
    lively: n((attr.stamina || 0) * 0.5 + (attr.wisdom || 0) / 10),
    explore: n((attr.wisdom || 0) / 4 + (attr.growth || 0) / 12),
    clingy: n((g.touchCount || 0) * 8 + (attr.mood || 0) / 4),
    greedy: n(100 - (attr.hunger || 0)),
  };
}

/**
 * 自主行为决策：镜像 HTML 小游戏 idleBehavior() 的分支顺序与阈值。
 * @param {object} ctx {attr, traits, roll, rain}
 * @returns {string} 行为 key（walk/wag/nod/lie/demolish/clingy/sit/beg/sleep/idle）
 */
export function pickIdle(ctx) {
  const c = ctx || {};
  const attr = c.attr || {};
  const t = c.traits || {};
  const roll = typeof c.roll === 'number' ? c.roll : Math.random();
  if ((attr.stamina || 0) < 20) return 'sleep';
  if (roll < 0.3) return 'walk';
  if (roll < 0.42) return 'wag';
  if (roll < 0.52) return 'nod';
  if (roll < 0.6 && !c.rain) return 'lie';
  if (roll < 0.68 && (t.mischief || 0) >= 60) return 'demolish';
  if (roll < 0.76 && (t.clingy || 0) >= 60) return 'clingy';
  if (roll < 0.82 && (attr.stamina || 0) < 30) return 'sit';
  if (roll < 0.88 && (t.greedy || 0) >= 60 && (attr.hunger || 0) < 50) return 'beg';
  return 'idle';
}

/** 行为 key → 台词组（IDLE_LINES 在 data/w3d-assets.js） */
export function idleLineKey(kind) {
  return kind;
}

/**
 * 与宠物的对话回复：镜像 HTML 小游戏 petReply() 的关键词规则。
 * @param {string} q 问句
 * @param {object} ctx {name, attr, traits, memorial}
 */
export function petReply(q, ctx) {
  const c = ctx || {};
  const attr = c.attr || {};
  const t = c.traits || {};
  const memorial = !!c.memorial;
  const wrap = (s) => (memorial ? s.replace(/汪！/g, '').replace(/！/g, '。') + ' 🌈' : s);
  const text = String(q || '');
  if (/想你|想我|挂念/.test(text)) return wrap('汪！超想你！你不在的时候我一直在门口等你哦～');
  if (/开心|心情/.test(text)) {
    return (attr.mood || 0) >= 70
      ? wrap('开心！今天心情值有' + Math.round(attr.mood || 0) + '分呢！')
      : wrap('有点小无聊…主人陪我玩会儿好不好？');
  }
  if (/玩|出去/.test(text)) {
    return (t.lively || 0) >= 55 ? wrap('出去玩！出去玩！带飞盘！带球球！') : wrap('嗯…可以躺在院子里晒太阳吗？');
  }
  if (/吃|饭|饿/.test(text)) {
    return (attr.hunger || 0) < 40 ? wrap('饿！非常饿！饭饭在哪里！') : wrap('刚吃过啦，不过再吃一口也不是不行～');
  }
  if (/爱|喜欢/.test(text)) return wrap(memorial ? '我也永远爱你，一直一直。' : '我也爱你！尾巴已经摇成风扇了！！');
  if (/睡|困/.test(text)) return wrap((attr.stamina || 0) < 35 ? '好困…眼皮在打架…' : '还精神着呢，晚上再睡～');
  if (/害怕|打雷|怕/.test(text)) {
    return (t.courage || 0) >= 50 ? wrap('别怕别怕，我保护你！汪！') : wrap('呜…那我躲你怀里可以吗？');
  }
  if (/打工|工作|钱/.test(text)) return wrap('打工是有尊严的干饭方式！等我赚金币给你买小零食！');
  const fallbacks = [
    wrap('汪汪！（用力点头表示在认真听）'),
    wrap('（歪头）主人说的每个字我都爱听！'),
    (t.mischief || 0) >= 60 ? wrap('嘿嘿…我刚把你的袜子藏起来了，猜猜在哪里？') : wrap('我今天在院子里发现了新气味，下次带你一起去嗅！'),
    wrap('虽然听不太懂，但只要是主人说的就是最好的！'),
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * 社区帖子 → 家园事件（镜像 HTML 小游戏 Events.fromPost）。
 * @param {string} text 帖子正文
 * @param {object} ctx {traits}
 * @returns {{kind: string, mood: number, stamina: number, growth: number, medal: string|null, line: string}}
 */
export function homePostEvent(text, ctx) {
  const t = (ctx && ctx.traits) || {};
  const body = String(text || '');
  if (/打架|吵架|干架/.test(body)) {
    if ((t.mischief || 0) >= 55 || (t.courage || 0) >= 55) {
      return { kind: 'fight', mood: -5, stamina: -8, growth: 3, medal: 'streetfight', line: '在想象的小镇里和邻居狗进行了一场气势对决，汪汪两声后以平局收场' };
    }
    return { kind: 'shy', mood: -3, stamina: 0, growth: 0, medal: null, line: '打架好可怕，我要躲主人身后…' };
  }
  if (/洗澡|剪指甲|打针/.test(body)) {
    return { kind: 'alert', mood: -6, stamina: 0, growth: 0, medal: null, line: '看到社区里别的宠物被洗澡/打针，警觉地竖起了耳朵' };
  }
  if (/生日|开心|游玩|聚会/.test(body)) {
    return { kind: 'happy', mood: 10, stamina: 0, growth: 0, medal: null, line: '社区里传来好消息，它也跟着开心得转圈圈！' };
  }
  return { kind: 'idle', mood: 2, stamina: 0, growth: 0, medal: null, line: '汪？主人在聊什么呀～' };
}

/**
 * 运行时战功事件（3D 世界内触发，条件只看当前属性与天气）。
 * medal id 与 data/world-tables.js 的 MEDALS 对齐。
 */
export const RUNTIME_EVENTS = [
  {
    id: 'demolish', ic: '🔨', n: '拆家小能手',
    need: (ctx) => (ctx.traits.mischief || 0) >= 60 && (ctx.attr.clean || 0) <= 45,
    gain: { clean: -10, mood: 5 },
    line: '捣蛋值爆表，趁主人不注意啃了沙发角、抓了抓墙皮！清洁 -10 · 心情 +5（它很开心）',
  },
  {
    id: 'explorer', ic: '🧭', n: '小小探险家',
    need: (ctx) => (ctx.attr.wisdom || 0) >= 30 && (ctx.attr.growth || 0) >= 100,
    gain: { mood: 5, growth: 2 },
    line: '探索欲爆棚，在院子里嗅啊嗅，挖出了一个小宝藏！',
  },
  {
    id: 'lazy', ic: '😴', n: '躺平大师',
    need: (ctx) => (ctx.attr.stamina || 0) <= 20 && (ctx.attr.mood || 0) <= 40,
    gain: { mood: 3 },
    line: '体力见底，在院子里躺了一整天，尾巴一抖一抖的。',
  },
  {
    id: 'rainday', ic: '☔', n: '雨中等待',
    need: (ctx) => ctx.weather === 'rain',
    gain: { mood: 3 },
    line: '外面下起了小雨，它安静地待在屋檐下，陪着你一起看雨滴落在院子里。',
  },
];

/** 生活小事件（无门槛的日常彩蛋，对齐 HTML 小游戏 randomLife） */
export const LIFE_EVENTS = [
  { ic: '🐿️', n: '窗外的小松鼠', line: '隔着窗户和一只小松鼠对视了三分钟，谁都不肯先眨眼。', gain: { mood: 4 } },
  { ic: '🌈', n: '白日梦', line: '趴在垫子上做梦，尾巴一抖一抖的，梦里全是肉肉。', gain: { mood: 5 } },
  { ic: '📸', n: '歪头杀', line: '突然对着屏幕歪头，成功可爱暴击，被拍下了一张大片。', gain: { mood: 6 } },
  { ic: '🧦', n: '袜子失踪案', line: '家里的一只袜子神秘失踪……嫌疑宠：行走的毛团子。', gain: { clean: -5, mood: 4 } },
];

/** 主题 / 外观 / 家具的查表（数据在 data/w3d-assets.js） */
export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}
export function outfitById(id) {
  return OUTFITS.find((o) => o.id === id) || null;
}
export function furnitureById(id) {
  return FURNITURE.find((f) => f.id === id) || null;
}
