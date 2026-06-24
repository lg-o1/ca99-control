import {
  FINGERINGS, listScales, getFingering, scaleNotes, defaultRootMidi,
  fingers, crossingPoints, noteName, ScaleFingeringSession, MAJOR_OFFSETS,
} from './scale-fingering.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) { pass++; } else { fail++; console.error(`FAIL: ${msg}\n  got ${sa}\n  exp ${sb}`); }
}
function ok(c, msg) { if (c) pass++; else { fail++; console.error(`FAIL: ${msg}`); } }

// ---- listScales / getFingering ----
ok(listScales().includes('C'), 'has C');
ok(listScales().includes('F'), 'has F');
ok(listScales().includes('Am'), 'has Am');
eq(listScales().length, 9, '9 scales');
ok(getFingering('C') != null, 'getFingering C');
ok(getFingering('Xyz') == null, 'unknown returns null');

// ---- fingering data sanity: all length 8, valid finger numbers ----
for (const id of listScales()) {
  const f = getFingering(id);
  eq(f.rh.length, 8, `${id} rh length 8`);
  eq(f.lh.length, 8, `${id} lh length 8`);
  eq(f.offsets.length, 8, `${id} offsets length 8`);
  ok(f.rh.every((n) => n >= 1 && n <= 5), `${id} rh fingers 1-5`);
  ok(f.lh.every((n) => n >= 1 && n <= 5), `${id} lh fingers 1-5`);
  ok(f.offsets[0] === 0 && f.offsets[7] === 12, `${id} octave span`);
}

// ---- C major canonical fingering ----
eq(getFingering('C').rh, [1, 2, 3, 1, 2, 3, 4, 5], 'C rh 12312345');
eq(getFingering('C').lh, [5, 4, 3, 2, 1, 3, 2, 1], 'C lh 54321321');

// ---- F major exception ----
eq(getFingering('F').rh, [1, 2, 3, 4, 1, 2, 3, 4], 'F rh 12341234');
eq(getFingering('F').lh, [5, 4, 3, 2, 1, 3, 2, 1], 'F lh 54321321');

// ---- scaleNotes ----
eq(scaleNotes('C', 60), [60, 62, 64, 65, 67, 69, 71, 72], 'C major notes from 60');
eq(scaleNotes('G', 67), [67, 69, 71, 72, 74, 76, 78, 79], 'G major notes from 67');
eq(scaleNotes('Am', 57), [57, 59, 60, 62, 64, 65, 67, 69], 'A minor notes from 57');
eq(scaleNotes('Dm', 62), [62, 64, 65, 67, 69, 70, 72, 74], 'D minor notes from 62');
// default root midi
eq(defaultRootMidi('C'), 60, 'default C root 60');
eq(defaultRootMidi('G'), 67, 'default G root 67');
eq(defaultRootMidi('A'), 69, 'default A root 69');
eq(scaleNotes('C'), [60, 62, 64, 65, 67, 69, 71, 72], 'scaleNotes default root');

// ---- noteName ----
eq(noteName(60), 'C4', 'noteName 60');
eq(noteName(61), 'C#4', 'noteName 61');
eq(noteName(69), 'A4', 'noteName 69');

// ---- crossingPoints ----
// C major RH 1 2 3 1 2 3 4 5: thumb-under at index 3 (the second 1 = F)
eq(crossingPoints([1, 2, 3, 1, 2, 3, 4, 5], 'rh'), [3], 'C rh crossing at 3');
// F major RH 1 2 3 4 1 2 3 4: thumb-under at index 4
eq(crossingPoints([1, 2, 3, 4, 1, 2, 3, 4], 'rh'), [4], 'F rh crossing at 4');
// C major LH 5 4 3 2 1 3 2 1: finger-over at index 5 (3 after 1)
eq(crossingPoints([5, 4, 3, 2, 1, 3, 2, 1], 'lh'), [5], 'C lh crossing at 5');
// first finger 1 should not count as crossing for rh
eq(crossingPoints([1, 2, 3, 4, 5], 'rh'), [], 'no crossing if only first is 1');

// ---- fingers() ----
eq(fingers('C', 'rh'), [1, 2, 3, 1, 2, 3, 4, 5], 'fingers C rh');
eq(fingers('C', 'lh'), [5, 4, 3, 2, 1, 3, 2, 1], 'fingers C lh');

// ---- ScaleFingeringSession: ascending RH play-through ----
const s = new ScaleFingeringSession('C', { hand: 'rh' });
eq(s.total, 8, 'C ascending total 8');
eq(s.currentNote(), 60, 'first note 60');
eq(s.currentFinger(), 1, 'first finger 1');
const notes = scaleNotes('C', 60);
let lastSummary = null;
s.onComplete = (sum) => { lastSummary = sum; };
notes.forEach((n, i) => {
  const r = s.feed(n);
  ok(r.correct, `feed note ${i} correct`);
});
ok(s.done, 'session done after all notes');
eq(s.correct, 8, 'all 8 correct');
eq(s.wrong, 0, 'no wrong');
eq(s.accuracy, 100, 'accuracy 100');
ok(lastSummary != null && lastSummary.accuracy === 100, 'onComplete fired');

// ---- wrong note does not advance ----
const s2 = new ScaleFingeringSession('C', { hand: 'rh' });
const r0 = s2.feed(61); // C# wrong (expected C=60)
ok(!r0.correct, 'wrong note flagged');
ok(!r0.advanced, 'wrong note no advance');
eq(s2.pointer, 0, 'pointer stays at 0');
eq(s2.wrong, 1, 'wrong count 1');
// now play correct
const r1 = s2.feed(60);
ok(r1.correct, 'correct after wrong');
eq(s2.pointer, 1, 'pointer advances');
eq(s2.accuracy, 50, 'accuracy 50 after 1 wrong 1 right');

// ---- octave tolerance ----
const s3 = new ScaleFingeringSession('C', { hand: 'rh', tolerateOctave: true });
const r = s3.feed(72); // C5, octave of expected C4=60
ok(r.correct, 'octave-equivalent accepted');
// strict mode
const s4 = new ScaleFingeringSession('C', { hand: 'rh', tolerateOctave: false });
ok(!s4.feed(72).correct, 'octave rejected in strict mode');

// ---- bidirectional ----
const s5 = new ScaleFingeringSession('C', { hand: 'rh', bidirectional: true });
eq(s5.total, 15, 'bidirectional total 15 (8 up + 7 down)');
// expected notes up then down
const up = scaleNotes('C', 60);
const expectedSeq = up.concat(up.slice(0, -1).reverse());
eq(s5.notes, expectedSeq, 'bidirectional notes sequence');
// finger seq mirrors
const fUp = fingers('C', 'rh');
eq(s5.fingerSeq, fUp.concat(fUp.slice(0, -1).reverse()), 'bidirectional fingers');

// ---- lh session ----
const s6 = new ScaleFingeringSession('C', { hand: 'lh' });
eq(s6.currentFinger(), 5, 'lh first finger 5');

// ---- summary ----
const s7 = new ScaleFingeringSession('G', { hand: 'rh' });
scaleNotes('G', defaultRootMidi('G')).forEach((n) => s7.feed(n));
eq(s7.summary().id, 'G', 'summary id G');
eq(s7.summary().total, 8, 'summary total 8');
eq(s7.summary().accuracy, 100, 'summary accuracy 100');

console.log(`scale-fingering: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
