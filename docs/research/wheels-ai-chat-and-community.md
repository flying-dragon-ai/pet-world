# GitHub 轮子调研（二）：AI Chat + 社区发帖

> 调研日期：2026-11-01 · 方法：GitHub REST API 搜索 + 逐个打开仓库真实文件读源码 + CDN 实测产物体积
> 所有体积数字都是对 **jsDelivr 上的实际发布产物** 做 HEAD 请求拿到的 `Content-Length`，
> 所有全局变量名都实际拉了文件头确认过。
> 适配到本项目哪一层见 [`ADAPTATION-PLAN.md`](ADAPTATION-PLAN.md)。

---

## 结论速览

| 主题 | 判断 |
|---|---|
| **AI Chat 前端** | ✅ 抄 **3 个小文件**：`marked.min.js`（39,903 字节，MIT）、`purify.min.js`（29,828 字节，Apache-2.0/MPL-2.0）、`eventsource-parser` 的 `index.js`（7,802 字节，MIT）。三个加起来 **77 KB**，正好卡在「能 vendor 进 assets/js/vendor/」的量级。 |
| **接真 LLM API 的架构** | ⚠️ 抄 `ChatGPTNextWeb/NextChat`（MIT，★88,929）的**代理路由设计**，不抄它的 React 代码。它把上游调用放在服务端路由 `app/api/[provider]/[...path]/route.ts`（2,735 字节）——**API Key 绝不能进前端**。 |
| **社区发帖** | ✅ 抄 `marked` + `DOMPurify`（同上两个）；配图压缩可抄 `browser-image-compression`（57,069 字节，MIT）。**Markdown 编辑器不要抄**：`EasyMDE` 需要 `easymde.min.js` 327KB + `codemirror.min.js` 174KB = **501KB**，对现在这个体量的 Demo 太重。 |
| **无限滚动** | ✅ 不用轮子，原生 `IntersectionObserver` 即可（0 字节）。 |

---

## 一、AI Chat

### 1.1 ✅ `markedjs/marked`（MIT，★37,278）—— Markdown 渲染

- 仓库：https://github.com/markedjs/marked · 许可：MIT（已读 `LICENSE` 原文确认）
- **产物体积实测**：`https://cdn.jsdelivr.net/npm/marked@15/marked.min.js` → **39,903 字节**
- **全局变量实测**（拉文件头确认）：`(function(g,f){if(typeof exports=="object"&&typeof module<…` → UMD，
  用 classic `<script>` 加载后全局是 **`marked`**。

```html
<!-- 直接 vendor 进 assets/js/vendor/marked.min.js -->
<script src="assets/js/vendor/marked.min.js"></script>
<script>
  document.getElementById('postBody').innerHTML = marked.parse(mdText);
</script>
```

> 注意：marked **不做 XSS 消毒**，必须配 DOMPurify（见下）。这是本项目引入 Markdown 的硬前提。

### 1.2 ✅ `cure53/DOMPurify`（Apache-2.0 / MPL-2.0，★17,500）—— XSS 消毒

- 仓库：https://github.com/cure53/DOMPurify · **产物体积实测**：
  `https://cdn.jsdelivr.net/npm/dompurify@3/dist/purify.min.js` → **29,828 字节**（文件内标注版本 3.4.17）
- **全局变量实测**（拉文件头确认）：`/*! @license DOMPurify 3.4.17 | (c) Cure53 and other contributors |
  Released under the Apache license 2.0 and Mozilla Public License 2.0 */` → 全局是 **`DOMPurify`**。

```html
<script src="assets/js/vendor/purify.min.js"></script>
<script>
  document.getElementById('postBody').innerHTML = DOMPurify.sanitize(marked.parse(mdText));
</script>
```

**本项目的特别提醒**：现在 `src/app/dom.js` 的 `esc()` 是唯一防线，模板里逐处调用。
一旦引入 Markdown 渲染，`esc()` 就**挡不住**了（Markdown 渲染产生的是 HTML 而非纯文本）。
→ **`DOMPurify.sanitize()` 必须紧跟在 `marked.parse()` 后面，一步都不许省。**

