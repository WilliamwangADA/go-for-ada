/* 冒险地图 — 吃子→救子→围地→实战 的进阶主线（不露关卡编号，用地图+星星+称号表示进步） */
'use strict';

/* type: capture(把目标白棋全提掉) / captureAny(提掉任意一组) / save(目标黑棋活到≥2气) / area(黑地盘≥threshold) / game(实战赢AI) */
const ADV_LEVELS = [
  // 🏖️ 海滩·抱抱团子
  { id: 'b1', area: 0, icon: '🫧', name: '流汗的团子', size: 5, type: 'capture', budget: 1,
    black: [7, 11, 13], white: [12], targets: [[12]],
    goal: '小白只剩一口气啦，找到它，抱走！', voice: 'adv_capture' },
  { id: 'b2', area: 0, icon: '🏖️', name: '角落抱抱', size: 5, type: 'capture', budget: 1,
    black: [1], white: [0], targets: [[0]],
    goal: '角落里的小白没气啦，把它抱走！', voice: 'adv_capture' },
  { id: 'b3', area: 0, icon: '🐚', name: '两个一起抱', size: 5, type: 'capture', budget: 1,
    black: [6, 7, 10, 13, 16], white: [11, 12], targets: [[11, 12]],
    goal: '两个小白连成一团，一口气没了就一起抱走！', voice: 'adv_capture' },
  { id: 'b4', area: 0, icon: '🌊', name: '先打吃再抱', size: 5, type: 'capture', budget: 2,
    black: [7, 13, 16, 22], white: [12], targets: [[12]],
    goal: '它还有两口气：先堵一口(打吃)，再堵最后一口！', voice: 'adv_capture2' },
  { id: 'b5', area: 0, icon: '⛱️', name: '一子两吃', size: 5, type: 'captureAny', budget: 3,
    black: [2, 6, 16, 22], white: [7, 17], targets: [[7], [17]],
    goal: '有个神奇的点，一放下去两边小白都危险！', voice: 'adv_double' },
  // 🌲 森林·救救伙伴
  { id: 'f1', area: 1, icon: '🌱', name: '快逃呀', size: 5, type: 'save', budget: 1,
    black: [12], white: [7, 11, 13], targets: [12],
    goal: '你的团子只剩一口气！快带它逃出去！', voice: 'adv_save' },
  { id: 'f2', area: 1, icon: '🍄', name: '反过来抱走', size: 5, type: 'save', budget: 1,
    black: [8, 12, 14], white: [7, 11, 13], targets: [12],
    goal: '别怕！包围你的小白里，有一个也快没气了哦！', voice: 'adv_save' },
  { id: 'f3', area: 1, icon: '🌲', name: '手拉手', size: 5, type: 'save', budget: 1,
    black: [7, 17], white: [2, 6, 8, 16, 18, 22], targets: [7],
    goal: '两个团子都危险！有个点能让它们连成一团！', voice: 'adv_connect' },
  { id: 'f4', area: 1, icon: '🦉', name: '先救大的', size: 5, type: 'save', budget: 1,
    black: [11, 12, 4], white: [6, 7, 10, 16, 17, 3], targets: [11],
    goal: '两边都危险，只能救一边——先救大的那团！', voice: 'adv_choose' },
  // 🕳️ 山洞·围个家
  { id: 'c1', area: 2, icon: '🕯️', name: '堵好栅栏', size: 5, type: 'area', budget: 1, threshold: 15,
    black: [2, 7, 17, 22], white: [4, 9, 14, 19, 24],
    goal: '栅栏缺了一块！堵上它，左边就都是你的家！', voice: 'adv_area' },
  { id: 'c2', area: 2, icon: '💎', name: '堵住漏风口', size: 5, type: 'area', budget: 1, threshold: 8,
    black: [2, 7, 10], white: [13, 14, 18, 19, 23, 24],
    goal: '小角落还漏风呢，堵上它，角落就是你的家！', voice: 'adv_area' },
  // 🏔️ 雪山·真正对局
  { id: 's1', area: 3, icon: '☁️', name: '云朵之战', type: 'game', opp: 'cloud', size: 5,
    goal: '和小云朵真正下一盘，赢了就过！' },
  { id: 's2', area: 3, icon: '⭐', name: '星星之战', type: 'game', opp: 'star', size: 5,
    goal: '小星星更厉害哦，赢了它！' },
  { id: 's3', area: 3, icon: '⚪', name: '换白棋试试', type: 'game', opp: 'cloud', size: 5, pColor: 2,
    goal: '这次你用白棋，后走也能赢吗？' },
  { id: 's4', area: 3, icon: '🏔️', name: '大棋盘之战', type: 'game', opp: 'star', size: 7,
    goal: '7×7 大棋盘，赢下小星星！' },
  // 🏰 城堡·棋王挑战
  { id: 'k1', area: 4, icon: '👑', name: '月亮挑战', type: 'game', opp: 'moon', size: 7,
    goal: '最终挑战：赢下小月亮，加冕小棋王！' },
  // 🌋 火山·七路特训（大棋盘解题）
  { id: 'v1', area: 5, icon: '🌋', name: '大盘抱抱', size: 7, type: 'capture', budget: 1,
    black: [10, 11, 16, 19, 24], white: [17, 18], targets: [[17, 18]],
    goal: '大棋盘上也一样：整团没气了，就一起抱走！', voice: 'adv_capture' },
  { id: 'v2', area: 5, icon: '🔥', name: '追到墙边', size: 7, type: 'capture', budget: 3,
    black: [19, 25], white: [26], targets: [[26]],
    goal: '它会一直逃！追着它，把它赶到墙边抱住！', voice: 'adv_ladder' },
  { id: 'v3', area: 5, icon: '⚡', name: '大盘一子两吃', size: 7, type: 'captureAny', budget: 3,
    black: [10, 16, 30, 38], white: [17, 31], targets: [[17], [31]],
    goal: '还记得那个神奇的点吗？大棋盘上也有哦！', voice: 'adv_double' },
  { id: 'v4', area: 5, icon: '🏕️', name: '围大大的家', size: 7, type: 'area', budget: 1, threshold: 21,
    black: [2, 9, 23, 30, 37, 44], white: [4, 11, 18, 25, 32, 39, 46],
    goal: '长长的栅栏缺了一块！堵上它，一大片都是你的！', voice: 'adv_area' },
  // 🌈 彩虹桥·九路对局
  { id: 'r1', area: 6, icon: '🌈', name: '九路云朵战', type: 'game', opp: 'cloud', size: 9,
    goal: '最大的棋盘！和小云朵下一盘 9×9！' },
  { id: 'r2', area: 6, icon: '🎆', name: '九路星星战', type: 'game', opp: 'star', size: 9,
    goal: '九路大棋盘赢下小星星，你就是小棋圣！' },
];

