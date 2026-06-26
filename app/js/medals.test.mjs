import test from 'node:test';
import assert from 'node:assert/strict';
import { Medals, medalForResult, tierOf, MEDAL_TIERS } from './medals.js';
import { MemoryStorage } from './preset-store.js';

function mk() {
  let t = 1000;
  return new Medals({ storage: new MemoryStorage(), clock: () => (t += 1000) });
}

test('medalForResult thresholds', () => {
  assert.equal(medalForResult(0), 'none');
  assert.equal(medalForResult(49), 'none');
  assert.equal(medalForResult(50), 'bronze');
  assert.equal(medalForResult(69), 'bronze');
  assert.equal(medalForResult(70), 'silver');
  assert.equal(medalForResult(89), 'silver');
  assert.equal(medalForResult(90), 'gold');
  assert.equal(medalForResult(99), 'gold');
  assert.equal(medalForResult(100, false), 'gold'); // 100% 但非全 perfect 仍是金牌
  assert.equal(medalForResult(100, true), 'platinum');
});

test('medalForResult clamps out-of-range', () => {
  assert.equal(medalForResult(-10), 'none');
  assert.equal(medalForResult(150, true), 'platinum');
  assert.equal(medalForResult(NaN), 'none');
});

test('award is new on first play', () => {
  const m = mk();
  const r = m.award('twinkle', { accuracy: 60, title: '小星星' });
  assert.equal(r.isNew, true);
  assert.equal(r.medal, 'bronze');
  assert.equal(r.prevMedal, 'none');
  assert.equal(r.upgraded, true);
  assert.equal(r.plays, 1);
});

test('medal only goes up, never down', () => {
  const m = mk();
  m.award('ode', { accuracy: 95 });            // gold
  const r = m.award('ode', { accuracy: 40 });  // would be none, but must keep gold
  assert.equal(r.medal, 'gold');
  assert.equal(r.upgraded, false);
  assert.equal(r.plays, 2);
});

test('medal upgrades when better', () => {
  const m = mk();
  let r = m.award('mary', { accuracy: 55 });
  assert.equal(r.medal, 'bronze');
  r = m.award('mary', { accuracy: 72 });
  assert.equal(r.medal, 'silver');
  assert.equal(r.upgraded, true);
  r = m.award('mary', { accuracy: 91 });
  assert.equal(r.medal, 'gold');
  assert.equal(r.upgraded, true);
});

test('platinum requires all perfect at 100', () => {
  const m = mk();
  let r = m.award('jingle', { accuracy: 100, allPerfect: false });
  assert.equal(r.medal, 'gold');
  r = m.award('jingle', { accuracy: 100, allPerfect: true });
  assert.equal(r.medal, 'platinum');
  assert.equal(r.upgraded, true);
});

test('bestPct tracks max', () => {
  const m = mk();
  m.award('x', { accuracy: 60 });
  m.award('x', { accuracy: 88 });
  m.award('x', { accuracy: 50 });
  assert.equal(m.medalOf('x').bestPct, 88);
});

test('counts per tier', () => {
  const m = mk();
  m.award('a', { accuracy: 95 });   // gold
  m.award('b', { accuracy: 75 });   // silver
  m.award('c', { accuracy: 55 });   // bronze
  m.award('d', { accuracy: 100, allPerfect: true }); // platinum
  m.award('e', { accuracy: 30 });   // none — not counted
  const c = m.counts();
  assert.equal(c.gold, 1);
  assert.equal(c.silver, 1);
  assert.equal(c.bronze, 1);
  assert.equal(c.platinum, 1);
  assert.equal(c.total, 4);
});

test('all() sorted by tier then pct', () => {
  const m = mk();
  m.award('low', { accuracy: 55 });
  m.award('high', { accuracy: 95 });
  m.award('mid', { accuracy: 75 });
  const ids = m.all().map((x) => x.id);
  assert.deepEqual(ids, ['high', 'mid', 'low']);
});

test('persists across instances via shared storage', () => {
  const storage = new MemoryStorage();
  const m1 = new Medals({ storage });
  m1.award('s', { accuracy: 92, title: 'Song' });
  const m2 = new Medals({ storage });
  assert.equal(m2.medalOf('s').medal, 'gold');
  assert.equal(m2.medalOf('s').title, 'Song');
});

test('reset clears all', () => {
  const m = mk();
  m.award('s', { accuracy: 92 });
  m.reset();
  assert.equal(m.medalOf('s'), null);
  assert.equal(m.counts().total, 0);
});

test('tierOf returns none for unknown', () => {
  assert.equal(tierOf('bogus').id, 'none');
  assert.equal(tierOf('gold').rank, 3);
  assert.equal(MEDAL_TIERS.length, 5);
});

test('unknown songId falls back without throwing', () => {
  const m = mk();
  const r = m.award('', { accuracy: 80 });
  assert.equal(r.medal, 'silver');
  assert.equal(m.medalOf('unknown').medal, 'silver');
});
