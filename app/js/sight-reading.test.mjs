/**
 * sight-reading.test.mjs — 视奏闪卡单元测试
 * 运行: node js/sight-reading.test.mjs
 */
import {
  diatonicStep, isSharp, noteLabel, staffPosition, needsLedger,
  randomNote, stepToWhiteNote, CLEFS, SightReadingGame,
} from './sight-reading.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// MIDI ref: C4=60, E4=64, G4=67, B4=71, A4=69, F4=65, D4=62; G2=43

// ---- diatonicStep increments by 7 per octave, by letter within ----
eq(diatonicStep(60), 35, 'C4 step (5*7+0)');
eq(diatonicStep(62), 36, 'D4 step');
eq(diatonicStep(64), 37, 'E4 step');
eq(diatonicStep(72), 42, 'C5 step (one octave up = +7)');
// C# shares letter with C
eq(diatonicStep(61), 35, 'C#4 same step as C4');

// ---- isSharp ----
ok(isSharp(61), 'C#4 is sharp');
ok(!isSharp(60), 'C4 not sharp');
ok(isSharp(66), 'F#4 is sharp');
ok(!isSharp(67), 'G4 not sharp');

// ---- noteLabel ----
eq(noteLabel(60), 'C4', 'label C4');
eq(noteLabel(69), 'A4', 'label A4');
eq(noteLabel(61), 'C#4', 'label C#4');

// ---- staffPosition: treble ----
eq(staffPosition(64, 'treble'), 0, 'E4 = bottom line (pos 0)');
eq(staffPosition(67, 'treble'), 2, 'G4 = 2nd line (pos 2)');
eq(staffPosition(71, 'treble'), 4, 'B4 = middle line (pos 4)');
eq(staffPosition(77, 'treble'), 8, 'F5 = top line (pos 8)');
eq(staffPosition(60, 'treble'), -2, 'C4 = ledger below (pos -2)');

// ---- staffPosition: bass ----
eq(staffPosition(43, 'bass'), 0, 'G2 = bottom line bass');
eq(staffPosition(50, 'bass'), 4, 'D3 = middle line bass');
eq(staffPosition(57, 'bass'), 8, 'A3 = top line bass');
eq(staffPosition(60, 'bass'), 10, 'C4 = ledger above bass (pos 10)');

// ---- needsLedger ----
ok(needsLedger(-1), 'pos -1 needs ledger');
ok(needsLedger(9), 'pos 9 needs ledger');
ok(!needsLedger(0), 'pos 0 (bottom line) no ledger');
ok(!needsLedger(8), 'pos 8 (top line) no ledger');
ok(!needsLedger(4), 'pos 4 (middle) no ledger');

// ---- stepToWhiteNote inverts diatonicStep for white keys ----
eq(stepToWhiteNote(35), 60, 'step 35 -> C4');
eq(stepToWhiteNote(37), 64, 'step 37 -> E4');
eq(stepToWhiteNote(39), 67, 'step 39 -> G4');
eq(stepToWhiteNote(42), 72, 'step 42 -> C5');
// round-trip for all white notes in an octave
for (const n of [60, 62, 64, 65, 67, 69, 71]) {
  eq(stepToWhiteNote(diatonicStep(n)), n, `round-trip ${noteLabel(n)}`);
}

// ---- randomNote: always white key, within range ----
{
  // rng=0 -> minPos (-2). For treble base E4(step37), pos -2 -> step 35 -> C4 (60)
  eq(randomNote({ clef: 'treble', rng: () => 0 }), 60, 'rng=0 treble -> C4 (pos -2)');
  // rng near 1 -> maxPos (10). step 37+10=47 -> stepToWhiteNote(47): oct=6,letter=5(A),semis=9 -> 81 = A5
  const hi = randomNote({ clef: 'treble', rng: () => 0.999 });
  eq(hi, 81, 'rng~1 treble -> A5 (pos 10)');
  // all generated notes are white keys
  let allWhite = true;
  for (let i = 0; i < 50; i++) {
    const n = randomNote({ clef: 'treble', rng: () => i / 50 });
    if (isSharp(n)) { allWhite = false; break; }
  }
  ok(allWhite, 'randomNote always white key');
}

// ---- randomNote: custom range ----
{
  // minPos=0 maxPos=0 -> always bottom line E4
  eq(randomNote({ clef: 'treble', rng: () => 0.5, minPos: 0, maxPos: 0 }), 64, 'fixed pos 0 -> E4');
}

// ---- SightReadingGame: next uses rng ----
{
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0 });
  const q = g.next();
  eq(q, 60, 'first question C4 (rng=0)');
  eq(g.current, 60, 'current set');
}

// ---- SightReadingGame: octaveAgnostic correct ----
{
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0, octaveAgnostic: true });
  g.next(); // C4 = 60
  ok(g.check(72) === true, 'octave-agnostic: C5 answers C4');
  eq(g.score, 1, 'score up');
  eq(g.streak, 1, 'streak up');
}

// ---- SightReadingGame: strict octave ----
{
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0, octaveAgnostic: false });
  g.next(); // C4
  ok(g.check(72) === false, 'strict: C5 wrong for C4');
  ok(g.check(60) === true, 'strict: C4 correct');
}

// ---- SightReadingGame: wrong resets streak ----
{
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0 });
  g.next();
  g.check(60); // correct, streak 1
  g.check(60); // correct, streak 2
  eq(g.streak, 2, 'streak 2');
  // now wrong (current advanced; rng=0 always C4, so play D=62 wrong)
  ok(g.check(62) === false, 'wrong answer');
  eq(g.streak, 0, 'streak reset');
  eq(g.best, 2, 'best retained');
}

// ---- SightReadingGame: accuracy + attempts ----
{
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0 });
  g.next();
  g.check(60); // correct
  g.check(62); // wrong
  eq(g.attempts, 2, '2 attempts');
  eq(g.score, 1, '1 correct');
  eq(g.accuracy, 0.5, 'accuracy 0.5');
}

// ---- SightReadingGame: onResult fired with flag ----
{
  const results = [];
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0 });
  g.onResult = (correct) => results.push(correct);
  g.next();
  g.check(60); g.check(62);
  eq(results, [true, false], 'onResult flags');
}

// ---- check before next -> false ----
{
  const g = new SightReadingGame({ rng: () => 0 });
  ok(g.check(60) === false, 'no current -> false');
}

// ---- reset ----
{
  const g = new SightReadingGame({ clef: 'treble', rng: () => 0 });
  g.next(); g.check(60);
  g.reset();
  eq(g.score, 0, 'reset score');
  eq(g.attempts, 0, 'reset attempts');
  ok(g.current === null, 'reset current');
}

// ---- CLEFS defined ----
ok(CLEFS.treble.bottomLineNote === 64, 'treble bottom E4');
ok(CLEFS.bass.bottomLineNote === 43, 'bass bottom G2');

console.log(`\nsight-reading: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
