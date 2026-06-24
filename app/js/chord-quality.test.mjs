/**
 * chord-quality.test.mjs — 和弦性质听辨引擎单元测试
 */
import {
  QUALITIES, DEFAULT_QUALITIES, NOTE_NAMES,
  qualityById, qualityName, noteName, chordMidi, ChordQualityGame,
} from './chord-quality.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(NOTE_NAMES.length === 12, '12 note names');
ok(QUALITIES.length === 9, '9 qualities');
ok(QUALITIES.map((q) => q.id).join(',') === 'major,minor,augmented,diminished,dom7,maj7,min7,m7b5,dim7', 'quality order');
ok(QUALITIES.every((q) => q.intervals[0] === 0), 'each starts on root 0');
ok(QUALITIES.every((q) => q.hint && q.name && q.family), 'each has hint/name/family');
ok(QUALITIES.filter((q) => q.family === 'triad').length === 4, '4 triads');
ok(QUALITIES.filter((q) => q.family === 'seventh').length === 5, '5 sevenths');
ok(QUALITIES.filter((q) => q.family === 'triad').every((q) => q.intervals.length === 3), 'triads have 3 notes');
ok(QUALITIES.filter((q) => q.family === 'seventh').every((q) => q.intervals.length === 4), 'sevenths have 4 notes');
ok(J(DEFAULT_QUALITIES) === J(['major', 'minor', 'augmented', 'diminished']), 'default = 4 triads');

// ---- interval correctness ----
ok(J(qualityById('major').intervals) === J([0, 4, 7]), 'major 0,4,7');
ok(J(qualityById('minor').intervals) === J([0, 3, 7]), 'minor 0,3,7');
ok(J(qualityById('augmented').intervals) === J([0, 4, 8]), 'aug 0,4,8');
ok(J(qualityById('diminished').intervals) === J([0, 3, 6]), 'dim 0,3,6');
ok(J(qualityById('dom7').intervals) === J([0, 4, 7, 10]), 'dom7 0,4,7,10');
ok(J(qualityById('maj7').intervals) === J([0, 4, 7, 11]), 'maj7 0,4,7,11');
ok(J(qualityById('min7').intervals) === J([0, 3, 7, 10]), 'min7 0,3,7,10');
ok(J(qualityById('m7b5').intervals) === J([0, 3, 6, 10]), 'm7b5 0,3,6,10');
ok(J(qualityById('dim7').intervals) === J([0, 3, 6, 9]), 'dim7 0,3,6,9');
// dim7 is fully symmetric (stack of minor thirds)
{
  const d = qualityById('dim7').intervals;
  ok(d[1] - d[0] === 3 && d[2] - d[1] === 3 && d[3] - d[2] === 3, 'dim7 = stacked minor 3rds');
}
// augmented symmetric (stack of major thirds)
{
  const a = qualityById('augmented').intervals;
  ok(a[1] - a[0] === 4 && a[2] - a[1] === 4, 'aug = stacked major 3rds');
}

// ---- qualityById / qualityName ----
ok(qualityById('zzz') === null, 'unknown id -> null');
ok(qualityName('dom7') === '属七和弦', 'dom7 name');
ok(qualityName('nope') === '?', 'unknown name -> ?');

// ---- noteName ----
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(67) === 'G4', '67 = G4');

// ---- chordMidi ----
ok(J(chordMidi(60, 'major')) === J([60, 64, 67]), 'C major = C E G');
ok(J(chordMidi(60, 'minor')) === J([60, 63, 67]), 'C minor = C Eb G');
ok(J(chordMidi(60, 'dom7')) === J([60, 64, 67, 70]), 'C7 = C E G Bb');
ok(J(chordMidi(60, 'maj7')) === J([60, 64, 67, 71]), 'Cmaj7 = C E G B');
ok(J(chordMidi(60, 'dim7')) === J([60, 63, 66, 69]), 'Cdim7 = C Eb Gb A');
ok(J(chordMidi(60, 'bad')) === J([]), 'bad quality -> empty');
// ascending
ok(chordMidi(60, 'maj7').every((n, i) => i === 0 || n > chordMidi(60, 'maj7')[i - 1]), 'ascending');

