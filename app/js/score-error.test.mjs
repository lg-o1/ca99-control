import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELL_KINDS, DEFAULTS, classifyNote, analyzeNotes,
  aggregateByMeasure, worstKind, summarize, pitchClass,
} from './score-error.js';

test('CELL_KINDS covers all classes with colors', () => {
  ['clean', 'pitch', 'rhythm', 'hesitate', 'missed'].forEach((k) => {
    assert.ok(CELL_KINDS[k]);
    assert.match(CELL_KINDS[k].color, /^#[0-9a-f]{6}$/i);
  });
});

test('classifyNote: missed when no actual', () => {
  assert.equal(classifyNote({ t: 0, midi: 60 }, null), 'missed');
});

test('classifyNote: pitch error on wrong key', () => {
  assert.equal(classifyNote({ t: 0, midi: 60 }, { t: 0, midi: 62 }), 'pitch');
});

test('classifyNote: clean on right key and time', () => {
  assert.equal(classifyNote({ t: 100, midi: 60 }, { t: 120, midi: 60 }), 'clean');
});

test('classifyNote: rhythm error when time off beyond tol', () => {
  assert.equal(classifyNote({ t: 0, midi: 60 }, { t: 300, midi: 60 }, { rhythmTol: 150 }), 'rhythm');
});

test('classifyNote: hesitate when big gap from prev but pitch+time ok', () => {
  const k = classifyNote({ t: 1000, midi: 60 }, { t: 1010, midi: 60 }, { prevActT: 0, hesitateGap: 700 });
  assert.equal(k, 'hesitate');
});

test('classifyNote: octaveAgnostic treats octave as same pitch', () => {
  assert.equal(classifyNote({ t: 0, midi: 60 }, { t: 0, midi: 72 }, { octaveAgnostic: true }), 'clean');
  assert.equal(classifyNote({ t: 0, midi: 60 }, { t: 0, midi: 72 }), 'pitch');
});

test('pitchClass wraps', () => {
  assert.equal(pitchClass(60), 0);
  assert.equal(pitchClass(72), 0);
  assert.equal(pitchClass(-1), 11);
});

test('analyzeNotes aligns nearest and classifies', () => {
  const expected = [
    { t: 0, midi: 60 }, { t: 500, midi: 62 }, { t: 1000, midi: 64 },
  ];
  const actual = [
    { t: 10, midi: 60 },   // clean
    { t: 520, midi: 65 },  // pitch (wrong)
    { t: 1400, midi: 64 }, // rhythm (late by 400)
  ];
  const res = analyzeNotes(expected, actual, { rhythmTol: 150 });
  assert.equal(res.length, 3);
  assert.equal(res[0].kind, 'clean');
  assert.equal(res[1].kind, 'pitch');
  assert.equal(res[2].kind, 'rhythm');
});

test('analyzeNotes marks missed when no nearby actual', () => {
  const expected = [{ t: 0, midi: 60 }, { t: 5000, midi: 64 }];
  const actual = [{ t: 0, midi: 60 }];
  const res = analyzeNotes(expected, actual, { rhythmTol: 100 });
  assert.equal(res[0].kind, 'clean');
  assert.equal(res[1].kind, 'missed');
});

test('aggregateByMeasure uses exp.measure', () => {
  const noteResults = [
    { i: 0, exp: { measure: 1 }, kind: 'clean' },
    { i: 1, exp: { measure: 1 }, kind: 'pitch' },
    { i: 2, exp: { measure: 2 }, kind: 'clean' },
    { i: 3, exp: { measure: 2 }, kind: 'clean' },
  ];
  const bars = aggregateByMeasure(noteResults);
  assert.equal(bars.length, 2);
  assert.equal(bars[0].measure, 1);
  assert.equal(bars[0].counts.pitch, 1);
  assert.equal(bars[0].accuracy, 50);
  assert.equal(bars[1].accuracy, 100);
});

test('aggregateByMeasure falls back to notesPerBar', () => {
  const noteResults = Array.from({ length: 8 }, (_, i) => ({ i, exp: {}, kind: 'clean' }));
  const bars = aggregateByMeasure(noteResults, { notesPerBar: 4 });
  assert.equal(bars.length, 2);
});

test('worstKind priority order', () => {
  assert.equal(worstKind({ missed: 1, pitch: 2, rhythm: 1, hesitate: 0, clean: 5 }), 'missed');
  assert.equal(worstKind({ missed: 0, pitch: 1, rhythm: 3, hesitate: 0, clean: 5 }), 'pitch');
  assert.equal(worstKind({ missed: 0, pitch: 0, rhythm: 0, hesitate: 2, clean: 5 }), 'hesitate');
  assert.equal(worstKind({ missed: 0, pitch: 0, rhythm: 0, hesitate: 0, clean: 5 }), 'clean');
});

test('summarize computes accuracy and worst measures', () => {
  const noteResults = [
    { i: 0, exp: { measure: 1 }, kind: 'pitch' },
    { i: 1, exp: { measure: 1 }, kind: 'pitch' },
    { i: 2, exp: { measure: 2 }, kind: 'clean' },
    { i: 3, exp: { measure: 2 }, kind: 'clean' },
    { i: 4, exp: { measure: 3 }, kind: 'rhythm' },
    { i: 5, exp: { measure: 3 }, kind: 'clean' },
  ];
  const bars = aggregateByMeasure(noteResults);
  const sum = summarize(bars, 2);
  assert.equal(sum.totalNotes, 6);
  assert.equal(sum.cleanNotes, 3);
  assert.equal(sum.accuracy, 50);
  assert.deepEqual(sum.worstMeasures, [1, 3]); // measure 1 (0%) worst, then 3 (50%)
});

test('DEFAULTS exposed', () => {
  assert.equal(DEFAULTS.rhythmTol, 150);
  assert.equal(DEFAULTS.hesitateGap, 700);
});
