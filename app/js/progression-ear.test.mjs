/**
 * progression-ear.test.mjs — 和声进行听辨引擎单元测试
 */
import {
  DEGREES, PROGRESSIONS, MAJOR_SCALE, NOTE_NAMES,
  degreeInfo, romanOf, noteName, chordMidi, ProgressionEarGame,
} from './progression-ear.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(NOTE_NAMES.length === 12, '12 note names');
ok(J(MAJOR_SCALE) === J([0, 2, 4, 5, 7, 9, 11]), 'major scale');
ok(DEGREES.length === 7, '7 degrees');
ok(DEGREES.map((d) => d.degree).join('') === '1234567', 'degrees 1..7');
ok(DEGREES.map((d) => d.roman).join(',') === 'I,ii,iii,IV,V,vi,vii°', 'roman numerals');
ok(DEGREES.every((d) => d.name && d.hint && d.quality), 'each has name/hint/quality');
// diatonic qualities: I IV V major; ii iii vi minor; vii dim
ok(degreeInfo(1).quality === 'major' && degreeInfo(4).quality === 'major' && degreeInfo(5).quality === 'major', 'I/IV/V major');
ok(degreeInfo(2).quality === 'minor' && degreeInfo(3).quality === 'minor' && degreeInfo(6).quality === 'minor', 'ii/iii/vi minor');
ok(degreeInfo(7).quality === 'dim', 'vii° dim');
ok(PROGRESSIONS.length === 8, '8 progressions');
ok(PROGRESSIONS.every((p) => p.degrees.length >= 2 && p.degrees.every((d) => d >= 1 && d <= 7)), 'progressions valid degrees');
ok(PROGRESSIONS.every((p) => p.degrees[0] === 1), 'each progression starts on I');

// ---- degreeInfo / romanOf ----
ok(degreeInfo(5).roman === 'V', 'degree 5 = V');
ok(degreeInfo(0) === null, 'degree 0 -> null');
ok(degreeInfo(8) === null, 'degree 8 -> null');
ok(romanOf(6) === 'vi', 'roman 6 = vi');
ok(romanOf(9) === '?', 'roman 9 -> ?');

// ---- noteName ----
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(72) === 'C5', '72 = C5');

// ---- chordMidi: diatonic triads in C major ----
ok(J(chordMidi(60, 1)) === J([60, 64, 67]), 'I = C E G');
ok(J(chordMidi(60, 2)) === J([62, 65, 69]), 'ii = D F A');
ok(J(chordMidi(60, 3)) === J([64, 67, 71]), 'iii = E G B');
ok(J(chordMidi(60, 4)) === J([65, 69, 72]), 'IV = F A C');
ok(J(chordMidi(60, 5)) === J([67, 71, 74]), 'V = G B D');
ok(J(chordMidi(60, 6)) === J([69, 72, 76]), 'vi = A C E');
ok(J(chordMidi(60, 7)) === J([71, 74, 77]), 'vii° = B D F');
ok(J(chordMidi(60, 0)) === J([]), 'degree 0 -> empty');
ok(J(chordMidi(60, 8)) === J([]), 'degree 8 -> empty');
// triads ascending + 3 notes
ok([1, 2, 3, 4, 5, 6, 7].every((d) => { const c = chordMidi(60, d); return c.length === 3 && c[0] < c[1] && c[1] < c[2]; }), 'all triads 3 ascending notes');
// quality check via interval: I major (4,3), ii minor (3,4), vii dim (3,3)
{
  const I = chordMidi(60, 1); ok(I[1] - I[0] === 4 && I[2] - I[1] === 3, 'I intervals major');
  const ii = chordMidi(60, 2); ok(ii[1] - ii[0] === 3 && ii[2] - ii[1] === 4, 'ii intervals minor');
  const vii = chordMidi(60, 7); ok(vii[1] - vii[0] === 3 && vii[2] - vii[1] === 3, 'vii intervals dim');
}

// ---- Game: deterministic next() ----
{
  // progressions default 8; rng index 0 -> first (pop I-V-vi-IV); then tonic rng
  const g = new ProgressionEarGame({ rng: seqRng([0, 0, 0, 0, 0, 0, 0, 0]) });
  const cur = g.next();
  ok(cur.prog.id === 'pop', 'picked pop progression');
  ok(J(cur.chords.map((c) => c.degree)) === J([1, 5, 6, 4]), 'chords degrees');
  ok(g.index() === 1, 'index starts at 1 (anchor at 0)');
  ok(g.currentChord().degree === 5, 'current chord is V (index 1)');
  ok(g.chords().length === 4, '4 chords');
  ok(g.progressionNotes().length === 4, '4 note arrays');
  ok(J(g.progressionNotes()[0]) === J(g.chords()[0].notes), 'progressionNotes matches');
  ok(!g.isComplete(), 'not complete at start');
}

