import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FamilyDuel, DEFAULT_PLAYERS, pitchClass } from './family-duel.js';

test('DEFAULT_PLAYERS shape', () => {
  assert.equal(DEFAULT_PLAYERS.length, 2);
  for (const p of DEFAULT_PLAYERS) {
    assert.equal(typeof p.name, 'string');
    assert.equal(typeof p.emoji, 'string');
  }
});

test('pitchClass normalizes octaves', () => {
  assert.equal(pitchClass(60), 0);
  assert.equal(pitchClass(72), 0);
  assert.equal(pitchClass(62), 2);
});

test('turnOrder alternates players for N rounds', () => {
  const d = new FamilyDuel({ rounds: 3 });
  assert.deepEqual(d.turnOrder, [0, 1, 0, 1, 0, 1]);
  assert.equal(d.totalTurns, 6);
  assert.equal(d.currentPlayer, 0);
});

test('press correct advances + scores current player', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60, 62, 64]);
  let r = d.press(60);
  assert.equal(r.hit, true);
  assert.equal(r.done, false);
  assert.equal(d.scores[0], 1);
  d.press(62);
  r = d.press(64);
  assert.equal(r.done, true);
  assert.equal(d.scores[0], 3);
});

test('press wrong does not score or advance (no penalty)', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60, 62]);
  const r = d.press(65);
  assert.equal(r.hit, false);
  assert.equal(d.pos, 0);
  assert.equal(d.scores[0], 0);
  assert.equal(d.turnMiss, 1);
});

test('octave agnostic by default', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60]);
  const r = d.press(72); // same pitch class
  assert.equal(r.hit, true);
});

test('exact match when octaveAgnostic false', () => {
  const d = new FamilyDuel({ rounds: 1, octaveAgnostic: false });
  d.startTurn([60]);
  assert.equal(d.press(72).hit, false);
  assert.equal(d.press(60).hit, true);
});

test('endTurn switches player + records turn score', () => {
  const d = new FamilyDuel({ rounds: 2 });
  d.startTurn([60, 62]);
  d.press(60); d.press(62);
  d.endTurn();
  assert.equal(d.currentPlayer, 1);
  assert.equal(d.turnScores.length, 1);
  assert.deepEqual(d.turnScores[0], { player: 0, score: 2, miss: 0 });
});

test('roundNumber tracks per-player round', () => {
  const d = new FamilyDuel({ rounds: 2 });
  assert.equal(d.roundNumber(), 1); // player0 round1
  d.startTurn([60]); d.press(60); d.endTurn();
  assert.equal(d.currentPlayer, 1);
  assert.equal(d.roundNumber(), 1); // player1 round1
  d.startTurn([60]); d.press(60); d.endTurn();
  assert.equal(d.currentPlayer, 0);
  assert.equal(d.roundNumber(), 2); // player0 round2
});

test('full game over after all turns', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60]); d.press(60); d.endTurn();
  assert.equal(d.isOver(), false);
  d.startTurn([62]); d.press(62); d.endTurn();
  assert.equal(d.isOver(), true);
  assert.equal(d.currentPlayer, null);
});

test('result declares winner', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60, 62]); d.press(60); d.press(62); d.endTurn(); // p0 = 2
  d.startTurn([64, 65]); d.press(64); d.endTurn();              // p1 = 1
  const r = d.result();
  assert.equal(r.tie, false);
  assert.equal(r.winner, 0);
  assert.deepEqual(r.scores, [2, 1]);
});

test('result detects tie', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60]); d.press(60); d.endTurn();
  d.startTurn([64]); d.press(64); d.endTurn();
  const r = d.result();
  assert.equal(r.tie, true);
  assert.equal(r.winner, null);
  assert.equal(d.teamTotal(), 2);
});

test('progress + totalTurns', () => {
  const d = new FamilyDuel({ rounds: 2 });
  assert.equal(d.progress(), 0);
  d.startTurn([60]); d.press(60); d.endTurn();
  assert.equal(Math.round(d.progress() * 100), 25); // 1/4
});

test('reset clears scores + turns', () => {
  const d = new FamilyDuel({ rounds: 1 });
  d.startTurn([60]); d.press(60); d.endTurn();
  d.reset();
  assert.deepEqual(d.scores, [0, 0]);
  assert.equal(d.turnIndex, 0);
  assert.equal(d.turnScores.length, 0);
});

test('custom players (max 2)', () => {
  const d = new FamilyDuel({ players: [{ name: '妈妈', emoji: '👩' }, { name: 'Lily', emoji: '👧' }], rounds: 1 });
  assert.equal(d.players[0].name, '妈妈');
  assert.equal(d.players.length, 2);
});
