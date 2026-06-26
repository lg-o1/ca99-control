// backing-band.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gmFamily, splitParts, suggestMyPart, buildSchedule, partKeyMode } from './backing-band.js';

// 合成一个 parsed 对象的辅助
function mk(notes, extra = {}) {
  return { format: 1, ntracks: 3, ticksPerBeat: 480, timeSig: { num: 4, den: 4 }, bpm: 120,
    trackNames: extra.trackNames || [], channelPrograms: extra.channelPrograms || {}, trackPrograms: extra.trackPrograms || [],
    notes, durationMs: 0, durationBeats: 0 };
}
function n(midi, ms, durMs, opts = {}) {
  return { midi, ms, durMs, beat: 0, dur: 0, velocity: opts.velocity || 80, hand: opts.hand || 'r', track: opts.track || 0, channel: opts.channel == null ? 0 : opts.channel };
}

test('gmFamily maps GM programs to families', () => {
  assert.equal(gmFamily(0), 'piano');       // Acoustic Grand
  assert.equal(gmFamily(33), 'bass');       // Electric Bass
  assert.equal(gmFamily(48), 'strings');    // String Ensemble
  assert.equal(gmFamily(56), 'brass');      // Trumpet
  assert.equal(gmFamily(73), 'reed');       // Flute
  assert.equal(gmFamily(81), 'synth');      // Synth Lead
  assert.equal(gmFamily(25), 'guitar');     // Steel Guitar
  assert.equal(gmFamily(0, true), 'drums'); // drum flag overrides
  assert.equal(gmFamily(null), 'piano');    // default
});

test('partKeyMode picks channel when >=2 channels else track', () => {
  assert.equal(partKeyMode(mk([n(60, 0, 100, { channel: 0 }), n(48, 0, 100, { channel: 1 })])), 'channel');
  assert.equal(partKeyMode(mk([n(60, 0, 100, { channel: 0, track: 0 }), n(48, 0, 100, { channel: 0, track: 1 })])), 'track');
});

test('splitParts groups by channel and sorts high->low pitch', () => {
  const parsed = mk([
    n(72, 0, 100, { channel: 0 }), n(74, 100, 100, { channel: 0 }),
    n(40, 0, 100, { channel: 1 }), n(43, 100, 100, { channel: 1 }),
  ], { channelPrograms: { 0: 0, 1: 33 } });
  const parts = splitParts(parsed);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].family, 'piano');  // higher pitch channel 0 first
  assert.equal(parts[1].family, 'bass');
  assert.equal(parts[0].count, 2);
});

test('splitParts marks GM drum channel 9 as drums', () => {
  const parsed = mk([
    n(60, 0, 100, { channel: 0 }),
    n(38, 0, 50, { channel: 9 }), n(42, 50, 50, { channel: 9 }),
  ]);
  const parts = splitParts(parsed);
  const drum = parts.find((p) => p.isDrum);
  assert.ok(drum, 'drum part exists');
  assert.equal(drum.family, 'drums');
});

test('splitParts uses track name as label when grouping by track', () => {
  const parsed = mk([
    n(60, 0, 100, { channel: 0, track: 0 }), n(62, 100, 100, { channel: 0, track: 0 }),
    n(48, 0, 100, { channel: 0, track: 1 }), n(50, 100, 100, { channel: 0, track: 1 }),
  ], { trackNames: ['Melody', 'Bass'], trackPrograms: [0, 33] });
  const parts = splitParts(parsed);
  assert.equal(partKeyMode(parsed), 'track');
  const labels = parts.map((p) => p.label).sort();
  assert.deepEqual(labels, ['Bass', 'Melody']);
});

test('suggestMyPart picks highest non-drum melodic part', () => {
  const parsed = mk([
    n(76, 0, 100, { channel: 0 }), n(78, 100, 100, { channel: 0 }), n(80, 200, 100, { channel: 0 }),
    n(40, 0, 100, { channel: 1 }), n(43, 100, 100, { channel: 1 }),
    n(38, 0, 50, { channel: 9 }),
  ]);
  const parts = splitParts(parsed);
  const my = suggestMyPart(parts);
  const myPart = parts.find((p) => p.id === my);
  assert.ok(!myPart.isDrum);
  assert.equal(myPart.family, 'piano'); // highest channel 0
});

test('suggestMyPart avoids a too-sparse top in favor of richer part', () => {
  const parsed = mk([
    n(84, 0, 100, { channel: 0 }),                                  // very high but only 1 note
    n(60, 0, 100, { channel: 1 }), n(62, 100, 100, { channel: 1 }), // richer mid part
    n(64, 200, 100, { channel: 1 }), n(65, 300, 100, { channel: 1 }),
    n(67, 400, 100, { channel: 1 }), n(69, 500, 100, { channel: 1 }),
    n(71, 600, 100, { channel: 1 }), n(72, 700, 100, { channel: 1 }),
    n(74, 800, 100, { channel: 1 }), n(76, 900, 100, { channel: 1 }),
  ]);
  const parts = splitParts(parsed);
  const my = suggestMyPart(parts);
  const myPart = parts.find((p) => p.id === my);
  assert.equal(myPart.count, 10); // richer part chosen over 1-note channel
});

test('buildSchedule splits mine vs backing, mutes my part from backing', () => {
  const parsed = mk([
    n(72, 0, 100, { channel: 0 }), n(74, 100, 100, { channel: 0 }),
    n(40, 0, 100, { channel: 1 }), n(43, 100, 100, { channel: 1 }),
  ], { channelPrograms: { 0: 0, 1: 33 } });
  const sch = buildSchedule(parsed, { myPart: 'channel:0' });
  assert.equal(sch.mine.length, 2);
  assert.equal(sch.backing.length, 2);
  assert.ok(sch.mine.every((x) => x.partId === 'channel:0'));
  assert.ok(sch.backing.every((x) => x.partId === 'channel:1'));
});

test('buildSchedule rate scales times (rate>1 = faster)', () => {
  const parsed = mk([
    n(72, 0, 200, { channel: 0 }), n(60, 400, 200, { channel: 1 }),
  ]);
  const sch = buildSchedule(parsed, { myPart: 'channel:0', rate: 2 });
  const back = sch.backing[0];
  assert.equal(back.ms, 200);   // 400 / 2
  assert.equal(back.durMs, 100); // 200 / 2
});

test('buildSchedule extra mutedParts removed from backing', () => {
  const parsed = mk([
    n(72, 0, 100, { channel: 0 }),
    n(48, 0, 100, { channel: 1 }),
    n(38, 0, 50, { channel: 9 }),
  ]);
  const sch = buildSchedule(parsed, { myPart: 'channel:0', mutedParts: ['channel:9'] });
  assert.ok(sch.backing.every((x) => x.partId !== 'channel:9'));
  assert.ok(sch.backing.some((x) => x.partId === 'channel:1'));
});

test('buildSchedule durationMs spans all sounding notes', () => {
  const parsed = mk([
    n(72, 0, 100, { channel: 0 }),
    n(48, 1000, 500, { channel: 1 }),
  ]);
  const sch = buildSchedule(parsed, { myPart: 'channel:0' });
  assert.equal(sch.durationMs, 1500);
});
