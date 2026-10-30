#!/usr/bin/env node
/**
 * 静态体检：不启动浏览器也能查出的三类问题
 *   1. import 路径是否存在（拼错就报错，而不是等运行时白屏）
 *   2. 模块依赖是否有环（有环时 const 导入可能在初始化前被读取）
 *   3. 模板里出现的 app.xxx 是否都有 registerActions 声明
 *
 * 用法：node dev/check.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const IMPORT_RE = /^import\s+(?:\{[^}]*\}|\*\s+as\s+[\w$]+|[\w$]+)\s+from\s+['"]([^'"]+)['"]/gm;
const BARE_RE = /^import\s+['"]([^'"]+)['"]/gm;
const REEXPORT_RE = /^export\s+\{[^}]*\}\s+from\s+['"]([^'"]+)['"]/gm;

const files = walk(SRC);
const graph = new Map();
let problems = 0;

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const deps = [];
  for (const re of [IMPORT_RE, BARE_RE, REEXPORT_RE]) {
    re.lastIndex = 0;
    for (const m of src.matchAll(re)) {
      const target = path.resolve(path.dirname(file), m[1]);
      if (!fs.existsSync(target)) {
        console.log('✗ 找不到模块：' + path.relative(ROOT, file) + ' → ' + m[1]);
        problems++;
        continue;
      }
      deps.push(target);
    }
  }
  graph.set(file, deps);
}

/* 环检测（DFS 三色标记） */
const state = new Map();
const stack = [];
function dfs(file) {
  state.set(file, 'gray');
  stack.push(file);
  for (const dep of graph.get(file) || []) {
    const s = state.get(dep);
    if (s === 'gray') {
      const cycle = stack.slice(stack.indexOf(dep)).map((f) => path.relative(SRC, f)).join(' → ');
      console.log('✗ 循环依赖：' + cycle);
      problems++;
    } else if (!s) {
      dfs(dep);
    }
  }
  stack.pop();
  state.set(file, 'black');
}
for (const file of files) if (!state.get(file)) dfs(file);

/* 动作契约：模板里的 app.xxx 必须有注册 */
const registered = new Set();
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/registerActions\([^,]+,\s*\{([^}]*)\}/g)) {
    for (const piece of m[1].split(',')) {
      const name = piece.split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) registered.add(name);
    }
  }
}
const used = new Set();
for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(/app\.([A-Za-z_$][\w$]*)\s*\(/g)) used.add(m[1]);
}
const missing = [...used].filter((n) => !registered.has(n));
if (missing.length) {
  console.log('✗ 未注册的动作：' + missing.join(', '));
  problems++;
}

console.log('\n模块 ' + files.length + ' 个，注册动作 ' + registered.size + ' 个，引用动作 ' + used.size + ' 个');
if (problems) {
  console.log('检查未通过：' + problems + ' 处问题');
  process.exit(1);
}
console.log('CHECK ALL GREEN');
