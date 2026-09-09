/* Ada的围棋小岛 — 界面与流程 */
'use strict';

const CELL = 100, PAD = 78;
const $ = s => document.querySelector(s);

/* ---------- 轻柔音效 (WebAudio 合成) ---------- */
let _ac = null;
function ac() { if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)(); return _ac; }
function tone(freq, dur, type = 'sine', vol = 0.18, when = 0) {
  try {
    const t = ac().currentTime + when;
    const o = ac().createOscillator(), g = ac().createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(ac().destination);
    o.start(t); o.stop(t + dur);
  } catch (e) { /* 音频不可用时静默 */ }
}
const sndPlace   = () => { tone(520, 0.12, 'sine', 0.22); tone(780, 0.1, 'sine', 0.1, 0.03); };
const sndBubble  = n  => tone(660 + n * 110, 0.18, 'sine', 0.2);
const sndCapture = () => { tone(880, 0.15); tone(1100, 0.18, 'sine', 0.15, 0.1); tone(1320, 0.25, 'sine', 0.12, 0.2); };
const sndWin     = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.2, i * 0.15));
const sndSoft    = () => tone(392, 0.2, 'sine', 0.12);

/* ---------- 棋棋说话 ---------- */
function qiqi(id, textOverride) {
  const t = textOverride || VOICE_LINES[id] || '';
  $('#bubbleText').textContent = t.replace(/Ada/g, 'Ada');
  const av = $('#qiqiAvatar');
  av.classList.remove('talking'); void av.offsetWidth; av.classList.add('talking');
  if (id) say(id);
}

/* ---------- 屏幕切换 ---------- */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ---------- 棋子 SVG ---------- */
function stoneSVG(color, i, cls = '') {
  const team = color === SNOW ? 'snow' : 'berry';
  const blinkDelay = (Math.random() * 5 + 2).toFixed(1);
  return `<g class="stoneWrap" data-i="${i}"><g class="stone ${team} ${cls}">
    <circle class="body" r="41"/>
    <ellipse class="cheek" cx="-22" cy="8" rx="8" ry="5"/>
    <ellipse class="cheek" cx="22" cy="8" rx="8" ry="5"/>
    <g class="eyes" style="animation-delay:${blinkDelay}s">
      <circle class="eye" cx="-14" cy="-6" r="6"/>
      <circle class="eye" cx="14" cy="-6" r="6"/>
      <circle class="spark" cx="-11.8" cy="-8.2" r="2.1"/>
      <circle class="spark" cx="16.2" cy="-8.2" r="2.1"/>
    </g>
    <path class="smile" d="M -13 8 Q 0 19 13 8"/>
  </g></g>`;
}
function sleepStoneSVG(color) {
  const team = color === SNOW ? 'snow' : 'berry';
  return `<svg viewBox="-50 -50 100 100" class="miniStone ${team}">
    <circle class="body" r="41"/>
    <path class="closedEye" d="M -20 -6 Q -14 0 -8 -6"/>
    <path class="closedEye" d="M 8 -6 Q 14 0 20 -6"/>
    <path class="smile" d="M -11 12 Q 0 20 11 12"/>
  </svg>`;
}

