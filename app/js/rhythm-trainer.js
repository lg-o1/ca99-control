/**
 * rhythm-trainer.js — 节奏跟拍训练（rhythm trainer）纯逻辑引擎
 *
 * 屏幕给出一段节奏型（如四分 / 八分 / 切分），随节拍器在正确的时间点敲击琴键，
 * 引擎按每次敲击与期望落点的时间误差判定 完美 / 良好 / 漏拍 / 多敲，统计得分与连击。
 *
 * 时间全部以毫秒计；判定逻辑是纯函数，便于确定性单元测试——
 * 把"期望落点时间数组 + 敲击时间序列"喂进来即可，无需真实计时器。
 */

/** 预置节奏型：beats 为一小节内的拍点位置（以拍为单位，4/4 拍一小节 0..4） */
export const RHYTHM_PATTERNS = [
  { id: 'quarter', name: '四分音符', desc: '稳稳的 1 2 3 4', beats: [0, 1, 2, 3] },
  { id: 'eighth', name: '八分音符', desc: '一拍两下', beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5] },
  { id: 'mixed', name: '混合节奏', desc: '四分与八分混搭', beats: [0, 1, 1.5, 2, 3, 3.5] },
  { id: 'syncopation', name: '切分节奏', desc: '弱拍起，找律动', beats: [0, 0.5, 1.5, 2, 2.5, 3.5] },
  { id: 'gallop', name: '附点跳跃', desc: '长—短—长—短', beats: [0, 0.75, 1, 1.75, 2, 2.75, 3, 3.75] },
];

/** 判定时间窗口（毫秒），可在构造时覆盖 */
export const DEFAULT_TOLERANCE = { perfect: 55, good: 120 };

/** 把拍点位置数组按 BPM 换算成毫秒时间戳数组（startTime 为第一拍的绝对时刻） */
export function beatsToOnsets(beats, bpm, startTime = 0) {
  const beatMs = 60000 / bpm;
  return beats.map((b) => startTime + b * beatMs);
}

/** 根据时间误差（毫秒，带符号）与容差判定评级 */
export function rateError(errMs, tol = DEFAULT_TOLERANCE) {
  const a = Math.abs(errMs);
  if (a <= tol.perfect) return 'perfect';
  if (a <= tol.good) return 'good';
  return 'miss';
}

/** 一个小节的总时长（毫秒）= 拍数 × 每拍毫秒；拍数默认 4 */
export function barDurationMs(bpm, beatsPerBar = 4) {
  return (60000 / bpm) * beatsPerBar;
}

export class RhythmTrainer {
  /**
   * @param {object} opts
   * @param {number} opts.bpm            速度（默认 90）
   * @param {object} opts.pattern        节奏型对象（默认四分音符）
   * @param {object} opts.tolerance      {perfect, good} 毫秒窗口
   * @param {number} opts.beatsPerBar    每小节拍数（默认 4）
   */
  constructor(opts = {}) {
    this.bpm = opts.bpm || 90;
    this.pattern = opts.pattern || RHYTHM_PATTERNS[0];
    this.tol = opts.tolerance || { ...DEFAULT_TOLERANCE };
    this.beatsPerBar = opts.beatsPerBar || 4;
    this._resetState();
  }

  _resetState() {
    this.onsets = [];      // 期望落点时间戳（ms）
    this.hit = [];         // 每个落点是否已命中
    this.results = [];     // 每个落点的判定 {rating, errMs} 或 null（漏拍）
    this.started = false;
    this.startTime = 0;
    this.score = 0;
    this.combo = 0;
    this.best = 0;
    this.perfect = 0;
    this.good = 0;
    this.misses = 0;       // 漏掉的期望落点（finish 时统计）
    this.extras = 0;       // 不在任何窗口内的多余敲击
    this.taps = 0;         // 有效敲击次数（命中落点的）
  }

  /** 开始一遍：startTime 为第一拍的绝对时刻（ms） */
  start(startTime) {
    this._resetState();
    this.startTime = startTime;
    this.onsets = beatsToOnsets(this.pattern.beats, this.bpm, startTime);
    this.hit = this.onsets.map(() => false);
    this.results = this.onsets.map(() => null);
    this.started = true;
    return this.onsets.slice();
  }

  /** 找出距 tapTime 最近、且尚未命中的落点下标；返回 -1 表示没有未命中的落点 */
  _nearestUnhit(tapTime) {
    let best = -1, bestErr = Infinity;
    for (let i = 0; i < this.onsets.length; i++) {
      if (this.hit[i]) continue;
      const err = Math.abs(tapTime - this.onsets[i]);
      if (err < bestErr) { bestErr = err; best = i; }
    }
    return best;
  }

  /**
   * 敲一下。返回判定结果：
   *   { index, rating: 'perfect'|'good', errMs }  命中某落点
   *   { index: -1, rating: 'extra', errMs: null } 不在任何 good 窗口内（多敲）
   */
  tap(tapTime) {
    if (!this.started) return { index: -1, rating: 'extra', errMs: null };
    const idx = this._nearestUnhit(tapTime);
    if (idx === -1) {
      this.extras++; this.combo = 0;
      return { index: -1, rating: 'extra', errMs: null };
    }
    const errMs = tapTime - this.onsets[idx];
    const rating = rateError(errMs, this.tol);
    if (rating === 'miss') {
      // 离最近落点也太远 → 视为多敲，不消耗该落点
      this.extras++; this.combo = 0;
      return { index: -1, rating: 'extra', errMs };
    }
    this.hit[idx] = true;
    this.results[idx] = { rating, errMs };
    this.taps++;
    if (rating === 'perfect') { this.perfect++; this.score += 2; }
    else { this.good++; this.score += 1; }
    this.combo++;
    if (this.combo > this.best) this.best = this.combo;
    return { index: idx, rating, errMs };
  }

  /** 结束一遍：把所有未命中的落点记为漏拍。返回成绩汇总 */
  finish() {
    this.misses = this.hit.filter((h) => !h).length;
    this.started = false;
    return this.summary();
  }

  /** 期望落点总数 */
  get total() { return this.onsets.length; }

  /** 命中率：命中落点数 / 期望落点数 */
  get accuracy() {
    return this.total ? this.taps / this.total : 0;
  }

  /** 平均绝对时间误差（毫秒），只统计命中的 */
  get avgError() {
    const hits = this.results.filter((r) => r);
    if (!hits.length) return 0;
    return hits.reduce((s, r) => s + Math.abs(r.errMs), 0) / hits.length;
  }

  /** 成绩汇总，可直接喂给成就仪表盘 record() */
  summary() {
    return {
      total: this.total,
      hits: this.taps,
      perfect: this.perfect,
      good: this.good,
      misses: this.total - this.taps,
      extras: this.extras,
      score: this.score,
      best: this.best,
      accuracy: this.accuracy,
      avgError: this.avgError,
    };
  }
}
