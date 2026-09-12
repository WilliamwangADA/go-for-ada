/* 围棋小岛 — 复刻 SquishyGo 玩法(纯碁)，温柔适配 5 岁 */
'use strict';

const $ = s => document.querySelector(s);

/* ---------- 轻柔音效(音频核心在 js/sfx.js) ---------- */
const sndPurun = () => { tone(340, 0.16, 'sine', 0.22); tone(520, 0.12, 'sine', 0.1, 0.04); };
const sndPop   = n  => { for (let k = 0; k < Math.min(n, 4); k++) tone(700 + k * 130, 0.16, 'sine', 0.16, k * 0.08); };
const sndSoft  = () => tone(300, 0.14, 'sine', 0.1);

/* ---------- 全局状态 ---------- */
let board, blob, raf = 0;
let boardSize = 5;
let opponent = 'cloud';          // 'cloud' | 'star' | 'pvp'
let playerColor = BLACK;         // 玩家执的颜色(仅 AI 模式有意义)
let turn = BLACK, busy = false, over = false;
let passStreak = 0;
let atariWarned = false;
let firstLoad = true;

function aiCfg() { return AI_FRIENDS[opponent]; }
function aiColor() { return playerColor === BLACK ? WHITE : BLACK; }
function isAiTurn() { return opponent !== 'pvp' && turn === aiColor() && !over; }

/* ---------- 开局：先选执子(对AI)，再开局 ---------- */
function newGame() {
  advReset();
  board = new GoBoard(boardSize);
  turn = BLACK; busy = false; over = true; passStreak = 0; atariWarned = false;
  blob = new BlobBoard($('#board'), boardSize);
  blob.setPosition(board.grid, performance.now());
  $('#overlay').classList.remove('open');
  $('#confetti').innerHTML = '';
  updateBar();
  if (!raf) loop();
  if (opponent === 'pvp') { startRound(); return; }
  $('#colorPick').classList.add('open');
  sfx('hello');
  firstLoad = false;
}

function startRound() {
  $('#colorPick').classList.remove('open');
  over = false; busy = false;
  updateBar();
  sfx('start');
  if (isAiTurn()) scheduleAi();
}

let _frame = 0;
function loop() {
  raf = requestAnimationFrame(loop);
  const now = performance.now();
  _frame++;
  // 画面静止时只画 1/4 帧(眨眼够用)，省电防发热
  if (!blob.hasActiveAnim(now) && _frame % 4) return;
  blob.render(now);
}

/* ---------- 计分条(地盘 = 棋子+圈好的空地) ---------- */
function updateBar() {
  const st = board.score();
  const sc = (st[BLACK] > 0 && st[WHITE] > 0) ? board.areaScore() : st;
  $('#cntBlack').textContent = sc[BLACK];
  $('#cntWhite').textContent = sc[WHITE];
  $('#sideBlack').classList.toggle('active', !over && turn === BLACK);
  $('#sideWhite').classList.toggle('active', !over && turn === WHITE);
  $('#sideBlack').classList.toggle('thinking', isAiTurn() && busy && aiColor() === BLACK);
  $('#sideWhite').classList.toggle('thinking', isAiTurn() && busy && aiColor() === WHITE);
}

/* ---------- 落子 ---------- */
function tapBoard(e) {
  if (advPuzzle) {
    const rect0 = blob.canvas.getBoundingClientRect();
    const p = blob.hit(e.clientX - rect0.left, e.clientY - rect0.top);
    if (p >= 0) puzzleTap(p);
    return;
  }
  if (busy || over) return;
  if (opponent !== 'pvp' && turn !== playerColor) return;
  const rect = blob.canvas.getBoundingClientRect();
  const i = blob.hit(e.clientX - rect.left, e.clientY - rect.top);
  if (i < 0) return;
  const err = board.moveError(i, turn);
  if (err) { explainIllegal(i, err); return; }
  doMove(i, turn);
}

/* 不能落子：标记 + 提示为什么 */
const _illegalInfo = {
  occupied: { toast: '这里已经住着小团子啦' },
  suicide:  { toast: '放这里一口气都没有，会马上消失哦' },
  ko:       { toast: '不能变回刚才一模一样的棋盘哦' },
};
function explainIllegal(i, err) {
  sndSoft();
  blob.showDeny(i, performance.now());
  showToast(_illegalInfo[err].toast);
}

