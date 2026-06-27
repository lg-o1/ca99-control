import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BINS, intervals, deviations, binFor, histogram, biasLabel, comment,
} from './timing-histogram.js';

test('BINS span the full range contiguously', () => {
  assert.equal(BINS.length, 5);
  assert.equal(BINS[0].lo, -Infinity);
  assert.equal(BINS[BINS.length - 1].hi, Infinity);
  for (let i = 1; i < BINS.length; i++) assert.equal(BINS[i].lo, BINS[i - 1].hi);
});

test('intervals computes IOIs', () => {
  assert.deepEqual(intervals([0, 500, 1100]), [500, 600]);
  assert.deepEqual(intervals([]), []);
  assert.deepEqual(intervals([100]), []);
});

test('deviations relative to median when no target', () => {
  const { deviations: d, baseMs } = deviations([0, 500, 1000, 1500]);
  assert.equal(baseMs, 500);
  assert.deepEqual(d, [0, 0, 0]);
});

test('deviations relative to targetMs when provided', () => {
  const { deviations: d, baseMs } = deviations([0, 600], { targetMs: 500 });
  assert.equal(baseMs, 500);
  assert.equal(d[0], (600 - 500) / 500); // +0.2 drag
});

test('binFor maps deviations to bins', () => {
  assert.equal(binFor(0), 'onbeat');
  assert.equal(binFor(-0.5), 'rush2');
  assert.equal(binFor(-0.1), 'rush1');
  assert.equal(binFor(0.1), 'drag1');
  assert.equal(binFor(0.5), 'drag2');
});

test('histogram counts and percentages', () => {
  // perfectly steady -> all onbeat
  const h = histogram([0, 500, 1000, 1500, 2000]);
  assert.equal(h.total, 4);
  const onbeat = h.bins.find((b) => b.id === 'onbeat');
  assert.equal(onbeat.count, 4);
  assert.equal(onbeat.pct, 100);
  assert.equal(h.onbeatPct, 100);
  assert.equal(h.bias, '很稳');
});

test('histogram detects drag bias', () => {
  // intervals grow: 500, 650, 800 -> dragging (target 500)
  const h = histogram([0, 500, 1150, 1950], { targetMs: 500 });
  assert.equal(h.bias, '偏拖拍');
  assert.ok(h.meanDev > 0);
});

test('histogram detects rush bias', () => {
  const h = histogram([0, 400, 700, 950], { targetMs: 500 });
  assert.equal(h.bias, '偏抢拍');
  assert.ok(h.meanDev < 0);
});

test('histogram baseBpm derived from baseMs', () => {
  const h = histogram([0, 500, 1000, 1500]);
  assert.equal(h.baseMs, 500);
  assert.equal(h.baseBpm, 120);
});

test('empty input is safe', () => {
  const h = histogram([]);
  assert.equal(h.total, 0);
  assert.equal(h.onbeatPct, 0);
  assert.equal(h.baseBpm, 0);
});

test('biasLabel thresholds', () => {
  assert.equal(biasLabel(-0.2), '偏抢拍');
  assert.equal(biasLabel(0.2), '偏拖拍');
  assert.equal(biasLabel(0), '很稳');
});

test('comment is non-empty and context-aware', () => {
  assert.ok(comment(histogram([])).length > 0);
  assert.ok(comment(histogram([0, 500, 1000, 1500])).includes('稳'));
});

test('bins always sum to total', () => {
  const h = histogram([0, 400, 1000, 1700, 2000], { targetMs: 500 });
  const sum = h.bins.reduce((a, b) => a + b.count, 0);
  assert.equal(sum, h.total);
});
