/**
 * 应用级常量。只放"会被多处读取、且不随运行变化"的值。
 * 禁止在这里放可变状态 —— 状态一律进 store。
 */

/** localStorage 键名：V1.8.1 沿用旧键，避免老用户数据丢失。 */
export const STORAGE_KEY = 'pet_butler_demo_v1';

/** 存档结构版本（迁移器按此判断）。 */
export const SCHEMA_VERSION = 3;

export const APP_NAME = '宠物数字管家';
export const APP_VERSION = 'V1.10.0';

/** 世界成长：每 50 成长值 1 级，1–100 级。 */
export const GROWTH_PER_LEVEL = 50;
export const WORLD_MAX_LEVEL = 100;

/** 六维属性上限：成长/智慧可到 9999，其余 0–100。 */
export const ATTR_CAP_HIGH = 9999;
export const ATTR_CAP = 100;

/** 运动馆 / 娱乐馆解锁等级。 */
export const VENUE_UNLOCK_LEVEL = 30;

/** 3D 手动互动冷却（毫秒）。 */
export const W3D_ACTION_COOLDOWN_MS = 3000;

/** 宠物打架最多打多少回合（超过算平手）。 */
export const BATTLE_MAX_ROUNDS = 8;

/** 「街头大战」事件的触发阈值：冲动值与攻击值都要超过它。 */
export const STREET_FIGHT_IMPULSE = 60;
export const STREET_FIGHT_AGGRESSION = 60;
