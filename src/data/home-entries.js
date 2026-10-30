/**
 * 首页「日常护理」磁贴表（纯数据）。
 *
 * 命名口径以 V1.7.5 为准：健康页叫「健康管理」，照片时间线叫「成长记录」。
 * 磁贴只描述"叫什么 / 去哪"，点击统一走 app.openHomeEntry(id)，
 * 这样模板里的动作是静态的、可被 dev/check.js 校验，也方便单测锁住文案。
 */
export const HOME_CARE_ENTRIES = [
  {
    id: 'health',
    label: '健康管理',
    desc: '成长数据 · 健康周报',
    icon: 'i-chart',
    color: '#4CA876',
    page: 'health',
  },
  {
    id: 'album',
    label: '成长记录',
    desc: '时光记忆 · 宠物照片',
    icon: 'i-img',
    color: '#3AB5C0',
    page: 'profile',
    tab: 'album',
  },
];
