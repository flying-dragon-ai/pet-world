import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  PET_CATALOG,
  PET_FALLBACK,
  PROC_PETS,
  PET_MODELS,
  modelFor,
  petModelOf,
  pickClips,
} from '../../src/data/w3d-assets.js';
import { PROC_BUILDERS } from '../../src/views/w3d/proc-pet.js';

/* 宠物本体模型的契约：
 *   - 目录里的每个 key 都必须解析到三种来源之一：本体 GLB / alias 替补 / 程序化体型，
 *     解析结果由 data/w3d-assets.js 的 modelFor 给出，纯函数，磁盘状态交给 dev/check-assets.js。
 *   - alias 目标必须真有文件（这里查磁盘，防止"借了个不存在的"）；proc 体型必须有 builder。
 *   - 选型：品种关键词优先、物种兜底，未知品种也要落到 cat，不能返回空。
 *   - 取 clip：各家动画预设命名不一，idle/walk/run 三个角色都必须能落位。 */

const MODELS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../assets/models/pets');
const GLB_RE = /^assets\/models\/pets\/[\w-]+\.glb$/;

test('目录 key 不重复，且各自的首选 url 都是 assets/models/pets/<key>.glb', () => {
  const keys = Object.keys(PET_CATALOG);
  assert.equal(new Set(keys).size, keys.length, 'key 不能重复');
  for (const key of keys) {
    const model = modelFor(key);
    assert.equal(model.key, key);
    assert.match(model.url, GLB_RE, key + ' 的首选 url');
    assert.equal(model.url, `assets/models/pets/${key}.glb`, key + ' 先试本体文件');
    assert.equal(model.scale, 1, '尺寸统一交给 pet.js 的包围盒归一化');
  }
  assert.ok(keys.length >= 20, '至少覆盖 20 个物种');
});

test('22 个 key 全部能解析到可渲染来源（本体 / alias / proc）', () => {
  let own = 0;
  let alias = 0;
  let proc = 0;
  for (const [key, meta] of Object.entries(PET_CATALOG)) {
    const model = modelFor(key);
    const byName = petModelOf({ species: '猫', breed: meta.n }).key;
    assert.equal(byName, key, `品种名「${meta.n}」应选到 ${key}`);
    assert.ok(fs.existsSync(path.join(MODELS, `${key}.glb`)) || model.alias || model.proc,
      `${key} 既没有本体 GLB，也没有 alias / proc 兜底`);
    if (model.proc) proc += 1;
    else if (model.alias) alias += 1;
    else own += 1;
  }
  assert.equal(own + alias + proc, Object.keys(PET_CATALOG).length);
  assert.ok(proc > 0, '鱼 / 爬行 / 蛙 / 蚁 应该有程序化体型兜底');
});

test('alias 目标都在目录里、都在磁盘上，且不串链', () => {
  for (const [key, target] of Object.entries(PET_FALLBACK)) {
    assert.ok(PET_CATALOG[key], `alias 源 ${key} 必须在目录里`);
    assert.ok(PET_CATALOG[target], `alias 目标 ${target} 必须在目录里`);
    assert.ok(!PET_FALLBACK[target], `alias 不许串链：${key} → ${target} → ${PET_FALLBACK[target]}`);
    const file = path.join(MODELS, `${target}.glb`);
    assert.ok(fs.existsSync(file), `${key} 借的 ${target}.glb 必须真的在磁盘上`);

    const model = modelFor(key);
    assert.equal(model.alias, target, `${key} 的 alias 字段`);
    assert.equal(model.aliasUrl, `assets/models/pets/${target}.glb`, `${key} 的 aliasUrl`);
  }
});

test('PROC_PETS 的类型在 proc-pet.js 里都有 builder', () => {
  assert.ok(Object.keys(PROC_PETS).length > 0, '至少声明一个程序化体型');
  for (const [key, kind] of Object.entries(PROC_PETS)) {
    assert.ok(PET_CATALOG[key], `proc 源 ${key} 必须在目录里`);
    assert.equal(typeof PROC_BUILDERS[kind], 'function', `proc-pet.js 缺 ${kind} 的 builder`);
    assert.equal(modelFor(key).proc, kind, `${key} 的 proc 字段`);
  }
  // 四类低模都要在（鱼 / 爬行 / 蛙 / 昆虫）
  for (const kind of ['fish', 'reptile', 'frog', 'insect']) {
    assert.equal(typeof PROC_BUILDERS[kind], 'function', `proc-pet.js 缺 ${kind}`);
  }
});

test('没有 proc 声明的 key 不会平白多出一个 proc 字段', () => {
  for (const key of Object.keys(PET_CATALOG)) {
    assert.equal(!!modelFor(key).proc, !!PROC_PETS[key], key + ' 的 proc 字段只跟着 PROC_PETS 走');
    assert.equal(!!modelFor(key).alias, !!PET_FALLBACK[key], key + ' 的 alias 字段只跟着 PET_FALLBACK 走');
  }
});

