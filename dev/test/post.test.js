import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePost, createPost, excerptOf, pageSlice, countWithMine, setLike, toggleLike,
  hitSensitive, SENSITIVE_WORDS, POST_LIMITS, POST_MEDIA, POST_ZONES } from '../../src/domain/post.js';

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

/* ---------------- V1.10 审计后补的用例 ---------------- */

test('限制常量就是契约：40 / 2000 / 9，类型与分区枚举固定', () => {
  assert.deepEqual(POST_LIMITS, { title: 40, text: 2000, images: 9 });
  assert.deepEqual(POST_MEDIA, ['文字', '图文', '视频']);
  assert.deepEqual(POST_ZONES, ['推荐', '狗区', '猫区', '鸟区', '异宠区']);
  assert.ok(SENSITIVE_WORDS.length > 0);
});

test('字数刚踩线可以通过，超一个字就被拦', () => {
  assert.equal(validatePost({ title: 'a'.repeat(40), txt: 'x' }).ok, true);
  assert.equal(validatePost({ title: 'a'.repeat(41), txt: 'x' }).ok, false);
  assert.equal(validatePost({ title: 't', txt: 'x'.repeat(2000) }).ok, true);
  assert.equal(validatePost({ title: 't', txt: 'x'.repeat(2001) }).ok, false);
});

test('图片超过 9 张被拦，正好 9 张放行', () => {
  const imgs = (n) => Array.from({ length: n }, (_, i) => 'data:image/jpeg;base64,' + i);
  const over = validatePost({ title: 't', txt: 'x', media: '图文', imgs: imgs(10) });
  assert.equal(over.ok, false);
  assert.ok(over.errors.some((e) => e.includes('9')), '错误文案要说明上限');
  assert.equal(validatePost({ title: 't', txt: 'x', media: '图文', imgs: imgs(9) }).ok, true);
  // imgs 里的空串要当没传
  assert.equal(validatePost({ title: 't', txt: 'x', media: '文字', imgs: ['', null, ''] }).ok, true);
});

test('敏感词：命中就拦，并报出命中词', () => {
  const r = validatePost({ title: '出一个账号', txt: '这里可以赌博，日入过万' });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('敏感词')));
  assert.ok(r.errors.some((e) => e.includes('赌博')));
  assert.deepEqual(hitSensitive('今天天气不错'), []);
  assert.equal(hitSensitive('代开发票找我').length, 1);
  assert.equal(validatePost({ title: '今天带狗去公园', txt: '晒太阳超舒服' }).ok, true, '正常内容不能误伤');
});

test('createPost：字段完整，一个不漏', () => {
  const post = createPost(
    { title: 't', txt: 'x', media: '图文', imgs: ['data:a', 'data:b'], zone: '猫区', dur: '01:10' },
    ME,
    META,
  );
  assert.deepEqual(Object.keys(post).sort(), [
    'auth', 'authImg', 'cmts', 'dur', 'favs', 'id', 'img', 'imgs', 'ip', 'likes', 'media', 'time', 'title', 'txt', 'zone',
  ]);
  assert.equal(post.img, 'data:a', 'img 是首图，兼容只读 img 的老模板');
  assert.deepEqual(post.imgs, ['data:a', 'data:b']);
  assert.equal(post.dur, '01:10');
  assert.equal(post.media, '图文');
});

test('createPost：缺 me / meta 也不抛（不把视图传参当垃圾堆）', () => {
  const post = createPost({ title: 't', txt: 'x', media: '文字' }, null, null);
  assert.ok(post);
  assert.equal(post.auth, '匿名铲屎官');
  assert.equal(post.authImg, '');
  assert.equal(post.ip, '北京');
  assert.equal(post.likes, 0);
});

test('分页：越界页不抛且返回空，page 字段被规范化', () => {
  const list = Array.from({ length: 12 }, (_, i) => ({ id: i }));
  for (const p of [4, 5, 99, 0, -3, undefined, null, NaN]) {
    const r = pageSlice(list, p, 5);
    assert.equal(Array.isArray(r.items), true);
    assert.equal(r.total, 12);
    assert.ok(r.page >= 1, '页码一定要被规范化成正整数，不能把 0/NaN 传给 slice');
  }
  assert.equal(pageSlice(list, 99, 5).items.length, 0);
  assert.equal(pageSlice(list, 99, 5).hasMore, false);
  assert.equal(pageSlice([], 1, 5).items.length, 0);
  assert.equal(pageSlice(undefined, 1, 5).hasMore, false);
});

/* ---------------- 点赞幂等（ADAPTATION-PLAN 点名的用例） ---------------- */

test('点赞幂等：同一用户连点两次，计数只 +1（永远不会 +2）', () => {
  const base = 231; // 种子帖子 po1 的真实 like 数
  let liked = false;
  const seen = [countWithMine(base, liked)];

  // 第一次点赞
  liked = toggleLike(base, liked).liked;
  seen.push(countWithMine(base, liked));
  // 第二次点赞（双击 / 重复派发 click / 刷新后重放，都走这条路）
  liked = toggleLike(base, liked).liked;
  seen.push(countWithMine(base, liked));

  assert.deepEqual(seen, [231, 232, 231]);
  assert.ok(Math.max(...seen) - base === 1, '我这一票最多只能让计数 +1');
});

test('点赞幂等：重复设置「已赞」是幂等的，计数不会累加', () => {
  let liked = false;
  for (let i = 0; i < 5; i++) liked = setLike(0, liked, true).liked;
  assert.equal(liked, true);
  assert.equal(countWithMine(0, liked), 1);

  const again = setLike(0, true, true);
  assert.equal(again.changed, false, '已经是这个状态就不算一次变更');
  assert.equal(again.count, 1);
});

test('点赞幂等：非法基础数不会把计数弄成 NaN / 负数', () => {
  assert.equal(countWithMine(undefined, false), 0);
  assert.equal(countWithMine('abc', false), 0);
  assert.equal(countWithMine(-5, false), 0);
  assert.equal(countWithMine('12', true), 13);
  assert.equal(setLike(-5, false, true).base, 0);
});

test('收藏与点赞共用同一套计数语义（基础数只读）', () => {
  const post = { likes: 10, favs: 45 };
  const st = toggleLike(post.favs, false);
  assert.equal(st.count, 46);
  assert.equal(post.favs, 45, 'domain 不得就地改入参');
  assert.equal(post.likes, 10);
});
