/**
 * share-card.js — 演奏分享卡（纯逻辑，可测试）
 *
 * 把一段录制（recorder 的事件流：{t, bytes}）汇总成可视化「分享卡」所需的数据：
 *   - extractNotes：从 note-on/off 还原出 {midi, startMs, durMs} 音符
 *   - summarize：音符数 / 时长 / 音域 / 不同音高数
 *   - starRating：⭐ 评星（鼓励向——只要弹了就至少 3 星，越多越久越高，封顶 5）
 *   - praiseLine：按星级挑一句鼓励语（确定性，可注入挑选索引）
 *   - rollLayout：把音符映射成迷你钢琴卷帘的矩形（给 canvas 画缩略图用）
 *
 * 不碰 canvas / DOM / 时间——便于单元测试；画图由调用方（app.js）完成。
 */

/** 从原始 MIDI 事件还原音符 [{midi,startMs,durMs}]，按起音时间升序 */
export function extractNotes(events) {
  const open = {};        // `${ch}:${note}` -> startMs
  const notes = [];
  let lastT = 0;
  for (const ev of events || []) {
    const b = ev && ev.bytes;
    if (!b || b.length < 3) continue;
    lastT = ev.t;
    const status = b[0] & 0xf0;
    const ch = b[0] & 0x0f;
    const note = b[1], vel = b[2];
    const key = ch + ':' + note;
    if (status === 0x90 && vel > 0) {
      open[key] = ev.t;
    } else if (status === 0x80 || (status === 0x90 && vel === 0)) {
      if (open[key] != null) {
        notes.push({ midi: note, startMs: open[key], durMs: Math.max(0, ev.t - open[key]) });
        delete open[key];
      }
    }
  }
  // 收尾：还按着没松的音，按最后事件时间闭合（至少 1ms）
  for (const key of Object.keys(open)) {
    const note = +key.split(':')[1];
    notes.push({ midi: note, startMs: open[key], durMs: Math.max(1, lastT - open[key]) });
  }
  return notes.sort((a, b) => a.startMs - b.startMs || a.midi - b.midi);
}

/** 汇总统计 */
export function summarize(events) {
  const notes = extractNotes(events);
  const durationMs = (events && events.length) ? events[events.length - 1].t : 0;
  const pitches = notes.map(n => n.midi);
  return {
    notes: notes.length,
    durationMs,
    lowMidi: pitches.length ? Math.min(...pitches) : null,
    highMidi: pitches.length ? Math.max(...pitches) : null,
    distinctPitches: new Set(pitches).size,
  };
}

/** ⭐ 评星：鼓励向，弹了就 ≥3 星，越多/越久越高，封顶 5；什么都没弹返回 0 */
export function starRating(summary) {
  const s = summary || {};
  if (!s.notes) return 0;
  let stars = 3;
  if (s.notes >= 15 || s.durationMs >= 15000) stars = 4;
  if (s.notes >= 40 || s.durationMs >= 40000) stars = 5;
  return stars;
}

const PRAISE = {
  0: ['弹两下试试，我帮你录下来 🎹'],
  3: ['很棒的开始！🌱', '你弹出来啦，真好听 🎵', '迈出第一步最了不起 👏'],
  4: ['越弹越顺了！🎶', '听得出你很用心 💪', '这段真有进步 ✨'],
  5: ['太精彩了！🌟', '完整弹下来，超厉害 🏆', '你就是小小音乐家 🎼'],
};

/** 按星级挑一句鼓励语；idx 可注入（默认按音符数取模，确定性） */
export function praiseLine(stars, idx) {
  const pool = PRAISE[stars] || PRAISE[3];
  const i = ((idx == null ? 0 : idx) % pool.length + pool.length) % pool.length;
  return pool[i];
}

/** 把音符映射成迷你卷帘矩形 [{x,y,w,h,midi}]（给 canvas 画缩略图） */
export function rollLayout(notes, opts = {}) {
  const width = opts.width || 600;
  const height = opts.height || 120;
  const pad = opts.pad || 4;
  if (!notes || !notes.length) return [];
  const starts = notes.map(n => n.startMs);
  const ends = notes.map(n => n.startMs + n.durMs);
  const t0 = Math.min(...starts);
  const t1 = Math.max(...ends);
  const span = Math.max(1, t1 - t0);
  const lo = opts.minMidi != null ? opts.minMidi : Math.min(...notes.map(n => n.midi));
  const hi = opts.maxMidi != null ? opts.maxMidi : Math.max(...notes.map(n => n.midi));
  const range = Math.max(1, hi - lo);
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const rowH = Math.max(3, innerH / (range + 1));
  return notes.map(n => ({
    x: pad + ((n.startMs - t0) / span) * innerW,
    y: pad + (1 - (n.midi - lo) / range) * (innerH - rowH),
    w: Math.max(2, (n.durMs / span) * innerW),
    h: rowH,
    midi: n.midi,
  }));
}

/** 把毫秒格式化成 mm:ss（给卡片显示用） */
export function fmtDuration(ms) {
  const total = Math.max(0, Math.round((ms || 0) / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** MIDI 音高 → 音名（如 60→C4），给「音域」显示 */
export function midiName(m) {
  if (m == null) return '—';
  return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
}
