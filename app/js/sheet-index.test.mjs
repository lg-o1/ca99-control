import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSheetIndex, measureAtBeat, measureAtBeatRange, measureAtTime, cursorX, sheetPaths, pngUrl, defaultSheetHeight, clampSheetHeight, SHEET_H, sheetMeasureLabel, sheetMeasureBadge } from './sheet-index.js';

// 📖 反复展开 fixture：blackforestpolka「D.S. al Fine, 2nd time 8va」
// 曲式 A(1–8)→B(9–16)→A′(17–24)→D.S.→B(9–16)+8va→Fine
// 展开后印刷小节序列 1..16, 17..24, 9..16；最后 8 条复用 m009..m016，pass:2 octave_shift:12，拍区间严格更晚。
function blackforestExpanded() {
  const measures = [];
  let beat = 0;
  const push = (printed, pass, oct) => {
    const file = 'm' + String(printed).padStart(3, '0') + '.png';
    measures.push({ i: measures.length + 1, file, w: 120, printed_measure: printed, pass, octave_shift: oct,
      beat_start: beat, beat_end: beat + 4 });
    beat += 4;
  };
  for (let p = 1; p <= 16; p++) push(p, 1, 0);   // A + B 首遍
  for (let p = 17; p <= 24; p++) push(p, 1, 0);  // A′
  for (let p = 9; p <= 16; p++) push(p, 2, 12);  // D.S. 重弹 B，2nd time 8va
  return { stem: 'blackforestpolka', height: 240, bpm: 120,
    structure: [{ type: 'ds', from_printed: 9, to_printed: 16, pass: 2, octave_shift: 12, label: 'D.S. al Fine, 2nd time 8va' }],
    measures };
}

test('parseSheetIndex: expanded repeat index parses with hasBeats + hasRepeats + monotonic beats', () => {
  const s = parseSheetIndex(blackforestExpanded());
  assert.equal(s.nMeasures, 32);              // 16 + 8 + 8
  assert.equal(s.hasBeats, true);
  assert.equal(s.hasRepeats, true);
  // beatStart 单调不减
  let prev = -Infinity;
  for (const m of s.measures) { assert.ok(m.beatStart >= prev); prev = m.beatStart; }
  // structure 透传
  assert.equal(s.structure.length, 1);
  assert.equal(s.structure[0].label, 'D.S. al Fine, 2nd time 8va');
});

test('measureAtBeatRange: reprise beat resolves to the SECOND copy of m9-16, not the first', () => {
  const s = parseSheetIndex(blackforestExpanded());
  const ms = s.measures;
  // 首遍 m9 起拍 = 8*4 = 32（数组第 8 条，0基idx 8）
  const first = measureAtBeatRange(ms, 33).idx;
  assert.equal(ms[first].printedMeasure, 9);
  assert.equal(ms[first].pass, 1);
  // 重弹段起拍：16+8 = 24 条之后 → 24*4 = 96；m9 重弹起拍 96
  const second = measureAtBeatRange(ms, 97).idx;
  assert.equal(ms[second].printedMeasure, 9);
  assert.equal(ms[second].pass, 2);
  assert.equal(ms[second].octaveShift, 12);
  assert.notEqual(first, second);             // 解析到不同条目
});

