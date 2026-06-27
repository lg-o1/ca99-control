import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MemoryStorage } from './preset-store.js';
import {
  WEEK_PLAN, TOTAL_DAYS, dayPlan, storageKey, WeekMaster,
} from './week-master.js';

test('WEEK_PLAN has 7 sequential days with required fields', () => {
  assert.equal(WEEK_PLAN.length, 7);
  assert.equal(TOTAL_DAYS, 7);
  WEEK_PLAN.forEach((d, i) => {
    assert.equal(d.day, i + 1);
    assert.ok(d.icon && d.title && d.focus && d.hint);
  });
});

test('dayPlan returns template or null', () => {
  assert.equal(dayPlan(1).focus, 'melody');
  assert.equal(dayPlan(7).focus, 'recital');
  assert.equal(dayPlan(0), null);
  assert.equal(dayPlan(8), null);
});

test('storageKey is per-song', () => {
  assert.equal(storageKey('abc'), 'ca99-week-abc');
  assert.notEqual(storageKey('a'), storageKey('b'));
});

test('markDone is first-time true, then idempotent false', () => {
  const wm = new WeekMaster({ songId: 's1', storage: new MemoryStorage(), clock: () => 100 });
  assert.equal(wm.isDone(1), false);
  assert.equal(wm.markDone(1), true);
  assert.equal(wm.isDone(1), true);
  assert.equal(wm.markDone(1), false);
  assert.equal(wm.done['1'], 100);
});

test('markDone rejects out-of-range days', () => {
  const wm = new WeekMaster({ storage: new MemoryStorage() });
  assert.equal(wm.markDone(0), false);
  assert.equal(wm.markDone(8), false);
  assert.equal(wm.doneCount(), 0);
});

test('unmark and toggle', () => {
  const wm = new WeekMaster({ storage: new MemoryStorage() });
  wm.markDone(2);
  assert.equal(wm.toggle(2), false); // was done -> now undone
  assert.equal(wm.isDone(2), false);
  assert.equal(wm.toggle(2), true);  // was undone -> now done
  assert.equal(wm.isDone(2), true);
  assert.equal(wm.unmark(2), true);
  assert.equal(wm.unmark(2), false);
});

test('currentDay is first unfinished, null when complete', () => {
  const wm = new WeekMaster({ storage: new MemoryStorage() });
  assert.equal(wm.currentDay(), 1);
  wm.markDone(1); wm.markDone(2);
  assert.equal(wm.currentDay(), 3);
  for (let d = 1; d <= 7; d++) wm.markDone(d);
  assert.equal(wm.currentDay(), null);
  assert.equal(wm.isComplete(), true);
});

test('percent and doneCount', () => {
  const wm = new WeekMaster({ storage: new MemoryStorage() });
  assert.equal(wm.percent(), 0);
  wm.markDone(1); wm.markDone(2); wm.markDone(3); wm.markDone(4); // 4/7
  assert.equal(wm.doneCount(), 4);
  assert.equal(wm.percent(), 57);
});

test('view marks done/current correctly', () => {
  const wm = new WeekMaster({ storage: new MemoryStorage() });
  wm.markDone(1);
  const v = wm.view();
  assert.equal(v.length, 7);
  assert.equal(v[0].done, true);
  assert.equal(v[0].current, false);
  assert.equal(v[1].current, true); // day 2 is first unfinished
});

test('state persists across instances via storage', () => {
  const storage = new MemoryStorage();
  const a = new WeekMaster({ songId: 'song', storage });
  a.markDone(1); a.markDone(5);
  const b = new WeekMaster({ songId: 'song', storage });
  assert.equal(b.isDone(1), true);
  assert.equal(b.isDone(5), true);
  assert.equal(b.doneCount(), 2);
});

test('reset clears progress', () => {
  const wm = new WeekMaster({ storage: new MemoryStorage() });
  wm.markDone(1); wm.markDone(2);
  wm.reset();
  assert.equal(wm.doneCount(), 0);
  assert.equal(wm.currentDay(), 1);
});

test('different songs are isolated', () => {
  const storage = new MemoryStorage();
  const a = new WeekMaster({ songId: 'A', storage });
  const b = new WeekMaster({ songId: 'B', storage });
  a.markDone(1);
  assert.equal(b.isDone(1), false);
});
