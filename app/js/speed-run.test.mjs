import test from 'node:test';
import assert from 'node:assert/strict';
import { RUNS, getRun, nameToMidi, bpmFromElapsed, SpeedRun } from './speed-run.js';

test('RUNS 结构合法', () => {
  assert.ok(RUNS.length >= 3);
  RUNS.forEach((r) => { assert.ok(r.id && r.name && Array.isArray(r.notes) && r.notes.length >= 4); });
  assert.equal(getRun('arp-c').id, 'arp-c');
  assert.equal(getRun('nope').id, RUNS[0].id);
});

test('bpmFromElapsed：8 音、4200ms → 100 BPM', () => {
  // 8 音 = 7 个相邻音程，每音 1 拍；100 BPM → 0.6s/拍 → 7*0.6=4.2s
  assert.equal(bpmFromElapsed(8, 4200, 1), 100);
  assert.equal(bpmFromElapsed(1, 1000), 0);   // 单音无法算
  assert.equal(bpmFromElapsed(8, 0), 0);      // 0 耗时
});

test('press 顺序推进 + started 标志', () => {
  const s = new SpeedRun({ run: 'cmaj-up', startBpm: 50 });
  assert.equal(s.current(), nameToMidi('C4'));
  let r = s.press(nameToMidi('C4'), 1000);
  assert.ok(r.advance && r.started && !r.complete);
  assert.equal(s.runStartMs, 1000);
  r = s.press(nameToMidi('D4'), 1100);
  assert.ok(r.advance && !r.started);
});

test('完成一段、达标 → 升档 + 刷新纪录', () => {
  const s = new SpeedRun({ run: 'cmaj-up', startBpm: 50, step: 5 });
  const notes = s.notes;
  // 弹得很快：8 音在 2100ms（→ 200 BPM）
  let r;
  for (let i = 0; i < notes.length; i++) r = s.press(notes[i], i * 300);
  assert.ok(r.complete && r.clean);
  assert.equal(r.effBpm, 200);          // 7 程 * 300ms = 2100ms → 200 BPM
  assert.ok(r.leveledUp);
  assert.equal(r.newRecord, true);
  assert.equal(s.bestBpm, 200);
  assert.equal(s.targetBpm, 55);        // 50 + 5
  assert.equal(s.records, 1);
  assert.equal(s.idx, 0);               // 重置
});

test('完成但没达标 → 目标不变、不算纪录刷新（若更慢）', () => {
  const s = new SpeedRun({ run: 'cmaj-up', startBpm: 300, step: 5 });
  const notes = s.notes;
  // 慢速：每程 600ms → 100 BPM < 300 目标
  let r;
  for (let i = 0; i < notes.length; i++) r = s.press(notes[i], i * 600);
  assert.ok(r.complete);
  assert.equal(r.effBpm, 100);
  assert.equal(r.leveledUp, false);
  assert.equal(s.targetBpm, 300);       // 不变
  assert.equal(r.newRecord, true);      // 仍是首次完成 → 个人纪录
  assert.equal(s.bestBpm, 100);
});

test('弹错 → 整段作废从头来', () => {
  const s = new SpeedRun({ run: 'cmaj-up' });
  s.press(s.notes[0], 0);
  s.press(s.notes[1], 100);
  const r = s.press(999, 200);          // 错音
  assert.ok(r.wrong && !r.complete);
  assert.equal(s.idx, 0);
  assert.equal(s.runStartMs, 0);
});

test('忽略八度：高八度同名键算对', () => {
  const s = new SpeedRun({ run: 'cmaj-up', octaveAgnostic: true });
  const r = s.press(s.notes[0] + 12, 0);
  assert.ok(r.advance);
});

test('history 记录每次完成 BPM', () => {
  const s = new SpeedRun({ run: 'arp-c', startBpm: 40 });
  const run = (t0, step) => { for (let i = 0; i < s.notes.length; i++) s.press(s.notes[i], t0 + i * step); };
  run(0, 200);
  run(10000, 250);
  assert.equal(s.history.length, 2);
  assert.equal(s.runs, 2);
});