test('parseSheetIndex: printedMeasure/pass/octaveShift legacy defaults', () => {
  // 老一次性谱面（无新字段）：printedMeasure=i, pass=1, octaveShift=0, hasRepeats=false
  const s = parseSheetIndex({
    measures: [
      { i: 1, file: 'm001.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 4, beat_end: 8 },
    ],
  });
  assert.equal(s.hasRepeats, false);
  assert.deepEqual(s.measures.map((m) => [m.printedMeasure, m.pass, m.octaveShift]), [[1, 1, 0], [2, 1, 0]]);
  // 完全缺 i 也兜底成 1基序号
  const s2 = parseSheetIndex({ measures: [{ file: 'a.png', w: 10 }, { file: 'b.png', w: 10 }] });
  assert.deepEqual(s2.measures.map((m) => m.printedMeasure), [1, 2]);
});

test('sheetMeasureLabel: legacy once-through keeps 第 idx+1 / n 小节 format', () => {
  const s = parseSheetIndex({
    measures: [
      { i: 1, file: 'a.png', w: 100, low_confidence: false },
      { i: 2, file: 'b.png', w: 100, low_confidence: true },
    ],
  });
  assert.equal(sheetMeasureLabel(s, 0), '第 1 / 2 小节');
  assert.equal(sheetMeasureLabel(s, 1), '第 2 / 2 小节　⚠️ 这格识别可能不准');
});

test('sheetMeasureLabel: repeat shows printed measure + pass + 8va', () => {
  const s = parseSheetIndex(blackforestExpanded());
  // 重弹段第二条（idx 25）= 印刷 m10, pass2, 8va
  const idx = 25;
  assert.equal(s.measures[idx].printedMeasure, 10);
  assert.equal(s.measures[idx].pass, 2);
  assert.equal(sheetMeasureLabel(s, idx), '第 10 小节 · 第 2 遍 · 8va');
  // 首遍段保持「第 {印刷} 小节」无遍数/8va
  assert.equal(sheetMeasureLabel(s, 0), '第 1 小节');
});

test('sheetMeasureLabel: 8vb for negative octave shift; out-of-range safe', () => {
  const s = parseSheetIndex({ measures: [{ i: 1, file: 'a.png', w: 10, pass: 2, octave_shift: -12, beat_start: 0, beat_end: 4 }] });
  assert.equal(sheetMeasureLabel(s, 0), '第 1 小节 · 第 2 遍 · 8vb');
  assert.equal(sheetMeasureLabel(s, 99), '');
});

test('sheetMeasureBadge: ↻N / 8va text, empty for plain first pass', () => {
  assert.equal(sheetMeasureBadge({ pass: 1, octaveShift: 0 }), '');
  assert.equal(sheetMeasureBadge({ pass: 2, octaveShift: 0 }), '↻2');
  assert.equal(sheetMeasureBadge({ pass: 1, octaveShift: 12 }), '8va');
  assert.equal(sheetMeasureBadge({ pass: 2, octaveShift: 12 }), '↻2 8va');
  assert.equal(sheetMeasureBadge({ pass: 3, octaveShift: -12 }), '↻3 8vb');
  assert.equal(sheetMeasureBadge(null), '');
});

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

test('parseSheetIndex: hasBeats false when no beat fields (back-compat)', () => {
  const s = parseSheetIndex(SAMPLE);
  assert.equal(s.hasBeats, false);
  assert.equal(s.measures[0].beatStart, null);
});

test('parseSheetIndex: hasBeats true with valid monotonic beat ranges', () => {
  const s = parseSheetIndex({
    stem: 'x', height: 200, n_measures: 3,
    measures: [
      { i: 1, file: 'm001.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 4, beat_end: 8 },
      { i: 3, file: 'm003.png', w: 100, beat_start: 8, beat_end: 12 },
    ],
  });
  assert.equal(s.hasBeats, true);
  assert.deepEqual(s.measures.map((m) => [m.beatStart, m.beatEnd]), [[0, 4], [4, 8], [8, 12]]);
});

test('parseSheetIndex: anacrusis (short pickup measure) keeps hasBeats', () => {
  // 弱起小节只有 1 拍，后续整小节 4 拍
  const s = parseSheetIndex({
    measures: [
      { i: 1, file: 'm001.png', w: 60, beat_start: 0, beat_end: 1 },
      { i: 2, file: 'm002.png', w: 120, beat_start: 1, beat_end: 5 },
    ],
  });
  assert.equal(s.hasBeats, true);
});

test('parseSheetIndex: repeat expands to duplicate file at later beats, still monotonic', () => {
  // D.S./反复：同一谱面小节 m002 被演奏两遍 → OMR 展开成两条，beatStart 单调
  const s = parseSheetIndex({
    measures: [
      { i: 1, file: 'm001.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 4, beat_end: 8 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 8, beat_end: 12 }, // 第二遍
      { i: 3, file: 'm003.png', w: 100, beat_start: 12, beat_end: 16 },
    ],
  });
  assert.equal(s.hasBeats, true);
  assert.equal(s.nMeasures, 4);
});

test('parseSheetIndex: hasBeats false if any beat range invalid/non-monotonic', () => {
  // 第二格 beatStart 真正倒退（< 前一格 beatStart）→ 不可二分 → 回退均匀
  const bad = parseSheetIndex({
    measures: [
      { i: 1, file: 'a.png', w: 100, beat_start: 5, beat_end: 9 },
      { i: 2, file: 'b.png', w: 100, beat_start: 2, beat_end: 6 },
    ],
  });
  assert.equal(bad.hasBeats, false);
  // 缺一格 beat → 整体回退
  const partial = parseSheetIndex({
    measures: [
      { i: 1, file: 'a.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'b.png', w: 100 },
    ],
  });
  assert.equal(partial.hasBeats, false);
  // beatEnd<=beatStart → 回退
  const zero = parseSheetIndex({
    measures: [{ i: 1, file: 'a.png', w: 100, beat_start: 4, beat_end: 4 }],
  });
  assert.equal(zero.hasBeats, false);
});

test('measureAtBeatRange: binary search locates measure + progress', () => {
  const s = parseSheetIndex({
    measures: [
      { i: 1, file: 'm001.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 4, beat_end: 8 },
      { i: 3, file: 'm003.png', w: 100, beat_start: 8, beat_end: 12 },
    ],
  });
  const ms = s.measures;
  assert.deepEqual(measureAtBeatRange(ms, 0), { idx: 0, f: 0 });
  assert.deepEqual(measureAtBeatRange(ms, 2), { idx: 0, f: 0.5 });
  assert.deepEqual(measureAtBeatRange(ms, 4), { idx: 1, f: 0 });
  assert.deepEqual(measureAtBeatRange(ms, 6), { idx: 1, f: 0.5 });
  assert.deepEqual(measureAtBeatRange(ms, 10), { idx: 2, f: 0.5 });
});

test('measureAtBeatRange: clamps before start and after end', () => {
  const ms = parseSheetIndex({
    measures: [
      { i: 1, file: 'a.png', w: 100, beat_start: 2, beat_end: 6 },
      { i: 2, file: 'b.png', w: 100, beat_start: 6, beat_end: 10 },
    ],
  }).measures;
  assert.deepEqual(measureAtBeatRange(ms, -5), { idx: 0, f: 0 });   // 弱起前
  assert.deepEqual(measureAtBeatRange(ms, 1), { idx: 0, f: 0 });    // 起始拍之前
  assert.deepEqual(measureAtBeatRange(ms, 999), { idx: 1, f: 1 });  // 超尾 → 停末格
});

test('measureAtBeatRange: gap between measures parks at previous end (f=1)', () => {
  // m1 [0,4), 间隙, m2 [6,10)；beat=5 落在间隙 → 停在 m1 末尾
  const ms = parseSheetIndex({
    measures: [
      { i: 1, file: 'a.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'b.png', w: 100, beat_start: 6, beat_end: 10 },
    ],
  }).measures;
  assert.deepEqual(measureAtBeatRange(ms, 5), { idx: 0, f: 1 });
});

test('measureAtBeatRange: repeat — same file at two beat ranges resolves to each instance', () => {
  const ms = parseSheetIndex({
    measures: [
      { i: 1, file: 'm001.png', w: 100, beat_start: 0, beat_end: 4 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 4, beat_end: 8 },
      { i: 2, file: 'm002.png', w: 100, beat_start: 8, beat_end: 12 },
    ],
  }).measures;
  assert.equal(measureAtBeatRange(ms, 5).idx, 1);   // 第一遍 m002
  assert.equal(measureAtBeatRange(ms, 9).idx, 2);   // 第二遍 m002（不同条目）
});

test('measureAtBeatRange: empty measures safe', () => {
  assert.deepEqual(measureAtBeatRange([], 5), { idx: 0, f: 0 });
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

test('defaultSheetHeight: scales with viewport, clamped to [min,max]', () => {
  // 比例区间内：取视口高的 frac
  assert.equal(defaultSheetHeight(800), Math.round(800 * SHEET_H.frac));
  // 横屏矮视口 → 夹到 min（不会比 min 还小）
  assert.equal(defaultSheetHeight(100), SHEET_H.min);
  // 竖屏超高视口 → 夹到 max（不会无限大）
  assert.equal(defaultSheetHeight(5000), SHEET_H.max);
  // 缺省视口 → 用 700 兜底，仍落在区间内
  const d = defaultSheetHeight(undefined);
  assert.ok(d >= SHEET_H.min && d <= SHEET_H.max);
});

test('clampSheetHeight: bounds + invalid fallback', () => {
  assert.equal(clampSheetHeight(150), 150);
  assert.equal(clampSheetHeight(SHEET_H.max + 999), SHEET_H.max);
  assert.equal(clampSheetHeight(SHEET_H.min - 999), SHEET_H.min);
  assert.equal(clampSheetHeight(0), SHEET_H.min);
  assert.equal(clampSheetHeight(NaN), SHEET_H.min);
  assert.equal(clampSheetHeight('abc'), SHEET_H.min);
  assert.equal(clampSheetHeight(132.7), 133);   // 四舍五入
});
