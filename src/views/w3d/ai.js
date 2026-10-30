/**
 * 自主 AI：待机 → 随机游走 → 原地玩耍 → 低体力趴睡 → 下雨躲檐。
 *
 * 情绪映射：开心（心情≥70）蹦跳跑得快，委屈（饥饿/清洁<30）慢走，
 * 困倦（体力<25）进 idle 就趴下睡。全部是"每帧根据属性做决策"，
 * 没有隐藏状态机表，读代码即可知道它在想什么。
 */
import { worldPet } from '../world-state.js';
import { getStage } from './ctx.js';
import { playAnim } from './pet.js';
import { BUILDING_SPOTS } from '../../data/w3d-assets.js';

export const AI = {
  idle: 'idle',
  walk: 'walk',
  walkShelter: 'walkShelter',
  shelter: 'shelter',
  play: 'play',
  jump: 'jump',
  sleep: 'sleep',
};

/** 每帧推进 AI（dt 秒） */
export function tickAi(dt) {
  const s = getStage();
  if (!s || !s.pet) return;

  const ai = s.ai;
  const pet = s.pet;
  ai.t -= dt;

  const attr = worldPet().attr;
  const upset = attr.hunger < 30 || attr.clean < 30;
  const sleepy = attr.stamina < 25;
  const happy = attr.mood >= 70;

  if (s.weather === 'rain' && ai.state !== 'shelter' && ai.state !== 'walkShelter') {
    ai.state = 'walkShelter';
    ai.target = s.shelter.clone();
  }

  switch (ai.state) {
    case 'idle':
      pet.position.y = 0;
      playAnim('idle');
      if (ai.t <= 0) {
        if (sleepy) {
          ai.state = 'sleep';
          ai.t = 8 + Math.random() * 4;
        } else if (s.weather !== 'rain' && Math.random() < 0.55) {
          ai.state = 'walk';
          ai.target = randomPoint();
        } else {
          ai.state = 'play';
          ai.t = 2.5 + Math.random() * 2;
        }
      }
      break;

    case 'walk':
    case 'walkShelter': {
      const speed = upset ? 0.9 : (happy ? 2.6 : 1.7);
      playAnim(speed > 2.2 ? 'run' : 'walk', upset ? 0.6 : 1);
      walkToward(pet, ai, speed, dt, () => {
        if (ai.state === 'walkShelter') {
          ai.state = 'shelter';
          ai.t = 9999;
        } else {
          ai.state = 'idle';
          ai.t = 3 + Math.random() * 3;
        }
      });
      break;
    }

    case 'shelter':
      pet.position.y = 0;
      playAnim('idle');
      if (s.weather !== 'rain') {
        ai.state = 'idle';
        ai.t = 1.2;
      }
      break;

    case 'play':
    case 'jump': {
      playAnim('idle');
      const bounceRate = ai.state === 'jump' ? 7 : (happy ? 6 : 4);
      const bounceHeight = (happy || ai.state === 'jump') ? 0.34 : 0.18;
      pet.position.y = Math.abs(Math.sin(s.clock.elapsedTime * bounceRate)) * bounceHeight;
      pet.rotation.y += dt * (happy ? 2.2 : 1.1);
      if (ai.t <= 0) {
        pet.position.y = 0;
        ai.state = 'idle';
        ai.t = 3 + Math.random() * 3;
      }
      break;
    }

    case 'sleep':
      pet.position.y = 0;
      playAnim('idle', 0.35);
      if (attr.stamina < 100) {
        attr.stamina = Math.min(100, attr.stamina + 3 * dt);
        s.hudDirty = true;
      }
      if (attr.stamina > 55 && ai.t <= 0) {
        ai.state = 'idle';
        ai.t = 2;
      }
      break;

    default:
      break;
  }

  animateFallback(s, ai, happy);
}

/** 朝目标走一步，到了就回调（把"到点后做什么"交给调用方，状态机保持扁平） */
function walkToward(pet, ai, speed, dt, onArrive) {
  const direction = ai.target.clone().sub(pet.position);
  direction.y = 0;
  if (direction.length() < 0.3) {
    onArrive();
    return;
  }
  direction.normalize();
  pet.position.addScaledVector(direction, speed * dt);
  pet.rotation.y = Math.atan2(direction.x, direction.z);

  // 别走出院子
  const radius = Math.hypot(pet.position.x, pet.position.z);
  if (radius > 11.5) {
    pet.position.x *= 11.5 / radius;
    pet.position.z *= 11.5 / radius;
  }
}

/** 兜底模型的手写动画（球体拼的猫没有骨骼） */
function animateFallback(s, ai, happy) {
  if (!s.fallbackParts) return;
  const t = s.clock.elapsedTime;
  const parts = s.fallbackParts;
  const walking = ai.state === 'walk' || ai.state === 'walkShelter';
  parts.body.position.y = 0.6 + Math.sin(t * 3) * 0.03;
  parts.head.position.y = 1.18 + (ai.state === 'sleep' ? -0.22 : Math.sin(t * 3) * 0.04);
  parts.tail.rotation.z = Math.sin(t * (happy ? 8 : 3)) * 0.4;
  parts.legs.forEach((leg, i) => {
    leg.rotation.x = walking ? Math.sin(t * 10 + (i % 2 ? Math.PI : 0)) * 0.5 : 0;
  });
}

/** 随机一个不撞建筑的落点 */
export function randomPoint() {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 2 + Math.random() * 7.5;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const hitsBuilding = BUILDING_SPOTS.some((spot) => Math.hypot(x - spot.x, z - spot.z) < 2.8);
    if (!hitsBuilding) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(0, 0, 4);
}

/** 气泡文案：睡觉/躲雨/饿了/脏了 各有台词，其余交给 sayInStage */
export function autoBubble() {
  const s = getStage();
  if (!s || !s.ai) return '';
  const state = s.ai.state;
  const attr = worldPet().attr;
  if (state === 'sleep') return '💤 Zzz…';
  if (state === 'shelter' || state === 'walkShelter') return '🌧 躲雨中…';

  const slot = Math.floor(s.clock.elapsedTime / 2.4);
  if (attr.hunger < 30) return ['肚子咕咕叫了…', '想吃饭饭', '饿了，没力气跑'][slot % 3];
  if (attr.clean < 30) return ['身上痒痒的…', '想洗个泡泡浴'][slot % 2];
  return '';
}
