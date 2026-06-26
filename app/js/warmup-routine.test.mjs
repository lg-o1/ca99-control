import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pickRoutine, WarmupRoutine, WARMUP_BPMS, DEFAULT_SONGS,
} from './warmup-routine.js';

// ---- 简易内存 storage ----
function memStore() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _map: m,
  };
}

test('pickRoutine 返回三步：音阶/节奏/小曲', () => {
  const r = pickRoutine('2026-06-26');
  assert.equal(r.steps.length, 3);
  assert.equal(r.steps[0].type, 'scale');
  assert.equal(r.steps[1].type, 'rhythm');
  assert.equal(r.steps[2].type, 'song');
});

test('pickRoutine 按日期确定（同一天稳定）', () => {
  const a = pickRoutine('2026-06-26');
  const b = pickRoutine('2026-06-26');
  assert.equal(a.steps[0].label, b.steps[0].label);
  assert.equal(a.steps[1].label, b.steps[1].label);
  assert.equal(a.steps[2].id, b.steps[2].id);
});

test('pickRoutine 不同日期通常给出不同组合', () => {
  const days = ['2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05', '2026-06-06'];
  const sigs = new Set(days.map((d) => {
    const r = pickRoutine(d);
    return r.steps[0].label + '|' + r.steps[1].label + '|' + r.steps[2].id;
  }));
  assert.ok(sigs.size >= 3, '六天应至少出现 3 种不同例程');
});

test('音阶步带可弹音序（来自 pattern.gen）', () => {
  const r = pickRoutine('2026-06-26');
  const sc = r.steps[0];
  assert.ok(Array.isArray(sc.notes) && sc.notes.length >= 4);
  assert.ok(sc.notes.every((n) => n >= 21 && n <= 108));
});

test('节奏步带拍号 + 温和 bpm', () => {
  const r = pickRoutine('2026-06-26');
  const rh = r.steps[1];
  assert.ok(rh.meter && rh.meter.beats >= 2);
  assert.ok(WARMUP_BPMS.includes(rh.bpm));
  assert.equal(rh.bars, 2);
});

test('小曲步：默认从 DEFAULT_SONGS 取', () => {
  const r = pickRoutine('2026-06-26');
  const sg = r.steps[2];
  assert.ok(DEFAULT_SONGS.some((s) => s.id === sg.id));
  assert.ok(sg.nav);
});

test('pickRoutine 可注入自定义 songs', () => {
  const songs = [{ id: 'boss', label: 'Boss 战', icon: '🐉', nav: 'boss' }];
  const r = pickRoutine('2026-06-26', { songs });
  assert.equal(r.steps[2].id, 'boss');
  assert.equal(r.steps[2].nav, 'boss');
});

test('WarmupRoutine 初始：三步未完成、activeIndex=0', () => {
  const wr = new WarmupRoutine({ storage: memStore(), dayKey: '2026-06-26' });
  assert.deepEqual(wr.progress(), { done: 0, total: 3 });
  assert.equal(wr.activeIndex(), 0);
  assert.equal(wr.isAllDone(), false);
});

test('currentScaleNote 指向音阶第一个音', () => {
  const wr = new WarmupRoutine({ storage: memStore(), dayKey: '2026-06-26' });
  assert.equal(wr.currentScaleNote(), wr.step(0).notes[0]);
});

test('pressScale 正确逐音推进并完成音阶步', () => {
  const wr = new WarmupRoutine({ storage: memStore(), dayKey: '2026-06-26' });
  const notes = wr.step(0).notes;
  for (let i = 0; i < notes.length - 1; i++) {
    const r = wr.pressScale(notes[i]);
    assert.equal(r.advance, true);
  }
  const last = wr.pressScale(notes[notes.length - 1]);
  assert.equal(last.complete, true);
  assert.equal(wr.activeIndex(), 1); // 进到节奏步
});

test('pressScale 八度无关', () => {
  const wr = new WarmupRoutine({ storage: memStore(), dayKey: '2026-06-26' });
  const first = wr.step(0).notes[0];
  const r = wr.pressScale(first + 12);
  assert.equal(r.advance, true);
});

test('pressScale 弹错从头来（不惩罚、不完成）', () => {
  const wr = new WarmupRoutine({ storage: memStore(), dayKey: '2026-06-26' });
  const notes = wr.step(0).notes;
  wr.pressScale(notes[0]);
  const wrong = wr.pressScale(notes[0] + 1); // 半音错音
  assert.equal(wrong.wrong, true);
  assert.equal(wr.currentScaleNote(), notes[0]); // 回到开头
});

test('走完三步 → isAllDone + totalDone 累计一次', () => {
  const store = memStore();
  const wr = new WarmupRoutine({ storage: store, dayKey: '2026-06-26' });
  wr.completeStep(0);
  wr.completeStep(1);
  const r = wr.completeStep(2);
  assert.equal(wr.isAllDone(), true);
  assert.equal(r.justCounted, true);
  assert.equal(wr.totalDone, 1);
});

test('同一天重复完成不会重复累计 totalDone', () => {
  const store = memStore();
  let wr = new WarmupRoutine({ storage: store, dayKey: '2026-06-26' });
  wr.completeStep(0); wr.completeStep(1); wr.completeStep(2);
  assert.equal(wr.totalDone, 1);
  // 同一天重建（刷新页面）→ 已全部完成、已计数
  wr = new WarmupRoutine({ storage: store, dayKey: '2026-06-26' });
  assert.equal(wr.isAllDone(), true);
  const r = wr.completeStep(2); // 再次标记
  assert.equal(r.justCounted, false);
  assert.equal(wr.totalDone, 1);
});

test('换天重置三步但保留 totalDone', () => {
  const store = memStore();
  let wr = new WarmupRoutine({ storage: store, dayKey: '2026-06-26' });
  wr.completeStep(0); wr.completeStep(1); wr.completeStep(2);
  assert.equal(wr.totalDone, 1);
  // 新的一天
  wr = new WarmupRoutine({ storage: store, dayKey: '2026-06-27' });
  assert.deepEqual(wr.progress(), { done: 0, total: 3 });
  assert.equal(wr.isAllDone(), false);
  assert.equal(wr.totalDone, 1); // 累计保留
  wr.completeStep(0); wr.completeStep(1); wr.completeStep(2);
  assert.equal(wr.totalDone, 2);
});

test('completeStep 越界安全', () => {
  const wr = new WarmupRoutine({ storage: memStore(), dayKey: '2026-06-26' });
  const r = wr.completeStep(9);
  assert.equal(r.changed, false);
});
