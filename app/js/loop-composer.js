/**
 * loop-composer.js — 循环作曲台引擎（纯逻辑，可测试）
 *
 * 把 magic-jam 的「零失败五声即兴」升级成「作品」：孩子在一个固定长度的
 * 循环（默认 4 小节）里一层层叠录——先录一段旋律，循环播放，再叠一层和声、
 * 一层低音……攒成自己的小曲子，最后导出成标准 MIDI / 分享卡。
 *
 * 「即兴玩」→「我创作了一首歌」：拥有感 + 成就感，专治易放弃、爱音乐讨厌
 * 重复练的孩子。
 *
 * 纯函数/纯数据：不碰真 MIDI、AudioContext、DOM、定时器。所有发声/录制时间戳
 * 由调用方（app.js 的 renderLoopComposer）注入，便于单测。复用 recorder.js 的
 * SMF 编码原语。
 */
import { encodeVarLen, u16, u32 } from './recorder.js';

/** 每层一个颜色（循环取用） */
export const LAYER_COLORS = ['#5a8bff', '#5ad17e', '#ff9f45', '#b06bff', '#ff5d73', '#3fc9d6'];

/** 量化网格选项：每拍细分数（0=不量化/自由） */
export const QUANTIZE_OPTIONS = [
  { div: 0, label: '自由（不对齐）' },
  { div: 1, label: '♩ 每拍' },
  { div: 2, label: '♪ 八分' },
  { div: 4, label: '♬ 十六分' },
];

function rank(type) { return type === 'off' ? 0 : 1; } // 同刻：先关后开，避免黏音

export class LoopComposer {
  /**
   * @param {object} opts
   * @param {number} opts.bars         循环小节数（默认 4）
   * @param {number} opts.beatsPerBar  每小节拍数（默认 4）
   * @param {number} opts.bpm          速度（默认 90）
   * @param {number} opts.quantizeDiv  每拍细分量化（0=自由，默认 2=八分）
   */
  constructor({ bars = 4, beatsPerBar = 4, bpm = 90, quantizeDiv = 2 } = {}) {
    this.bars = bars;
    this.beatsPerBar = beatsPerBar;
    this.bpm = bpm;
    this.quantizeDiv = quantizeDiv;
    this.layers = [];   // {id, name, color, muted, notes:[{t, midi, vel, durMs}]}
    this._seq = 1;
  }

  get beatMs() { return 60000 / this.bpm; }
  get loopMs() { return this.bars * this.beatsPerBar * this.beatMs; }
  /** 量化步长（毫秒）；0 表示不量化 */
  get gridMs() { return this.quantizeDiv > 0 ? this.beatMs / this.quantizeDiv : 0; }
  get layerCount() { return this.layers.length; }
  get noteCount() { return this.layers.reduce((s, l) => s + l.notes.length, 0); }
  get isEmpty() { return this.noteCount === 0; }

  /** 把时间折回 [0, loopMs) */
  wrap(t) {
    const L = this.loopMs;
    if (L <= 0) return 0;
    let x = t % L;
    if (x < 0) x += L;
    return x;
  }

  /** 先按网格吸附（若开启量化），再折回循环内 */
  quantize(t) {
    let x = t;
    const g = this.gridMs;
    if (g > 0) x = Math.round(x / g) * g;
    return this.wrap(x);
  }

  /** 新增一层，返回该层对象 */
  addLayer(name) {
    const id = this._seq++;
    const color = LAYER_COLORS[this.layers.length % LAYER_COLORS.length];
    const layer = { id, name: name || `第 ${this.layers.length + 1} 层`, color, muted: false, notes: [] };
    this.layers.push(layer);
    return layer;
  }

  getLayer(id) { return this.layers.find(l => l.id === id) || null; }
  removeLayer(id) { this.layers = this.layers.filter(l => l.id !== id); }
  clearLayer(id) { const l = this.getLayer(id); if (l) l.notes = []; }
  /** 切换静音，返回切换后的 muted 状态 */
  toggleMute(id) { const l = this.getLayer(id); if (!l) return false; l.muted = !l.muted; return l.muted; }

  /**
   * 给某层加一个音：起点量化+折回；时长夹在 [20ms, loopMs]。
   * @returns {object|null} 加入的 note，或 null（层不存在）
   */
  addNote(id, { t, midi, vel = 90, durMs = 0 }) {
    const l = this.getLayer(id);
    if (!l) return null;
    const start = this.quantize(t);
    const fallback = this.gridMs || this.beatMs / 2;
    const d = Math.min(Math.max(20, durMs || fallback), this.loopMs);
    const note = { t: start, midi, vel, durMs: d };
    l.notes.push(note);
    return note;
  }

  /**
   * 把未静音的层摊平成一个循环内排好序的 on/off 事件表。
   * note-off 时间 = t+durMs，越过 loopMs 则夹到 loopMs（保持循环干净不黏音）。
   * @returns {Array<{t,type:'on'|'off',midi,vel,layerId,color}>}
   */
  events({ includeMuted = false } = {}) {
    const evs = [];
    for (const l of this.layers) {
      if (l.muted && !includeMuted) continue;
      for (const n of l.notes) {
        const off = Math.min(this.loopMs, n.t + n.durMs);
        evs.push({ t: n.t, type: 'on', midi: n.midi, vel: n.vel, layerId: l.id, color: l.color });
        evs.push({ t: off, type: 'off', midi: n.midi, vel: 0, layerId: l.id, color: l.color });
      }
    }
    evs.sort((a, b) => (a.t - b.t) || (rank(a.type) - rank(b.type)));
    return evs;
  }

  /**
   * 导出为标准 MIDI 文件（Type 0，合并所有未静音层），可循环 repeat 遍。
   * @param {object} opts
   * @param {number} opts.ppq     每四分音符 tick（默认 480）
   * @param {number} opts.repeat  循环遍数（默认 1）
   * @param {number} opts.channel MIDI 通道 0-15（默认 0）
   * @returns {number[]} 完整 SMF 字节
   */
  toMidiFile({ ppq = 480, repeat = 1, channel = 0 } = {}) {
    const msPerTick = this.beatMs / ppq;
    const raw = [];
    for (let r = 0; r < Math.max(1, repeat); r++) {
      const base = r * this.loopMs;
      for (const e of this.events()) {
        raw.push({ tick: Math.round((base + e.t) / msPerTick), e });
      }
    }
    raw.sort((a, b) => (a.tick - b.tick) || (rank(a.e.type) - rank(b.e.type)));

    const track = [];
    const usPerQuarter = Math.round(60000000 / this.bpm);
    track.push(0x00, 0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff);
    let lastTick = 0;
    for (const { tick, e } of raw) {
      const delta = Math.max(0, tick - lastTick);
      lastTick = tick;
      track.push(...encodeVarLen(delta));
      if (e.type === 'on') track.push(0x90 | (channel & 0xf), e.midi & 0x7f, e.vel & 0x7f);
      else track.push(0x80 | (channel & 0xf), e.midi & 0x7f, 0);
    }
    track.push(0x00, 0xff, 0x2f, 0x00);

    const header = [0x4d, 0x54, 0x68, 0x64, ...u32(6), ...u16(0), ...u16(1), ...u16(ppq)];
    const trackChunk = [0x4d, 0x54, 0x72, 0x6b, ...u32(track.length), ...track];
    return [...header, ...trackChunk];
  }
}
