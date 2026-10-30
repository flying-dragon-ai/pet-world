/**
 * 积分账本（应用层）。
 *
 * 积分变动只走这里：加数、记账、落盘、刷新红点，一处收口，
 * 避免每个页面各写一遍 S.points += n。
 */
import { S, save } from '../app/store.js';
import { now } from '../app/clock.js';
import { renderTabBadges } from '../app/shell.js';
import { registerActions } from '../app/actions.js';

/**
 * @param {number} amount 正数加分、负数扣分
 * @param {string} source 来源说明（会显示在积分明细里）
 */
export function awardPoints(amount, source) {
  S.points = (S.points || 0) + amount;
  S.ptHist.unshift({ n: amount, src: source, ts: now() });
  save();
  renderTabBadges();
  return S.points;
}

/** 当前积分余额 */
export function pointsBalance() {
  return S.points || 0;
}

registerActions('points', { awardPoints, pointsBalance });
