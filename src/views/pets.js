/**
 * 宠物视图：SVG 形象、头像块、当前宠物、切换宠物、档案成长/年龄。
 *
 * 这里只有"怎么画"和"当前是谁"，不掺业务规则；
 * 成长数值的计算在 src/domain/pet.js，本模块转手暴露给模板层使用。
 */
import { S, save } from '../app/store.js';
import { $, esc } from '../app/dom.js';
import { openSheet, closeSheet, toast } from '../app/ui.js';
import { go, refreshCurrentPage } from '../app/router.js';
import { registerActions } from '../app/actions.js';
import { ui } from '../app/ui-state.js';
import { ensureGarden, petLevelOf, petAgeOf } from '../domain/pet.js';

/* ---------------- 形状 ---------------- */

/** 按比例压暗一个 #rrggbb 颜色（用于描边/阴影） */
function shade(hex, factor) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 255) * factor));
  const g = Math.max(0, Math.round(((n >> 8) & 255) * factor));
  const b = Math.max(0, Math.round((n & 255) * factor));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function accessorySVG(acc) {
  if (acc === 'hat') return '<path d="M100 12 L88 54 L112 54 Z" fill="#E8709A" stroke="#D95A88" stroke-width="2" stroke-linejoin="round"/><circle cx="100" cy="12" r="6" fill="#F5D061"/>';
  if (acc === 'bow') return '<path d="M82 128 L100 137 L82 146 Z" fill="#E8709A"/><path d="M118 128 L100 137 L118 146 Z" fill="#E8709A"/><circle cx="100" cy="137" r="5.5" fill="#D95A88"/>';
  if (acc === 'scarf') return '<path d="M70 126 Q100 141 130 126 L127 139 Q100 153 73 139 Z" fill="#5B8DEF"/><path d="M118 136 L124 158 L112 156 Z" fill="#4A7BD0"/>';
  if (acc === 'collar') return '<path d="M73 124 Q100 137 127 124 L126 132 Q100 145 74 132 Z" fill="#D9534F"/><circle cx="100" cy="141" r="4.5" fill="#F5D061"/>';
  return '';
}

function eyesSVG(mood) {
  if (mood === 'sleep') return '<path d="M78 96q8 7 16 0" stroke="#4A3B2A" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M106 96q8 7 16 0" stroke="#4A3B2A" stroke-width="4" fill="none" stroke-linecap="round"/>';
  if (mood === 'happy') return '<path d="M76 98q9-10 18 0" stroke="#4A3B2A" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M104 98q9-10 18 0" stroke="#4A3B2A" stroke-width="4.5" fill="none" stroke-linecap="round"/>';
  if (mood === 'sick') return '<circle cx="86" cy="97" r="5" fill="#4A3B2A"/><circle cx="114" cy="97" r="5" fill="#4A3B2A"/><path d="M74 86l14 4M126 86l-14 4" stroke="#4A3B2A" stroke-width="3.5" stroke-linecap="round"/>';
  return '<circle cx="86" cy="97" r="5.5" fill="#4A3B2A"/><circle cx="114" cy="97" r="5.5" fill="#4A3B2A"/><circle cx="88" cy="95" r="2" fill="#fff"/><circle cx="116" cy="95" r="2" fill="#fff"/>';
}

/**
 * 宠物形象 SVG。
 * @param {object} pet 宠物档案（决定物种/毛色/配饰）
 * @param {number} size 边长（px）
 * @param {'normal'|'happy'|'sleep'|'sick'} [mood] 表情
 */
export function petSVG(pet, size, mood) {
  const cat = pet.species === '猫';
  const fur = pet.fur || (cat ? '#F5B85C' : '#E8B07E');
  const furDark = pet.fur ? shade(pet.fur, 0.85) : (cat ? '#E89B3C' : '#D0925B');
  const inner = cat ? '#FBE3C4' : '#F6E3CC';

  const nose = cat
    ? '<path d="M94 110q6 6 12 0" stroke="#E07B54" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M100 112l0 5M100 117l-5 4M100 117l5 4" stroke="#C9A98C" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    : '<ellipse cx="100" cy="112" rx="7" ry="5" fill="#4A3B2A"/>';
  const mouth = cat
    ? '<path d="M100 118v4M100 122q-5 5-10 2M100 122q5 5 10 2" stroke="#7A5C40" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    : '<path d="M92 122q8 7 16 0" stroke="#7A5C40" stroke-width="3" fill="none" stroke-linecap="round"/>';

  const ears = cat
    ? '<path d="M56 62L50 26l30 18z" fill="' + fur + '" stroke="' + furDark + '" stroke-width="3" stroke-linejoin="round"/><path d="M144 62l6-36-30 18z" fill="' + fur + '" stroke="' + furDark + '" stroke-width="3" stroke-linejoin="round"/><path d="M58 56l-3-20 18 11z" fill="#F7CFCB"/><path d="M142 56l3-20-18 11z" fill="#F7CFCB"/>'
    : '<path d="M56 66L48 30l34 16z" fill="' + fur + '" stroke="' + furDark + '" stroke-width="3" stroke-linejoin="round"/><path d="M144 66l8-36-34 16z" fill="' + fur + '" stroke="' + furDark + '" stroke-width="3" stroke-linejoin="round"/>';

  const tail = cat
    ? '<g class="tail" style="transform-origin:146px 150px"><path d="M144 148q26-6 24-34" stroke="' + fur + '" stroke-width="13" fill="none" stroke-linecap="round"/></g>'
    : '<path d="M76 160q-24 4-20 22" stroke="' + fur + '" stroke-width="10" fill="none" stroke-linecap="round"/>';

  return '<svg viewBox="0 0 200 200" width="' + size + '" height="' + size + '">' + ears +
    '<g class="gp-bob"><ellipse cx="100" cy="152" rx="46" ry="34" fill="' + fur + '"/>' +
    '<g><ellipse cx="100" cy="98" rx="52" ry="46" fill="' + fur + '"/>' +
    '<ellipse cx="100" cy="108" rx="40" ry="30" fill="' + inner + '"/>' +
    eyesSVG(mood) + nose + mouth +
    '<ellipse cx="74" cy="114" rx="7" ry="4.5" fill="#F2A9A0" opacity=".7"/>' +
    '<ellipse cx="126" cy="114" rx="7" ry="4.5" fill="#F2A9A0" opacity=".7"/>' +
    accessorySVG(pet.acc) + '</g></g>' + tail + '</svg>';
}

