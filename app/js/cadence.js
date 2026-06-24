/**
 * cadence.js — 终止式辨认（cadence identification）纯逻辑引擎
 *
 * 听一个【两个和弦】的终止式（句末和声落点），辨认它属于哪一类：
 *   正格终止 Authentic   V → I   属到主，最有"结束感"，像句号
 *   变格终止 Plagal      IV → I  下属到主，柔和的"阿门"终止
 *   半终止   Half        ? → V   停在属和弦，悬而未决，像逗号（前一个可为 I/ii/IV）
 *   阻碍终止 Deceptive   V → vi  属本想回主却走到 vi，意外感
 *
 * 这和现有和声模块都不同：
 *   - 和声进行听辨 progression-ear：逐个辨认进行里每个和弦的【级数】
 *   - 和弦性质听辨 chord-quality：辨认【单个】和弦是大/小/增/减/七
 *   终止式练的是【乐句收束的和声功能听感】——同样落在 I 上，V→I（正格）
 *   和 IV→I（变格）的"结束方式"不同；落在 V 上是半终止（未完）；V 后接 vi
 *   则是阻碍。这是听辨乐句结构、即兴收束、扒歌定段落的核心能力。
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案。播放交给 UI。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 大调音阶（相对主音半音） */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** 大调七个调内三和弦的罗马数字 */
export const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];

/** 四种终止式 */
export const CADENCES = [
  { id: 'authentic', name: '正格终止', short: 'V → I', degrees: [5, 1], hint: '属(V)到主(I)，最有"结束感"，像句号。流行/古典最常见的收束' },
  { id: 'plagal', name: '变格终止', short: 'IV → I', degrees: [4, 1], hint: '下属(IV)到主(I)，柔和庄重的"阿门"终止，常见于赞美诗结尾' },
  { id: 'half', name: '半终止', short: '? → V', degrees: [1, 5], hint: '停在属(V)上，悬而未决像逗号，让乐句"未完待续"' },
  { id: 'deceptive', name: '阻碍终止', short: 'V → vi', degrees: [5, 6], hint: '属(V)本想回主却走到 vi，制造"意外/转折"，延后真正的结束' },
];

/** 半终止的前一个和弦可以是 I / ii / IV（都解决到 V） */
export const HALF_APPROACHES = [1, 2, 4];

/** id -> 终止式信息（越界 null） */
export function cadenceInfo(id) {
  return CADENCES.find((c) => c.id === id) || null;
}

/** degree -> 罗马数字（1..7，越界 '?'） */
export function romanOf(degree) {
  return (degree >= 1 && degree <= 7) ? ROMAN[degree - 1] : '?';
}

/** MIDI -> 音名（含八度，C4=60） */
export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/**
 * 构造大调里某级数的调内三和弦 MIDI（升序，含根音）。
 * 三度叠置：根=scale[d-1]，三音=scale[d+1]，五音=scale[d+3]（绕回加八度）。
 * @param {number} tonicMidi 主音 MIDI
 * @param {number} degree    级数 1..7
 */
export function chordMidi(tonicMidi, degree) {
  if (degree < 1 || degree > 7) return [];
  const idx = degree - 1;
  const pick = (step) => {
    const i = idx + step;
    return tonicMidi + MAJOR_SCALE[i % 7] + 12 * Math.floor(i / 7);
  };
  return [pick(0), pick(2), pick(4)];
}

export class CadenceGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.cadences  允许的终止式 id（默认全部）
   * @param {number} opts.tonicMin    主音 MIDI 下限（默认 C3=48）
   * @param {number} opts.tonicMax    主音 MIDI 上限（默认 C4=60）
   * @param {number} opts.choiceCount 选项个数（默认 4，即全部）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const ids = opts.cadences && opts.cadences.length ? opts.cadences : CADENCES.map((c) => c.id);
    this.cadences = CADENCES.filter((c) => ids.includes(c.id));
    if (!this.cadences.length) this.cadences = CADENCES.slice();
    this.tonicMin = opts.tonicMin ?? 48;
    this.tonicMax = opts.tonicMax ?? 60;
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, CADENCES.length));
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { cad, tonic, degrees:[d1,d2], chords:[{degree,roman,notes}] }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 取该终止式的级数序列（半终止的前导和弦随机） */
  _degrees(cad) {
    if (cad.id === 'half') return [this._pick(HALF_APPROACHES), 5];
    return cad.degrees.slice();
  }

  /** 出下一题 */
  next() {
    const cad = this._pick(this.cadences);
    let lo = Math.max(this.tonicMin, 0);
    let hi = Math.min(this.tonicMax, 127 - 24);
    if (hi < lo) { lo = 0; hi = 127 - 24; }
    const tonic = lo + Math.floor(this.rng() * (hi - lo + 1));
    const degrees = this._degrees(cad);
    const chords = degrees.map((deg) => ({
      degree: deg,
      roman: romanOf(deg),
      notes: chordMidi(tonic, deg),
    }));
    this.current = { cad, tonic, degrees, chords };
    this.onNew(this.current);
    return this.current;
  }

  /** 当前题两个和弦的 MIDI 数组（按顺序，UI 依次播放） */
  notes() {
    return this.current ? this.current.chords.map((c) => c.notes.slice()) : [];
  }

  /** 当前题的和弦对象数组 */
  chords() {
    return this.current ? this.current.chords.map((c) => ({ ...c, notes: c.notes.slice() })) : [];
  }

  /** 主音 MIDI */
  tonic() { return this.current ? this.current.tonic : null; }

  /** 当前正确终止式 id */
  answerId() { return this.current ? this.current.cad.id : null; }

  /** 多选项（含正确项，打乱） */
  choices() {
    if (!this.current) return [];
    const correct = this.current.cad;
    const pool = CADENCES.filter((c) => c.id !== correct.id);
    const distractors = [];
    while (distractors.length < this.choiceCount - 1 && pool.length) {
      const i = Math.floor(this.rng() * pool.length);
      distractors.push(pool.splice(i, 1)[0]);
    }
    const choices = distractors.concat(correct);
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }

  /**
   * 校验答案。
   * @param {string} id 选择的终止式 id
   * @returns {boolean}
   */
  check(id) {
    if (!this.current) return false;
    this.attempts++;
    const correct = id === this.current.cad.id;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      answer: id, cadence: this.current.cad,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
