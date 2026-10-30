/**
 * 宠物模型：GLTF 加载（8 秒超时 → 程序化拼装兜底）+ 动画状态机。
 *
 * 兜底模型是球体拼的小动物，动画手写在 ai.js 里（抬腿、摆手、尾巴）。
 */
import { S } from '../../app/store.js';
import { PET_MODELS } from '../../data/w3d-assets.js';
import { getStage } from './ctx.js';
import { curPet } from '../pets.js';

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
  s.petInner = null;
  s.mixer = null;
  s.actions = null;
  s.fallbackParts = { body, head, tail, legs };
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
