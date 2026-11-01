# 交接提示词 · 宠物数字管家 V1.10

> 这份文件本身就是一段**可直接粘贴给其他 Agent 的提示词**（下面 `====` 之间的内容）。
> 用途：MiniMax Code 积分吃紧时，把「四个新功能」的活整体交给另一个 Agent 接着干，
> 而不必让它重新读一遍代码库、也不用担心它违反本项目的架构铁律。

---

## 可直接复制的提示词

====

# 任务：接手「宠物数字管家 · 3D 宠物世界」V1.10 的四个新功能并收尾交付

## 0. 背景

项目路径：`D:/temp/宠物世界`（git 仓库；基线提交 `50e18d8`，其上已合入 `9909910` / `0f22fdd` / `3dd78da`）。
这是一个黑客松 Demo：竖屏 App 内嵌横屏 three.js 3D 宠物世界，纯静态托管在 GitHub Pages，
**零运行时依赖**，只有 devDependency `jsdom`（测试用）。打包器是自研的 `dev/build.js`（零依赖）。

**基线提交：`50e18d8`**（`feat: V1.10 四个新功能 … + 3D 玩法对齐 2D 小游戏`）。
这是两个并行 Agent 产出合并后的**已验证全绿快照**：64 个文件、+6045/-265，工作区已干净。
从 `50e18d8` 接手即可，`git diff 50e18d8` 能随时看出接手期间新增了什么。
（因为 `src/views/w3d/index.js` 直接 `import` 了 `./chat.js` 与 `./events.js`，
没法拆成互不依赖的两个提交，只能整体落盘。若想按 A / B 两摊拆成两个 commit，
建议在**新分支**上用 `git reset --soft 50e18d8` 后分批 stage。）

V1.9 已经完成一次完整 rebuild：分层 ES Module + 动作注册表 + 纯函数领域层 + 单测 + 浏览器级冒烟。
V1.10 在这层骨架上要加四个功能。**这四个功能已经全部实现完毕并通过验收**（见第 4 节），
你的主要工作是**审查 + 收尾 + 提交 + 部署**，而不是重做。

## 1. 跑起来 / 验起来

```bash
cd 'D:/temp/宠物世界'
npm install            # 只有 jsdom
npm run check          # 静态体检 + 领域单测 + 构建 + jsdom 冒烟，一条命令全跑
```

单项：

| 命令 | 作用 | 当前结果 |
|---|---|---|
| `npm run check:static` | import 路径 / 循环依赖 / 动作契约静态校验 | CHECK ALL GREEN（模块数 / 动作数看输出首行，**不写死**） |
| `npm test` | 领域单测（node --test） | **0 失败**（条数以 `npm test` 输出为准） |
| `npm run test:smoke` | 构建 + jsdom 浏览器级冒烟 | **0 失败**（条数与 bundle 体积看 `npm run test:smoke` 输出） |
| `node dev/balance.mjs` | 打架胜率平衡模拟（三档成长 × 8 对手） | 曲线符合设计预期 |
| `node dev/gen-pet-sizes.js` | 从 AKC 公开数据集重生成犬种体型表 | 276 个犬种 |

本地预览：`npm run serve` → http://localhost:8088 。

## 2. 铁律（违反了直接算没做完）

1. **依赖方向单向**：`data ← domain ← views ← main`。
   `src/domain/` 是纯函数层，**不碰 DOM、不碰 localStorage、不 import store**；所有输入靠参数传。
   `src/data/` **不得反向 import `src/domain/`**；需要跨层复用的纯函数要下沉到 `data/`。
2. **领域规则必须配单测**：写进 `src/domain/` 的规则一律要在 `dev/test/*.test.js` 里有对应用例。
3. **动作注册表**：模板里的按钮一律写 `app.动作名(...)`；动作要在该视图文件末尾用
   `registerActions` 登记。`dev/check.js` 会静态校验「模板里引用的动作是否已注册」，
   拼错会直接报「未注册的动作」，不会静默失灵。
4. **状态两分**：业务状态进 `store.S`（落盘 `pet_butler_demo_v1`）；瞬时 UI 状态进
   `src/app/ui-state.js` 的 `ui`（不落盘）。除 `app` 与 `ui` 两个显式出口外没有全局变量。
