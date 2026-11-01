#!/usr/bin/env node
/**
 * 命名导出核对：扫 src/ 下所有静态 import {a, b}，检查目标模块是否真的导出这些名字。
 *
 * 存在的理由：dev/check.js 只查 import 路径与动作契约，不查具名导出，
 * 于是 `import { liveOpen } from './views/live.js'` 里 liveOpen 少个 export 也能"全绿"，
 * 直到浏览器里整站白屏。这个脚本补的就是这一格。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (full.endsWith('.js')) acc.push(full);
  }
  return acc;
}

const cache = new Map();

function exportsOf(file) {
  if (cache.has(file)) return cache.get(file);
  const src = fs.readFileSync(file, 'utf8');
  const names = new Set();
  const decl = /^export\s+(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm;
  for (const m of src.matchAll(decl)) names.add(m[1]);
  const list = /^export\s*\{([^}]*)\}/gm;
  for (const m of src.matchAll(list)) {
    for (const part of m[1].split(',')) {
      const t = part.trim();
      if (!t) continue;
      const alias = t.split(/\s+as\s+/);
      names.add((alias[1] || alias[0]).trim());
    }
  }
  cache.set(file, names);
  return names;
}

let missing = 0;
for (const file of walk(path.join(ROOT, 'src'))) {
  const src = fs.readFileSync(file, 'utf8');
  const imports = /import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of src.matchAll(imports)) {
    const spec = m[2];
    if (!spec.startsWith('.')) continue;
    const target = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(target)) continue;
    const available = exportsOf(target);
    const wanted = m[1]
      .split(',')
      .map((s) => s.trim().split(/\s+as\s+/)[0])
      .filter(Boolean);
    for (const name of wanted) {
      if (available.has(name)) continue;
      console.log(`MISSING ${path.relative(ROOT, file)} -> ${spec} : ${name}`);
      missing += 1;
    }
  }
}

if (missing) {
  console.log(`命名导出核对失败：${missing} 处`);
  process.exit(1);
}
console.log('命名导出核对通过');
