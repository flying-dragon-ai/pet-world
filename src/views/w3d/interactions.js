/**
 * 舞台交互（应用层）：手动互动（抚摸 / 喂食 / 陪玩 / 洗澡 / 躺躺）+ 进屋出屋 + 睡觉 + 聊天
 *                    + 点建筑进面板。
 *
 * 数值表与冷却判定在 domain/w3d.js，这里负责：查表 → 改状态 → 落盘 → 给反馈。
 */
import { now, today } from '../../app/clock.js';
import { S, save } from '../../app/store.js';
import { go } from '../../app/router.js';
import { ui } from '../../app/ui-state.js';
import { registerActions } from '../../app/actions.js';
import { W3D_ACTION_COOLDOWN_MS, VENUE_UNLOCK_LEVEL } from '../../app/config.js';
import { MANUAL_ACTIONS, onCooldown, lacksStamina, derivedTraits } from '../../domain/w3d.js';
import { attrDeltaText, applyGain } from '../../domain/world.js';
import { curPet, petGarden } from '../pets.js';
import { worldPet, worldLevel, addWorldGrowth, homeState } from '../world-state.js';
import { getStage } from './ctx.js';
import { spawnFx, sayInStage, emote, sendStageToast } from './fx.js';
import { speak, randomPoint } from './ai.js';
import { CUSHION_POS, DOOR_POS } from './scene.js';
import { openChat } from './chat.js';

/** 由 3D 模块之外注册的回调（面板 tab 切换），避免 w3d ⇄ world-panel 互相 import */
const hooks = {
  openPanelTab: () => {},
  suspendStage: () => {},
};

export function registerStageHooks(next) {
  Object.assign(hooks, next);
}

const MESSAGE_BUILDERS = {
  touch: (pet, action) => `抚摸：${pet.name}很开心，${attrDeltaText(action.gain)}`,
  feed: (pet, action) => `喂食成功：${attrDeltaText(action.gain)}，成长值+${action.growth}`,
  play: (pet, action) => `陪玩：${attrDeltaText(action.gain)}`,
  bath: (pet, action) => `洗澡：${attrDeltaText(action.gain)}`,
  lie: (pet, action) => `躺垫上打了个滚：${attrDeltaText(action.gain)}`,
};

/**
 * 执行一次手动互动（抚摸/喂食/陪玩/洗澡/躺躺）。
 * @param {'touch'|'feed'|'play'|'bath'|'lie'} act
 * @returns {boolean} 是否真的生效
 */
export function applyManualAction(act) {
  const action = MANUAL_ACTIONS[act];
  if (!action) return false;

  const at = now();
  if (onCooldown(ui.w3dCooldowns, act, at)) {
    sendStageToast('冷却中，稍等一下再试');
    return false;
  }

  const pet = curPet();
  const world = worldPet();
  if (lacksStamina(action, world.attr.stamina)) {
    sendStageToast(pet.name + '累了，趴下来休息一会儿吧');
    return false;
  }

  ui.w3dCooldowns[act] = at;
  flashButtonCooldown(act);

  applyGain(world, action.gain);
  if (action.growth) addWorldGrowth(action.growth);

  markTodayTasks(pet, action);
  if (action.fxIcon) spawnFx(action.fxIcon, action.fxColor);
  if (action.say) sayInStage(action.say);
  if (action.emote) emote(action.emote);

  // 躺躺：让它走到躺垫上躺下
  if (act === 'lie') {
    const s = getStage();
    if (s) {
      s.ai.state = 'goCushion';
      s.ai.target = new THREE.Vector3(CUSHION_POS.x, 0, CUSHION_POS.z);
      s.ai.t = 8;
    }
  }

  save();
  const stage = getStage();
  if (stage) stage.hudDirty = true;

  const message = (MESSAGE_BUILDERS[act] || (() => ''))(pet, action);
  if (message) sendStageToast(message);
  return true;
}

