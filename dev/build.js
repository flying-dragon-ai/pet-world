#!/usr/bin/env node
/**
 * 零依赖打包器：src/*.js（ES Module）→ dist/bundle.js（单个 classic script）。
 *
 * 为什么需要它：GitHub Pages 走 https，直接跑 ES Module；但"双击 index.html"
 * 是 file:// 协议，浏览器拒绝加载 module，所以额外产出一份合并版给本地演示。
 *
 * 支持的语法子集（遇到别的写法直接报错退出，绝不静默产出坏包）：
 *   import { a, b as c } from './x.js'   → const { a, b: c } = __require('x.js')
 *   import * as ns from './x.js'         → const ns = __require('x.js')
 *   import './x.js'                      → __require('x.js')
 *   export { a } from './x.js'           → 先 __require 再转出
 *   export { a, b as c }                 → exports.a / exports.c
 *   export function f(){}                → function f(){} + 顶部 exports.f = f（函数提升）
 *   export const/let/var v               → 声明 + 顶部 getter（跨模块只读，循环依赖安全）
 * 不支持：export default、export *、动态 import。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const ENTRY = path.join(SRC, 'main.js');
const DIST = path.join(ROOT, 'dist');

const IMPORT_RE = /^import\s+(\{[\s\S]*?\}|\*\s+as\s+[\w$]+|[\w$]+)\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm;
const BARE_IMPORT_RE = /^import\s+['"]([^'"]+)['"];?[ \t]*$/gm;
const REEXPORT_RE = /^export\s+(\{[^{}]*?\})\s+from\s+['"]([^'"]+)['"];?[ \t]*$/gm;
const LOCAL_EXPORT_LIST_RE = /^export\s*\{([^}]*)\}\s*;?[ \t]*$/gm;
const EXPORT_FUNCTION_RE = /^export\s+(async\s+)?function\s+([\w$]+)/gm;
const EXPORT_VAR_RE = /^export\s+(const|let|var)\s+([\w$]+)/gm;

function fail(message) {
  console.error('打包失败：' + message);
  process.exit(1);
}

/** './x.js' + 当前文件 → src 下的规范路径（模块 id） */
function resolveId(fromFile, request) {
  if (!request.startsWith('.')) fail('不支持的裸模块引用：' + request + '（' + fromFile + '）');
  const resolved = path.resolve(path.dirname(fromFile), request);
  if (!resolved.startsWith(SRC)) fail('引用越出 src：' + request);
  if (!fs.existsSync(resolved)) fail('找不到模块：' + request + '（被 ' + path.relative(ROOT, fromFile) + ' 引用）');
  return resolved;
}

function moduleId(file) {
  return path.relative(SRC, file).split(path.sep).join('/');
}

/** 把 `{ a, b as c }` 拆成 ['a', 'b: c']，用于 require 解构 */
function destructureBindings(clause) {
  return clause
    .replace(/[{}]/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [from, to] = s.split(/\s+as\s+/).map((x) => x.trim());
      return to ? from + ': ' + to : from;
    });
}

/** 收集 import / export，产出 CommonJS 风格的模块函数体 */
function transform(file, source) {
  const id = moduleId(file);
  const exportStatements = [];
  let code = source;

  if (/^\s*export\s+default/m.test(code)) fail(id + ' 使用了 export default（本项目统一具名导出）');
  if (/^\s*export\s+\*/m.test(code)) fail(id + ' 使用了 export *（请显式列出）');

  /* export { a } from './x.js' —— 必须先于本地导出列表处理 */
  let reexportSeq = 0;
  code = code.replace(REEXPORT_RE, (whole, clause, request) => {
    const depId = moduleId(resolveId(file, request));
    const list = clause.replace(/[{}]/g, '').split(',').map((s) => s.trim()).filter(Boolean);
    list.forEach((piece) => {
      const [local, alias] = piece.split(/\s+as\s+/).map((x) => x.trim());
      // 惰性 getter：循环依赖时也能拿到最终值
      exportStatements.push(
        "Object.defineProperty(exports, '" + (alias || local) + "', { get: function () { return __require('" + depId + "')['" + local + "']; }, enumerable: true, configurable: true });",
      );
    });
    return '';
  });

  /* import ... from '...' */
  code = code.replace(IMPORT_RE, (whole, clause, request) => {
    const depId = moduleId(resolveId(file, request));
    if (/^\{[\s\S]*\}$/.test(clause.trim())) {
      return "const { " + destructureBindings(clause).join(', ') + " } = __require('" + depId + "');";
    }
    const ns = clause.match(/^\*\s+as\s+([\w$]+)$/);
    if (ns) return "const " + ns[1] + " = __require('" + depId + "');";
    fail(id + ' 使用了默认导入（请改成具名导入或 * as）：' + clause.trim());
    return whole;
  });

  /* 同一模块里重复导入同名符号是 ESM 早期错误，提前给出可读报错 */
  const importedNames = new Map();
  for (const m of code.matchAll(/^import\s+\{([^}]*)\}\s+from/gm)) {
    for (const piece of m[1].split(',')) {
      const name = piece.split(/\s+as\s+/)[0].trim();
      if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
      if (importedNames.has(name)) {
        fail(id + ' 重复导入符号 ' + name + '（第 ' + importedNames.get(name) + ' 行与此处）');
      }
      importedNames.set(name, code.slice(0, m.index).split('\n').length);
    }
  }

  /* import './x.js' */
  code = code.replace(BARE_IMPORT_RE, (whole, request) => {
    return "__require('" + moduleId(resolveId(file, request)) + "');";
  });

  /* export { a, b as c }（本地） */
  code = code.replace(LOCAL_EXPORT_LIST_RE, (whole, list) => {
    list.split(',').map((s) => s.trim()).filter(Boolean).forEach((piece) => {
      const [local, alias] = piece.split(/\s+as\s+/).map((x) => x.trim());
      exportStatements.push("Object.defineProperty(exports, '" + (alias || local) + "', { get: function () { return " + local + '; }, enumerable: true, configurable: true });');
    });
    return '';
  });

  /* export function */
  code = code.replace(EXPORT_FUNCTION_RE, (whole, asyncKw, name) => {
    exportStatements.push("exports['" + name + "'] = " + name + ';');
    return (asyncKw || '') + 'function ' + name;
  });

  /* export const/let/var → getter，循环依赖时不至于读到 undefined */
  code = code.replace(EXPORT_VAR_RE, (whole, kind, name) => {
    exportStatements.push(
      "Object.defineProperty(exports, '" + name + "', { get: function () { return " + name + '; }, enumerable: true, configurable: true });',
    );
    return kind + ' ' + name;
  });

  const leftover = code.split('\n').find((line) => /^\s*(import|export)\s/.test(line));
  if (leftover) fail(id + ' 残留未处理的 import/export：' + leftover.trim());

  // 语法自检：模块体单独编译一次，坏模块当场点名，不留到浏览器里白屏
  const body = exportStatements.join('\n') + '\n' + code;
  try {
    new Function(body);
  } catch (e) {
    fail(id + ' 语法错误：' + e.message);
  }

  // 函数声明会提升，导出赋值放最前面也能拿到引用
  return body;
}

