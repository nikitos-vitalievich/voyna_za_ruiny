'use strict';

// ===== Общие утилиты, состояние меню и звука =====

var TAU = Math.PI * 2;

var cv = document.getElementById('cv');
var ctx = cv.getContext('2d');
var W = window.innerWidth, H = window.innerHeight;

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  cv.width = W;
  cv.height = H;
}
window.addEventListener('resize', resize);
resize();

function rand(a, b) { return a + Math.random() * (b - a); }
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function dist(ax, ay, bx, by) {
  var dx = ax - bx, dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}
function circle(x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ===== Состояние приложения: меню, сложность, звук =====

var muted = false;
var audioCtx = null;
var masterGain = null;
var difficulty = 'normal';

function ensureAudio() {
  try {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.5;
      masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) {
    audioCtx = null;
  }
}

function setStatus(text) {
  var s = document.getElementById('status');
  if (s) s.textContent = text;
}

function setDiff(d) {
  difficulty = d;
  ensureAudio();
  var names = ['easy', 'normal', 'hard'];
  for (var i = 0; i < names.length; i++) {
    var el = document.getElementById('diff-' + names[i]);
    if (el) el.className = 'btn' + (names[i] === d ? ' active' : '');
  }
}

function startGame() {
  ensureAudio();
  if (!window.gameReady) {
    setStatus('Игровые модули не загрузились — обновите страницу (Ctrl+Shift+R).');
    return;
  }
  try {
    window.__startLevel(1);
  } catch (e) {
    setStatus('Ошибка запуска: ' + e.message);
  }
}

window.onerror = function (msg) {
  var b = document.getElementById('errbar');
  if (b) {
    b.style.display = 'block';
    b.textContent = 'Ошибка скрипта: ' + msg;
  }
};
