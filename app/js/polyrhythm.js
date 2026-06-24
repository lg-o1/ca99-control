/**
 * polyrhythm.js — 复节奏训练（polyrhythm）纯逻辑引擎
 *
 * 复节奏 = 两个声部在同一段时间里平分成不同的份数，如 3:2（一只手 3 下、
 * 另一只手 2 下，落在同一个周期里）。最经典的练习是双手对抗：左手匀速敲 a 下、
 * 右手匀速敲 b 下，只有周期起点两手同时落键，中间各走各的。
 *
 * 引擎为两个声部各生成"理想落点网格"，把玩家的每次敲击按声部匹配到最近的
 * 未命中落点，按时间误差判 完美/良好/漏拍/多敲，最后汇总两声部的命中率与
 * 平均误差。时间全部以毫秒计；判定是纯函数，便于确定性单元测试。
 */

/** 预置复节奏比例：a=声部A每周期敲击数，b=声部B每周期敲击数 */
export const POLY_RATIOS = [
  { id: '2:3', a: 2, b: 3, name: '2 对 3', desc: '入门：两手 2:3 交错' },
  { id: '3:2', a: 3, b: 2, name: '3 对 2', desc: '最经典的复节奏' },
  { id: '3:4', a: 3, b: 4, name: '3 对 4', desc: '进阶：3:4 细密交错' },
  { id: '4:3', a: 4, b: 3, name: '4 对 3', desc: '进阶：4:3 细密交错' },
];

/** 判定时间窗口（毫秒） */
export const DEFAULT_TOLERANCE = { perfect: 55, good: 120 };

/** 根据时间误差（毫秒绝对值）与容差判定评级 */
export function rateError(errMs, tol = DEFAULT_TOLERANCE) {
  const a = Math.abs(errMs);
  if (a <= tol.perfect) return 'perfect';
  if (a <= tol.good) return 'good';
  return 'miss';
}

/**
 * 为一个声部生成理想落点时间戳。
 * @param {number} taps   每周期敲击数（如 3）
 * @param {number} period 一个周期的时长（毫秒）
 * @param {number} cycles 周期数
 * @param {number} start  第一个落点的绝对时刻
 * @returns {number[]}
 */
export function buildVoiceOnsets(taps, period, cycles, start = 0) {
  const out = [];
  for (let c = 0; c < cycles; c++) {
    for (let i = 0; i < taps; i++) {
      out.push(start + c * period + (i * period) / taps);
    }
  }
  return out;
}

/**
 * 把 a:b 复节奏在一个周期内的两声部落点合并成统一网格（用于可视化/教学）。
 * 返回按时间排序的 [{t, voices:['A'|'B'...]}]，t 为周期内的相对位置（0..period）。
 */
export function combinedGrid(a, b, period = 1) {
  const map = new Map();
  const push = (t, v) => {
    const key = Math.round(t * 1e6) / 1e6;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(v);
  };
  for (let i = 0; i < a; i++) push((i * period) / a, 'A');
  for (let i = 0; i < b; i++) push((i * period) / b, 'B');
  return [...map.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([t, set]) => ({ t, voices: [...set].sort() }));
}

/** 一个声部的命中状态容器 */
class VoiceState {
  constructor(onsets) {
    this.onsets = onsets;
    this.hit = onsets.map(() => false);
    this.results = onsets.map(() => null); // {rating, errMs} | null
    this.perfect = 0;
    this.good = 0;
    this.extras = 0;
    this.taps = 0;
  }
  _nearestUnhit(t) {
    let best = -1, bestErr = Infinity;
    for (let i = 0; i < this.onsets.length; i++) {
      if (this.hit[i]) continue;
      const err = Math.abs(t - this.onsets[i]);
      if (err < bestErr) { bestErr = err; best = i; }
    }
    return best;
  }
  get total() { return this.onsets.length; }
  get avgError() {
    const hits = this.results.filter((r) => r);
    if (!hits.length) return 0;
    return hits.reduce((s, r) => s + Math.abs(r.errMs), 0) / hits.length;
  }
}

