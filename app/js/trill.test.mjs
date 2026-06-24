/**
 * trill.test.mjs — 颤音速度训练引擎单元测试
 */
import { mean, stddev, cv, evennessScore, trillHz, TrillTrainer } from './trill.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${a}, want ${b})`); }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ~${b})`); }

// ---- mean/stddev/cv ----
eq(mean([]), 0, 'mean empty');
eq(mean([2, 4, 6]), 4, 'mean 2,4,6');
eq(stddev([5]), 0, 'stddev single');
eq(stddev([4, 4, 4]), 0, 'stddev constant');
eq(cv([4, 4, 4]), 0, 'cv constant');
near(cv([2, 4, 6]), 0.408248, 1e-4, 'cv 2,4,6');

// ---- evennessScore ----
eq(evennessScore([100]), 100, 'evenness single');
eq(evennessScore([100, 100, 100]), 100, 'evenness constant');
ok(evennessScore([100, 200, 100, 200]) < 100, 'evenness jittery < 100');
eq(evennessScore([10, 200, 10, 200], 0.3), 0, 'evenness huge jitter = 0');

// ---- trillHz ----
eq(trillHz([]), 0, 'trillHz empty');
// 100ms between taps -> 10 taps/sec -> 5 alternations/sec
near(trillHz([100, 100, 100]), 5, 1e-6, 'trillHz 100ms = 5 Hz');
near(trillHz([125]), 4, 1e-6, 'trillHz 125ms = 4 Hz');
near(trillHz([200]), 2.5, 1e-6, 'trillHz 200ms = 2.5 Hz');

// ---- construction ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 8 });
  eq(tr.lower, 60, 'lower 60');
  eq(tr.upper, 62, 'upper 62');
  eq(tr.taps, 8, 'taps 8');
  eq(tr.count, 0, 'init count 0');
  eq(tr.done, false, 'init not done');
  eq(tr.best, 0, 'init best 0');
}

// ---- defaults ----
{
  const tr = new TrillTrainer();
  eq(tr.lower, 60, 'default lower 60');
  eq(tr.upper, 62, 'default upper 62');
  eq(tr.taps, 16, 'default taps 16');
  eq(tr.targetHz, 6, 'default targetHz 6');
}

// ---- isTarget ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62 });
  ok(tr.isTarget(60), 'isTarget lower');
  ok(tr.isTarget(62), 'isTarget upper');
  ok(!tr.isTarget(61), 'not target 61');
  ok(!tr.isTarget(64), 'not target 64');
}

// ---- perfect even fast trill ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 6, targetHz: 5 });
  let done = null;
  tr.onComplete = (r) => { done = r; };
  // alternate 60,62,60,62,60,62 every 100ms -> 5 Hz
  const seq = [60, 62, 60, 62, 60, 62];
  let t = 0;
  let ret;
  seq.forEach((n) => { ret = tr.feed(n, t); t += 100; });
  eq(ret, 'done', 'last feed done');
  eq(tr.done, true, 'done');
  ok(done !== null, 'onComplete fired');
  near(done.speedHz, 5, 1e-6, 'speed 5 Hz');
  eq(done.evenness, 100, 'evenness 100');
  eq(done.speedScore, 100, 'speedScore 100');
  eq(done.wrongNotes, 0, 'no wrong');
  eq(done.repeats, 0, 'no repeats');
  eq(done.score, 100, 'perfect score 100');
  eq(tr.best, 100, 'best 100');
  near(tr.bestHz, 5, 1e-6, 'bestHz 5');
}

// ---- wrong notes penalize ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 4, targetHz: 5 });
  let done = null;
  tr.onComplete = (r) => { done = r; };
  let t = 0;
  eq(tr.feed(60, t), 'hit', 'hit 60'); t += 100;
  eq(tr.feed(65, t), 'wrong', 'wrong 65'); // not counted as a tap
  eq(tr.feed(62, t), 'hit', 'hit 62'); t += 100;
  eq(tr.feed(60, t), 'hit', 'hit 60'); t += 100;
  eq(tr.feed(62, t), 'done', 'done at 4 taps');
  eq(done.wrongNotes, 1, '1 wrong note');
  eq(done.taps, 4, '4 taps counted (wrong excluded)');
  // base ~100, minus 6 for wrong = 94
  eq(done.score, 94, 'score minus wrong');
}

