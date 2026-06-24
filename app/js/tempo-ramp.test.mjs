/**
 * tempo-ramp.test.mjs — 速度渐变引擎单元测试
 * 运行：node js/tempo-ramp.test.mjs
 */
import { TEMPO_DIRECTIONS, toIois, ioiToBpm, idealLine, tempoScore, TempoRampTrainer } from './tempo-ramp.js';

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
// 由 IOI 序列造时间戳（从 0 开始累加）
function timesFromIois(iois) {
  const t = [0];
  for (const d of iois) t.push(t[t.length - 1] + d);
  return t;
}

// ---------- TEMPO_DIRECTIONS ----------
eq(TEMPO_DIRECTIONS.accel.iioSign, -1, 'accel IOI sign -1 (间隔变小)');
eq(TEMPO_DIRECTIONS.rit.iioSign, 1, 'rit IOI sign +1 (间隔变大)');
ok(TEMPO_DIRECTIONS.accel.name === '渐快', 'accel name');
ok(TEMPO_DIRECTIONS.rit.name === '渐慢', 'rit name');

// ---------- toIois ----------
arrEq(toIois([]), [], 'empty -> []');
arrEq(toIois([100]), [], 'single -> []');
arrEq(toIois([0, 100, 250, 400]), [100, 150, 150], 'iois basic');
arrEq(toIois([0, 500, 900]), [500, 400], 'iois shrinking');

// ---------- ioiToBpm ----------
eq(ioiToBpm(500), 120, '500ms -> 120 BPM');
eq(ioiToBpm(1000), 60, '1000ms -> 60 BPM');
eq(ioiToBpm(0), 0, '0 -> 0');
eq(ioiToBpm(-5), 0, 'negative -> 0');

// ---------- idealLine ----------
arrEq(idealLine(40, 40, 1), [40], 'single point');
arrEq(idealLine(100, 500, 5), [100, 200, 300, 400, 500], 'linear line');
arrEq(idealLine(500, 100, 5), [500, 400, 300, 200, 100], 'descending line');

// ---------- tempoScore: too few ----------
{
  const r = tempoScore([], { direction: 'accel' });
  eq(r.score, 0, 'empty -> 0');
  eq(r.steps, 0, 'empty steps 0');
}
{
  // only 2 times -> 1 IOI -> still < 2 iois -> 0
  const r = tempoScore([0, 500], { direction: 'accel' });
  eq(r.score, 0, '1 IOI -> 0');
}

// ---------- tempoScore: perfect accelerando ----------
{
  // IOIs steadily shrinking, linear
  const iois = [500, 400, 300, 200];
  const r = tempoScore(timesFromIois(iois), { direction: 'accel', minRatio: 0.4, smoothTol: 0.25 });
  eq(r.monotonic, 1, 'accel monotonic 1');
  eq(r.correctSteps, 3, 'all 3 IOI steps shrink');
  eq(r.steps, 3, 'steps 3');
  near(r.smoothness, 1, 0.001, 'linear IOIs -> smoothness 1');
  // change = (500-200)/500 = 0.6 -> /0.4 capped at 1
  eq(r.spanScore, 1, 'big accel -> spanScore 1');
  eq(r.score, 100, 'perfect accel -> 100');
  near(r.ratio, 0.4, 0.001, 'ratio last/first = 200/500');
}

// ---------- tempoScore: perfect ritardando ----------
{
  const iois = [200, 300, 400, 500];
  const r = tempoScore(timesFromIois(iois), { direction: 'rit', minRatio: 0.4 });
  eq(r.monotonic, 1, 'rit monotonic 1');
  // change = (500-200)/200 = 1.5 -> capped 1
  eq(r.spanScore, 1, 'big rit -> spanScore 1');
  near(r.smoothness, 1, 0.001, 'linear -> smooth 1');
  eq(r.score, 100, 'perfect rit -> 100');
}

// ---------- tempoScore: wrong direction ----------
{
  // shrinking IOIs (accel) but rit expected
  const iois = [500, 400, 300, 200];
  const r = tempoScore(timesFromIois(iois), { direction: 'rit' });
  eq(r.monotonic, 0, 'accel vs rit expected -> monotonic 0');
  ok(r.score < 60, 'wrong direction low score');
}

// ---------- tempoScore: steady tempo (no change) ----------
{
  const iois = [400, 400, 400, 400];
  const r = tempoScore(timesFromIois(iois), { direction: 'accel' });
  eq(r.monotonic, 0, 'steady -> no shrinking steps');
  eq(r.spanScore, 0, 'steady spanScore 0');
  near(r.smoothness, 1, 0.001, 'steady is smooth (matches flat ideal)');
  eq(r.score, 30, 'steady accel -> only smoothness 0.3*100=30');
}

