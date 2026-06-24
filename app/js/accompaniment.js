/**
 * accompaniment.js — 伴奏音型练习（accompaniment patterns）纯逻辑引擎
 *
 * 现有和弦模块教你【认/弹和弦本身】，但真实弹琴时左手不是干巴巴地按柱式和弦，
 * 而是用各种【伴奏型】把同一串和弦弹得有流动感、有律动。这是从"会弹和弦"到
 * "会伴奏"的关键一步——流行弹唱、古典奏鸣曲左手、爵士 comping 的共同基础。
 *
 * 本模块给定调 + 和弦进行（复用 chord-progression 的级数库）+ 一种伴奏型，
 * 把每个和弦按伴奏型展开成一串"该弹的音"步骤（step），玩家按顺序弹出即推进。
 * 判分是【步进式】：弹对当前步就前进，不依赖实时下落/定时，便于稳定单测。
 *
 * 五种伴奏型：
 *   柱式和弦 block      整个三和弦一起按（最基础）
 *   阿尔贝蒂低音 alberti 低-高-中-高分解（C: C-G-E-G），莫扎特奏鸣曲经典
 *   华尔兹 waltz        蓬-恰-恰：低音 + 两下和弦，3/4 圆舞曲
 *   分解琶音 broken     根-三-五-八上行，流动感伴奏
 *   行进低音 bass       根-五-六-五布吉低音，布鲁斯/摇滚
 *
 * 纯逻辑：不碰 MIDI/DOM，按下的音集合由调用方喂入，便于单元测试。
 */
import { NOTE_NAMES } from './chord-detect.js';
import { PROG_KEYS, PROGRESSIONS, expandProgression } from './chord-progression.js';

export { PROG_KEYS, PROGRESSIONS };

/** 三和弦相对根音的半音（按品质后缀） */
const TRIAD = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6], aug: [0, 4, 8] };

/** 给定根音音级 + 后缀，返回三和弦的三个音级 [root, third, fifth] */
export function triadPcs(rootPc, suffix) {
  const iv = TRIAD[suffix] ?? TRIAD[''];
  return iv.map((s) => (rootPc + s) % 12);
}

/**
 * 伴奏型库。每个 pattern 的 build(tones) 接收一个和弦的三个具体音 MIDI
 * [rootMidi, thirdMidi, fifthMidi]，展开成该和弦小节内的 step 序列。
 * step: { notes:[midi...], beatInBar, label }
 */
export const PATTERNS = [
  {
    id: 'block', name: '柱式和弦', emoji: '🎹', beats: 4,
    desc: '每小节按下整个三和弦，最基础的伴奏',
    build: (t) => [{ notes: [t[0], t[1], t[2]], beatInBar: 0, span: 4, label: '和弦' }],
  },
  {
    id: 'alberti', name: '阿尔贝蒂低音', emoji: '🌊', beats: 4,
    desc: '低-高-中-高分解（C：C-G-E-G），莫扎特奏鸣曲经典',
    build: (t) => [
      { notes: [t[0]], beatInBar: 0, label: '低' },
      { notes: [t[2]], beatInBar: 1, label: '高' },
      { notes: [t[1]], beatInBar: 2, label: '中' },
      { notes: [t[2]], beatInBar: 3, label: '高' },
    ],
  },
  {
    id: 'waltz', name: '华尔兹', emoji: '💃', beats: 3,
    desc: '蓬-恰-恰：低音 + 两下和弦，3/4 圆舞曲',
    build: (t) => [
      { notes: [t[0] - 12], beatInBar: 0, label: '低音' },
      { notes: [t[1], t[2]], beatInBar: 1, label: '恰' },
      { notes: [t[1], t[2]], beatInBar: 2, label: '恰' },
    ],
  },
  {
    id: 'broken', name: '分解琶音', emoji: '🎶', beats: 4,
    desc: '根-三-五-八上行琶音，流动感伴奏',
    build: (t) => [
      { notes: [t[0]], beatInBar: 0, label: '根' },
      { notes: [t[1]], beatInBar: 1, label: '三' },
      { notes: [t[2]], beatInBar: 2, label: '五' },
      { notes: [t[0] + 12], beatInBar: 3, label: '八' },
    ],
  },
  {
    id: 'bass', name: '行进低音', emoji: '🎸', beats: 4,
    desc: '根-五-六-五布吉低音，布鲁斯/摇滚常用',
    build: (t) => [
      { notes: [t[0]], beatInBar: 0, label: '根' },
      { notes: [t[2]], beatInBar: 1, label: '五' },
      { notes: [t[0] + 9], beatInBar: 2, label: '六' },
      { notes: [t[2]], beatInBar: 3, label: '五' },
    ],
  },
];

/** 按 id 取伴奏型 */
export function getPattern(id) {
  return PATTERNS.find((p) => p.id === id) || PATTERNS[0];
}

