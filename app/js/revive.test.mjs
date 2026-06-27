import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_REVIVES, dayKey, ReviveBank } from './revive.js';

function memStore(initial = null) {
  let v = initial;
  return { get: () => v, set: (x) => { v = x; }, _peek: () => v };
}

test('dayKey formats local YYYY-MM-DD zero-padded', () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('fresh bank starts with perDay coins', () => {
  const b = new ReviveBank({ perDay: 5 });
  assert.equal(b.coinsLeft(), 5);
  assert.equal(b.canRevive(), true);
});

test('DAILY_REVIVES default applied', () => {
  const b = new ReviveBank();
  assert.equal(b.coinsLeft(), DAILY_REVIVES);
});

test('useRevive decrements and returns true while coins remain', () => {
  const b = new ReviveBank({ perDay: 2 });
  assert.equal(b.useRevive(), true);
  assert.equal(b.coinsLeft(), 1);
  assert.equal(b.useRevive(), true);
  assert.equal(b.coinsLeft(), 0);
});

test('useRevive returns false when empty, no negative', () => {
  const b = new ReviveBank({ perDay: 1 });
  assert.equal(b.useRevive(), true);
  assert.equal(b.useRevive(), false);
  assert.equal(b.coinsLeft(), 0);
  assert.equal(b.canRevive(), false);
});

test('persists to store across instances same day', () => {
  const s = memStore();
  const b1 = new ReviveBank({ perDay: 5, store: s });
  b1.useRevive();
  b1.useRevive();
  const b2 = new ReviveBank({ perDay: 5, store: s });
  assert.equal(b2.coinsLeft(), 3);
});

test('refills when stored day is stale', () => {
  let day = new Date(2026, 5, 1, 10, 0, 0);
  const s = memStore();
  const b = new ReviveBank({ perDay: 5, store: s, now: () => day });
  b.useRevive(); b.useRevive(); b.useRevive();
  assert.equal(b.coinsLeft(), 2);
  // advance one day
  day = new Date(2026, 5, 2, 9, 0, 0);
  assert.equal(b.coinsLeft(), 5);
});

test('crossing midnight via coinsLeft refreshes', () => {
  let now = new Date(2026, 5, 1, 23, 59, 0);
  const b = new ReviveBank({ perDay: 3, now: () => now });
  b.useRevive();
  assert.equal(b.coinsLeft(), 2);
  now = new Date(2026, 5, 2, 0, 1, 0);
  assert.equal(b.canRevive(), true);
  assert.equal(b.coinsLeft(), 3);
});

test('clamps oversized stored value when perDay shrinks', () => {
  const s = memStore(JSON.stringify({ day: dayKey(new Date()), left: 99 }));
  const b = new ReviveBank({ perDay: 5, store: s });
  assert.equal(b.coinsLeft(), 5);
});

test('ignores corrupt stored json', () => {
  const s = memStore('not-json{');
  const b = new ReviveBank({ perDay: 4, store: s });
  assert.equal(b.coinsLeft(), 4);
});

test('reset restores full pool', () => {
  const b = new ReviveBank({ perDay: 5 });
  b.useRevive(); b.useRevive();
  b.reset();
  assert.equal(b.coinsLeft(), 5);
});

test('perDay 0 means no revives available', () => {
  const b = new ReviveBank({ perDay: 0 });
  assert.equal(b.coinsLeft(), 0);
  assert.equal(b.canRevive(), false);
  assert.equal(b.useRevive(), false);
});
