import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RHYTHM_LEVELS, levelById, durName, randomDur, pickNext,
  tapsToGaps, gradeRhythm, RhythmEcho,
} from './rhythm-echo.js';

// ---- levels ----
test('RHYTHM_LEVELS has 4 levels with required fields', () => {
  assert.equal(RHYTHM_LEVELS.length, 4);
  for (const l of RHYTHM_LEVELS) {
    assert.ok(l.id && l.name && Array.isArray(l.pool) && l.pool.length >= 2);
    assert.ok(l.startLen >= 2);
    assert.ok(l.tol > 0 && l.tol < 1);
  }
});

test('levelById finds level / falls back to first', () => {
  assert.equal(levelById('mixed').id, 'mixed');
  assert.equal(levelById('nope').id, RHYTHM_LEVELS[0].id);
});

// ---- durName ----
test('durName maps common durations to symbols', () => {
  assert.equal(durName(0.5), '♪');
  assert.equal(durName(1), '♩');
  assert.equal(durName(1.5), '♩.');
  assert.equal(durName(2), '𝅗𝅥');
  assert.equal(durName(0.75), '0.75拍');
});

// ---- randomDur / pickNext ----
test('randomDur returns a pool member', () => {
  const pool = [0.5, 1, 2];
  for (let i = 0; i < 20; i++) assert.ok(pool.includes(randomDur(pool, Math.random)));
});

test('pickNext avoids immediate repeat when possible', () => {
  const pool = [1, 2];
  let calls = 0;
  const rng = () => (calls++ === 0 ? 0 : 0.9); // first->1, retry->2
  const n = pickNext(1, pool, rng);
  assert.notEqual(n, 1);
});

test('pickNext returns single element when pool has one', () => {
  assert.equal(pickNext(2, [1], Math.random), 1);
});

// ---- tapsToGaps ----
test('tapsToGaps converts timestamps to intervals', () => {
  assert.deepEqual(tapsToGaps([0, 500, 1000, 1250]), [500, 500, 250]);
  assert.deepEqual(tapsToGaps([100]), []);
  assert.deepEqual(tapsToGaps([]), []);
});

// ---- gradeRhythm ----
test('perfect reproduction at 500ms/beat passes all gaps', () => {
  // pattern [1,1,2] -> expected gaps [1,1] beats; at 500ms/beat: taps at 0,500,1000
  const taps = [0, 500, 1000];
  const g = gradeRhythm(taps, [1, 1, 2], 0.35);
  assert.ok(g.countOk);
  assert.equal(g.expectedTaps, 3);
  assert.equal(g.actualTaps, 3);
  assert.ok(g.allOk);
  assert.ok(Math.abs(g.scale - 500) < 1e-6);
  assert.ok(g.accuracy > 0.99);
  assert.equal(g.firstError, -1);
});

test('reproduction is tempo-independent (same ratios, different speed)', () => {
  // pattern [1,1,2] expected gaps [1,1]; play twice as fast: 0,250,500
  const g = gradeRhythm([0, 250, 500], [1, 1, 2], 0.35);
  assert.ok(g.allOk);
  assert.ok(Math.abs(g.scale - 250) < 1e-6);
});

test('long-short pattern detects correct ratio', () => {
  // pattern [1,2,1] expected gaps [1,2] -> short then long; taps 0,400,1200 (gaps 400,800 = 1:2)
  const g = gradeRhythm([0, 400, 1200], [1, 2, 1], 0.35);
  assert.ok(g.allOk);
});

test('swapped long-short fails (ratio inverted)', () => {
  // expected gaps [1,2] but user plays [2,1]-ish: taps 0,800,1200 (gaps 800,400)
  const g = gradeRhythm([0, 800, 1200], [1, 2, 1], 0.35);
  assert.equal(g.allOk, false);
  assert.ok(g.firstError >= 0);
});

test('wrong tap count fails with countOk false', () => {
  const g = gradeRhythm([0, 500], [1, 1, 2], 0.35); // 2 taps, expected 3
  assert.equal(g.countOk, false);
  assert.equal(g.allOk, false);
  assert.equal(g.actualTaps, 2);
  assert.equal(g.expectedTaps, 3);
});

