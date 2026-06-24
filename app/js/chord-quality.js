/**
 * chord-quality.js — 和弦性质听辨（chord quality ear-training）纯逻辑引擎
 *
 * 听一个和弦，辨认它的【性质/类型】：大三、小三、增三、减三（三和弦），
 * 或属七、大七、小七、半减七、减七（七和弦）。
 *
 * 这和现有和弦模块都不同：
 *   - 和弦练习 chord-trainer：看和弦名在键盘上【弹出】它
 *   - 和弦转位 chord-inversion：听同一个和弦的不同【排列】（原位/转位）
 *   - 和弦识别 chord-detect：实时显示你正在弹的和弦
 *   - 和弦进行 chord-progression：按顺序弹出一串和弦
 *   这里练的是【和弦色彩/类型听觉】——大调明亮、小调忧郁、增减紧张、
 *   七和弦各有爵士/布鲁斯味，是和声听觉的地基。
 *
 * 辨认诀窍：
 *   大三 major     明亮、稳定（大三度+小三度）
 *   小三 minor     忧郁、柔和（小三度+大三度）
 *   增三 augmented 悬浮、紧张、对称（两个大三度）
 *   减三 diminished 不安、想解决（两个小三度）
 *   属七 dom7      想解决，蓝调味（大三和弦+小七度）
 *   大七 maj7      爵士、柔和明亮（大三和弦+大七度）
 *   小七 min7      爵士、忧郁柔和（小三和弦+小七度）
 *   半减七 m7b5    暗、爵士 ii（减三和弦+小七度）
 *   减七 dim7      极度紧张、对称（叠三个小三度）
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案。播放交给 UI。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 和弦性质表：根音为 0 的半音音程（升序，含根音）。
 * family: 'triad'（三和弦）或 'seventh'（七和弦），便于按难度选范围。
 */
export const QUALITIES = [
  { id: 'major',      name: '大三和弦', symbol: '',     family: 'triad',   intervals: [0, 4, 7],     hint: '明亮稳定（大三度+小三度）' },
  { id: 'minor',      name: '小三和弦', symbol: 'm',    family: 'triad',   intervals: [0, 3, 7],     hint: '忧郁柔和（小三度+大三度）' },
  { id: 'augmented',  name: '增三和弦', symbol: 'aug',  family: 'triad',   intervals: [0, 4, 8],     hint: '悬浮紧张、对称（两个大三度）' },
  { id: 'diminished', name: '减三和弦', symbol: 'dim',  family: 'triad',   intervals: [0, 3, 6],     hint: '不安、想解决（两个小三度）' },
  { id: 'dom7',       name: '属七和弦', symbol: '7',    family: 'seventh', intervals: [0, 4, 7, 10], hint: '想解决、蓝调味（大三+小七度）' },
  { id: 'maj7',       name: '大七和弦', symbol: 'maj7', family: 'seventh', intervals: [0, 4, 7, 11], hint: '爵士、柔和明亮（大三+大七度）' },
  { id: 'min7',       name: '小七和弦', symbol: 'm7',   family: 'seventh', intervals: [0, 3, 7, 10], hint: '爵士、忧郁柔和（小三+小七度）' },
  { id: 'm7b5',       name: '半减七和弦', symbol: 'm7♭5', family: 'seventh', intervals: [0, 3, 6, 10], hint: '暗、爵士 ii（减三+小七度）' },
  { id: 'dim7',       name: '减七和弦', symbol: 'dim7', family: 'seventh', intervals: [0, 3, 6, 9],  hint: '极度紧张、对称（叠三个小三度）' },
];

/** 默认题库：4 种三和弦（入门最常用） */
export const DEFAULT_QUALITIES = ['major', 'minor', 'augmented', 'diminished'];

/** 最大音程偏移（用于钳制根音范围，maj7=11） */
const MAX_OFFSET = 11;

/** id -> 性质定义（找不到 null） */
export function qualityById(id) {
  return QUALITIES.find((q) => q.id === id) || null;
}

/** id -> 名称（找不到 '?'） */
export function qualityName(id) {
  const q = qualityById(id);
  return q ? q.name : '?';
}

/** MIDI -> 音名（含八度，C4=60） */
export function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

/** 构造某根音、某性质的和弦 MIDI（升序，含根音） */
export function chordMidi(rootMidi, qualityId) {
  const q = qualityById(qualityId);
  if (!q) return [];
  return q.intervals.map((i) => rootMidi + i);
}

export class ChordQualityGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.qualities  允许的性质 id（默认 4 种三和弦）
   * @param {number} opts.rootMin      根音 MIDI 下限（默认 C3=48）
   * @param {number} opts.rootMax      根音 MIDI 上限（默认 C5=72）
   * @param {number} opts.choiceCount  选项个数（默认 4）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const ids = opts.qualities && opts.qualities.length ? opts.qualities : DEFAULT_QUALITIES;
    this.qualities = QUALITIES.filter((q) => ids.includes(q.id));
    if (!this.qualities.length) this.qualities = QUALITIES.filter((q) => DEFAULT_QUALITIES.includes(q.id));
    this.rootMin = opts.rootMin ?? 48;
    this.rootMax = opts.rootMax ?? 72;
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, this.qualities.length));
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { root, quality, notes, choices }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题，返回要播放的 MIDI 音符（升序，含根音） */
  next() {
    const quality = this._pick(this.qualities);
    // 收紧根音，保证最高音不越 127
    let lo = Math.max(this.rootMin, 0);
    let hi = Math.min(this.rootMax, 127 - MAX_OFFSET);
    if (hi < lo) { lo = 0; hi = 127 - MAX_OFFSET; }
    const root = lo + Math.floor(this.rng() * (hi - lo + 1));
    const notes = chordMidi(root, quality.id);
    // 干扰项：从启用性质里随机取（含正确项），打乱
    const pool = this.qualities.filter((q) => q.id !== quality.id);
    const distractors = [];
    while (distractors.length < this.choiceCount - 1 && pool.length) {
      const idx = Math.floor(this.rng() * pool.length);
      distractors.push(pool.splice(idx, 1)[0]);
    }
    const choices = distractors.concat(quality);
    for (let i = choices.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [choices[i], choices[j]] = [choices[j], choices[i]];
    }
    this.current = { root, quality, notes, choices };
    this.onNew(this.current);
    return notes.slice();
  }

  /** 当前题目要播放的 MIDI 音符 */
  notes() { return this.current ? this.current.notes.slice() : []; }
  /** 当前选项（性质定义数组） */
  choices() { return this.current ? this.current.choices.slice() : []; }
  /** 当前根音 MIDI */
  root() { return this.current ? this.current.root : null; }

  /**
   * 校验答案（性质 id）。
   * @param {string} answerId
   * @returns {boolean}
   */
  check(answerId) {
    if (!this.current) return false;
    this.attempts++;
    const correct = answerId === this.current.quality.id;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      answer: answerId, quality: this.current.quality,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
