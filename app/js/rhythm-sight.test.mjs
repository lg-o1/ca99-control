import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RhythmSight, rhythmGlyph, CELL_PATTERNS, DEFAULT_TOL } from './rhythm-sight.js';

function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }

test('rhythmGlyph 区分时值', () => {
  assert.equal(rhythmGlyph(2).filled, false);          // 二分空心
  assert.equal(rhythmGlyph(1).filled, true);           // 四分实心无旗
  assert.equal(rhythmGlyph(1).beams, 0);
  assert.equal(rhythmGlyph(0.5).beams, 1);             // 八分一旗
  assert.equal(rhythmGlyph(0.25).beams, 2);            // 十六分两旗
  assert.equal(rhythmGlyph(1.5).dotted, true);         // 附点四分
});

test('next：每小节时值正好填满 meter', () => {
  for (const diff of ['easy', 'medium', 'hard']) {
    const g = new RhythmSight({ meter: 4, measures: 3, difficulty: diff });
    g.next();
    // 按 measure 分组求和
    const sums = {};
    for (const e of g.events) sums[e.measure] = (sums[e.measure] || 0) + e.dur;
    for (const m of Object.keys(sums)) assert.ok(Math.abs(sums[m] - 4) < 1e-9, `diff=${diff} measure=${m} sum=${sums[m]}`);
  }
});

test('next：3/4 拍每小节填满 3 拍', () => {
  const g = new RhythmSight({ meter: 3, measures: 2, difficulty: 'medium' });
  g.next();
  const sums = {};
  for (const e of g.events) sums[e.measure] = (sums[e.measure] || 0) + e.dur;
  for (const m of Object.keys(sums)) assert.ok(Math.abs(sums[m] - 3) < 1e-9);
});

test('totalBeats = measures × meter', () => {
  const g = new RhythmSight({ meter: 4, measures: 2 });
  g.next();
  assert.equal(g.totalBeats, 8);
});

test('第一个事件一定是该击打（非休止）', () => {
  // 用一个会先吐高随机值（让第一个 cell 选到休止）的 rng
  const g = new RhythmSight({ meter: 4, measures: 1, difficulty: 'easy', rng: seqRng([0.99, 0.99, 0.99, 0.99, 0.99]) });
  g.next();
  assert.equal(g.events[0].rest, false);
});

test('onsets 只含非休止事件的 beat', () => {
  const g = new RhythmSight({ meter: 4, measures: 2 });
  g.next();
  const expectOnsets = g.events.filter((e) => !e.rest).map((e) => e.beat);
  assert.deepEqual(g.onsets, expectOnsets);
});

test('expectedTimes 按 BPM 换算落点毫秒', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next(); // 全四分：onsets = [0,1,2,3]
  const beatMs = 60000 / 120; // 500
  const t = g.expectedTimes(1000);
  assert.deepEqual(t, g.onsets.map((b) => 1000 + b * beatMs));
});

test('grade：完美击中全部落点', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  const res = g.grade(exp, 0);
  assert.equal(res.perfect, g.onsets.length);
  assert.equal(res.miss, 0);
  assert.equal(res.extra, 0);
  assert.equal(res.score, 1);
  assert.equal(res.tendency, 'even');
});

test('grade：稍偏判 good，明显偏判 miss', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  // 每拍晚 130ms（>perfect90, <good200 → good）
  const taps = exp.map((e) => e + 130);
  const res = g.grade(taps, 0);
  assert.equal(res.good, g.onsets.length);
  assert.equal(res.perfect, 0);
  assert.equal(res.tendency, 'late');
});

test('grade：漏击计 miss', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  // 只击前两拍
  const res = g.grade(exp.slice(0, 2), 0);
  assert.equal(res.miss, g.onsets.length - 2);
});

test('grade：多余击打计 extra', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  const taps = [...exp, 99999]; // 一个远处的乱击
  const res = g.grade(taps, 0);
  assert.equal(res.extra, 1);
});

test('grade：偏早 tendency=early，deltaMs 为负', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  const taps = exp.map((e) => e - 60);
  const res = g.grade(taps, 0);
  assert.equal(res.tendency, 'early');
  assert.ok(res.results.every((r) => r.deltaMs < 0));
});

test('submit：全 perfect 时连击+1、score+1', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  g.submit(exp, 0);
  assert.equal(g.streak, 1);
  assert.equal(g.score, 1);
  assert.equal(g.attempts, 1);
});

test('submit：有漏击则连击清零', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  g.submit(exp, 0);           // perfect → streak 1
  g.next();
  const exp2 = g.expectedTimes(0);
  g.submit(exp2.slice(0, 1), 0); // 大量漏击
  assert.equal(g.streak, 0);
});

test('avgAbs / maxAbs 统计命中误差', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next();
  const exp = g.expectedTimes(0);
  const taps = exp.map((e, i) => e + (i === 0 ? 100 : 0));
  const res = g.grade(taps, 0);
  assert.ok(res.maxAbs >= 100 - 1);
  assert.ok(res.avgAbs > 0);
});

test('next 返回拷贝，外部改动不污染引擎', () => {
  const g = new RhythmSight({ meter: 4, measures: 1 });
  const c = g.next();
  c.events.push({ beat: 99 });
  c.onsets.push(99);
  assert.ok(!g.onsets.includes(99));
});

test('accuracy = score/attempts', () => {
  const g = new RhythmSight({ meter: 4, measures: 1, bpm: 120, difficulty: 'easy', rng: seqRng([0, 0, 0, 0]) });
  g.next(); g.submit(g.expectedTimes(0), 0);
  assert.equal(g.accuracy, 1);
});

test('CELL_PATTERNS 各难度的每个模式都正好 1 拍', () => {
  for (const diff of Object.keys(CELL_PATTERNS)) {
    for (const pat of CELL_PATTERNS[diff]) {
      const sum = pat.reduce((s, n) => s + n.d, 0);
      assert.ok(Math.abs(sum - 1) < 1e-9, `${diff} 模式和=${sum}`);
    }
  }
});

test('DEFAULT_TOL 合理', () => {
  assert.ok(DEFAULT_TOL.perfect < DEFAULT_TOL.good);
});

test('hard 难度会出现十六分音符', () => {
  // 跑多次确保至少一次出现 dur=0.25
  let found = false;
  for (let s = 0; s < 50 && !found; s++) {
    const g = new RhythmSight({ meter: 4, measures: 2, difficulty: 'hard', rng: seqRng([s / 50, 0.3, 0.6, 0.9, 0.1]) });
    g.next();
    if (g.events.some((e) => Math.abs(e.dur - 0.25) < 1e-9)) found = true;
  }
  assert.ok(found);
});