/* ---------- 棋盘视图 ---------- */
class BoardView {
  constructor(container, size, onTap) {
    this.size = size; this.onTap = onTap;
    const W = PAD * 2 + (size - 1) * CELL;
    this.W = W;
    container.innerHTML = `<svg id="boardSVG" viewBox="0 0 ${W} ${W}">
      <rect class="wood" x="6" y="6" width="${W - 12}" height="${W - 12}" rx="34"/>
      <g class="grid"></g>
      <g class="twinkles"></g>
      <g class="stones"></g>
      <g class="bubbles"></g>
      <g class="fx"></g>
    </svg>`;
    this.svg = container.querySelector('svg');
    const grid = this.svg.querySelector('.grid');
    let g = '';
    for (let k = 0; k < size; k++) {
      const p = PAD + k * CELL, a = PAD, b = W - PAD;
      g += `<line x1="${a}" y1="${p}" x2="${b}" y2="${p}"/><line x1="${p}" y1="${a}" x2="${p}" y2="${b}"/>`;
    }
    if (size % 2) { const c = PAD + (size - 1) / 2 * CELL; g += `<circle class="hoshi" cx="${c}" cy="${c}" r="7"/>`; }
    grid.innerHTML = g;
    this.svg.addEventListener('pointerup', e => this._tap(e));
  }
  pt(i) { const x = i % this.size, y = Math.floor(i / this.size); return [PAD + x * CELL, PAD + y * CELL]; }
  _tap(e) {
    const r = this.svg.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * this.W, sy = (e.clientY - r.top) / r.height * this.W;
    const gx = Math.round((sx - PAD) / CELL), gy = Math.round((sy - PAD) / CELL);
    if (gx < 0 || gy < 0 || gx >= this.size || gy >= this.size) return;
    const [px, py] = this.pt(gy * this.size + gx);
    if (Math.hypot(px - sx, py - sy) > CELL * 0.47) return;
    this.onTap(gy * this.size + gx);
  }
  sync(board, bornIdx = -1) {
    const layer = this.svg.querySelector('.stones');
    let html = '';
    for (let i = 0; i < board.grid.length; i++) {
      if (board.grid[i] === EMPTY) continue;
      html += stoneSVG(board.grid[i], i, i === bornIdx ? 'born' : '');
    }
    layer.innerHTML = html;
    layer.querySelectorAll('.stoneWrap').forEach(s => {
      const [x, y] = this.pt(+s.dataset.i);
      s.setAttribute('transform', `translate(${x} ${y})`);
    });
  }
  ghost(i, color) {
    this.clearGhost();
    if (i < 0) return;
    const [x, y] = this.pt(i);
    const layer = this.svg.querySelector('.fx');
    layer.insertAdjacentHTML('beforeend',
      `<g class="ghostWrap" transform="translate(${x} ${y})">
         <circle class="ghostRing" r="52"/>${stoneSVG(color, i, 'ghost')}
         <g class="ghostTag" transform="translate(0 -72)"><rect x="-58" y="-24" width="116" height="40" rx="20"/><text y="4">再点一下✓</text></g>
       </g>`);
  }
  clearGhost() { this.svg.querySelectorAll('.ghostWrap').forEach(n => n.remove()); }
  twinkle(points) {
    const layer = this.svg.querySelector('.twinkles');
    layer.innerHTML = points.map(i => {
      const [x, y] = this.pt(i);
      return `<g transform="translate(${x} ${y})"><g class="twinkle">
        <circle r="14"/><path d="M0 -18 L3.5 -6 L17 -3.5 L5.6 4 L8.4 17 L0 9 L-8.4 17 L-5.6 4 L-17 -3.5 L-3.5 -6 Z"/></g></g>`;
    }).join('');
  }
  bubbles(points, tappable = false) {
    const layer = this.svg.querySelector('.bubbles');
    layer.innerHTML = points.map((i, k) => {
      const [x, y] = this.pt(i);
      return `<g class="qibubble ${tappable ? 'tappable' : ''}" data-i="${i}" transform="translate(${x} ${y})" style="animation-delay:${k * 0.12}s">
        <circle class="bub" r="20"/><circle class="shine" cx="-6" cy="-7" r="5"/></g>`;
    }).join('');
  }
  clearBubbles() { this.svg.querySelector('.bubbles').innerHTML = ''; }
  burstBubble(i, label) {
    const b = this.svg.querySelector(`.qibubble[data-i="${i}"]`);
    if (!b) return;
    b.classList.add('burst');
    const [x, y] = this.pt(i);
    const fx = this.svg.querySelector('.fx');
    fx.insertAdjacentHTML('beforeend',
      `<text class="countPop" x="${x}" y="${y + 12}">${label}</text>`);
    const popNode = fx.lastElementChild;
    setTimeout(() => { b.remove(); popNode.remove(); }, 1400);
  }
  animateCapture(indices, board, done) {
    const fx = this.svg.querySelector('.fx');
    indices.forEach((i, k) => {
      const [x, y] = this.pt(i);
      const color = board.grid[i];
      fx.insertAdjacentHTML('beforeend',
        `<g transform="translate(${x} ${y})"><g class="captureFly" style="animation-delay:${k * 0.1}s">
           <circle class="wrapBubble" r="56"/>${stoneSVG(color, -1, 'sleepy')}</g></g>`);
    });
    setTimeout(() => {
      fx.querySelectorAll('.captureFly').forEach(n => n.parentNode.remove());
      done && done();
    }, 1050);
  }
  wobble(indices) {
    indices.forEach(i => {
      const s = this.svg.querySelector(`.stoneWrap[data-i="${i}"] .stone`);
      s && s.classList.add('wobble');
    });
  }
}