test('small timing wobble within tolerance still passes', () => {
  // expected gaps [1,1] @500ms; user: 0, 540, 1020 (gaps 540,480) within 35%
  const g = gradeRhythm([0, 540, 1020], [1, 1, 2], 0.35);
  assert.ok(g.allOk);
});

test('large timing error beyond tolerance fails that gap', () => {
  // expected gaps [1,1]; user gaps 200, 800 -> scale=500, gap0 err=(500-200)/500=.6 fail
  const g = gradeRhythm([0, 200, 1000], [1, 1, 2], 0.35);
  assert.equal(g.allOk, false);
  assert.equal(g.firstError, 0);
  assert.equal(g.perGap[0].ok, false);
});

test('accuracy is between 0 and 1', () => {
  const g = gradeRhythm([0, 300, 1100], [1, 1, 2], 0.35);
  assert.ok(g.accuracy >= 0 && g.accuracy <= 1);
});

// ---- RhythmEcho state machine ----
test('RhythmEcho lifecycle: idle -> showing -> input -> win -> grow', () => {
  let i = 0;
  const rng = () => [0.0, 0.9, 0.0, 0.9][i++ % 4]; // deterministic-ish
  const g = new RhythmEcho({ pool: [1, 2], startLen: 3, tol: 0.4, rng });
  assert.equal(g.state, 'idle');
  const seq = g.start();
  assert.equal(g.state, 'showing');
  assert.equal(seq.length, 3);
  g.ready();
  assert.equal(g.state, 'input');

  // build perfect taps for current seq at 500ms/beat
  const expGaps = g.seq.slice(0, g.seq.length - 1);
  const taps = [0];
  let t = 0;
  for (const eb of expGaps) { t += eb * 500; taps.push(t); }
  const res = g.submit(taps);
  assert.ok(res.allOk);
  assert.equal(g.state, 'win');
  assert.equal(g.rounds, 1);
  assert.equal(g.best, 3);

  const grown = g.grow();
  assert.equal(g.state, 'showing');
  assert.equal(grown.length, 4);
});

test('submit only works in input state', () => {
  const g = new RhythmEcho({ pool: [1, 2], startLen: 2, tol: 0.4 });
  assert.equal(g.submit([0, 500]), null); // idle
  g.start();
  assert.equal(g.submit([0, 500]), null); // showing
  g.ready();
  assert.notEqual(g.submit([0, 500]), null); // input -> grades
});

test('failed submit sets fail state and keeps best', () => {
  const g = new RhythmEcho({ pool: [1, 2], startLen: 3, tol: 0.30, rng: () => 0 });
  g.start(); // pool[0]=1 every time -> seq [1,1,1], but pickNext avoids repeats... rng=0 always picks index0=1, guard breaks -> [1,1,1]
  g.ready();
  // wrong tap count -> fail
  const res = g.submit([0, 500]);
  assert.equal(res.allOk, false);
  assert.equal(g.state, 'fail');
  assert.equal(g.best, 0);
  assert.equal(g.rounds, 0);
});

test('grade result carries length', () => {
  const g = new RhythmEcho({ pool: [1, 2], startLen: 3, tol: 0.4, rng: () => 0.1 });
  g.start();
  g.ready();
  const res = g.submit([0, 500, 1000]);
  assert.equal(res.length, g.seq.length);
});

test('restart preserves best and starts fresh', () => {
  const g = new RhythmEcho({ pool: [1, 2], startLen: 3, tol: 0.5, rng: () => 0.1 });
  g.start(); g.ready();
  const expGaps = g.seq.slice(0, g.seq.length - 1);
  const taps = [0]; let t = 0;
  for (const eb of expGaps) { t += eb * 500; taps.push(t); }
  g.submit(taps);
  const best = g.best;
  assert.ok(best >= 3);
  const seq = g.restart();
  assert.equal(g.best, best);
  assert.equal(g.rounds, 0);
  assert.equal(g.state, 'showing');
  assert.equal(seq.length, 3);
});

test('reset clears everything', () => {
  const g = new RhythmEcho({ pool: [1, 2], startLen: 3, tol: 0.4 });
  g.start(); g.ready(); g.submit([0, 500, 1000]);
  g.reset();
  assert.equal(g.state, 'idle');
  assert.equal(g.seq.length, 0);
  assert.equal(g.rounds, 0);
  assert.equal(g.best, 0);
  assert.equal(g.lastGrade, null);
});
