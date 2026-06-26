/**
 * magic-jam.js — 魔法五声即兴沙盒（纯逻辑，可测试）
 *
 * 把键盘「锁」到五声音阶：怎么弹都好听。给易放弃的孩子一个零失败、
 * 无评分、无对错的自由创作空间——把「练琴」重新变回「玩音乐」。
 *
 * 纯函数：不碰 MIDI/DOM/AudioContext，只算音符集合 / 就近吸附 / 伴奏型。
 * 实际发声与渲染由 app.js 的 renderMagicJam 调用。
 */
import { SCALE_TYPES } from './scale-trainer.js';

/** 心情 → 五声音阶类型（都「怎么弹都好听」） */
export const MOODS = [
  { id: 'major', label: '☀️ 阳光大调', type: 'majorPentatonic' },
  { id: 'minor', label: '🌙 神秘小调', type: 'minorPentatonic' },
];

/** 友好的调（根音音级 + 显示名），都是白键多、好按的调 */
export const ROOTS = [
  { pc: 0, name: 'C' },
  { pc: 7, name: 'G' },
  { pc: 5, name: 'F' },
  { pc: 2, name: 'D' },
  { pc: 9, name: 'A' },
];

/** 彩虹色板：给五声「魔法键」/音垫上色 */
export const PALETTE = ['#ff5d73', '#ff9f45', '#ffd24a', '#5ad17e', '#3fc9d6', '#5a8bff', '#b06bff'];

function mod12(n) { return ((n % 12) + 12) % 12; }

function intervalsOf(type) {
  const t = SCALE_TYPES[type];
  return t ? t.intervals : [0, 2, 4, 7, 9];
}

/** 该五声音阶的音级集合（0-11） */
export function scalePitchClasses(rootPc, type) {
  return intervalsOf(type).map(iv => mod12(rootPc + iv));
}

/** [lo,hi] 区间内属于该五声音阶的所有 MIDI 音（升序） */
export function scaleMidis(rootPc, type, lo = 36, hi = 96) {
  const set = new Set(scalePitchClasses(rootPc, type));
  const out = [];
  for (let m = lo; m <= hi; m++) if (set.has(mod12(m))) out.push(m);
  return out;
}

/**
 * 把任意 MIDI 音就近吸附到最近的五声音——所以真琴弹任何键都落在好听音上。
 * 距离相等时取较低的（更稳）。纯函数。
 */
export function snapToScale(midi, rootPc, type) {
  const set = new Set(scalePitchClasses(rootPc, type));
  if (set.has(mod12(midi))) return midi;
  for (let d = 1; d <= 12; d++) {
    if (set.has(mod12(midi - d))) return midi - d;
    if (set.has(mod12(midi + d))) return midi + d;
  }
  return midi;
}

/** 一排音垫的连续五声音：从 startMidi 起取 count 个升序五声音 */
export function padNotes(rootPc, type, count = 8, startMidi = 60) {
  const all = scaleMidis(rootPc, type, startMidi, startMidi + 60);
  return all.slice(0, count);
}

/** 第 i 个音垫/键的彩虹色 */
export function padColor(i) {
  const n = PALETTE.length;
  return PALETTE[((i % n) + n) % n];
}

/**
 * 简单律动伴奏型（一小节 4 拍）：底鼓 + 军鼓 + 踩镲 + 根/五度贝斯。
 * 返回事件数组 [{beat, kind:'kick'|'snare'|'hat'|'bass', midi?}]，beat 以拍为单位。
 * 纯数据——由 renderMagicJam 用 Web Audio 排程发声（绝不发往 CA99）。
 */
export function vampBar(rootPc, bars = 1) {
  const bassRoot = 36 + mod12(rootPc);
  const bassFifth = 36 + mod12(rootPc + 7);
  const ev = [];
  for (let b = 0; b < bars * 4; b++) {
    const inBar = b % 4;
    ev.push({ beat: b, kind: 'hat' });
    ev.push({ beat: b + 0.5, kind: 'hat' });
    if (inBar === 0) { ev.push({ beat: b, kind: 'kick' }); ev.push({ beat: b, kind: 'bass', midi: bassRoot }); }
    if (inBar === 2) { ev.push({ beat: b, kind: 'kick' }); ev.push({ beat: b, kind: 'bass', midi: bassFifth }); }
    if (inBar === 1 || inBar === 3) ev.push({ beat: b, kind: 'snare' });
  }
  return ev;
}
