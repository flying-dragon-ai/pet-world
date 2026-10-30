import test from 'node:test';
import assert from 'node:assert/strict';

import { HOME_CARE_ENTRIES } from '../../src/data/home-entries.js';

/* 这条测试锁住 V1.7.5 的命名口径：健康页叫「健康管理」，照片时间线叫「成长记录」。
 * 文案改动属产品口径变更，改这里之前先确认产品文档。 */
test('首页「日常护理」磁贴：名称与顺序（V1.7.5 口径）', () => {
  assert.deepEqual(
    HOME_CARE_ENTRIES.map((e) => e.label),
    ['健康管理', '成长记录'],
  );
  assert.deepEqual(
    HOME_CARE_ENTRIES.map((e) => e.desc),
    ['成长数据 · 健康周报', '时光记忆 · 宠物照片'],
  );
});

test('磁贴去向：健康管理 → health，成长记录 → profile 的 album tab', () => {
  const health = HOME_CARE_ENTRIES.find((e) => e.id === 'health');
  const album = HOME_CARE_ENTRIES.find((e) => e.id === 'album');

  assert.equal(health.page, 'health');
  assert.equal(health.tab, undefined, '健康页没有子 tab');

  assert.equal(album.page, 'profile');
  assert.equal(album.tab, 'album', '相册是档案页的一个 tab');
});

test('磁贴字段完整、id 唯一、图标与配色可用', () => {
  const ids = new Set();
  for (const entry of HOME_CARE_ENTRIES) {
    assert.match(entry.id, /^[a-z][a-z0-9-]*$/);
    assert.equal(ids.has(entry.id), false, 'id 重复：' + entry.id);
    ids.add(entry.id);

    assert.ok(entry.label && entry.desc, '文案不能为空');
    assert.match(entry.icon, /^i-[a-z]+$/, '图标必须是 #i-* symbol');
    assert.match(entry.color, /^#[0-9A-Fa-f]{6}$/, '配色必须是 #rrggbb');
    assert.match(entry.page, /^[a-z][a-z0-9]*$/, '目标页 id 小写');
  }
});
