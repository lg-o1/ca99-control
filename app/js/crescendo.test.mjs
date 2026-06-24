/**
 * crescendo.test.mjs — 力度渐变曲线引擎单元测试
 * 运行：node js/crescendo.test.mjs
 */
import { CRESC_DIRECTIONS, idealRamp, rampScore, CrescendoTrainer } from './crescendo.js';

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
function arrEq(a, b, msg) {
  const same = a.length === b.length && a.every((x, i) => x === b[i]);
  if (same) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got [${a}], want [${b}]`); }
}

// ---------- CRESC_DIRECTIONS ----------
eq(CRESC_DIRECTIONS.cresc.sign, 1, 'cresc sign +1');
eq(CRESC_DIRECTIONS.decresc.sign, -1, 'decresc sign -1');
ok(CRESC_DIRECTIONS.cresc.name === '渐强', 'cresc name');
ok(CRESC_DIRECTIONS.decresc.name === '渐弱', 'decresc name');

// ---------- idealRamp ----------
arrEq(idealRamp(40, 40, 1), [40], 'single point ramp');
arrEq(idealRamp(20, 100, 5), [20, 40, 60, 80, 100], 'linear ramp 5');
arrEq(idealRamp(100, 20, 5), [100, 80, 60, 40, 20], 'descending ramp');
// clamp out of range
{
  const r = idealRamp(-10, 200, 3);
  eq(r[0], 1, 'ramp clamps low to 1');
  eq(r[2], 127, 'ramp clamps high to 127');
}
// rounding
arrEq(idealRamp(30, 60, 4), [30, 40, 50, 60], 'ramp rounds evenly');

// ---------- rampScore: too few notes ----------
{
  const r = rampScore([], { direction: 'cresc' });
  eq(r.score, 0, 'empty -> 0');
  eq(r.steps, 0, 'empty steps 0');
}
{
  const r = rampScore([50], { direction: 'cresc' });
  eq(r.score, 0, 'single -> 0');
}

// ---------- rampScore: perfect crescendo ----------
{
  const r = rampScore([20, 40, 60, 80, 100], { direction: 'cresc', minSpan: 40, smoothTol: 18 });
  eq(r.monotonic, 1, 'perfect cresc monotonic 1');
  eq(r.correctSteps, 4, 'all 4 steps correct');
  eq(r.steps, 4, 'steps = 4');
  eq(r.span, 80, 'span 80');
  eq(r.spanScore, 1, 'span beyond minSpan -> 1');
  near(r.smoothness, 1, 0.001, 'linear -> smoothness 1');
  eq(r.score, 100, 'perfect linear cresc -> 100');
}

// ---------- rampScore: perfect decrescendo ----------
{
  const r = rampScore([100, 80, 60, 40, 20], { direction: 'decresc', minSpan: 40 });
  eq(r.monotonic, 1, 'perfect decresc monotonic 1');
  eq(r.span, 80, 'decresc span 80');
  eq(r.score, 100, 'perfect decresc -> 100');
}

// ---------- rampScore: wrong direction ----------
{
  // ascending played, but decresc expected
  const r = rampScore([20, 40, 60, 80], { direction: 'decresc' });
  eq(r.monotonic, 0, 'ascending vs decresc -> monotonic 0');
  ok(r.score < 60, 'wrong direction scores low');
}

// ---------- rampScore: flat line ----------
{
  const r = rampScore([60, 60, 60, 60], { direction: 'cresc' });
  eq(r.monotonic, 0, 'flat -> no correct steps');
  eq(r.span, 0, 'flat span 0');
  eq(r.spanScore, 0, 'flat spanScore 0');
  // smoothness high (matches ideal flat), but monotonic+span 0
  near(r.smoothness, 1, 0.001, 'flat is smooth');
  eq(r.score, 30, 'flat cresc -> only smoothness 0.3*100=30');
}

// ---------- rampScore: partial correct direction ----------
{
  // 3 up steps, 1 down step
  const r = rampScore([20, 40, 60, 50, 90], { direction: 'cresc' });
  eq(r.steps, 4, 'steps 4');
  eq(r.correctSteps, 3, '3 of 4 steps up');
  near(r.monotonic, 0.75, 0.001, 'monotonic 0.75');
}

// ---------- rampScore: span scaling ----------
{
  // small span -> partial span score
  const r = rampScore([50, 55, 60, 70], { direction: 'cresc', minSpan: 40 });
  eq(r.span, 20, 'span 20');
  near(r.spanScore, 0.5, 0.001, 'span 20/40 -> 0.5');
}

// ---------- rampScore: jagged but right direction reduces smoothness ----------
{
  const smooth = rampScore([20, 40, 60, 80, 100], { direction: 'cresc' });
  const jagged = rampScore([20, 70, 30, 95, 100], { direction: 'cresc' });
  ok(jagged.smoothness < smooth.smoothness, 'jagged less smooth than linear');
}

// ---------- CrescendoTrainer: basic feed + auto finish ----------
{
  const t = new CrescendoTrainer({ direction: 'cresc', count: 4 });
  let completed = null;
  const notes = [];
  t.onNote = (v, i, c) => notes.push([v, i, c]);
  t.onComplete = (r) => { completed = r; };
  eq(t.feed(20), null, 'feed 1 no finish');
  eq(t.feed(40), null, 'feed 2 no finish');
  eq(t.feed(60), null, 'feed 3 no finish');
  ok(completed === null, 'not complete before count');
  const r = t.feed(80);
  ok(r !== null, 'feed 4 returns result');
  ok(completed === r, 'onComplete fired with result');
  eq(t.progress, 4, 'progress 4');
  ok(t.done, 'done true');
  eq(notes.length, 4, 'onNote fired 4x');
  arrEq(notes[0], [20, 1, 4], 'first onNote args');
  arrEq(notes[3], [80, 4, 4], 'last onNote args');
  eq(r.score, 100, 'perfect cresc score 100');
}

// ---------- CrescendoTrainer: feed beyond count ignored ----------
{
  const t = new CrescendoTrainer({ direction: 'cresc', count: 3 });
  t.feed(30); t.feed(50); t.feed(70);
  eq(t.feed(90), null, 'feed after done -> null');
  eq(t.progress, 3, 'progress stays 3');
}

// ---------- CrescendoTrainer: velocity clamping ----------
{
  const t = new CrescendoTrainer({ direction: 'cresc', count: 2 });
  t.feed(200); // clamps to 127
  const r = t.feed(0); // clamps to 1
  ok(r !== null, 'finishes');
  eq(r.velocities[0], 127, 'clamp high 127');
  eq(r.velocities[1], 1, 'clamp low 1');
}

// ---------- CrescendoTrainer: best + rounds tracking ----------
{
  const t = new CrescendoTrainer({ direction: 'cresc', count: 4 });
  // round 1: perfect
  t.feed(20); t.feed(40); t.feed(60); t.feed(80);
  eq(t.rounds, 1, 'rounds 1');
  eq(t.best, 100, 'best 100');
  // round 2: worse (after reset)
  t.reset();
  eq(t.progress, 0, 'reset clears buffer');
  t.feed(60); t.feed(60); t.feed(60); t.feed(60); // flat
  eq(t.rounds, 2, 'rounds 2');
  eq(t.best, 100, 'best preserved at 100');
  ok(t.lastResult.score < 100, 'last result worse');
}

// ---------- CrescendoTrainer: resetAll ----------
{
  const t = new CrescendoTrainer({ direction: 'cresc', count: 2 });
  t.feed(20); t.feed(80);
  t.resetAll();
  eq(t.rounds, 0, 'resetAll rounds 0');
  eq(t.best, 0, 'resetAll best 0');
  eq(t.progress, 0, 'resetAll progress 0');
  ok(t.lastResult === null, 'resetAll lastResult null');
}

// ---------- CrescendoTrainer: setDirection / setCount ----------
{
  const t = new CrescendoTrainer({ direction: 'cresc', count: 8 });
  t.setDirection('decresc');
  eq(t.direction, 'decresc', 'setDirection works');
  t.setDirection('garbage');
  eq(t.direction, 'cresc', 'invalid -> cresc');
  t.setCount(5);
  eq(t.count, 5, 'setCount works');
  t.setCount(1);
  eq(t.count, 2, 'setCount min 2');
}

// ---------- CrescendoTrainer: count min 2 in constructor ----------
{
  const t = new CrescendoTrainer({ count: 1 });
  eq(t.count, 2, 'constructor count min 2');
}

// ---------- CrescendoTrainer: decresc round ----------
{
  const t = new CrescendoTrainer({ direction: 'decresc', count: 4 });
  const r = (() => { t.feed(100); t.feed(80); t.feed(60); return t.feed(40); })();
  eq(r.direction, 'decresc', 'result carries direction');
  eq(r.score, 100, 'perfect decresc 100');
}

console.log(`crescendo: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
