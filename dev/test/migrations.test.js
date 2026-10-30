import test from 'node:test';
import assert from 'node:assert/strict';

import { seed } from '../../src/data/seed.js';
import { migrate } from '../../src/data/migrations.js';

test('出厂存档结构：v3 / 三只宠物 / 默认尖尖 / 无旧家园字段', () => {
  const s = migrate(seed());
  assert.equal(s.v, 3);
  assert.equal(s.pets.length, 3);
  assert.equal(s.curPet, 'p3');
  assert.equal(s.pets.find((p) => p.id === 'p3').name, '尖尖');
  assert.equal('garden' in s, false, '旧家园字段已彻底移除');
  assert.equal(s.world.coinA, 30);
  assert.equal(s.world.loginDays, 0);
  assert.ok(Array.isArray(s.world.medals));
});

test('迁移：版本对不上就回到出厂存档', () => {
  const s = migrate({ v: 99, pets: [] });
  assert.equal(s.v, 3);
  assert.ok(s.pets.length >= 3);
});

test('迁移：缺 notifs / p3 / world 时逐个补齐，不动已有数据', () => {
  const base = seed();
  delete base.notifs;
  base.pets = base.pets.filter((p) => p.id !== 'p3');
  delete base.world;
  base.points = 1234;

  const s = migrate(base);
  assert.ok(Array.isArray(s.notifs) && s.notifs.length > 0);
  assert.ok(s.pets.some((p) => p.id === 'p3'));
  assert.equal(s.curPet, 'p3');
  assert.equal(s.world.coinA, 30);
  assert.equal(s.world.lastLeave > 0, true);
  assert.equal(s.points, 1234, '用户数据保持不变');
});

test('迁移：v2 存档的分区名与商品分类被对齐', () => {
  const base = seed();
  base.v = 2;
  base.posts = [{ id: 'x', zone: '猫猫', cmts: [] }];
  base.products = [{ id: 'g1', cat: '主粮' }];

  const s = migrate(base);
  assert.equal(s.v, 3);
  assert.equal(s.posts[0].zone, '猫区');
  assert.equal(s.posts[0].media, '图文');
  assert.equal(s.products.find((p) => p.id === 'g1').cat, '猫粮');
  assert.ok(s.products.some((p) => p.id === 'g7'), '新分类商品被补齐');
});

test('迁移：v1 存档补齐设备与宠物家园四维', () => {
  const base = seed();
  base.v = 1;
  delete base.devices;
  base.pets = [{ id: 'p1', name: '小可爱', cmts: [] }];
  base.posts = [{ id: 'x', zone: '猫区', cmts: [{ t: '老评论' }, { t2: '新评论', ts: 1 }] }];

  const s = migrate(base);
  assert.equal(s.v, 3);
  assert.ok(Array.isArray(s.devices) && s.devices.length === 2);
  const garden = s.pets[0].g;
  assert.equal(typeof garden.satiety, 'number');
  assert.deepEqual(s.pets[0].g.tasks, {});
  assert.equal(s.posts[0].cmts[0].t2, '老评论', '旧字段 t → t2');
  assert.equal(typeof s.posts[0].cmts[0].ts, 'number');
  assert.equal(s.posts[0].cmts[1].replies.length, 0);
});

test('迁移：宠物改名兜底与昵称迁移', () => {
  const base = seed();
  base.pets[0].name = 'wrong';
  base.user.nick = '铲屎官Leo';
  const s = migrate(base);
  assert.equal(s.pets[0].name, '小可爱');
  assert.equal(s.user.nick, '奎因');
});
