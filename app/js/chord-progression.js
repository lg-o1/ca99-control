/**
 * chord-progression.js — 和弦进行练习（chord progression）纯逻辑引擎
 *
 * 给定调（如 C 大调），把著名和弦进行（I–V–vi–IV、ii–V–I、12 小节布鲁斯…）的
 * 罗马数字级数展开成具体和弦（C–G–Am–F），玩家按顺序弹出每个和弦即推进。
 * 校验复用 chord-detect.js 的 detectChord（忽略转位，只看根音+类型）。
 *
 * 纯逻辑：不碰 MIDI/DOM，音符集合由调用方喂入，便于单元测试。
 */
import { detectChord, NOTE_NAMES } from './chord-detect.js';

/** 大调 / 自然小调音阶（相对主音的半音） */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
export const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

/**
 * 大调各级三和弦的品质（后缀）：I ii iii IV V vi vii°
 * 小调各级：i ii° III iv v VI VII
 */
export const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
export const MINOR_QUALITIES = ['m', 'dim', '', 'm', 'm', '', ''];

/** 罗马数字（按级，1..7） */
const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

/** 预置调：主音音级 + 名称 + 音阶类型 */
export const PROG_KEYS = [
  { id: 'C', name: 'C 大调', tonicPc: 0, scale: 'major' },
  { id: 'G', name: 'G 大调', tonicPc: 7, scale: 'major' },
  { id: 'D', name: 'D 大调', tonicPc: 2, scale: 'major' },
  { id: 'F', name: 'F 大调', tonicPc: 5, scale: 'major' },
  { id: 'A', name: 'A 大调', tonicPc: 9, scale: 'major' },
  { id: 'Am', name: 'A 小调', tonicPc: 9, scale: 'minor' },
  { id: 'Em', name: 'E 小调', tonicPc: 4, scale: 'minor' },
  { id: 'Dm', name: 'D 小调', tonicPc: 2, scale: 'minor' },
];

/**
 * 预置和弦进行：用级数（1-based degree）表示，便于换调展开。
 * degree 7 即第 7 级；引擎按调的音阶+品质算出具体和弦。
 */
export const PROGRESSIONS = [
  { id: 'pop', name: '万能流行（I–V–vi–IV）', degrees: [1, 5, 6, 4] },
  { id: 'doo-wop', name: '50 年代（I–vi–IV–V）', degrees: [1, 6, 4, 5] },
  { id: 'canon', name: '卡农（I–V–vi–iii–IV–I–IV–V）', degrees: [1, 5, 6, 3, 4, 1, 4, 5] },
  { id: 'two-five-one', name: '爵士 ii–V–I', degrees: [2, 5, 1] },
  { id: 'twelve-bar', name: '12 小节布鲁斯', degrees: [1, 1, 1, 1, 4, 4, 1, 1, 5, 4, 1, 5] },
  { id: 'sensitive', name: '敏感女声（vi–IV–I–V）', degrees: [6, 4, 1, 5] },
  { id: 'andalusian', name: '安达卢西亚（i–VII–VI–V）', degrees: [1, 7, 6, 5], minorPreferred: true },
];

/** 取调的音阶半音表 */
export function scaleOf(scale) {
  return scale === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
}
/** 取调的各级品质表 */
export function qualitiesOf(scale) {
  return scale === 'minor' ? MINOR_QUALITIES : MAJOR_QUALITIES;
}
/** 取调的罗马数字表 */
export function romanOf(scale) {
  return scale === 'minor' ? ROMAN_MINOR : ROMAN_MAJOR;
}

/**
 * 把"调 + 级数"展开成一个具体和弦。
 * @returns {{root:string, suffix:string, symbol:string, roman:string, degree:number}}
 */
export function chordForDegree(key, degree) {
  const scale = scaleOf(key.scale);
  const quals = qualitiesOf(key.scale);
  const romans = romanOf(key.scale);
  const idx = ((degree - 1) % 7 + 7) % 7;
  const rootPc = (key.tonicPc + scale[idx]) % 12;
  const suffix = quals[idx];
  const root = NOTE_NAMES[rootPc];
  return { root, suffix, symbol: root + suffix, roman: romans[idx], degree };
}

/** 把一条进行（级数数组）在某调下展开成具体和弦数组 */
export function expandProgression(key, degrees) {
  return degrees.map((d) => chordForDegree(key, d));
}

export class ChordProgression {
  /**
   * @param {object} opts
   * @param {object} opts.key          调对象（默认 C 大调）
   * @param {object} opts.progression  进行对象（默认万能流行）
   * @param {boolean} opts.loop        走到结尾是否回到开头（默认 true）
   */
  constructor(opts = {}) {
    this.key = opts.key || PROG_KEYS[0];
    this.progression = opts.progression || PROGRESSIONS[0];
    this.loop = opts.loop !== false;
    this.chords = expandProgression(this.key, this.progression.degrees);
    this.pos = 0;          // 当前要弹的和弦下标
    this.score = 0;        // 累计弹对的和弦数
    this.attempts = 0;     // 累计判定过的和弦数（用于正确率）
    this.streak = 0;
    this.best = 0;
    this.laps = 0;         // 完整走完整条的次数
    this.lastWrong = false;
    this.onAdvance = () => {};   // (pos, chord)
    this.onComplete = () => {};  // 走完一整条（laps++）
    this.onResult = () => {};    // (correct, info)
  }

  /** 当前要弹的和弦（结束且不循环时返回 null） */
  current() {
    return this.pos < this.chords.length ? this.chords[this.pos] : null;
  }

  /** 当前进行展开后的全部和弦（UI 展示用） */
  list() { return this.chords.slice(); }

  /**
   * 用当前按下的音符判定是否弹出了"当前目标和弦"（忽略转位）。
   * 对：推进；整条走完：laps++ 并（若 loop）回到开头。
   * @param {number[]} notes
   * @returns {{ok:boolean, advanced?:boolean, completed?:boolean, expected:object}|null}
   */
  check(notes) {
    const target = this.current();
    if (!target) return null;
    const chord = detectChord(notes);
    if (chord && chord.root === target.root && chord.suffix === target.suffix) {
      this.score++;
      this.attempts++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
      this.lastWrong = false;
      this.pos++;
      const completed = this.pos >= this.chords.length;
      this.onResult(true, { chord: target, score: this.score, streak: this.streak });
      this.onAdvance(this.pos, this.current());
      if (completed) {
        this.laps++;
        this.onComplete({ laps: this.laps, score: this.score });
        if (this.loop) this.pos = 0;
      }
      return { ok: true, advanced: true, completed, expected: target };
    }
    return { ok: false, advanced: false, expected: target };
  }

  /** 标记一次错误尝试（连击清零，计入正确率分母）。供 UI 在判到错和弦时调用。 */
  miss() {
    this.attempts++;
    this.streak = 0;
    this.lastWrong = true;
    this.onResult(false, { expected: this.current(), score: this.score, streak: this.streak });
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }

  /** 进度（0..1），按当前圈内位置 */
  get progress() { return this.chords.length ? this.pos / this.chords.length : 0; }

  reset() {
    this.pos = 0; this.score = 0; this.attempts = 0;
    this.streak = 0; this.best = 0; this.laps = 0; this.lastWrong = false;
  }
}