const ADV_AREAS = [
  { icon: '🏖️', name: '海滩 · 抱抱团子' },
  { icon: '🌲', name: '森林 · 救救伙伴' },
  { icon: '🕳️', name: '山洞 · 围个家' },
  { icon: '🏔️', name: '雪山 · 真正对局' },
  { icon: '🏰', name: '城堡 · 棋王挑战' },
  { icon: '🌋', name: '火山 · 七路特训' },
  { icon: '🌈', name: '彩虹桥 · 九路对局' },
];
const ADV_BADGES = [
  { after: 5, name: '小棋童', voice: 'badge_1', icon: '🐣' },
  { after: 9, name: '小棋士', voice: 'badge_2', icon: '🎖️' },
  { after: 13, name: '小棋侠', voice: 'badge_3', icon: '🦸' },
  { after: 16, name: '小棋王', voice: 'badge_4', icon: '👑' },
  { after: 22, name: '小棋圣', voice: 'badge_5', icon: '🏆' },
];

let advPuzzle = null;   // 进行中的解题站
let advGame = null;     // 进行中的对局站
let advMoves = 0, advBusy = false;

function advCleared() {
  try { return JSON.parse(localStorage.getItem('goAdaAdv') || '[]'); }
  catch (e) { return []; }
}
function advMarkCleared(id) {
  const c = advCleared();
  if (!c.includes(id)) { c.push(id); localStorage.setItem('goAdaAdv', JSON.stringify(c)); }
}
function advBadgeLevel() {
  const n = advCleared().length;
  let b = null;
  for (const bd of ADV_BADGES) if (n >= bd.after) b = bd;
  return b;
}

/* ---------- 地图 ---------- */
let advAutoTimer = 0, advAutoNext = null;
function advNextStation() { return ADV_LEVELS.find(l => !advCleared().includes(l.id)) || null; }