const modules = new Map();

function collect(file) {
  const id = moduleId(file);
  if (modules.has(id)) return id;
  modules.set(id, ''); // 先占位，避免循环依赖无限递归
  const source = fs.readFileSync(file, 'utf8');
  modules.set(id, transform(file, source));
  const deps = [];
  const addDeps = (re) => {
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) deps.push(moduleId(resolveId(file, m[m.length - 1])));
  };
  addDeps(IMPORT_RE);
  addDeps(BARE_IMPORT_RE);
  addDeps(REEXPORT_RE);
  deps.forEach((depId) => collect(path.join(SRC, depId)));
  return id;
}

function emit() {
  const parts = [
    '(function () {',
    "'use strict';",
    'var __defs = {};',
    'var __cache = {};',
    'function __require(id) {',
    '  if (__cache[id]) return __cache[id].exports;',
    '  var def = __defs[id];',
    "  if (!def) throw new Error('[bundle] 未打包的模块：' + id);",
    '  var mod = { exports: {} };',
    '  __cache[id] = mod;',
    '  def(mod, mod.exports, __require);',
    '  return mod.exports;',
    '}',
  ];
  for (const [id, body] of modules) {
    parts.push("__defs['" + id + "'] = function (module, exports, __require) {");
    parts.push(body);
    parts.push('};');
  }
  parts.push("__require('" + moduleId(ENTRY) + "');");
  parts.push('})();');
  return parts.join('\n');
}

function copyStatic() {
  const pairs = [
    ['assets/css/app.css', 'assets/css/app.css'],
    ['assets/js/vendor/three.min.js', 'assets/js/vendor/three.min.js'],
    ['assets/js/vendor/GLTFLoader.js', 'assets/js/vendor/GLTFLoader.js'],
    ['assets/js/vendor/marked.min.js', 'assets/js/vendor/marked.min.js'],
    ['assets/js/vendor/purify.min.js', 'assets/js/vendor/purify.min.js'],
  ];
  for (const [from, to] of pairs) {
    const target = path.join(DIST, to);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(ROOT, from), target);
  }
  // 宠物本体 GLB 是一堆文件，按目录整拷（名字与 src/data/w3d-assets.js 的 MODEL() 对应）
  const modelsFrom = path.join(ROOT, 'assets/models/pets');
  const modelsTo = path.join(DIST, 'assets/models/pets');
  if (fs.existsSync(modelsFrom)) {
    fs.mkdirSync(modelsTo, { recursive: true });
    let copied = 0;
    for (const name of fs.readdirSync(modelsFrom)) {
      if (!name.endsWith('.glb')) continue;
      fs.copyFileSync(path.join(modelsFrom, name), path.join(modelsTo, name));
      copied += 1;
    }
    console.log('宠物模型：' + copied + ' 个 .glb → dist/assets/models/pets');
  }
}

function buildHtml() {
  const source = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const withBundle = source.replace(
    /<script type="module" src="src\/main\.js"><\/script>/,
    '<script src="bundle.js"></script>',
  );
  if (withBundle === source) fail('index.html 里找不到 <script type="module" src="src/main.js">');
  return withBundle;
}

function main() {
  if (!fs.existsSync(ENTRY)) fail('缺少 src/main.js');
  collect(ENTRY);
  fs.mkdirSync(DIST, { recursive: true });
  fs.writeFileSync(path.join(DIST, 'bundle.js'), emit());
  fs.writeFileSync(path.join(DIST, 'index.html'), buildHtml());
  copyStatic();
  const size = fs.statSync(path.join(DIST, 'bundle.js')).size;
  console.log('✓ dist/bundle.js  ' + (size / 1024).toFixed(1) + ' KB · ' + modules.size + ' 个模块');
  console.log('✓ dist/index.html（可直接双击打开）');
}

main();
