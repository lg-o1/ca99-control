import test from 'node:test';
import assert from 'node:assert/strict';
import { PC_COLORS, pitchClass, noteColor, scaffoldStrength, isWeaned } from './note-color.js';

test('pitchClass 归一到 0..11', () => {
  assert.equal(pitchClass(60), 0);   // C
  assert.equal(pitchClass(62), 2);   // D
  assert.equal(pitchClass(71), 11);  // B
  assert.equal(pitchClass(72), 0);   // 高八度 C 同色
  assert.equal(pitchClass(48), 0);   // 低八度 C 同色
});

test('noteColor 七个白键走彩虹（C 红 … B 紫）', () => {
  assert.equal(noteColor(60), PC_COLORS[0]);   // C 红
  assert.equal(noteColor(64), PC_COLORS[4]);   // E 黄
  assert.equal(noteColor(67), PC_COLORS[7]);   // G 蓝
  assert.equal(noteColor(71), PC_COLORS[11]);  // B 紫
  // 同名异八度同色
  assert.equal(noteColor(72), noteColor(60));
});

test('PC_COLORS 为 12 个合法 hex', () => {
  assert.equal(PC_COLORS.length, 12);
  PC_COLORS.forEach((c) => assert.match(c, /^#[0-9a-f]{6}$/i));
});

test('scaffoldStrength：样本不足一律满色', () => {
  assert.equal(scaffoldStrength({ correct: 7, attempts: 7 }), 1);   // <8
  assert.equal(scaffoldStrength({}), 1);
});

test('scaffoldStrength：正确率未过阈值 → 满色', () => {
  assert.equal(scaffoldStrength({ correct: 8, attempts: 10 }), 1);  // 80% ≤ 85%
  assert.equal(scaffoldStrength({ correct: 17, attempts: 20 }), 1); // 85% 恰好不淡出
});

test('scaffoldStrength：越练越准 → 越淡', () => {
  const mid = scaffoldStrength({ correct: 19, attempts: 20 });      // 95%
  assert.ok(mid > 0 && mid < 1);
  // 92.5% 约在中点
  const half = scaffoldStrength({ correct: 37, attempts: 40 });     // 92.5%
  assert.ok(Math.abs(half - 0.5) < 0.05);
});

test('scaffoldStrength：接近全对 → 几乎隐去', () => {
  const s = scaffoldStrength({ correct: 100, attempts: 100 });      // 100%
  assert.equal(s, 0);
  assert.equal(isWeaned({ correct: 100, attempts: 100 }), true);
  assert.equal(isWeaned({ correct: 8, attempts: 10 }), false);
});
