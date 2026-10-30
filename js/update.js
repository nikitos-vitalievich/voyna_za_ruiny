'use strict';

// ===== Логика обновления: игрок, враги, снаряды, мир =====

// Выталкивание объекта из прямоугольников укрытий (мешки на уровне 4).
function pushOut(o) {
  for (var i = 0; i < covers.length; i++) {
    var c = covers[i];
    if (o.x > c.x - o.r && o.x < c.x + c.w + o.r &&
        o.y > c.y - o.r && o.y < c.y + c.h + o.r) {
      var dl = o.x - (c.x - o.r), dr = (c.x + c.w + o.r) - o.x;
      var dt = o.y - (c.y - o.r), db = (c.y + c.h + o.r) - o.y;
      var m = Math.min(dl, dr, dt, db);
      if (m === dl) o.x = c.x - o.r;
      else if (m === dr) o.x = c.x + c.w + o.r;
      else if (m === dt) o.y = c.y - o.r;
      else o.y = c.y + c.h + o.r;
    }
  }
}

function moveInput() {
  var dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp']) dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown']) dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft']) dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  return [dx, dy];
}

// Оружие игрока по уровням: 1/3 — орудие, 2 — пулемёт, 4 — винтовка очередями.
var WEAPONS = {
  tank:   { cooldown: 0.9,  speed: 480, dmg: 60, life: 2.2, r: 5, offset: 34, type: 'shell',  sfx: 'cannon' },
  plane:  { cooldown: 0.13, speed: 540, dmg: 16, life: 1.2, r: 3, offset: 26, type: 'bullet', sfx: 'mg' },
  rifle:  { cooldown: 0.1,  speed: 500, dmg: 13, life: 1.1, r: 3, offset: 16, type: 'bullet', sfx: 'mg' }
};

function fireBullet(x, y, angle, weapon, from) {
  bullets.push({
    x: x + Math.cos(angle) * weapon.offset,
    y: y + Math.sin(angle) * weapon.offset,
    vx: Math.cos(angle) * weapon.speed,
    vy: Math.sin(angle) * weapon.speed,
    from: from, dmg: weapon.dmg, life: weapon.life, r: weapon.r, type: weapon.type
  });
  sfxShot(weapon.sfx);
}

function updateBullets(dt) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    var b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    var dead = (b.life <= 0) || (b.x < -30) || (b.x > W + 30) || (b.y < -30) || (b.y > H + 30);
    if (!dead) {
      if (b.from === 'p') {
        for (var j = enemies.length - 1; j >= 0; j--) {
          var e = enemies[j];
          var r = ENEMY_HIT_RADIUS[e.type] || 13;
          if (dist(b.x, b.y, e.x, e.y) < r) { damageEnemy(e, b.dmg); dead = true; break; }
        }
      } else if (player && dist(b.x, b.y, player.x, player.y) < player.r) {
        damagePlayer(b.dmg);
        dead = true;
      }
      // На уровне 4 пули мешков-укрытий поглощаются и разрушают их.
      if (!dead && level === 4) {
        for (var k = 0; k < covers.length; k++) {
          var c = covers[k];
          if (b.x > c.x - 4 && b.x < c.x + c.w + 4 && b.y > c.y - 4 && b.y < c.y + c.h + 4) {
            dead = true;
            c.hp -= (b.from === 'p' ? 10 : 4);
            addParticle(b.x, b.y, rand(-40, 40), rand(-40, 40), 0.25, '#e8d9a0', 3, 0, 0);
            if (c.hp <= 0) { spawnExplosion(c.x + c.w / 2, c.y + c.h / 2, 0.6); covers.splice(k, 1); materials += 3; }
            break;
          }
        }
      }
    }
    if (dead) bullets.splice(i, 1);
  }
}

