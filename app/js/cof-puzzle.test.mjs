import { test } from 'node:test';
import assert from 'node:assert';
import { CofPuzzle, PUZZLE_ORDER } from './cof-puzzle.js';
import { scaleMidi } from './circle-of-fifths.js';

test('starts with only C unlocked, target G', () => {
  const p = new CofPuzzle();
  assert.equal(p.isUnlocked('C'), true);
  assert.equal(p.isUnlocked('G'), false);
  assert.equal(p.target, 'G');
  assert.equal(p.unlockedCount(), 1);
});

test('expected scale matches circle-of-fifths scaleMidi for target', () => {
  const p = new CofPuzzle();
  assert.deepEqual(p.expected, scaleMidi('G', 60));
  assert.equal(p.nextNote(), scaleMidi('G', 60)[0]);
});

test('playing the full G scale unlocks G and advances to D', () => {
  const p = new CofPuzzle();
  const scale = scaleMidi('G', 60);
  let res;
  for (let i = 0; i < scale.length; i++) res = p.play(scale[i]);
  assert.equal(res.complete, true);
  assert.equal(res.unlockedKey, 'G');
  assert.equal(res.nextTarget, 'D');
  assert.equal(p.isUnlocked('G'), true);
  assert.equal(p.unlockedCount(), 2);
});

test('wrong note does not advance and is not penalized', () => {
  const p = new CofPuzzle();
  const first = p.nextNote();
  const r = p.play(first + 1); // wrong pitch class
  assert.equal(r.ok, false);
  assert.equal(r.wrong, true);
  assert.equal(p.idx, 0);
  // correct note still works after
  assert.equal(p.play(first).ok, true);
  assert.equal(p.idx, 1);
});

test('matches by pitch class (any octave) by default', () => {
  const p = new CofPuzzle();
  const first = p.nextNote();
  assert.equal(p.play(first + 12).ok, true); // octave up still correct
  assert.equal(p.idx, 1);
});

test('matchExact requires the exact octave', () => {
  const p = new CofPuzzle({ matchExact: true });
  const first = p.nextNote();
  assert.equal(p.play(first + 12).ok, false);
  assert.equal(p.play(first).ok, true);
});

test('restart resets current attempt index', () => {
  const p = new CofPuzzle();
  p.play(p.nextNote());
  assert.equal(p.idx, 1);
  p.restart();
  assert.equal(p.idx, 0);
});

test('setTarget switches to a locked key only', () => {
  const p = new CofPuzzle();
  assert.equal(p.setTarget('C'), false); // already unlocked
  assert.equal(p.setTarget('A'), true);
  assert.equal(p.target, 'A');
  assert.deepEqual(p.expected, scaleMidi('A', 60));
});

test('save/loadUnlocked round-trips through storage', () => {
  const store = (() => { const m = {}; return { getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; })();
  const p = new CofPuzzle();
  p.unlocked.add('G'); p.unlocked.add('D');
  p.save(store);
  const loaded = CofPuzzle.loadUnlocked(store);
  assert.ok(loaded.includes('G') && loaded.includes('D') && loaded.includes('C'));
  const p2 = new CofPuzzle({ unlocked: loaded });
  assert.equal(p2.unlockedCount(), 3);
  assert.equal(p2.target, 'A');
});

test('resetAll relocks everything back to C', () => {
  const p = new CofPuzzle({ unlocked: ['C', 'G', 'D'] });
  assert.equal(p.unlockedCount(), 3);
  p.resetAll();
  assert.equal(p.unlockedCount(), 1);
  assert.equal(p.target, 'G');
});

test('completing all 12 keys marks isComplete with null target', () => {
  const p = new CofPuzzle({ unlocked: PUZZLE_ORDER.slice() });
  assert.equal(p.isComplete(), true);
  assert.equal(p.target, null);
  assert.equal(p.nextNote(), null);
  assert.deepEqual(p.play(60), { ok: false, idx: 0 });
});

test('PUZZLE_ORDER is the 12 keys clockwise from C', () => {
  assert.equal(PUZZLE_ORDER.length, 12);
  assert.equal(PUZZLE_ORDER[0], 'C');
  assert.equal(PUZZLE_ORDER[1], 'G');
  assert.equal(PUZZLE_ORDER[6], 'F#');
});
