import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  StaffWars, makeRng, pickNote, diatonicIndex, noteLetter,
  TREBLE_POOL, BASS_POOL,
} from './staff-wars.js';

test('diatonicIndex monotonic across octaves', () => {
  assert.equal(diatonicIndex(60), diatonicIndex(48) + 7); // C4 vs C3
  assert.ok(diatonicIndex(62) > diatonicIndex(60));       // D4 > C4
});

test('noteLetter maps pitch classes', () => {
  assert.equal(noteLetter(60), 'C');
  assert.equal(noteLetter(64), 'E');
  assert.equal(noteLetter(71), 'B');
});

test('makeRng deterministic for same seed', () => {
  const a = makeRng(42), b = makeRng(42);
  assert.equal(a(), b());
  assert.equal(a(), b());
});

test('pickNote returns a member of the pool', () => {
  const rng = makeRng(7);
  for (let i = 0; i < 20; i++) assert.ok(TREBLE_POOL.includes(pickNote(rng, TREBLE_POOL)));
});

test('initial state', () => {
  const g = new StaffWars();
  assert.equal(g.lives, 3);
  assert.equal(g.score, 0);
  assert.equal(g.level, 1);
  assert.equal(g.alive, true);
  assert.equal(g.invaders.length, 0);
});

test('spawn adds an invader at x=1', () => {
  const g = new StaffWars({ rng: makeRng(1) });
  const inv = g.spawn();
  assert.equal(inv.x, 1);
  assert.equal(g.invaders.length, 1);
  assert.ok(TREBLE_POOL.includes(inv.midi));
});

test('tick spawns on schedule and moves invaders left', () => {
  const g = new StaffWars({ rng: makeRng(2), spawnEvery: 1, speed: 0.1 });
  g.tick(1); // spawns one
  assert.equal(g.invaders.length, 1);
  const x0 = g.invaders[0].x;
  g.tick(1); // moves + spawns another
  assert.ok(g.invaders.some(i => i.x < x0)); // moved left
});

test('invader reaching left edge costs a life', () => {
  const g = new StaffWars({ rng: makeRng(3), spawnEvery: 999, speed: 1 });
  g.spawn();
  const r = g.tick(1.1); // x: 1 - 1.1 < 0 → expired
  assert.equal(r.expired.length, 1);
  assert.equal(g.lives, 2);
  assert.equal(g.invaders.length, 0);
});

test('losing all lives ends the game', () => {
  const g = new StaffWars({ rng: makeRng(4), spawnEvery: 999, speed: 1, lives: 2 });
  g.spawn(); g.tick(1.1);
  g.spawn(); g.tick(1.1);
  assert.equal(g.lives, 0);
  assert.equal(g.alive, false);
  // further ticks do nothing
  const r = g.tick(5);
  assert.deepEqual(r.expired, []);
});

test('hit removes frontmost matching invader and scores', () => {
  const g = new StaffWars({ rng: makeRng(5), spawnEvery: 999 });
  const a = g.spawn(); a.midi = 60; a.x = 0.5;
  const b = g.spawn(); b.midi = 60; b.x = 0.2; // more dangerous
  const r = g.hit(60);
  assert.equal(r.hit, true);
  assert.equal(r.note.id, b.id); // frontmost (smaller x) removed
  assert.equal(g.score, 10);
  assert.equal(g.invaders.length, 1);
});

test('hit with no match is a miss', () => {
  const g = new StaffWars({ rng: makeRng(6), spawnEvery: 999 });
  const a = g.spawn(); a.midi = 64;
  const r = g.hit(60);
  assert.equal(r.hit, false);
  assert.equal(r.miss, true);
  assert.equal(g.score, 0);
  assert.equal(g.invaders.length, 1);
});

test('level up every 5 hits speeds up', () => {
  const g = new StaffWars({ rng: makeRng(8), spawnEvery: 999, speed: 0.1 });
  const sp0 = g.speed, ev0 = g.spawnEvery;
  for (let i = 0; i < 5; i++) { const inv = g.spawn(); inv.midi = 60; g.hit(60); }
  assert.equal(g.level, 2);
  assert.ok(g.speed > sp0);
  assert.ok(g.spawnEvery < ev0);
});

test('hit ignored after game over', () => {
  const g = new StaffWars({ rng: makeRng(9), lives: 1, spawnEvery: 999, speed: 1 });
  g.spawn(); g.tick(1.1); // game over
  const r = g.hit(60);
  assert.equal(r.hit, false);
});

test('reset restores fresh state', () => {
  const g = new StaffWars({ rng: makeRng(10), spawnEvery: 999 });
  const inv = g.spawn(); inv.midi = 60; g.hit(60);
  g.reset();
  assert.equal(g.score, 0);
  assert.equal(g.invaders.length, 0);
  assert.equal(g.lives, 3);
  assert.equal(g.level, 1);
  assert.equal(g.alive, true);
});

test('bass pool option works', () => {
  const g = new StaffWars({ rng: makeRng(11), pool: BASS_POOL });
  const inv = g.spawn();
  assert.ok(BASS_POOL.includes(inv.midi));
});

test('hit matches by letter (any octave) by default', () => {
  const g = new StaffWars({ rng: makeRng(12), spawnEvery: 999 });
  const a = g.spawn(); a.midi = 60; // C4
  const r = g.hit(72);              // C5 — same letter C
  assert.equal(r.hit, true);
  assert.equal(g.invaders.length, 0);
});

test('matchExact requires precise pitch', () => {
  const g = new StaffWars({ rng: makeRng(13), spawnEvery: 999, matchExact: true });
  const a = g.spawn(); a.midi = 60;
  assert.equal(g.hit(72).hit, false); // C5 != C4 in exact mode
  assert.equal(g.hit(60).hit, true);
});

test('revive 恢复满命并复活', () => {
  const g = new StaffWars({ rng: makeRng(7), lives: 1 });
  g._loseLife();
  assert.equal(g.alive, false);
  assert.equal(g.lives, 0);
  const scoreBefore = g.score;
  g.revive();
  assert.equal(g.alive, true);
  assert.equal(g.lives, g.maxLives);
  assert.equal(g.score, scoreBefore); // 得分保留
});
