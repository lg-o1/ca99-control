// backing-band.js — 乐队伴奏轨（Tomplay 式）纯逻辑引擎
// 把一首多轨 MIDI 拆成若干“声部”，让 Lily 选一个声部作为“我的部分”（静音、自己弹），
// 其余声部由电脑用不同音色当“乐队”一起演奏。纯逻辑、可单测；实际发声在 app.js。

// ---- General MIDI program → 乐器家族（音色/波形/相对音量/图标）----
// 每个家族给一个 Web Audio 友好的近似音色：波形 + 增益 + 起止包络系数。
const FAMILIES = {
  drums:   { id: 'drums',   label: '鼓组',   emoji: '🥁', wave: 'noise',    gain: 0.85, attack: 0.001, release: 0.12 },
  bass:    { id: 'bass',    label: '贝斯',   emoji: '🎸', wave: 'sawtooth', gain: 0.55, attack: 0.005, release: 0.18 },
  guitar:  { id: 'guitar',  label: '吉他',   emoji: '🎸', wave: 'triangle', gain: 0.42, attack: 0.004, release: 0.25 },
  piano:   { id: 'piano',   label: '钢琴',   emoji: '🎹', wave: 'triangle', gain: 0.40, attack: 0.002, release: 0.30 },
  organ:   { id: 'organ',   label: '风琴',   emoji: '🎛️', wave: 'square',   gain: 0.30, attack: 0.01,  release: 0.10 },
  strings: { id: 'strings', label: '弦乐',   emoji: '🎻', wave: 'sawtooth', gain: 0.34, attack: 0.04,  release: 0.40 },
  brass:   { id: 'brass',   label: '铜管',   emoji: '🎺', wave: 'square',   gain: 0.36, attack: 0.02,  release: 0.20 },
  reed:    { id: 'reed',    label: '管乐',   emoji: '🎷', wave: 'triangle', gain: 0.38, attack: 0.02,  release: 0.20 },
  synth:   { id: 'synth',   label: '合成器', emoji: '🎛️', wave: 'sawtooth', gain: 0.34, attack: 0.01,  release: 0.25 },
  pitched: { id: 'pitched', label: '其它',   emoji: '🎵', wave: 'triangle', gain: 0.36, attack: 0.005, release: 0.25 },
};

/** GM program (0-127) → 家族 key；isDrum 优先 */
export function gmFamily(program, isDrum) {
  if (isDrum) return 'drums';
  const p = (program == null) ? 0 : program;
  if (p <= 7) return 'piano';
  if (p <= 15) return 'pitched';   // 色彩打击 / 钟琴等
  if (p <= 23) return 'organ';
  if (p <= 31) return 'guitar';
  if (p <= 39) return 'bass';
  if (p <= 51) return 'strings';
  if (p <= 55) return 'strings';   // 合唱/合奏
  if (p <= 63) return 'brass';
  if (p <= 71) return 'reed';
  if (p <= 79) return 'reed';      // 笛类
  if (p <= 103) return 'synth';
  return 'pitched';
}

export function familyInfo(key) {
  return FAMILIES[key] || FAMILIES.pitched;
}

/** 选用 channel 还是 track 作为“声部键”：用到 ≥2 个 channel 就按 channel，否则按 track */
export function partKeyMode(parsed) {
  const chans = new Set((parsed.notes || []).map((n) => n.channel));
  return chans.size >= 2 ? 'channel' : 'track';
}

/**
 * 把解析后的 MIDI 拆成声部数组。
 * 返回 [{ id, key, mode, isDrum, program, family, label, emoji, count, meanPitch, loPitch, hiPitch }]
 * 按平均音高从高到低排序（旋律声部通常在最前）。
 */
