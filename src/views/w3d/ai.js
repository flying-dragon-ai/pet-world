/**
 * 自主 AI：待机 → 随机游走 → 摇尾巴 → 嗅闻 → 躺垫躺平 → 拆家 → 求抚摸 → 讨食
 *          → 低体力趴睡 → 下雨躲檐 → 进屋/出屋。
 *
 * 情绪映射：开心（心情≥70）蹦跳跑得快，委屈（饥饿/清洁<30）慢走，
 * 困倦（体力<25）进 idle 就趴下睡。全部是"每帧根据属性做决策"。
 *
 * V1.10：行为决策与台词对齐《虚拟宠物家园》2D 小游戏的 idleBehavior()，
 * 规则（阈值、性格判定）在 domain/w3d.js，这里只负责把决策翻译成舞台动作。
 */
import { worldPet } from '../world-state.js';
import { now } from '../../app/clock.js';
import { getStage } from './ctx.js';
import { playAnim } from './pet.js';
import { BUILDING_SPOTS, IDLE_LINES } from '../../data/w3d-assets.js';
import { pickIdle, derivedTraits } from '../../domain/w3d.js';
import { curPet } from '../pets.js';
import { CUSHION_POS, DOOR_POS } from './scene.js';

/** 打完架之后，在 3D 里摆出对应姿态的持续时间（毫秒） */
const BATTLE_POSE_MS = 15000;

export const AI = {
  idle: 'idle',
  walk: 'walk',
  walkShelter: 'walkShelter',
  shelter: 'shelter',
  play: 'play',
  jump: 'jump',
  sleep: 'sleep',
  fight: 'fight',
  hurt: 'hurt',
  wag: 'wag',
  nod: 'nod',
  lie: 'lie',
  sit: 'sit',
  eat: 'eat',
  shake: 'shake',
  happy: 'happy',
  goCushion: 'goCushion',
  goHouse: 'goHouse',
  house: 'house',
  out: 'out',
  beg: 'beg',
  clingy: 'clingy',
  demolish: 'demolish',
  explore: 'explore',
};

