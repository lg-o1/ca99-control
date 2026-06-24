/**
 * leap.test.mjs — 音程大跳引擎单元测试
 * 运行：node js/leap.test.mjs
 */
import { mean, buildLeaps, leapSpan, LeapTrainer } from './leap.js';

let passed = 0, failed = 0;
function eq(a, b, msg) {
  if (a === b) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got ${a}, want ${b}`); }
}
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log(`FAIL: ${msg}`); }
}
function arrEq(a, b, msg) {
  const same = a.length === b.length && a.every((x, i) => x === b[i]);
  if (same) { passed++; } else { failed++; console.log(`FAIL: ${msg} — got [${a}], want [${b}]`); }
}

// 确定性随机：循环返回给定序列（0..1）
function seqRand(vals) {
  let i = 0;
  return () => vals[(i++) % vals.length];
}

// ---------- mean ----------
eq(mean([]), 0, 'mean empty');
eq(mean([10, 20, 30]), 20, 'mean basic');

// ---------- buildLeaps：基本约束 ----------
{
  const seq = buildLeaps({ low: 48, high: 84, count: 8, minLeap: 12, rand: Math.random });
  eq(seq.length, 8, 'buildLeaps count');
  ok(seq.every((n) => n >= 48 && n <= 84), 'all in range');
  let okLeap = true;
  for (let i = 1; i < seq.length; i++) if (Math.abs(seq[i] - seq[i - 1]) < 12) okLeap = false;
  ok(okLeap, 'all adjacent leaps >= minLeap');
}

// ---------- buildLeaps：多组随机都满足约束 ----------
{
  let allOk = true;
  for (let trial = 0; trial < 50; trial++) {
    const seq = buildLeaps({ low: 36, high: 96, count: 10, minLeap: 7 });
    if (seq.length !== 10) allOk = false;
    for (let i = 1; i < seq.length; i++) if (Math.abs(seq[i] - seq[i - 1]) < 7) allOk = false;
    if (seq.some((n) => n < 36 || n > 96)) allOk = false;
  }
  ok(allOk, 'buildLeaps robust over 50 trials');
}

// ---------- buildLeaps：音域太窄抛错 ----------
{
  let threw = false;
  try { buildLeaps({ low: 60, high: 65, count: 4, minLeap: 12 }); } catch (e) { threw = true; }
  ok(threw, 'too-narrow range throws');
}

// ---------- buildLeaps：确定性 rand ----------
{
  // rand=0 总取 low；为满足大跳会被强制到对侧。仅验证不崩溃 + 约束成立
  const seq = buildLeaps({ low: 48, high: 72, count: 5, minLeap: 12, rand: seqRand([0, 0.99, 0, 0.99, 0]) });
  eq(seq.length, 5, 'deterministic length');
  for (let i = 1; i < seq.length; i++) ok(Math.abs(seq[i] - seq[i - 1]) >= 12, `det leap ${i} ok`);
}

// ---------- leapSpan ----------
eq(leapSpan([60]), 0, 'span single 0');
eq(leapSpan([60, 72]), 12, 'span one octave');
eq(leapSpan([60, 72, 60]), 12, 'span two octaves avg 12');
eq(leapSpan([60, 84, 60]), 24, 'span 24 avg');

// ---------- LeapTrainer：给定 seq ----------
{
  const t = new LeapTrainer({ seq: [60, 72, 48] });
  arrEq(t.seq, [60, 72, 48], 'trainer uses given seq');
  eq(t.length, 3, 'length 3');
  eq(t.progress, 0, 'progress 0');
  eq(t.expected, 60, 'expected first');
  eq(t.done, false, 'not done');
  eq(t.best, 0, 'best 0');
}

// ---------- 全部一次弹准 -> accuracy 100 ----------
{
  const t = new LeapTrainer({ seq: [60, 72, 48] });
  let r = null; t.onComplete = (x) => { r = x; };
  eq(t.feed(60, 0), 'hit', 'hit 1');
  eq(t.feed(72, 200), 'hit', 'hit 2');
  eq(t.feed(48, 420), 'done', 'done');
  ok(r !== null, 'onComplete fired');
  eq(r.total, 3, 'total 3');
  eq(r.firstTryHits, 3, 'all first try');
  eq(r.misses, 0, 'no misses');
  eq(r.accuracy, 100, 'accuracy 100');
  eq(r.score, 100, 'score 100');
  eq(r.meanIoi, 210, 'meanIoi avg of 200,220');
  eq(t.best, 100, 'best 100');
  eq(t.runs, 1, 'runs 1');
  eq(t.feed(60, 500), 'idle', 'feed after done idle');
}

// ---------- 失误不推进，且该目标不算 firstTry ----------
{
  const t = new LeapTrainer({ seq: [60, 72, 48] });
  const hits = [];
  t.onHit = (i) => hits.push(i);
  eq(t.feed(60, 0), 'hit', 'first ok');
  eq(t.feed(70, 50), 'miss', 'wrong -> miss');
  eq(t.progress, 1, 'progress stays at 1');
  eq(t.expected, 72, 'still expects 72');
  eq(t.feed(73, 80), 'miss', 'another miss');
  eq(t.feed(72, 120), 'hit', 'finally hit 72');
  let r = null; t.onComplete = (x) => { r = x; };
  eq(t.feed(48, 200), 'done', 'finish');
  eq(r.misses, 2, 'two misses recorded');
  eq(r.firstTryHits, 2, 'only 60 and 48 first-try (72 was missed)');
  eq(r.accuracy, Math.round(2 / 3 * 100), 'accuracy 67');
  // onHit kinds
  const kinds = hits.map((h) => h.kind);
  arrEq(kinds, ['hit', 'miss', 'miss', 'hit', 'hit'], 'onHit kinds across full run');
  ok(hits[0].firstTry === true, 'first hit firstTry true');
  ok(hits[3].firstTry === false, 'recovered hit firstTry false');
  eq(hits[1].expected, 72, 'miss reports expected target');
}

// ---------- onHit index 正确 ----------
{
  const t = new LeapTrainer({ seq: [55, 67, 79] });
  const idxs = [];
  t.onHit = (i) => { if (i.kind === 'hit') idxs.push(i.index); };
  t.feed(55, 0); t.feed(67, 100); t.feed(79, 200);
  arrEq(idxs, [0, 1, 2], 'hit indices in order');
}

// ---------- regenerate 保留 best/runs ----------
{
  const t = new LeapTrainer({ seq: [60, 72] });
  t.feed(60, 0); t.feed(72, 100); // perfect -> best 100, runs 1
  eq(t.best, 100, 'best 100 after run');
  eq(t.runs, 1, 'runs 1');
  t.regenerate();
  eq(t.progress, 0, 'regenerate resets progress');
  eq(t.done, false, 'regenerate not done');
  eq(t.best, 100, 'regenerate keeps best');
  eq(t.runs, 1, 'regenerate keeps runs');
  arrEq(t.seq, [60, 72], 'regenerate reuses given seq');
}

// ---------- restart 清当前进度 ----------
{
  const t = new LeapTrainer({ seq: [60, 72, 84] });
  t.feed(60, 0); t.feed(99, 10); // 1 hit, 1 miss
  t.restart();
  eq(t.progress, 0, 'restart progress 0');
  eq(t.misses, 0, 'restart misses 0');
  eq(t.firstTryHits, 0, 'restart firstTryHits 0');
  eq(t.curMissed, false, 'restart curMissed false');
}

// ---------- finish 手动结束（部分完成） ----------
{
  const t = new LeapTrainer({ seq: [60, 72, 84, 48] });
  t.feed(60, 0); t.feed(72, 100);
  let r = null; t.onComplete = (x) => { r = x; };
  t.finish();
  ok(t.done, 'manual finish done');
  ok(r !== null, 'finish triggers onComplete');
  eq(r.total, 4, 'total still 4');
  eq(r.firstTryHits, 2, 'two first-try so far');
  eq(r.accuracy, 50, 'accuracy 2/4 = 50');
}

// ---------- expected getter through sequence ----------
{
  const t = new LeapTrainer({ seq: [48, 72] });
  eq(t.expected, 48, 'expected first');
  t.feed(48, 0);
  eq(t.expected, 72, 'expected second');
  t.feed(72, 50);
  eq(t.expected, null, 'expected null when done');
}

// ---------- span included in result ----------
{
  const t = new LeapTrainer({ seq: [60, 84, 60] });
  let r = null; t.onComplete = (x) => { r = x; };
  t.feed(60, 0); t.feed(84, 100); t.feed(60, 200);
  eq(r.span, 24, 'result span 24');
}

console.log(`leap: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
