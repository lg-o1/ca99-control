import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeChord, colorOf, degreeInKey, tonicTriadPcs,
  COLOR_KEYS, QUALITY_COLORS,
} from './chord-color.js';

const C = COLOR_KEYS.find((k) => k.id === 'C');
const Am = COLOR_KEYS.find((k) => k.id === 'Am');
const NONE = COLOR_KEYS[0];

// C major triad MIDI: C4 E4 G4
const Cmaj = [60, 64, 67];
const Amin = [57, 60, 64]; // A C E
const G7 = [55, 59, 62, 65]; // G B D F
const Bdim = [59, 62, 65]; // B D F

test('COLOR_KEYS first entry is no-key', () => {
  assert.equal(COLOR_KEYS[0].id, 'none');
  assert.equal(COLOR_KEYS[0].tonicPc, null);
});

test('QUALITY_COLORS covers core qualities with required fields', () => {
  for (const k of ['', 'm', 'dim', 'aug', '7', 'maj7', 'm7']) {
    const c = QUALITY_COLORS[k];
    assert.ok(c && c.color && c.glow && c.label && typeof c.flash === 'boolean' && c.mood);
  }
});

test('colorOf returns default for unknown suffix', () => {
  const c = colorOf('totally-unknown');
  assert.ok(c.color && c.label);
});

test('major chord => warm, no flash', () => {
  const r = analyzeChord(Cmaj, NONE);
  assert.equal(r.ok, true);
  assert.equal(r.symbol, 'C');
  assert.equal(r.quality, '大三和弦');
  assert.equal(r.flash, false);
});

test('minor chord => cool color', () => {
  const r = analyzeChord(Amin, NONE);
  assert.equal(r.symbol, 'Am');
  assert.equal(r.quality, '小三和弦');
});

test('diminished chord => flash (tension)', () => {
  const r = analyzeChord(Bdim, NONE);
  assert.equal(r.symbol, 'Bdim');
  assert.equal(r.flash, true);
});

test('dominant 7th always flashes (wants home) even with no key', () => {
  const r = analyzeChord(G7, NONE);
  assert.equal(r.symbol, 'G7');
  assert.equal(r.quality, '属七和弦');
  assert.equal(r.flash, true);
});

test('too few notes => not ok with helpful hint', () => {
  const r = analyzeChord([60, 64], NONE);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'tooFew');
  assert.ok(r.hint.length > 0);
});

test('empty => empty reason', () => {
  const r = analyzeChord([], NONE);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'empty');
});

test('unrecognized cluster => unknown reason', () => {
  const r = analyzeChord([60, 61, 62], NONE); // chromatic cluster
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'unknown');
});

test('degreeInKey: C major scale degrees', () => {
  assert.equal(degreeInKey(0, C), 1);  // C => I
  assert.equal(degreeInKey(7, C), 5);  // G => V
  assert.equal(degreeInKey(9, C), 6);  // A => vi
  assert.equal(degreeInKey(2, C), 2);  // D => ii
  assert.equal(degreeInKey(11, C), 7); // B => vii
});

test('degreeInKey: chromatic root not in scale => null', () => {
  assert.equal(degreeInKey(1, C), null); // C# not in C major
});

test('degreeInKey: no-key => null', () => {
  assert.equal(degreeInKey(0, NONE), null);
});

test('analyze in C: I chord => roman I, function home', () => {
  const r = analyzeChord(Cmaj, C);
  assert.equal(r.degree, 1);
  assert.equal(r.roman, 'I');
  assert.match(r.func, /主/);
  assert.equal(r.wantsHome, false);
});

test('analyze in C: G7 => roman V7, wantsHome true with hint', () => {
  const r = analyzeChord(G7, C);
  assert.equal(r.degree, 5);
  assert.equal(r.roman, 'V7');
  assert.equal(r.wantsHome, true);
  assert.match(r.hint, /回主|回家|属/);
});

test('analyze in C: vii° (Bdim) => dominant function, wantsHome', () => {
  const r = analyzeChord(Bdim, C);
  assert.equal(r.degree, 7);
  assert.equal(r.roman, 'vii°');
  assert.equal(r.wantsHome, true);
});

test('analyze in Am: i chord => roman i', () => {
  const r = analyzeChord(Amin, Am);
  assert.equal(r.degree, 1);
  assert.equal(r.roman, 'i');
});

test('vi chord in C (Am) => not dominant', () => {
  const r = analyzeChord(Amin, C);
  assert.equal(r.degree, 6);
  assert.equal(r.roman, 'vi');
  assert.equal(r.wantsHome, false);
});

test('inversion is reported', () => {
  // C/E first inversion: E G C
  const r = analyzeChord([64, 67, 72], NONE);
  assert.equal(r.ok, true);
  assert.equal(r.inversion, true);
  assert.equal(r.bassPc, 4); // E
});

test('names and pcs are sorted/unique', () => {
  const r = analyzeChord([67, 60, 64, 60], NONE); // dup C
  assert.deepEqual(r.pcs, [0, 4, 7]);
  assert.deepEqual(r.names, ['C', 'E', 'G']);
});

test('tonicTriadPcs: C major => [0,4,7]', () => {
  assert.deepEqual(tonicTriadPcs(C), [0, 4, 7]);
});

test('tonicTriadPcs: A minor => [9,0,4]', () => {
  assert.deepEqual(tonicTriadPcs(Am), [9, 0, 4]);
});

test('tonicTriadPcs: no-key => null', () => {
  assert.equal(tonicTriadPcs(NONE), null);
});

test('octave-spread chord still recognized (root pos C)', () => {
  const r = analyzeChord([48, 64, 79], NONE); // C2 E4 G5
  assert.equal(r.symbol, 'C');
});
