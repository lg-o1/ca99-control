import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  daysBetween, heatLevel, currentStreak, longestStreak,
  comebackGap, buildCalendar, streakSummary,
} from './streak-calendar.js';

// 工具：从 today 往回造 n 天连续练习的 map（每天 1 次）
function consecutive(todayKey, n, perDay = 1) {
  const m = {};
  const [y, mo, d] = todayKey.split('-').map(Number);
  const base = Date.UTC(y, mo - 1, d);
  for (let i = 0; i < n; i++) {
    const dt = new Date(base - i * 86400000);
    const k = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
    m[k] = perDay;
  }
  return m;
}

test('daysBetween counts calendar days (UTC, DST-safe)', () => {
  assert.equal(daysBetween('2026-03-01', '2026-03-02'), 1);
  assert.equal(daysBetween('2026-03-08', '2026-03-09'), 1); // US DST spring-forward
  assert.equal(daysBetween('2026-01-31', '2026-02-01'), 1);
  assert.equal(daysBetween('2026-06-25', '2026-06-25'), 0);
});

test('heatLevel buckets sessions 0..4', () => {
  assert.equal(heatLevel(0), 0);
  assert.equal(heatLevel(1), 1);
  assert.equal(heatLevel(2), 2);
  assert.equal(heatLevel(3), 3);
  assert.equal(heatLevel(4), 3);
  assert.equal(heatLevel(7), 4);
});

test('currentStreak: empty map is 0', () => {
  assert.equal(currentStreak({}, '2026-06-25'), 0);
});

test('currentStreak: consecutive days incl today', () => {
  const m = consecutive('2026-06-25', 3);
  assert.equal(currentStreak(m, '2026-06-25'), 3);
});

test('currentStreak: last practice was yesterday still counts (no freeze needed)', () => {
  const m = consecutive('2026-06-24', 3); // newest = yesterday
  assert.equal(currentStreak(m, '2026-06-25', 0), 3);
});

test('currentStreak: missed yesterday breaks without forgive, survives with forgive', () => {
  const m = consecutive('2026-06-23', 3); // newest = 2 days ago (yesterday missed)
  assert.equal(currentStreak(m, '2026-06-25', 0), 0);
  assert.equal(currentStreak(m, '2026-06-25', 1), 3); // freeze the 1 missed day
});

test('currentStreak: forgive bridges an internal one-day gap', () => {
  // practiced today, yesterday, then gap, then two more
  const m = { '2026-06-25': 1, '2026-06-24': 1, '2026-06-22': 1, '2026-06-21': 1 };
  assert.equal(currentStreak(m, '2026-06-25', 0), 2); // breaks at the gap
  assert.equal(currentStreak(m, '2026-06-25', 1), 4); // freeze bridges 06-23
});

test('longestStreak finds the longest historical run', () => {
  const m = {
    '2026-06-01': 1, '2026-06-02': 1, '2026-06-03': 1, // run of 3
    '2026-06-10': 1, '2026-06-11': 1,                  // run of 2
    '2026-06-20': 1,                                    // run of 1
  };
  assert.equal(longestStreak(m), 3);
  assert.equal(longestStreak({}), 0);
});

test('comebackGap reflects days since previous (pre-today) practice', () => {
  const m = { '2026-06-20': 1, '2026-06-25': 1 };
  assert.equal(comebackGap(m, '2026-06-25'), 5); // last before today was 06-20
  assert.equal(comebackGap({ '2026-06-25': 1 }, '2026-06-25'), 0); // no earlier history
});

test('buildCalendar: today sits in the last week row, grid is weeks*7', () => {
  const cal = buildCalendar(consecutive('2026-06-25', 5), '2026-06-25', { weeks: 5, weekStart: 0 });
  assert.equal(cal.weeks.length, 5);
  cal.weeks.forEach((w) => assert.equal(w.length, 7));
  const lastRow = cal.weeks[4];
  const todayCell = lastRow.find((c) => c.isToday);
  assert.ok(todayCell, 'today must be in the last week row');
  // 2026-06-25 is a Thursday (dow 4); weekStart=0 -> column index 4
  assert.equal(todayCell.dow, 4);
});

test('buildCalendar: future cells flagged, activeInRange excludes them', () => {
  const cal = buildCalendar(consecutive('2026-06-25', 3), '2026-06-25', { weeks: 2, weekStart: 0 });
  const flat = cal.weeks.flat();
  const future = flat.filter((c) => c.inFuture);
  assert.ok(future.length > 0, 'Thursday today means Fri/Sat are future');
  future.forEach((c) => assert.equal(c.practiced, false));
  assert.equal(cal.activeInRange, 3); // 3 consecutive practiced, all within range & not future
});

test('buildCalendar: cell levels reflect session counts', () => {
  const cal = buildCalendar({ '2026-06-25': 5 }, '2026-06-25', { weeks: 1 });
  const cell = cal.weeks.flat().find((c) => c.isToday);
  assert.equal(cell.level, 4);
  assert.equal(cell.sessions, 5);
});

test('streakSummary: defaults to 1 forgive token, flags forgiveUsed', () => {
  const m = consecutive('2026-06-23', 3); // missed yesterday
  const s = streakSummary(m, '2026-06-25'); // default tokens = 1
  assert.equal(s.strict, 0);
  assert.equal(s.current, 3);
  assert.equal(s.forgiveUsed, true);
  assert.equal(s.forgiveTokens, 1);
  assert.equal(s.practicedToday, false);
  assert.equal(s.longest, 3);
  assert.equal(s.activeDays, 3);
});

test('streakSummary: practicedToday + no forgive used on clean streak', () => {
  const m = consecutive('2026-06-25', 4);
  const s = streakSummary(m, '2026-06-25', { forgiveTokens: 1 });
  assert.equal(s.current, 4);
  assert.equal(s.strict, 4);
  assert.equal(s.forgiveUsed, false);
  assert.equal(s.practicedToday, true);
  assert.equal(s.comebackGap, 1); // yesterday was practiced
});
