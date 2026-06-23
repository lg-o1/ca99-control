/**
 * scale-trainer.js — 音阶练习引导（纯逻辑，可测试）
 *
 * 生成各调音阶的音符序列（大调/小调/五声等），并按玩家依次弹奏的音符
 * 检查进度——弹对下一个音就前进，弹错给提示。用于学琴音阶练习。
 *
 * 不碰 MIDI/DOM——音符由调用方喂入。
 */
import { NOTE_NAMES, pitchClass } from './chord-detect.js';

/** 音阶类型：相对根音的半音音程（一个八度内，不含结尾的八度音） */
export const SCALE_TYPES = {
  major:          { label: '大调', intervals: [0, 2, 4, 5, 7, 9, 11] },
  naturalMinor:   { label: '自然小调', intervals: [0, 2, 3, 5, 7, 8, 10] },
  harmonicMinor:  { label: '和声小调', intervals: [0, 2, 3, 5, 7, 8, 11] },
  melodicMinor:   { label: '旋律小调', intervals: [0, 2, 3, 5, 7, 9, 11] },
  majorPentatonic:{ label: '大调五声', intervals: [0, 2, 4, 7, 9] },
  minorPentatonic:{ label: '小调五声', intervals: [0, 3, 5, 7, 10] },
  blues:          { label: '布鲁斯', intervals: [0, 3, 5, 6, 7, 10] },
  chromatic:      { label: '半音阶', intervals: [0,1,2,3,4,5,6,7,8,9,10,11] },
};

/** 根音名 -> 音级 0-11 */
export function rootPitchClass(rootName) {
  const idx = NOTE_NAMES.indexOf(rootName);
  return idx < 0 ? 0 : idx;
}

/**
 * 生成音阶的 MIDI 音符序列（上行），含结尾八度音。
 * @param {string} rootName 根音名（如 'C'）
 * @param {string} type     SCALE_TYPES 键
 * @param {number} octave   起始八度（C4=60 -> octave 4）默认 4
 * @returns {number[]} MIDI 音符号序列
 */
export function buildScale(rootName, type, octave = 4) {
  const t = SCALE_TYPES[type];
  if (!t) return [];
  const base = (octave + 1) * 12 + rootPitchClass(rootName); // C4=60
  const notes = t.intervals.map(iv => base + iv);
  notes.push(base + 12); // 结尾八度音
  return notes;
}

/**
 * 生成上行+下行音阶（下行不重复顶点）。
 * @returns {number[]}
 */
export function buildScaleUpDown(rootName, type, octave = 4) {
  const up = buildScale(rootName, type, octave);
  // 下行：从顶点的下一个音降到根音上方第一个音（不重复顶点和根音）
  const down = up.slice().reverse().slice(1, -1);
  return [...up, ...down];
}

export class ScaleSession {
  /**
   * @param {number[]} sequence  期望依次弹奏的 MIDI 音符序列
   * @param {object} opts
   * @param {boolean} opts.octaveAgnostic  是否忽略八度（只比音级）默认 false
   */
  constructor(sequence = [], opts = {}) {
    this.sequence = sequence;
    this.octaveAgnostic = !!opts.octaveAgnostic;
    this._idx = 0;
    this.errors = 0;
    this.onAdvance = () => {}; // (index, note) => void
    this.onComplete = () => {};
    this.onError = () => {};   // (expected, got) => void
  }

  get index() { return this._idx; }
  get total() { return this.sequence.length; }
  get done() { return this._idx >= this.sequence.length; }
  get nextNote() { return this.done ? null : this.sequence[this._idx]; }
  get progress() { return this.total ? this._idx / this.total : 0; }

  _matches(expected, got) {
    return this.octaveAgnostic ? pitchClass(expected) === pitchClass(got) : expected === got;
  }

  /**
   * 喂入一个弹下的音符。匹配期望则前进，否则记一次错误。
   * @param {number} note
   * @returns {'advance'|'complete'|'wrong'} 结果
   */
  feed(note) {
    if (this.done) return 'complete';
    const expected = this.sequence[this._idx];
    if (this._matches(expected, note)) {
      this.onAdvance(this._idx, note);
      this._idx++;
      if (this.done) { this.onComplete(); return 'complete'; }
      return 'advance';
    }
    this.errors++;
    this.onError(expected, note);
    return 'wrong';
  }

  reset() { this._idx = 0; this.errors = 0; }
}
