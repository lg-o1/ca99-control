/**
 * chord-color.js — 和弦色彩板（声光和声）纯逻辑引擎
 *
 * 给定一组同时按下的音（+ 可选调），把它识别成和弦，并映射到：
 *   - 和声【颜色】：和弦品质 → 一套配色（大调暖、小调冷、属七警示、减紧张…）
 *   - 和声【功能/级数】：若设了调，算出它在调里的罗马数字（I ii … V7）与功能名
 *   - 和声【情绪】：一句人话描述这个和弦的"性格/听感"
 *   - "想回家"标记：属功能（V / V7 / vii°）天然想解决到主和弦
 *
 * 目的：把抽象的和声变成【看得见的颜色光 + 听得懂的情绪】，零基础也能玩。
 * 纯逻辑：不碰 MIDI/DOM，按下的音由调用方喂入，便于单元测试。
 */
import { detectChord, NOTE_NAMES, pitchClass } from './chord-detect.js';

/** 调（复用和弦进行的 12 音级主音 + 大/小调） */
export const COLOR_KEYS = [
  { id: 'none', name: '不设调（只看品质）', tonicPc: null, scale: null },
  { id: 'C', name: 'C 大调', tonicPc: 0, scale: 'major' },
  { id: 'G', name: 'G 大调', tonicPc: 7, scale: 'major' },
  { id: 'D', name: 'D 大调', tonicPc: 2, scale: 'major' },
  { id: 'F', name: 'F 大调', tonicPc: 5, scale: 'major' },
  { id: 'A', name: 'A 大调', tonicPc: 9, scale: 'major' },
  { id: 'Am', name: 'A 小调', tonicPc: 9, scale: 'minor' },
  { id: 'Em', name: 'E 小调', tonicPc: 4, scale: 'minor' },
  { id: 'Dm', name: 'D 小调', tonicPc: 2, scale: 'minor' },
];

/**
 * 和弦品质 → 颜色 + 情绪。color 为主色（HSL 字符串），glow 为辉光色。
 * mood 是给孩子也能懂的一句情绪。flash 表示该不该"闪烁"（紧张/想解决）。
 */
export const QUALITY_COLORS = {
  '':     { label: '大三和弦', color: 'hsl(28, 90%, 55%)',  glow: 'hsl(40, 95%, 60%)',  mood: '明亮、开心、稳稳的☀️', flash: false },
  m:      { label: '小三和弦', color: 'hsl(215, 70%, 55%)', glow: 'hsl(225, 75%, 62%)', mood: '柔和、忧伤、安静🌙', flash: false },
  dim:    { label: '减三和弦', color: 'hsl(348, 75%, 50%)', glow: 'hsl(0, 85%, 58%)',   mood: '紧张、不安、想赶紧走😣', flash: true },
  aug:    { label: '增三和弦', color: 'hsl(285, 70%, 58%)', glow: 'hsl(295, 80%, 65%)', mood: '神秘、悬浮、像做梦🌀', flash: true },
  sus4:   { label: '挂四和弦', color: 'hsl(170, 60%, 48%)', glow: 'hsl(165, 70%, 55%)', mood: '悬着、等待落地🪂', flash: false },
  sus2:   { label: '挂二和弦', color: 'hsl(190, 60%, 52%)', glow: 'hsl(185, 70%, 58%)', mood: '空灵、开阔💨', flash: false },
  '7':    { label: '属七和弦', color: 'hsl(50, 95%, 52%)',  glow: 'hsl(45, 100%, 58%)', mood: '想回家！强烈要解决🏃', flash: true },
  maj7:   { label: '大七和弦', color: 'hsl(15, 80%, 58%)',  glow: 'hsl(25, 90%, 64%)',  mood: '温暖、爵士、慵懒🍷', flash: false },
  m7:     { label: '小七和弦', color: 'hsl(235, 60%, 58%)', glow: 'hsl(240, 70%, 64%)', mood: '柔润、流动、放松🌊', flash: false },
  m7b5:   { label: '半减七',   color: 'hsl(330, 65%, 52%)', glow: 'hsl(335, 75%, 58%)', mood: '暗涌、忐忑、要出事🫨', flash: true },
  dim7:   { label: '减七和弦', color: 'hsl(355, 80%, 48%)', glow: 'hsl(2, 90%, 56%)',   mood: '极度紧张、悬疑🚨', flash: true },
  '6':    { label: '大六和弦', color: 'hsl(35, 85%, 56%)',  glow: 'hsl(42, 95%, 62%)',  mood: '甜美、复古、轻快🍬', flash: false },
  m6:     { label: '小六和弦', color: 'hsl(205, 65%, 52%)', glow: 'hsl(210, 75%, 58%)', mood: '微忧但优雅🎐', flash: false },
  '9':    { label: '属九和弦', color: 'hsl(55, 90%, 54%)',  glow: 'hsl(50, 100%, 60%)', mood: '更丰富的"想回家"🏠', flash: true },
  add9:   { label: '加九和弦', color: 'hsl(20, 82%, 57%)',  glow: 'hsl(30, 92%, 63%)',  mood: '开放、闪亮、流行✨', flash: false },
};

