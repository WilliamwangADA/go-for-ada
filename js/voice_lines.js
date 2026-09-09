/* 棋棋的台词（gen_voice.py 会读这个文件批量生成 audio/*.mp3） */
'use strict';

const VOICE_LINES = {
  "welcome": "嗨，Ada！欢迎来到围棋小岛，我是棋子精灵棋棋！想先和我玩一玩，还是去找小云朵下棋呀？",
  "teach_home": "看，这个木头格子是棋盘，是棋子精灵们的家。线线交叉的地方就是它们的小床。来，点一个亮闪闪的地方，请一颗雪球精灵住进去吧！",
  "teach_place_done": "啵！雪球精灵住下啦，它笑得好开心。再请几颗精灵住进来试试吧！",
  "teach_qi_intro": "偷偷告诉你哦，住下的精灵会呼吸，它身边冒出的小泡泡，就叫做气。点一点中间的小雪球，看看它的气泡泡！",
  "teach_qi_tap": "把气泡泡一个一个点破，我们一起数数看！",
  "teach_qi_four": "哇，一二三四！住在中间的精灵，有四个气泡泡，呼吸得可舒服啦。",
  "teach_qi_corner": "咦，这颗住在角落里的小雪球呢？点点它，再数数看！",
  "teach_qi_two": "原来住在角落，只有两个气泡泡呀。泡泡越少，精灵就越危险哦。",
  "teach_capture_intro": "小夜莓的气泡泡快没有啦！只要把最后一个气泡也填上，它就要回家睡觉咯。点一点那个亮闪闪的地方！",
  "teach_capture_done": "泡！小夜莓一个气泡都没有啦，我们轻轻把它送回家休息。这个呀，就叫提子！Ada 你太棒啦！",
  "teach_finish": "太好啦，围棋最重要的秘密你都知道啦！走，我带你去找小云朵玩，它可温柔啦！",
  "play_start_cloud": "小云朵最喜欢和你玩啦！谁先把对方的一颗精灵送回家休息，谁就赢咯。你的雪球队先走！",
  "play_start_star": "小星星有一点点厉害哦！谁先送三颗精灵回家，谁就赢啦。深呼吸，加油！",
  "pvp_start": "一起玩喽！雪球队先走，你一颗我一颗，轮流请精灵住进来哦。",
  "your_turn": "该你啦。",
  "confirm_hint": "想好了，就再点一下它，精灵就住下啦。",
  "atari_warn": "小心呀，你有一颗精灵只剩最后一个气泡了，要不要去救救它？",
  "atari_chance": "嘘，我发现有一颗蓝莓精灵，只剩一个气泡了哦，你找找看！",
  "capture_cheer": "泡泡泡，抱走啦！Ada 好厉害！",
  "capture_by_ai": "呀，你的精灵被送回家休息了，没关系，我们再想想办法！",
  "win": "哇！你赢啦！大家都为你鼓掌，啪啪啪！要不要再来一局呀？",
  "lose": "这一局是朋友赢了。没关系的，输了也很好玩呀！我们再来一次，这次一定行！",
  "draw": "棋盘都住满啦，我们握握手，算打成平手！再来一局吗？",
  "undo": "好嘞，我们轻轻拿回来，再想一想。",
  "n1": "一。",
  "n2": "二。",
  "n3": "三。",
  "n4": "四。",
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
