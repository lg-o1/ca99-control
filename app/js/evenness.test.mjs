/**
 * evenness.test.mjs — 颗粒性/均匀度引擎单元测试
 */
import {
  mean, stddev, cv, toIois, cvToScore, evennessScore, EvennessTrainer,
} from './evenness.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b}±${eps})`); }

// ---- mean ----
approx(mean([2, 4, 6]), 4, 1e-9, 'mean basic');
ok(mean([]) === 0, 'mean empty = 0');
approx(mean([1, 2, 3, 'x', NaN]), 2, 1e-9, 'mean filters non-numbers');

// ---- stddev ----
ok(stddev([5, 5, 5]) === 0, 'stddev equal = 0');
approx(stddev([2, 4]), 1, 1e-9, 'stddev [2,4] = 1 (population)');
ok(stddev([]) === 0, 'stddev empty = 0');

// ---- cv ----
ok(cv([10, 10, 10]) === 0, 'cv equal = 0');
approx(cv([2, 4]), 1 / 3, 1e-9, 'cv [2,4] = std1/mean3');
ok(cv([0, 0]) === 0, 'cv mean 0 = 0');
ok(cv([-5, 5]) === 0, 'cv non-positive mean = 0');

// ---- toIois ----
{
  const i = toIois([100, 200, 350]);
  ok(i.length === 2 && i[0] === 100 && i[1] === 150, 'toIois diffs');
  ok(toIois([5]).length === 0, 'toIois single = empty');
  ok(toIois([]).length === 0, 'toIois empty');
}

// ---- cvToScore ----
ok(cvToScore(0, 0.2) === 1, 'cvToScore 0 -> 1');
ok(cvToScore(0.2, 0.2) === 0, 'cvToScore at tol -> 0');
ok(cvToScore(0.5, 0.2) === 0, 'cvToScore beyond tol clamps 0');
approx(cvToScore(0.1, 0.2), 0.5, 1e-9, 'cvToScore half');
ok(cvToScore(0.1, 0) === 0 || cvToScore(0.1, 0) >= 0, 'cvToScore tol 0 safe');

// ---- evennessScore: perfect run ----
{
  const evs = [];
  for (let k = 0; k < 8; k++) evs.push({ velocity: 80, time: k * 150 });
  const r = evennessScore(evs);
  ok(r.score === 100, 'perfect even run -> 100');
  ok(r.velScore === 1 && r.timingScore === 1, 'perfect sub-scores 1');
  ok(r.velCV === 0 && r.ioiCV === 0, 'perfect CV 0');
  approx(r.velMean, 80, 1e-9, 'velMean 80');
  approx(r.ioiMean, 150, 1e-9, 'ioiMean 150');
  approx(r.bpm, 400, 1e-9, 'bpm = 60000/150');
  ok(r.n === 8, 'n = 8');
  ok(r.iois.length === 7, '7 iois');
  ok(r.velDev.every((d) => d === 0), 'velDev all 0');
  ok(r.ioiDev.every((d) => d === 0), 'ioiDev all 0');
}

// ---- evennessScore: too few notes ----
{
  const r = evennessScore([{ velocity: 80, time: 0 }, { velocity: 80, time: 100 }]);
  ok(r.score === 0, 'fewer than 3 notes -> score 0');
  ok(r.n === 2, 'n reported even when too few');
}

// ---- evennessScore: uneven velocity hurts velScore only ----
{
  // even timing, jumpy velocity
  const evs = [];
  const vels = [40, 110, 50, 100, 45, 115, 55, 105];
  for (let k = 0; k < vels.length; k++) evs.push({ velocity: vels[k], time: k * 150 });
  const r = evennessScore(evs);
  ok(r.timingScore === 1, 'jumpy velocity keeps timingScore 1');
  ok(r.velScore < 0.5, 'jumpy velocity low velScore');
  ok(r.velCV > 0.22, 'high vel CV');
  ok(r.score < 60, 'overall pulled down by velocity');
}

