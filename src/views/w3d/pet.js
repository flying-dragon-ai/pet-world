/**
 * 宠物模型：GLTF 加载 + 程序化体型 + 动画状态机。
 *
 * 一只宠物的渲染来源在数据层就定死了（data/w3d-assets.js 的 modelFor），降级链：
 *   本体 GLB → alias 替补 GLB（缺模型的品种）→ proc 程序化体型 → 球体橘猫。
 * 每一档都有可见的形体，宁可不像也不要留一个空气泡。
 * 程序化体型没有骨骼，摆动由 proc-pet.js 的 update(t, moving) 手写。
 */
import { S } from '../../app/store.js';
import { petModelOf, pickClips } from '../../data/w3d-assets.js';
import { getStage } from './ctx.js';
import { buildProcPet } from './proc-pet.js';
import { curPet } from '../pets.js';
import { homeState } from '../world-state.js';
import { outfitById } from '../../domain/w3d.js';

const MODEL_TIMEOUT_MS = 8000;
const FADE_SECONDS = 0.3;
/** AI 状态里算"在动"的（鳍/腿摆动加大），其余按待机处理 */
const MOVING_STATES = ['walk', 'walkShelter', 'out', 'goCushion', 'goHouse', 'explore', 'play', 'jump', 'happy'];
/** 试过且缺的 GLB（换宠物反复进舞台时不重复拉 404） */
const deadModels = new Set();

/** 按当前宠物加载模型；换成同一只宠物时不动 */
export function loadPet() {
  const s = getStage();
  const pet = curPet();
  const config = petModelOf(pet);
  s.petId = S.curPet;

  // 本体 → alias 替补（磁盘上没有本体文件的品种靠它）→ 全挂走程序化兜底
  const urls = [config.url];
  if (config.aliasUrl) urls.push(config.aliasUrl);
  loadFirstModel(urls, config, pet);
}

/**
 * 依次试候选 GLB：每支 8 秒超时，加载失败就换下一支，全挂才走程序化兜底。
 * 本体文件在不在是构建期的事（dev/check-assets.js 核对），运行期只认"加载失败就换"。
 */
