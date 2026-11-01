# GitHub 轮子调研（一）：宠物体型数据 + 宠物打架

> 调研日期：2026-11-01 · 方法：GitHub REST API 搜索 + 逐个打开仓库真实文件读源码 + 本地实测数据质量
> 全部结论都经过打开源码/拉数据验证，不依赖 README 自述。
> 适配到本项目哪一层见 [`ADAPTATION-PLAN.md`](ADAPTATION-PLAN.md)。

---

## 结论速览

| 主题 | 判断 |
|---|---|
| **宠物身高/体重/体型类型** | ✅ **抄 `tmfilho/akcdata`**。MIT 许可、277 个犬种、CSV 里直接有 `min_height/max_height/min_weight/max_weight/group/energy_level_value/trainability_value`，本地实测 0 缺失身高、2 行体重为 0。落到 `src/data/pet-sizes.js`。 |
| **猫的体型数据** | ❌ **GitHub 上没有可用的现成表**。搜了 4 组关键词，命中的都是 Swift App / React 3D 图鉴，仓库内无数据文件。猫的体型表需要手写（约 20 条）。 |
| **宠物出门打架（战斗结算）** | ⚠️ **抄 `smogon/pokemon-showdown` 的思路，不抄代码**。真正值得拿的是一条伤害公式 + 一个可注入随机数的 PRNG 模式；它的 `sim/` 是 TypeScript 且强耦合宝可梦数据（`battle.ts` 120KB / `dex-species.ts` 30KB / `team-validator.ts` 117KB），整体搬不过来。 |
| **3D 打斗物理** | ❌ **不建议**。`cannon-es` 单文件 346KB、`matter-js` 更重，而 PRD 对战斗的落点是「弹窗文字 + 图片结算」，物理引擎投入产出比极低。 |

---

## 一、宠物身高 / 体重 / 体型类型

### 1.1 ✅ 首选：`tmfilho/akcdata`（MIT，★55）

- 仓库：https://github.com/tmfilho/akcdata
- 数据文件：`data/akc-data-latest.csv`（319,030 字节）
- 许可：MIT（仓库内有 `LICENSE`）
- 说明：从美国犬业俱乐部（AKC）官网抓取的 277 个犬种信息，最后更新 2020-05-18。

**实际表头（本地拉取后逐列核对，21 列）：**

```
(breed), description, temperament, popularity,
min_height, max_height, min_weight, max_weight,
min_expectancy, max_expectancy, group,
grooming_frequency_value, grooming_frequency_category,
shedding_value, shedding_category,
energy_level_value, energy_level_category,
trainability_value, trainability_category,
demeanor_value, demeanor_category
```

**数据质量实测（277 行全量统计）：**

| 字段 | 缺失行数 | 取值范围 |
|---|---|---|
| `min_height` / `max_height` | 0 / 0 | 12.7 – 88.9 cm |
| `min_weight` / `max_weight` | 2 / 2 | 0 – 108.86 kg |
| `energy_level_value` | 6 | 0.2 – 1.0 |
| `trainability_value` | 24 | 0.2 – 1.0 |

> 单位已是**厘米 / 公斤**（AKC 原表是英寸/磅，抓取时已换算：Affenpinscher 22.86–29.21cm ↔ 9–11.5in）。
> `energy_level_value` / `trainability_value` 是 0.2–1.0 的连续值，**正好能映射到 PRD §3.2 的二元属性**（活力 / 服从 / 冲动）。

**组别（`group`）分布 —— 这就是体型分类的天然来源：**

```
Foundation Stock Service 68   Sporting Group 32   Hound Group 32
Terrier Group 31              Working Group 31   Herding Group 30
Toy Group 21                  Non-Sporting 21     Miscellaneous 11
```

**和本项目宠物的对照（本地实测三行）：**

```
Golden Retriever   h=54.61-60.96cm  w=24.95-34.02kg  Sporting Group   energy=1.0 train=1.0
Pembroke Welsh Corgi  h=25.4-30.48cm  w=12.70-13.61kg  Herding Group  energy=0.8 train=0.6
Cardigan Welsh Corgi  h=26.67-31.75cm  w=11.34-17.24kg  Herding Group  energy=0.8 train=0.6
```