/** 宠物照片头像块（远程图挂了会走 imgErr 兜底） */
export function petImgTag(pet, cls) {
  return '<div style="position:relative;width:100%;height:100%;overflow:hidden;border-radius:inherit" class="' + (cls || '') + '">' +
    '<img src="' + pet.img + '" style="width:100%;height:100%;object-fit:cover" onerror="app.imgErr(this)"></div>';
}

/* ---------------- 当前宠物 ---------------- */

/** 当前宠物档案（curPet 失效时退回第一只） */
export function curPet() {
  return S.pets.find((p) => p.id === S.curPet) || S.pets[0];
}

/** 宠物家园四维（首次访问时初始化） */
export function petGarden(pet) {
  return ensureGarden(pet);
}

export function petLevel(pet) {
  return petLevelOf(petGarden(pet));
}

export function petAge(pet) {
  return petAgeOf(pet);
}

/* ---------------- 交互 ---------------- */

/** 切换宠物面板 */
export function switchPetSheet() {
  const quick = '<div style="display:flex;gap:12px;margin:2px 0 14px;justify-content:center">' +
    S.pets.map((p) =>
      '<div style="text-align:center;cursor:pointer" onclick="app.pickPet(\'' + p.id + '\')">' +
      '<div style="width:46px;height:46px;border-radius:50%;overflow:hidden;' + (p.id === S.curPet ? 'outline:2.5px solid var(--blue-d);outline-offset:2px' : '') + '">' + petImgTag(p) + '</div>' +
      '<div style="font-size:9.5px;margin-top:4px;color:' + (p.id === S.curPet ? 'var(--blue-d)' : 'var(--sub)') + ';font-weight:' + (p.id === S.curPet ? '800' : '400') + '">' + p.name + '</div></div>').join('') +
    '</div>';

  const list = S.pets.map((p) =>
    '<div class="card chov" style="display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:10px' + (p.id === S.curPet ? ';outline:2px solid var(--blue-d)' : '') + '" onclick="app.pickPet(\'' + p.id + '\')">' +
    '<div style="width:52px;height:52px;border-radius:16px;flex:none">' + petImgTag(p) + '</div>' +
    '<div style="flex:1"><div style="font-weight:700;display:flex;align-items:center;gap:6px">' + p.name + (p.id === S.curPet ? '<span class="chip" style="font-size:9px;padding:2px 7px">当前</span>' : '') + '</div>' +
    '<div style="font-size:11px;color:var(--sub)">' + p.species + ' · ' + p.breed + ' · ' + petAge(p) + ' · 饱食' + Math.round(petGarden(p).satiety) + '</div></div>' +
    '<svg class="icon" style="color:' + (p.id === S.curPet ? 'var(--blue-d)' : '#C9D2DD') + '"><use href="#i-check"/></svg></div>').join('');

  openSheet('切换宠物', quick + list +
    '<button class="btn btn-ghost" style="margin-top:4px" onclick="app.newPetProfile()"><svg class="icon icon-s" style="vertical-align:-3px"><use href="#i-plus"/></svg> 新建宠物档案</button>');
}

/** 切换到指定宠物并刷新当前页 */
function pickPet(id) {
  if (id === S.curPet) {
    closeSheet();
    toast('当前已是「' + curPet().name + '」');
    return;
  }
  S.curPet = id;
  save();
  closeSheet();
  refreshCurrentPage();
  const chip = $('ctxChip');
  if (chip) chip.innerHTML = ctxTag();
  toast('已切换至「' + curPet().name + '」');
}

/** 从切换面板进入"新建档案" */
function newPetProfile() {
  closeSheet();
  ui.profileEditingPetId = null;
  ui.profTab = 'album';
  go('petedit');
}

/* ---------------- AI 上下文 ---------------- */

/** 当前注入 AI 的宠物（关闭上下文开关时返回 null） */
export function ctxPet() {
  return S.set.context ? curPet() : null;
}

/** AI 页顶部的档案上下文 chip */
export function ctxTag() {
  const p = ctxPet();
  if (!p) {
    return '<span class="chip" style="background:rgba(0,0,0,.06);color:#8A99AB;cursor:pointer" onclick="app.toggleCtx()"><svg class="icon icon-s"><use href="#i-x"/></svg>通用模式（未注入档案）</span>';
  }
  const summary = esc(p.name + ' · ' + p.breed + ' · ' + petAge(p) + ' · ' + p.weight + 'kg');
  return '<span class="chip" style="cursor:pointer" onclick="app.toggleCtx()" title="点击切换上下文开关"><svg class="icon icon-s"><use href="#i-paw"/></svg>已注入档案：' + summary + '</span>';
}

registerActions('pets', { petSVG, petImgTag, petGarden, petLevel, petAge, switchPetSheet, pickPet, newPetProfile, ctxPet, ctxTag });

/* 模板层还用到、但不在主注册表里的动作 */
registerActions('pets-extra', { curPet });
