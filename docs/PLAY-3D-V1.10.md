# 3D 游戏玩法对齐《虚拟宠物家园》· V1.10

参考源：仓库根目录的 `虚拟宠物家园小游戏(1).html`（2D 治愈风单文件小游戏，基于《模块三 虚拟人宠世界 详细PRD》）。
本文记录它的玩法怎么映射到本项目**现有的 three.js 3D 世界**里：谁负责、落在哪个文件、数值怎么定的。

---

## 一、这次改了什么（不改的部分也说清楚）

**改了**（玩法层）：

- 互动按钮从 4 个（抚摸 / 喂食 / 玩耍 / 洗澡）扩到 7 个，数值全部改成 2D 小游戏那套口径；
- 自主行为从「idle / walk / play / sleep」扩到 23 个状态，行为选择与台词镜像 `idleBehavior()`；
- HUD 补上宠物名 / 品种 / 世界等级 / 第几天 / 天气·季节 / 战功值 / 心情表情；
- 加入四季（春花 / 夏无 / 秋叶 / 冬雪）与在线挂机衰减（属性随真实时间流逝）；
- 新增家园主题（5 套配色）、宠物外观（帽子 / 眼镜 / 脖子饰品）、院子家具（9 件，可换机位）；
- 战功从 2 枚扩到 8 枚，其中 4 枚由 3D 内的运行时引擎触发；
- 3D 内置宠物聊天面板；社区发帖会触发家园事件。

**没改**（数值与存档口径）：

- 六维（饥饿 / 清洁 / 心情 / 体力 / 智慧 / 成长）不变；
- 二元属性仍是勇气 / 冲动 / 攻击三项，不新增存档字段；
- 2D 小游戏的六性格（勇气 / 捣蛋 / 活力 / 探索 / 黏人 / 贪吃）由现有数据**派生**（`derivedTraits()`），不落盘；
- 金币仍是金币A，战功值由勋章数派生（每枚 3 点）。

新增的落盘字段只有一个子树：`S.world.home`
（`theme` / `themes` / `outfit` / `furniture` / `memorial` / `logs`），迁移器在 `data/migrations.js` 里补齐。

---

## 二、玩法映射表

| 2D 小游戏 | 3D 世界里的落点 | 关键规则 | 文件 |
|---|---|---|---|
| 院子 / 小屋两个场景 | 3D 庭院 + 小屋模型 | 点小屋 = 进屋（宠物走到门口消失），再点 = 出屋 | `w3d/scene.js`、`w3d/interactions.js` |
| HUD：名字·品种·Lv·第N天·天气·季节·战功 + 4 条属性条 | 顶部两行 HUD | 六维条保留，六性格走「家园」页 | `w3d/hud.js`、`index.html` |
| 心情表情 moodEmoji | HUD 宠物名前 | 🥺 饿/脏 <25 · 😪 体力<20 · 🤩 心情≥75 · 😊 ≥45 · 😕 其余 | `domain/w3d.js` |
| 饱腹 / 清洁 / 心情 / 体力 四维 | 现有六维（energy→stamina，smart→wisdom） | 喂食饱腹+15、洗澡清洁+20、抚摸心情+3、陪玩心情+8 体力-3 | `domain/w3d.js` |
| 挂机数值流逝 tick() | 3D 内每 5 秒结算一次 | 饥饿 -1/38s、清洁 -1/55s、心情 -1/70s、体力 +1/40s（饿时不涨） | `domain/w3d.js`、`w3d/tick.js` |
| 天数/季节推进 | 季节索引 = 自然日 ÷ 7 % 4 | 跨天自动换季并重掷天气 | `domain/w3d.js`、`w3d/tick.js` |
| 天气 ☀️⛅🌧 | 晴 / 阴 / 小雨，冬天是雪 | 季节影响概率；雨天宠物躲屋檐 | `w3d/weather.js` |
| 动作引擎（idle/wag/nod/lie/sleep/eat/shake/happy/sit） | AI 状态机 23 态 | 台词取自 `IDLE_LINES` | `w3d/ai.js`、`data/w3d-assets.js` |
| 自主行为 idleBehavior() | `pickIdle()` + `startBehavior()` | 分支顺序与阈值逐条镜像 2D 版 | `domain/w3d.js`、`w3d/ai.js` |
| 性格六维 + 5 套预设 | `derivedTraits()` 派生 + 家园页只读展示 | 捣蛋=冲动值、贪吃=100-饥饿、黏人=抚摸次数×8+心情/4 | `domain/w3d.js` |
| 喂食 / 洗澡 / 抚摸 / 陪玩 / 躺躺 | 底部 7 个按钮 | 数值见上；陪玩体力门槛 5 | `domain/w3d.js`、`w3d/interactions.js` |
| 躺垫（点一下躺一会儿） | 院子里的粉色躺垫 | 点躺垫 = 躺躺（体力+8 心情+4），宠物自己走过去 | `w3d/scene.js`、`w3d/input.js` |
| 进屋 / 出屋 | 点小屋模型或「进屋」按钮 | 宠物走到门口消失，「出屋」叫回来 | `w3d/interactions.js` |
| 睡觉（体力回满） | 「进屋」之外的睡觉开关（AI sleep 状态） | 睡着时体力每秒回 3；醒来体力+15 心情+3 | `w3d/ai.js`、`w3d/interactions.js` |
| 宠物聊天 + 快捷提问 | 3D 内聊天面板 | 关键词规则镜像 `petReply()` | `w3d/chat.js`、`domain/w3d.js` |
| 装修系统（买家具 + 摆放） | 家园页「院子家具」 | 每件家具 2~3 个预设机位；收回退金币 | `views/world-state.js`、`w3d/scene.js` |
| 商城：主题 / 家具 / 外观 | 家园页三块 | 主题立刻改 3D 小屋/草地/天空配色；外观直接戴到宠物身上 | `data/w3d-assets.js`、`w3d/scene.js`、`w3d/pet.js` |
| 战功 8 枚 | `S.world.medals` | 2 枚登录时判定（蝶舞之约 / 街头硬汉）+ 2 枚状态判定（三课结业 / 打工皇帝）+ 4 枚运行时（拆家 / 探险 / 躺平 / 雨中等待） | `data/world-tables.js`、`w3d/events.js` |
| 随机事件 + 生活小事件 | 3D 内每 5 秒判定一次 | 战功事件 45s 间隔，生活彩蛋 70s 间隔 | `w3d/events.js`、`domain/w3d.js` |
| 社区帖子 → 家园事件 | 发帖后自动触发 | 打架 / 洗护 / 好消息 / 其它 四类反应 | `views/community.js`、`domain/w3d.js` |
| 管家页：性格滑条 / 日志 / 导出 / 思念模式 | 家园页「性格画像 / 事件日志 / 思念模式」 | 思念模式影响聊天语气与开场白 | `views/world-panel.js`、`domain/w3d.js` |
| 事件日志 S.logs | `S.world.home.logs` | 最多 60 条，家园页展示最近 12 条 | `views/world-state.js` |

