import test from 'node:test';
import assert from 'node:assert/strict';

import {
  needRotate, MANUAL_ACTIONS, onCooldown, lacksStamina,
  moodEmoji, decayAttrs, seasonIndexOf, dayIndexOf, derivedTraits,
  pickIdle, petReply, homePostEvent, RUNTIME_EVENTS, LIFE_EVENTS,
} from '../../src/domain/w3d.js';

/* 3D 互动的数值会随平衡调整而变，所以测试只锁"规则"，不锁具体数值：
 * 规则 = 每个动作的语义方向正确（抚摸不扣体力 / 喂食涨饱食 / 玩耍扣体力 / 洗澡涨清洁）、
 *         字段完整、冷却与体力门槛的判定逻辑不变。
 * 数值本身属于产品口径，改数值时改 domain/w3d.js 的表，不改这里。 */

const ATTR_KEYS = new Set(['hunger', 'clean', 'mood', 'stamina', 'wisdom', 'growth']);

test('竖屏视口 → 舞台内容旋转 90°；横屏/方形不转', () => {
  assert.equal(needRotate(390, 844), true, '手机竖屏');
  assert.equal(needRotate(844, 390), false, '手机横屏');
  assert.equal(needRotate(1280, 720), false, '桌面横屏');
  assert.equal(needRotate(500, 500), false, '方形视口');
});

