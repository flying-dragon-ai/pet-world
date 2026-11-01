import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePost, createPost, excerptOf, pageSlice, POST_LIMITS, POST_ZONES } from '../../src/domain/post.js';

const ME = { nick: '铲屎官Leo', avatar: 'https://example.com/a.png', ip: '上海' };
const META = { id: 'po-new', time: 1700000000000 };

test('发帖校验：标题正文必填', () => {
  const r = validatePost({ title: '', txt: '' });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 2);
  assert.ok(r.errors.some((e) => e.includes('标题')));
  assert.ok(r.errors.some((e) => e.includes('正文')));
});

test('发帖校验：超长拦截', () => {
  const long = validatePost({ title: 'a'.repeat(POST_LIMITS.title + 1), txt: 'x' });
  assert.equal(long.ok, false);
  assert.ok(long.errors[0].includes('标题'));
  const longTxt = validatePost({ title: 'ok', txt: 'x'.repeat(POST_LIMITS.text + 1) });
  assert.equal(longTxt.ok, false);
});

test('发帖校验：图文/视频必须有图', () => {
  assert.equal(validatePost({ title: 't', txt: 'x', media: '文字' }).ok, true);
  assert.equal(validatePost({ title: 't', txt: 'x', media: '图文' }).ok, false);
  assert.equal(validatePost({ title: 't', txt: 'x', media: '图文', img: 'data:,' }).ok, true);
  assert.equal(validatePost({ title: 't', txt: 'x', media: '视频' }).ok, false);
  assert.ok(validatePost({ title: 't', txt: 'x', media: '视频' }).errors[0].includes('视频'));
});

test('发帖校验：未知类型回落到文字', () => {
  const v = validatePost({ title: 't', txt: 'x', media: '乱写' });
  assert.equal(v.media, '文字');
  assert.equal(v.ok, true);
});

test('createPost：生成规范化的帖子对象', () => {
  const post = createPost(
    { title: '  今天带狗去公园  ', txt: '  晒太阳超舒服  ', media: '图文', img: 'data:image/jpeg;base64,AA', zone: '狗区' },
    ME,
    META,
  );
  assert.equal(post.id, 'po-new');
  assert.equal(post.title, '今天带狗去公园', '首尾空白被裁掉');
  assert.equal(post.txt, '晒太阳超舒服');
  assert.equal(post.zone, '狗区');
  assert.equal(post.auth, '铲屎官Leo');
  assert.equal(post.ip, '上海');
  assert.equal(post.likes, 0);
  assert.deepEqual(post.cmts, []);
  assert.equal(post.favs, 0);
});

test('createPost：分区非法回落到推荐', () => {
  const post = createPost({ title: 't', txt: 'x', media: '文字', zone: '火星区' }, ME, META);
  assert.equal(post.zone, '推荐');
  assert.ok(POST_ZONES.indexOf('推荐') >= 0);
});

test('createPost：校验不通过返回 null', () => {
  assert.equal(createPost({ title: '', txt: '' }, ME, META), null);
});

test('摘要：超长截断并加省略号', () => {
  assert.equal(excerptOf('短文本', 10), '短文本');
  const long = excerptOf('一'.repeat(50), 10);
  assert.equal(long.length, 11);
  assert.ok(long.endsWith('…'));
  assert.equal(excerptOf('a\n\nb   c'), 'a b c', '空白被压成单空格');
});

test('分页：切片正确并给出是否还有更多', () => {
  const list = Array.from({ length: 12 }, (_, i) => ({ id: i }));
  const p1 = pageSlice(list, 1, 5);
  assert.equal(p1.items.length, 5);
  assert.equal(p1.hasMore, true);
  assert.equal(p1.total, 12);

  const p3 = pageSlice(list, 3, 5);
  assert.equal(p3.items.length, 2);
  assert.equal(p3.hasMore, false);

  const p4 = pageSlice(list, 4, 5);
  assert.equal(p4.items.length, 0);
  assert.equal(p4.hasMore, false);

  const p0 = pageSlice(list, 0, 5);
  assert.equal(p0.page, 1, '页码小于 1 时回到第一页');
  assert.equal(pageSlice(null, 1, 5).items.length, 0);
});
