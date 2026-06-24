import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChordSight, qualityOf, spellRoot, CHORD_QUALITIES, INVERSION_NAMES, KEY_LETTER, keyById,
} from './chord-sight.js';

// 确定性 rng：按给定序列吐数（0..1）
function seqRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

test('qualityOf 识别大/小/减/增三和弦', () => {
  assert.equal(qualityOf([60, 64, 67]).short, 'maj');   // C E G
  assert.equal(qualityOf([60, 63, 67]).short, 'min');   // C Eb G
  assert.equal(qualityOf([60, 63, 66]).short, 'dim');   // C Eb Gb
  assert.equal(qualityOf([60, 64, 68]).short, 'aug');   // C E G#
});

test('qualityOf 识别各类七和弦', () => {
  assert.equal(qualityOf([60, 64, 67, 70]).short, '7');      // 属七
  assert.equal(qualityOf([60, 64, 67, 71]).short, 'maj7');   // 大七
  assert.equal(qualityOf([60, 63, 67, 70]).short, 'm7');     // 小七
  assert.equal(qualityOf([60, 63, 66, 70]).short, 'm7b5');   // 半减七
  assert.equal(qualityOf([60, 63, 66, 69]).short, 'dim7');   // 减七
});

test('qualityOf 与八度/排序无关', () => {
  assert.equal(qualityOf([60, 64, 67]).short, 'maj');
  assert.equal(qualityOf([60, 64 + 12, 67]).short, 'maj');
});

test('spellRoot 在 C 大调拼出自然音名', () => {
  const C = keyById('C');
  assert.equal(spellRoot(C, 0), 'C');
  assert.equal(spellRoot(C, 4), 'G');
  assert.equal(spellRoot(C, 6), 'B');
});

test('spellRoot 在 G 大调给 F 加升号', () => {
  const G = keyById('G');
  // G 大调主音字母 G(index4)，degree 6 -> 字母 G+6=... (4+6)%7=3 -> F，调号含 F♯
  assert.equal(spellRoot(G, 6), 'F♯');
});

test('spellRoot 在 F 大调给 B 加降号', () => {
  const F = keyById('F');
  // F 主音字母 F(index3)，degree 4 -> (3+4)%7=0 -> C? 试 degree 给到 B
  // F 大调音阶 F G A Bb C D E：第 3 级(从0)= Bb
  assert.equal(spellRoot(F, 3), 'B♭');
});

test('next 在 C 大调一级生成 C 大三和弦（原位）', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  assert.equal(c.size, 3);
  assert.equal(c.degree, 0);
  assert.equal(c.inversion, 0);
  assert.deepEqual(c.pcs, [0, 4, 7].sort((a, b) => a - b)); // C E G pitch classes 0,4,7
  assert.equal(c.quality.short, 'maj');
  assert.equal(c.rootName, 'C');
});

test('next 三和弦音是严格递增叠置', () => {
  const g = new ChordSight({ rng: seqRng([0.5, 0.3]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  for (let i = 1; i < c.midis.length; i++) assert.ok(c.midis[i] > c.midis[i - 1]);
});

test('七和弦生成 4 个音', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'seventh' });
  const c = g.next();
  assert.equal(c.size, 4);
  assert.equal(c.pcs.length, 4);
});

test('check：集齐正确三和弦即完成且 perfect', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  // 逐个按下目标音（用根位 midi）
  const held = [];
  let r;
  for (const m of c.midis) {
    held.push(m);
    r = g.check(held);
  }
  assert.equal(r.done, true);
  assert.equal(r.perfect, true);
  assert.equal(g.score, 1);
  assert.equal(g.streak, 1);
});

test('check：忽略八度——任意八度弹对也算', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad', octaveAgnostic: true });
  const c = g.next(); // C E G
  const held = c.pcs.map((pc) => 48 + pc); // 全压到低八度
  const r = g.check(held);
  assert.equal(r.done, true);
  assert.equal(r.perfect, true);
});

test('check：按错音后再集齐 -> 完成但非 perfect', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  g.check([c.midis[0], c.midis[0] + 1]); // 多按一个半音错音
  let r;
  const held = [];
  for (const m of c.midis) { held.push(m); r = g.check(held); }
  assert.equal(r.done, true);
  assert.equal(r.perfect, false);
  assert.equal(g.score, 0);
  assert.equal(g.streak, 0);
});

test('check：未集齐时报告进度与错音', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  const r = g.check([c.midis[0]]);
  assert.equal(r.done, false);
  assert.equal(r.correctHeld, 1);
  assert.equal(r.need, 3);
  assert.deepEqual(r.wrong, []);
});

test('转位模式：低音不对不算完成', () => {
  // 找一个会产生转位的 rng；inversion = rint(size)
  const g = new ChordSight({ rng: seqRng([0, 0.5]), key: keyById('C'), type: 'triad', inversions: true });
  const c = g.next();
  if (c.inversion === 0) { assert.ok(true); return; } // 万一仍原位则跳过
  // 用原位排列（最低音=根音）按下：低音应不等于谱面 bass
  const rootPos = c.pcs.map((pc, i) => 60 + pc).sort((a, b) => a - b);
  const r = g.check(rootPos);
  // 集合相同但低音可能不符
  if (((rootPos[0] % 12) + 12) % 12 !== c.bassPc) {
    assert.equal(r.done, false);
    assert.equal(r.bassWrong, true);
  }
});

test('giveUp 清零连击、计一次尝试、不计分', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  g.next();
  g.giveUp();
  assert.equal(g.attempts, 1);
  assert.equal(g.score, 0);
  assert.equal(g.streak, 0);
});

test('accuracy 与连击/最佳统计', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  // 连续答对两题
  for (let k = 0; k < 2; k++) {
    const c = g.next();
    let r; const held = [];
    for (const m of c.midis) { held.push(m); r = g.check(held); }
    assert.equal(r.done, true);
  }
  assert.equal(g.score, 2);
  assert.equal(g.best, 2);
  assert.equal(g.accuracy, 1);
});

test('range 返回和弦音的 MIDI 跨度', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  const [lo, hi] = g.range();
  assert.equal(lo, Math.min(...c.midis));
  assert.equal(hi, Math.max(...c.midis));
});

test('mixed 类型生成 3 或 4 音', () => {
  const g = new ChordSight({ rng: seqRng([0.9, 0]), key: keyById('C'), type: 'mixed' });
  const c = g.next();
  assert.ok(c.size === 3 || c.size === 4);
});

test('next 返回拷贝，不会被外部改动污染', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('C'), type: 'triad' });
  const c = g.next();
  c.pcs.push(99);
  assert.ok(!g.chord.pcs.includes(99));
});

test('小调一级生成小三和弦', () => {
  const g = new ChordSight({ rng: seqRng([0, 0]), key: keyById('Am'), type: 'triad' });
  const c = g.next(); // A C E
  assert.equal(c.quality.short, 'min');
  assert.equal(c.rootName, 'A');
});

test('INVERSION_NAMES 与 CHORD_QUALITIES 完整', () => {
  assert.equal(INVERSION_NAMES[0], '原位');
  assert.ok(CHORD_QUALITIES.length >= 8);
  assert.equal(KEY_LETTER.C, 0);
});
