/**
 * crescendo.js — 力度渐变曲线（crescendo / decrescendo）纯逻辑引擎
 *
 * 训练"一串音里把力度平滑地推上去（渐强）或收下来（渐弱）"的表现力控制。
 * 与 dynamics-trainer（单音命中某档力度）不同，这里评估的是
 * 整条序列的力度走向：方向是否正确 + 是否平滑均匀 + 跨度是否够大。
 * 纯逻辑：不碰 MIDI / DOM。
 */

/** 两种渐变方向。sign = 期望的相邻力度差符号。 */
export const CRESC_DIRECTIONS = {
  cresc:   { key: 'cresc',   name: '渐强', sym: 'cresc. <', sign: 1 },
  decresc: { key: 'decresc', name: '渐弱', sym: 'decresc. >', sign: -1 },
};

function clampVel(v) { return Math.max(1, Math.min(127, Math.round(v))); }

/** 在 start..end 之间线性取 count 个力度值（用于画"理想斜坡"参考线） */
export function idealRamp(startVel, endVel, count) {
  if (count <= 1) return [clampVel(startVel)];
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push(clampVel(startVel + (endVel - startVel) * i / (count - 1)));
  }
  return out;
}

/**
 * 给一串已弹力度打分。
 * @param {number[]} velocities 依次弹出的力度（1..127）
 * @param {object} opts
 * @param {'cresc'|'decresc'} opts.direction 期望方向
 * @param {number} opts.minSpan  达到满分跨度分所需的首尾力度差（默认 40）
 * @param {number} opts.smoothTol 平滑度容差：相对理想斜坡的平均绝对偏差到此值即 0 分（默认 18）
 * @returns {{score,monotonic,smoothness,span,spanScore,steps,correctSteps,meanDev,ideal}}
 */
export function rampScore(velocities, opts = {}) {
  const dir = opts.direction === 'decresc' ? 'decresc' : 'cresc';
  const sign = CRESC_DIRECTIONS[dir].sign;
  const minSpan = opts.minSpan ?? 40;
  const tol = opts.smoothTol ?? 18;
  const vs = (velocities || []).filter((v) => typeof v === 'number' && !Number.isNaN(v));
  const n = vs.length;
  if (n < 2) {
    return { score: 0, monotonic: 0, smoothness: 0, span: 0, spanScore: 0, steps: 0, correctSteps: 0, meanDev: 0, ideal: vs.slice() };
  }
  // 方向正确度：相邻力度差符号与期望一致的比例
  let correct = 0;
  for (let i = 0; i < n - 1; i++) {
    if (Math.sign(vs[i + 1] - vs[i]) === sign) correct++;
  }
  const steps = n - 1;
  const monotonic = correct / steps; // 0..1
  // 跨度分：首尾力度差越大越好（到 minSpan 封顶）
  const span = Math.abs(vs[n - 1] - vs[0]);
  const spanScore = Math.max(0, Math.min(1, span / minSpan));
  // 平滑度：与"首→尾线性斜坡"的平均绝对偏差
  const ideal = idealRamp(vs[0], vs[n - 1], n);
  let sumDev = 0;
  for (let i = 0; i < n; i++) sumDev += Math.abs(vs[i] - ideal[i]);
  const meanDev = sumDev / n;
  const smoothness = Math.max(0, Math.min(1, 1 - meanDev / tol));
  const score = Math.round(100 * (0.5 * monotonic + 0.2 * spanScore + 0.3 * smoothness));
  return { score, monotonic, smoothness, span, spanScore, steps, correctSteps: correct, meanDev, ideal };
}

export class CrescendoTrainer {
  /**
   * @param {object} opts
   * @param {'cresc'|'decresc'} opts.direction
   * @param {number} opts.count    一条曲线包含的音数（默认 8）
   * @param {number} opts.minSpan
   * @param {number} opts.smoothTol
   */
  constructor(opts = {}) {
    this.direction = opts.direction === 'decresc' ? 'decresc' : 'cresc';
    this.count = Math.max(2, opts.count ?? 8);
    this.minSpan = opts.minSpan ?? 40;
    this.smoothTol = opts.smoothTol ?? 18;
    this.velocities = [];
    this.rounds = 0;
    this.best = 0;
    this.lastResult = null;
    this.onNote = () => {};     // (velocity, index1based, count) => void
    this.onComplete = () => {}; // (result) => void
  }

  setDirection(d) { this.direction = d === 'decresc' ? 'decresc' : 'cresc'; }
  setCount(c) { this.count = Math.max(2, c | 0); }

  /** 喂入一个 note-on 力度；满 count 个自动结算并回调 onComplete，返回结果或 null */
  feed(velocity) {
    if (this.velocities.length >= this.count) return null;
    const v = clampVel(velocity);
    this.velocities.push(v);
    this.onNote(v, this.velocities.length, this.count);
    if (this.velocities.length >= this.count) return this._finish();
    return null;
  }

  _finish() {
    const r = rampScore(this.velocities, {
      direction: this.direction, minSpan: this.minSpan, smoothTol: this.smoothTol,
    });
    r.velocities = this.velocities.slice();
    r.direction = this.direction;
    this.rounds++;
    if (r.score > this.best) this.best = r.score;
    this.lastResult = r;
    this.onComplete(r);
    return r;
  }

  get progress() { return this.velocities.length; }
  get done() { return this.velocities.length >= this.count; }

  /** 清空当前这条曲线，重新开始一条（保留 best/rounds） */
  reset() { this.velocities = []; }

  /** 全部清零（含统计） */
  resetAll() { this.velocities = []; this.rounds = 0; this.best = 0; this.lastResult = null; }
}
