/**
 * ear-training.js — 音程听辨（ear training）纯逻辑引擎
 *
 * 听两个音（或同时响的和声音程），辨认它们之间的音程。
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目（根音 + 音程）并校验答案，
 * 方便单元测试。播放交给 UI（Web Audio 或发 MIDI 给钢琴）。
 */

/** 12 个常见音程（半音数 -> 名称） */
export const INTERVALS = [
  { semis: 0,  name: '纯一度', short: 'P1' },
  { semis: 1,  name: '小二度', short: 'm2' },
  { semis: 2,  name: '大二度', short: 'M2' },
  { semis: 3,  name: '小三度', short: 'm3' },
  { semis: 4,  name: '大三度', short: 'M3' },
  { semis: 5,  name: '纯四度', short: 'P4' },
  { semis: 6,  name: '三全音', short: 'TT' },
  { semis: 7,  name: '纯五度', short: 'P5' },
  { semis: 8,  name: '小六度', short: 'm6' },
  { semis: 9,  name: '大六度', short: 'M6' },
  { semis: 10, name: '小七度', short: 'm7' },
  { semis: 11, name: '大七度', short: 'M7' },
  { semis: 12, name: '纯八度', short: 'P8' },
];

const BY_SEMIS = new Map(INTERVALS.map((i) => [i.semis, i]));

/** 半音数 -> 音程对象（找不到返回 null） */
export function intervalBySemis(semis) {
  return BY_SEMIS.get(semis) || null;
}

/** 半音数 -> 中文名（找不到返回 `${semis}半音`） */
export function intervalName(semis) {
  const i = BY_SEMIS.get(semis);
  return i ? i.name : `${semis}半音`;
}

/** 默认初学音程集合：纯五、大三、小三、纯四、纯八、大二 */
export const DEFAULT_INTERVALS = [2, 3, 4, 5, 7, 12];

/**
 * 给定根音、音程、方向，返回要播放的 MIDI 音符数组。
 * up: [root, root+semis]；down: [root, root-semis]；harmonic: 同时 [root, root+semis]
 */
export function notesFor(root, semis, direction = 'up') {
  if (direction === 'down') return [root, root - semis];
  return [root, root + semis]; // up & harmonic 都是向上叠
}

export class EarTrainingGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {number[]} opts.intervals  允许出现的音程（半音数集合）
   * @param {string} opts.direction    'up' | 'down' | 'harmonic' | 'mixed'
   * @param {number} opts.rootMin      根音 MIDI 下限（默认 C3=48）
   * @param {number} opts.rootMax      根音 MIDI 上限（默认 C5=72）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.intervals = (opts.intervals && opts.intervals.length ? opts.intervals : DEFAULT_INTERVALS).slice();
    this.direction = opts.direction || 'up';
    this.rootMin = opts.rootMin ?? 48;
    this.rootMax = opts.rootMax ?? 72;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { root, semis, direction }
    this.onNew = () => {};
    this.onResult = () => {}; // (correct, {answer, semis, score, streak}) => void
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  _resolveDir() {
    if (this.direction !== 'mixed') return this.direction;
    return this._pick(['up', 'down', 'harmonic']);
  }

  /** 出下一题，返回要播放的音符序列 */
  next() {
    const semis = this._pick(this.intervals);
    const dir = this._resolveDir();
    // 保证根音 ± 音程后仍在合法 MIDI 范围（0..127）：
    // 先按用户范围收紧，若收紧后无解则退回到"硬性合法范围"（保证而非用户偏好）。
    const hardLo = dir === 'down' ? semis : 0;
    const hardHi = dir === 'down' ? 127 : 127 - semis;
    let lo = Math.max(this.rootMin, hardLo);
    let hi = Math.min(this.rootMax, hardHi);
    if (hi < lo) { lo = hardLo; hi = hardHi; }
    const root = lo + Math.floor(this.rng() * (hi - lo + 1));
    this.current = { root, semis, direction: dir };
    this.onNew(this.current);
    return this.notes();
  }

  /** 当前题目要播放的 MIDI 音符 */
  notes() {
    if (!this.current) return [];
    return notesFor(this.current.root, this.current.semis, this.current.direction);
  }

  /** 当前是否同时发声（和声音程） */
  isHarmonic() { return !!this.current && this.current.direction === 'harmonic'; }

  /**
   * 校验答案（半音数）。
   * @param {number} answerSemis 用户选择的音程半音数
   * @returns {boolean}
   */
  check(answerSemis) {
    if (!this.current) return false;
    this.attempts++;
    const correct = answerSemis === this.current.semis;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
      this.onResult(true, { answer: answerSemis, semis: this.current.semis, score: this.score, streak: this.streak });
    } else {
      this.streak = 0;
      this.onResult(false, { answer: answerSemis, semis: this.current.semis, score: this.score, streak: this.streak });
    }
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
