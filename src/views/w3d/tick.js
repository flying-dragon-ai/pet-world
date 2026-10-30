/**
 * 帧循环：动画混合、天气轮换、粒子、AI、相机环绕、气泡与 HUD 节流、渲染。
 *
 * 舞台被挂起（用户在面板里）或不在前台时直接 return，不烧 GPU。
 */
import { $ } from '../../app/dom.js';
import { getStage } from './ctx.js';
import { tickAi } from './ai.js';
import { resetWeather } from './weather.js';
import { refreshBubble, refreshHud } from './hud.js';

const MAX_DELTA = 0.05;
const BUBBLE_INTERVAL = 0.25;
const HUD_INTERVAL = 0.5;

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

/** 秋叶飘落 + 横向摆动，落到底部回到高空 */
function stepLeaves(s, dt) {
  if (!s.leaves) return;
  const positions = s.leaves.geometry.attributes.position;
  for (let i = 0; i < s.leafSpeeds.length; i++) {
    let y = positions.getY(i) - s.leafSpeeds[i] * dt;
    positions.setX(i, positions.getX(i) + Math.sin(s.clock.elapsedTime + i) * dt * 0.5);
    if (y < 0) {
      y = 8 + Math.random() * 4;
      positions.setX(i, (Math.random() - 0.5) * 36);
      positions.setZ(i, (Math.random() - 0.5) * 36);
    }
    positions.setY(i, y);
  }
  positions.needsUpdate = true;
}

/** 雨滴下落 */
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
