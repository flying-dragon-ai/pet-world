import test from 'node:test';
import assert from 'node:assert/strict';

import { needRotate, MANUAL_ACTIONS, onCooldown, lacksStamina } from '../../src/domain/w3d.js';

test('竖屏视口 → 舞台内容旋转 90°；横屏/方形不转', () => {
  assert.equal(needRotate(390, 844), true, '手机竖屏');
  assert.equal(needRotate(844, 390), false, '手机横屏');
  assert.equal(needRotate(1280, 720), false, '桌面横屏');
  assert.equal(needRotate(500, 500), false, '方形视口');
});

test('四个手动互动的数值与旧版一致', () => {
  assert.deepEqual(MANUAL_ACTIONS.feed.gain, { hunger: 18 });
  assert.equal(MANUAL_ACTIONS.feed.growth, 3, '喂食额外 +3 世界成长值');
  assert.equal(MANUAL_ACTIONS.feed.task, 'feed');

  assert.deepEqual(MANUAL_ACTIONS.touch.gain, { mood: 9 });
  assert.equal(MANUAL_ACTIONS.touch.countsTouch, true);

  assert.deepEqual(MANUAL_ACTIONS.play.gain, { mood: 7, stamina: -10, hunger: -6 });
  assert.equal(MANUAL_ACTIONS.play.minStamina, 12);

  assert.deepEqual(MANUAL_ACTIONS.bath.gain, { clean: 20 });
});

test('冷却：同一动作 3 秒内只生效一次', () => {
  const cooldowns = {};
  assert.equal(onCooldown(cooldowns, 'feed', 1000), false, '首次可用');
  cooldowns.feed = 1000;
  assert.equal(onCooldown(cooldowns, 'feed', 1000 + 2999), true, '2999ms 仍在冷却');
  assert.equal(onCooldown(cooldowns, 'feed', 1000 + 3000), false, '满 3s 解除');
  assert.equal(onCooldown(cooldowns, 'bath', 1000), false, '冷却按按钮独立计算');
});

test('体力门槛只作用于玩耍', () => {
  assert.equal(lacksStamina(MANUAL_ACTIONS.play, 5), true);
  assert.equal(lacksStamina(MANUAL_ACTIONS.play, 12), false);
  assert.equal(lacksStamina(MANUAL_ACTIONS.feed, 0), false, '喂食没有体力门槛');
});
