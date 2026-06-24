import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isBlackKey, totalMs, pitchRange, layoutRoll, playheadX,
  triggered, activeAt, rollStats, DEMO_SONGS,
} from './midi-player.js';

test('isBlackKey identifies sharps/flats', () => {
  assert.equal(isBlackKey(60), false); // C4
  assert.equal(isBlackKey(61), true);  // C#4
  assert.equal(isBlackKey(62), false); // D4
  assert.equal(isBlackKey(66), true);  // F#4
  assert.equal(isBlackKey(70), true);  // A#4
  assert.equal(isBlackKey(71), false); // B4
});

test('totalMs = max(ms+durMs)', () => {
  assert.equal(totalMs([]), 0);
  const notes = [
    { midi: 60, ms: 0, durMs: 500 },
    { midi: 64, ms: 200, durMs: 1000 }, // ends 1200
    { midi: 67, ms: 800, durMs: 300 },  // ends 1100
  ];
  assert.equal(totalMs(notes), 1200);
});

test('pitchRange pads then snaps to octave boundaries, clamped', () => {
  // notes C4(60)..E4(64); pad 2 → 58..66; snap → floor(58/12)*12=48, ceil(67/12)*12-1=71
  const [lo, hi] = pitchRange([
    { midi: 60 }, { midi: 64 },
  ]);
  assert.equal(lo, 48);
  assert.equal(hi, 71);
  // empty → default octave around middle C
  const [dlo, dhi] = pitchRange([]);
  assert.equal(dlo, 48);
  assert.equal(dhi, 72);
  // clamp extremes
  const [clo, chi] = pitchRange([{ midi: 21 }, { midi: 108 }]);
  assert.ok(clo >= 21);
  assert.ok(chi <= 108);
});

test('layoutRoll geometry: width/height/rows + rect placement', () => {
  const notes = [
    { midi: 60, ms: 0, durMs: 1000, hand: 'r', velocity: 96 },
    { midi: 72, ms: 500, durMs: 500, hand: 'l', velocity: 80 },
  ];
  const r = layoutRoll(notes, { pxPerMs: 0.1, rowH: 10, lo: 48, hi: 72, gap: 1, minW: 4 });
  assert.equal(r.lo, 48);
  assert.equal(r.hi, 72);
  assert.equal(r.rows, 25);          // 72-48+1
  assert.equal(r.height, 250);       // 25*10
  assert.equal(r.width, Math.ceil(1000 * 0.1)); // totalMs=1000
  assert.equal(r.rects.length, 2);
  const c4 = r.rects.find(x => x.midi === 60);
  assert.equal(c4.x, 0);
  assert.equal(c4.y, (72 - 60) * 10); // 120
  assert.equal(c4.w, Math.max(4, 1000 * 0.1 - 1)); // 99
  assert.equal(c4.h, 9);             // rowH-gap
  assert.equal(c4.hand, 'r');
  assert.equal(c4.black, false);
});

test('layoutRoll drops notes outside [lo,hi]', () => {
  const notes = [
    { midi: 30, ms: 0, durMs: 100 },  // below
    { midi: 60, ms: 0, durMs: 100 },  // in
    { midi: 100, ms: 0, durMs: 100 }, // above
  ];
  const r = layoutRoll(notes, { lo: 48, hi: 72 });
  assert.equal(r.rects.length, 1);
  assert.equal(r.rects[0].midi, 60);
});

test('layoutRoll enforces minimum width', () => {
  const notes = [{ midi: 60, ms: 0, durMs: 5 }];
  const r = layoutRoll(notes, { pxPerMs: 0.1, minW: 4, lo: 48, hi: 72 });
  assert.equal(r.rects[0].w, 4); // 5*0.1-1 = -0.5 → clamped to minW
});

test('playheadX scales by pxPerMs', () => {
  assert.equal(playheadX(1000, 0.12), 120);
  assert.equal(playheadX(0, 0.12), 0);
});

test('triggered returns onsets in (prevT, t]', () => {
  const notes = [
    { midi: 60, ms: 100, durMs: 50 },
    { midi: 62, ms: 200, durMs: 50 },
    { midi: 64, ms: 300, durMs: 50 },
  ];
  const got = triggered(notes, 100, 200).map(n => n.midi);
  assert.deepEqual(got, [62]); // 100 excluded, 200 included
  assert.deepEqual(triggered(notes, 0, 100).map(n => n.midi), [60]);
  assert.deepEqual(triggered(notes, 300, 400).map(n => n.midi), []);
});

test('activeAt returns notes sounding at t (ms<=t<ms+durMs)', () => {
  const notes = [
    { midi: 60, ms: 0, durMs: 100 },   // [0,100)
    { midi: 64, ms: 50, durMs: 100 },  // [50,150)
  ];
  assert.deepEqual(activeAt(notes, 0).map(n => n.midi), [60]);
  assert.deepEqual(activeAt(notes, 60).map(n => n.midi), [60, 64]);
  assert.deepEqual(activeAt(notes, 100).map(n => n.midi), [64]); // 60 ended
  assert.deepEqual(activeAt(notes, 150).map(n => n.midi), []);
});

test('rollStats counts/range/hand split/duration', () => {
  const notes = [
    { midi: 60, ms: 0, durMs: 500, hand: 'r' },
    { midi: 48, ms: 0, durMs: 500, hand: 'l' },
    { midi: 64, ms: 500, durMs: 500, hand: 'r' },
  ];
  const s = rollStats(notes, { bpm: 120, title: 'X' });
  assert.equal(s.count, 3);
  assert.equal(s.right, 2);
  assert.equal(s.left, 1);
  assert.equal(s.lo, 48);
  assert.equal(s.hi, 64);
  assert.equal(s.durationMs, 1000);
  assert.equal(s.bpm, 120);
  assert.equal(s.title, 'X');
});

test('DEMO_SONGS are valid and sorted', () => {
  assert.ok(DEMO_SONGS.length >= 2);
  for (const song of DEMO_SONGS) {
    assert.ok(song.id && song.title);
    assert.ok(song.notes.length > 0);
    // sorted by (ms, midi)
    for (let i = 1; i < song.notes.length; i++) {
      const a = song.notes[i - 1], b = song.notes[i];
      assert.ok(a.ms < b.ms || (a.ms === b.ms && a.midi <= b.midi),
        `song ${song.id} not sorted at ${i}`);
    }
    // every note well-formed
    for (const n of song.notes) {
      assert.equal(typeof n.midi, 'number');
      assert.ok(n.durMs > 0);
      assert.ok(n.hand === 'r' || n.hand === 'l');
    }
  }
  // ode has both hands
  const ode = DEMO_SONGS.find(s => s.id === 'ode-2h');
  assert.ok(ode.notes.some(n => n.hand === 'r'));
  assert.ok(ode.notes.some(n => n.hand === 'l'));
});
