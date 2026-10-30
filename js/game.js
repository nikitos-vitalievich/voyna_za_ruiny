'use strict';

// ===== Игровое состояние, уровни, эффекты и действия =====

var LEVEL_NAMES = { 1: 'ТАНКОВЫЙ РУБЕЖ', 2: 'НЕБЕСНАЯ ТРЕВОГА', 3: 'МОРСКОЙ БОЙ', 4: 'ПЕХОТНЫЙ ШТУРМ' };

var level = 1;
var gameState = 'menu';

var DIFF = {
  easy:   { mul: 0.6,  fireMul: 1.7,  spread: 2.4, dmg: 0.7, hp: 180 },
  normal: { mul: 1,    fireMul: 1,    spread: 1.5, dmg: 1,   hp: 150 },
  hard:   { mul: 1.45, fireMul: 0.65, spread: 0.9, dmg: 1.5, hp: 110 }
};

function diffSettings() {
  return DIFF[difficulty] || DIFF.normal;
}

var keys = {};
var mouse = { x: 0, y: 0, down: false };

var player = null;
var enemies = [], bullets = [], bombs = [], grenades = [], particles = [],
    explosions = [], buoys = [], covers = [], wreckages = [], clouds = [], patches = [];

var shake = 0, tGame = 0, bannerT = 0, materials = 0, ecology = 100,
    buoyTimer = 8, grenadesN = 6;

// ===== Эффекты =====

function addParticle(x, y, vx, vy, life, color, size, grav, grow) {
  particles.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life,
                   color: color, size: size, grav: grav || 0, grow: grow || 0 });
}

function muzzle(x, y) {
  addParticle(x, y, rand(-30, 30), rand(-30, 30), 0.15, '#ffe082', 8, 0, 0);
}

function spawnExplosion(x, y, size) {
  explosions.push({ x: x, y: y, t: 0, dur: 0.5 + 0.2 * size, size: size });
  sfxExplosion(size);
  shake = Math.min(20, shake + 4 + size * 4);
  ecology = Math.max(0, ecology - size * 2);

  var bursts = [
    { count: 18, speed: [60, 260],  life: [0.4, 0.9], color: '#ff6600', size: [2, 5], grav: 0,   grow: 0,  lift: 0 },
    { count: 10, speed: [20, 120],  life: [1, 2.5],   color: '#555555', size: [4, 9], grav: 0,   grow: 12, lift: 40 },
    { count: 6,  speed: [80, 220],  life: [0.5, 1.2], color: '#333333', size: [2, 4], grav: 200, grow: 0,  lift: 0 }
  ];
  for (var b = 0; b < bursts.length; b++) {
    var burst = bursts[b];
    var n = Math.round(burst.count * size);
    for (var i = 0; i < n; i++) {
      var a = rand(0, TAU);
      var s = rand(burst.speed[0], burst.speed[1]) * size;
      addParticle(x, y, Math.cos(a) * s, Math.sin(a) * s - burst.lift,
                  rand(burst.life[0], burst.life[1]), burst.color,
                  rand(burst.size[0], burst.size[1]), burst.grav, burst.grow);
    }
  }
}

// ===== Инициализация уровней =====

function makePatches() {
  patches = [];
  for (var i = 0; i < 9; i++) {
    patches.push({ x: rand(0, W - 100), y: rand(0, H - 80), w: rand(60, 180), h: rand(30, 90) });
  }
}

function makeCovers() {
  covers = [];
  // [доля X, доля Y, ширина, высота] — позиции мешков-укрытий на уровне 4.
  var spots = [
    [0.22, 0.55, 110, 26], [0.48, 0.42, 26, 90], [0.68, 0.6, 120, 26],
    [0.34, 0.28, 26, 100], [0.58, 0.24, 110, 26], [0.82, 0.42, 26, 90],
    [0.14, 0.72, 90, 26],  [0.44, 0.68, 26, 80],  [0.62, 0.78, 100, 26]
  ];
  for (var i = 0; i < spots.length; i++) {
    var s = spots[i];
    covers.push({ x: W * s[0] - s[2] / 2, y: H * s[1] - s[3] / 2, w: s[2], h: s[3], hp: 60 });
  }
}

// Параметры врагов по типам: урон/HP и точка появления.
var ENEMY_DEFS = {
  1: { type: 'tank',  hp: 120 },
  2: { type: 'plane', hp: 60 },
  3: { type: 'boat',  hp: 90 },
  4: { type: 'sold',  hp: 45 }
};

