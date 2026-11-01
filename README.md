# 宠物数字管家 · 3D 宠物世界（V1.10.1）

黑客松 Demo：虚拟人宠世界 Web App。竖屏 App 内嵌横屏 three.js 3D 宠物世界（庭院 / 天气 / 自主 AI / 手动互动），
配套学院、打工、商城、战功事件、运动娱乐馆（Lv.30 解锁）、社区、电商、活动组局等完整模块。

**在线访问（GitHub Pages）**：<https://flying-dragon-ai.github.io/pet-world/>

V1.9 是一次完整 rebuild：把原来 19 个按序加载的全局脚本，重构成**分层 ES Module + 动作注册表 + 纯函数领域层**，
并补齐单测与浏览器级冒烟。设计说明见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

V1.10 在 V1.9 的骨架上补了四块业务功能：**宠物身高/体重/体型类型**、**AI Chat（端口化）**、
**社区发帖增强（Markdown 预览 + 图片上传 + 分页）**、**宠物出门打架**。
选型与适配依据见 [`docs/research/`](docs/research/)（三份：轮子调研 ×2 + 适配方案 ×1）。

## 快速开始

```bash
npm install          # 只有 jsdom（测试用）
npm run serve        # http://localhost:8088  （局域网可用 http://<本机IP>:8088/ 手机调试）
```

也可以双击 `index.html` —— 但 `file://` 不允许加载 ES Module，本地演示请先构建一次：

```bash
npm run build        # 产出 dist/（合并成普通 script），再打开 dist/index.html
```

## 命令

| 命令 | 作用 |
|---|---|
| `npm run serve` | 本地静态服务器（含局域网 IP 提示） |
| `npm run build` | 打包到 `dist/`（`bundle.js` + 复制 vendor/css） |
| `npm run check:static` | 静态体检：import 路径 / 循环依赖 / 动作契约 / 具名导出 |
| `npm run check:assets` | 模型库体检：每只宠物 GLB 是否存在、带骨骼、idle/walk/run 都能落位、体积与面数在预算内 |
| `npm test` | 领域单测（node --test）；条数见下方「硬数字」表 |
| `npm run test:smoke` | 构建 + jsdom 冒烟（登录→首页→世界→3D 降级→面板→逐页渲染→存档）；条数见「硬数字」表 |
| `npm run check` | 上面几项全跑 |
| `node dev/balance.mjs` | 打架胜率平衡模拟（三档成长 × 8 个对手） |
| `node dev/gen-pet-sizes.js` | 从 AKC 公开数据集重新生成犬种体型表（`src/data/pet-sizes.js`） |

## 硬数字（实测快照）

> 这张表**只记录快照**，条数会随并行开发漂移（本仓库常年有多个 Agent 同时加测试）。
> 判断真假一律看「来源命令」重跑的结果，不要以本表为准。
> 采集环境：Git Bash / Node 24，仓库根目录；采集时间列写明每次采集的时刻。
>
> **漂移实证**（本文写作的 13 分钟内实测）：模块 61→63、单测 101→163 项、中文品种别名 94→98、
> AI 状态 24→25、磁盘 GLB 12→17 个、模型库体检从「失败 14 处」变成「通过」（09:59 → 10:12）。
> 这不是笔误，是四个 Agent 正在同一个工作区里加东西 —— 所以此表必须带时间戳，并且一定会有
> 「已经过时」的那一刻。

