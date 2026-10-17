# 家园系统清除 + three.js 3D 宠物世界重建（宠物数字管家 V1.8，横屏游戏）

> 本文件为可直接执行的施工计划。在新对话中 @ 本文件 + @ `宠物数字管家APPV1.7.html` 即可开工。
> 目标文件：~~宠物数字管家APPV1.7.html~~ 已于结构化时改名为 `index.html`（原单文件备份在 `archive/`），代码拆分为 `assets/js/` 模块

---

## 0. 现状（执行前必读，已核实）

### 0.1 已完成（V1.7.1，不要重复做）
- `WCOURSES`/`WJOBS`/`WGOODS` 数值表与 PRD 一致（三档课程/打工、四件商品）
- `payAndGain` 收益上限已从 999 改为 **9999**（原来会卡死 Lv.20）
- 通用事件引擎：`WEVENTS` 配置表 + `checkWorldEvents()` + `showEventCard(ev)` 卡片弹窗；首条配置 = 蝶舞之约（勇气值>50% 且登录≥5 天，一次性，成长+5）；`WMEDALS` 由事件表派生
- 世界等级：`worldLevel()` = `min(100, 1+floor(growth/50))`（50/级，已去 9 级封顶）；`WSPORT_UNLOCK_LV=30`
- `addWorldGrowth(n,why)`：跨 30 级弹「运动馆/娱乐馆已解锁」卡片；`attrDeltaTxt(o)` 纯文本版
- 运动馆/娱乐馆：`WVENUES = {sport:{...6项}, fun:{...6项}}` + `doVenue/settleVenue`；世界页 tabs 已含 sport/fun，Lv<30 显示 🔒 进度面板
- 成长值挂钩：`pubSubmit` 发帖+10、`saveRec` 新记录+5、`uploadAlbumPhoto` +5（相册已真实持久化到 `petGarden(p).album`，`ALBUM_POOL` 8 张图）
- 测试：node 桩件 harness 跑通 24 逻辑 + 13 渲染全绿（见 §6）

### 0.2 关键代码地标（锚点名 = 函数名）
- 导航：`go(pg)` 内 render 映射表；`MAIN=['home','garden','ai','community','me']`；`tabTo('garden')→enterGarden()`
- 家园（待清除）：`renderGarden`、`enterGarden`、`settleGarden`、`openGardenTasks`、喂食/抚摸/玩耍/洗澡四函数（约 L838-850）、家园装扮 `buyAcc/equipAcc`（约 L2270-2281）、`S.garden` 迁移块（约 L520）
- 保留：`petGarden(p)`（L617）、`petLevel`（L618）、`quickClean`（L772 附近，首页快捷打卡）、`openPetGrowCard`、相册函数组
- 人宠世界（保留为面板页）：`openWorld`（加载屏）、`worldEnter`（登录天数+1 → `checkWorldEvents`）、`renderWorld`、`renderWTab`、`openWTab`；世界页 `pg-world` 返回键当前 `go('home')`
- `boot()` 末尾调用 `settleGarden`（离线结算，要换成世界版）
- `toast` 用 textContent（不可塞 HTML）；`openModal/openSheet/closeModal` 弹层基建直接复用

---

## 1. 概要
清除底部「家园」tab 的 2D 家园系统，重建为基于 WebGL/three.js 的 **横屏** 3D 宠物世界（PRD 4.1/4.2：庭院+小屋、随机天气、季节、自主 AI、手动互动、情绪反馈）。点击进入时游戏以横屏全屏舞台打开（脱离竖屏手机框）。系统面板（学院/打工/商城/战功/运动/娱乐、事件引擎、Lv.30 解锁）保留，从 3D 建筑点击进入。社区/电商/活动模块不动。

## 2. 已确认的架构决策
- 清除范围：仅家园场景；2D 系统面板保留为 3D 建筑触发的页面
- 宠物模型：狗/猫=程序化低模建造器（默认小狗，CDN 无狗猫 GLB 已实测），其余物种=GLTF CDN（URL 已实测可拉），加载失败程序化兜底（防白屏）
- three.js：r128 全局版下载至 HTML 同目录（`three.min.js` + `GLTFLoader.js`，已备料）
- 进入游戏即横屏

## 3. 变更内容

### A. 依赖与文件
- 已下载到 `D:/temp/宠物世界/`：`three.min.js`、`GLTFLoader.js`（three r128 全局版）
  - 如需重下：`https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js`、`https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js`（直连失败走代理 `https_proxy=socks5://127.0.0.1:10808`）
