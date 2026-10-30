/**
 * 舞台 HUD：顶部六维微条 + 金币/等级；底部聊天气泡定位。
 */
import { $ } from '../../app/dom.js';
import { ATTR_NAMES, ATTR_ROWS } from '../../data/world-tables.js';
import { GROWTH_PER_LEVEL } from '../../app/config.js';
import { worldPet, worldLevel } from '../world-state.js';
import { currentCoins } from './interactions.js';
import { getStage } from './ctx.js';
import { refreshSigns } from './scene.js';
import { autoBubble } from './ai.js';

/** 顶部数值区 */
export function refreshHud() {
  const s = getStage();
  if (!s) return;
  const attr = worldPet().attr;

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

  s.hudDirty = false;
  refreshSigns();
}

/** 聊天气泡跟随宠物（投影到屏幕坐标） */
export function refreshBubble() {
  const s = getStage();
  const bubble = $('w3dBubble');
  if (!s || !s.pet || !bubble) return;

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
