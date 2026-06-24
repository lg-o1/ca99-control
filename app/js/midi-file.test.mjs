/**
 * midi-file.test.mjs — SMF 解析器单元测试（合成最小 MIDI 字节流验证）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMidi, countHand } from './midi-file.js';

// ---- 测试用 SMF 构造工具 ----
function vlq(n) {
  const bytes = [n & 0x7f];
  n = Math.floor(n / 128);
  while (n > 0) { bytes.unshift((n & 0x7f) | 0x80); n = Math.floor(n / 128); }
  return bytes;
}
// events: [{delta, bytes:[...]}]，自动补 End of Track
function track(events) {
  const body = [];
  for (const e of events) { body.push(...vlq(e.delta), ...e.bytes); }
  body.push(...vlq(0), 0xff, 0x2f, 0x00); // EoT
  const len = body.length;
  return [0x4d, 0x54, 0x72, 0x6b, (len >> 24) & 255, (len >> 16) & 255, (len >> 8) & 255, len & 255, ...body];
}
function smf(format, division, tracks) {
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, (format >> 8) & 255, format & 255,
    (tracks.length >> 8) & 255, tracks.length & 255, (division >> 8) & 255, division & 255];
  const out = [...head];
  for (const t of tracks) out.push(...t);
  return Uint8Array.from(out);
}
const noteOn = (ch, n, v) => [0x90 | ch, n, v];
const noteOff = (ch, n) => [0x80 | ch, n, 0];
const tempoEv = (us) => [0xff, 0x51, 0x03, (us >> 16) & 255, (us >> 8) & 255, us & 255];

// ---- 基础解析 ----
test('解析单轨单音：ms/durMs/beat/bpm 正确', () => {
  const tr = track([
    { delta: 0, bytes: tempoEv(500000) },      // 120bpm
    { delta: 0, bytes: noteOn(0, 60, 100) },
    { delta: 480, bytes: noteOff(0, 60) },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.equal(m.ticksPerBeat, 480);
  assert.equal(m.bpm, 120);
  assert.equal(m.notes.length, 1);
  const n = m.notes[0];
  assert.equal(n.midi, 60);
  assert.equal(n.ms, 0);
  assert.equal(n.durMs, 500);
  assert.equal(n.beat, 0);
  assert.equal(n.dur, 1);
  assert.equal(n.velocity, 100);
});

test('vel=0 的 Note On 视作 Note Off', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 64, 80) },
    { delta: 240, bytes: noteOn(0, 64, 0) }, // 等价 off
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.equal(m.notes.length, 1);
  assert.equal(m.notes[0].durMs, 250); // 240/480 拍 @120bpm = 250ms
});

test('running status：连续 Note On 省略状态字节', () => {
  const tr = track([
    { delta: 0, bytes: [0x90, 60, 100] },
    { delta: 0, bytes: [64, 100] },          // running status 复用 0x90
    { delta: 480, bytes: [60, 0] },          // off (running)
    { delta: 0, bytes: [64, 0] },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.equal(m.notes.length, 2);
  assert.deepEqual(m.notes.map((n) => n.midi).sort(), [60, 64]);
});

test('和弦：同一 tick 多个音符都解析', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 60, 90) },
    { delta: 0, bytes: noteOn(0, 64, 90) },
    { delta: 0, bytes: noteOn(0, 67, 90) },
    { delta: 480, bytes: noteOff(0, 60) },
    { delta: 0, bytes: noteOff(0, 64) },
    { delta: 0, bytes: noteOff(0, 67) },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.equal(m.notes.length, 3);
  assert.ok(m.notes.every((n) => n.ms === 0));
});

test('tempo 变化影响后续音符的毫秒时间', () => {
  const tr = track([
    { delta: 0, bytes: tempoEv(500000) },          // 120bpm
    { delta: 480, bytes: tempoEv(250000) },        // tick480 起 240bpm
    { delta: 0, bytes: noteOn(0, 60, 100) },       // 在 tick480
    { delta: 480, bytes: noteOff(0, 60) },         // 到 tick960
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  const n = m.notes[0];
  assert.equal(Math.round(n.ms), 500);    // 第一拍 120bpm = 500ms
  assert.equal(Math.round(n.durMs), 250); // 第二拍 240bpm = 250ms
});

test('Time Signature 被解析', () => {
  const tr = track([
    { delta: 0, bytes: [0xff, 0x58, 0x04, 3, 2, 24, 8] }, // 3/4
    { delta: 0, bytes: noteOn(0, 60, 100) },
    { delta: 480, bytes: noteOff(0, 60) },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.deepEqual(m.timeSig, { num: 3, den: 4 });
});

test('无 tempo 时默认 120bpm', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 60, 100) },
    { delta: 480, bytes: noteOff(0, 60) },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.equal(m.bpm, 120);
  assert.equal(m.notes[0].durMs, 500);
});

// ---- 手别分配 ----
test('双音轨：高音轨=右手，低音轨=左手', () => {
  const hi = track([
    { delta: 0, bytes: noteOn(0, 72, 100) }, { delta: 480, bytes: noteOff(0, 72) },
    { delta: 0, bytes: noteOn(0, 76, 100) }, { delta: 480, bytes: noteOff(0, 76) },
  ]);
  const lo = track([
    { delta: 0, bytes: noteOn(1, 48, 100) }, { delta: 480, bytes: noteOff(1, 48) },
    { delta: 0, bytes: noteOn(1, 52, 100) }, { delta: 480, bytes: noteOff(1, 52) },
  ]);
  const m = parseMidi(smf(1, 480, [hi, lo]));
  assert.ok(m.hasHands);
  assert.equal(m.notes.find((n) => n.midi === 72).hand, 'r');
  assert.equal(m.notes.find((n) => n.midi === 48).hand, 'l');
  assert.equal(countHand(m, 'r'), 2);
  assert.equal(countHand(m, 'l'), 2);
  assert.equal(countHand(m, 'both'), 4);
});

test('单音轨按音高分割左右手', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 40, 90) }, { delta: 240, bytes: noteOff(0, 40) },
    { delta: 0, bytes: noteOn(0, 43, 90) }, { delta: 240, bytes: noteOff(0, 43) },
    { delta: 0, bytes: noteOn(0, 79, 90) }, { delta: 240, bytes: noteOff(0, 79) },
    { delta: 0, bytes: noteOn(0, 84, 90) }, { delta: 240, bytes: noteOff(0, 84) },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  const lows = m.notes.filter((n) => n.midi < 60).map((n) => n.hand);
  const highs = m.notes.filter((n) => n.midi >= 72).map((n) => n.hand);
  assert.ok(lows.every((h) => h === 'l'));
  assert.ok(highs.every((h) => h === 'r'));
});

// ---- 排序 / 时长 ----
test('音符按 ms 升序排列、durationMs 为最后结束', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 60, 100) },
    { delta: 480, bytes: noteOff(0, 60) },
    { delta: 0, bytes: noteOn(0, 62, 100) },
    { delta: 480, bytes: noteOff(0, 62) },
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.deepEqual(m.notes.map((n) => n.ms), [0, 500]);
  assert.equal(m.durationMs, 1000);
  assert.equal(m.durationBeats, 2);
});

// ---- 容错 ----
test('非 MIDI 字节抛出可读错误', () => {
  assert.throws(() => parseMidi(Uint8Array.from([1, 2, 3, 4])), /MThd|MIDI/);
});

test('接受 ArrayBuffer 输入', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 60, 100) },
    { delta: 480, bytes: noteOff(0, 60) },
  ]);
  const u8 = smf(0, 480, [tr]);
  const m = parseMidi(u8.buffer);
  assert.equal(m.notes.length, 1);
});

test('零时值音符被兜底为最小时值', () => {
  const tr = track([
    { delta: 0, bytes: noteOn(0, 60, 100) },
    { delta: 0, bytes: noteOff(0, 60) }, // 同 tick on+off
  ]);
  const m = parseMidi(smf(0, 480, [tr]));
  assert.equal(m.notes.length, 1);
  assert.ok(m.notes[0].durMs > 0);
});
