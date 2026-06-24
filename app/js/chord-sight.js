/**
 * chord-sight.js — 和弦视奏（chord sight-reading）纯逻辑引擎
 *
 * 真实钢琴谱里大量的音是【竖向叠在一起的和弦】。看懂一摞音符（叠置三度）、
 * 一眼认出该同时按哪几个键，是从"单音识谱"迈向"弹真正乐曲"的核心技能。
 *
 * 屏幕在五线谱上画一个【叠置和弦】（三和弦/七和弦，可带转位、带调号），
 * 玩家在键盘上【把整组音同时按下】即算过关。引擎只管纯逻辑：
 *   1) 在某调内某级上生成一个和弦（三度叠置），算出各音 MIDI、音名、和弦性质；
 *   2) 可选转位（重排低音）；
 *   3) 校验"当前按下的音符集合"是否正好等于目标和弦（可忽略八度；转位时要求低音正确）；
 *   4) 统计对错 / 连击 / 得分。
 * 不碰 Web Audio / MIDI / DOM。注入 rng 便于确定性测试。
 *
 * 和现有模块的区别：
 *   - 和弦练习 chord-trainer：给【和弦名】让你弹，不读谱；
 *   - 和弦性质听辨 chord-quality：靠【耳朵】听，谱面不显示；
 *   - 五线谱识谱卡 staff-read / 视奏闪卡 sight-reading：一次只一个【单音】；
 *   - 乐句视奏 sight-phrase：读【横向单音旋律】、逐音弹；
 *   这里读的是【纵向叠置和弦】、整组同时按——独一份。
 */

import { KEYS, keyById, scaleSteps, degreeToMidi, keySignatureAccidentals } from './sight-phrase.js';

export { KEYS, keyById, keySignatureAccidentals };

/** 音名字母（自然音阶） */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** 各预置调的主音字母索引（指向 LETTERS），用于拼写和弦根音 */
export const KEY_LETTER = {
  C: 0, G: 4, D: 1, F: 3, Bb: 6, Am: 5, Em: 2, Dm: 1,
};

/** 三和弦/七和弦音程指纹（从根音起的半音集合）-> 中文性质名 */
export const CHORD_QUALITIES = [
  { ivals: [0, 4, 7],     name: '大三和弦',   short: 'maj' },
  { ivals: [0, 3, 7],     name: '小三和弦',   short: 'min' },
  { ivals: [0, 3, 6],     name: '减三和弦',   short: 'dim' },
  { ivals: [0, 4, 8],     name: '增三和弦',   short: 'aug' },
  { ivals: [0, 4, 7, 10], name: '属七和弦',   short: '7' },
  { ivals: [0, 4, 7, 11], name: '大七和弦',   short: 'maj7' },
  { ivals: [0, 3, 7, 10], name: '小七和弦',   short: 'm7' },
  { ivals: [0, 3, 6, 10], name: '半减七和弦', short: 'm7b5' },
  { ivals: [0, 3, 6, 9],  name: '减七和弦',   short: 'dim7' },
  { ivals: [0, 3, 7, 11], name: '小大七和弦', short: 'mMaj7' },
];

/** 转位中文名 */
export const INVERSION_NAMES = ['原位', '第一转位', '第二转位', '第三转位'];

/** 把 MIDI 归一化到音名字母 + 调号下的升降（用于拼写根音） */
export function spellRoot(key, degree) {
  const startIdx = KEY_LETTER[key.id] ?? 0;
  const letter = LETTERS[(startIdx + degree) % 7];
  const sigLetters = keySignatureAccidentals(key.sig).letters;
  const isSharp = key.sig.type === 'sharp';
  const acc = sigLetters.includes(letter) ? (isSharp ? '♯' : '♭') : '';
  return letter + acc;
}

/** 根据从根音起的半音音程集合识别和弦性质 */
export function qualityOf(midis) {
  if (!midis.length) return null;
  const root = midis[0];
  const ivals = midis.map((m) => (((m - root) % 12) + 12) % 12).sort((a, b) => a - b);
  // 去重
  const uniq = [...new Set(ivals)];
  for (const q of CHORD_QUALITIES) {
    if (q.ivals.length === uniq.length && q.ivals.every((v, i) => v === uniq[i])) return q;
  }
  return null;
}

/** 难度：允许的和弦类型 */
export const CHORD_LEVELS = {
  triad:   { sizes: [3],    label: '三和弦' },
  seventh: { sizes: [4],    label: '七和弦' },
  mixed:   { sizes: [3, 4], label: '三和弦 + 七和弦' },
};

export class ChordSight {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng           随机源（默认 Math.random）
   * @param {object} opts.key                 调对象（默认 C 大调）
   * @param {string} opts.type                'triad'|'seventh'|'mixed'（默认 triad）
   * @param {boolean} opts.inversions         是否随机转位并要求低音正确（默认 false）
   * @param {boolean} opts.octaveAgnostic     是否忽略八度（默认 true）
   * @param {number} opts.lowOctave           根音所在八度起点 MIDI（默认按调主音）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.key = opts.key || keyById('C');
    this.type = opts.type || 'triad';
    this.inversions = !!opts.inversions;
    this.octaveAgnostic = opts.octaveAgnostic !== false;

