/**
 * voicing.js — 旋律声部突出（voicing / 声部平衡）纯逻辑引擎
 *
 * 钢琴进阶技巧：和弦里"旋律声部"（通常是最高音，有时是最低音）要弹得比内声部更响，
 * 让旋律"浮"在和声之上。本模块评估：同时按下的一组音（一个和弦）里，
 * 目标声部（top=最高音 / bottom=最低音）的力度是否明显高于其它音。
 *
 * 评估单位是"一个和弦"= 一组近乎同时按下的音 [{note, vel}]：
 *   - 目标声部力度 vTarget，其余音的最大力度 vOther
 *   - 差值 diff = vTarget − vOther，越大说明旋律越突出
 *   - 达到目标余量 margin 即满分，diff<=0（旋律被埋没/更轻）给 0 分，线性
 *   - 若只有一个音（无内声部），视为不适用，给中性分
 *
 * 纯逻辑：和弦可直接传入评估；VoicingTrainer 用 feed(note,vel,t) 把"窗口内"的音
 * 聚成和弦，由调用方在窗口结束时 flush()。
 */

/** 数组均值 */
export function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * 从一组音里找出目标声部的索引。
 * @param {Array<{note:number,vel:number}>} chord
 * @param {'top'|'bottom'} targetVoice
 */
export function targetIndex(chord, targetVoice = 'top') {
  if (!chord.length) return -1;
  let idx = 0;
  for (let i = 1; i < chord.length; i++) {
    if (targetVoice === 'top' ? chord[i].note > chord[idx].note : chord[i].note < chord[idx].note) {
      idx = i;
    }
  }
  return idx;
}

/**
 * 评估单个和弦的声部突出度。
 * @param {Array<{note:number,vel:number}>} chord
 * @param {object} opts {targetVoice:'top'|'bottom', margin:number}
 * @returns {{score, diff, vTarget, vOther, single, targetNote}}
 */
export function scoreVoicing(chord, opts = {}) {
  const targetVoice = opts.targetVoice ?? 'top';
  const margin = opts.margin ?? 15;
  if (!chord.length) {
    return { score: 0, diff: 0, vTarget: 0, vOther: 0, single: false, targetNote: null, empty: true };
  }
  const ti = targetIndex(chord, targetVoice);
  const vTarget = chord[ti].vel;
  const others = chord.filter((_, i) => i !== ti);
  if (others.length === 0) {
    // 单音，无内声部可比较 -> 中性 60 分
    return { score: 60, diff: 0, vTarget, vOther: 0, single: true, targetNote: chord[ti].note };
  }
  const vOther = Math.max(...others.map((c) => c.vel));
  const diff = vTarget - vOther;
  let score;
  if (diff <= 0) score = 0;
  else if (diff >= margin) score = 100;
  else score = Math.round((diff / margin) * 100);
  return { score, diff, vTarget, vOther, single: false, targetNote: chord[ti].note };
}

export class VoicingTrainer {
  /**
   * @param {object} opts
   * @param {'top'|'bottom'} opts.targetVoice  目标声部（默认 top = 旋律在最高音）
   * @param {number} opts.margin   目标力度余量（默认 15）
   * @param {number} opts.rounds   需要练习的和弦数（默认 5）
   * @param {number} opts.window   同一和弦的聚合时间窗 ms（仅供 UI 参考，默认 80）
   */
  constructor(opts = {}) {
    this.targetVoice = opts.targetVoice ?? 'top';
    this.margin = opts.margin ?? 15;
    this.rounds = opts.rounds ?? 5;
    this.window = opts.window ?? 80;
    this.best = 0;
    this.runs = 0;
    this.restart();
  }

  /** 开新一轮，保留 best/runs */
  restart() {
    this.buffer = [];        // 当前正在聚合的和弦 [{note,vel}]
    this.results = [];        // 每个和弦的评估结果
    this.done = false;
    this.lastResult = null;
    this.onChord = () => {};    // (result, roundIndex)
    this.onComplete = () => {}; // (summary)
  }

  get completed() { return this.results.length; }
  get expected() { return this.done ? null : this.rounds - this.results.length; }

  /** 喂入一个音（按下）。同一窗口内多次 feed 聚成一个和弦，由 flush() 结算。 */
  feed(note, vel, _t) {
    if (this.done) return;
    // 同一和弦里同一个音重复按下，取较大力度
    const ex = this.buffer.find((b) => b.note === note);
    if (ex) ex.vel = Math.max(ex.vel, vel);
    else this.buffer.push({ note, vel });
  }

  /** 结算当前缓冲的和弦。返回该和弦评估，或 null（缓冲为空）。 */
  flush() {
    if (this.done || this.buffer.length === 0) return null;
    const r = scoreVoicing(this.buffer, { targetVoice: this.targetVoice, margin: this.margin });
    this.results.push(r);
    this.buffer = [];
    this.onChord(r, this.results.length - 1);
    if (this.results.length >= this.rounds) this._finish();
    return r;
  }

  _finish() {
    if (this.done) return;
    const scores = this.results.map((r) => r.score);
    const avg = Math.round(mean(scores));
    const clean = this.results.filter((r) => r.score >= 80).length;
    this.lastResult = {
      avgScore: avg,
      score: avg,
      chords: this.results.length,
      clean,
      targetVoice: this.targetVoice,
      perChord: scores,
    };
    this.done = true;
    this.runs++;
    if (avg > this.best) this.best = avg;
    this.onComplete(this.lastResult);
  }

  /** 手动结束（把剩余缓冲也算上） */
  finish() {
    if (this.buffer.length) {
      const r = scoreVoicing(this.buffer, { targetVoice: this.targetVoice, margin: this.margin });
      this.results.push(r);
      this.buffer = [];
      this.onChord(r, this.results.length - 1);
    }
    this._finish();
  }
}
