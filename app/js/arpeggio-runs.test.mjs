/**
 * arpeggio-runs.test.mjs — 琶音跑动引擎单元测试
 */
import {
  CHORD_INTERVALS, QUALITY_LABELS, midiName, buildArpeggio,
  mean, stddev, cv, evennessScore, speedNps, ArpeggioRuns,
} from './arpeggio-runs.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${a}, want ${b})`); }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ~${b})`); }
function arrEq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

// ---- midiName ----
eq(midiName(60), 'C4', 'midiName 60');
eq(midiName(61), 'C#4', 'midiName 61');
eq(midiName(72), 'C5', 'midiName 72');
eq(midiName(48), 'C3', 'midiName 48');
eq(midiName(69), 'A4', 'midiName 69');

// ---- CHORD_INTERVALS / labels ----
arrEq(CHORD_INTERVALS.maj, [0, 4, 7], 'maj intervals');
arrEq(CHORD_INTERVALS.min, [0, 3, 7], 'min intervals');
arrEq(CHORD_INTERVALS.dom7, [0, 4, 7, 10], 'dom7 intervals');
arrEq(CHORD_INTERVALS.maj7, [0, 4, 7, 11], 'maj7 intervals');
ok(QUALITY_LABELS.maj === '大三和弦', 'label maj');
ok(QUALITY_LABELS.dom7 === '属七和弦', 'label dom7');

// ---- buildArpeggio ----
arrEq(buildArpeggio(60, 'maj', 1, 'up'), [60, 64, 67, 72], 'C maj 1 oct up');
arrEq(buildArpeggio(60, 'maj', 2, 'up'), [60, 64, 67, 72, 76, 79, 84], 'C maj 2 oct up');
arrEq(buildArpeggio(60, 'min', 1, 'up'), [60, 63, 67, 72], 'C min 1 oct up');
arrEq(buildArpeggio(60, 'dom7', 1, 'up'), [60, 64, 67, 70, 72], 'C dom7 1 oct up');
arrEq(buildArpeggio(60, 'maj', 1, 'down'), [72, 67, 64, 60], 'C maj 1 oct down');
arrEq(buildArpeggio(60, 'maj', 1, 'updown'), [60, 64, 67, 72, 67, 64, 60], 'C maj 1 oct updown');
// 默认参数
arrEq(buildArpeggio(60), [60, 64, 67, 72], 'default maj 1 up');
// 未知性质回落 maj
arrEq(buildArpeggio(60, 'xyz', 1, 'up'), [60, 64, 67, 72], 'unknown quality falls back maj');
// 不同根音
arrEq(buildArpeggio(62, 'maj', 1, 'up'), [62, 66, 69, 74], 'D maj 1 oct up');

// ---- mean / stddev / cv ----
eq(mean([]), 0, 'mean empty');
eq(mean([2, 4, 6]), 4, 'mean 2,4,6');
eq(stddev([5]), 0, 'stddev single');
eq(stddev([4, 4, 4]), 0, 'stddev constant');
near(stddev([2, 4, 6]), 1.632993, 1e-4, 'stddev 2,4,6');
eq(cv([4, 4, 4]), 0, 'cv constant');
near(cv([2, 4, 6]), 0.408248, 1e-4, 'cv 2,4,6');
eq(cv([0, 0]), 0, 'cv zero mean');

// ---- evennessScore ----
eq(evennessScore([100]), 100, 'evenness single = 100');
eq(evennessScore([100, 100, 100]), 100, 'evenness constant = 100');
eq(evennessScore([100, 100, 100, 100]), 100, 'evenness all equal = 100');
ok(evennessScore([100, 200, 100, 200]) < 100, 'evenness jittery < 100');
ok(evennessScore([100, 105, 95, 100]) > 80, 'evenness slight jitter high');
// CV >= loose => 0
ok(evennessScore([10, 200, 10, 200], 0.3) === 0, 'evenness huge jitter = 0');

// ---- speedNps ----
eq(speedNps([]), 0, 'speed empty');
near(speedNps([100, 100, 100]), 10, 1e-6, 'speed 100ms = 10 nps');
near(speedNps([200]), 5, 1e-6, 'speed 200ms = 5 nps');
near(speedNps([250, 250]), 4, 1e-6, 'speed 250ms = 4 nps');

// ---- ArpeggioRuns: basic construction ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, direction: 'up' });
  arrEq(a.target, [60, 64, 67, 72], 'engine target C maj 1 oct');
  eq(a.idx, 0, 'init idx 0');
  eq(a.done, false, 'init not done');
  eq(a.progress, 0, 'init progress 0');
  eq(a.best, 0, 'init best 0');
  eq(a.runs, 0, 'init runs 0');
}

// ---- defaults ----
{
  const a = new ArpeggioRuns();
  eq(a.rootMidi, 60, 'default root 60');
  eq(a.quality, 'maj', 'default quality maj');
  eq(a.octaves, 2, 'default octaves 2');
  eq(a.direction, 'up', 'default dir up');
  eq(a.target.length, 7, 'default target length 7');
}

