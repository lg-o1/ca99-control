/**
 * mode-id.test.mjs — 调式识别引擎单元测试
 */
import {
  MODES, NOTE_NAMES,
  modeById, modeName, noteName, scaleMidi, stepPattern, ModeIdGame,
} from './mode-id.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(MODES.length === 7, '7 church modes');
ok(NOTE_NAMES.length === 12, '12 note names');
ok(MODES.map((m) => m.id).join(',') === 'ionian,dorian,phrygian,lydian,mixolydian,aeolian,locrian', 'mode order');
ok(MODES.every((m) => m.offsets.length === 7), 'each mode has 7 offsets');
ok(MODES.every((m) => m.offsets[0] === 0), 'each mode starts on 0');
// degrees 0..6
ok(MODES.map((m) => m.degree).join('') === '0123456', 'degrees 0..6');

// ---- mode offsets correctness (relative to major) ----
ok(J(modeById('ionian').offsets) === J([0, 2, 4, 5, 7, 9, 11]), 'ionian = major');
ok(J(modeById('dorian').offsets) === J([0, 2, 3, 5, 7, 9, 10]), 'dorian b3 b7');
ok(J(modeById('phrygian').offsets) === J([0, 1, 3, 5, 7, 8, 10]), 'phrygian b2 b3 b6 b7');
ok(J(modeById('lydian').offsets) === J([0, 2, 4, 6, 7, 9, 11]), 'lydian #4');
ok(J(modeById('mixolydian').offsets) === J([0, 2, 4, 5, 7, 9, 10]), 'mixolydian b7');
ok(J(modeById('aeolian').offsets) === J([0, 2, 3, 5, 7, 8, 10]), 'aeolian = natural minor');
ok(J(modeById('locrian').offsets) === J([0, 1, 3, 5, 6, 8, 10]), 'locrian b2 b3 b5 b6 b7');

// ---- white-key relationship: each mode from its degree gives all white keys ----
{
  // Dorian from D (62) should be all white keys D E F G A B C D
  const dor = scaleMidi(62, 'dorian');
  ok(J(dor) === J([62, 64, 65, 67, 69, 71, 72, 74]), 'D dorian = white keys');
  // Phrygian from E (64)
  const phr = scaleMidi(64, 'phrygian');
  ok(J(phr) === J([64, 65, 67, 69, 71, 72, 74, 76]), 'E phrygian = white keys');
  // Lydian from F (65)
  const lyd = scaleMidi(65, 'lydian');
  ok(J(lyd) === J([65, 67, 69, 71, 72, 74, 76, 77]), 'F lydian = white keys');
}

// ---- modeById / modeName ----
ok(modeById('dorian').name === '多利亚', 'dorian name');
ok(modeById('zzz') === null, 'unknown id -> null');
ok(modeName('lydian') === '利底亚', 'lydian name');
ok(modeName('nope') === '?', 'unknown name -> ?');

// ---- noteName ----
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(62) === 'D4', '62 = D4');

// ---- scaleMidi: 8 notes incl octave, ascending ----
{
  const sc = scaleMidi(60, 'ionian');
  ok(sc.length === 8, 'C ionian has 8 notes (incl octave)');
  ok(J(sc) === J([60, 62, 64, 65, 67, 69, 71, 72]), 'C major scale');
  ok(sc.every((n, i) => i === 0 || n > sc[i - 1]), 'ascending');
  ok(scaleMidi(60, 'badmode').length === 0, 'bad mode -> empty');
}

// ---- stepPattern: the fingerprint ----
{
  ok(J(stepPattern('ionian')) === J([2, 2, 1, 2, 2, 2, 1]), 'ionian WWHWWWH');
  ok(J(stepPattern('aeolian')) === J([2, 1, 2, 2, 1, 2, 2]), 'aeolian WHWWHWW');
  ok(J(stepPattern('dorian')) === J([2, 1, 2, 2, 2, 1, 2]), 'dorian palindrome WHWWWHW');
  // dorian step pattern is a palindrome
  const d = stepPattern('dorian');
  ok(J(d) === J(d.slice().reverse()), 'dorian step pattern is palindrome');
}

