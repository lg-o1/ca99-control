import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSheetIndex, measureAtBeat, measureAtTime, cursorX, sheetPaths, pngUrl } from './sheet-index.js';

const SAMPLE = {
  stem: 'blackforestpolka', height: 240, bpm: 120, bar_seconds: 2.0,
  n_measures: 3, total_seconds: 6.0,
  measures: [
    { i: 1, file: 'm001.png', w: 300, t_start: 0.0, t_end: 2.0, low_confidence: false },
    { i: 2, file: 'm002.png', w: 200, t_start: 2.0, t_end: 4.0, low_confidence: true },
    { i: 3, file: 'm003.png', w: 100, t_start: 4.0, t_end: 6.0, low_confidence: false },
  ],
};

test('parseSheetIndex: cumulative x offsets + total width', () => {
  const s = parseSheetIndex(SAMPLE);
  assert.equal(s.nMeasures, 3);
  assert.equal(s.totalWidth, 600);
  assert.deepEqual(s.measures.map((m) => [m.x0, m.x1]), [[0, 300], [300, 500], [500, 600]]);
  assert.equal(s.measures[1].lowConf, true);
  assert.equal(s.height, 240);
  assert.equal(s.stem, 'blackforestpolka');
});

test('parseSheetIndex: defaults + clamps on missing/garbage', () => {
  const s = parseSheetIndex({});
  assert.equal(s.nMeasures, 0);
  assert.equal(s.totalWidth, 0);
  assert.equal(s.height, 240);
  const s2 = parseSheetIndex({ measures: [{ i: 1, file: 'a.png', w: 0 }] });
  assert.equal(s2.measures[0].w, 1); // w floored to >=1
});

test('measureAtBeat: even distribution across measures', () => {
  // totalBeats=12, 3 measures → 4 beats each
  assert.deepEqual(measureAtBeat(0, 12, 3), { idx: 0, f: 0 });
  assert.deepEqual(measureAtBeat(2, 12, 3), { idx: 0, f: 0.5 });
  assert.deepEqual(measureAtBeat(4, 12, 3), { idx: 1, f: 0 });
  assert.deepEqual(measureAtBeat(6, 12, 3), { idx: 1, f: 0.5 });
  assert.deepEqual(measureAtBeat(8, 12, 3), { idx: 2, f: 0 });
});

test('measureAtBeat: clamps below 0 and beyond end', () => {
  assert.deepEqual(measureAtBeat(-5, 12, 3), { idx: 0, f: 0 });
  assert.deepEqual(measureAtBeat(999, 12, 3), { idx: 2, f: 1 });
});

test('measureAtBeat: zero measures is safe', () => {
  assert.deepEqual(measureAtBeat(5, 12, 0), { idx: 0, f: 0 });
});

test('measureAtBeat: no totalBeats → 1 beat per measure fallback', () => {
  assert.deepEqual(measureAtBeat(0, 0, 3), { idx: 0, f: 0 });
  assert.deepEqual(measureAtBeat(1.5, 0, 3), { idx: 1, f: 0.5 });
});

test('measureAtTime: locate by seconds + fraction', () => {
  const s = parseSheetIndex(SAMPLE);
  assert.deepEqual(measureAtTime(s.measures, 0), { idx: 0, f: 0 });
  assert.deepEqual(measureAtTime(s.measures, 1), { idx: 0, f: 0.5 });
  assert.deepEqual(measureAtTime(s.measures, 3), { idx: 1, f: 0.5 });
  assert.deepEqual(measureAtTime(s.measures, 4), { idx: 2, f: 0 });
  assert.deepEqual(measureAtTime(s.measures, 100), { idx: 2, f: 1 });
});

test('measureAtTime: empty measures safe', () => {
  assert.deepEqual(measureAtTime([], 5), { idx: 0, f: 0 });
});

test('cursorX: source-pixel position within ribbon', () => {
  const s = parseSheetIndex(SAMPLE);
  assert.equal(cursorX(s.measures, 0, 0), 0);
  assert.equal(cursorX(s.measures, 0, 0.5), 150);  // half of 300
  assert.equal(cursorX(s.measures, 1, 0), 300);
  assert.equal(cursorX(s.measures, 1, 0.5), 400);  // 300 + half of 200
  assert.equal(cursorX(s.measures, 2, 1), 600);
  assert.equal(cursorX(s.measures, 99, 0.5), 0);   // out of range → 0
});

test('sheetPaths: derive folder + index from .mid path', () => {
  assert.deepEqual(sheetPaths('midi/concert/blackforestpolka.mid'),
    { folder: 'midi/concert/blackforestpolka', index: 'midi/concert/blackforestpolka/index.json' });
  assert.deepEqual(sheetPaths('a/b/Song.MID'),
    { folder: 'a/b/Song', index: 'a/b/Song/index.json' });
  assert.deepEqual(sheetPaths(''), { folder: '', index: '/index.json' });
});

test('pngUrl: join folder + file', () => {
  assert.equal(pngUrl('midi/concert/x', 'm001.png'), 'midi/concert/x/m001.png');
  assert.equal(pngUrl('', 'a.png'), '/a.png');
});
