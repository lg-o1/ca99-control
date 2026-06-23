/**
 * pedal-timing.test.mjs — 踏板配合时机引擎单元测试
 */
import { PEDAL_THRESHOLD, DEFAULTS, pedalScore, classifyPedal, PedalTiming } from './pedal-timing.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${a}, want ${b})`); }

// ---- constants ----
eq(PEDAL_THRESHOLD, 64, 'threshold 64');
eq(DEFAULTS.catchLow, 40, 'default catchLow');
eq(DEFAULTS.catchHigh, 220, 'default catchHigh');

// ---- pedalScore ----
eq(pedalScore(100), 100, 'score in-band = 100');
eq(pedalScore(40), 100, 'score at low edge = 100');
eq(pedalScore(220), 100, 'score at high edge = 100');
eq(pedalScore(150), 100, 'score mid-band = 100');
// early: catchLow=40, earlyMax=50 -> gap 0 dev 40 -> 100*(1-40/50)=20
eq(pedalScore(0), 20, 'score gap 0 = 20');
eq(pedalScore(15), Math.round(100 * (1 - 25 / 50)), 'score gap 15');
eq(pedalScore(-20), 0, 'score way early = 0 (dev 60 > 50)');
// late: catchHigh=220, lateMax=260 -> gap 480 dev 260 -> 0
eq(pedalScore(480), 0, 'score gap 480 = 0');
eq(pedalScore(450), Math.round(100 * (1 - 230 / 260)), 'score gap 450');
eq(pedalScore(350), Math.round(100 * (1 - 130 / 260)), 'score gap 350');
eq(pedalScore(1000), 0, 'score huge gap = 0 (clamped)');

// ---- pedalScore custom opts ----
eq(pedalScore(100, { catchLow: 80, catchHigh: 120 }), 100, 'custom band in');
eq(pedalScore(60, { catchLow: 80, catchHigh: 120, earlyMax: 40 }), Math.round(100 * (1 - 20 / 40)), 'custom early');

// ---- classifyPedal ----
eq(classifyPedal(100), 'clean', 'classify mid clean');
eq(classifyPedal(40), 'clean', 'classify low edge clean');
eq(classifyPedal(220), 'clean', 'classify high edge clean');
eq(classifyPedal(10), 'muddy', 'classify early muddy');
eq(classifyPedal(0), 'muddy', 'classify 0 muddy');
eq(classifyPedal(300), 'dry', 'classify late dry');

// ---- construction ----
{
  const p = new PedalTiming({ changes: 4 });
  eq(p.changes, 4, 'changes 4');
  eq(p.count, 0, 'init count 0');
  eq(p.done, false, 'init not done');
  eq(p.avgScore, 0, 'init avg 0');
  eq(p.prevDown, true, 'init pedal down (default)');
}

// ---- defaults ----
{
  const p = new PedalTiming();
  eq(p.changes, 8, 'default changes 8');
}

// ---- single clean change ----
{
  const p = new PedalTiming({ changes: 1 });
  let done = null;
  p.onComplete = (r) => { done = r; };
  // pedal starts down. note@0, lift@30, repress@100 -> gap 100 clean
  p.noteOn(60, 0);
  p.pedal(false, 30);  // lift
  p.pedal(true, 100);  // repress -> gap 100 -> 100, done
  eq(p.count, 1, 'count 1');
  eq(p.done, true, 'done at 1');
  ok(done !== null, 'onComplete fired');
  eq(done.avgScore, 100, 'clean avg 100');
  eq(p.records[0].kind, 'clean', 'record clean');
  eq(p.best, 100, 'best 100');
  eq(p.runs, 1, 'runs 1');
}

// ---- muddy change (repress too soon) ----
{
  const p = new PedalTiming({ changes: 1 });
  let done = null;
  p.onComplete = (r) => { done = r; };
  p.noteOn(60, 0);
  p.pedal(false, 5);
  p.pedal(true, 8);   // gap 8 -> muddy, score 100*(1-32/50)=36
  eq(p.records[0].kind, 'muddy', 'muddy classified');
  eq(done.avgScore, pedalScore(8), 'muddy score matches');
  ok(done.avgScore < 50, 'muddy score low');
}

// ---- dry change (repress too late) ----
{
  const p = new PedalTiming({ changes: 1 });
  let done = null;
  p.onComplete = (r) => { done = r; };
  p.noteOn(60, 0);
  p.pedal(false, 30);
  p.pedal(true, 450);  // gap 450 -> dry
  eq(p.records[0].kind, 'dry', 'dry classified');
  ok(done.avgScore < 30, 'dry score low');
}

