/**
 * scale-span.js — 音阶八度跨度（multi-octave scale run）纯逻辑引擎
 *
 * 练"把音阶连续地跑过 2~3 个八度，上行再下行"。和单八度音阶练习不同，
 * 这里的重点是——跨八度时大拇指穿指（thumb-under）的衔接是否平顺、整串
 * 跑动的速度是否均匀，而不只是"音对不对"。
 *
 * 评分三部分：
 *   音符正确率（按顺序逐位对）× 0.5
 *   速度均匀度（整串 IOI 的变异系数）× 0.3
 *   穿指衔接平顺（穿指点的间隔是否明显比中位间隔慢=卡顿）× 0.2
 * 纯逻辑：不碰 MIDI / DOM。
 */
import { cv, toIois, mean } from './evenness.js';
import { SCALE_TYPES, rootPitchClass } from './scale-trainer.js';

export { SCALE_TYPES };

/** 跨八度可选项 */
export const SPAN_OCTAVES = [1, 2, 3];
export const SPAN_DIRECTIONS = {
  up:     { key: 'up',     name: '上行' },
  updown: { key: 'updown', name: '上行+下行' },
};

/**
 * 生成跨 N 个八度的音阶 MIDI 序列。
 * @param {string} rootName 根音名（如 'C'）
 * @param {string} type     SCALE_TYPES 键
 * @param {number} octave   起始八度（C4=60 -> 4）
 * @param {number} octaves  跨几个八度（1/2/3）
 * @param {'up'|'updown'} direction
 * @returns {number[]}
 */
export function buildSpan(rootName, type, octave = 4, octaves = 2, direction = 'up') {
  const t = SCALE_TYPES[type];
  if (!t) return [];
  const base = (octave + 1) * 12 + rootPitchClass(rootName); // C4=60
  const n = Math.max(1, octaves | 0);
  const up = [];
  for (let o = 0; o < n; o++) {
    for (const iv of t.intervals) up.push(base + o * 12 + iv);
  }
  up.push(base + n * 12); // 顶点（最高八度根音）
  if (direction !== 'updown') return up;
  const down = up.slice().reverse().slice(1); // 下行不重复顶点
  return [...up, ...down];
}

/**
 * 找出穿指点（thumb-under）的序列下标。
 * 简化模型：每越过一个八度根音（音级回到根音 pitch class）就视为一次穿指衔接。
 * 返回 seq 中"刚跨入新八度根音"的下标集合（不含序列起点）。
 * @param {number[]} seq
 * @param {number} rootPc 根音的音级 0-11
 * @returns {number[]}
 */
export function crossingIndices(seq, rootPc) {
  const out = [];
  for (let i = 1; i < seq.length; i++) {
    if (((seq[i] % 12) + 12) % 12 === ((rootPc % 12) + 12) % 12) out.push(i);
  }
  return out;
}

/**
 * 评估一段跨八度音阶跑动。
 * @param {Array<{note,time}>} events 依次弹下的音（含时间戳）
 * @param {object} opts
 * @param {number[]} opts.expected 期望音符序列
 * @param {number[]} opts.crossings 穿指点下标（针对 expected）
 * @param {number} opts.evenTol 速度均匀 CV 容差（默认 0.25）
 * @param {number} opts.hitchRatio 穿指间隔超过中位 IOI 的此倍数即判卡顿（默认 1.6）
 * @returns {{score,noteAccuracy,evenScore,crossingScore,correctNotes,total,
 *           playedNotes,iois,ioiCV,bpm,hitches,crossingCount,wrongAt:number[]}}
 */
