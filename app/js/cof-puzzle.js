/**
 * cof-puzzle.js — 五度圈拼图（闯关解锁，纯逻辑，可测试）
 *
 * 把五度圈做成一个「逐格点亮」的拼图：从 C 大调出发，按顺时针 C→G→D→A→…
 * 每弹对一条该调的<b>完整音阶</b>就「解锁」这一格，点亮下一格。建立调号体系
 * 的肌肉记忆，也满足收集/解锁的成就感。进度持久化（localStorage）。
 *
 * 复用 circle-of-fifths.js 的 scaleMidi 计算每个调的音阶 MIDI 序列；判定默认
 * 按<b>音名（音高类）</b>，哪个八度都算对（初学者友好），可选精确。
 */

import { scaleMidi as cofScaleMidi } from './circle-of-fifths.js';

// 顺时针解锁顺序：先升号侧（每格 +1♯），再降号侧
export const PUZZLE_ORDER = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];

const pc = m => ((m % 12) + 12) % 12;

export class CofPuzzle {
  constructor(opts = {}) {
    this.order = opts.order || PUZZLE_ORDER;
    this.storageKey = opts.storageKey || 'ca99_cof_puzzle';
    this.matchExact = !!opts.matchExact;
    this.baseC = opts.baseC || 60;
    const seed = (opts.unlocked && opts.unlocked.length) ? opts.unlocked : [this.order[0]];
    this.unlocked = new Set(seed.filter(k => this.order.includes(k)));
    if (this.unlocked.size === 0) this.unlocked.add(this.order[0]);
    this.target = this.firstLocked();
    this._buildAttempt();
  }

  firstLocked() { return this.order.find(k => !this.unlocked.has(k)) || null; }
  isComplete() { return this.firstLocked() === null; }
  unlockedCount() { return this.order.filter(k => this.unlocked.has(k)).length; }
  isUnlocked(key) { return this.unlocked.has(key); }

  setTarget(key) {
    if (this.order.includes(key) && !this.unlocked.has(key)) { this.target = key; this._buildAttempt(); return true; }
    return false;
  }

  _buildAttempt() {
    this.expected = this.target ? cofScaleMidi(this.target, this.baseC) : [];
    this.idx = 0;
  }
  restart() { this._buildAttempt(); }

  /** 当前应弹的下一个 MIDI（绝对，baseC 起算），无目标返回 null */
  nextNote() { return (this.target && this.idx < this.expected.length) ? this.expected[this.idx] : null; }

  /**
   * 弹一个音。返回 {ok, wrong?, idx, expectedMidi?, complete?, unlockedKey?, nextTarget?}
   * 弹错不前进、不惩罚（caller 自行轻提示）。
   */
  play(midi) {
    if (!this.target || this.idx >= this.expected.length) return { ok: false, idx: this.idx };
    const exp = this.expected[this.idx];
    const same = this.matchExact ? (midi === exp) : (pc(midi) === pc(exp));
    if (!same) return { ok: false, wrong: true, idx: this.idx, expectedMidi: exp };
    this.idx += 1;
    const complete = this.idx >= this.expected.length;
    if (!complete) return { ok: true, idx: this.idx, complete: false };
    // 解锁这一格，推进到下一格
    this.unlocked.add(this.target);
    const unlockedKey = this.target;
    this.target = this.firstLocked();
    this._buildAttempt();
    return { ok: true, idx: this.expected.length, complete: true, unlockedKey, nextTarget: this.target };
  }

  save(storage) {
    if (storage) try { storage.setItem(this.storageKey, JSON.stringify([...this.unlocked])); } catch { /* ignore */ }
  }
  resetAll() { this.unlocked = new Set([this.order[0]]); this.target = this.firstLocked(); this._buildAttempt(); }

  static loadUnlocked(storage, key = 'ca99_cof_puzzle') {
    try { const s = storage && storage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
  }
}
