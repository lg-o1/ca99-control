import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES, mondayOf, weekKey, weekIndex, themeForWeek, weekRange,
  msToWeekEnd, taskDone, questComplete, questPercent, applyPractice,
} from './weekly-quest.js';

test('THEMES well-formed with non-empty tasks', () => {
  assert.ok(THEMES.length >= 4);
  for (const th of THEMES) {
    assert.ok(th.id && th.name && th.emoji && th.tasks.length >= 1, th.id);
    for (const t of th.tasks) {
      assert.ok(t.id && t.label && t.module && t.goal >= 1, `${th.id}.${t.id}`);
    }
  }
});

test('mondayOf returns the Monday of the week', () => {
  // 2026-06-26 is a Friday -> Monday is 2026-06-22
  const m = mondayOf(new Date(2026, 5, 26));
  assert.equal(m.getFullYear(), 2026);
  assert.equal(m.getMonth(), 5);
  assert.equal(m.getDate(), 22);
  assert.equal(m.getDay(), 1); // Monday
});

test('mondayOf on a Monday stays the same day', () => {
  const m = mondayOf(new Date(2026, 5, 22));
  assert.equal(m.getDate(), 22);
});

test('mondayOf on a Sunday goes back to prior Monday', () => {
  // 2026-06-28 is a Sunday -> Monday 2026-06-22
  const m = mondayOf(new Date(2026, 5, 28));
  assert.equal(m.getDate(), 22);
});

test('weekKey stable across the same week, changes next week', () => {
  const a = weekKey(new Date(2026, 5, 22, 9));   // Mon
  const b = weekKey(new Date(2026, 5, 28, 23));  // Sun same week
  const c = weekKey(new Date(2026, 5, 29, 1));   // next Mon
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.equal(a, '2026-06-22');
});

test('themeForWeek rotates through all themes', () => {
  const seen = new Set();
  let d = new Date(2026, 0, 5); // a Monday
  for (let i = 0; i < THEMES.length; i++) {
    seen.add(themeForWeek(d).id);
    d = new Date(d.getTime() + 7 * 86400000);
  }
  assert.equal(seen.size, THEMES.length);
});

test('consecutive weeks pick consecutive themes', () => {
  const d1 = new Date(2026, 5, 22);
  const d2 = new Date(2026, 5, 29);
  const i1 = THEMES.findIndex((t) => t.id === themeForWeek(d1).id);
  const i2 = THEMES.findIndex((t) => t.id === themeForWeek(d2).id);
  assert.equal(i2, (i1 + 1) % THEMES.length);
});

test('weekRange spans Monday 0:00 to Sunday end', () => {
  const { start, end } = weekRange(new Date(2026, 5, 26));
  assert.equal(start.getDate(), 22);
  assert.equal(start.getHours(), 0);
  assert.equal(end.getDate(), 28);
  assert.ok(end.getTime() - start.getTime() < 7 * 86400000);
});

test('msToWeekEnd is positive mid-week and small near the end', () => {
  const mid = new Date(2026, 5, 24, 12);
  assert.ok(msToWeekEnd(mid) > 0);
  const { end } = weekRange(mid);
  const justBefore = new Date(end.getTime() - 500);
  const left = msToWeekEnd(justBefore);
  assert.ok(left > 0 && left <= 600);
});

test('taskDone respects goal threshold', () => {
  const t = { id: 'x', goal: 3 };
  assert.equal(taskDone(t, { x: 2 }), false);
  assert.equal(taskDone(t, { x: 3 }), true);
  assert.equal(taskDone(t, {}), false);
});

test('questComplete only when all tasks done', () => {
  const th = THEMES[0];
  const full = {};
  for (const t of th.tasks) full[t.id] = t.goal;
  assert.equal(questComplete(th, full), true);
  const partial = { ...full }; partial[th.tasks[0].id] = 0;
  assert.equal(questComplete(th, partial), false);
});

test('questPercent caps counts at goal', () => {
  const th = THEMES[0];
  assert.equal(questPercent(th, {}), 0);
  const over = {};
  for (const t of th.tasks) over[t.id] = t.goal + 5; // overshoot
  assert.equal(questPercent(th, over), 1);
});

test('applyPractice increments only matching incomplete tasks, capped', () => {
  const th = THEMES[0]; // penta: magicjam goal4, scale goal2, trans goal1
  let p = {};
  p = applyPractice(th, p, 'magicjam');
  assert.equal(p.mj, 1);
  assert.equal(p.sc, undefined); // unrelated untouched
  // cap at goal
  p = { mj: 4 };
  const after = applyPractice(th, p, 'magicjam');
  assert.equal(after.mj, 4);
  // unknown module is a no-op (new object still)
  const noop = applyPractice(th, { mj: 1 }, 'nope');
  assert.deepEqual(noop, { mj: 1 });
});

test('applyPractice does not mutate input progress', () => {
  const th = THEMES[0];
  const p = { mj: 1 };
  const out = applyPractice(th, p, 'magicjam');
  assert.equal(p.mj, 1);
  assert.equal(out.mj, 2);
  assert.notEqual(p, out);
});