function spawnEnemy(n, i) {
  var D = diffSettings();
  var def = ENEMY_DEFS[n];
  var e = {
    type: def.type, x: 0, y: 0, ang: 0,
    hp: def.hp, maxhp: def.hp,
    cool: rand(1.5, 3) * D.fireMul, hitT: 0, phase: rand(0, TAU), speed: 0, y0: 0
  };
  if (n === 1) { e.x = rand(W * 0.2, W * 0.85); e.y = rand(50, 170); }
  else if (n === 2) { e.x = W + 80 + i * 150; e.y0 = rand(90, H - 160); e.y = e.y0; e.speed = rand(70, 110); }
  else if (n === 3) { e.x = W - 40 - rand(0, 80); e.y = rand(H * 0.15, H * 0.7); }
  else { e.x = rand(W * 0.15, W * 0.85); e.y = rand(40, 170); }
  enemies.push(e);
}

// Стартовые параметры игрока и базовое число врагов по уровням.
var LEVEL_SETUPS = {
  1: { base: 3, place: function (p) { p.x = W / 2; p.y = H - 90; p.r = 26; }, decor: makePatches },
  2: { base: 2, place: function (p) { p.x = W * 0.25; p.y = H / 2; p.r = 20; }, decor: function () {
        for (var i = 0; i < 6; i++) clouds.push({ x: rand(0, W), y: rand(30, H - 160), s: rand(40, 110), v: rand(12, 30) });
      } },
  3: { base: 4, place: function (p) { p.x = W * 0.28; p.y = H / 2; p.r = 22; }, decor: function () {} },
  4: { base: 6, place: function (p) { p.x = W / 2; p.y = H - 110; p.r = 11; }, decor: function () { makePatches(); makeCovers(); } }
};

function resetWorld() {
  enemies = []; bullets = []; bombs = []; grenades = []; particles = [];
  explosions = []; buoys = []; covers = []; wreckages = []; clouds = []; patches = [];
  shake = 0; tGame = 0; bannerT = 2.6; ecology = 100;
  buoyTimer = rand(6, 10); grenadesN = 6;
}

function spawnEnemies(n) {
  var count = clamp(Math.round(LEVEL_SETUPS[n].base * diffSettings().mul), 2, 9);
  for (var i = 0; i < count; i++) spawnEnemy(n, i);
}

// Порядок генерации случайных величин как в оригинале: декор → враги → позиция игрока.
function startLevel(n) {
  var D = diffSettings();
  level = n;
  resetWorld();
  if (n === 1) materials = 0;
  player = { x: 0, y: 0, hp: D.hp, maxhp: D.hp, ang: 0, cool: 0, bcool: 0, burst: 0, hitT: 0, r: 24,
             speed: 0, bodyAng: -Math.PI / 2, walkT: 0, flashT: 0 };
  var setup = LEVEL_SETUPS[n];
  setup.decor();
  spawnEnemies(n);
  setup.place(player);
  stopSiren();
  stopEngine();
  if (n === 2) startSiren();
  startEngine(n);
  gameState = 'game';
  document.getElementById('menu').style.display = 'none';
  document.getElementById('overlay2').style.display = 'none';
}

// ===== Действия игрока и урон =====

function dropBomb() {
  if (bombs.length > 3 || !player) return;
  bombs.push({ x: player.x + 26, y: player.y + 14, vy: 60 });
  sfxWhistle(1.0);
}

function throwGrenade() {
  if (grenadesN <= 0 || !player) return;
  grenadesN--;
  var tx = mouse.x, ty = mouse.y;
  var d = dist(player.x, player.y, tx, ty);
  var MAX_THROW = 230;
  if (d > MAX_THROW) {
    tx = player.x + (tx - player.x) * MAX_THROW / d;
    ty = player.y + (ty - player.y) * MAX_THROW / d;
    d = MAX_THROW;
  }
  grenades.push({ x0: player.x, y0: player.y, tx: tx, ty: ty, t: 0, dur: 0.5 + d / 700 });
  sfxShot('mg');
}

