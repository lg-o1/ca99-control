/**
 * multi-anchor.test.mjs — 多重锚点识谱引擎单元测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anchorsFor, scaleAnchors, semitoneFromTonic, CHROMATIC_SYLLABLES,
} from './multi-anchor.js';
import { noteColor } from './note-color.js';

// ---- semitoneFromTonic ----
test('semitoneFromTonic：八度无关，0..11', () => {
  assert.equal(semitoneFromTonic(60, 60), 0);   // C 相对 C
  assert.equal(semitoneFromTonic(64, 60), 4);   // E 相对 C
  assert.equal(semitoneFromTonic(72, 60), 0);   // 高八度 C 仍是 0
  assert.equal(semitoneFromTonic(59, 60), 11);  // B 相对 C
  assert.equal(semitoneFromTonic(67, 67), 0);   // G 相对 G
});

// ---- anchorsFor：C 大调自然音 ----
test('anchorsFor：C 大调主音 C 四重锚点齐全', () => {
  const a = anchorsFor(60, { tonicMidi: 60, scaleType: 'major' });
  assert.equal(a.name, 'C');
  assert.equal(a.nameOct, 'C4');
  assert.equal(a.syllable, 'Do');
  assert.equal(a.degree, 1);
  assert.equal(a.num, '1');
  assert.equal(a.diatonic, true);
  assert.equal(a.color, noteColor(60));
  assert.equal(a.fn, '主音');
  assert.ok(a.hint.length > 0);
});

test('anchorsFor：C 大调里的 E = 3 / Mi / 中音', () => {
  const a = anchorsFor(64, { tonicMidi: 60, scaleType: 'major' });
  assert.equal(a.name, 'E');
  assert.equal(a.syllable, 'Mi');
  assert.equal(a.degree, 3);
  assert.equal(a.num, '3');
  assert.equal(a.fn, '中音');
});

test('anchorsFor：C 大调里的 B = 7 / Ti / 导音', () => {
  const a = anchorsFor(71, { tonicMidi: 60, scaleType: 'major' });
  assert.equal(a.degree, 7);
  assert.equal(a.syllable, 'Ti');
  assert.equal(a.fn, '导音');
});

// ---- 可动唱名：换主音 ----
test('anchorsFor：G 大调里 G 也是 Do（可动唱名）', () => {
  const a = anchorsFor(67, { tonicMidi: 67, scaleType: 'major' });
  assert.equal(a.name, 'G');
  assert.equal(a.syllable, 'Do');
  assert.equal(a.degree, 1);
});

test('anchorsFor：G 大调里 D = 5 / Sol', () => {
  const a = anchorsFor(74, { tonicMidi: 67, scaleType: 'major' });
  assert.equal(a.name, 'D');
  assert.equal(a.degree, 5);
  assert.equal(a.syllable, 'Sol');
});

// ---- 小调唱名 ----
test('anchorsFor：A 小调里 C = 3 / Me（降三级唱名）', () => {
  const a = anchorsFor(72, { tonicMidi: 69, scaleType: 'minor' });
  assert.equal(a.name, 'C');
  assert.equal(a.degree, 3);
  assert.equal(a.syllable, 'Me');
});

// ---- 变化音（非自然音）----
test('anchorsFor：C 大调里的 F# 是变化音 → ♯4 / Fi，degree=null', () => {
  const a = anchorsFor(66, { tonicMidi: 60, scaleType: 'major' });
  assert.equal(a.name, 'F#');
  assert.equal(a.diatonic, false);
  assert.equal(a.degree, null);
  assert.equal(a.num, '♯4');
  assert.equal(a.syllable, 'Fi');
});

test('anchorsFor：C 大调里的 C# → ♯1 / Di', () => {
  const a = anchorsFor(61, { tonicMidi: 60, scaleType: 'major' });
  assert.equal(a.diatonic, false);
  assert.equal(a.num, '♯1');
  assert.equal(a.syllable, 'Di');
});

test('CHROMATIC_SYLLABLES：12 个，Do 开头 Ti 结尾', () => {
  assert.equal(CHROMATIC_SYLLABLES.length, 12);
  assert.equal(CHROMATIC_SYLLABLES[0], 'Do');
  assert.equal(CHROMATIC_SYLLABLES[11], 'Ti');
});

// ---- 默认参数 ----
test('anchorsFor：默认主音 C4 / 大调', () => {
  const a = anchorsFor(62);
  assert.equal(a.degree, 2);
  assert.equal(a.syllable, 'Re');
});

// ---- scaleAnchors ----
test('scaleAnchors：C 大调返回 7 个自然音，级数 1..7', () => {
  const arr = scaleAnchors({ tonicMidi: 60, scaleType: 'major' });
  assert.equal(arr.length, 7);
  assert.deepEqual(arr.map((a) => a.degree), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(arr.map((a) => a.name), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  assert.deepEqual(arr.map((a) => a.syllable), ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Ti']);
  assert.ok(arr.every((a) => a.diatonic));
});

test('scaleAnchors：A 小调 7 音名正确', () => {
  const arr = scaleAnchors({ tonicMidi: 69, scaleType: 'minor' });
  assert.deepEqual(arr.map((a) => a.name), ['A', 'B', 'C', 'D', 'E', 'F', 'G']);
  assert.deepEqual(arr.map((a) => a.degree), [1, 2, 3, 4, 5, 6, 7]);
});
