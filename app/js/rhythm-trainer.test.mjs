/**
 * rhythm-trainer.test.mjs — 节奏跟拍训练单元测试
 * 运行：node js/rhythm-trainer.test.mjs
 */
import {
  RHYTHM_PATTERNS, DEFAULT_TOLERANCE, beatsToOnsets, rateError, barDurationMs, RhythmTrainer,
} from './rhythm-trainer.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('  ✗', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (期望 ${b}，实际 ${a})`); }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (期望≈${b}±${eps}，实际 ${a})`); }

// ---- 预置节奏型 ----
ok(RHYTHM_PATTERNS.length >= 5, '至少 5 个预置节奏型');
RHYTHM_PATTERNS.forEach((p) => {
  ok(typeof p.id === 'string' && p.id.length > 0, `节奏型有 id: ${p.id}`);
  ok(Array.isArray(p.beats) && p.beats.length > 0, `节奏型 ${p.id} 有 beats`);
  ok(p.beats.every((b) => b >= 0 && b < 4), `节奏型 ${p.id} 拍点在 0..4 内`);
  // 拍点严格递增
  for (let i = 1; i < p.beats.length; i++) ok(p.beats[i] > p.beats[i - 1], `节奏型 ${p.id} 拍点递增`);
});
const quarter = RHYTHM_PATTERNS.find((p) => p.id === 'quarter');
eq(quarter.beats.length, 4, '四分音符 4 个拍点');

// ---- beatsToOnsets ----
{
  const ons = beatsToOnsets([0, 1, 2, 3], 60, 0); // 60bpm → 1000ms/拍
  eq(ons.length, 4, 'onsets 长度');
  eq(ons[0], 0, '第一拍 0ms');
  eq(ons[1], 1000, '第二拍 1000ms');
  eq(ons[3], 3000, '第四拍 3000ms');
}
{
  const ons = beatsToOnsets([0, 0.5, 1], 120, 5000); // 120bpm → 500ms/拍，起点 5000
  eq(ons[0], 5000, '带 startTime 第一拍');
  eq(ons[1], 5250, '半拍 = 250ms 后');
  eq(ons[2], 5500, '一拍 = 500ms 后');
}

// ---- rateError ----
eq(rateError(0), 'perfect', '0 误差 = 完美');
eq(rateError(50), 'perfect', '50ms 内 = 完美');
eq(rateError(-50), 'perfect', '负误差按绝对值');
eq(rateError(55), 'perfect', '边界 55ms = 完美');
eq(rateError(100), 'good', '100ms = 良好');
eq(rateError(120), 'good', '边界 120ms = 良好');
eq(rateError(121), 'miss', '超 120ms = 漏');
eq(rateError(80, { perfect: 30, good: 60 }), 'miss', '自定义容差');
eq(rateError(40, { perfect: 30, good: 60 }), 'good', '自定义容差 good');

// ---- barDurationMs ----
eq(barDurationMs(60), 4000, '60bpm 4拍小节 = 4000ms');
eq(barDurationMs(120), 2000, '120bpm 4拍 = 2000ms');
eq(barDurationMs(60, 3), 3000, '3拍小节');

// ---- RhythmTrainer 基本 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  eq(t.bpm, 60, 'bpm 设置');
  eq(t.total, 0, '未开始 total 0');
  const ons = t.start(0);
  eq(ons.length, 4, 'start 返回 4 个落点');
  eq(t.total, 4, '开始后 total 4');
  eq(t.started, true, 'started=true');
}

// ---- 完美命中全部 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  [0, 1000, 2000, 3000].forEach((tm) => t.tap(tm));
  const s = t.finish();
  eq(s.total, 4, '总落点 4');
  eq(s.hits, 4, '命中 4');
  eq(s.perfect, 4, '全部完美');
  eq(s.good, 0, '无良好');
  eq(s.misses, 0, '无漏拍');
  eq(s.extras, 0, '无多敲');
  eq(s.score, 8, '4×2=8 分');
  eq(s.best, 4, '最佳连击 4');
  eq(s.accuracy, 1, '命中率 100%');
  eq(s.avgError, 0, '平均误差 0');
}