    this.chord = null;        // 当前和弦对象
    this.attempts = 0;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.everWrong = false;   // 本题是否按过错音

    this.onNew = opts.onNew || (() => {});
    this.onResult = opts.onResult || (() => {});
  }

  _rint(n) { return Math.floor(this.rng() * n); }

  /** 生成下一题（一个叠置和弦）。返回和弦对象的拷贝。 */
  next() {
    const sizes = CHORD_LEVELS[this.type] ? CHORD_LEVELS[this.type].sizes : [3];
    const size = sizes[this._rint(sizes.length)];
    const degree = this._rint(7);                 // 0..6 级
    // 三度叠置：根、三、五（、七）
    const degrees = [];
    for (let i = 0; i < size; i++) degrees.push(degree + i * 2);
    // 映射成 MIDI（同一八度区内向上叠）
    const tonic = this.key.tonic;
    let midis = degrees.map((d) => degreeToMidi(tonic, this.key.scale, d));
    // 保证严格递增（叠置）
    for (let i = 1; i < midis.length; i++) {
      while (midis[i] <= midis[i - 1]) midis[i] += 12;
    }
    const rootMidi = midis[0];
    // 转位：把底部若干音上移八度
    let inv = 0;
    if (this.inversions) {
      inv = this._rint(size); // 0..size-1
      for (let i = 0; i < inv; i++) {
        const lowest = midis.shift();
        midis.push(lowest + 12);
      }
    }
    midis = midis.slice().sort((a, b) => a - b);
    const bassPc = ((midis[0] % 12) + 12) % 12;
    const pcs = [...new Set(midis.map((m) => ((m % 12) + 12) % 12))].sort((a, b) => a - b);
    const q = qualityOf([rootMidi, ...degrees.slice(1).map((d) => degreeToMidi(tonic, this.key.scale, d))]
      .sort((a, b) => a - b));
    const rootName = spellRoot(this.key, degree);

    this.chord = {
      degree,
      size,
      inversion: inv,
      midis,                 // 排序后的实际音（含转位）
      rootMidi,
      bassPc,
      pcs,                   // 目标音名集合（pitch classes）
      quality: q,
      rootName,
      label: q ? `${rootName} ${q.name}` : rootName,
      invName: INVERSION_NAMES[inv] || '',
    };
    this.everWrong = false;
    this.onNew(this._copy());
    return this._copy();
  }

  _copy() {
    if (!this.chord) return null;
    return { ...this.chord, midis: this.chord.midis.slice(), pcs: this.chord.pcs.slice() };
  }

  /** 目标音名集合（pitch classes） */
  targetPcs() { return this.chord ? this.chord.pcs.slice() : []; }

  /** 键盘可见区间 [lo,hi]（MIDI） */
  range() {
    if (!this.chord) return [this.key.tonic, this.key.tonic + 16];
    const ms = this.chord.midis;
    return [Math.min(...ms), Math.max(...ms)];
  }

  /**
   * 喂入"当前按下的音符集合"，判断是否完成。
   * @param {number[]} heldNotes 当前按住的 MIDI 音符数组
   * @returns {object} 状态：
   *   { done:false, correctHeld, need, wrong:[...] }      还没集齐
   *   { done:true, correct:true, perfect, mistakes }      正好集齐目标和弦
   */
  check(heldNotes) {
    if (!this.chord) return { done: false, correctHeld: 0, need: 0, wrong: [] };
    const target = new Set(this.chord.pcs);
    const held = (heldNotes || []).slice().sort((a, b) => a - b);
    const heldPcs = held.map((m) => ((m % 12) + 12) % 12);
    const heldPcSet = new Set(heldPcs);
    const wrong = held.filter((m) => !target.has(((m % 12) + 12) % 12));
    if (wrong.length) this.everWrong = true;

    const correctHeld = [...heldPcSet].filter((pc) => target.has(pc)).length;

    // 完成条件：按住的音名集合 == 目标集合，且无多余/错误音
    const setMatch = wrong.length === 0 && heldPcSet.size === target.size
      && [...target].every((pc) => heldPcSet.has(pc));
    let bassOk = true;
    if (setMatch && this.inversions) {
      const lowPc = ((held[0] % 12) + 12) % 12;
      bassOk = lowPc === this.chord.bassPc;
      if (!bassOk) this.everWrong = true;
    }

    if (setMatch && bassOk) {
      this.attempts++;
      const perfect = !this.everWrong;
      if (perfect) {
        this.score++;
        this.streak++;
        if (this.streak > this.best) this.best = this.streak;
      } else {
        this.streak = 0;
      }
      const res = { done: true, correct: true, perfect, mistakes: perfect ? 0 : 1, chord: this._copy() };
      this.onResult(res);
      return res;
    }
    return {
      done: false,
      correctHeld,
      need: target.size,
      wrong,
      bassWrong: setMatch && !bassOk,
    };
  }

  /** 放弃当前题（算一次尝试，连击清零，不计分） */
  giveUp() {
    if (!this.chord) return;
    this.attempts++;
    this.streak = 0;
    const res = { done: true, correct: false, gaveUp: true, chord: this._copy() };
    this.onResult(res);
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }

  reset() {
    this.chord = null;
    this.attempts = 0; this.score = 0; this.streak = 0; this.best = 0;
    this.everWrong = false;
  }
}
