import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pc, CR_LEVELS, levelById, randomNote, pickNext,
  generateQuestion, scoreAnswer, feedbackFor, CallResponse,
} from './call-response.js';

// ---- pc ----
test('pc maps midi to pitch class 0-11', () => {
  assert.equal(pc(60), 0);
  assert.equal(pc(69), 9);
  assert.equal(pc(72), 0);
  assert.equal(pc(61), 1);
});

// ---- levels ----
test('CR_LEVELS has 4 levels with required fields', () => {
  assert.equal(CR_LEVELS.length, 4);
  for (const l of CR_LEVELS) {
    assert.ok(l.id && l.name && Array.isArray(l.pool) && l.pool.length >= 5);
    assert.equal(typeof l.tonic, 'number');
    assert.ok(l.qlen >= 2);
    // tonic pitch class must be present in the pool
    assert.ok(l.pool.some((n) => pc(n) === pc(l.tonic)));
  }
});

test('levelById finds level / falls back to first', () => {
  assert.equal(levelById('majG').id, 'majG');
  assert.equal(levelById('nope').id, CR_LEVELS[0].id);
});

// ---- randomNote / pickNext ----
test('randomNote returns a pool member', () => {
  const pool = [60, 62, 64];
  for (let i = 0; i < 20; i++) assert.ok(pool.includes(randomNote(pool, Math.random)));
});

test('pickNext avoids immediate repeat when possible', () => {
  const pool = [60, 62];
  // rng that always returns 0 -> would pick 60; pickNext should avoid prev=60 and give 62
  let calls = 0;
  const rng = () => (calls++ === 0 ? 0 : 0.9);
  const n = pickNext(60, pool, rng);
  assert.notEqual(n, 60);
});

test('pickNext returns single element when pool has one', () => {
  assert.equal(pickNext(99, [60], Math.random), 60);
});

// ---- generateQuestion ----
test('generateQuestion produces in-scale notes of given length', () => {
  const { pool, tonic } = levelById('majC');
  const q = generateQuestion(pool, tonic, 3, Math.random);
  assert.equal(q.length, 3);
  const scalePcs = new Set(pool.map(pc));
  for (const n of q) assert.ok(scalePcs.has(pc(n)));
});

test('generateQuestion never ends on the tonic (stays open)', () => {
  const { pool, tonic } = levelById('majC');
  for (let i = 0; i < 50; i++) {
    const q = generateQuestion(pool, tonic, 4, Math.random);
    assert.notEqual(pc(q[q.length - 1]), pc(tonic));
  }
});

// ---- scoreAnswer ----
test('empty answer scores zero', () => {
  const s = scoreAnswer([], { pool: [60, 62, 64], tonic: 60 });
  assert.equal(s.total, 0);
  assert.equal(s.score, 0);
  assert.equal(s.stars, 0);
});

test('perfect in-scale answer resolving home with contour = 3 stars', () => {
  // C major, end on C (tonic), all in scale, multiple distinct pcs
  const s = scoreAnswer([64, 62, 60], { pool: [60, 62, 64, 65, 67, 69, 71, 72], tonic: 60 });
  assert.equal(s.inScaleRatio, 1);
  assert.ok(s.resolvesHome);
  assert.ok(s.hasContour);
  assert.ok(s.lengthOk);
  assert.equal(s.score, 100);
  assert.equal(s.stars, 3);
});

test('resolvesHome detects tonic by pitch class (any octave)', () => {
  // ends on 72 (C, octave up) -> still home for tonic 60
  const s = scoreAnswer([67, 64, 72], { pool: [60, 62, 64, 67, 69, 72], tonic: 60 });
  assert.ok(s.resolvesHome);
});

test('not resolving home loses 30 points', () => {
  const home = scoreAnswer([64, 62, 60], { pool: [60, 62, 64, 65, 67], tonic: 60 });
  const away = scoreAnswer([60, 62, 64], { pool: [60, 62, 64, 65, 67], tonic: 60 });
  assert.ok(home.resolvesHome && !away.resolvesHome);
  assert.equal(home.score - away.score, 30);
});

test('out-of-scale notes lower inScaleRatio and score', () => {
  // 61 (C#) is not in C major -> 2/3 in scale
  const s = scoreAnswer([61, 62, 60], { pool: [60, 62, 64, 65, 67, 69, 71, 72], tonic: 60 });
  assert.equal(s.inScaleCount, 2);
  assert.ok(Math.abs(s.inScaleRatio - 2 / 3) < 1e-9);
  assert.ok(s.score < 100);
});