- HTML `<head>` 增加两个本地 script 引用
- 宠物模型清单（以下 URL 均已用 curl 实测 200 + CORS `*`，可直接 GLTFLoader 跨域拉取）：

| 游戏内宠物 | 来源 | 说明 |
| --- | --- | --- |
| **小狗（默认）** | 程序化低模建造器 `buildProceduralPet('dog')` | 全网 CDN 无可直拉的狗 GLB（Khronos/Babylon/modelviewer/GitHub 均实测无），程序化拼装：身/头/吻/垂耳/四腿/卷尾，手写动画：idle 呼吸起伏、walk 四足交替、run、摇尾、歪头；柴犬黄默认，毛色随宠物档案联动 |
| 猫 | 同建造器 `buildProceduralPet('cat')` | 尖耳、纤细体型、长尾；同套手写动画 |
| 狐狸 | `https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/Fox/glTF-Binary/Fox.glb`（163KB） | 自带 Survey/Walk/Run 动画 |
| 鸟 | `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Parrot.glb`（97KB）或 `.../Stork.glb`（77KB）随机其一 | 自带飞行动画 |
| 异宠 | `https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Flamingo.glb`（77KB）/ `.../Horse.glb`（182KB）/ `https://cdn.jsdelivr.net/gh/Quaternius/TestGltfAssets@HEAD/Deer/Deer.glb` / `https://cdn.jsdelivr.net/gh/KhronosGroup/glTF-Sample-Models@main/2.0/Duck/glTF-Binary/Duck.glb`（120KB）随机其一 | 前两者自带动画 |
| 兜底 | 任一 GLB 8s 超时/失败 → 同槽位程序化模型（狗参数） | 永不白屏 |

- species 映射：狗→程序化小狗（**默认宠物**，档案物种缺失/未识别时也用它）；猫→程序化猫；鸟→Parrot/Stork；异宠→异宠表随机；「多来几个宠物」= 图鉴级阵容，跟随 `curPet().species` 自动匹配，切换宠物（`switchPetSheet`）即更换 3D 模型

### B. 家园系统清除
- 删除：`pg-garden` 页、`renderGarden`、`enterGarden`、`settleGarden`、`openGardenTasks`、喂食/抚摸/玩耍/洗澡四函数、家园装扮与家园币、家园欢迎弹窗、`S.garden` 迁移块
- 保留：`petGarden()`、`petLevel()`、首页快捷打卡、成长档案弹层、成长相册
- tabbar「家园」按钮：label 改「世界」，改为启动器（点击 → `openWorld()`）；`MAIN` 移除 garden（tabbar 高亮与显示逻辑随之调整）
- `openWorld()` 加载屏保留；`worldEnter()` 不再 `go('world')`，改为打开横屏游戏舞台（登录天数+1、`checkWorldEvents()` 不变）

### C. 3D 横屏游戏（新增 `w3d` 模块，内联 JS）
**C-1 横屏舞台**
- 游戏运行在 `w3dStage`：`position:fixed;inset:0;z-index:70` 的全屏覆盖层，脱离 `.phone` 手机框
- 视口为横屏（桌面浏览器）→ 舞台直接铺满；视口为竖屏（手机直握）→ 舞台 `transform:rotate(90deg)` 并交换宽高，内容恒为横屏呈现，直握时可见「旋转手机效果更佳」轻提示
- 移动端尝试 `screen.orientation.lock('landscape')`，失败静默降级（CSS 旋转兜底）
- renderer 尺寸跟随舞台，`resize` 事件重算；帧循环 `requestAnimationFrame`+delta，动画交叉淡入 0.3s
- 游戏 HUD 左上角「‹ 返回」按钮：关闭舞台回到竖屏 App（首页）
- WebGL 不可用 → 舞台内显示降级提示而非白屏

