/**
 * scale-trainer.test.mjs — 音阶练习单元测试
 * 运行: node js/scale-trainer.test.mjs
 */
import {
  SCALE_TYPES, rootPitchClass, buildScale, buildScaleUpDown, ScaleSession,
} from './scale-trainer.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- rootPitchClass ----
eq(rootPitchClass('C'), 0, 'C -> 0');
eq(rootPitchClass('A'), 9, 'A -> 9');
eq(rootPitchClass('F#'), 6, 'F# -> 6');
eq(rootPitchClass('bad'), 0, 'unknown -> 0');

// ---- buildScale: C major (C4=60) ----
eq(buildScale('C', 'major', 4), [60, 62, 64, 65, 67, 69, 71, 72], 'C major up with octave');

// ---- buildScale: A natural minor ----
eq(buildScale('A', 'naturalMinor', 4), [69, 71, 72, 74, 76, 77, 79, 81], 'A natural minor');

// ---- buildScale: G major ----
eq(buildScale('G', 'major', 4), [67, 69, 71, 72, 74, 76, 78, 79], 'G major');

// ---- buildScale: pentatonic (5 notes + octave) ----
eq(buildScale('C', 'majorPentatonic', 4), [60, 62, 64, 67, 69, 72], 'C major pentatonic');
eq(buildScale('A', 'minorPentatonic', 4), [69, 72, 74, 76, 79, 81], 'A minor pentatonic');

// ---- buildScale: blues has 6 notes + octave ----
eq(buildScale('C', 'blues', 4).length, 7, 'C blues 6+octave');

// ---- buildScale: chromatic 12 + octave ----
eq(buildScale('C', 'chromatic', 4).length, 13, 'chromatic 12+octave');

// ---- buildScale: octave shift ----
eq(buildScale('C', 'major', 3), [48, 50, 52, 53, 55, 57, 59, 60], 'C3 major');

// ---- buildScale: unknown type ----
eq(buildScale('C', 'nope', 4), [], 'unknown type -> []');

// ---- buildScaleUpDown: C major up then down (no repeat at top/bottom) ----
{
  // up: 60 62 64 65 67 69 71 72 ; down (drop top 72 and root-return): 71 69 67 65 64 62
  const ud = buildScaleUpDown('C', 'major', 4);
  eq(ud, [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62], 'C major up-down');
}

// ---- ScaleSession: basic advance ----
{
  const seq = buildScale('C', 'major', 4);
  const advanced = [];
  let completed = false;
  const s = new ScaleSession(seq);
  s.onAdvance = (i) => advanced.push(i);
  s.onComplete = () => completed = true;
  eq(s.nextNote, 60, 'next is C4');
  eq(s.total, 8, 'total 8');
  eq(s.feed(60), 'advance', 'play C advances');
  eq(s.index, 1, 'index 1');
  eq(s.nextNote, 62, 'next is D4');
  // play rest
  [62, 64, 65, 67, 69, 71].forEach(n => s.feed(n));
  eq(s.feed(72), 'complete', 'last note completes');
  ok(completed, 'onComplete fired');
  ok(s.done, 'session done');
  eq(advanced.length, 8, 'advanced 8 times');
}

// ---- ScaleSession: wrong note ----
{
  const s = new ScaleSession(buildScale('C', 'major', 4));
  let errFired = null;
  s.onError = (exp, got) => errFired = { exp, got };
  eq(s.feed(61), 'wrong', 'wrong note rejected');
  eq(s.index, 0, 'index unchanged on wrong');
  eq(s.errors, 1, 'error counted');
  eq(errFired, { exp: 60, got: 61 }, 'onError gives expected+got');
  // correct still works after
  eq(s.feed(60), 'advance', 'correct advances after wrong');
}

// ---- ScaleSession: octaveAgnostic ----
{
  const s = new ScaleSession(buildScale('C', 'major', 4), { octaveAgnostic: true });
  // play C in a different octave (72 instead of 60)
  eq(s.feed(72), 'advance', 'octave-agnostic accepts any C');
  eq(s.feed(74), 'advance', 'accepts any D');
}

// ---- ScaleSession: octaveAgnostic false rejects wrong octave ----
{
  const s = new ScaleSession(buildScale('C', 'major', 4), { octaveAgnostic: false });
  eq(s.feed(72), 'wrong', 'strict rejects wrong octave C');
}

// ---- ScaleSession: progress ----
{
  const s = new ScaleSession([60, 62, 64, 65]);
  eq(s.progress, 0, 'progress 0');
  s.feed(60); s.feed(62);
  eq(s.progress, 0.5, 'progress 0.5');
}

// ---- ScaleSession: feed after done ----
{
  const s = new ScaleSession([60]);
  s.feed(60);
  ok(s.done, 'done after single note');
  eq(s.feed(62), 'complete', 'feed after done -> complete');
}

// ---- ScaleSession: reset ----
{
  const s = new ScaleSession([60, 62]);
  s.feed(60); s.feed(99); // 1 advance, 1 error
  s.reset();
  eq(s.index, 0, 'reset index');
  eq(s.errors, 0, 'reset errors');
}

// ---- ScaleSession: empty sequence ----
{
  const s = new ScaleSession([]);
  ok(s.done, 'empty is done');
  eq(s.progress, 0, 'empty progress 0');
}

// ---- SCALE_TYPES has labels ----
ok(SCALE_TYPES.major.label === '大调', 'major label');
ok(Object.keys(SCALE_TYPES).length === 8, '8 scale types');

console.log(`\nscale-trainer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
