import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  diatonicIndex, staffStep, noteAccidental, clefOf, ledgerSteps,
  totalMs, measures, layoutStaff, cursorX, activeAt, triggered, noteName,
} from './staff-view.js';

test('diatonicIndex anchors middle C = 35', () => {
  assert.equal(diatonicIndex(60), 35); // C4
  assert.equal(diatonicIndex(62), 36); // D4
  assert.equal(diatonicIndex(64), 37); // E4
  assert.equal(diatonicIndex(72), 42); // C5 (octave up = +7)
  assert.equal(diatonicIndex(48), 28); // C3 (octave down = -7)
});

test('staffStep relative to middle C', () => {
  assert.equal(staffStep(60), 0);   // C4
  assert.equal(staffStep(64), 2);   // E4 = treble bottom line
  assert.equal(staffStep(77), 10);  // F5 = treble top line
  assert.equal(staffStep(57), -2);  // A3 = bass top line
  assert.equal(staffStep(43), -10); // G2 = bass bottom line
});

test('black keys share lower white step + carry sharp', () => {
  assert.equal(staffStep(61), staffStep(60)); // C#4 sits on C4 line
  assert.equal(noteAccidental(61), '♯');
  assert.equal(noteAccidental(66), '♯');      // F#4
  assert.equal(noteAccidental(60), '');
  assert.equal(noteAccidental(64), '');
});

test('clefOf respects hand then pitch', () => {
  assert.equal(clefOf(48, 'r'), 'treble'); // hand forces
  assert.equal(clefOf(80, 'l'), 'bass');
  assert.equal(clefOf(72), 'treble');      // pitch >= 60
  assert.equal(clefOf(48), 'bass');
  assert.equal(clefOf(60), 'treble');
});

test('ledgerSteps: above treble', () => {
  // A5 = step 12 → one ledger at 12
  assert.deepEqual(ledgerSteps(12), [12]);
  // C6 = step 14 → ledgers at 12,14
  assert.deepEqual(ledgerSteps(14), [12, 14]);
  // B5 = step 13 (space above) → ledger at 12 only
  assert.deepEqual(ledgerSteps(13), [12]);
});

test('ledgerSteps: below bass', () => {
  assert.deepEqual(ledgerSteps(-12), [-12]);
  assert.deepEqual(ledgerSteps(-14), [-12, -14]);
  assert.deepEqual(ledgerSteps(-13), [-12]);
});

test('ledgerSteps: middle C zone and none on staff', () => {
  assert.deepEqual(ledgerSteps(0), [0]);   // C4
  assert.deepEqual(ledgerSteps(1), [0]);   // D4 (space above middle ledger)
  assert.deepEqual(ledgerSteps(-1), [0]);  // B3
  assert.deepEqual(ledgerSteps(2), []);    // E4 on staff line
  assert.deepEqual(ledgerSteps(6), []);    // B4 on staff line
  assert.deepEqual(ledgerSteps(-6), []);   // D3 on bass line
});

test('totalMs', () => {
  assert.equal(totalMs([]), 0);
  assert.equal(totalMs([{ ms: 0, durMs: 500 }, { ms: 400, durMs: 400 }]), 800);
});

test('measures groups by tempo/timeSig', () => {
  // bpm 120 → quarter=500ms, 4/4 bar = 2000ms
  const notes = [{ midi: 60, ms: 0, durMs: 500 }, { midi: 62, ms: 4500, durMs: 500 }];
  // total 5000ms → ceil(5000/2000)=3 measures
  const ms = measures(notes, { bpm: 120, beatsPerBar: 4 });
  assert.equal(ms.length, 3);
  assert.equal(ms[0].startMs, 0);
  assert.equal(ms[1].startMs, 2000);
  assert.equal(ms[2].endMs, 6000);
  // empty notes → at least one measure
  assert.equal(measures([], { bpm: 120 }).length, 1);
});

test('layoutStaff geometry + glyphs', () => {
  const notes = [
    { midi: 60, ms: 0, durMs: 500, hand: 'r', velocity: 90 },
    { midi: 48, ms: 1000, durMs: 500, hand: 'l', velocity: 70 },
  ];
  const r = layoutStaff(notes, { pxPerMs: 0.1, leftPad: 70, bpm: 120, beatsPerBar: 4 });
  assert.equal(r.glyphs.length, 2);
  const g0 = r.glyphs[0];
  assert.equal(g0.x, 70 + 0 * 0.1); // 70
  assert.equal(g0.step, 0);
  assert.equal(g0.clef, 'treble');
  assert.equal(g0.accidental, '');
  const g1 = r.glyphs[1];
  assert.equal(g1.x, 70 + 1000 * 0.1); // 170
  assert.equal(g1.clef, 'bass');
  assert.equal(g1.step, staffStep(48));
  // width covers duration + pads
  assert.ok(r.width >= 70 + 1500 * 0.1);
  // barlines start at leftPad
  assert.equal(r.barlines[0], 70);
});

test('layoutStaff carries accidental + ledgers', () => {
  const notes = [{ midi: 61, ms: 0, durMs: 250, hand: 'r' }]; // C#4
  const g = layoutStaff(notes).glyphs[0];
  assert.equal(g.accidental, '♯');
  assert.deepEqual(g.ledgers, [0]); // C#4 shares C4 middle ledger
});

test('cursorX scales with pad + pxPerMs', () => {
  assert.equal(cursorX(0, { pxPerMs: 0.16, leftPad: 70 }), 70);
  assert.equal(cursorX(1000, { pxPerMs: 0.16, leftPad: 70 }), 70 + 160);
});

test('activeAt and triggered windows', () => {
  const notes = [
    { midi: 60, ms: 0, durMs: 100 },
    { midi: 64, ms: 100, durMs: 100 },
  ];
  assert.deepEqual(activeAt(notes, 50).map(n => n.midi), [60]);
  assert.deepEqual(activeAt(notes, 100).map(n => n.midi), [64]);
  assert.deepEqual(triggered(notes, -1, 100).map(n => n.midi), [60, 64]); // onset 0 included
  assert.deepEqual(triggered(notes, 0, 100).map(n => n.midi), [64]);       // onset 0 excluded
  assert.deepEqual(triggered(notes, 50, 150).map(n => n.midi), [64]);
});

test('noteName', () => {
  assert.equal(noteName(60), 'C4');
  assert.equal(noteName(61), 'C♯4');
  assert.equal(noteName(69), 'A4');
});