| 指标 | 当前值 | 来源命令 | 采集时间 |
|---|---|---|---|
| 模块数（`src/**/*.js`） | 63 | `node dev/check.js`（首行「模块 N 个」） | 2026-11-01 10:12 |
| 注册动作 / 引用动作 / 未注册 | 269 / 207 / 0 | `node dev/check.js` | 2026-11-01 10:12 |
| 具名导出核对 | 通过 | `node dev/check-exports.js` | 2026-11-01 10:12 |
| 领域单测 | 163 项，0 失败 | `node --test dev/test/*.test.js`（末尾 `ℹ tests/pass/fail`） | 2026-11-01 10:12 |
| jsdom 冒烟 | **由主流程 `npm run check` 复核** | `npm run test:smoke`（本次审计不跑，避免与并行流程抢 `dist/`） | — |
| `bundle.js` 体积 / 模块数 | **由主流程 `npm run check` 复核** | `npm run build`（同上） | — |
| 犬种 / 猫种 / 中文品种别名 | 276 / 29 / 98 | `node -e` 读 `src/data/pet-sizes.js` 的 `BREED_SIZES` / `CAT_SIZES` / `BREED_ALIAS` | 2026-11-01 10:12 |
| 打架对手 NPC | 8 | `node -e` 读 `src/data/battle-tables.js` 的 `BATTLE_FOES` | 2026-11-01 10:12 |
| 战功 / 世界事件 | 8 / 8 | `src/data/world-tables.js` 的 `MEDALS` / `ALL_WORLD_EVENTS` | 2026-11-01 10:12 |
| AI 场景 | 9 | `src/domain/ai-prompt.js` 的 `AI_SCENES` | 2026-11-01 10:12 |
| 3D AI 状态机 | 25 态 | `src/views/w3d/ai.js` 的 `AI` 对象键数 | 2026-11-01 10:12 |
| 宠物模型目录 / 自有 GLB / 程序化 / alias | 22 / 17 / 4 / 1（体检通过） | `node dev/check-assets.js`（该脚本与资产正由并行流程改造） | 2026-11-01 10:11 |
| vendor 文件字节数（three / GLTFLoader / marked / purify） | 603445 / 96550 / 39903 / 29828 | `stat -c '%n %s' assets/js/vendor/*.js` | 2026-11-01 10:12 |
| **最终复核** | | | |

单测按功能拆开（2026-11-01 10:07 采集，`node --test dev/test/<名>.test.js`）：
体型 26 项 / 打架 23 项 / AI 提示词 18 项 / AI 端口 19 项 / 社区发帖 20 项。

> 「最终复核」那一行留给主 Agent：并行收工后跑 `npm run check`，把 6 个会漂的数字（模块 / 动作 /
> 单测 / 冒烟 / bundle / 模型）填进去，并标上新的采集时间。

## 目录

```
index.html                入口（静态骨架 + <script type="module" src="src/main.js">）
src/app/                  基础设施：config / clock / persistence / store / dom / ui / ui-state / actions / router / shell
                          llm（AI 出口端口，唯一一处调模型的地方；含本地后端 + makeSseBackend 真 HTTP 后端工厂）
src/domain/               纯函数规则：pet（家园四维·体型换算）/ world（六维·事件·离线衰减）/ w3d（互动数值·横屏判定）
                          battle（战斗结算）/ ai-prompt（提示词与场景）/ ai-local（本地语料兜底）/ post（发帖校验）
src/data/                 纯数据：seed / migrations / world-tables / w3d-assets / live-rooms
                          pet-sizes（犬种 + 猫体型表）/ battle-tables（原创对手）
src/views/                视图：auth home ai community profile grow monitor mall misc service act petwizard live
                          pets records points / world-state（世界网关） / world-panel（竖屏世界面板）/ battle（打架）
src/views/w3d/            3D 舞台：ctx stage scene weather pet proc-pet ai input hud tick interactions fx
                          chat（3D 内聊天面板）/ events（运行时战功 · 生活事件 · 社区帖事件）
src/vendor/               原生 ESM 单文件库（eventsource-parser，SSE 分帧；跟 module 图走，不进 <script> 白名单）
assets/css/app.css        全部样式
assets/models/pets/       宠物本体 GLB（Hyper3D 生成，带 idle/walk/run 骨骼动画）
                          `src/data/w3d-assets.js` 的 PET_CATALOG 有 22 个目录项，磁盘实况与体积预算
                          以 `node dev/check-assets.js` 为准（无 GLB 的鱼/爬行/蛙/虫走 w3d/proc-pet.js 程序化建模）
                          详见 docs/PET-MODELS.md，体检页 dev/model-check.html?m=<路径>
assets/js/vendor/         three.min.js + GLTFLoader.js（r128）+ marked.min.js（MIT）+ purify.min.js（Apache-2.0）
dev/                      build.js（零依赖打包器）/ check.js（静态体检）/ check-exports.js（具名导出核对）
                          check-assets.js（模型库体检）/ model-check.html（单模型渲染体检）/ smoke.js（jsdom 冒烟）/ serve.js / test/
                          gen-pet-sizes.js（体型表生成）/ balance.mjs（战斗平衡模拟）
docs/                     PRD、3D 世界施工计划、ARCHITECTURE.md、MERGE-V1.7.5.md、research/（轮子调研 + 适配方案）
archive/                  拆分前的完整单文件备份（回滚保险）
```

