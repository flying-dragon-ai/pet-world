# 架构说明 · 宠物数字管家 V1.9

本文说明这次 rebuild 之后代码怎么分层、为什么这么分、以及新增功能该往哪儿写。

## 一句话概括

**领域规则是纯函数，视图只拼模板，副作用集中在少数几个网关模块；模块之间单向依赖，靠 import 声明而不是脚本加载顺序。**

## 目录结构

```
index.html              # 唯一入口：静态骨架 + <script type="module" src="src/main.js">
src/
├── package.json        # { "type": "module" }：让 src/ 下的 .js 按 ES Module 解析
├── main.js             # 启动：装桥 → 读存档 → 外壳 → 落地页 → 离线结算
├── app/                # 应用层（与具体业务无关的基础设施）
│   ├── config.js       # 常量（键名、版本、等级曲线、冷却时长…）
│   ├── clock.js        # 时间端口：now() / today()，测试可注入固定时钟
│   ├── persistence.js  # 存储端口：localStorage ⇄ 内存自动降级
│   ├── store.js        # 状态仓库 S（稳定引用 + save() 落盘）
│   ├── dom.js          # $ / $$ / esc / imgErr …
│   ├── format.js       # 时间等人话格式化（纯函数）
│   ├── ui.js           # toast / sheet / modal / 二次确认
│   ├── ui-state.js     # 瞬时 UI 状态（tab、筛选、草稿…），唯一额外的全局出口
│   ├── actions.js      # 动作注册表 + window.app 桥
│   ├── pages.js→router.js  # 页面登记与切页
│   └── shell.js        # 状态栏、手机框缩放、未读红点、离线横幅
├── domain/             # 领域层（纯函数，不依赖 DOM / 存储）
│   ├── pet.js          # 家园四维、等级、年龄
│   ├── world.js        # 六维、等级、事件、离线衰减、消耗/收益
│   └── w3d.js          # 横屏判定、手动互动数值表、冷却
├── data/               # 数据层（纯内容）
│   ├── seed.js         # 出厂存档与示例数据
│   ├── migrations.js   # 存档迁移（任意历史版本 → 当前结构）
│   ├── world-tables.js # 课程/打工/商品/场馆/事件/属性表
│   ├── w3d-assets.js   # 3D 模型地址、建筑坐标
│   └── live-rooms.js   # 直播间与弹幕示例数据
└── views/              # 视图层（模板 + 交互）
    ├── auth.js         # 登录 / 新手导览
    ├── home.js  ai.js  community.js  profile.js  grow.js
    ├── monitor.js  mall.js  misc.js  service.js  act.js
    ├── petwizard.js  live.js  points.js  pets.js  records.js
    ├── world-state.js  # 世界状态网关（domain 规则 ⇄ store ⇄ 刷新）
    ├── world-panel.js  # 竖屏世界面板
    └── w3d/            # 3D 舞台（横屏）
        ├── ctx.js      # 舞台句柄（three.js 单例）
        ├── stage.js    # 进入/挂起/恢复/退出/横屏布局/降级
        ├── scene.js    # 庭院：地面/篱笆/树/小屋/建筑/粒子
        ├── weather.js  # 晴阴雨 + 天空渐变 + 光照
        ├── pet.js      # GLTF 加载 + 兜底模型 + 动画状态机
        ├── ai.js       # 自主行为状态机 + 手写动画
        ├── input.js    # 拖动环绕 / 双指缩放 / 点按拾取
        ├── hud.js      # 顶部六维微条 + 聊天气泡定位
        ├── tick.js     # 帧循环
        ├── interactions.js  # 手动互动（值表在 domain/w3d.js）
        └── index.js    # 门面：对外只暴露这里有导出
```

## 依赖方向（不可逆）

```
data  ←  domain  ←  views  ←  main
        ↑            ↓
        └──  app/（config clock store dom ui actions router shell）
```

- `domain/` 不 import `views/`、不 import `store`、不碰 DOM。规则靠参数进出。
- `views/` 只通过 `world-state.js` 这类**网关**读写世界状态，不直接改 `S.world`。
- `app/` 是最底层：谁都可以用，它不认识任何业务模块。
- `dev/check.js` 会检查 import 路径与循环依赖，CI 里跑一次就知道结构没走样。

## 三个关键约定

### 1. 状态分两种