/* ---------- 全局状态 ---------- */
let view = null, board = null;
let mode = null;            // 'teach' | 'ai' | 'pvp'
let aiCfg = null, target = 1;
let turn = SNOW, busy = false, ghostAt = -1;
let teachStep = 0, teachData = {};
let lastWarn = 0;

function setPanelPlay(friendName, friendTeamCls) {
  $('#panelPlay').style.display = '';
  $('#panelTeach').style.display = 'none';
  $('#oppName').textContent = friendName;
  updateBaskets();
}
function updateBaskets() {
  // 我送回家的蓝莓 → 目标篮；对方送回家的雪球
  const mine = board.captured[BERRY], theirs = board.captured[SNOW];
  let mineH = '', theirH = '';
  for (let k = 0; k < target; k++) mineH += k < mine ? sleepStoneSVG(BERRY) : '<span class="slot"></span>';
  for (let k = 0; k < target; k++) theirH += k < theirs ? sleepStoneSVG(SNOW) : '<span class="slot"></span>';
  $('#basketMine').innerHTML = mineH;
  $('#basketTheirs').innerHTML = theirH;
  $('#turnSnow').classList.toggle('activeTurn', turn === SNOW);
  $('#turnBerry').classList.toggle('activeTurn', turn === BERRY);
}

/* ---------- 对局模式 ---------- */
function startPlay(friend) {
  mode = friend === 'pvp' ? 'pvp' : 'ai';
  aiCfg = friend === 'pvp' ? null : AI_FRIENDS[friend];
  const size = aiCfg ? aiCfg.size : 7;
  target = aiCfg ? aiCfg.target : 3;
  board = new GoBoard(size);
  turn = SNOW; busy = false; ghostAt = -1; lastWarn = 0;
  view = new BoardView($('#boardBox'), size, onPlayTap);
  view.sync(board);
  show('#screenPlay');
  $('#oppRow').style.display = mode === 'ai' ? '' : 'none';
  $('#pvpRow').style.display = mode === 'pvp' ? '' : 'none';
  setPanelPlay(aiCfg ? aiCfg.name : '雪球队 vs 蓝莓队');
  $('#overlay').classList.remove('open');
  if (friend === 'cloud') qiqi('play_start_cloud');
  else if (friend === 'star') qiqi('play_start_star');
  else qiqi('pvp_start');
}

function onPlayTap(i) {
  if (busy) return;
  if (mode === 'ai' && turn !== SNOW) return;
  // 点棋子 → 看气泡泡
  if (board.grid[i] !== EMPTY) {
    const libs = board.libertiesAt(i);
    view.bubbles(libs, false);
    sndSoft();
    setTimeout(() => view.clearBubbles(), 2200);
    return;
  }
  if (!board.tryPlay(i, turn)) { sndSoft(); return; }
  if (ghostAt === i) { view.clearGhost(); ghostAt = -1; doMove(i, turn); }
  else { ghostAt = i; view.ghost(i, turn); tone(600, 0.08, 'sine', 0.12); }
}

function doMove(i, color) {
  const r = board.play(i, color);
  if (!r) return;
  busy = true;
  sndPlace();
  const finish = () => {
    view.sync(board, i);
    updateBaskets();
    if (checkEnd()) { busy = false; return; }
    afterMoveHints(color);
    turn = color === SNOW ? BERRY : SNOW;
    updateBaskets();
    busy = false;
    if (mode === 'ai' && turn === BERRY) aiTurn();
  };
  if (r.captured.length) {
    // 先画上新子，再演提子动画
    const snap = { grid: board.history[board.history.length - 1].grid };
    const tempBoard = { grid: [...snap.grid] }; tempBoard.grid[i] = color;
    view.sync({ grid: tempBoard.grid }, i);
    sndCapture();
    view.animateCapture(r.captured, tempBoard, () => {
      if (color === SNOW) qiqi('capture_cheer'); else qiqi('capture_by_ai');
      finish();
    });
  } else finish();
}

function aiTurn() {
  busy = true;
  $('#oppAvatar').classList.add('thinking');
  setTimeout(() => {
    $('#oppAvatar').classList.remove('thinking');
    busy = false;
    const mv = aiPickMove(board, BERRY, aiCfg);
    if (mv < 0) { endGame('draw'); return; }
    doMove(mv, BERRY);
  }, 900 + Math.random() * 700);
}

