/**
 * 3D 世界的资源与坐标配置（纯数据）。
 *
 * 模型走 CDN（加载失败/超时会退回程序化拼装的小动物，见 views/w3d/pet.js）。
 * 建筑热点的 x/z 是庭院坐标系，与 scene.js 里的地面半径 12.6 保持同一尺度。
 */
const FOX = 'https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/Fox/glTF-Binary/Fox.glb';

/** 物种 → GLTF 模型 */
export const PET_MODELS = {
  猫: { url: FOX, scale: 0.8 },
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
