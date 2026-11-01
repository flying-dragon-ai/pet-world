/**
 * AI 助手的规则层（纯函数，不碰 DOM / 存储）。
 *
 * 这里放三样东西：
 *   1. 九大场景定义（AI 页的 chip 就是它渲染出来的）；
 *   2. 安全词表（药品剂量类问题要拒答，急症词要弹急诊引导）；
 *   3. System Prompt 的拼装 —— 由宠物档案拼出来，这是「档案注入上下文」的落点。
 *
 * 真接大模型时，只需要把 buildSystemPrompt 的产物发给后端，
 * 视图层（src/views/ai.js）一行都不用改。
 */

/** 九大场景。role 是给大模型看的角色设定，n/d 是给用户看的名字与说明。 */
export const AI_SCENES = [
  { id: 'ask', n: '健康问诊', i: 'i-med', c: '#F05B5B', d: '症状分析·就医建议', role: '你是一位资深兽医顾问，负责症状分析并给出就医信号。' },
  { id: 'care', n: '日常养护', i: 'i-leaf', c: '#4CA876', d: '喂养洗护·行为习惯', role: '你是宠物日常养护顾问，覆盖喂养、洗护与行为习惯。' },
  { id: 'feed', n: '喂养计算器', i: 'i-bowl', c: '#E8945A', d: '按档案算喂食量', role: '你是宠物营养师，按档案数据计算每日喂食量。' },
  { id: 'watch', n: '看护解读', i: 'i-video', c: '#8B7DE8', d: '监控画面AI解读', role: '你是宠物看护助手，负责解读监控画面里的行为与情绪。' },
  { id: 'attr', n: '异常归因', i: 'i-zap', c: '#E8A23A', d: '健康数据异常分析', role: '你是宠物健康数据分析师，负责异常归因。' },
  { id: 'shop', n: '商品导购', i: 'i-cart', c: '#3AB5C0', d: '结合档案推荐', role: '你是宠物选品顾问，必须避开档案里标注的过敏成分。' },
  { id: 'write', n: '发帖帮写', i: 'i-edit', c: '#E8709A', d: '标题文案一键生成', role: '你是社区内容编辑，帮用户写宠物日常帖子的标题与正文。' },
  { id: 'trip', n: '旅行规划', i: 'i-pin', c: '#5B8DEF', d: '携宠行程·清单', role: '你是携宠出行规划师，负责行程与随身清单。' },
  { id: 'doll', n: '定制顾问', i: 'i-gift', c: '#D9A03C', d: '玩偶尺寸·配饰', role: '你是宠物周边定制顾问，负责尺寸、材质与配饰建议。' },
];

/** 药品剂量类问题：必须拒答（剂量必须遵兽医处方） */
export const RISK_KW = ['剂量', '毫克', '用量', '药量', '吃多少药'];

/** 急症信号：命中就要弹急诊引导 */
export const EMG_KW = ['呕吐', '抽搐', '误食', '中毒', '呼吸困难', '出血', '昏迷', '不省'];

/** 问句里是否命中任一关键词 */
export function hitKeywords(q, words) {
  const s = String(q || '');
  return words.some((k) => s.indexOf(k) >= 0);
}

/** 是否是「问药品剂量」类问题 */
export function isRiskQuestion(q) {
  return hitKeywords(q, RISK_KW);
}

/** 是否命中急症信号 */
export function isEmergency(q) {
  return hitKeywords(q, EMG_KW);
}

/** 场景 id → 场景对象（找不到就回落到健康问诊） */
export function sceneOf(id) {
  return AI_SCENES.find((s) => s.id === id) || AI_SCENES[0];
}

/**
 * 宠物档案摘要（注入 prompt 用）。
 * @param {object} pet
 * @returns {string}
 */
export function petBrief(pet) {
  if (!pet) return '（未注入宠物档案，通用模式）';
  const bits = [
    '名字：' + (pet.name || '未命名'),
    '物种：' + (pet.species || '未知'),
    '品种：' + (pet.breed || '未知'),
    '性别：' + (pet.gender || '未知'),
    '生日：' + (pet.birth || '未知'),
    '体重：' + (pet.weight ? pet.weight + 'kg' : '未记录'),
    '身高：' + (pet.height ? pet.height + 'cm' : '未记录'),
    '体型：' + (pet.build || '标准'),
    '绝育：' + (pet.neuter || '未知'),
    '过敏/忌口：' + (pet.note || '无已知过敏'),
    '性格：' + ((pet.personality || []).join('、') || '未记录'),
  ];
  return bits.join('；');
}

/**
 * 拼 System Prompt。
 * @param {object|null} pet 宠物档案（null = 通用模式，不注入档案）
 * @param {string} sceneId 场景 id
 * @returns {string}
 */
export function buildSystemPrompt(pet, sceneId) {
  const scene = sceneOf(sceneId);
  const lines = [
    '你是「宠物数字管家」App 里的 AI 宠物助手。',
    scene.role,
    '回答要求：用中文，结构清晰（可用【小标题】与列表），控制在 300 字内。',
    '安全底线：不给药品剂量建议，不做确诊，只给科普级参考并提示何时就医。',
  ];
  if (pet) {
    lines.push('以下是该用户宠物的档案，回答必须与档案数据一致：');
    lines.push(petBrief(pet));
  } else {
    lines.push('当前没有注入宠物档案，请先让用户补充关键信息。');
  }
  return lines.join('\n');
}

/**
 * 把会话消息整理成「发给模型的消息数组」。
 * @param {Array<{r:string,t:string,emg?:boolean}>} msgs 历史消息（r: 'me' | 'ai'）
 * @param {string} prompt System Prompt
 * @param {number} [limit] 最多带多少条历史（默认 10，防止上下文无限膨胀）
 * @returns {Array<{role:string,content:string}>}
 */
export function composeMessages(msgs, prompt, limit = 10) {
  const n = Math.max(0, Math.floor(Number(limit) || 0));
  const history = (msgs || [])
    .filter((m) => m && (m.r === 'me' || m.r === 'ai') && !m.emg && m.t)
    .map((m) => ({ role: m.r === 'me' ? 'user' : 'assistant', content: String(m.t) }));
  // 注意：limit 为 0 时不能用 slice(-0)（那等于整段历史），必须显式取空
  const tail = n > 0 ? history.slice(-n) : [];
  return [{ role: 'system', content: String(prompt || '') }].concat(tail);
}
