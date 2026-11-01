/**
 * 舞台 HUD：顶部六维微条 + 金币/等级/战功 + 宠物信息行（名字/品种/天数/天气季节）；
 * 底部聊天气泡定位。
 */
import { $, esc } from '../../app/dom.js';
import { S } from '../../app/store.js';
import { ATTR_NAMES, ATTR_ROWS } from '../../data/world-tables.js';
import { WEATHER_LABELS } from '../../data/w3d-assets.js';
import { GROWTH_PER_LEVEL } from '../../app/config.js';
import { moodEmoji } from '../../domain/w3d.js';
import { worldPet, worldLevel, homeMerit } from '../world-state.js';
import { curPet } from '../pets.js';
import { currentCoins } from './interactions.js';
import { getStage } from './ctx.js';
import { refreshSigns } from './scene.js';
import { autoBubble } from './ai.js';
import { currentSeason } from './weather.js';

/** 顶部数值区 */
export function refreshHud() {
  const s = getStage();
  if (!s) return;
  const w = worldPet();
  const attr = w.attr;
  const pet = curPet();

  const stats = $('w3dStats');
  if (stats) {
    stats.innerHTML = ATTR_ROWS.map((row) => {
      const value = attr[row.key];
      const percent = row.key === 'growth'
        ? Math.min(100, (value % GROWTH_PER_LEVEL) / GROWTH_PER_LEVEL * 100)
        : Math.min(100, value);
      return '<div class="w3d-mini" title="' + ATTR_NAMES[row.key] + '"><span>' + row.icon + '</span>' +
        '<div class="w3d-mbar"><i style="width:' + percent + '%;background:' + row.color + '"></i></div>' +
        '<b>' + Math.round(value) + '</b></div>';
    }).join('');
  }

  const coin = $('w3dCoin');
  if (coin) coin.textContent = '🪙 ' + currentCoins() + ' · Lv.' + worldLevel();

  // 第二行：宠物信息（对齐 HTML 小游戏的 HUD）
  const info = $('w3dInfo');
  if (info) {
    const season = currentSeason();
    const weatherText = WEATHER_LABELS[s.weather] || '晴 ☀️';
    info.innerHTML =
      '<span class="w3d-name">' + moodEmoji(attr) + ' ' + esc(pet.name) + '</span>' +
      '<span>' + esc(pet.breed) + '</span>' +
      '<span>世界 Lv.' + worldLevel() + '</span>' +
      '<span>第 ' + (S.world.loginDays || 1) + ' 天</span>' +
      '<span>' + weatherText + ' · ' + season.n + '季</span>' +
      '<span class="w3d-merit">🏅 战功 ' + homeMerit() + '</span>';
  }

  s.hudDirty = false;
  refreshSigns();
}

/** 聊天气泡跟随宠物（投影到屏幕坐标） */
export function refreshBubble() {
  const s = getStage();
  const bubble = $('w3dBubble');
  if (!s || !s.pet || !bubble) return;
  if (s.pet.visible === false) {
    bubble.style.display = 'none';
    return;
  }
  const text = s.say || autoBubble();
  if (!text) {
    bubble.style.display = 'none';
    return;
  }
  bubble.textContent = text;
  bubble.style.display = 'block';
  const projected = s.pet.position.clone();
  projected.y += 2.1;
  projected.project(s.camera);
  bubble.style.left = ((projected.x * 0.5 + 0.5) * s.viewW) + 'px';
  bubble.style.top = ((-projected.y * 0.5 + 0.5) * s.viewH - 14) + 'px';
}