### 1.3 ✅ `rexxars/eventsource-parser`（MIT，★516）—— SSE 解析

- 仓库：https://github.com/rexxars/eventsource-parser · **产物体积实测**：
  `https://cdn.jsdelivr.net/npm/eventsource-parser@3/dist/index.js` → **7,802 字节**
- **API 实测**（拉文件头确认）：v3 导出 `createParser(config)`，config 里挂 `onEvent` / `onError` / `onRetry` 等回调，
  是**流式**解析器（喂 `ReadableStream` 的 chunk，不是整包字符串）。

```js
import { createParser } from './vendor/eventsource-parser.js';   // 改写为 ESM 导出即可
const parser = createParser({
  onEvent: (e) => { if (e.data) onDelta(e.data); },
  onError: (e) => console.error('SSE 解析出错', e),
});
const reader = res.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  parser.feed(decoder.decode(value, { stream: true }));
}
```

> **7.8KB 换掉手写 SSE 分帧**是本轮性价比最高的轮子。
> 注意：这个包发的是 ESM（`dist/index.js` 是 ESM 导出），本项目 `src/` 已经是 ESM，
> 但 `assets/js/vendor/` 走 classic `<script>`——**要么改写成 classic 版（挂 `window.EventSourceParser`），
> 要么直接放 `src/vendor/` 作为 ESM 引入**。两种都行，后者更省事。

### 1.4 ⚠️ `ChatGPTNextWeb/NextChat`（MIT，★88,929）—— 架构参考，不抄代码

- 仓库：https://github.com/ChatGPTNextWeb/NextChat · 许可：MIT · TypeScript / Next.js
- **形态不匹配**：React + Next.js，本项目是原生 ES Module + 拼模板。**代码一行都搬不过来。**

**但有三份文件值得当「设计说明书」读（路径已实测存在）：**

| 文件 | 大小 | 抄什么 |
|---|---|---|
| `app/api/[provider]/[...path]/route.ts` | 2,735 字节 | **服务端代理路由**：浏览器只跟自己的后端说话，Key 存在服务端环境变量 |
| `app/utils/stream.ts` | 3,078 字节（109 行） | 流式读取 + 中断的处理骨架 |
| `app/store/chat.ts` | 28,351 字节 | 会话状态机：新建/切换/重命名/删除/消息增删 |

**`app/utils/stream.ts` 实测片段（已读原文）：**

```ts
// 1. invoke('stream_fetch', {url, method, headers, body}), get response with headers.
// 2. listen event: `stream-response` multi times to get body
    headers: Record<string, string>;
    signal,
    headers: _headers = {},
    if (signal) {
      signal.addEventListener("abort", () => close());
    }
```

**对本项目的直接结论：**

1. **API Key 不能放前端**。前端 bundle 里的任何东西对每个用户都是明文可见的——
   这是「代码要发到浏览器」这一事实的直接推论，不依赖任何外部文档。
   NextChat 的整个 `app/api/[provider]/...` 目录（实测 20+ 个 provider 路由）就是为此存在的。
2. **落地路径二选一**：
   - **(A) 自建代理**（推荐）：本项目现在是纯静态 + GitHub Pages，没后端。
     要接真 API 就得加一个极薄的 serverless（Cloudflare Worker / Vercel Edge），
     只做一件事：转发 `/v1/chat/completions` 并注入 Key。
   - **(B) 用户自带 Key（BYOK）**：用户在设置里填自己的 Key，存在 localStorage。
     **代价是必须向用户说清楚：这个 Key 会保存在本机浏览器里**。
   - **(C) 继续用现在的本地假数据**：这是当前状态，零风险，Demo 完全够用。
     本轮调研的结论是：**真接 API 不是这一轮的必要条件**（见 §一·2.3）。
