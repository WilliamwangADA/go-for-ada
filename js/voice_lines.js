/* 棋棋的台词（gen_voice.py 会读这个文件批量生成 audio/*.mp3） */
'use strict';

const VOICE_LINES = {
  "hello": "嗨，Ada！欢迎来到围棋小岛~你想用黑棋小团子，还是白棋小团子呀？点一个吧！",
  "pick_color": "你想用黑棋小团子，还是白棋小团子呀？",
  "start_cloud": "小云朵最喜欢和你下棋啦，黑棋先走哦~",
  "start_star": "小星星有一点点厉害哦，深呼吸，你先来~",
  "start_pvp": "一起玩喽！黑棋先走，你一手我一手，轮流来哦~",
  "howto1": "黑棋和白棋轮流放棋子。想休息的话，可以点跳过哦。",
  "howto2": "要是棋子被对方团团围住，一口气都没有了，就会噗地一下，消失不见啦。",
  "howto3": "棋盘不可以变回和以前一模一样的样子哦。",
  "howto4": "棋子加上自己圈好的空地，就是地盘。两边都跳过、或者地盘都分清楚了，游戏就结束，地盘大的一边赢！",
  "howto_face": "偷偷告诉你：小团子的表情会说话哦。笑眯眯，就是很安全；皱眉头，是有点担心；瞪大眼睛流汗汗，就是快要被围住啦，快去救救它！",
  "win": "哇！你赢啦！你的地盘更大！大家都为你鼓掌，啪啪啪！",
  "lose": "这局是朋友的地盘大一点点~没关系，我们再来一次，这次一定行！",
  "draw": "两边一样多，我们平手啦！握握手，再来一局~",
  "count": "两边都休息啦，我们来数一数，谁的地盘大~",
  "settle": "地盘都分清楚啦！我们来数一数~",
  "pass_you": "好嘞，休息一手~",
  "pass_ai": "对方也想休息啦~",
  "atari_warn": "呀，快看那个流汗的小团子！它只剩一口气了，要不要去救救它？",
  "capture_cheer": "噗！围住带走啦！Ada 好厉害！",
  "capture_by_ai": "呀，你的小团子被围住带走了~没关系，我们再想想办法。",
  "undo": "好，我们轻轻拿回来，再想一想。",
  "ai_resign_cloud": "小云朵举起小手说：Ada 太厉害啦，你的地盘比我大好多，我认输！你真是了不起的小棋士，大家使劲鼓掌，啪啪啪！",
  "ai_resign_star": "小星星眨眨眼说：Ada 太厉害啦，你的地盘比我大好多，我认输！你真是了不起的小棋士，大家使劲鼓掌，啪啪啪！",
  "cant_occupied": "这里已经住着小团子啦，找一个空空的交叉点吧~",
  "cant_suicide": "这里不能放哦。放下去的话，一口气都没有，小团子马上就会不见的！",
  "cant_ko": "这里现在不能放哦，不然棋盘就变回和刚才一模一样的样子啦，先下别的地方吧~",
};

/* 语音播放：mp3 优先，SpeechSynthesis 兜底 */
const _voiceCache = {};
let _curAudio = null;

function say(id) {
  const text = VOICE_LINES[id];
  if (!text) return;
  if (_curAudio) { _curAudio.pause(); _curAudio = null; }
  window.speechSynthesis && speechSynthesis.cancel();
  const a = _voiceCache[id] || (_voiceCache[id] = new Audio(`audio/${id}.mp3`));
  a.currentTime = 0;
  _curAudio = a;
  a.play().catch(() => {
    if (!window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.replace(/[！!。~]/g, '，'));
    u.lang = 'zh-CN'; u.rate = 0.85; u.pitch = 1.1;
    speechSynthesis.speak(u);
  });
}
