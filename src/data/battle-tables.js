/**
 * 宠物打架：对手库与奖励表（纯数据层，无副作用）。
 *
 * 对手是原创 NPC（不引用任何宝可梦数据）：每只有名字、品种、面板与出场文案。
 * 品种会经 src/data/pet-sizes.js 换算成体型（迷你/小型/中型/大型/巨型），
 * 体型同时影响攻击与速度 —— 所以「宠物身高体重类型」这个功能在打架里是真的有用。
 *
 * 面板：atk 攻击 / def 防御 / spd 速度 / hp 体力，都是 0–100 的基准值，
 * 结算时还要乘体型系数（见 src/domain/battle.js）。
 */
export const BATTLE_FOES = [
  {
    id: 'f1', n: '邻家橘猫', species: '猫', breed: '中华田园猫', ic: '🐈',
    atk: 28, def: 26, spd: 62, hp: 62, lv: 3,
    d: '蹲在快递柜上打盹的橘猫，被吵醒后先哈一口气再挠两下爪子。',
  },
  {
    id: 'f2', n: '楼下泰迪', species: '狗', breed: '泰迪', ic: '🐩',
    atk: 32, def: 30, spd: 58, hp: 66, lv: 6,
    d: '摇着尾巴冲上来，气势汹汹，绕三圈发现对方不动就先撤了。',
  },
  {
    id: 'f3', n: '快递站柯基', species: '狗', breed: '柯基', ic: '🐕',
    atk: 36, def: 40, spd: 46, hp: 74, lv: 10,
    d: '短腿但底盘稳，靠着熟悉的巷子地形拉扯，咬住就不松口。',
  },
  {
    id: 'f4', n: '布偶猫老大', species: '猫', breed: '布偶猫', ic: '🐈‍⬛',
    atk: 40, def: 46, spd: 50, hp: 78, lv: 14,
    d: '这片地盘真正的老大，平时只晒太阳，被动挨打时一爪一个准。',
  },
  {
    id: 'f5', n: '柴犬阿柴', species: '狗', breed: '柴犬', ic: '🐕‍🦺',
    atk: 48, def: 44, spd: 54, hp: 86, lv: 20,
    d: '嘴硬心软的独狼，护食护院，但从不主动惹事——今天除外。',
  },
  {
    id: 'f6', n: '边牧警长', species: '狗', breed: '边牧', ic: '🐕‍🦺',
    atk: 56, def: 58, spd: 62, hp: 92, lv: 28,
    d: '会绕后包的策略型对手，懂得用速度拉扯你的重心。',
  },
  {
    id: 'f7', n: '哈士奇暴君', species: '狗', breed: '哈士奇', ic: '🐺',
    atk: 66, def: 52, spd: 72, hp: 98, lv: 36,
    d: '一声长嚎就引来半个街区的围观，出手快得只剩残影。',
  },
  {
    id: 'f8', n: '流浪金毛', species: '狗', breed: '金毛寻回犬', ic: '🦮',
    atk: 68, def: 78, spd: 58, hp: 100, lv: 45,
    d: '曾经的宠物明星，如今靠一身腱子肉与不认输的脾气守着街头。',
  },
];

/** 对手按难度排序后的索引表（战斗界面用） */
export const FOE_BY_ID = BATTLE_FOES.reduce((m, f) => { m[f.id] = f; return m; }, {});

/**
 * 战斗奖励表：按结果给成长值 / 金币A 的**基础产出**。
 * 属性收益不在这张表里：心情/体力的增减由 domain/battle.js 的 settleOf() 合成，
 * 最终统一走 views/world-state.js 的 payAndGain() 落盘。
 */
export const BATTLE_REWARD = {
  win: { growth: 12, coinA: 8 },
  draw: { growth: 5, coinA: 3 },
  lose: { growth: 2, coinA: 0 },
};

/**
 * 负伤表：负伤会让回家后属性打折，是「打架有代价」的关键。
 * level：none 无伤 / mild 轻伤 / scratch 擦伤 / hurt 受伤（需要休息）
 * cost 是**消耗量（正数）**，结算时统一按「扣属性」处理。
 */
export const BATTLE_INJURY = {
  none: { n: '毫发无伤', ic: '✨', cost: {} },
  mild: { n: '轻伤', ic: '🩹', cost: { mood: 3, stamina: 4 } },
  scratch: { n: '擦伤', ic: '🩹', cost: { mood: 6, stamina: 8 } },
  hurt: { n: '受伤', ic: '🏥', cost: { mood: 12, stamina: 18 } },
};

/** 战斗结算卡的标题（按结果） */
export const BATTLE_RESULT_TITLE = {
  win: '赢了！',
  draw: '打成平手',
  lose: '输了…',
};