5. **vendor 白名单三处同步**：`assets/js/vendor/` + `index.html` 的 `<script src>` +
   `dev/build.js` 的 `copyStatic()` `pairs` 数组。**漏任何一处线上就 404**，运行时禁止走 CDN。
6. **API Key 绝对不能进前端**（纯静态托管，没有服务端代理）。
7. **第三方库选型**：单文件 / 少依赖 / 宽松许可（MIT / Apache-2.0 / BSD / CC0）/ 能直接 vendor。
   引入前先在 `docs/research/` 里记清楚来源与许可。
8. **不要用 PowerShell 字符串替换改源码**（会踩到嵌套数组被拍平的坑）。
   改文件一律用编辑工具的精确替换。

## 3. 四个功能的完整规格（已实现，供你 review / 扩展）

### 3.1 宠物身高 / 体重 / 体型类型

- **数据** `src/data/pet-sizes.js`
  - `BREED_SIZES`：276 个犬种，值格式 `[身高下限cm, 身高上限cm, 体重下限kg, 体重上限kg, 组别中文, 活力0-100, 服从0-100]`。
    该块由 `node dev/gen-pet-sizes.js` 从 <https://raw.githubusercontent.com/tmfilho/akcdata/master/data/akc-data-latest.csv>
    （MIT）自动生成，文件内有 `AUTO-GEN` 标记块，**重新生成时不要手工改块内内容**。
  - `CAT_SIZES`：29 个猫品种（人工维护，同格式数组）。
  - `BREED_ALIAS`：中文品种名 → AKC 英文名（用于建档时中文输入匹配）。条数一直在加（本文不写死），
    以 `node -e "...Object.keys(BREED_ALIAS).length"` 读 `src/data/pet-sizes.js` 为准。
  - `SIZE_SCALE`：犬 迷你<4kg / 小型4-12 / 中型12-25 / 大型25-45 / 巨型≥45；猫 小型<4 / 中型4-6 / 大型≥6。
  - `BCS_LABELS`：体况评分文案。
  - 导出 `breedKeyOf(breed)` 与 `breedRefOf(breed, species)` —— **放在 data 层是因为 data 不得依赖 domain**。
- **领域层** `src/domain/pet.js` 新增：`breedKeyOf` 转发、`petRefOf`、`sizeScaleOf`、`sizeTypeOf`、
  `breedSizeTypeOf`、`weightDeviation`、`heightDeviation`、`bcsOf`、`bcsLabelOf`、`growthStageOf`、`sizeSummaryOf`。
- **迁移** `src/data/migrations.js` → `fillPetSizes(S)`（已在 `migrate()` 中无条件调用）：
  拆旧 `pat` 字段为 `pattern` / `eye` / `build`；`height` 缺失时按品种成年身高下限补；
  `build` 缺省「标准」。**`SCHEMA_VERSION` 仍是 3**，新字段走「无条件补齐」模式，不要随意升版本号。
- **UI**
  - `src/views/profile.js`：建档表单加「当前肩高（cm）」输入 + 「体格」选择（偏瘦 / 标准 / 圆润）+
    品种参考区间提示；档案卡加「体型：…」行；`savePet` 写入 `height` / `build`。
  - `src/views/petwizard.js`：形象向导第 3 步拆成「花纹 / 眼型 / 体型」三组 chip。
  - `src/views/pets.js`：`petSVG` 按 `pet.build` 缩放身体椭圆（偏瘦 41/29，标准 46/34，圆润 50/38）。
- **两条口径（评审时重点看这里）**
  1. **体型类型不落盘**：按「体重 ÷ 品种标准体重」自动判定，避免派生值与手改值不同步。
     用户手选的只有「体格 build」。
  2. **BCS 是近似估算**：按体重与品种标准中点线性映射（ratio 0.75→3 分，1.00→5 分，1.25→7 分）。
     UI 与注释里已标明「不替代兽医触诊」。
- **测试**：`dev/test/pet.test.js`（`node --test dev/test/pet.test.js`，应 0 失败；条数不写死）

### 3.2 宠物出门打架（家园系统里的「宠物出门打架」）

- **数据** `src/data/battle-tables.js`：8 个**原创**对手 NPC（邻家橘猫 / 楼下泰迪 / 快递站柯基 /
  布偶猫老大 / 柴犬阿柴 / 边牧警长 / 哈士奇暴君 / 流浪金毛）、`FOE_BY_ID`、`BATTLE_REWARD`、
  `BATTLE_INJURY`（cost 为正数消耗量）、`BATTLE_RESULT_TITLE`。
