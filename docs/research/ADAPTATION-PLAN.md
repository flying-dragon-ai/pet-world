# 四个新功能的适配骨架（现状 → 落到哪一层）

> 配套文档：`wheels-pet-body-and-battle.md`（体型 + 打架的 GitHub 轮子）、
> `wheels-ai-chat-and-community.md`（AI chat + 社区发帖的 GitHub 轮子）。
> 本文只讲**你的代码要改哪儿**，轮子清单在上述两份文档里。

## 轮子 → 文件 对照表（抄哪个、放哪儿、多大）

| 轮子 | 许可 | 产物大小（实测） | 落到本项目哪里 | 用于 |
|---|---|---|---|---|
| `tmfilho/akcdata`（数据） | MIT | CSV 319KB → 转成 JS 约 25KB | `src/data/pet-sizes.js` | 品种 → 成年身高/体重/组别/活力/服从 |
| 伤害公式（来自 pokemon-showdown 的**思路**，自己写 10 行） | MIT 思路 | ~15 行 | `src/domain/battle.js` | 战斗结算 |
| 可播种随机数（自写 LCG，抄 showdown 的**模式**） | — | 10 行 | `src/domain/battle.js` | 战斗可复现、可单测 |
| `marked` | MIT | 39,903 字节 | `assets/js/vendor/marked.min.js` | Markdown 渲染（AI 回复 + 帖子正文） |
| `DOMPurify` | Apache-2.0 / MPL-2.0 | 29,828 字节 | `assets/js/vendor/purify.min.js` | XSS 消毒（**必须**） |
| `eventsource-parser` | MIT | 7,802 字节 | `src/vendor/eventsource-parser.js`（ESM） | SSE 分帧，未来接真 LLM 用 |
| `browser-image-compression` | MIT | 57,069 字节 | `assets/js/vendor/` | 发帖配图压缩 |
| `IntersectionObserver` | 原生 API | 0 | 直接写 | 社区列表增量加载 |
| ❌ EasyMDE + CodeMirror | MIT | 501,473 字节 | — | **不抄**，太重 |
| ❌ cannon-es / matter-js | MIT | 346KB+ | — | **不抄**，PRD 不需要 3D 物理 |

> **新增 vendor 文件必须同时改两处**：`index.html` 加 `<script src="assets/js/vendor/xxx.min.js">`，
> 以及 `dev/build.js:181` 的 `copyStatic()` 里 `pairs` 数组加一行——否则 `npm run build` 的 `dist/` 会缺文件。

## 本项目的硬约束（决定轮子能不能抄）

| 约束 | 说明 | 后果 |
|---|---|---|
| 零运行时依赖 | 只有 devDependency jsdom（测试用），自研零依赖打包器 `dev/build.js` | npm 生态的 React/Vue 组件库**不可用**；能用的只有单文件库或纯算法 |
| 原生 ES Module | `src/package.json` = `{"type":"module"}`，线上直接原生跑，零构建 | 轮子要么是原生 ESM，要么按 `three.min.js` 的先例 vendor 成 classic script |
| vendor 目录 | `assets/js/vendor/`，`index.html` 用 `<script src>` 引，`dev/build.js` 的 `copyStatic()` **硬编码白名单** | 新增 vendor 文件必须同时改 `index.html` + `dev/build.js` 的 `pairs` 数组 |
| 分层单向依赖 | `data ← domain ← views ← main`；`domain/` 不碰 DOM/存储 | 规则必须落在 `src/domain/` 并配 `node --test` 单测 |
| 动作注册表 | 模板只写 `onclick="app.xxx()"`，动作在各视图文件末尾 `registerActions` | 新交互不能直接写函数名，`dev/check.js` 会静态校验 |
| 状态两分 | 业务状态进 `store.S`（落盘），瞬时 UI 进 `app/ui-state.js` 的 `ui`（不落盘） | 战斗过程别写进 `S`；聊天草稿别写进 `S` |
| 存档迁移 | `src/data/migrations.js` + `SCHEMA_VERSION`（当前 3） | 任何新字段都要补迁移，否则老存档直接回出厂 |

