import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  splitWeeks, summariseWeek, trendOf, topModules, coverageOf,
  highlightLines, parentPraise, buildParentReport,
} from './parent-weekly.js';

function days(arr) { return arr.map((n, i) => ({ day: 'd' + i, sessions: n })); }

test('summariseWeek sums sessions, counts active days, finds busiest', () => {
  const w = summariseWeek(days([2, 0, 3, 1, 0, 0, 4]));
  assert.equal(w.sessions, 10);
  assert.equal(w.activeDays, 4);
  assert.equal(w.busiest, 4);
  assert.equal(w.perDay.length, 7);
});

test('summariseWeek handles empty/garbage', () => {
  const w = summariseWeek(null);
  assert.equal(w.sessions, 0);
  assert.equal(w.activeDays, 0);
  assert.deepEqual(w.perDay, []);
});

test('splitWeeks splits last 14 into two 7-day weeks', () => {
  const { lastWeek, thisWeek } = splitWeeks(days([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2]));
  assert.equal(lastWeek.sessions, 7);
  assert.equal(thisWeek.sessions, 14);
});

test('splitWeeks pads when fewer than 14 days given', () => {
  const { lastWeek, thisWeek } = splitWeeks(days([3, 4, 5]));
  // 3 days -> they land at the END (this week)
  assert.equal(lastWeek.sessions, 0);
  assert.equal(thisWeek.sessions, 12);
});

test('trendOf: more this week = up with delta', () => {
  const t = trendOf(10, 6);
  assert.equal(t.dir, 'up');
  assert.equal(t.delta, 4);
  assert.match(t.text, /多练了 4 次/);
});

test('trendOf: first week practicing', () => {
  const t = trendOf(5, 0);
  assert.equal(t.dir, 'up');
  assert.match(t.text, /开练/);
});

test('trendOf: rested this week is gentle, never shaming', () => {
  const t = trendOf(0, 8);
  assert.equal(t.dir, 'rest');
  assert.doesNotMatch(t.text, /退步|差|少/);
});

test('trendOf: same as last week = flat', () => {
  const t = trendOf(7, 7);
  assert.equal(t.dir, 'flat');
});

test('topModules returns top n played, descending', () => {
  const top = topModules([
    { label: 'A', sessions: 3 },
    { label: 'B', sessions: 9 },
    { label: 'C', sessions: 0 },
    { label: 'D', sessions: 5 },
  ], 2);
  assert.equal(top.length, 2);
  assert.equal(top[0].label, 'B');
  assert.equal(top[1].label, 'D');
});

test('topModules filters out never-played (0 sessions)', () => {
  const top = topModules([{ label: 'X', sessions: 0 }], 3);
  assert.equal(top.length, 0);
});

test('coverageOf derives practiced/needReview/never', () => {
  const c = coverageOf({ fresh: 2, recent: 1, fading: 3, stale: 4, never: 5, total: 15 });
  assert.equal(c.total, 15);
  assert.equal(c.never, 5);
  assert.equal(c.practiced, 10);
  assert.equal(c.needReview, 7);
  assert.equal(c.fresh, 2);
});

test('highlightLines praises 5+ active days', () => {
  const lines = highlightLines({
    thisWeek: { activeDays: 6 }, dayStreak: 0, bestStreak: 0, accuracyPct: 0,
    top: [], coverage: { needReview: 0 },
  });
  assert.match(lines[0], /天天/);
});

test('highlightLines includes streak + top module + review hint, capped at 4', () => {
  const lines = highlightLines({
    thisWeek: { activeDays: 4 }, dayStreak: 5, bestStreak: 12, accuracyPct: 80,
    top: [{ label: '视奏闪卡' }], coverage: { needReview: 2 },
  });
  assert.ok(lines.length <= 4);
  assert.ok(lines.some((l) => l.includes('连续练习 5 天')));
  assert.ok(lines.some((l) => l.includes('视奏闪卡')));
});

test('highlightLines never empty', () => {
  const lines = highlightLines({
    thisWeek: { activeDays: 0 }, dayStreak: 0, bestStreak: 0, accuracyPct: 0,
    top: [], coverage: { needReview: 0 },
  });
  assert.ok(lines.length >= 1);
});

test('parentPraise is deterministic and wraps', () => {
  assert.equal(parentPraise(0), parentPraise(4));
  assert.equal(typeof parentPraise(1), 'string');
  assert.equal(parentPraise(-1), parentPraise(3));
});

test('buildParentReport assembles a full report', () => {
  const rep = buildParentReport({
    days14: days([1, 1, 0, 0, 0, 0, 0, 2, 2, 2, 0, 1, 0, 3]),
    moduleStats: [
      { label: '视奏闪卡', sessions: 12, accuracy: 0.8 },
      { label: '音程听辨', sessions: 7, accuracy: 0.6 },
    ],
    snapshot: { dayStreak: 4, bestStreak: 15, accuracy: 0.75, totalSessions: 40, modulesPlayed: 6 },
    heatCounts: { fresh: 3, recent: 1, fading: 2, stale: 1, never: 4, total: 11 },
  });
  assert.equal(rep.thisWeek.sessions, 10);
  assert.equal(rep.lastWeek.sessions, 2);
  assert.equal(rep.trend.dir, 'up');
  assert.equal(rep.dayStreak, 4);
  assert.equal(rep.bestStreak, 15);
  assert.equal(rep.accuracyPct, 75);
  assert.equal(rep.top[0].label, '视奏闪卡');
  assert.equal(rep.coverage.practiced, 7);
  assert.equal(rep.coverage.needReview, 3);
  assert.ok(rep.highlights.length >= 1);
  assert.equal(typeof rep.praise, 'string');
});

test('buildParentReport handles empty input gracefully', () => {
  const rep = buildParentReport({});
  assert.equal(rep.thisWeek.sessions, 0);
  assert.equal(rep.top.length, 0);
  assert.equal(rep.coverage.total, 0);
  assert.ok(rep.highlights.length >= 1);
});
