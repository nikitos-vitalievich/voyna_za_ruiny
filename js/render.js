'use strict';

// ===== Отрисовка: техника, декорации, HUD, баннеры =====

// ---- Примитивы техники (общие для игрока и врагов) ----

function drawTank(x, y, ang, c1, c2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#26261f';
  rr(-27, -21, 54, 9, 3); ctx.fill();
  rr(-27, 12, 54, 9, 3); ctx.fill();
  ctx.fillStyle = c1;
  rr(-24, -13, 48, 26, 5); ctx.fill();
  ctx.fillStyle = c2;
  rr(-10, -9, 20, 18, 3); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang || 0);
  ctx.fillStyle = c2;
  ctx.fillRect(6, -3, 30, 6);
  circle(0, 0, 11);
  ctx.restore();
}

function drawPlane(x, y, c1, c2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c1;
  ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, -2); ctx.lineTo(2, -26); ctx.lineTo(-8, -26); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, 2); ctx.lineTo(6, 2); ctx.lineTo(2, 26); ctx.lineTo(-8, 26); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(-12, -10); ctx.lineTo(-12, 10); ctx.lineTo(-20, 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(0, 0, 22, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = c2; circle(8, 0, 4);
  ctx.fillStyle = '#dddddd'; ctx.fillRect(24, -1, 2, 2);
  ctx.restore();
}

function drawBoat(x, y, ang, c1, c2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang || 0);
  ctx.fillStyle = c1;
  ctx.beginPath();
  ctx.moveTo(24, 0); ctx.lineTo(12, -10); ctx.lineTo(-20, -10); ctx.lineTo(-24, -4);
  ctx.lineTo(-24, 4); ctx.lineTo(-20, 10); ctx.lineTo(12, 10);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = c2; ctx.fillRect(-10, -6, 14, 12);
  ctx.fillStyle = '#222222'; ctx.fillRect(-4, -3, 6, 6);
  ctx.restore();
}

function drawSold(x, y, ang, c1, c2) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = c1; circle(0, 0, 9);
  ctx.fillStyle = c2; circle(0, -2, 6);
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(ang || 0) * 15, Math.sin(ang || 0) * 15);
  ctx.stroke();
  ctx.restore();
}

function drawTurret(t) {
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = '#b7a271';
  for (var i = 0; i < 8; i++) {
    var a = i / 8 * TAU;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * 17, Math.sin(a) * 17, 7, 5, a, 0, TAU);
    ctx.fill();
  }
  ctx.rotate(t.ang || 0);
  ctx.fillStyle = '#5a5a4a'; ctx.fillRect(4, -3, 26, 6);
  ctx.fillStyle = '#6b6b58'; circle(0, 0, 10);
  ctx.restore();
}

