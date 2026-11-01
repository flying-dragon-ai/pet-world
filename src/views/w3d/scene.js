/**
 * 庭院场景搭建：地面、篱笆、石板路、四季树、花丛、小屋、建筑热点、躺垫、家具、落叶与雨粒子。
 *
 * 只做"建一次"的事；逐帧变化在 tick.js，天气切换在 weather.js 里被复用。
 *
 * V1.10（对齐《虚拟宠物家园》2D 小游戏）：
 *   - 关键网格都留了引用，主题（5 套配色）与季节（春夏秋冬）可以运行时切换；
 *   - 院子里多了躺垫（点一下就躺）与可购买摆放的家具；
 *   - 小屋门口是"进屋 / 出屋"的落点。
 */
import { BUILDING_SPOTS } from '../../data/w3d-assets.js';
import { getStage } from './ctx.js';
import { resetWeather } from './weather.js';
import { homeState } from '../world-state.js';

/** 小屋中心坐标（家具机位以它为基准） */
export const HOUSE_POS = { x: 5.6, z: -5.6 };
/** 小屋门口（进屋/出屋的落点） */
export const DOOR_POS = { x: 5.0, z: -3.7 };
/** 院子里的躺垫 */
export const CUSHION_POS = { x: 2.2, z: -1.4 };

/** 建院子的静态部分 */
export function buildScene() {
  const s = getStage();
  const scene = s.scene;

  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);
  s.amb = ambient;

  const sun = new THREE.DirectionalLight(0xfff2d9, 0.95);
  sun.position.set(9, 15, 7);
  scene.add(sun);
  s.sun = sun;

  buildGround(scene);
  buildFence(scene);
  buildStonePath(scene);
  buildTrees(scene);
  buildFlowers(scene);
  buildHouse(scene);
  buildSpots(scene);
  buildCushion(scene);
  buildLeaves(scene);
  buildRain(scene);
  resetWeather(true);
}

/* ---------------- 地面 / 篱笆 / 树 ---------------- */

function buildGround(scene) {
  const s = getStage();
  s.groundMat = new THREE.MeshLambertMaterial({ color: 0x8CCB78 });
  s.innerMat = new THREE.MeshLambertMaterial({ color: 0xA5D98C });

  const grass = new THREE.Mesh(new THREE.CircleGeometry(34, 48), s.groundMat);
  grass.rotation.x = -Math.PI / 2;
  scene.add(grass);
  s.ground = grass;

  const inner = new THREE.Mesh(new THREE.CircleGeometry(12.6, 40), s.innerMat);
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.01;
  scene.add(inner);
  s.groundInner = inner;
}

/** 篱笆（正南方向留出入口） */
function buildFence(scene) {
  const s = getStage();
  s.fenceMat = new THREE.MeshLambertMaterial({ color: 0xB9906B });
  for (let i = 0; i < 26; i++) {
    const angle = i / 26 * Math.PI * 2;
    if (angle > Math.PI * 0.42 && angle < Math.PI * 0.58) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.16), s.fenceMat);
    post.position.set(Math.cos(angle) * 12.6, 0.42, Math.sin(angle) * 12.6);
    scene.add(post);
  }
}

function buildStonePath(scene) {
  const material = new THREE.MeshLambertMaterial({ color: 0xD8D2C4 });
  for (let i = 0; i < 5; i++) {
    const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 10), material);
    stone.position.set(i % 2 ? 0.28 : -0.22, 0.03, 10.8 - i * 1.7);
    scene.add(stone);
  }
}

/** 三棵树（树冠颜色随季节/主题变） */
function buildTrees(scene) {
  const s = getStage();
  s.trunkMat = new THREE.MeshLambertMaterial({ color: 0x8A6238 });
  s.treeMats = [];
  [[-6.2, -4.4], [7.4, 4.6], [-4.2, 7.2]].forEach(([x, z], idx) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.5, 8), s.trunkMat);
    trunk.position.set(x, 0.75, z);
    scene.add(trunk);

    const lowMat = new THREE.MeshLambertMaterial({ color: 0x7FBF6E });
    const highMat = new THREE.MeshLambertMaterial({ color: 0x7FBF6E });
    s.treeMats.push(lowMat, highMat);

    const crownLow = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.1, 8), lowMat);
    crownLow.position.set(x, 2.4, z);
    scene.add(crownLow);

    const crownHigh = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.5, 8), highMat);
    crownHigh.position.set(x, 3.5, z);
    scene.add(crownHigh);
  });
}