function explodeGrenade(x, y) {
  spawnExplosion(x, y, 1.2);
  var GRENADE_RADIUS = 100;
  for (var i = enemies.length - 1; i >= 0; i--) {
    var e = enemies[i];
    var d = dist(x, y, e.x, e.y);
    if (d < GRENADE_RADIUS) damageEnemy(e, Math.round(90 * (1 - d / 140)));
  }
  for (var j = covers.length - 1; j >= 0; j--) {
    var c = covers[j];
    if (dist(x, y, c.x + c.w / 2, c.y + c.h / 2) < 110) {
      c.hp -= 100;
      if (c.hp <= 0) { covers.splice(j, 1); materials += 3; }
    }
  }
}

// Угол прицела врага с разбросом, зависящим от сложности.
function enemyAimAngle(e) {
  return Math.atan2(player.y - e.y, player.x - e.x) +
         rand(-1, 1) * diffSettings().spread * 0.05;
}

function enemyShoot(e, speed, dmg, r, type) {
  var a = enemyAimAngle(e);
  bullets.push({ x: e.x + Math.cos(a) * 24, y: e.y + Math.sin(a) * 24,
                 vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
                 from: 'e', dmg: dmg, life: 3, r: r, type: type });
  sfxShot(type === 'shell' ? 'cannon' : 'mg');
}

function damageEnemy(e, d) {
  e.hp -= d;
  e.hitT = 0.12;
  addParticle(e.x + rand(-8, 8), e.y + rand(-8, 8), rand(-50, 50), rand(-50, 50), 0.3, '#ffb040', 3, 0, 0);
  if (e.hp <= 0) killEnemy(e);
}

var ENEMY_HIT_RADIUS = { tank: 26, plane: 22, boat: 24, turret: 20, sold: 13 };

function killEnemy(e) {
  var idx = enemies.indexOf(e);
  if (idx < 0) return;
  enemies.splice(idx, 1);
  var size = e.type === 'sold' ? 0.5 : (e.type === 'turret' ? 1.1 : 1.3);
  spawnExplosion(e.x, e.y, size);
  if (e.type !== 'sold') wreckages.push({ x: e.x, y: e.y, t: 0, dur: 8 });
  materials += (e.type === 'sold' ? 6 : 10);
  if (e.type === 'sold' && level === 4) grenadesN = Math.min(9, grenadesN + 1);
  if (enemies.length === 0) winLevel();
}

function damagePlayer(d) {
  if (!player || player.hp <= 0) return;
  player.hp -= d;
  player.hitT = 0.15;
  sfxHit();
  shake = Math.min(18, shake + 5);
  addParticle(player.x, player.y, rand(-60, 60), rand(-60, 60), 0.3, '#ffffff', 4, 0, 0);
  if (player.hp <= 0) {
    player.hp = 0;
    var isSoldier = level === 4;
    spawnExplosion(player.x, player.y, isSoldier ? 0.7 : 1.5);
    gameOver(isSoldier ? 'ВАШ БОЕЦ ПОГИБ' : 'ВАША ТЕХНИКА УНИЧТОЖЕНА');
  }
}

// ===== Окончание уровня / миссии =====

function showOverlay(title, text, btn, action) {
  var o = document.getElementById('overlay2');
  o.innerHTML = '<h2>' + title + '</h2><p>' + text + '</p>' +
    '<button type="button" class="btn big" onclick="' + action + '">' + btn + '</button>' +
    '<button type="button" class="btn" onclick="toMenu()">В МЕНЮ</button>';
  o.style.display = 'flex';
}

function winLevel() {
  stopSiren();
  stopEngine();
  gameState = 'between';
  melody('win');
  if (level >= 4) {
    showOverlay('ПОБЕДА!', 'Вы прошли все уровни и защитили руины! Материалы: ' + materials, 'В МЕНЮ', 'toMenu()');
  } else {
    showOverlay('УРОВЕНЬ ПРОЙДЕН', 'Уровень ' + level + ' зачищен. Материалы: ' + materials, 'СЛЕДУЮЩИЙ УРОВЕНЬ', 'nextLevel()');
  }
}

function gameOver(reason) {
  stopSiren();
  stopEngine();
  gameState = 'over';
  melody('lose');
  showOverlay('МИССИЯ ПРОВАЛЕНА', reason, 'ЗАНОВО', 'restartLevel()');
}

function nextLevel() { startLevel(level + 1); }
function restartLevel() { startLevel(level); }

function toMenu() {
  gameState = 'menu';
  stopSiren();
  stopEngine();
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('overlay2').style.display = 'none';
}
