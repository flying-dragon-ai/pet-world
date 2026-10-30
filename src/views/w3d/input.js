/**
 * 舞台输入：单指环绕、双指/滚轮缩放、点按拾取。
 *
 * 旋转态（竖屏手机）下要把屏幕位移换算回内容坐标，所以有 contentDelta / ndc 两个换算函数。
 * 点宠物 = 抚摸；点建筑 = 进对应面板。
 */
import { $ } from '../../app/dom.js';
import { getStage } from './ctx.js';
import { touchPet, openSpotTab } from './interactions.js';

const MIN_DISTANCE = 8;
const MAX_DISTANCE = 26;
const TAP_TOLERANCE = 8;

export function bindInput() {
  const s = getStage();
  const el = s.renderer.domElement;
  el.style.touchAction = 'none';

  el.addEventListener('pointerdown', (e) => {
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.moved = 0;
    if (s.pointers.size === 2) s.pinchStart = pointerDistance(s);
  });

  el.addEventListener('pointermove', (e) => {
    if (!s.pointers.has(e.pointerId)) return;
    const prev = s.pointers.get(e.pointerId);
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    s.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    s.moved += Math.abs(dx) + Math.abs(dy);

    if (s.pointers.size === 1) {
      const delta = contentDelta(s, dx, dy);
      s.cam.theta = Math.max(-0.5, Math.min(1.6, s.cam.theta - delta.du * 0.004));
      s.cam.phi = Math.max(0.55, Math.min(1.35, s.cam.phi - delta.dv * 0.003));
    } else if (s.pointers.size === 2) {
      const dist = pointerDistance(s);
      if (s.pinchStart) s.cam.r = clampDistance(s.cam.r * s.pinchStart / dist);
      s.pinchStart = dist;
    }
  });

  const onPointerUp = (e) => {
    const wasTap = s.pointers.size === 1 && s.moved < TAP_TOLERANCE;
    s.pointers.delete(e.pointerId);
    s.pinchStart = 0;
    if (wasTap) handleTap(e);
  };
  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);

  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    s.cam.r = clampDistance(s.cam.r * (1 + (e.deltaY > 0 ? 0.08 : -0.08)));
  }, { passive: false });
}

function clampDistance(r) {
  return Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, r));
}

/** 双指间距 */
function pointerDistance(s) {
  const points = [...s.pointers.values()];
  if (points.length < 2) return 0;
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

/** 屏幕位移 → 内容位移（旋转态下两轴交换） */
function contentDelta(s, dx, dy) {
  return s.rotated ? { du: dy, dv: -dx } : { du: dx, dv: dy };
}

/** 屏幕坐标 → 归一化设备坐标 */
function toNdc(s, e) {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  let localX;
  let localY;
  if (s.rotated) {
    localX = s.viewW / 2 + (e.clientY - centerY);
    localY = s.viewH / 2 - (e.clientX - centerX);
  } else {
    localX = s.viewW / 2 + (e.clientX - centerX);
    localY = s.viewH / 2 + (e.clientY - centerY);
  }
  return new THREE.Vector2(localX / s.viewW * 2 - 1, -(localY / s.viewH * 2 - 1));
}

function handleTap(e) {
  const s = getStage();
  s.ray.setFromCamera(toNdc(s, e), s.camera);

  if (s.pet) {
    const petHits = s.ray.intersectObject(s.pet, true);
    if (petHits.length) {
      touchPet();
      return;
    }
  }

  const hits = s.ray.intersectObjects(s.buildings, true);
  if (!hits.length) return;
  let node = hits[0].object;
  while (node && !node.userData.tab) node = node.parent;
  if (node) openSpotTab(node.userData.tab);
}
