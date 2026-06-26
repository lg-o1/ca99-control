import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  KEYS, PATTERNS, HANDS, FLAVORS, keyById, rootMidi, rollMission, DiceWarmup,
} from './dice-warmup.js';

test('KEYS/PATTERNS/HANDS/FLAVORS populated', () => {
  assert.ok(KEYS.length >= 6);
  assert.equal(PATTERNS.length, 4);
  assert.equal(HANDS.length, 3);
  assert.ok(FLAVORS.length >= 4);
});

test('rootMidi places C at 60', () => {
  assert.equal(rootMidi(0), 60);
  assert.equal(rootMidi(7), 67);
});

test('keyById fallback', () => {
  assert.equal(keyById('G').id, 'G');
  assert.equal(keyById('zzz').id, 'C');
});

test('C major scale-up generates correct notes', () => {
  const p = PATTERNS.find((x) => x.id === 'scale-up');
  assert.deepEqual(p.gen(60), [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('scale-down is reverse of up', () => {
  const p = PATTERNS.find((x) => x.id === 'scale-down');
  assert.deepEqual(p.gen(60), [72, 71, 69, 67, 65, 64, 62, 60]);
});

test('scale-updn goes up then back down without repeating top', () => {
  const p = PATTERNS.find((x) => x.id === 'scale-updn');
  const notes = p.gen(60);
  assert.equal(notes[0], 60);
  assert.equal(notes[notes.length - 1], 60);
  assert.equal(notes.filter((n) => n === 72).length, 1); // top appears once
});

test('arpeggio is major triad to octave', () => {
  const p = PATTERNS.find((x) => x.id === 'arp');
  assert.deepEqual(p.gen(60), [60, 64, 67, 72]);
});

test('rollMission with seeded rng is deterministic', () => {
  let i = 0;
  const seq = [0, 0, 0, 0];
  const rng = () => seq[i++ % seq.length];
  const m = rollMission(rng);
  assert.equal(m.key.id, 'C');
  assert.equal(m.pattern.id, 'scale-up');
  assert.equal(m.hand.id, 'r');
  assert.ok(m.label.includes('C 大调'));
  assert.deepEqual(m.notes, [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('DiceWarmup: complete a mission advances done + streak', () => {
  const d = new DiceWarmup({ rng: () => 0 }); // always first face -> C scale-up
  d.roll();
  const notes = [60, 62, 64, 65, 67, 69, 71, 72];
  let res;
  notes.forEach((n) => { res = d.press(n); });
  assert.equal(res.complete, true);
  assert.equal(d.done, 1);
  assert.equal(d.streak, 1);
});

test('DiceWarmup: wrong note restarts and breaks streak on completion', () => {
  const d = new DiceWarmup({ rng: () => 0 });
  d.roll();
  assert.equal(d.press(60).advance, true);
  const w = d.press(99); // wrong
  assert.equal(w.wrong, true);
  assert.equal(d.idx, 0);
  // now play full clean
  [60, 62, 64, 65, 67, 69, 71, 72].forEach((n) => d.press(n));
  assert.equal(d.done, 1);
  assert.equal(d.streak, 0); // dirty -> streak reset
});

test('DiceWarmup: octave-agnostic match', () => {
  const d = new DiceWarmup({ rng: () => 0 });
  d.roll();
  assert.equal(d.press(72).advance, true); // C5 counts as first C
});

test('DiceWarmup: two clean missions build streak', () => {
  const d = new DiceWarmup({ rng: () => 0 });
  const play = () => { d.roll(); [60, 62, 64, 65, 67, 69, 71, 72].forEach((n) => d.press(n)); };
  play(); play();
  assert.equal(d.done, 2);
  assert.equal(d.streak, 2);
});
