/**
 * beat-stability.test.mjs — 节拍稳定度分析单元测试
 * 运行：node js/beat-stability.test.mjs
 */
import {
  median, mean, stddev, slope, msToBpm, bpmToMs, BeatStability,
} from './beat-stability.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('  ✗', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (期望 ${b}，实际 ${a})`); }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (期望≈${b}，实际 ${a})`); }

// ---- 工具函数 ----
eq(median([]), 0, 'median 空=0');
eq(median([5]), 5, 'median 单元素');
eq(median([1, 2, 3]), 2, 'median 奇数');
eq(median([1, 2, 3, 4]), 2.5, 'median 偶数');
eq(median([3, 1, 2]), 2, 'median 无序');
eq(mean([]), 0, 'mean 空=0');
eq(mean([2, 4, 6]), 4, 'mean');
eq(stddev([]), 0, 'stddev 空=0');
eq(stddev([5]), 0, 'stddev 单元素=0');
eq(stddev([2, 2, 2, 2]), 0, 'stddev 全等=0');
near(stddev([2, 4, 4, 4, 5, 5, 7, 9]), 2.138, 0.01, 'stddev 已知值');
eq(slope([]), 0, 'slope 空=0');
eq(slope([5]), 0, 'slope 单元素=0');
near(slope([1, 2, 3, 4]), 1, 1e-9, 'slope 等差=1');
near(slope([4, 3, 2, 1]), -1, 1e-9, 'slope 递减=-1');
near(slope([3, 3, 3]), 0, 1e-9, 'slope 平=0');
near(msToBpm(500), 120, 1e-9, '500ms=120bpm');
near(msToBpm(1000), 60, 1e-9, '1000ms=60bpm');
eq(msToBpm(0), 0, 'msToBpm 0');
near(bpmToMs(120), 500, 1e-9, '120bpm=500ms');
eq(bpmToMs(0), 0, 'bpmToMs 0');

// ---- tap：递增校验 ----
{
  const b = new BeatStability();
  ok(b.tap(0), 'tap 0 收下');
  ok(b.tap(100), 'tap 100 收下');
  ok(!b.tap(100), '相同时间戳拒绝');
  ok(!b.tap(50), '回退时间戳拒绝');
  eq(b.count, 2, '只收了 2 个');
}

// ---- iois ----
{
  const b = new BeatStability();
  [0, 500, 1000, 1500].forEach(t => b.tap(t));
  eq(b.iois().join(','), '500,500,500', '等间隔 IOI');
  eq(b.bpm(), 120, '完美 120 BPM');
  eq(b.cv(), 0, '完美稳定 CV=0');
  eq(b.stabilityScore(), 100, '完美稳定 100 分');
}

// ---- 不足两个间隔 ----
{
  const b = new BeatStability();
  b.tap(0);
  eq(b.stabilityScore(), 0, '0 间隔 0 分');
  b.tap(500);
  eq(b.stabilityScore(), 0, '1 间隔 0 分（需≥2）');
}

// ---- 稳定度评分插值 ----
{
  // CV 恰好等于 cvCeil → 0 分
  const b = new BeatStability({ cvFloor: 0.02, cvCeil: 0.20 });
  // 构造 CV≈0.2 的间隔：mean=500，std=100 → cv=0.2
  // 间隔 [400, 600, 400, 600] mean=500 std= sqrt(((100)^2*4)/3)=115 -> cv 0.23>0.2 →0
  [0].forEach(() => {});
  let t = 0; [500, 400, 600, 400, 600].forEach(d => { t += d; b.tap(t); });
  b.times = [0, 500, 900, 1500, 1900, 2500]; // 间隔 500,400,600,400,600
  ok(b.stabilityScore() < 100 && b.stabilityScore() >= 0, '波动时分数 0..99');
}

