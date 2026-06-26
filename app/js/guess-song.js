/**
 * guess-song.js — 🕵️ 猜歌视奏（把视奏变成侦探游戏，纯逻辑）
 *
 * 设计（把枯燥视奏变成"猜谜"）：
 *  - 屏幕只给五线谱（藏住曲名），孩子<b>照谱弹出</b>开头旋律（练真视奏）；
 *  - 弹完旋律会<b>回放一遍</b>（听到自己读出来的旋律 → "啊原来是这首！"）；
 *  - 然后从 4 个选项里<b>猜是哪首歌</b>，猜对揭晓 + 撒花。猜错只是"再想想"（不惩罚）。
 *  - 全部用<b>公有领域</b>的经典童谣/民谣，避免版权问题。
 */

const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function n(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  const v = NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}
const seq = (...names) => names.map(n);

/** 公有领域旋律（开头乐句） */
export const SONGS = [
  { id: 'twinkle', title: '小星星', emoji: '⭐', notes: seq('C4', 'C4', 'G4', 'G4', 'A4', 'A4', 'G4') },
  { id: 'mary',    title: '玛丽有只小羊羔', emoji: '🐑', notes: seq('E4', 'D4', 'C4', 'D4', 'E4', 'E4', 'E4') },
  { id: 'ode',     title: '欢乐颂', emoji: '🎉', notes: seq('E4', 'E4', 'F4', 'G4', 'G4', 'F4', 'E4', 'D4') },
  { id: 'tigers',  title: '两只老虎', emoji: '🐯', notes: seq('C4', 'D4', 'E4', 'C4', 'C4', 'D4', 'E4', 'C4') },
  { id: 'bridge',  title: '伦敦大桥', emoji: '🌉', notes: seq('G4', 'A4', 'G4', 'F4', 'E4', 'F4', 'G4') },
  { id: 'row',     title: '划船歌', emoji: '🚣', notes: seq('C4', 'C4', 'C4', 'D4', 'E4') },
  { id: 'jingle',  title: '铃儿响叮当', emoji: '🔔', notes: seq('E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'E4', 'G4', 'C4', 'D4', 'E4') },
  { id: 'baba',    title: '黑羊咩咩叫', emoji: '🐏', notes: seq('C4', 'C4', 'G4', 'G4', 'A4', 'B4', 'C5', 'A4', 'G4') },
];

export function getSong(id) { return SONGS.find((s) => s.id === id) || SONGS[0]; }

function shuffle(arr, rng) {
  const a = arr.slice();
  const rnd = rng || Math.random;
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** 生成 n 个选项（含正确答案），打乱顺序 */
export function quizOptions(correctId, count = 4, rng = null) {
  const correct = getSong(correctId);
  const others = shuffle(SONGS.filter((s) => s.id !== correctId), rng).slice(0, Math.max(0, count - 1));
  return shuffle([correct, ...others], rng);
}

const pc = (m) => ((m % 12) + 12) % 12;

/**
 * 猜歌视奏状态机。
 * phase: 'idle' → 'play'（照谱弹）→ 'guess'（选曲名）→ 'done'
 * opts: { octaveAgnostic=true, optionCount=4, rng=null }
 */
export class GuessSong {
  constructor({ octaveAgnostic = true, optionCount = 4, rng = null } = {}) {
    this.octaveAgnostic = octaveAgnostic !== false;
    this.optionCount = optionCount;
    this.rng = rng;
    this.score = 0;
    this.streak = 0;
    this.rounds = 0;
    this.phase = 'idle';
    this.song = null;
    this.options = [];
    this.idx = 0;
    this._guessWrong = false;
  }

  /** 开新一轮：随机选歌 + 选项，进入弹奏阶段 */
  next(forceId = null) {
    const pickFrom = forceId ? getSong(forceId) : shuffle(SONGS, this.rng)[0];
    this.song = pickFrom;
    this.options = quizOptions(this.song.id, this.optionCount, this.rng);
    this.idx = 0;
    this.phase = 'play';
    this._guessWrong = false;
    return this.song;
  }

  current() {
    if (this.phase !== 'play' || !this.song) return null;
    return this.idx < this.song.notes.length ? this.song.notes[this.idx] : null;
  }

  _match(midi) {
    const t = this.current();
    if (t == null) return false;
    return this.octaveAgnostic ? pc(midi) === pc(t) : midi === t;
  }

  /** 弹奏阶段：弹一个键。返回 {ok, advance|wrong|playDone, idx} */
  press(midi) {
    if (this.phase !== 'play') return { ok: false };
    if (this._match(midi)) {
      this.idx++;
      if (this.idx >= this.song.notes.length) {
        this.phase = 'guess';
        return { ok: true, playDone: true };
      }
      return { ok: true, advance: true, idx: this.idx };
    }
    this.idx = 0; // 弹错从头来（不惩罚）
    return { ok: false, wrong: true, idx: 0 };
  }

  /** 猜曲名。返回 {correct, title, score, streak} 或 {correct:false} */
  guess(id) {
    if (this.phase !== 'guess') return { correct: false, invalid: true };
    if (id === this.song.id) {
      this.rounds++;
      if (this._guessWrong) this.streak = 0; else { this.streak++; this.score += 10; }
      this.phase = 'done';
      return { correct: true, title: this.song.title, emoji: this.song.emoji, score: this.score, streak: this.streak };
    }
    this._guessWrong = true;
    return { correct: false };
  }
}
