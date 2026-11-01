/**
 * 舞台生命周期：创建 / 进入 / 挂起 / 恢复 / 退出 / 横屏布局 / 降级提示。
 *
 * 场景只建一次；进面板只是"挂起"（隐藏 + 不渲染），回来时状态还在。
 * WebGL 不可用或 three.js 未加载时走降级提示，绝不白屏。
 */
import { $ } from '../../app/dom.js';
import { S } from '../../app/store.js';
import { go } from '../../app/router.js';
import { registerActions } from '../../app/actions.js';
import { needRotate, themeById, dayIndexOf, seasonIndexOf } from '../../domain/w3d.js';
import { getStage, setStage, isStageActive, isStageSuspended } from './ctx.js';
import { buildScene, applyThemeToScene, applySeasonToScene, syncFurniture } from './scene.js';
import { loadPet, removePet, applyOutfitToPet } from './pet.js';
import { bindInput } from './input.js';
import { refreshHud } from './hud.js';
import { tick } from './tick.js';
import { currentWeather } from './weather.js';
import { worldLevel, homeState } from '../world-state.js';
import { SEASONS } from '../../data/w3d-assets.js';

/**
 * 把当前家园状态刷到舞台上：主题配色、季节、院子家具、宠物外观。
 * 进世界、买主题/家具/换装、换宠物之后都会调它。
 */
export function applyHomeLook() {
  const s = getStage();
  if (!s) return;
  const home = homeState();
  applyThemeToScene(themeById(home.theme));
  const dayIndex = dayIndexOf(Date.now());
  s.dayIndex = dayIndex;
  s.seasonIdx = seasonIndexOf(dayIndex);
  applySeasonToScene(SEASONS[s.seasonIdx]);
  syncFurniture();
  applyOutfitToPet();
}

/** 创建舞台（只成功一次；失败返回 null） */
function initStage() {
  const container = $('w3dGL');
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 220);

  setStage({
    renderer,
    scene,
    camera,
    rotated: false,
    viewW: 1280,
    viewH: 720,
    cam: { theta: 0.55, phi: 1.02, r: 16, tx: 0, ty: 1.1, tz: 0 },
    pet: null,
    petInner: null,
    petId: null,
    mixer: null,
    actions: null,
    curAnim: null,
    ai: { state: 'idle', t: 2.5, target: null },
    buildings: [],
    signs: [],
    signsLocked: null,
    weather: 'sunny',
    weatherT: 60,
    leaves: null,
    leafSpeeds: null,
    rain: null,
    rainSpeeds: null,
    shelter: new THREE.Vector3(5.6, 0, -2.9),
    ray: new THREE.Raycaster(),
    pointers: new Map(),
    moved: 0,
    pinchStart: 0,
    suspended: false,
    clock: new THREE.Clock(),
    bubbleT: 0,
    hudT: 0,
    hudDirty: true,
    say: '',
    sayUntil: 0,
    sun: null,
    amb: null,
    fallbackParts: null,
    venuesUnlocked: () => worldLevel() >= 30,
    props: [],
    seasonIdx: 0,
    dayIndex: 0,
    decayT: 0,
    saveT: 0,
    eventT: 0,
  });

  buildScene();
  applyHomeLook();
  loadPet();
  bindInput();
  window.addEventListener('resize', () => {
    if ($('w3dStage').classList.contains('show')) layoutStage();
  });
  renderer.setAnimationLoop(tick);
  return getStage();
}

/** 请求系统级横屏（失败无妨，CSS 旋转兜底） */
function lockLandscape() {
  try {
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch {
    /* 桌面浏览器没有这个 API，忽略 */
  }
}

function unlockLandscape() {
  try {
    if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.unlock) {
      screen.orientation.unlock();
    }
  } catch {
    /* 同上 */
  }
}

/** 舞台内降级提示（不白屏、不崩溃） */
export function fallbackStage(message) {
  const box = $('w3dFall');
  if (box) {
    box.style.display = 'flex';
    const text = box.querySelector('.w3d-fall-t');
    if (text) text.textContent = message;
  }
  const gl = $('w3dGL');
  if (gl) gl.style.display = 'none';
  return false;
}

/** 进入舞台（幂等） */
export function enterStage() {
  const stageEl = $('w3dStage');
  if (!stageEl) return false;
  stageEl.classList.add('show');
  lockLandscape();

  if (typeof window.THREE === 'undefined') {
    return fallbackStage('3D 引擎未加载：请确认 three.min.js / GLTFLoader.js 与页面同目录');
  }

  const stage = getStage();
  if (!stage) {
    try {
      initStage();
    } catch {
      setStage(null);
      return fallbackStage('当前环境不支持 WebGL，请更换浏览器或设备');
    }
  } else if (stage.petId !== S.curPet) {
    removePet();
    loadPet();
  }
  applyHomeLook();

  getStage().suspended = false;
  layoutStage();
  refreshHud();
  return true;
}

/** 挂起（进面板时调用；场景不销毁，回来不重算登录天数） */
export function suspendStage() {
  const stage = getStage();
  if (!stage) return;
  stage.suspended = true;
  $('w3dStage').classList.remove('show');
}

/** 恢复（面板里的「返回世界」） */
export function resumeStage() {
  const stage = getStage();
  if (!stage) {
    go('home');
    return;
  }
  stage.suspended = false;
  $('w3dStage').classList.add('show');
  layoutStage();
  refreshHud();
}

/** 退出舞台回首页 */
export function exitStage() {
  const stage = getStage();
  if (stage) stage.suspended = true;
  $('w3dStage').classList.remove('show');
  unlockLandscape();
  go('home');
}

/** 横屏布局：竖屏视口时把内容整体旋转 90° */
export function layoutStage() {
  const stage = getStage();
  if (!stage) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const rotated = needRotate(width, height);
  stage.rotated = rotated;

  const boxWidth = rotated ? height : width;
  const boxHeight = rotated ? width : height;
  stage.viewW = boxWidth;
  stage.viewH = boxHeight;

  const box = $('w3dBox');
  box.style.width = boxWidth + 'px';
  box.style.height = boxHeight + 'px';
  box.style.transform = 'translate(-50%,-50%)' + (rotated ? ' rotate(90deg)' : '');

  const tip = $('w3dTip');
  if (tip) tip.style.display = rotated ? 'block' : 'none';

  stage.renderer.setSize(boxWidth, boxHeight);
  stage.camera.aspect = boxWidth / boxHeight;
  stage.camera.updateProjectionMatrix();
}

/** 当前天气（面板要显示"晴/阴/小雨"） */
export function stageWeather() {
  return currentWeather();
}

export { isStageActive, isStageSuspended };

registerActions('w3d-stage', {
  suspendStage,
  resumeStage,
  exitStage,
  w3dExit: exitStage,
  w3dResume: resumeStage,
  w3dSuspend: suspendStage,
});
