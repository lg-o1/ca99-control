/**
 * transposer.js — 移调器（transposer）纯逻辑引擎
 *
 * 一键把整个键盘升/降调（-12 ~ +12 半音），方便孩子用熟悉的指法
 * 弹不同调的曲子。两种工作方式：
 *   1) 硬件移调：给 CA99 发 TransposeValue SysEx（fn10 v1=53 v2=02，
 *      字节 = 0x40 + 半音），钢琴自身发声也跟着移调（推荐）。
 *   2) 软件移调：把电脑收到的 MIDI 音符 transform 后再用（本引擎提供）。
 * 纯逻辑：不碰 MIDI/DOM，方便单元测试。
 */

import { NOTE_NAMES } from './chord-detect.js';

export const TRANSPOSE_MIN = -12;
export const TRANSPOSE_MAX = 12;

/** 把移调量夹到 [-12, 12] */
export function clampTranspose(semis) {
  semis = Math.round(Number(semis) || 0);
  if (semis < TRANSPOSE_MIN) return TRANSPOSE_MIN;
  if (semis > TRANSPOSE_MAX) return TRANSPOSE_MAX;
  return semis;
}

/**
 * CA99 TransposeValue 的数据字节编码：0x40 + 半音。
 * 实测：-12 -> 0x34(52)，0 -> 0x40(64)，+12 -> 0x4C(76)。
 */
export function encodeTransposeByte(semis) {
  return 0x40 + clampTranspose(semis);
}

/** 反解：数据字节 -> 半音（与 encodeTransposeByte 互逆） */
export function decodeTransposeByte(byte) {
  return clampTranspose(byte - 0x40);
}

/**
 * 软件移调一个音符。超出合法 MIDI 范围（0..127）返回 null（该音符应被丢弃）。
 * @param {number} note
 * @param {number} semis
 * @returns {number|null}
 */
export function transposeNote(note, semis) {
  const n = note + clampTranspose(semis);
  return n >= 0 && n <= 127 ? n : null;
}

/** 显示用的移调量标签：'+2' / '0' / '-3' */
export function semitoneLabel(semis) {
  const s = clampTranspose(semis);
  return s > 0 ? `+${s}` : `${s}`;
}

/**
 * 移调后"听起来的调"：以某根音（默认 C）为基准，移调 semis 后的音名。
 * 例：root='C', semis=2 -> 'D'；semis=-1 -> 'B'。
 */
export function targetKeyName(semis, root = 'C') {
  const idx = NOTE_NAMES.indexOf(root);
  const base = idx >= 0 ? idx : 0;
  const pc = ((base + clampTranspose(semis)) % 12 + 12) % 12;
  return NOTE_NAMES[pc];
}

export class Transposer {
  /**
   * @param {object} opts
   * @param {number} opts.semitones 初始移调量
   */
  constructor(opts = {}) {
    this.semitones = clampTranspose(opts.semitones ?? 0);
    this.onChange = () => {}; // (semitones) => void
  }

  /** 设置移调量（自动夹紧），变化时触发 onChange */
  set(semis) {
    const v = clampTranspose(semis);
    if (v !== this.semitones) {
      this.semitones = v;
      this.onChange(v);
    } else {
      this.semitones = v;
    }
    return this.semitones;
  }

  /** 在当前基础上增减（按钮 +/-1 用） */
  nudge(delta) {
    return this.set(this.semitones + delta);
  }

  /** 归零 */
  reset() { return this.set(0); }

  /** 软件移调一个音符（委托 transposeNote） */
  transform(note) {
    return transposeNote(note, this.semitones);
  }

  /** 当前 SysEx 数据字节 */
  get byte() { return encodeTransposeByte(this.semitones); }

  /** 当前移调标签 */
  get label() { return semitoneLabel(this.semitones); }

  /** 当前听感调（以 C 为基准） */
  get keyName() { return targetKeyName(this.semitones); }
}