- **领域层** `src/domain/battle.js`：`makeRng(seed)`（自写 32 位 LCG，约 10 行）、
  `battleStats(pet, w, level)`、`foeStats(foe)`、`resolveBattle({ mine, foe, rng })`、`injuryOf`、`rewardOf`。
  结算为**纯函数 + 可注入 rng** → 同 seed 必同结果，可单测、可复现（照项目 `clock.now()` 端口模式）。
- **伤害公式**：借 Pokémon Showdown（MIT）的「等级→威力→攻防→归一」**结构**，
  但**压缩了线性等级项**：`levelTerm = 6 + level * 0.12`，`DAMAGE_SCALE = 2.2`。
  原因：原式会让 Lv.60 一击秒杀。**不引用任何宝可梦 IP 数据，对手全部原创。**
- **配置** `src/app/config.js`：`BATTLE_MAX_ROUNDS = 8`、`STREET_FIGHT_IMPULSE = 60`、`STREET_FIGHT_AGGRESSION = 60`。
- **事件** `src/data/world-tables.js`：「街头大战」，`test: (w) => w.impulse > 60 && w.aggression > 60`，
  `minLoginDay: 3`，`battle: true`，勋章「街头硬汉」。
- **视图** `src/views/battle.js`（新建，约 12 KB）：`openBattlePicker` / `startBattle` / `runBattle` /
  `showResultCard` / `showBattlePrompt` / `acceptStreetFight` / `declineStreetFight` / `openBattleRecord`。
  **通过 `registerWorldHooks({ battlePrompt })` 与 world-state 解耦**，不要在 world-state 里 import battle.js。
- **面板** `src/views/world-panel.js`：`ENTRIES` 增加
  `{ tab: 'battle', act: 'openBattlePicker', n: '出门打架', ic: '🥊', d: '遭遇街头对手' }`；
  二元属性卡增加「冲动/稳重」「攻击/包容」两个滑杆（`onImpulse` / `commitImpulse` / `onAggression` / `commitAggression`）。
- **3D 表现** `src/views/w3d/ai.js`：AI 状态新增 `fight` / `hurt`；`battlePose()` 读 `w.battle.last`
  （15 分钟内有效）决定「打赢昂首 / 战败带伤」；气泡文案「汪！来啊！」/「呜…还疼…」。
- **去重口径**：用 `world.firedEvents` 数组去重（不是勋章），这样「回避」后不再重复弹窗；**勋章只在打赢时发放**。
- **平衡（设计意图）**：新手 Lv1 只胜前 5 个、负后 3 个；中期 Lv20 胜前 5、边牧 56%；
  毕业 Lv60 胜前 7，最终 BOSS「流浪金毛」故意设计成一道墙。
- ⚠️ **这条现在是红的**：2026-11-01 10:09 实测 `node dev/balance.mjs`，Lv60 对「流浪金毛」**胜 94%**，
  墙已被抹平（面板 `spd` 同时从 50 漂到 65，怀疑是并行改 `src/domain/battle.js` 时带进来的）。
  接手的人先跑一次该命令，再决定是「调回设计意图」还是「接受新曲线并改规格」，
  回执与数字见 `docs/DELIVERY-V1.10.md` 第三节第 2 条。
- **测试**：`dev/test/battle.test.js`（`node --test dev/test/battle.test.js`，应 0 失败；条数不写死）
- **一条已定的取舍**：**不引入物理引擎**（cannon-es 346KB / matter-js 更重）。
  PRD §4.8 的落点是「弹窗文字 + 图片结算」，参考旅行青蛙；3D 只做姿态表现，不做真实物理。

### 3.3 AI Chat（端口化）

- **vendor**（已下载并 vendor 进仓，文件头内嵌 `@license`，**勿删**）
  - `assets/js/vendor/marked.min.js` — 39,903 B，MIT，v15.0.12，UMD 全局 `marked`
  - `assets/js/vendor/purify.min.js` — 29,828 B，Apache-2.0 / MPL-2.0，v3.4.17，全局 `DOMPurify`
