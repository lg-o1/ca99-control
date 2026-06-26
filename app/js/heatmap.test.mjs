import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Heatmap, HEAT_BUCKETS, NEVER_BUCKET, bucketForDays, daysAgo } from './heatmap.js';
import { MemoryStorage } from './preset-store.js';

const DAY = 86400000;
function mk(nowRef) {
  return new Heatmap({ storage: new MemoryStorage(), clock: () => nowRef.t });
}

test('daysAgo: null when never, floor of day difference', () => {
  assert.equal(daysAgo(null, 1000), null);
  const now = 10 * DAY;
  assert.equal(daysAgo(now, now), 0);
  assert.equal(daysAgo(now - DAY, now), 1);
  assert.equal(daysAgo(now - 3.9 * DAY, now), 3);
  assert.equal(daysAgo(now + DAY, now), 0); // 不会出现负数
});

test('bucketForDays: thresholds map to correct buckets', () => {
  assert.equal(bucketForDays(null).id, 'never');
  assert.equal(bucketForDays(0).id, 'fresh');
  assert.equal(bucketForDays(1).id, 'fresh');
  assert.equal(bucketForDays(2).id, 'recent');
  assert.equal(bucketForDays(3).id, 'recent');
  assert.equal(bucketForDays(4).id, 'fading');
  assert.equal(bucketForDays(7).id, 'fading');
  assert.equal(bucketForDays(8).id, 'stale');
  assert.equal(bucketForDays(999).id, 'stale');
});

test('touch records lastTs/count and label', () => {
  const ref = { t: 5 * DAY };
  const h = mk(ref);
  const r = h.touch('sight', '视奏闪卡');
  assert.equal(r.count, 1);
  assert.equal(r.lastTs, 5 * DAY);
  assert.equal(h.lastTs('sight'), 5 * DAY);
  assert.equal(h.daysAgo('sight'), 0);
  assert.equal(h.bucketOf('sight').id, 'fresh');
  ref.t = 5 * DAY + 100;
  h.touch('sight');
  assert.equal(h.data.skills['sight'].count, 2);
  assert.equal(h.data.skills['sight'].label, '视奏闪卡'); // 标签保留
});

test('touch with falsy id is a no-op', () => {
  const ref = { t: DAY };
  const h = mk(ref);
  assert.equal(h.touch('', 'x'), null);
  assert.equal(h.touch(null), null);
  assert.deepEqual(Object.keys(h.data.skills), []);
});

test('bucketOf reflects recency over time', () => {
  const ref = { t: 100 * DAY };
  const h = mk(ref);
  h.touch('scale', '音阶');
  assert.equal(h.bucketOf('scale').id, 'fresh');
  ref.t = 100 * DAY + 3 * DAY;
  assert.equal(h.bucketOf('scale').id, 'recent');
  ref.t = 100 * DAY + 6 * DAY;
  assert.equal(h.bucketOf('scale').id, 'fading');
  ref.t = 100 * DAY + 20 * DAY;
  assert.equal(h.bucketOf('scale').id, 'stale');
});

test('never-practiced skill: lastTs null, never bucket', () => {
  const ref = { t: DAY };
  const h = mk(ref);
  assert.equal(h.lastTs('nope'), null);
  assert.equal(h.daysAgo('nope'), null);
  assert.equal(h.bucketOf('nope').id, 'never');
});

test('all() merges catalog with practiced, never-practiced last', () => {
  const ref = { t: 50 * DAY };
  const h = mk(ref);
  h.touch('sight', '视奏闪卡');     // fresh
  ref.t = 50 * DAY + 10 * DAY;
  h.touch('ear', '音程听辨');        // touched 10d before final now
  ref.t = 50 * DAY + 10 * DAY;       // keep now here
  const catalog = [
    { id: 'sight', label: '视奏闪卡', icon: '👀' },
    { id: 'ear', label: '音程听辨', icon: '👂' },
    { id: 'staffread', label: '五线谱', icon: '🎼' }, // never practiced
  ];
  const arr = h.all(catalog);
  assert.equal(arr.length, 3);
  // sight practiced 10d ago (stale), ear practiced 0d ago (fresh) → sight first (more stale)
  assert.equal(arr[0].id, 'sight');
  assert.equal(arr[1].id, 'ear');
  // never-practiced last
  assert.equal(arr[2].id, 'staffread');
  assert.equal(arr[2].bucket.id, 'never');
  assert.equal(arr[0].bucket.id, 'stale');
  assert.equal(arr[1].bucket.id, 'fresh');
  assert.equal(arr[2].icon, '🎼');
});

test('all() includes practiced skills not in catalog', () => {
  const ref = { t: DAY };
  const h = mk(ref);
  h.touch('boss', 'Boss战');
  const arr = h.all([{ id: 'sight', label: '视奏', icon: '👀' }]);
  const ids = arr.map((e) => e.id).sort();
  assert.deepEqual(ids, ['boss', 'sight']);
});

test('counts() tallies per bucket', () => {
  const ref = { t: 100 * DAY };
  const h = mk(ref);
  h.touch('a', 'A'); // will be fresh
  ref.t = 100 * DAY + 5 * DAY;
  h.touch('b', 'B'); // fresh at this now
  // a is 5d ago (fading), b is 0d (fresh)
  const cat = [{ id: 'c', label: 'C' }, { id: 'd', label: 'D' }]; // 2 never
  const c = h.counts(cat);
  assert.equal(c.total, 4);
  assert.equal(c.fresh, 1);  // b
  assert.equal(c.fading, 1); // a
  assert.equal(c.never, 2);  // c,d
});

test('persistence: reload from storage keeps records', () => {
  const store = new MemoryStorage();
  const ref = { t: 7 * DAY };
  const h1 = new Heatmap({ storage: store, clock: () => ref.t });
  h1.touch('sight', '视奏闪卡');
  const h2 = new Heatmap({ storage: store, clock: () => ref.t });
  assert.equal(h2.lastTs('sight'), 7 * DAY);
  assert.equal(h2.data.skills['sight'].label, '视奏闪卡');
});

test('corrupt storage falls back to blank', () => {
  const store = new MemoryStorage();
  store.setItem('ca99-heatmap', '{not json');
  const h = new Heatmap({ storage: store });
  assert.deepEqual(h.data, { skills: {} });
});

test('reset clears all', () => {
  const ref = { t: DAY };
  const h = mk(ref);
  h.touch('a', 'A');
  h.touch('b', 'B');
  h.reset();
  assert.deepEqual(h.data.skills, {});
  assert.equal(h.counts([]).total, 0);
});

test('HEAT_BUCKETS + NEVER_BUCKET shape sane', () => {
  assert.equal(HEAT_BUCKETS.length, 4);
  for (const b of HEAT_BUCKETS) {
    assert.ok(b.id && b.color && b.label && b.emoji);
  }
  assert.equal(NEVER_BUCKET.id, 'never');
  assert.equal(NEVER_BUCKET.maxDays, null);
});
