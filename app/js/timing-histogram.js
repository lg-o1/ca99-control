/**
 * timing-histogram.js — ⏱️ 节奏偏差方向直方图（Timing Direction Histogram）纯逻辑
 *
 * beat-stability.js 已能估 BPM、算赶/拖趋势（slope），但只给一个"趋势方向"的标量。
 * 本模块把它补成**可视化直方图所需的数据**：把每一拍相对理想拍点的偏差（ms）分桶——
 * 从"狠赶"到"狠拖"若干个桶——看出孩子到底是稳、是普遍抢拍、还是越弹越拖。
 *
 * 复用 beat-stability 的 median/mean 做基准估计；纯逻辑、可注入、确定性可测。
 */

import { median, mean } from './beat-stability.js';

/** 直方图桶（按相对理想间隔的偏差比例分档；负=赶拍/早，正=拖拍/晚） */
export const BINS = [
  { id: 'rush2', label: '抢很多', emoji: '⏪', color: '#ef4444', lo: -Infinity, hi: -0.25 },
  { id: 'rush1', label: '抢一点', emoji: '◀️', color: '#f59e0b', lo: -0.25,     hi: -0.08 },
  { id: 'onbeat', label: '准',    emoji: '🎯', color: '#22c55e', lo: -0.08,     hi: 0.08 },
  { id: 'drag1', label: '拖一点', emoji: '▶️', color: '#3b82f6', lo: 0.08,      hi: 0.25 },
  { id: 'drag2', label: '拖很多', emoji: '⏩', color: '#8b5cf6', lo: 0.25,      hi: Infinity },
];

/** 相邻时间戳 → 间隔（IOI, ms） */
export function intervals(times) {
  const out = [];
  for (let i = 1; i < (times || []).length; i++) out.push(times[i] - times[i - 1]);
  return out;
}

/**
 * 计算每拍的"相对偏差"（(实际间隔 - 基准间隔)/基准间隔）。
 * 基准间隔：优先用传入 targetMs（跟拍模式有目标 BPM 时），否则取间隔中位数（自由弹）。
 * @param {number[]} times  敲击/音符时间戳（ms，升序）
 * @param {object} o  {targetMs}
 * @returns {{deviations:number[], baseMs:number}}
 */
export function deviations(times, o = {}) {
  const iois = intervals(times);
  if (!iois.length) return { deviations: [], baseMs: o.targetMs || 0 };
  const base = o.targetMs && o.targetMs > 0 ? o.targetMs : median(iois);
  const devs = base > 0 ? iois.map((d) => (d - base) / base) : iois.map(() => 0);
  return { deviations: devs, baseMs: base };
}

/** 偏差比例 → 落入哪个桶 id */
export function binFor(dev) {
  for (const b of BINS) if (dev >= b.lo && dev < b.hi) return b.id;
  return 'onbeat';
}

/**
 * 构建直方图：把各拍偏差分桶计数，并给出可视化所需的元数据。
 * @param {number[]} times
 * @param {object} o  {targetMs}
 * @returns {{bins:Array, total:number, baseMs:number, baseBpm:number, bias:string, meanDev:number, onbeatPct:number}}
 */
export function histogram(times, o = {}) {
  const { deviations: devs, baseMs } = deviations(times, o);
  const counts = Object.fromEntries(BINS.map((b) => [b.id, 0]));
  devs.forEach((d) => { counts[binFor(d)]++; });
  const total = devs.length;
  const bins = BINS.map((b) => ({
    ...b,
    count: counts[b.id],
    pct: total ? Math.round((counts[b.id] / total) * 100) : 0,
  }));
  const md = total ? mean(devs) : 0;
  return {
    bins,
    total,
    baseMs,
    baseBpm: baseMs > 0 ? Math.round(60000 / baseMs) : 0,
    meanDev: md,
    bias: biasLabel(md),
    onbeatPct: total ? Math.round((counts.onbeat / total) * 100) : 0,
  };
}

/** 平均偏差 → 总体倾向标签（温和、正向引导） */
export function biasLabel(meanDev) {
  if (meanDev <= -0.08) return '偏抢拍';
  if (meanDev >= 0.08) return '偏拖拍';
  return '很稳';
}

/** 给孩子的一句话点评 */
export function comment(h) {
  if (!h.total) return '先弹几拍，我来看看你的节奏～';
  if (h.bias === '很稳') return `稳得很！${h.onbeatPct}% 的拍子都踩在点上 🎯`;
  if (h.bias === '偏抢拍') return '有点着急啦，试着等一等节拍器，让每个音慢半拍落下。';
  return '稍微有点拖，下一拍可以早一点点进，跟住节拍器。';
}