// ---- repeats penalize ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 4, targetHz: 5 });
  let done = null;
  tr.onComplete = (r) => { done = r; };
  let t = 0;
  tr.feed(60, t); t += 100;
  eq(tr.feed(60, t), 'repeat', 'same note = repeat'); t += 100;  // no alternation
  tr.feed(62, t); t += 100;
  tr.feed(60, t);
  eq(done.repeats, 1, '1 repeat');
  // base 100 minus 4 for repeat = 96
  eq(done.score, 96, 'score minus repeat');
}

// ---- ignore after done ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 2 });
  tr.feed(60, 0);
  tr.feed(62, 100);  // done
  eq(tr.done, true, 'done at 2');
  eq(tr.feed(60, 200), 'idle', 'idle after done');
  eq(tr.count, 2, 'count stays 2');
}

// ---- onTap callback ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 8 });
  const kinds = [];
  tr.onTap = (info) => kinds.push(info.kind);
  tr.feed(60, 0);
  tr.feed(99, 50);   // wrong
  tr.feed(60, 100);  // repeat (same as last target 60)
  tr.feed(62, 150);  // hit
  eq(kinds.length, 4, 'onTap fired 4 times');
  eq(kinds[0], 'hit', 'first hit');
  eq(kinds[1], 'wrong', 'second wrong');
  eq(kinds[2], 'repeat', 'third repeat');
  eq(kinds[3], 'hit', 'fourth hit');
}

// ---- slow trill lower speedScore ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 4, targetHz: 10 });
  let done = null;
  tr.onComplete = (r) => { done = r; };
  let t = 0;
  // 200ms IOI -> 2.5 Hz, target 10 -> speedScore 25
  [60, 62, 60, 62].forEach((n) => { tr.feed(n, t); t += 200; });
  near(done.speedHz, 2.5, 1e-6, 'slow 2.5 Hz');
  eq(done.speedScore, 25, 'speedScore 25');
}

// ---- jittery lowers evenness ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 4, targetHz: 5 });
  let done = null;
  tr.onComplete = (r) => { done = r; };
  // IOIs: 100,300,100 jittery
  tr.feed(60, 0);
  tr.feed(62, 100);
  tr.feed(60, 400);
  tr.feed(62, 500);
  ok(done.evenness < 100, 'jittery evenness < 100');
}

// ---- finish() manual ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 16, targetHz: 5 });
  let t = 0;
  [60, 62, 60, 62].forEach((n) => { tr.feed(n, t); t += 100; });
  eq(tr.count, 4, 'count 4');
  eq(tr.done, false, 'not auto done');
  tr.finish();
  eq(tr.done, true, 'finish done');
  eq(tr.runs, 1, 'runs 1');
}

// ---- restart preserves best ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 4, targetHz: 5 });
  let t = 0;
  [60, 62, 60, 62].forEach((n) => { tr.feed(n, t); t += 100; });
  eq(tr.best, 100, 'best 100');
  eq(tr.runs, 1, 'runs 1');
  tr.restart();
  eq(tr.count, 0, 'restart count 0');
  eq(tr.done, false, 'restart not done');
  eq(tr.lastNote, null, 'restart lastNote null');
  eq(tr.best, 100, 'restart keeps best');
  eq(tr.runs, 1, 'restart keeps runs');
}

// ---- score clamped >= 0 ----
{
  const tr = new TrillTrainer({ lower: 60, upper: 62, taps: 4, targetHz: 100 });
  let done = null;
  tr.onComplete = (r) => { done = r; };
  // many wrongs before completing taps
  let t = 0;
  tr.feed(60, t); t += 1000;
  for (let i = 0; i < 30; i++) tr.feed(99, t);  // 30 wrong
  tr.feed(62, t); t += 1000;
  tr.feed(60, t); t += 1000;
  tr.feed(62, t);
  ok(done.score >= 0, 'score never negative');
}

// ---- custom target notes ----
{
  const tr = new TrillTrainer({ lower: 67, upper: 69, taps: 2 });
  ok(tr.isTarget(67), 'custom lower 67');
  ok(tr.isTarget(69), 'custom upper 69');
  ok(!tr.isTarget(60), 'custom not 60');
  tr.feed(67, 0);
  tr.feed(69, 100);
  eq(tr.done, true, 'custom trill done');
}

console.log(`trill: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
