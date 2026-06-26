import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PATTERNS, patternById, onsetBeats, beatMsOf, buildTimes, RhythmJump,
} from './rhythm-jump.js';

test('PATTERNS have required shape + unique ids', () => {
  assert.ok(PATTERNS.length >= 4);
  const ids = new Set();
  for (const p of PATTERNS) {
    assert.equal(typeof p.id, 'string');
    assert.ok(!ids.has(p.id), 'dup id ' + p.id);
    ids.add(p.id);
    assert.ok(Array.isArray(p.beats) && p.beats.length);
    assert.ok([1, 2, 3].includes(p.level));
    assert.ok(p.barBeats > 0);
  }
});

test('patternById falls back to first', () => {
  assert.equal(patternById('eighth').id, 'eighth');
  assert.equal(patternById('nope').id, PATTERNS[0].id);
});

test('onsetBeats accumulates excluding total', () => {
  assert.deepEqual(onsetBeats([1, 1, 1, 1]), [0, 1, 2, 3]);
  assert.deepEqual(onsetBeats([0.5, 1, 0.5]), [0, 0.5, 1.5]);
  assert.deepEqual(onsetBeats([]), []);
});

test('beatMsOf converts bpm', () => {
  assert.equal(beatMsOf(60), 1000);
  assert.equal(beatMsOf(120), 500);
  assert.equal(beatMsOf(0), 0);
});

test('buildTimes lays out bars with lead-in offset', () => {
  const { beatMs, leadMs, times, barMs, patternBeats } = buildTimes({ bpm: 60, pattern: 'quarter', bars: 2, leadInBeats: 4 });
  assert.equal(beatMs, 1000);
  assert.equal(leadMs, 4000);
  assert.equal(patternBeats, 4);
  assert.equal(barMs, 4000);
  // 2 bars × 4 quarter notes = 8 onsets, starting at leadMs
  assert.equal(times.length, 8);
  assert.equal(times[0], 4000);
  assert.equal(times[1], 5000);
  assert.equal(times[4], 8000); // second bar downbeat
  assert.equal(times[7], 11000);
});

test('RhythmJump builds notes from pattern', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  assert.equal(g.total, 4);
  assert.deepEqual(g.notes.map((n) => n.ms), [0, 1000, 2000, 3000]);
});

test('tap classifies perfect / good by timing window', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0, perfectMs: 55, goodMs: 130 });
  let r = g.tap(0);          // dead-on note0
  assert.equal(r.hit, true);
  assert.equal(r.result, 'perfect');
  r = g.tap(1100);           // note1 at 1000, +100 → good (late)
  assert.equal(r.result, 'good');
  assert.equal(r.late, true);
  assert.equal(g.counts.perfect, 1);
  assert.equal(g.counts.good, 1);
  assert.equal(g.combo, 2);
});

test('tap outside any window = stray, no combo break', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  g.tap(0);                  // combo 1
  const r = g.tap(500);      // far from any note (note0 judged, note1 at 1000, 500ms off)
  assert.equal(r.hit, false);
  assert.equal(r.stray, true);
  assert.equal(g.combo, 1);  // unchanged
});

test('tap hits nearest unjudged note', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0, goodMs: 200 });
  const r = g.tap(1050);     // closer to note1 (1000) than note0 (0) or note2 (2000)
  assert.equal(r.index, 1);
});

test('expire marks missed notes and breaks combo', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0, goodMs: 130 });
  g.tap(0);                  // perfect note0, combo 1
  const missed = g.expire(1200); // note1 (1000) window ends 1130 < 1200 → miss
  assert.deepEqual(missed, [1]);
  assert.equal(g.counts.miss, 1);
  assert.equal(g.combo, 0);
});

test('expire does not double-judge', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  g.expire(5000);            // all notes miss
  const again = g.expire(6000);
  assert.deepEqual(again, []);
  assert.equal(g.counts.miss, 4);
});

test('hitRate / stars reflect accuracy', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  g.tap(0); g.tap(1000); g.tap(2000); g.tap(3000); // all perfect
  assert.equal(g.hitRate(), 100);
  assert.equal(g.stars(), 3);
  assert.equal(g.isDone(), true);
});

test('stars tiers', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  g.tap(0); g.tap(1000);     // 2/4 hit = 50%
  g.expire(5000);            // rest miss
  assert.equal(g.hitRate(), 50);
  assert.equal(g.stars(), 1);
});

test('activeNotes positions: y=1 at hit time, y=0 a travel before', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  const travel = 1000;
  const at1000 = g.activeNotes(1000, travel).find((n) => n.i === 1);
  assert.ok(Math.abs(at1000.y - 1) < 1e-9);   // note1 at hit line now
  const at0 = g.activeNotes(0, travel).find((n) => n.i === 1);
  assert.ok(Math.abs(at0.y - 0) < 1e-9);       // note1 just spawned at top
});

test('meanAbsErrMs averages hit deltas', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0, goodMs: 200 });
  g.tap(40);     // +40
  g.tap(940);    // -60 from note1
  assert.equal(g.meanAbsErrMs(), 50);
});

test('reset clears state but keeps notes', () => {
  const g = new RhythmJump({ bpm: 60, pattern: 'quarter', bars: 1, leadInBeats: 0 });
  g.tap(0); g.expire(5000);
  g.reset();
  assert.equal(g.judgedCount, 0);
  assert.equal(g.combo, 0);
  assert.equal(g.total, 4);
  assert.ok(g.notes.every((n) => !n.judged));
});
