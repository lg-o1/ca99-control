/**
 * trill.js — 颤音速度训练（trill）纯逻辑引擎
 *
 * 颤音 = 在两个相邻音之间快速交替（如 C–D–C–D–C–D…）。本模块给定两个目标音
 * （lower / upper），玩家尽量快而匀地交替弹它们。引擎统计：
 *   - 速度 speed：每秒"敲击数"(notes/sec)，颤音速度通常按每秒交替次数 = notes/2/sec
 *   - 均匀度 evenness：相邻击键间隔(IOI)的变异系数(CV)越小越匀
 *   - 交替正确性：每个音应当与上一个不同（在两个目标音之间来回）；
 *     弹了非目标音 = wrongNote；连续两次同一个目标音 = repeat（没交替）
 *
 * 纯逻辑：音符与时间戳由调用方喂入，便于单元测试。
 */

/** 数组均值 */
export function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/** 总体标准差 */
export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
}

/** 变异系数 */
export function cv(arr) {
  const m = mean(arr);
  return m > 0 ? stddev(arr) / m : 0;
}

/** 均匀度评分：CV<=0 给 100，>=loose 给 0，线性 */
export function evennessScore(iois, loose = 0.5) {
  if (iois.length < 2) return 100;
  const c = cv(iois);
  if (c <= 0) return 100;
  if (c >= loose) return 0;
  return Math.round(100 * (1 - c / loose));
}

/** 颤音速度：每秒交替次数（= 每秒敲击数 / 2） */
export function trillHz(iois) {
  const m = mean(iois);
  if (m <= 0) return 0;
  return 1000 / m / 2;
}

export class TrillTrainer {
  /**
   * @param {object} opts
   * @param {number} opts.lower      下方目标音 MIDI（默认 60 = C4）
   * @param {number} opts.upper      上方目标音 MIDI（默认 62 = D4）
   * @param {number} opts.taps       需采集的敲击数（默认 16）
   * @param {number} opts.targetHz   目标颤音速度（次/秒，默认 6）
   * @param {number} opts.evenLoose  均匀度 CV 满偏阈值（默认 0.5）
   */
  constructor(opts = {}) {
    this.lower = opts.lower ?? 60;
    this.upper = opts.upper ?? 62;
    this.taps = opts.taps ?? 16;
    this.targetHz = opts.targetHz ?? 6;
    this.evenLoose = opts.evenLoose ?? 0.5;
    this.reset();
  }

  reset() {
    this.hits = [];        // 命中目标音的时间戳序列
    this.lastNote = null;  // 上一个命中的目标音
    this.iois = [];        // 相邻命中之间的间隔
    this.wrongNotes = 0;   // 弹了非目标音的次数
    this.repeats = 0;      // 连续同音（没交替）的次数
    this.done = false;
    this.lastResult = null;
    this.best = 0;
    this.bestHz = 0;
    this.runs = 0;
    this.onTap = () => {};      // (info)
    this.onComplete = () => {}; // (result)
  }

  get count() { return this.hits.length; }

  /** 是目标音之一？ */
  isTarget(note) {
    return note === this.lower || note === this.upper;
  }

  /**
   * 喂入一次敲击。
   * @returns {'wrong'|'repeat'|'hit'|'done'|'idle'}
   */
  feed(note, t) {
    if (this.done) return 'idle';
    if (!this.isTarget(note)) {
      this.wrongNotes++;
      this.onTap({ kind: 'wrong', note });
      return 'wrong';
    }
    let kind = 'hit';
    if (this.lastNote === note) {
      // 连续同一个目标音：没交替
      this.repeats++;
      kind = 'repeat';
    }
    if (this.lastNote !== null) this.iois.push(t - this.hits[this.hits.length - 1]);
    this.hits.push(t);
    this.lastNote = note;
    this.onTap({ kind, note });
    if (this.hits.length >= this.taps) {
      this._finish();
      return 'done';
    }
    return kind;
  }

  _finish() {
    if (this.done) return;
    const speedHz = trillHz(this.iois);
    const evenness = evennessScore(this.iois, this.evenLoose);
    const speedScore = Math.max(0, Math.min(100, Math.round((speedHz / this.targetHz) * 100)));
    // 综合：均匀 50% + 速度达标 50%，再按错误扣分（每个 wrongNote -6，每个 repeat -4）
    let score = Math.round(evenness * 0.5 + speedScore * 0.5);
    score = Math.max(0, score - this.wrongNotes * 6 - this.repeats * 4);
    this.lastResult = {
      speedHz, evenness, speedScore, score,
      wrongNotes: this.wrongNotes, repeats: this.repeats, taps: this.hits.length,
    };
    this.done = true;
    this.runs++;
    if (score > this.best) this.best = score;
    if (speedHz > this.bestHz) this.bestHz = speedHz;
    this.onComplete(this.lastResult);
  }

  /** 手动结束（提前停止时调用） */
  finish() { this._finish(); }

  /** 开新一轮，保留 best/bestHz/runs */
  restart() {
    this.hits = [];
    this.lastNote = null;
    this.iois = [];
    this.wrongNotes = 0;
    this.repeats = 0;
    this.done = false;
    this.lastResult = null;
  }
}
