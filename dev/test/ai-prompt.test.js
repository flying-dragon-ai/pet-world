import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_SCENES, RISK_KW, EMG_KW, sceneOf, hitKeywords,
  isRiskQuestion, isEmergency, petBrief, buildSystemPrompt, composeMessages,
} from '../../src/domain/ai-prompt.js';
import { localAnswer, localGreeting, localRefusal } from '../../src/domain/ai-local.js';

const PET = {
  id: 'p3', name: '尖尖', species: '狗', breed: '金毛寻回犬', gender: '弟弟',
  birth: '2024-10-10', weight: 20.5, height: 50, build: '标准',
  neuter: '未绝育', note: '无已知过敏', personality: ['活泼', '粘人'],
};

test('九大场景齐全，id 唯一', () => {
  assert.equal(AI_SCENES.length, 9);
  const ids = new Set(AI_SCENES.map((s) => s.id));
  assert.equal(ids.size, 9);
  assert.deepEqual([...ids].sort(), ['ask', 'attr', 'care', 'doll', 'feed', 'shop', 'trip', 'watch', 'write']);
});

test('sceneOf：未知场景回落到健康问诊', () => {
  assert.equal(sceneOf('care').n, '日常养护');
  assert.equal(sceneOf('不存在的').id, 'ask');
  assert.equal(sceneOf(undefined).id, 'ask');
});

test('安全词表：药品剂量必拒答，急症必拦截', () => {
  assert.equal(isRiskQuestion('美布芬吃多少药'), true);
  assert.equal(isRiskQuestion('剂量是多少'), true);
  assert.equal(isRiskQuestion('今天有点拉稀'), false);
  assert.equal(isEmergency('持续呕吐两小时'), true);
  assert.equal(isEmergency('误食了巧克力'), true);
  assert.equal(isEmergency('今天很开心'), false);
  assert.ok(RISK_KW.length > 0 && EMG_KW.length > 0);
  assert.equal(hitKeywords('abc', []), false);
});

test('档案摘要包含关键字段', () => {
  const brief = petBrief(PET);
  assert.ok(brief.includes('尖尖'));
  assert.ok(brief.includes('金毛寻回犬'));
  assert.ok(brief.includes('20.5kg'));
  assert.ok(brief.includes('50cm'));
  assert.ok(brief.includes('活泼'));
  assert.equal(petBrief(null), '（未注入宠物档案，通用模式）');
});

test('System Prompt：注入档案 / 通用模式两种形态', () => {
  const withPet = buildSystemPrompt(PET, 'feed');
  assert.ok(withPet.includes('尖尖'), '带上了档案');
  assert.ok(withPet.includes('喂养计算器') === false, '不会把场景名当角色');
  assert.ok(withPet.includes('营养师'), '带上了场景角色设定');
  assert.ok(withPet.includes('不给药品剂量建议'), '带上了安全底线');

  const noPet = buildSystemPrompt(null, 'ask');
  assert.ok(noPet.includes('没有注入宠物档案'));
  assert.ok(noPet.includes('兽医顾问'));
});

test('消息编排：system 在前，历史映射成 user/assistant', () => {
  const msgs = [
    { r: 'me', t: '它今天吐了' },
    { r: 'ai', t: '先禁食 4-6 小时' },
  ];
  const out = composeMessages(msgs, 'PROMPT');
  assert.equal(out.length, 3);
  assert.equal(out[0].role, 'system');
  assert.equal(out[0].content, 'PROMPT');
  assert.equal(out[1].role, 'user');
  assert.equal(out[2].role, 'assistant');
});

test('消息编排：历史条数有上限，不会无限膨胀', () => {
  const many = [];
  for (let i = 0; i < 50; i++) many.push({ r: 'me', t: 'q' + i });
  assert.equal(composeMessages(many, 'P', 10).length, 11);
  assert.equal(composeMessages([], 'P').length, 1);
});

test('本地语料：按场景给出不同回答，且用上档案数据', () => {
  const feed = localAnswer(PET, '每天喂多少', 'feed');
  assert.ok(feed.includes('尖尖'));
  assert.ok(feed.includes('20.5kg'));
  assert.ok(feed.includes('kcal'));
  assert.ok(!feed.includes('<br>'), '是纯文本，不拼 HTML');

  const ask = localAnswer(PET, '狗狗呕吐怎么办', 'ask');
  assert.ok(ask.includes('必须就医信号'));

  const other = localAnswer(PET, '随便问问', 'care');
  assert.notEqual(ask, other);
});

test('本地语料：症状标签命中结构化答复', () => {
  const skin = localAnswer(PET, '身上起了皮肤病', 'ask');
  assert.ok(skin.includes('居家可护理'));
  assert.ok(skin.includes('禁忌事项'));
});

test('本地语料：没有档案时也能回答（通用模式）', () => {
  const out = localAnswer(null, '每天喂多少', 'feed');
  assert.ok(out.includes('完善宠物体重信息'));
});

test('拒答与开场白', () => {
  const r = localRefusal(PET);
  assert.ok(r.includes('剂量'));
  assert.ok(r.includes('尖尖'));
  assert.ok(localRefusal(null).includes('线下就医'));
  assert.ok(localGreeting('ask', PET).includes('尖尖'));
  assert.ok(localGreeting('shop', null).length > 0);
});