3. **本项目现有的流式渲染不用重写**：`src/views/ai.js:206` 的 `streamReply()`
   已经是一个标准的「先插气泡 → 逐字填 `#stTxt` → 结束后移除」结构，
   把 `setInterval` 换成 SSE 的 `onDelta` 回调即可，`stopGen()` 换成 `AbortController.abort()`。

### 1.5 ❌ 其他候选（已排除）

| 仓库 | 许可/★ | 排除原因 |
|---|---|---|
| `lobehub/lobehub` | 许可显示 NOASSERTION / ★83,646 | React + 完整后端生态，形态完全不匹配；且许可字段不明确 |
| `markdown-it/markdown-it` | MIT / ★22,023 | 同样能用，但 marked 更小（39.9KB vs markdown-it 约 100KB+），且 marked 官方明确支持 UMD 单文件 |
| `ueberdosis/tiptap` | MIT / ★38,918 | 仓库 89MB，ProseMirror 依赖链重，与「拼模板」风格冲突 |
| `quilljs/quill` | BSD-3-Clause / ★47,377 | 富文本编辑器（不是 Markdown），与「拼字符串模板」不兼容 |

---

## 二、社区发帖

### 2.1 ✅ 可直接抄

| 轮子 | 许可 | 产物体积（实测） | 用在哪 |
|---|---|---|---|
| `marked` | MIT | 39,903 字节 | 帖子正文 Markdown 渲染 |
| `DOMPurify` | Apache-2.0 / MPL-2.0 | 29,828 字节 | 渲染后消毒（**必须**） |
| `Donaldcwl/browser-image-compression` | MIT / ★1,721 | `dist/browser-image-compression.js` **57,069 字节** | 发帖配图：本地压缩 + 预览 |
| `addyosmani/squish` | MIT / ★1,048 | 仓库 135KB（未单独实测产物） | 备选压缩方案，体积更小 |

- `browser-image-compression` 仓库：https://github.com/Donaldcwl/browser-image-compression

**现状对照**：`src/views/community.js:191` 的 `pickPubImg()` 只能从 4 张写死的 Unsplash 示例图里选。
接上压缩库后，可以改成：`<input type="file" accept="image/*">` → FileReader 预览 →
canvas 压缩到目标大小 → 转 dataURL 存进 `S.posts[].img`（本项目 `S.posts` 本来就存 dataURL/URL 字符串，
**数据结构不用改**）。

### 2.2 ❌ Markdown 编辑器：不要抄

| 候选 | 许可/★ | 产物体积（实测） | 判断 |
|---|---|---|---|
| `Ionaru/easy-markdown-editor`（EasyMDE） | MIT / ★3,092，2026-08 仍在更新 | `easymde.min.js` **327,475** + `codemirror.min.js` **173,998** = **501,473 字节** | ❌ 太重 |
| `sparksuite/simplemde-markdown-editor` | MIT / ★10,139，2024-06 后停更 | 同量级 | ❌ 同上且已归档 |
| `jbt/markdown-editor` | ISC / ★2,869，2020 停更 | — | ❌ 停更 |
| `outline/rich-markdown-editor` | BSD-3 / ★2,938 | React + ProseMirror | ❌ 形态不符 |

**替代方案（0 额外字节）**：发帖页保留现在的 `<textarea id="pubTxt">`，
加一个「预览」按钮 → `DOMPurify.sanitize(marked.parse(text))` 渲染到预览区。
输入体验先不升级，等社区真有人用再说。
> 参照：本项目 `src/views/community.js:181-182` 现在就是两个原生 `<input>` / `<textarea>`，
> 加个预览 Tab 是最小改动。

### 2.3 ✅ 无限滚动：不用轮子

`IntersectionObserver` 是浏览器原生 API（0 字节、0 许可问题）。
现在 `renderCommunity()`（`community.js:13`）是**一次性 `posts.map()` 全量渲染**——
种子数据量小无所谓，但发帖多了会卡。加一个「加载更多」按钮（同样用 `IntersectionObserver` 触发）即可。

