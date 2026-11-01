/**
 * 舞台内的即时反馈：聊天气泡、表情符号飘字、底部 toast。
 *
 * 舞台没打开时 toast 自动退回 App 的全局 toast，调用方不用判断。
 */
import { $ } from '../../app/dom.js';
import { toast } from '../../app/ui.js';
import { getStage } from './ctx.js';

/** 宠物说一句话（3 秒） */
export function sayInStage(text) {
  const s = getStage();
  if (!s) return;
  s.say = text;
  s.sayUntil = s.clock.elapsedTime + 3;
}

/** 宠物做一个表情动作（jump / play） */
const EMOTE_STATE = {
  play: 'play',
  jump: 'jump',
  happy: 'happy',
  eat: 'eat',
  shake: 'shake',
  wag: 'wag',
  nod: 'nod',
  lie: 'lie',
};

/** 宠物做一个表情动作（play / happy / eat / shake / wag / nod / lie） */
export function emote(kind) {
  const s = getStage();
  if (!s) return;
  const state = EMOTE_STATE[kind] || 'jump';
  s.ai.state = state;
  s.ai.t = state === 'play' || state === 'happy' ? 2.6 : (state === 'eat' || state === 'shake' ? 2.2 : 1.6);
}

/** 在宠物头顶飘三个小图标（世界坐标 → 屏幕坐标） */
export function spawnFx(icon, color) {
  const s = getStage();
  if (!s || !s.pet) return;
  const projected = s.pet.position.clone();
  projected.y += 1.7;
  projected.project(s.camera);
  const x = (projected.x * 0.5 + 0.5) * s.viewW;
  const y = (-projected.y * 0.5 + 0.5) * s.viewH;

  const box = $('w3dFx');
  if (!box) return;
  for (let i = 0; i < 3; i++) {
    const span = document.createElement('span');
    span.className = 'w3d-fx-i';
    span.textContent = icon;
    span.style.left = (x + (Math.random() * 56 - 28)) + 'px';
    span.style.top = (y + (Math.random() * 14 - 7)) + 'px';
    span.style.color = color;
    span.style.animationDelay = (i * 0.12) + 's';
    box.appendChild(span);
    setTimeout(() => span.remove(), 1500);
  }
}

/** 舞台内提示条；舞台隐藏时退回 App toast */
export function sendStageToast(text) {
  const stageEl = $('w3dStage');
  const box = $('w3dToast');
  if (!stageEl || !stageEl.classList.contains('show') || !box) {
    toast(text);
    return;
  }
  box.textContent = text;
  box.classList.add('show');
  clearTimeout(box._tm);
  box._tm = setTimeout(() => box.classList.remove('show'), 2000);
}
