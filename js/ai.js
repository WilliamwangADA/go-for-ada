/* 温柔 AI：小云朵(Lv1 很弱) / 小星星(Lv2 会一点点)。返回落点 idx 或 -1=跳过 */
'use strict';

const AI_FRIENDS = {
  cloud: { name: '小云朵', emoji: '☁️', noise: 6, capW: 3, atariW: 1, saveW: 3,
           selfAtariPen: 2, passBar: 0.5, blunder: 0.35 },
  star:  { name: '小星星', emoji: '⭐', noise: 2, capW: 9, atariW: 3, saveW: 8,
           selfAtariPen: 7, passBar: 0.2, blunder: 0.08 },
};

function aiPickMove(board, color, cfg, playerPassed) {
  const enemy = color === BLACK ? WHITE : BLACK;
  const cands = [];

  for (let i = 0; i < board.grid.length; i++) {
    if (board.grid[i] !== EMPTY) continue;
    if (board.isTrueEye(i, color)) continue;          // 不填自己的真眼
    const sim = board.simulate(i, color);
    if (!sim) continue;

    let score = 1;                                    // 纯碁：多放一子就多一分
    score += sim.captured.length * cfg.capW;          // 提子

    // 落子后自己这块的气
    const myGrp = board.groupAt(i, sim.grid);
    const myLibs = board.libertiesOf(myGrp, sim.grid).length;
    if (myLibs === 1) score -= cfg.selfAtariPen;      // 自投罗网(小云朵常犯=送礼)
    score += Math.min(myLibs, 4) * 0.3;

    // 救自己被打吃的棋
    for (const n of board.neighbors(i)) {
      if (board.grid[n] === color) {
        const g = board.groupAt(n);
        if (board.libertiesOf(g).length === 1 && myLibs >= 2) { score += cfg.saveW; break; }
      }
    }
    // 打吃对方
    for (const n of board.neighbors(i)) {
      if (sim.grid[n] === enemy) {
        const g = board.groupAt(n, sim.grid);
        if (board.libertiesOf(g, sim.grid).length === 1) { score += cfg.atariW; break; }
      }
    }
    // 稍微偏中间
    const [x, y] = board.xy(i), c = (board.size - 1) / 2;
    score -= (Math.abs(x - c) + Math.abs(y - c)) * 0.15;
    // 随机扰动(等级越低越乱)
    score += Math.random() * cfg.noise;

    cands.push({ i, score });
  }

  if (!cands.length) return -1;
  cands.sort((a, b) => b.score - a.score);

  // 低级别偶尔"看走眼"，随便挑一手
  if (Math.random() < cfg.blunder) {
    return cands[Math.floor(Math.random() * cands.length)].i;
  }
  // 玩家跳过后：只要自己不落后(或没有明显好棋)就跟着跳过，让棋局干脆收尾
  if (playerPassed) {
    const sc = board.score();
    const hasCapture = board.simulate(cands[0].i, color) &&
                       board.simulate(cands[0].i, color).captured.length > 0;
    if (sc[color] >= sc[enemy] && !hasCapture) return -1;
    if (cands[0].score < 3 + cfg.passBar * 4) return -1;
  }
  if (cands[0].score < cfg.passBar) return -1;
  return cands[0].i;
}
