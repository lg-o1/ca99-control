import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS, getSong, quizOptions, GuessSong } from './guess-song.js';

test('SONGS populated with notes', () => {
  assert.ok(SONGS.length >= 6);
  SONGS.forEach((s) => { assert.ok(s.notes.length >= 4); assert.ok(s.title); });
});

test('getSong returns by id with fallback', () => {
  assert.equal(getSong('twinkle').id, 'twinkle');
  assert.equal(getSong('nope').id, SONGS[0].id);
});

test('twinkle opens C C G G A A G', () => {
  assert.deepEqual(getSong('twinkle').notes, [60, 60, 67, 67, 69, 69, 67]);
});

test('quizOptions includes correct answer and right count', () => {
  const opts = quizOptions('twinkle', 4, () => 0);
  assert.equal(opts.length, 4);
  assert.ok(opts.some((o) => o.id === 'twinkle'));
  const ids = new Set(opts.map((o) => o.id));
  assert.equal(ids.size, 4); // distinct
});

test('quizOptions count clamps to available songs', () => {
  const opts = quizOptions('twinkle', 99, () => 0);
  assert.equal(opts.length, SONGS.length);
});

test('GuessSong.next enters play phase with options', () => {
  const g = new GuessSong({ rng: () => 0 });
  const song = g.next('mary');
  assert.equal(song.id, 'mary');
  assert.equal(g.phase, 'play');
  assert.equal(g.options.length, 4);
  assert.equal(g.current(), getSong('mary').notes[0]);
});

test('GuessSong: play through melody enters guess phase', () => {
  const g = new GuessSong({ rng: () => 0 });
  g.next('twinkle');
  const notes = getSong('twinkle').notes;
  let res;
  notes.forEach((m) => { res = g.press(m); });
  assert.equal(res.playDone, true);
  assert.equal(g.phase, 'guess');
});

test('GuessSong: wrong note during play restarts', () => {
  const g = new GuessSong({ rng: () => 0 });
  g.next('twinkle');
  assert.equal(g.press(60).advance, true);
  const w = g.press(61); // wrong (C# not in C C G...)
  assert.equal(w.wrong, true);
  assert.equal(g.idx, 0);
});

test('GuessSong: octave-agnostic play', () => {
  const g = new GuessSong({ rng: () => 0 });
  g.next('twinkle');
  assert.equal(g.press(72).advance, true); // C5 counts as first C
});

test('GuessSong: correct guess scores + streak; cannot guess in play phase', () => {
  const g = new GuessSong({ rng: () => 0 });
  g.next('twinkle');
  assert.equal(g.guess('twinkle').invalid, true); // still in play phase
  getSong('twinkle').notes.forEach((m) => g.press(m));
  const r = g.guess('twinkle');
  assert.equal(r.correct, true);
  assert.equal(r.score, 10);
  assert.equal(r.streak, 1);
  assert.equal(g.phase, 'done');
});

test('GuessSong: wrong guess does not advance, breaks streak on eventual correct', () => {
  const g = new GuessSong({ rng: () => 0 });
  g.next('twinkle');
  getSong('twinkle').notes.forEach((m) => g.press(m));
  const wrongId = SONGS.find((s) => s.id !== 'twinkle').id;
  const w = g.guess(wrongId);
  assert.equal(w.correct, false);
  assert.equal(g.phase, 'guess'); // still guessing
  const r = g.guess('twinkle');
  assert.equal(r.correct, true);
  assert.equal(r.streak, 0); // had a wrong guess -> streak reset
  assert.equal(r.score, 0);  // no points when guessed wrong first
});

test('GuessSong: two clean rounds build score and streak', () => {
  const g = new GuessSong({ rng: () => 0 });
  const playRound = (id) => { g.next(id); getSong(id).notes.forEach((m) => g.press(m)); return g.guess(id); };
  playRound('twinkle');
  const r = playRound('mary');
  assert.equal(r.streak, 2);
  assert.equal(r.score, 20);
});
