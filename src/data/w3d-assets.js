/**
 * 3D 世界的资源与坐标配置（纯数据）。
 *
 * 宠物本体走本地 GLB（assets/models/pets/*.glb）。目录里 22 个品种，但磁盘上不保证
 * 每个都有 GLB，所以每只的可渲染来源在数据层声明死，分三种（见 modelFor）：
 *   own    —— 有 assets/models/pets/<key>.glb
 *   alias  —— 借同科另一只的 GLB（PET_FALLBACK）
 *   proc   —— 完全没有可借的 GLB，交给程序化体型现搭（PROC_PETS，零字节资产）
 * 降级链在 views/w3d/pet.js：本体 → alias → proc → 球体橘猫。模型由 Hyper3D
 * （Rodin Gen-2.5）出几何、四足骨骼绑定后带 idle / walk / run 三支 clip，
 * 体检页：dev/model-check.html?m=<路径>，契约体检：dev/check-assets.js。
 * 建筑热点的 x/z 是庭院坐标系，与 scene.js 里的地面半径 12.6 保持同一尺度。
 */
const MODEL = (key) => `assets/models/pets/${key}.glb`;

/**
 * 宠物模型库（22 只，覆盖猫狗 / 小型哺乳 / 鸟类 / 鱼类 / 异宠）。
 * key 即文件名；group 只用于选型与统计，不参与渲染。
 */
export const PET_CATALOG = {
  // 猫狗
  cat: { n: '猫', group: '猫狗' },
  teddy: { n: '泰迪犬', group: '猫狗' },
  bichon: { n: '比熊犬', group: '猫狗' },
  corgi: { n: '柯基', group: '猫狗' },
  golden: { n: '金毛', group: '猫狗' },
  // 小型哺乳
  hamster: { n: '仓鼠', group: '小型哺乳' },
  rabbit: { n: '兔子', group: '小型哺乳' },
  chinchilla: { n: '龙猫', group: '小型哺乳' },
  guineapig: { n: '荷兰猪', group: '小型哺乳' },
  hedgehog: { n: '刺猬', group: '小型哺乳' },
  // 鸟类
  budgie: { n: '虎皮鹦鹉', group: '鸟类' },
  cockatiel: { n: '玄凤鹦鹉', group: '鸟类' },
  canary: { n: '金丝雀', group: '鸟类' },
  // 鱼类
  goldfish: { n: '金鱼', group: '鱼类' },
  koi: { n: '锦鲤', group: '鱼类' },
  tropical: { n: '热带鱼', group: '鱼类' },
  // 异宠
  turtle: { n: '乌龟', group: '异宠' },
  lizard: { n: '蜥蜴', group: '异宠' },
  gecko: { n: '守宫', group: '异宠' },
  snake: { n: '蛇', group: '异宠' },
  frog: { n: '青蛙', group: '异宠' },
  ant: { n: '蚂蚁', group: '异宠' },
};

/**
 * 缺模型的替补：key → 已有 GLB 的 key。
 * 只在「本体没有 GLB」或「本体加载失败/超时」时生效，不是替代品清单；
 * 目标必须是 PET_CATALOG 里的 key，且不能再指向另一个 alias（不许串链）。
 */
export const PET_FALLBACK = {
  guineapig: 'hamster', // 荷兰猪 ≈ 仓鼠体型
  cockatiel: 'budgie', // 玄凤 ≈ 虎皮鹦鹉
  canary: 'budgie', // 金丝雀 ≈ 虎皮鹦鹉
};

/**
 * 程序化体型：只作为**兜底**声明。磁盘上如果真有 <key>.glb（并行流水线会陆续补）
 * 就用真模型；没有、或者加载失败/超时，才让 views/w3d/proc-pet.js 用 three 原生
 * 几何体现搭（自带走动摆动，不吃动画 clip）。值必须是 proc-pet.js 里 PROC_BUILDERS 的键。
 */
export const PROC_PETS = {
  goldfish: 'fish',
  koi: 'fish',
  tropical: 'fish',
  turtle: 'reptile',
  lizard: 'reptile',
  gecko: 'reptile',
  snake: 'reptile',
  frog: 'frog',
  ant: 'insect',
};

