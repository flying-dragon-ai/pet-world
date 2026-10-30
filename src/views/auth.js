/**
 * 登录 / 注册 / 新手导览。
 *
 * 演示版验证码固定 888888；锁定、作废、倒计时都是真实交互流程的形状，
 * 只是不发短信。登录态写进存档（S.loggedIn），刷新后仍然登录。
 */
import { S, save } from '../app/store.js';
import { $, shake } from '../app/dom.js';
import { toast } from '../app/ui.js';
import { go, registerPage } from '../app/router.js';
import { registerActions } from '../app/actions.js';

const DEMO_CODE = '888888';
const RESEND_SECONDS = 60;
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 600;

/** 验证码相关的一次性状态（不需要落盘） */
const codeState = { left: 0, errors: 0, lockLeft: 0 };

const ONBOARDING = [
  { title: 'AI 全场景养宠顾问', desc: '九大场景随问随答，档案上下文注入，回答贴合你家宠物的真实情况', icon: 'i-spark', gradient: 'linear-gradient(135deg,#8FB6EE,#3A7BD5)' },
  { title: '虚拟家园 · 线上陪伴', desc: '真实健康数据联动虚拟宠物状态，喂食抚摸玩耍，情感陪伴不断线', icon: 'i-paw', gradient: 'linear-gradient(135deg,#F0B36A,#E8945A)' },
  { title: '一站式养宠服务', desc: '监控看护 · 健康档案 · 社区 · 电商 · 3D玩偶定制 · 携宠旅游，一个APP全搞定', icon: 'i-home', gradient: 'linear-gradient(135deg,#9AD3A8,#4CA876)' },
];

let onboardingStep = 0;

/* ---------------- 表单 ---------------- */

function sanitizePhone() {
  const input = $('lgPhone');
  input.value = input.value.replace(/\D/g, '').slice(0, 11);
}

function isValidPhone(value) {
  return /^1[3-9]\d{9}$/.test(value);
}

function sendCode() {
  const phone = $('lgPhone').value;
  if (!isValidPhone(phone)) {
    toast('请输入正确的11位手机号（13-19号段）');
    shake($('codeRow'));
    return;
  }
  if (codeState.lockLeft > 0) {
    toast('该手机号已锁定，请' + codeState.lockLeft + '秒后再试');
    return;
  }

  codeState.left = RESEND_SECONDS;
  codeState.errors = 0;
  const button = $('btnSend');
  button.disabled = true;
  const timer = setInterval(() => {
    codeState.left--;
    button.textContent = codeState.left + 's 后重发';
    if (codeState.left <= 0) {
      clearInterval(timer);
      button.disabled = false;
      button.textContent = '获取验证码';
    }
  }, 1000);
  toast('验证码已发送（Demo请输入 ' + DEMO_CODE + '）');
}

function login() {
  if (!$('lgAgree').checked) {
    toast('请先阅读并勾选用户协议与隐私政策');
    return;
  }
  const phone = $('lgPhone').value;
  const code = $('lgCode').value;

  if (!isValidPhone(phone)) {
    toast('请输入正确的11位手机号');
    return;
  }
  if (codeState.lockLeft > 0) {
    toast('该手机号已锁定，请' + codeState.lockLeft + '秒后再试');
    return;
  }
  if (code !== DEMO_CODE) {
    codeState.errors++;
    shake($('lgCode'), 450);
    if (codeState.errors >= MAX_ATTEMPTS) {
      codeState.lockLeft = LOCK_SECONDS;
      toast('失败次数过多，该手机号已锁定10分钟');
      return;
    }
    if (codeState.errors >= 3) {
      toast('该验证码已作废，请重新获取');
      codeState.left = 0;
      const button = $('btnSend');
      button.disabled = false;
      button.textContent = '获取验证码';
    } else {
      toast('验证码错误，还可尝试' + (MAX_ATTEMPTS - codeState.errors) + '次');
    }
    return;
  }

  S.loggedIn = true;
  S.isGuest = false;
  save();
  if (!S.onboarded) {
    $('onb').classList.add('show');
    onboardingStep = 0;
    renderOnboarding();
  } else {
    toast('登录成功，欢迎回来');
    go('home');
  }
}

function guestLogin() {
  S.loggedIn = true;
  S.isGuest = true;
  save();
  toast('体验数据仅保存在本机，注册后可云端保存');
  go('home');
}

/* ---------------- 新手导览 ---------------- */

function renderOnboarding() {
  const step = ONBOARDING[onboardingStep];
  $('onbT').textContent = step.title;
  $('onbD').textContent = step.desc;
  $('onbArt').style.background = step.gradient;
  $('onbArt').innerHTML = '<svg viewBox="0 0 24 24" style="width:70px;height:70px;stroke:#fff;fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round"><use href="#' + step.icon + '"/></svg>';
  $('onbNext').textContent = onboardingStep === ONBOARDING.length - 1 ? '开始使用' : '下一步';
  document.querySelectorAll('.onb-dot').forEach((dot, i) => dot.classList.toggle('act', i === onboardingStep));
}

function onboardingNext() {
  if (onboardingStep < ONBOARDING.length - 1) {
    onboardingStep++;
    renderOnboarding();
    return;
  }
  finishOnboarding();
}

function finishOnboarding() {
  S.onboarded = true;
  save();
  $('onb').classList.remove('show');
  go('home');
}

/** 启动时若已登录但没看完导览，直接补上 */
export function resumeOnboardingIfNeeded() {
  if (S.loggedIn && !S.onboarded) {
    $('onb').classList.add('show');
    renderOnboarding();
    return true;
  }
  return false;
}

registerPage('login', {});

registerActions('auth', {
  lgPhoneIn: sanitizePhone,
  sendCode,
  doLogin: login,
  guestLogin,
  onbNext: onboardingNext,
  finOnb: finishOnboarding,
});
