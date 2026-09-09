/* 果冻棋子渲染器 — 复刻 SquishyGo 视觉：
   同色相连融合成团 / 落子プルン抖动 / 每团一张·ω·侧脸 / 表情随气数变化 / 提子缩小消失 */
'use strict';

const COL = {
  boardBg: '#deb068',
  line: '#1a1a1a',
  outline: '#000000',
  blackFill: '#666666',
  whiteFill: '#f2f2f2',
  blackFace: '#0a0a0a',
  whiteFace: '#0a0a0a',
};

class BlobBoard {
  constructor(canvas, size) {
    this.canvas = canvas;
    this.size = size;
    this.stones = new Map();   // idx -> {color, bornAt}
    this.conns = new Map();    // "a:b" -> t0
    this.dying = [];           // {cells:[{i,color}], t0}
    this.deny = null;          // {i, t0} 不能落子的提示标记
    this.lastFaceKey = new Map();
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const css = this.canvas.clientWidth;
    this.canvas.width = css * dpr;
    this.canvas.height = css * dpr;
    this.dpr = dpr;
    this.cssSize = css;
    this.S = css / (this.size - 1 + 1.4);  // 两侧留 0.7 格边距
    this.M = this.S * 0.7;
  }

  pt(i) {
    const x = i % this.size, y = Math.floor(i / this.size);
    return [this.M + x * this.S, this.M + y * this.S];
  }
  hit(cx, cy) {
    const gx = Math.round((cx - this.M) / this.S), gy = Math.round((cy - this.M) / this.S);
    if (gx < 0 || gy < 0 || gx >= this.size || gy >= this.size) return -1;
    const [px, py] = this.pt(gy * this.size + gx);
    return Math.hypot(px - cx, py - cy) <= this.S * 0.47 ? gy * this.size + gx : -1;
  }

  /* ---- 状态同步 ---- */
  addStone(i, color, now) {
    this.stones.set(i, { color, bornAt: now });
    for (const n of this.neighborIdx(i)) {
      const st = this.stones.get(n);
      if (st && st.color === color) {
        this.conns.set(this.ck(i, n), now);
      }
    }
  }
  removeGroup(cells, now) {
    const dying = { cells: [], t0: now };
    for (const i of cells) {
      const st = this.stones.get(i);
      if (!st) continue;
      dying.cells.push({ i, color: st.color });
      this.stones.delete(i);
      for (const n of this.neighborIdx(i)) this.conns.delete(this.ck(i, n));
    }
    // 阵亡组内部的连接也要记录用于收缩动画
    dying.conns = [];
    const set = new Set(dying.cells.map(c => c.i));
    for (const { i } of dying.cells) {
      for (const n of this.neighborIdx(i)) {
        if (set.has(n) && i < n) dying.conns.push([i, n]);
      }
    }
    this.dying.push(dying);
  }
  setPosition(gridArr, now) { // 悔棋等：整盘重建(无动画)
    this.stones.clear(); this.conns.clear(); this.dying = [];
    for (let i = 0; i < gridArr.length; i++) {
      if (gridArr[i] !== EMPTY) {
        this.stones.set(i, { color: gridArr[i], bornAt: now - 5000 });
        for (const n of this.neighborIdx(i)) {
          const st = this.stones.get(n);
          if (st && st.color === gridArr[i]) this.conns.set(this.ck(i, n), now - 5000);
        }
      }
    }
  }
  ck(a, b) { return a < b ? a + ':' + b : b + ':' + a; }
  neighborIdx(i) {
    const x = i % this.size, y = Math.floor(i / this.size), s = this.size, n = [];
    if (x > 0) n.push(i - 1);
    if (x < s - 1) n.push(i + 1);
    if (y > 0) n.push(i - s);
    if (y < s - 1) n.push(i + s);
    return n;
  }

