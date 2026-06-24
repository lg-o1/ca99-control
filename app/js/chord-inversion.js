/**
 * chord-inversion.js — 和弦转位听辨（chord inversion ear-training）纯逻辑引擎
 *
 * 听一个三和弦，辨认它是【原位】【第一转位】还是【第二转位】。
 * 和"和弦练习"（弹出某个和弦名，忽略转位）不同——这里专练耳朵分辨
 * 同一个和弦的不同排列（低音是根音 / 三音 / 五音）。
 *
 * 听辨的关键：低音往上叠的音程结构不同——
 *   原位：两个三度叠起来（低音到上面都是三度）
 *   第一转位：上方出现纯四度（低音是三音）
 *   第二转位：低音处就是纯四度（低音是五音）
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案，
 * 方便单元测试。播放交给 UI（Web Audio 或发 MIDI 给钢琴）。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 和弦类型：根音=0 的音程结构（只用三和弦，转位清晰好听辨） */
export const QUALITIES = [
  { id: 'maj', name: '大三和弦', intervals: [0, 4, 7] },
  { id: 'min', name: '小三和弦', intervals: [0, 3, 7] },
];

/** 三种转位：bass 表示低音是和弦的第几个音（0=根音,1=三音,2=五音） */
export const INVERSIONS = [
  { id: 0, name: '原位', short: '原', desc: '低音是根音，两个三度叠起来' },
  { id: 1, name: '第一转位', short: '①', desc: '低音是三音，上方有纯四度' },
  { id: 2, name: '第二转位', short: '②', desc: '低音是五音，底部就是纯四度' },
];

/**
 * 构造某根音、某类型、某转位的三和弦 MIDI 音符（升序）。
 * 把最低的 inv 个音各升一个八度，得到对应转位的紧凑排列。
 * @param {number} rootMidi  根音 MIDI（如 60=C4）
 * @param {number[]} intervals  和弦音程结构（如 [0,4,7]）
 * @param {number} inv  转位（0/1/2）
 */
export function buildInversion(rootMidi, intervals, inv) {
  const base = intervals.map((iv) => rootMidi + iv);
  const n = base.length;
  const k = ((inv % n) + n) % n;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(i < k ? base[i] + 12 : base[i]);
  }
  return out.slice().sort((a, b) => a - b);
}

/** 相邻音程（半音） */
export function stackIntervals(notes) {
  const out = [];
  for (let i = 1; i < notes.length; i++) out.push(notes[i] - notes[i - 1]);
  return out;
}

/** 转位 id -> 名称（找不到返回 '?'） */
export function inversionName(inv) {
  const o = INVERSIONS.find((x) => x.id === inv);
  return o ? o.name : '?';
}

export class ChordInversionGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.qualities   允许的和弦类型 id（默认全部）
   * @param {number[]} opts.inversions  允许的转位（默认 [0,1,2]）
   * @param {number} opts.rootMin       根音 MIDI 下限（默认 C3=48）
   * @param {number} opts.rootMax       根音 MIDI 上限（默认 C5=72）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const qids = opts.qualities && opts.qualities.length ? opts.qualities : QUALITIES.map((q) => q.id);
    this.qualities = QUALITIES.filter((q) => qids.includes(q.id));
    if (!this.qualities.length) this.qualities = QUALITIES.slice();
    this.inversions = opts.inversions && opts.inversions.length ? opts.inversions.slice() : [0, 1, 2];
    this.rootMin = opts.rootMin ?? 48;
    this.rootMax = opts.rootMax ?? 72;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { root, quality, inv, notes }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题，返回要播放的 MIDI 音符（升序） */
  next() {
    const quality = this._pick(this.qualities);
    const inv = this._pick(this.inversions);
    // 根音范围收紧，保证最高音（可能 +16）不越 127；越界则退到硬性范围
    const hardHi = 127 - 16;
    let lo = Math.max(this.rootMin, 0);
    let hi = Math.min(this.rootMax, hardHi);
    if (hi < lo) { lo = 0; hi = hardHi; }
    const root = lo + Math.floor(this.rng() * (hi - lo + 1));
    const notes = buildInversion(root, quality.intervals, inv);
    this.current = { root, quality, inv, notes };
    this.onNew(this.current);
    return notes.slice();
  }

  /** 当前题目要播放的 MIDI 音符 */
  notes() { return this.current ? this.current.notes.slice() : []; }

  /**
   * 校验答案（转位 id 0/1/2）。
   * @param {number} answerInv
   * @returns {boolean}
   */
  check(answerInv) {
    if (!this.current) return false;
    this.attempts++;
    const correct = answerInv === this.current.inv;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      answer: answerInv, inv: this.current.inv,
      quality: this.current.quality, score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
