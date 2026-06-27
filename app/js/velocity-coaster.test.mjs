import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SHAPES, shapeById, COASTER_VMIN, COASTER_VMAX,
  heightToVelocity, velocityToHeight, makeTrack, randomTrack,
  judgeHit, VelocityCoaster,
} from './velocity-coaster.js';

function seededRng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test('SHAPES 完整且 id 唯一', () => {
  assert.ok(SHAPES.length >= 5);
  const ids = SHAPES.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const s of SHAPES) {
    assert.equal(typeof s.name, 'string');
    assert.equal(typeof s.emoji, 'string');
  }
});

test('shapeById 回退', () => {
  assert.equal(shapeById('wave').id, 'wave');
  assert.equal(shapeById('nope').id, SHAPES[0].id);
});

test('heightToVelocity 边界', () => {
  assert.equal(heightToVelocity(0), COASTER_VMIN);
  assert.equal(heightToVelocity(1), COASTER_VMAX);
  assert.equal(heightToVelocity(-5), COASTER_VMIN); // clamp
  assert.equal(heightToVelocity(9), COASTER_VMAX);
  const mid = heightToVelocity(0.5);
  assert.ok(mid > COASTER_VMIN && mid < COASTER_VMAX);
});

test('velocityToHeight 是 heightToVelocity 的逆（近似）', () => {
  for (const h of [0, 0.25, 0.5, 0.75, 1]) {
    const v = heightToVelocity(h);
    const back = velocityToHeight(v);
    assert.ok(Math.abs(back - h) < 0.02, `h=${h} back=${back}`);
  }
});

test('velocityToHeight clamp 0..1', () => {
  assert.equal(velocityToHeight(0), 0);
  assert.equal(velocityToHeight(127), 1);
});

test('makeTrack hill 中间最高、两端最低', () => {
  const t = makeTrack('hill', 9, seededRng(1));
  assert.equal(t.points.length, 9);
  const mid = t.points[4];
  assert.ok(mid.height >= 0.99, 'hill 中间应接近 1');
  assert.ok(t.points[0].height <= 0.05);
  assert.ok(t.points[8].height <= 0.05);
});

test('makeTrack valley 中间最低', () => {
  const t = makeTrack('valley', 9, seededRng(1));
  assert.ok(t.points[4].height <= 0.05);
  assert.ok(t.points[0].height >= 0.99);
});

test('makeTrack stairsUp 单调递增', () => {
  const t = makeTrack('stairsUp', 8, seededRng(1));
  for (let i = 1; i < t.points.length; i++) {
    assert.ok(t.points[i].height > t.points[i - 1].height);
  }
});

test('makeTrack stairsDown 单调递减', () => {
  const t = makeTrack('stairsDown', 8, seededRng(1));
  for (let i = 1; i < t.points.length; i++) {
    assert.ok(t.points[i].height < t.points[i - 1].height);
  }
});

test('makeTrack 每个站点有 velocity 和 dyn 档位', () => {
  const t = makeTrack('wave', 8, seededRng(1));
  for (const p of t.points) {
    assert.ok(p.velocity >= COASTER_VMIN && p.velocity <= COASTER_VMAX);
    assert.ok(p.dyn && typeof p.dyn.sym === 'string');
  }
});

test('makeTrack 最少 2 站点', () => {
  const t = makeTrack('hill', 1, seededRng(1));
  assert.ok(t.points.length >= 2);
});

test('randomTrack 返回合法轨道', () => {
  const t = randomTrack(6, seededRng(99));
  assert.equal(t.points.length, 6);
  assert.ok(SHAPES.some((s) => s.id === t.shape.id));
});

test('judgeHit 评级', () => {
  assert.equal(judgeHit(80, 80).rating, 'perfect');
  assert.equal(judgeHit(80, 86).rating, 'perfect'); // diff 6
  assert.equal(judgeHit(80, 95).rating, 'good');     // diff 15
  assert.equal(judgeHit(80, 105).rating, 'ok');      // diff 25
  assert.equal(judgeHit(80, 120).rating, 'miss');    // diff 40
});

test('judgeHit 方向', () => {
  assert.equal(judgeHit(80, 90).dir, 'loud');
  assert.equal(judgeHit(80, 70).dir, 'soft');
  assert.equal(judgeHit(80, 80).dir, 'exact');
});

test('VelocityCoaster 完美通关满分', () => {
  const t = makeTrack('hill', 5, seededRng(1));
  const c = new VelocityCoaster(t);
  for (const p of t.points) {
    c.play(p.velocity); // 精确命中
  }
  assert.ok(c.isDone());
  assert.equal(c.score, c.maxScore());
  assert.equal(c.accuracy(), 1);
  assert.equal(c.stars(), 3);
  assert.equal(c.bestCombo, 5);
});

test('VelocityCoaster combo 在 ok/miss 清零', () => {
  const t = makeTrack('stairsUp', 4, seededRng(1));
  const c = new VelocityCoaster(t);
  c.play(t.points[0].velocity);        // perfect → combo1
  c.play(t.points[1].velocity);        // perfect → combo2
  c.play(t.points[2].velocity + 25);   // ok → combo 清零
  assert.equal(c.combo, 0);
  assert.equal(c.bestCombo, 2);
  c.play(t.points[3].velocity);        // perfect → combo1
  assert.equal(c.combo, 1);
});

test('VelocityCoaster play 推进并标记 done', () => {
  const t = makeTrack('wave', 3, seededRng(1));
  const c = new VelocityCoaster(t);
  let r = c.play(t.points[0].velocity);
  assert.equal(r.done, false);
  assert.equal(r.idx, 1);
  c.play(t.points[1].velocity);
  r = c.play(t.points[2].velocity);
  assert.equal(r.done, true);
  assert.equal(c.idx, 3);
});

test('VelocityCoaster 越界 play 安全', () => {
  const t = makeTrack('hill', 2, seededRng(1));
  const c = new VelocityCoaster(t);
  c.play(t.points[0].velocity);
  c.play(t.points[1].velocity);
  const r = c.play(80); // 已完成后再 play
  assert.equal(r.done, true);
});

test('VelocityCoaster 全 miss 0 星', () => {
  const t = makeTrack('hill', 5, seededRng(1));
  const c = new VelocityCoaster(t);
  for (const p of t.points) {
    const far = p.velocity > 70 ? p.velocity - 60 : p.velocity + 60;
    c.play(far);
  }
  assert.equal(c.score, 0);
  assert.equal(c.stars(), 0);
});
