import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ECHO_LEVELS, levelById, randomNote, pickNext, noteMatch, MelodyEcho,
} from './melody-echo.js';

/** 确定性 rng：依次返回给定 0..1 值，循环 */
function seqRng(vals) {
  let i = 0;
  return () => vals[(i++) % vals.length];
}

test('ECHO_LEVELS 结构合法', () => {
  assert.ok(ECHO_LEVELS.length >= 3);
  for (const l of ECHO_LEVELS) {
    assert.equal(typeof l.id, 'string');
    assert.equal(typeof l.name, 'string');
    assert.ok(Array.isArray(l.pool) && l.pool.length >= 2);
    assert.ok(l.pool.every((m) => Number.isInteger(m) && m >= 21 && m <= 108));
    assert.ok(l.startLen >= 1);
  }
});

test('levelById 命中与回退', () => {
  assert.equal(levelById('penta').id, 'penta');
  assert.equal(levelById('nope').id, ECHO_LEVELS[0].id);
});

test('randomNote 总在池内', () => {
  const pool = [60, 64, 67];
  for (let i = 0; i < 50; i++) assert.ok(pool.includes(randomNote(pool)));
});

test('randomNote 用 rng 取下标', () => {
  const pool = [60, 62, 64, 65, 67];
  assert.equal(randomNote(pool, () => 0), 60);
  assert.equal(randomNote(pool, () => 0.99), 67);
});

test('pickNext 避免与上一个立即重复', () => {
  const pool = [60, 62];
  // rng 第一次给 0（→60，与 prev=60 重复）第二次给 0.9（→62）
  const rng = seqRng([0, 0.9]);
  assert.equal(pickNext(60, pool, rng), 62);
});

test('pickNext 单音池允许重复', () => {
  assert.equal(pickNext(60, [60], () => 0), 60);
});

test('noteMatch 忽略八度', () => {
  assert.ok(noteMatch(60, 72, true));   // C4 vs C5
  assert.ok(!noteMatch(60, 62, true));
  assert.ok(noteMatch(60, 60, true));
});

test('noteMatch 严格八度', () => {
  assert.ok(!noteMatch(60, 72, false));
  assert.ok(noteMatch(60, 60, false));
});

test('start 生成 startLen 长序列并进入 showing', () => {
  const g = new MelodyEcho({ pool: [60, 62, 64], startLen: 3, rng: seqRng([0.1, 0.5, 0.9]) });
  const seq = g.start();
  assert.equal(seq.length, 3);
  assert.equal(g.state, 'showing');
  assert.equal(g.pos, 0);
  assert.equal(g.rounds, 0);
});

test('ready 进入 input 状态', () => {
  const g = new MelodyEcho({ pool: [60, 62], startLen: 2 });
  g.start();
  g.ready();
  assert.equal(g.state, 'input');
  assert.equal(g.pos, 0);
});

test('play 在非 input 状态返回 null', () => {
  const g = new MelodyEcho({ pool: [60, 62], startLen: 2 });
  assert.equal(g.play(60), null);
  g.start();
  assert.equal(g.play(60), null); // showing 状态
});

test('play 正确逐音推进', () => {
  const g = new MelodyEcho({ pool: [60, 62, 64], startLen: 3, rng: seqRng([0, 0.5, 0.99]) });
  const seq = g.start();  // [60, 62, 64]
  g.ready();
  let r = g.play(seq[0]);
  assert.ok(r.ok && !r.done);
  assert.equal(g.pos, 1);
  r = g.play(seq[1]);
  assert.ok(r.ok && !r.done);
  assert.equal(g.pos, 2);
});

test('完整复奏 → done、rounds++、best 更新、状态 win', () => {
  const g = new MelodyEcho({ pool: [60, 62], startLen: 2, rng: seqRng([0, 0.9]) });
  const seq = g.start();
  g.ready();
  g.play(seq[0]);
  const r = g.play(seq[1]);
  assert.ok(r.ok && r.done);
  assert.equal(r.length, 2);
  assert.equal(g.rounds, 1);
  assert.equal(g.best, 2);
  assert.equal(g.state, 'win');
});

test('弹错 → ok=false、记录 lastError、状态 fail、reached=已对个数', () => {
  const g = new MelodyEcho({ pool: [60, 62, 64], startLen: 3, ignoreOctave: false, rng: seqRng([0, 0.5, 0.99]) });
  const seq = g.start(); // [60,62,64]
  g.ready();
  g.play(seq[0]);        // 对 1 个
  const wrong = seq[1] === 65 ? 60 : 65;
  const r = g.play(wrong);
  assert.ok(!r.ok);
  assert.equal(r.reached, 1);
  assert.equal(g.state, 'fail');
  assert.equal(g.lastError.expected, seq[1]);
  assert.equal(g.lastError.actual, wrong);
});

test('忽略八度时高八度复奏算对', () => {
  const g = new MelodyEcho({ pool: [60], startLen: 2, ignoreOctave: true });
  g.start(); // [60,60]
  g.ready();
  assert.ok(g.play(72).ok);  // C5 == C4
  assert.ok(g.play(48).done); // C3 == C4
});

test('grow 追加一个音、保留前缀、重置 pos、回到 showing', () => {
  const g = new MelodyEcho({ pool: [60, 62, 64], startLen: 2, rng: seqRng([0, 0.5, 0.99]) });
  const seq = g.start();
  g.ready();
  g.play(seq[0]); g.play(seq[1]); // win
  const grown = g.grow();
  assert.equal(grown.length, 3);
  assert.deepEqual(grown.slice(0, 2), seq);
  assert.equal(g.pos, 0);
  assert.equal(g.state, 'showing');
});

test('多轮生长：best 跟随最长成功序列', () => {
  const g = new MelodyEcho({ pool: [60, 62, 64, 65], startLen: 2, rng: seqRng([0.1, 0.4, 0.6, 0.9]) });
  let seq = g.start();
  for (let round = 0; round < 3; round++) {
    g.ready();
    for (const n of seq) g.play(n);
    assert.equal(g.state, 'win');
    assert.equal(g.best, seq.length);
    seq = g.grow();
  }
  assert.equal(g.best, 4);   // 2,3,4 成功，第 5 长正在 showing
  assert.equal(g.rounds, 3);
});

test('restart 保留 best、重置其它', () => {
  const g = new MelodyEcho({ pool: [60, 62], startLen: 2, rng: seqRng([0, 0.9]) });
  const seq = g.start();
  g.ready(); g.play(seq[0]); g.play(seq[1]); // best=2
  const fresh = g.restart();
  assert.equal(g.best, 2);
  assert.equal(g.rounds, 0);
  assert.equal(fresh.length, 2);
  assert.equal(g.state, 'showing');
});

test('reset 清空全部', () => {
  const g = new MelodyEcho({ pool: [60, 62], startLen: 2 });
  g.start(); g.ready(); g.play(60);
  g.reset();
  assert.equal(g.seq.length, 0);
  assert.equal(g.pos, 0);
  assert.equal(g.rounds, 0);
  assert.equal(g.best, 0);
  assert.equal(g.state, 'idle');
});

test('win 后再 play 返回 null（须先 grow）', () => {
  const g = new MelodyEcho({ pool: [60, 62], startLen: 2, rng: seqRng([0, 0.9]) });
  const seq = g.start();
  g.ready(); g.play(seq[0]); g.play(seq[1]);
  assert.equal(g.state, 'win');
  assert.equal(g.play(60), null);
});
