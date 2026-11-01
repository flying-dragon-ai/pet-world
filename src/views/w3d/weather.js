/**
 * 天气与季节：晴 / 阴 / 小雨（冬天是雪）。天空是 Canvas 渐变贴图，光照强度随天气切换。
 *
 * V1.10：天空配色跟着「家园主题」走，季节决定飘落粒子（春花 / 夏无 / 秋叶 / 冬雪），
 * 每 90–150 秒轮换一次；下雨/下雪时宠物会跑去屋檐躲起来（见 ai.js）。
 */
import { getStage } from './ctx.js';
import { sayInStage } from './fx.js';
import { curPet } from '../pets.js';
import { themeById } from '../../domain/w3d.js';
import { SEASONS } from '../../data/w3d-assets.js';
import { homeState } from '../world-state.js';

/** 当前季节条目（1~4 月 → 春夏秋冬） */
export function currentSeason() {
  const s = getStage();
  const idx = (s && s.seasonIdx) || 0;
  return SEASONS[idx] || SEASONS[0];
}

/** 天空渐变 + 光照 */
export function setSky(kind) {
  const s = getStage();
  const theme = themeById(homeState().theme);
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);

  if (kind === 'sunny') {
    gradient.addColorStop(0, theme.sky[0]);
    gradient.addColorStop(0.6, theme.sky[1]);
    gradient.addColorStop(1, '#E8F4FF');
  } else if (kind === 'overcast') {
    gradient.addColorStop(0, '#5E6E84');
    gradient.addColorStop(0.7, '#9AABC0');
    gradient.addColorStop(1, '#C9D6E2');
  } else if (kind === 'snow') {
    gradient.addColorStop(0, '#7E93AC');
    gradient.addColorStop(0.7, '#C3D3E0');
    gradient.addColorStop(1, '#EFF5FA');
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
  const season = currentSeason();
  const roll = Math.random();
  let weather;
  if (season.id === 'winter') {
    weather = roll < 0.45 ? 'sunny' : (roll < 0.75 ? 'overcast' : 'snow');
  } else if (season.id === 'spring') {
    weather = roll < 0.55 ? 'sunny' : (roll < 0.82 ? 'overcast' : 'rain');
  } else {
    weather = roll < 0.6 ? 'sunny' : (roll < 0.85 ? 'overcast' : 'rain');
  }

  s.weather = weather;
  s.weatherT = 90 + Math.random() * 60;
  setSky(weather);

  if (s.rain) {
    const snowy = weather === 'snow';
    s.rain.visible = weather === 'rain' || snowy;
    s.rain.material.color.setHex(snowy ? 0xFFFFFF : 0x9FB8D8);
    s.rain.material.size = snowy ? 0.18 : 0.13;
    s.rainSpeeds = s.rainSpeeds.map(() => (snowy ? 2 + Math.random() * 2 : 16 + Math.random() * 8));
  }

  if ((weather === 'rain' || weather === 'snow') && !first) {
    sayInStage(weather === 'snow'
      ? '下雪了，' + curPet().name + '跑去屋檐躲雪…'
      : '下雨了，' + curPet().name + '跑去屋檐躲雨…');
  }
  return weather;
}

/** 当前天气（未进 3D 时返回 null） */
export function currentWeather() {
  const s = getStage();
  return s ? s.weather : null;
}
