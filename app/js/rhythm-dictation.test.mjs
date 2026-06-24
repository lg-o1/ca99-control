/**
 * rhythm-dictation.test.mjs — 节奏听写引擎单元测试
 */
import {
  DURATIONS, DICTATION_LEVELS, DEFAULT_DICT_TOL,
  ioisFromTimes, generatePattern, patternToOnsets, evaluateDictation,
  RhythmDictationTrainer,
} from './rhythm-dictation.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b}±${eps})`); }

// 确定性 rng：循环给定序列
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }

// ---- DURATIONS / LEVELS sanity ----
ok(DURATIONS.eighth.units === 1 && DURATIONS.quarter.units === 2, 'duration units eighth=1 quarter=2');
ok(DURATIONS.dottedQuarter.units === 3 && DURATIONS.half.units === 4, 'dotted-quarter=3 half=4');
ok(DICTATION_LEVELS.length === 3, '3 difficulty levels');
ok(DICTATION_LEVELS[0].pool.length >= 2, 'easy pool has >=2 values');
ok(DEFAULT_DICT_TOL > 0 && DEFAULT_DICT_TOL < 1, 'default tol in (0,1)');

// ---- ioisFromTimes ----
{
  ok(ioisFromTimes([]).length === 0, 'iois empty');
  ok(ioisFromTimes([100]).length === 0, 'iois single = 0');
  const io = ioisFromTimes([0, 100, 250, 400]);
  ok(io.length === 3, 'iois length n-1');
  ok(io[0] === 100 && io[1] === 150 && io[2] === 150, 'iois correct diffs');
}