// ---- Game: deterministic next() ----
{
  // default qualities [major,minor,aug,dim]; rng index 0 -> major; then root rng
  const g = new ChordQualityGame({ rng: seqRng([0, 0, 0, 0, 0, 0]) });
  const notes = g.next();
  ok(g.current.quality.id === 'major', 'picked major');
  ok(notes.length === 3, '3 notes for triad');
  ok(J(notes) === J(g.notes()), 'notes() matches');
  ok(g.current.choices.length === 4, 'default 4 choices');
  ok(g.choices().some((c) => c.id === 'major'), 'correct answer in choices');
  ok(g.root() === g.current.root, 'root() accessor');
}

// ---- Game: choices distinct + contain correct ----
{
  const g = new ChordQualityGame({ qualities: QUALITIES.map((q) => q.id), choiceCount: 5, rng: Math.random });
  for (let t = 0; t < 40; t++) {
    g.next();
    const ids = g.choices().map((c) => c.id);
    ok(ids.includes(g.current.quality.id), `trial ${t}: correct in choices`);
    ok(new Set(ids).size === ids.length, `trial ${t}: distinct`);
    ok(ids.length === 5, `trial ${t}: 5 choices`);
  }
}

// ---- Game: check correct/incorrect, streak, best ----
{
  const g = new ChordQualityGame({ rng: seqRng([0, 0, 0, 0]) }); // major
  g.next();
  ok(g.current.quality.id === 'major', 'major');
  ok(g.check('major') === true, 'correct');
  ok(g.score === 1 && g.streak === 1 && g.best === 1, 'score/streak/best');
  g.next();
  ok(g.check('___no___') === false, 'wrong');
  ok(g.streak === 0 && g.best === 1, 'streak reset, best kept');
  ok(g.attempts === 2, 'attempts = 2');
}

// ---- Game: accuracy ----
{
  const g = new ChordQualityGame({ rng: seqRng([0, 0]) });
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next(); g.check(g.current.quality.id);
  g.next(); g.check('___wrong___');
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: callbacks ----
{
  const g = new ChordQualityGame({ rng: seqRng([0, 0]) });
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (c) => { results++; lastCorrect = c; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.current.quality.id);
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: restrict qualities ----
{
  const g = new ChordQualityGame({ qualities: ['dom7', 'maj7'], choiceCount: 2, rng: seqRng([0, 0]) });
  ok(g.qualities.length === 2, 'two qualities');
  g.next();
  ok(['dom7', 'maj7'].includes(g.current.quality.id), 'restricted quality used');
  ok(g.choices().length === 2, '2 choices');
  ok(g.choices().every((c) => ['dom7', 'maj7'].includes(c.id)), 'choices from restricted set');
}
// invalid qualities fall back to defaults
{
  const g = new ChordQualityGame({ qualities: ['xyz'] });
  ok(g.qualities.length === 4, 'invalid -> default 4 triads');
  ok(g.qualities.every((q) => DEFAULT_QUALITIES.includes(q.id)), 'fallback are triads');
}

// ---- Game: choiceCount clamped ----
{
  const g = new ChordQualityGame({ qualities: ['major', 'minor'], choiceCount: 99 });
  ok(g.choiceCount === 2, 'choiceCount clamped to available');
  const g2 = new ChordQualityGame({ choiceCount: 1 });
  ok(g2.choiceCount === 2, 'choiceCount min 2');
  const g3 = new ChordQualityGame({ qualities: QUALITIES.map((q) => q.id), choiceCount: 99 });
  ok(g3.choiceCount === 9, 'choiceCount clamped to 9 (all)');
}

// ---- Game: root range + MIDI bound ----
{
  const g = new ChordQualityGame({ rootMin: 60, rootMax: 60, rng: seqRng([0, 0.5]) });
  g.next();
  ok(g.current.root === 60, 'root pinned to 60');
}
{
  const g = new ChordQualityGame({ qualities: ['maj7'], rootMin: 120, rootMax: 127, rng: seqRng([0, 0.99]) });
  g.next();
  ok(g.notes().every((n) => n <= 127), 'all notes within MIDI range');
}

// ---- Game: reset ----
{
  const g = new ChordQualityGame({ rng: seqRng([0, 0]) });
  g.next(); g.check(g.current.quality.id);
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- check/notes/choices before next ----
{
  const g = new ChordQualityGame();
  ok(g.check('major') === false, 'check with no current = false');
  ok(J(g.notes()) === J([]), 'notes empty before next');
  ok(J(g.choices()) === J([]), 'choices empty before next');
  ok(g.root() === null, 'root null before next');
}

console.log(`chord-quality: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