test('每个手动互动：字段完整、属性键合法、数值有限', () => {
  for (const [act, action] of Object.entries(MANUAL_ACTIONS)) {
    assert.ok(action.gain && typeof action.gain === 'object', act + ' 必须有 gain');
    for (const [key, value] of Object.entries(action.gain)) {
      assert.ok(ATTR_KEYS.has(key), act + ' 的属性键不合法：' + key);
      assert.equal(Number.isFinite(value), true, act + ' 的数值必须是有限数');
    }
    assert.ok(action.fxIcon && action.fxColor, act + ' 必须配一组飘字图标与颜色');
    assert.match(action.fxColor, /^#[0-9A-Fa-f]{6}$/, act + ' 颜色格式');
    // 台词与情绪动作是表现层附加项：有则须合法，无也不影响规则
    if (action.say !== undefined) assert.equal(typeof action.say, 'string', act + ' 的台词必须是字符串');
    if (action.emote !== undefined) assert.equal(typeof action.emote, 'string', act + ' 的情绪动作必须是字符串');
  }
});

test('互动语义方向：抚摸不扣体力、喂食涨饱食、玩耍扣体力、洗澡涨清洁', () => {
  assert.ok(MANUAL_ACTIONS.touch.gain.stamina >= 0, '抚摸不该扣体力');
  assert.ok(MANUAL_ACTIONS.feed.gain.hunger > 0, '喂食要涨饱食值');
  assert.ok(MANUAL_ACTIONS.play.gain.stamina < 0, '玩耍要扣体力');
  assert.ok(MANUAL_ACTIONS.bath.gain.clean > 0, '洗澡要涨清洁值');
});

test('任务卡规则：喂食打今日喂食卡、抚摸累计次数', () => {
  assert.equal(MANUAL_ACTIONS.feed.task, 'feed');
  assert.ok(MANUAL_ACTIONS.feed.growth > 0, '喂食要长世界成长值');
  assert.equal(MANUAL_ACTIONS.touch.countsTouch, true);
});


/* ---------- V1.10：对齐《虚拟宠物家园》2D 小游戏的新规则 ---------- */

test('心情表情：与 2D 小游戏同口径', () => {
  assert.equal(moodEmoji({ mood: 80, hunger: 90, clean: 90, stamina: 90 }), '🤩');
  assert.equal(moodEmoji({ mood: 50, hunger: 90, clean: 90, stamina: 90 }), '😊');
  assert.equal(moodEmoji({ mood: 10, hunger: 90, clean: 90, stamina: 90 }), '😕');
  assert.equal(moodEmoji({ mood: 80, hunger: 20, clean: 90, stamina: 90 }), '🥺', '饿过头');
  assert.equal(moodEmoji({ mood: 80, hunger: 90, clean: 20, stamina: 90 }), '🥺', '脏过头');
  assert.equal(moodEmoji({ mood: 80, hunger: 90, clean: 90, stamina: 10 }), '😪', '困');
});

test('在线挂机衰减：饥饿/清洁/心情掉，体力回', () => {
  const attr = { hunger: 80, clean: 80, mood: 80, stamina: 50 };
  decayAttrs(attr, 38, false);
  assert.equal(Math.round(attr.hunger), 79, '38 秒掉 1 点饥饿');
  assert.ok(attr.clean < 80 && attr.clean > 79, '清洁掉得更慢');
  assert.ok(attr.mood < 80 && attr.mood > 79, '心情掉得最慢');
  assert.ok(attr.stamina > 50, '不睡觉时体力回升');

  const hungry = { hunger: 20, clean: 80, mood: 80, stamina: 50 };
  decayAttrs(hungry, 40, false);
  assert.equal(hungry.stamina, 50, '饿着的时候体力不涨');

  const sleeping = { hunger: 80, clean: 80, mood: 80, stamina: 50 };
  decayAttrs(sleeping, 40, true);
  assert.equal(sleeping.stamina, 50, '睡着时体力不涨（由 AI 睡眠逻辑恢复）');
});

test('季节：每 7 天一季，四季轮转', () => {
  assert.equal(seasonIndexOf(0), 0);
  assert.equal(seasonIndexOf(6), 0);
  assert.equal(seasonIndexOf(7), 1);
  assert.equal(seasonIndexOf(28), 0, '28 天 = 4 季，回到春');
  assert.equal(seasonIndexOf(29), 0, '第 29 天仍在春季区间（28~34 天）');
  assert.equal(seasonIndexOf(35), 1);
  assert.equal(typeof dayIndexOf(Date.UTC(2026, 0, 1)), 'number', '自然日索引可计算');
});

test('派生性格：由二元属性 + 六维 + 抚摸次数折算六性格', () => {
  const w = { courage: 70, impulse: 65, attr: { stamina: 80, wisdom: 40, growth: 120, mood: 60, hunger: 40 } };
  const pet = { g: { touchCount: 2 } };
  const t = derivedTraits(w, pet);
  assert.equal(t.courage, 70);
  assert.equal(t.mischief, 65, '冲动值即捣蛋值');
  assert.equal(t.greedy, 60, '越饿越馋');
  assert.ok(t.clingy > 0 && t.clingy <= 100);
  assert.ok(t.lively > 0 && t.lively <= 100);
  assert.ok(t.explore > 0 && t.explore <= 100);
});

test('自主行为决策：镜像 2D 小游戏的分支与阈值', () => {
  const attr = { hunger: 80, clean: 80, mood: 80, stamina: 80 };
  const traits = { courage: 50, mischief: 20, lively: 50, explore: 50, clingy: 20, greedy: 20 };
  assert.equal(pickIdle({ attr, traits, roll: 0.1 }), 'walk');
  assert.equal(pickIdle({ attr, traits, roll: 0.35 }), 'wag');
  assert.equal(pickIdle({ attr, traits, roll: 0.45 }), 'nod');
  assert.equal(pickIdle({ attr, traits, roll: 0.55 }), 'lie');
  assert.equal(pickIdle({ attr, traits, roll: 0.55, rain: true }), 'idle', '下雨不能躺，顺延到后面的分支');
  assert.equal(pickIdle({ attr, traits: { ...traits, mischief: 70 }, roll: 0.65 }), 'demolish', '捣蛋值高才会拆家');
  assert.equal(pickIdle({ attr, traits, roll: 0.9 }), 'idle');

  const greedy = { ...traits, greedy: 80 };
  const hungry = { ...attr, hunger: 30 };
  assert.equal(pickIdle({ attr: hungry, traits: greedy, roll: 0.85 }), 'beg');

  const sleepy = { ...attr, stamina: 10 };
  assert.equal(pickIdle({ attr: sleepy, traits, roll: 0.9 }), 'sleep', '体力过低直接睡');
});

test('宠物对话：关键词命中对应话术', () => {
  const ctx = { name: '旺财', attr: { mood: 80, hunger: 30, stamina: 60 }, traits: { lively: 60, courage: 60 }, memorial: false };
  assert.ok(/超想你/.test(petReply('想我了吗', ctx)));
  assert.ok(/饿/.test(petReply('你吃饭了吗', ctx)));
  assert.ok(/出去玩/.test(petReply('出去玩吗', ctx)));
  assert.ok(/爱你/.test(petReply('我爱你', ctx)));
  assert.ok(petReply('我爱你', { ...ctx, memorial: true }).includes('🌈'), '思念模式下语气变温柔');
});

test('社区帖子 → 家园事件：打架 / 洗护 / 好消息 / 其它', () => {
  const brave = { traits: { mischief: 60, courage: 60 } };
  const fight = homePostEvent('今天狗狗和别的狗打架了', brave);
  assert.equal(fight.kind, 'fight');
  assert.equal(fight.mood, -5);
  assert.equal(fight.medal, 'streetfight');

  const shy = homePostEvent('打架了', { traits: { mischief: 10, courage: 10 } });
  assert.equal(shy.kind, 'shy');
  assert.equal(shy.medal, null);

  const alert = homePostEvent('带去打针了', brave);
  assert.equal(alert.kind, 'alert');
  assert.equal(alert.mood, -6);

  const happy = homePostEvent('今天生日聚会好开心', brave);
  assert.equal(happy.kind, 'happy');
  assert.equal(happy.mood, 10);

  const other = homePostEvent('今天天气不错', brave);
  assert.equal(other.kind, 'idle');
  assert.equal(other.mood, 2);
});

test('运行时战功事件：条件命中才发', () => {
  const demolish = RUNTIME_EVENTS.find((e) => e.id === 'demolish');
  assert.equal(demolish.need({ traits: { mischief: 70 }, attr: { clean: 30 } }), true);
  assert.equal(demolish.need({ traits: { mischief: 40 }, attr: { clean: 30 } }), false);

  const explorer = RUNTIME_EVENTS.find((e) => e.id === 'explorer');
  assert.equal(explorer.need({ attr: { wisdom: 30, growth: 100 } }), true);
  assert.equal(explorer.need({ attr: { wisdom: 10, growth: 100 } }), false);

  const rainday = RUNTIME_EVENTS.find((e) => e.id === 'rainday');
  assert.equal(rainday.need({ weather: 'rain' }), true);
  assert.equal(rainday.need({ weather: 'sunny' }), false);

  assert.equal(LIFE_EVENTS.length, 4, '四种生活小事件');
});

test('冷却：同一动作 3 秒内只生效一次', () => {
  const cooldowns = {};
  assert.equal(onCooldown(cooldowns, 'feed', 1000), false, '首次可用');
  cooldowns.feed = 1000;
  assert.equal(onCooldown(cooldowns, 'feed', 1000 + 2999), true, '2999ms 仍在冷却');
  assert.equal(onCooldown(cooldowns, 'feed', 1000 + 3000), false, '满 3s 解除');
  assert.equal(onCooldown(cooldowns, 'bath', 1000), false, '冷却按按钮独立计算');
});

test('体力门槛：只约束声明了门槛的动作，门槛是合法正整数', () => {
  const gated = Object.entries(MANUAL_ACTIONS).filter(([, a]) => a.minStamina !== undefined);
  assert.ok(gated.length >= 1, '至少有一个互动有体力门槛');

  for (const [act, action] of gated) {
    assert.ok(Number.isInteger(action.minStamina) && action.minStamina > 0, act + ' 门槛必须是正整数');
    assert.equal(lacksStamina(action, action.minStamina - 1), true, act + ' 体力不足应被拒绝');
    assert.equal(lacksStamina(action, action.minStamina), false, act + ' 体力达标应放行');
  }

  for (const [act, action] of Object.entries(MANUAL_ACTIONS)) {
    if (action.minStamina === undefined) {
      assert.equal(lacksStamina(action, 0), false, act + ' 没有体力门槛，不该被体力拦住');
    }
  }
});