export function splitParts(parsed) {
  const notes = parsed.notes || [];
  const mode = partKeyMode(parsed);
  const cp = parsed.channelPrograms || {};
  const tp = parsed.trackPrograms || [];
  const groups = new Map();
  for (const n of notes) {
    const key = mode === 'channel' ? n.channel : n.track;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  }
  const parts = [];
  for (const [key, ns] of groups) {
    const isDrum = mode === 'channel' ? (key === 9) : ns.every((n) => n.channel === 9);
    let program = null;
    if (mode === 'channel') program = (cp[key] != null) ? cp[key] : null;
    else program = (tp[key] != null) ? tp[key] : (cp[ns[0].channel] != null ? cp[ns[0].channel] : null);
    const famKey = gmFamily(program, isDrum);
    const fam = familyInfo(famKey);
    const pitches = ns.map((n) => n.midi);
    const meanPitch = pitches.reduce((s, m) => s + m, 0) / Math.max(1, pitches.length);
    const trackName = (parsed.trackNames && mode === 'track') ? (parsed.trackNames[key] || '') : '';
    const label = (trackName && trackName.trim()) ? trackName.trim() : fam.label;
    parts.push({
      id: `${mode}:${key}`,
      key, mode, isDrum,
      program,
      family: famKey,
      label,
      emoji: fam.emoji,
      count: ns.length,
      meanPitch: Math.round(meanPitch * 10) / 10,
      loPitch: Math.min(...pitches),
      hiPitch: Math.max(...pitches),
    });
  }
  parts.sort((a, b) => b.meanPitch - a.meanPitch);
  return parts;
}

/** 推荐“我的声部”：音域最高的非鼓声部（一般是旋律）；全是鼓则取音符最多的那个 */
export function suggestMyPart(parts) {
  if (!parts.length) return null;
  const melodic = parts.filter((p) => !p.isDrum);
  const pool = melodic.length ? melodic : parts;
  // 已按 meanPitch 降序；旋律取最高，但若该声部音符极少则改取音符最多的旋律声部
  const top = pool[0];
  const richest = pool.slice().sort((a, b) => b.count - a.count)[0];
  if (top.count < 8 && richest.count >= top.count * 2) return richest.id;
  return top.id;
}

/**
 * 生成播放计划。
 * opts: { myPart(id), rate(默认1，>1 更快), mutedParts(Set/array of ids 额外静音) }
 * 返回 { backing:[{midi,ms,durMs,velocity,partId,family,isDrum}], mine:[...同结构], durationMs, rate }
 * backing = 乐队（电脑发声）；mine = 我的部分（屏幕引导，不发声，Lily 真琴弹）。
 * 所有 ms/durMs 已按 1/rate 缩放（rate 越大越快）。
 */
export function buildSchedule(parsed, opts = {}) {
  const parts = splitParts(parsed);
  const byKeyId = new Map(parts.map((p) => [p.id, p]));
  const mode = parts.length ? parts[0].mode : 'track';
  const rate = (opts.rate && opts.rate > 0) ? opts.rate : 1;
  const myPart = opts.myPart || suggestMyPart(parts);
  const muted = new Set([myPart, ...(opts.mutedParts || [])].filter(Boolean));
  const partIdOf = (n) => `${mode}:${mode === 'channel' ? n.channel : n.track}`;
  const backing = [], mine = [];
  for (const n of (parsed.notes || [])) {
    const pid = partIdOf(n);
    const p = byKeyId.get(pid);
    const rec = {
      midi: n.midi,
      ms: n.ms / rate,
      durMs: n.durMs / rate,
      velocity: n.velocity,
      partId: pid,
      family: p ? p.family : 'pitched',
      isDrum: p ? p.isDrum : false,
    };
    if (pid === myPart) mine.push(rec);
    else if (!muted.has(pid)) backing.push(rec);
  }
  backing.sort((a, b) => a.ms - b.ms);
  mine.sort((a, b) => a.ms - b.ms);
  const all = backing.concat(mine);
  const durationMs = all.length ? Math.max(...all.map((n) => n.ms + n.durMs)) : 0;
  return { backing, mine, durationMs, rate, myPart, parts };
}

const exported = { gmFamily, familyInfo, partKeyMode, splitParts, suggestMyPart, buildSchedule, FAMILIES };
if (typeof module !== 'undefined' && module.exports) module.exports = exported;
if (typeof window !== 'undefined') window.BackingBand = exported;

export default exported;