// ---- evennessScore: uneven timing hurts timingScore only ----
{
  const times = [0, 100, 400, 500, 900, 1000, 1500, 1600];
  const evs = times.map((t) => ({ velocity: 80, time: t }));
  const r = evennessScore(evs);
  ok(r.velScore === 1, 'even velocity keeps velScore 1');
  ok(r.timingScore < 0.6, 'jumpy timing low timingScore');
  ok(r.ioiCV > 0.2, 'high ioi CV');
}

// ---- evennessScore: velWeight shifts emphasis ----
{
  const vels = [40, 110, 50, 100, 45, 115, 55, 105];
  const evs = vels.map((v, k) => ({ velocity: v, time: k * 150 }));
  const heavyVel = evennessScore(evs, { velWeight: 0.9 });
  const lightVel = evennessScore(evs, { velWeight: 0.1 });
  ok(heavyVel.score < lightVel.score, 'higher velWeight penalizes jumpy velocity more');
}

// ---- evennessScore: tolerances ----
{
  const vels = [70, 90, 70, 90, 70, 90, 70, 90];
  const evs = vels.map((v, k) => ({ velocity: v, time: k * 150 }));
  const tight = evennessScore(evs, { velTol: 0.1 });
  const loose = evennessScore(evs, { velTol: 0.5 });
  ok(loose.velScore > tight.velScore, 'looser velTol -> higher velScore');
}

// ---- EvennessTrainer: auto-finish + callbacks ----
{
  const tr = new EvennessTrainer({ count: 6 });
  let taps = 0, completes = 0, result = null;
  tr.onTap = () => { taps++; };
  tr.onComplete = (r) => { completes++; result = r; };
  for (let k = 0; k < 5; k++) {
    const ret = tr.feed(60 + k, 80, k * 150);
    ok(ret === null, `feed ${k} returns null before count`);
  }
  ok(tr.progress === 5 && !tr.done, 'progress 5, not done');
  const last = tr.feed(72, 80, 5 * 150);
  ok(last && last.score === 100, 'final feed returns perfect result');
  ok(taps === 6 && completes === 1, 'onTap x6, onComplete x1');
  ok(result && result.events.length === 6, 'result carries events');
  ok(tr.rounds === 1 && tr.best === 100, 'rounds/best updated');
  ok(tr.feed(80, 80, 999) === null, 'feed after done ignored');
}

// ---- EvennessTrainer: best keeps max across rounds ----
{
  const tr = new EvennessTrainer({ count: 4 });
  // round 1: jumpy
  tr.feed(60, 30, 0); tr.feed(62, 120, 100); tr.feed(64, 35, 500); tr.feed(65, 110, 560);
  const b1 = tr.best;
  tr.reset();
  // round 2: perfect
  tr.feed(60, 80, 0); tr.feed(62, 80, 150); tr.feed(64, 80, 300); tr.feed(65, 80, 450);
  ok(tr.best === 100, 'best updates to 100 in round 2');
  ok(tr.best >= b1, 'best monotonic');
  ok(tr.rounds === 2, 'rounds = 2');
}

// ---- EvennessTrainer: resetAll clears stats ----
{
  const tr = new EvennessTrainer({ count: 3 });
  tr.feed(60, 80, 0); tr.feed(62, 80, 150); tr.feed(64, 80, 300);
  ok(tr.best === 100 && tr.rounds === 1, 'pre-resetAll state');
  tr.resetAll();
  ok(tr.best === 0 && tr.rounds === 0 && tr.events.length === 0 && tr.lastResult === null, 'resetAll clears');
}

// ---- EvennessTrainer: setCount clamps ----
{
  const tr = new EvennessTrainer({ count: 8 });
  tr.setCount(2);
  ok(tr.count === 3, 'setCount clamps to >=3');
  tr.setCount(10);
  ok(tr.count === 10, 'setCount accepts 10');
}

console.log(`evenness: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