  groups() {
    const seen = new Set(), out = [];
    for (const [i, st] of this.stones) {
      if (seen.has(i)) continue;
      const cells = [i], stack = [i];
      seen.add(i);
      while (stack.length) {
        const c = stack.pop();
        for (const n of this.neighborIdx(c)) {
          const nst = this.stones.get(n);
          if (nst && nst.color === st.color && !seen.has(n)) {
            seen.add(n); cells.push(n); stack.push(n);
          }
        }
      }
      out.push({ color: st.color, cells });
    }
    return out;
  }

  libertiesAndEnemy(cells) {
    const libs = new Set(); let enemy = false;
    const color = this.stones.get(cells[0]).color;
    for (const i of cells) {
      for (const n of this.neighborIdx(i)) {
        const st = this.stones.get(n);
        if (!st) libs.add(n);
        else if (st.color !== color) enemy = true;
      }
    }
    return { libs: libs.size, enemy };
  }

  /* ---- 绘制 ---- */
  render(now) {
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssSize, this.cssSize);
    this.drawGrid(ctx);

    // 阵亡组(收缩中)先画
    this.dying = this.dying.filter(d => now - d.t0 < 520);
    for (const d of this.dying) {
      const t = Math.min(1, (now - d.t0) / 460);
      this.drawBlobSet(ctx, d.cells.map(c => c.i), d.cells[0].color, now, {
        shrink: Math.max(0, 1 - t * t * 1.06),        // circularIn 收缩
        conns: d.conns, faceAlpha: Math.max(0, 1 - t * 3), forcedFace: 3,
      });
    }

    for (const g of this.groups()) {
      this.drawBlobSet(ctx, g.cells, g.color, now, {});
    }