/** 抚摸 3 次 / 喂食一次 → 打今日任务卡 */
function markTodayTasks(pet, action) {
  const garden = petGarden(pet);
  if (!garden.tasks) garden.tasks = {};
  const day = today();

  if (action.countsTouch) {
    garden.touchCount = (garden.touchCount || 0) + 1;
    if (garden.touchCount >= 3 && garden.tasks.touch !== day) garden.tasks.touch = day;
  }
  if (action.task && garden.tasks[action.task] !== day) garden.tasks[action.task] = day;
}

/** 按钮按下时压暗 3 秒，给用户一个"已生效"的暗示 */
function flashButtonCooldown(act) {
  document.querySelectorAll('.w3d-act').forEach((button) => {
    if (!button.dataset || button.dataset.act !== act) return;
    button.classList.add('cd');
    setTimeout(() => button.classList.remove('cd'), W3D_ACTION_COOLDOWN_MS);
  });
}

/** 点宠物 = 抚摸 */
export function touchPet() {
  return applyManualAction('touch');
}

/** 进屋 / 出屋（对齐 HTML 小游戏的「进屋」按钮） */
export function toggleHouse() {
  const s = getStage();
  if (!s || !s.pet) return false;
  const ai = s.ai;
  const pet = curPet();
  if (ai.state === 'house' || ai.state === 'goHouse') {
    ai.state = 'out';
    ai.target = randomPoint();
    ai.t = 6;
    s.pet.visible = true;
    s.pet.position.set(DOOR_POS.x, 0, DOOR_POS.z);
    sayInStage('我回来啦～');
    sendStageToast('「' + pet.name + '」从屋里出来了');
    return false;
  }
  ai.state = 'goHouse';
  ai.target = new THREE.Vector3(DOOR_POS.x, 0, DOOR_POS.z);
  ai.t = 8;
  sendStageToast('「' + pet.name + '」进屋了，点「出屋」叫它回来');
  return true;
}

/** 睡觉 / 起床（对齐 HTML 小游戏的「躺躺 / 睡觉」） */
export function toggleSleep() {
  const s = getStage();
  if (!s) return false;
  const ai = s.ai;
  const pet = curPet();
  if (ai.state === 'sleep') {
    ai.state = 'idle';
    ai.t = 2;
    applyGain(worldPet(), { stamina: 15, mood: 3 });
    sayInStage('睡饱啦！精神满满！');
    sendStageToast('睡醒：体力+15 · 心情+3');
    save();
    s.hudDirty = true;
    return false;
  }
  ai.state = 'sleep';
  ai.t = 9999;
  speak('sleepy');
  sendStageToast('「' + pet.name + '」睡着了，体力会慢慢恢复');
  return true;
}

/** 和宠物聊天（对齐 HTML 小游戏的「聊天」按钮） */
export function chatWithPet() {
  const pet = curPet();
  const w = worldPet();
  openChat({
    name: pet.name,
    attr: w.attr,
    traits: derivedTraits(w, pet),
    memorial: homeState().memorial,
  });
}

/** 点建筑 → 挂起舞台 → 打开对应面板 tab */
export function openSpotTab(tab) {
  const locked = (tab === 'sport' || tab === 'fun') && worldLevel() < VENUE_UNLOCK_LEVEL;
  if (locked) {
    sendStageToast('成长等级 Lv.' + VENUE_UNLOCK_LEVEL + ' 解锁（当前 Lv.' + worldLevel() + '）');
    return;
  }
  hooks.suspendStage();
  go('world');
  hooks.openPanelTab(tab);
}

/** 顶部 HUD 的金币与等级在结算后要刷新 */
export function currentCoins() {
  return S.world.coinA;
}

registerActions('w3d-interactions', {
  w3dAct: applyManualAction,
  touchPet,
  toggleHouse,
  toggleSleep,
  chatWithPet,
  w3dHouse: toggleHouse,
  w3dSleep: toggleSleep,
  w3dChat: chatWithPet,
});
