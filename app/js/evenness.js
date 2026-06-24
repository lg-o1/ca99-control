/**
 * evenness.js — 颗粒性 / 均匀度（scale evenness）纯逻辑引擎
 *
 * 训练"快速跑动（音阶/琶音）里每个音的力度与时值都要均匀"。
 * 这是钢琴基本功"颗粒性"：连弹一串音，理想情况下每个音
 *  - 力度（velocity）几乎相等  → 没有忽强忽弱
 *  - 间隔（IOI 时值）几乎相等  → 没有忽快忽慢
 * 引擎用变异系数 CV（标准差 / 均值）衡量"离散程度"，CV 越小越均匀。
 * 与"力度控制"（打到某个目标档位）、"节拍稳定度"（跟匀速拍）都不同：
 * 这里同时考核一串音的"力度一致性 + 时值一致性"，焦点是颗粒感。
 * 纯逻辑：不碰 MIDI / DOM。
 */

/** 算术平均；空数组返回 0。 */
export function mean(arr) {
  const a = (arr || []).filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (!a.length) return 0;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

/** 总体标准差（除以 n）；不足 1 个返回 0。 */
export function stddev(arr) {
  const a = (arr || []).filter((x) => typeof x === 'number' && !Number.isNaN(x));
  if (a.length < 1) return 0;
  const m = mean(a);
  const v = a.reduce((s, x) => s + (x - m) * (x - m), 0) / a.length;
  return Math.sqrt(v);
}

/** 变异系数 CV = 标准差 / 均值；均值<=0 返回 0。越小越均匀。 */
export function cv(arr) {
  const m = mean(arr);
  if (m <= 0) return 0;
  return stddev(arr) / m;
}

/** 把时间戳序列转相邻间隔 IOI（毫秒）。n 个时间 -> n-1 个间隔。 */
export function toIois(times) {
  const ts = (times || []).filter((t) => typeof t === 'number' && !Number.isNaN(t));
  const out = [];
  for (let i = 1; i < ts.length; i++) out.push(ts[i] - ts[i - 1]);
  return out;
}

/** CV -> 0..1 分（0 分 CV=tol，满分 CV=0），线性夹取。 */
export function cvToScore(cvVal, tol) {
  const t = tol > 0 ? tol : 1;
  return Math.max(0, Math.min(1, 1 - cvVal / t));
}

/**
 * 给一串音（含力度+时间）打"均匀度"分。
 * @param {Array<{velocity:number,time:number}>} events 依次弹的音
 * @param {object} opts
 * @param {number} opts.velTol 力度 CV 容差（达到此 CV=0 分，默认 0.22 即 22% 离散）
 * @param {number} opts.ioiTol 时值 CV 容差（默认 0.22）
 * @param {number} opts.velWeight 力度分权重（默认 0.5）
 * @returns {{score,velScore,timingScore,velCV,ioiCV,velMean,ioiMean,bpm,
 *           velocities,iois,velDev,ioiDev,n}}
 */
export function evennessScore(events, opts = {}) {
  const velTol = opts.velTol ?? 0.22;
  const ioiTol = opts.ioiTol ?? 0.22;
  const velWeight = opts.velWeight ?? 0.5;
  const evs = (events || []).filter((e) => e && typeof e.time === 'number');
  const velocities = evs.map((e) => (typeof e.velocity === 'number' ? e.velocity : 0));
  const times = evs.map((e) => e.time);
  const iois = toIois(times);
  const n = evs.length;
  if (n < 3 || iois.length < 2) {
    return {
      score: 0, velScore: 0, timingScore: 0, velCV: 0, ioiCV: 0,
      velMean: mean(velocities), ioiMean: mean(iois), bpm: 0,
      velocities, iois, velDev: [], ioiDev: [], n,
    };
  }
  const velMean = mean(velocities);
  const ioiMean = mean(iois);
  const velCV = cv(velocities);
  const ioiCV = cv(iois);
  const velScore = cvToScore(velCV, velTol);
  const timingScore = cvToScore(ioiCV, ioiTol);
  const w = Math.max(0, Math.min(1, velWeight));
  const score = Math.round(100 * (w * velScore + (1 - w) * timingScore));
  // 每个音相对均值的"相对偏差"（用于 UI 柱状高亮谁忽强忽弱/忽快忽慢）
  const velDev = velocities.map((v) => (velMean > 0 ? (v - velMean) / velMean : 0));
  const ioiDev = iois.map((x) => (ioiMean > 0 ? (x - ioiMean) / ioiMean : 0));
  return {
    score, velScore, timingScore, velCV, ioiCV,
    velMean, ioiMean, bpm: ioiMean > 0 ? 60000 / ioiMean : 0,
    velocities, iois, velDev, ioiDev, n,
  };
}

export class EvennessTrainer {
  /**
   * @param {object} opts
   * @param {number} opts.count   一串跑动的音数（默认 8）
   * @param {number} opts.velTol
   * @param {number} opts.ioiTol
   * @param {number} opts.velWeight
   */
  constructor(opts = {}) {
    this.count = Math.max(3, opts.count ?? 8);
    this.velTol = opts.velTol ?? 0.22;
    this.ioiTol = opts.ioiTol ?? 0.22;
    this.velWeight = opts.velWeight ?? 0.5;
    this.events = [];
    this.rounds = 0;
    this.best = 0;
    this.lastResult = null;
    this.onTap = () => {};      // (event, index1based, count) => void
    this.onComplete = () => {}; // (result) => void
  }

  setCount(c) { this.count = Math.max(3, c | 0); }

  /** 喂一个音；满 count 个自动结算并回调 onComplete，返回结果或 null。 */
  feed(note, velocity, time) {
    if (this.events.length >= this.count) return null;
    const ev = {
      note: note | 0,
      velocity: typeof velocity === 'number' ? velocity : 0,
      time: typeof time === 'number' ? time : 0,
    };
    this.events.push(ev);
    const n = this.events.length;
    this.onTap(ev, n, this.count);
    if (n >= this.count) return this._finish();
    return null;
  }

  _finish() {
    const r = evennessScore(this.events, {
      velTol: this.velTol, ioiTol: this.ioiTol, velWeight: this.velWeight,
    });
    r.events = this.events.slice();
    this.rounds++;
    if (r.score > this.best) this.best = r.score;
    this.lastResult = r;
    this.onComplete(r);
    return r;
  }

  get progress() { return this.events.length; }
  get done() { return this.events.length >= this.count; }

  /** 清空当前这串，保留 best/rounds。 */
  reset() { this.events = []; }
  /** 全部清零。 */
  resetAll() { this.events = []; this.rounds = 0; this.best = 0; this.lastResult = null; }
}