function afterMoveHints(justMoved) {
  if (mode !== 'ai') return;
  const now = Date.now();
  if (now - lastWarn < 15000) return;
  // 玩家被打吃 → 提醒；蓝莓被打吃 → 悄悄提示机会
  const check = (color) => {
    const seen = new Set();
    for (let i = 0; i < board.grid.length; i++) {
      if (board.grid[i] !== color || seen.has(i)) continue;
      const g = board.groupAt(i); g.forEach(s => seen.add(s));
      if (board.libertiesOf(g).length === 1) return g;
    }
    return null;
  };
  if (justMoved === BERRY) {
    const g = check(SNOW);
    if (g) { view.wobble(g); qiqi('atari_warn'); lastWarn = now; return; }
  }
  const gb = check(BERRY);
  if (gb && justMoved === BERRY) {
    const lib = board.libertiesOf(gb);
    view.twinkle(lib); qiqi('atari_chance'); lastWarn = now;
    setTimeout(() => view.twinkle([]), 6000);
  }
}

function checkEnd() {
  if (board.captured[BERRY] >= target) { endGame('win'); return true; }
  if (board.captured[SNOW] >= target) { endGame('lose'); return true; }
  const next = turn === SNOW ? BERRY : SNOW;
  if (!board.legalMoves(next).length && !board.legalMoves(turn).length) { endGame('draw'); return true; }
  return false;
}

function endGame(result) {
  const ov = $('#overlay');
  ov.classList.add('open');
  const face = { win: '🎉', lose: '🤗', draw: '🤝' }[result];
  const title = { win: '你赢啦！', lose: '朋友赢了这局', draw: '我们平手啦' }[result];
  $('#ovEmoji').textContent = face;
  $('#ovTitle').textContent = title;
  if (result === 'win') { sndWin(); qiqi('win'); confetti(); }
  else if (result === 'lose') { sndSoft(); qiqi('lose'); }
  else qiqi('draw');
}

function confetti() {
  const box = $('#confetti');
  box.innerHTML = '';
  const em = ['🫧', '⭐', '🌸', '✨', '🎈'];
  for (let k = 0; k < 26; k++) {
    const s = document.createElement('span');
    s.textContent = em[k % em.length];
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDelay = (Math.random() * 0.8) + 's';
    s.style.fontSize = (22 + Math.random() * 26) + 'px';
    box.appendChild(s);
  }
  setTimeout(() => box.innerHTML = '', 4200);
}

/* ---------- 教学模式（无关卡编号，自动衔接） ---------- */
function startTeach() {
  mode = 'teach'; teachStep = 0; teachData = {};
  board = new GoBoard(5);
  view = new BoardView($('#boardBox'), 5, onTeachTap);
  view.sync(board);
  show('#screenPlay');
  $('#panelPlay').style.display = 'none';
  $('#panelTeach').style.display = '';
  $('#overlay').classList.remove('open');
  $('#nextFriendBtn').style.display = 'none';
  view.twinkle([6, 12, 18]);
  qiqi('teach_home');
}

function onTeachTap(i) {
  if (busy) return;
  const S = board.size;
  if (teachStep === 0 || teachStep === 1) {
    if (board.grid[i] !== EMPTY) return;
    board.play(i, SNOW); view.sync(board, i); sndPlace();
    view.twinkle([]);
    const n = board.grid.filter(c => c === SNOW).length;
    if (teachStep === 0) { teachStep = 1; qiqi('teach_place_done'); }
    if (n >= 3) {
      teachStep = 2; busy = true;
      setTimeout(() => {
        board = new GoBoard(5); board.play(12, SNOW);
        view.sync(board); busy = false;
        view.twinkle([12]);
        qiqi('teach_qi_intro');
        teachData.count = 0; teachData.need = 4; teachData.stage = 'center';
      }, 2600);
    }
  } else if (teachStep === 2) {
    // 点棋子出气泡 → 逐个点破计数
    if (teachData.counting) {
      // 点气泡由 bubble handler 处理，这里忽略空点
      return;
    }
    const targetStone = teachData.stage === 'center' ? 12 : 0;
    if (i === targetStone) {
      view.twinkle([]);
      const libs = board.libertiesAt(targetStone);
      view.bubbles(libs, true);
      teachData.counting = true; teachData.count = 0;
      qiqi('teach_qi_tap');
      bindBubbleTaps();
    }
  } else if (teachStep === 3) {
    if (i === teachData.capPoint) {
      view.twinkle([]); view.clearBubbles();
      busy = true;
      board.play(i, SNOW); // 已自动提子；下面重放动画：先显示落子，再飞走
      view.sync(board, i);
      const flyBoard = { grid: [...board.grid] }; flyBoard.grid[teachData.berry] = BERRY;
      sndPlace();
      setTimeout(() => {
        sndCapture();
        view.animateCapture([teachData.berry], flyBoard, () => {
          qiqi('teach_capture_done');
          busy = false; teachStep = 4;
          setTimeout(finishTeach, 4200);
        });
      }, 500);
    } else { sndSoft(); }
  }
}