/** 品种/物种名 → 模型 key。顺序即优先级，先命中先用。 */
export const BREED_MODEL_RULES = [
  // 猫狗
  [/柯基|corgi/i, 'corgi'],
  [/金毛|golden\s*retriever|寻回犬/i, 'golden'],
  [/泰迪|贵宾|poodle|teddy/i, 'teddy'],
  [/比熊|bichon/i, 'bichon'],
  // 龙猫 比 猫 优先：带「猫」的物种名不能落到 cat
  [/龙猫|毛丝鼠|chinchilla/i, 'chinchilla'],
  [/猫|cat|feline/i, 'cat'],
  [/犬|狗|dog|canine|retriever|shepherd|terrier/i, 'golden'],
  // 小型哺乳
  [/仓鼠|hamster/i, 'hamster'],
  [/兔|rabbit|bunny/i, 'rabbit'],
  [/荷兰猪|豚鼠|guinea\s*pig|cavy/i, 'guineapig'],
  [/刺猬|hedgehog/i, 'hedgehog'],
  // 鸟类
  [/玄凤|cockatiel/i, 'cockatiel'],
  [/金丝雀|芙蓉鸟|canary/i, 'canary'],
  [/虎皮|鹦鹉|parrot|budgie|parakeet|bird|鸟/i, 'budgie'],
  // 鱼类
  [/锦鲤|koi/i, 'koi'],
  [/金鱼|goldfish/i, 'goldfish'],
  [/热带鱼|神仙鱼|angelfish|tetra|guppy|fish|鱼/i, 'tropical'],
  // 异宠
  [/守宫|gecko/i, 'gecko'],
  [/蜥蜴|鬃狮|lizard|dragon/i, 'lizard'],
  [/龟|tortoise|turtle/i, 'turtle'],
  [/蛇|snake|python|corn/i, 'snake'],
  [/蛙|蟾蜍|frog|toad/i, 'frog'],
  [/蚂蚁|ant/i, 'ant'],
];

/** 物种兜底模型（BREED_MODEL_RULES 都没命中时用） */
export const PET_MODELS = {
  猫: { url: MODEL('cat'), scale: 1 },
  狗: { url: MODEL('golden'), scale: 1 },
  鸟: { url: MODEL('budgie'), scale: 1 },
  鱼: { url: MODEL('goldfish'), scale: 1 },
  异宠: { url: MODEL('turtle'), scale: 1 },
};

/**
 * 目录 key → 可渲染来源。纯函数（不读 store、不碰磁盘），所以「本体文件在不在」是
 * 运行期的事：有 url 就先试本体，加载失败再试 aliasUrl，再不行才用 proc 现搭。
 *
 * 形状（调用点永远是「先试 url，再退 proc」）：
 *   { key, scale, url, alias?, aliasUrl?, proc? }
 * 即：proc 只出现在 PROC_PETS 里登过的品种上，且只是兜底 —— url 才是首选。
 *
 * @param {string} key
 * @returns {{key: string, scale: number, url: string, proc?: string, alias?: string, aliasUrl?: string}}
 */
export function modelFor(key) {
  const k = PET_CATALOG[key] ? key : 'cat';
  const src = { key: k, scale: 1, url: MODEL(k) };
  const alias = PET_FALLBACK[k];
  if (alias && PET_CATALOG[alias]) {
    src.alias = alias;
    src.aliasUrl = MODEL(alias);
  }
  if (PROC_PETS[k]) src.proc = PROC_PETS[k];
  return src;
}

/**
 * 按宠物档案挑可渲染来源：先拿品种名过一遍关键词表，再退回物种默认。
 * 纯函数，不读 store，方便单测。
 *
 * @param {{species?: string, breed?: string}} pet
 * @returns {{key: string, scale: number, url: string, proc?: string, alias?: string, aliasUrl?: string}}
 */
export function petModelOf(pet) {
  const breed = String((pet && pet.breed) || '');
  for (const [re, key] of BREED_MODEL_RULES) {
    if (re.test(breed) && PET_CATALOG[key]) return modelFor(key);
  }
  const fallback = PET_MODELS[(pet && pet.species) || '猫'] || PET_MODELS.猫;
  return modelFor(fallback.url.slice(fallback.url.lastIndexOf('/') + 1, -4));
}

/**
 * 从 GLB 自带的 clip 里挑 idle / walk / run 三支。
 *
 * 各家动画预设命名不统一（Canine_idle / Bird_idlestanding / Fish_swim / seaturtle_anim），
 * 所以按"角色 → 关键词候选表"的顺序匹配，而不是一条大正则：
 * 鱼没有 walk，就用 swim 当走、dash 当跑；龟的第一支是 anim，交给 clips[0] 兜底。
 *
 * 放在数据层是为了让 dev/check-assets.js 能拿同一份规则核对产出的 GLB，
 * 视图层不再各写一套正则。纯函数，入参就是 gltf.animations。
 *
 * @param {{name: string}[]} clips
 * @returns {{idle: object, walk: object, run: object}}
 */
