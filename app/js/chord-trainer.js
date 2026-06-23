/**
 * chord-trainer.js — 和弦练习挑战逻辑（纯逻辑，可测试）
 *
 * 维护"当前按下的音符集合"，并支持挑战模式：随机出一个和弦名，
 * 玩家在键盘上弹出对应和弦即算过关，记录得分/连击。
 *
 * 不碰 MIDI/DOM——音符按下/松开由调用方喂入。
 */
import { detectChord, NOTE_NAMES } from './chord-detect.js';

/** 挑战题库：常见和弦（根音 + 后缀），由 makeChallenge 随机抽。 */
export const CHALLENGE_POOL = [
  { suffix: '', label: '大三和弦' },
  { suffix: 'm', label: '小三和弦' },
  { suffix: '7', label: '属七和弦' },
  { suffix: 'maj7', label: '大七和弦' },
  { suffix: 'm7', label: '小七和弦' },
];

export class HeldNotes {
  constructor() { this._set = new Set(); }
  on(note) { this._set.add(note); }
  off(note) { this._set.delete(note); }
  clear() { this._set.clear(); }
  get notes() { return [...this._set].sort((a, b) => a - b); }
  get size() { return this._set.size; }
}

export class ChordChallenge {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng  返回 0..1 的随机数（默认 Math.random），便于测试注入
   * @param {string[]} opts.roots    可出根音（默认 12 个）
   * @param {Array} opts.pool        题型池（默认 CHALLENGE_POOL）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.roots = opts.roots || NOTE_NAMES.slice();
    this.pool = opts.pool || CHALLENGE_POOL;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.current = null; // {root, suffix, symbol, label}
    this.onCorrect = () => {};
    this.onNew = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length) % arr.length]; }

  /** 生成下一题。返回题目对象。 */
  next() {
    const root = this._pick(this.roots);
    const t = this._pick(this.pool);
    this.current = { root, suffix: t.suffix, symbol: root + t.suffix, label: t.label };
    this.onNew(this.current);
    return this.current;
  }

  /**
   * 用当前按下的音符判断是否答对。答对则加分、连击+1、出下一题。
   * 与转位无关——只看和弦的根音+类型是否匹配题目。
   * @param {number[]} notes
   * @returns {boolean} 是否答对
   */
  check(notes) {
    if (!this.current) return false;
    const chord = detectChord(notes);
    if (!chord) return false;
    // 比较根音 + 后缀（忽略转位，detectChord 已给出根音）
    if (chord.root === this.current.root && chord.suffix === this.current.suffix) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
      this.onCorrect(this.current, { score: this.score, streak: this.streak, best: this.best });
      this.next();
      return true;
    }
    return false;
  }

  /** 答错重置连击（可选调用） */
  miss() { this.streak = 0; }

  reset() { this.score = 0; this.streak = 0; this.best = 0; this.current = null; }
}
