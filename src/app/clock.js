/**
 * 时间端口（Port）。
 *
 * 领域层不直接调用 Date.now() / new Date()，一律经由这里，测试可以注入
 * 固定时钟得到确定性结果。默认实现即真实系统时钟。
 */

let nowFn = () => Date.now();

/** @param {() => number} fn 返回毫秒时间戳的函数 */
export function setClock(fn) {
  nowFn = fn;
}

/** 当前毫秒时间戳 */
export function now() {
  return nowFn();
}

/** YYYY-MM-DD（本地时区，游戏内"今天"的判定基准） */
export function today(ts = now()) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** HH:MM */
export function fmtHourMinute(ts = now()) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const MINUTE = 60_000;
export const HOUR = 3_600_000;
export const DAY = 86_400_000;