// ---- 趋势：赶拍（间隔变短） ----
{
  const b = new BeatStability({ trendMs: 4 });
  // 间隔逐渐变短 → rushing
  b.times = [0, 600, 1150, 1650, 2100, 2500]; // 600,550,500,450,400
  const tr = b.trend();
  ok(tr.slope < 0, '赶拍 slope<0');
  eq(tr.label, 'rushing', '判为 rushing');
}

// ---- 趋势：拖拍（间隔变长） ----
{
  const b = new BeatStability({ trendMs: 4 });
  b.times = [0, 400, 850, 1350, 1900, 2500]; // 400,450,500,550,600
  const tr = b.trend();
  ok(tr.slope > 0, '拖拍 slope>0');
  eq(tr.label, 'dragging', '判为 dragging');
}

// ---- 趋势：稳定 ----
{
  const b = new BeatStability({ trendMs: 4 });
  b.times = [0, 500, 1000, 1500, 2000];
  eq(b.trend().label, 'steady', '等间隔判 steady');
}

// ---- 跟拍评估：无目标返回 null ----
{
  const b = new BeatStability();
  b.times = [0, 500, 1000];
  eq(b.targetEval(), null, '无 targetBpm 返回 null');
  eq(b.stats().target, null, 'stats.target 为 null');
}

// ---- 跟拍评估：完美命中目标 ----
{
  const b = new BeatStability({ targetBpm: 120 }); // 理想 500ms
  b.times = [0, 500, 1000, 1500];
  const ev = b.targetEval();
  eq(ev.ideal, 500, '理想间隔 500ms');
  eq(ev.meanAbsErr, 0, '完美命中 0 误差');
  eq(ev.accuracy, 100, '准度 100');
}

// ---- 跟拍评估：有误差 ----
{
  const b = new BeatStability({ targetBpm: 120 }); // 理想 500
  // 间隔 550,450,520 → 误差 +50,-50,+20 → meanAbs=40 → ratio=0.08 → acc=round(100*(1-0.08/0.25))=68
  b.times = [0, 550, 1000, 1520];
  const ev = b.targetEval();
  near(ev.meanAbsErr, 40, 1e-9, '平均绝对误差 40ms');
  eq(ev.accuracy, 68, '准度 68');
}

// ---- 跟拍评估：误差超 25% 给 0 ----
{
  const b = new BeatStability({ targetBpm: 120 }); // 理想 500，25% = 125ms
  b.times = [0, 700, 1400]; // 间隔 700,700 → 误差 200 → ratio 0.4 →0
  eq(b.targetEval().accuracy, 0, '大误差准度 0');
}

// ---- stats 完整性 ----
{
  const b = new BeatStability({ targetBpm: 100 });
  b.times = [0, 600, 1200, 1800, 2400]; // 间隔均 600 → 100bpm
  const s = b.stats();
  eq(s.count, 5, 'stats.count');
  eq(s.intervals, 4, 'stats.intervals');
  eq(s.bpm, 100, 'stats.bpm');
  eq(s.meanIoi, 600, 'stats.meanIoi');
  eq(s.stdMs, 0, 'stats.stdMs');
  eq(s.cv, 0, 'stats.cv');
  eq(s.stability, 100, 'stats.stability');
  eq(s.trend.label, 'steady', 'stats.trend');
  ok(s.target && s.target.ideal === 600, 'stats.target.ideal');
}

// ---- reset ----
{
  const b = new BeatStability();
  b.times = [0, 500, 1000];
  b.reset();
  eq(b.count, 0, 'reset 清空');
  eq(b.iois().length, 0, 'reset IOI 空');
}

// ---- 离群间隔下 BPM 用中位数抗扰 ----
{
  const b = new BeatStability();
  // 间隔 500,500,500,2000(漏拍),500 → 中位 500 → 120bpm
  b.times = [0, 500, 1000, 1500, 3500, 4000];
  eq(b.bpm(), 120, '中位数抗离群 BPM=120');
}

console.log(`beat-stability: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
