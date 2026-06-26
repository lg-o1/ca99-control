import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractNotes, summarize, starRating, praiseLine, rollLayout, fmtDuration, midiName,
} from './share-card.js';

// 辅助：构造一个 note-on/off 事件
const on = (t, note, vel = 90, ch = 0) => ({ t, bytes: [0x90 | ch, note, vel] });
const off = (t, note, ch = 0) => ({ t, bytes: [0x80 | ch, note, 0] });
const onOff0 = (t, note, ch = 0) => ({ t, bytes: [0x90 | ch, note, 0] }); // note-on vel0 = off

test('extractNotes pairs on/off into notes', () => {
  const notes = extractNotes([on(0, 60), off(500, 60), on(600, 64), off(900, 64)]);
  assert.equal(notes.length, 2);
  assert.deepEqual(notes[0], { midi: 60, startMs: 0, durMs: 500 });
  assert.deepEqual(notes[1], { midi: 64, startMs: 600, durMs: 300 });
});

test('extractNotes treats note-on vel0 as note-off', () => {
  const notes = extractNotes([on(0, 60), onOff0(400, 60)]);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].durMs, 400);
});

test('extractNotes closes dangling notes at last event time', () => {
  const notes = extractNotes([on(0, 60), on(100, 64), off(300, 64)]);
  // 60 从未松开 → 用最后事件时间 300 闭合
  const n60 = notes.find(n => n.midi === 60);
  assert.equal(n60.durMs, 300);
});

test('extractNotes ignores malformed / short events', () => {
  const notes = extractNotes([{ t: 0, bytes: [0x90] }, null, on(10, 62), off(50, 62)]);
  assert.equal(notes.length, 1);
});

test('extractNotes sorted by startMs', () => {
  const notes = extractNotes([on(200, 60), off(300, 60), on(0, 64), off(100, 64)]);
  assert.equal(notes[0].startMs, 0);
  assert.equal(notes[1].startMs, 200);
});

test('extractNotes separates same note on different channels', () => {
  const notes = extractNotes([on(0, 60, 90, 0), on(0, 60, 90, 1), off(200, 60, 0), off(400, 60, 1)]);
  assert.equal(notes.length, 2);
});

test('summarize computes counts, duration and range', () => {
  const s = summarize([on(0, 60), off(500, 60), on(600, 72), off(1000, 72)]);
  assert.equal(s.notes, 2);
  assert.equal(s.durationMs, 1000);
  assert.equal(s.lowMidi, 60);
  assert.equal(s.highMidi, 72);
  assert.equal(s.distinctPitches, 2);
});

test('summarize on empty input', () => {
  const s = summarize([]);
  assert.equal(s.notes, 0);
  assert.equal(s.durationMs, 0);
  assert.equal(s.lowMidi, null);
  assert.equal(s.highMidi, null);
});

test('starRating is generous: 0 notes = 0 star', () => {
  assert.equal(starRating({ notes: 0, durationMs: 0 }), 0);
});

test('starRating: a little playing = 3 stars', () => {
  assert.equal(starRating({ notes: 5, durationMs: 3000 }), 3);
});

test('starRating: more notes/longer = 4 then 5', () => {
  assert.equal(starRating({ notes: 15, durationMs: 1000 }), 4);
  assert.equal(starRating({ notes: 1, durationMs: 15000 }), 4);
  assert.equal(starRating({ notes: 40, durationMs: 1000 }), 5);
  assert.equal(starRating({ notes: 1, durationMs: 40000 }), 5);
});

test('starRating handles undefined', () => {
  assert.equal(starRating(undefined), 0);
});

test('praiseLine returns a string for each tier and is deterministic', () => {
  assert.equal(typeof praiseLine(3, 0), 'string');
  assert.equal(praiseLine(5, 0), praiseLine(5, 0));
  assert.notEqual(praiseLine(5, 0), praiseLine(5, 1));
});

test('praiseLine idx wraps and handles negatives', () => {
  assert.equal(praiseLine(4, 99), praiseLine(4, 99 % 3));
  assert.equal(typeof praiseLine(4, -1), 'string');
});

test('praiseLine unknown tier falls back to tier 3 pool', () => {
  assert.ok(praiseLine(7, 0));
});

test('rollLayout maps notes into bounded rects', () => {
  const notes = [{ midi: 60, startMs: 0, durMs: 100 }, { midi: 72, startMs: 100, durMs: 100 }];
  const rects = rollLayout(notes, { width: 200, height: 100, pad: 0 });
  assert.equal(rects.length, 2);
  for (const r of rects) {
    assert.ok(r.x >= 0 && r.x <= 200);
    assert.ok(r.y >= 0 && r.y <= 100);
    assert.ok(r.w >= 2);
    assert.ok(r.h >= 3);
  }
  // 高音 (72) 应在低音 (60) 上方（y 更小）
  assert.ok(rects[1].y < rects[0].y);
});

test('rollLayout empty notes', () => {
  assert.deepEqual(rollLayout([]), []);
  assert.deepEqual(rollLayout(null), []);
});

test('rollLayout respects custom midi range', () => {
  const rects = rollLayout([{ midi: 60, startMs: 0, durMs: 50 }], { width: 100, height: 100, pad: 0, minMidi: 21, maxMidi: 108 });
  assert.equal(rects.length, 1);
  assert.ok(rects[0].y > 0);
});

test('fmtDuration formats mm:ss', () => {
  assert.equal(fmtDuration(0), '0:00');
  assert.equal(fmtDuration(5000), '0:05');
  assert.equal(fmtDuration(65000), '1:05');
  assert.equal(fmtDuration(125000), '2:05');
});

test('midiName names pitches', () => {
  assert.equal(midiName(60), 'C4');
  assert.equal(midiName(69), 'A4');
  assert.equal(midiName(61), 'C#4');
  assert.equal(midiName(null), '—');
});
