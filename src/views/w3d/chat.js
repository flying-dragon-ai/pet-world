/**
 * 3D 舞台内的宠物聊天（对齐《虚拟宠物家园》2D 小游戏的 petChat）。
 *
 * 台词规则在 domain/w3d.js 的 petReply()，这里只负责面板渲染与消息往返。
 */
import { $, esc } from '../../app/dom.js';
import { registerActions } from '../../app/actions.js';
import { petReply } from '../../domain/w3d.js';
import { sayInStage, emote } from './fx.js';

/** 快捷提问（与 HTML 小游戏同款） */
const QUICK = ['想我了吗', '今天开心吗', '出去玩吗', '你吃饭了吗', '我爱你'];

/** 当前对话上下文（宠物档案 + 派生性格 + 思念模式） */
let ctx = { name: '宠物', attr: {}, traits: {}, memorial: false };

function greet() {
  if (ctx.memorial) return '我一直都在哦，主人。今天过得好吗？🌈';
  return '汪！' + ctx.name + ' 在呢～今天想聊点什么？';
}

/** 打开聊天面板 */
export function openChat(next) {
  ctx = { ...ctx, ...(next || {}) };
  const panel = $('w3dChat');
  const box = $('w3dChatBox');
  if (!panel || !box) return;
  box.innerHTML = '<div class="msg pet">' + esc(greet()) + '</div>';
  panel.classList.add('show');
  const input = $('w3dChatIn');
  if (input) input.value = '';
  const quick = $('w3dChatQuick');
  if (quick) {
    quick.innerHTML = QUICK.map((q) => '<button onclick="app.w3dChatQuick(\'' + q + '\')">' + esc(q) + '</button>').join('');
  }
}

/** 关闭聊天面板 */
export function closeChat() {
  const panel = $('w3dChat');
  if (panel) panel.classList.remove('show');
}

/** 发送一条消息 */
export function chatSend(text) {
  const input = $('w3dChatIn');
  const q = String(text || (input && input.value) || '').trim();
  if (!q) return;
  if (input) input.value = '';
  const box = $('w3dChatBox');
  if (!box) return;
  box.insertAdjacentHTML('beforeend', '<div class="msg me">' + esc(q) + '</div>');
  box.scrollTop = box.scrollHeight;

  setTimeout(() => {
    const reply = petReply(q, { ...ctx, roll: Math.random() });
    box.insertAdjacentHTML('beforeend', '<div class="msg pet">' + esc(reply) + '</div>');
    box.scrollTop = box.scrollHeight;
    sayInStage(reply.slice(0, 18));
    emote('wag');
  }, 420);
}

registerActions('w3d-chat', {
  w3dChatSend: chatSend,
  w3dChatClose: closeChat,
  w3dChatQuick: chatSend,
  w3dChatOpen: openChat,
});