> 注意：本项目「尖尖」= 金毛，档案写 `weight:20.5, height:50`，
> 而金毛成年标准是 **24.95–34.02kg / 54.61–60.96cm** → 档案值偏轻偏矮。
> 「小乐」= 柯基 11.6kg，Pembroke 标准 12.70–13.61kg → 略轻。
> **这正好是「体型类型」功能的第一个可用演示点**：App 能提示「尖尖按金毛标准偏轻 4.5kg」。

**怎么抄进本项目：**

1. 把 CSV 转成 `src/data/pet-sizes.js`（**纯数据层**，不引 CSV 解析器）：
   ```js
   // src/data/pet-sizes.js —— 品种 → 成年参考值（单位 cm / kg）
   export const BREED_SIZES = {
     '金毛寻回犬': { h: [54.61, 60.96], w: [24.95, 34.02], group: 'Sporting', energy: 1.0, train: 1.0 },
     '柯基':       { h: [25.4, 30.48],  w: [12.70, 13.61], group: 'Herding', energy: 0.8, train: 0.6 },
     // …共 277 条
   };
   ```
2. 中文品种名映射：AKC 是英文名，本项目档案存中文名（如「金毛寻回犬」）。
   需要一张 `akcName → 中文别名` 别名表，**只覆盖本项目会用到的常见品种**（金毛/柯基/柯基/布偶/英短/泰迪/比熊/柴犬/边牧/萨摩耶…约 30 条），其余按字符串包含模糊匹配兜底。
3. **体型分级用体重判定，不要用 AKC group**：group 是「犬种分组」（猎犬/梗犬…），跟体型无关，
   例如 Toy Group（21 种）里全是迷你犬但 Herding Group（30 种）从柯基到边牧横跨中型大型。
   建议分级（AKC 官方玩具犬定义 + FCI 通用认知）：
   ```
   迷你型 < 4kg    小型 4–12kg    中型 12–25kg    大型 25–45kg    巨型 > 45kg
   ```
4. `src/domain/pet.js` 加纯函数（必须配 `dev/test/pet.test.js`）：
   ```js
   export function sizeTypeOf(pet)      // → '迷你型'|'小型'|'中型'|'大型'|'巨型'
   export function weightRangeOf(pet)    // → {min, max} | null（品种未收录时）
   export function weightDeviation(pet)  // → {ratio, label:'偏轻'|'标准'|'偏重'}
   export function bcsOf(pet)           // → 1–9 体况评分
   ```
5. **体况评分（BCS）没有现成开源实现可抄**（见 §1.3），按 WSAVA 通用视觉法手写规则即可：
   肋骨、腰线、腹面收度三档打分表，纯函数、可单测。

### 1.2 ⚠️ 备选：`paiv/fci-breeds`（MIT，★49）

- 仓库：https://github.com/paiv/fci-breeds · 数据：`fci-breeds.csv`（85,962 字节，361 行）
- **实测表头**：`id,name,group,section,provisional,country,url,image,pdf`

**结论：不含任何体型数值。** 它的 `pdf` 列指向 FCI 官方标准 PDF（数值在 PDF 里，不在 CSV 里）。
用途降级为：**品种 → 官方标准出处链接**（溯源用），不做数据源。

### 1.3 ❌ 没有找到 / 证据不足

