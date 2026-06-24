import {
  accidentalList, keyForSignature, signatureFor, hintFor,
  tonicLetter, isMinor, tonicMidi, scaleMidi, buildChoices, makeRng,
  KeySignatureGame, SHARP_ORDER, FLAT_ORDER,
} from './key-signature.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) { pass++; } else { fail++; console.error(`FAIL: ${msg}\n  got ${sa}\n  exp ${sb}`); }
}
function ok(c, msg) { if (c) pass++; else { fail++; console.error(`FAIL: ${msg}`); } }

// ---- accidentalList ----
eq(accidentalList(0, 'sharp'), [], 'no accidentals');
eq(accidentalList(1, 'sharp'), ['F#'], '1 sharp');
eq(accidentalList(3, 'sharp'), ['F#', 'C#', 'G#'], '3 sharps order');
eq(accidentalList(7, 'sharp'), ['F#', 'C#', 'G#', 'D#', 'A#', 'E#', 'B#'], '7 sharps');
eq(accidentalList(1, 'flat'), ['Bb'], '1 flat');
eq(accidentalList(3, 'flat'), ['Bb', 'Eb', 'Ab'], '3 flats order');
eq(accidentalList(7, 'flat'), ['Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb', 'Fb'], '7 flats');

// ---- keyForSignature major ----
eq(keyForSignature(0, 'none', 'major'), 'C', 'C major');
eq(keyForSignature(1, 'sharp', 'major'), 'G', 'G major 1#');
eq(keyForSignature(2, 'sharp', 'major'), 'D', 'D major 2#');
eq(keyForSignature(3, 'sharp', 'major'), 'A', 'A major 3#');
eq(keyForSignature(4, 'sharp', 'major'), 'E', 'E major 4#');
eq(keyForSignature(5, 'sharp', 'major'), 'B', 'B major 5#');
eq(keyForSignature(6, 'sharp', 'major'), 'F#', 'F# major 6#');
eq(keyForSignature(7, 'sharp', 'major'), 'C#', 'C# major 7#');
eq(keyForSignature(1, 'flat', 'major'), 'F', 'F major 1b');
eq(keyForSignature(2, 'flat', 'major'), 'Bb', 'Bb major 2b');
eq(keyForSignature(3, 'flat', 'major'), 'Eb', 'Eb major 3b');
eq(keyForSignature(4, 'flat', 'major'), 'Ab', 'Ab major 4b');
eq(keyForSignature(5, 'flat', 'major'), 'Db', 'Db major 5b');
eq(keyForSignature(6, 'flat', 'major'), 'Gb', 'Gb major 6b');
eq(keyForSignature(7, 'flat', 'major'), 'Cb', 'Cb major 7b');

// ---- keyForSignature minor ----
eq(keyForSignature(0, 'none', 'minor'), 'Am', 'A minor');
eq(keyForSignature(1, 'sharp', 'minor'), 'Em', 'E minor 1#');
eq(keyForSignature(2, 'sharp', 'minor'), 'Bm', 'B minor 2#');
eq(keyForSignature(3, 'sharp', 'minor'), 'F#m', 'F# minor 3#');
eq(keyForSignature(1, 'flat', 'minor'), 'Dm', 'D minor 1b');
eq(keyForSignature(2, 'flat', 'minor'), 'Gm', 'G minor 2b');
eq(keyForSignature(3, 'flat', 'minor'), 'Cm', 'C minor 3b');

// ---- signatureFor round-trip ----
for (const mode of ['major', 'minor']) {
  for (let c = 0; c <= 7; c++) {
    for (const type of ['sharp', 'flat']) {
      if (c === 0 && type === 'flat') continue;
      const key = keyForSignature(c, c === 0 ? 'none' : type, mode);
      const sig = signatureFor(key, mode);
      ok(sig != null, `signatureFor ${key} (${mode}) not null`);
      eq(sig.count, c, `signatureFor ${key} count`);
    }
  }
}

// specific signatureFor checks
eq(signatureFor('A', 'major'), { count: 3, type: 'sharp', accidentals: ['F#', 'C#', 'G#'] }, 'A major sig');
eq(signatureFor('Eb', 'major'), { count: 3, type: 'flat', accidentals: ['Bb', 'Eb', 'Ab'] }, 'Eb major sig');
eq(signatureFor('C', 'major'), { count: 0, type: 'none', accidentals: [] }, 'C major sig');
eq(signatureFor('F#m', 'minor'), { count: 3, type: 'sharp', accidentals: ['F#', 'C#', 'G#'] }, 'F#m sig');

