import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pitchesFromSeq, noteMatch, MelodyPalace } from './melody-palace.js';

const TWINKLE = [60, 60, 67, 67, 69, 69, 67]; // 小星星前 7 音

test('pitchesFromSeq 从 [midi,beats] 提取音高', () => {
  const seq = [[60, 1], [62, 0.5], [64, 2]];
  assert.deepEqual(pitchesFromSeq(seq), [60, 62, 64]);
});

test('pitchesFromSeq 从 {midi} 对象提取', () => {
  const seq = [{ midi: 60, beat: 0 }, { midi: 64, beat: 1 }];
  assert.deepEqual(pitchesFromSeq(seq), [60, 64]);
});

test('pitchesFromSeq 过滤非法项', () => {
  assert.deepEqual(pitchesFromSeq([[60, 1], [null, 1], ['x', 1]]), [60]);
  assert.deepEqual(pitchesFromSeq(null), []);
});

test('noteMatch 忽略八度比音名', () => {
  assert.ok(noteMatch(60, 72));       // C4 vs C5
  assert.ok(!noteMatch(60, 62));      // C vs D
  assert.ok(noteMatch(60, 60, false)); // 精确
  assert.ok(!noteMatch(60, 72, false));// 精确不算
});

test('noteMatch 容差半音', () => {
  assert.ok(noteMatch(60, 61, false, 1));  // 差 1 半音
  assert.ok(!noteMatch(60, 62, false, 1)); // 差 2 半音
  assert.ok(noteMatch(60, 73, true, 1));   // 忽略八度 + 容差 1（C vs C#5）
});

test('noteMatch 容差跨八度环绕', () => {
  // B(11) vs C(0) pitch-class 距离 1
  assert.ok(noteMatch(71, 72, true, 1));
  assert.ok(!noteMatch(71, 72, true, 0));
});

test('构造：初始 revealLen=startLen，状态 showing', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  assert.equal(g.revealLen, 3);
  assert.equal(g.state, 'showing');
  assert.deepEqual(g.current(), [60, 60, 67]);
});

test('空旋律 → idle', () => {
  const g = new MelodyPalace([], { startLen: 3 });
  assert.equal(g.state, 'idle');
  assert.equal(g.revealLen, 0);
});

test('startLen 不超过曲长', () => {
  const g = new MelodyPalace([60, 62], { startLen: 5 });
  assert.equal(g.revealLen, 2);
});

test('ready 进入 input，pos 归零', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  g.ready();
  assert.equal(g.state, 'input');
  assert.equal(g.pos, 0);
});

test('play 仅 input 状态有效', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  assert.equal(g.play(60), null); // 还在 showing
});

test('逐音复奏成功 → win（未到曲尾）', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  g.ready();
  let r = g.play(60); assert.ok(r.ok && !r.done);
  r = g.play(60); assert.ok(r.ok && !r.done);
  r = g.play(67); assert.ok(r.ok && r.done && !r.whole);
  assert.equal(g.state, 'win');
  assert.equal(g.rounds, 1);
  assert.equal(g.best, 3);
});

test('忽略八度：任意八度复奏算对', () => {
  const g = new MelodyPalace([60, 64], { startLen: 2, ignoreOctave: true });
  g.ready();
  assert.ok(g.play(72).ok); // C5 == C4
  assert.ok(g.play(76).done); // E5 == E4
});

test('弹错 → fail，记录 lastError', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  g.ready();
  g.play(60);
  const r = g.play(62); // 应是 60
  assert.ok(!r.ok);
  assert.equal(g.state, 'fail');
  assert.equal(g.lastError.expected, 60);
  assert.equal(g.lastError.actual, 62);
  assert.equal(g.lastError.pos, 1);
});

test('advance 生长一个音，回到 showing', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  g.ready(); g.play(60); g.play(60); g.play(67);
  const next = g.advance();
  assert.equal(g.revealLen, 4);
  assert.equal(g.state, 'showing');
  assert.deepEqual(next, [60, 60, 67, 67]);
});

test('grow 选项：每轮长多个音', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 2, grow: 2 });
  g.ready(); g.play(60); g.play(60);
  g.advance();
  assert.equal(g.revealLen, 4);
});

test('揭示到曲尾并复奏成功 → mastered', () => {
  const mel = [60, 62, 64];
  const g = new MelodyPalace(mel, { startLen: 3 });
  g.ready();
  g.play(60); g.play(62);
  const r = g.play(64);
  assert.ok(r.done && r.whole);
  assert.equal(g.state, 'mastered');
});

test('mastered 后 advance 不再生长', () => {
  const g = new MelodyPalace([60, 62], { startLen: 2 });
  g.ready(); g.play(60); g.play(62);
  assert.equal(g.state, 'mastered');
  g.advance();
  assert.equal(g.revealLen, 2);
  assert.equal(g.state, 'mastered');
});

test('retry 重试本轮不生长', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 3 });
  g.ready(); g.play(60); g.play(62); // 错
  assert.equal(g.state, 'fail');
  const cur = g.retry();
  assert.equal(g.revealLen, 3);
  assert.equal(g.state, 'showing');
  assert.equal(g.pos, 0);
  assert.equal(g.lastError, null);
  assert.deepEqual(cur, [60, 60, 67]);
});

test('容错模式：差 1 半音也放行', () => {
  const g = new MelodyPalace([60, 64], { startLen: 2, ignoreOctave: false, tolerant: true, semis: 1 });
  g.ready();
  assert.ok(g.play(61).ok);  // 期望 60，弹 61，容差内
  assert.ok(g.play(64).done);
});

test('严格模式默认无容差', () => {
  const g = new MelodyPalace([60, 64], { startLen: 2, ignoreOctave: false });
  g.ready();
  assert.ok(!g.play(61).ok); // 差 1 半音不算
});

test('best 跟踪最长正确串', () => {
  const g = new MelodyPalace(TWINKLE, { startLen: 4 });
  g.ready();
  g.play(60); g.play(60); g.play(67); // 对到 3
  g.play(62); // 错（应 67）
  assert.equal(g.best, 3);
});

test('progress 反映掌握比例', () => {
  const g = new MelodyPalace([60, 62, 64, 65], { startLen: 1 });
  assert.equal(g.progress(), 0.25);
  g.ready(); g.play(60); g.advance();
  assert.equal(g.progress(), 0.5);
});

test('完整走完整首曲子', () => {
  const mel = [60, 62, 64];
  const g = new MelodyPalace(mel, { startLen: 1 });
  // 轮 1：[60]
  g.ready(); assert.ok(g.play(60).done);
  g.advance();
  // 轮 2：[60,62]
  g.ready(); g.play(60); assert.ok(g.play(62).done);
  g.advance();
  // 轮 3：[60,62,64] → mastered
  g.ready(); g.play(60); g.play(62);
  const r = g.play(64);
  assert.ok(r.whole);
  assert.equal(g.state, 'mastered');
  assert.equal(g.rounds, 3);
});