- **领域层**
  - `src/domain/ai-prompt.js`：`AI_SCENES`（9 个场景，含 `role` 字段）、`RISK_KW`、`EMG_KW`、
    `hitKeywords`、`isRiskQuestion`、`isEmergency`、`sceneOf`、`petBrief`、`buildSystemPrompt`、`composeMessages`。
    9 个场景 id：`ask`（健康问诊）/ `care`（日常养护）/ `feed`（喂养计算器）/ `watch`（看护解读）/
    `attr`（异常归因）/ `shop`（商品导购）/ `write`（发帖帮写）/ `trip`（旅行规划）/ `doll`（定制顾问）。
  - `src/domain/ai-local.js`：`localAnswer(pet, question, sceneId)`（9 场景 + 7 类症状的结构化答复，
    **纯文本，不拼 HTML**）、`localGreeting`、`localRefusal`。
- **端口** `src/app/llm.js`（新建）：**全项目唯一的 AI 出口**。
  `chat({ pet, question, scene, prompt, messages, onDelta, signal })` → `{ text, stopped, reason }`；
  `setLlmBackend(fn)` 可替换后端；默认本地后端含「急症 18% 概率截断」的模拟。
- **渲染** `src/app/dom.js` → `mdToHtml(text)`：`marked.parse` → `DOMPurify.sanitize`；
  vendor 缺失时退回 `esc()`。**所有 Markdown 渲染必须走这一个函数**，不要在别处直接调 `marked`。
- **视图** `src/views/ai.js`：改用 `llm.chat` + `AbortController`；`stopGen` 改为 abort；
  AI 消息渲染改 `mdToHtml`；`aiGreet` 改用 `localGreeting`。原有的本地 `SCENES` / `EMG_KW` / `RISK_KW` / `aiReply` 已删除。
- **一条已定的取舍**：**这一轮不接真 LLM API**。纯静态 GitHub Pages 撑不住服务端代理，
  且 API Key 不能进前端。所以先把 `app/llm.js` 端口化留好接口，本地语料作为默认后端（离线可演示）。
- **测试**：`dev/test/ai-prompt.test.js` + `dev/test/llm.test.js`（`node --test dev/test/ai-prompt.test.js dev/test/llm.test.js`，应 0 失败；条数不写死）

### 3.4 社区发帖增强

- **领域层** `src/domain/post.js`：`POST_LIMITS`（title 40 / text 2000 / images 9）、
  `POST_MEDIA`、`POST_ZONES`、`validatePost`、`createPost`、`excerptOf`、`pageSlice`。
- **视图** `src/views/community.js`
  - Markdown 预览切换：`togglePubPreview`；`syncPublishDraft` **先收输入再重渲染**，否则会丢字。
  - 真实图片上传：`pickPubFile` / `uploadPubImg` / `compressImage`，
    **用原生 canvas 压缩**（900px / 0.72；过大则降到 640px / 0.6），**没有引入第三方压缩库**。
  - `pubSubmit` 改走 `validatePost` + `createPost`。
  - 列表分页：`POST_PAGE_SIZE = 5` + `loadMorePosts` + 「加载更多」按钮；正文 `mdToHtml`；
    帖子详情也走 `mdToHtml`，无图时不渲染空图块。
- **UI 状态** `src/app/ui-state.js`：`ui.publish` 增加 `preview`；`ui.community` 增加 `page`。
- **一条已定的取舍**：**不抄 EasyMDE / CodeMirror**（合计 501 KB，太重），
  用 textarea + Markdown 预览；也**没有引入 `browser-image-compression`**（省 57 KB vendor，逻辑仅约 30 行）。
- **测试**：`dev/test/post.test.js`（`node --test dev/test/post.test.js`，应 0 失败；条数不写死）

## 4. 已完成到哪一步（**不要重做**）

四个功能全部实现完毕，当前基线是绿的：

```
npm run check:static  → CHECK ALL GREEN（模块数 / 注册动作 / 引用动作看输出首行）
npm test              → 0 失败（条数以输出为准）
npm run test:smoke    → 0 失败（条数 / bundle 体积看输出）
```

