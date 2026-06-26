import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PlayMood, MOODS, moodById, tempoFeel, TEMPO_FAST, TEMPO_SLOW,
} from './play-mood.js';

test('MOODS：6 张情绪卡，字段齐全', () => {
  assert.equal(MOODS.length, 6);
  for (const m of MOODS) {
    assert.ok(m.id && m.name && m.emoji);
    assert.ok(typeof m.hue === 'number');
    assert.ok(['slow', 'med', 'fast'].includes(m.tempo));
    assert.ok(Array.isArray(m.qualities) && m.qualities.length >= 1);
    assert.ok(m.blurb && m.blurb.length > 0);
  }
});

test('moodById：命中 + 兜底', () => {
  assert.equal(moodById('storm').name, '暴风雨');
  assert.equal(moodById('nope').id, MOODS[0].id);
});

test('tempoFeel：快/慢/中速分档', () => {
  assert.equal(tempoFeel(TEMPO_FAST + 1), 'fast');
  assert.equal(tempoFeel(TEMPO_SLOW - 0.5), 'slow');
  assert.equal(tempoFeel((TEMPO_FAST + TEMPO_SLOW) / 2), 'med');
});

test('roll：选卡且不重复上一张', () => {
  // 固定 rng 始终返回同一下标 → 第二次应被推到下一张
  const pm = new PlayMood({ rng: () => 0 });
  const a = pm.roll();
  const b = pm.roll();
  assert.notEqual(a.id, b.id);
});

test('choose：按 id 直接选卡', () => {
  const pm = new PlayMood();
  assert.equal(pm.choose('magic').id, 'magic');
});

test('addNote 仅录制中生效', () => {
  const pm = new PlayMood();
  pm.choose('happy');
  assert.equal(pm.addNote(60, 90, 0), false); // 未 start
  pm.start(0);
  assert.equal(pm.addNote(60, 90, 0), true);
  assert.equal(pm.noteCount, 1);
});

test('addNote 力度夹到 1..127', () => {
  const pm = new PlayMood();
  pm.choose('happy'); pm.start(0);
  pm.addNote(60, 200, 0);
  pm.addNote(62, -5, 10);
  assert.equal(pm.notes[0].vel, 127);
  assert.equal(pm.notes[1].vel, 1);
});

test('expression：空演奏安全', () => {
  const pm = new PlayMood();
  pm.choose('calm');
  const s = pm.expression();
  assert.equal(s.noteCount, 0);
  assert.equal(s.dynamic, null);
});

test('expression：平均力度 → 力度档', () => {
  const pm = new PlayMood();
  pm.choose('storm'); pm.start(0);
  pm.addNote(60, 120, 0);
  pm.addNote(64, 110, 200);
  const s = pm.expression();
  assert.equal(s.noteCount, 2);
  assert.equal(s.avgVel, 115);
  assert.equal(s.dynamic.key, 'ff'); // 106..127
});

test('expression：音域 span 与速度感', () => {
  const pm = new PlayMood();
  pm.choose('happy'); pm.start(0);
  // 5 个音跨 1000ms → 4 间隔/1s = 4 nps → fast；音域 C4..C5 = 12
  pm.addNote(60, 90, 0);
  pm.addNote(62, 90, 250);
  pm.addNote(64, 90, 500);
  pm.addNote(67, 90, 750);
  pm.addNote(72, 90, 1000);
  const s = pm.expression();
  assert.equal(s.span, 12);
  assert.equal(s.tempo, 'fast');
  assert.ok(Math.abs(s.notesPerSec - 4) < 0.01);
});

test('reflect：空 → 提示去弹', () => {
  const pm = new PlayMood();
  pm.choose('happy');
  const r = pm.reflect();
  assert.equal(r.empty, true);
  assert.ok(r.lines[0].includes('开始'));
});

test('reflect：力度贴近情绪 → dynamicMatch=true 且正向语句', () => {
  const pm = new PlayMood();
  pm.choose('sad'); pm.start(0); // sad 建议 p（弱）
  pm.addNote(60, 40, 0);    // p 区间
  pm.addNote(63, 42, 800);
  const r = pm.reflect();
  assert.equal(r.dynamicMatch, true);
  assert.ok(r.lines.some((l) => l.includes('正好配上')));
});

test('reflect：力度不贴近也永远鼓励（不判错）', () => {
  const pm = new PlayMood();
  pm.choose('sad'); pm.start(0); // sad 建议 p
  pm.addNote(60, 120, 0);   // ff，远离
  pm.addNote(64, 118, 200);
  const r = pm.reflect();
  assert.equal(r.dynamicMatch, false);
  assert.ok(r.lines.some((l) => l.includes('也很有味道') || l.includes('自己的表达')));
  // 不出现负面"错"字眼
  assert.ok(!r.lines.some((l) => l.includes('错了') || l.includes('失败')));
});

test('reflect：tempoMatch 反映速度感是否相符', () => {
  const pm = new PlayMood();
  pm.choose('calm'); pm.start(0); // calm 建议 slow
  // 2 个音跨 2000ms → 1 间隔/2s = 0.5 nps → slow
  pm.addNote(60, 60, 0);
  pm.addNote(62, 60, 2000);
  const r = pm.reflect();
  assert.equal(r.tempoMatch, true);
});

test('finish：累计完成次数', () => {
  const pm = new PlayMood();
  pm.choose('magic');
  assert.equal(pm.finish(), 1);
  assert.equal(pm.finish(), 2);
  assert.equal(pm.performed, 2);
});