## 三条约定（读代码前先知道）

1. **模板里的按钮一律写 `app.动作名(...)`**。动作在各自视图文件末尾用 `registerActions` 登记，
   拼错会在控制台明确报「未注册的动作」，`dev/check.js` 也会静态校验，不会静默失灵。
2. **业务状态进 `store.S`（会落盘），瞬时 UI 状态进 `app/ui-state.js` 的 `ui`（不落盘）。**
   除了 `app` 与 `ui` 两个显式出口，没有别的全局变量。
3. **规则写进 `src/domain/`，并且必须配单测**。视图只做「读状态 → 拼模板 → 调一次动作」。

补充两条 V1.10 引入的硬约束：

4. **依赖方向单向**：`data ← domain ← views ← main`。`domain/` 不碰 DOM、不碰存储；`data/` 不许 import `domain/`。
   需要跨层复用的纯函数下沉到 `data/`（例：`breedKeyOf` 放在 `src/data/pet-sizes.js`）。
5. **第三方库只走 vendor 白名单**：`assets/js/vendor/` + `index.html` 的 `<script src>` + `dev/build.js` 的
   `copyStatic()` `pairs` 数组，**三处必须同步**，漏一处线上就 404。运行时不经 CDN。
   原生 ESM 的单文件库走另一条路：放 `src/vendor/`，作为普通模块被 `import`，**不**进上面那三处。

## V1.10 新增功能速览

| 功能 | 入口 | 主要文件 |
|---|---|---|
| 身高 / 体重 / 体型类型 | 建档表单 + 宠物档案 | `src/data/pet-sizes.js`、`src/domain/pet.js`、`src/views/profile.js` |
| 宠物出门打架 | 家园面板「出门打架」磁贴 | `src/domain/battle.js`、`src/data/battle-tables.js`、`src/views/battle.js` |
| AI Chat | 首页 AI 入口 | `src/app/llm.js`、`src/domain/ai-prompt.js`、`src/domain/ai-local.js` |
| 社区发帖增强 | 社区发帖 | `src/domain/post.js`、`src/views/community.js` |

几点实现口径：

- **体型类型不落盘**：按「体重 ÷ 品种标准体重」自动判定迷你/小型/中型/大型/巨型，用户手选的只有「体格 build」。
- **BCS 体况评分是近似估算**，按体重与品种标准中点的比值线性映射，UI 上已标明不替代兽医触诊。
- **战斗结算是纯函数 + 可注入 rng**（`makeRng` 自写 LCG），同 seed 必同结果，因此可单测、可复现。
- **AI 是端口不是实现**：`src/app/llm.js` 是唯一出口，默认后端是本地语料（离线可演示）；
  `setLlmBackend(fn)` 可换成真模型，`makeSseBackend({endpoint, fetchImpl})` 是「真 HTTP + SSE」的现成后端工厂
  （超时 / 重试 / 中断 / 错误码归一，错误码只有 `timeout|aborted|upstream|parse` 四种）。
  纯静态托管撑不住服务端代理，所以**默认不联网**；API Key 绝不能进前端。
