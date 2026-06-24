/**
 * interval-build.test.mjs — 音程构建引擎单元测试
 */
import {
  INTERVALS, DIRECTIONS, NOTE_NAMES,
  intervalBySemitones, intervalById, noteName, targetMidi, IntervalBuildGame,
} from './interval-build.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(INTERVALS.length === 12, '12 intervals m2..P8');
ok(NOTE_NAMES.length === 12, '12 note names');
ok(INTERVALS[0].semitones === 1 && INTERVALS[0].id === 'm2', 'first = m2/1');
ok(INTERVALS[11].semitones === 12 && INTERVALS[11].id === 'P8', 'last = P8/12');
ok(INTERVALS.every((iv, i) => i === 0 || iv.semitones === INTERVALS[i - 1].semitones + 1), 'semitones increment by 1');
ok(DIRECTIONS.length === 2 && DIRECTIONS[0].sign === 1 && DIRECTIONS[1].sign === -1, 'up=+1 down=-1');

// ---- intervalBySemitones / intervalById ----
ok(intervalBySemitones(7).id === 'P5', 'st7 = P5');
ok(intervalBySemitones(6).id === 'TT', 'st6 = TT');
ok(intervalBySemitones(99) === null, 'unknown semitones -> null');
ok(intervalById('M3').semitones === 4, 'M3 = 4');
ok(intervalById('zzz') === null, 'unknown id -> null');

// ---- noteName ----
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(69) === 'A4', '69 = A4');
ok(noteName(61) === 'C#4', '61 = C#4');
ok(noteName(48) === 'C3', '48 = C3');

// ---- targetMidi ----
ok(targetMidi(60, 7, 1) === 67, 'C4 up P5 = G4');
ok(targetMidi(60, 7, -1) === 53, 'C4 down P5 = F3');
ok(targetMidi(60, 12, 1) === 72, 'C4 up octave = C5');

// ---- Game: deterministic next() (up only default) ----
{
  // rng order in next(): interval pick, direction pick, root pick
  // intervals len12; pick idx for P5 (id index 6) => 6/12=0.5
  // directions default ['up'] len1 => any val picks up
  // root: rootMin48 rootMax72, up P5 => hi=min(72,127-7=120)=72, lo=48; pick 0 => root48
  const g = new IntervalBuildGame({ rng: seqRng([6 / 12 + 0.001, 0, 0]) });
  const q = g.next();
  ok(q.interval.id === 'P5', 'picked P5');
  ok(q.dir.id === 'up', 'picked up (default)');
  ok(q.root === 48, 'root = 48 (C3)');
  ok(q.target === 55, 'target = 48+7 = 55 (G3)');
  ok(g.rootNote() === 48, 'rootNote matches');
}

// ---- Game: check correct/incorrect, streak, best ----
{
  const g = new IntervalBuildGame({ rng: seqRng([0, 0, 0]) }); // m2 up, root48
  g.next();
  ok(g.current.target === 49, 'm2 up from 48 = 49');
  ok(g.check(49) === true, 'correct: played target');
  ok(g.score === 1 && g.streak === 1 && g.best === 1, 'score/streak/best after correct');
  g.next();
  ok(g.check(g.current.target + 1) === false, 'wrong: off by one');
  ok(g.streak === 0, 'streak reset on wrong');
  ok(g.best === 1, 'best preserved');
  ok(g.attempts === 2, 'attempts counted');
}

// ---- Game: accuracy ----
{
  const g = new IntervalBuildGame({ rng: seqRng([0, 0, 0]) });
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next(); g.check(g.current.target); // correct
  g.next(); g.check(g.current.target + 2); // wrong
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: callbacks ----
{
  const g = new IntervalBuildGame({ rng: seqRng([0, 0, 0]) });
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (correct) => { results++; lastCorrect = correct; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.current.target);
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: direction down ----
{
  // intervals restricted to P5; directions ['down']; root range pinned
  const g = new IntervalBuildGame({ intervals: ['P5'], directions: ['down'], rootMin: 60, rootMax: 60, rng: seqRng([0, 0, 0]) });
  g.next();
  ok(g.current.dir.id === 'down', 'direction down');
  ok(g.current.root === 60 && g.current.target === 53, 'C4 down P5 = F3 (53)');
}

// ---- Game: restrict intervals ----
{
  const g = new IntervalBuildGame({ intervals: ['M3', 'P5'], rng: seqRng([0, 0, 0]) });
  ok(g.intervals.length === 2, 'two intervals');
  g.next();
  ok(['M3', 'P5'].includes(g.current.interval.id), 'restricted interval used');
}
// invalid interval falls back to all
{
  const g = new IntervalBuildGame({ intervals: ['nope'] });
  ok(g.intervals.length === 12, 'invalid interval -> all');
}
// invalid direction falls back to up
{
  const g = new IntervalBuildGame({ directions: ['sideways'] });
  ok(g.directions.length === 1 && g.directions[0].id === 'up', 'invalid dir -> up');
}

// ---- Game: root range respected ----
{
  const g = new IntervalBuildGame({ rootMin: 60, rootMax: 60, rng: seqRng([0, 0, 0.5]) });
  g.next();
  ok(g.current.root === 60, 'root pinned to 60');
}

// ---- Game: target never exceeds MIDI range (up, high root) ----
{
  const g = new IntervalBuildGame({ intervals: ['P8'], rootMin: 124, rootMax: 127, rng: seqRng([0, 0, 0.99]) });
  g.next();
  ok(g.current.target <= 127, 'up target within 127');
  ok(g.current.root <= 127 - 12, 'root clamped so target fits');
}
// ---- Game: target never below 0 (down, low root) ----
{
  const g = new IntervalBuildGame({ intervals: ['P8'], directions: ['down'], rootMin: 0, rootMax: 3, rng: seqRng([0, 0, 0]) });
  g.next();
  ok(g.current.target >= 0, 'down target >= 0');
  ok(g.current.root >= 12, 'root clamped so down target >= 0');
}

// ---- Game: reset ----
{
  const g = new IntervalBuildGame({ rng: seqRng([0, 0, 0]) });
  g.next(); g.check(g.current.target);
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- check before next returns false ----
{
  const g = new IntervalBuildGame();
  ok(g.check(60) === false, 'check with no current = false');
  ok(g.rootNote() === null, 'rootNote null before next');
}

console.log(`interval-build: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
