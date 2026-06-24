/**
 * polyrhythm.test.mjs — 复节奏引擎单元测试
 * 运行：node js/polyrhythm.test.mjs
 */
import { POLY_RATIOS, DEFAULT_TOLERANCE, rateError, buildVoiceOnsets, combinedGrid, PolyrhythmTrainer } from './polyrhythm.js';

let passed = 0, failed = 0;
function eq(a, b, msg) {
  if (a === b) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got ${a}, want ${b}`); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log(`FAIL: ${msg}`); }
}
function near(a, b, eps, msg) {
  if (Math.abs(a - b) <= eps) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got ${a}, want ~${b}`); }
}
function arrNear(a, b, eps, msg) {
  const same = a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) <= eps);
  if (same) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got [${a}], want [${b}]`); }
}

// ---------- POLY_RATIOS ----------
eq(POLY_RATIOS.length, 4, '4 preset ratios');
{
  const r32 = POLY_RATIOS.find((r) => r.id === '3:2');
  eq(r32.a, 3, '3:2 a=3');
  eq(r32.b, 2, '3:2 b=2');
}

// ---------- rateError ----------
eq(rateError(0), 'perfect', '0ms perfect');
eq(rateError(55), 'perfect', '55ms perfect boundary');
eq(rateError(-55), 'perfect', 'neg within perfect');
eq(rateError(56), 'good', '56ms good');
eq(rateError(120), 'good', '120ms good boundary');
eq(rateError(121), 'miss', '121ms miss');

// ---------- buildVoiceOnsets ----------
arrNear(buildVoiceOnsets(3, 2000, 1, 0), [0, 666.666, 1333.333], 0.01, '3 taps over 2000ms');
arrNear(buildVoiceOnsets(2, 2000, 1, 0), [0, 1000], 0.01, '2 taps over 2000ms');
// 2 cycles
arrNear(buildVoiceOnsets(2, 1000, 2, 0), [0, 500, 1000, 1500], 0.01, '2 taps x 2 cycles');
// with start offset
arrNear(buildVoiceOnsets(2, 1000, 1, 5000), [5000, 5500], 0.01, 'start offset applied');
// empty cases
eq(buildVoiceOnsets(3, 2000, 0).length, 0, '0 cycles -> empty');

// ---------- combinedGrid ----------
{
  // 3:2 over period 1 -> A at 0, 1/3, 2/3 ; B at 0, 1/2
  const g = combinedGrid(3, 2, 1);
  // unique times: 0(A,B), 1/3(A), 1/2(B), 2/3(A) = 4 positions
  eq(g.length, 4, '3:2 has 4 unique positions');
  // first is downbeat both voices
  near(g[0].t, 0, 1e-9, 'first at 0');
  ok(g[0].voices.includes('A') && g[0].voices.includes('B'), 'downbeat both hands');
  near(g[1].t, 1 / 3, 1e-6, 'second at 1/3');
  arrNear(g[1].voices.map((v) => v === 'A' ? 1 : 0), [1], 0, '1/3 is voice A only');
  near(g[2].t, 1 / 2, 1e-6, 'third at 1/2');
  near(g[3].t, 2 / 3, 1e-6, 'fourth at 2/3');
}
{
  // 2:2 -> both coincide at 0 and 1/2 -> 2 positions both voices
  const g = combinedGrid(2, 2, 1);
  eq(g.length, 2, '2:2 -> 2 coincident positions');
  ok(g[0].voices.length === 2, 'both hands together');
}

// ---------- PolyrhythmTrainer: start generates grids ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 2000, cycles: 1 });
  const grids = t.start(0);
  eq(grids.A.length, 3, 'A has 3 onsets');
  eq(grids.B.length, 2, 'B has 2 onsets');
  ok(t.started, 'started flag');
  eq(t.totalOnsets, 5, 'total 5 onsets');
}

// ---------- PolyrhythmTrainer: perfect play both voices ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 2000, cycles: 1 });
  const g = t.start(0);
  // tap A exactly
  g.A.forEach((onset) => {
    const r = t.tap('A', onset);
    eq(r.rating, 'perfect', `A perfect at ${onset}`);
  });
  g.B.forEach((onset) => {
    const r = t.tap('B', onset);
    eq(r.rating, 'perfect', `B perfect at ${onset}`);
  });
  const s = t.finish();
  eq(s.accuracy, 1, 'all hit -> accuracy 1');
  eq(s.score, 100, 'perfect timing+accuracy -> 100');
  eq(s.A.perfect, 3, 'A 3 perfect');
  eq(s.B.perfect, 2, 'B 2 perfect');
  eq(s.A.misses, 0, 'A no misses');
}

// ---------- PolyrhythmTrainer: voice separation (A tap shouldn't consume B onset) ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 2000, cycles: 1 });
  t.start(0);
  // tap only voice A at its 3 onsets
  t.tap('A', 0); t.tap('A', 666.67); t.tap('A', 1333.33);
  const s = t.finish();
  eq(s.A.hits, 3, 'A all 3 hit');
  eq(s.B.hits, 0, 'B none hit (separate voice)');
  eq(s.B.misses, 2, 'B 2 missed');
  near(s.accuracy, 3 / 5, 0.001, 'accuracy 3/5');
}

// ---------- PolyrhythmTrainer: good (slightly off) ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '2:3'), cycleMs: 2000, cycles: 1 });
  const g = t.start(0);
  const r = t.tap('A', g.A[0] + 80); // 80ms off -> good
  eq(r.rating, 'good', '80ms off -> good');
  near(r.errMs, 80, 0.001, 'errMs 80');
}

// ---------- PolyrhythmTrainer: way off -> extra (onset not consumed) ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 2000, cycles: 1 });
  const g = t.start(0);
  const r = t.tap('A', g.A[0] + 500); // 500ms off
  eq(r.rating, 'extra', 'way off -> extra');
  eq(r.index, -1, 'extra index -1');
  // onset still available
  const r2 = t.tap('A', g.A[0]);
  eq(r2.rating, 'perfect', 'onset still hittable after extra');
  eq(t.A.extras, 1, '1 extra recorded');
}

// ---------- PolyrhythmTrainer: extra when no onsets left ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '2:3'), cycleMs: 2000, cycles: 1 });
  const g = t.start(0);
  g.A.forEach((o) => t.tap('A', o)); // hit all A
  const r = t.tap('A', g.A[0]); // extra tap, none left
  eq(r.rating, 'extra', 'no onsets left -> extra');
}

// ---------- PolyrhythmTrainer: not started -> extra ----------
{
  const t = new PolyrhythmTrainer({});
  const r = t.tap('A', 0);
  eq(r.rating, 'extra', 'tap before start -> extra');
}

// ---------- PolyrhythmTrainer: avgError ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '2:3'), cycleMs: 2000, cycles: 1 });
  const g = t.start(0);
  t.tap('A', g.A[0] + 40);  // err 40
  t.tap('A', g.A[1] - 60);  // err 60
  near(t.avgError, 50, 0.001, 'avgError (40+60)/2=50');
}

// ---------- PolyrhythmTrainer: timing reduces score ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '2:3'), cycleMs: 2000, cycles: 1, tolerance: { perfect: 55, good: 120 } });
  const g = t.start(0);
  // hit all onsets but each 60ms off (good, not perfect)
  g.A.forEach((o) => t.tap('A', o + 60));
  g.B.forEach((o) => t.tap('B', o + 60));
  const s = t.finish();
  eq(s.accuracy, 1, 'all hit acc 1');
  // timing = 1 - 60/120 = 0.5; score = 0.7*1 + 0.3*0.5 = 0.85 -> 85
  eq(s.score, 85, 'good-only timing -> 85');
}

// ---------- PolyrhythmTrainer: best/rounds tracking ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 2000, cycles: 1 });
  let g = t.start(0);
  g.A.forEach((o) => t.tap('A', o)); g.B.forEach((o) => t.tap('B', o));
  t.finish();
  eq(t.rounds, 1, 'rounds 1');
  eq(t.best, 100, 'best 100');
  // round 2 worse
  t.reset();
  g = t.start(0);
  g.A.forEach((o) => t.tap('A', o)); // only A
  t.finish();
  eq(t.rounds, 2, 'rounds 2');
  eq(t.best, 100, 'best preserved');
  ok(t.lastResult.score < 100, 'second worse');
}

// ---------- PolyrhythmTrainer: resetAll ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 2000, cycles: 1 });
  const g = t.start(0);
  g.A.forEach((o) => t.tap('A', o)); g.B.forEach((o) => t.tap('B', o));
  t.finish();
  t.resetAll();
  eq(t.rounds, 0, 'resetAll rounds 0');
  eq(t.best, 0, 'resetAll best 0');
  ok(t.lastResult === null, 'resetAll lastResult null');
  eq(t.totalOnsets, 0, 'resetAll grids cleared');
}

// ---------- PolyrhythmTrainer: 2 cycles ----------
{
  const t = new PolyrhythmTrainer({ ratio: POLY_RATIOS.find((r) => r.id === '3:2'), cycleMs: 1000, cycles: 2 });
  const g = t.start(0);
  eq(g.A.length, 6, '3 taps x 2 cycles = 6');
  eq(g.B.length, 4, '2 taps x 2 cycles = 4');
  eq(t.totalOnsets, 10, 'total 10 onsets over 2 cycles');
}

// ---------- PolyrhythmTrainer: empty summary before start ----------
{
  const t = new PolyrhythmTrainer({});
  eq(t.accuracy, 0, 'no onsets -> accuracy 0');
  eq(t.avgError, 0, 'no hits -> avgError 0');
}

console.log(`polyrhythm: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
