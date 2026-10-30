# Rebuild 记录 · V1.8.1 → V1.9

按「好代码的特性 / 设计原则 / 怎么写」三条清单逐项落地。每条都给**可验证的证据**，
不是形容词。命令统一为 `npm run check`。

## 一、好代码的七个特性

### 可读性
- 命名换掉了缩写与占位：`S` 仍是状态（沿用旧名，减少改动面），但 `attrDeltaStr`（其实是 HTML）→ `attrDeltaHTML`、
  `attrDeltaTxt`（其实是文本）→ `attrDeltaText`、`neg` → `negate`、`confirmDlg` → `confirmDialog({title, body, onOk, style})`、
  `fmtTs` → `formatRelativeTime`、`addPts` → `awardPoints(n, source)`、`pet*` 系列保留、`WCOURSES/WJOBS/WGOODS/WVENUES/WNAMES`
  → `COURSES/JOBS/GOODS/VENUES/ATTR_NAMES`。
- 每个模块开头都有「这个文件负责什么、不负责什么」的说明；`src/views/w3d/` 十个文件各管一件事
  （句柄 / 生命周期 / 场景 / 天气 / 宠物 / AI / 输入 / HUD / 帧循环 / 交互）。
- 证据：`src/views/w3d/stage.js` 168 行只做进出场与布局；`tick.js` 110 行只做每帧推进。

### 可维护性
- 依赖方向单向：`data ← domain ← views ← main`，`app/` 是最底层。`dev/check.js` 静态检查 import 路径与**循环依赖**，
  当前 50 个模块 0 环。
- 改一处不牵动全身：世界数值改动只碰 `domain/world.js`（规则）+ `data/world-tables.js`（数值）；
  3D 互动数值只碰 `domain/w3d.js` 的 `MANUAL_ACTIONS`。
- 模板里的按钮统一 `app.动作名(...)`，动作集中登记；改名/删除会立刻被 `dev/check.js` 与冒烟测试抓到。

### 简洁性（KISS）
- 没有引入框架、状态库、构建工具链：仍是「模板字符串 + 原生 DOM」，只是分层清楚。
- 打包器 `dev/build.js` 零依赖 190 行，只支持项目用到的语法子集，遇到不支持的写法直接报错退出，不静默产坏包。

### 可扩展性（开闭原则）
- 新增战功事件：只往 `WORLD_EVENTS` 追加一条（`value/threshold/minLoginDay/story/medal/gain`），
  触发、发奖、战功墙列表全部自动跟上。
- 新增课程/打工/商品/场馆：只改 `world-tables.js` 的数组，面板渲染是数据驱动的。
- 新增页面：`registerPage('id', { render })` + 一个 `renderXxx()`，路由不认识具体页面。

### 可测试性
- 领域层是纯函数：`applyCost / applyGain / worldLevelOf / pendingEvents / settleOffline / needRotate / onCooldown`。
- 时间与存储都是端口：`clock.now()`、`persistence.storage` 可注入替换。
  `settleOffline(world, petIds, at, getPetWorld)` 直接传时间戳，测试不需要 mock 全局 `Date`。
- 证据：`npm test` → 36 项领域断言；`npm run test:smoke` → 54 项浏览器级断言（jsdom 真跑 bundle）。
  旧的 `dev/test-w3d.js` 是 `eval` 拼接 19 个脚本再导出 `globalThis.X`，现在改为 `import` 领域模块。

### 可复用性（DRY）
- 六维属性的顺序/配色/图标只定义一次（`ATTR_ROWS`），面板与 3D HUD 共用。
- 卡片/记录渲染 `recCard`、今日任务 `rmDays`、快捷打卡 `quickAdd` 抽到 `views/records.js`，
  首页 / 健康页 / 档案页共用（原先三家互相 import）。
- 手机框缩放原来在 `22-live.js` 里另有一份，已合并进 `app/shell.js`。
- `attrDeltaHTML/Text`、`negate`、`missingAttrs` 等一套工具取代了散落在 20 多个地方的重复拼装。

### 灵活性
- 配置驱动：等级曲线、上限、解锁线、冷却时长都在 `app/config.js`；换数值不动逻辑。
- 状态迁移与业务分离：`data/migrations.js` 负责任意历史版本 → 当前结构，
  出厂存档也走同一条路径（`loadState()` 只有一条代码路径）。
- 3D 不可用（无 WebGL / three.js 未加载 / 模型超时）自动降级为舞台内提示，不白屏：
  冒烟测试里 jsdom 没有 WebGL，这条路径每次都跑。

## 二、五条设计原则

| 原则 | 落地 |
|---|---|
| 单一职责 | `store` 只管状态与落盘；`ui` 只管浮层；`router` 只管切页；`points` 只管积分账本；`world-state` 只做「规则 ⇄ 状态 ⇄ 刷新」的翻译 |
| 开闭原则 | 事件表 / 数值表 / 页面表都是数据驱动，加功能=加一条数据，不改既有分支 |
| 依赖倒置 | 视图依赖 `clock` / `storage` 端口，而不是 `Date.now()` / `localStorage`；3D 面板与舞台之间用 `registerWorldHooks / registerStageHooks` 双向解耦，避免循环 import |
| 接口隔离 | 动作注册表按模块分表登记，谁用谁登记；`views/w3d/index.js` 作为门面只暴露 6 个入口，外部不 import 内部文件 |
| 里氏替换 | 降级宠物模型与 GLTF 模型实现同一组「位置/动画/受击反馈」契约（`pet.js` 内 `mountPet` 与 `useFallbackPet` 产出同构对象），上层 AI 与交互无需区分 |

## 三、怎么写

- **命名与注释**：注释只写「为什么」。例如 `applyGain` 的上限为什么分 100/9999、`settleOffline` 为什么保留 240h 上限、
  `ui-state.js` 为什么允许挂到 window。
- **函数短小**：超长函数已被拆分。典型：原 `renderWTab`（一个函数里 7 个 tab 的分支、约 70 行）→
  `TAB_RENDERERS` 表 + 7 个小函数；原 `w3dBuildScene`（约 150 行）→ scene 里 9 个 `buildXxx`；
  原 `boot()` 里混着的拖拽监听 → `live.js` 的 `bindLiveDrag()`。
- **团队规范**：统一 2 空格、单引号、模板字符串拼 HTML、函数名动词开头、常量 UPPER_SNAKE、模块内状态不进全局。
- **写测试**：领域层先写测试再改数值；`npm run check` 是提交前的唯一闸门（3 关全绿）。
- **持续重构**：本轮清掉的重复/坏味道——19 个隐式全局函数名 → 1 张动作表；
  25 个 `window._xxx` 临时全局 → 1 个 `ui` 命名空间；3 处互相 import 的视图 → 抽出共享叶子模块；
  模板里的 `S.cart.forEach(...); save(); renderCart()` 之类的内联业务 → 具名动作。
- **设计先行**：`docs/ARCHITECTURE.md` 先定分层、依赖方向、状态分类、扩展步骤，再落代码。

## 四、验收

```
npm run check:static   # 50 个模块，0 循环依赖，187 个动作引用全部有登记
npm test               # 36 项领域断言全绿
npm run test:smoke     # 54 项 jsdom 断言全绿（含控制台 0 错误）
```

功能面保持不变：登录/导览、首页、AI 九大场景、社区、我的、档案、健康、监控、商城、消息、旅行、
活动组局、积分、设置、上门宠护、流浪救助、虚拟形象、直播、人宠世界（面板 + 3D 舞台 + 事件/战功/离线衰减）。
