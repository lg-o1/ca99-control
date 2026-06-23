/**
 * chord-trainer.test.mjs — 和弦练习挑战逻辑单元测试
 * 运行: node js/chord-trainer.test.mjs
 */
import { HeldNotes, ChordChallenge, CHALLENGE_POOL } from './chord-trainer.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- HeldNotes ----
{
  const h = new HeldNotes();
  h.on(64); h.on(60); h.on(67);
  eq(h.notes, [60, 64, 67], 'held sorted');
  eq(h.size, 3, 'size 3');
  h.off(64);
  eq(h.notes, [60, 67], 'after off');
  h.on(60); // dup
  eq(h.size, 2, 'no dup');
  h.clear();
  eq(h.notes, [], 'cleared');
}

// ---- ChordChallenge.next uses injected rng deterministically ----
{
  // rng returns 0 -> always first root (C) and first pool (major)
  const c = new ChordChallenge({ rng: () => 0 });
  const q = c.next();
  eq(q.root, 'C', 'rng=0 -> root C');
  eq(q.suffix, '', 'rng=0 -> major');
  eq(q.symbol, 'C', 'symbol C');
}

// ---- onNew fired ----
{
  let got = null;
  const c = new ChordChallenge({ rng: () => 0 });
  c.onNew = (q) => got = q;
  c.next();
  ok(got && got.symbol === 'C', 'onNew fired with question');
}

// ---- check: correct answer scores + advances ----
{
  // Force question = C major (rng=0). Then play C E G.
  let correctFired = null;
  const c = new ChordChallenge({ rng: () => 0 });
  c.onCorrect = (q, stats) => correctFired = { q, stats };
  c.next(); // C major
  const okk = c.check([60, 64, 67]);
  ok(okk === true, 'correct C major accepted');
  eq(c.score, 1, 'score incremented');
  eq(c.streak, 1, 'streak incremented');
  ok(correctFired !== null, 'onCorrect fired');
  ok(c.current !== null, 'advanced to next question');
}

// ---- check: inversion still counts (root+suffix match) ----
{
  const c = new ChordChallenge({ rng: () => 0 });
  c.next(); // C major
  // E G C = C major first inversion
  ok(c.check([64, 67, 72]) === true, 'inversion accepted (root+type match)');
}

// ---- check: wrong chord rejected ----
{
  const c = new ChordChallenge({ rng: () => 0 });
  c.next(); // C major
  ok(c.check([62, 65, 69]) === false, 'D minor rejected for C major question');
  eq(c.score, 0, 'no score on wrong');
}

// ---- check: wrong type same root rejected ----
{
  const c = new ChordChallenge({ rng: () => 0 });
  c.next(); // C major
  ok(c.check([60, 63, 67]) === false, 'C minor rejected for C major question');
}

// ---- check: incomplete (no chord) rejected ----
{
  const c = new ChordChallenge({ rng: () => 0 });
  c.next();
  ok(c.check([60, 64]) === false, 'two notes rejected');
  ok(c.check([]) === false, 'empty rejected');
}

// ---- best streak tracks max ----
{
  // rng=0 always C major; we answer correctly 3 times
  const c = new ChordChallenge({ rng: () => 0 });
  c.next();
  c.check([60, 64, 67]);
  c.check([60, 64, 67]);
  c.check([60, 64, 67]);
  eq(c.streak, 3, 'streak 3');
  eq(c.best, 3, 'best 3');
  c.miss();
  eq(c.streak, 0, 'miss resets streak');
  eq(c.best, 3, 'best retained after miss');
}

// ---- check before next() returns false ----
{
  const c = new ChordChallenge({ rng: () => 0 });
  ok(c.check([60, 64, 67]) === false, 'no current question -> false');
}

// ---- minor question matched by minor chord ----
{
  // rng sequence: pick root index then pool index. Use a controlled rng.
  // We want root 'A' (index 9) and suffix 'm' (pool index 1).
  // _pick does floor(rng()*len). roots len=12, pool len=5.
  // For root A: rng so floor(r*12)=9 -> r in [9/12, 10/12) -> 0.75
  // For suffix m: floor(r*5)=1 -> r in [0.2,0.4) -> 0.25
  const seq = [0.75, 0.25];
  let i = 0;
  const c = new ChordChallenge({ rng: () => seq[i++ % seq.length] });
  const q = c.next();
  eq(q.symbol, 'Am', 'forced question Am');
  ok(c.check([69, 72, 76]) === true, 'A minor chord answers Am');
}

// ---- reset ----
{
  const c = new ChordChallenge({ rng: () => 0 });
  c.next(); c.check([60, 64, 67]);
  c.reset();
  eq(c.score, 0, 'reset score');
  eq(c.streak, 0, 'reset streak');
  eq(c.best, 0, 'reset best');
  ok(c.current === null, 'reset current');
}

// ---- pool default ----
eq(CHALLENGE_POOL.length, 5, 'pool has 5 types');

console.log(`\nchord-trainer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
