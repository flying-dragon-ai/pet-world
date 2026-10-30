/**
 * 3D 世界的对外接口（门面）。
 *
 * 其它模块只 import 这里，不直接碰内部文件：
 *   - 舞台生命周期：enterStage / suspendStage / resumeStage / exitStage
 *   - 互动与拾取：w3dAct / openSpotTab
 *   - 反馈：sendStageToast
 *   - 数值：w3dGain（首页快捷打卡也会用）
 *
 * 内部分层：ctx（句柄）→ scene / pet / weather / ai / input / hud / tick（各自的单一职责）
 *           → interactions（应用层：改状态、落盘）→ 本文件（门面）。
 */
import { save } from '../../app/store.js';
import { registerActions } from '../../app/actions.js';
import { applyGain } from '../../domain/world.js';
import { worldPet } from '../world-state.js';
import { getStage } from './ctx.js';
import { suspendStage } from './stage.js';
import { registerStageHooks } from './interactions.js';

export {
  enterStage, exitStage, suspendStage, resumeStage, layoutStage, fallbackStage,
  isStageActive, isStageSuspended, stageWeather, suspendStage,
} from './stage.js';
export { sendStageToast, sayInStage, spawnFx, emote } from './fx.js';
export { applyManualAction as w3dAct, openSpotTab, registerStageHooks } from './interactions.js';

/**
 * 直接增减六维（首页快捷打卡用）。
 * 上限规则与 3D 互动一致：普通属性 100，成长/智慧 9999。
 */
export function w3dGain(delta) {
  applyGain(worldPet(), delta);
  save();
  const stage = getStage();
  if (stage) stage.hudDirty = true;
}

registerStageHooks({ suspendStage });

registerActions('w3d', { w3dGain });
