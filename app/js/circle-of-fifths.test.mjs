// circle-of-fifths.js 单元测试
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WHEEL, tonicSemitone, accidentalStr, majorScaleSpelling, diatonicChords,
  chordMidi, scaleMidi, wheelIndex, neighbors, signatureLabel, ROMAN,
} from './circle-of-fifths.js';

test('WHEEL 有 12 格且顺时针升五度', () => {
  assert.equal(WHEEL.length, 12);
  // C(0) 的下一格是 G，半音差 +7
  assert.equal(WHEEL[0].major, 'C');
  assert.equal(WHEEL[1].major, 'G');
  assert.equal((tonicSemitone('G') - tonicSemitone('C') + 12) % 12, 7);
  assert.equal((tonicSemitone('D') - tonicSemitone('G') + 12) % 12, 7);
});

test('每格关系大小调主音差 3 个半音（小三度下方）', () => {
  for (const w of WHEEL) {
    const maj = tonicSemitone(w.major);
    const min = tonicSemitone(w.minor.replace(/m$/, ''));
    assert.equal(((maj - min) + 12) % 12, 3, `${w.major}/${w.minor}`);
  }
});

test('tonicSemitone 处理升降记号', () => {
  assert.equal(tonicSemitone('C'), 0);
  assert.equal(tonicSemitone('F#'), 6);
  assert.equal(tonicSemitone('Gb'), 6);
  assert.equal(tonicSemitone('Bb'), 10);
  assert.equal(tonicSemitone('B'), 11);
});

test('accidentalStr 规整升降', () => {
  assert.equal(accidentalStr(0), '');
  assert.equal(accidentalStr(1), '#');
  assert.equal(accidentalStr(2), '##');
  assert.equal(accidentalStr(-1), 'b');
  assert.equal(accidentalStr(-2), 'bb');
});

test('C 大调音阶拼写无升降', () => {
  assert.deepEqual(majorScaleSpelling('C'), ['C', 'D', 'E', 'F', 'G', 'A', 'B']);
});

test('G 大调含 F#', () => {
  assert.deepEqual(majorScaleSpelling('G'), ['G', 'A', 'B', 'C', 'D', 'E', 'F#']);
});

test('F 大调含 Bb', () => {
  assert.deepEqual(majorScaleSpelling('F'), ['F', 'G', 'A', 'Bb', 'C', 'D', 'E']);
});

test('Db 大调拼写全为降号', () => {
  assert.deepEqual(majorScaleSpelling('Db'), ['Db', 'Eb', 'F', 'Gb', 'Ab', 'Bb', 'C']);
});

test('每个音阶字母不重复（正确拼写）', () => {
  for (const w of WHEEL) {
    const key = w.major;
    const letters = majorScaleSpelling(key).map((n) => n[0]);
    assert.equal(new Set(letters).size, 7, `${key} 字母应不重复`);
  }
});

test('diatonicChords 返回 7 级且罗马数字正确', () => {
  const ch = diatonicChords('C');
  assert.equal(ch.length, 7);
  assert.deepEqual(ch.map((c) => c.roman), ROMAN);
  assert.deepEqual(ch.map((c) => c.name), ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'Bdim']);
});

test('G 大调顺阶和弦', () => {
  const ch = diatonicChords('G');
  assert.deepEqual(ch.map((c) => c.name), ['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim']);
});

test('和弦质量分布 maj/min/min/maj/maj/min/dim', () => {
  const q = diatonicChords('C').map((c) => c.quality);
  assert.deepEqual(q, ['', 'm', 'm', '', '', 'm', 'dim']);
});

test('chordMidi I 级 = C E G', () => {
  assert.deepEqual(chordMidi('C', 1, 60), [60, 64, 67]);
});

test('chordMidi V 级 G = G B D', () => {
  assert.deepEqual(chordMidi('C', 5, 60), [67, 71, 74]);
});

test('chordMidi vii° = B D F（减三和弦）', () => {
  assert.deepEqual(chordMidi('C', 7, 60), [71, 74, 77]);
});

test('scaleMidi 大调 8 音含高八度主音', () => {
  assert.deepEqual(scaleMidi('C', 60), [60, 62, 64, 65, 67, 69, 71, 72]);
});

test('scaleMidi 小调用自然小调步进', () => {
  assert.deepEqual(scaleMidi('Am', 48), [57, 59, 60, 62, 64, 65, 67, 69]);
});

test('wheelIndex 找位置含等音', () => {
  assert.equal(wheelIndex('C'), 0);
  assert.equal(wheelIndex('F#'), 6);
  assert.equal(wheelIndex('Gb'), 6);
  assert.equal(wheelIndex('F'), 11);
});

test('neighbors 顺/逆时针与关系小调', () => {
  const n = neighbors('C');
  assert.equal(n.cw, 'G');
  assert.equal(n.ccw, 'F');
  assert.equal(n.relativeMinor, 'Am');
  const g = neighbors('G');
  assert.equal(g.cw, 'D');
  assert.equal(g.ccw, 'C');
});

test('signatureLabel 文案', () => {
  assert.equal(signatureLabel(WHEEL[0]), '无升降号');
  assert.equal(signatureLabel(WHEEL[1]), '1 个升号 ♯');
  assert.equal(signatureLabel(WHEEL[11]), '1 个降号 ♭');
  assert.match(signatureLabel(WHEEL[6]), /♯ \/ .*♭/);
});

test('所有大调 chordMidi 三和弦音程合法', () => {
  for (const w of WHEEL) {
    for (let d = 1; d <= 7; d++) {
      const notes = chordMidi(w.major, d, 60);
      assert.equal(notes.length, 3);
      assert.ok(notes[1] - notes[0] >= 3 && notes[1] - notes[0] <= 4);
      assert.ok(notes[2] - notes[1] >= 3 && notes[2] - notes[1] <= 4);
    }
  }
});
