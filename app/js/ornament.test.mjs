/**
 * ornament.test.mjs — 装饰音引擎单元测试
 * 运行：node js/ornament.test.mjs
 */
import {
  mean, stddev, cv, evennessScore, crispScore,
  buildOrnament, ORNAMENT_LABELS, OrnamentTrainer,
} from './ornament.js';

let passed = 0, failed = 0;
function eq(a, b, msg) {
  if (a === b) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got ${a}, want ${b}`); }
}
function near(a, b, tol, msg) {
  if (Math.abs(a - b) <= tol) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got ${a}, want ~${b}`); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log(`FAIL: ${msg}`); }
}
function arrEq(a, b, msg) {
  const same = a.length === b.length && a.every((x, i) => x === b[i]);
  if (same) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got [${a}], want [${b}]`); }
}

// ---------- 基础统计 ----------
eq(mean([]), 0, 'mean empty');
eq(mean([2, 4, 6]), 4, 'mean basic');
eq(stddev([5]), 0, 'stddev single');
eq(stddev([2, 2, 2]), 0, 'stddev constant');
near(stddev([1, 3]), 1, 1e-9, 'stddev pair');
eq(cv([0, 0]), 0, 'cv zero mean');
near(cv([2, 4]), (1 / 3), 1e-9, 'cv basic'); // stddev=1, mean=3

// ---------- evennessScore ----------
eq(evennessScore([100]), 100, 'evenness single -> 100');
eq(evennessScore([100, 100, 100]), 100, 'evenness constant -> 100');
ok(evennessScore([100, 300]) < 100, 'evenness uneven < 100');
ok(evennessScore([100, 110, 100, 105]) > 80, 'evenness slight variation high');

// ---------- crispScore ----------
eq(crispScore(0), 100, 'crisp zero -> 100');
eq(crispScore(100, 120), 100, 'crisp under target -> 100');
eq(crispScore(120, 120), 100, 'crisp at target -> 100');
eq(crispScore(360, 120), 0, 'crisp at 3x -> 0');
ok(crispScore(240, 120) > 0 && crispScore(240, 120) < 100, 'crisp mid 0..100');
near(crispScore(240, 120), 50, 1, 'crisp midpoint ~50'); // hi=360, (240-120)/(360-120)=0.5

// ---------- buildOrnament ----------
arrEq(buildOrnament({ type: 'grace', main: 60, direction: 'upper', interval: 2 }), [62, 60], 'grace upper');
arrEq(buildOrnament({ type: 'grace', main: 60, direction: 'lower', interval: 1 }), [59, 60], 'grace lower semitone');
arrEq(buildOrnament({ type: 'mordent', main: 60, direction: 'upper', interval: 2 }), [60, 62, 60], 'mordent upper');
arrEq(buildOrnament({ type: 'mordent', main: 60, direction: 'lower', interval: 2 }), [60, 58, 60], 'mordent lower');
arrEq(buildOrnament({ type: 'turn', main: 60, interval: 2 }), [62, 60, 58, 60], 'turn sequence');
arrEq(buildOrnament({ type: 'mordent', main: 67, direction: 'upper', interval: 1 }), [67, 68, 67], 'mordent G4 semitone');
eq(buildOrnament({}).length, 3, 'default mordent length 3');
let threw = false;
try { buildOrnament({ type: 'nope' }); } catch (e) { threw = true; }
ok(threw, 'unknown type throws');

// ---------- ORNAMENT_LABELS ----------
eq(ORNAMENT_LABELS.grace, '倚音', 'label grace');
eq(ORNAMENT_LABELS.mordent, '波音', 'label mordent');
eq(ORNAMENT_LABELS.turn, '回音', 'label turn');

// ---------- OrnamentTrainer: 构造 + 序列 ----------
{
  const t = new OrnamentTrainer({ type: 'mordent', main: 60, direction: 'upper', interval: 2 });
  arrEq(t.seq, [60, 62, 60], 'trainer mordent seq');
  eq(t.length, 3, 'trainer length');
  eq(t.progress, 0, 'initial progress 0');
  eq(t.expected, 60, 'initial expected = first note');
  eq(t.done, false, 'not done initially');
  eq(t.best, 0, 'best 0 initially');
}

// ---------- 完整正确演奏 mordent ----------
{
  const t = new OrnamentTrainer({ type: 'mordent', main: 60, interval: 2, crisp: 120 });
  let completed = null;
  t.onComplete = (r) => { completed = r; };
  eq(t.feed(60, 0), 'hit', 'mordent hit 1');
  eq(t.feed(62, 80), 'hit', 'mordent hit 2');
  eq(t.feed(60, 160), 'done', 'mordent done');
  ok(completed !== null, 'onComplete fired');
  eq(completed.notes, 3, 'result notes 3');
  eq(completed.wrongNotes, 0, 'no wrong notes');
  eq(t.done, true, 'trainer done');
  eq(completed.meanIoi, 80, 'meanIoi 80');
  eq(completed.speed, 100, 'speed 100 (under crisp)');
  eq(completed.evenness, 100, 'evenness 100 (constant iois)');
  eq(completed.score, 100, 'perfect score 100');
  eq(t.best, 100, 'best updated to 100');
  eq(t.runs, 1, 'runs 1');
  eq(t.feed(60, 200), 'idle', 'feed after done -> idle');
}

// ---------- 弹错音不推进 ----------
{
  const t = new OrnamentTrainer({ type: 'mordent', main: 60, interval: 2 });
  eq(t.feed(60, 0), 'hit', 'first ok');
  eq(t.feed(63, 50), 'wrong', 'wrong note detected');
  eq(t.progress, 1, 'progress not advanced on wrong');
  eq(t.expected, 62, 'still expecting 62');
  eq(t.feed(62, 100), 'hit', 'recover with correct note');
  eq(t.feed(60, 150), 'done', 'finish');
  eq(t.lastResult.wrongNotes, 1, 'one wrong recorded');
  ok(t.lastResult.score < 100, 'wrong note lowers score');
}

// ---------- onHit 回调 ----------
{
  const t = new OrnamentTrainer({ type: 'grace', main: 64, direction: 'lower', interval: 2 });
  arrEq(t.seq, [62, 64], 'grace lower seq');
  const hits = [];
  t.onHit = (info) => hits.push(info);
  t.feed(99, 0);  // wrong
  t.feed(62, 10);
  t.feed(64, 60);
  eq(hits.length, 3, 'three onHit calls');
  eq(hits[0].kind, 'wrong', 'first wrong');
  eq(hits[0].expected, 62, 'wrong expected reported');
  eq(hits[1].kind, 'hit', 'second hit');
  eq(hits[1].index, 0, 'hit index 0');
  eq(hits[2].index, 1, 'hit index 1');
}

// ---------- turn 四音序列 ----------
{
  const t = new OrnamentTrainer({ type: 'turn', main: 60, interval: 2, crisp: 100 });
  let r = null; t.onComplete = (x) => { r = x; };
  eq(t.feed(62, 0), 'hit', 'turn n1');
  eq(t.feed(60, 90), 'hit', 'turn n2');
  eq(t.feed(58, 185), 'hit', 'turn n3');
  eq(t.feed(60, 275), 'done', 'turn done');
  eq(r.notes, 4, 'turn 4 notes');
  ok(r.evenness > 80, 'turn fairly even');
  eq(r.type, 'turn', 'result type turn');
}

// ---------- 慢速装饰音速度分降低 ----------
{
  const t = new OrnamentTrainer({ type: 'mordent', main: 60, interval: 2, crisp: 100 });
  let r = null; t.onComplete = (x) => { r = x; };
  t.feed(60, 0);
  t.feed(62, 400);  // 很慢
  t.feed(60, 800);
  eq(r.meanIoi, 400, 'slow meanIoi 400');
  ok(r.speed < 50, 'slow speed score low'); // 400 vs crisp 100, hi=300 -> 0
  eq(r.speed, 0, 'speed 0 beyond 3x crisp');
}

// ---------- restart 保留 best/runs ----------
{
  const t = new OrnamentTrainer({ type: 'grace', main: 60, interval: 2 });
  t.feed(62, 0); t.feed(60, 50); // perfect-ish run
  const best1 = t.best, runs1 = t.runs;
  ok(best1 > 0, 'best after first run > 0');
  eq(runs1, 1, 'runs 1');
  t.restart();
  eq(t.progress, 0, 'restart resets progress');
  eq(t.done, false, 'restart not done');
  eq(t.best, best1, 'restart keeps best');
  eq(t.runs, runs1, 'restart keeps runs');
}

// ---------- rebuild 改参数 ----------
{
  const t = new OrnamentTrainer({ type: 'mordent', main: 60, interval: 2 });
  t.type = 'grace'; t.main = 67; t.direction = 'upper'; t.interval = 1;
  t.rebuild();
  arrEq(t.seq, [68, 67], 'rebuild grace upper semitone');
  eq(t.progress, 0, 'rebuild resets progress');
}

// ---------- finish 手动结束 ----------
{
  const t = new OrnamentTrainer({ type: 'turn', main: 60, interval: 2 });
  t.feed(62, 0); t.feed(60, 80);
  let r = null; t.onComplete = (x) => { r = x; };
  t.finish();
  ok(t.done, 'manual finish sets done');
  ok(r !== null, 'finish triggers onComplete');
  eq(r.notes, 4, 'finish still reports full target length');
}

// ---------- expected/length getters ----------
{
  const t = new OrnamentTrainer({ type: 'grace', main: 72, direction: 'lower', interval: 2 });
  eq(t.length, 2, 'grace length 2');
  eq(t.expected, 70, 'grace expected first = main-interval');
  t.feed(70, 0);
  eq(t.expected, 72, 'next expected = main');
  t.feed(72, 30);
  eq(t.expected, null, 'expected null when done');
}

console.log(`ornament: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
