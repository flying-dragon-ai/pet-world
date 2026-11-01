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

/* ---------------- 端口化后补的用例 ---------------- */

const SCENE_IDS = ['ask', 'care', 'feed', 'watch', 'attr', 'shop', 'write', 'trip', 'doll'];

test('九个场景 id 与文档完全一致，buildSystemPrompt 不抛且带上角色设定', () => {
  assert.deepEqual(AI_SCENES.map((s) => s.id), SCENE_IDS, '顺序与 id 都是契约，chip 按这个顺序渲染');
  for (const id of SCENE_IDS) {
    const scene = sceneOf(id);
    for (const pet of [PET, null]) {
      let prompt = '';
      assert.doesNotThrow(() => { prompt = buildSystemPrompt(pet, id); }, id + ' 不能抛');
      assert.ok(prompt.includes(scene.role), id + ' 要带上本场景的角色设定');
      assert.ok(prompt.includes('不给药品剂量建议'), id + ' 要带上安全底线');
      if (pet) assert.ok(prompt.includes('尖尖'), id + ' 要注入档案');
      else assert.ok(prompt.includes('没有注入宠物档案'), id + ' 通用模式要明说');
    }
  }
});

test('场景对象结构完整（chip 渲染依赖 n / i / c / d）', () => {
  for (const s of AI_SCENES) {
    assert.ok(s.n && s.i && s.c && s.d && s.role, s.id + ' 字段短缺');
    assert.match(s.c, /^#[0-9A-Fa-f]{6}$/, s.id + ' 的 c 必须是颜色值（会被拼进 style）');
    assert.match(s.i, /^i-[a-z]+$/, s.id + ' 的 i 必须是图标 id');
  }
});

test('RISK_KW：每个词都命中，且不误伤日常问句', () => {
  assert.ok(RISK_KW.length >= 3);
  for (const k of RISK_KW) {
    assert.equal(isRiskQuestion('请问' + k + '怎么算'), true, '没命中：' + k);
  }
  for (const q of ['今天有点拉稀', '多久洗一次澡', '每天喂多少克', '帮我写一条晒猫的帖子']) {
    assert.equal(isRiskQuestion(q), false, '误伤了：' + q);
  }
  assert.equal(isRiskQuestion(null), false);
});

test('EMG_KW：每个词都命中，且不误伤日常问句', () => {
  assert.ok(EMG_KW.length >= 3);
  for (const k of EMG_KW) {
    assert.equal(isEmergency('它突然' + k + '了'), true, '没命中：' + k);
  }
  for (const q of ['今天很开心', '想带它出去玩', '推荐一款猫粮']) {
    assert.equal(isEmergency(q), false, '误伤了：' + q);
  }
  assert.equal(isEmergency(undefined), false);
});

test('hitKeywords：纯函数，不取决于参数顺序', () => {
  assert.equal(hitKeywords('猫呕吐了', ['呕吐']), true);
  assert.equal(hitKeywords('猫呕吐了', ['拉稀']), false);
  assert.equal(hitKeywords('', ['呕吐']), false);
  assert.equal(hitKeywords('任意', []), false);
});

test('composeMessages：历史裁剪上限稳定（默认 10 / 显式 limit / 0 / 负数）', () => {
  const many = [];
  for (let i = 0; i < 50; i++) many.push({ r: i % 2 ? 'ai' : 'me', t: 'm' + i });

  const def = composeMessages(many, 'P');
  assert.equal(def.length, 11, '默认最多 10 条历史 + 1 条 system');
  assert.equal(def[1].content, 'm40', '裁的是最旧的，留最新的 10 条');
  assert.equal(def[10].content, 'm49');

  assert.equal(composeMessages(many, 'P', 3).length, 4);
  assert.equal(composeMessages(many, 'P', 0).length, 1, 'limit:0 只能剩 system（不能退化成整段历史）');
  assert.equal(composeMessages(many, 'P', -5).length, 1, '负数按 0 算');
  assert.equal(composeMessages(many, 'P', 999).length, 51, '上限比总数大时不丢消息');
});

test('composeMessages：非对话消息（急症卡 / 商品卡）不进上下文', () => {
  const msgs = [
    { r: 'me', t: '它吐了' },
    { r: 'ai', t: '急诊提示', emg: true },
    { r: 'cards', items: [{ name: '猫粮' }] },
    { r: 'ai', t: '先禁食' },
    { r: 'ai', t: '' },
    null,
  ];
  const out = composeMessages(msgs, 'P');
  assert.equal(out.length, 3);
  assert.deepEqual(out.map((m) => m.content), ['P', '它吐了', '先禁食']);
  assert.equal(composeMessages(null, null).length, 1);
  assert.equal(composeMessages(null, null)[0].content, '');
});