---

## 一、宠物身高 / 体重 / 体型类型

### 现状

- 宠物档案字段在 `src/data/seed.js`：`species / breed / gender / birth / weight / neuter /
  color / chip / note / important / personality`。
- **只有 p3「尖尖」有 `height:50` 和 `bodyLen:118`**（`seed.js:18`），p1 小可爱、p2 小乐都没有身高。
- `src/views/profile.js:186` 的建档表单只有 `weight` 输入框，**没有 height**。
- 「体型」概念其实已经半存在：`src/views/petwizard.js:51` 的形象向导第 3 步写着
  「花纹·眼型·体型（组合记录）」，三个选项是 `'纯色·圆眼·标准'` / `'斑点·杏眼·偏瘦'` /
  `'条纹·圆眼·圆润'`，但整个字符串塞在 `p.pat` 一个字段里，**体型被和花纹、眼型焊死了**。

### 适配骨架

```
src/data/pet-sizes.js       新增：品种 → { adultWeight:[min,max], height:[min,max], sizeClass }，
                                   以及 sizeClass 枚举（迷你/小型/中型/大型/巨型）
src/domain/pet.js           扩：sizeTypeOf(pet)     体型分级（纯函数）
                            扩：bcsOf(pet)          体况评分 1–9（纯函数）
                            扩：weightForHeight(pet) 身高→体重参考区间
                            扩：growthStageOf(pet)  幼年/成年/老年阶段
src/domain/pet.js           改：把 `pat` 拆成 pattern / eye / build 三个独立字段
src/data/migrations.js       加迁移：老存档补 height（缺则按品种默认值推）、build（缺则 '标准'）
src/data/seed.js            改：p1/p2 补 height / build；dogP3 保持
src/views/profile.js        改：建档表单加「身高 cm」输入 + 体型选择（自动推荐 + 可手改）
src/views/petwizard.js      改：第 3 步「体型」独立成一组 chip，写 p.build（不再拼进 p.pat）
src/views/profile.js        改：档案卡展示「体型类型 · 体况评分」
dev/test/pet.test.js        扩：sizeTypeOf / bcsOf / 迁移补字段的用例
```

**关键取舍**：`体型类型` 可以是「按身高体重自动算」，也可以是「用户手选」。
建议**自动算 + 可手改**（存 `p.sizeType`，自动算的值写进 `p.sizeAuto`），这样：
`build`（胖瘦）用户手选，`sizeType`（大小）系统算，两者语义不冲突。

---

## 二、AI Chat

### 现状

- `src/views/ai.js`（33KB）已经是一个完整聊天 UI：9 个场景 chip、会话切换、流式打字机、
  急症拦截、语音入口、档案上下文注入。
- **回答是本地假数据**：`aiReply(q)` 靠关键词命中拼模板（`ai.js:157-183`），
  `streamReply(q, isEmg)` 用 `setInterval` 每 26ms 吐字（`ai.js:206-235`）。
- 风险词拦截 `RISK_KW`、急症词 `EMG_KW` 硬编码在视图里，**没进 domain，也没有单测**。

### 适配骨架

```
src/domain/ai-prompt.js    新增：buildSystemPrompt(pet, scene)  由档案拼 system prompt
                            新增：RISK_KW / EMG_KW 词表迁过来（迁出 ai.js）
                            新增：composeMessages(sess, prompt)   历史 + 当前轮
src/app/llm.js             新增：唯一的 LLM 出口（网关层）
                            - chatStream({prompt, messages, onDelta, signal})  解析 SSE
                            - 超时 / 重试 / 中断 / 错误码归一
src/views/ai.js            改：streamReply() 保留渲染职责，把 `aiReply()` 换成
                              `llm.chatStream()` 的 onDelta 回调；保留本地假数据兜底
                            改：停止生成按钮接 AbortController（现在只 clearInterval）
src/app/dom.js             改：现在只有 esc()；若接 Markdown 必须加 DOMPurify
assets/js/vendor/          新增：marked(.min).js + purify.min.js
index.html                 改：加两个 <script src>
dev/build.js               改：copyStatic() 的 pairs 数组加两个 vendor 文件
dev/test/ai-prompt.test.js 新增：词表命中、prompt 拼装、风险拦截的用例
```

