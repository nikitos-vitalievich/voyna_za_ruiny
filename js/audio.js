'use strict';

// ===== Звук: выстрелы, взрывы, сирена, двигатель, мелодии =====

var noiseB = null;

function noiseBuf() {
  if (noiseB) return noiseB;
  noiseB = audioCtx.createBuffer(1, audioCtx.sampleRate, audioCtx.sampleRate);
  var d = noiseB.getChannelData(0);
  for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseB;
}

// Создаёт источник шума с фильтром низких частот и огибающей громкости.
function playNoise(t, filterType, filterFrom, filterTo, gainFrom, dur) {
  var src = audioCtx.createBufferSource();
  src.buffer = noiseBuf();
  var f = audioCtx.createBiquadFilter();
  f.type = filterType;
  f.frequency.setValueAtTime(filterFrom, t);
  if (filterTo) f.frequency.exponentialRampToValueAtTime(filterTo, t + dur);
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(gainFrom, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(masterGain);
  src.start(t);
  src.stop(t + dur + 0.5);
}

// Создаёт тональный осциллятор с экспоненциальным свипом частоты.
function playTone(t, type, freqFrom, freqTo, gainFrom, dur) {
  var o = audioCtx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freqFrom, t);
  if (freqTo) o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  var g = audioCtx.createGain();
  g.gain.setValueAtTime(gainFrom, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(masterGain);
  o.start(t);
  o.stop(t + dur + 0.1);
}

function sfxExplosion(size) {
  if (muted || !audioCtx) return;
  try {
    var t = audioCtx.currentTime;
    playNoise(t, 'lowpass', 600 + 400 * size, 60, Math.min(0.9, 0.3 + 0.35 * size), 0.4 + 0.3 * size);
    playTone(t, 'sine', 90, 30, 0.5, 0.4);
  } catch (e) {}
}

function sfxShot(type) {
  if (muted || !audioCtx) return;
  try {
    var t = audioCtx.currentTime;
    if (type === 'cannon') playNoise(t, 'lowpass', 400, null, 0.5, 0.22);
    else playNoise(t, 'lowpass', 1500, null, 0.22, 0.07);
  } catch (e) {}
}

function sfxHit() {
  if (muted || !audioCtx) return;
  try {
    playTone(audioCtx.currentTime, 'square', 800, 200, 0.2, 0.1);
  } catch (e) {}
}

function sfxWhistle(dur) {
  if (muted || !audioCtx) return;
  try {
    playTone(audioCtx.currentTime, 'sine', 1400, 300, 0.1, dur);
  } catch (e) {}
}

function melody(kind) {
  if (muted || !audioCtx) return;
  try {
    var seq = kind === 'win' ? [523, 659, 784, 1047] : [392, 330, 262, 196];
    for (var i = 0; i < seq.length; i++) {
      var t = audioCtx.currentTime + i * 0.2;
      var o = audioCtx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = seq[i];
      var g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.22, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.19);
      o.connect(g);
      g.connect(masterGain);
      o.start(t);
      o.stop(t + 0.22);
    }
  } catch (e) {}
}

// ===== Непрерывные звуки: сирена тревоги и двигатель =====

var sirenNodes = null;

function startSiren() {
  if (!audioCtx || sirenNodes) return;
  try {
    var o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 500;
    var lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.25;
    var lg = audioCtx.createGain();
    lg.gain.value = 220;
    lfo.connect(lg);
    lg.connect(o.frequency);
    var g = audioCtx.createGain();
    g.gain.value = 0.08;
    o.connect(g);
    g.connect(masterGain);
    o.start();
    lfo.start();
    sirenNodes = { o: o, lfo: lfo, g: g };
  } catch (e) {}
}

function setSirenVol(v) {
  if (sirenNodes) sirenNodes.g.gain.value = v;
}

function stopSiren() {
  if (!sirenNodes) return;
  try {
    sirenNodes.o.stop();
    sirenNodes.lfo.stop();
  } catch (e) {}
  sirenNodes = null;
}

var engineNodes = null;

// Частота двигателя зависит от уровня: самолёт выше, корабль ниже.
var ENGINE_FREQ = { 1: 55, 2: 110, 3: 75, 4: 55 };

function startEngine(n) {
  if (!audioCtx || engineNodes) return;
  try {
    var o = audioCtx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = ENGINE_FREQ[n] || 55;
    var f = audioCtx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 220;
    var g = audioCtx.createGain();
    g.gain.value = 0.035;
    o.connect(f);
    f.connect(g);
    g.connect(masterGain);
    o.start();
    engineNodes = { o: o, g: g };
  } catch (e) {}
}

function stopEngine() {
  if (!engineNodes) return;
  try {
    engineNodes.o.stop();
  } catch (e) {}
  engineNodes = null;
}
