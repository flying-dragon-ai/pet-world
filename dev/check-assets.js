#!/usr/bin/env node
/**
 * 宠物模型库体检：PET_CATALOG 里的每个 key，是否都落到了能渲染的来源。
 *
 * 契约在 data/w3d-assets.js，三种来源（比"文件存在"更准的判据）：
 *   own     assets/models/pets/<key>.glb 在磁盘上，且是合法 GLB
 *   alias   PET_FALLBACK[key] 指向目录里另一只，那只的 GLB 在磁盘上（按目标文件查全部指标）
 *   proc    PROC_PETS[key] 的体型在 views/w3d/proc-pet.js 有 builder（零字节资产）
 * 三者都不满足 → 失败。不许靠删目录条目或放宽预算变绿。
 *
 * GLB 的硬指标（own 与 alias 目标都查）：
 *   1. 带骨骼（skins ≥ 1）与至少一支动画（clip 数 ≥ 1）
 *   2. 用同一份 pickClips 规则，idle/walk/run 三个角色都能落到具体的 clip
 *   3. 三角面数与体积在预算内（单只 ≤ 60k tris、≤ 6MB），避免把移动端撑爆
 *
 * 用法：node dev/check-assets.js [--verbose]
 *   --verbose 额外打 clip 名单与 idle/walk/run 的具体落位
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const MODELS = path.join(ROOT, 'assets/models/pets');
const verbose = process.argv.includes('--verbose');

const MAX_TRIS = 60000;
const MAX_BYTES = 6 * 1024 * 1024;

const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');

/** 读 GLB 头 + JSON 块，返回 gltf JSON（不解析二进制） */
function readGltf(file) {
  const buf = fs.readFileSync(file);
  if (buf.length < 20 || buf.readUInt32LE(0) !== 0x46546c67) throw new Error('不是 GLB（magic 不对）');
  const jsonLen = buf.readUInt32LE(12);
  if (buf.readUInt32LE(16) !== 0x4e4f534a) throw new Error('第一个 chunk 不是 JSON');
  return { gltf: JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')), bytes: buf.length };
}

/** 一只 GLB 的硬指标：面数 / 体积 / 骨骼 / clip / 三支角色 */
function inspect(file, key, problems, cache) {
  const hit = cache.get(file);
  if (hit) return hit;

  let out = null;
  try {
    const { gltf, bytes } = readGltf(file);
    let tris = 0;
    for (const mesh of gltf.meshes || []) {
      for (const prim of mesh.primitives || []) {
        const acc = gltf.accessors[prim.indices !== undefined ? prim.indices : prim.attributes.POSITION];
        if (acc) tris += acc.count / 3;
      }
    }
    tris = Math.round(tris);
    const clips = (gltf.animations || []).map((a) => ({ name: a.name || '' }));
    const skins = (gltf.skins || []).length;
    const roles = clips.length
      ? assets.pickClips(clips)
      : { idle: null, walk: null, run: null };

    out = { tris, bytes, mb: +(bytes / 1048576).toFixed(2), skins, clips, roles };
    cache.set(file, out);
  } catch (err) {
    problems.push(`${key}：GLB 解析失败（${rel(file)}）—— ${err.message}`);
    cache.set(file, null);
    return null;
  }

  const where = key + (path.basename(file, '.glb') === key ? '' : `（alias→${path.basename(file, '.glb')} 的文件）`);
  if (!out.skins) problems.push(`${where}：没有骨骼（skins=0），动画挂不上`);
  if (!out.clips.length) problems.push(`${where}：没有动画 clip`);
  for (const role of ['idle', 'walk', 'run']) {
    if (!out.roles[role]) {
      const names = out.clips.map((c) => c.name).join(', ') || '无';
      problems.push(`${where}：${role} 没有可用的 clip（现有 ${names}）`);
    }
  }
  if (out.tris > MAX_TRIS) problems.push(`${where}：${out.tris} 面，超预算 ${MAX_TRIS}`);
  if (out.bytes > MAX_BYTES) problems.push(`${where}：${out.mb}MB，超预算 ${(MAX_BYTES / 1048576).toFixed(0)}MB`);
  return out;
}

/* 数据层模块在 IIFE 里才 import（inspect 要用 assets.pickClips） */
let assets = null;

(async () => {
  assets = await import(pathToFileURL(path.join(ROOT, 'src/data/w3d-assets.js')).href);
  const { PET_CATALOG, PET_FALLBACK, PROC_PETS, petModelOf, PET_MODELS } = assets;
  const procMod = await import(pathToFileURL(path.join(ROOT, 'src/views/w3d/proc-pet.js')).href);
  const procKinds = new Set(Object.keys(procMod.PROC_BUILDERS || {}));

  const problems = [];
  const rows = [];
  const cache = new Map();

  /* ---- 先查两张声明表自身是否自洽 ---- */
  for (const [key, target] of Object.entries(PET_FALLBACK)) {
    if (!PET_CATALOG[key]) problems.push(`PET_FALLBACK：${key} 不在 PET_CATALOG 里`);
    if (!PET_CATALOG[target]) problems.push(`PET_FALLBACK：${key} 的 alias 目标 ${target} 不在 PET_CATALOG 里`);
    else if (PET_FALLBACK[target]) problems.push(`PET_FALLBACK：${key} → ${target} 又指向 ${PET_FALLBACK[target]}，alias 不许串链`);
  }
  for (const [key, kind] of Object.entries(PROC_PETS)) {
    if (!PET_CATALOG[key]) problems.push(`PROC_PETS：${key} 不在 PET_CATALOG 里`);
    if (!procKinds.has(kind)) problems.push(`PROC_PETS：${key} 的体型 ${kind} 在 proc-pet.js 里没有 builder（现有 ${[...procKinds].join(' / ')}）`);
  }

  /* ---- modelFor 必须把两张表和降级链如实翻译出来 ---- */
  for (const key of Object.keys(PET_CATALOG)) {
    const model = assets.modelFor(key);
    if (model.key !== key) problems.push(`modelFor：${key} 解析成了 ${model.key}`);
    if (model.url !== `assets/models/pets/${key}.glb`) problems.push(`modelFor：${key} 没把本体文件当首选（${model.url}）`);
    if (!!model.alias !== !!PET_FALLBACK[key]) problems.push(`modelFor：${key} 的 alias 字段与 PET_FALLBACK 不一致`);
    if (!!model.proc !== !!PROC_PETS[key]) problems.push(`modelFor：${key} 的 proc 字段与 PROC_PETS 不一致`);
    if (model.aliasUrl && model.aliasUrl !== `assets/models/pets/${model.alias}.glb`) {
      problems.push(`modelFor：${key} 的 aliasUrl 与 alias ${model.alias} 对不上`);
    }
  }

  /* ---- 逐个 key 解析来源并核指标（顺序与 views/w3d/pet.js 的降级链一致）---- */
  for (const [key, meta] of Object.entries(PET_CATALOG)) {
    const own = path.join(MODELS, `${key}.glb`);
    const alias = PET_FALLBACK[key];
    const aliasFile = alias && PET_CATALOG[alias] ? path.join(MODELS, `${alias}.glb`) : null;
    let source = null;
    let info = null;

    if (fs.existsSync(own)) {
      // 本体文件在磁盘上就是首选（运行期也是先试本体，失败才退 alias）
      source = 'own';
      info = inspect(own, key, problems, cache);
    } else if (aliasFile && fs.existsSync(aliasFile)) {
      source = `alias→${alias}`;
      info = inspect(aliasFile, key, problems, cache);
    } else if (PROC_PETS[key]) {
      source = `proc:${PROC_PETS[key]}`;
      if (aliasFile) problems.push(`${key}（${meta.n}）：alias→${alias} 的 ${rel(aliasFile)} 不在磁盘上，实际会落到 ${source}`);
    } else {
      const tried = aliasFile ? `alias→${alias} 的 ${rel(aliasFile)} 也不在` : '也没声明 PET_FALLBACK / PROC_PETS';
      problems.push(`${key}（${meta.n}）：没有 ${rel(own)}，${tried}，无法渲染`);
      continue;
    }

    if (String(source).startsWith('proc:')) {
      rows.push({ key, n: meta.n, group: meta.group, source });
      continue;
    }
    if (!info) {
      // inspect 已经把具体原因记进 problems 了，这里只占一行
      rows.push({ key, n: meta.n, group: meta.group, source, broken: true });
      continue;
    }
    rows.push({
      key,
      n: meta.n,
      group: meta.group,
      source,
      tris: info.tris,
      mb: info.mb,
      skins: info.skins,
      clips: info.clips.map((c) => c.name),
      roles: info.roles,
    });
  }

  /* ---- 选型规则：目录里每只都必须能被品种名（或物种兜底）选出来 ---- */
  const cases = [
    [{ species: '猫', breed: '中华田园猫（橘）' }, 'cat'],
    [{ species: '狗', breed: '柯基' }, 'corgi'],
    [{ species: '狗', breed: '金毛寻回犬' }, 'golden'],
    [{ species: '狗', breed: '泰迪犬' }, 'teddy'],
    [{ species: '狗', breed: '比熊' }, 'bichon'],
    [{ species: '异宠', breed: '仓鼠' }, 'hamster'],
    [{ species: '异宠', breed: '荷兰猪' }, 'guineapig'],
    [{ species: '鸟', breed: '虎皮鹦鹉' }, 'budgie'],
    [{ species: '鸟', breed: '玄凤鹦鹉' }, 'cockatiel'],
    [{ species: '异宠', breed: '豹纹守宫' }, 'gecko'],
    [{ species: '异宠', breed: '金鱼' }, 'goldfish'],
    [{ species: '狗', breed: '' }, 'golden'],
  ];
  for (const [pet, expect] of cases) {
    const got = petModelOf(pet).key;
    if (got !== expect) problems.push(`选型：${JSON.stringify(pet)} 期望 ${expect}，实际 ${got}`);
  }
  for (const key of Object.keys(PET_CATALOG)) {
    const got = petModelOf({ species: '猫', breed: PET_CATALOG[key].n }).key;
    if (got !== key) problems.push(`选型：品种名「${PET_CATALOG[key].n}」期望 ${key}，实际 ${got}`);
  }
  for (const species of Object.keys(PET_MODELS)) {
    const model = petModelOf({ species, breed: '' });
    if (!model.url && !model.proc) problems.push(`兜底：物种 ${species} 既没 GLB 也没程序化体型`);
    if (model.url && !PET_CATALOG[model.key]) problems.push(`兜底：物种 ${species} 指向了不存在的模型 ${model.key}`);
  }

  /* ---- 打表 ---- */
  const head = `\n${'key'.padEnd(11)}${'名'.padEnd(8)}${'来源'.padEnd(16)}${'面数'.padStart(8)}${'体积'.padStart(9)}  骨骼 / clip`;
  console.log(head);
  console.log('-'.repeat(head.length - 1));
  let own = 0;
  let alias = 0;
  let proc = 0;
  for (const r of rows) {
    const src = r.source || '（未解析）';
    if (src === 'own') own += 1;
    else if (src.startsWith('alias')) alias += 1;
    else proc += 1;
    const tris = r.tris === undefined ? '—' : String(r.tris);
    const mb = r.mb === undefined ? '—' : `${r.mb}MB`;
    const skel = r.broken ? 'GLB 不可读' : (r.skins === undefined ? '程序化（无骨骼）' : `${r.skins} / ${r.clips.length}`);
    let tail = '';
    if (verbose && r.roles) {
      const pick = (role) => (r.roles[role] ? r.roles[role].name : '✗');
      tail = `  [${r.clips.join(', ')}] → idle=${pick('idle')} walk=${pick('walk')} run=${pick('run')}`;
    }
    console.log(
      `${r.key.padEnd(11)}${r.n.padEnd(8)}${src.padEnd(16)}${tris.padStart(8)}${mb.padStart(9)}  ${skel}${tail}`,
    );
  }

  console.log(`\n宠物模型：目录 ${Object.keys(PET_CATALOG).length} 个 · 自有 GLB ${own} · alias ${alias} · 程序化 ${proc}`);
  if (problems.length) {
    for (const p of problems) console.log('  ✗ ' + p);
    console.log(`模型库体检失败：${problems.length} 处`);
    process.exit(1);
  }
  console.log('模型库体检通过');
})();
