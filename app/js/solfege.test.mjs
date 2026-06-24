/**
 * solfege.test.mjs — 唱名/音级听辨引擎单元测试
 */
import {
  SCALES, DEGREES, NOTE_NAMES,
  degreeInfo, syllable, noteName, degreeMidi, tonicTriad, SolfegeGame,
} from './solfege.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(NOTE_NAMES.length === 12, '12 note names');
ok(DEGREES.length === 7, '7 degrees');
ok(DEGREES.map((d) => d.degree).join('') === '1234567', 'degrees 1..7');
ok(DEGREES.every((d) => d.fn && d.hint), 'each degree has fn + hint');
ok(SCALES.major.steps.length === 7 && SCALES.minor.steps.length === 7, 'both scales 7 steps');
ok(J(SCALES.major.steps) === J([0, 2, 4, 5, 7, 9, 11]), 'major steps');
ok(J(SCALES.minor.steps) === J([0, 2, 3, 5, 7, 8, 10]), 'natural minor steps');
ok(SCALES.major.third === 4 && SCALES.minor.third === 3, 'major/minor third');
ok(J(SCALES.major.syllables) === J(['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']), 'major syllables');
ok(J(SCALES.minor.syllables) === J(['Do', 'Re', 'Me', 'Fa', 'Sol', 'Le', 'Te']), 'minor syllables (Me/Le/Te)');

// ---- degreeInfo ----
ok(degreeInfo(1).fn === '主音', 'degree 1 = 主音');
ok(degreeInfo(5).fn === '属音', 'degree 5 = 属音');
ok(degreeInfo(7).fn === '导音', 'degree 7 = 导音');
ok(degreeInfo(0) === null, 'degree 0 -> null');
ok(degreeInfo(8) === null, 'degree 8 -> null');

// ---- syllable ----
ok(syllable(1, 'major') === 'Do', '1 major = Do');
ok(syllable(3, 'major') === 'Mi', '3 major = Mi');
ok(syllable(3, 'minor') === 'Me', '3 minor = Me');
ok(syllable(7, 'minor') === 'Te', '7 minor = Te');
ok(syllable(7, 'major') === 'Ti', '7 major = Ti');
ok(syllable(0, 'major') === '?', 'out of range -> ?');
ok(syllable(3, 'bogus') === 'Mi', 'bad scale falls back to major');

// ---- noteName ----
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(69) === 'A4', '69 = A4');

// ---- degreeMidi ----
ok(degreeMidi(60, 1, 'major') === 60, 'C major degree 1 = C4');
ok(degreeMidi(60, 3, 'major') === 64, 'C major degree 3 = E4');
ok(degreeMidi(60, 5, 'major') === 67, 'C major degree 5 = G4');
ok(degreeMidi(60, 3, 'minor') === 63, 'C minor degree 3 = Eb4 (63)');
ok(degreeMidi(60, 7, 'minor') === 70, 'C minor degree 7 = Bb4 (70)');
ok(degreeMidi(60, 8, 'major') === null, 'degree 8 -> null');
ok(degreeMidi(60, 0, 'major') === null, 'degree 0 -> null');
// A minor natural = all white keys
{
  const aMin = [1, 2, 3, 4, 5, 6, 7].map((d) => degreeMidi(57, d, 'minor'));
  ok(J(aMin) === J([57, 59, 60, 62, 64, 65, 67]), 'A natural minor = white keys');
}

// ---- tonicTriad ----
ok(J(tonicTriad(60, 'major')) === J([60, 64, 67]), 'C major triad');
ok(J(tonicTriad(60, 'minor')) === J([60, 63, 67]), 'C minor triad');
ok(J(tonicTriad(57, 'minor')) === J([57, 60, 64]), 'A minor triad');

// ---- Game: deterministic next() ----
{
  // degrees default [1..7]; first rng picks index -> degree, then tonic rng
  const g = new SolfegeGame({ rng: seqRng([0, 0, 0, 0, 0, 0]) });
  const q = g.next();
  ok(q.degree === 1, 'picked degree 1 (index 0)');
  ok(q.scaleType === 'major', 'default major');
  ok(q.target === degreeMidi(q.tonic, q.degree, 'major'), 'target matches');
  ok(J(q.triad) === J(tonicTriad(q.tonic, 'major')), 'triad matches');
  ok(q.choices.length === 4, 'default 4 choices');
  ok(q.choices.some((c) => c.degree === 1), 'correct degree in choices');
  ok(q.choices.every((c) => c.syllable && c.fn), 'choices have syllable + fn');
}