test('物种兜底都指向目录里存在的模型', () => {
  for (const [species, model] of Object.entries(PET_MODELS)) {
    assert.match(model.url, GLB_RE, species + ' 兜底 URL');
    const key = model.url.slice(model.url.lastIndexOf('/') + 1, -4);
    assert.ok(PET_CATALOG[key], `${species} 兜底模型 ${key} 必须在目录里`);
    assert.equal(model.scale, 1, '尺寸统一交给 pet.js 的包围盒归一化，兜底不再单独缩放');
  }
});

test('品种关键词优先于物种兜底', () => {
  const cases = [
    [{ species: '狗', breed: '柯基' }, 'corgi'],
    [{ species: '狗', breed: '金毛寻回犬' }, 'golden'],
    [{ species: '狗', breed: '泰迪' }, 'teddy'],
    [{ species: '狗', breed: '比熊' }, 'bichon'],
    [{ species: '猫', breed: '中华田园猫（橘）' }, 'cat'],
    [{ species: '异宠', breed: '仓鼠' }, 'hamster'],
    [{ species: '异宠', breed: '布丁仓鼠' }, 'hamster'],
    [{ species: '异宠', breed: '垂耳兔' }, 'rabbit'],
    [{ species: '异宠', breed: '龙猫' }, 'chinchilla'],
    [{ species: '鸟', breed: '玄凤鹦鹉' }, 'cockatiel'],
    [{ species: '异宠', breed: '豹纹守宫' }, 'gecko'],
    [{ species: '异宠', breed: '金鱼' }, 'goldfish'],
    [{ species: '异宠', breed: '中华草龟' }, 'turtle'],
  ];
  for (const [pet, expect] of cases) {
    assert.equal(petModelOf(pet).key, expect, JSON.stringify(pet) + ' 应选 ' + expect);
  }
});

test('品种为空或无法识别时退回物种默认', () => {
  assert.equal(petModelOf({ species: '狗', breed: '' }).key, 'golden');
  assert.equal(petModelOf({ species: '猫', breed: '不认识的品种' }).key, 'cat');
  assert.equal(petModelOf({ species: '鱼', breed: '' }).key, 'goldfish');
  assert.equal(petModelOf({}).key, 'cat', '空档案也不炸');
});

test('petModelOf 对未知品种 / 未知物种仍兜底出猫', () => {
  for (const pet of [
    { species: '外星生物', breed: '德拉诺虚空兽' },
    { species: '', breed: '' },
    {},
    null,
    { breed: 42 },
  ]) {
    const model = petModelOf(pet);
    assert.equal(model.key, 'cat', JSON.stringify(pet) + ' 应兜底到 cat');
    assert.equal(model.url, 'assets/models/pets/cat.glb');
    assert.equal(model.scale, 1);
  }
});

test('pickClips：犬科三支按名取，鱼用 swim/dash 顶替 walk/run', () => {
  const canine = pickClips([
    { name: 'CanineIdle' }, { name: 'CanineLocoWalkL' }, { name: 'CanineRun' },
  ]);
  assert.equal(canine.idle.name, 'CanineIdle');
  assert.equal(canine.walk.name, 'CanineLocoWalkL');
  assert.equal(canine.run.name, 'CanineRun');

  const fish = pickClips([{ name: 'FishIdle' }, { name: 'FishSwim' }, { name: 'FishDash' }]);
  assert.equal(fish.idle.name, 'FishIdle');
  assert.equal(fish.walk.name, 'FishSwim', '鱼没有 walk，用 swim');
  assert.equal(fish.run.name, 'FishDash', '鱼的跑用 dash');

  const bird = pickClips([{ name: 'BirdIdlestanding' }, { name: 'BirdWalk' }, { name: 'BirdFly' }]);
  assert.equal(bird.idle.name, 'BirdIdlestanding');
  assert.equal(bird.run.name, 'BirdFly', '鸟的跑用 fly');
});

test('pickClips：命名完全对不上时也不返回空，退到第一支', () => {
  const odd = pickClips([{ name: 'seaturtle/anim' }, { name: 'seaturtle/walk' }, { name: 'seaturtle/swim' }]);
  assert.equal(odd.idle.name, 'seaturtle/anim', '没有 idle 时拿第一支当待机');
  assert.equal(odd.walk.name, 'seaturtle/walk');
  assert.equal(odd.run.name, 'seaturtle/swim', '龟的跑用 swim');

  const single = pickClips([{ name: 'Take001' }]);
  assert.equal(single.idle.name, 'Take001');
  assert.equal(single.walk.name, 'Take001');
  assert.equal(single.run.name, 'Take001');
});