**最大的坑**：密钥不能进前端。要么走自己的后端代理（Node/边缘函数），要么只接受
「用户自带 Key」并接受它会暴露在浏览器里的风险。**纯前端直连 LLM 会泄露 Key**，
这一条在适配文档里必须有明确结论。

---

## 三、社区发帖

### 现状

- `src/views/community.js`：
  - `renderPublish()`（:173）发帖页：分区 tab + 类型 tab（文字/图文/视频）+ 标题 + 正文 textarea。
  - `pickPubImg()`（:191）配图**只能从固定示例图库里选**，没有真实上传。
  - `aiWrite()`（:200）AI 帮写草稿（本地定时器拼文案）。
  - `pubSubmit()`（:210）写入 `S.posts`，+20 积分 +10 成长值。
  - `renderCommunity()`（:13）**一次性渲染全部帖子**，没有分页/无限滚动。
- 正文渲染用 `esc()`（安全，但没有富文本/Markdown）。

### 适配骨架

```
src/domain/post.js          新增：validatePost(draft)   字数/配图数量/敏感词
                            新增：createPost(draft, me)  生成规范化的帖子对象（纯函数）
src/views/community.js      改：pubSubmit() 改走 domain 的 createPost
                            改：renderPublish() 换 Markdown 编辑器（vendor）
                            改：renderCommunity() 加「加载更多」/ IntersectionObserver 增量渲染
                            改：aiWrite() 改为调 llm.js（复用 AI chat 的同一出口）
assets/js/vendor/           新增：Markdown 编辑器 + 渲染器 + DOMPurify
dev/test/post.test.js       新增：建帖校验、敏感词、点赞幂等的用例
```

**风险**：现在所有展示都走 `esc()`，一旦引入 Markdown 渲染就是新的 XSS 入口，
必须 DOMPurify 兜住；同时 `src/app/dom.js` 的 `esc()` 不能被绕过。

---

## 四、宠物出门打架（家园系统）

### 现状

- PRD §3.2 定义了 12 组二元属性（勇气/胆小、**冲动/稳重**、**攻击/包容**、探索/慵懒…），
  §4.8 写明「冲动且攻击值高 → 「街头大战」事件（战斗任务）」。
- **代码里只有 `courage` 一个二元属性**：`src/domain/world.js:14` `courage: 60`，
  UI 是 `src/views/world-panel.js:139` 的一个滑杆（勇气值/胆小值互补）。
  冲动/攻击/包容**完全没实现**。
- 事件引擎 `pendingEvents(world, worldPet, events)`（`domain/world.js:99`）只支持
  「单值 > 单阈值」：`ev.value(worldPet) > ev.threshold`。**「A 高 且 B 高」这种复合条件
  现在表达不了**，得扩一条 `ev.test(w)` 分支。
- 战功表 `src/data/world-tables.js:84` 只有 1 条事件（蝶舞之约）。
- 3D 自主行为机 `src/views/w3d/ai.js` 的状态枚举是
  `idle / walk / walkShelter / shelter / play / jump / sleep`——**没有 fight 状态**，
  也没有「多宠」「对手 NPC」的概念。

### 适配骨架

