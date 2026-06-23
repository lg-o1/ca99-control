/**
 * chord-detect.test.mjs — 和弦识别单元测试
 * 运行: node js/chord-detect.test.mjs
 */
import {
  pitchClass, noteName, pitchClassSet, intervalName,
  detectChord, describeNotes, NOTE_NAMES,
} from './chord-detect.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// MIDI 参考：C4=60, E4=64, G4=67, A4=69, B4=71, D4=62, F4=65, Bb4=70

// ---- pitchClass ----
eq(pitchClass(60), 0, 'C4 -> 0');
eq(pitchClass(72), 0, 'C5 -> 0');
eq(pitchClass(61), 1, 'C#4 -> 1');
eq(pitchClass(71), 11, 'B4 -> 11');

// ---- noteName ----
eq(noteName(60), 'C4', 'note 60');
eq(noteName(69), 'A4', 'note 69');
eq(noteName(61), 'C#4', 'note 61');
eq(noteName(48), 'C3', 'note 48');

// ---- pitchClassSet dedup+sort ----
eq(pitchClassSet([60, 64, 67]), [0, 4, 7], 'C major pcs');
eq(pitchClassSet([60, 72, 64]), [0, 4], 'octave dup removed');

// ---- intervalName ----
eq(intervalName(60, 67), '纯五度', 'P5');
eq(intervalName(60, 64), '大三度', 'M3');
eq(intervalName(60, 63), '小三度', 'm3');
eq(intervalName(60, 72), '纯八度', 'P8');

// ---- detectChord: triads ----
eq(detectChord([60, 64, 67]).symbol, 'C', 'C major');
eq(detectChord([60, 63, 67]).symbol, 'Cm', 'C minor');
eq(detectChord([60, 63, 66]).symbol, 'Cdim', 'C diminished');
eq(detectChord([60, 64, 68]).symbol, 'Caug', 'C augmented');
eq(detectChord([60, 65, 67]).symbol, 'Csus4', 'C sus4');
eq(detectChord([60, 62, 67]).symbol, 'Csus2', 'C sus2');

// ---- detectChord: different roots ----
eq(detectChord([69, 72, 76]).symbol, 'Am', 'A minor (A C E)');
eq(detectChord([67, 71, 74]).symbol, 'G', 'G major (G B D)');
eq(detectChord([62, 65, 69]).symbol, 'Dm', 'D minor (D F A)');

// ---- detectChord: sevenths ----
eq(detectChord([67, 71, 74, 77]).symbol, 'G7', 'G dominant 7 (G B D F)');
eq(detectChord([60, 64, 67, 71]).symbol, 'Cmaj7', 'C major 7');
eq(detectChord([60, 63, 67, 70]).symbol, 'Cm7', 'C minor 7');
eq(detectChord([71, 74, 77, 81]).symbol, 'Bm7b5', 'B half-dim (B D F A)');

// ---- detectChord: 6th + add9 ----
eq(detectChord([60, 64, 67, 69]).symbol, 'C6', 'C major 6');
eq(detectChord([60, 62, 64, 67]).symbol, 'Cadd9', 'C add9');

// ---- detectChord: octave doubling doesn't break triad ----
eq(detectChord([60, 64, 67, 72]).symbol, 'C', 'C major with doubled root octave');

// ---- detectChord: inversion (bass != root) ----
{
  // E G C  -> C major, first inversion, bass E
  const c = detectChord([64, 67, 72]);
  eq(c.root, 'C', 'inversion root still C');
  ok(c.inversion === true, 'inversion flagged');
  eq(c.bass, 'E', 'bass is E');
  eq(c.symbol, 'C/E', 'slash chord C/E');
}

// ---- detectChord: root position not flagged as inversion ----
{
  const c = detectChord([60, 64, 67]);
  ok(c.inversion === false, 'root position not inversion');
  eq(c.symbol, 'C', 'plain symbol');
}

// ---- detectChord: too few notes ----
eq(detectChord([60, 64]), null, '2 notes -> null');
eq(detectChord([60]), null, '1 note -> null');

// ---- detectChord: unknown cluster ----
eq(detectChord([60, 61, 62]), null, 'chromatic cluster -> null');

// ---- describeNotes ----
eq(describeNotes([]), '', 'empty -> empty');
eq(describeNotes([60]), 'C4', 'single note name');
eq(describeNotes([60, 67]), 'C4 + G4（纯五度）', 'two notes interval');
eq(describeNotes([60, 64, 67]), 'C', 'triad -> symbol');
eq(describeNotes([64, 67, 72]), 'C/E（转位）', 'inversion described');
ok(describeNotes([60, 61, 62]).includes('C4'), 'unknown cluster lists names');

// ---- describeNotes sorts unknown cluster ----
eq(describeNotes([62, 60, 61]), 'C4 C#4 D4', 'unknown cluster sorted by pitch');

console.log(`\nchord-detect: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