| 想要的东西 | 搜索情况 | 结论 |
|---|---|---|
| 猫的品种体重表 | `"cat breed" in:name,description stars:>2`（31 命中）、`cat breed weight size chart`、`"cat" breed in:name data csv`、`cat breed weight reference data` | 命中的 `batogov/cat-breeds-classifier`（400MB 深度学习）、`qq598516797-dotcom/cat-planet`（React 3D 图鉴，仓库内 **无 JSON 数据**）、`AcademyIFCE/CatBreedsList`（Swift App，运行时拉 API，仓库内无数据） | **没有可用轮子**，猫表手写 |
| 体况评分 BCS 实现 | `"body condition score" pet`（**全站仅 1 个结果**：`danieldriggs13/pet-weight-loss-calculator`，★0，Python 桌面程序，许可 NOASSERTION） | **不可抄**，规则手写 |
| 犬种生长曲线（幼年按月龄估重） | `dog breed height weight csv dataset`、`project_preliminary_code` 等 | 只有 Kaggle 竞赛数据集（无许可标记），无「按月龄插值成年体重」的开源实现 | **没有可用轮子**，用「成年体重 × 生长系数」自写 |

---

## 二、宠物出门打架（战斗引擎）

### 2.1 ⚠️ 值得抄的是「思路」，不是代码：`smogon/pokemon-showdown`（MIT，★6010）

- 仓库：https://github.com/smogon/pokemon-showdown · 许可：MIT · 最后推送 2026-10-31（非常活跃）
- 核心目录 `sim/`（**TypeScript**，实测文件大小）：

```
sim/battle.ts          119,685   战斗主循环（回合调度）
sim/battle-actions.ts   75,215   招式结算 + 伤害公式  ← 唯一值得抄的部分
sim/battle-queue.ts     12,258   行动队列
sim/side.ts             47,212   一方的状态（HP/状态/道具）
sim/prng.ts             10,353   可复现随机数  ← 值得抄「模式」
sim/dex-species.ts      30,516   物种数据（宝可梦专属，用不上）
sim/dex-moves.ts        24,569   招式数据（用不上）
sim/team-validator.ts  116,905   队伍校验（用不上）
```

**① 值得抄的伤害公式**（`sim/battle-actions.ts` 原文，已核对）：

```ts
const baseDamage = tr(tr(tr(tr(2 * level / 5 + 2) * basePower * attack) / defense) / 50);
```

> 这条公式的结构是：`等级系数 × 威力 × 攻击 / 防御 / 50`，逐层取整。
> 映射到宠物打架：
> `伤害 = ((2 * 等级 / 5 + 2) * 技能威力 * 攻击 / 防御) / 50`，再叠加体型系数、性格系数、随机因子。

**② 值得抄的是 PRNG 的「可复现」模式**（`sim/prng.ts` 文件头注释原文）：

```
* This makes it possible to record an "input log" (a seed +
* initial teams + move/switch decisions) and "replay" a simulation to
* get the same result.
```

**本项目怎么落地：**

- **不要 vendor 整个 `sim/`**（TypeScript + 强耦合宝可梦数据 + 80 万行级别资产）。
- 抄的是**模式**：给战斗结算函数注入可播种的随机数。

  ```js
  // src/domain/battle.js —— 纯函数，随机数由参数注入（照抄本项目 clock.now() 的端口模式）
  export function makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  export function resolveBattle({ mine, foe, rng }) {
    // 回合结算 → { rounds, hpLeft, outcome:'win'|'lose'|'draw', injury, rewards }
  }
  ```
  > 10 行 LCG 就够，**不需要抄 showdown 的 10KB prng.ts**（它现在的实现还依赖 `ts-chacha20`，
  > 且已不是自包含文件）。**结论：抄思路，自己写 10 行。**

- `src/data/battle-tables.js`（纯数据）：对手 NPC 库。
  **对手的体型/体重直接复用 §1.1 的 `BREED_SIZES`**——「金毛 vs 泰迪」的体型差就是天然战力差，
  这让「宠物身高体重类型」和「宠物打架」两个功能**共用一张数据表**。
- 结算纯度要求（对照本项目 `dev/check.js` 与 `dev/test/*.test.js` 的既有约定）：
  `resolveBattle` 不碰 `S`、不碰 DOM、不用 `Date.now()`，全部走参数 → 才有单测。

### 2.2 ❌ 3D 物理引擎：不建议