// ---- 良好命中（误差在 good 窗口） ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  const r0 = t.tap(80);   // 距 0ms 80ms → good
  eq(r0.rating, 'good', '80ms 偏差为良好');
  eq(r0.index, 0, '命中第一个落点');
  near(r0.errMs, 80, 0.001, '误差 +80ms');
  t.tap(1100); // 距 1000 100ms → good
  const s = t.finish();
  eq(s.good, 2, '两个良好');
  eq(s.perfect, 0, '无完美');
  eq(s.score, 2, '2×1=2 分');
  eq(s.misses, 2, '剩两个漏拍');
}

// ---- 多敲（extra） ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  const r = t.tap(500); // 距 0 和 1000 都 500ms → 超 good → extra
  eq(r.rating, 'extra', '500ms 偏差为多敲');
  eq(r.index, -1, '多敲不绑定落点');
  eq(t.extras, 1, '多敲计数 1');
  eq(t.combo, 0, '多敲打断连击');
  const s = t.finish();
  eq(s.hits, 0, '无命中');
  eq(s.misses, 4, '全漏');
}

// ---- 连击与打断 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: RHYTHM_PATTERNS.find((p) => p.id === 'eighth') });
  t.start(0);
  // eighth: 0,0.5,1,1.5,2,2.5,3,3.5 拍 → 60bpm = 0,500,1000,...,3500
  t.tap(0); t.tap(500); t.tap(1000); // 3 连击
  eq(t.combo, 3, '连击 3');
  t.tap(99999); // 远离 → 还有未命中落点，最近的是 1500，误差巨大 → extra
  eq(t.combo, 0, '打断后连击归零');
  eq(t.best, 3, '最佳连击保留 3');
}

// ---- 最近未命中匹配：两次敲同一落点 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  t.tap(0);   // 命中落点0
  const r = t.tap(20); // 落点0 已命中，下一个最近未命中是落点1(1000)，误差 980 → extra
  eq(r.rating, 'extra', '重复敲已命中落点附近 → 找下一个，太远则多敲');
  eq(t.taps, 1, '仍只命中 1 个');
}

// ---- 提前敲（负误差）也能命中 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  const r = t.tap(960); // 距 1000 为 -40ms → perfect（提前）
  eq(r.index, 1, '提前敲命中第二落点');
  eq(r.rating, 'perfect', '-40ms 完美');
  ok(r.errMs < 0, '负误差表示提前');
}

// ---- avgError 计算 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  t.tap(40);   // err 40
  t.tap(1080); // err 80
  const s = t.finish();
  near(s.avgError, 60, 0.001, '平均绝对误差 (40+80)/2=60');
}

// ---- 未 start 时 tap 安全 ----
{
  const t = new RhythmTrainer();
  const r = t.tap(100);
  eq(r.rating, 'extra', '未开始敲击返回 extra');
  eq(t.taps, 0, '未开始不计命中');
}

// ---- 自定义容差与 BPM ----
{
  const t = new RhythmTrainer({ bpm: 120, pattern: quarter, tolerance: { perfect: 30, good: 60 } });
  t.start(0); // 120bpm: 0,500,1000,1500
  const r = t.tap(45); // 45ms → good（在 30..60）
  eq(r.rating, 'good', '自定义容差 good 判定');
  const r2 = t.tap(520); // 距 500 为 20 → perfect
  eq(r2.rating, 'perfect', '自定义容差 perfect 判定');
}

// ---- summary 字段完整 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  t.tap(0);
  const s = t.summary();
  ['total', 'hits', 'perfect', 'good', 'misses', 'extras', 'score', 'best', 'accuracy', 'avgError']
    .forEach((k) => ok(k in s, `summary 含字段 ${k}`));
}

// ---- 重新 start 清空状态 ----
{
  const t = new RhythmTrainer({ bpm: 60, pattern: quarter });
  t.start(0);
  t.tap(0); t.tap(1000);
  eq(t.taps, 2, '第一遍命中 2');
  t.start(10000); // 重开
  eq(t.taps, 0, '重开后命中清零');
  eq(t.score, 0, '重开后分数清零');
  eq(t.combo, 0, '重开后连击清零');
  eq(t.onsets[0], 10000, '重开后落点用新起点');
}

console.log(`rhythm-trainer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
