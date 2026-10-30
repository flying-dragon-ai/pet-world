import test from 'node:test';
import assert from 'node:assert/strict';

import { registerActions, hasAction, actionNames, actionOwner, invoke, installActionBridge } from '../../src/app/actions.js';

test('注册后可按名字找到，并记住归属模块', () => {
  const fn = () => 42;
  registerActions('测试模块', { demoA: fn, demoB: () => 'b' });
  assert.equal(hasAction('demoA'), true);
  assert.equal(actionOwner('demoA'), '测试模块');
  assert.ok(actionNames().includes('demoB'));
});

test('重复注册视为缺陷，直接抛错并指出归属', () => {
  registerActions('模块甲', { dupName: () => {} });
  assert.throws(
    () => registerActions('模块乙', { dupName: () => {} }),
    /重复注册.*模块甲/s,
  );
});

test('注册非函数也抛错', () => {
  assert.throws(() => registerActions('模块丙', { notFn: 1 }), /不是函数/);
});

test('invoke 未知动作只打日志、不抛错', () => {
  const originalError = console.error;
  const logged = [];
  console.error = (msg) => logged.push(msg);
  try {
    assert.equal(invoke('nopeNope'), undefined);
  } finally {
    console.error = originalError;
  }
  assert.match(logged.join(), /未注册的动作/);
});

test('window.app 桥：已知动作直取，未知动作走守卫函数', () => {
  const target = {};
  const bridge = installActionBridge(target);
  registerActions('模块丁', { bridgeFn: (x) => x * 2 });

  assert.equal(target.app, bridge);
  assert.equal(bridge.bridgeFn(21), 42);
  assert.equal('bridgeFn' in bridge, true);
  assert.equal('missingFn' in bridge, false);
  assert.ok(Array.isArray(bridge.__names));
});
