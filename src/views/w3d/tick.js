/**
 * 帧循环：动画混合、天气轮换、粒子、AI、相机环绕、气泡与 HUD 节流、渲染。
 *
 * V1.10 追加三件事（对齐《虚拟宠物家园》2D 小游戏）：
 *   1. 在线挂机衰减 —— 属性随真实时间流逝（速率同 HTML 小游戏的 tick）；
 *   2. 日历天切换 → 换季（春花 / 夏无 / 秋叶 / 冬雪），并重掷天气；
 *   3. 运行时事件（战功事件 + 生活小事件）。
 */
import { $ } from '../../app/dom.js';
import { save } from '../../app/store.js';
import { getStage } from './ctx.js';
import { tickAi } from './ai.js';
import { resetWeather } from './weather.js';
import { refreshBubble, refreshHud } from './hud.js';
import { tickEvents } from './events.js';
import { decayAttrs, dayIndexOf, seasonIndexOf } from '../../domain/w3d.js';
import { SEASONS } from '../../data/w3d-assets.js';
import { worldPet } from '../world-state.js';
import { applySeasonToScene } from './scene.js';

const MAX_DELTA = 0.05;
const BUBBLE_INTERVAL = 0.25;
const HUD_INTERVAL = 0.5;
/** 挂机衰减结算间隔（秒） */
const DECAY_STEP = 5;
/** 落盘间隔（秒） */
const SAVE_STEP = 30;

export function tick() {
  const s = getStage();
  if (!s || s.suspended) return;
  const stageEl = $('w3dStage');
  if (!stageEl || !stageEl.classList.contains('show')) return;

  const dt = Math.min(s.clock.getDelta(), MAX_DELTA);
  if (s.mixer) s.mixer.update(dt);

  // 天气轮换
  s.weatherT -= dt;
  if (s.weatherT <= 0) resetWeather(false);

  stepLeaves(s, dt);
  stepRain(s, dt);
  tickAi(dt);
  orbitCamera(s);

  // 在线挂机衰减
  s.decayT = (s.decayT || 0) + dt;
  if (s.decayT >= DECAY_STEP) {
    const seconds = s.decayT;
    s.decayT = 0;
    const sleeping = s.ai.state === 'sleep';
    decayAttrs(worldPet().attr, seconds, sleeping);
    s.hudDirty = true;
  }

  // 日历天切换 → 换季
  s.saveT = (s.saveT || 0) + dt;
  if (s.saveT >= SAVE_STEP) {
    s.saveT = 0;
    save();
  }
  const dayIndex = dayIndexOf(Date.now());
  if (s.dayIndex && dayIndex !== s.dayIndex) {
    s.dayIndex = dayIndex;
    s.seasonIdx = seasonIndexOf(dayIndex);
    applySeasonToScene(SEASONS[s.seasonIdx]);
    resetWeather(true);
    s.hudDirty = true;
  }

  // 运行时事件
  s.eventT = (s.eventT || 0) + dt;
  if (s.eventT >= 5) {
    s.eventT = 0;
    tickEvents(Date.now());
  }

  if (s.say && s.clock.elapsedTime > s.sayUntil) s.say = '';
  s.bubbleT -= dt;
  if (s.bubbleT <= 0) {
    s.bubbleT = BUBBLE_INTERVAL;
    refreshBubble();
  }

  s.hudT -= dt;
  if (s.hudDirty || s.hudT <= 0) {
    s.hudT = HUD_INTERVAL;
    refreshHud();
  }

  s.renderer.render(s.scene, s.camera);
}

/** 秋叶飘落 + 横向摆动，落到底部回到高空（冬天是雪，春天是花瓣） */
function stepLeaves(s, dt) {
  if (!s.leaves || !s.leaves.visible) return;
  const positions = s.leaves.geometry.attributes.position;
  const sway = s.season === 'spring' ? 1.4 : (s.season === 'winter' ? 0.35 : 0.5);
  for (let i = 0; i < s.leafSpeeds.length; i++) {
    let y = positions.getY(i) - s.leafSpeeds[i] * dt;
    positions.setX(i, positions.getX(i) + Math.sin(s.clock.elapsedTime + i) * dt * sway);
    if (y < 0) {
      y = 8 + Math.random() * 4;
      positions.setX(i, (Math.random() - 0.5) * 36);
      positions.setZ(i, (Math.random() - 0.5) * 36);
    }
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
}

/** 雨滴下落（雪速更慢） */
function stepRain(s, dt) {
  if (!s.rain || !s.rain.visible) return;
  const positions = s.rain.geometry.attributes.position;
  for (let i = 0; i < s.rainSpeeds.length; i++) {
    let y = positions.getY(i) - s.rainSpeeds[i] * dt;
    if (y < 0) y = 14 + Math.random() * 4;
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
}

/** 相机围绕庭院中心做球面定位 */
function orbitCamera(s) {
  const cam = s.cam;
  s.camera.position.set(
    cam.tx + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
    cam.ty + cam.r * Math.cos(cam.phi),
    cam.tz + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta),
  );
  s.camera.lookAt(cam.tx, cam.ty, cam.tz);
}