---

## 三、四个主题的「要不要现在做真 API」结论

| 问题 | 结论 |
|---|---|
| AI Chat 现在要不要接真模型？ | **不要在这一轮接。** 现在 `src/views/ai.js` 的本地假数据 + 打字机 + 9 场景 + 急症拦截，作为黑客松 Demo 已经能完整演示「AI 助手」的产品形态。接真 API 会引入：后端代理、Key 管理、SSE 兼容、错误重试、费用控制——工作量是「加轮子」的 10 倍。 |
| 但要**为真接留好接口** | 这一轮就把 `aiReply()` 抽成 `src/app/llm.js` 的一个端口：<br>`llm.chat({prompt, messages, onDelta, signal})` → 默认实现是本地假数据（把现在的 `aiReply` 搬进去），未来换实现不动视图。 |
| 社区发帖要不要接 Markdown？ | **可以接**，因为轮子只要 70KB 且是纯前端。但**必须同时接 DOMPurify**，否则是给自己开 XSS 漏洞。 |
| 社区发帖要不要接真实图片上传？ | **可以接**，57KB 的压缩库足够；数据结构（`S.posts[].img` 存字符串）不用改。 |

---

## 四、风险与许可

1. **DOMPurify 是双许可**（Apache-2.0 / MPL-2.0），两个都可以满足本项目的分发方式；
   vendor 进 `assets/js/vendor/` 时**必须保留文件头的 `@license` 注释**（min 版已内嵌，别手贱删）。
2. **marked 是 MIT**，min 版文件头已含 `Copyright (c) 2011-2025, Christopher Jeffrey. (MIT Licensed)`，保留即可。
3. **`assets/js/vendor/` 是硬编码白名单**：`dev/build.js:181` 的 `copyStatic()` 里 `pairs` 数组
   逐个列出了要复制的文件，`index.html` 里也要逐个加 `<script src>`。
   **新增任何 vendor 文件，两个地方都要改**，否则 `npm run build` 产出的 `dist/` 会缺文件。
4. **体积账**：marked 39.9KB + DOMPurify 29.8KB + eventsource-parser 7.8KB + browser-image-compression 57KB
   ≈ **135KB**（未压缩前）。相对现有 `three.min.js` 603KB + `GLTFLoader.js` 96KB ≈ 700KB，属于同一量级，可接受。
   **但如果只做 Markdown 显示，其实只需要 marked + DOMPurify 两个（70KB）。**
5. **供应链**：这些库只从 jsDelivr 取一次产物、放进仓库本地目录，**运行时不经任何 CDN**——
   与本项目 `three.min.js` 的既有做法一致，不会因为上游发新版而突然变更行为。

---

## 五、没有找到 / 证据不足

1. **轻量、MIT、零依赖的「Markdown 预览 + 输入」组件**（带工具栏/快捷键且 < 50KB）——不存在。
   便宜的编辑器（EasyMDE/SimpleMDE）都要捆绑 CodeMirror，合计 500KB。
   → 结论：先用 textarea + 预览，不引编辑器。
2. **纯前端的 LLM API 代理方案**（能在 GitHub Pages 这种纯静态托管上直接跑的）——未找到。
   GitHub Pages 没有服务端，任何真 API 调用都必须另找托管（Cloudflare Workers / Vercel / 自建）。
   → 结论：接真模型 = 本项目从「纯静态」升级为「静态 + 一个 serverless」。
3. **社区 feed 的「游标分页 + 虚拟滚动」成熟零依赖实现**——不需要轮子，`IntersectionObserver` 足够。
4. **中文分词/敏感词过滤库**——未调研。本项目「先审后发」目前是 toast 演示态；
   若要真做，GitHub 上有多个成熟中文敏感词库，但那是独立课题，不在本次四主题范围内。