---

## 三、数值对照（2D → 3D）

| 动作 | 2D 小游戏 | 3D 世界（现在） | 备注 |
|---|---|---|---|
| 抚摸 | 心情+3、体力+1 | 心情+3、体力+1 | 连摸 3 次打卡照旧 |
| 喂食（好的一餐） | 饱腹+15、心情+2、体力+3 | 饥饿+15、心情+2、体力+3、成长+3 | 成长+3 是本项目原有 |
| 陪玩 | 心情+8、体力-3 | 心情+8、体力-3、饥饿-2 | 体力门槛 5 |
| 洗澡 | 清洁+20、心情+2 | 清洁+20、心情+2 | |
| 躺躺 | 体力+8、心情+4 | 体力+8、心情+4 | 走到躺垫上躺下 |

挂机衰减速率与 2D 版完全一致（饥饿 -1/38s、清洁 -1/55s、心情 -1/70s、体力 +1/40s）。

---

## 四、新增 / 改动的文件

**新增**

- `src/views/w3d/chat.js` —— 3D 内聊天面板
- `src/views/w3d/events.js` —— 运行时战功事件 + 生活小事件 + 社区帖事件落地

**改动**

- `src/data/w3d-assets.js` —— 四季、5 套主题、6 件外观、9 件家具、行为台词
- `src/domain/w3d.js` —— 互动数值表、心情表情、衰减、季节、派生性格、行为决策、对话、社区事件、运行时事件表
- `src/views/w3d/{scene,weather,pet,ai,interactions,hud,tick,input,stage,fx,index}.js` —— 3D 舞台按上文映射重做
- `src/views/world-state.js` —— 家园状态（主题 / 外观 / 家具 / 思念模式 / 事件日志 / 战功值）
- `src/views/world-panel.js` —— 新增「家园」tab（8 个 tab）
- `src/views/community.js` —— 发帖触发家园事件
- `src/data/world-tables.js` —— 战功事件表扩到 8 条（`EXTRA_WORLD_EVENTS`，运行时事件带 `runtime: true`）
- `src/domain/world.js` —— `pendingEvents()` 跳过运行时事件
- `src/data/migrations.js` —— 补齐 `S.world.home`
- `index.html` / `assets/css/app.css` —— HUD 信息行、7 个按钮、聊天面板样式
- `dev/build.js` —— 打包器的 `REEXPORT_RE` 不再跨语句吞并（`[\s\S]*?` → `[^{}]*?`）

---

## 五、验证

```bash
npm run check      # 静态体检 + 95 项领域单测 + 构建 + 86 项 jsdom 冒烟
```

冒烟新增覆盖：家园 tab 渲染、买主题/换主题、买外观/穿戴/脱下、买家具/换机位/收回退款、战功值换算、思念模式开关、社区帖触发家园事件。
