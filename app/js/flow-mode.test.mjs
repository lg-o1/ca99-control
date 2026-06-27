import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FlowSession, HESITATION_MS, gradeFor, encourage } from './flow-mode.js';

test('fresh session has zeroed stats', () => {
  const s = new FlowSession();
  assert.equal(s.notes, 0);
  assert.equal(s.durationMs(), 0);
  assert.equal(s.flowScore(), 0);
});

test('note before start is ignored', () => {
  const s = new FlowSession();
  s.note(100);
  assert.equal(s.notes, 0);
});

test('counts notes and tracks duration', () => {
  const s = new FlowSession().start(0);
  s.note(0); s.note(300); s.note(600); s.note(900);
  assert.equal(s.notes, 4);
  assert.equal(s.durationMs(), 900);
});

test('single note duration is 0, score 100', () => {
  const s = new FlowSession().start(0);
  s.note(0);
  assert.equal(s.durationMs(), 0);
  assert.equal(s.flowScore(), 100);
});

test('no hesitation = best streak equals notes', () => {
  const s = new FlowSession().start(0);
  for (let i = 0; i < 10; i++) s.note(i * 200); // all gaps 200ms < threshold
  assert.equal(s.hesitations, 0);
  assert.equal(s.bestStreak, 10);
  assert.equal(s.flowScore(), 100);
});

test('detects hesitation when gap exceeds threshold', () => {
  const s = new FlowSession({ hesitationMs: 1000 }).start(0);
  const r1 = s.note(0);
  const r2 = s.note(500);
  const r3 = s.note(2000); // gap 1500 > 1000 => hesitation
  assert.equal(r1.hesitated, false);
  assert.equal(r2.hesitated, false);
  assert.equal(r3.hesitated, true);
  assert.equal(s.hesitations, 1);
});

test('hesitation resets current streak but keeps best', () => {
  const s = new FlowSession({ hesitationMs: 1000 }).start(0);
  s.note(0); s.note(200); s.note(400);      // streak 3
  s.note(2000);                              // hesitation -> streak resets to 1
  s.note(2200);                              // streak 2
  assert.equal(s.bestStreak, 3);
  assert.equal(s.curStreak, 2);
});

test('default threshold constant', () => {
  assert.equal(HESITATION_MS, 1200);
});

test('end() returns a full report', () => {
  const s = new FlowSession().start(0);
  for (let i = 0; i < 8; i++) s.note(i * 250);
  const rep = s.end(2000);
  assert.equal(rep.notes, 8);
  assert.equal(rep.hesitations, 0);
  assert.equal(rep.flowScore, 100);
  assert.ok(rep.grade.emoji);
  assert.ok(typeof rep.message === 'string' && rep.message.length > 0);
  assert.equal(s.running, false);
});

test('flowScore penalizes many hesitations', () => {
  const s = new FlowSession({ hesitationMs: 500 }).start(0);
  // 6 notes, big gaps -> many hesitations
  let t = 0;
  for (let i = 0; i < 6; i++) { s.note(t); t += 1000; }
  assert.ok(s.hesitations >= 4);
  assert.ok(s.flowScore() < 50);
});

test('gradeFor thresholds', () => {
  assert.equal(gradeFor(90).label, '一气呵成');
  assert.equal(gradeFor(70).label, '很流畅');
  assert.equal(gradeFor(50).label, '渐入佳境');
  assert.equal(gradeFor(10).label, '慢慢来');
});

test('encourage is always non-empty and supportive', () => {
  assert.ok(encourage(95, 0).length > 0);
  assert.ok(encourage(50, 3).includes('没关系'));
  assert.ok(encourage(20, 5).length > 0);
});

test('reset clears a used session', () => {
  const s = new FlowSession().start(0);
  s.note(0); s.note(300);
  s.reset();
  assert.equal(s.notes, 0);
  assert.equal(s.running, false);
});