**C-2 场景与宠物**
- 场景：草坪庭院（绿地+篱笆+树）、坡顶小屋、天空渐变+平行光+环境光；季节=秋（落叶粒子）；随机天气：晴/阴/小雨（雨粒子，下雨宠物自动躲屋檐）
- 相机：拖动小角度环绕、滚轮/双指缩放
- 宠物：GLTF + AnimationMixer 状态机（待机/行走/跑），程序化模型则用手写关键帧状态机（同一套接口）；默认小狗；自主 AI：待机 3–6s → 随机游走 → 原地玩耍 → 低体力趴睡（Zzz 气泡）→ 下雨躲檐循环；情绪映射：开心=蹦跳、委屈（饥饿/脏）=慢走+吐槽气泡、困倦=趴睡
- 手动互动（底部四按钮 + 射线点宠物=抚摸，单按钮 3s 冷却）：抚摸 心情+9；喂食 饥饿+18 成长+3；玩耍 心情+7 体力-10 饥饿-6；洗澡 清洁+20；爱心/泡泡粒子反馈；全部作用于世界六维属性

**C-3 HUD 与建筑热点**
- HUD（HTML 覆盖层，随舞台旋转保持正向）：顶部六维属性紧凑条 + 金币A
- 建筑热点（低多边形建筑+Canvas 纹理招牌）：学院/打工小镇/商城/战功/运动场/娱乐馆；运动、娱乐在成长等级 <30 时招牌 🔒，点击提示「成长等级 Lv.30 解锁」
- 点击建筑：舞台挂起（隐藏、状态保留）→ `go('world')+openWTab(tab)`；面板返回键改为「返回世界」→ 重新显示舞台恢复游戏（不重计登录天数）

### D. 系统面板接线
- `renderWorld` 及全部面板逻辑不动；返回键文案改「返回世界」并执行舞台恢复
- 首页磁贴「人宠世界」→ `openWorld()` 不变；tabbar「世界」同入口

### E. 数据联动（PRD 六）
- 首页快捷打卡同步世界属性：喂食打卡→世界饥饿+8、铲屎打卡→世界清洁+8
- 已有不动：发帖+10 / 更新日常+5 成长值、记录/相册/帖子 localStorage 持久化
- 离线结算迁到世界属性（替换 `settleGarden`）：按离开小时数衰减（饥饿 -2/h 下限 0、心情 -1/h 下限 20），离开 >8h 回归弹「主人回来了」欢迎卡

### F. 验收（PRD 七）
- P0 全流程无崩溃无卡死；宠物动效丝滑；监控/健康AI/社区/电商/定制既有流程不受影响
- 横屏进入、横屏退出、舞台旋转在桌面与竖屏视口均正确
- 可录 3 分钟 Demo：进世界加载屏 → 横屏 3D 互动四连 → 学院上课 → 打工赚币 → 商城购物 → 战功墙 → 发帖+10 成长值

## 4. 验证场景
- 自动（node 桩件 harness）：既有 24 项世界逻辑测试全绿；新增离线结算单测（12h → 饥饿/心情按下限保底）；舞台旋转判定函数单测（竖屏视口 → rotate 90°，横屏 → 不转）
- 手动浏览器清单：本地 three.min.js 无 404；进入游戏为横屏全屏、手机框被覆盖；返回键回到竖屏 App；狐狸三动画切换；AI 游走/躲雨；点宠物飘爱心心情+9；四按钮数值正确 3s 冷却；建筑进面板、返回恢复游戏且天数不重复+1；Lv<30 🔒 提示、Lv≥30 可进；loginDays=4+勇气60 → 下次进游戏弹蝶舞之约卡片；刷新后属性/战功/天数不丢；控制台无报错

## 5. 假设与默认
1. 「图一」参考图未收到：按典型 3D 宠物游戏横屏布局实施（顶部属性栏、底部互动钮、场景建筑热点）；图一补发后以其为准调整布局
2. 默认宠物为小狗（程序化低模）；狗/猫因 CDN 无可拉 GLB 走程序化建造器，其余物种 GLB 均已实测可拉；后续可在 `loadModel()` 钩子换正式模型
3. 餐厅系统（PRD 4.7）不做
4. 横屏实现采用「全屏舞台 + 竖屏视口 CSS 旋转」方案而非 meta 强制横屏：桌面演示与移动端均可用
5. 家园经济与世界经济分离维持现状，仅快捷打卡单向同步世界属性

## 6. 附：测试 harness 用法（已验证过的模式）
```bash
# 语法检查
node -e "const fs=require('fs');const s=[...fs.readFileSync('宠物数字管家APPV1.7.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);s.forEach((x,i)=>{try{new Function(x);console.log(i,'OK')}catch(e){console.log(i,'ERR',e.message)}})"
# 逻辑测试：eval(src+';globalThis.X={...}') 导出内部函数，桩 localStorage/document/window 后断言
```