function buildFlowers(scene) {
  const palette = [0xF5D061, 0xE8709A, 0xFFFFFF, 0x8B5CF6];
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 3.5 + Math.random() * 7;
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 8),
      new THREE.MeshLambertMaterial({ color: palette[i % 4] }),
    );
    flower.position.set(Math.cos(angle) * radius, 0.14, Math.sin(angle) * radius);
    scene.add(flower);
  }
}

/* ---------------- 小屋 ---------------- */

/** 坡顶小屋（屋檐是雨天躲避点，坐标见 stage.shelter） */
function buildHouse(scene) {
  const s = getStage();
  const house = new THREE.Group();

  s.houseWallMat = new THREE.MeshLambertMaterial({ color: 0xF2E3C9 });
  s.houseRoofMat = new THREE.MeshLambertMaterial({ color: 0xC9603F });
  s.houseEaveMat = new THREE.MeshLambertMaterial({ color: 0xB9906B });

  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3.4), s.houseWallMat);
  base.position.y = 1.25;
  house.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.9, 4), s.houseRoofMat);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.18, 1, 1);
  roof.position.y = 3.4;
  house.add(roof);

  const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), new THREE.MeshLambertMaterial({ color: 0x8A6238 }));
  door.position.set(-0.6, 0.75, 1.72);
  house.add(door);

  const windowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), new THREE.MeshLambertMaterial({ color: 0xBEE3F8 }));
  windowMesh.position.set(0.9, 1.5, 1.72);
  house.add(windowMesh);

  const eave = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 1.5), s.houseEaveMat);
  eave.position.set(0, 2.15, 2.35);
  house.add(eave);

  house.position.set(HOUSE_POS.x, 0, HOUSE_POS.z);
  house.userData.house = true;
  scene.add(house);
  s.house = house;
}

/* ---------------- 建筑热点 ---------------- */

/** 六个可点建筑（招牌是 Canvas 贴图，锁定态由 hud 刷新） */
function buildSpots(scene) {
  const s = getStage();
  BUILDING_SPOTS.forEach((spot) => {
    const group = new THREE.Group();
    group.userData.tab = spot.tab;

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.7, 1.9), new THREE.MeshLambertMaterial({ color: 0xF5EFE2 }));
    body.position.y = 0.85;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1, 4), new THREE.MeshLambertMaterial({ color: spot.c }));
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 2.2;
    group.add(roof);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 0.95),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    );
    sign.position.set(0, 1.15, 0.98);
    group.add(sign);

    const record = { cv: canvas, ctx: canvas.getContext('2d'), tex: texture, spot };
    s.signs.push(record);
    drawSign(record);

    group.position.set(spot.x, 0, spot.z);
    group.lookAt(0, 1, 0);
    scene.add(group);
    s.buildings.push(group);
  });
}

/* ---------------- 躺垫 / 家具 ---------------- */

/** 院子里的躺垫：点一下宠物就去躺一会儿 */
function buildCushion(scene) {
  const s = getStage();
  const cushion = new THREE.Group();
  cushion.userData.cushion = true;

  const mat = new THREE.MeshLambertMaterial({ color: 0xE8709A });
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.18, 20), mat);
  pad.position.y = 0.09;
  cushion.add(pad);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.1, 8, 24), new THREE.MeshLambertMaterial({ color: 0xF7B8C4 }));
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.16;
  cushion.add(rim);

  cushion.position.set(CUSHION_POS.x, 0, CUSHION_POS.z);
  scene.add(cushion);
  s.cushion = cushion;
}

/** 按当前家园状态重建院子里的家具 */
export function syncFurniture() {
  const s = getStage();
  if (!s) return;
  // 清掉旧的
  (s.props || []).forEach((p) => {
    s.scene.remove(p);
  });
  s.props = [];

  const home = homeState();
  home.furniture.forEach((item) => {
    const def = FURNITURE_LOOKUP[item.id];
    if (!def) return;
    const slotIndex = Math.min(item.slot || 0, def.slots.length - 1);
    const [dx, dz] = def.slots[slotIndex] || def.slots[0];
    const mesh = buildProp(def);
    mesh.position.set(HOUSE_POS.x + dx, 0, HOUSE_POS.z + dz);
    mesh.userData.furniture = def.id;
    mesh.userData.furnitureLabel = def.n;
    s.scene.add(mesh);
    s.props.push(mesh);
  });
}

