import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TASK_POOL, shuffle, winLines, BingoCard } from './bingo-card.js';

test('TASK_POOL has enough tasks for a 5x5 card', () => {
  assert.ok(TASK_POOL.length >= 24);
});

test('shuffle with seeded rng is deterministic and preserves elements', () => {
  let i = 0;
  const rng = () => [0.1, 0.9, 0.3, 0.7, 0.2][i++ % 5];
  const a = shuffle([1, 2, 3, 4, 5], rng);
  assert.equal(a.length, 5);
  assert.deepEqual([...a].sort(), [1, 2, 3, 4, 5]);
});

test('winLines for size 5 yields 12 lines (5 rows + 5 cols + 2 diags)', () => {
  const lines = winLines(5);
  assert.equal(lines.length, 12);
  assert.deepEqual(lines[0], [0, 1, 2, 3, 4]); // first row
  assert.deepEqual(lines[10], [0, 6, 12, 18, 24]); // main diag
  assert.deepEqual(lines[11], [4, 8, 12, 16, 20]); // anti diag
});

test('BingoCard builds 25 cells with free center marked', () => {
  const card = new BingoCard({ rng: () => 0 });
  assert.equal(card.cells.length, 25);
  assert.equal(card.cells[12].free, true);
  assert.equal(card.isMarked(12), true);
  assert.equal(card.doneCount(), 0);
});

test('BingoCard toggle marks and unmarks a task cell', () => {
  const card = new BingoCard({ rng: () => 0 });
  card.toggle(0);
  assert.equal(card.isMarked(0), true);
  assert.equal(card.doneCount(), 1);
  card.toggle(0);
  assert.equal(card.isMarked(0), false);
  assert.equal(card.doneCount(), 0);
});

test('BingoCard free center cannot be toggled', () => {
  const card = new BingoCard({ rng: () => 0 });
  card.toggle(12);
  assert.equal(card.isMarked(12), true); // stays marked
});

test('completing a row reports a new line once', () => {
  const card = new BingoCard({ rng: () => 0 });
  let res;
  [0, 1, 2, 3].forEach((i) => { res = card.mark(i); });
  assert.equal(res.newLines.length, 0); // not complete yet
  res = card.mark(4);
  assert.equal(res.newLines.length, 1);
  assert.deepEqual(res.newLines[0], [0, 1, 2, 3, 4]);
  assert.equal(card.lineCount(), 1);
  // marking again does not re-report
  const again = card.mark(4);
  assert.equal(again.newLines.length, 0);
});

test('middle row gets a free-cell assist (center pre-marked)', () => {
  const card = new BingoCard({ rng: () => 0 });
  // row 2 = indices 10,11,12(free),13,14
  let res;
  [10, 11, 13].forEach((i) => { res = card.mark(i); });
  assert.equal(res.newLines.length, 0);
  res = card.mark(14); // center 12 already marked
  assert.equal(res.newLines.length, 1);
  assert.deepEqual(res.newLines[0], [10, 11, 12, 13, 14]);
});

test('unmarking a cell removes a previously-won line', () => {
  const card = new BingoCard({ rng: () => 0 });
  [0, 1, 2, 3, 4].forEach((i) => card.mark(i));
  assert.equal(card.lineCount(), 1);
  card.toggle(2); // unmark
  assert.equal(card.lineCount(), 0);
});

test('isFull true only when all non-free cells marked', () => {
  const card = new BingoCard({ rng: () => 0 });
  for (let i = 0; i < 25; i++) card.mark(i);
  assert.equal(card.isFull(), true);
  assert.equal(card.doneCount(), 24);
});

test('diagonal win detection', () => {
  const card = new BingoCard({ rng: () => 0 });
  // main diag 0,6,12(free),18,24
  let res;
  [0, 6, 18].forEach((i) => { res = card.mark(i); });
  assert.equal(res.newLines.length, 0);
  res = card.mark(24);
  assert.deepEqual(res.newLines[0], [0, 6, 12, 18, 24]);
});
