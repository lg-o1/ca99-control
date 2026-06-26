import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RACES, getRace, nameToMidi, ghostFrac, playerFrac, projectedMs,
  lead, formatMs, medalFor, GhostRace,
} from './ghost-race.js';

test('RACES well-formed', () => {
  assert.ok(RACES.length >= 3);
  for (const r of RACES) {
    assert.ok(r.id && r.name && r.emoji && r.notes.length >= 4, r.id);
    assert.ok(r.notes.every((n) => Number.isInteger(n)));
  }
});

test('getRace falls back to first', () => {
  assert.equal(getRace('cmaj-up').id, 'cmaj-up');
  assert.equal(getRace('nope').id, RACES[0].id);
});

test('nameToMidi maps middle C', () => {
  assert.equal(nameToMidi('C4'), 60);
  assert.equal(nameToMidi('G4'), 67);
  assert.equal(nameToMidi('F#5'), 78);
});

test('ghostFrac clamps and handles no-ghost', () => {
  assert.equal(ghostFrac(500, null), 0);
  assert.equal(ghostFrac(500, 0), 0);
  assert.equal(ghostFrac(0, 1000), 0);
  assert.equal(ghostFrac(500, 1000), 0.5);
  assert.equal(ghostFrac(2000, 1000), 1); // clamp
});

test('playerFrac is idx/total clamped', () => {
  assert.equal(playerFrac(0, 8), 0);
  assert.equal(playerFrac(4, 8), 0.5);
  assert.equal(playerFrac(10, 8), 1);
  assert.equal(playerFrac(1, 0), 0);
});

test('projectedMs extrapolates from pace', () => {
  assert.equal(projectedMs(0, 1, 8), null);
  assert.equal(projectedMs(100, 1, 8), null);
  // 3 notes hit (idx=3) means 2 intervals in 200ms -> 100ms/interval, 7 intervals total
  assert.equal(projectedMs(200, 3, 8), 700);
});

test('lead is player minus ghost, or player frac alone without ghost', () => {
  assert.equal(lead(500, 4, 8, null), 0.5);   // no ghost -> own progress
  // player 0.5, ghost 0.25 -> +0.25 ahead
  assert.equal(lead(250, 4, 8, 1000), 0.25);
  // player 0.25, ghost 0.5 -> behind
  assert.equal(lead(500, 2, 8, 1000), -0.25);
});

test('formatMs renders seconds', () => {
  assert.equal(formatMs(1234), '1.23 秒');
  assert.equal(formatMs(null), '—');
  assert.equal(formatMs(Infinity), '—');
});

test('medalFor classifies result', () => {
  assert.equal(medalFor(900, null), 'first');
  assert.equal(medalFor(900, 1000), 'record');
  assert.equal(medalFor(1050, 1000), 'close');  // within 10%
  assert.equal(medalFor(1300, 1000), 'tryagain');
});

test('GhostRace times a clean run and beats no-ghost first time', () => {
  const g = new GhostRace({ race: 'cmaj-up', ghostMs: null });
  const notes = getRace('cmaj-up').notes;
  let res;
  let t = 1000;
  for (let i = 0; i < notes.length; i++) {
    res = g.press(notes[i], t);
    t += 100; // 100ms between notes
  }
  assert.equal(res.complete, true);
  // 7 intervals * 100ms = 700ms
  assert.equal(res.timeMs, 700);
  assert.equal(res.beat, true);       // first time always "beats"
  assert.equal(res.newRecord, true);
  assert.equal(res.medal, 'first');
  assert.equal(g.ghostMs, 700);       // becomes the new ghost
  assert.equal(g.runs, 1);
});

test('GhostRace beats a slower ghost and sets new record', () => {
  const g = new GhostRace({ race: 'arp-c', ghostMs: 5000 });
  const notes = getRace('arp-c').notes;
  let res; let t = 0;
  for (let i = 0; i < notes.length; i++) { res = g.press(notes[i], t); t += 50; }
  assert.equal(res.complete, true);
  assert.ok(res.timeMs < 5000);
  assert.equal(res.beat, true);
  assert.equal(res.newRecord, true);
  assert.equal(res.medal, 'record');
  assert.ok(res.deltaMs < 0); // faster than ghost
});

test('GhostRace loses to a fast ghost, keeps the ghost', () => {
  const g = new GhostRace({ race: 'arp-c', ghostMs: 100 });
  const notes = getRace('arp-c').notes;
  let res; let t = 0;
  for (let i = 0; i < notes.length; i++) { res = g.press(notes[i], t); t += 300; }
  assert.equal(res.complete, true);
  assert.equal(res.beat, false);
  assert.equal(res.newRecord, false);
  assert.equal(g.ghostMs, 100); // unchanged, kept the fast ghost
  assert.ok(res.deltaMs > 0);
});

test('GhostRace wrong note resets the run', () => {
  const g = new GhostRace({ race: 'cmaj-up' });
  const notes = getRace('cmaj-up').notes;
  g.press(notes[0], 1000);
  g.press(notes[1], 1100);
  assert.equal(g.idx, 2);
  const bad = g.press(notes[0] + 1, 1200); // wrong (assuming not octave-equiv to next)
  assert.equal(bad.wrong, true);
  assert.equal(g.idx, 0);
});

test('GhostRace octaveAgnostic accepts any octave', () => {
  const g = new GhostRace({ race: 'cmaj-up', octaveAgnostic: true });
  const r = g.press(nameToMidi('C3'), 1000); // C in lower octave matches C4 target
  assert.equal(r.ok, true);
  assert.equal(r.started, true);
});

test('elapsed reflects time since first note', () => {
  const g = new GhostRace({ race: 'cmaj-up' });
  const notes = getRace('cmaj-up').notes;
  assert.equal(g.elapsed(5000), 0); // not started
  g.press(notes[0], 1000);
  assert.equal(g.elapsed(1500), 500);
});

test('setGhost normalizes non-positive to null', () => {
  const g = new GhostRace({ race: 'cmaj-up' });
  g.setGhost(0);
  assert.equal(g.ghostMs, null);
  g.setGhost(800);
  assert.equal(g.ghostMs, 800);
});
