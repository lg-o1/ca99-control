/**
 * sight-reading.js — 视奏闪卡逻辑（纯逻辑，可测试）
 *
 * 把 MIDI 音符映射到五线谱位置（高音谱号/低音谱号），随机出题让玩家看谱弹音，
 * 弹对加分。针对"不会读谱"的练习。
 *
 * 五线谱位置用"自然音级步数"（diatonic step）表示——只数音名 C D E F G A B，
 * 不含升降号，这正是五线谱线/间的排布方式。
 */
import { NOTE_NAMES, pitchClass } from './chord-detect.js';

/** 音名 -> 自然音级序号（C=0, D=1, ... B=6）；升号音归到其下方自然音 */
const LETTER_OF_PC = { 0: 0, 1: 0, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 7: 4, 8: 4, 9: 5, 10: 5, 11: 6 };
/** 该音级是否带升号（黑键） */
const IS_SHARP = { 1: true, 3: true, 6: true, 8: true, 10: true };

/** MIDI 音符 -> 自然音级绝对步数（C0=0, D0=1, ..., 每八度 +7） */
export function diatonicStep(note) {
  const octave = Math.floor(note / 12); // MIDI: C-1=0 -> octave index
  const letter = LETTER_OF_PC[pitchClass(note)];
  return octave * 7 + letter;
}

/** MIDI 音符是否黑键（带升号） */
export function isSharp(note) { return !!IS_SHARP[pitchClass(note)]; }

/** MIDI 音符 -> 名称（含八度，C4=60） */
export function noteLabel(note) {
  return NOTE_NAMES[pitchClass(note)] + (Math.floor(note / 12) - 1);
}

/** 谱号定义：refNote=谱号底线音符（用于计算相对位置），name 标签 */
export const CLEFS = {
  treble: { label: '高音谱号', bottomLineNote: 64 }, // E4 是高音谱号最底线
  bass:   { label: '低音谱号', bottomLineNote: 43 }, // G2 是低音谱号最底线
};

/**
 * 计算音符在谱表上的"位置步数"：相对谱号底线的自然音级步数。
 * 0 = 底线，1 = 底线上方第一间，2 = 第二线 …… 负数 = 底线下方。
 * @param {number} note MIDI 音符
 * @param {string} clef 'treble' | 'bass'
 * @returns {number}
 */
export function staffPosition(note, clef = 'treble') {
  const c = CLEFS[clef];
  return diatonicStep(note) - diatonicStep(c.bottomLineNote);
}

/**
 * 该位置是否需要加线（超出五线谱 5 条线，即 position <0 或 >8）。
 * 五线谱 5 线 4 间：position 0..8（0=底线, 8=顶线）。
 */
export function needsLedger(position) {
  return position < 0 || position > 8;
}

/**
 * 生成某谱号下一个"自然音"（白键）的随机 MIDI 音符，落在常见识谱范围内。
 * 默认范围：谱号底线下加一线 到 顶线上加一线（约 position -2..10）。
 * @param {object} opts
 * @param {string} opts.clef
 * @param {() => number} opts.rng
 * @param {number} opts.minPos  最低位置（默认 -2）
 * @param {number} opts.maxPos  最高位置（默认 10）
 * @returns {number} MIDI 音符（白键）
 */
export function randomNote(opts = {}) {
  const clef = opts.clef || 'treble';
  const rng = opts.rng || Math.random;
  const minPos = opts.minPos ?? -2;
  const maxPos = opts.maxPos ?? 10;
  const c = CLEFS[clef];
  const baseStep = diatonicStep(c.bottomLineNote);
  const pos = minPos + Math.floor(rng() * (maxPos - minPos + 1));
  const targetStep = baseStep + pos;
  return stepToWhiteNote(targetStep);
}

/** 自然音级绝对步数 -> 该白键的 MIDI 音符 */
export function stepToWhiteNote(step) {
  const octave = Math.floor(step / 7);
  const letter = ((step % 7) + 7) % 7;
  const semis = [0, 2, 4, 5, 7, 9, 11][letter]; // C D E F G A B 的半音偏移
  return octave * 12 + semis;
}

export class SightReadingGame {
  /**
   * @param {object} opts
   * @param {string} opts.clef
   * @param {() => number} opts.rng
   * @param {boolean} opts.octaveAgnostic 是否忽略八度（只比音名）默认 true（适合初学）
   */
  constructor(opts = {}) {
    this.clef = opts.clef || 'treble';
    this.rng = opts.rng || Math.random;
    this.octaveAgnostic = opts.octaveAgnostic !== false;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // MIDI 音符
    this.onNew = () => {};
    this.onResult = () => {}; // (correct, {note, score, streak}) => void
  }

  /** 出下一题 */
  next() {
    this.current = randomNote({ clef: this.clef, rng: this.rng });
    this.onNew(this.current);
    return this.current;
  }

  /**
   * 判断弹下的音是否答对当前题目。
   * @param {number} note
   * @returns {boolean}
   */
  check(note) {
    if (this.current == null) return false;
    this.attempts++;
    const correct = this.octaveAgnostic
      ? pitchClass(note) === pitchClass(this.current)
      : note === this.current;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
      this.onResult(true, { note, score: this.score, streak: this.streak });
      this.next();
    } else {
      this.streak = 0;
      this.onResult(false, { note, score: this.score, streak: this.streak });
    }
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
