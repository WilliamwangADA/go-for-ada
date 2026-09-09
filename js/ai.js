/* 温柔 AI 朋友：小云朵(超温和) / 小星星(会一点点) */
'use strict';

const AI_FRIENDS = {
  cloud: { name: '小云朵', size: 5, target: 1, captureChance: 0.15, escapeChance: 0.3,  giftChance: 0.35 },
  star:  { name: '小星星', size: 7, target: 3, captureChance: 0.5,  escapeChance: 0.65, giftChance: 0.15 },
};

function aiPickMove(board, color, cfg) {
  const enemy = color === SNOW ? BERRY : SNOW;
  const legal = board.legalMoves(color);
  if (!legal.length) return -1;

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // 1. 能提子的点（温柔：大概率故意不提）
  const capMoves = legal.filter(i => board.tryPlay(i, color).captured.length > 0);
  if (capMoves.length && Math.random() < cfg.captureChance) return pick(capMoves);

  // 2. 自己被打吃时逃跑（温柔：常常忘记逃）
  const atariEscapes = [];
  const seen = new Set();
  for (let i = 0; i < board.grid.length; i++) {
    if (board.grid[i] !== color || seen.has(i)) continue;
    const g = board.groupAt(i);
    g.forEach(s => seen.add(s));
    const libs = board.libertiesOf(g);
    if (libs.length === 1 && legal.includes(libs[0])) {
      // 逃了之后要真的多一口气才算逃
      const b2 = new GoBoard(board.size);
      b2.grid = [...board.grid]; b2.koPoint = board.koPoint;
      b2.grid[libs[0]] = color;
      if (b2.libertiesAt(libs[0]).length >= 2) atariEscapes.push(libs[0]);
    }
  }
  if (atariEscapes.length && Math.random() < cfg.escapeChance) return pick(atariEscapes);

  // 3. 送小礼物：故意下到只剩一两口气的地方，让孩子有机会提
  if (Math.random() < cfg.giftChance) {
    const gifts = legal.filter(i => {
      const near = board.neighbors(i).some(n => board.grid[n] === enemy);
      const b2 = new GoBoard(board.size);
      b2.grid = [...board.grid];
      b2.grid[i] = color;
      const libs = b2.libertiesAt(i).length;
      return near && libs >= 1 && libs <= 2;
    });
    if (gifts.length) return pick(gifts);
  }

  // 4. 普通一手：偏好气多、靠中间的点，避免把自己下死
  const scored = legal.map(i => {
    const b2 = new GoBoard(board.size);
    b2.grid = [...board.grid];
    b2.grid[i] = color;
    const libs = b2.libertiesAt(i).length;
    const [x, y] = board.xy(i);
    const c = (board.size - 1) / 2;
    const centerBonus = -(Math.abs(x - c) + Math.abs(y - c)) * 0.3;
    return { i, score: libs + centerBonus + Math.random() * 2.5 };
  }).filter(m => {
    const b2 = new GoBoard(board.size);
    b2.grid = [...board.grid];
    b2.grid[m.i] = color;
    return b2.libertiesAt(m.i).length >= 2 || legal.length < 4;
  });
  if (!scored.length) return pick(legal);
  scored.sort((a, b) => b.score - a.score);
  return scored[0].i;
}
