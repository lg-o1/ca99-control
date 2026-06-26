import test from 'node:test';
import assert from 'node:assert/strict';
import { pitchClass, hueForPitch, strokeFor, SoundPainting } from './sound-paint.js';

test('pitchClass wraps to 0..11', () => {
  assert.equal(pitchClass(60), 0);   // C
  assert.equal(pitchClass(62), 2);   // D
  assert.equal(pitchClass(71), 11);  // B
  assert.equal(pitchClass(72), 0);   // C 高八度
  assert.equal(pitchClass(-1), 11);
});

test('hueForPitch maps 12 tones to 12 colors', () => {
  assert.equal(hueForPitch(60), 0);    // C 红
  assert.equal(hueForPitch(61), 30);
  assert.equal(hueForPitch(71), 330);  // B
  assert.equal(hueForPitch(72), 0);    // 高八度同色
});

test('strokeFor: pitch drives x across width', () => {
  const rng = () => 0.5;               // 无抖动
  const low = strokeFor({ midi: 21, W: 900, rng });
  const high = strokeFor({ midi: 108, W: 900, rng });
  assert.equal(low.x, 0);
  assert.equal(high.x, 900);
  const mid = strokeFor({ midi: 64, W: 900, rng });
  assert.ok(mid.x > 0 && mid.x < 900);
});

test('strokeFor: time drives y, wraps after duration', () => {
  const rng = () => 0.5;
  const top = strokeFor({ midi: 60, tMs: 0, durationMs: 1000, H: 500, rng });
  const mid = strokeFor({ midi: 60, tMs: 500, durationMs: 1000, H: 500, rng });
  assert.equal(top.y, 0);
  assert.equal(mid.y, 250);
  const wrap = strokeFor({ midi: 60, tMs: 1000, durationMs: 1000, H: 500, rng });
  assert.equal(wrap.y, 0);            // 回卷到顶
});

test('strokeFor: velocity drives radius + alpha', () => {
  const soft = strokeFor({ midi: 60, velocity: 1 });
  const loud = strokeFor({ midi: 60, velocity: 127 });
  assert.ok(loud.r > soft.r);
  assert.ok(loud.alpha > soft.alpha);
  assert.ok(soft.alpha >= 0.35 && loud.alpha <= 0.85);
});

test('strokeFor: default velocity is mid-ish', () => {
  const s = strokeFor({ midi: 60 });
  assert.ok(s.r >= 10 && s.r <= 56);
  assert.equal(s.hue, 0);
});

test('strokeFor: clamps out-of-range midi', () => {
  const s = strokeFor({ midi: 200, W: 900, rng: () => 0.5 });
  assert.ok(s.x <= 900);
});

test('SoundPainting starts empty', () => {
  const p = new SoundPainting();
  assert.equal(p.count, 0);
  assert.equal(p.isEmpty, true);
  assert.deepEqual(p.summary(), { notes: 0, colors: 0, lowest: null, highest: null, spanSemitones: 0 });
});

test('SoundPainting.add records strokes', () => {
  const p = new SoundPainting({ rng: () => 0.5 });
  const s = p.add(60, 90, 0);
  assert.equal(p.count, 1);
  assert.equal(p.isEmpty, false);
  assert.equal(s.midi, 60);
  assert.equal(s.hue, 0);
});

test('SoundPainting.palette dedups + sorts hues', () => {
  const p = new SoundPainting({ rng: () => 0.5 });
  p.add(60); p.add(72); p.add(64); p.add(60);  // C C(8va) E C → hues 0,0,120,0
  assert.deepEqual(p.palette(), [0, 120]);
});

test('SoundPainting.summary reports range', () => {
  const p = new SoundPainting({ rng: () => 0.5 });
  p.add(60); p.add(64); p.add(72);
  const s = p.summary();
  assert.equal(s.notes, 3);
  assert.equal(s.lowest, 60);
  assert.equal(s.highest, 72);
  assert.equal(s.spanSemitones, 12);
  assert.equal(s.colors, 2);  // C 与高八度 C 同色 → 实际 2 种色相（C, E）
});

test('SoundPainting.reset clears canvas', () => {
  const p = new SoundPainting({ rng: () => 0.5 });
  p.add(60); p.add(64);
  p.reset();
  assert.equal(p.count, 0);
  assert.equal(p.isEmpty, true);
});

test('SoundPainting respects custom dimensions', () => {
  const p = new SoundPainting({ W: 400, H: 200, rng: () => 0.5 });
  const s = p.add(108, 90, 0);
  assert.ok(s.x <= 400);
  assert.ok(s.y <= 200);
});
