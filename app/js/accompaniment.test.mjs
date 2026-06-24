import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  Accompaniment, PATTERNS, PROG_KEYS, PROGRESSIONS, triadPcs, getPattern,
} from './accompaniment.js';

const C = PROG_KEYS.find((k) => k.id === 'C');
const POP = PROGRESSIONS.find((p) => p.id === 'pop'); // I–V–vi–IV
const block = getPattern('block');
const alberti = getPattern('alberti');
const waltz = getPattern('waltz');

test('triadPcs: major / minor / dim', () => {
  assert.deepEqual(triadPcs(0, ''), [0, 4, 7]);   // C major
  assert.deepEqual(triadPcs(0, 'm'), [0, 3, 7]);  // C minor
  assert.deepEqual(triadPcs(0, 'dim'), [0, 3, 6]);
});

test('PATTERNS: five patterns with required fields', () => {
  assert.equal(PATTERNS.length, 5);
  for (const p of PATTERNS) {
    assert.ok(p.id && p.name && p.emoji && p.beats && typeof p.build === 'function');
  }
});

test('getPattern returns default on unknown id', () => {
  assert.equal(getPattern('nope').id, 'block');
  assert.equal(getPattern('waltz').id, 'waltz');
});

test('block pattern: one step per chord = whole triad', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  // 4 chords × 1 step = 4 steps
  assert.equal(a.steps.length, 4);
  const s0 = a.steps[0];
  assert.equal(s0.symbol, 'C');     // I in C
  assert.equal(s0.notes.length, 3); // triad
  assert.deepEqual(s0.pcs.slice().sort((x, y) => x - y), [0, 4, 7]);
});

test('alberti pattern: 4 single-note steps per chord', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti });
  assert.equal(a.steps.length, 16); // 4 chords × 4 steps
  const first4 = a.steps.slice(0, 4);
  first4.forEach((s) => assert.equal(s.notes.length, 1));
  // low-high-mid-high => root, fifth, third, fifth (by pitch class)
  assert.deepEqual(first4.map((s) => s.pcs[0]), [0, 7, 4, 7]); // C G E G
  assert.deepEqual(first4.map((s) => s.label), ['低', '高', '中', '高']);
});

test('waltz pattern: 3 steps per chord, low bass then two chord stabs', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: waltz });
  assert.equal(a.steps.length, 12); // 4 × 3
  const [b, c1, c2] = a.steps.slice(0, 3);
  assert.equal(b.notes.length, 1);   // bass single
  assert.equal(c1.notes.length, 2);  // third+fifth
  assert.equal(c2.notes.length, 2);
  // bass is an octave below the root
  assert.ok(b.notes[0] < a.steps[1].notes[0]);
});

test('beat accumulation across bars uses pattern.beats', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti });
  assert.equal(a.steps[0].beat, 0);
  assert.equal(a.steps[4].beat, 4);  // second chord starts at beat 4
  assert.equal(a.totalBeats, 16);    // 4 bars × 4 beats
  const w = new Accompaniment({ key: C, progression: POP, pattern: waltz });
  assert.equal(w.totalBeats, 12);    // 4 bars × 3 beats
});

test('exact match advances cursor (single note)', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti });
  const want = a.current().notes[0];
  const r = a.press(new Set([want]));
  assert.equal(r.ok, true);
  assert.equal(r.advanced, true);
  assert.equal(a.cursor, 1);
  assert.equal(a.hits, 1);
});

test('wrong / incomplete set does not advance', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  const triad = a.current().notes;
  // only 2 of 3 notes -> no advance
  assert.equal(a.press(new Set(triad.slice(0, 2))).advanced, false);
  assert.equal(a.cursor, 0);
  // full triad -> advance
  assert.equal(a.press(new Set(triad)).advanced, true);
  assert.equal(a.cursor, 1);
});

test('block chord must be played exactly (no extra notes)', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  const triad = a.current().notes;
  assert.equal(a.press(new Set([...triad, triad[0] + 1])).advanced, false); // extra note
  assert.equal(a.cursor, 0);
});

test('octaveAgnostic matches by pitch class', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti, octaveAgnostic: true });
  const wantPc = a.current().pcs[0];
  // play the note an octave up
  assert.equal(a.matches(new Set([60 + wantPc])), true);
});

test('hasWrong detects out-of-chord notes', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  const triad = a.current().notes;
  assert.equal(a.hasWrong(new Set(triad)), false);
  assert.equal(a.hasWrong(new Set([triad[0] + 1])), true); // chromatic neighbour
});

test('fail increments misses and resets combo', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti });
  a.press(new Set([a.current().notes[0]])); // hit -> combo 1
  assert.equal(a.combo, 1);
  a.fail();
  assert.equal(a.combo, 0);
  assert.equal(a.misses, 1);
});

test('maxCombo tracks the longest streak', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti });
  for (let i = 0; i < 3; i++) a.press(new Set([a.current().notes[0]]));
  assert.equal(a.maxCombo, 3);
  a.fail();
  a.press(new Set([a.current().notes[0]]));
  assert.equal(a.maxCombo, 3); // streak after fail is only 1
});

test('done flips true at end of sequence', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  assert.equal(a.done(), false);
  while (!a.done()) a.press(new Set(a.current().notes));
  assert.equal(a.done(), true);
  assert.equal(a.current(), null);
});

test('summary stars: 3 stars at >=95% accuracy', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  while (!a.done()) a.press(new Set(a.current().notes));
  const s = a.summary();
  assert.equal(s.accuracy, 100);
  assert.equal(s.stars, 3);
  assert.equal(s.total, 4);
  assert.equal(s.hits, 4);
});

test('summary stars: 2 stars at 80-94%, 1 star below', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: block });
  // 4 hits, 1 miss => 80%
  while (!a.done()) a.press(new Set(a.current().notes));
  a.fail();
  assert.equal(a.summary().accuracy, 80);
  assert.equal(a.summary().stars, 2);
});

test('reset clears progress but keeps steps', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: alberti });
  a.press(new Set([a.current().notes[0]]));
  a.fail();
  a.reset();
  assert.equal(a.cursor, 0);
  assert.equal(a.hits, 0);
  assert.equal(a.misses, 0);
  assert.equal(a.combo, 0);
  assert.equal(a.steps.length, 16);
});

test('range covers all step notes', () => {
  const a = new Accompaniment({ key: C, progression: POP, pattern: waltz });
  const all = a.steps.flatMap((s) => s.notes);
  assert.equal(a.range[0], Math.min(...all));
  assert.equal(a.range[1], Math.max(...all));
});

test('different keys transpose the roots', () => {
  const G = PROG_KEYS.find((k) => k.id === 'G');
  const a = new Accompaniment({ key: G, progression: POP, pattern: block });
  assert.equal(a.steps[0].symbol, 'G'); // I in G major
});

test('12-bar blues progression expands to 12 chords', () => {
  const blues = PROGRESSIONS.find((p) => p.id === 'twelve-bar');
  const a = new Accompaniment({ key: C, progression: blues, pattern: block });
  assert.equal(a.chords.length, 12);
  assert.equal(a.steps.length, 12); // block = 1 step/chord
});
