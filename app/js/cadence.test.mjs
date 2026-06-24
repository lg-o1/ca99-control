/**
 * cadence.test.mjs — 终止式辨认引擎单元测试
 */
import {
  CADENCES, HALF_APPROACHES, MAJOR_SCALE, NOTE_NAMES, ROMAN,
  cadenceInfo, romanOf, noteName, chordMidi, CadenceGame,
} from './cadence.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(NOTE_NAMES.length === 12, '12 note names');
ok(J(MAJOR_SCALE) === J([0, 2, 4, 5, 7, 9, 11]), 'major scale');
ok(J(ROMAN) === J(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']), 'roman numerals');
ok(CADENCES.length === 4, '4 cadences');
ok(J(CADENCES.map((c) => c.id)) === J(['authentic', 'plagal', 'half', 'deceptive']), 'cadence ids');
ok(CADENCES.every((c) => c.name && c.short && c.hint && Array.isArray(c.degrees)), 'each has name/short/hint/degrees');
ok(J(cadenceInfo('authentic').degrees) === J([5, 1]), 'authentic V-I');
ok(J(cadenceInfo('plagal').degrees) === J([4, 1]), 'plagal IV-I');
ok(J(cadenceInfo('deceptive').degrees) === J([5, 6]), 'deceptive V-vi');
ok(cadenceInfo('half').degrees[1] === 5, 'half ends on V');
ok(J(HALF_APPROACHES) === J([1, 2, 4]), 'half approaches I/ii/IV');
ok(cadenceInfo('nope') === null, 'invalid id -> null');

// ---- romanOf ----
ok(romanOf(1) === 'I', 'roman 1 = I');
ok(romanOf(5) === 'V', 'roman 5 = V');
ok(romanOf(6) === 'vi', 'roman 6 = vi');
ok(romanOf(0) === '?', 'roman 0 -> ?');
ok(romanOf(8) === '?', 'roman 8 -> ?');

// ---- noteName ----
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(21) === 'A0', '21 = A0');
ok(noteName(72) === 'C5', '72 = C5');

// ---- chordMidi: diatonic triads in C major ----
ok(J(chordMidi(60, 1)) === J([60, 64, 67]), 'I = C E G');
ok(J(chordMidi(60, 4)) === J([65, 69, 72]), 'IV = F A C');
ok(J(chordMidi(60, 5)) === J([67, 71, 74]), 'V = G B D');
ok(J(chordMidi(60, 6)) === J([69, 72, 76]), 'vi = A C E');
ok(J(chordMidi(60, 0)) === J([]), 'degree 0 -> empty');
ok(J(chordMidi(60, 8)) === J([]), 'degree 8 -> empty');
ok([1, 2, 3, 4, 5, 6, 7].every((d) => { const c = chordMidi(60, d); return c.length === 3 && c[0] < c[1] && c[1] < c[2]; }), 'all triads 3 ascending notes');

// ---- Game: deterministic next() (authentic) ----
{
  // cadences default 4; rng index 0 -> authentic; then tonic rng
  const g = new CadenceGame({ rng: seqRng([0, 0]) });
  const cur = g.next();
  ok(cur.cad.id === 'authentic', 'picked authentic (rng 0)');
  ok(J(cur.degrees) === J([5, 1]), 'degrees V-I');
  ok(g.chords().length === 2, '2 chords');
  ok(g.notes().length === 2, '2 note arrays');
  ok(g.answerId() === 'authentic', 'answerId authentic');
  ok(g.tonic() != null, 'tonic set');
  // chords correspond to degrees
  ok(J(g.chords().map((c) => c.degree)) === J([5, 1]), 'chord degrees V-I');
  ok(g.chords()[0].roman === 'V' && g.chords()[1].roman === 'I', 'romans V then I');
}

// ---- Game: plagal / deceptive selection ----
{
  const g = new CadenceGame({ rng: seqRng([0.3, 0]) }); // 0.3*4 = 1.2 -> index1 plagal
  g.next();
  ok(g.answerId() === 'plagal', 'rng 0.3 -> plagal');
  ok(J(g.current.degrees) === J([4, 1]), 'plagal degrees IV-I');
}
{
  const g = new CadenceGame({ rng: seqRng([0.8, 0]) }); // 0.8*4 = 3.2 -> index3 deceptive
  g.next();
  ok(g.answerId() === 'deceptive', 'rng 0.8 -> deceptive');
  ok(J(g.current.degrees) === J([5, 6]), 'deceptive degrees V-vi');
}

// ---- Game: half cadence approach varies, always ends on V ----
{
  // restrict to half; first rng picks cadence (only half), then approach, then tonic
  const g = new CadenceGame({ cadences: ['half'], rng: seqRng([0, 0, 0]) });
  g.next();
  ok(g.answerId() === 'half', 'half cadence');
  ok(g.current.degrees[1] === 5, 'ends on V');
  ok(HALF_APPROACHES.includes(g.current.degrees[0]), 'approach is I/ii/IV');
}
{
  // many half trials: always end on V, approach in set
  const g = new CadenceGame({ cadences: ['half'], rng: Math.random });
  for (let t = 0; t < 40; t++) {
    g.next();
    ok(g.current.degrees[1] === 5, `half trial ${t}: ends on V`);
    ok(HALF_APPROACHES.includes(g.current.degrees[0]), `half trial ${t}: valid approach`);
  }
}

// ---- Game: choices include correct + distinct ----
{
  const g = new CadenceGame({ choiceCount: 4, rng: Math.random });
  for (let t = 0; t < 40; t++) {
    g.next();
    const ids = g.choices().map((c) => c.id);
    ok(ids.includes(g.answerId()), `trial ${t}: correct in choices`);
    ok(new Set(ids).size === ids.length, `trial ${t}: distinct`);
    ok(ids.length === 4, `trial ${t}: 4 choices`);
    g.check(g.answerId());
  }
}

// ---- Game: choiceCount=3 ----
{
  const g = new CadenceGame({ choiceCount: 3, rng: Math.random });
  g.next();
  ok(g.choices().length === 3, '3 choices');
  ok(g.choices().some((c) => c.id === g.answerId()), 'correct among 3');
}

// ---- Game: scoring / streak / best ----
{
  const g = new CadenceGame({ rng: seqRng([0, 0]) }); // authentic
  g.next();
  ok(g.check('authentic') === true, 'correct');
  ok(g.score === 1 && g.streak === 1 && g.best === 1, 'score/streak/best after correct');
  g.next();
  ok(g.check('plagal') === false, 'wrong');
  ok(g.streak === 0 && g.best === 1, 'streak reset, best kept');
  ok(g.attempts === 2, '2 attempts');
}

// ---- Game: accuracy ----
{
  const g = new CadenceGame({ rng: seqRng([0, 0]) });
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next(); g.check(g.answerId()); // correct
  g.next(); g.check('___wrong___'); // wrong
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: onNew / onResult callbacks ----
{
  const g = new CadenceGame({ rng: seqRng([0, 0]) });
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (c) => { results++; lastCorrect = c; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.answerId());
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: restrict cadences ----
{
  const g = new CadenceGame({ cadences: ['authentic', 'plagal'], rng: Math.random });
  ok(g.cadences.length === 2, 'two cadences');
  for (let t = 0; t < 20; t++) {
    g.next();
    ok(['authentic', 'plagal'].includes(g.answerId()), `trial ${t}: only allowed cadences`);
  }
}
// single cadence allowed (drill one type)
{
  const g = new CadenceGame({ cadences: ['authentic'] });
  ok(g.cadences.length === 1, 'single cadence kept');
}
{
  const g = new CadenceGame({ cadences: ['nope'] });
  ok(g.cadences.length === 4, 'invalid -> all 4');
}

// ---- Game: choiceCount clamped ----
{
  const g = new CadenceGame({ choiceCount: 99 });
  ok(g.choiceCount === 4, 'choiceCount clamped to 4 (CADENCES.length)');
  const g2 = new CadenceGame({ choiceCount: 1 });
  ok(g2.choiceCount === 2, 'choiceCount min 2');
}

// ---- Game: tonic range + MIDI bound ----
{
  const g = new CadenceGame({ tonicMin: 60, tonicMax: 60, rng: seqRng([0, 0.5]) });
  g.next();
  ok(g.tonic() === 60, 'tonic pinned to 60');
}
{
  const g = new CadenceGame({ tonicMin: 100, tonicMax: 103, rng: seqRng([0, 0.99]) });
  g.next();
  const allNotes = g.notes().flat();
  ok(allNotes.every((n) => n <= 127), 'all notes within MIDI range');
}

// ---- Game: reset ----
{
  const g = new CadenceGame({ rng: seqRng([0, 0]) });
  g.next(); g.check(g.answerId());
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- before next ----
{
  const g = new CadenceGame();
  ok(g.check('authentic') === false, 'check with no current = false');
  ok(J(g.choices()) === J([]), 'choices empty before next');
  ok(J(g.chords()) === J([]), 'chords empty before next');
  ok(J(g.notes()) === J([]), 'notes empty before next');
  ok(g.tonic() === null, 'tonic null before next');
  ok(g.answerId() === null, 'answerId null before next');
}

console.log(`cadence: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
