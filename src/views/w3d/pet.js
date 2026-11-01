/**
 * 宠物模型：GLTF 加载（8 秒超时 → 程序化拼装兜底）+ 动画状态机。
 *
 * 兜底模型是球体拼的小动物，动画手写在 ai.js 里（抬腿、摆手、尾巴）。
 */
import { S } from '../../app/store.js';
import { PET_MODELS } from '../../data/w3d-assets.js';
import { getStage } from './ctx.js';
import { curPet } from '../pets.js';
import { homeState } from '../world-state.js';
import { outfitById } from '../../domain/w3d.js';

const MODEL_TIMEOUT_MS = 8000;
const FADE_SECONDS = 0.3;

/** 按当前宠物加载模型；换成同一只宠物时不动 */
export function loadPet() {
  const s = getStage();
  const pet = curPet();
  const config = PET_MODELS[pet.species] || PET_MODELS['猫'];
  s.petId = S.curPet;

  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    useFallbackPet();
  }, MODEL_TIMEOUT_MS);

  try {
    const loader = new THREE.GLTFLoader();
    loader.load(
      config.url,
      (gltf) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        normalizeAndMount(gltf, config, pet);
      },
      undefined,
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        useFallbackPet();
      },
    );
  } catch {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    useFallbackPet();
  }
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

/** 把模型挂到场景，接上动画混合器与地面阴影 */
function mountPet(model, clips) {
  const s = getStage();
  const group = new THREE.Group();
  group.userData.pet = true;
  group.add(model);

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 24),
    new THREE.MeshBasicMaterial({ color: 0x1B3A22, transparent: true, opacity: 0.22 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  group.add(blob);

  s.scene.add(group);
  s.pet = group;
  applyOutfitToPet();
  s.petInner = model;

  if (clips && clips.length) {
    s.mixer = new THREE.AnimationMixer(model);
    const pick = (re) => clips.find((c) => re.test(c.name));
    const idle = pick(/survey|idle/i) || clips[0];
    const walk = pick(/walk/i) || idle;
    const run = pick(/run|gallop|fly/i) || walk;
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

  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.75, 24),
    new THREE.MeshBasicMaterial({ color: 0x1B3A22, transparent: true, opacity: 0.22 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  group.add(blob);

  s.scene.add(group);
  s.pet = group;
  applyOutfitToPet();
  s.petInner = null;
  s.mixer = null;
  s.actions = null;
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
