'use strict';

// ===== Ввод и главный цикл =====

window.addEventListener('keydown', function (e) {
  keys[e.code] = true;
  if (e.code === 'KeyM') {
    muted = !muted;
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.5;
    if (!muted) ensureAudio();
  }
  if (gameState === 'game') {
    if (e.code === 'Space') { e.preventDefault(); if (level === 2) dropBomb(); }
    if (e.code === 'KeyG' && level === 4) throwGrenade();
  }
});

window.addEventListener('keyup', function (e) {
  keys[e.code] = false;
});

window.addEventListener('mousemove', function (e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mousedown', function (e) {
  ensureAudio();
  if (e.button === 0 && gameState === 'game') mouse.down = true;
});

window.addEventListener('mouseup', function (e) {
  if (e.button === 0) mouse.down = false;
});

window.addEventListener('contextmenu', function (e) {
  if (gameState === 'game') e.preventDefault();
});

var lastT = 0;
var MAX_DT = 0.05; // ограничение шага по времени — защита от «прыжков» при фоновых вкладках

function loop(t) {
  requestAnimationFrame(loop);
  if (!lastT) lastT = t;
  var dt = Math.min(MAX_DT, (t - lastT) / 1000);
  lastT = t;
  if (gameState === 'game' && player) update(dt);
  if (gameState !== 'menu') render();
}

requestAnimationFrame(loop);

// Экспорт для кнопок меню (inline onclick в HTML).
window.__startLevel = startLevel;
window.gameReady = true;
