/* 烟花 — 全屏 Canvas 粒子庆祝(赢棋/过关/升级) */
'use strict';

let _fxCv = null, _fxCtx = null, _fxRaf = 0, _fxLast = 0;
let _fxParts = [], _fxRockets = [], _fxUntil = 0, _fxNextLaunch = 0;

function _fxInit() {
  if (_fxCv) return;
  _fxCv = document.getElementById('fx');
  _fxCtx = _fxCv.getContext('2d');
}
function _fxResize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  _fxCv.width = innerWidth * dpr; _fxCv.height = innerHeight * dpr;
  _fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* 放 dur 毫秒的烟花(可重复调用续时) */
function fireworks(dur = 4000) {
  _fxInit(); _fxResize();
  _fxUntil = performance.now() + dur;
  _fxNextLaunch = 0;
  if (!_fxRaf) { _fxLast = performance.now(); _fxRaf = requestAnimationFrame(_fxTick); }
}

function _fxTick(now) {
  const dt = Math.min((now - _fxLast) / 1000, 0.05);
  _fxLast = now;
  if (now < _fxUntil && now >= _fxNextLaunch) {
    _fxNextLaunch = now + 320 + Math.random() * 420;
    _fxRockets.push({
      x: innerWidth * (0.15 + Math.random() * 0.7),
      y: innerHeight + 10,
      vy: -innerHeight * (0.85 + Math.random() * 0.3),
      hue: Math.random() * 360,
      exY: innerHeight * (0.15 + Math.random() * 0.3),
    });
    tone(280, .4, 'sine', .04, 0, 2.6); // 咻——升空
  }
  const ctx = _fxCtx;
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  for (let i = _fxRockets.length - 1; i >= 0; i--) {
    const r = _fxRockets[i];
    r.y += r.vy * dt; r.vy += 380 * dt;
    ctx.fillStyle = `hsl(${r.hue} 100% 72%)`;
    ctx.beginPath(); ctx.arc(r.x, r.y, 3, 0, 7); ctx.fill();
    if (r.y <= r.exY || r.vy > -70) { _fxRockets.splice(i, 1); _fxBurst(r.x, r.y, r.hue); }
  }
  for (let i = _fxParts.length - 1; i >= 0; i--) {
    const p = _fxParts[i];
    p.life -= dt;
    if (p.life <= 0) { _fxParts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 230 * dt; p.vx *= 1 - 1.1 * dt;
    ctx.globalAlpha = Math.min(1, p.life / 0.6);
    ctx.fillStyle = `hsl(${p.hue} 100% ${62 + 24 * Math.sin(p.life * 18)}%)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (_fxParts.length || _fxRockets.length || now < _fxUntil) {
    _fxRaf = requestAnimationFrame(_fxTick);
  } else {
    _fxRaf = 0;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
}

function _fxBurst(x, y, hue) {
  sfx('pop');
  const n = 36 + (Math.random() * 20 | 0);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + Math.random() * 0.2;
    const sp = 90 + Math.random() * 170;
    _fxParts.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: 1.6 + Math.random() * 1.8,
      hue: hue + Math.random() * 40 - 20,
      life: 1.1 + Math.random() * 0.7,
    });
  }
}
