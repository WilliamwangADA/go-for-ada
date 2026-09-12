/* 围棋小岛 — 合成音效(Web Audio 实时合成，零音频文件) */
'use strict';

let _ac = null;
function ac() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac; }

/* 滑音(slide<1 下滑, >1 上滑)，落子/提示类短音 */
function tone(freq, dur, type = 'sine', vol = 0.16, when = 0, slide = 0.85) {
  try {
    const t = ac().currentTime + when;
    const o = ac().createOscillator(), g = ac().createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac().destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* ignore */ }
}

/* 定音乐音(带起音包络)，旋律用 */
function note(freq, dur, when = 0, vol = 0.15, type = 'triangle') {
  try {
    const t = ac().currentTime + when;
    const o = ac().createOscillator(), g = ac().createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac().destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* ignore */ }
}

/* 噼啪白噪声(烟花爆开) */
function crackle(when = 0, dur = 0.3, vol = 0.1) {
  try {
    const t = ac().currentTime + when;
    const len = Math.floor(ac().sampleRate * dur);
    const buf = ac().createBuffer(1, len, ac().sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac().createBufferSource(); src.buffer = buf;
    const g = ac().createGain(); g.gain.value = vol;
    const f = ac().createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500;
    src.connect(f); f.connect(g); g.connect(ac().destination);
    src.start(t);
  } catch (e) { /* ignore */ }
}

const NOTE = {
  C4: 262, E4: 330, G4: 392, B4: 494, A4: 440,
  C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880,
  C6: 1047, E6: 1319, G6: 1568,
};

/* 赢棋庆祝小曲(~4s) */
function musicWin() {
  const N = NOTE;
  [[N.C5, .22, 0], [N.E5, .22, .22], [N.G5, .22, .44], [N.C6, .4, .66],
   [N.A5, .22, 1.1], [N.G5, .22, 1.32], [N.E5, .34, 1.54],
   [N.G5, .2, 1.96], [N.A5, .2, 2.16], [N.C6, .28, 2.36], [N.E6, .5, 2.66],
   [N.C6, .7, 3.2]].forEach(([f, d, w]) => note(f, d, w, .17));
  [[N.C4, 0], [N.G4, .66], [N.C4, 1.32], [N.G4, 1.96], [N.C4, 2.66]]
    .forEach(([f, w]) => note(f, .55, w, .09, 'sine'));
  [3.35, 3.55, 3.75].forEach((w, i) => note(N.G6 + i * 140, .18, w, .06, 'sine'));
}

/* 升级称号大号角(~2.7s) */
function musicBadge() {
  const N = NOTE;
  [[N.G4, .16, 0], [N.C5, .16, .16], [N.E5, .16, .32], [N.G5, .3, .48],
   [N.E5, .16, .82], [N.G5, .6, .98],
   [N.C6, .3, 1.6], [N.E6, .8, 1.9]].forEach(([f, d, w]) => note(f, d, w, .18));
  [[N.C4, 0], [N.G4, .8], [N.C4, 1.6]].forEach(([f, w]) => note(f, .7, w, .1, 'sine'));
}

const _SFX = {
  hello:         () => { note(NOTE.E5, .18, 0, .12); note(NOTE.A5, .25, .15, .12); },
  start:         () => { note(NOTE.C5, .14, 0, .14); note(NOTE.E5, .14, .12, .14); note(NOTE.G5, .22, .24, .14); },
  pass:          () => tone(600, .25, 'sine', .08, 0, .5),
  undo:          () => { note(NOTE.E5, .12, 0, .1); note(NOTE.B4, .18, .1, .1); },
  atari:         () => { note(NOTE.A5, .12, 0, .13); note(NOTE.A5, .12, .18, .13); },
  capture_cheer: () => [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6].forEach((f, i) => note(f, .14, i * .07, .13)),
  capture_by_ai: () => tone(240, .25, 'sine', .1, 0, .7),
  settle:        () => { note(NOTE.E5, .12, 0, .1); note(NOTE.G5, .12, .14, .1); note(NOTE.A5, .2, .28, .1); },
  draw:          () => { note(NOTE.E5, .2, 0, .12); note(NOTE.E5, .25, .25, .12); },
  lose:          () => { note(NOTE.E5, .3, 0, .1, 'sine'); note(NOTE.D5, .3, .3, .1, 'sine'); note(NOTE.C5, .5, .6, .1, 'sine'); },
  fail:          () => { note(NOTE.B4, .2, 0, .09, 'sine'); note(NOTE.A4, .3, .2, .09, 'sine'); },
  success:       () => [NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => note(f, .16, i * .09, .15)),
  map:           () => [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6].forEach((f, i) => note(f, .1, i * .05, .08)),
  pop:           () => crackle(0, .25, .09),
  win:           musicWin,
  badge:         musicBadge,
};

function sfx(name) { const f = _SFX[name]; if (f) f(); }