// ---- Game: deterministic next() ----
{
  // modes default 7; pick dorian (index1) => 1/7+eps; root pick
  const g = new ModeIdGame({ rng: seqRng([1 / 7 + 0.001, 0, 0, 0, 0, 0]) });
  const notes = g.next();
  ok(g.current.mode.id === 'dorian', 'picked dorian');
  ok(notes.length === 8, '8 notes played');
  ok(J(notes) === J(g.notes()), 'notes() matches');
  ok(g.current.choices.length === 4, 'default 4 choices');
  ok(g.choices().some((c) => c.id === 'dorian'), 'correct answer in choices');
}

// ---- Game: choices contain correct + are distinct ----
{
  const g = new ModeIdGame({ rng: Math.random });
  for (let t = 0; t < 30; t++) {
    g.next();
    const ids = g.choices().map((c) => c.id);
    ok(ids.includes(g.current.mode.id), `trial ${t}: correct in choices`);
    ok(new Set(ids).size === ids.length, `trial ${t}: choices distinct`);
    ok(ids.length === 4, `trial ${t}: 4 choices`);
  }
}

// ---- Game: check correct/incorrect, streak, best ----
{
  const g = new ModeIdGame({ rng: seqRng([0, 0, 0, 0, 0, 0]) }); // ionian
  g.next();
  ok(g.current.mode.id === 'ionian', 'ionian');
  ok(g.check('ionian') === true, 'correct answer');
  ok(g.score === 1 && g.streak === 1 && g.best === 1, 'score/streak/best after correct');
  g.next();
  ok(g.check('locrian') === false || g.current.mode.id === 'locrian', 'wrong answer (unless coincidentally locrian)');
  ok(g.attempts === 2, 'attempts counted');
}

// ---- Game: accuracy ----
{
  const g = new ModeIdGame({ rng: seqRng([0, 0]) });
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next(); g.check(g.current.mode.id); // correct
  g.next(); g.check('___wrong___'); // wrong (id never matches)
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: callbacks ----
{
  const g = new ModeIdGame({ rng: seqRng([0, 0]) });
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (correct) => { results++; lastCorrect = correct; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.current.mode.id);
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: restrict modes ----
{
  const g = new ModeIdGame({ modes: ['dorian', 'lydian'], choiceCount: 2, rng: seqRng([0, 0]) });
  ok(g.modes.length === 2, 'two modes');
  g.next();
  ok(['dorian', 'lydian'].includes(g.current.mode.id), 'restricted mode used');
  ok(g.choices().length === 2, '2 choices');
}
// invalid mode falls back to all
{
  const g = new ModeIdGame({ modes: ['xyz'] });
  ok(g.modes.length === 7, 'invalid mode -> all');
}

// ---- Game: choiceCount clamped ----
{
  const g = new ModeIdGame({ choiceCount: 99 });
  ok(g.choiceCount === 7, 'choiceCount clamped to 7');
  const g2 = new ModeIdGame({ choiceCount: 1 });
  ok(g2.choiceCount === 2, 'choiceCount min 2');
}

// ---- Game: root range respected, no note exceeds 127 ----
{
  const g = new ModeIdGame({ rootMin: 60, rootMax: 60, rng: seqRng([0, 0]) });
  g.next();
  ok(g.current.root === 60, 'root pinned to 60');
}
{
  const g = new ModeIdGame({ rootMin: 120, rootMax: 127, rng: seqRng([0, 0.99]) });
  g.next();
  ok(g.notes().every((n) => n <= 127), 'all notes within MIDI range');
}

// ---- Game: reset ----
{
  const g = new ModeIdGame({ rng: seqRng([0, 0]) });
  g.next(); g.check(g.current.mode.id);
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- check before next returns false ----
{
  const g = new ModeIdGame();
  ok(g.check('ionian') === false, 'check with no current = false');
  ok(J(g.notes()) === J([]), 'notes empty before next');
  ok(J(g.choices()) === J([]), 'choices empty before next');
}

console.log(`mode-id: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
