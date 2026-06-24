/**
 * scale-span.test.mjs — 音阶八度跨度引擎单元测试
 */
import {
  SPAN_OCTAVES, SPAN_DIRECTIONS, buildSpan, crossingIndices,
  evaluateSpan, ScaleSpanTrainer,
} from './scale-span.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b}±${eps})`); }

// ---- constants ----
ok(SPAN_OCTAVES.includes(2), 'SPAN_OCTAVES has 2');
ok(SPAN_DIRECTIONS.updown && SPAN_DIRECTIONS.up, 'directions defined');

// ---- buildSpan: 1 octave C major up ----
{
  const s = buildSpan('C', 'major', 4, 1, 'up');
  ok(JSON.stringify(s) === JSON.stringify([60, 62, 64, 65, 67, 69, 71, 72]), '1-oct C major up = C4..C5');
}

// ---- buildSpan: 2 octaves C major up ----
{
  const s = buildSpan('C', 'major', 4, 2, 'up');
  ok(s.length === 15, '2-oct up has 7*2+1 = 15 notes');
  ok(s[0] === 60 && s[7] === 72 && s[14] === 84, 'spans C4 -> C6');
  // strictly ascending
  let asc = true; for (let i = 1; i < s.length; i++) if (s[i] <= s[i - 1]) asc = false;
  ok(asc, '2-oct up strictly ascending');
}

// ---- buildSpan: updown does not repeat apex, returns to start ----
{
  const up = buildSpan('C', 'major', 4, 2, 'up');
  const ud = buildSpan('C', 'major', 4, 2, 'updown');
  ok(ud.length === up.length * 2 - 1, 'updown = 2*up-1 (apex once)');
  ok(ud[0] === 60 && ud[ud.length - 1] === 60, 'updown starts and ends on C4');
  ok(ud[up.length - 1] === 84, 'apex at middle');
}

// ---- buildSpan: bad type ----
ok(buildSpan('C', 'nope', 4, 2, 'up').length === 0, 'bad scale type -> empty');

// ---- buildSpan: pentatonic 2 octaves ----
{
  const s = buildSpan('C', 'majorPentatonic', 4, 2, 'up');
  ok(s.length === 5 * 2 + 1, 'pentatonic 2-oct = 11 notes');
}

// ---- crossingIndices: 2-oct C major ----
{
  const s = buildSpan('C', 'major', 4, 2, 'up'); // C4 at 0, C5 at 7, C6 at 14
  const cr = crossingIndices(s, 0); // root pc = 0
  ok(JSON.stringify(cr) === JSON.stringify([7, 14]), 'crossings at indices 7 and 14');
}

// ---- crossingIndices: updown has crossings both ways ----
{
  const s = buildSpan('C', 'major', 4, 2, 'updown');
  const cr = crossingIndices(s, 0);
  // root C appears: idx7(C5),14(C6 apex),21(C5 down),28(C4 end)
  ok(cr.includes(7) && cr.includes(14) && cr.includes(28), 'updown crossings include up & down C');
}

// ---- evaluateSpan: perfect even run ----
{
  const expected = buildSpan('C', 'major', 4, 2, 'up');
  const cross = crossingIndices(expected, 0);
  const events = expected.map((n, i) => ({ note: n, time: i * 150 }));
  const r = evaluateSpan(events, { expected, crossings: cross });
  ok(r.noteAccuracy === 1, 'perfect: noteAccuracy 1');
  ok(r.correctNotes === expected.length, 'perfect: all correct');
  ok(r.evenScore === 1, 'perfect: evenScore 1 (constant IOI)');
  ok(r.crossingScore === 1, 'perfect: crossingScore 1');
  ok(r.hitches === 0, 'perfect: no hitches');
  ok(r.score === 100, 'perfect: score 100');
  approx(r.bpm, 400, 1e-9, 'perfect: bpm 60000/150');
  ok(r.wrongAt.length === 0, 'perfect: no wrong');
  ok(r.crossingCount === cross.length, 'perfect: crossingCount matches');
}

// ---- evaluateSpan: wrong notes lower accuracy ----
{
  const expected = buildSpan('C', 'major', 4, 1, 'up'); // 8 notes
  const played = expected.slice();
  played[2] = played[2] + 1;  // wrong 3rd note
  played[5] = played[5] + 1;  // wrong 6th note
  const events = played.map((n, i) => ({ note: n, time: i * 150 }));
  const r = evaluateSpan(events, { expected, crossings: [] });
  ok(r.correctNotes === 6, 'wrong: 6/8 correct');
  approx(r.noteAccuracy, 6 / 8, 1e-9, 'wrong: accuracy 0.75');
  ok(r.wrongAt.length === 2 && r.wrongAt.includes(2) && r.wrongAt.includes(5), 'wrong: indices flagged');
}

