/**
 * 3D 舞台的运行时上下文。
 *
 * 整棵 three.js 场景只创建一次，保存在这里的单例对象上；其余模块按需取用。
 * 单独一个模块的好处：scene / pet / ai / input / hud 之间不需要互相 import，
 * 只依赖这个"舞台句柄"，也就没有循环依赖。
 */

let stage = null;

/** 当前舞台句柄（未初始化时为 null） */
export function getStage() {
  return stage;
}

export function setStage(next) {
  stage = next;
}

/** 舞台是否已创建且处于前台 */
export function isStageActive() {
  return !!stage && !stage.suspended;
}

/** 舞台是否已创建但被挂起（进面板时不销毁场景） */
export function isStageSuspended() {
  return !!stage && !!stage.suspended;
}
