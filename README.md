# 宠物数字管家 · 3D 宠物世界（V1.8）

黑客松 Demo：虚拟人宠世界 Web App。竖屏 App 内嵌横屏 three.js 3D 宠物世界（庭院/小屋/天气/自主 AI/手动互动），配套学院、打工、商城、战功事件、运动娱乐馆（Lv.30 解锁）、社区、电商、活动组局等完整模块。

**在线访问（GitHub Pages）：https://flying-dragon-ai.github.io/pet-world/**

## 本地运行

```bash
# 方式一：直接双击 index.html（注意：3D 宠物 GLB 走 CDN，需联网）
# 方式二：本地服务器（推荐，手机同局域网可访问）
node dev/serve.js 8088
# 打开 http://<本机IP>:8088/
```

## 目录结构

```
├── index.html               主入口
├── assets/
│   ├── css/app.css          全部样式
│   └── js/
│       ├── vendor/          three.min.js + GLTFLoader.js（r128 本地备料）
│       ├── 00-utils.js … 30-w3d.js   应用模块（按功能域拆分，普通脚本按序加载）
│       └── 99-boot.js       启动
├── docs/                    PRD 与 V1.8 施工计划
├── dev/                     serve.js（局域网静态服务）、test-w3d.js（node 桩件测试，80 项断言）
└── archive/                 拆分前的完整单文件备份（回滚保险）
```

## 测试

```bash
node dev/test-w3d.js   # 世界逻辑/离线结算/横屏旋转判定/3D 互动/家园清除回归，80 项断言
```

## 3 分钟 Demo 动线

首页磁贴「人宠世界」→ 加载屏 → 横屏 3D 庭院（拖转视角/点宠物抚摸/四按钮互动）→ 建筑进学院上课 → 打工赚金币A → 商城购物 → 战功墙（第5天勇气>50% 触发「蝶舞之约」）→ 社区发帖 +10 成长值 → Lv.30 解锁运动/娱乐馆。

## 文档

- `docs/虚拟人宠世界模块PRD(1).md` — 模块需求
- `docs/PLAN-3D宠物世界V1.8.md` — 3D 世界施工计划（含模型清单与假设）
