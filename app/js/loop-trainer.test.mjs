import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  timeScaleForPct, SpeedLadder, measureWindow, LoopSession,
} from './loop-trainer.js';

// 2 小节、4/4、bpm 80 的简单旋律线（8 个四分音符）
const SONG = {
  id: 'test', title: 'test', clef: 'treble', bpm: 80, meter: 4,
  seq: [[60, 1], [62, 1], [64, 1], [65, 1], [67, 1], [65, 1], [64, 1], [62, 1]],
};

test('timeScaleForPct: 慢速 → 更大 timeScale', () => {
  assert.ok(Math.abs(timeScaleForPct(100) - 1) < 1e-9);
  assert.ok(Math.abs(timeScaleForPct(60) - (100 / 60)) < 1e-9);
  assert.ok(timeScaleForPct(50) > timeScaleForPct(100));
});

test('SpeedLadder: 默认 60→100 步进 10', () => {
  const l = new SpeedLadder();
  assert.equal(l.current, 60);
  assert.equal(l.atTarget(), false);
  assert.equal(l.pass(true), 70);
  assert.equal(l.pass(true), 80);
});

test('SpeedLadder: 脏遍不提速', () => {
  const l = new SpeedLadder();
  assert.equal(l.pass(false), 60);
  assert.equal(l.pass(false), 60);
  assert.equal(l.pass(true), 70);
});

test('SpeedLadder: 封顶 100 不超', () => {
  const l = new SpeedLadder({ start: 90, step: 10, target: 100 });
  assert.equal(l.pass(true), 100);
  assert.equal(l.atTarget(), true);
  assert.equal(l.pass(true), 100);
});

test('SpeedLadder: 自定义参数 + reset', () => {
  const l = new SpeedLadder({ start: 50, step: 25, target: 100 });
  assert.equal(l.current, 50);
  l.pass(true); assert.equal(l.current, 75);
  l.reset(); assert.equal(l.current, 50);
});

test('SpeedLadder: start/target 越界夹紧', () => {
  const l = new SpeedLadder({ start: 5, target: 200 });
  assert.equal(l.start, 10);
  assert.equal(l.target, 100);
});

test('measureWindow: 第 1 小节 4/4 → [0,4)', () => {
  const w = measureWindow(4, 1, 1);
  assert.equal(w.startBeat, 0);
  assert.equal(w.endBeat, 4);
});

test('measureWindow: 第 2–3 小节 3/4 → [3,9)', () => {
  const w = measureWindow(3, 2, 3);
  assert.equal(w.startBeat, 3);
  assert.equal(w.endBeat, 9);
});

test('measureWindow: from>to 自动交换', () => {
  const w = measureWindow(4, 3, 1);
  assert.equal(w.fromM, 1);
  assert.equal(w.toM, 3);
});

test('LoopSession: 总小节数 / 基础 BPM', () => {
  const s = new LoopSession(SONG, { meter: 4 });
  assert.equal(s.totalMeasures, 2);
  assert.equal(s.baseBpm, 80);
});

test('LoopSession: 窗口只取第 1 小节的 4 个音', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1 });
  assert.equal(s.totalGroups, 4);
  assert.deepEqual(s.groups.map((g) => g.notes[0].midi), [60, 62, 64, 65]);
});

test('LoopSession: 默认起步 60% → bpm = 80*0.6 = 48', () => {
  const s = new LoopSession(SONG, { meter: 4 });
  assert.equal(s.pct, 60);
  assert.equal(s.bpm, 48);
});

test('LoopSession: 逐组推进，弹对当前组才前进', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false, tolerant: false });
  assert.deepEqual(s.currentTargets(), [60]);
  let r = s.press(62);            // 错音
  assert.equal(r.wrong, true);
  assert.equal(s.idx, 0);
  r = s.press(60);                // 对
  assert.equal(r.advanced, true);
  assert.deepEqual(s.currentTargets(), [62]);
});

test('LoopSession: 整段弹对 → complete，干净遍提速到 70%', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false });
  let last;
  for (const m of [60, 62, 64, 65]) last = s.press(m);
  assert.equal(last.complete, true);
  const res = s.completePass();
  assert.equal(res.clean, true);
  assert.equal(res.climbed, true);
  assert.equal(res.toPct, 70);
  assert.equal(s.pct, 70);
  // 回到段首
  assert.equal(s.idx, 0);
  assert.deepEqual(s.currentTargets(), [60]);
});

test('LoopSession: 有错的一遍不提速', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false });
  s.press(99);                    // 脏：错音（不在容差内）
  for (const m of [60, 62, 64, 65]) s.press(m);
  const res = s.completePass();
  assert.equal(res.clean, false);
  assert.equal(res.climbed, false);
  assert.equal(s.pct, 60);
});

test('LoopSession: 容差等待——差 1 半音也收（节奏对）', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false, tolerant: true, semis: 2 });
  const r = s.press(61);          // 目标 60，差 1 半音
  assert.equal(r.ok, true);
  assert.equal(r.exact, false);   // 容差命中、非精确
  assert.equal(r.advanced, true);
});

test('LoopSession: mastered——100% 干净弹完一遍', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false, ladder: { start: 100, step: 10, target: 100 } });
  for (const m of [60, 62, 64, 65]) s.press(m);
  const res = s.completePass();
  assert.equal(res.mastered, true);
  assert.equal(res.reachedTarget, true);
});

test('LoopSession: setHand 重建分组、回段首', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false });
  s.press(60);
  assert.equal(s.idx, 1);
  s.setHand('both');
  assert.equal(s.idx, 0);
  assert.deepEqual(s.currentTargets(), [60]);
});

test('LoopSession: reset 全清——速度回 60、计数归零', () => {
  const s = new LoopSession(SONG, { meter: 4, fromM: 1, toM: 1, octaveAgnostic: false });
  for (const m of [60, 62, 64, 65]) s.press(m);
  s.completePass();
  assert.equal(s.pct, 70);
  s.reset();
  assert.equal(s.pct, 60);
  assert.equal(s.passes, 0);
  assert.equal(s.cleanPasses, 0);
  assert.equal(s.idx, 0);
});

test('LoopSession: setWindow 切到第 2 小节', () => {
  const s = new LoopSession(SONG, { meter: 4 });
  s.setWindow(2, 2);
  assert.deepEqual(s.groups.map((g) => g.notes[0].midi), [67, 65, 64, 62]);
});