- **Markdown 渲染统一收口**在 `src/app/dom.js` 的 `mdToHtml()`：`marked` 解析 → `DOMPurify` 消毒，vendor 缺失时退回转义。

## 3D 游戏玩法对齐《虚拟宠物家园》

3D 世界的玩法按仓库根目录的参考实现 `虚拟宠物家园小游戏(1).html`（2D 治愈风单文件小游戏）重做了一遍：
互动数值、自主行为、台词、HUD、四季、挂机衰减、家园主题 / 宠物外观 / 院子家具、8 枚战功、3D 内聊天、社区帖联动，
全部按 2D 版的口径落地；**六维与二元属性的存档口径不动**，2D 版的六性格由现有数据派生（不落盘）。
完整映射表见 [`docs/PLAY-3D-V1.10.md`](docs/PLAY-3D-V1.10.md)。

| 2D 小游戏 | 3D 世界 |
|---|---|
| 喂食 / 洗澡 / 抚摸 / 陪玩 / 躺躺 / 进屋 / 聊天 | 底部七个按钮 + 院子躺垫 + 小屋门 + 聊天面板 |
| idleBehavior 自主行为 | AI 状态机（态数见下方「硬数字」表），台词与阈值逐条镜像 |
| 四维挂机流逝 | 每 5 秒结算的在线衰减（速率一致） |
| 春夏秋冬 | 季节索引（7 天一季）→ 春花 / 秋叶 / 冬雪 |
| 主题 / 家具 / 外观 | 家园页三个分区，改完立刻体现在 3D 院子里 |
| 8 枚战功 | 4 枚登录判定 + 4 枚运行时触发 |
| 帖子 → 家园事件 | 社区发帖后宠物会有反应 |

## 3 分钟 Demo 动线

首页磁贴「人宠世界」→ 加载屏 → 横屏 3D 庭院（拖转视角 / 点宠物抚摸 / 七个按钮互动 / 点躺垫让它躺下 / 点小屋进屋 / 点建筑进面板）
→ 学院上课 → 打工赚金币A → 商城购物 → 战功墙（第 5 天勇气>50% 触发「蝶舞之约」）
→ 社区发帖 +10 成长值 → Lv.30 解锁运动 / 娱乐馆 → 家园面板「出门打架」打一场街头遭遇战。

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 分层、依赖方向、扩展指南、与旧版对照
- [`docs/DELIVERY-V1.10.md`](docs/DELIVERY-V1.10.md) — V1.10 交付状态、铁律的机器可查证据、验收清单回执
- [`docs/MERGE-V1.7.5.md`](docs/MERGE-V1.7.5.md) — 外部 V1.7.5 合并记录（首页磁贴口径：健康管理 / 成长记录）
- [`docs/research/ADAPTATION-PLAN.md`](docs/research/ADAPTATION-PLAN.md) — 四个新功能的选型与落地适配方案
- [`docs/research/wheels-pet-body-and-battle.md`](docs/research/wheels-pet-body-and-battle.md) — 体型数据 / 战斗公式的 GitHub 轮子调研
- [`docs/research/wheels-ai-chat-and-community.md`](docs/research/wheels-ai-chat-and-community.md) — AI Chat / 社区发帖的 GitHub 轮子调研
- [`docs/PLAY-3D-V1.10.md`](docs/PLAY-3D-V1.10.md) — 3D 游戏玩法对齐《虚拟宠物家园》的映射表与数值对照
- `docs/虚拟人宠世界模块PRD(1).md` — 模块需求
- `docs/PLAN-3D宠物世界V1.8.md` — 3D 世界施工计划（含模型清单与假设）