function loadFirstModel(urls, config, pet) {
  const queue = urls.filter((url) => !deadModels.has(url));
  let idx = 0;
  let done = false;

  const next = () => {
    if (done) return;
    if (idx >= queue.length) {
      done = true;
      fallbackVisual(config);
      return;
    }
    const url = queue[idx++];
    let settled = false;
    const timer = setTimeout(() => {
      if (settled || done) return;
      settled = true;
      next();
    }, MODEL_TIMEOUT_MS);
    const settle = (fn) => {
      if (settled || done) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    try {
      const loader = new THREE.GLTFLoader();
      loader.load(
        url,
        (gltf) => settle(() => {
          done = true;
          normalizeAndMount(gltf, config, pet);
        }),
        undefined,
        () => {
          deadModels.add(url);
          settle(next);
        },
      );
    } catch {
      deadModels.add(url);
      settle(next);
    }
  };

  next();
}

/** GLB 全线失败时：先试程序化体型，再不行才是球体橘猫 */
function fallbackVisual(config) {
  if (config.proc && mountProcPet(config)) return;
  useFallbackPet();
}

/** 当前 AI 状态是不是在移动（决定程序化体型的摆动幅度） */
function petMoving(s) {
  return MOVING_STATES.indexOf(s.ai && s.ai.state) >= 0;
}

/** 源模型尺度不一：按包围盒归一化到 1.25m（鸟类 1.0m），并让脚底贴地 */
function normalizeAndMount(gltf, config, pet) {
  const model = gltf.scene;
  const box = new THREE.Box3().setFromObject(model);
  const height = Math.max(box.max.y - box.min.y, 0.001);
  const targetHeight = (pet.species === '鸟' || pet.species === '异宠') ? 1.0 : 1.25;
  model.scale.setScalar(config.scale * targetHeight / height);

  const fitted = new THREE.Box3().setFromObject(model);
  const centerX = (fitted.max.x + fitted.min.x) / 2;
  const centerZ = (fitted.max.z + fitted.min.z) / 2;
  model.position.set(-centerX, -fitted.min.y, -centerZ);

  mountPet(model, gltf.animations || []);
}

/** 地面投影：让宠物看着是站在草地上，而不是浮着 */
function petShadow(radius) {
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(radius || 0.75, 24),
    new THREE.MeshBasicMaterial({ color: 0x1B3A22, transparent: true, opacity: 0.22 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  return blob;
}

/**
 * 挂程序化体型（鱼 / 爬行 / 蛙 / 昆虫）：零字节资产，不加载任何外部资源。
 * 摆动靠 tick 每帧调一次 update(dt)；GLB 那条路的每帧钩子是 s.mixer.update(dt)，
 * 这里把同一个位置让给一个只带 update 的适配器，tick.js 就不用认识第二种宠物。
 *
 * @returns {boolean} 体型不认识时返回 false，交给球体橘猫
 */
function mountProcPet(config) {
  const s = getStage();
  if (!s) return false;
  const proc = buildProcPet(config.proc, config.key);
  if (!proc) return false;

  const group = new THREE.Group();
  group.userData.pet = true;
  group.add(proc.group);
  group.add(petShadow(0.6));

  s.scene.add(group);
  s.pet = group;
  s.petInner = proc.group;
  s.actions = null;
  s.curAnim = null;
  s.fallbackParts = null;
  s.proc = proc;
  s.procT = 0;
  s.mixer = {
    update(dt) {
      s.procT += dt;
      proc.update(s.procT, petMoving(s));
    },
  };
  applyOutfitToPet();

  if (s.weather === 'rain') {
    s.ai.state = 'walkShelter';
    s.ai.target = s.shelter.clone();
  }
  return true;
}

/** 把模型挂到场景，接上动画混合器与地面阴影 */
function mountPet(model, clips) {
  const s = getStage();
  const group = new THREE.Group();
  group.userData.pet = true;
  group.add(model);
  group.add(petShadow(0.75));

  s.scene.add(group);
  s.pet = group;
  applyOutfitToPet();
  s.petInner = model;
  // 换宠物时先清掉上一只的动画状态，否则没有 clip 的模型会留在旧 mixer 上
  s.mixer = null;
  s.actions = null;
  s.curAnim = null;
  s.proc = null;
  s.fallbackParts = null;

  if (clips && clips.length) {
    s.mixer = new THREE.AnimationMixer(model);
    const roles = pickClips(clips);
    const idle = roles.idle;
    const walk = roles.walk;
    const run = roles.run;
    s.actions = {
      idle: s.mixer.clipAction(idle),
      walk: s.mixer.clipAction(walk),
      run: s.mixer.clipAction(run),
    };
    s.actions.idle.play();
    s.curAnim = s.actions.idle;
  }

  if (s.weather === 'rain') {
    s.ai.state = 'walkShelter';
    s.ai.target = s.shelter.clone();
  }
}

/** 程序化兜底：球体拼装的橘猫（无 WebGL 模型也能看） */
export function useFallbackPet() {
  const s = getStage();
  if (!s) return;

  const group = new THREE.Group();
  group.userData.pet = true;
  const fur = new THREE.MeshLambertMaterial({ color: 0xE8A25C });
  const cream = new THREE.MeshLambertMaterial({ color: 0xFBE3C4 });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 20, 16), fur);
  body.scale.set(1, 0.85, 1.25);
  body.position.y = 0.6;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 16), fur);
  head.position.set(0, 1.18, 0.45);
  group.add(head);

  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), cream);
  muzzle.position.set(0, 1.1, 0.74);
  group.add(muzzle);

  const earLeft = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 6), fur);
  earLeft.position.set(-0.2, 1.5, 0.36);
  group.add(earLeft);
  const earRight = earLeft.clone();
  earRight.position.x = 0.2;
  group.add(earRight);

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.7, 8), fur);
  tail.position.set(0, 0.85, -0.72);
  tail.rotation.x = -0.9;
  group.add(tail);

  const legs = [];
  [[-0.26, 0.32], [0.26, 0.32], [-0.26, -0.32], [0.26, -0.32]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.5, 8), fur);
    leg.position.set(x, 0.25, z);
    group.add(leg);
    legs.push(leg);
  });

  group.add(petShadow(0.75));

  s.scene.add(group);
  s.pet = group;
  applyOutfitToPet();
  s.petInner = null;
  s.mixer = null;
  s.actions = null;
  s.curAnim = null;
  s.proc = null;
  s.fallbackParts = { body, head, tail, legs };
}

