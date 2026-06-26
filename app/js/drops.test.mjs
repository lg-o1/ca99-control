import { test } from 'node:test';
import assert from 'node:assert';
import { Drops, makeRng, noteLetter, POOL_C } from './drops.js';

test('noteLetter maps pitch classes to letters', () => {
  assert.equal(noteLetter(60), 'C');
  assert.equal(noteLetter(72), 'C');
  assert.equal(noteLetter(62), 'D');
  assert.equal(noteLetter(71), 'B');
  assert.equal(noteLetter(61), 'C'); // C# falls back to nearest white
});

test('makeRng is deterministic for a seed', () => {
  const a = makeRng(7), b = makeRng(7);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
});

test('reset clears state', () => {
  const d = new Drops({ rng: makeRng(1) });
  d.spawn(); d.caught = 5; d.combo = 3;
  d.reset();
  assert.equal(d.drops.length, 0);
  assert.equal(d.caught, 0);
  assert.equal(d.combo, 0);
  assert.equal(d.bestCombo, 0);
});

test('spawn adds a drop from the pool at top', () => {
  const d = new Drops({ rng: makeRng(2), pool: POOL_C });
  const s = d.spawn();
  assert.ok(POOL_C.includes(s.midi));
  assert.equal(s.y, 0);
  assert.ok(s.x >= 0.1 && s.x <= 0.9);
  assert.equal(d.drops.length, 1);
});

test('tick spawns on schedule and moves drops down', () => {
  const d = new Drops({ rng: makeRng(3), spawnEvery: 1, fallSpeed: 0.5 });
  d.spawn();
  const r = d.tick(1); // one spawn + move 0.5
  assert.equal(d.drops.length, 2);
  assert.ok(d.drops[0].y >= 0.5 - 1e-9);
  assert.equal(r.floored.length, 0);
});

test('drops that reach the floor are missed and break combo', () => {
  const d = new Drops({ rng: makeRng(4), spawnEvery: 999, fallSpeed: 1 });
  d.spawn(); d.combo = 4;
  const r = d.tick(1.1); // y -> 1.1 >= 1
  assert.equal(r.floored.length, 1);
  assert.equal(d.missed, 1);
  assert.equal(d.combo, 0);
  assert.equal(d.drops.length, 0);
});

test('catch removes a matching drop and grows combo', () => {
  const d = new Drops({ rng: makeRng(5), spawnEvery: 999 });
  const s = d.spawn(); // some midi
  const r = d.catch(s.midi);
  assert.equal(r.caught, true);
  assert.equal(d.caught, 1);
  assert.equal(d.combo, 1);
  assert.equal(d.bestCombo, 1);
  assert.equal(d.drops.length, 0);
});

test('catch targets the lowest (most urgent) matching drop', () => {
  const d = new Drops({ rng: makeRng(6), spawnEvery: 999, matchExact: true });
  d.drops = [
    { id: 1, midi: 60, y: 0.2, x: 0.3 },
    { id: 2, midi: 60, y: 0.7, x: 0.5 }, // lower -> caught first
  ];
  const r = d.catch(60);
  assert.equal(r.drop.id, 2);
  assert.equal(d.drops.length, 1);
  assert.equal(d.drops[0].id, 1);
});

test('catch matches by letter (any octave) by default', () => {
  const d = new Drops({ rng: makeRng(7), spawnEvery: 999 });
  d.drops = [{ id: 1, midi: 60, y: 0.5, x: 0.4 }];
  const r = d.catch(72); // C5 catches C4
  assert.equal(r.caught, true);
});

test('matchExact requires same midi', () => {
  const d = new Drops({ rng: makeRng(8), spawnEvery: 999, matchExact: true });
  d.drops = [{ id: 1, midi: 60, y: 0.5, x: 0.4 }];
  assert.equal(d.catch(72).caught, false);
  assert.equal(d.catch(60).caught, true);
});

test('catch with no match returns miss without penalty to caught', () => {
  const d = new Drops({ rng: makeRng(9), spawnEvery: 999, matchExact: true });
  d.drops = [{ id: 1, midi: 60, y: 0.5, x: 0.4 }];
  const r = d.catch(65);
  assert.equal(r.caught, false);
  assert.equal(r.miss, true);
  assert.equal(d.caught, 0);
});

test('bestCombo tracks the longest run across a break', () => {
  const d = new Drops({ rng: makeRng(10), spawnEvery: 999, fallSpeed: 1 });
  d.drops = [{ id: 1, midi: 60, y: 0, x: 0.4 }];
  d.catch(60); d.drops = [{ id: 2, midi: 62, y: 0, x: 0.4 }];
  d.catch(62); // combo 2
  assert.equal(d.bestCombo, 2);
  d.drops = [{ id: 3, midi: 64, y: 0, x: 0.4 }];
  d.tick(1.1); // floor -> break
  assert.equal(d.combo, 0);
  assert.equal(d.bestCombo, 2);
});
