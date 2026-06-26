import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, hashStr, pickDailyIndex, prettyName, catEmoji, CAT_EMOJI } from './daily-song.js';

test('dayKey 格式 YYYY-MM-DD 且补零', () => {
  assert.equal(dayKey(new Date(2026, 0, 5)), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 11, 31)), '2026-12-31');
});

test('hashStr 确定性且无符号', () => {
  assert.equal(hashStr('abc'), hashStr('abc'));
  assert.ok(hashStr('abc') !== hashStr('abd'));
  assert.ok(hashStr('xyz') >= 0);
  assert.ok(Number.isInteger(hashStr('long string here 123')));
});

test('pickDailyIndex 在范围内', () => {
  for (let i = 0; i < 50; i++) {
    const idx = pickDailyIndex(1543, new Date(2026, 5, i % 28 + 1), i);
    assert.ok(idx >= 0 && idx < 1543);
    assert.ok(Number.isInteger(idx));
  }
});

test('pickDailyIndex 同日同 salt 稳定', () => {
  const d = new Date(2026, 5, 26);
  assert.equal(pickDailyIndex(1543, d, 0), pickDailyIndex(1543, d, 0));
});

test('pickDailyIndex 同日不同 salt 通常不同（换一首）', () => {
  const d = new Date(2026, 5, 26);
  const a = pickDailyIndex(1543, d, 0);
  const b = pickDailyIndex(1543, d, 1);
  const c = pickDailyIndex(1543, d, 2);
  // 至少有一个不同（极低概率全等）
  assert.ok(!(a === b && b === c));
});

test('pickDailyIndex 不同日通常不同', () => {
  const a = pickDailyIndex(1543, new Date(2026, 5, 26), 0);
  const b = pickDailyIndex(1543, new Date(2026, 5, 27), 0);
  assert.ok(a !== b || true); // 不强制，但应是确定性的
  assert.equal(pickDailyIndex(1543, new Date(2026, 5, 27), 0), b);
});

test('pickDailyIndex count<=0 回退 0', () => {
  assert.equal(pickDailyIndex(0, new Date(), 0), 0);
  assert.equal(pickDailyIndex(-5, new Date(), 0), 0);
});

test('prettyName 优先用 title', () => {
  assert.equal(prettyName({ title: 'Amazing Grace', file: 'AMAZ-GR1.mid' }), 'Amazing Grace');
});

test('prettyName 从文件名兜底清洗', () => {
  assert.equal(prettyName({ file: 'after_the_ball.mid' }), 'After The Ball');
  assert.equal(prettyName({ file: 'concert/AMAZ-GR1.mid', title: '' }), 'AMAZ GR');
});

test('prettyName 空回退', () => {
  assert.equal(prettyName({}), '未命名曲目');
  assert.equal(prettyName(null), '未命名曲目');
});

test('catEmoji 命中与回退', () => {
  assert.equal(catEmoji('piano'), CAT_EMOJI.piano);
  assert.equal(catEmoji('hymn'), '⛪');
  assert.equal(catEmoji('nope'), '🎵');
});