/* ---------------- 宠物外观（帽子 / 眼镜 / 脖子饰品） ---------------- */

/** 各种挂件的颜色 */
const ACC_COLORS = {
  scarf: 0xD9534F,
  bow: 0xE8709A,
  glasses: 0x37415C,
  sunglass: 0x1F2430,
  tophat: 0x2D3A55,
  cap: 0x5B8DEF,
};

/** 造一个挂件模型（挂在宠物外层 group 上，坐标按 ~1.25m 身高的宠物估算） */
function buildAccessory(id) {
  const o = outfitById(id);
  if (!o) return null;
  const color = ACC_COLORS[id] || 0xE8709A;
  const mat = new THREE.MeshLambertMaterial({ color });
  const group = new THREE.Group();

  if (o.slot === 'hat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), mat);
    brim.position.set(0, 1.14, 0.16);
    group.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 16), mat);
    crown.position.set(0, 1.3, 0.16);
    group.add(crown);
  } else if (o.slot === 'glasses') {
    const lensMat = new THREE.MeshBasicMaterial({ color });
    const left = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.04), lensMat);
    left.position.set(-0.13, 1.0, 0.3);
    group.add(left);
    const right = left.clone();
    right.position.x = 0.13;
    group.add(right);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.04), lensMat);
    bridge.position.set(0, 1.0, 0.3);
    group.add(bridge);
  } else {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 8, 20), mat);
    band.rotation.x = Math.PI / 2;
    band.position.set(0, 0.78, 0.12);
    group.add(band);
    if (id === 'bow') {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat);
      knot.position.set(0.2, 0.78, 0.24);
      group.add(knot);
    }
  }
  return group;
}

/** 按当前家园状态重新给宠物穿戴外观 */
export function applyOutfitToPet() {
  const s = getStage();
  if (!s || !s.pet) return;
  const old = s.pet.userData.acc || [];
  old.forEach((mesh) => s.pet.remove(mesh));
  const acc = [];
  const worn = (homeState().outfit || {}).worn || {};
  Object.keys(worn).forEach((slot) => {
    const id = worn[slot];
    if (!id) return;
    const mesh = buildAccessory(id);
    if (!mesh) return;
    s.pet.add(mesh);
    acc.push(mesh);
  });
  s.pet.userData.acc = acc;
}

export function removePet() {
  const s = getStage();
  if (!s || !s.pet) return;
  s.scene.remove(s.pet);
  s.pet = null;
  s.petInner = null;
  s.mixer = null;
  s.actions = null;
  s.curAnim = null;
  s.proc = null;
  s.fallbackParts = null;
}

/** 动画状态机（0.3s 交叉淡入） */
export function playAnim(name, timeScale) {
  const s = getStage();
  if (!s || !s.actions) return;
  const next = s.actions[name] || s.actions.idle;
  if (!next) return;
  if (s.curAnim !== next) {
    next.reset().fadeIn(FADE_SECONDS).play();
    if (s.curAnim) s.curAnim.fadeOut(FADE_SECONDS);
    s.curAnim = next;
  }
  next.timeScale = timeScale || 1;
}
