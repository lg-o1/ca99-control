import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  XP_WEIGHTS, LEVEL_TITLES,
  xpFromStats, levelXpNeeded, xpThreshold, titleForLevel,
  levelFromXp, levelFromStats, xpBreakdown,
} from './xp-level.js';

test('xpFromStats: zero stats -> 0', () => {
  assert.equal(xpFromStats({}), 0);
  assert.equal(xpFromStats({ totalCorrect: 0, totalSessions: 0 }), 0);
});

test('xpFromStats: weighted sum', () => {
  const s = { totalCorrect: 10, totalSessions: 3, modulesPlayed: 2, dayStreak: 4, achievements: 1 };
  const expect = 10 * 2 + 3 * 10 + 2 * 30 + 4 * 15 + 1 * 50;
  assert.equal(xpFromStats(s), expect);
});

test('xpFromStats: monotonic in each field', () => {
  const base = { totalCorrect: 5, totalSessions: 1, modulesPlayed: 1, dayStreak: 1, achievements: 0 };
  const more = { ...base, totalCorrect: 6 };
  assert.ok(xpFromStats(more) > xpFromStats(base));
});

test('levelXpNeeded: grows with level', () => {
  assert.equal(levelXpNeeded(1), 60);
  assert.equal(levelXpNeeded(2), 100);
  assert.ok(levelXpNeeded(5) > levelXpNeeded(1));
});

test('xpThreshold: cumulative', () => {
  assert.equal(xpThreshold(1), 0);
  assert.equal(xpThreshold(2), 60);
  assert.equal(xpThreshold(3), 60 + 100);
});

test('levelFromXp: 0 xp -> level 1, progress 0', () => {
  const r = levelFromXp(0);
  assert.equal(r.level, 1);
  assert.equal(r.intoLevel, 0);
  assert.equal(r.span, 60);
  assert.equal(r.toNext, 60);
  assert.equal(r.progress, 0);
});

test('levelFromXp: crossing threshold bumps level', () => {
  assert.equal(levelFromXp(59).level, 1);
  assert.equal(levelFromXp(60).level, 2);
  assert.equal(levelFromXp(159).level, 2);
  assert.equal(levelFromXp(160).level, 3);
});

test('levelFromXp: mid-level progress within [0,1]', () => {
  const r = levelFromXp(90); // level 2, base 60, span 100, into 30
  assert.equal(r.level, 2);
  assert.equal(r.intoLevel, 30);
  assert.equal(r.span, 100);
  assert.equal(r.toNext, 70);
  assert.ok(r.progress > 0.29 && r.progress < 0.31);
});

test('titleForLevel: clamps to last title', () => {
  assert.deepEqual(titleForLevel(1), LEVEL_TITLES[0]);
  assert.deepEqual(titleForLevel(LEVEL_TITLES.length), LEVEL_TITLES[LEVEL_TITLES.length - 1]);
  assert.deepEqual(titleForLevel(999), LEVEL_TITLES[LEVEL_TITLES.length - 1]);
  assert.deepEqual(titleForLevel(0), LEVEL_TITLES[0]);
});

test('levelFromStats: matches xpFromStats path', () => {
  const s = { totalCorrect: 50, totalSessions: 10, modulesPlayed: 5, dayStreak: 3, achievements: 2 };
  assert.deepEqual(levelFromStats(s), levelFromXp(xpFromStats(s)));
});

test('xpBreakdown: sums to total xp', () => {
  const s = { totalCorrect: 12, totalSessions: 4, modulesPlayed: 3, dayStreak: 2, achievements: 1 };
  const parts = xpBreakdown(s);
  assert.equal(parts.length, 5);
  const sum = parts.reduce((a, p) => a + p.xp, 0);
  assert.equal(sum, xpFromStats(s));
});

test('XP_WEIGHTS shape', () => {
  for (const k of ['correct', 'session', 'module', 'streakDay', 'achievement']) {
    assert.ok(XP_WEIGHTS[k] > 0);
  }
});