export function pickClips(clips) {
  const ROLES = {
    idle: [/idle/i, /survey/i, /rest/i, /breath/i],
    walk: [/walk/i, /trot/i, /swim/i],
    run: [/run/i, /gallop/i, /dash/i, /fly/i, /swim/i],
  };
  const findRole = (patterns) => {
    for (const re of patterns) {
      const hit = clips.find((c) => re.test(c && c.name));
      if (hit) return hit;
    }
    return null;
  };
  const idle = findRole(ROLES.idle) || clips[0];
  const walk = findRole(ROLES.walk) || idle;
  const run = findRole(ROLES.run) || walk;
  return { idle, walk, run };
}

/** 建筑热点 → 世界面板 tab（运动/娱乐 Lv.30 解锁） */
export const BUILDING_SPOTS = [
  { tab: 'school', n: '学院', ic: '🎓', c: 0x8B5CF6, x: -8, z: -6.6 },
  { tab: 'jobs', n: '打工小镇', ic: '💼', c: 0xC77E12, x: -2.6, z: -8.8 },
  { tab: 'shop', n: '商城', ic: '🛒', c: 0xE8945A, x: 3, z: -8.4 },
  { tab: 'medal', n: '战功墙', ic: '🎖️', c: 0xD9A03C, x: 8.4, z: -6.2 },
  { tab: 'sport', n: '运动场', ic: '🏟️', c: 0x3BB786, x: -8.8, z: 1.6, lock: true },
  { tab: 'fun', n: '娱乐馆', ic: '🎡', c: 0xE8709A, x: 8.8, z: 2, lock: true },
];

/** 三种天气 */
export const WEATHERS = ['sunny', 'overcast', 'rain'];

export const WEATHER_LABELS = { sunny: '晴 ☀️', overcast: '阴 ☁️', rain: '小雨 🌧' };

/* ==========================================================================
   V1.10：向《虚拟宠物家园》2D 小游戏对齐 —— 四季 / 家园主题 / 宠物外观 / 家具
   （玩法素材，纯数据；规则在 src/domain/w3d.js，渲染在 src/views/w3d/）
   ========================================================================== */

/** 四季：每季一套院子配色 + 飘落粒子 */
export const SEASONS = [
  { id: 'spring', n: '春', particle: 'petal', grass: 0x8CCB78, inner: 0xA5D98C, tree: [0x7FBF6E, 0x93CF7A, 0x6FAF62] },
  { id: 'summer', n: '夏', particle: 'none', grass: 0x7CBF6A, inner: 0x8CCB78, tree: [0x4E9E52, 0x63B25C, 0x3E8C46] },
  { id: 'autumn', n: '秋', particle: 'leaf', grass: 0x9CB96A, inner: 0xB6C878, tree: [0xD9822B, 0xC94F3D, 0xE0A13C] },
  { id: 'winter', n: '冬', particle: 'snow', grass: 0xDDE7EC, inner: 0xEFF5F8, tree: [0x9FB3BF, 0xB9C9D3, 0x8FA6B4] },
];

/** 家园主题：5 套配色，切换后立刻作用于 3D 场景（天空 / 草地 / 树 / 小屋） */
export const THEMES = [
  { id: 'fresh', n: '清新草原', ic: '🌿', price: 0, desc: '默认主题 · 永久免费',
    sky: ['#5E9BD8', '#BFE0F2'], grass: 0x8CCB78, inner: 0xA5D98C, tree: [0x7FBF6E, 0x93CF7A, 0x6FAF62], wall: 0xF2E3C9, roof: 0xC9603F, fence: 0xB9906B },
  { id: 'sakura', n: '樱花庭院', ic: '🌸', price: 30, desc: '粉色浪漫 · 满院春色',
    sky: ['#E7A0BC', '#FBE3EC'], grass: 0xA9D3A0, inner: 0xC6E3C8, tree: [0xF2A8C2, 0xF7C3D6, 0xE891AE], wall: 0xFBE7EE, roof: 0xD98BA4, fence: 0xD9A8B6 },
  { id: 'dusk', n: '暮色晚霞', ic: '🌇', price: 30, desc: '橙黄暖调 · 黄昏小院',
    sky: ['#E2843C', '#FBD9A0'], grass: 0xB8B067, inner: 0xC9C078, tree: [0xC97A33, 0xD89A3C, 0xB4612A], wall: 0xF6E0BC, roof: 0xA85B3C, fence: 0xA87A4E },
  { id: 'snow', n: '雪国冬日', ic: '❄️', price: 40, desc: '银装素裹 · 雪国童话',
    sky: ['#7E9BB6', '#E4EEF5'], grass: 0xE4EDF2, inner: 0xF4F8FB, tree: [0xCFE0EA, 0xE3EEF4, 0xB9CEDA], wall: 0xF4F9FC, roof: 0x9FB8CC, fence: 0xC6D6E0 },
  { id: 'forest', n: '森林秘境', ic: '🌲', price: 35, desc: '深绿清凉 · 秘密基地',
    sky: ['#2F5C43', '#9CC7A4'], grass: 0x5F9E63, inner: 0x74B075, tree: [0x2F6B41, 0x3E7F4C, 0x27593A], wall: 0xE4DCC4, roof: 0x6E7F4A, fence: 0x8A7A55 },
];