function openMap(silent = false) {
  renderMap();
  $('#advMap').classList.add('open');
  if (!silent) say('map_welcome');
}
function renderMap() {
  const cleared = advCleared();
  const badge = advBadgeLevel();
  $('#advTitleBadge').textContent = badge ? `${badge.icon} ${badge.name}` : '🐣 出发！';
  $('#advStars').textContent = `⭐ × ${cleared.length}`;
  const box = $('#advAreas');
  box.innerHTML = '';
  let unlocked = true; // 线性解锁：上一站过了才亮下一站
  for (let a = 0; a < ADV_AREAS.length; a++) {
    const div = document.createElement('div');
    div.className = 'advArea';
    div.innerHTML = `<div class="advAreaName">${ADV_AREAS[a].icon} ${ADV_AREAS[a].name}</div><div class="advSt"></div>`;
    const row = div.querySelector('.advSt');
    for (const lv of ADV_LEVELS.filter(l => l.area === a)) {
      const done = cleared.includes(lv.id);
      const b = document.createElement('button');
      b.className = 'advBtn' + (done ? ' done' : unlocked ? ' next' : ' locked');
      b.innerHTML = `<span class="advIco">${done ? '⭐' : lv.icon}</span><span class="advNm">${lv.name}</span>`;
      if (done || unlocked) b.onclick = () => { $('#advMap').classList.remove('open'); startStation(lv); };
      if (!done && unlocked) unlocked = false;         // 只亮第一个未过的
      row.appendChild(b);
    }
    box.appendChild(div);
  }
}

/* ---------- 进入一站 ---------- */
function startStation(lv) {
  clearTimeout(advAutoTimer);
  advAutoNext = null;
  advReset();
  if (lv.type === 'game') { startAdvGame(lv); return; }
  advPuzzle = lv; advMoves = 0; advBusy = false;
  document.body.classList.add('puzzleMode');
  board = new GoBoard(lv.size);
  for (const i of lv.black) board.grid[i] = BLACK;
  for (const i of lv.white) board.grid[i] = WHITE;
  board.posSeen = new Set([board.key()]);
  blob = new BlobBoard($('#board'), lv.size);
  blob.setPosition(board.grid, performance.now());
  over = false; busy = false; turn = BLACK; playerColor = BLACK;
  $('#overlay').classList.remove('open');
  $('#missionText').textContent = lv.goal;
  say(lv.voice);
  if (!raf) loop();
}

function startAdvGame(lv) {
  advGame = lv;
  opponent = lv.opp; boardSize = lv.size;
  $('#selOpp').value = lv.opp; $('#selSize').value = String(lv.size);
  board = new GoBoard(boardSize);
  turn = BLACK; busy = false; over = false; passStreak = 0; atariWarned = false;
  playerColor = lv.pColor || BLACK;
  blob = new BlobBoard($('#board'), boardSize);
  blob.setPosition(board.grid, performance.now());
  $('#overlay').classList.remove('open');
  $('#missionText').textContent = lv.goal;
  document.body.classList.add('advGameMode');
  updateBar();
  if (!raf) loop();
  if (opponent === 'cloud') say('start_cloud');
  else if (opponent === 'star') say('start_star');
  else say('start_moon');
  if (isAiTurn()) scheduleAi();
}

function advReset() {
  advPuzzle = null; advGame = null; advBusy = false;
  document.body.classList.remove('puzzleMode', 'advGameMode');
}

/* ---------- 解题交互 ---------- */
function puzzleTap(i) {
  if (advBusy || !advPuzzle) return;
  const err = board.moveError(i, BLACK);
  if (err) { explainIllegal(i, err); return; }
  const r = board.play(i, BLACK);
  const now = performance.now();
  if (r.captured.length) blob.removeGroup(r.captured, now);
  blob.addStone(i, BLACK, now);
  sndPurun();
  if (r.captured.length) setTimeout(() => sndPop(r.captured.length), 260);
  advMoves++;
  advBusy = true;
  setTimeout(() => advEvaluate(), r.captured.length ? 900 : 450);
}

function advTargetGroups() {
  // 尚在棋盘上的目标白棋组
  const lv = advPuzzle, out = [];
  for (const cells of lv.targets) {
    const alive = cells.filter(c => board.grid[c] === WHITE);
    if (alive.length) out.push(board.groupAt(alive[0]));
  }
  return out;
}

