#!/usr/bin/env node
/**
 * 生成 src/data/pet-sizes.js 里的 BREED_SIZES 块（犬种成年身高/体重参考表）。
 *
 * 用法：node dev/gen-pet-sizes.js
 *
 * 数据源：https://github.com/tmfilho/akcdata （MIT License）
 *   → data/akc-data-latest.csv
 *   → 277 个犬种，含成年身高区间(cm)、体重区间(kg)、AKC 组别、活力值、服从性。
 *   AKC 原表单位是英寸/磅，抓取时已换算为 cm / kg。
 *
 * 本脚本只做两件事：
 *   1. 解析 CSV；
 *   2. 替换 src/data/pet-sizes.js 里 AUTO-GEN 标记之间的内容。
 * 其余内容（猫表、中文别名、阈值）手工维护，不会被覆盖。
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'src', 'data', 'pet-sizes.js');
const CSV_URL = 'https://raw.githubusercontent.com/tmfilho/akcdata/master/data/akc-data-latest.csv';
const BEGIN = '/* AUTO-GEN:BEGIN */';
const END = '/* AUTO-GEN:END */';

/** AKC 组别 → 中文 */
const GROUP_CN = {
  'Toy Group': '玩具犬',
  'Hound Group': '猎犬',
  'Sporting Group': '运动犬',
  'Terrier Group': '梗犬',
  'Working Group': '工作犬',
  'Herding Group': '牧羊犬',
  'Non-Sporting Group': '非运动犬',
  'Foundation Stock Service': '基础犬系',
  'Miscellaneous Class': '其他',
};

/** 标准 CSV 解析：处理引号内的逗号与换行 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; continue; }
        inQuote = false;
        continue;
      }
      field += c;
      continue;
    }
    if (c === '"') { inQuote = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

/** 0.2–1.0 的活力/服从 → 0–100 */
const pct = (v) => {
  const n = num(v);
  if (n === null || n <= 0) return null;
  return Math.round(n * 100);
};

/**
 * 下载 CSV。
 * Node 只在**进程启动时**读 NODE_USE_ENV_PROXY（内置 fetch 与 http/https 都受它影响），
 * 所以「绕过代理直连」必须换一个新进程：
 *   1. 先用 fetch 走环境里的代理（代理可用时命中）；
 *   2. fetch 失败 → 派生一个 NODE_USE_ENV_PROXY=0 的子进程直连重试。
 */
async function download(url) {
  if (process.env.PET_SIZES_DIRECT === '1') return directGet(url);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    console.warn(`  ! 走代理失败（${e.message}），派生直连子进程重试`);
    const { spawnSync } = require('child_process');
    const r = spawnSync(process.execPath, [__filename], {
      env: Object.assign({}, process.env, { NODE_USE_ENV_PROXY: '0', PET_SIZES_DIRECT: '1' }),
      stdio: 'inherit',
    });
    process.exit(r.status === null ? 1 : r.status);
  }
}

function directGet(url, redirects = 5) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(directGet(res.headers.location, redirects - 1));
        return;
      }
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let out = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { out += c; });
      res.on('end', () => resolve(out));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  const text = await download(CSV_URL);
  const rows = parseCsv(text);
  const header = rows[0];
  const at = (name) => header.indexOf(name);

  const iHMin = at('min_height'), iHMax = at('max_height');
  const iWMin = at('min_weight'), iWMax = at('max_weight');
  const iGroup = at('group'), iEnergy = at('energy_level_value'), iTrain = at('trainability_value');
  if ([iHMin, iHMax, iWMin, iWMax, iGroup].some((i) => i < 0)) {
    throw new Error(`CSV 表头不符合预期：${header.join(',')}`);
  }

  const lines = [];
  const skipped = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const breed = (row[0] || '').trim();
    if (!breed) continue;
    const hMin = num(row[iHMin]), hMax = num(row[iHMax]);
    const wMin = num(row[iWMin]), wMax = num(row[iWMax]);

    // 数据体检：AKC 抓取偶尔把别的品种的身高区间混进来。
    // 判定要保守——吉娃娃/腊肠犬的 12.7cm 下限是真实的（AKC 最小 5 英寸），
    // 只有「下限异常小 + 跨度离谱」或「超过 90cm」才是串行。
    const bad = [];
    if (hMin === null || hMax === null) bad.push('身高缺失');
    else if (hMax < hMin) bad.push(`身高区间倒挂 ${hMin}-${hMax}cm`);
    else if (hMax > 90) bad.push(`身高上限反常 ${hMax}cm`);
    else if (hMax / hMin > 2.2 && hMin < 20) bad.push(`身高疑似串行 ${hMin}-${hMax}cm`);
    if (wMin !== null && wMax !== null && wMax < wMin) bad.push(`体重区间倒挂 ${wMin}-${wMax}kg`);
    if (bad.length) { skipped.push(`${breed}：${bad.join('、')}`); continue; }

    const energy = pct(row[iEnergy]), train = pct(row[iTrain]);
    const arr = [
      hMin,
      hMax,
      wMin === null || wMin <= 0 ? 'null' : wMin,
      wMax === null || wMax <= 0 ? 'null' : wMax,
      JSON.stringify(GROUP_CN[(row[iGroup] || '').trim()] || '其他'),
      energy === null ? 'null' : energy,
      train === null ? 'null' : train,
    ];
    lines.push(`  ${JSON.stringify(breed)}: [${arr.join(', ')}],`);
  }

  const body = [
    `${BEGIN}`,
    `  // 格式：[身高下限cm, 身高上限cm, 体重下限kg, 体重上限kg, 组别中文, 活力0-100, 服从0-100]`,
    `  // null = 该字段原始数据缺失。共 ${lines.length} 个犬种。`,
    ...lines,
    END,
  ].join('\n');

  if (!fs.existsSync(TARGET)) throw new Error(`目标文件不存在：${TARGET}`);
  const src = fs.readFileSync(TARGET, 'utf8');
  const i = src.indexOf(BEGIN);
  const j = src.indexOf(END);
  if (i < 0 || j < 0) throw new Error(`在 ${TARGET} 里找不到 AUTO-GEN 标记`);
  const out = src.slice(0, i) + body + src.slice(j + END.length);
  fs.writeFileSync(TARGET, out, 'utf8');
  console.log(`✓ BREED_SIZES 已更新：${lines.length} 个犬种 → ${path.relative(ROOT, TARGET)}`);
  if (skipped.length) {
    console.log(`  ⚠ 跳过 ${skipped.length} 条数据体检不通过的记录：`);
    skipped.forEach((s) => console.log('    - ' + s));
  }
}

main().catch((e) => {
  console.error('✗ 生成失败：' + e.message);
  process.exit(1);
});
