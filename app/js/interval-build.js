/**
 * interval-build.js — 音程构建（interval construction）纯逻辑引擎
 *
 * 给一个根音 + 一个目标音程（如「从 C4 往上弹一个纯五度」），
 * 你在钢琴上弹出正确的那个音。和「听音训练」（ear-training，听两个音
 * 辨认是什么音程）相反——这里是反过来的能力：知道音程名，能在键盘上
 * 立刻构建出来。这是即兴、移调、和声的核心手上功夫。
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验弹奏的 MIDI 音符，
 * 方便单元测试。播放根音参考交给 UI。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 常见音程：半音数 + 名称 + 简写 */
export const INTERVALS = [
  { id: 'm2', name: '小二度', short: 'm2', semitones: 1 },
  { id: 'M2', name: '大二度', short: 'M2', semitones: 2 },
  { id: 'm3', name: '小三度', short: 'm3', semitones: 3 },
  { id: 'M3', name: '大三度', short: 'M3', semitones: 4 },
  { id: 'P4', name: '纯四度', short: 'P4', semitones: 5 },
  { id: 'TT', name: '三全音', short: 'TT', semitones: 6 },
  { id: 'P5', name: '纯五度', short: 'P5', semitones: 7 },
  { id: 'm6', name: '小六度', short: 'm6', semitones: 8 },
  { id: 'M6', name: '大六度', short: 'M6', semitones: 9 },
  { id: 'm7', name: '小七度', short: 'm7', semitones: 10 },
  { id: 'M7', name: '大七度', short: 'M7', semitones: 11 },
  { id: 'P8', name: '纯八度', short: 'P8', semitones: 12 },
];

/** 半音数 -> 音程定义（找不到返回 null） */
export function intervalBySemitones(st) {
  return INTERVALS.find((i) => i.semitones === st) || null;
}

/** id -> 音程定义 */
export function intervalById(id) {
  return INTERVALS.find((i) => i.id === id) || null;
}

/** MIDI -> 音名（含八度，C4=60） */
export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/** 计算目标音 MIDI：根音 + 方向 * 半音 */
export function targetMidi(rootMidi, semitones, dir) {
  return rootMidi + (dir < 0 ? -semitones : semitones);
}

export const DIRECTIONS = [
  { id: 'up', name: '向上', sign: 1 },
  { id: 'down', name: '向下', sign: -1 },
];

export class IntervalBuildGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.intervals  允许的音程 id（默认全部）
   * @param {string[]} opts.directions 允许的方向（'up'/'down'，默认 ['up']）
   * @param {number} opts.rootMin      根音 MIDI 下限（默认 C3=48）
   * @param {number} opts.rootMax      根音 MIDI 上限（默认 C5=72）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const iids = opts.intervals && opts.intervals.length ? opts.intervals : INTERVALS.map((i) => i.id);
    this.intervals = INTERVALS.filter((i) => iids.includes(i.id));
    if (!this.intervals.length) this.intervals = INTERVALS.slice();
    const dids = opts.directions && opts.directions.length ? opts.directions : ['up'];
    this.directions = DIRECTIONS.filter((d) => dids.includes(d.id));
    if (!this.directions.length) this.directions = [DIRECTIONS[0]];
    this.rootMin = opts.rootMin ?? 48;
    this.rootMax = opts.rootMax ?? 72;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { root, interval, dir, target }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题，返回 { root, interval, dir, target } */
  next() {
    const interval = this._pick(this.intervals);
    const dir = this._pick(this.directions);
    // 收紧根音范围，保证目标音不越 0..127
    let lo = Math.max(this.rootMin, 0);
    let hi = Math.min(this.rootMax, 127);
    if (dir.sign > 0) hi = Math.min(hi, 127 - interval.semitones);
    else lo = Math.max(lo, interval.semitones);
    if (hi < lo) { lo = dir.sign > 0 ? 0 : interval.semitones; hi = dir.sign > 0 ? 127 - interval.semitones : 127; }
    const root = lo + Math.floor(this.rng() * (hi - lo + 1));
    const target = targetMidi(root, interval.semitones, dir.sign);
    this.current = { root, interval, dir, target };
    this.onNew(this.current);
    return { root, interval, dir, target };
  }

  /** 当前要播放的根音参考 MIDI */
  rootNote() { return this.current ? this.current.root : null; }

  /**
   * 校验弹奏的 MIDI 音符（须精确等于目标音）。
   * @param {number} playedMidi
   * @returns {boolean}
   */
  check(playedMidi) {
    if (!this.current) return false;
    this.attempts++;
    const correct = playedMidi === this.current.target;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      played: playedMidi, target: this.current.target,
      interval: this.current.interval, dir: this.current.dir,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
