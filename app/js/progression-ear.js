/**
 * progression-ear.js — 和声进行听辨（harmonic progression ear-training）纯逻辑引擎
 *
 * 听一段调内（大调）和弦进行，逐个辨认每个和弦的【罗马数字级数】
 * （I ii iii IV V vi vii°）。第一个和弦固定是主和弦 I（给出作为锚点），
 * 之后每个和弦让你听辨它在调里的功能/级数。
 *
 * 这和现有模块都不同：
 *   - 和弦进行 chord-progression：看级数在键盘上【弹出】一串和弦（练手）
 *   - 和弦性质听辨 chord-quality：辨认【单个】和弦是大/小/增/减/七（练类型）
 *   - 唱名听辨 solfege：辨认【单音】的音级
 *   这里练的是【和声功能/进行走向听觉】——同一个和弦放在不同进行里，
 *   听感由它与主和弦的关系决定（V 想回 I、IV 下属、vi 关系小调…），
 *   是流行/爵士即兴、扒和弦、编配的核心听觉能力。
 *
 * 大调七个调内三和弦（相对主音）：
 *   I   大三   主，稳定的"家"
 *   ii  小三   下属功能，常接 V
 *   iii 小三   中音，柔和
 *   IV  大三   下属，明亮、想往 I 或 V
 *   V   大三   属，强烈想解决回 I
 *   vi  小三   关系小调主和弦，忧郁
 *   vii°减三   导和弦，极不稳定，想解决到 I
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案。播放交给 UI。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 大调音阶（相对主音半音） */
export const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];

/** 七个调内三和弦的级数信息（degree 1..7） */
export const DEGREES = [
  { degree: 1, roman: 'I',    quality: 'major', name: '主和弦',   hint: '稳定的"家"' },
  { degree: 2, roman: 'ii',   quality: 'minor', name: '上主和弦', hint: '下属功能，常接 V' },
  { degree: 3, roman: 'iii',  quality: 'minor', name: '中和弦',   hint: '柔和、过渡' },
  { degree: 4, roman: 'IV',   quality: 'major', name: '下属和弦', hint: '明亮，想往 I 或 V' },
  { degree: 5, roman: 'V',    quality: 'major', name: '属和弦',   hint: '强烈想解决回 I' },
  { degree: 6, roman: 'vi',   quality: 'minor', name: '下中和弦', hint: '关系小调主和弦，忧郁' },
  { degree: 7, roman: 'vii°', quality: 'dim',   name: '导和弦',   hint: '极不稳定，想到 I' },
];

/** 常见和弦进行（级数序列，第一个通常是 1） */
export const PROGRESSIONS = [
  { id: 'pop',     name: '流行万能 I–V–vi–IV', degrees: [1, 5, 6, 4] },
  { id: 'doowop',  name: '50 年代 I–vi–IV–V',  degrees: [1, 6, 4, 5] },
  { id: 'canon',   name: '卡农 I–V–vi–iii',    degrees: [1, 5, 6, 3] },
  { id: 'twofive', name: '爵士 ii–V–I',        degrees: [1, 2, 5, 1] },
  { id: 'plagal',  name: '变格 I–IV–I',        degrees: [1, 4, 1] },
  { id: 'auth',    name: '正格 I–IV–V–I',      degrees: [1, 4, 5, 1] },
  { id: 'sad',     name: '伤感 vi–IV–I–V',     degrees: [1, 6, 4, 1, 5] },
  { id: 'rock',    name: '摇滚 I–IV–V',        degrees: [1, 4, 5] },
];

/** degree -> 级数信息（越界 null） */
export function degreeInfo(degree) {
  return DEGREES.find((d) => d.degree === degree) || null;
}

