/**
 * 社区发帖规则（纯函数层）。
 *
 * 视图只负责「读输入 → 拼模板 → 调一次动作」，
 * 校验与「生成一个规范化的帖子对象」都放在这里，方便单测。
 */

/** 发帖限制 */
export const POST_LIMITS = {
  title: 40,
  text: 2000,
  images: 9,
};

/** 内容类型 */
export const POST_MEDIA = ['文字', '图文', '视频'];

/** 分区 */
export const POST_ZONES = ['推荐', '狗区', '猫区', '鸟区', '异宠区'];

/** 分区 → 对应的宠物物种（「推荐」不筛）；发帖时给默认分区用 */
export const ZONE_SPECIES = { 狗区: '狗', 猫区: '猫', 鸟区: '鸟', 异宠区: '其他' };

/**
 * 敏感词（机审用的最小词表）。
 * 真实项目会换成服务端词库 + 人工复审；这里只要保证「词表在 domain、能单测」。
 */
export const SENSITIVE_WORDS = [
  '赌博', '博彩', '诈骗', '刷单', '代开发票', '办证', '枪支', '毒品', '迷药',
  '色情', '裸聊', '约炮', '高利贷', '洗钱', '私服', '外挂代练',
];

/** 文本里命中的敏感词（没有就返回空数组） */
export function hitSensitive(text) {
  const s = String(text || '');
  return SENSITIVE_WORDS.filter((w) => s.indexOf(w) >= 0);
}

/**
 * 校验草稿。
 * @param {{title?:string, txt?:string, media?:string, img?:string, imgs?:string[]}} draft
 * @returns {{ok:boolean, errors:string[], title:string, txt:string, media:string, imgs:string[]}}
 */
export function validatePost(draft) {
  const d = draft || {};
  const title = String(d.title || '').trim();
  const txt = String(d.txt || '').trim();
  const media = POST_MEDIA.indexOf(d.media) >= 0 ? d.media : '文字';
  // imgs 是新的多图字段，img 是单图旧字段；两者同时兼容，img 视作 imgs 的第一张
  const imgs = (Array.isArray(d.imgs) ? d.imgs : []).filter((x) => typeof x === 'string' && x);
  if (!imgs.length && d.img) imgs.push(String(d.img));
  const errors = [];

  if (!title) errors.push('标题不能为空');
  else if (title.length > POST_LIMITS.title) errors.push('标题不能超过 ' + POST_LIMITS.title + ' 字');

  if (!txt) errors.push('正文不能为空');
  else if (txt.length > POST_LIMITS.text) errors.push('正文不能超过 ' + POST_LIMITS.text + ' 字');

  if (!errors.length) {
    const bad = hitSensitive(title + ' ' + txt);
    if (bad.length) errors.push('内容包含敏感词：' + bad.join('、'));
  }

  if (imgs.length > POST_LIMITS.images) errors.push('配图最多 ' + POST_LIMITS.images + ' 张');
  else if (media !== '文字' && !imgs.length) errors.push(media === '视频' ? '请选择一段示例视频' : '请至少选择一张配图');

  return { ok: errors.length === 0, errors, title, txt, media, imgs };
}

/**
 * 生成一个规范化的帖子对象（不碰 store，由调用方决定塞到哪儿）。
 * @param {{title:string, txt:string, media:string, img?:string, imgs?:string[], zone?:string, dur?:string}} draft
 * @param {{nick:string, avatar:string, ip?:string}} me
 * @param {{id:string, time:number}} meta
 */
export function createPost(draft, me, meta) {
  const v = validatePost(draft);
  if (!v.ok) return null;
  const d = draft || {};
  const who = me || {};
  const at = meta || {};
  return {
    id: at.id,
    zone: POST_ZONES.indexOf(d.zone) >= 0 ? d.zone : '推荐',
    auth: who.nick || '匿名铲屎官',
    authImg: who.avatar || '',
    time: at.time,
    title: v.title,
    txt: v.txt,
    img: v.imgs[0] || '',
    imgs: v.imgs,
    likes: 0,
    cmts: [],
    favs: 0,
    media: v.media,
    dur: d.dur || '00:45',
    ip: who.ip || '北京',
  };
}

/**
 * 互动计数：**基础数永远不就地加减**，我自己的那一票只做显示期叠加。
 * 这样连点多少次都不会把计数顶上去，旧存档里 likes/favs 的语义也不变。
 * @param {number} base 帖子上的基础数（种子 / 他人贡献）
 * @param {boolean} mine 我是否已点赞 / 收藏
 */
export function countWithMine(base, mine) {
  const n = Number(base);
  return (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0) + (mine ? 1 : 0);
}

/**
 * 幂等地设置「我点过没有」：已经是这个状态就什么都不发生（返回 changed:false）。
 * @param {number} base 帖子上的基础数
 * @param {boolean} mine 现在是不是我点过的
 * @param {boolean} on 想要的状态
 * @returns {{liked:boolean, base:number, count:number, changed:boolean}}
 */
export function setLike(base, mine, on) {
  const b = Math.max(0, Math.floor(Number(base) || 0));
  const liked = !!on;
  return { liked, base: b, count: countWithMine(b, liked), changed: !!mine !== liked };
}

/**
 * 切换点赞（视图里那个按钮就是它）。
 * @param {number} base
 * @param {boolean} mine
 */
export function toggleLike(base, mine) {
  return setLike(base, mine, !mine);
}

/** 正文摘要（列表页用；超过 n 字截断并加省略号） */
export function excerptOf(text, n = 80) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

/**
 * 分页：一次渲染多少条。
 * @param {Array} list 全量列表
 * @param {number} page 页码（从 1 开始）
 * @param {number} [size] 每页条数
 */
export function pageSlice(list, page, size = 5) {
  const arr = list || [];
  const p = Math.max(1, page || 1);
  const start = (p - 1) * size;
  return { items: arr.slice(start, start + size), hasMore: start + size < arr.length, page: p, total: arr.length };
}