/** 家具外观表（与 data/w3d-assets.js 的 FURNITURE 对应，这里只管怎么画） */
const FURNITURE_LOOKUP = {
  bed: { id: 'bed', n: '小床', kind: 'bed', color: 0xE8945A, slots: [[-1.2, 2.6]] },
  bowlf: { id: 'bowlf', n: '食盆', kind: 'bowl', color: 0xE58B5A, slots: [[1.6, 1.2]] },
  plant: { id: 'plant', n: '盆栽', kind: 'plant', color: 0x4E9E52, slots: [[-2.4, 0.4]] },
  sofa: { id: 'sofa', n: '软软沙发', kind: 'sofa', color: 0xE8709A, slots: [[-2.0, 1.4], [1.4, 2.2]] },
  rug: { id: 'rug', n: '圆圆地毯', kind: 'rug', color: 0xF5A66B, slots: [[0.6, 1.6], [-1.6, 1.8]] },
  toy: { id: 'toy', n: '玩具箱', kind: 'box', color: 0xD9A03C, slots: [[2.2, 1.8], [0.2, 3.0]] },
  lamp: { id: 'lamp', n: '暖暖小灯', kind: 'lamp', color: 0xF5D061, slots: [[-2.6, 2.2], [2.4, 0.8]] },
  shelf: { id: 'shelf', n: '照片书架', kind: 'box', color: 0x8B5CF6, slots: [[-3.0, 1.0], [2.8, 2.4]] },
  treat: { id: 'treat', n: '零食罐', kind: 'bowl', color: 0xC77E12, slots: [[0.4, 0.9], [-2.2, 2.6]] },
};

/** 按 kind 拼一个简易家具模型 */
function buildProp(def) {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: def.color });
  const dark = new THREE.MeshLambertMaterial({ color: shadeHex(def.color, 0.78) });

  if (def.kind === 'bed') {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.95), mat);
    pad.position.y = 0.16;
    group.add(pad);
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.8), new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
    pillow.position.set(-0.35, 0.36, 0);
    group.add(pillow);
  } else if (def.kind === 'bowl') {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.26, 0.28, 16), mat);
    bowl.position.y = 0.14;
    group.add(bowl);
    const food = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 16), dark);
    food.position.y = 0.26;
    group.add(food);
  } else if (def.kind === 'plant') {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.22, 0.36, 14), new THREE.MeshLambertMaterial({ color: 0xC77E12 }));
    pot.position.y = 0.18;
    group.add(pot);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), mat);
    leaf.position.y = 0.66;
    leaf.scale.set(1, 0.85, 1);
    group.add(leaf);
  } else if (def.kind === 'sofa') {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.42, 0.72), mat);
    seat.position.y = 0.28;
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.62, 0.2), dark);
    back.position.set(0, 0.68, -0.26);
    group.add(back);
  } else if (def.kind === 'rug') {
    const rug = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), mat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.y = 0.03;
    group.add(rug);
  } else if (def.kind === 'lamp') {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 10), new THREE.MeshLambertMaterial({ color: 0x8A6238 }));
    pole.position.y = 0.6;
    group.add(pole);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), mat);
    light.position.y = 1.28;
    group.add(light);
  } else {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.72, 0.56), mat);
    box.position.y = 0.36;
    group.add(box);
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.62), dark);
    lid.position.y = 0.76;
    group.add(lid);
  }
  return group;
}

/** 按比例压暗一个 0xRRGGBB 颜色 */
function shadeHex(hex, factor) {
  const r = Math.round(((hex >> 16) & 255) * factor);
  const g = Math.round(((hex >> 8) & 255) * factor);
  const b = Math.round((hex & 255) * factor);
  return (r << 16) | (g << 8) | b;
}

/* ---------------- 粒子 ---------------- */

