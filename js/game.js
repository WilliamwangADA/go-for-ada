/* 围棋小岛 — 复刻 SquishyGo 玩法(纯碁)，温柔适配 5 岁 */
'use strict';

const $ = s => document.querySelector(s);

/* ---------- 轻柔音效 ---------- */
let _ac = null;
function ac() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac; }
function tone(freq, dur, type = 'sine', vol = 0.16, when = 0) {
  try {
    const t = ac().currentTime + when;
    const o = ac().createOscillator(), g = ac().createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.85, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac().destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* ignore */ }
}
const sndPurun   = () => { tone(340, 0.16, 'sine', 0.22); tone(520, 0.12, 'sine', 0.1, 0.04); };
const sndPop     = n  => { for (let k = 0; k < Math.min(n, 4); k++) tone(700 + k * 130, 0.16, 'sine', 0.16, k * 0.08); };
const sndWinJing = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.32, 'sine', 0.18, i * 0.15));
const sndSoft    = () => tone(300, 0.14, 'sine', 0.1);

/* ---------- 全局状态 ---------- */
let board, blob, raf = 0;
let boardSize = 5;
let opponent = 'cloud';          // 'cloud' | 'star' | 'pvp'
let playerColor = BLACK;         // Ada 执的颜色(仅 AI 模式有意义)
let turn = BLACK, busy = false, over = false;
let passStreak = 0;
let atariWarned = false;
let firstLoad = true;

function aiCfg() { return AI_FRIENDS[opponent]; }
function aiColor() { return playerColor === BLACK ? WHITE : BLACK; }
function isAiTurn() { return opponent !== 'pvp' && turn === aiColor() && !over; }

/* ---------- 开局：先选执子(对AI)，再开局 ---------- */
function newGame() {
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
  say(firstLoad ? 'hello' : 'pick_color');
  firstLoad = false;
}

function startRound() {
  $('#colorPick').classList.remove('open');
  over = false; busy = false;
  updateBar();
  if (opponent === 'cloud') say('start_cloud');
  else if (opponent === 'star') say('start_star');
  else say('start_pvp');
  if (isAiTurn()) scheduleAi();
}

function loop() {
  raf = requestAnimationFrame(loop);
  blob.render(performance.now());
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
  if (busy || over) return;
  if (opponent !== 'pvp' && turn !== playerColor) return;
  const rect = blob.canvas.getBoundingClientRect();
  const i = blob.hit(e.clientX - rect.left, e.clientY - rect.top);
  if (i < 0) return;
  if (!board.simulate(i, turn)) { sndSoft(); return; }
  doMove(i, turn);
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
      setTimeout(() => say(color === playerColor ? 'capture_cheer' : 'capture_by_ai'), 500);
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
      setTimeout(() => say('atari_warn'), 700);
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
  if (!byAi) say('pass_you');
  else say('pass_ai');
  showToast(color === BLACK ? '黑棋休息一手' : '白棋休息一手');
  if (passStreak >= 2) { endGame(); return; }
  updateBar();
  advanceTurn();
}

function endGame(resigned = null, settledAuto = false) {
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
  $('#ovTitle').textContent = titles[result];
  setTimeout(() => {
    $('#overlay').classList.add('open');
    if (settledAuto) say('settle');
    if (result === 'win' || result === 'pvpB' || result === 'pvpW') {
      sndWinJing(); confetti();
      setTimeout(() => say(opponent === 'pvp' ? 'count' : 'win'), settledAuto ? 2600 : 0);
    } else if (result === 'draw') setTimeout(() => say('draw'), settledAuto ? 2600 : 0);
    else setTimeout(() => say('lose'), settledAuto ? 2600 : 0);
    // 温柔进阶提示
    const nextTip = $('#ovNext');
    nextTip.style.display = 'none';
    if (result === 'win' && opponent === 'cloud') {
      nextTip.textContent = '要不要去找 ⭐小星星 玩玩看？';
      nextTip.style.display = '';
      nextTip.onclick = () => { opponent = 'star'; $('#selOpp').value = 'star'; newGame(); };
    } else if (result === 'win' && opponent === 'star' && boardSize === 5) {
      nextTip.textContent = '要不要试试更大的 7×7 棋盘？';
      nextTip.style.display = '';
      nextTip.onclick = () => { boardSize = 7; $('#selSize').value = '7'; newGame(); };
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
  say('undo');
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
  document.querySelectorAll('.ruleCard').forEach(c => {
    c.addEventListener('pointerup', () => say(c.dataset.voice));
  });
  $('#selSize').onchange = e => { boardSize = +e.target.value; newGame(); };
  $('#selOpp').onchange = e => { opponent = e.target.value; newGame(); };
  $('#pickBlack').onclick = () => { playerColor = BLACK; startRound(); };
  $('#pickWhite').onclick = () => { playerColor = WHITE; startRound(); };
  $('#ovAgain').onclick = () => newGame();
  $('#btnNew').onclick = () => newGame();

  document.body.addEventListener('pointerdown', () => { ac().resume && ac().resume(); }, { once: true });
  newGame();
});
