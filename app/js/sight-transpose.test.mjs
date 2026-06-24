/**
 * sight-transpose.test.mjs — 移调视奏引擎单元测试
 */
import {
  MELODIES, TARGET_KEYS, SOURCE_ROOT,
  transpose, intervals, evaluateTranspose, SightTransposeTrainer,
} from './sight-transpose.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b}±${eps})`); }
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }

// ---- data sanity ----
ok(MELODIES.length >= 5, 'has melodies');
ok(MELODIES.every((m) => Array.isArray(m.offsets) && m.offsets.length >= 4), 'melodies have >=4 offsets');
ok(MELODIES.every((m) => m.offsets[0] === 0 || m.id === 'ode' || m.id === 'mary' || m.id === 'desc'), 'most start on tonic');
ok(TARGET_KEYS.length >= 6, 'has target keys');
ok(SOURCE_ROOT === 60, 'source root = C4');

// ---- transpose ----
{
  ok(JSON.stringify(transpose([0, 4, 7], 60)) === JSON.stringify([60, 64, 67]), 'transpose C major triad');
  ok(JSON.stringify(transpose([0, 4, 7], 67)) === JSON.stringify([67, 71, 74]), 'transpose to G');
  ok(transpose([], 60).length === 0, 'transpose empty');
}

// ---- intervals ----
{
  ok(JSON.stringify(intervals([60, 64, 67])) === JSON.stringify([4, 3]), 'intervals of triad');
  ok(intervals([60]).length === 0, 'intervals single = empty');
  ok(JSON.stringify(intervals([67, 65, 64])) === JSON.stringify([-2, -1]), 'descending intervals');
}

// ---- evaluateTranspose: perfect ----
{
  const expected = transpose([0, 2, 4, 5, 7], 67); // G major run
  const ev = evaluateTranspose(expected.slice(), expected);
  ok(ev.score === 100, 'perfect transposition = 100');
  approx(ev.noteAccuracy, 1, 1e-9, 'noteAccuracy 1');
  approx(ev.shapeAccuracy, 1, 1e-9, 'shapeAccuracy 1');
  ok(ev.rootOk === true, 'rootOk true');
  ok(ev.correct === expected.length && ev.extra === 0, 'all correct, no extra');
  ok(ev.wrongKey === false, 'not flagged wrong key');
}

// ---- octave flexibility ----
{
  const expected = transpose([0, 4, 7], 60); // C E G
  const playedOctUp = [72, 76, 79]; // same pcs, octave up
  const evFlex = evaluateTranspose(playedOctUp, expected, { octaveFlexible: true });
  ok(evFlex.score === 100, 'octave-flexible: octave up still perfect');
  const evStrict = evaluateTranspose(playedOctUp, expected, { octaveFlexible: false });
  ok(evStrict.score < 100, 'octave-strict: octave up not perfect');
}

// ---- wrong key but right tune ----
{
  // expected in G, but user plays the tune in C (right shape, wrong key)
  const offsets = [0, 2, 4, 5, 7];
  const expected = transpose(offsets, 67); // G
  const playedInC = transpose(offsets, 60); // C — same shape, wrong pitches
  const ev = evaluateTranspose(playedInC, expected, { octaveFlexible: true });
  ok(ev.shapeAccuracy === 1, 'shape matches (same intervals)');
  ok(ev.noteAccuracy < 0.6, 'notes mostly wrong (wrong key)');
  ok(ev.rootOk === false, 'rootOk false (started on C not G)');
  ok(ev.wrongKey === true, 'flagged wrongKey: right tune wrong key');
}

// ---- partially wrong ----
{
  const expected = transpose([0, 2, 4, 5], 65); // F
  const played = expected.slice();
  played[2] = played[2] + 1; // one note off by a semitone (different pc)
  const ev = evaluateTranspose(played, expected);
  ok(ev.correct === 3, '3 of 4 correct');
  approx(ev.noteAccuracy, 3 / 4, 1e-9, 'noteAccuracy 0.75');
  ok(ev.score === 75, 'score 75');
}