/** degree -> 罗马数字（越界 '?'） */
export function romanOf(degree) {
  const d = degreeInfo(degree);
  return d ? d.roman : '?';
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

export class ProgressionEarGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.progressions 允许的进行 id（默认全部）
   * @param {number} opts.tonicMin       主音 MIDI 下限（默认 C3=48）
   * @param {number} opts.tonicMax       主音 MIDI 上限（默认 G4=67）
   * @param {number} opts.choiceCount    每个和弦的选项个数（默认 4）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const ids = opts.progressions && opts.progressions.length ? opts.progressions : PROGRESSIONS.map((p) => p.id);
    this.progressions = PROGRESSIONS.filter((p) => ids.includes(p.id));
    if (!this.progressions.length) this.progressions = PROGRESSIONS.slice();
    this.tonicMin = opts.tonicMin ?? 48;
    this.tonicMax = opts.tonicMax ?? 67;
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, 7));
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { prog, tonic, chords:[{degree,roman,quality,notes}], index }
    this.onNew = () => {};
    this.onResult = () => {};
    this.onComplete = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一段进行。把和弦指针指向第 2 个和弦（第 1 个 I 作为给定锚点）。 */
  next() {
    const prog = this._pick(this.progressions);
    // 收紧主音范围，保证最高音不越 127（vii° 五音可达 +9，叠到第二八度更高，留足余量）
    let lo = Math.max(this.tonicMin, 0);
    let hi = Math.min(this.tonicMax, 127 - 24);
    if (hi < lo) { lo = 0; hi = 127 - 24; }
    const tonic = lo + Math.floor(this.rng() * (hi - lo + 1));
    const chords = prog.degrees.map((deg) => ({
      degree: deg,
      roman: romanOf(deg),
      quality: degreeInfo(deg).quality,
      notes: chordMidi(tonic, deg),
    }));
    // 第一个和弦作为锚点给出（通常是 I）；从 index 1 开始考。
    const index = chords.length > 1 ? 1 : 0;
    this.current = { prog, tonic, chords, index };
    this.onNew(this.current);
    return this.current;
  }

  /** 整段进行每个和弦的 MIDI 数组（按顺序，UI 依次播放） */
  progressionNotes() {
    return this.current ? this.current.chords.map((c) => c.notes.slice()) : [];
  }
  /** 整段进行的和弦对象数组 */
  chords() { return this.current ? this.current.chords.map((c) => ({ ...c, notes: c.notes.slice() })) : []; }
  /** 主音 MIDI */
  tonic() { return this.current ? this.current.tonic : null; }
  /** 当前待辨认的和弦序号（0 基；锚点之后从 1 起） */
  index() { return this.current ? this.current.index : -1; }
  /** 当前待辨认的和弦对象 */
  currentChord() {
    if (!this.current) return null;
    return this.current.chords[this.current.index] || null;
  }
  /** 整段是否已全部辨认完 */
  isComplete() {
    return !!this.current && this.current.index >= this.current.chords.length;
  }

  /** 当前和弦的多选级数（含正确项，打乱） */
  choices() {
    const ch = this.currentChord();
    if (!ch) return [];
    const pool = DEGREES.filter((d) => d.degree !== ch.degree);
    const distractors = [];
    // 用确定性顺序从池里取（基于 rng），保证可测
    while (distractors.length < this.choiceCount - 1 && pool.length) {
      const i = Math.floor(this.rng() * pool.length);
      distractors.push(pool.splice(i, 1)[0]);
    }
    const choices = distractors.concat(degreeInfo(ch.degree));
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    return choices;
  }

  /**
   * 校验当前和弦的答案（级数 1..7），正确则指针前进。
   * @param {number} answerDegree
   * @returns {boolean}
   */
  check(answerDegree) {
    const ch = this.currentChord();
    if (!ch) return false;
    this.attempts++;
    const correct = answerDegree === ch.degree;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.current.index++;
    this.onResult(correct, {
      answer: answerDegree, chord: ch,
      score: this.score, streak: this.streak,
    });
    if (this.isComplete()) this.onComplete(this.current);
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
