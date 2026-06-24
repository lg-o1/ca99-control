/**
 * score-follow.js — Synthesia 式"曲谱跟弹"练习引擎（纯逻辑，可单元测试）
 *
 * 给一首内置乐曲（单旋律线），把每个音符放在时间轴上（按 BPM 把"拍"换成毫秒）。
 * 播放时一个"播放头"沿时间前进；玩家在正确时刻弹出正确的键就判定 PERFECT/GOOD，
 * 过了判定窗还没弹就算 MISS——和 Synthesia / 节奏游戏一样按"音高 + 时机"双重打分。
 *
 * UI 层（app.js）负责：每帧把 performance.now() 换成播放头时间 t（毫秒），
 * 调用 expire(t) 自动判漏弹、judge(midi,t) 判定一次弹奏、active/upcoming 取要画的音符。
 * 本文件不依赖任何浏览器 API。
 */

export const GRADE = { PERFECT: 'perfect', GOOD: 'good', MISS: 'miss' };

/** 拍 -> 毫秒 */
export function beatToMs(beat, bpm) { return (beat * 60000) / bpm; }

/** 音级（0..11） */
function pcOf(m) { return ((m % 12) + 12) % 12; }

/**
 * 内置乐曲库。每首：{ id, title, clef, bpm, seq }
 * seq 为顺序记谱：[midi, durBeats]，midi 为 null 表示休止（只推进拍数、不出音符）。
 * 全部为公有领域童谣/经典旋律，单手单音旋律线，适合识谱+跟弹。
 */
export const SONGS = [
  {
    id: 'twinkle', title: '小星星 Twinkle Twinkle', clef: 'treble', bpm: 88,
    seq: [
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
      [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
      [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
    ],
  },
  {
    id: 'ode', title: '欢乐颂 Ode to Joy', clef: 'treble', bpm: 96,
    seq: [
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
      [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, 0.5], [62, 2],
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
      [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, 0.5], [60, 2],
    ],
  },
  {
    id: 'mary', title: '玛丽的小羊 Mary Had a Little Lamb', clef: 'treble', bpm: 92,
    seq: [
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 2],
      [62, 1], [62, 1], [62, 2], [64, 1], [67, 1], [67, 2],
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 1], [64, 1],
      [62, 1], [62, 1], [64, 1], [62, 1], [60, 4],
    ],
  },
  {
    id: 'jingle', title: '铃儿响叮当 Jingle Bells', clef: 'treble', bpm: 104,
    seq: [
      [64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2],
      [64, 1], [67, 1], [60, 1], [62, 1], [64, 4],
      [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5],
      [64, 1], [62, 1], [62, 1], [64, 1], [62, 2], [67, 2],
    ],
  },
];

/** 按 id 取乐曲 */
export function getSong(id) { return SONGS.find((s) => s.id === id) || SONGS[0]; }

export class ScoreFollow {
  /**
   * @param {object} song 乐曲定义（见 SONGS）
   * @param {object} opts
   *   bpm 覆盖速度（默认用 song.bpm）
   *   octaveAgnostic 是否忽略八度（简单模式，只比音名）
   *   perfectMs / goodMs 判定窗（毫秒，距目标时刻的容差）
   */
  constructor(song, opts = {}) {
    this.song = song;
    this.bpm = opts.bpm || song.bpm || 90;
    this.clef = song.clef || 'treble';
    this.octaveAgnostic = !!opts.octaveAgnostic;
    this.perfectMs = opts.perfectMs ?? 130;
    this.goodMs = opts.goodMs ?? 320;
    this._build();
  }

  _build() {
    let beat = 0; this.notes = []; let i = 0;
    for (const [midi, dur] of this.song.seq) {
      if (midi != null) {
        this.notes.push({
          i: i++, midi, beat, dur,
          ms: beatToMs(beat, this.bpm), durMs: beatToMs(dur, this.bpm),
          judged: false, grade: null, deltaMs: null,
        });
      }
      beat += dur;
    }
    this.totalBeats = beat;
    this.perfect = 0; this.good = 0; this.miss = 0;
    this.combo = 0; this.maxCombo = 0; this.score = 0;
  }

  reset() { this._build(); }

  get total() { return this.notes.length; }
  get durationMs() { return beatToMs(this.totalBeats, this.bpm); }
  get judgedCount() { return this.perfect + this.good + this.miss; }
  get done() { return this.notes.length > 0 && this.notes.every((n) => n.judged); }
  get accuracy() { return this.judgedCount ? (this.perfect + this.good) / this.judgedCount : 0; }

  /** 音高范围 [lo,hi]（MIDI），UI 用于设置键盘可见区间 */
  get range() {
    if (!this.notes.length) return [60, 72];
    const ms = this.notes.map((n) => n.midi);
    return [Math.min(...ms), Math.max(...ms)];
  }

  matches(a, b) { return this.octaveAgnostic ? pcOf(a) === pcOf(b) : a === b; }

  /**
   * 判定一次弹奏：在播放头时间 t（毫秒）找最近的、音高匹配且仍在判定窗内的未判音符。
   * @returns {{grade, note, deltaMs}} grade=null 表示这次弹奏没有可判定的目标（多弹/弹错时机）
   */
  judge(midi, t) {
    let best = null, bd = Infinity;
    for (const n of this.notes) {
      if (n.judged) continue;
      if (!this.matches(n.midi, midi)) continue;
      const d = Math.abs(t - n.ms);
      if (d <= this.goodMs && d < bd) { best = n; bd = d; }
    }
    if (!best) return { grade: null, note: null, deltaMs: null };
    const delta = t - best.ms;
    const grade = Math.abs(delta) <= this.perfectMs ? GRADE.PERFECT : GRADE.GOOD;
    best.judged = true; best.grade = grade; best.deltaMs = delta;
    const comboBonus = Math.min(this.combo, 20);
    if (grade === GRADE.PERFECT) { this.perfect++; this.score += 100 + comboBonus * 5; }
    else { this.good++; this.score += 50 + comboBonus * 2; }
    this.combo++; if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    return { grade, note: best, deltaMs: delta };
  }

  /** 把已经过了判定窗仍未弹的音符标记为 MISS（每帧调用），返回新判漏的音符 */
  expire(t) {
    const missed = [];
    for (const n of this.notes) {
      if (n.judged) continue;
      if (t - n.ms > this.goodMs) { n.judged = true; n.grade = GRADE.MISS; this.miss++; this.combo = 0; missed.push(n); }
    }
    return missed;
  }

  /** 当前"该弹"的音符（判定窗覆盖 t 的未判音符） */
  active(t) {
    return this.notes.filter((n) => !n.judged && Math.abs(n.ms - t) <= this.goodMs);
  }

  /** 即将到来 + 仍可弹的音符（用于绘制下落高速路），aheadMs 为向前看的毫秒数 */
  upcoming(t, aheadMs) {
    return this.notes.filter((n) => !n.judged && n.ms >= t - this.goodMs && n.ms <= t + aheadMs);
  }

  /** 星级评定：3 星 ≥90%，2 星 ≥70%，1 星 ≥50%，否则 0 */
  get stars() {
    const a = this.accuracy;
    if (a >= 0.9) return 3;
    if (a >= 0.7) return 2;
    if (a >= 0.5) return 1;
    return 0;
  }

  summary() {
    return {
      total: this.total, perfect: this.perfect, good: this.good, miss: this.miss,
      maxCombo: this.maxCombo, score: this.score,
      accuracy: Math.round(this.accuracy * 100), stars: this.stars,
    };
  }
}