// ---- missing notes lower score ----
{
  const expected = transpose([0, 2, 4, 5, 7], 60);
  const played = expected.slice(0, 3); // only 3 of 5
  const ev = evaluateTranspose(played, expected);
  ok(ev.extra === -2, 'extra = -2 (missing)');
  approx(ev.noteAccuracy, 3 / 5, 1e-9, 'noteAccuracy over expected length');
  ok(ev.score === 60, 'score 60 (3/5 correct)');
}

// ---- extra notes penalized ----
{
  const expected = transpose([0, 4, 7], 60);
  const played = expected.concat([72, 74]); // 2 extra
  const ev = evaluateTranspose(played, expected);
  ok(ev.extra === 2, 'extra = 2');
  ok(ev.score < 100, 'extras lower score below perfect');
  ok(ev.correct === 3, 'first 3 still correct');
}

// ---- edge: empty expected ----
{
  const ev = evaluateTranspose([60, 64], []);
  ok(ev.score === 0 && ev.total === 0, 'empty expected -> 0');
}

// ---- Trainer: deterministic round + auto-finish perfect ----
{
  // rng picks: melody index, target key index
  // MELODIES len 6, TARGET_KEYS len 7. Pick melody[1]=arp, key[4]=G
  const rng = seqRng([1 / 6 + 0.001, 4 / 7 + 0.001, 0.5, 0.5, 0.5]);
  const tr = new SightTransposeTrainer({ rng });
  ok(tr.melody.id === 'arp', 'picked arp melody');
  ok(tr.targetKey.id === 'G', 'picked G target');
  ok(JSON.stringify(tr.expected) === JSON.stringify([67, 71, 74, 71, 67]), 'expected = arp in G');
  ok(tr.total === 5, 'total = 5 notes');

  let res = null;
  for (let i = 0; i < tr.total; i++) {
    res = tr.feed(tr.expected[i]);
    if (i < tr.total - 1) ok(res.done === false, `feed ${i} not done`);
  }
  ok(res && res.done === true, 'auto-finish at total');
  ok(res.score === 100, 'perfect play = 100');
  ok(res.best === 100 && res.rounds === 1, 'best/rounds updated');
  ok(tr.feed(99) === res, 'feed after finish returns same result');
}

// ---- Trainer: sourceSeq uses SOURCE_ROOT ----
{
  const tr = new SightTransposeTrainer({ melody: MELODIES[1], targetKey: TARGET_KEYS[4] });
  ok(JSON.stringify(tr.sourceSeq) === JSON.stringify(transpose(MELODIES[1].offsets, SOURCE_ROOT)), 'sourceSeq in source root');
  ok(tr.sourceSeq[0] === 60, 'source starts on C4');
}

// ---- Trainer: manual finish with fewer notes ----
{
  const tr = new SightTransposeTrainer({ melody: MELODIES[0], targetKey: TARGET_KEYS[3] });
  tr.feed(tr.expected[0]); tr.feed(tr.expected[1]);
  const res = tr.finish();
  ok(res.done === true, 'manual finish');
  ok(res.playedCount === 2, 'records played count');
  ok(res.extra < 0, 'fewer notes -> negative extra');
}

// ---- Trainer: newRound resets, keeps best/rounds; bad round keeps best ----
{
  const tr = new SightTransposeTrainer({ melody: MELODIES[1], targetKey: TARGET_KEYS[4] });
  for (let i = 0; i < tr.total; i++) tr.feed(tr.expected[i]); // perfect
  const best1 = tr.best;
  ok(best1 === 100 && tr.rounds === 1, 'round1 perfect');

  tr.newRound({ melody: MELODIES[0], targetKey: TARGET_KEYS[2] });
  ok(tr.played.length === 0 && tr.finished === false, 'newRound clears played');
  ok(tr.best === 100, 'best preserved');

  // sloppy round: all wrong notes
  for (let i = 0; i < tr.total; i++) tr.feed(0);
  ok(tr.best === best1, 'best stays after worse round');
  ok(tr.rounds === 2, 'rounds incremented');
}

console.log(`sight-transpose: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