/** 兜底颜色（未知品质） */
const DEFAULT_COLOR = { label: '和弦', color: 'hsl(0,0%,55%)', glow: 'hsl(0,0%,65%)', mood: '一个和弦', flash: false };

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const ROMAN_MAJOR = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const ROMAN_MINOR = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'];

/** 七种功能名（按级，1..7），大调/小调通用的功能感 */
const FUNCTION_MAJOR = ['主（家）', '下属预备', '中音', '下属', '属（想回家）', '关系小调', '导音（紧张）'];
const FUNCTION_MINOR = ['主（家）', '下属预备', '关系大调', '下属', '属（想回家）', '下中音', '下属七/属预备'];

/** 颜色信息查表 */
export function colorOf(suffix) {
  return QUALITY_COLORS[suffix] || DEFAULT_COLOR;
}

/**
 * 在某调里求一个根音音级的级数（1..7）。不在自然音阶上返回 null。
 */
export function degreeInKey(rootPc, key) {
  if (!key || key.tonicPc == null) return null;
  const scale = key.scale === 'minor' ? MINOR_SCALE : MAJOR_SCALE;
  const rel = ((rootPc - key.tonicPc) % 12 + 12) % 12;
  const idx = scale.indexOf(rel);
  return idx === -1 ? null : idx + 1; // 1-based
}

/**
 * 判断和弦是否属于"属功能"（想解决回主）：
 *  - V / V7（第 5 级且大三或属七）
 *  - vii° / vii°7（第 7 级减和弦）
 */
function isDominantFunction(degree, suffix) {
  if (degree === 5 && (suffix === '' || suffix === '7' || suffix === '9')) return true;
  if (degree === 7 && (suffix === 'dim' || suffix === 'dim7' || suffix === 'm7b5')) return true;
  return false;
}

/**
 * 主分析：把按下的音 + 调 → 一份完整的"色彩 + 功能"描述。
 * @param {number[]} notes  同时按下的 MIDI
 * @param {object} [key]    调对象（COLOR_KEYS 之一），默认不设调
 * @returns {object} { ok, chord, color, glow, quality, mood, flash,
 *                     degree, roman, func, wantsHome, pcs, bassPc, names, hint }
 */
export function analyzeChord(notes, key = COLOR_KEYS[0]) {
  const uniq = [...new Set(notes)];
  if (uniq.length < 3) {
    return {
      ok: false,
      reason: uniq.length === 0 ? 'empty' : 'tooFew',
      count: uniq.length,
      hint: uniq.length === 0 ? '按下一个和弦（≥3 个键）试试' : '再多按几个键凑成和弦（至少 3 个）',
    };
  }
  const chord = detectChord(uniq);
  if (!chord) {
    return {
      ok: false,
      reason: 'unknown',
      count: uniq.length,
      hint: '这个组合还没认出来，换个更标准的和弦试试',
    };
  }
  const rootPc = NOTE_NAMES.indexOf(chord.root);
  const c = colorOf(chord.suffix);
  const degree = degreeInKey(rootPc, key);
  let roman = null, func = null, wantsHome = false;
  if (degree != null) {
    const romans = key.scale === 'minor' ? ROMAN_MINOR : ROMAN_MAJOR;
    const funcs = key.scale === 'minor' ? FUNCTION_MINOR : FUNCTION_MAJOR;
    // 七和弦在罗马数字后补后缀（V→V7）
    const seventhTag = /7|9/.test(chord.suffix) ? (chord.suffix.includes('maj7') ? 'maj7' : '7') : '';
    roman = romans[degree - 1] + seventhTag;
    func = funcs[degree - 1];
    wantsHome = isDominantFunction(degree, chord.suffix);
  }
  const bassPc = pitchClass(Math.min(...uniq));
  return {
    ok: true,
    chord,
    symbol: chord.symbol,
    quality: c.label,
    color: c.color,
    glow: c.glow,
    mood: c.mood,
    flash: c.flash || wantsHome,
    inversion: chord.inversion,
    rootPc,
    bassPc,
    pcs: [...new Set(uniq.map(pitchClass))].sort((a, b) => a - b),
    names: [...uniq].sort((a, b) => a - b).map((n) => NOTE_NAMES[pitchClass(n)]),
    degree,
    roman,
    func,
    wantsHome,
    hint: wantsHome ? '🏠 这是「属」功能——它很想解决回主和弦！试试接着弹主和弦' : null,
  };
}

/**
 * 给定调，返回主和弦的根位音级（用于"解决回家"提示/高亮）。
 */
export function tonicTriadPcs(key) {
  if (!key || key.tonicPc == null) return null;
  const isMin = key.scale === 'minor';
  const third = isMin ? 3 : 4;
  return [key.tonicPc % 12, (key.tonicPc + third) % 12, (key.tonicPc + 7) % 12];
}
