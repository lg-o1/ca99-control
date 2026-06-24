/**
 * voicing.test.mjs — 旋律声部突出引擎单元测试
 * 运行：node js/voicing.test.mjs
 */
import { mean, targetIndex, scoreVoicing, VoicingTrainer } from './voicing.js';

let passed = 0, failed = 0;
function eq(a, b, msg) {
  if (a === b) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got ${a}, want ${b}`); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log(`FAIL: ${msg}`); }
}
function arrEq(a, b, msg) {
  const same = a.length === b.length && a.every((x, i) => x === b[i]);
  if (same) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got [${a}], want [${b}]`); }
}
const ch = (pairs) => pairs.map(([note, vel]) => ({ note, vel }));

// ---------- mean ----------
eq(mean([]), 0, 'mean empty');
eq(mean([20, 40]), 30, 'mean basic');

// ---------- targetIndex ----------
eq(targetIndex([], 'top'), -1, 'empty -> -1');
eq(targetIndex(ch([[60, 50]]), 'top'), 0, 'single top idx 0');
eq(targetIndex(ch([[60, 50], [64, 40], [67, 30]]), 'top'), 2, 'top = highest note idx');
eq(targetIndex(ch([[60, 50], [64, 40], [67, 30]]), 'bottom'), 0, 'bottom = lowest note idx');
eq(targetIndex(ch([[67, 30], [60, 50], [64, 40]]), 'top'), 0, 'top regardless of order');
eq(targetIndex(ch([[67, 30], [60, 50], [64, 40]]), 'bottom'), 1, 'bottom regardless of order');

// ---------- scoreVoicing: empty ----------
{
  const r = scoreVoicing([], { targetVoice: 'top' });
  eq(r.score, 0, 'empty score 0');
  ok(r.empty === true, 'empty flag');
}

// ---------- scoreVoicing: single note ----------
{
  const r = scoreVoicing(ch([[60, 70]]), { targetVoice: 'top' });
  eq(r.score, 60, 'single note neutral 60');
  ok(r.single === true, 'single flag');
  eq(r.targetNote, 60, 'single target note');
}

// ---------- scoreVoicing: top voice louder by exactly margin -> 100 ----------
{
  const r = scoreVoicing(ch([[60, 40], [64, 45], [72, 60]]), { targetVoice: 'top', margin: 15 });
  eq(r.targetNote, 72, 'target top note');
  eq(r.vTarget, 60, 'vTarget 60');
  eq(r.vOther, 45, 'vOther max of others');
  eq(r.diff, 15, 'diff 15');
  eq(r.score, 100, 'diff==margin -> 100');
}

// ---------- top voice louder beyond margin -> 100 ----------
{
  const r = scoreVoicing(ch([[60, 40], [72, 90]]), { targetVoice: 'top', margin: 15 });
  eq(r.diff, 50, 'diff 50');
  eq(r.score, 100, 'beyond margin -> 100');
}

// ---------- top voice equal -> 0 ----------
{
  const r = scoreVoicing(ch([[60, 60], [72, 60]]), { targetVoice: 'top', margin: 15 });
  eq(r.diff, 0, 'diff 0');
  eq(r.score, 0, 'equal -> 0');
}

// ---------- top voice softer (buried) -> 0 ----------
{
  const r = scoreVoicing(ch([[60, 80], [72, 50]]), { targetVoice: 'top', margin: 15 });
  eq(r.diff, -30, 'diff negative');
  eq(r.score, 0, 'buried melody -> 0');
}

// ---------- partial credit ----------
{
  const r = scoreVoicing(ch([[60, 50], [72, 56]]), { targetVoice: 'top', margin: 20 });
  eq(r.diff, 6, 'diff 6');
  eq(r.score, 30, 'partial 6/20 -> 30');
}

// ---------- bottom voice target ----------
{
  const r = scoreVoicing(ch([[48, 80], [60, 50], [64, 55]]), { targetVoice: 'bottom', margin: 15 });
  eq(r.targetNote, 48, 'bottom target note');
  eq(r.vTarget, 80, 'bottom vel');
  eq(r.vOther, 55, 'other max 55');
  eq(r.diff, 25, 'diff 25');
  eq(r.score, 100, 'bottom louder -> 100');
}