    // 「这里不能放」标记：橙色圆圈+叉，晃两下后淡出
    if (this.deny) {
      const t = (now - this.deny.t0) / 1000;
      if (t > 0.8) this.deny = null;
      else {
        const [px, py] = this.pt(this.deny.i);
        const S = this.S;
        const shake = Math.sin(t * 32) * Math.exp(-t * 5) * S * 0.05;
        ctx.save();
        ctx.globalAlpha = Math.min(1, Math.max(0, 1 - (t - 0.45) * 3));
        ctx.translate(px + shake, py);
        ctx.strokeStyle = '#e8590c';
        ctx.lineCap = 'round';
        ctx.lineWidth = S * 0.07;
        ctx.beginPath(); ctx.arc(0, 0, S * 0.3, 0, 7); ctx.stroke();
        const d = S * 0.15;
        ctx.beginPath();
        ctx.moveTo(-d, -d); ctx.lineTo(d, d);
        ctx.moveTo(d, -d); ctx.lineTo(-d, d);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  showDeny(i, now) { this.deny = { i, t0: now }; }

  drawGrid(ctx) {
    ctx.strokeStyle = COL.line;
    ctx.lineWidth = Math.max(1.4, this.S * 0.022);
    ctx.beginPath();
    for (let k = 0; k < this.size; k++) {
      const p = this.M + k * this.S, a = this.M, b = this.M + (this.size - 1) * this.S;
      ctx.moveTo(a, p); ctx.lineTo(b, p);
      ctx.moveTo(p, a); ctx.lineTo(p, b);
    }
    ctx.stroke();
    if (this.size % 2) {
      const c = this.M + (this.size - 1) / 2 * this.S;
      ctx.beginPath(); ctx.arc(c, c, Math.max(3, this.S * 0.05), 0, 7); ctx.fillStyle = COL.line; ctx.fill();
    }
  }

  drawBlobSet(ctx, cells, color, now, opt) {
    const S = this.S;
    const shrink = opt.shrink !== undefined ? Math.max(0, opt.shrink) : 1;
    if (shrink <= 0.01) return;
    const R = S * 0.46 * shrink;
    const E = Math.max(2.5, S * 0.05);
    const fillCol = color === BLACK ? COL.blackFill : COL.whiteFill;
    const cellSet = new Set(cells);

    // 落子抖动(プルン)：以最新棋子为中心轻微弹性缩放
    let newest = null, newestT = -1;
    for (const i of cells) {
      const st = this.stones.get(i);
      if (st && st.bornAt > newestT) { newestT = st.bornAt; newest = i; }
    }
    const age = (now - newestT) / 1000;
    ctx.save();
    if (newest !== null && age < 1.1) {
      const [px, py] = this.pt(newest);
      const w = 0.085 * Math.sin(age * 17) * Math.exp(-age * 3.4);
      ctx.translate(px, py);
      ctx.transform(1 + w, 0, 0, 1 - w, 0, 0);
      ctx.translate(-px, -py);
    }

    const connList = opt.conns
      ? opt.conns
      : (() => {
          const l = [];
          for (const i of cells) for (const n of this.neighborIdx(i)) {
            if (i < n && cellSet.has(n) && this.conns.has(this.ck(i, n))) l.push([i, n]);
          }
          return l;
        })();
    const connW = ([a, b]) => {
      const t0 = this.conns.get(this.ck(a, b));
      const t = t0 === undefined ? 1 : Math.min(1, (now - t0) / 320);
      return (0.3 + 0.7 * (1 - (1 - t) * (1 - t))) * R;
    };

    // 内角圆滑(コスミ)与 2x2 实心块
    const fillets = [], blocks = [];
    for (const i of cells) {
      const x = i % this.size, y = Math.floor(i / this.size);
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const hx = x + sx, vy = y + sy;
        if (hx < 0 || hx >= this.size || vy < 0 || vy >= this.size) continue;
        const hi = i + sx, vi = i + sy * this.size, di = i + sx + sy * this.size;
        if (!cellSet.has(hi) || !cellSet.has(vi)) continue;
        if (cellSet.has(di)) { if (sx === 1 && sy === 1) blocks.push(i); continue; }
        fillets.push([i, sx, sy]);
      }
    }

    // —— 描边层(黑) ——
    ctx.fillStyle = COL.outline;
    ctx.strokeStyle = COL.outline;
    ctx.lineCap = 'round';
    for (const i of cells) {
      const [px, py] = this.pt(i);
      ctx.beginPath(); ctx.arc(px, py, R + E, 0, 7); ctx.fill();
    }
    for (const c of connList) {
      const [pa, pb] = [this.pt(c[0]), this.pt(c[1])];
      ctx.lineWidth = 2 * (connW(c) + E);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    for (const f of fillets) this.filletPath(ctx, f, R + E, S * 0.3), ctx.fill();

    // —— 填色层 ——
    ctx.fillStyle = fillCol;
    ctx.strokeStyle = fillCol;
    for (const i of cells) {
      const [px, py] = this.pt(i);
      ctx.beginPath(); ctx.arc(px, py, R, 0, 7); ctx.fill();
    }
    for (const c of connList) {
      const [pa, pb] = [this.pt(c[0]), this.pt(c[1])];
      ctx.lineWidth = 2 * connW(c);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    for (const f of fillets) this.filletPath(ctx, f, R, S * 0.3), ctx.fill();
    for (const i of blocks) {
      const [px, py] = this.pt(i);
      ctx.fillRect(px - 1, py - 1, S + 2, S + 2);
    }

    // —— 表情 ——
    const faceAlpha = opt.faceAlpha !== undefined ? opt.faceAlpha
      : Math.min(1, Math.max(0, (now - newestT - 250) / 350));
    if (faceAlpha > 0.01) {
      let ftype = opt.forcedFace;
      if (!ftype) {
        const { libs, enemy } = this.libertiesAndEnemy(cells);
        ftype = libs === 1 ? 3 : (libs === 2 && enemy ? 2 : 1);
      }
      this.drawFace(ctx, cells, cellSet, color, ftype, faceAlpha, now, shrink);
    }
    ctx.restore();
  }

  filletPath(ctx, [i, sx, sy], R, f) {
    const [px, py] = this.pt(i);
    const Cx = px + sx * R, Cy = py + sy * R;
    const Ox = Cx + sx * f, Oy = Cy + sy * f;
    ctx.beginPath();
    ctx.moveTo(Cx, Cy);
    ctx.lineTo(Ox, Cy);
    const a1 = Math.atan2(Cy - Oy, 0);           // 从水平边点
    const a2 = Math.atan2(0, Cx - Ox);           // 到垂直边点
    ctx.arc(Ox, Oy, f, a1, a2, sx * sy > 0);
    ctx.lineTo(Cx, Oy);
    ctx.closePath();
  }

  drawFace(ctx, cells, cellSet, color, ftype, alpha, now, shrink) {
    // 脸放在"最外侧"的棋子上，朝向空旷方向(复刻原版)
    const s = this.size;
    let best = null, bestFree = -1, vec = [0, -1];
    const sorted = [...cells].sort((a, b) => a - b);
    for (const i of sorted) {
      const x = i % s, y = Math.floor(i / s);
      let free = 0, vx = 0, vy = 0;
      for (const [dx, dy] of [[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1],[1,1]]) {
        const nx = x + dx, ny = y + dy;
        const off = nx < 0 || ny < 0 || nx >= s || ny >= s;
        const occupied = !off && this.stones.has(ny * s + nx);
        if (!off && !occupied) { free++; vx += dx; vy += dy; }
        else if (off) { free += 0.4; vx += dx * 0.5; vy += dy * 0.5; }
      }
      if (free > bestFree) { bestFree = free; best = i; vec = (vx || vy) ? [vx, vy] : [0, -1]; }
    }
    if (best === null) return;
    const [px, py] = this.pt(best);
    const ang = Math.atan2(vec[1], vec[0]);
    const S = this.S * shrink;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, py);
    ctx.rotate(ang + Math.PI / 2);
    ctx.fillStyle = ctx.strokeStyle = color === BLACK ? COL.blackFace : COL.whiteFace;
    ctx.lineCap = 'round';
    ctx.lineWidth = S * 0.035;

    // 眨眼(按组随机相位)
    const blinkT = (now / 1000 + (sorted[0] * 0.37) % 3) % 3.6;
    const blink = ftype === 1 && blinkT > 3.42 ? 0.15 : 1;

    const eyeX = S * 0.24, eyeR = S * 0.052;
    if (ftype === 1) {
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(k * eyeX, 0, eyeR, eyeR * blink, 0, 0, 7);
        ctx.fill();
      }
      // ·ω· 小嘴
      ctx.beginPath();
      ctx.arc(-S * 0.048, 0, S * 0.048, Math.PI, 0, true);
      ctx.arc(S * 0.048, 0, S * 0.048, Math.PI, 0, true);
      ctx.stroke();
    } else if (ftype === 2) {
      for (const k of [-1, 1]) {
        ctx.beginPath(); ctx.arc(k * eyeX * 0.92, 0, eyeR, 0, 7); ctx.fill();
        // 皱眉
        ctx.beginPath();
        ctx.moveTo(k * eyeX * 1.35, -S * 0.13 + S * 0.045);
        ctx.lineTo(k * eyeX * 0.62, -S * 0.13 - S * 0.02);
        ctx.stroke();
      }
      // 担心的嘴(倒弧)
      ctx.beginPath();
      ctx.arc(0, S * 0.19, S * 0.09, Math.PI * 1.2, Math.PI * 1.8);
      ctx.stroke();
    } else {
      // 瞪大空心眼
      ctx.lineWidth = S * 0.032;
      for (const k of [-1, 1]) {
        ctx.beginPath(); ctx.arc(k * eyeX, 0, eyeR * 1.35, 0, 7); ctx.stroke();
      }
      // 张大的嘴
      ctx.beginPath();
      ctx.ellipse(0, S * 0.14, S * 0.062, S * 0.085, 0, 0, 7);
      ctx.fill();
      // 汗滴线
      ctx.lineWidth = S * 0.026;
      const sw = [[0.3, -0.3, 0.1], [0.37, -0.26, 0.16], [0.44, -0.31, 0.12]];
      for (const [sx0, sy0, len] of sw) {
        ctx.beginPath();
        ctx.moveTo(S * sx0, S * sy0);
        ctx.lineTo(S * sx0, S * (sy0 + len));
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}