// ---- Game: choices include correct + distinct ----
{
  const g = new ProgressionEarGame({ choiceCount: 5, rng: Math.random });
  for (let t = 0; t < 30; t++) {
    g.next();
    while (!g.isComplete()) {
      const ds = g.choices().map((c) => c.degree);
      ok(ds.includes(g.currentChord().degree), `trial ${t}: correct in choices`);
      ok(new Set(ds).size === ds.length, `trial ${t}: distinct`);
      ok(ds.length === 5, `trial ${t}: 5 choices`);
      g.check(g.currentChord().degree);
    }
  }
}

// ---- Game: per-chord scoring, advance, complete ----
{
  const g = new ProgressionEarGame({ progressions: ['pop'], rng: seqRng([0, 0]) });
  g.next(); // pop = [1,5,6,4], index 1 (V)
  ok(g.currentChord().degree === 5, 'chord 1 = V');
  ok(g.check(5) === true, 'V correct');
  ok(g.score === 1 && g.streak === 1, 'score after V');
  ok(g.index() === 2, 'advanced to index 2');
  ok(g.currentChord().degree === 6, 'chord 2 = vi');
  ok(g.check(2) === false, 'wrong (said ii)');
  ok(g.streak === 0 && g.best === 1, 'streak reset, best kept');
  ok(g.index() === 3, 'advanced to index 3');
  ok(g.currentChord().degree === 4, 'chord 3 = IV');
  ok(g.check(4) === true, 'IV correct');
  ok(g.isComplete(), 'complete after last chord');
  ok(g.currentChord() === null, 'no current chord when complete');
  ok(g.attempts === 3, '3 attempts (chords 1..3, anchor not counted)');
}

// ---- Game: onComplete callback ----
{
  const g = new ProgressionEarGame({ progressions: ['rock'], rng: seqRng([0, 0]) }); // [1,4,5]
  let completed = 0;
  g.onComplete = () => { completed++; };
  g.next();
  g.check(g.currentChord().degree); // chord 1 (IV)
  ok(completed === 0, 'not complete after chord 1');
  g.check(g.currentChord().degree); // chord 2 (V) -> complete
  ok(completed === 1, 'onComplete fired');
  ok(g.isComplete(), 'is complete');
}

// ---- Game: callbacks onNew/onResult ----
{
  const g = new ProgressionEarGame({ progressions: ['plagal'], rng: seqRng([0, 0]) }); // [1,4,1]
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (c) => { results++; lastCorrect = c; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.currentChord().degree);
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: accuracy ----
{
  const g = new ProgressionEarGame({ progressions: ['plagal'], rng: seqRng([0, 0]) }); // [1,4,1]
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next();
  g.check(g.currentChord().degree); // correct
  g.check(-1); // wrong
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: restrict progressions ----
{
  const g = new ProgressionEarGame({ progressions: ['twofive'], rng: seqRng([0, 0]) });
  ok(g.progressions.length === 1, 'one progression');
  g.next();
  ok(g.current.prog.id === 'twofive', 'used twofive');
  ok(J(g.chords().map((c) => c.degree)) === J([1, 2, 5, 1]), 'ii-V-I degrees');
}
// invalid progression -> all
{
  const g = new ProgressionEarGame({ progressions: ['nope'] });
  ok(g.progressions.length === 8, 'invalid -> all');
}

// ---- Game: choiceCount clamped ----
{
  const g = new ProgressionEarGame({ choiceCount: 99 });
  ok(g.choiceCount === 7, 'choiceCount clamped to 7');
  const g2 = new ProgressionEarGame({ choiceCount: 1 });
  ok(g2.choiceCount === 2, 'choiceCount min 2');
}

// ---- Game: tonic range + MIDI bound ----
{
  const g = new ProgressionEarGame({ tonicMin: 60, tonicMax: 60, rng: seqRng([0, 0.5]) });
  g.next();
  ok(g.tonic() === 60, 'tonic pinned to 60');
}
{
  const g = new ProgressionEarGame({ tonicMin: 100, tonicMax: 103, rng: seqRng([0, 0.99]) });
  g.next();
  const allNotes = g.progressionNotes().flat();
  ok(allNotes.every((n) => n <= 127), 'all notes within MIDI range');
}

// ---- Game: reset ----
{
  const g = new ProgressionEarGame({ rng: seqRng([0, 0]) });
  g.next(); g.check(g.currentChord().degree);
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- before next ----
{
  const g = new ProgressionEarGame();
  ok(g.check(1) === false, 'check with no current = false');
  ok(J(g.choices()) === J([]), 'choices empty before next');
  ok(J(g.chords()) === J([]), 'chords empty before next');
  ok(J(g.progressionNotes()) === J([]), 'progressionNotes empty before next');
  ok(g.currentChord() === null, 'currentChord null before next');
  ok(g.index() === -1, 'index -1 before next');
  ok(g.isComplete() === false, 'not complete before next');
}

console.log(`progression-ear: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
