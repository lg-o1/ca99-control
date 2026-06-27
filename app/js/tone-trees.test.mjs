import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  templateFor, nameToPc, chordPitchClasses, chordNoteNames,
  TREE_CHORDS, describeChord, chordsUpToLevel, pickChord, ToneTreeGame,
} from './tone-trees.js';

test('nameToPc maps note names', () => {
  assert.equal(nameToPc('C'), 0);
  assert.equal(nameToPc('G'), 7);
  assert.equal(nameToPc('B'), 11);
  assert.equal(nameToPc('Zz'), -1);
});

test('templateFor returns matching template, falls back to major', () => {
  assert.deepEqual(templateFor('m').intervals, [0, 3, 7]);
  assert.deepEqual(templateFor('7').intervals, [0, 4, 7, 10]);
  assert.deepEqual(templateFor('???').intervals, [0, 4, 7]); // major fallback
});

test('chordPitchClasses computes C major', () => {
  assert.deepEqual(chordPitchClasses('C', ''), [0, 4, 7]);
});

test('chordPitchClasses computes A minor', () => {
  assert.deepEqual(chordPitchClasses('A', 'm'), [9, 0, 4]); // A C E
});

test('chordPitchClasses computes G7 (4 notes)', () => {
  assert.deepEqual(chordPitchClasses('G', '7'), [7, 11, 2, 5]); // G B D F
});

test('chordPitchClasses bad root returns empty', () => {
  assert.deepEqual(chordPitchClasses('H', ''), []);
});

test('chordNoteNames returns readable names', () => {
  assert.deepEqual(chordNoteNames('C', ''), ['C', 'E', 'G']);
  assert.deepEqual(chordNoteNames('A', 'm'), ['A', 'C', 'E']);
});

test('describeChord enriches a definition', () => {
  const d = describeChord({ root: 'G', suffix: '7', level: 3 });
  assert.equal(d.symbol, 'G7');
  assert.equal(d.size, 4);
  assert.deepEqual(d.names, ['G', 'B', 'D', 'F']);
});

test('chordsUpToLevel accumulates', () => {
  const l1 = chordsUpToLevel(1);
  const l3 = chordsUpToLevel(3);
  assert.ok(l1.every((c) => c.level === 1));
  assert.ok(l3.length > l1.length);
  assert.ok(l3.some((c) => c.level === 3));
});

test('every TREE_CHORDS entry resolves to valid pitch classes', () => {
  for (const def of TREE_CHORDS) {
    const pcs = chordPitchClasses(def.root, def.suffix);
    assert.ok(pcs.length >= 3, `${def.root}${def.suffix} should have >=3 notes`);
    assert.ok(pcs.every((p) => p >= 0 && p <= 11));
    assert.equal(new Set(pcs).size, pcs.length, `${def.root}${def.suffix} no dup pcs`);
  }
});

test('pickChord respects level cap', () => {
  let seqRng = 0;
  const c = pickChord({ level: 1, rng: () => 0 });
  assert.equal(c.level, 1);
});

test('pickChord avoids the same symbol', () => {
  // force rng to first element; avoid it -> should pick a different one
  const first = pickChord({ level: 3, rng: () => 0 });
  const next = pickChord({ level: 3, avoidSymbol: first.symbol, rng: () => 0 });
  assert.notEqual(next.symbol, first.symbol);
});

test('ToneTreeGame lights up component notes octave-agnostic', () => {
  const g = new ToneTreeGame(describeChord({ root: 'C', suffix: '', level: 1 }));
  assert.deepEqual(g.progress(), { found: 0, total: 3 });
  let r = g.press(60); // C4
  assert.ok(r.inChord && r.isNew && !r.complete);
  r = g.press(72); // C5 — same pc, not new
  assert.ok(r.inChord && !r.isNew);
  r = g.press(64); // E4
  assert.ok(r.isNew);
  r = g.press(67); // G4
  assert.ok(r.isNew && r.complete);
  assert.ok(g.isComplete());
  assert.deepEqual(g.progress(), { found: 3, total: 3 });
});

test('ToneTreeGame counts strays without penalty and tracks remaining', () => {
  const g = new ToneTreeGame(describeChord({ root: 'A', suffix: 'm', level: 1 }));
  const r = g.press(62); // D — not in Am
  assert.ok(!r.inChord && !r.isNew);
  assert.equal(g.strayCount, 1);
  assert.equal(g.remaining().length, 3);
  g.press(69); // A
  assert.equal(g.remaining().length, 2);
  g.reset();
  assert.equal(g.strayCount, 0);
  assert.equal(g.progress().found, 0);
});