// ---------- VoicingTrainer: construct ----------
{
  const t = new VoicingTrainer({ targetVoice: 'top', margin: 15, rounds: 3 });
  eq(t.completed, 0, 'completed 0');
  eq(t.expected, 3, 'expected 3 remaining');
  eq(t.done, false, 'not done');
  eq(t.best, 0, 'best 0');
}

// ---------- feed + flush single chord ----------
{
  const t = new VoicingTrainer({ targetVoice: 'top', margin: 15, rounds: 2 });
  const chords = [];
  t.onChord = (r, i) => chords.push({ r, i });
  t.feed(60, 40, 0);
  t.feed(64, 45, 5);
  t.feed(72, 65, 10);
  const r = t.flush();
  ok(r !== null, 'flush returns result');
  eq(r.score, 100, 'first chord 100');
  eq(t.completed, 1, 'completed 1');
  eq(chords.length, 1, 'onChord fired once');
  eq(chords[0].i, 0, 'round index 0');
}

// ---------- flush empty buffer returns null ----------
{
  const t = new VoicingTrainer({ rounds: 2 });
  eq(t.flush(), null, 'empty flush null');
  eq(t.completed, 0, 'no result recorded');
}

// ---------- duplicate note in chord keeps max vel ----------
{
  const t = new VoicingTrainer({ targetVoice: 'top', margin: 15, rounds: 1 });
  t.feed(72, 50, 0);
  t.feed(72, 70, 2); // same note, louder
  t.feed(60, 40, 3);
  let summary = null; t.onComplete = (s) => { summary = s; };
  const r = t.flush();
  eq(r.vTarget, 70, 'dup note kept max vel');
  eq(r.score, 100, 'voiced -> 100');
  ok(summary !== null, 'completes after rounds reached');
}

// ---------- full session + summary ----------
{
  const t = new VoicingTrainer({ targetVoice: 'top', margin: 20, rounds: 3 });
  let summary = null; t.onComplete = (s) => { summary = s; };
  // chord 1: perfect (100)
  t.feed(60, 40, 0); t.feed(72, 70, 5); t.flush();
  // chord 2: buried (0)
  t.feed(60, 80, 100); t.feed(72, 50, 105); t.flush();
  // chord 3: partial diff 10 / margin 20 -> 50
  t.feed(60, 50, 200); t.feed(72, 60, 205); t.flush();
  ok(t.done, 'done after 3 rounds');
  ok(summary !== null, 'onComplete fired');
  eq(summary.chords, 3, 'summary chords 3');
  arrEq(summary.perChord, [100, 0, 50], 'per-chord scores');
  eq(summary.avgScore, 50, 'avg (100+0+50)/3 = 50');
  eq(summary.clean, 1, 'one clean (>=80)');
  eq(t.best, 50, 'best updated');
  eq(t.runs, 1, 'runs 1');
}

// ---------- feed after done is ignored ----------
{
  const t = new VoicingTrainer({ rounds: 1, margin: 15 });
  t.feed(60, 40, 0); t.feed(72, 70, 5); t.flush();
  ok(t.done, 'done');
  t.feed(80, 90, 10);
  eq(t.flush(), null, 'flush after done null');
}

// ---------- restart preserves best/runs ----------
{
  const t = new VoicingTrainer({ rounds: 1, margin: 15 });
  t.feed(60, 40, 0); t.feed(72, 70, 5); t.flush();
  const best1 = t.best, runs1 = t.runs;
  t.restart();
  eq(t.completed, 0, 'restart completed 0');
  eq(t.done, false, 'restart not done');
  eq(t.best, best1, 'restart keeps best');
  eq(t.runs, runs1, 'restart keeps runs');
}

// ---------- finish flushes remaining buffer ----------
{
  const t = new VoicingTrainer({ rounds: 5, margin: 15 });
  t.feed(60, 40, 0); t.feed(72, 70, 5); t.flush(); // 1 chord
  t.feed(60, 30, 100); t.feed(72, 80, 105); // buffered, not flushed
  let summary = null; t.onComplete = (s) => { summary = s; };
  t.finish();
  ok(t.done, 'finish sets done');
  eq(summary.chords, 2, 'finish counts buffered chord');
}

// ---------- expected counts down ----------
{
  const t = new VoicingTrainer({ rounds: 3, margin: 15 });
  eq(t.expected, 3, 'expected 3');
  t.feed(60, 40, 0); t.feed(72, 70, 5); t.flush();
  eq(t.expected, 2, 'expected 2');
}

console.log(`voicing: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
