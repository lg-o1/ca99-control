/**
 * midi-file.js — 标准 MIDI 文件（SMF）解析器（纯逻辑，可单元测试）
 *
 * 解析 .mid/.midi 字节流为带绝对时间的音符列表，供"曲谱跟弹"（Synthesia 式）
 * 模块作为输入：除内置童谣外，用户可上传任意 MIDI 文件来练习。
 *
 * 支持：
 *  - MThd 头（format 0/1/2、ntracks、division=每四分音符 tick 数 / SMPTE）
 *  - MTrk 轨：变长量(VLQ) delta、Note On/Off（含 vel=0 视作 Off）、running status
 *  - Meta：Set Tempo(0x51)、Time Signature(0x58)、Track Name(0x03)、End of Track(0x2F)
 *  - 变速：tempo map 把 tick 精确换算为毫秒
 *  - 手别(hand) 启发式分配：多音轨→按平均音高分左右手；单轨→按音高分割点
 *
 * 不依赖任何浏览器 API（浏览器侧用 FileReader 读出 ArrayBuffer 再传入）。
 */

/** 把输入规整为 Uint8Array */
function toBytes(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (Array.isArray(input)) return Uint8Array.from(input);
  if (input && input.buffer) return new Uint8Array(input.buffer);
  throw new Error('parseMidi: 不支持的输入类型');
}

/**
 * 解析 MIDI 文件。
 * @param {Uint8Array|ArrayBuffer|number[]} input
 * @returns {object} 见文件头说明
 */
