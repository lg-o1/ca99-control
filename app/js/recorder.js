/**
 * recorder.js — 弹奏录制 + 标准 MIDI 文件（SMF）编码（纯逻辑，可测试）
 *
 * Recorder：以毫秒时间戳记录原始 MIDI 事件（note-on/off/cc），可回放（把事件
 * 按相对时间重新派发）和导出为标准 MIDI 文件（Type 0）。
 *
 * 不碰真 MIDI/定时器——录制时间戳与回放调度由调用方注入，便于单测。
 */

/** 把一个 14 位以内整数写成 SMF 可变长度量（VLQ）字节数组 */
export function encodeVarLen(value) {
  if (value < 0) value = 0;
  let buffer = value & 0x7f;
  const bytes = [];
  while ((value >>= 7) > 0) {
    buffer <<= 8;
    buffer |= ((value & 0x7f) | 0x80);
  }
  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8; else break;
  }
  return bytes;
}

/** 大端写 32 位 */
export function u32(v) { return [(v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff]; }
/** 大端写 16 位 */
export function u16(v) { return [(v >>> 8) & 0xff, v & 0xff]; }

export class Recorder {
  constructor() {
    this._events = [];   // {t, bytes}
    this._recording = false;
    this._startTime = 0;
  }

  get recording() { return this._recording; }
  get events() { return this._events.slice(); }
  get count() { return this._events.length; }
  get isEmpty() { return this._events.length === 0; }

  /** 开始录制（清空旧内容）。now=起始时间戳 */
  start(now = 0) {
    this._events = [];
    this._recording = true;
    this._startTime = now;
  }

  /** 停止录制 */
  stop() { this._recording = false; }

  /**
   * 记录一个 MIDI 事件（仅在录制中）。
   * @param {number[]} bytes 原始 MIDI 字节
   * @param {number} now 时间戳（毫秒）
   */
  record(bytes, now) {
    if (!this._recording) return;
    this._events.push({ t: now - this._startTime, bytes: bytes.slice() });
  }

  /** 录制总时长（毫秒） */
  get durationMs() {
    return this._events.length ? this._events[this._events.length - 1].t : 0;
  }

  clear() { this._events = []; this._recording = false; }

  /**
   * 回放：用注入的 setTimeout 把每个事件按相对时间重新派发。
   * @param {(bytes:number[]) => void} send  发送回调
   * @param {object} opts
   * @param {function} opts.setTimeoutFn  默认 setTimeout
   * @param {number} opts.speed  速度倍率（1=原速，2=两倍快）默认 1
   * @returns {number[]} 各事件的 timer 句柄（便于取消）
   */
  play(send, opts = {}) {
    const setT = opts.setTimeoutFn || setTimeout;
    const speed = opts.speed || 1;
    return this._events.map(ev =>
      setT(() => send(ev.bytes.slice()), ev.t / speed));
  }

  /**
   * 导出为标准 MIDI 文件（Type 0）字节数组。
   * @param {object} opts
   * @param {number} opts.ppq  每四分音符 tick 数（默认 480）
   * @param {number} opts.bpm  导出时写入的速度（默认 120）
   * @returns {number[]} 完整 SMF 字节
   */
  toMidiFile(opts = {}) {
    const ppq = opts.ppq || 480;
    const bpm = opts.bpm || 120;
    const msPerTick = (60000 / bpm) / ppq;

    const track = [];
    // 速度 meta 事件（FF 51 03 tttttt）
    const usPerQuarter = Math.round(60000000 / bpm);
    track.push(0x00, 0xff, 0x51, 0x03, (usPerQuarter >> 16) & 0xff, (usPerQuarter >> 8) & 0xff, usPerQuarter & 0xff);

    let lastTick = 0;
    for (const ev of this._events) {
      const status = ev.bytes[0];
      // 只写通道电压事件（status 0x80-0xEF）；跳过 sysex/其它（SMF 里不便表达）
      if (status < 0x80 || status > 0xef) continue;
      const tick = Math.round(ev.t / msPerTick);
      const delta = Math.max(0, tick - lastTick);
      lastTick = tick;
      track.push(...encodeVarLen(delta));
      track.push(...ev.bytes);
    }
    // 轨道结束 meta（FF 2F 00）
    track.push(0x00, 0xff, 0x2f, 0x00);

    const header = [
      0x4d, 0x54, 0x68, 0x64,        // "MThd"
      ...u32(6),                      // header length
      ...u16(0),                      // format 0
      ...u16(1),                      // 1 track
      ...u16(ppq),                    // division (ppq)
    ];
    const trackChunk = [
      0x4d, 0x54, 0x72, 0x6b,        // "MTrk"
      ...u32(track.length),
      ...track,
    ];
    return [...header, ...trackChunk];
  }
}