// ---------- tempoScore: partial direction ----------
{
  // 3 shrink, 1 grow
  const iois = [500, 400, 300, 350, 150];
  const r = tempoScore(timesFromIois(iois), { direction: 'accel' });
  eq(r.steps, 4, 'steps 4');
  eq(r.correctSteps, 3, '3 of 4 shrink');
  near(r.monotonic, 0.75, 0.001, 'monotonic 0.75');
}

// ---------- tempoScore: jagged less smooth ----------
{
  const smooth = tempoScore(timesFromIois([500, 400, 300, 200]), { direction: 'accel' });
  const jagged = tempoScore(timesFromIois([500, 250, 380, 200]), { direction: 'accel' });
  ok(jagged.smoothness < smooth.smoothness, 'jagged less smooth');
}

// ---------- tempoScore: bpms output ----------
{
  const r = tempoScore(timesFromIois([500, 250]), { direction: 'accel' });
  arrEq(r.bpms, [120, 240], 'bpms computed from iois');
}

// ---------- TempoRampTrainer: basic feed + auto finish ----------
{
  const t = new TempoRampTrainer({ direction: 'accel', count: 5 });
  let completed = null;
  const taps = [];
  t.onTap = (time, i, c, ioi) => taps.push([time, i, c, ioi]);
  t.onComplete = (r) => { completed = r; };
  const times = timesFromIois([500, 400, 300, 200]); // 5 times
  eq(t.feed(times[0]), null, 'feed1 null');
  eq(t.feed(times[1]), null, 'feed2 null');
  eq(t.feed(times[2]), null, 'feed3 null');
  eq(t.feed(times[3]), null, 'feed4 null');
  ok(completed === null, 'not complete yet');
  const r = t.feed(times[4]);
  ok(r !== null, 'feed5 returns result');
  ok(completed === r, 'onComplete fired');
  eq(t.progress, 5, 'progress 5');
  ok(t.done, 'done');
  eq(taps.length, 5, '5 taps');
  arrEq(taps[0], [0, 1, 5, null], 'first tap no ioi');
  arrEq(taps[1], [500, 2, 5, 500], 'second tap ioi 500');
  eq(r.score, 100, 'perfect accel -> 100');
}

// ---------- TempoRampTrainer: feed beyond count ignored ----------
{
  const t = new TempoRampTrainer({ direction: 'accel', count: 3 });
  t.feed(0); t.feed(400); t.feed(700);
  eq(t.feed(900), null, 'feed after done -> null');
  eq(t.progress, 3, 'progress stays 3');
}

// ---------- TempoRampTrainer: best + rounds + reset ----------
{
  const t = new TempoRampTrainer({ direction: 'accel', count: 4 });
  timesFromIois([600, 400, 200]).forEach((x) => t.feed(x)); // perfect-ish
  eq(t.rounds, 1, 'rounds 1');
  ok(t.best > 80, 'best high');
  const firstBest = t.best;
  t.reset();
  eq(t.progress, 0, 'reset clears buffer');
  timesFromIois([400, 400, 400]).forEach((x) => t.feed(x)); // steady
  eq(t.rounds, 2, 'rounds 2');
  eq(t.best, firstBest, 'best preserved');
  ok(t.lastResult.score < firstBest, 'second worse');
}

// ---------- TempoRampTrainer: resetAll ----------
{
  const t = new TempoRampTrainer({ direction: 'accel', count: 3 });
  t.feed(0); t.feed(400); t.feed(700);
  t.resetAll();
  eq(t.rounds, 0, 'resetAll rounds 0');
  eq(t.best, 0, 'resetAll best 0');
  eq(t.progress, 0, 'resetAll progress 0');
  ok(t.lastResult === null, 'resetAll lastResult null');
}

// ---------- TempoRampTrainer: setDirection / setCount ----------
{
  const t = new TempoRampTrainer({ direction: 'accel', count: 9 });
  t.setDirection('rit');
  eq(t.direction, 'rit', 'setDirection rit');
  t.setDirection('junk');
  eq(t.direction, 'accel', 'invalid -> accel');
  t.setCount(6);
  eq(t.count, 6, 'setCount 6');
  t.setCount(2);
  eq(t.count, 3, 'setCount min 3');
}

// ---------- TempoRampTrainer: constructor count min 3 ----------
{
  const t = new TempoRampTrainer({ count: 2 });
  eq(t.count, 3, 'constructor count min 3');
}

// ---------- TempoRampTrainer: rit round carries direction ----------
{
  const t = new TempoRampTrainer({ direction: 'rit', count: 4 });
  const r = (() => { const ts = timesFromIois([200, 350, 500]); t.feed(ts[0]); t.feed(ts[1]); t.feed(ts[2]); return t.feed(ts[3]); })();
  eq(r.direction, 'rit', 'result carries rit');
  ok(r.score >= 80, 'good rit scores high');
}

console.log(`tempo-ramp: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
