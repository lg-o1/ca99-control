import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashStr, pickDailyOptions, DailyGoal } from './daily-goal.js';

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

const CAT = [
  { id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' },
  { id: 'd', label: 'D' }, { id: 'e', label: 'E' }, { id: 'f', label: 'F' },
];

test('hashStr 确定性 + 不同输入不同输出', () => {
  assert.equal(hashStr('x'), hashStr('x'));
  assert.notEqual(hashStr('2026-06-25|a'), hashStr('2026-06-25|b'));
});

test('pickDailyOptions 同一天稳定、跨天变化', () => {
  const d1 = pickDailyOptions(CAT, '2026-06-25', 3);
  const d1b = pickDailyOptions(CAT, '2026-06-25', 3);
  assert.equal(d1.length, 3);
  assert.deepEqual(d1.map((x) => x.id), d1b.map((x) => x.id)); // 稳定
  const d2 = pickDailyOptions(CAT, '2026-06-26', 3);
  // 多半不同（极小概率相同，换几天确保有差异）
  const diff = ['2026-06-26', '2026-06-27', '2026-06-28', '2026-06-29']
    .some((dk) => pickDailyOptions(CAT, dk, 3).map((x) => x.id).join() !== d1.map((x) => x.id).join());
  assert.equal(diff, true);
  assert.equal(d2.length, 3);
});

test('pickDailyOptions count 超过目录大小则取全部', () => {
  assert.equal(pickDailyOptions(CAT, '2026-01-01', 99).length, CAT.length);
});

test('初始状态：今日未选未达成', () => {
  const g = new DailyGoal({ storage: memStorage() });
  assert.deepEqual(g.state('2026-06-25'), { chosenId: null, done: false, totalDone: 0 });
});

test('choose 设定今日目标', () => {
  const g = new DailyGoal({ storage: memStorage() });
  g.choose('2026-06-25', 'sight');
  assert.deepEqual(g.state('2026-06-25'), { chosenId: 'sight', done: false, totalDone: 0 });
});

test('complete 仅匹配今日所选才达成', () => {
  const g = new DailyGoal({ storage: memStorage() });
  g.choose('2026-06-25', 'sight');
  assert.equal(g.complete('2026-06-25', 'scale'), false); // 练了别的模块不算
  assert.equal(g.state('2026-06-25').done, false);
  assert.equal(g.complete('2026-06-25', 'sight'), true);  // 练了所选 → 达成
  assert.equal(g.state('2026-06-25').done, true);
  assert.equal(g.complete('2026-06-25', 'sight'), false); // 重复不再加
});

test('complete 累加 totalDone', () => {
  const g = new DailyGoal({ storage: memStorage() });
  g.choose('2026-06-25', 'a'); g.complete('2026-06-25', 'a');
  g.choose('2026-06-26', 'b'); g.complete('2026-06-26', 'b');
  assert.equal(g.totalDone(), 2);
});

test('换天自动重置 chosen/done，保留 totalDone', () => {
  const g = new DailyGoal({ storage: memStorage() });
  g.choose('2026-06-25', 'a'); g.complete('2026-06-25', 'a');
  const s = g.state('2026-06-26'); // 新的一天
  assert.equal(s.chosenId, null);
  assert.equal(s.done, false);
  assert.equal(s.totalDone, 1); // 累计保留
});

test('重选同一目标且今天已达成 → 保留达成', () => {
  const g = new DailyGoal({ storage: memStorage() });
  g.choose('2026-06-25', 'a'); g.complete('2026-06-25', 'a');
  const r = g.choose('2026-06-25', 'a');
  assert.equal(r.done, true);
});

test('重选不同目标 → 重置达成', () => {
  const g = new DailyGoal({ storage: memStorage() });
  g.choose('2026-06-25', 'a'); g.complete('2026-06-25', 'a');
  const r = g.choose('2026-06-25', 'b');
  assert.equal(r.done, false);
});

test('持久化跨实例', () => {
  const st = memStorage();
  new DailyGoal({ storage: st }).choose('2026-06-25', 'guess');
  assert.equal(new DailyGoal({ storage: st }).state('2026-06-25').chosenId, 'guess');
});

test('损坏数据当空', () => {
  const st = memStorage();
  st.setItem('ca99-daily-goal', 'not json');
  const g = new DailyGoal({ storage: st });
  assert.deepEqual(g.state('2026-06-25'), { chosenId: null, done: false, totalDone: 0 });
});