// ---- helpers ----
ok(isMinor('Am'), 'Am is minor');
ok(!isMinor('A'), 'A is major');
eq(tonicLetter('F#m'), 'F#', 'tonicLetter F#m');
eq(tonicLetter('Bb'), 'Bb', 'tonicLetter Bb');

// ---- tonicMidi / scaleMidi ----
eq(tonicMidi('C'), 60, 'C tonic midi');
eq(tonicMidi('A'), 69, 'A tonic midi');
eq(tonicMidi('Bb'), 70, 'Bb tonic midi');
eq(scaleMidi('C'), [60, 62, 64, 65, 67, 69, 71, 72], 'C major scale midi');
eq(scaleMidi('Am'), [69, 71, 72, 74, 76, 77, 79, 81], 'A minor scale midi');
// G major scale: G A B C D E F# G = 67,69,71,72,74,76,78,79
eq(scaleMidi('G'), [67, 69, 71, 72, 74, 76, 78, 79], 'G major scale midi');

// ---- hintFor ----
ok(hintFor(0, 'none', 'major').includes('C 大调'), 'hint C major');
ok(hintFor(3, 'sharp', 'major').includes('G#'), 'hint 3 sharp major mentions last sharp G#');
ok(hintFor(1, 'flat', 'major').includes('F 大调'), 'hint 1 flat is F major');
ok(hintFor(3, 'flat', 'major').includes('Eb'), 'hint 3 flat major second-to-last is Eb');

// ---- buildChoices ----
const rng = makeRng(123);
for (let i = 0; i < 50; i++) {
  const ch = buildChoices(rng, 3, 'sharp', 'major', 4);
  eq(ch.length, 4, 'choices length 4');
  ok(ch.includes('A'), 'choices include correct A (3# major)');
  ok(new Set(ch).size === 4, 'choices unique');
}

// ---- KeySignatureGame ----
const g = new KeySignatureGame({ seed: 7, modes: ['major'] });
const q = g.next();
ok(q.choices.includes(q.answer), 'question choices include answer');
eq(keyForSignature(q.count, q.type, q.mode), q.answer, 'game answer consistent');
// correct answer
const r1 = g.check(q.answer);
ok(r1.correct, 'check correct');
eq(g.score, 1, 'score 1');
eq(g.streak, 1, 'streak 1');
eq(g.accuracy, 100, 'accuracy 100');
ok(Array.isArray(r1.scale) && r1.scale.length === 8, 'result has scale');
// wrong answer
const q2 = g.next();
const wrong = q2.choices.find((c) => c !== q2.answer);
const r2 = g.check(wrong);
ok(!r2.correct, 'check wrong');
eq(g.streak, 0, 'streak reset on wrong');
eq(g.attempts, 2, 'attempts 2');
eq(g.score, 1, 'score still 1');

// best preserved
g.reset();
eq(g.score, 0, 'reset score');
eq(g.best, 0, 'reset best');
eq(g.attempts, 0, 'reset attempts');

// minor mode game
const gm = new KeySignatureGame({ seed: 3, modes: ['minor'], maxAccidentals: 4 });
for (let i = 0; i < 30; i++) {
  const qq = gm.next();
  ok(isMinor(qq.answer), `minor game answer is minor: ${qq.answer}`);
  ok(qq.count <= 4, 'respects maxAccidentals');
  ok(qq.choices.includes(qq.answer), 'minor choices include answer');
}

// includeNatural false -> never 0
const gn = new KeySignatureGame({ seed: 9, includeNatural: false, maxAccidentals: 5 });
for (let i = 0; i < 40; i++) {
  const qq = gn.next();
  ok(qq.count >= 1, 'no natural when disabled');
}

// mixed modes
const gx = new KeySignatureGame({ seed: 11, modes: ['major', 'minor'] });
let sawMajor = false, sawMinor = false;
for (let i = 0; i < 60; i++) {
  const qq = gx.next();
  if (isMinor(qq.answer)) sawMinor = true; else sawMajor = true;
}
ok(sawMajor && sawMinor, 'mixed modes produce both');

console.log(`key-signature: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