function bindBubbleTaps() {
  view.svg.querySelectorAll('.qibubble.tappable').forEach(b => {
    b.addEventListener('pointerup', e => {
      e.stopPropagation();
      if (b.classList.contains('burst')) return;
      teachData.count++;
      const c = teachData.count;
      view.burstBubble(+b.dataset.i, ['一', '二', '三', '四'][c - 1]);
      sndBubble(c);
      say('n' + c);
      if (c >= teachData.need) {
        setTimeout(() => {
          if (teachData.stage === 'center') {
            qiqi('teach_qi_four');
            setTimeout(() => {
              board = new GoBoard(5); board.play(0, SNOW);
              view.sync(board); view.twinkle([0]);
              teachData = { stage: 'corner', need: 2, count: 0, counting: false };
              qiqi('teach_qi_corner');
            }, 4200);
          } else {
            qiqi('teach_qi_two');
            setTimeout(setupCaptureLesson, 4600);
          }
        }, 900);
      }
    }, { once: false });
  });
}

function setupCaptureLesson() {
  teachStep = 3;
  board = new GoBoard(5);
  board.grid[0] = BERRY;   // 角上的小夜莓：气 = (1,0) 与 (0,1)
  board.grid[1] = SNOW;    // 已堵一口
  teachData = { berry: 0, capPoint: 5 };
  view.sync(board);
  view.twinkle([5]);
  view.bubbles([5], false);
  qiqi('teach_capture_intro');
}

function finishTeach() {
  qiqi('teach_finish');
  localStorage.setItem('goAdaTeachDone', '1');
  $('#nextFriendBtn').style.display = '';
}

function teachSkip() {
  if (teachStep <= 1) {
    board = new GoBoard(5); board.play(12, SNOW); view.sync(board);
    view.twinkle([12]); teachStep = 2;
    teachData = { count: 0, need: 4, stage: 'center', counting: false };
    qiqi('teach_qi_intro');
  } else if (teachStep === 2) {
    view.clearBubbles(); setupCaptureLesson();
  } else if (teachStep === 3) {
    teachStep = 4; finishTeach();
  } else {
    startPlay('cloud');
  }
}

/* ---------- 按钮 ---------- */
function bindUI() {
  $('#btnTeach').onclick = () => startTeach();
  $('#btnCloud').onclick = () => startPlay('cloud');
  $('#btnStar').onclick = () => startPlay('star');
  $('#btnPvp').onclick = () => startPlay('pvp');
  document.querySelectorAll('.homeBtn').forEach(b => b.onclick = () => { show('#screenHome'); qiqi(null, '想玩哪一个呀？'); });
  $('#btnUndo').onclick = () => {
    if (busy) return;
    const steps = (mode === 'ai' && turn === SNOW) ? 2 : 1;
    if (board.undo(steps)) {
      turn = mode === 'pvp' ? (steps === 1 ? (turn === SNOW ? BERRY : SNOW) : turn) : SNOW;
      view.clearGhost(); ghostAt = -1;
      view.sync(board); updateBaskets(); qiqi('undo');
    }
  };
  $('#btnAgain').onclick = () => {
    if (mode === 'pvp') startPlay('pvp');
    else startPlay(aiCfg === AI_FRIENDS.star ? 'star' : 'cloud');
  };
  $('#ovAgain').onclick = () => $('#btnAgain').onclick();
  $('#ovHome').onclick = () => { $('#overlay').classList.remove('open'); show('#screenHome'); };
  $('#btnSkip').onclick = () => teachSkip();
  $('#nextFriendBtn').onclick = () => startPlay('cloud');
}

window.addEventListener('DOMContentLoaded', () => {
  bindUI();
  show('#screenHome');
  let welcomed = false;
  document.body.addEventListener('pointerdown', () => {
    if (welcomed) return; welcomed = true;
    ac().resume && ac().resume();
  }, { once: true });
  qiqi(null, '嗨，Ada！我是棋棋~ 想玩哪一个呀？');
  // 测试用：?go=teach|cloud|star|pvp 直达
  const p = new URLSearchParams(location.search).get('go');
  if (p === 'teach') startTeach();
  else if (p) startPlay(p);
});
