/**
 * solfege.js — 唱名/音级听辨（solfège · scale-degree ear-training）纯逻辑引擎
 *
 * 视唱练耳最核心的基础：先用主和弦（或主音琶音）建立调性，再听一个音，
 * 辨认它是音阶里的第几级（唱名 Do Re Mi Fa Sol La Ti / 1 2 3 4 5 6 7）。
 *
 * 这和现有模块都不同：
 *   - 音程听辨 ear-training：听【两个音】之间的距离（不依赖调性）
 *   - 音程构建 interval-build：在键盘上【弹出】某音程
 *   - 旋律听写 melody-dictation：把一整段旋律【复奏】出来
 *   - 调式识别 mode-id：辨认整条音阶是哪个【调式】
 *   这里练的是【相对音高/调性感】——同一个音放在不同调里，音级感受完全不同，
 *   靠它与主音的关系来辨认。这是即兴、扒谱、视唱的地基。
 *
 * 辨认诀窍（相对主音 Do）：
 *   1 Do  主音，最稳定，"家"
 *   2 Re  上主音，想往 1 或 3 走
 *   3 Mi  中音，大调里明亮、决定大小调色彩
 *   4 Fa  下属音，想解决到 3（Fa→Mi）
 *   5 Sol 属音，仅次于主音的稳定支柱
 *   6 La  下中音，柔和
 *   7 Ti  导音，强烈想解决到高八度 Do（Ti→Do）
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案。播放交给 UI。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 两种调式：相对主音的半音步进 + 各级唱名（可动唱名 movable-do）。
 * 小调用以 Do 为主音的小调唱名（降三/六/七级写作 Me/Le/Te）。
 */
export const SCALES = {
  major: {
    id: 'major', name: '大调',
    steps: [0, 2, 4, 5, 7, 9, 11],
    syllables: ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti'],
    third: 4,
  },
  minor: {
    id: 'minor', name: '小调',
    steps: [0, 2, 3, 5, 7, 8, 10],
    syllables: ['Do', 'Re', 'Me', 'Fa', 'Sol', 'Le', 'Te'],
    third: 3,
  },
};

/** 七个音级的功能名与提示（唱名随调式变化，见 syllable()）。 */
export const DEGREES = [
  { degree: 1, num: '1', fn: '主音',   hint: '最稳定，调的"家"' },
  { degree: 2, num: '2', fn: '上主音', hint: '想往 1 或 3 走' },
  { degree: 3, num: '3', fn: '中音',   hint: '决定大小调色彩' },
  { degree: 4, num: '4', fn: '下属音', hint: '想解决到 3（Fa→Mi）' },
  { degree: 5, num: '5', fn: '属音',   hint: '仅次于主音的稳定支柱' },
  { degree: 6, num: '6', fn: '下中音', hint: '柔和' },
  { degree: 7, num: '7', fn: '导音',   hint: '强烈想解决到高八度 Do' },
];

/** 音级数字 -> 功能信息（越界返回 null） */
export function degreeInfo(degree) {
  return DEGREES.find((d) => d.degree === degree) || null;
}

/** 某音级在某调式里的唱名（如 7 级在小调里是 Te） */
export function syllable(degree, scaleType) {
  const sc = SCALES[scaleType] || SCALES.major;
  if (degree < 1 || degree > 7) return '?';
  return sc.syllables[degree - 1];
}

/** MIDI -> 音名（含八度，C4=60） */
export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/** 某调（主音 MIDI）某音级对应的 MIDI 音 */
export function degreeMidi(tonicMidi, degree, scaleType) {
  const sc = SCALES[scaleType] || SCALES.major;
  if (degree < 1 || degree > 7) return null;
  return tonicMidi + sc.steps[degree - 1];
}

/** 主和弦三个音（建立调性用）：主音 + 三度 + 五度 */
export function tonicTriad(tonicMidi, scaleType) {
  const sc = SCALES[scaleType] || SCALES.major;
  return [tonicMidi, tonicMidi + sc.third, tonicMidi + 7];
}

export class SolfegeGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string} opts.scaleType    'major'（默认）或 'minor'
   * @param {number[]} opts.degrees    允许出现的音级（默认 1..7）
   * @param {number} opts.tonicMin     主音 MIDI 下限（默认 C3=48）
   * @param {number} opts.tonicMax     主音 MIDI 上限（默认 C5=72）
   * @param {number} opts.choiceCount  选项个数（默认 4）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.scaleType = SCALES[opts.scaleType] ? opts.scaleType : 'major';
    const ds = (opts.degrees && opts.degrees.length ? opts.degrees : [1, 2, 3, 4, 5, 6, 7])
      .filter((d) => d >= 1 && d <= 7);
    this.degrees = ds.length ? Array.from(new Set(ds)).sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7];
    this.tonicMin = opts.tonicMin ?? 48;
    this.tonicMax = opts.tonicMax ?? 72;
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, this.degrees.length));
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { tonic, degree, scaleType, target, triad, choices }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题。返回当前题目对象。 */
  next() {
    const degree = this._pick(this.degrees);
    // 收紧主音范围，保证 7 级（最高 +11）不越 127
    let lo = Math.max(this.tonicMin, 0);
    let hi = Math.min(this.tonicMax, 127 - 11);
    if (hi < lo) { lo = 0; hi = 127 - 11; }
    const tonic = lo + Math.floor(this.rng() * (hi - lo + 1));
    const target = degreeMidi(tonic, degree, this.scaleType);
    const triad = tonicTriad(tonic, this.scaleType);
    // 干扰项：从启用音级里随机取（含正确项），打乱
    const pool = this.degrees.filter((d) => d !== degree);
    const distractors = [];
    while (distractors.length < this.choiceCount - 1 && pool.length) {
      const idx = Math.floor(this.rng() * pool.length);
      distractors.push(pool.splice(idx, 1)[0]);
    }
    const choiceDegrees = distractors.concat(degree);
    for (let i = choiceDegrees.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [choiceDegrees[i], choiceDegrees[j]] = [choiceDegrees[j], choiceDegrees[i]];
    }
    const choices = choiceDegrees.map((d) => ({
      degree: d,
      ...degreeInfo(d),
      syllable: syllable(d, this.scaleType),
    }));
    this.current = { tonic, degree, scaleType: this.scaleType, target, triad, choices };
    this.onNew(this.current);
    return this.current;
  }

  /** 主和弦三音（建立调性，UI 先播这个） */
  triad() { return this.current ? this.current.triad.slice() : []; }
  /** 目标音 MIDI（UI 在主和弦后播这个） */
  target() { return this.current ? this.current.target : null; }
  /** 主音 MIDI */
  tonic() { return this.current ? this.current.tonic : null; }
  /** 当前选项（音级信息对象数组） */
  choices() { return this.current ? this.current.choices.slice() : []; }

  /**
   * 校验答案（音级数字 1..7）。
   * @param {number} answerDegree
   * @returns {boolean}
   */
  check(answerDegree) {
    if (!this.current) return false;
    this.attempts++;
    const correct = answerDegree === this.current.degree;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      answer: answerDegree, degree: this.current.degree,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
