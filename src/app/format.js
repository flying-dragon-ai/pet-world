/**
 * 文本格式化（纯函数，可单测）。
 */
import { fmtHourMinute } from './clock.js';

/**
 * 时间戳 → 人话：
 *   今天 → "09:41"
 *   昨天 → "昨天"
 *   更早 → "10月25日"
 * @param {number} ts 毫秒时间戳
 * @param {number} [reference] 参照时间（默认当前时刻，测试可注入）
 */
export function formatRelativeTime(ts, reference = Date.now()) {
  const date = new Date(ts);
  const now = new Date(reference);
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return fmtHourMinute(ts);
  const yesterday = new Date(reference - 86_400_000);
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  return (date.getMonth() + 1) + '月' + date.getDate() + '日';
}
