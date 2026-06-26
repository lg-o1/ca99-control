import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REVIEW_INTERVALS, intervalForCount, reviewStatusOf, buildReviewQueue } from './review-queue.js';

test('intervalForCount: Leitner boxes grow with practice count', () => {
  assert.equal(intervalForCount(0), null);   // 从未练
  assert.equal(intervalForCount(1), 1);
  assert.equal(intervalForCount(2), 2);
  assert.equal(intervalForCount(3), 4);
  assert.equal(intervalForCount(4), 7);
  assert.equal(intervalForCount(5), 15);
  assert.equal(intervalForCount(6), 30);
  assert.equal(intervalForCount(99), 30);    // 封顶在最后一盒
});

test('intervalForCount: negative/garbage → null', () => {
  assert.equal(intervalForCount(-3), null);
  assert.equal(intervalForCount(NaN), null);
});

test('reviewStatusOf: never-practiced flagged, not due', () => {
  const s = reviewStatusOf({ id: 'a', label: 'A', count: 0, daysAgo: null });
  assert.equal(s.never, true);
  assert.equal(s.due, false);
  assert.equal(s.interval, null);
  assert.equal(s.ratio, 0);
});

test('reviewStatusOf: due when daysAgo >= interval', () => {
  // count 3 → interval 4；5 天没练 → 到期，逾期 1 天
  const s = reviewStatusOf({ id: 'a', label: 'A', count: 3, daysAgo: 5 });
  assert.equal(s.interval, 4);
  assert.equal(s.due, true);
  assert.equal(s.overdue, 1);
  assert.equal(s.ratio, 5 / 4);
});

test('reviewStatusOf: not due when still within interval', () => {
  // count 5 → interval 15；3 天没练 → 还新鲜
  const s = reviewStatusOf({ id: 'a', label: 'A', count: 5, daysAgo: 3 });
  assert.equal(s.interval, 15);
  assert.equal(s.due, false);
  assert.equal(s.overdue, 0);
  assert.ok(s.ratio < 1);
});

test('reviewStatusOf: exactly at interval is due (>=)', () => {
  const s = reviewStatusOf({ id: 'a', label: 'A', count: 1, daysAgo: 1 });
  assert.equal(s.interval, 1);
  assert.equal(s.due, true);
  assert.equal(s.overdue, 0);
  assert.equal(s.ratio, 1);
});

test('buildReviewQueue: partitions into due / fresh / explore', () => {
  const entries = [
    { id: 'never1', label: 'Never1', count: 0, daysAgo: null },
    { id: 'due1', label: 'Due1', count: 1, daysAgo: 3 },   // interval 1, ratio 3
    { id: 'fresh1', label: 'Fresh1', count: 5, daysAgo: 2 }, // interval 15, not due
    { id: 'due2', label: 'Due2', count: 2, daysAgo: 2 },   // interval 2, ratio 1
  ];
  const q = buildReviewQueue(entries);
  assert.equal(q.counts.due, 2);
  assert.equal(q.counts.fresh, 1);
  assert.equal(q.counts.explore, 1);
  assert.equal(q.counts.total, 4);
  assert.equal(q.explore[0].id, 'never1');
  assert.equal(q.fresh[0].id, 'fresh1');
});

test('buildReviewQueue: due sorted by overdue ratio desc (most urgent first)', () => {
  const entries = [
    { id: 'a', label: 'A', count: 2, daysAgo: 4 },  // interval 2, ratio 2.0
    { id: 'b', label: 'B', count: 1, daysAgo: 5 },  // interval 1, ratio 5.0  ← most urgent
    { id: 'c', label: 'C', count: 3, daysAgo: 5 },  // interval 4, ratio 1.25
  ];
  const q = buildReviewQueue(entries);
  assert.deepEqual(q.due.map((d) => d.id), ['b', 'a', 'c']);
});

test('buildReviewQueue: pick respects limit', () => {
  const entries = [
    { id: 'a', label: 'A', count: 1, daysAgo: 10 },
    { id: 'b', label: 'B', count: 1, daysAgo: 9 },
    { id: 'c', label: 'C', count: 1, daysAgo: 8 },
    { id: 'd', label: 'D', count: 1, daysAgo: 7 },
  ];
  const q = buildReviewQueue(entries, { limit: 2 });
  assert.equal(q.pick.length, 2);
  assert.deepEqual(q.pick.map((p) => p.id), ['a', 'b']);
});

test('buildReviewQueue: limit 0 → empty pick but due still listed', () => {
  const entries = [{ id: 'a', label: 'A', count: 1, daysAgo: 5 }];
  const q = buildReviewQueue(entries, { limit: 0 });
  assert.equal(q.pick.length, 0);
  assert.equal(q.due.length, 1);
});

test('buildReviewQueue: ratio tie broken by absolute overdue then label', () => {
  // both ratio 2.0; a overdue=2 (interval2,daysAgo4), b overdue=1 (interval1,daysAgo2)
  const entries = [
    { id: 'b', label: 'B', count: 1, daysAgo: 2 },  // ratio 2, overdue 1
    { id: 'a', label: 'A', count: 2, daysAgo: 4 },  // ratio 2, overdue 2 ← first
  ];
  const q = buildReviewQueue(entries);
  assert.deepEqual(q.due.map((d) => d.id), ['a', 'b']);
});

test('buildReviewQueue: skips entries without id, handles empty', () => {
  assert.deepEqual(buildReviewQueue([]).pick, []);
  const q = buildReviewQueue([null, { label: 'no-id' }, { id: 'ok', label: 'OK', count: 1, daysAgo: 9 }]);
  assert.equal(q.counts.total, 1);
  assert.equal(q.due[0].id, 'ok');
});

test('buildReviewQueue: custom intervals respected', () => {
  const q = buildReviewQueue(
    [{ id: 'a', label: 'A', count: 1, daysAgo: 5 }],
    { intervals: [10] },
  );
  // interval 10, daysAgo 5 → not due
  assert.equal(q.counts.fresh, 1);
  assert.equal(q.counts.due, 0);
});

test('REVIEW_INTERVALS is monotonic increasing', () => {
  for (let i = 1; i < REVIEW_INTERVALS.length; i++) {
    assert.ok(REVIEW_INTERVALS[i] > REVIEW_INTERVALS[i - 1]);
  }
});
