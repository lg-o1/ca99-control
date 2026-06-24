/**
 * mode-id.js — 调式识别（church mode ear-training）纯逻辑引擎
 *
 * 听一条从某根音弹起的七声音阶，辨认它是哪个【教会调式】：
 *   Ionian（伊奥尼亚=大调）/ Dorian（多利亚）/ Phrygian（弗里几亚）/
 *   Lydian（利底亚）/ Mixolydian（混合利底亚）/ Aeolian（爱奥利亚=自然小调）/
 *   Locrian（洛克里亚）。
 *
 * 这和「音阶练习」（练手）「调号识别」（看升降号认调）都不同——这里练耳朵：
 * 同一组白键音从不同音级起头，色彩完全不一样，靠特征音程辨认调式。
 *
 * 辨认诀窍（相对大调的变化音）：
 *   Ionian      全全半全全全半   亮（大调）
 *   Dorian      降3 降7         小调但 6 级是大的（爵士常用）
 *   Phrygian    降2 降3 降6 降7  暗，特征是降二度（西班牙/弗拉门戈味）
 *   Lydian      升4            最亮，特征是升四度（梦幻）
 *   Mixolydian  降7            大调但七级降低（属和弦/布鲁斯味）
 *   Aeolian     降3 降6 降7     自然小调
 *   Locrian     降2 降3 降5 降6 降7  最不稳定，五级也降（半减）
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案。播放交给 UI。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 七个教会调式：以根音为 0 的半音偏移（上行一个八度，含结尾八度音）。
 * degree 是该调式在「白键大调音阶」中的起始音级（0=Ionian 从 C 起…）。
 */
export const MODES = [
  { id: 'ionian',     name: '伊奥尼亚', alias: '大调', degree: 0, offsets: [0, 2, 4, 5, 7, 9, 11], hint: '亮，就是大调' },
  { id: 'dorian',     name: '多利亚',   alias: '小调+大六度', degree: 1, offsets: [0, 2, 3, 5, 7, 9, 10], hint: '小调但六级是大的（爵士味）' },
  { id: 'phrygian',   name: '弗里几亚', alias: '降二度小调', degree: 2, offsets: [0, 1, 3, 5, 7, 8, 10], hint: '特征降二度（西班牙味）' },
  { id: 'lydian',     name: '利底亚',   alias: '升四度大调', degree: 3, offsets: [0, 2, 4, 6, 7, 9, 11], hint: '最亮，特征升四度（梦幻）' },
  { id: 'mixolydian', name: '混合利底亚', alias: '降七度大调', degree: 4, offsets: [0, 2, 4, 5, 7, 9, 10], hint: '大调但七级降低（属和弦/布鲁斯）' },
  { id: 'aeolian',    name: '爱奥利亚', alias: '自然小调', degree: 5, offsets: [0, 2, 3, 5, 7, 8, 10], hint: '自然小调' },
  { id: 'locrian',    name: '洛克里亚', alias: '半减', degree: 6, offsets: [0, 1, 3, 5, 6, 8, 10], hint: '最不稳定，五级也降' },
];

/** id -> 调式定义 */
export function modeById(id) {
  return MODES.find((m) => m.id === id) || null;
}

/** id -> 名称（找不到 '?'） */
export function modeName(id) {
  const m = modeById(id);
  return m ? m.name : '?';
}

/** MIDI -> 音名（含八度，C4=60） */
export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/**
 * 构造某根音、某调式的上行音阶 MIDI（含结尾八度音，共 8 个音）。
 * @param {number} rootMidi 根音 MIDI
 * @param {string} modeId
 */
export function scaleMidi(rootMidi, modeId) {
  const m = modeById(modeId);
  if (!m) return [];
  return m.offsets.concat(12).map((o) => rootMidi + o);
}

/** 相邻音程（半音）——调式的"指纹" */
export function stepPattern(modeId) {
  const sc = scaleMidi(0, modeId);
  const out = [];
  for (let i = 1; i < sc.length; i++) out.push(sc[i] - sc[i - 1]);
  return out;
}

export class ModeIdGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.modes   允许的调式 id（默认全部 7 个）
   * @param {number} opts.rootMin   根音 MIDI 下限（默认 C3=48）
   * @param {number} opts.rootMax   根音 MIDI 上限（默认 C5=72）
   * @param {number} opts.choiceCount 选项个数（默认 4）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const mids = opts.modes && opts.modes.length ? opts.modes : MODES.map((m) => m.id);
    this.modes = MODES.filter((m) => mids.includes(m.id));
    if (!this.modes.length) this.modes = MODES.slice();
    this.rootMin = opts.rootMin ?? 48;
    this.rootMax = opts.rootMax ?? 72;
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, MODES.length));
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { root, mode, notes, choices }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题，返回要播放的 MIDI 音符（升序，含八度） */
  next() {
    const mode = this._pick(this.modes);
    // 收紧根音，保证最高音（+12）不越 127
    let lo = Math.max(this.rootMin, 0);
    let hi = Math.min(this.rootMax, 127 - 12);
    if (hi < lo) { lo = 0; hi = 127 - 12; }
    const root = lo + Math.floor(this.rng() * (hi - lo + 1));
    const notes = scaleMidi(root, mode.id);
    // 干扰项：从全部调式里随机取（含正确项），打乱
    const pool = MODES.filter((m) => m.id !== mode.id);
    const distractors = [];
    while (distractors.length < this.choiceCount - 1 && pool.length) {
      const idx = Math.floor(this.rng() * pool.length);
      distractors.push(pool.splice(idx, 1)[0]);
    }
    const choices = distractors.concat(mode);
    // Fisher-Yates 打乱
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    this.current = { root, mode, notes, choices };
    this.onNew(this.current);
    return notes.slice();
  }

  /** 当前题目要播放的 MIDI 音符 */
  notes() { return this.current ? this.current.notes.slice() : []; }

  /** 当前选项（调式定义数组） */
  choices() { return this.current ? this.current.choices.slice() : []; }

  /**
   * 校验答案（调式 id）。
   * @param {string} answerId
   * @returns {boolean}
   */
  check(answerId) {
    if (!this.current) return false;
    this.attempts++;
    const correct = answerId === this.current.mode.id;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      answer: answerId, mode: this.current.mode,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
