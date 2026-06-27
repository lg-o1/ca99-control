import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAGES, accuracy, stageForMastery, stage, stageProgress,
  scaffoldOpacity, noteScaffold,
} from './scaffold-fade.js';

test('STAGES define 4 levels removing aids progressively', () => {
  assert.equal(STAGES.length, 4);
  assert.deepEqual(STAGES[0].aids, { name: true, color: true, drop: true });
  assert.deepEqual(STAGES[3].aids, { name: false, color: false, drop: false });
});

test('accuracy guards divide-by-zero', () => {
  assert.equal(accuracy(0, 0), 0);
  assert.equal(accuracy(5, 10), 0.5);
});

test('beginner with no data is stage 0', () => {
  assert.equal(stageForMastery({ correct: 0, attempts: 0 }), 0);
});

test('stage advances only with enough samples AND accuracy', () => {
  // high accuracy but too few attempts -> stays low
  assert.equal(stageForMastery({ correct: 4, attempts: 4 }), 0);
  // enough attempts + 60% -> stage 1
  assert.equal(stageForMastery({ correct: 6, attempts: 10 }), 1);
  // 16 attempts + 80% -> stage 2
  assert.equal(stageForMastery({ correct: 16, attempts: 20 }), 2);
  // 24 attempts + 92% -> stage 3
  assert.equal(stageForMastery({ correct: 24, attempts: 26 }), 3);
});

test('stage() clamps index', () => {
  assert.equal(stage(-5).idx, 0);
  assert.equal(stage(99).idx, 3);
});

test('stageProgress is 1 at final stage', () => {
  assert.equal(stageProgress({ correct: 50, attempts: 50 }), 1);
});

test('stageProgress between thresholds is 0..1', () => {
  const p = stageProgress({ correct: 9, attempts: 10 }); // stage1, acc 0.9 between 0.6 and 0.8
  assert.ok(p > 0 && p <= 1);
});

test('scaffoldOpacity: stage 0 shows color+drop full, name fading', () => {
  const op = scaffoldOpacity({ correct: 0, attempts: 0 });
  assert.equal(op.stage, 0);
  assert.equal(op.color, 1);
  assert.equal(op.drop, 1);
  assert.ok(op.name >= 0 && op.name <= 1); // name is the fading layer
});

test('scaffoldOpacity: removed layers are exactly 0', () => {
  const op = scaffoldOpacity({ correct: 16, attempts: 20 }); // stage 2: name & color removed
  assert.equal(op.name, 0);
  assert.equal(op.color, 0);
  assert.equal(op.drop, 1); // drop still shown (it's the fading layer here, at low progress)
});

test('scaffoldOpacity: bare stage hides everything', () => {
  const op = scaffoldOpacity({ correct: 30, attempts: 30 });
  assert.equal(op.stage, 3);
  assert.equal(op.name, 0);
  assert.equal(op.color, 0);
  assert.equal(op.drop, 0);
});

test('fading layer opacity decreases as progress grows', () => {
  // stage 0, name is fading. compare low vs high accuracy within stage 0 band
  const lo = scaffoldOpacity({ correct: 1, attempts: 4 }).name; // very low acc, attempts<8 capped
  const hi = scaffoldOpacity({ correct: 4, attempts: 4 }).name; // higher acc
  assert.ok(hi <= lo + 1e-9);
});

test('noteScaffold composes label/color/drop for UI', () => {
  const ns = noteScaffold(60, 'C4', { correct: 0, attempts: 0 });
  assert.equal(ns.label.text, 'C4');
  assert.match(ns.color.value, /^#[0-9a-f]{6}$/i);
  assert.equal(ns.drop.show, true);
  assert.equal(typeof ns.stageLabel, 'string');
});

test('noteScaffold at mastery hides aids', () => {
  const ns = noteScaffold(60, 'C4', { correct: 30, attempts: 30 });
  assert.equal(ns.label.opacity, 0);
  assert.equal(ns.color.opacity, 0);
  assert.equal(ns.drop.show, false);
});