function doMove(i, color) {
  const r = board.play(i, color);
  if (!r) return;
  passStreak = 0;
  const now = performance.now();
  if (r.captured.length) blob.removeGroup(r.captured, now);
  blob.addStone(i, color, now);
  sndPurun();
  if (r.captured.length) {
    setTimeout(() => sndPop(r.captured.length), 260);
    if (opponent !== 'pvp') {
      setTimeout(() => sfx(color === playerColor ? 'capture_cheer' : 'capture_by_ai'), 500);
    }
  }
  turn = color === BLACK ? WHITE : BLACK;
  updateBar();
  // 地盘都分清楚了 → 自动数子判输赢
  if (board.history.length >= boardSize * 2 && board.areaScore().settled) {
    endGame(null, true);
    return;
  }
  afterMove(color);
  advanceTurn();
}

// 轮到的一方无棋可下 → 自动跳过；否则该 AI 就让 AI 走
function advanceTurn() {
  if (over) return;
  if (!board.legalMoves(turn).length) {
    showToast(turn === BLACK ? '黑棋没地方下啦，自动跳过' : '白棋没地方下啦，自动跳过');
    passStreak++;
    turn = turn === BLACK ? WHITE : BLACK;
    if (passStreak >= 2) { endGame(); return; }
    updateBar();
    advanceTurn();
    return;
  }
  if (isAiTurn()) scheduleAi();
}

function afterMove(justMoved) {
  // 玩家的棋只剩一口气 → 第一次温柔提醒(配合流汗表情)
  if (opponent === 'pvp' || atariWarned || justMoved !== aiColor()) return;
  for (let i = 0; i < board.grid.length; i++) {
    if (board.grid[i] !== playerColor) continue;
    const g = board.groupAt(i);
    if (g[0] === i && board.libertiesOf(g).length === 1) {
      atariWarned = true;
      setTimeout(() => { sfx('atari'); showToast('呀，流汗的小团子只剩一口气啦！'); }, 700);
      return;
    }
  }
}

/* ---------- AI ---------- */
function scheduleAi() {
  busy = true;
  updateBar();
  setTimeout(() => {
    busy = false;
    if (over) return;
    // 差距太大(超过半个棋盘)就大方认输，夸夸孩子
    const sc = board.areaScore();
    if (board.history.length >= 8 &&
        sc[playerColor] - sc[aiColor()] >= board.size * board.size / 2) {
      showToast(`${aiCfg().name}认输啦！`);
      endGame(aiColor(), false, true);
      return;
    }
    const mv = aiPickMove(board, aiColor(), aiCfg(), passStreak > 0);
    if (mv < 0) doPass(aiColor(), true);
    else doMove(mv, aiColor());
    updateBar();
  }, 750 + Math.random() * 800);
}

/* ---------- 跳过 / 终局 ---------- */
function doPass(color, byAi = false) {
  passStreak++;
  turn = color === BLACK ? WHITE : BLACK;
  sfx('pass');
  showToast(color === BLACK ? '黑棋休息一手' : '白棋休息一手');
  if (passStreak >= 2) { endGame(); return; }
  updateBar();
  advanceTurn();
}

