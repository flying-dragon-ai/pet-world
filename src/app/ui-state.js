/**
 * 瞬时 UI 状态（不是业务数据）。
 *
 * 为什么单独一个模块：模板字符串里的事件必须能读写"当前选中哪个 tab / 哪个筛选"，
 * 这类状态既不属于业务存档（不该落盘），也不值得为每个值开一个 action。
 * 与其散落成 window._cbTag / window._replyCmt 这种临时全局，统一收进这里：
 *   - 一处声明、一处初始化、一处可测试；
 *   - 有名字、有默认值，刷新即回到初始态；
 *   - 真正的业务状态仍然只在 store（S）里。
 */
export const ui = {
  /* 我的 / 档案 */
  profTab: 'album',
  recType: 'vaccine',
  healthTab: 'growth',
  profileEditingPetId: null,
  dewormType: '体内',

  /* 商城 / 订单 */
  mallCat: '全部',
  ordTab: '全部',
  skuIndex: 0,
  checkout: null,
  cartTotal: 0,

  /* 服务 / 救助 */
  careCat: '全部',
  rescueTab: 'rescue',
  rescueType: '流浪猫',
  careTag: '',
  careTime: '',
  careNote: '',

  /* 社区 */
  comZone: '推荐',
  publish: { img: '', media: '图文', zone: '推荐', vid: false, dur: '00:45', preview: false },
  community: { postId: null, reply: null, page: 1 },

  /* 消息 / 旅行 / 活动 */
  msgTab: '互动',
  travCity: '全部',
  actCat: '全部',
  actCity: '全部',
  actId: null,

  /* 世界面板 */
  worldTab: 'home',

  /* 主理人表单 / 虚拟形象向导 */
  hostCat: '遛宠聚会',
  avatarWizard: null,

  /* 监控 / 播放器 */
  playback: null,
  monitorClock: null,
  forceAiFail: false,

  /* 直播 / 语音 */
  phoneScale: 1,
  voiceBusy: false,

  /* 3D */
  w3dCooldowns: {},
  worldLoadTimer: null,
};

/**
 * 模板层要直接赋值（onclick="ui.healthTab='rec';app.go('health')"），
 * 因此显式挂到 window 上 —— 这是除 app 之外唯一的全局出口，特此声明。
 */
export function installUiState(target = globalThis) {
  target.ui = ui;
  return ui;
}
/** 初始值快照：重置时整体覆盖回去 */
const INITIAL = JSON.parse(JSON.stringify(ui));

/** 测试 / 退出登录用：把瞬时状态恢复到初始值 */
export function resetUiState() {
  Object.assign(ui, JSON.parse(JSON.stringify(INITIAL)));
}
