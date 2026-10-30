/**
 * 庭院场景搭建：地面、篱笆、石板路、秋树、花丛、小屋、建筑热点、落叶与雨粒子。
 *
 * 只做"建一次"的事；逐帧变化在 tick.js，天气切换在 weather.js 里被复用。
 */
import { BUILDING_SPOTS } from '../../data/w3d-assets.js';
import { getStage } from './ctx.js';
import { resetWeather } from './weather.js';

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
  buildLeaves(scene);
  buildRain(scene);
  resetWeather(true);
}

function buildGround(scene) {
  const grass = new THREE.Mesh(new THREE.CircleGeometry(34, 48), new THREE.MeshLambertMaterial({ color: 0x7CBF6A }));
  grass.rotation.x = -Math.PI / 2;
  scene.add(grass);

  const inner = new THREE.Mesh(new THREE.CircleGeometry(12.6, 40), new THREE.MeshLambertMaterial({ color: 0x8CCB78 }));
  inner.rotation.x = -Math.PI / 2;
  inner.position.y = 0.01;
  scene.add(inner);
}

/** 篱笆（正南方向留出入口） */
function buildFence(scene) {
  const material = new THREE.MeshLambertMaterial({ color: 0xB9906B });
  for (let i = 0; i < 26; i++) {
    const angle = i / 26 * Math.PI * 2;
    if (angle > Math.PI * 0.42 && angle < Math.PI * 0.58) continue;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.16), material);
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

/** 三棵秋色树（[x, z, 树冠色]） */
function buildTrees(scene) {
  [[-6.2, -4.4, 0xD9822B], [7.4, 4.6, 0xC94F3D], [-4.2, 7.2, 0xE0A13C]].forEach(([x, z, color]) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.5, 8), new THREE.MeshLambertMaterial({ color: 0x8A6238 }));
    trunk.position.set(x, 0.75, z);
    scene.add(trunk);

    const crownLow = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.1, 8), new THREE.MeshLambertMaterial({ color }));
    crownLow.position.set(x, 2.4, z);
    scene.add(crownLow);

    const crownHigh = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.5, 8), new THREE.MeshLambertMaterial({ color }));
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

/** 坡顶小屋（屋檐是雨天躲避点，坐标见 stage.shelter） */
function buildHouse(scene) {
  const house = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(4, 2.5, 3.4), new THREE.MeshLambertMaterial({ color: 0xF2E3C9 }));
  base.position.y = 1.25;
  house.add(base);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.3, 1.9, 4), new THREE.MeshLambertMaterial({ color: 0xC9603F }));
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

  const eave = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 1.5), new THREE.MeshLambertMaterial({ color: 0xB9906B }));
  eave.position.set(0, 2.15, 2.35);
  house.add(eave);

  house.position.set(5.6, 0, -5.6);
  scene.add(house);
}

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