const pc = (m) => ((m % 12) + 12) % 12;

export class Accompaniment {
  /**
   * @param {object} opts
   * @param {object} opts.key          调对象（默认 C 大调）
   * @param {object} opts.progression  进行对象（默认万能流行）
   * @param {object} opts.pattern      伴奏型对象（默认柱式）
   * @param {number} opts.baseMidi     根音落点的参考最低音（默认 48 = C3）
   * @param {boolean} opts.octaveAgnostic 是否忽略八度（只比音级），默认 false
   * @param {number} opts.bpm          速度（仅供示范/节拍器，不影响判分）
   */
  constructor(opts = {}) {
    this.key = opts.key || PROG_KEYS[0];
    this.progression = opts.progression || PROGRESSIONS[0];
    this.pattern = opts.pattern || PATTERNS[0];
    this.baseMidi = opts.baseMidi ?? 48;
    this.octaveAgnostic = opts.octaveAgnostic ?? false;
    this.bpm = opts.bpm ?? 90;
    this._build();
  }

  _build() {
    const chords = expandProgression(this.key, this.progression.degrees);
    const steps = [];
    let beatAcc = 0;
    const base12 = pc(this.baseMidi);
    chords.forEach((ch, ci) => {
      const rootPc = NOTE_NAMES.indexOf(ch.root);
      const pcs = triadPcs(rootPc, ch.suffix); // [root, third, fifth]
      // 把根音落到 baseMidi 之上最近的同音级处，整段进行落点平稳
      const rootMidi = this.baseMidi + ((rootPc - base12 + 12) % 12);
      const thirdMidi = rootMidi + ((pcs[1] - rootPc + 12) % 12);
      const fifthMidi = rootMidi + ((pcs[2] - rootPc + 12) % 12);
      const tones = [rootMidi, thirdMidi, fifthMidi];
      this.pattern.build(tones).forEach((s) => {
        steps.push({
          chordIndex: ci,
          symbol: ch.symbol,
          roman: ch.roman,
          notes: s.notes.slice(),
          pcs: s.notes.map(pc),
          names: s.notes.map((m) => NOTE_NAMES[pc(m)]),
          label: s.label,
          beat: beatAcc + s.beatInBar,
          beatInBar: s.beatInBar,
        });
      });
      beatAcc += this.pattern.beats;
    });
    this.steps = steps;
    this.totalBeats = beatAcc;
    this.chords = chords;
    this.cursor = 0;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.maxCombo = 0;
    const all = steps.flatMap((s) => s.notes);
    this.range = all.length ? [Math.min(...all), Math.max(...all)] : [this.baseMidi, this.baseMidi + 12];
  }

  current() { return this.steps[this.cursor] || null; }
  remaining() { return this.steps.length - this.cursor; }
  done() { return this.cursor >= this.steps.length; }

  /** 判断按下的音集合是否精确匹配当前步（和弦型需按齐） */
  matches(midiSet) {
    const cur = this.current();
    if (!cur) return false;
    const want = new Set(this.octaveAgnostic ? cur.pcs : cur.notes);
    const got = new Set([...midiSet].map((m) => (this.octaveAgnostic ? pc(m) : m)));
    if (want.size !== got.size) return false;
    for (const w of want) if (!got.has(w)) return false;
    return true;
  }

  /** 当前按住的音里是否有"既不属于当前步"的明显错音（用于记 miss） */
  hasWrong(midiSet) {
    const cur = this.current();
    if (!cur) return false;
    const want = new Set(this.octaveAgnostic ? cur.pcs : cur.notes);
    for (const m of midiSet) {
      const v = this.octaveAgnostic ? pc(m) : m;
      if (!want.has(v)) return true;
    }
    return false;
  }

  /** 喂入当前按住的全部音；精确匹配则前进 */
  press(midiSet) {
    const cur = this.current();
    if (!cur) return { ok: false, advanced: false, done: true };
    if (this.matches(midiSet)) {
      this.hits++;
      this.combo++;
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      this.cursor++;
      return { ok: true, advanced: true, done: this.done() };
    }
    return { ok: false, advanced: false, done: false };
  }

  /** 记一次错误尝试（弹了不属于当前步的音） */
  fail() { this.misses++; this.combo = 0; }

  reset() {
    this.cursor = 0;
    this.hits = 0;
    this.misses = 0;
    this.combo = 0;
    this.maxCombo = 0;
  }

  summary() {
    const total = this.steps.length;
    const attempts = this.hits + this.misses;
    const accuracy = attempts ? Math.round((this.hits / attempts) * 100) : 0;
    let stars = 1;
    if (accuracy >= 95) stars = 3;
    else if (accuracy >= 80) stars = 2;
    return { total, hits: this.hits, misses: this.misses, maxCombo: this.maxCombo, accuracy, stars };
  }
}