/** 每帧推进 AI（dt 秒） */
export function tickAi(dt) {
  const s = getStage();
  if (!s || !s.pet) return;

  const ai = s.ai;
  const pet = s.pet;
  ai.t -= dt;

  const w = worldPet();
  const attr = w.attr;
  const traits = derivedTraits(w, curPet());
  const upset = attr.hunger < 30 || attr.clean < 30;
  const sleepy = attr.stamina < 25;
  const happy = attr.mood >= 70;
  const raining = s.weather === 'rain' || s.weather === 'snow';

  // 下雨/下雪：先去屋檐（进屋状态除外）
  if (raining && ai.state !== 'shelter' && ai.state !== 'walkShelter' && ai.state !== 'house') {
    ai.state = 'walkShelter';
    ai.target = s.shelter.clone();
  }

  switch (ai.state) {
    case 'idle': {
      resetPose(pet);
      pet.position.y = 0;
      playAnim('idle');
      if (ai.t <= 0) {
        // 刚打完架：赢 → 昂首对峙；输 → 带伤趴着
        const pose = battlePose();
        if (pose) {
          ai.state = pose;
          ai.t = 5 + Math.random() * 3;
        } else if (sleepy) {
          ai.state = 'sleep';
          ai.t = 8 + Math.random() * 4;
        } else {
          startBehavior(s, pickIdle({ attr, traits, roll: Math.random(), rain: raining }), traits);
        }
      }
      break;
    }

    case 'fight': {
      // 对峙姿态：拱背、前倾、低吼
      playAnim('idle');
      const t = s.clock.elapsedTime;
      pet.position.y = Math.abs(Math.sin(t * 5)) * 0.1;
      pet.rotation.y += dt * 0.7;
      if (ai.t <= 0) {
        pet.position.y = 0;
        ai.state = 'idle';
        ai.t = 3 + Math.random() * 3;
      }
      break;
    }

    case 'hurt': {
      // 带伤：低头、动作变慢
      playAnim('idle', 0.45);
      pet.position.y = 0;
      if (ai.t <= 0) {
        ai.state = 'idle';
        ai.t = 3;
      }
      break;
    }

    case 'walk':
    case 'walkShelter':
    case 'goCushion':
    case 'goHouse':
    case 'out':
    case 'explore': {
      resetPose(pet);
      const speed = upset ? 0.9 : (happy ? 2.6 : 1.7);
      playAnim(speed > 2.2 ? 'run' : 'walk', upset ? 0.6 : 1);
      walkToward(pet, ai, speed, dt, () => {
        if (ai.state === 'walkShelter') {
          ai.state = 'shelter';
          ai.t = 9999;
        } else if (ai.state === 'goCushion') {
          ai.state = 'lie';
          ai.t = 6 + Math.random() * 4;
          speak('lie');
        } else if (ai.state === 'goHouse') {
          ai.state = 'house';
          ai.t = 9999;
          pet.visible = false;
          speak('house');
        } else if (ai.state === 'out') {
          ai.state = 'idle';
          ai.t = 3;
        } else if (ai.state === 'explore') {
          ai.state = 'idle';
          ai.t = 2.5 + Math.random() * 2;
        } else {
          ai.state = 'idle';
          ai.t = 3 + Math.random() * 3;
        }
      });
      break;
    }

    case 'shelter':
      resetPose(pet);
      pet.position.y = 0;
      playAnim('idle');
      if (!raining) {
        ai.state = 'idle';
        ai.t = 1.2;
      }
      break;

    case 'house':
      // 在屋里：宠物不可见，等主人叫它出来
      pet.visible = false;
      playAnim('idle');
      break;

    case 'play':
    case 'jump':
    case 'happy': {
      resetPose(pet);
      playAnim('idle');
      const bounceRate = ai.state === 'jump' ? 7 : (happy ? 6 : 4);
      const bounceHeight = (happy || ai.state === 'jump' || ai.state === 'happy') ? 0.34 : 0.18;
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
      resetPose(pet);
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

    case 'wag':
    case 'nod':
    case 'sit':
    case 'eat':
    case 'shake':
    case 'beg':
    case 'clingy':
    case 'demolish':
    case 'lie': {
      resetPose(pet, ai.state === 'lie');
      pet.position.y = 0;
      playAnim('idle', ai.state === 'eat' || ai.state === 'nod' ? 0.7 : 1);
      if (ai.t <= 0) {
        ai.state = 'idle';
        ai.t = 2.5 + Math.random() * 2.5;
      }
      break;
    }

    default:
      break;
  }

  animateFallback(s, ai, happy);
}

/**
 * 开始一次自主行为（对齐 HTML 小游戏 idleBehavior 的行为集）。
 * @param {object} s 舞台句柄
 * @param {string} kind 行为 key
 * @param {object} traits 派生性格
 */
export function startBehavior(s, kind, traits) {
  const ai = s.ai;
  const t = traits || {};
  switch (kind) {
    case 'walk':
      ai.state = 'walk';
      ai.target = randomPoint();
      ai.t = 6;
      break;
    case 'wag':
      ai.state = 'wag';
      ai.t = 2.6;
      speak('wag');
      break;
    case 'nod':
      ai.state = 'nod';
      ai.t = 2.6;
      speak('nod');
      break;
    case 'lie':
      ai.state = 'goCushion';
      ai.target = new THREE.Vector3(CUSHION_POS.x, 0, CUSHION_POS.z);
      ai.t = 8;
      break;
    case 'demolish':
      ai.state = 'demolish';
      ai.t = 3;
      speak('demolish');
      break;
    case 'clingy':
      ai.state = 'clingy';
      ai.t = 3;
      speak('clingy');
      break;
    case 'sit':
      ai.state = 'sit';
      ai.t = 4;
      break;
    case 'beg':
      ai.state = 'beg';
      ai.t = 3.2;
      speak('beg');
      break;
    case 'sleep':
      ai.state = 'sleep';
      ai.t = 8 + Math.random() * 4;
      break;
    case 'explore':
      ai.state = 'explore';
      ai.target = randomPoint();
      ai.t = 6;
      speak('explore');
      break;
    default:
      ai.state = 'idle';
      ai.t = 2 + Math.random() * 2;
  }
}

/** 行为台词（IDLE_LINES 在 data/w3d-assets.js） */
export function speak(kind) {
  const lines = IDLE_LINES[kind];
  if (!lines || !lines.length) return;
  const s = getStage();
  if (!s) return;
  s.say = lines[Math.floor(Math.random() * lines.length)];
  s.sayUntil = s.clock.elapsedTime + 3;
}

/** 恢复默认姿态（离开躺/坐状态时用） */
function resetPose(pet, keepLie) {
  if (!keepLie && pet.scale.y !== 1) pet.scale.set(1, 1, 1);
  if (pet.rotation.x !== 0 && !keepLie) pet.rotation.x = 0;
}

/** 朝目标走一步，到了就回调（把"到点后做什么"交给调用方，状态机保持扁平） */
function walkToward(pet, ai, speed, dt, onArrive) {
  if (!ai.target) {
    onArrive();
    return;
  }
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
  const walking = ai.state === 'walk' || ai.state === 'walkShelter' || ai.state === 'out'
    || ai.state === 'goCushion' || ai.state === 'goHouse' || ai.state === 'explore';

  const lying = ai.state === 'lie';
  parts.body.position.y = (lying ? 0.26 : 0.6) + (walking ? Math.abs(Math.sin(t * 3)) * 0.03 : 0);
  parts.body.scale.set(1, lying ? 0.55 : 0.85, lying ? 1.25 : 1);

  // 头部：睡觉/嗅闻/进食时低头
  let headY = 1.18 + (ai.state === 'sleep' ? -0.22 : Math.sin(t * 3) * 0.04);
  let headZ = 0.45;
  if (ai.state === 'nod') headZ = 0.45 - Math.abs(Math.sin(t * 4)) * 0.12;
  if (ai.state === 'eat') headZ = 0.45 - Math.abs(Math.sin(t * 6)) * 0.16;
  if (ai.state === 'lie') headY = 0.86;
  parts.head.position.y = headY;
  parts.head.position.z = headZ;

  // 尾巴：摇尾巴时大幅摆动
  const wagRate = ai.state === 'wag' || ai.state === 'happy' ? 12 : (happy ? 8 : 3);
  parts.tail.rotation.z = Math.sin(t * wagRate) * (ai.state === 'wag' ? 0.9 : 0.4);
  parts.tail.rotation.y = Math.sin(t * wagRate * 0.6) * 0.3;

  // 坐下：抬前身
  if (ai.state === 'sit') {
    parts.body.position.y = 0.78;
    parts.body.rotation.x = -0.35;
  } else {
    parts.body.rotation.x = 0;
  }

  // 甩水：整体左右摇
  if (ai.state === 'shake') {
    parts.body.rotation.z = Math.sin(t * 14) * 0.28;
    parts.head.rotation.z = Math.sin(t * 14) * 0.2;
  } else {
    parts.body.rotation.z = 0;
    parts.head.rotation.z = 0;
  }

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

/**
 * 刚打完架的姿态：赢了昂首对峙，输了带伤休息。
 * 只有 15 分钟内的战斗才算「刚打完」，否则回到日常行为。
 * @returns {'fight'|'hurt'|null}
 */
function battlePose() {
  const w = worldPet();
  const last = w.battle && w.battle.last;
  if (!last || !last.at) return null;
  if (now() - last.at > BATTLE_POSE_MS) return null;
  if (last.outcome === 'lose') return 'hurt';
  if (last.outcome === 'win') return 'fight';
  return null;
}

/** 气泡文案：睡觉/躲雨/饿了/脏了 各有台词，其余交给 sayInStage */
export function autoBubble() {
  const s = getStage();
  if (!s || !s.ai) return '';
  const state = s.ai.state;
  const attr = worldPet().attr;
  if (state === 'house') return '';
  if (state === 'sleep') return '💤 Zzz…';
  if (state === 'shelter' || state === 'walkShelter') return '🌧 躲雨中…';
  if (state === 'fight') return '汪！来啊！';
  if (state === 'hurt') return '呜…还疼…';

  const slot = Math.floor(s.clock.elapsedTime / 2.4);
  if (attr.hunger < 30) return ['肚子咕咕叫了…', '想吃饭饭', '饿了，没力气跑'][slot % 3];
  if (attr.clean < 30) return ['身上痒痒的…', '想洗个泡泡浴'][slot % 2];
  return '';
}

/** 小屋门口坐标（进屋/出屋用） */
export { DOOR_POS };