export class PolyrhythmTrainer {
  /**
   * @param {object} opts
   * @param {object} opts.ratio  比例对象（默认 3:2）
   * @param {number} opts.bpm    以"周期=多少 BPM 的一拍组"换算；这里用 cycleMs 直接给周期时长
   * @param {number} opts.cycleMs 一个周期时长（毫秒，默认 2000）
   * @param {number} opts.cycles 周期数（默认 2）
   * @param {object} opts.tolerance {perfect, good}
   */
  constructor(opts = {}) {
    this.ratio = opts.ratio || POLY_RATIOS[1];
    this.cycleMs = opts.cycleMs || 2000;
    this.cycles = opts.cycles || 2;
    this.tol = opts.tolerance || { ...DEFAULT_TOLERANCE };
    this.best = 0;
    this.rounds = 0;
    this._reset();
  }

  _reset() {
    this.started = false;
    this.startTime = 0;
    this.A = null;
    this.B = null;
    this.lastResult = null;
  }

  /** 开始一遍：startTime 为周期起点的绝对时刻。返回 {A:[onsets], B:[onsets]} */
  start(startTime = 0) {
    this.startTime = startTime;
    this.A = new VoiceState(buildVoiceOnsets(this.ratio.a, this.cycleMs, this.cycles, startTime));
    this.B = new VoiceState(buildVoiceOnsets(this.ratio.b, this.cycleMs, this.cycles, startTime));
    this.started = true;
    return { A: this.A.onsets.slice(), B: this.B.onsets.slice() };
  }

  _voice(name) { return name === 'B' ? this.B : this.A; }

  /**
   * 某声部敲一下。
   * @param {'A'|'B'} voice
   * @param {number} time 绝对时刻（ms）
   * @returns {{voice,index,rating,errMs}} rating: perfect|good|extra
   */
  tap(voice, time) {
    const v = this._voice(voice === 'B' ? 'B' : 'A');
    const name = voice === 'B' ? 'B' : 'A';
    if (!this.started || !v) return { voice: name, index: -1, rating: 'extra', errMs: null };
    const idx = v._nearestUnhit(time);
    if (idx === -1) { v.extras++; return { voice: name, index: -1, rating: 'extra', errMs: null }; }
    const errMs = time - v.onsets[idx];
    const rating = rateError(errMs, this.tol);
    if (rating === 'miss') { v.extras++; return { voice: name, index: -1, rating: 'extra', errMs }; }
    v.hit[idx] = true;
    v.results[idx] = { rating, errMs };
    v.taps++;
    if (rating === 'perfect') v.perfect++; else v.good++;
    return { voice: name, index: idx, rating, errMs };
  }

  /** 结束一遍，汇总两声部成绩 */
  finish() {
    this.started = false;
    const s = this.summary();
    this.rounds++;
    if (s.score > this.best) this.best = s.score;
    this.lastResult = s;
    return s;
  }

  get totalOnsets() { return (this.A ? this.A.total : 0) + (this.B ? this.B.total : 0); }
  get totalHits() { return (this.A ? this.A.taps : 0) + (this.B ? this.B.taps : 0); }

  /** 综合命中率 */
  get accuracy() { return this.totalOnsets ? this.totalHits / this.totalOnsets : 0; }

  /** 两声部合并平均绝对误差 */
  get avgError() {
    const all = [];
    if (this.A) all.push(...this.A.results.filter((r) => r));
    if (this.B) all.push(...this.B.results.filter((r) => r));
    if (!all.length) return 0;
    return all.reduce((s, r) => s + Math.abs(r.errMs), 0) / all.length;
  }

  _voiceSummary(v) {
    if (!v) return { total: 0, hits: 0, perfect: 0, good: 0, misses: 0, extras: 0, avgError: 0 };
    return {
      total: v.total, hits: v.taps, perfect: v.perfect, good: v.good,
      misses: v.total - v.taps, extras: v.extras, avgError: v.avgError,
    };
  }

  /** 成绩汇总：综合分 = 命中率 70% + 时间精度 30%（误差越小越高） */
  summary() {
    const acc = this.accuracy;
    const avgErr = this.avgError;
    // 时间精度：平均误差 0ms→1，到 good 窗口→0
    const timing = Math.max(0, Math.min(1, 1 - avgErr / this.tol.good));
    const score = Math.round(100 * (0.7 * acc + 0.3 * timing));
    return {
      ratio: this.ratio.id,
      score,
      accuracy: acc,
      avgError: avgErr,
      timing,
      totalOnsets: this.totalOnsets,
      totalHits: this.totalHits,
      A: this._voiceSummary(this.A),
      B: this._voiceSummary(this.B),
    };
  }

  reset() { this._reset(); }
  resetAll() { this._reset(); this.best = 0; this.rounds = 0; this.lastResult = null; }
}
