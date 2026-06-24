/**
 * chord-inversion.test.mjs — 和弦转位听辨引擎单元测试
 */
import {
  QUALITIES, INVERSIONS, NOTE_NAMES,
  buildInversion, stackIntervals, inversionName, ChordInversionGame,
} from './chord-inversion.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }
const J = (x) => JSON.stringify(x);

// ---- data sanity ----
ok(QUALITIES.length === 2, 'two triad qualities');
ok(J(QUALITIES[0].intervals) === J([0, 4, 7]), 'major intervals');
ok(J(QUALITIES[1].intervals) === J([0, 3, 7]), 'minor intervals');
ok(INVERSIONS.length === 3, 'three inversions');
ok(INVERSIONS.map((i) => i.id).join('') === '012', 'inversion ids 0,1,2');
ok(NOTE_NAMES.length === 12, '12 note names');

// ---- buildInversion: C major ----
{
  const r = 60; // C4
  ok(J(buildInversion(r, [0, 4, 7], 0)) === J([60, 64, 67]), 'root pos = C E G');
  ok(J(buildInversion(r, [0, 4, 7], 1)) === J([64, 67, 72]), '1st inv = E G C');
  ok(J(buildInversion(r, [0, 4, 7], 2)) === J([67, 72, 76]), '2nd inv = G C E');
}
// ---- buildInversion: minor ----
{
  const r = 57; // A3 -> A minor
  ok(J(buildInversion(r, [0, 3, 7], 0)) === J([57, 60, 64]), 'Am root = A C E');
  ok(J(buildInversion(r, [0, 3, 7], 1)) === J([60, 64, 69]), 'Am 1st = C E A');
  ok(J(buildInversion(r, [0, 3, 7], 2)) === J([64, 69, 72]), 'Am 2nd = E A C');
}
// ---- buildInversion: always ascending ----
{
  for (const inv of [0, 1, 2]) {
    const notes = buildInversion(72, [0, 4, 7], inv);
    const asc = notes.every((n, i) => i === 0 || n > notes[i - 1]);
    ok(asc, `inv ${inv} ascending`);
  }
}
// ---- buildInversion: inv wraps modulo ----
{
  ok(J(buildInversion(60, [0, 4, 7], 3)) === J(buildInversion(60, [0, 4, 7], 0)), 'inv 3 == inv 0');
}

// ---- stackIntervals distinguishes inversions ----
{
  // root position triad: two thirds (3 or 4 each), no perfect 4th (5)
  const root = stackIntervals(buildInversion(60, [0, 4, 7], 0)); // [4,3]
  ok(J(root) === J([4, 3]), 'major root stack = M3,m3');
  const inv1 = stackIntervals(buildInversion(60, [0, 4, 7], 1)); // [3,5]
  ok(J(inv1) === J([3, 5]), '1st inv stack = m3,P4 (P4 on top)');
  const inv2 = stackIntervals(buildInversion(60, [0, 4, 7], 2)); // [5,4]
  ok(J(inv2) === J([5, 4]), '2nd inv stack = P4,M3 (P4 on bottom)');
  // the "tell": 2nd inv has P4 at the bottom, 1st inv has P4 at the top
  ok(inv2[0] === 5 && inv1[1] === 5 && !root.includes(5), 'P4 position distinguishes inversions');
}

// ---- inversionName ----
ok(inversionName(0) === '原位', 'name 0');
ok(inversionName(1) === '第一转位', 'name 1');
ok(inversionName(2) === '第二转位', 'name 2');
ok(inversionName(9) === '?', 'unknown name');

// ---- Game: deterministic next() ----
{
  // qualities default [maj,min] len2, inversions [0,1,2] len3
  // rng order in next(): quality pick, inversion pick, root pick
  // pick quality idx0 (maj), inv idx1 (=1), then root
  const g = new ChordInversionGame({ rng: seqRng([0.0, 1 / 3 + 0.01, 0.5]) });
  const notes = g.next();
  ok(g.current.quality.id === 'maj', 'picked major');
  ok(g.current.inv === 1, 'picked 1st inversion');
  ok(notes.length === 3, 'three notes played');
  ok(J(notes) === J(g.notes()), 'notes() matches returned');
  // verify it's actually a 1st inversion major (stack [3,5])
  ok(J(stackIntervals(notes)) === J([3, 5]), 'played notes are 1st inv major');
}

// ---- Game: check correct/incorrect, streak, best ----
{
  const g = new ChordInversionGame({ rng: seqRng([0, 0, 0.5]) }); // maj, inv0
  g.next();
  ok(g.current.inv === 0, 'inv 0');
  ok(g.check(0) === true, 'correct answer');
  ok(g.score === 1 && g.streak === 1 && g.best === 1, 'score/streak/best after correct');
  g.next();
  ok(g.check((g.current.inv + 1) % 3) === false, 'wrong answer');
  ok(g.streak === 0, 'streak reset on wrong');
  ok(g.best === 1, 'best preserved');
  ok(g.attempts === 2, 'attempts counted');
}

// ---- Game: accuracy ----
{
  const g = new ChordInversionGame({ rng: seqRng([0, 0, 0.5]) });
  ok(g.accuracy === 0, 'accuracy 0 before attempts');
  g.next(); g.check(g.current.inv); // correct
  g.next(); g.check((g.current.inv + 1) % 3); // wrong
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy 0.5');
}

// ---- Game: callbacks ----
{
  const g = new ChordInversionGame({ rng: seqRng([0, 0, 0.5]) });
  let news = 0, results = 0, lastCorrect = null;
  g.onNew = () => { news++; };
  g.onResult = (correct) => { results++; lastCorrect = correct; };
  g.next();
  ok(news === 1, 'onNew fired');
  g.check(g.current.inv);
  ok(results === 1 && lastCorrect === true, 'onResult fired correct');
}

// ---- Game: restrict inversions/qualities ----
{
  const g = new ChordInversionGame({ qualities: ['min'], inversions: [2], rng: seqRng([0.4, 0.7, 0.5]) });
  ok(g.qualities.length === 1 && g.qualities[0].id === 'min', 'only minor');
  g.next();
  ok(g.current.quality.id === 'min' && g.current.inv === 2, 'restricted to min 2nd inv');
  ok(J(stackIntervals(g.notes())) === J([5, 3]), 'minor 2nd inv stack = P4,m3');
}
// invalid quality falls back to all
{
  const g = new ChordInversionGame({ qualities: ['xyz'] });
  ok(g.qualities.length === 2, 'invalid quality -> all');
}

// ---- Game: root range respected ----
{
  const g = new ChordInversionGame({ rootMin: 60, rootMax: 60, rng: seqRng([0, 0, 0.5]) });
  g.next();
  ok(g.current.root === 60, 'root pinned to 60');
}

// ---- Game: reset ----
{
  const g = new ChordInversionGame({ rng: seqRng([0, 0, 0.5]) });
  g.next(); g.check(g.current.inv);
  g.reset();
  ok(g.score === 0 && g.streak === 0 && g.best === 0 && g.attempts === 0 && g.current === null, 'reset clears all');
}

// ---- Game: high root does not exceed MIDI 127 ----
{
  const g = new ChordInversionGame({ rootMin: 125, rootMax: 127, rng: seqRng([0, 0.99, 0.99]) });
  g.next();
  ok(g.notes().every((n) => n <= 127), 'all notes within MIDI range');
}

console.log(`chord-inversion: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