function endGame(resigned = null, settledAuto = false, aiResigned = false) {
  over = true; updateBar();
  const sc = board.areaScore();
  const myC = playerColor, opC = aiColor();
  let result;
  if (opponent === 'pvp') {
    result = sc[BLACK] > sc[WHITE] ? 'pvpB' : sc[BLACK] < sc[WHITE] ? 'pvpW' : 'draw';
    if (resigned) result = resigned === BLACK ? 'pvpW' : 'pvpB';
  } else if (resigned) {
    result = resigned === myC ? 'lose' : 'win';
  } else {
    result = sc[myC] > sc[opC] ? 'win' : sc[myC] < sc[opC] ? 'lose' : 'draw';
  }
  $('#ovBlackCnt').textContent = sc[BLACK];
  $('#ovWhiteCnt').textContent = sc[WHITE];
  const titles = {
    win: '你赢啦！🎉', lose: '还差一点点~', draw: '平手啦！🤝',
    pvpB: '黑棋赢啦！🎉', pvpW: '白棋赢啦！🎉',
  };
  $('#ovTitle').textContent = aiResigned ? `${aiCfg().name}认输，你赢啦！🎉` : titles[result];
  $('#ovMap').style.display = 'none';
  $('#ovNextStation').style.display = 'none';
  advOnGameEnd(result);
  setTimeout(() => {
    $('#overlay').classList.add('open');
    if (settledAuto) sfx('settle');
    const won = aiResigned || result === 'win' || result === 'pvpB' || result === 'pvpW';
    const wait = settledAuto ? 900 : 0;
    if (won) setTimeout(() => { sfx('win'); confetti(); fireworks(4500); }, wait);
    else if (result === 'draw') setTimeout(() => sfx('draw'), wait);
    else setTimeout(() => sfx('lose'), wait);
    // 温柔进阶提示
    // 温柔进阶链：小云朵 → 小星星 → 7×7 → 小月亮 → 9×9
    const nextTip = $('#ovNext');
    nextTip.style.display = 'none';
    const suggest = (text, fn) => { nextTip.textContent = text; nextTip.style.display = ''; nextTip.onclick = fn; };
    if (result === 'win' && !advGame) {
      if (opponent === 'cloud') {
        suggest('要不要去找 ⭐小星星 玩玩看？', () => { opponent = 'star'; $('#selOpp').value = 'star'; newGame(); });
      } else if (opponent === 'star' && boardSize === 5) {
        suggest('要不要试试更大的 7×7 棋盘？', () => { boardSize = 7; $('#selSize').value = '7'; newGame(); });
      } else if (opponent === 'star' && boardSize >= 7) {
        suggest('要不要挑战 🌙小月亮？它很会下哦！', () => { opponent = 'moon'; $('#selOpp').value = 'moon'; newGame(); });
      } else if (opponent === 'moon' && boardSize === 7) {
        suggest('哇，要不要试试最大的 9×9 棋盘？', () => { boardSize = 9; $('#selSize').value = '9'; newGame(); });
      }
    }
  }, resigned ? 150 : 900);
}

function confetti() {
  const box = $('#confetti');
  const em = ['🎉', '⭐', '🌸', '✨', '🎈'];
  for (let k = 0; k < 24; k++) {
    const s = document.createElement('span');
    s.textContent = em[k % em.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    s.style.fontSize = (20 + Math.random() * 24) + 'px';
    box.appendChild(s);
  }
  setTimeout(() => box.innerHTML = '', 4200);
}

let toastTimer = 0;
function showToast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1600);
}

/* ---------- 悔棋(不限次数) ---------- */
function undo() {
  if (busy || over) return;
  const steps = (opponent !== 'pvp' && turn === playerColor) ? 2 : 1;
  let done = 0;
  for (let k = 0; k < steps; k++) if (board.undo()) done++;
  if (!done) { sndSoft(); return; }
  passStreak = 0;
  if (opponent === 'pvp') {
    if (done === 1) turn = turn === BLACK ? WHITE : BLACK;
  } else {
    turn = board.history.length % 2 === 0 ? BLACK : WHITE;
  }
  blob.setPosition(board.grid, performance.now());
  updateBar();
  sfx('undo');
  if (isAiTurn()) scheduleAi();
}

/* ---------- 怎么玩 ---------- */
function openHowto() {
  $('#howto').classList.add('open');
}

/* ---------- 绑定 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  const cv = $('#board');
  const fit = () => {
    const wrap = $('#boardWrap');
    const side = Math.min(wrap.clientWidth, wrap.clientHeight);
    cv.style.width = side + 'px';
    cv.style.height = side + 'px';
    if (blob) blob.resize();
  };
  window.addEventListener('resize', fit);
  fit();

  cv.addEventListener('pointerup', tapBoard);
  $('#btnPass').onclick = () => { if (!busy && !over && (opponent === 'pvp' || turn === playerColor)) doPass(turn); };
  $('#btnUndo').onclick = undo;
  $('#btnHowto').onclick = openHowto;
  $('#howtoClose').onclick = () => { $('#howto').classList.remove('open'); };
  $('#selSize').onchange = e => { boardSize = +e.target.value; newGame(); };
  $('#selOpp').onchange = e => { opponent = e.target.value; newGame(); };
  $('#pickBlack').onclick = () => { playerColor = BLACK; startRound(); };
  $('#pickWhite').onclick = () => { playerColor = WHITE; startRound(); };
  $('#ovAgain').onclick = () => { if (advGame) startStation(advGame); else newGame(); };
  $('#btnNew').onclick = () => { if (advGame) startStation(advGame); else newGame(); };

  document.body.addEventListener('pointerdown', () => { ac().resume && ac().resume(); }, { once: true });
  newGame();
  // 离线缓存：注册放在开局之后，不挡首屏
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
});
