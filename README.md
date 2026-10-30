# 宠物数字管家 · 3D 宠物世界（V1.9）

黑客松 Demo：虚拟人宠世界 Web App。竖屏 App 内嵌横屏 three.js 3D 宠物世界（庭院 / 天气 / 自主 AI / 手动互动），
配套学院、打工、商城、战功事件、运动娱乐馆（Lv.30 解锁）、社区、电商、活动组局等完整模块。

**在线访问（GitHub Pages）**：<https://flying-dragon-ai.github.io/pet-world/>

V1.9 是一次完整 rebuild：把原来 19 个按序加载的全局脚本，重构成**分层 ES Module + 动作注册表 + 纯函数领域层**，
并补齐单测与浏览器级冒烟。设计说明见 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

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
| `npm run check:static` | 静态体检：import 路径 / 循环依赖 / 动作契约 |
| `npm test` | 领域单测（node --test，36 项） |
| `npm run test:smoke` | 构建 + jsdom 冒烟（54 项：登录→首页→世界→3D 降级→面板→逐页渲染→存档） |
| `npm run check` | 上面三项全跑 |

## 目录

```
index.html                入口（静态骨架 + <script type="module" src="src/main.js">）
src/app/                  基础设施：config / clock / persistence / store / dom / ui / ui-state / actions / router / shell
src/domain/               纯函数规则：pet（家园四维）/ world（六维·事件·离线衰减）/ w3d（互动数值·横屏判定）
src/data/                 纯数据：seed / migrations / world-tables / w3d-assets / live-rooms
src/views/                视图：auth home ai community profile grow monitor mall misc service act petwizard live
                          pets records points / world-state（世界网关） / world-panel（竖屏世界面板）
src/views/w3d/            3D 舞台：ctx stage scene weather pet ai input hud tick interactions
assets/css/app.css        全部样式
assets/js/vendor/         three.min.js + GLTFLoader.js（r128 本地备料）
dev/                      build.js（零依赖打包器）/ check.js（静态体检）/ smoke.js（jsdom 冒烟）/ serve.js / test/
docs/                     PRD、3D 世界施工计划、ARCHITECTURE.md
archive/                  拆分前的完整单文件备份（回滚保险）
```

## 三条约定（读代码前先知道）

1. **模板里的按钮一律写 `app.动作名(...)`**。动作在各自视图文件末尾用 `registerActions` 登记，
   拼错会在控制台明确报「未注册的动作」，`dev/check.js` 也会静态校验，不会静默失灵。
2. **业务状态进 `store.S`（会落盘），瞬时 UI 状态进 `app/ui-state.js` 的 `ui`（不落盘）。**
   除了 `app` 与 `ui` 两个显式出口，没有别的全局变量。
3. **规则写进 `src/domain/`，并且必须配单测**。视图只做「读状态 → 拼模板 → 调一次动作」。

## 3 分钟 Demo 动线

首页磁贴「人宠世界」→ 加载屏 → 横屏 3D 庭院（拖转视角 / 点宠物抚摸 / 四按钮互动 / 点建筑进面板）
→ 学院上课 → 打工赚金币A → 商城购物 → 战功墙（第 5 天勇气>50% 触发「蝶舞之约」）
→ 社区发帖 +10 成长值 → Lv.30 解锁运动 / 娱乐馆。

## 文档

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 分层、依赖方向、扩展指南、与旧版对照
- `docs/虚拟人宠世界模块PRD(1).md` — 模块需求
- `docs/PLAN-3D宠物世界V1.8.md` — 3D 世界施工计划（含模型清单与假设）
