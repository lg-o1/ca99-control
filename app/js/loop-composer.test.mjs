/**
 * loop-composer.test.mjs — 循环作曲台引擎单元测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { LoopComposer, LAYER_COLORS, QUANTIZE_OPTIONS } from './loop-composer.js';

// ---- 基本几何 ----
test('beatMs/loopMs/gridMs：默认 4 小节 4/4 90bpm 八分量化', () => {
  const lc = new LoopComposer();
  assert.equal(lc.beatMs, 60000 / 90);
  assert.equal(lc.loopMs, 16 * (60000 / 90));      // 4*4 拍
  assert.equal(lc.gridMs, (60000 / 90) / 2);       // 八分 = 每拍/2
});

test('gridMs：quantizeDiv=0 时为 0（不量化）', () => {
  const lc = new LoopComposer({ quantizeDiv: 0 });
  assert.equal(lc.gridMs, 0);
});

// ---- wrap ----
test('wrap：折回 [0, loopMs)', () => {
  const lc = new LoopComposer({ bpm: 60, bars: 1, beatsPerBar: 4 }); // loopMs = 4000
  assert.equal(lc.loopMs, 4000);
  assert.equal(lc.wrap(500), 500);
  assert.equal(lc.wrap(4500), 500);
  assert.equal(lc.wrap(-100), 3900);
  assert.equal(lc.wrap(8000), 0);
});

// ---- quantize ----
test('quantize：按网格吸附再折回', () => {
  const lc = new LoopComposer({ bpm: 60, bars: 1, beatsPerBar: 4, quantizeDiv: 1 }); // gridMs=1000
  assert.equal(lc.quantize(120), 0);      // 最近网格 0
  assert.equal(lc.quantize(600), 1000);   // 最近网格 1000
  assert.equal(lc.quantize(4600), 1000);  // 折回后再贴 1000? 4600->round/1000=5->5000->wrap 1000
});

test('quantize：div=0 时只折回不吸附', () => {
  const lc = new LoopComposer({ bpm: 60, bars: 1, beatsPerBar: 4, quantizeDiv: 0 });
  assert.equal(lc.quantize(637), 637);
  assert.equal(lc.quantize(4637), 637);
});

// ---- 层管理 ----
test('addLayer：颜色循环取用、自增 id、默认名', () => {
  const lc = new LoopComposer();
  const a = lc.addLayer();
  const b = lc.addLayer('低音');
  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(a.color, LAYER_COLORS[0]);
  assert.equal(b.color, LAYER_COLORS[1]);
  assert.equal(b.name, '低音');
  assert.equal(lc.layerCount, 2);
});

test('removeLayer / clearLayer / toggleMute', () => {
  const lc = new LoopComposer();
  const a = lc.addLayer();
  lc.addNote(a.id, { t: 0, midi: 60 });
  assert.equal(lc.noteCount, 1);
  assert.equal(lc.toggleMute(a.id), true);
  assert.equal(lc.toggleMute(a.id), false);
  lc.clearLayer(a.id);
  assert.equal(lc.noteCount, 0);
  lc.removeLayer(a.id);
  assert.equal(lc.layerCount, 0);
});

// ---- addNote ----
test('addNote：量化起点、夹紧时长、未知层返回 null', () => {
  const lc = new LoopComposer({ bpm: 60, bars: 1, beatsPerBar: 4, quantizeDiv: 1 }); // grid 1000
  const a = lc.addLayer();
  const n = lc.addNote(a.id, { t: 1180, midi: 64, vel: 100, durMs: 500 });
  assert.equal(n.t, 1000);     // 吸附
  assert.equal(n.durMs, 500);
  assert.equal(n.vel, 100);
  // 时长超过 loopMs 被夹住
  const n2 = lc.addNote(a.id, { t: 0, midi: 60, durMs: 99999 });
  assert.equal(n2.durMs, lc.loopMs);
  assert.equal(lc.addNote(999, { t: 0, midi: 60 }), null);
});

test('addNote：durMs=0 时回退到网格步长', () => {
  const lc = new LoopComposer({ bpm: 60, bars: 1, beatsPerBar: 4, quantizeDiv: 2 }); // grid 500
  const a = lc.addLayer();
  const n = lc.addNote(a.id, { t: 0, midi: 60, durMs: 0 });
  assert.equal(n.durMs, 500);
});

// ---- events ----
test('events：排序、关在开前、夹住越界 off', () => {
  const lc = new LoopComposer({ bpm: 60, bars: 1, beatsPerBar: 4, quantizeDiv: 0 }); // loop 4000
  const a = lc.addLayer();
  lc.addNote(a.id, { t: 3500, midi: 72, durMs: 1000 }); // off 越界 -> 夹到 4000
  lc.addNote(a.id, { t: 0, midi: 60, durMs: 500 });
  const evs = lc.events();
  assert.equal(evs[0].type, 'on');
  assert.equal(evs[0].midi, 60);
  // 末尾应有夹到 loopMs 的 off
  const last = evs[evs.length - 1];
  assert.equal(last.type, 'off');
  assert.equal(last.t, 4000);
});

test('events：静音层被排除（除非 includeMuted）', () => {
  const lc = new LoopComposer();
  const a = lc.addLayer();
  const b = lc.addLayer();
  lc.addNote(a.id, { t: 0, midi: 60 });
  lc.addNote(b.id, { t: 0, midi: 67 });
  lc.toggleMute(b.id);
  assert.equal(lc.events().length, 2);             // 仅 a：on+off
  assert.equal(lc.events({ includeMuted: true }).length, 4);
});

// ---- toMidiFile ----
test('toMidiFile：含 MThd/MTrk 头、note-on/off、tempo meta', () => {
  const lc = new LoopComposer({ bpm: 120, bars: 1, beatsPerBar: 4, quantizeDiv: 0 });
  const a = lc.addLayer();
  lc.addNote(a.id, { t: 0, midi: 60, vel: 80, durMs: 500 });
  const bytes = lc.toMidiFile();
  // "MThd"
  assert.deepEqual(bytes.slice(0, 4), [0x4d, 0x54, 0x68, 0x64]);
  // 含 "MTrk"
  const s = bytes.join(',');
  assert.ok(s.includes([0x4d, 0x54, 0x72, 0x6b].join(',')));
  // 含 tempo meta FF 51 03
  assert.ok(s.includes([0xff, 0x51, 0x03].join(',')));
  // 含 note-on 0x90 60 80 与 note-off 0x80 60 0
  assert.ok(s.includes([0x90, 60, 80].join(',')));
  assert.ok(s.includes([0x80, 60, 0].join(',')));
});

test('toMidiFile：repeat 加倍事件数（音符 tick 翻倍范围）', () => {
  const lc = new LoopComposer({ bpm: 120, bars: 1, beatsPerBar: 4, quantizeDiv: 0 });
  const a = lc.addLayer();
  lc.addNote(a.id, { t: 0, midi: 60, durMs: 200 });
  const one = lc.toMidiFile({ repeat: 1 });
  const two = lc.toMidiFile({ repeat: 2 });
  // 两遍的字节明显更长（多了一组 on/off + delta）
  assert.ok(two.length > one.length);
});

// ---- 常量 ----
test('QUANTIZE_OPTIONS / LAYER_COLORS 形状正常', () => {
  assert.ok(QUANTIZE_OPTIONS.length >= 3);
  assert.ok(QUANTIZE_OPTIONS.every(o => typeof o.div === 'number' && o.label));
  assert.ok(LAYER_COLORS.length >= 4);
});