```
src/data/battle-tables.js   新增：对手 NPC 库（名字/物种/体型/攻击/韧性/速度/战功文案）
src/data/pet-sizes.js       复用：体型参与战力换算（大型犬 vs 小型猫）
src/domain/battle.js        新增：resolveBattle({mine, foe, rng})  回合结算（纯函数，必须可注入随机数）
                            新增：battleStats(pet, w)   由档案+六维+体型算战力
                            新增：injuryOf(result)      负伤/掉落/战功判定
src/domain/world.js         改：defaultWorldPet() 增 impulse / aggression（+ 兼容旧存档）
                            改：pendingEvents() 支持 ev.test(w) 复合条件
src/data/world-tables.js    改：WORLD_EVENTS 增「街头大战」条目（test: 冲动>60 且 攻击>60）
src/views/world-panel.js    改：加「打架」入口 + 结算弹窗（走 payAndGain / addWorldGrowth）
src/views/w3d/ai.js         改：AI 状态枚举加 fight / 出战状态（宠物走出院门 → 遇敌 → 回院）
src/views/w3d/pet.js        改：加攻击/受击/逃跑动画（playAnim 状态机）
src/data/migrations.js      改：老存档补 impulse / aggression 默认值
dev/test/battle.test.js     新增：结算确定性（同 rng 必同结果）、胜负分支、负伤上限
```

**设计要点**：
1. 战斗结算必须是**纯函数 + 可注入 rng**（本项目的 `clock.now()` 就是这个模式，照抄），
   否则没法单测，也没法复现 bug。
2. 打架是**事件触发的战斗任务**，不是常驻玩法——PRD 里它属于「特定事件与战功系统」，
   所以复用现有的 `WORLD_EVENTS` + `showEventCard` 通路，比新造一个系统更省事。
3. 3D 里做真人对打需要物理引擎（cannon-es 之类），**成本远高于收益**：
   PRD 的落点是「弹窗文字 + 图片结算」（参考旅行青蛙），所以**建议只做 2D 表现，不引入物理库**。

---

## 五、落地排序（按「轮子现成度 × 演示效果 ÷ 风险」排）

| 序 | 做什么 | 用到的轮子 | 新增依赖 | 风险 | 演示效果 |
|---|---|---|---|---|---|
| **1** | **宠物体型类型** | akcdata（数据） | 无 | 极低（纯数据 + 纯函数） | 高（档案卡立刻能显示「中型·偏轻4.5kg」） |
| **2** | **宠物出门打架** | 体型数据 + 伤害公式思路（自写） | 无 | 低（纯函数 + 事件表扩展） | 最高（PRD 点名功能，有战功勋章与结算卡） |
| **3** | **AI Chat 端口化** | marked（可选） | 39.9KB | 低（先把假数据封装成端口，不动 UI） | 中（观感提升，演示能说「已留好真 API 接口」） |
| **4** | **社区发帖增强** | marked + DOMPurify + 图片压缩 | 127KB | 中（引入 Markdown 就必须引入消毒） | 中 |

> **1 和 2 必须连着做**：打架的战力换算要用体型系数，两件事共用 `src/data/pet-sizes.js`。
> **3 和 4 都要接 marked，但只有 4 必须接 DOMPurify**（社区有用户内容；AI 回复是自己生成的，
> 短期内可以不消毒，但建议一起接，省一轮改动）。

### 第一刀具体动作（以「宠物体型类型」为例）

```
1. 下载 akcdata CSV → 写脚本转成 src/data/pet-sizes.js（只留数值，不留 description/temperament 原文）
2. 加中文品种名别名表（akcName ↔ 本项目档案里的中文名，覆盖常见 30 个品种）
3. src/domain/pet.js 加 sizeTypeOf / weightRangeOf / weightDeviation / bcsOf（纯函数）
4. dev/test/pet.test.js 加 4–6 条单测（含「尖尖(金毛,20.5kg) → 偏轻」这条真实用例）
5. src/data/migrations.js 加迁移：老存档补 height / sizeType（缺 height 就按品种默认值推）
6. src/views/profile.js：建档表单加「身高 cm」+ 档案卡展示体型与体况
7. npm run check 全绿
```

**预计改动量**：新增 2 个文件（`src/data/pet-sizes.js`、`dev/test/pet.test.js`），
改 4 个文件（`src/domain/pet.js`、`src/data/migrations.js`、`src/data/seed.js`、`src/views/profile.js`），
不动 `src/app/` 任何基础设施，不动 `dev/build.js`（因为没有新 vendor 文件）。