| 库 | 许可 | ★ | 单文件体积 | 判断 |
|---|---|---|---|---|
| `pmndrs/cannon-es` | MIT | 2066 | 346,256 字节 | 3D 刚体物理。**不抄**：PRD 对战斗的落点是「弹窗文字 + 图片结算」，引物理引擎要处理 r128 老 three.js 的 API 兼容、坐标系、体积翻倍 |
| `liabru/matter-js` | MIT | 18577 | 更大 | 2D 物理。同上不抄 |

> 参考：PRD §4.8 明确写「触发模式：参考**旅行青蛙**：无任何交互、自动触发，弹窗文字 + 图片形式结算事件过程与奖励」。
> **战斗的交付物是文案 + 结算卡，不是 3D 打斗演出。**

### 2.3 ⚠️ 3D 自主行为状态机：没有值得抄的轮子

- 搜了 `virtual pet simulator`（434 命中）、`desktop pet tamagotchi`（99 命中）、`three.js pet game virtual pet`（2 命中）。
- 命中的都是 Electron 桌面宠物 / ESP32 硬件项目 / Unity C# / React Three.js，与本项目「原生 ES Module + three.js r128 + 零依赖」的形态都不匹配。
- 相对最接近的 `cconsta1/tamagotchi`（three.js，★6，无许可声明）体量也很小，没有可复用的行为框架。
- **结论：不要抄。本项目 `src/views/w3d/ai.js` 的扁平状态机（idle/walk/shelter/play/jump/sleep，每帧按属性决策）
  已经比这些项目干净**，只需要按 PRD 补「多宠互动：打架、舔毛」两个状态即可。

---

## 三、风险与许可

1. **akcdata 是 MIT**：可商用、可改写、需保留版权声明与 MIT 文本。
   建议在 `src/data/pet-sizes.js` 头部写：
   ```js
   // 数据来源：https://github.com/tmfilho/akcdata (MIT License)
   // 原始数据自 AKC 官网抓取（2020-05-18），单位已换算为 cm / kg
   ```
   MIT 不要求署名，但建议在「关于/致谢」里点一句。
2. **AKC 数据的时效性**：抓取于 2020 年，277 个犬种。个别品种标准后来有修订（如拉布拉多体重上限下调）。
   **产品口径要写清楚**：「参考区间（AKC 2020）」，不要写成医学结论。
3. **数据源归属风险**：AKC 官网内容有版权。本项目只是把**数值**放进自己的表，
   且不复制 `description`（那段是 AKC 的文字，改写会引入版权问题）。
   → **抄数值，不抄 description / temperament 原文。**
4. **pokemon-showdown 的 MIT 只覆盖它的代码**：宝可梦的名称、招式、种族值是任天堂/Creatures 的 IP。
   **只抄公式结构，不抄任何宝可梦数据**——本项目的对手 NPC 必须自创（"街角的大黄"之类）。
5. **供应链**：本项目不引入 npm 依赖，`akcdata` 的 CSV 是一次性手工转换进 `src/data/` 的静态数据，
   没有运行时供应链风险。

---

## 四、没有找到 / 证据不足（明确列出来）

1. **猫的成年体重/体型参考表** —— 搜 4 组关键词，GitHub 上无可直接用的数据集。
2. **体况评分 BCS 的开源实现** —— 全站仅 1 个 0-star Python 桌面程序，许可不明确，不可用。
3. **「按月龄插值成年体重」的宠物生长曲线库** —— 只有 Kaggle 竞赛数据集，无许可。
4. **浏览器端宠物对战/回合制对战引擎（轻量、MIT、零依赖）** —— 搜 `turn based battle engine javascript`
   仅 5 个命中，全是 0-star 个人项目；`pokemon showdown` 是唯一成熟的，但形态不匹配。
5. **虚拟宠物自主行为状态机的可复用实现** —— 命中的全是桌面宠物 / 硬件 / Unity 形态。
6. 结论：本主题的**唯一可直接抄的数据资产是 `tmfilho/akcdata`**，
   战斗部分**抄思路（伤害公式 + 可复现随机数）而不是抄代码**。
