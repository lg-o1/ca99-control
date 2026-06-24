/**
 * sight-phrase.test.mjs — 乐句视奏引擎单元测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SightPhrase, KEYS, keyById, scaleSteps, degreeToMidi, samePitchClass,
  keySignatureAccidentals, durGlyph, RHYTHM_LEVELS, MAJOR_STEPS, MINOR_STEPS,
} from './sight-phrase.js';

// 确定性 rng：循环输出固定序列
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }

// ---- 调库 ----
test('KEYS：字段齐全、升降号 ≤2', () => {
  assert.ok(KEYS.length >= 6);
  for (const k of KEYS) {
    assert.ok(k.id && k.name && k.tonic >= 0 && (k.scale === 'major' || k.scale === 'minor'));
    assert.ok(k.sig && ['sharp', 'flat', 'none'].includes(k.sig.type));
    assert.ok(k.sig.count <= 2);
  }
});

test('keyById 取调，未知回退 C', () => {
  assert.equal(keyById('G').id, 'G');
  assert.equal(keyById('不存在').id, 'C');
});

// ---- 音阶/级数映射 ----
test('scaleSteps 返回大/小调步进', () => {
  assert.deepEqual(scaleSteps('major'), MAJOR_STEPS);
  assert.deepEqual(scaleSteps('minor'), MINOR_STEPS);
  assert.deepEqual(scaleSteps('other'), MAJOR_STEPS);
});

test('degreeToMidi：跨八度与负级数', () => {
  assert.equal(degreeToMidi(60, 'major', 0), 60);  // 主音
  assert.equal(degreeToMidi(60, 'major', 7), 72);  // 高八度主音
  assert.equal(degreeToMidi(60, 'major', 4), 67);  // 五级=G4
  assert.equal(degreeToMidi(60, 'major', -1), 59); // 下方七级=B3
  assert.equal(degreeToMidi(57, 'minor', 2), 60);  // Am 三级=C4
});

test('samePitchClass 忽略八度', () => {
  assert.ok(samePitchClass(60, 72));
  assert.ok(!samePitchClass(60, 61));
});

// ---- 调号 ----
test('keySignatureAccidentals：升降号字母按标准顺序', () => {
  assert.deepEqual(keySignatureAccidentals({ type: 'none', count: 0 }), { type: 'none', letters: [] });
  assert.deepEqual(keySignatureAccidentals({ type: 'sharp', count: 1 }), { type: 'sharp', letters: ['F'] });
  assert.deepEqual(keySignatureAccidentals({ type: 'sharp', count: 2 }), { type: 'sharp', letters: ['F', 'C'] });
  assert.deepEqual(keySignatureAccidentals({ type: 'flat', count: 2 }), { type: 'flat', letters: ['B', 'E'] });
});

// ---- 时值记谱 ----
test('durGlyph：实心/空心与符尾旗', () => {
  assert.equal(durGlyph(2).filled, false);  // 二分=空心
  assert.equal(durGlyph(1).filled, true);   // 四分=实心无旗
  assert.equal(durGlyph(1).flags, 0);
  assert.equal(durGlyph(0.5).flags, 1);     // 八分=1 旗
  assert.equal(durGlyph(1.5).dotted, true); // 附点四分
});

// ---- 节奏生成：每小节恰好填满 meter ----
test('生成节奏：每小节时值之和恰为 meter', () => {
  const sp = new SightPhrase({ measures: 3, meter: 4, rhythm: 'hard' });
  for (let trial = 0; trial < 30; trial++) {
    sp.next();
    // 按小节切分校验
    let acc = 0, measSum = 0;
    for (const n of sp.phrase) {
      measSum += n.dur; acc += n.dur;
      if (Math.abs(measSum - 4) < 1e-9) measSum = 0;
    }
    assert.ok(Math.abs(measSum) < 1e-9, '最后一小节也应填满');
    assert.ok(Math.abs(acc - 12) < 1e-9, '总拍数=measures×meter');
  }
});

test('easy 难度只用四分/二分', () => {
  const sp = new SightPhrase({ rhythm: 'easy', measures: 4 });
  for (let t = 0; t < 20; t++) {
    sp.next();
    for (const n of sp.phrase) assert.ok(RHYTHM_LEVELS.easy.includes(n.dur));
  }
});

// ---- 旋律生成：首尾主音、调内、范围克制 ----
test('生成旋律：首音与尾音都是主音，倒数第二个级进收束', () => {
  const sp = new SightPhrase({ key: keyById('C'), measures: 2, rhythm: 'easy' });
  for (let t = 0; t < 30; t++) {
    const ph = sp.next();
    assert.equal(ph[0].degree, 0, '首音主音');
    assert.equal(ph[ph.length - 1].degree, 0, '尾音主音');
    if (ph.length >= 2) assert.ok(Math.abs(ph[ph.length - 2].degree) === 1, '倒数第二邻音');
  }
});

test('所有音都在调内（音级属于音阶）', () => {
  const sp = new SightPhrase({ key: keyById('G'), measures: 3, rhythm: 'medium' });
  const steps = scaleSteps('major');
  for (let t = 0; t < 20; t++) {
    sp.next();
    for (const n of sp.phrase) {
      const rel = ((n.midi - 67) % 12 + 12) % 12;
      assert.ok(steps.includes(rel), `音 ${n.midi} 应在 G 大调内`);
    }
  }
});

test('级数不超出 [low, high] 设定', () => {
  const sp = new SightPhrase({ measures: 4, rhythm: 'hard', lowDegree: -1, highDegree: 8 });
  for (let t = 0; t < 30; t++) {
    sp.next();
    for (const n of sp.phrase) {
      assert.ok(n.degree >= -1 && n.degree <= 8, `级数 ${n.degree} 越界`);
    }
  }
});

test('拍位累加正确（beat 等于前面时值之和）', () => {
  const sp = new SightPhrase({ measures: 2, rhythm: 'medium' });
  sp.next();
  let acc = 0;
  for (const n of sp.phrase) { assert.ok(Math.abs(n.beat - acc) < 1e-9); acc += n.dur; }
  assert.ok(Math.abs(sp.totalBeats - acc) < 1e-9);
});

// ---- 逐音校验 ----
test('play：按序弹对推进，整句全对得分+连击', () => {
  const sp = new SightPhrase({ key: keyById('C'), measures: 1, rhythm: 'easy', octaveAgnostic: false });
  const ph = sp.next();
  let res;
  for (let i = 0; i < ph.length; i++) {
    res = sp.play(ph[i].midi);
    if (i < ph.length - 1) { assert.equal(res.ok, true); assert.equal(res.done, false); }
  }
  assert.equal(res.done, true);
  assert.equal(res.correct, true);
  assert.equal(sp.score, 1);
  assert.equal(sp.streak, 1);
});

test('play：弹错不前进、计一次错，整句完成但不计满分', () => {
  const sp = new SightPhrase({ key: keyById('C'), measures: 1, rhythm: 'easy', octaveAgnostic: false });
  const ph = sp.next();
  const wrong = ph[0].midi + 1; // 半音错音
  const r0 = sp.play(wrong);
  assert.equal(r0.ok, false);
  assert.equal(sp.pos, 0, '错音不前进');
  assert.equal(sp.mistakes, 1);
  for (const n of ph) sp.play(n.midi);
  assert.equal(sp.score, 0, '有错不计满分');
  assert.equal(sp.streak, 0);
  assert.equal(sp.attempts, 1);
});

test('octaveAgnostic：忽略八度时高八度也算对', () => {
  const sp = new SightPhrase({ key: keyById('C'), measures: 1, rhythm: 'easy', octaveAgnostic: true });
  const ph = sp.next();
  const r = sp.play(ph[0].midi + 12);
  assert.equal(r.ok, true);
  const strict = new SightPhrase({ key: keyById('C'), measures: 1, rhythm: 'easy', octaveAgnostic: false });
  const ph2 = strict.next();
  assert.equal(strict.play(ph2[0].midi + 12).ok, false);
});

test('expected 返回当前待弹音；弹完返回 null', () => {
  const sp = new SightPhrase({ measures: 1, rhythm: 'easy', octaveAgnostic: false });
  const ph = sp.next();
  assert.equal(sp.expected(), ph[0].midi);
  for (const n of ph) sp.play(n.midi);
  assert.equal(sp.expected(), null);
});

test('giveUp：算一次尝试、连击清零、不计分', () => {
  const sp = new SightPhrase({ measures: 1, rhythm: 'easy' });
  sp.next();
  sp.giveUp();
  assert.equal(sp.attempts, 1);
  assert.equal(sp.score, 0);
  assert.equal(sp.streak, 0);
  assert.equal(sp.phrase.length, 0);
});

test('range：返回旋律音高范围', () => {
  const sp = new SightPhrase({ key: keyById('C'), measures: 2, rhythm: 'easy' });
  sp.next();
  const [lo, hi] = sp.range();
  assert.ok(lo <= hi);
  assert.ok(sp.phrase.every((n) => n.midi >= lo && n.midi <= hi));
});

test('accuracy 与 reset', () => {
  const sp = new SightPhrase({ measures: 1, rhythm: 'easy', octaveAgnostic: false });
  const ph = sp.next();
  for (const n of ph) sp.play(n.midi);
  assert.equal(sp.accuracy, 1);
  sp.reset();
  assert.equal(sp.attempts, 0);
  assert.equal(sp.phrase.length, 0);
  assert.equal(sp.accuracy, 0);
});

test('每个预置调都能生成可弹的乐句', () => {
  for (const k of KEYS) {
    const sp = new SightPhrase({ key: k, measures: 2, rhythm: 'medium' });
    const ph = sp.next();
    assert.ok(ph.length >= 2, `${k.id} 应有音符`);
    const [lo, hi] = sp.range();
    assert.ok(lo >= 21 && hi <= 108, `${k.id} 音高应在 88 键内`);
  }
});
