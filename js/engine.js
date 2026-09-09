/* 吃子棋规则引擎：落子/气/提子/禁自杀/简单打劫 */
'use strict';

const EMPTY = 0, SNOW = 1, BERRY = 2; // 雪球队 / 蓝莓队

class GoBoard {
  constructor(size) {
    this.size = size;
    this.grid = new Array(size * size).fill(EMPTY);
    this.koPoint = -1;           // 简单劫：禁止立刻回提的点
    this.captured = { [SNOW]: 0, [BERRY]: 0 }; // 各队被送回家的数量
    this.history = [];           // 悔棋快照
  }

  idx(x, y) { return y * this.size + x; }
  xy(i) { return [i % this.size, Math.floor(i / this.size)]; }

  neighbors(i) {
    const [x, y] = this.xy(i), n = [];
    if (x > 0) n.push(i - 1);
    if (x < this.size - 1) n.push(i + 1);
    if (y > 0) n.push(i - this.size);
    if (y < this.size - 1) n.push(i + this.size);
    return n;
  }

  // 同色连通块
  groupAt(i) {
    const color = this.grid[i];
    if (color === EMPTY) return [];
    const seen = new Set([i]), stack = [i];
    while (stack.length) {
      for (const n of this.neighbors(stack.pop())) {
        if (this.grid[n] === color && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    return [...seen];
  }

  libertiesOf(group) {
    const libs = new Set();
    for (const i of group) {
      for (const n of this.neighbors(i)) {
        if (this.grid[n] === EMPTY) libs.add(n);
      }
    }
    return [...libs];
  }

  libertiesAt(i) { return this.libertiesOf(this.groupAt(i)); }

  // 试下：返回 null(不合法) 或 {captured:[idx...]}，不改动棋盘
  tryPlay(i, color) {
    if (this.grid[i] !== EMPTY || i === this.koPoint) return null;
    const enemy = color === SNOW ? BERRY : SNOW;
    this.grid[i] = color;
    const captured = new Set();
    for (const n of this.neighbors(i)) {
      if (this.grid[n] === enemy) {
        const g = this.groupAt(n);
        if (this.libertiesOf(g).length === 0) g.forEach(s => captured.add(s));
      }
    }
    const suicide = captured.size === 0 && this.libertiesAt(i).length === 0;
    this.grid[i] = EMPTY;
    return suicide ? null : { captured: [...captured] };
  }

  // 真落子；返回 {captured} 或 null
  play(i, color) {
    const r = this.tryPlay(i, color);
    if (!r) return null;
    this.history.push({ grid: [...this.grid], ko: this.koPoint,
                        cap: { ...this.captured } });
    this.grid[i] = color;
    for (const c of r.captured) {
      this.captured[this.grid[c]]++;
      this.grid[c] = EMPTY;
    }
    // 简单劫：单子提单子时禁止立刻回提
    this.koPoint = -1;
    if (r.captured.length === 1 && this.groupAt(i).length === 1 &&
        this.libertiesAt(i).length === 1) {
      this.koPoint = r.captured[0];
    }
    return r;
  }

  undo(steps = 1) {
    let done = false;
    while (steps-- > 0 && this.history.length) {
      const s = this.history.pop();
      this.grid = s.grid; this.koPoint = s.ko; this.captured = s.cap;
      done = true;
    }
    return done;
  }

  legalMoves(color) {
    const moves = [];
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === EMPTY && this.tryPlay(i, color)) moves.push(i);
    }
    return moves;
  }
}
