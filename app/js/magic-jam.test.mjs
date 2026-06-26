import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MOODS, ROOTS, PALETTE,
  scalePitchClasses, scaleMidis, snapToScale, padNotes, padColor, vampBar,
} from './magic-jam.js';

test('MOODS/ROOTS/PALETTE basic shape', () => {
  assert.equal(MOODS.length, 2);
  assert.deepEqual(MOODS.map(m => m.id), ['major', 'minor']);
  assert.ok(ROOTS.find(r => r.name === 'C' && r.pc === 0));
  assert.ok(PALETTE.length >= 5);
});

test('scalePitchClasses: C major pentatonic', () => {
  assert.deepEqual(scalePitchClasses(0, 'majorPentatonic'), [0, 2, 4, 7, 9]);
});

test('scalePitchClasses: A minor pentatonic', () => {
  // A=9; minorPentatonic intervals [0,3,5,7,10] -> 9,0,2,4,7
  assert.deepEqual(scalePitchClasses(9, 'minorPentatonic'), [9, 0, 2, 4, 7]);
});

test('scaleMidis: C major pentatonic within one octave', () => {
  assert.deepEqual(scaleMidis(0, 'majorPentatonic', 60, 72), [60, 62, 64, 67, 69, 72]);
});

test('scaleMidis: every note belongs to the scale set', () => {
  const set = new Set(scalePitchClasses(7, 'majorPentatonic'));
  for (const m of scaleMidis(7, 'majorPentatonic', 40, 90)) {
    assert.ok(set.has(((m % 12) + 12) % 12));
  }
});

test('snapToScale: a scale note returns itself', () => {
  assert.equal(snapToScale(67, 0, 'majorPentatonic'), 67);
});

test('snapToScale: nearest pentatonic, tie prefers lower', () => {
  // 61 (C#): both 60 and 62 are in C major pentatonic, tie -> lower 60
  assert.equal(snapToScale(61, 0, 'majorPentatonic'), 60);
  // 63 (D#): 62 in scale -> 62
  assert.equal(snapToScale(63, 0, 'majorPentatonic'), 62);
  // 65 (F): not in scale, 64 (E) is -> 64
  assert.equal(snapToScale(65, 0, 'majorPentatonic'), 64);
  // 66 (F#): nearest is 67 (G)
  assert.equal(snapToScale(66, 0, 'majorPentatonic'), 67);
});

test('snapToScale: every snap result is in the scale', () => {
  const set = new Set(scalePitchClasses(2, 'minorPentatonic'));
  for (let m = 40; m <= 90; m++) {
    const s = snapToScale(m, 2, 'minorPentatonic');
    assert.ok(set.has(((s % 12) + 12) % 12), `snap ${m} -> ${s} not in scale`);
  }
});

test('padNotes: contiguous pentatonic notes', () => {
  assert.deepEqual(padNotes(0, 'majorPentatonic', 6, 60), [60, 62, 64, 67, 69, 72]);
  assert.equal(padNotes(0, 'majorPentatonic', 8, 60).length, 8);
});

test('padColor: cycles palette, handles negatives', () => {
  assert.equal(padColor(0), PALETTE[0]);
  assert.equal(padColor(PALETTE.length), PALETTE[0]);
  assert.equal(padColor(-1), PALETTE[PALETTE.length - 1]);
});

test('vampBar: one bar structure', () => {
  const ev = vampBar(0, 1);
  assert.equal(ev.filter(e => e.kind === 'hat').length, 8);
  assert.equal(ev.filter(e => e.kind === 'kick').length, 2);
  assert.equal(ev.filter(e => e.kind === 'snare').length, 2);
  const bass = ev.filter(e => e.kind === 'bass');
  assert.equal(bass.length, 2);
  assert.equal(bass[0].midi, 36);       // root C
  assert.equal(bass[1].midi, 36 + 7);   // fifth G
});

test('vampBar: deterministic', () => {
  assert.deepEqual(vampBar(7, 2), vampBar(7, 2));
  assert.equal(vampBar(0, 2).filter(e => e.kind === 'snare').length, 4);
});