/** 宠物外观：买完直接戴在 3D 宠物身上 */
export const OUTFITS = [
  { id: 'scarf', slot: 'neck', ic: '🧣', n: '温暖红围巾', price: 12 },
  { id: 'bow', slot: 'neck', ic: '🎀', n: '粉粉蝴蝶结', price: 10 },
  { id: 'glasses', slot: 'glasses', ic: '👓', n: '智能眼镜', price: 15 },
  { id: 'sunglass', slot: 'glasses', ic: '🕶️', n: '帅气墨镜', price: 14 },
  { id: 'tophat', slot: 'hat', ic: '🎩', n: '绅士小礼帽', price: 16 },
  { id: 'cap', slot: 'hat', ic: '🧢', n: '棒球帽', price: 12 },
];

/** 家具：买回来摆进院子（每个给 2~3 个预设机位，坐标相对小屋） */
export const FURNITURE = [
  { id: 'bed', ic: '🛏️', n: '小床', price: 0, kind: 'bed', color: 0xE8945A, slots: [[-1.2, 2.6]] },
  { id: 'bowlf', ic: '🥣', n: '食盆', price: 0, kind: 'bowl', color: 0xE58B5A, slots: [[1.6, 1.2]] },
  { id: 'plant', ic: '🪴', n: '盆栽', price: 0, kind: 'plant', color: 0x4E9E52, slots: [[-2.4, 0.4]] },
  { id: 'sofa', ic: '🛋️', n: '软软沙发', price: 20, kind: 'sofa', color: 0xE8709A, slots: [[-2.0, 1.4], [1.4, 2.2]] },
  { id: 'rug', ic: '🟠', n: '圆圆地毯', price: 15, kind: 'rug', color: 0xF5A66B, slots: [[0.6, 1.6], [-1.6, 1.8]] },
  { id: 'toy', ic: '🧸', n: '玩具箱', price: 18, kind: 'box', color: 0xD9A03C, slots: [[2.2, 1.8], [0.2, 3.0]] },
  { id: 'lamp', ic: '🪔', n: '暖暖小灯', price: 12, kind: 'lamp', color: 0xF5D061, slots: [[-2.6, 2.2], [2.4, 0.8]] },
  { id: 'shelf', ic: '📚', n: '照片书架', price: 22, kind: 'box', color: 0x8B5CF6, slots: [[-3.0, 1.0], [2.8, 2.4]] },
  { id: 'treat', ic: '🍪', n: '零食罐', price: 10, kind: 'bowl', color: 0xC77E12, slots: [[0.4, 0.9], [-2.2, 2.6]] },
];

/** 自主行为台词（对齐 HTML 小游戏的气泡文案） */
export const IDLE_LINES = {
  wag: ['摇尾巴ing～', '汪！今天也要加油鸭', '哼哼哼～', '主人主人，看我！'],
  nod: ['低头嗅嗅草地…', '这里有奇怪的味道！', '咦？什么声音？'],
  lie: ['晒太阳真舒服～', '躺平一会儿…', '肚皮暖暖的～'],
  beg: ['肚子咕咕叫了…', '主人，饭饭！', '闻到饭香了！'],
  clingy: ['主人怎么还不摸摸我', '好想主人陪我玩…', '（盯着屏幕看）👀'],
  sleepy: ['好困呀…', '眼皮在打架…', 'ZZZ…'],
  play: ['接住啦！汪！', '再来再来！', '最开心就是现在了！'],
  explore: ['嗅到宝藏的味道了！', '那边好像有东西…', '挖到宝啦！'],
  demolish: ['嘿嘿…沙发有点好吃 😈', '拆家时间到！😈'],
  house: ['到家啦～', '我回来啦～'],
};
