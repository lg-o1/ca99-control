/**
 * tempo-ramp.js — 速度渐变（accelerando / ritardando，含 rubato 收放）纯逻辑引擎
 *
 * 训练"在一串音里平滑地把速度推快（渐快 accel.）或拉慢（渐慢 rit.）"。
 * 与节拍稳定度（追求匀速）相反，这里追求"有方向地、平滑地变速"。
 * 输入是每次击键的时间戳，引擎算相邻音的间隔 IOI，间隔变小=变快、变大=变慢。
 * 纯逻辑：不碰 MIDI / DOM。
 */

/** 两种速度渐变方向。iioSign = 期望的相邻 IOI 差符号（accel→间隔变小→-1）。 */
export const TEMPO_DIRECTIONS = {
  accel: { key: 'accel', name: '渐快', sym: 'accel. »', iioSign: -1 },
  rit:   { key: 'rit',   name: '渐慢', sym: 'rit. «',   iioSign: 1 },
};

/** 把时间戳序列转成相邻间隔 IOI（毫秒）。n 个时间 -> n-1 个间隔。 */
export function toIois(times) {
  const ts = (times || []).filter((t) => typeof t === 'number' && !Number.isNaN(t));
  const out = [];
  for (let i = 1; i < ts.length; i++) out.push(ts[i] - ts[i - 1]);
  return out;
}

/** IOI(ms) -> BPM（每分钟拍数）。<=0 返回 0。 */
export function ioiToBpm(ioi) { return ioi > 0 ? 60000 / ioi : 0; }

/** 在 start..end 之间线性取 count 个值（画理想斜坡参考线，用于 IOI 或 BPM 均可） */
export function idealLine(start, end, count) {
  if (count <= 1) return [start];
  const out = [];
  for (let i = 0; i < count; i++) out.push(start + (end - start) * i / (count - 1));
  return out;
}

/**
 * 给一串击键时间打"速度渐变"分。
 * @param {number[]} times 依次击键的时间戳（ms）
 * @param {object} opts
 * @param {'accel'|'rit'} opts.direction 期望方向
 * @param {number} opts.minRatio 达到满分跨度分所需的"末段/首段速度比"偏离度（默认 0.4，即快/慢 40%）
 * @param {number} opts.smoothTol 平滑度容差：IOI 相对理想斜坡的平均相对偏差到此即 0 分（默认 0.25）
 * @returns {{score,monotonic,smoothness,ratio,spanScore,steps,correctSteps,iois,bpms,idealIois}}
 */
export function tempoScore(times, opts = {}) {
  const dir = opts.direction === 'rit' ? 'rit' : 'accel';
  const sign = TEMPO_DIRECTIONS[dir].iioSign;
  const minRatio = opts.minRatio ?? 0.4;
  const tol = opts.smoothTol ?? 0.25;
  const iois = toIois(times);
  const m = iois.length;
  if (m < 2) {
    return { score: 0, monotonic: 0, smoothness: 0, ratio: 1, spanScore: 0, steps: 0, correctSteps: 0, iois, bpms: iois.map(ioiToBpm), idealIois: iois.slice() };
  }
  // 方向正确度：相邻 IOI 差符号与期望一致的比例
  let correct = 0;
  for (let i = 0; i < m - 1; i++) {
    if (Math.sign(iois[i + 1] - iois[i]) === sign) correct++;
  }
  const steps = m - 1;
  const monotonic = correct / steps;
  // 跨度分：末段相对首段的速度变化量。accel 看间隔变小(first/last-1)，rit 看间隔变大(last/first-1)
  const first = iois[0], last = iois[m - 1];
  let change = 0;
  if (dir === 'accel') change = first > 0 ? (first - last) / first : 0; // 越快越正
  else change = first > 0 ? (last - first) / first : 0;                 // 越慢越正
  const spanScore = Math.max(0, Math.min(1, change / minRatio));
  const ratio = first > 0 ? last / first : 1;
  // 平滑度：IOI 与"首→尾线性斜坡"的平均相对偏差（除以均值，抗速度量级影响）
  const ideal = idealLine(first, last, m);
  const meanIoi = iois.reduce((a, b) => a + b, 0) / m || 1;
  let sumDev = 0;
  for (let i = 0; i < m; i++) sumDev += Math.abs(iois[i] - ideal[i]);
  const relDev = (sumDev / m) / meanIoi;
  const smoothness = Math.max(0, Math.min(1, 1 - relDev / tol));
  const score = Math.round(100 * (0.5 * monotonic + 0.2 * spanScore + 0.3 * smoothness));
  return { score, monotonic, smoothness, ratio, spanScore, steps, correctSteps: correct, iois, bpms: iois.map(ioiToBpm), idealIois: ideal };
}

export class TempoRampTrainer {
  /**
   * @param {object} opts
   * @param {'accel'|'rit'} opts.direction
   * @param {number} opts.count    一条曲线包含的击键数（默认 9 -> 8 个间隔）
   * @param {number} opts.minRatio
   * @param {number} opts.smoothTol
   */
  constructor(opts = {}) {
    this.direction = opts.direction === 'rit' ? 'rit' : 'accel';
    this.count = Math.max(3, opts.count ?? 9);
    this.minRatio = opts.minRatio ?? 0.4;
    this.smoothTol = opts.smoothTol ?? 0.25;
    this.times = [];
    this.rounds = 0;
    this.best = 0;
    this.lastResult = null;
    this.onTap = () => {};      // (time, index1based, count, lastIoi|null) => void
    this.onComplete = () => {}; // (result) => void
  }

  setDirection(d) { this.direction = d === 'rit' ? 'rit' : 'accel'; }
  setCount(c) { this.count = Math.max(3, c | 0); }

  /** 喂入一次击键时间戳；满 count 个自动结算并回调 onComplete，返回结果或 null */
  feed(time) {
    if (this.times.length >= this.count) return null;
    const t = typeof time === 'number' ? time : 0;
    this.times.push(t);
    const n = this.times.length;
    const lastIoi = n >= 2 ? this.times[n - 1] - this.times[n - 2] : null;
    this.onTap(t, n, this.count, lastIoi);
    if (n >= this.count) return this._finish();
    return null;
  }

  _finish() {
    const r = tempoScore(this.times, {
      direction: this.direction, minRatio: this.minRatio, smoothTol: this.smoothTol,
    });
    r.times = this.times.slice();
    r.direction = this.direction;
    this.rounds++;
    if (r.score > this.best) this.best = r.score;
    this.lastResult = r;
    this.onComplete(r);
    return r;
  }

  get progress() { return this.times.length; }
  get done() { return this.times.length >= this.count; }

  /** 清空当前曲线，保留 best/rounds */
  reset() { this.times = []; }
  /** 全部清零 */
  resetAll() { this.times = []; this.rounds = 0; this.best = 0; this.lastResult = null; }
}
