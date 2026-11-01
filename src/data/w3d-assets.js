/**
 * 3D 世界的资源与坐标配置（纯数据）。
 *
 * 模型走 CDN（加载失败/超时会退回程序化拼装的小动物，见 views/w3d/pet.js）。
 * 建筑热点的 x/z 是庭院坐标系，与 scene.js 里的地面半径 12.6 保持同一尺度。
 */
const FOX = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/Fox/glTF-Binary/Fox.glb';

/** 物种 → GLTF 模型 */
export const PET_MODELS = {
  猫: { url: 'assets/models/pets/cat-rig.glb', scale: 0.8 },
  狗: { url: FOX, scale: 1.0 },
  鸟: { url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Parrot.glb', scale: 1 },
  异宠: { url: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Flamingo.glb', scale: 1 },
};

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
