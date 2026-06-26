import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MicroStars, STAR_THRESHOLDS, MAX_STARS, starsForValue, toNextStar } from './microstars.js';
import { MemoryStorage } from './preset-store.js';

function mk() {
  return new MicroStars({ storage: new MemoryStorage() });
}

test('STAR_THRESHOLDS / MAX_STARS shape', () => {
  assert.equal(MAX_STARS, 8);
  assert.equal(STAR_THRESHOLDS.length, 8);
  // strictly ascending, first star cheap
  for (let i = 1; i < STAR_THRESHOLDS.length; i++) {
    assert.ok(STAR_THRESHOLDS[i] > STAR_THRESHOLDS[i - 1]);
  }
  assert.equal(STAR_THRESHOLDS[0], 1);
});

test('starsForValue maps cumulative value to star count', () => {
  assert.equal(starsForValue(0), 0);
  assert.equal(starsForValue(1), 1);
  assert.equal(starsForValue(4), 1);
  assert.equal(starsForValue(5), 2);
  assert.equal(starsForValue(11), 2);
  assert.equal(starsForValue(12), 3);
  assert.equal(starsForValue(199), 7);
  assert.equal(starsForValue(200), 8);
  assert.equal(starsForValue(99999), 8);
});

test('toNextStar returns remaining to next threshold, 0 when maxed', () => {
  assert.equal(toNextStar(0), 1);   // need 1 for first star
  assert.equal(toNextStar(1), 4);   // need 5 for 2nd → 4 more
  assert.equal(toNextStar(5), 7);   // need 12 → 7 more
  assert.equal(toNextStar(200), 0); // maxed
  assert.equal(toNextStar(500), 0);
});

test('sync lights stars and reports gained', () => {
  const ms = mk();
  let r = ms.sync('sight', 1, '视奏闪卡');
  assert.equal(r.stars, 1);
  assert.equal(r.prevStars, 0);
  assert.deepEqual(r.gained, [1]);
  assert.equal(r.justMaxed, false);

  r = ms.sync('sight', 12, '视奏闪卡'); // jumps from 1 to 3 stars
  assert.equal(r.stars, 3);
  assert.equal(r.prevStars, 1);
  assert.deepEqual(r.gained, [2, 3]); // two stars gained at once
});

test('sync never decreases stars even if value drops', () => {
  const ms = mk();
  ms.sync('ear', 50, '音程听辨'); // 5 stars (>=45)
  assert.equal(ms.starsOf('ear'), 5);
  const r = ms.sync('ear', 0, '音程听辨'); // value reset
  assert.equal(r.stars, 5);
  assert.deepEqual(r.gained, []);
  assert.equal(ms.starsOf('ear'), 5);
  assert.equal(ms.valueOf('ear'), 50); // value also never decreases
});

test('justMaxed fires exactly once at 8th star', () => {
  const ms = mk();
  let r = ms.sync('scale', 199, '音阶'); // 7 stars
  assert.equal(r.justMaxed, false);
  r = ms.sync('scale', 200, '音阶');     // 8th star
  assert.equal(r.stars, 8);
  assert.equal(r.justMaxed, true);
  r = ms.sync('scale', 300, '音阶');     // already maxed
  assert.equal(r.justMaxed, false);
  assert.deepEqual(r.gained, []);
});

test('sync with falsy id is safe no-op-ish', () => {
  const ms = mk();
  const r = ms.sync('', 100);
  assert.equal(r.stars, 0);
  assert.deepEqual(r.gained, []);
  assert.deepEqual(Object.keys(ms.data.skills), []);
});

test('all() merges catalog + practiced, sorted by fewest stars first', () => {
  const ms = mk();
  ms.sync('sight', 200, '视奏闪卡'); // 8 stars
  ms.sync('ear', 5, '音程听辨');     // 2 stars
  const catalog = [
    { id: 'sight', label: '视奏闪卡', icon: '👀' },
    { id: 'ear', label: '音程听辨', icon: '👂' },
    { id: 'scale', label: '音阶', icon: '🎼' }, // 0 stars
  ];
  const arr = ms.all(catalog);
  assert.equal(arr.length, 3);
  assert.equal(arr[0].id, 'scale'); // 0 stars first
  assert.equal(arr[0].stars, 0);
  assert.equal(arr[0].nextThreshold, 1);
  assert.equal(arr[0].toNext, 1);
  assert.equal(arr[1].id, 'ear');   // 2 stars
  assert.equal(arr[2].id, 'sight'); // 8 stars last
  assert.equal(arr[2].maxed, true);
  assert.equal(arr[2].nextThreshold, null);
  assert.equal(arr[0].icon, '🎼');
});

test('all() includes practiced skill not in catalog', () => {
  const ms = mk();
  ms.sync('boss', 30, 'Boss战');
  const arr = ms.all([{ id: 'sight', label: '视奏', icon: '👀' }]);
  const ids = arr.map((e) => e.id).sort();
  assert.deepEqual(ids, ['boss', 'sight']);
});

test('totalStars and counts aggregate correctly', () => {
  const ms = mk();
  ms.sync('a', 200, 'A'); // 8
  ms.sync('b', 5, 'B');   // 2
  const cat = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }]; // c=0
  assert.equal(ms.totalStars(cat), 10);
  const c = ms.counts(cat);
  assert.equal(c.earned, 10);
  assert.equal(c.skills, 3);
  assert.equal(c.max, 24); // 3*8
  assert.equal(c.maxed, 1); // only a
});

test('persistence: reload keeps stars and value', () => {
  const store = new MemoryStorage();
  const a = new MicroStars({ storage: store });
  a.sync('sight', 50, '视奏闪卡');
  const b = new MicroStars({ storage: store });
  assert.equal(b.starsOf('sight'), 5);
  assert.equal(b.valueOf('sight'), 50);
  assert.equal(b.data.skills['sight'].label, '视奏闪卡');
});

test('corrupt storage falls back to blank; reset clears', () => {
  const store = new MemoryStorage();
  store.setItem('ca99-microstars', 'oops{');
  const ms = new MicroStars({ storage: store });
  assert.deepEqual(ms.data, { skills: {} });
  ms.sync('x', 100, 'X');
  ms.reset();
  assert.deepEqual(ms.data.skills, {});
  assert.equal(ms.totalStars([]), 0);
});