export function parseMidi(input) {
  const data = toBytes(input);
  let p = 0;
  const u8 = () => data[p++];
  const u16 = () => { const v = (data[p] << 8) | data[p + 1]; p += 2; return v; };
  const u32 = () => { const v = (data[p] * 0x1000000) + (data[p + 1] << 16) + (data[p + 2] << 8) + data[p + 3]; p += 4; return v >>> 0 === v ? v : v; };
  const str = (n) => { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(data[p++]); return s; };
  const vlq = () => { let v = 0, b; do { b = data[p++]; v = (v << 7) | (b & 0x7f); } while (b & 0x80); return v; };

  if (data.length < 14 || str(4) !== 'MThd') throw new Error('不是有效的 MIDI 文件（缺少 MThd 头）');
  const headerLen = u32();
  const format = u16();
  const ntracks = u16();
  const division = u16();
  p = 8 + headerLen; // 跳过头部其余字节（一般正好是 6）

  let ticksPerBeat;
  let smpte = false;
  if (division & 0x8000) {
    // SMPTE：高字节为负的 fps，低字节为每帧 tick 数。换算成"每秒 tick"，按 120bpm 折算每拍
    smpte = true;
    const fps = 256 - (division >> 8); // 取补码得正 fps（24/25/29/30）
    const tpf = division & 0xff;
    ticksPerBeat = Math.max(1, Math.round((fps * tpf) / 2)); // 近似：按 0.5s/拍
  } else {
    ticksPerBeat = division || 480;
  }

  const tempos = []; // {tick, usPerBeat}
  let timeSig = null;
  const rawTracks = [];

  for (let t = 0; t < ntracks; t++) {
    if (p + 8 > data.length) break;
    const tag = str(4);
    if (tag !== 'MTrk') { // 容错：跳过未知块
      const skip = u32(); p += skip; continue;
    }
    const len = u32();
    const end = Math.min(p + len, data.length);
    let tick = 0;
    let status = 0;
    let trackName = '';
    const open = new Map(); // channel*128+note -> {startTick, velocity}
    const notes = [];

    while (p < end) {
      tick += vlq();
      let ev = data[p];
      if (ev & 0x80) { status = ev; p++; } else { ev = status; } // running status
      const type = ev & 0xf0;
      const channel = ev & 0x0f;

      if (ev === 0xff) { // meta
        const metaType = u8();
        const mlen = vlq();
        const start = p; p += mlen;
        if (metaType === 0x51 && mlen === 3) {
          tempos.push({ tick, usPerBeat: (data[start] << 16) | (data[start + 1] << 8) | data[start + 2] });
        } else if (metaType === 0x58 && mlen >= 2) {
          if (!timeSig) timeSig = { num: data[start], den: 1 << data[start + 1] };
        } else if (metaType === 0x03 && !trackName) {
          let s = ''; for (let i = 0; i < mlen; i++) s += String.fromCharCode(data[start + i]); trackName = s;
        }
        // 0x2F End of Track 等其余忽略
      } else if (ev === 0xf0 || ev === 0xf7) { // sysex
        const slen = vlq(); p += slen;
      } else if (type === 0x90) { // note on
        const note = u8(); const vel = u8();
        const key = channel * 128 + note;
        if (vel > 0) open.set(key, { startTick: tick, velocity: vel });
        else { const on = open.get(key); if (on) { notes.push({ midi: note, startTick: on.startTick, endTick: tick, velocity: on.velocity, channel }); open.delete(key); } }
      } else if (type === 0x80) { // note off
        const note = u8(); u8();
        const key = channel * 128 + note; const on = open.get(key);
        if (on) { notes.push({ midi: note, startTick: on.startTick, endTick: tick, velocity: on.velocity, channel }); open.delete(key); }
      } else if (type === 0xa0 || type === 0xb0 || type === 0xe0) {
        p += 2; // 双数据字节
      } else if (type === 0xc0 || type === 0xd0) {
        p += 1; // 单数据字节
      } else {
        p = end; break; // 未知，放弃该轨剩余
      }
    }
    // 收尾未关闭的音符
    for (const [key, on] of open) {
      notes.push({ midi: key % 128, startTick: on.startTick, endTick: tick, velocity: on.velocity, channel: Math.floor(key / 128) });
    }
    p = end;
    rawTracks.push({ name: trackName, notes });
  }

  // ---- tempo map ----
  if (!tempos.length) tempos.push({ tick: 0, usPerBeat: 500000 }); // 默认 120bpm
  tempos.sort((a, b) => a.tick - b.tick);
  if (tempos[0].tick !== 0) tempos.unshift({ tick: 0, usPerBeat: tempos[0].usPerBeat });
  // 预计算每个 tempo 段起点的累计毫秒
  const pts = [];
  let acc = 0;
  for (let i = 0; i < tempos.length; i++) {
    if (i > 0) acc += ((tempos[i].tick - tempos[i - 1].tick) * (tempos[i - 1].usPerBeat / 1000)) / ticksPerBeat;
    pts.push({ tick: tempos[i].tick, ms: acc, usPerBeat: tempos[i].usPerBeat });
  }
  const tickToMs = (tk) => {
    let i = pts.length - 1;
    while (i > 0 && pts[i].tick > tk) i--;
    const seg = pts[i];
    return seg.ms + ((tk - seg.tick) * (seg.usPerBeat / 1000)) / ticksPerBeat;
  };

  // ---- 手别分配 ----
  const trackHasNotes = rawTracks.map((tr) => tr.notes.length > 0);
  const noteTrackIdx = rawTracks.map((_, i) => i).filter((i) => trackHasNotes[i]);
  const meanPitch = (idx) => {
    const ns = rawTracks[idx].notes;
    return ns.reduce((s, n) => s + n.midi, 0) / Math.max(1, ns.length);
  };
  let handForTrack = null;       // 多音轨：每轨固定手别
  let splitPoint = null;         // 单音轨：按音高分割
  if (noteTrackIdx.length >= 2) {
    const sorted = noteTrackIdx.slice().sort((a, b) => meanPitch(b) - meanPitch(a));
    handForTrack = {};
    sorted.forEach((idx, rank) => { handForTrack[idx] = rank === 0 ? 'r' : 'l'; });
  } else {
    // 单音轨：用 channel 区分（若有 2 个），否则按音高中位数分割
    const allNotes = noteTrackIdx.length ? rawTracks[noteTrackIdx[0]].notes : [];
    const chans = [...new Set(allNotes.map((n) => n.channel))];
    if (chans.length >= 2) {
      const meanCh = (c) => { const ns = allNotes.filter((n) => n.channel === c); return ns.reduce((s, n) => s + n.midi, 0) / Math.max(1, ns.length); };
      const top = chans.slice().sort((a, b) => meanCh(b) - meanCh(a))[0];
      handForTrack = { __byChannel: true, top };
    } else if (allNotes.length) {
      const ps = allNotes.map((n) => n.midi).sort((a, b) => a - b);
      const median = ps[Math.floor(ps.length / 2)];
      splitPoint = Math.min(72, Math.max(48, median)); // 限制在合理范围
    }
  }

  // ---- 合并所有音符并计算 ms / beat / hand ----
  const notes = [];
  rawTracks.forEach((tr, ti) => {
    for (const n of tr.notes) {
      if (n.endTick <= n.startTick) n.endTick = n.startTick + Math.round(ticksPerBeat / 8); // 兜底最小时值
      let hand = 'r';
      if (handForTrack && handForTrack.__byChannel) hand = n.channel === handForTrack.top ? 'r' : 'l';
      else if (handForTrack) hand = handForTrack[ti] || 'r';
      else if (splitPoint != null) hand = n.midi >= splitPoint ? 'r' : 'l';
      const ms = tickToMs(n.startTick);
      const endMs = tickToMs(n.endTick);
      notes.push({
        midi: n.midi,
        ms,
        durMs: Math.max(1, endMs - ms),
        beat: n.startTick / ticksPerBeat,
        dur: (n.endTick - n.startTick) / ticksPerBeat,
        velocity: n.velocity,
        hand,
        track: ti,
        channel: n.channel,
      });
    }
  });
  notes.sort((a, b) => (a.ms - b.ms) || (a.midi - b.midi));

  const durationMs = notes.length ? Math.max(...notes.map((n) => n.ms + n.durMs)) : 0;
  const durationBeats = notes.length ? Math.max(...notes.map((n) => n.beat + n.dur)) : 0;
  const bpm = Math.round(60000000 / tempos[0].usPerBeat);

  return {
    format, ntracks, ticksPerBeat, smpte,
    timeSig: timeSig || { num: 4, den: 4 },
    bpm,
    tempos: tempos.slice(),
    trackNames: rawTracks.map((t) => t.name),
    hasHands: noteTrackIdx.length >= 2 || splitPoint != null || (handForTrack && handForTrack.__byChannel),
    notes,
    durationMs,
    durationBeats,
  };
}

/** 取某手别的音符数（hand: 'r'|'l'|'both'） */
export function countHand(parsed, hand) {
  if (hand === 'both' || !hand) return parsed.notes.length;
  return parsed.notes.filter((n) => n.hand === hand).length;
}

const exported = { parseMidi, countHand };
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
if (typeof window !== 'undefined') window.MidiFile = exported;
