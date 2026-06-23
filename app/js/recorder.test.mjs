/**
 * recorder.test.mjs — 录制 + SMF 编码单元测试
 * 运行: node js/recorder.test.mjs
 */
import { encodeVarLen, u16, u32, Recorder } from './recorder.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- encodeVarLen (per SMF spec examples) ----
eq(encodeVarLen(0), [0x00], 'vlq 0');
eq(encodeVarLen(0x40), [0x40], 'vlq 0x40');
eq(encodeVarLen(0x7f), [0x7f], 'vlq 0x7f');
eq(encodeVarLen(0x80), [0x81, 0x00], 'vlq 0x80');
eq(encodeVarLen(0x2000), [0xc0, 0x00], 'vlq 0x2000');
eq(encodeVarLen(0x3fff), [0xff, 0x7f], 'vlq 0x3fff');
eq(encodeVarLen(0x100000), [0xc0, 0x80, 0x00], 'vlq 0x100000');
eq(encodeVarLen(0x0fffffff), [0xff, 0xff, 0xff, 0x7f], 'vlq max');

// ---- u16/u32 ----
eq(u16(0x1234), [0x12, 0x34], 'u16');
eq(u32(0x12345678), [0x12, 0x34, 0x56, 0x78], 'u32');

// ---- Recorder: start/record/stop ----
{
  const r = new Recorder();
  ok(!r.recording, 'not recording initially');
  ok(r.isEmpty, 'empty initially');
  r.start(1000);
  ok(r.recording, 'recording after start');
  r.record([0x90, 60, 100], 1000); // t=0
  r.record([0x80, 60, 0], 1500);   // t=500
  r.stop();
  ok(!r.recording, 'stopped');
  eq(r.count, 2, '2 events');
  eq(r.events[0], { t: 0, bytes: [0x90, 60, 100] }, 'first event t=0');
  eq(r.events[1], { t: 500, bytes: [0x80, 60, 0] }, 'second event t=500');
}

// ---- Recorder: ignores record when not recording ----
{
  const r = new Recorder();
  r.record([0x90, 60, 100], 0);
  eq(r.count, 0, 'no record when stopped');
}

// ---- Recorder: start clears previous ----
{
  const r = new Recorder();
  r.start(0); r.record([0x90, 60, 100], 0); r.stop();
  r.start(0); // should clear
  eq(r.count, 0, 'start clears old events');
}

// ---- Recorder: durationMs ----
{
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);
  r.record([0x80, 60, 0], 750);
  eq(r.durationMs, 750, 'duration = last event time');
}

// ---- Recorder: event bytes are copied (not referenced) ----
{
  const r = new Recorder();
  r.start(0);
  const b = [0x90, 60, 100];
  r.record(b, 0);
  b[1] = 99; // mutate original
  eq(r.events[0].bytes[1], 60, 'recorded bytes are a copy');
}

// ---- Recorder: play schedules with injected timer ----
{
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);
  r.record([0x90, 64, 100], 200);
  r.record([0x90, 67, 100], 400);
  r.stop();
  const scheduled = [];
  const fakeSetTimeout = (cb, delay) => { scheduled.push({ delay, cb }); return scheduled.length; };
  r.play((bytes) => {}, { setTimeoutFn: fakeSetTimeout });
  eq(scheduled.map(s => s.delay), [0, 200, 400], 'play schedules at event times');
  // fire them and capture sends
  const sent = [];
  const r2 = new Recorder();
  r2.start(0); r2.record([0x90, 60, 100], 0); r2.record([0x80, 60, 0], 100); r2.stop();
  const timers = [];
  r2.play((bytes) => sent.push(bytes), { setTimeoutFn: (cb, d) => { timers.push(cb); return 1; } });
  timers.forEach(cb => cb());
  eq(sent, [[0x90, 60, 100], [0x80, 60, 0]], 'play sends recorded bytes');
}

// ---- Recorder: play speed multiplier ----
{
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);
  r.record([0x90, 64, 100], 400);
  r.stop();
  const delays = [];
  r.play(() => {}, { setTimeoutFn: (cb, d) => { delays.push(d); return 1; }, speed: 2 });
  eq(delays, [0, 200], 'speed 2x halves delays');
}

// ---- SMF: header structure ----
{
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);
  r.record([0x80, 60, 0], 500);
  r.stop();
  const smf = r.toMidiFile({ ppq: 480, bpm: 120 });
  // MThd
  eq(smf.slice(0, 4), [0x4d, 0x54, 0x68, 0x64], 'MThd magic');
  eq(smf.slice(4, 8), [0, 0, 0, 6], 'header length 6');
  eq(smf.slice(8, 10), [0, 0], 'format 0');
  eq(smf.slice(10, 12), [0, 1], '1 track');
  eq(smf.slice(12, 14), [0x01, 0xe0], 'ppq 480');
  // MTrk
  eq(smf.slice(14, 18), [0x4d, 0x54, 0x72, 0x6b], 'MTrk magic');
}

// ---- SMF: contains tempo meta + note events + end ----
{
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);
  r.record([0x80, 60, 0], 500);
  r.stop();
  const smf = r.toMidiFile({ ppq: 480, bpm: 120 });
  // tempo meta FF 51 03 present
  const hasTempoMeta = smf.some((b, i) => b === 0xff && smf[i + 1] === 0x51 && smf[i + 2] === 0x03);
  ok(hasTempoMeta, 'has tempo meta event');
  // end of track FF 2F 00
  eq(smf.slice(-3), [0xff, 0x2f, 0x00], 'ends with end-of-track');
  // note-on present
  ok(smf.includes(0x90), 'has note-on status');
}

// ---- SMF: delta time computed from ms at 120bpm/480ppq ----
{
  // 120bpm -> 500ms per quarter; 480 ppq -> msPerTick = 500/480.
  // event at 500ms -> tick = round(500 / (500/480)) = 480 ticks
  // 480 as VLQ = [0x83, 0x60]
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);   // delta 0
  r.record([0x80, 60, 0], 500);   // delta 480
  r.stop();
  const smf = r.toMidiFile({ ppq: 480, bpm: 120 });
  // find the note-off event sequence: VLQ(480)=83 60 then 80 3C 00
  let found = false;
  for (let i = 0; i < smf.length - 4; i++) {
    if (smf[i] === 0x83 && smf[i + 1] === 0x60 && smf[i + 2] === 0x80 && smf[i + 3] === 0x3c) { found = true; break; }
  }
  ok(found, 'note-off has correct 480-tick delta (VLQ 83 60)');
}

// ---- SMF: skips non-channel events (sysex) ----
{
  const r = new Recorder();
  r.start(0);
  r.record([0x90, 60, 100], 0);
  r.record([0xf0, 0x40, 0x7f, 0xf7], 100); // sysex - should be skipped
  r.record([0x80, 60, 0], 200);
  r.stop();
  const smf = r.toMidiFile({ ppq: 480, bpm: 120 });
  ok(!smf.includes(0xf0), 'sysex skipped in SMF');
  ok(smf.includes(0x90) && smf.includes(0x80), 'note on/off retained');
}

// ---- clear ----
{
  const r = new Recorder();
  r.start(0); r.record([0x90, 60, 100], 0);
  r.clear();
  ok(r.isEmpty, 'cleared');
  ok(!r.recording, 'not recording after clear');
}

console.log(`\nrecorder: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
