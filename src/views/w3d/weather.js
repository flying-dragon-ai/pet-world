/**
 * 天气：晴 / 阴 / 小雨。天空是 Canvas 渐变贴图，光照强度随天气切换，雨粒子显隐。
 * 每 90–150 秒轮换一次，下雨时宠物会跑去屋檐躲雨（见 ai.js）。
 */
import { getStage } from './ctx.js';
import { sayInStage } from './fx.js';
import { curPet } from '../pets.js';

/** 天空渐变 + 光照 */
export function setSky(kind) {
  const s = getStage();
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);

  if (kind === 'sunny') {
    gradient.addColorStop(0, '#3E7CD6');
    gradient.addColorStop(0.6, '#8FC2F2');
    gradient.addColorStop(1, '#E8F4FF');
  } else if (kind === 'overcast') {
    gradient.addColorStop(0, '#5E6E84');
    gradient.addColorStop(0.7, '#9AABC0');
    gradient.addColorStop(1, '#C9D6E2');
  } else {
    gradient.addColorStop(0, '#3A4A63');
    gradient.addColorStop(0.7, '#6B7E97');
    gradient.addColorStop(1, '#93A5B8');
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 128);
  s.scene.background = new THREE.CanvasTexture(canvas);
  if (s.sun) s.sun.intensity = kind === 'sunny' ? 0.95 : (kind === 'overcast' ? 0.55 : 0.32);
  if (s.amb) s.amb.intensity = kind === 'sunny' ? 0.72 : (kind === 'overcast' ? 0.6 : 0.5);
}

/** 随机换一种天气；first=true 时不念台词（进场首帧） */
export function resetWeather(first) {
  const s = getStage();
  const roll = Math.random();
  const weather = roll < 0.6 ? 'sunny' : (roll < 0.85 ? 'overcast' : 'rain');
  s.weather = weather;
  s.weatherT = 90 + Math.random() * 60;
  setSky(weather);
  if (s.rain) s.rain.visible = weather === 'rain';
  if (weather === 'rain' && !first) sayInStage('下雨了，' + curPet().name + '跑去屋檐躲雨…');
  return weather;
}

/** 当前天气（未进 3D 时返回 null） */
export function currentWeather() {
  const s = getStage();
  return s ? s.weather : null;
}
