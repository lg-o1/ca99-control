import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDS, cardById, cardsUpToLevel, flattenCards, signature, beatsOf, onsetCells, generatePuzzle, RhythmPuzzle,
} from './rhythm-puzzles.js';

test('cardById and cardsUpToLevel', () => {
  assert.equal(cardById('ta').beats, 1);
  assert.equal(cardById('ta-a').beats, 2);
  assert.equal(cardById('???'), null);
  assert.equal(cardsUpToLevel(1).length, 2);     // ta, ti-ti
  assert.ok(cardsUpToLevel(2).length >= 4);
  assert.equal(cardsUpToLevel(3).length, CARDS.length);
});

test('flattenCards expands cells', () => {
  const cells = flattenCards(['ta', 'ti-ti']);
  assert.deepEqual(cells, [{ dur: 1, rest: false }, { dur: 0.5, rest: false }, { dur: 0.5, rest: false }]);
});

test('signature distinguishes rest vs attack and durations', () => {
  assert.equal(signature(flattenCards(['ta', 'ta'])), 'x1|x1');
  assert.equal(signature(flattenCards(['ta-a'])), 'x2');
  assert.notEqual(signature(flattenCards(['ta', 'ta'])), signature(flattenCards(['ta-a'])));
  assert.notEqual(signature(flattenCards(['ta'])), signature(flattenCards(['rest'])));
});

test('beatsOf sums card beats', () => {
  assert.equal(beatsOf(['ta', 'ti-ti', 'ta-a']), 4);
  assert.equal(beatsOf([]), 0);
});

test('onsetCells gives cumulative beat positions', () => {
  const on = onsetCells(['ti-ti', 'ta']);
  assert.deepEqual(on.map((o) => o.beat), [0, 0.5, 1]);
  assert.deepEqual(on.map((o) => o.dur), [0.5, 0.5, 1]);
});

test('generatePuzzle fills exactly barBeats with level-appropriate cards', () => {
  for (let i = 0; i < 30; i++) {
    const p = generatePuzzle({ level: 1, barBeats: 4, rng: Math.random });
    assert.equal(beatsOf(p.target), 4);
    assert.ok(p.target.every((id) => cardById(id).level <= 1));
    assert.deepEqual(p.bank.sort(), ['ta', 'ti-ti'].sort());
  }
});

test('generatePuzzle 3/4 bar', () => {
  const p = generatePuzzle({ level: 2, barBeats: 3, rng: () => 0 });
  assert.equal(beatsOf(p.target), 3);
});

test('RhythmPuzzle place respects bar capacity', () => {
  const rp = new RhythmPuzzle({ target: ['ta', 'ta', 'ta', 'ta'], barBeats: 4 });
  assert.ok(rp.place('ta-a')); // 2 beats
  assert.ok(rp.place('ta'));   // 3
  assert.ok(rp.place('ta'));   // 4
  assert.ok(!rp.place('ta'));  // would overflow -> rejected
  assert.equal(rp.filledBeats(), 4);
  assert.equal(rp.remainingBeats(), 0);
  assert.ok(rp.isFull());
});

test('RhythmPuzzle isCorrect by structure (equivalent placements count)', () => {
  const rp = new RhythmPuzzle({ target: ['ta', 'ti-ti', 'ta', 'rest'], barBeats: 4 });
  // exact same sequence
  ['ta', 'ti-ti', 'ta', 'rest'].forEach((id) => rp.place(id));
  assert.ok(rp.check().full);
  assert.ok(rp.isCorrect());
});

test('RhythmPuzzle wrong structure not correct', () => {
  const rp = new RhythmPuzzle({ target: ['ta-a', 'ta', 'ta'], barBeats: 4 });
  // two ta instead of ta-a → same beats, different attacks
  ['ta', 'ta', 'ta', 'ta'].forEach((id) => rp.place(id));
  assert.ok(rp.isFull());
  assert.ok(!rp.isCorrect());
});

test('RhythmPuzzle removeAt / pop / clear', () => {
  const rp = new RhythmPuzzle({ target: ['ta', 'ta', 'ta', 'ta'], barBeats: 4 });
  rp.place('ta'); rp.place('ti-ti'); rp.place('ta');
  assert.equal(rp.placed.length, 3);
  rp.removeAt(1);
  assert.deepEqual(rp.placed, ['ta', 'ta']);
  rp.pop();
  assert.deepEqual(rp.placed, ['ta']);
  rp.clear();
  assert.equal(rp.placed.length, 0);
});

test('RhythmPuzzle progress', () => {
  const rp = new RhythmPuzzle({ target: ['ta', 'ta', 'ta', 'ta'], barBeats: 4 });
  assert.equal(rp.progress(), 0);
  rp.place('ta-a');
  assert.equal(rp.progress(), 0.5);
  rp.place('ta'); rp.place('ta');
  assert.equal(rp.progress(), 1);
});

test('not correct until full', () => {
  const rp = new RhythmPuzzle({ target: ['ta', 'ta', 'ta', 'ta'], barBeats: 4 });
  rp.place('ta'); rp.place('ta');
  assert.ok(!rp.isCorrect());
});