// ---- generatePattern: determinism + shape ----
{
  const lvl = DICTATION_LEVELS[0]; // pool [1,2], min4 max5
  // rng sequence drives: count pick, then each duration pick
  const p = generatePattern(seqRng([0, 0.9, 0.1, 0.9, 0.1]), lvl);
  ok(p.durations.length >= lvl.min && p.durations.length <= lvl.max, 'count within range');
  ok(p.iois.length === p.durations.length - 1, 'iois = durations - 1');
  ok(p.durations.every((d) => lvl.pool.includes(d)), 'all durations from pool');
  approx(p.totalUnits, p.durations.reduce((s, x) => s + x, 0), 1e-9, 'totalUnits = sum durations');
}
// count selection: rng()=0 -> min; rng() just below 1 -> max
{
  const lvl = DICTATION_LEVELS[1]; // min5 max6
  const pMin = generatePattern(seqRng([0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), lvl);
  ok(pMin.durations.length === 5, 'rng 0 -> min count');
  const pMax = generatePattern(seqRng([0.999, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), lvl);
  ok(pMax.durations.length === 6, 'rng ~1 -> max count');
}
// avoids all-same when pool has variety
{
  // rng always 0 would pick count=min and pool[0] for every duration -> must mutate one
  const lvl = DICTATION_LEVELS[0];
  const p = generatePattern(() => 0, lvl);
  ok(!p.durations.every((d) => d === p.durations[0]), 'not all identical durations');
}

// ---- patternToOnsets ----
{
  // bpm 120 -> quarter = 500ms, eighth-unit = 250ms
  const onsets = patternToOnsets([2, 1, 1, 2], 120, 0);
  ok(onsets.length === 4, 'onsets length = note count');
  ok(onsets[0] === 0, 'first onset at startTime');
  approx(onsets[1], 500, 1e-6, 'after quarter(2u)=500ms');
  approx(onsets[2], 750, 1e-6, 'after eighth(1u)=+250ms');
  approx(onsets[3], 1000, 1e-6, 'after eighth(1u)=+250ms');
}
{
  const onsets = patternToOnsets([2, 2], 120, 1000);
  ok(onsets[0] === 1000 && Math.abs(onsets[1] - 1500) < 1e-6, 'startTime offset respected');
}

// ---- evaluateDictation: perfect ----
{
  const target = [2, 1, 1, 2];
  // user plays same ratios but at a DIFFERENT tempo (x300ms per unit)
  const userIois = target.map((u) => u * 300);
  const ev = evaluateDictation(target, userIois);
  ok(ev.score === 100, 'tempo-independent perfect = 100');
  approx(ev.rhythmAccuracy, 1, 1e-9, 'rhythmAccuracy 1');
  ok(ev.countScore === 1, 'countScore 1 when counts match');
  ok(ev.correct === target.length, 'all intervals correct');
  ok(ev.extra === 0, 'no extra');
}
// perfect at yet another tempo (very fast)
{
  const target = [1, 2, 1];
  const ev = evaluateDictation(target, [50, 100, 50]);
  ok(ev.score === 100, 'fast tempo still perfect');
}
// scale factor reported
{
  const target = [1, 1];
  const ev = evaluateDictation(target, [200, 200]);
  // target total 2, user total 400 -> scale 2/400 = 0.005
  approx(ev.scale, 2 / 400, 1e-12, 'scale aligns totals');
}

// ---- evaluateDictation: wrong rhythm ----
{
  const target = [2, 1, 1, 2]; // long short short long
  // user does even taps (all same interval) -> ratios wrong
  const ev = evaluateDictation(target, [300, 300, 300, 300]);
  ok(ev.score < 100, 'even taps on uneven target < 100');
  ok(ev.rhythmAccuracy < 1, 'rhythmAccuracy < 1');
}
// swapped long/short should hurt
{
  const target = [2, 1];
  const good = evaluateDictation(target, [400, 200]).score;
  const bad = evaluateDictation(target, [200, 400]).score;
  ok(good > bad, 'matching ratio beats swapped ratio');
}

// ---- evaluateDictation: count mismatch ----
{
  const target = [1, 1, 1, 1];
  // user taps only 3 intervals (one short) but ratios fine on the 3
  const ev = evaluateDictation(target, [100, 100, 100]);
  ok(ev.extra === -1, 'extra negative = missing taps');
  ok(ev.countScore < 1, 'countScore penalized for missing');
  ok(ev.score < 100, 'missing taps lowers score');
}
{
  const target = [1, 1];
  const ev = evaluateDictation(target, [100, 100, 100, 100]); // too many
  ok(ev.extra === 2, 'extra positive = too many taps');
  ok(ev.countScore < 1, 'countScore penalized for extras');
}

// ---- evaluateDictation: edge cases ----
{
  const ev = evaluateDictation([], [100, 100]);
  ok(ev.score === 0 && ev.total === 0, 'empty target -> 0');
}
{
  const ev = evaluateDictation([1, 2], []);
  ok(ev.score === 0 && ev.extra === -2, 'empty user -> 0, extra -n');
}

// ---- evaluateDictation: tol affects strictness ----
{
  const target = [2, 1];
  const userIois = [2 * 100 * 1.2, 1 * 100]; // first interval 20% long
  const strict = evaluateDictation(target, userIois, { tol: 0.1 }).score;
  const loose = evaluateDictation(target, userIois, { tol: 0.5 }).score;
  ok(loose > strict, 'looser tol -> higher score');
}

// ---- RhythmDictationTrainer: auto-finish + scoring ----
{
  const tr = new RhythmDictationTrainer({ rng: seqRng([0, 0.1, 0.9, 0.1, 0.9]), level: DICTATION_LEVELS[0] });
  const n = tr.expectedTaps;
  ok(n >= 4 && n <= 5, 'expectedTaps within level range');
  ok(tr.targetIois.length === n - 1, 'targetIois length = n-1');

  // play back perfectly (use target ratios at 250ms/unit)
  const onsets = patternToOnsets(tr.durations, 90, 0);
  // re-derive at custom tempo to prove tempo independence
  let t = 0; const times = [0];
  for (let i = 0; i < tr.targetIois.length; i++) { t += tr.targetIois[i] * 333; times.push(t); }

  let res = null;
  for (let i = 0; i < n; i++) {
    res = tr.feed(60, times[i]);
    if (i < n - 1) ok(res.done === false, `feed ${i} not done`);
  }
  ok(res && res.done === true, 'auto-finish at expectedTaps');
  ok(res.score === 100, 'perfect playback (tempo-independent) = 100');
  ok(res.best === 100 && res.rounds === 1, 'best/rounds updated');
  ok(tr.feed(60, 99999) === res, 'feed after finish returns same result');
  ok(onsets.length === n, 'onsets count = note count');
}

// ---- Trainer: manual finish with fewer taps ----
{
  const tr = new RhythmDictationTrainer({ rng: seqRng([0.999, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]), level: DICTATION_LEVELS[1] });
  const n = tr.expectedTaps; // should be 6
  ok(n === 6, 'medium max count = 6');
  // only tap 3 times then finish
  tr.feed(60, 0); tr.feed(60, 300); tr.feed(60, 600);
  const res = tr.finish();
  ok(res.done === true, 'manual finish works');
  ok(res.taps === 3 && res.expected === 6, 'records taps vs expected');
  ok(res.extra < 0, 'fewer taps -> negative extra');
}

// ---- Trainer: newPattern resets collection, keeps best/rounds ----
{
  const tr = new RhythmDictationTrainer({ rng: seqRng([0, 0.1, 0.9, 0.1, 0.9]), level: DICTATION_LEVELS[0] });
  const n1 = tr.expectedTaps;
  let t = 0; const times = [0];
  for (let i = 0; i < tr.targetIois.length; i++) { t += tr.targetIois[i] * 200; times.push(t); }
  for (let i = 0; i < n1; i++) tr.feed(60, times[i]);
  ok(tr.best === 100 && tr.rounds === 1, 'round1 perfect');

  tr.newPattern();
  ok(tr.taps.length === 0 && tr.finished === false, 'newPattern clears taps');
  ok(tr.best === 100, 'best preserved across patterns');
  ok(tr.rounds === 1, 'rounds preserved until next finish');
}

// ---- Trainer: bad round does not lower best ----
{
  const tr = new RhythmDictationTrainer({ rng: seqRng([0, 0.1, 0.9, 0.1, 0.9]), level: DICTATION_LEVELS[0] });
  const n = tr.expectedTaps;
  // round1 perfect
  let t = 0; const times = [0];
  for (let i = 0; i < tr.targetIois.length; i++) { t += tr.targetIois[i] * 200; times.push(t); }
  for (let i = 0; i < n; i++) tr.feed(60, times[i]);
  const best1 = tr.best;
  tr.newPattern();
  // round2 sloppy: all equal taps
  const n2 = tr.expectedTaps;
  for (let i = 0; i < n2; i++) tr.feed(60, i * 250);
  ok(tr.best === best1, 'best stays after a worse round');
  ok(tr.rounds === 2, 'rounds incremented');
}

console.log(`rhythm-dictation: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
