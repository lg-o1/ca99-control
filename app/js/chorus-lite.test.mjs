import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeline, pickHook, hookBadge, DEFAULT_TARGET_SEC, FULL_THRESHOLD_SEC } from './chorus-lite.js';

// ───────── buildTimeline ─────────
test('buildTimeline accumulates beats and ms; rests advance beat but add no note', () => {
  const tl = buildTimeline([[60, 1], [null, 1], [62, 2]], 120); // beatMs = 500
  assert.equal(tl.notes.length, 2);
  assert.equal(tl.totalBeats, 4);
  assert.equal(tl.beatMs, 500);
  assert.equal(tl.totalMs, 2000);
  assert.equal(tl.notes[0].beat, 0);
  assert.equal(tl.notes[0].ms, 0);
  // second real note sits after the rest (beat 2)
  assert.equal(tl.notes[1].beat, 2);
  assert.equal(tl.notes[1].ms, 1000);
  assert.equal(tl.notes[1].durMs, 1000);
});

test('buildTimeline defaults dur=1 and falls back bpm', () => {
  const tl = buildTimeline([[60], [62]], 0); // bad bpm → 100 → beatMs 600
  assert.equal(tl.beatMs, 600);
  assert.equal(tl.notes[0].dur, 1);
  assert.equal(tl.totalBeats, 2);
});

test('buildTimeline keeps finger when present, null otherwise', () => {
  const tl = buildTimeline([[60, 1, 3], [62, 1]], 100);
  assert.equal(tl.notes[0].finger, 3);
  assert.equal(tl.notes[1].finger, null);
});

// ───────── pickHook: short song = whole ─────────
test('pickHook: short song returns whole=true with all notes from beat 0', () => {
  const song = { bpm: 100, seq: [[60, 1], [62, 1], [64, 1], [65, 1], [67, 2]] };
  const h = pickHook(song);
  assert.equal(h.whole, true);
  assert.equal(h.noteCount, 5);
  assert.equal(h.startBeat, 0);
  assert.equal(h.notes[0].beat, 0);
  // 6 beats @ bpm100 (600ms) = 3.6s
  assert.ok(Math.abs(h.durationSec - 3.6) < 1e-6);
});

// ───────── pickHook: explicit hook ─────────
test('pickHook: explicit song.hook is honored and re-zeroed', () => {
  const seq = [];
  for (let i = 0; i < 60; i++) seq.push([60 + (i % 12), 1]); // 60 beats
  const song = { bpm: 120, seq, hook: [10, 20] };
  const h = pickHook(song);
  assert.equal(h.explicit, true);
  assert.equal(h.whole, false);
  assert.equal(h.startBeat, 10);
  assert.equal(h.endBeat, 20);
  assert.equal(h.noteCount, 10);
  // first sliced note re-zeroed to beat 0
  assert.equal(h.notes[0].beat, 0);
  assert.equal(h.notes[0].ms, 0);
});

test('pickHook: explicit hook clamps to song bounds', () => {
  const seq = [];
  for (let i = 0; i < 20; i++) seq.push([60, 1]);
  const song = { bpm: 120, seq, hook: [-5, 999] };
  const h = pickHook(song);
  assert.equal(h.startBeat, 0);
  assert.equal(h.endBeat, 20);
  assert.equal(h.noteCount, 20);
});

// ───────── pickHook: long song picks densest window ─────────
function longSong() {
  // intro: 20 sparse notes (dur 4) → beats 0,4,...,76  (80 beats)
  // hook : 40 dense eighths (dur 0.5) → beats 80..99.5 (20 beats)
  // total 100 beats @ bpm120 (500ms) = 50s  (> FULL_THRESHOLD)
  const seq = [];
  for (let i = 0; i < 20; i++) seq.push([60, 4]);
  for (let i = 0; i < 40; i++) seq.push([72 + (i % 4), 0.5]);
  return { bpm: 120, seq };
}

test('pickHook: long song is not whole and captures the dense hook region', () => {
  const h = pickHook(longSong(), { targetSec: 30 });
  assert.equal(h.whole, false);
  // window must NOT start at the naive beat 0 — it should slide into the dense region
  assert.ok(h.startBeat > 0, `expected startBeat > 0, got ${h.startBeat}`);
  // captured at least the 40-note burst
  assert.ok(h.noteCount >= 40, `expected >=40 notes, got ${h.noteCount}`);
});

test('pickHook: window length is about targetSec', () => {
  const h = pickHook(longSong(), { targetSec: 30 });
  // 30s target; never longer than target
  assert.ok(h.durationSec <= 30 + 1e-6, `durationSec ${h.durationSec}`);
  assert.ok(h.durationSec >= 15, `durationSec ${h.durationSec}`);
});

test('pickHook: smaller targetSec yields fewer-or-equal notes', () => {
  const big = pickHook(longSong(), { targetSec: 30 });
  const small = pickHook(longSong(), { targetSec: 10 });
  assert.ok(small.noteCount <= big.noteCount);
  assert.ok(small.durationSec < big.durationSec);
});

test('pickHook: sliced notes are re-zeroed (first beat 0, ms 0)', () => {
  const h = pickHook(longSong(), { targetSec: 30 });
  assert.equal(h.notes[0].beat, 0);
  assert.equal(h.notes[0].ms, 0);
  assert.equal(h.noteCount, h.notes.length);
});

// ───────── edge cases ─────────
test('pickHook: empty seq → whole=true, no notes', () => {
  const h = pickHook({ bpm: 100, seq: [] });
  assert.equal(h.whole, true);
  assert.equal(h.noteCount, 0);
  assert.deepEqual(h.notes, []);
});

test('pickHook: rest-only seq → no notes', () => {
  const h = pickHook({ bpm: 100, seq: [[null, 2], [null, 2]] });
  assert.equal(h.noteCount, 0);
});

// ───────── hookBadge ─────────
test('hookBadge: labels whole / explicit / auto distinctly', () => {
  assert.match(hookBadge({ whole: true, durationSec: 12, noteCount: 8 }), /全曲/);
  assert.match(hookBadge({ whole: false, explicit: true, durationSec: 30, noteCount: 40 }), /副歌/);
  assert.match(hookBadge({ whole: false, durationSec: 28, noteCount: 50 }), /高潮片段/);
});

test('constants exported with sane defaults', () => {
  assert.equal(DEFAULT_TARGET_SEC, 30);
  assert.ok(FULL_THRESHOLD_SEC > DEFAULT_TARGET_SEC);
});
