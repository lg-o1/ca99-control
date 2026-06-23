/** ear-training.test.mjs — 音程听辨纯逻辑单元测试 */
import {
  INTERVALS, intervalBySemis, intervalName, DEFAULT_INTERVALS,
  notesFor, EarTrainingGame,
} from './ear-training.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) { pass++; } else { fail++; console.error(`FAIL ${msg}: ${A} !== ${B}`); }
}
function ok(c, msg) { if (c) { pass++; } else { fail++; console.error(`FAIL ${msg}`); } }

// 一个可控的伪随机：从一个序列里依次取 [0,1)
function seqRng(vals) {
  let i = 0;
  return () => vals[(i++) % vals.length];
}

// ---- INTERVALS 表 ----
eq(INTERVALS.length, 13, 'INTERVALS 含 0..12 共 13 项');
eq(INTERVALS[0].semis, 0, '首项是纯一度');
eq(INTERVALS[12].semis, 12, '末项是纯八度');
ok(INTERVALS.every((x, i) => x.semis === i), 'semis 连续 0..12');
ok(INTERVALS.every(x => x.name && x.short), '每项都有 name 和 short');

// ---- intervalBySemis / intervalName ----
eq(intervalBySemis(7).short, 'P5', '7 半音 = 纯五度 P5');
eq(intervalBySemis(4).name, '大三度', '4 半音 = 大三度');
eq(intervalBySemis(99), null, '越界返回 null');
eq(intervalName(0), '纯一度', 'intervalName(0)');
eq(intervalName(12), '纯八度', 'intervalName(12)');
eq(intervalName(13), '13半音', 'intervalName 未知值兜底');

// ---- DEFAULT_INTERVALS ----
ok(DEFAULT_INTERVALS.includes(7), '默认集合含纯五');
ok(DEFAULT_INTERVALS.includes(12), '默认集合含纯八');
ok(DEFAULT_INTERVALS.every(s => s >= 0 && s <= 12), '默认集合都在 0..12');

// ---- notesFor ----
eq(notesFor(60, 7, 'up'), [60, 67], 'up: 根音+音程');
eq(notesFor(60, 7, 'down'), [60, 53], 'down: 根音-音程');
eq(notesFor(60, 7, 'harmonic'), [60, 67], 'harmonic: 向上叠');
eq(notesFor(60, 0, 'up'), [60, 60], '纯一度同音');

// ---- EarTrainingGame: 基本出题 ----
{
  // rng 序列：先选 interval（取 intervals[idx]），再选 root
  // intervals=[7], 单一音程；rng 第一个用于挑 interval（idx=0），第二个挑 root
  const g = new EarTrainingGame({ rng: seqRng([0, 0]), intervals: [7], direction: 'up', rootMin: 60, rootMax: 60 });
  const notes = g.next();
  eq(g.current.semis, 7, 'next 选中纯五');
  eq(g.current.root, 60, 'root 落在固定范围');
  eq(notes, [60, 67], 'notes() = [60,67]');
  eq(g.isHarmonic(), false, 'up 不是 harmonic');
}

// ---- direction down 的范围保护 ----
{
  // rootMin=0，semis=12，down 时 lo 应被抬到 12，避免负音符
  const g = new EarTrainingGame({ rng: seqRng([0, 0]), intervals: [12], direction: 'down', rootMin: 0, rootMax: 0 });
  g.next();
  ok(g.current.root >= 12, 'down 时 root 抬高避免负数');
  ok(g.notes().every(n => n >= 0), 'down 音符不为负');
}

// ---- direction up 的高位保护 ----
{
  const g = new EarTrainingGame({ rng: seqRng([0, 0.999]), intervals: [12], direction: 'up', rootMin: 127, rootMax: 127 });
  g.next();
  ok(g.notes().every(n => n <= 127), 'up 音符不超过 127');
}

// ---- harmonic ----
{
  const g = new EarTrainingGame({ rng: seqRng([0, 0]), intervals: [4], direction: 'harmonic', rootMin: 60, rootMax: 60 });
  g.next();
  eq(g.isHarmonic(), true, 'harmonic 标志');
  eq(g.notes(), [60, 64], 'harmonic notes');
}

// ---- check: 正确 / 错误 / 连击 / 最佳 / 正确率 ----
{
  const g = new EarTrainingGame({ rng: seqRng([0, 0]), intervals: [7], direction: 'up', rootMin: 60, rootMax: 60 });
  g.next();
  let lastResult = null;
  g.onResult = (c, info) => { lastResult = { c, info }; };
  eq(g.check(7), true, '答对纯五返回 true');
  eq(g.score, 1, 'score=1');
  eq(g.streak, 1, 'streak=1');
  eq(g.best, 1, 'best=1');
  eq(lastResult.c, true, 'onResult correct=true');

  g.next();
  eq(g.check(4), false, '答错返回 false');
  eq(g.streak, 0, '答错 streak 归零');
  eq(g.best, 1, 'best 保持 1');
  eq(g.score, 1, 'score 保持 1');

  g.next(); g.check(7);
  g.next(); g.check(7);
  eq(g.streak, 2, '再连对两次 streak=2');
  eq(g.best, 2, 'best 升到 2');
  eq(g.attempts, 4, 'attempts=4');
  eq(Math.round(g.accuracy * 100), 75, '正确率 3/4=75%');
}

// ---- check 无题目时返回 false ----
{
  const g = new EarTrainingGame();
  eq(g.check(7), false, '没出题时 check 返回 false');
}

// ---- reset ----
{
  const g = new EarTrainingGame({ rng: seqRng([0, 0]), intervals: [7], rootMin: 60, rootMax: 60 });
  g.next(); g.check(7);
  g.reset();
  eq(g.score, 0, 'reset score');
  eq(g.streak, 0, 'reset streak');
  eq(g.best, 0, 'reset best');
  eq(g.attempts, 0, 'reset attempts');
  eq(g.current, null, 'reset current');
}

// ---- mixed direction 解析为三种之一 ----
{
  const g = new EarTrainingGame({ rng: seqRng([0, 0.5, 0]), intervals: [7], direction: 'mixed', rootMin: 60, rootMax: 60 });
  g.next();
  ok(['up', 'down', 'harmonic'].includes(g.current.direction), 'mixed 解析为合法方向');
}

// ---- 多音程集合：rng 选不同下标 ----
{
  const ivs = [3, 4, 7];
  // 第一个 rng 用于挑 interval：0.5 * 3 = 1.5 -> idx1 -> 4
  const g = new EarTrainingGame({ rng: seqRng([0.5, 0]), intervals: ivs, direction: 'up', rootMin: 60, rootMax: 60 });
  g.next();
  eq(g.current.semis, 4, 'rng=0.5 选中中间音程');
}

// ---- intervals 为空时回退默认 ----
{
  const g = new EarTrainingGame({ intervals: [] });
  eq(g.intervals, DEFAULT_INTERVALS, '空集合回退默认');
}

console.log(`ear-training: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
