import test from 'node:test';
import assert from 'node:assert/strict';
import { PET_STAGES, petXp, stageIndexFor, stageFor, nextStageOf, progressToNext, moodFor, petSummary } from './pet-grow.js';

test('PET_STAGES are ascending thresholds, first is egg at 0', () => {
  assert.equal(PET_STAGES[0].min, 0);
  assert.equal(PET_STAGES[0].id, 'egg');
  for (let i = 1; i < PET_STAGES.length; i++) {
    assert.ok(PET_STAGES[i].min > PET_STAGES[i - 1].min);
  }
});

test('petXp derives from cumulative stats (same as XP system)', () => {
  const xp = petXp({ totalCorrect: 10, totalSessions: 2, modulesPlayed: 1, dayStreak: 1, achievements: 0 });
  assert.ok(xp > 0);
  assert.equal(petXp({}), 0);
});

test('stageIndexFor returns highest stage at/under xp', () => {
  assert.equal(stageIndexFor(0), 0);     // egg
  assert.equal(stageIndexFor(59), 0);
  assert.equal(stageIndexFor(60), 1);    // chick
  assert.equal(stageIndexFor(159), 1);
  assert.equal(stageIndexFor(160), 2);
  assert.equal(stageIndexFor(99999), PET_STAGES.length - 1);
});

test('stageIndexFor clamps negative xp to egg', () => {
  assert.equal(stageIndexFor(-50), 0);
});

test('stageFor returns the stage object', () => {
  assert.equal(stageFor(0).id, 'egg');
  assert.equal(stageFor(60).id, 'chick');
  assert.equal(stageFor(2200).id, 'eagle');
});

test('nextStageOf returns next stage, null when maxed', () => {
  assert.equal(nextStageOf(0).id, 'chick');
  assert.equal(nextStageOf(60).id, 'bird');
  assert.equal(nextStageOf(99999), null);
});

test('progressToNext computes fraction toward next evolution', () => {
  const p = progressToNext(0);
  assert.equal(p.maxed, false);
  assert.equal(p.span, 60);
  assert.equal(p.into, 0);
  assert.equal(p.toNext, 60);
  assert.equal(p.frac, 0);
});

test('progressToNext mid-way', () => {
  const p = progressToNext(110);   // between chick(60) and bird(160), span 100, into 50
  assert.equal(p.into, 50);
  assert.equal(p.span, 100);
  assert.equal(p.frac, 0.5);
  assert.equal(p.toNext, 50);
});

test('progressToNext when maxed', () => {
  const p = progressToNext(99999);
  assert.equal(p.maxed, true);
  assert.equal(p.frac, 1);
  assert.equal(p.toNext, 0);
});

test('moodFor is gentle — happy today, missing-you otherwise (never sad)', () => {
  const happy = moodFor({ practicedToday: true });
  const miss = moodFor({ practicedToday: false });
  assert.equal(happy.emoji, '😍');
  assert.equal(miss.emoji, '😴');
  assert.ok(happy.text.length > 0 && miss.text.length > 0);
});

test('petSummary bundles stage/next/progress/mood', () => {
  const s = petSummary({ totalCorrect: 5 }, { practicedToday: true });
  assert.ok(s.stage);
  assert.ok('frac' in s.progress);
  assert.equal(s.mood.emoji, '😍');
  assert.equal(typeof s.xp, 'number');
});

test('petSummary detects evolution when stage advances past lastStageId', () => {
  // xp high enough for bird (>=160). lastStageId egg → evolved true.
  const s = petSummary({ totalCorrect: 100 }, { lastStageId: 'egg' });
  assert.equal(s.evolved, true);
});

test('petSummary no false evolution when same stage', () => {
  const s = petSummary({ totalCorrect: 100 }, { lastStageId: stageFor(petXp({ totalCorrect: 100 })).id });
  assert.equal(s.evolved, false);
});

test('petSummary no evolution flag without lastStageId baseline', () => {
  const s = petSummary({ totalCorrect: 100 }, {});
  assert.equal(s.evolved, false);
});
