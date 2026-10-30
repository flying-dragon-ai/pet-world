/**
 * 舞台交互（应用层）：四个手动互动 + 点建筑进面板。
 *
 * 数值表与冷却判定在 domain/w3d.js，这里负责：查表 → 改状态 → 落盘 → 给反馈。
 */
import { now, today } from '../../app/clock.js';
import { S, save } from '../../app/store.js';
import { go } from '../../app/router.js';
import { ui } from '../../app/ui-state.js';
import { registerActions } from '../../app/actions.js';
import { W3D_ACTION_COOLDOWN_MS, VENUE_UNLOCK_LEVEL } from '../../app/config.js';
import { MANUAL_ACTIONS, onCooldown, lacksStamina } from '../../domain/w3d.js';
import { attrDeltaText, applyGain } from '../../domain/world.js';
import { curPet, petGarden } from '../pets.js';
import { worldPet, worldLevel, addWorldGrowth } from '../world-state.js';
import { getStage } from './ctx.js';
import { spawnFx, sayInStage, emote, sendStageToast } from './fx.js';

/** 由 3D 模块之外注册的回调（面板 tab 切换），避免 w3d ⇄ world-panel 互相 import */
const hooks = {
  openPanelTab: () => {},
  suspendStage: () => {},
};

export function registerStageHooks(next) {
  Object.assign(hooks, next);
}

const MESSAGE_BUILDERS = {
  touch: (pet, action) => `抚摸：${pet.name}很开心，${attrDeltaText({ mood: action.gain.mood })}`,
  feed: (pet, action) => `喂食成功：${attrDeltaText({ hunger: action.gain.hunger })}，成长值+${action.growth}`,
  play: (pet, action) => `玩耍：${attrDeltaText(action.gain)}`,
  bath: (pet, action) => `洗澡：${attrDeltaText({ clean: action.gain.clean })}`,
};

/**
 * 执行一次手动互动（抚摸/喂食/玩耍/洗澡）。
 * @param {'touch'|'feed'|'play'|'bath'} act
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
});
