/**
 * beat-stability.js — 节拍稳定度分析（beat stability）纯逻辑引擎
 *
 * 采集一串敲击/音符的时间戳（ms），分析其节奏稳定度：
 *  - 估算 BPM（按相邻间隔中位数）
 *  - 稳定度评分（基于间隔变异系数 CV，越小越稳）
 *  - 赶拍 / 拖拍 / 稳定 趋势（间隔随时间的线性走向）
 *  - 跟拍模式：相对固定目标 BPM 的平均绝对误差与准度评分
 *
 * 纯逻辑：时间戳由调用方喂入（performance.now()），便于单元测试。
 */

/** 数组中位数 */
export function median(arr) {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** 算术平均 */
export function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/** 样本标准差（n-1；少于 2 个返回 0） */
export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const v = arr.reduce((a, b) => a + (b - m) * (b - m), 0) / (arr.length - 1);
  return Math.sqrt(v);
}

/** 线性回归斜率（y 对索引 0..n-1），用于判断间隔随时间的走向 */
export function slope(arr) {
  const n = arr.length;
  if (n < 2) return 0;
  const xm = (n - 1) / 2;
  const ym = mean(arr);
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xm) * (arr[i] - ym);
    den += (i - xm) * (i - xm);
  }
  return den ? num / den : 0;
}

/** 毫秒间隔 → BPM */
export function msToBpm(ms) {
  return ms > 0 ? 60000 / ms : 0;
}
/** BPM → 毫秒间隔 */
export function bpmToMs(bpm) {
  return bpm > 0 ? 60000 / bpm : 0;
}

export class BeatStability {
  /**
   * @param {object} opts
   * @param {number} opts.targetBpm   跟拍模式的目标 BPM（>0 启用跟拍评估）
   * @param {number} opts.cvFloor     稳定度满分对应的 CV（默认 0.02）
   * @param {number} opts.cvCeil      稳定度 0 分对应的 CV（默认 0.20）
   * @param {number} opts.trendMs     判定赶/拖拍的每拍斜率阈值（ms/拍，默认 4）
   */
  constructor(opts = {}) {
    this.targetBpm = opts.targetBpm || 0;
    this.cvFloor = opts.cvFloor ?? 0.02;
    this.cvCeil = opts.cvCeil ?? 0.20;
    this.trendMs = opts.trendMs ?? 4;
    this.times = [];   // 敲击时间戳（ms，升序）
  }

  /** 记录一次敲击（忽略非递增的时间戳） */
  tap(t) {
    if (this.times.length && t <= this.times[this.times.length - 1]) return false;
    this.times.push(t);
    return true;
  }

  get count() { return this.times.length; }

  /** 相邻间隔（ms）数组 */
  iois() {
    const out = [];
    for (let i = 1; i < this.times.length; i++) out.push(this.times[i] - this.times[i - 1]);
    return out;
  }

  /** 估算 BPM（按间隔中位数，抗离群） */
  bpm() {
    const io = this.iois();
    return io.length ? msToBpm(median(io)) : 0;
  }

  /** 变异系数 CV = 标准差 / 平均（越小越稳） */
  cv() {
    const io = this.iois();
    const m = mean(io);
    return m > 0 ? stddev(io) / m : 0;
  }

  /** 稳定度评分 0..100：CV<=cvFloor 给 100，>=cvCeil 给 0，线性插值 */
  stabilityScore() {
    const io = this.iois();
    if (io.length < 2) return 0;
    const c = this.cv();
    if (c <= this.cvFloor) return 100;
    if (c >= this.cvCeil) return 0;
    const s = 100 * (1 - (c - this.cvFloor) / (this.cvCeil - this.cvFloor));
    return Math.round(s);
  }

  /**
   * 趋势：间隔随时间的走向。
   * slope>0 表示间隔变长 → 越弹越慢 = 拖拍；slope<0 → 越弹越快 = 赶拍。
   * @returns {{slope:number, label:'rushing'|'dragging'|'steady'}}
   */
  trend() {
    const io = this.iois();
    const sl = slope(io);
    let label = 'steady';
    if (sl <= -this.trendMs) label = 'rushing';
    else if (sl >= this.trendMs) label = 'dragging';
    return { slope: sl, label };
  }

  /**
   * 跟拍评估（需 targetBpm>0）：每个间隔与理想间隔的误差。
   * @returns {{ideal:number, errors:number[], meanAbsErr:number, accuracy:number}|null}
   */
  targetEval() {
    if (!this.targetBpm) return null;
    const ideal = bpmToMs(this.targetBpm);
    const errors = this.iois().map((x) => x - ideal);
    const meanAbsErr = mean(errors.map(Math.abs));
    // 准度评分：平均绝对误差占理想间隔比例，0% 误差=100，>=25% 误差=0
    const ratio = ideal > 0 ? meanAbsErr / ideal : 1;
    const accuracy = Math.max(0, Math.round(100 * (1 - Math.min(1, ratio / 0.25))));
    return { ideal, errors, meanAbsErr, accuracy };
  }

  /** 汇总分析 */
  stats() {
    const io = this.iois();
    return {
      count: this.count,
      intervals: io.length,
      bpm: Math.round(this.bpm()),
      meanIoi: Math.round(mean(io)),
      stdMs: Math.round(stddev(io) * 10) / 10,
      cv: Math.round(this.cv() * 1000) / 1000,
      stability: this.stabilityScore(),
      trend: this.trend(),
      target: this.targetEval(),
    };
  }

  reset() { this.times = []; }
}
