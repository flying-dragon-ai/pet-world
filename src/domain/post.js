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

/**
 * 校验草稿。
 * @param {{title?:string, txt?:string, media?:string, img?:string}} draft
 * @returns {{ok:boolean, errors:string[], title:string, txt:string, media:string}}
 */
export function validatePost(draft) {
  const d = draft || {};
  const title = String(d.title || '').trim();
  const txt = String(d.txt || '').trim();
  const media = POST_MEDIA.indexOf(d.media) >= 0 ? d.media : '文字';
  const errors = [];

  if (!title) errors.push('标题不能为空');
  else if (title.length > POST_LIMITS.title) errors.push('标题不能超过 ' + POST_LIMITS.title + ' 字');

  if (!txt) errors.push('正文不能为空');
  else if (txt.length > POST_LIMITS.text) errors.push('正文不能超过 ' + POST_LIMITS.text + ' 字');

  if (media !== '文字' && !d.img) errors.push(media === '视频' ? '请选择一段示例视频' : '请至少选择一张配图');

  return { ok: errors.length === 0, errors, title, txt, media };
}

/**
 * 生成一个规范化的帖子对象（不碰 store，由调用方决定塞到哪儿）。
 * @param {{title:string, txt:string, media:string, img?:string, zone?:string, dur?:string}} draft
 * @param {{nick:string, avatar:string, ip?:string}} me
 * @param {{id:string, time:number}} meta
 */
export function createPost(draft, me, meta) {
  const v = validatePost(draft);
  if (!v.ok) return null;
  return {
    id: meta.id,
    zone: POST_ZONES.indexOf(draft.zone) >= 0 ? draft.zone : '推荐',
    auth: me.nick,
    authImg: me.avatar,
    time: meta.time,
    title: v.title,
    txt: v.txt,
    img: draft.img || '',
    likes: 0,
    cmts: [],
    favs: 0,
    media: v.media,
    dur: draft.dur || '00:45',
    ip: me.ip || '北京',
  };
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