// ---- requires a lift between note and repress ----
{
  const p = new PedalTiming({ changes: 2 });
  // note then repress WITHOUT a lift -> no scoring (pedal already down)
  p.noteOn(60, 0);
  p.pedal(true, 100);  // already down, no transition, no lift -> nothing
  eq(p.count, 0, 'no score without lift');
  // proper cycle now
  p.pedal(false, 120);
  p.pedal(true, 200);  // gap relative to note@0 = 200 -> clean
  eq(p.count, 1, 'scored after proper lift+repress');
}

// ---- multiple changes complete ----
{
  const p = new PedalTiming({ changes: 3 });
  let done = null;
  p.onComplete = (r) => { done = r; };
  let t = 0;
  for (let i = 0; i < 3; i++) {
    p.noteOn(60 + i, t);
    p.pedal(false, t + 30);
    p.pedal(true, t + 100);  // gap 100 clean
    t += 500;
  }
  eq(p.count, 3, 'count 3');
  eq(p.done, true, 'done at 3');
  eq(done.avgScore, 100, 'all clean avg 100');
  eq(done.breakdown.clean, 3, 'breakdown 3 clean');
}

// ---- onChange callback ----
{
  const p = new PedalTiming({ changes: 2 });
  const seen = [];
  p.onChange = (r) => seen.push(r.kind);
  p.noteOn(60, 0); p.pedal(false, 30); p.pedal(true, 100);    // clean
  p.noteOn(62, 200); p.pedal(false, 205); p.pedal(true, 210); // gap 10 muddy
  eq(seen.length, 2, 'onChange twice');
  eq(seen[0], 'clean', 'first clean');
  eq(seen[1], 'muddy', 'second muddy');
}

// ---- feedCC ----
{
  const p = new PedalTiming({ changes: 1 });
  p.noteOn(60, 0);
  p.feedCC(0, 30);    // value 0 < 64 -> up (lift)
  p.feedCC(127, 100); // value 127 >= 64 -> down (repress) -> gap 100 clean
  eq(p.count, 1, 'feedCC scored');
  eq(p.records[0].kind, 'clean', 'feedCC clean');
}

// ---- feedCC threshold boundary ----
{
  const p = new PedalTiming({ changes: 1 });
  p.noteOn(60, 0);
  p.feedCC(63, 30);   // 63 < 64 -> up
  p.feedCC(64, 100);  // 64 >= 64 -> down
  eq(p.count, 1, 'boundary 64 = down');
}

// ---- ignore after done ----
{
  const p = new PedalTiming({ changes: 1 });
  p.noteOn(60, 0); p.pedal(false, 30); p.pedal(true, 100);
  eq(p.done, true, 'done');
  p.noteOn(62, 200); p.pedal(false, 230); p.pedal(true, 300);
  eq(p.count, 1, 'ignored after done');
}

// ---- breakdown mixed ----
{
  const p = new PedalTiming({ changes: 3 });
  p.noteOn(60, 0); p.pedal(false, 30); p.pedal(true, 100);    // clean
  p.noteOn(62, 200); p.pedal(false, 205); p.pedal(true, 208); // muddy gap 8
  p.noteOn(64, 400); p.pedal(false, 430); p.pedal(true, 900); // dry gap 500
  const b = p.breakdown;
  eq(b.clean, 1, 'breakdown 1 clean');
  eq(b.muddy, 1, 'breakdown 1 muddy');
  eq(b.dry, 1, 'breakdown 1 dry');
}

// ---- finish() manual ----
{
  const p = new PedalTiming({ changes: 8 });
  p.noteOn(60, 0); p.pedal(false, 30); p.pedal(true, 100);
  eq(p.count, 1, 'count 1');
  eq(p.done, false, 'not auto done');
  p.finish();
  eq(p.done, true, 'finish done');
  eq(p.runs, 1, 'finish runs 1');
}

// ---- restart preserves best/runs ----
{
  const p = new PedalTiming({ changes: 1 });
  p.noteOn(60, 0); p.pedal(false, 30); p.pedal(true, 100);
  eq(p.best, 100, 'best 100');
  p.restart();
  eq(p.count, 0, 'restart count 0');
  eq(p.done, false, 'restart not done');
  eq(p.prevDown, true, 'restart pedal down');
  eq(p.best, 100, 'restart keeps best');
  eq(p.runs, 1, 'restart keeps runs');
}

// ---- pedalDown init false ----
{
  const p = new PedalTiming({ changes: 1, pedalDown: false });
  eq(p.prevDown, false, 'init pedal up');
  // note, then press down directly (transition up->down) but no prior lift since pedal was up
  p.noteOn(60, 0);
  p.pedal(true, 100);  // up->down transition, but lifted=false -> no score
  eq(p.count, 0, 'no score, never lifted (was already up)');
}

// ---- repress without pending note ----
{
  const p = new PedalTiming({ changes: 1 });
  p.pedal(false, 30);
  p.pedal(true, 100);  // no pending note -> no score
  eq(p.count, 0, 'no pending note no score');
}

console.log(`pedal-timing: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