// ---- perfect even run ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, direction: 'up', targetNps: 5 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  const seq = a.target; // [60,64,67,72]
  let t = 1000;
  let lastRet;
  seq.forEach((n, i) => { lastRet = a.feed(n, t); t += 200; }); // 200ms each = 5 nps
  eq(lastRet, 'done', 'last feed returns done');
  eq(a.done, true, 'done after full seq');
  ok(completed !== null, 'onComplete fired');
  near(completed.speed, 5, 1e-6, 'speed = 5 nps');
  eq(completed.evenness, 100, 'evenness perfect = 100');
  eq(completed.speedScore, 100, 'speedScore at target = 100');
  eq(completed.errors, 0, 'no errors');
  eq(completed.score, 100, 'perfect score 100');
  eq(a.runs, 1, 'runs incremented');
  eq(a.best, 100, 'best = 100');
  near(a.bestSpeed, 5, 1e-6, 'bestSpeed = 5');
}

// ---- feed after done returns idle ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1 });
  let t = 0;
  a.target.forEach((n) => { a.feed(n, t); t += 100; });
  eq(a.feed(60, t), 'idle', 'feed after done = idle');
}

// ---- hit / miss ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1 });
  eq(a.feed(60, 0), 'hit', 'first correct = hit');
  eq(a.feed(99, 50), 'miss', 'wrong note = miss');
  eq(a.errors, 1, 'error counted');
  eq(a.idx, 1, 'idx unchanged after miss');
  eq(a.feed(64, 100), 'hit', 'recover with correct note');
  eq(a.idx, 2, 'idx advanced');
}

// ---- errors reduce score ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, targetNps: 5 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  let t = 0;
  // play perfect but inject 2 wrong notes
  a.feed(60, t); t += 200;
  a.feed(13, t); // wrong
  a.feed(13, t); // wrong
  a.feed(64, t); t += 200;
  a.feed(67, t); t += 200;
  a.feed(72, t);
  eq(completed.errors, 2, '2 errors recorded');
  // base would be 100, minus 2*5 = 90
  eq(completed.score, 90, 'score reduced by errors');
}

// ---- progress callback ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1 });
  const prog = [];
  a.onProgress = (idx, total) => prog.push([idx, total]);
  let t = 0;
  a.target.forEach((n) => { a.feed(n, t); t += 100; });
  eq(prog.length, 4, 'progress fired 4 times');
  arrEq(prog[0], [1, 4], 'first progress 1/4');
  arrEq(prog[3], [4, 4], 'last progress 4/4');
}

// ---- onError callback ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1 });
  let err = null;
  a.onError = (played, expected) => { err = [played, expected]; };
  a.feed(99, 0);
  arrEq(err, [99, 60], 'onError gives played + expected');
}

// ---- restart preserves stats ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, targetNps: 5 });
  let t = 0;
  a.target.forEach((n) => { a.feed(n, t); t += 200; });
  eq(a.runs, 1, 'runs 1');
  eq(a.best, 100, 'best 100');
  a.restart();
  eq(a.idx, 0, 'restart idx 0');
  eq(a.done, false, 'restart not done');
  eq(a.errors, 0, 'restart errors 0');
  eq(a.best, 100, 'restart preserves best');
  eq(a.runs, 1, 'restart preserves runs');
  // second run, slower
  t = 10000;
  a.target.forEach((n) => { a.feed(n, t); t += 400; }); // 2.5 nps
  eq(a.runs, 2, 'runs 2 after second');
  ok(a.bestSpeed >= 4.9, 'bestSpeed kept from faster run');
}

// ---- progress getter mid-run ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1 });
  a.feed(60, 0);
  a.feed(64, 100);
  near(a.progress, 0.5, 1e-9, 'progress 0.5 at 2/4');
}

// ---- jittery run lowers evenness ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, targetNps: 5 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  // IOIs: 100, 400, 100 -> jittery
  a.feed(60, 0);
  a.feed(64, 100);
  a.feed(67, 500);
  a.feed(72, 600);
  ok(completed.evenness < 100, 'jittery evenness < 100');
  ok(completed.evenness >= 0, 'evenness >= 0');
}

// ---- updown direction full run ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, direction: 'updown' });
  arrEq(a.target, [60, 64, 67, 72, 67, 64, 60], 'updown target');
  let t = 0;
  let ret;
  a.target.forEach((n) => { ret = a.feed(n, t); t += 150; });
  eq(ret, 'done', 'updown completes');
  eq(a.done, true, 'updown done');
}

// ---- down direction ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'min', octaves: 1, direction: 'down' });
  arrEq(a.target, [72, 67, 63, 60], 'C min down target');
}

// ---- score clamped to >= 0 ----
{
  const a = new ArpeggioRuns({ rootMidi: 60, quality: 'maj', octaves: 1, targetNps: 100 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  // very slow + many errors
  let t = 0;
  a.feed(60, t); t += 2000;
  for (let i = 0; i < 30; i++) a.feed(13, t); // 30 errors
  a.feed(64, t); t += 2000;
  a.feed(67, t); t += 2000;
  a.feed(72, t);
  ok(completed.score >= 0, 'score never negative');
}

console.log(`arpeggio-runs: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