// Движение игрока зависит от уровня (танк / самолёт по мыши / катер / пехота).
function movePlayerByLevel(dt) {
  if (level === 2) {
    // Самолёт плавно следует за курсором.
    var follow = Math.min(1, dt * 3.5);
    player.x += (mouse.x - player.x) * follow;
    player.y += (mouse.y - player.y) * follow;
    player.x = clamp(player.x, 30, W - 30);
    player.y = clamp(player.y, 30, H - 90);
    return;
  }
  var m = moveInput();
  var speed = { 1: 130, 3: 150, 4: 215 }[level];
  if (level === 4 && (m[0] || m[1])) {
    var l = Math.sqrt(m[0] * m[0] + m[1] * m[1]);
    m = [m[0] / l, m[1] / l];
  }
  player.x += m[0] * speed * dt;
  player.y += m[1] * speed * dt;
  if (level === 1) {
    player.x = clamp(player.x, 40, W - 40);
    player.y = clamp(player.y, H * 0.45, H - 40);
  } else if (level === 3) {
    player.x = clamp(player.x, 40, W - 40);
    player.y = clamp(player.y, 40, H - 40);
  } else {
    player.x = clamp(player.x, 20, W - 20);
    player.y = clamp(player.y, 20, H - 20);
    pushOut(player);
  }
}

function updatePlayerWeapons(dt) {
  if (level === 2) {
    if (mouse.down && player.cool <= 0) {
      player.cool = WEAPONS.plane.cooldown;
      fireBullet(player.x, player.y, player.ang, WEAPONS.plane, 'p');
    }
  } else if (level === 4) {
    // Винтовка стреляет очередями по 3 выстрела.
    if (player.burst > 0 && player.cool <= 0) {
      player.cool = WEAPONS.rifle.cooldown;
      player.burst--;
      fireBullet(player.x, player.y, player.ang + rand(-0.03, 0.03), WEAPONS.rifle, 'p');
    }
    if (player.burst <= 0 && player.bcool > 0) player.bcool -= dt;
    if (mouse.down && player.burst <= 0 && player.bcool <= 0) {
      player.burst = 3;
      player.bcool = 0.55;
    }
  } else {
    if (mouse.down && player.cool <= 0) {
      player.cool = WEAPONS.tank.cooldown;
      fireBullet(player.x, player.y, player.ang, WEAPONS.tank, 'p');
      muzzle(player.x + Math.cos(player.ang) * 40, player.y + Math.sin(player.ang) * 40);
      ecology = Math.max(0, ecology - 0.5);
    }
  }
}

function updatePlayer(dt) {
  if (player.hitT > 0) player.hitT -= dt;
  player.cool -= dt;
  movePlayerByLevel(dt);
  player.ang = Math.atan2(mouse.y - player.y, mouse.x - player.x);
  updatePlayerWeapons(dt);
}

// ИИ врагов по типам: танк, самолёт, катер, солдат.
var ENEMY_AI = {
  tank: function (e, dt, D) {
    if (e.y < H * 0.55) e.y += 22 * dt;
    e.ang = Math.atan2(player.y - e.y, player.x - e.x);
    if (e.cool <= 0) { e.cool = rand(2.4, 3.8) * D.fireMul; enemyShoot(e, 340, 16 * D.dmg, 5, 'shell'); }
  },
  plane: function (e, dt, D) {
    e.x -= e.speed * dt;
    e.y = e.y0 + Math.sin(tGame * 1.4 + e.phase) * 46;
    if (e.x < -90) { e.x = W + 90; e.y0 = rand(90, H - 160); }
    if (e.cool <= 0) {
      e.cool = rand(1.2, 2.4) * D.fireMul;
      var a = enemyAimAngle(e);
      bullets.push({ x: e.x - 20, y: e.y, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380,
                     from: 'e', dmg: 10 * D.dmg, life: 2, r: 3, type: 'bullet' });
      sfxShot('mg');
    }
  },
  boat: function (e, dt, D) {
    var dd = dist(e.x, e.y, player.x, player.y);
    if (dd > 240) {
      e.x += (player.x - e.x) / dd * 42 * dt;
      e.y += (player.y - e.y) / dd * 42 * dt;
    } else {
      e.x += Math.cos(tGame + e.phase) * 30 * dt;
      e.y += Math.sin(tGame * 0.8 + e.phase) * 30 * dt;
    }
    e.ang = Math.atan2(player.y - e.y, player.x - e.x);
    if (e.cool <= 0) { e.cool = rand(2.6, 4) * D.fireMul; enemyShoot(e, 330, 16 * D.dmg, 5, 'shell'); }
  },
  sold: function (e, dt, D) {
    var dd = dist(e.x, e.y, player.x, player.y);
    if (dd > 180) {
      e.x += (player.x - e.x) / dd * 58 * dt;
      e.y += (player.y - e.y) / dd * 58 * dt;
    }
    e.ang = Math.atan2(player.y - e.y, player.x - e.x);
    if (e.cool <= 0) { e.cool = rand(1.8, 3.2) * D.fireMul; enemyShoot(e, 430, 9 * D.dmg, 3, 'bullet'); }
  }
};