function buildLeaves(scene) {
  const s = getStage();
  const count = 90;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const speeds = [];
  const palette = [[0.85, 0.51, 0.17], [0.79, 0.31, 0.24], [0.88, 0.63, 0.24]];

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 36;
    positions[i * 3 + 1] = Math.random() * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 36;
    const c = palette[i % 3];
    colors[i * 3] = c[0];
    colors[i * 3 + 1] = c[1];
    colors[i * 3 + 2] = c[2];
    speeds.push(0.4 + Math.random() * 0.7);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const leaves = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95 }));
  scene.add(leaves);
  s.leaves = leaves;
  s.leafSpeeds = speeds;
}

function buildRain(scene) {
  const s = getStage();
  const count = 420;
  const positions = new Float32Array(count * 3);
  const speeds = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = Math.random() * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    speeds.push(16 + Math.random() * 8);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.13, color: 0x9FB8D8, transparent: true, opacity: 0.75 }));
  rain.visible = false;
  scene.add(rain);
  s.rain = rain;
  s.rainSpeeds = speeds;
}

/* ---------------- 主题 / 季节 ---------------- */

/**
 * 应用家园主题：草地、树、小屋、篱笆的配色立刻变。
 * @param {object} theme data/w3d-assets.js 的 THEMES 条目
 */
export function applyThemeToScene(theme) {
  const s = getStage();
  if (!s || !theme) return;
  if (s.groundMat) s.groundMat.color.setHex(theme.grass);
  if (s.innerMat) s.innerMat.color.setHex(theme.inner);
  if (s.treeMats) {
    theme.tree.forEach((c, i) => {
      if (s.treeMats[i]) s.treeMats[i].color.setHex(c);
    });
  }
  if (s.houseWallMat) s.houseWallMat.color.setHex(theme.wall);
  if (s.houseRoofMat) s.houseRoofMat.color.setHex(theme.roof);
  if (s.houseEaveMat) s.houseEaveMat.color.setHex(theme.fence);
  if (s.fenceMat) s.fenceMat.color.setHex(theme.fence);
}

/**
 * 应用季节：树色 + 飘落粒子（春花 / 夏无 / 秋叶 / 冬雪）。
 * @param {object} season data/w3d-assets.js 的 SEASONS 条目
 */
export function applySeasonToScene(season) {
  const s = getStage();
  if (!s || !season) return;
  s.season = season.id;
  // 树色归主题管，季节只管飘落物（春花 / 夏无 / 秋叶 / 冬雪）
  if (s.leaves) {
    const palette = season.particle === 'snow'
      ? [[1, 1, 1], [0.93, 0.96, 1], [0.88, 0.93, 0.98]]
      : season.particle === 'petal'
        ? [[1, 0.79, 0.86], [1, 0.9, 0.92], [0.98, 0.72, 0.81]]
        : [[0.85, 0.51, 0.17], [0.79, 0.31, 0.24], [0.88, 0.63, 0.24]];
    const colors = s.leaves.geometry.attributes.color;
    for (let i = 0; i < colors.count; i++) {
      const c = palette[i % 3];
      colors.setXYZ(i, c[0], c[1], c[2]);
    }
    colors.needsUpdate = true;
    s.leafSpeeds = s.leafSpeeds.map(() => (season.particle === 'snow' ? 0.8 + Math.random() * 0.5 : 0.4 + Math.random() * 0.7));
    s.leaves.material.size = season.particle === 'snow' ? 0.16 : 0.22;
    s.leaves.material.opacity = season.particle === 'snow' ? 0.9 : 0.95;
    s.leaves.visible = season.particle !== 'none';
  }
}

/** 把招牌画到 Canvas 贴图上（锁定时灰底 + 🔒） */
export function drawSign(record) {
  const ctx = record.ctx;
  const spot = record.spot;
  const locked = spot.lock && !getStage().venuesUnlocked();

  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = locked ? 'rgba(110,116,128,0.95)' : '#' + spot.c.toString(16).padStart(6, '0');
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(6, 6, 244, 116, 20); else ctx.rect(6, 6, 244, 116);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '44px sans-serif';
  ctx.fillText(spot.ic, 128, 48);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(spot.n + (locked ? ' 🔒' : ''), 128, 96);
  record.tex.needsUpdate = true;
}

/** 解锁状态变化时重画所有招牌 */
export function refreshSigns() {
  const s = getStage();
  if (!s || !s.signs) return;
  const locked = !s.venuesUnlocked();
  if (s.signsLocked === locked) return;
  s.signsLocked = locked;
  s.signs.forEach(drawSign);
}
