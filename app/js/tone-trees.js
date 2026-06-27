/**
 * tone-trees.js — 🌲 和弦寻宝（Tone Trees，纯逻辑）
 *
 * 设计（把"认和弦的组成音"变成给树点亮果子的寻宝游戏）：
 *  - 给一个和弦名（如 C、Am、G7），孩子要在琴上<b>把它的每个组成音都弹一遍</b>；
 *  - 每弹对一个组成音，树上就点亮一颗"果子"🍎；集齐全部组成音 → 整棵树发光通关 🌳✨。
 *  - 八度无关：弹任意八度的 C 都算点亮"C 果子"。弹到不属于这个和弦的音 → 温和提示、不扣分。
 *
 * 复用 chord-detect 的 NOTE_NAMES / CHORD_TEMPLATES / pitchClass。纯逻辑：不碰 MIDI/DOM。
 */

import { NOTE_NAMES, CHORD_TEMPLATES, pitchClass } from './chord-detect.js';

const TPL_BY_SUFFIX = new Map(CHORD_TEMPLATES.map((t) => [t.suffix, t]));

/** 取某后缀的音程模板（找不到回退大三和弦） */
export function templateFor(suffix) {
  return TPL_BY_SUFFIX.get(suffix) || CHORD_TEMPLATES[0];
}

/** 音名 → 音级 0..11（找不到返回 -1） */
export function nameToPc(name) {
  return NOTE_NAMES.indexOf(name);
}

/**
 * 给定根音名 + 后缀 → 组成音的音级数组（按和弦内顺序，根音在前）。
 * @param {string} rootName 例 'C'
 * @param {string} suffix 例 '', 'm', '7'
 * @returns {number[]} 音级 0..11
 */
export function chordPitchClasses(rootName, suffix) {
  const root = nameToPc(rootName);
  if (root < 0) return [];
  const tpl = templateFor(suffix);
  return tpl.intervals.map((iv) => (root + iv) % 12);
}

/** 组成音的音名数组（去八度） */
export function chordNoteNames(rootName, suffix) {
  return chordPitchClasses(rootName, suffix).map((pc) => NOTE_NAMES[pc]);
}

/**
 * 和弦寻宝题库：常用三和弦 + 七和弦，按难度分级。
 *  level 1：白键大/小三和弦（最易找）
 *  level 2：含黑键三和弦 + sus
 *  level 3：七和弦（4 音）
 */
export const TREE_CHORDS = [
  // —— level 1：白键三和弦 ——
  { root: 'C', suffix: '',    level: 1 },
  { root: 'F', suffix: '',    level: 1 },
  { root: 'G', suffix: '',    level: 1 },
  { root: 'A', suffix: 'm',   level: 1 },
  { root: 'D', suffix: 'm',   level: 1 },
  { root: 'E', suffix: 'm',   level: 1 },
  // —— level 2：含黑键 / sus ——
  { root: 'D', suffix: '',    level: 2 },
  { root: 'E', suffix: '',    level: 2 },
  { root: 'A', suffix: '',    level: 2 },
  { root: 'B', suffix: 'm',   level: 2 },
  { root: 'C', suffix: 'sus4', level: 2 },
  { root: 'G', suffix: 'sus4', level: 2 },
  { root: 'D', suffix: 'sus2', level: 2 },
  // —— level 3：七和弦 ——
  { root: 'G', suffix: '7',   level: 3 },
  { root: 'C', suffix: 'maj7', level: 3 },
  { root: 'D', suffix: '7',   level: 3 },
  { root: 'A', suffix: 'm7',  level: 3 },
  { root: 'E', suffix: 'm7',  level: 3 },
  { root: 'D', suffix: 'm7',  level: 3 },
];

/** 给和弦定义补全：symbol / 组成音 pcs / 音名 / 果子数 */
export function describeChord(def) {
  const symbol = def.root + def.suffix;
  const pcs = chordPitchClasses(def.root, def.suffix);
  return {
    ...def,
    symbol,
    pcs,
    names: pcs.map((pc) => NOTE_NAMES[pc]),
    size: pcs.length,
  };
}

/** 按级别取题库（level 累进：传 2 含 1+2） */
export function chordsUpToLevel(level) {
  return TREE_CHORDS.filter((c) => c.level <= level);
}

/**
 * 选一个寻宝和弦。
 * @param {object} opts
 * @param {number} [opts.level] 最高难度（1..3，默认 1）
 * @param {string} [opts.avoidSymbol] 避免连出同一个
 * @param {Function} [opts.rng]
 */
export function pickChord({ level = 1, avoidSymbol = null, rng = Math.random } = {}) {
  let pool = chordsUpToLevel(level).map(describeChord);
  if (avoidSymbol && pool.length > 1) {
    const filtered = pool.filter((c) => c.symbol !== avoidSymbol);
    if (filtered.length) pool = filtered;
  }
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * 一局寻宝：持有目标和弦，记录已点亮的组成音（音级）。
 */
export class ToneTreeGame {
  /** @param {object} chord describeChord 的结果 */
  constructor(chord) {
    this.chord = chord;
    this.targetPcs = new Set(chord.pcs);
    this.found = new Set();   // 已点亮的音级
    this.strayCount = 0;      // 弹到非组成音的次数（仅统计，不惩罚）
  }

  /** 还没点亮的组成音（音级，按和弦顺序） */
  remaining() {
    return this.chord.pcs.filter((pc) => !this.found.has(pc));
  }

  isFound(pc) { return this.found.has(pc); }
  isComplete() { return this.found.size >= this.targetPcs.size; }
  progress() { return { found: this.found.size, total: this.targetPcs.size }; }

  /**
   * 弹一个 MIDI 音。
   * @returns {{pc:number, inChord:boolean, isNew:boolean, complete:boolean}}
   */
  press(midi) {
    const pc = pitchClass(midi);
    const inChord = this.targetPcs.has(pc);
    let isNew = false;
    if (inChord && !this.found.has(pc)) {
      this.found.add(pc);
      isNew = true;
    } else if (!inChord) {
      this.strayCount += 1;
    }
    return { pc, inChord, isNew, complete: this.isComplete() };
  }

  reset() {
    this.found = new Set();
    this.strayCount = 0;
  }
}

const exported = {
  templateFor, nameToPc, chordPitchClasses, chordNoteNames,
  TREE_CHORDS, describeChord, chordsUpToLevel, pickChord, ToneTreeGame,
};
export default exported;
