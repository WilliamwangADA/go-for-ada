/* 纯碁(Jungo)规则引擎：落子/提子/禁自杀/禁全同局面(superko)/数子 */
'use strict';

const EMPTY = 0, BLACK = 1, WHITE = 2;

class GoBoard {
  constructor(size) {
    this.size = size;
    this.grid = new Array(size * size).fill(EMPTY);
    this.captured = { [BLACK]: 0, [WHITE]: 0 };
    this.history = [];                 // 悔棋快照
    this.posSeen = new Set([this.key()]); // superko：出现过的局面
  }

  key() { return this.grid.join(''); }
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
  diagonals(i) {
    const [x, y] = this.xy(i), s = this.size, n = [];
    if (x > 0 && y > 0) n.push(i - s - 1);
    if (x < s - 1 && y > 0) n.push(i - s + 1);
    if (x > 0 && y < s - 1) n.push(i + s - 1);
    if (x < s - 1 && y < s - 1) n.push(i + s + 1);
    return n;
  }

  groupAt(i, grid = this.grid) {
    const color = grid[i];
    if (color === EMPTY) return [];
    const seen = new Set([i]), stack = [i];
    while (stack.length) {
      for (const n of this.neighbors(stack.pop())) {
        if (grid[n] === color && !seen.has(n)) { seen.add(n); stack.push(n); }
      }
    }
    return [...seen];
  }

  libertiesOf(group, grid = this.grid) {
    const libs = new Set();
    for (const i of group) {
      for (const n of this.neighbors(i)) {
        if (grid[n] === EMPTY) libs.add(n);
      }
    }
    return [...libs];
  }

  libertiesAt(i) { return this.libertiesOf(this.groupAt(i)); }

  // 模拟落子：返回 null(不合法) 或 {captured:[...], grid:落子后的棋盘}
  simulate(i, color) {
    if (this.grid[i] !== EMPTY) return null;
    const enemy = color === BLACK ? WHITE : BLACK;
    const g = [...this.grid];
    g[i] = color;
    const captured = new Set();
    for (const n of this.neighbors(i)) {
      if (g[n] === enemy && !captured.has(n)) {
        const grp = this.groupAt(n, g);
        if (this.libertiesOf(grp, g).length === 0) grp.forEach(s => captured.add(s));
      }
    }
    for (const c of captured) g[c] = EMPTY;
    if (this.libertiesOf(this.groupAt(i, g), g).length === 0) return null; // 自杀
    if (this.posSeen.has(g.join(''))) return null;                        // 全同局面
    return { captured: [...captured], grid: g };
  }

  tryPlay(i, color) { return this.simulate(i, color); }

  // 落子不合法的原因：'occupied' | 'suicide' | 'ko' | null(合法)
  moveError(i, color) {
    if (this.grid[i] !== EMPTY) return 'occupied';
    const enemy = color === BLACK ? WHITE : BLACK;
    const g = [...this.grid];
    g[i] = color;
    const captured = new Set();
    for (const n of this.neighbors(i)) {
      if (g[n] === enemy && !captured.has(n)) {
        const grp = this.groupAt(n, g);
        if (this.libertiesOf(grp, g).length === 0) grp.forEach(s => captured.add(s));
      }
    }
    for (const c of captured) g[c] = EMPTY;
    if (this.libertiesOf(this.groupAt(i, g), g).length === 0) return 'suicide';
    if (this.posSeen.has(g.join(''))) return 'ko';
    return null;
  }

  play(i, color) {
    const r = this.simulate(i, color);
    if (!r) return null;
    this.history.push({ grid: [...this.grid], cap: { ...this.captured } });
    this.grid = r.grid;
    this.captured[color === BLACK ? WHITE : BLACK] += r.captured.length;
    this.posSeen.add(this.key());
    return r;
  }

  undo() {
    const s = this.history.pop();
    if (!s) return false;
    this.posSeen.delete(this.key());
    this.grid = s.grid;
    this.captured = s.cap;
    return true;
  }

  legalMoves(color) {
    const moves = [];
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] === EMPTY && this.simulate(i, color)) moves.push(i);
    }
    return moves;
  }

  // 纯碁数子：棋盘上各方棋子数
  score() {
    let b = 0, w = 0;
    for (const c of this.grid) { if (c === BLACK) b++; else if (c === WHITE) w++; }
    return { [BLACK]: b, [WHITE]: w };
  }

  // 地盘计分：棋子 + 只被自己一方围住的空地；settled=没有争议空地了
  areaScore() {
    const sc = this.score();
    const seen = new Set();
    let settled = true, hasStone = sc[BLACK] + sc[WHITE] > 0;
    for (let i = 0; i < this.grid.length; i++) {
      if (this.grid[i] !== EMPTY || seen.has(i)) continue;
      const region = [i], stack = [i], borders = new Set();
      seen.add(i);
      while (stack.length) {
        const c = stack.pop();
        for (const n of this.neighbors(c)) {
          if (this.grid[n] === EMPTY) {
            if (!seen.has(n)) { seen.add(n); region.push(n); stack.push(n); }
          } else borders.add(this.grid[n]);
        }
      }
      if (borders.size === 1) sc[[...borders][0]] += region.length;
      else settled = false;               // 两边都挨着或没挨着棋子=还有争议
    }
    return { [BLACK]: sc[BLACK], [WHITE]: sc[WHITE], settled: settled && hasStone };
  }

  // i 是否为 color 的"真眼"(AI 不填)
  isTrueEye(i, color) {
    if (this.grid[i] !== EMPTY) return false;
    for (const n of this.neighbors(i)) if (this.grid[n] !== color) return false;
    const diag = this.diagonals(i);
    let bad = 0;
    for (const d of diag) if (this.grid[d] !== color && this.grid[d] !== EMPTY) bad++;
    const offEdge = 4 - diag.length; // 贴边缺失的斜角按严格算
    return diag.length === 4 ? bad === 0 : bad + 0 === 0 && offEdge >= 0;
  }
}
