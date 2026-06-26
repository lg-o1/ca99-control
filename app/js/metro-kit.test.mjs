import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, METERS, meterById, beatsOf, accentAt,
  SOUNDS, soundById, clickSpec, levelFromAccent,
} from './metro-kit.js';

test('LEVELS has three ordered levels', () => {
  assert.deepEqual(LEVELS, ['weak', 'mid', 'accent']);
});

test('METERS cover common signatures with matching accent lengths', () => {
  const ids = METERS.map((m) => m.id);
  for (const want of ['2/4', '3/4', '4/4', '6/8']) assert.ok(ids.includes(want), want);
  for (const m of METERS) assert.equal(m.accents.length, m.beats, m.id);
});

test('meterById falls back to 4/4 for unknown', () => {
  assert.equal(meterById('99/9').id, '4/4');
  assert.equal(meterById('3/4').id, '3/4');
});

test('beatsOf returns beats per bar', () => {
  assert.equal(beatsOf('2/4'), 2);
  assert.equal(beatsOf('6/8'), 6);
  assert.equal(beatsOf('nope'), 4);
});

test('accentAt: 4/4 strong on 1, mid on 3, weak on 2 and 4', () => {
  assert.equal(accentAt('4/4', 0), 'accent');
  assert.equal(accentAt('4/4', 1), 'weak');
  assert.equal(accentAt('4/4', 2), 'mid');
  assert.equal(accentAt('4/4', 3), 'weak');
});

test('accentAt: 3/4 only downbeat is accent', () => {
  assert.deepEqual([0, 1, 2].map((b) => accentAt('3/4', b)), ['accent', 'weak', 'weak']);
});

test('accentAt: 6/8 compound — accent on 1, mid on 4', () => {
  assert.equal(accentAt('6/8', 0), 'accent');
  assert.equal(accentAt('6/8', 3), 'mid');
  assert.equal(accentAt('6/8', 1), 'weak');
  assert.equal(accentAt('6/8', 5), 'weak');
});

test('accentAt wraps out-of-range beat indices', () => {
  assert.equal(accentAt('4/4', 4), 'accent'); // wraps to 0
  assert.equal(accentAt('4/4', 6), 'mid');    // wraps to 2
  assert.equal(accentAt('3/4', -1), 'weak');  // wraps to 2
});

test('SOUNDS each define gain for all three levels', () => {
  assert.ok(SOUNDS.length >= 5);
  for (const s of SOUNDS) {
    assert.ok(s.id && s.name && s.emoji && s.kind, s.id);
    for (const lv of LEVELS) assert.equal(typeof s.gain[lv], 'number', `${s.id}.${lv}`);
  }
});

test('soundById falls back to first for unknown', () => {
  assert.equal(soundById('zzz').id, SOUNDS[0].id);
  assert.equal(soundById('drum').id, 'drum');
});

test('clickSpec resolves tone fields per level', () => {
  const a = clickSpec('classic', 'accent');
  assert.equal(a.kind, 'tone');
  assert.equal(a.wave, 'square');
  assert.equal(a.freq, 1500);
  assert.equal(a.gain, 0.5);
  const w = clickSpec('classic', 'weak');
  assert.equal(w.freq, 900);
  assert.ok(w.gain < a.gain);
});

test('clickSpec resolves noise/kick/bell/chirp kinds', () => {
  assert.equal(clickSpec('clap', 'mid').kind, 'noise');
  assert.equal(typeof clickSpec('clap', 'mid').filter, 'number');
  assert.equal(clickSpec('drum', 'accent').kind, 'kick');
  assert.equal(typeof clickSpec('drum', 'accent').freq, 'number');
  assert.equal(clickSpec('bell', 'weak').kind, 'bell');
  assert.equal(clickSpec('chirp', 'accent').kind, 'chirp');
});

test('clickSpec defaults bad level to weak', () => {
  assert.deepEqual(clickSpec('classic', 'bogus'), clickSpec('classic', 'weak'));
});

test('levelFromAccent maps boolean to level', () => {
  assert.equal(levelFromAccent(true), 'accent');
  assert.equal(levelFromAccent(false), 'weak');
});
