/**
 * metronome.test.mjs — 节拍器 + 速度检测单元测试
 * 运行: node js/metronome.test.mjs
 */
import { bpmToMs, msToBpm, Metronome, TempoTracker } from './metronome.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function approx(a, b, msg, eps = 1e-6) { if (Math.abs(a - b) < eps) pass++; else { fail++; console.error(`✗ ${msg}: expected ~${b}, got ${a}`); } }
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- bpm <-> ms ----
approx(bpmToMs(60), 1000, '60bpm = 1000ms');
approx(bpmToMs(120), 500, '120bpm = 500ms');
approx(bpmToMs(90), 666.6666667, '90bpm ms', 1e-3);
eq(bpmToMs(0), 0, '0 bpm -> 0');
approx(msToBpm(1000), 60, '1000ms = 60bpm');
approx(msToBpm(500), 120, '500ms = 120bpm');
eq(msToBpm(0), 0, '0 ms -> 0');

// ---- Metronome: accent on first beat of bar ----
{
  const ticks = [];
  const m = new Metronome({ bpm: 120, beatsPerBar: 4 });
  m.onTick = (info) => ticks.push(info);
  for (let i = 0; i < 5; i++) m.tickOnce();
  eq(ticks[0], { beat: 0, bar: 0, isAccent: true }, 'first beat accent');
  eq(ticks[1], { beat: 1, bar: 0, isAccent: false }, 'beat 2 no accent');
  eq(ticks[3], { beat: 3, bar: 0, isAccent: false }, 'beat 4 no accent');
  eq(ticks[4], { beat: 0, bar: 1, isAccent: true }, 'next bar first beat accent');
}

// ---- Metronome: 3/4 time ----
{
  const ticks = [];
  const m = new Metronome({ bpm: 100, beatsPerBar: 3 });
  m.onTick = (info) => ticks.push(info);
  for (let i = 0; i < 4; i++) m.tickOnce();
  eq(ticks.map(t => t.isAccent), [true, false, false, true], '3/4 accent pattern');
  eq(ticks[3].bar, 1, 'beat 4 is bar 1');
}

// ---- Metronome: beatInBar getter ----
{
  const m = new Metronome({ bpm: 120, beatsPerBar: 4 });
  eq(m.beatInBar, 0, 'initial beatInBar 0');
  m.tickOnce(); m.tickOnce();
  eq(m.beatInBar, 2, 'beatInBar after 2 ticks');
}

// ---- Metronome: start uses injected timer + immediate first tick ----
{
  const ticks = [];
  let intervalCb = null;
  const fakeSet = (cb, ms) => { intervalCb = cb; return 1; };
  const fakeClear = () => { intervalCb = null; };
  const m = new Metronome({ bpm: 120 });
  m.onTick = (i) => ticks.push(i);
  m.start(fakeSet, fakeClear);
  ok(m.running, 'running after start');
  eq(ticks.length, 1, 'immediate first tick');
  ok(ticks[0].isAccent, 'first tick is accent');
  intervalCb(); // simulate timer firing
  eq(ticks.length, 2, 'second tick via timer');
  m.stop();
  ok(!m.running, 'stopped');
}

// ---- Metronome: setBpm while running restarts cleanly ----
{
  let started = 0;
  const fakeSet = () => { started++; return started; };
  const fakeClear = () => {};
  const m = new Metronome({ bpm: 90 });
  m.start(fakeSet, fakeClear);
  m.setBpm(120);
  eq(m.bpm, 120, 'bpm updated');
  ok(m.running, 'still running after setBpm');
}

// ---- Metronome: reset ----
{
  const m = new Metronome({ bpm: 120, beatsPerBar: 4 });
  m.tickOnce(); m.tickOnce(); m.tickOnce();
  m.reset();
  eq(m.beatInBar, 0, 'reset beat');
}

// ---- TempoTracker: needs 2 notes ----
{
  const t = new TempoTracker();
  eq(t.feed(0), null, 'first note -> null');
  // 500ms apart = 120bpm
  eq(t.feed(500), 120, 'second note -> 120bpm');
}

// ---- TempoTracker: steady tempo averaging ----
{
  const t = new TempoTracker({ window: 4 });
  t.feed(0);
  eq(t.feed(500), 120, '120bpm');
  eq(t.feed(1000), 120, 'still 120');
  eq(t.feed(1500), 120, 'still 120 steady');
}

// ---- TempoTracker: different tempo ----
{
  const t = new TempoTracker();
  t.feed(0);
  eq(t.feed(1000), 60, '1000ms gap = 60bpm');
}

// ---- TempoTracker: large gap resets phrase ----
{
  const t = new TempoTracker({ maxGapMs: 2000 });
  t.feed(0);
  t.feed(500); // 120bpm
  const afterGap = t.feed(5000); // 4500ms gap > 2000 -> reset
  eq(afterGap, null, 'gap resets to null');
  // continues fresh
  eq(t.feed(5500), 120, 'fresh measurement after reset');
}

// ---- TempoTracker: window limits history ----
{
  const t = new TempoTracker({ window: 2 });
  // feed steady 120 then speed up; with small window it should track recent
  t.feed(0); t.feed(500); t.feed(1000); // 120bpm
  // now play fast: 250ms apart = 240bpm
  t.feed(1250); t.feed(1500);
  const bpm = t.feed(1750);
  ok(bpm > 200, `recent fast tempo tracked (got ${bpm})`);
}

// ---- TempoTracker: reset ----
{
  const t = new TempoTracker();
  t.feed(0); t.feed(500);
  t.reset();
  eq(t.feed(1000), null, 'after reset needs 2 again');
}

console.log(`\nmetronome: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
