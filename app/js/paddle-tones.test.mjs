import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POOLS, poolById, pcName, pitchClass, buildBalls, PaddleTones,
} from './paddle-tones.js';

test('poolById returns pool or falls back', () => {
  assert.equal(poolById('cmaj').id, 'cmaj');
  assert.equal(poolById('???').id, POOLS[0].id);
});

test('pcName and pitchClass', () => {
  assert.equal(pcName(0), 'C');
  assert.equal(pcName(7), 'G');
  assert.equal(pcName(12), 'C');
  assert.equal(pitchClass(60), 0);
  assert.equal(pitchClass(67), 7);
  assert.equal(pitchClass(71), 11);
});

test('buildBalls makes count balls with spawn spacing and pool pcs', () => {
  const pool = poolById('penta');
  const balls = buildBalls({ pool, count: 6, gapMs: 1000, leadMs: 500, rng: () => 0 });
  assert.equal(balls.length, 6);
  assert.equal(balls[0].spawnMs, 500);
  assert.equal(balls[1].spawnMs, 1500);
  assert.ok(balls.every((b) => pool.pcs.includes(b.pc)));
});

test('buildBalls avoids consecutive repeats when possible', () => {
  // rng=0 would always pick first pc; engine should bump to next to avoid repeat
  const balls = buildBalls({ pool: 'cmaj', count: 5, rng: () => 0 });
  for (let i = 1; i < balls.length; i++) {
    assert.notEqual(balls[i].pc, balls[i - 1].pc);
  }
});

test('yOf computes fall progress', () => {
  const g = new PaddleTones({ pool: 'penta', count: 1, fallMs: 1000, leadMs: 0, rng: () => 0 });
  const b = g.balls[0];
  assert.equal(g.yOf(b, 0), 0);
  assert.equal(g.yOf(b, 500), 0.5);
  assert.equal(g.yOf(b, 1000), 1);
});

test('play catches a matching ball in the catch zone', () => {
  const g = new PaddleTones({ pool: 'penta', count: 1, fallMs: 1000, leadMs: 0, rng: () => 0 });
  const pc = g.balls[0].pc;
  // at now=800 → y=0.8 (within [0.45,1.12]); play matching pc
  const r = g.play(60 + pc, 800);
  assert.ok(r.hit);
  assert.equal(r.combo, 1);
  assert.ok(r.perfect); // y>=0.78
  assert.equal(g.caughtCount, 1);
  assert.ok(g.balls[0].caught);
});

test('play above catch zone does not catch (too high)', () => {
  const g = new PaddleTones({ pool: 'penta', count: 1, fallMs: 1000, leadMs: 0, rng: () => 0 });
  const pc = g.balls[0].pc;
  // at now=200 → y=0.2 (< catchTop 0.45) → stray
  const r = g.play(60 + pc, 200);
  assert.ok(!r.hit && r.stray);
  assert.equal(g.combo, 0);
  assert.ok(!g.balls[0].caught);
});

test('octave-agnostic catch', () => {
  const g = new PaddleTones({ pool: 'penta', count: 1, fallMs: 1000, leadMs: 0, rng: () => 0 });
  const pc = g.balls[0].pc;
  const r = g.play(60 + pc + 12, 800); // one octave up
  assert.ok(r.hit);
});

test('wrong note is a stray, breaks combo, no caught', () => {
  const g = new PaddleTones({ pool: 'cmaj', count: 2, fallMs: 1000, gapMs: 100, leadMs: 0, rng: () => 0 });
  // catch first to build combo
  g.play(60 + g.balls[0].pc, 800);
  assert.equal(g.combo, 1);
  // play a pc guaranteed not present among active balls: use an out-of-pool pc (e.g. C# =1 not in cmaj)
  const r = g.play(61, 850); // C# not in C major
  assert.ok(r.stray);
  assert.equal(g.combo, 0);
  assert.equal(g.strayCount, 1);
});

test('expire marks balls past the floor as missed and breaks combo', () => {
  const g = new PaddleTones({ pool: 'penta', count: 1, fallMs: 1000, leadMs: 0, rng: () => 0 });
  const missed = g.expire(2000); // y=2 > catchBottom
  assert.deepEqual(missed, [0]);
  assert.equal(g.missedCount, 1);
  assert.ok(g.balls[0].missed);
  assert.ok(g.isDone());
});

test('prefers ball closest to floor when two share a pc', () => {
  // two balls same pc (force rng=0 then engine bumps — instead build manually via single-pc pool)
  const g = new PaddleTones({ pool: { id: 'one', pcs: [0] }, count: 2, fallMs: 1000, gapMs: 400, leadMs: 0 });
  // ball0 spawn 0, ball1 spawn 400. At now=900: y0=0.9, y1=0.5 → both catchable, prefer y0 (closer to floor)
  const r = g.play(60, 900);
  assert.ok(r.hit);
  assert.equal(r.ball.i, 0);
});

test('activeBalls returns visible uncaught balls with y', () => {
  const g = new PaddleTones({ pool: 'penta', count: 3, fallMs: 1000, gapMs: 500, leadMs: 0, rng: () => 0 });
  const vis = g.activeBalls(500); // ball0 y=0.5, ball1 y=0, ball2 not spawned (y=-0.5)
  const idxs = vis.map((b) => b.i);
  assert.ok(idxs.includes(0));
  assert.ok(idxs.includes(1));
  assert.ok(!idxs.includes(2));
});

test('catchRate and stars', () => {
  const g = new PaddleTones({ pool: 'penta', count: 2, fallMs: 1000, gapMs: 100, leadMs: 0, rng: () => 0 });
  g.play(60 + g.balls[0].pc, 800);
  g.play(60 + g.balls[1].pc, 900);
  assert.equal(g.catchRate(), 100);
  assert.equal(g.stars(), 3);
  assert.ok(g.isDone());
  assert.equal(g.progress(), 1);
});

test('reset clears state', () => {
  const g = new PaddleTones({ pool: 'penta', count: 2, fallMs: 1000, leadMs: 0, rng: () => 0 });
  g.play(60 + g.balls[0].pc, 800);
  g.reset();
  assert.equal(g.score, 0);
  assert.equal(g.caughtCount, 0);
  assert.ok(g.balls.every((b) => !b.caught && !b.missed));
});
