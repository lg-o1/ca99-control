import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollOpen, pickReward, MysteryBox } from './mystery-box.js';

// 内存 storage stub
function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    _dump: () => Object.fromEntries(m),
  };
}
// 确定性 rng：依次吐出给定序列，用尽后回 0
function seqRng(values) {
  let i = 0;
  return () => (i < values.length ? values[i++] : 0);
}

test('rollOpen 按概率比较', () => {
  assert.equal(rollOpen(() => 0.05, 0.1), true);
  assert.equal(rollOpen(() => 0.1, 0.1), false); // 不含等号
  assert.equal(rollOpen(() => 0.5, 0.1), false);
  assert.equal(rollOpen(() => 0.5), false); // 默认 0.1
});

test('pickReward 跳过已解锁，全解锁返回 null', () => {
  const r = pickReward([1, 2, 3], new Set([1]), () => 0); // remaining=[2,3] 取第0个
  assert.equal(r, 2);
  const r2 = pickReward([1, 2, 3], new Set([1, 2]), () => 0.99); // remaining=[3]
  assert.equal(r2, 3);
  assert.equal(pickReward([1, 2], new Set([1, 2]), () => 0.5), null);
});

test('roll 不开盒（概率未命中）', () => {
  const box = new MysteryBox({ storage: memStorage(), rng: seqRng([0.5]), chance: 0.1 });
  const res = box.roll([1, 2, 3]);
  assert.deepEqual(res, { opened: false, reward: null, isNew: false, allUnlocked: false });
  assert.equal(box.openCount(), 0);
  assert.deepEqual(box.unlockedIds(), []);
});

test('roll 开盒并解锁一个新音色', () => {
  // 第一个 rng 用于 rollOpen(<0.1 命中)，第二个用于 pickReward
  const box = new MysteryBox({ storage: memStorage(), rng: seqRng([0.05, 0]), chance: 0.1 });
  const res = box.roll([10, 20, 30]);
  assert.equal(res.opened, true);
  assert.equal(res.isNew, true);
  assert.equal(res.reward, 10); // remaining=[10,20,30] 第0个
  assert.equal(box.openCount(), 1);
  assert.deepEqual(box.unlockedIds(), [10]);
  assert.equal(box.isUnlocked(10), true);
  assert.equal(box.isUnlocked(20), false);
});

test('roll 连续解锁不重复', () => {
  const box = new MysteryBox({
    storage: memStorage(),
    rng: seqRng([0.01, 0, 0.01, 0]), // 两次都命中，pickReward 都取第0个剩余
    chance: 0.2,
  });
  box.roll([1, 2, 3]); // 解锁 1
  box.roll([1, 2, 3]); // 剩 [2,3] 取 2
  assert.deepEqual(box.unlockedIds(), [1, 2]);
  assert.equal(box.openCount(), 2);
});

test('roll 全部解锁后 allUnlocked=true 且不再开盒', () => {
  const st = memStorage();
  const box = new MysteryBox({ storage: st, rng: () => 0, chance: 1 });
  box.unlock(1); box.unlock(2);
  const res = box.roll([1, 2]);
  assert.equal(res.allUnlocked, true);
  assert.equal(res.opened, false);
});

test('unlock 手动解锁返回是否为新', () => {
  const box = new MysteryBox({ storage: memStorage() });
  assert.equal(box.unlock(7), true);
  assert.equal(box.unlock(7), false); // 重复
  assert.deepEqual(box.unlockedIds(), [7]);
});

test('stats 图鉴统计', () => {
  const box = new MysteryBox({ storage: memStorage() });
  box.unlock(1); box.unlock(3);
  assert.deepEqual(box.stats([1, 2, 3, 4]), { total: 4, unlocked: 2, remaining: 2, pct: 50 });
  assert.deepEqual(box.stats([]), { total: 0, unlocked: 0, remaining: 0, pct: 0 });
});

test('持久化：跨实例读回已解锁', () => {
  const st = memStorage();
  const a = new MysteryBox({ storage: st });
  a.unlock(42);
  const b = new MysteryBox({ storage: st });
  assert.deepEqual(b.unlockedIds(), [42]);
});

test('损坏数据当空处理', () => {
  const st = memStorage();
  st.setItem('ca99-mystery-box', '{bad json');
  const box = new MysteryBox({ storage: st });
  assert.deepEqual(box.unlockedIds(), []);
  assert.equal(box.openCount(), 0);
});

test('roll 空池安全（allUnlocked=false, 不开盒）', () => {
  const box = new MysteryBox({ storage: memStorage(), rng: () => 0, chance: 1 });
  const res = box.roll([]);
  assert.equal(res.opened, false);
  assert.equal(res.reward, null);
});