test('single repeated note has no contour', () => {
  const s = scoreAnswer([60, 60, 60], { pool: [60, 62, 64], tonic: 60 });
  assert.equal(s.distinctPcs, 1);
  assert.equal(s.hasContour, false);
  assert.ok(s.resolvesHome); // ends on C
});

test('too-short single note is not lengthOk', () => {
  const s = scoreAnswer([60], { pool: [60, 62, 64], tonic: 60 });
  assert.equal(s.lengthOk, false);
});

test('stars thresholds: 1 star (~50) and 2 stars (~70)', () => {
  // all in scale, ends NOT home, has contour, lengthOk: 40+0+15+15=70 -> 2 stars
  const s2 = scoreAnswer([60, 62, 64], { pool: [60, 62, 64, 65, 67], tonic: 60 });
  assert.equal(s2.score, 70);
  assert.equal(s2.stars, 2);
  // half in scale, ends NOT home, contour, lengthOk: 20+0+15+15=50 -> 1 star
  const s1 = scoreAnswer([61, 62], { pool: [60, 62, 64, 65, 67, 69, 71, 72], tonic: 60 });
  assert.equal(s1.score, 50);
  assert.equal(s1.stars, 1);
});

// ---- feedbackFor ----
test('feedbackFor empty prompts to play', () => {
  const msg = feedbackFor(scoreAnswer([], { pool: [60, 62, 64], tonic: 60 }));
  assert.match(msg, /还没弹/);
});

test('feedbackFor 3 stars is celebratory', () => {
  const msg = feedbackFor(scoreAnswer([64, 62, 60], { pool: [60, 62, 64, 65, 67], tonic: 60 }));
  assert.match(msg, /乐感|🌟/);
});

test('feedbackFor suggests resolving home when not home', () => {
  const msg = feedbackFor(scoreAnswer([60, 62, 64], { pool: [60, 62, 64, 65, 67], tonic: 60 }));
  assert.match(msg, /主音|家/);
});

// ---- CallResponse state machine ----
test('CallResponse lifecycle: idle -> question -> answer -> scored', () => {
  const g = new CallResponse({ pool: [60, 62, 64, 65, 67], tonic: 60, qlen: 3 });
  assert.equal(g.state, 'idle');
  const q = g.newQuestion();
  assert.equal(g.state, 'question');
  assert.equal(q.length, 3);
  g.beginAnswer();
  assert.equal(g.state, 'answer');
  assert.ok(g.record(64));
  assert.ok(g.record(62));
  assert.ok(g.record(60));
  const s = g.finishAnswer();
  assert.equal(g.state, 'scored');
  assert.equal(g.rounds, 1);
  assert.equal(s.stars, 3);
  assert.equal(g.best, 100);
  assert.equal(g.bestStars, 3);
});

test('record only works in answer state', () => {
  const g = new CallResponse({ pool: [60, 62, 64], tonic: 60, qlen: 2 });
  assert.equal(g.record(60), false); // idle
  g.newQuestion();
  assert.equal(g.record(60), false); // question (playing)
  g.beginAnswer();
  assert.equal(g.record(60), true);
});

test('finishAnswer returns null outside answer state', () => {
  const g = new CallResponse({ pool: [60, 62, 64], tonic: 60, qlen: 2 });
  assert.equal(g.finishAnswer(), null);
});

test('best and bestStars persist across rounds', () => {
  const g = new CallResponse({ pool: [60, 62, 64, 65, 67], tonic: 60, qlen: 2 });
  // round 1: great answer
  g.newQuestion(); g.beginAnswer(); g.record(62); g.record(60); g.finishAnswer();
  const b1 = g.best, s1 = g.bestStars;
  // round 2: poor answer (single out-of-scale, no home)
  g.newQuestion(); g.beginAnswer(); g.record(61); g.finishAnswer();
  assert.equal(g.rounds, 2);
  assert.equal(g.best, b1);       // best not lowered
  assert.equal(g.bestStars, s1);  // bestStars not lowered
});

test('reset clears everything', () => {
  const g = new CallResponse({ pool: [60, 62, 64], tonic: 60, qlen: 2 });
  g.newQuestion(); g.beginAnswer(); g.record(60); g.finishAnswer();
  g.reset();
  assert.equal(g.state, 'idle');
  assert.equal(g.rounds, 0);
  assert.equal(g.best, 0);
  assert.equal(g.question.length, 0);
  assert.equal(g.answer.length, 0);
});