| 类型 | 例子 | 放哪儿 | 落盘 |
|---|---|---|---|
| 业务状态 | 宠物档案、金币、订单、社区帖子 | `store.S` | 是（`save()`） |
| 瞬时 UI 状态 | 当前 tab、筛选条件、回复草稿、播放进度 | `app/ui-state.js` 的 `ui` | 否 |

`ui` 是除 `app` 之外唯一的全局出口（模板里的 `onclick="ui.healthTab='rec';app.go('health')"` 会用到），
有名字、有默认值、可一次性重置（`resetUiState()`），替代了旧的 `window._cbTag / window._pid / window._aw` 一堆散装全局。

### 2. 事件只走动作注册表

模板里不直接调用模块内函数，一律写 `app.动作名(...)`：

```js
// views/mall.js 末尾
registerActions('mall-extra', { clearRecentViews, selectAllCart, toggleCartItem });
```

好处：动作可枚举、可断言、拼错会在控制台明确报「未注册的动作」而不是静默失败；
`dev/check.js` 与 `dev/smoke.js` 都会校验「模板里出现的每个 `app.xxx` 都已注册」。

反例（旧代码的样子，已全部清除）：`onclick="S.cart.forEach(c=>c.sel=true);save();renderCart()"` —— 业务逻辑长在模板里。

### 3. 副作用集中在网关

- 积分：`views/points.js` 的 `awardPoints(n, source)`
- 世界数值：`views/world-state.js` 的 `payAndGain / addWorldGrowth / canPay`
- 3D 互动：`views/w3d/interactions.js` 的 `applyManualAction`
- 健康打卡：`views/grow.js` 的 `commitDailyRecord`

视图只负责「读状态 → 拼模板 → 调用一次动作」。

## 可测试性设计

| 关卡 | 命令 | 覆盖 |
|---|---|---|
| 静态体检 | `npm run check:static` | import 路径、循环依赖、动作契约 |
| 领域单测 | `npm test` | 等级曲线、消耗收益、事件触发、离线衰减、迁移、冷却…（36 项） |
| 浏览器冒烟 | `npm run test:smoke` | jsdom 真跑 bundle：登录→首页→世界→3D 降级→面板七个 tab→互动→事件卡→逐页渲染→存档（54 项） |

为了让领域可测，`clock.now()` 与 `persistence.storage` 都是可替换的端口：
测试里可以冻结时间、换掉存储后端。

## 构建产物

- **线上（GitHub Pages）**：直接跑 `index.html` + `src/*.js`（原生 ES Module，零构建）。
- **本地双击演示**：`npm run build` 产出 `dist/`（`bundle.js` 为合并后的 classic script），
  因为 `file://` 协议不允许加载 module。打包器 `dev/build.js` 零依赖，遇到不支持的语法直接报错退出。

## 新增一个页面

1. `src/views/xxx.js`：写 `renderXxx()`，末尾 `registerPage('xxx', { render: renderXxx })`；
2. 需要按钮就写 `onclick="app.doXxx()"`，并在同文件 `registerActions('xxx', { doXxx })`；
3. 需要落盘的新状态 → 加进 `data/seed.js` 并在 `data/migrations.js` 补齐；
4. 需要规则 → 写进 `src/domain/`，配一条单测；
5. `npm run check` 全绿即可提交。

## 与旧版（V1.8.1）的对应关系

| 旧 | 新 |
|---|---|
| `assets/js/00-utils.js` | `app/dom.js` + `app/ui.js` + `app/shell.js` |
| `01-data.js`（含迁移脚本） | `data/seed.js` + `data/migrations.js` |
| `02-core.js` | `views/auth.js` + `app/router.js` |
| `03-petsvg.js` | `views/pets.js`（SVG 生成 + 当前宠物） |
| `10…19-*.js` | `views/home|ai|community|profile|grow|monitor|mall|misc|service|act.js` |
| `20-world.js` | `data/world-tables.js` + `domain/world.js` + `views/world-state.js` + `views/world-panel.js` |
| `21-petwiz.js` / `22-live.js` | `views/petwizard.js` / `views/live.js` |
| `30-w3d.js`（611 行） | `domain/w3d.js` + `views/w3d/` 十个小模块 |
| `99-boot.js` | `src/main.js` |
| `dev/test-w3d.js`（eval 拼接源码） | `dev/test/*.test.js`（直接 import 领域模块） |
