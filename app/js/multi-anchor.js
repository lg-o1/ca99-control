/**
 * multi-anchor.js — 多重锚点识谱（Multi-Anchor，纯逻辑，可单元测试）
 *
 * 一个音同时给出【四条记忆路径】，孩子忘了其中一条还能靠另外三条认出来：
 *   1) 🎨 颜色   — Boomwhackers 配色（来自 note-color.js）
 *   2) 🔤 音名   — C D E F G A B（绝对音高，来自 solfege.js）
 *   3) 🎵 唱名   — Do Re Mi…（可动唱名，随主音移动）
 *   4) 🔢 音级数字 — 1 2 3 4 5 6 7（相对主音的级数）
 *
 * 来源：Prodigies 多通道识谱法。Lily 记不住"E"，也许记得"黄色"/"3"/"Mi"。
 * 本文件只把 note-color + solfege 的现成数据【合并成一个锚点对象】，不碰 DOM/音频。
 */

import { noteColor, pitchClass } from './note-color.js';
import { NOTE_NAMES, SCALES, DEGREES, noteName } from './solfege.js';

/**
 * 12 个半音相对主音 Do 的升号唱名（chromatic movable-do，上行）。
 * 自然音用 Do Re Mi Fa Sol La Ti；变化音用升号形式 Di Ri Fi Si Li。
 */
export const CHROMATIC_SYLLABLES = [
  'Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti',
];

/** 主音到目标音的半音距（0..11，八度无关） */
export function semitoneFromTonic(midi, tonicMidi) {
  return ((pitchClass(midi) - pitchClass(tonicMidi)) % 12 + 12) % 12;
}

/**
 * 求一个音在给定调里的【四重锚点】。
 * @param {number} midi 目标音 MIDI（C4=60）
 * @param {object} ctx
 *   tonicMidi  主音 MIDI（默认 C4=60）
 *   scaleType  'major'（默认）| 'minor'
 * @returns {object} {
 *   midi, pc, semi,
 *   color,                      // 🎨 颜色 hex
 *   name,                       // 🔤 音名（字母，无八度）
 *   nameOct,                    // 🔤 含八度音名（C4…）
 *   syllable,                   // 🎵 唱名（自然/变化音都给）
 *   degree,                     // 🔢 音级数字（自然音 1..7；变化音为 null）
 *   num,                        // 🔢 展示用级数（自然音 '1'..'7'；变化音 '♯n'）
 *   diatonic,                   // 是否调内自然音
 *   fn, hint,                   // 音级功能名/记忆提示（仅自然音）
 * }
 */
export function anchorsFor(midi, ctx = {}) {
  const tonicMidi = ctx.tonicMidi ?? 60;
  const scaleType = SCALES[ctx.scaleType] ? ctx.scaleType : 'major';
  const sc = SCALES[scaleType];
  const pc = pitchClass(midi);
  const semi = semitoneFromTonic(midi, tonicMidi);
  const di = sc.steps.indexOf(semi);
  const diatonic = di >= 0;

  let degree = null;
  let num = '';
  let syllable = CHROMATIC_SYLLABLES[semi];
  let fn = '';
  let hint = '';

  if (diatonic) {
    degree = di + 1;
    num = String(degree);
    syllable = sc.syllables[di];
    const info = DEGREES[di];
    if (info) { fn = info.fn; hint = info.hint; }
  } else {
    // 变化音：找下方最近的自然音级，标 ♯n（与升号唱名 Di/Ri/Fi/Si/Li 一致）
    let lower = semi;
    while (lower > 0 && sc.steps.indexOf(lower) < 0) lower--;
    const lo = sc.steps.indexOf(lower);
    num = lo >= 0 ? '♯' + (lo + 1) : '♯';
  }

  return {
    midi, pc, semi,
    color: noteColor(midi),
    name: NOTE_NAMES[pc],
    nameOct: noteName(midi),
    syllable,
    degree,
    num,
    diatonic,
    fn,
    hint,
  };
}

/**
 * 整条音阶（主音上行一个八度，7 个自然音）的锚点列表——用于"参考表/键盘标注"。
 * @param {object} ctx { tonicMidi, scaleType }
 * @returns {object[]} 长度 7，每项为 anchorsFor() 的结果（含 degree 1..7）
 */
export function scaleAnchors(ctx = {}) {
  const tonicMidi = ctx.tonicMidi ?? 60;
  const scaleType = SCALES[ctx.scaleType] ? ctx.scaleType : 'major';
  const sc = SCALES[scaleType];
  return sc.steps.map((step) => anchorsFor(tonicMidi + step, { tonicMidi, scaleType }));
}