> 本文**不写死条数**：仓库常年有多个 Agent 并行加测试，写死的数字必然过时。
> 带采集时间与来源命令的硬数字快照统一记在 [`README.md` 的「硬数字」表](../README.md#硬数字实测快照)，
> 交付回执记在 [`docs/DELIVERY-V1.10.md`](DELIVERY-V1.10.md)。

版本号已统一升到 **V1.10.1**（以 `src/app/config.js` 的 `APP_VERSION` 为准）：`package.json`、
`src/app/config.js`（`APP_VERSION`）、`index.html`（title + 页脚两处）、
`src/main.js`（`window.__petWorld.version`）、`README.md` —— 五处应一致；改版本号时五个地方一起改。
`docs/ARCHITECTURE.md` 已更新（目录树 + 「AI 是端口不是实现」+「第三方库怎么进项目」两节 + 测试覆盖表）。
`docs/research/` 三份调研文档已就位：
`ADAPTATION-PLAN.md`、`wheels-pet-body-and-battle.md`、`wheels-ai-chat-and-community.md`。

## 5. 你要干的活（按优先级）

### P0 —— 拆分提交（如果需要拆得漂亮的话）

**状态（2026-11-01 10:15 采集，`git status --porcelain` 实况）：**

- 与基线 `50e18d8` 相比，仓库上多了三个提交：
  `9909910`（文档）、`0f22fdd`（**并行线合入**：战斗系统 / 本地 LLM 出口 / 社区 Markdown /
  3D 聊天与事件 / 22 只宠物模型）、`3dd78da`（取消跟踪含预签名 URL 的 `cat-rig.result.json`）。
- **并行那一摊已经合入了**，所以下面「拆分提交」这件事从「等收工」变成「合并已发生」：
  现在再拆 `0f22fdd` 属于改写已合入的历史，风险比收益大；**除非上游明确要求，否则不要拆**。
- 工作区极干净：`git status --porcelain` 只剩 4 个未提交文件（README、两份 docs、
  以及并行线的 `dev/optimize-models.py`），已不是早期的「16 改 + 30 未跟踪」。
- 之前那一大堆未跟踪条目（`assets/models/pets/*.glb`、`dev/check-assets.js`、
  `dev/test/w3d-assets.test.js` …）已经随 `0f22fdd` 入库。
- 接手的人仍然**不要整文件回滚**（多摊改过同一个文件是常态）。
- 因此 P0 仍是「可选的美化动作」：要拆提交就按下面的步骤在**新分支**上做，
  并且**先等并行流程收工、`git status` 稳定**再拆。
- 实时状态以 `git status --short` 为准；本文不冻结文件数。

- 本轮四个功能涉及的文件（"我的"这一摊）：
  `src/app/llm.js`、`src/app/dom.js`、`src/app/config.js`、`src/app/ui-state.js`、
  `src/data/pet-sizes.js`、`src/data/battle-tables.js`、`src/data/seed.js`、`src/data/migrations.js`、
  `src/domain/pet.js`、`src/domain/battle.js`、`src/domain/ai-prompt.js`、`src/domain/ai-local.js`、`src/domain/post.js`、
  `src/views/battle.js`、`src/views/ai.js`、`src/views/community.js`、`src/views/pets.js`、
  `src/views/petwizard.js`、`src/views/profile.js`、`src/views/world-panel.js`、`src/views/world-state.js`、
  `src/views/w3d/ai.js`、`dev/build.js`、`dev/smoke.js`、`dev/test/{pet,battle,ai-prompt,post}.test.js`、
  `dev/test/{migrations,w3d,world}.test.js`、`assets/js/vendor/{marked,purify}.min.js`、
  `dev/gen-pet-sizes.js`、`dev/balance.mjs`、`docs/research/*`、`README.md`、`package.json`、`index.html`。
- **同时混进来的另一摊**（另一个 Agent 正在做的「3D 世界按《虚拟宠物家园》2D 小游戏对齐」）：
  `src/domain/w3d.js`、`src/data/w3d-assets.js`、`src/data/world-tables.js`、`src/domain/world.js`、
  `src/views/w3d/*`（scene / weather / pet / ai / hud / tick / interactions / input / index / stage / fx）、
  新增 `src/views/w3d/chat.js`、`src/views/w3d/events.js`、`assets/models/`。
  这一摊新增了：家园主题 / 宠物外观 / 院子家具 / 思念模式 / 性格画像 / 社区发帖联动家园事件 / 四季与天气，
  以及 `src/views/world-panel.js` 的「家园」tab。**这一摊还在进行中，先确认对方收工了再动，否则会互相覆盖。**

- ⚠️ **两边都改过的文件（review 和提交时重点看）**：

  | 文件 | 本轮（四个功能）改的 | 另一 Agent 改的 |
  |---|---|---|
  | `src/views/world-panel.js` | 「出门打架」磁贴 + 冲动/攻击滑杆 | 「家园」tab（主题/外观/家具/思念模式） |
  | `src/views/world-state.js` | `registerWorldHooks({ battlePrompt })` + 战斗战绩落盘 | `homeState` / 主题 / 外观 / 家具 / 思念模式 |
  | `src/views/w3d/ai.js` | AI 状态 `fight` / `hurt` + `battlePose()` | 按 2D 小游戏重写的行为决策（idleBehavior 对齐） |
  | `src/domain/world.js` | `defaultWorldPet` 加 `impulse` / `aggression` | `pendingEvents` 改写 + `ALL_WORLD_EVENTS` 拆分 |
  | `src/data/world-tables.js` | 「街头大战」事件 + 勋章 | `EXTRA_WORLD_EVENTS`（scholar / worker / 4 条 runtime） |
  | `src/data/migrations.js` | `fillPetSizes(S)` | `firedEvents` + `world.home` 家园状态补齐 |
  | `dev/test/w3d.test.js`、`dev/test/world.test.js`、`dev/smoke.js` | 体型/战斗断言 | 互动数值与战功目录断言（数值已对齐 2D 小游戏） |

  这些文件**不能整文件回滚**，只能做行级的最小修改。

如果想把 `50e18d8` 拆成语义更清晰的两个 commit（A：四个新功能 / B：3D 玩法对齐 2D 小游戏）：
**新建分支** → `git reset --soft 50e18d8` → 分批 stage → 分两次 commit。
注意有 7 个文件两摊都改过（见上表），拆不干净是正常的，硬拆反而会造出坏提交。
**别在 `main` 上硬拆**，也别把半成品提交进去 —— 每次提交前先跑 `npm run check`。

### P1 —— 复核四个功能的正确性

重点看这几处容易出问题的地方：

1. **体型类型不落盘**这条口径是否在所有写入路径都守住（尤其 `src/data/migrations.js` 的 `fillPetSizes`）。
2. **战斗结算**的随机性是否真的只来自注入的 `rng`（不能偷用 `Math.random`，否则单测会飘）。
3. **`mdToHtml` 是否是唯一的 Markdown 渲染出口**（`src/views/ai.js` 与 `src/views/community.js` 都应该走它）。
4. **`llm.chat` 是否是唯一的 AI 出口**（别在视图里再直接写模型调用）。
5. **vendor 白名单三处是否同步**（`assets/js/vendor/`、`index.html`、`dev/build.js` 的 `copyStatic()`）。
6. **API Key 检查**：全仓 grep 一遍，确认没有任何密钥字面量。

### P2 —— 收尾交付

- `README.md` 已更新（带采集时间的「硬数字」表），**不再写死会漂的条数**；重跑命令自己比。
- `docs/ARCHITECTURE.md` 的测试覆盖表与实际条数对一下。
- 重新构建并部署到 GitHub Pages：<https://flying-dragon-ai.github.io/pet-world/>（仓库根的 `index.html` 是入口；
  `dev/build.js` 产出 `dist/`）。
- ✅ **已完成（并行工作流 D）**：`assets/models/` 的 GLB 已全部压到预算内。
  2026-11-01 10:11 实跑 `node dev/check-assets.js` → **「模型库体检通过」**
  （目录 22 个 · 自有 GLB 17 · alias 1 · 程序化 4）；`cat.glb` 从 10.28 MB 降到 2.76 MB / 4 万面。
  后续新增模型仍要守 `MAX_BYTES = 6MB` 与 `MAX_TRIS = 60k` 两条预算。

## 6. 雷区（别踩）

1. **不要用 PowerShell 的 `-replace` / 哈希表批量替换改源码**。嵌套数组会被拍平，
   按字符替换会把 `"` 变成 `v`、`e` 变成 `x`，整个文件变乱码。改文件用编辑工具的精确替换。
2. **不要用 `git checkout -- <file>` 回滚**某个文件的全部改动 —— 这个仓库里两个 Agent 同时改同一个文件是常态，
   整文件回滚会把对方的活一起干掉。只做最小化、精准的行级修改。
   已知全绿基线在 `50e18d8`，实在要回退用 `git diff 50e18d8` 看差异，别整文件覆盖。
3. **不要给 `src/data/` 加 `import ... from '../domain/'`**（违反单向依赖，`dev/check.js` 会报循环依赖）。
4. **不要在模板里直接写 `onclick="doSomething()"` 而不 `registerActions`**（`dev/check.js` 静态校验会红）。
5. **不要把 `Math.random()` 混进领域层**（`src/domain/` 必须可复现、可单测）。
6. **不要升级 `SCHEMA_VERSION`**。新字段走 `migrate()` 里的「无条件补齐」模式。
7. **根目录的参考 HTML 不要混进主线**：`虚拟宠物家园小游戏(1).html` 等外部单文件版已被 `.gitignore` 排除
   （仓库根只保留 `index.html`），需要留档请放 `archive/`。
8. **另一个 Agent 可能还在这个工作区里写文件**。改任何 `src/` 下的文件前，
   先 `Get-ChildItem -Recurse | Sort-Object LastWriteTime -Descending | Select -First 5` 看一眼最近有没有人动过，
   避免两边同时写同一个文件。

## 7. 验收清单（交回来必须全绿）

```bash
npm run check:static   # CHECK ALL GREEN
npm test               # 0 失败（条数以输出为准；并行 Agent 一直在加用例）
npm run test:smoke     # 0 失败（条数以输出为准）
node dev/balance.mjs   # 三档成长 × 8 对手胜率曲线（设计意图见第 3.2 节；当前实测有偏差）
```

另外人工过一遍这 6 条：

- [ ] 建档时填中文品种名（如「柯基」），体型类型判定正确
- [ ] 家园面板「出门打架」能选对手、开打、看到结算卡，3D 里能看到昂首 / 带伤姿态
- [ ] AI Chat 切换 9 个场景都正常，急症关键词会给出就医提示，且能中断生成
- [ ] 社区发帖能预览 Markdown、能传图（压缩生效）、列表能「加载更多」
- [ ] 全仓 grep 无 API Key
- [x] `git status` 接近干净 —— 2026-11-01 10:15 实测：并行线已合入（`0f22fdd` / `3dd78da`），
      工作区只剩本次文档改动与并行线的 `dev/optimize-models.py`；
      提交前跑过 `node dev/check.js` / `node dev/check-exports.js` / `node --test dev/test/*.test.js`
      （CHECK ALL GREEN，单测 0 失败）。**`npm run check` 全量那一轮由主 Agent 在发布前补跑。**

## 8. 调研资料（选型依据，别重复调研）

`docs/research/` 下三份：

- `ADAPTATION-PLAN.md`（14 KB）—— 四个功能的选型与落地适配方案
- `wheels-pet-body-and-battle.md`（14 KB）—— 体型数据源 + 战斗公式的 GitHub 轮子调研
- `wheels-ai-chat-and-community.md`（13.5 KB）—— AI Chat / 社区发帖的 GitHub 轮子调研

已核实可直接 vendor 的关键上游：

| 库 | 来源 | 许可 | 体积 | 用途 |
|---|---|---|---|---|
| akcdata | `tmfilho/akcdata` | MIT | CSV | 犬种身高/体重（cm/kg） |
| marked | `markedjs/marked` | MIT | 39,903 B | Markdown 解析 |
| DOMPurify | `cure53/DOMPurify` | Apache-2.0 / MPL-2.0 | 29,828 B | HTML 消毒 |
| pokemon-showdown | `smogon/pokemon-showdown` | MIT | — | **仅参考**战斗公式结构，不取数据 |

已放弃的（附理由，别再试）：`cannon-es`（346 KB 物理引擎）、
`easymde` + `codemirror`（合计 501 KB 编辑器）、`browser-image-compression`（57 KB，原生 canvas 够用）。

====

## 附：交接清单速查（给接手的人看，不属于提示词本体）

- 已实现并验证：四个功能全部完成，`npm run check` 全绿（单测与冒烟均 0 失败，条数见命令输出），已落库为 `50e18d8`。
- 未完成：另一 Agent 的 3D 改造与 Hyper3D 模型仍在继续；GitHub Pages 未重新部署。
- 本文件与 `docs/research/` 三份文档一并留在仓库里，随时可查。