function drawCover(c) {
  // Мешки рисуем рядами «ёлочкой»; вертикальные укрытия поворачиваем.
  ctx.save();
  var hor = c.w >= c.h, L, T;
  if (hor) { ctx.translate(c.x, c.y); L = c.w; T = c.h; }
  else {
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.translate(-c.h / 2, -c.w / 2);
    L = c.h; T = c.w;
  }
  var n = Math.max(2, Math.round(L / 20));
  var rows = Math.max(1, Math.round(T / 11));
  ctx.fillStyle = '#c9b487';
  for (var r = 0; r < rows; r++) {
    for (var i = 0; i < n; i++) {
      var px = (i + 0.5) * L / n + (r % 2) * (L / n) / 2;
      ctx.beginPath();
      ctx.ellipse(px, 5 + r * 10, 10, 5, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawWreck(w) {
  var a = Math.max(0, 1 - w.t / w.dur);
  ctx.save();
  ctx.globalAlpha = Math.max(0.25, a);
  ctx.fillStyle = '#1c1c1c'; circle(w.x, w.y, 26);
  ctx.fillStyle = '#3a3a3a'; rr(w.x - 16, w.y - 8, 32, 16, 5); ctx.fill();
  ctx.restore();
}

function drawBuoy(b) {
  var bob = Math.sin(b.t * 3) * 3;
  ctx.fillStyle = '#eeeeee'; circle(b.x, b.y + bob, 7);
  ctx.fillStyle = '#2e9e4f'; ctx.fillRect(b.x - 2, b.y + bob - 14, 4, 12);
  ctx.fillStyle = '#dd3333'; ctx.fillRect(b.x + 2, b.y + bob - 14, 8, 6);
}

function drawExplosionFx(e) {
  var k = e.t / e.dur;
  var R = (12 + 95 * k) * (0.55 + 0.6 * e.size);
  var a = 1 - k;
  ctx.fillStyle = 'rgba(255,' + Math.floor(150 + 90 * (1 - k)) + ',40,' + (0.8 * a).toFixed(3) + ')';
  circle(e.x, e.y, R);
  ctx.strokeStyle = 'rgba(255,225,160,' + (0.6 * a).toFixed(3) + ')';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(e.x, e.y, R * 1.25, 0, TAU); ctx.stroke();
  if (k < 0.18) {
    ctx.fillStyle = 'rgba(255,255,255,' + ((1 - k / 0.18) * 0.9).toFixed(3) + ')';
    circle(e.x, e.y, R * 0.9);
  }
}

// ---- Участники боя ----

// Палитра вражеской и player-техники по типам/уровням.
var ENEMY_COLORS = {
  tank:  ['#6b4a41', '#7d5a4e'],
  plane: ['#8a4a41', '#c98f7f'],
  boat:  ['#7a4038', '#b07068'],
  sold:  ['#6b4a41', '#9a8a5b']
};
var PLAYER_COLORS = {
  1: ['#4a6741', '#5d7a4e'],
  2: ['#3e6ea5', '#8fd0ff'],
  3: ['#3e6ea5', '#7fb9d8'],
  4: ['#4a6741', '#8a9a5b']
};

function drawEnemy(e) {
  var col = ENEMY_COLORS[e.type];
  if (e.type === 'tank') drawTank(e.x, e.y, e.ang, col[0], col[1]);
  else if (e.type === 'plane') drawPlane(e.x, e.y, col[0], col[1]);
  else if (e.type === 'boat') drawBoat(e.x, e.y, e.ang, col[0], col[1]);
  else if (e.type === 'turret') drawTurret(e);
  else drawSold(e.x, e.y, e.ang, col[0], col[1]);
  if (e.hitT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    circle(e.x, e.y, e.type === 'sold' ? 12 : 24);
  }
  if (e.hp < e.maxhp) {
    var yy = e.y - (e.type === 'sold' ? 22 : 34);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(e.x - 20, yy, 40, 5);
    ctx.fillStyle = '#e53935'; ctx.fillRect(e.x - 20, yy, 40 * clamp(e.hp / e.maxhp, 0, 1), 5);
  }
}

function drawPlayerUnit() {
  var p = player;
  var col = PLAYER_COLORS[level];
  if (level === 1) drawTank(p.x, p.y, p.ang, col[0], col[1]);
  else if (level === 2) drawPlane(p.x, p.y, col[0], col[1]);
  else if (level === 3) drawBoat(p.x, p.y, p.ang, col[0], col[1]);
  else drawSold(p.x, p.y, p.ang, col[0], col[1]);
  if (p.hitT > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    circle(p.x, p.y, p.r);
  }
}

// ---- Фоны уровней ----

function drawSky() {
  var gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#7fb2e5');
  gr.addColorStop(1, '#d9ecf9');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  for (var i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.s, c.s * 0.45, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x + c.s * 0.7, c.y + 6, c.s * 0.6, c.s * 0.35, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#4d5b3a';
  ctx.fillRect(0, H - 46, W, 46);
}

function drawWater() {
  ctx.fillStyle = '#2a6fa8';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (var i = 0; i < 8; i++) {
    var yy = (i + 0.5) * H / 8;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 40) {
      var y = yy + Math.sin(x / 70 + tGame * 2 + i) * 4;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawGround() {
  ctx.fillStyle = (level === 4 ? '#6b7a4f' : '#66743f');
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (var i = 0; i < patches.length; i++) {
    ctx.fillRect(patches[i].x, patches[i].y, patches[i].w, patches[i].h);
  }
}

function drawBackground() {
  if (level === 2) drawSky();
  else if (level === 3) drawWater();
  else drawGround();
}

// ---- Снаряды ----

function drawBullets() {
  for (var i = 0; i < bullets.length; i++) {
    var b = bullets[i];
    if (b.type === 'shell') {
      ctx.fillStyle = (b.from === 'p') ? '#ffd54f' : '#ff7043';
      circle(b.x, b.y, 5);
    } else {
      ctx.strokeStyle = (b.from === 'p') ? '#fff59d' : '#ff8a80';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }
}

function drawBomb(b) {
  ctx.fillStyle = '#37474f';
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, 5, 9, 0, 0, TAU);
  ctx.fill();
}

function drawGrenade(g) {
  var k = g.t / g.dur;
  var x = g.x0 + (g.tx - g.x0) * k;
  var y = g.y0 + (g.ty - g.y0) * k - Math.sin(k * Math.PI) * 70;
  ctx.fillStyle = '#3a5a2a'; circle(x, y, 5);
  ctx.fillStyle = '#dddddd'; ctx.fillRect(x - 2, y - 8, 4, 4);
}

// ---- HUD и баннер уровня ----

function bar(x, y, w, h, k, fg, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#333333'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
  ctx.fillStyle = '#ffffff'; ctx.font = '11px Arial'; ctx.textAlign = 'left';
  ctx.fillText(label, x + w + 8, y + h);
}

var LEVEL_HINTS = {
  2: 'ЛКМ — пулемёт | ПРОБЕЛ — бомба',
  4: 'WASD — бег | ЛКМ — винтовка | G — граната'
};

function drawHUD() {
  var hpK = player.hp / player.maxhp;
  bar(16, 16, 180, 16, hpK, hpK > 0.35 ? '#4caf50' : '#e53935', 'HP ' + Math.max(0, Math.round(player.hp)));
  bar(16, 42, 180, 10, ecology / 100, '#8bc34a', 'ЭКО ' + Math.round(ecology) + '%');
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('Материалы: ' + materials, 16, 74);
  if (level === 4) ctx.fillText('Гранаты (G): ' + grenadesN, 16, 94);
  ctx.textAlign = 'center';
  ctx.fillText('УРОВЕНЬ ' + level + ' — ' + LEVEL_NAMES[level], W / 2, 30);
  ctx.textAlign = 'right';
  ctx.fillText(muted ? 'M — звук выкл' : 'M — звук вкл', W - 16, 30);
  ctx.fillText(LEVEL_HINTS[level] || 'WASD — движение | ЛКМ — орудие', W - 16, 50);
}

function drawBanner() {
  var a = clamp(bannerT / 2.6, 0, 1);
  ctx.fillStyle = 'rgba(0,0,0,' + (0.45 * a).toFixed(3) + ')';
  ctx.fillRect(0, H / 2 - 60, W, 90);
  ctx.globalAlpha = a;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px Arial';
  ctx.fillText('УРОВЕНЬ ' + level, W / 2, H / 2 - 18);
  ctx.font = '22px Arial';
  ctx.fillText(LEVEL_NAMES[level], W / 2, H / 2 + 14);
  ctx.globalAlpha = 1;
}

// ---- Главный кадр ----

function renderList(list, fn) {
  for (var i = 0; i < list.length; i++) fn(list[i]);
}

function render() {
  if (!player) return;
  ctx.save();
  if (shake > 0) ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);
  drawBackground();
  renderList(buoys, drawBuoy);
  renderList(wreckages, drawWreck);
  renderList(covers, drawCover);
  renderList(enemies, drawEnemy);
  if (gameState === 'game') drawPlayerUnit();
  drawBullets();
  renderList(bombs, drawBomb);
  renderList(grenades, drawGrenade);
  renderList(explosions, drawExplosionFx);
  for (var i = 0; i < particles.length; i++) {
    var p = particles[i];
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    circle(p.x, p.y, Math.max(0.5, p.size));
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (gameState === 'game') drawHUD();
  if (bannerT > 0) drawBanner();
}