function updateEnemies(dt) {
  var D = diffSettings();
  for (var i = enemies.length - 1; i >= 0; i--) {
    var e = enemies[i];
    if (e.hitT > 0) e.hitT -= dt;
    e.cool -= dt;
    var ai = ENEMY_AI[e.type];
    if (ai) ai(e, dt, D);
  }
}

function updateParticles(dt) {
  for (var i = particles.length - 1; i >= 0; i--) {
    var p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
    p.size += p.grow * dt;
  }
}

function updateWorldObjects(dt) {
  for (var i = explosions.length - 1; i >= 0; i--) {
    var ex = explosions[i];
    ex.t += dt;
    if (ex.t > ex.dur) explosions.splice(i, 1);
  }
  // Подбитая техника дымит и периодически вспыхивает.
  for (var j = wreckages.length - 1; j >= 0; j--) {
    var wr = wreckages[j];
    wr.t += dt;
    if (Math.random() < dt * 5) addParticle(wr.x + rand(-10, 10), wr.y + rand(-10, 10), rand(-12, 12), -40, rand(0.8, 1.8), '#555555', rand(4, 9), 0, 10);
    if (Math.random() < dt * 2.5) addParticle(wr.x + rand(-6, 6), wr.y + rand(-6, 6), rand(-15, 15), -20, rand(0.2, 0.4), '#ff8800', rand(2, 4), 0, 0);
    if (wr.t > wr.dur) wreckages.splice(j, 1);
  }
  for (var k = clouds.length - 1; k >= 0; k--) {
    var cl = clouds[k];
    cl.x -= cl.v * dt;
    if (cl.x < -160) cl.x = W + 160;
  }
}

function updateBuoyancy(dt) {
  ecology = Math.max(0, ecology - 0.4 * dt);
  buoyTimer -= dt;
  if (buoyTimer <= 0) {
    buoyTimer = rand(8, 14);
    buoys.push({ x: rand(60, W - 60), y: rand(60, H - 60), t: 0 });
  }
  for (var i = buoys.length - 1; i >= 0; i--) {
    var b = buoys[i];
    b.t += dt;
    if (dist(b.x, b.y, player.x, player.y) < 42) {
      ecology = Math.min(100, ecology + 25);
      materials += 5;
      addParticle(b.x, b.y, 0, -60, 0.6, '#7ee87e', 6, 0, 6);
      buoys.splice(i, 1);
    }
  }
}

function updateProjectiles(dt) {
  for (var i = grenades.length - 1; i >= 0; i--) {
    var g = grenades[i];
    g.t += dt;
    if (g.t >= g.dur) { explodeGrenade(g.tx, g.ty); grenades.splice(i, 1); }
  }
  for (var j = bombs.length - 1; j >= 0; j--) {
    var bo = bombs[j];
    bo.vy += 420 * dt;
    bo.y += bo.vy * dt;
    if (bo.y > H - 46) { spawnExplosion(bo.x, H - 50, 1.6); bombs.splice(j, 1); }
  }
}

// Громкость сирены тревоги растёт, когда враги близко к игроку.
function updateSirenVolume() {
  if (!sirenNodes) return;
  var nearest = Infinity;
  for (var i = 0; i < enemies.length; i++) {
    nearest = Math.min(nearest, dist(enemies[i].x, enemies[i].y, player.x, player.y));
  }
  setSirenVol(muted ? 0 : 0.05 + clamp(1 - nearest / 900, 0, 1) * 0.22);
}

function update(dt) {
  tGame += dt;
  if (shake > 0) shake = Math.max(0, shake - dt * 40);
  if (bannerT > 0) bannerT -= dt;
  updateParticles(dt);
  updateWorldObjects(dt);
  updateBuoyancy(dt);
  // Экология — общий ресурс: на нуле миссия провалена (проверка во всех режимах).
  if (ecology <= 0) { gameOver('ЭКОЛОГИЯ УНИЧТОЖЕНА'); return; }
  if (gameState !== 'game') return;
  updateBullets(dt);
  updateProjectiles(dt);
  updatePlayer(dt);
  updateEnemies(dt);
  updateSirenVolume();
}