function advEvaluate() {
  const lv = advPuzzle;
  if (!lv) return;
  let success = false;
  if (lv.type === 'capture') success = lv.targets.flat().every(c => board.grid[c] !== WHITE);
  else if (lv.type === 'captureAny') success = lv.targets.some(cells => cells.every(c => board.grid[c] !== WHITE));
  else if (lv.type === 'save') {
    const t = lv.targets[0];
    const g = board.grid[t] === BLACK ? board.groupAt(t) : [];
    success = g.length > 0 && board.libertiesOf(g).length >= 2;
  } else if (lv.type === 'area') success = board.areaScore()[BLACK] >= lv.threshold;

  if (success) { advWin(); return; }
  if (advMoves >= lv.budget) { advFail(); return; }
  // 多步题：走对路 = 至少有一组目标只剩一口气；否则算走偏
  const ataried = advTargetGroups().filter(g => board.libertiesOf(g).length === 1);
  if (!ataried.length) { advFail(); return; }
  // 白棋应一手：能真逃就逃，逃不了就认命跳过
  setTimeout(() => {
    let escaped = false;
    for (const g of advTargetGroups()) {
      const libs = board.libertiesOf(g);
      if (libs.length !== 1) continue;
      const sim = board.simulate(libs[0], WHITE);
      if (sim && board.libertiesOf(board.groupAt(libs[0], sim.grid), sim.grid).length >= 2) {
        board.play(libs[0], WHITE);
        blob.addStone(libs[0], WHITE, performance.now());
        sndPurun(); escaped = true;
        break;
      }
    }
    if (!escaped) showToast('小白没地方逃啦！');
    // 逃完后目标彻底安全(≥3气=追不上了) → 这题走岔了
    const stillCatchable = advTargetGroups().some(g => board.libertiesOf(g).length <= 2);
    const anyMode = lv.type === 'captureAny';
    const allSafe = advTargetGroups().every(g => board.libertiesOf(g).length >= 2);
    if ((anyMode && allSafe) || (!anyMode && !stillCatchable && !allTargetsGone(lv))) { advFail(); return; }
    advBusy = false;
  }, 800);
}
function allTargetsGone(lv) { return lv.targets.flat().every(c => board.grid[c] !== WHITE); }

function advWin() {
  advBusy = true;
  sndWinJing(); confetti();
  say(advCleared().length % 2 ? 'adv_success1' : 'adv_success2');
  advMarkCleared(advPuzzle.id);
  showToast('⭐ 挑战成功！');
  // 顺滑衔接：庆祝 → 地图上闪一下新星星 → 自动进下一站(升级则先发称号)
  advAutoTimer = setTimeout(() => {
    advReset();
    openMap(true);
    advAutoTimer = setTimeout(() => advGoNext(), 1600);
  }, 1900);
}

/* 前往下一站：有新称号先发称号，关掉后继续；全通关就留在地图 */
function advGoNext() {
  clearTimeout(advAutoTimer);
  const next = advNextStation();
  const badge = advBadgeLevel();
  const shown = localStorage.getItem('goAdaBadge') || '';
  if (badge && badge.name !== shown) {
    advAutoNext = next;
    advCheckBadge();
    return;
  }
  $('#advMap').classList.remove('open');
  if (next) startStation(next);
  else { openMap(true); showToast('全部通关！你太棒啦！'); }
}

function advFail() {
  advBusy = true;
  say('adv_fail');
  showToast('再试一次吧~');
  const lv = advPuzzle;
  setTimeout(() => startStation(lv), 1800);
}

/* 对局站结束时由 endGame 调用 */
function advOnGameEnd(result) {
  if (!advGame) return;
  $('#ovMap').style.display = '';
  if (result === 'win') {
    advMarkCleared(advGame.id);
    $('#ovNextStation').style.display = advNextStation() ? '' : 'none';
  } else {
    $('#ovNextStation').style.display = 'none';
  }
}

function advCheckBadge() {
  const badge = advBadgeLevel();
  const shown = localStorage.getItem('goAdaBadge') || '';
  if (badge && badge.name !== shown) {
    localStorage.setItem('goAdaBadge', badge.name);
    setTimeout(() => {
      $('#badgeIcon').textContent = badge.icon;
      $('#badgeName').textContent = badge.name;
      $('#badgeOv').classList.add('open');
      sndWinJing(); confetti();
      say(badge.voice);
    }, 600);
  }
}

/* ---------- 绑定 ---------- */
window.addEventListener('DOMContentLoaded', () => {
  $('#btnAdv').onclick = () => { clearTimeout(advAutoTimer); openMap(); };
  $('#advClose').onclick = () => { clearTimeout(advAutoTimer); $('#advMap').classList.remove('open'); };
  $('#missionHint').onclick = () => { if (advPuzzle) say(advPuzzle.voice); };
  $('#missionRetry').onclick = () => { if (advPuzzle && !advBusy) startStation(advPuzzle); };
  $('#missionMap').onclick = () => { clearTimeout(advAutoTimer); advReset(); newGame(); openMap(); };
  $('#ovNextStation').onclick = () => {
    $('#overlay').classList.remove('open');
    advGoNext();
  };
  $('#ovMap').onclick = () => {
    $('#overlay').classList.remove('open');
    clearTimeout(advAutoTimer);
    advReset(); newGame();
    openMap(true);
    advCheckBadge();
  };
  $('#badgeClose').onclick = () => {
    $('#badgeOv').classList.remove('open');
    const next = advAutoNext; advAutoNext = null;
    if (next) { $('#advMap').classList.remove('open'); startStation(next); }
  };
});