// ---- evaluateSpan: hitch at crossing lowers crossingScore ----
{
  const expected = buildSpan('C', 'major', 4, 2, 'up');
  const cross = crossingIndices(expected, 0); // [7,14]
  // even 150ms, but big gap entering index 7 (crossing)
  const times = [];
  let t = 0;
  for (let i = 0; i < expected.length; i++) {
    if (i === 7) t += 400; else if (i > 0) t += 150;  // hitch before idx7
    times.push(t);
  }
  const events = expected.map((n, i) => ({ note: n, time: times[i] }));
  const r = evaluateSpan(events, { expected, crossings: cross });
  ok(r.hitches >= 1, 'hitch: detected at least 1');
  ok(r.crossingScore < 1, 'hitch: crossingScore < 1');
  ok(r.noteAccuracy === 1, 'hitch: notes still all correct');
}

// ---- evaluateSpan: uneven timing lowers evenScore ----
{
  const expected = buildSpan('C', 'major', 4, 1, 'up');
  const times = [0, 100, 400, 500, 900, 1000, 1500, 1600];
  const events = expected.map((n, i) => ({ note: n, time: times[i] }));
  const r = evaluateSpan(events, { expected, crossings: [] });
  ok(r.evenScore < 0.7, 'uneven: evenScore reduced');
  ok(r.ioiCV > 0.2, 'uneven: high CV');
}

// ---- evaluateSpan: no crossings -> crossingScore 1 ----
{
  const expected = buildSpan('C', 'major', 4, 1, 'up');
  const events = expected.map((n, i) => ({ note: n, time: i * 150 }));
  const r = evaluateSpan(events, { expected, crossings: [] });
  ok(r.crossingScore === 1, 'no crossings: crossingScore 1');
}

// ---- evaluateSpan: empty ----
{
  const r = evaluateSpan([], { expected: [60, 62], crossings: [] });
  ok(r.correctNotes === 0 && r.noteAccuracy === 0, 'empty: zero accuracy');
  ok(r.evenScore === 0, 'empty: evenScore 0');
}

// ---- ScaleSpanTrainer: build + auto-finish ----
{
  const tr = new ScaleSpanTrainer({ root: 'C', type: 'major', octave: 4, octaves: 2, direction: 'up' });
  ok(tr.total === 15, 'trainer total 15');
  ok(JSON.stringify(tr.crossings) === JSON.stringify([7, 14]), 'trainer crossings computed');
  ok(tr.nextNote === 60, 'trainer first nextNote = C4');
  let notes = 0, completes = 0, result = null;
  tr.onNote = () => { notes++; };
  tr.onComplete = (r) => { completes++; result = r; };
  for (let i = 0; i < tr.expected.length - 1; i++) {
    const ret = tr.feed(tr.expected[i], i * 150);
    ok(ret === null, `feed ${i} returns null`);
  }
  ok(tr.progress === 14 && !tr.done, 'progress 14 not done');
  const last = tr.feed(tr.expected[14], 14 * 150);
  ok(last && last.score === 100, 'trainer perfect finish');
  ok(notes === 15 && completes === 1, 'callbacks fired');
  ok(tr.rounds === 1 && tr.best === 100, 'rounds/best updated');
  ok(tr.feed(99, 9999) === null, 'feed after done ignored');
}

// ---- ScaleSpanTrainer: best keeps max, reset keeps stats ----
{
  const tr = new ScaleSpanTrainer({ root: 'C', type: 'major', octave: 4, octaves: 1, direction: 'up' });
  // round 1: all wrong notes
  for (let i = 0; i < tr.total; i++) tr.feed(0, i * 150);
  const b1 = tr.best;
  tr.reset();
  // round 2: perfect
  for (let i = 0; i < tr.total; i++) tr.feed(tr.expected[i], i * 150);
  ok(tr.best === 100, 'best updates to 100');
  ok(tr.best >= b1, 'best monotonic');
  ok(tr.rounds === 2, 'rounds 2');
}

// ---- ScaleSpanTrainer: resetAll ----
{
  const tr = new ScaleSpanTrainer({ root: 'C', type: 'major', octave: 4, octaves: 1, direction: 'up' });
  for (let i = 0; i < tr.total; i++) tr.feed(tr.expected[i], i * 150);
  ok(tr.rounds === 1 && tr.best === 100, 'pre-resetAll');
  tr.resetAll();
  ok(tr.rounds === 0 && tr.best === 0 && tr.events.length === 0 && tr.lastResult === null, 'resetAll clears');
}

// ---- ScaleSpanTrainer: different root (G major) ----
{
  const tr = new ScaleSpanTrainer({ root: 'G', type: 'major', octave: 4, octaves: 1, direction: 'up' });
  ok(tr.expected[0] === 67, 'G4 = 67');
  ok(tr.expected[tr.total - 1] === 79, 'top G5 = 79');
}

console.log(`scale-span: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