// ---- Game accessors ----
{
  const g = new SolfegeGame({ rng: seqRng([0, 0]) });
  ok(g.target() === null, 'target null before next');
  ok(J(g.triad()) === J([]), 'triad empty before next');
  ok(g.tonic() === null, 'tonic null before next');
  ok(J(g.choices()) === J([]), 'choices empty before next');
  g.next();
  ok(g.target() !== null, 'target set after next');
  ok(g.triad().length === 3, 'triad has 3 notes');
  ok(g.tonic() !== null, 'tonic set');
}

// ---- Game: choices distinct, contain correct, correct count ----
{
  const g = new SolfegeGame({ rng: Math.random });
  for (let t = 0; t < 40; t++) {
    g.next();
    const ds = g.choices().map((c) => c.degree);
    ok(ds.includes(g.current.degree), `trial ${t}: correct in choices`);
    ok(new Set(ds).size === ds.length, `trial ${t}: distinct`);
    ok(ds.length === 4, `trial ${t}: 4 choices`);
  }
}

// ---- Game: check correct/incorrect, streak, best ----
{
  const g = new SolfegeGame({ rng: seqRng([0, 0, 0, 0]) }); // degree 1
  g.next();
  ok(g.current.degree === 1, 'degree 1');
  ok(g.check(1) === true, 'correct');
  ok(g.score === 1 && g.streak === 1 && g.best === 1, 'score/streak/best after correct');
  g.next();
  ok(g.check(999) === false, 'wrong (999 never a degree)');
  ok(g.streak === 0 && g.best === 1, 'streak reset, best kept');
  ok(g.attempts === 2, 'attempts = 2');
}

// ---- Game: accuracy ----
{
  const g = new SolfegeGame({ rng: seqRng([0, 0]) });
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next(); g.check(g.current.degree);
  g.next(); g.check(-1);
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: callbacks ----
{
  const g = new SolfegeGame({ rng: seqRng([0, 0]) });
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (c) => { results++; lastCorrect = c; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.current.degree);
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: minor scaleType ----
{
  const g = new SolfegeGame({ scaleType: 'minor', rng: seqRng([0, 0]) });
  g.next();
  ok(g.scaleType === 'minor', 'minor game');
  ok(g.current.target === degreeMidi(g.current.tonic, g.current.degree, 'minor'), 'minor target');
  ok(g.choices().some((c) => c.syllable === 'Me' || c.syllable === 'Do'), 'minor syllables used');
}
// invalid scaleType falls back to major
{
  const g = new SolfegeGame({ scaleType: 'xyz' });
  ok(g.scaleType === 'major', 'invalid scale -> major');
}

// ---- Game: restrict degrees ----
{
  const g = new SolfegeGame({ degrees: [1, 3, 5], choiceCount: 3, rng: seqRng([0, 0]) });
  ok(J(g.degrees) === J([1, 3, 5]), 'restricted degrees');
  g.next();
  ok([1, 3, 5].includes(g.current.degree), 'only restricted degrees appear');
  ok(g.choices().every((c) => [1, 3, 5].includes(c.degree)), 'choices only from restricted set');
  ok(g.choices().length === 3, '3 choices');
}
// dedupe + sort degrees
{
  const g = new SolfegeGame({ degrees: [5, 1, 5, 3] });
  ok(J(g.degrees) === J([1, 3, 5]), 'degrees deduped + sorted');
}
// out-of-range degrees filtered, empty -> all
{
  const g = new SolfegeGame({ degrees: [0, 8, 9] });
  ok(J(g.degrees) === J([1, 2, 3, 4, 5, 6, 7]), 'invalid degrees -> all');
}

// ---- Game: choiceCount clamped ----
{
  const g = new SolfegeGame({ degrees: [1, 2, 3], choiceCount: 99 });
  ok(g.choiceCount === 3, 'choiceCount clamped to available degrees');
  const g2 = new SolfegeGame({ choiceCount: 1 });
  ok(g2.choiceCount === 2, 'choiceCount min 2');
}

// ---- Game: tonic range + MIDI bound ----
{
  const g = new SolfegeGame({ tonicMin: 60, tonicMax: 60, rng: seqRng([0.5, 0]) });
  g.next();
  ok(g.current.tonic === 60, 'tonic pinned to 60');
}
{
  const g = new SolfegeGame({ tonicMin: 120, tonicMax: 127, rng: seqRng([0.99, 0.99]) });
  g.next();
  ok(g.current.target <= 127, 'target within MIDI range');
  ok(g.current.triad.every((n) => n <= 127), 'triad within MIDI range');
}

// ---- Game: reset ----
{
  const g = new SolfegeGame({ rng: seqRng([0, 0]) });
  g.next(); g.check(g.current.degree);
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- check before next ----
{
  const g = new SolfegeGame();
  ok(g.check(1) === false, 'check with no current = false');
}

console.log(`solfege: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
