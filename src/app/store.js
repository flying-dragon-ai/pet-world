/**
 * 全局状态仓库。
 *
 * 设计要点：
 * 1. `S` 的引用恒定不变 —— 载入 / 重置 / 迁移都是"原地替换字段"，
 *    所有 import 了 S 的模块永远看到最新内容，不需要重新绑定。
 * 2. 写入只通过 `save()` 落盘，调用点集中，避免各处零散 try/catch。
 * 3. 这里不放业务规则 —— 规则在 src/domain，读写在 src/views。
 */
import { STORAGE_KEY } from './config.js';
import { storage } from './persistence.js';
import { seed } from '../data/seed.js';
import { migrate } from '../data/migrations.js';

/** 稳定引用的状态对象（不要整体重新赋值） */
export const S = {};

let lastSaveError = null;

/** 把 next 的字段整体搬到 S 上，保持 S 的引用不变 */
function hydrate(next) {
  Object.keys(S).forEach((k) => { delete S[k]; });
  Object.assign(S, next);
}

/**
 * 落盘。失败（配额满 / 无权限）不抛错，但记下原因供设置页提示。
 * @returns {boolean} 是否成功
 */
export function save() {
  try {
    const ok = storage.write(STORAGE_KEY, JSON.stringify(S));
    lastSaveError = ok ? null : '本地存储写入失败（可能空间已满）';
    return ok;
  } catch (err) {
    lastSaveError = (err && err.message) || String(err);
    return false;
  }
}

export function lastSaveFailure() {
  return lastSaveError;
}

function loadFromDisk() {
  const raw = storage.read(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 启动时调用一次：读盘 → 迁移 → 补齐 → 回写。
 * @returns {{fresh: boolean}} fresh 表示本次是全新存档
 */
export function loadState() {
  const saved = loadFromDisk();
  const fresh = !saved;
  // 出厂存档也过一遍迁移：只有一条代码路径，结构一定齐全
  const next = migrate(fresh ? seed() : saved);
  hydrate(next);
  save();
  return { fresh };
}

/** 测试 / 退出登录用：整体重置为出厂存档 */
export function resetState() {
  hydrate(migrate(seed()));
  save();
}