export function evaluateSpan(events, opts = {}) {
  const expected = (opts.expected || []).map((n) => n | 0);
  const crossings = opts.crossings || [];
  const evenTol = opts.evenTol ?? 0.25;
  const hitchRatio = opts.hitchRatio ?? 1.6;
  const evs = (events || []).filter((e) => e && typeof e.note === 'number' && typeof e.time === 'number');
  const playedNotes = evs.map((e) => e.note | 0);
  const times = evs.map((e) => e.time);
  const iois = toIois(times);

  const total = expected.length;
  let correctNotes = 0;
  const wrongAt = [];
  for (let i = 0; i < total; i++) {
    if (i < playedNotes.length && playedNotes[i] === expected[i]) correctNotes++;
    else if (i < playedNotes.length) wrongAt.push(i);
  }
  const noteAccuracy = total > 0 ? correctNotes / total : 0;

  // 速度均匀度
  const ioiCV = cv(iois);
  const evenScore = iois.length >= 2 ? Math.max(0, Math.min(1, 1 - ioiCV / evenTol)) : 0;
  const meanIoi = mean(iois);
  const bpm = meanIoi > 0 ? 60000 / meanIoi : 0;

  // 穿指衔接：穿指点进入音的 IOI 是否明显慢于中位 IOI
  const sorted = iois.slice().sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  let hitches = 0, crossingCount = 0;
  for (const ci of crossings) {
    // 进入下标 ci 的 IOI = times[ci]-times[ci-1] => iois[ci-1]
    const k = ci - 1;
    if (k >= 0 && k < iois.length) {
      crossingCount++;
      if (median > 0 && iois[k] > median * hitchRatio) hitches++;
    }
  }
  const crossingScore = crossingCount > 0 ? 1 - hitches / crossingCount : 1;

  const score = Math.round(100 * (0.5 * noteAccuracy + 0.3 * evenScore + 0.2 * crossingScore));
  return {
    score, noteAccuracy, evenScore, crossingScore,
    correctNotes, total, playedNotes, iois, ioiCV, bpm,
    hitches, crossingCount, wrongAt,
  };
}

export class ScaleSpanTrainer {
  /**
   * @param {object} opts
   * @param {string} opts.root
   * @param {string} opts.type
   * @param {number} opts.octave
   * @param {number} opts.octaves
   * @param {'up'|'updown'} opts.direction
   * @param {number} opts.evenTol
   * @param {number} opts.hitchRatio
   */
  constructor(opts = {}) {
    this.root = opts.root || 'C';
    this.type = opts.type || 'major';
    this.octave = opts.octave ?? 4;
    this.octaves = opts.octaves ?? 2;
    this.direction = opts.direction === 'updown' ? 'updown' : 'up';
    this.evenTol = opts.evenTol ?? 0.25;
    this.hitchRatio = opts.hitchRatio ?? 1.6;
    this.expected = buildSpan(this.root, this.type, this.octave, this.octaves, this.direction);
    this.crossings = crossingIndices(this.expected, rootPitchClass(this.root));
    this.events = [];
    this.rounds = 0;
    this.best = 0;
    this.lastResult = null;
    this.onNote = () => {};     // (note, index1based, total, correct) => void
    this.onComplete = () => {}; // (result) => void
  }

  get total() { return this.expected.length; }
  get progress() { return this.events.length; }
  get done() { return this.events.length >= this.expected.length && this.expected.length > 0; }
  get nextNote() { return this.done ? null : this.expected[this.events.length]; }

  /** 喂一个弹下的音；满 total 个自动结算。返回结果或 null。 */
  feed(note, time) {
    if (this.done) return null;
    const idx = this.events.length;
    const n = note | 0;
    const t = typeof time === 'number' ? time : 0;
    this.events.push({ note: n, time: t });
    const correct = this.expected[idx] === n;
    this.onNote(n, this.events.length, this.total, correct);
    if (this.done) return this._finish();
    return null;
  }

  _finish() {
    const r = evaluateSpan(this.events, {
      expected: this.expected, crossings: this.crossings,
      evenTol: this.evenTol, hitchRatio: this.hitchRatio,
    });
    r.expected = this.expected.slice();
    r.crossings = this.crossings.slice();
    this.rounds++;
    if (r.score > this.best) this.best = r.score;
    this.lastResult = r;
    this.onComplete(r);
    return r;
  }

  reset() { this.events = []; }
  resetAll() { this.events = []; this.rounds = 0; this.best = 0; this.lastResult = null; }
}
