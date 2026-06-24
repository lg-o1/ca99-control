/**
 * finger-independence.js — 手指独立性（finger independence）纯逻辑引擎
 *
 * 钢琴基本功"手指独立"：按住几个键不放（held），同时用其他手指反复敲一段
 * 移动音型（moving pattern），关键是——敲移动音时被按住的音不能跟着抬起来。
 * 引擎吃 note-on / note-off 事件流，跟踪当前按下的键集合；每敲一个移动音时，
 * 快照检查"该按住的音是否都还在按着"，统计独立保持率；同时核对移动音型对不对。
 *
 * 综合分 = 独立保持率（被按住的音在每次移动敲击时仍按着）× 60%
 *        + 音型正确率（移动音按预期顺序）× 40%
 * 纯逻辑：不碰 MIDI / DOM。
 */

/** 预设练习：held=按住不放的音，pattern=要反复敲的移动音型（一遍） */
export const FINGER_PRESETS = [
  { id: 'ce-g',    name: '按 C+E，动 G',        held: [60, 64], pattern: [67, 67, 67, 67] },
  { id: 'ce-ga',   name: '按 C+E，G↔A 交替',    held: [60, 64], pattern: [67, 69, 67, 69] },
  { id: 'cg-eae',  name: '按 C+G，中间 E↔F',    held: [60, 67], pattern: [64, 65, 64, 65] },
  { id: 'c-1235',  name: '按 C，动 D-E-F-G',     held: [60],     pattern: [62, 64, 65, 67] },
  { id: 'ceg-bd',  name: '按 C+E+G，动 B↔D',    held: [60, 64, 67], pattern: [71, 74, 71, 74] },
];

/** 在 note-on/off 事件流上重放，返回按下键随时间的快照工具。纯函数风格。 */
export function buildEvents(raw) {
  return (raw || [])
    .filter((e) => e && (e.type === 'on' || e.type === 'off') && typeof e.note === 'number')
    .map((e) => ({ note: e.note | 0, type: e.type, time: typeof e.time === 'number' ? e.time : 0 }))
    .sort((a, b) => a.time - b.time);
}

/**
 * 评估一段手指独立性练习。
 * @param {Array<{note,type,time}>} rawEvents note-on/off 事件流
 * @param {object} opts
 * @param {number[]} opts.held    应当全程按住的音
 * @param {number[]} opts.pattern 期望的移动音型（按顺序，循环若干遍均可）
 * @returns {{score,sustainRate,patternAccuracy,taps,sustainHits,correctNotes,
 *           expectedTaps,playedNotes,slips,heldDownAtTap:boolean[]}}
 */
export function evaluateIndependence(rawEvents, opts = {}) {
  const held = [...new Set((opts.held || []).map((n) => n | 0))];
  const pattern = (opts.pattern || []).map((n) => n | 0);
  const heldSet = new Set(held);
  const events = buildEvents(rawEvents);

  const down = new Set();
  const playedNotes = [];      // 移动音（非 held 的 on）按时间顺序
  const heldDownAtTap = [];    // 每次移动敲击时，held 是否全部按着
  let slips = 0;               // held 音在最后一个移动音之前被抬起的次数

  // 预扫描：最后一个移动敲击的时间。此后再松开 held 不算滑脱。
  let lastMovingTime = -Infinity;
  for (const e of events) {
    if (e.type === 'on' && !heldSet.has(e.note)) lastMovingTime = e.time;
  }

  for (const e of events) {
    if (e.type === 'on') {
      down.add(e.note);
      if (!heldSet.has(e.note)) {
        // 一次移动敲击：快照 held 是否都还按着
        const allHeld = held.every((h) => down.has(h));
        heldDownAtTap.push(allHeld);
        playedNotes.push(e.note);
      }
    } else { // off
      // held 音在最后一个移动音之前被松开 = 一次滑脱（练习收尾时的正常松开不算）
      if (heldSet.has(e.note) && down.has(e.note) && e.time < lastMovingTime) slips++;
      down.delete(e.note);
    }
  }

  const taps = playedNotes.length;
  const sustainHits = heldDownAtTap.filter(Boolean).length;
  // 没有 held 时独立保持率视为满分（无可滑脱）
  const sustainRate = held.length === 0 ? 1 : (taps > 0 ? sustainHits / taps : 0);

  // 音型正确率：把实际移动音逐位与期望音型（循环展开到实际长度）比对
  const expectedTaps = taps; // 以实际敲击数为基准核对顺序
  let correctNotes = 0;
  if (pattern.length > 0) {
    for (let i = 0; i < taps; i++) {
      if (playedNotes[i] === pattern[i % pattern.length]) correctNotes++;
    }
  }
  const patternAccuracy = pattern.length === 0 ? 1 : (taps > 0 ? correctNotes / taps : 0);

  const score = Math.round(100 * (0.6 * sustainRate + 0.4 * patternAccuracy));
  return {
    score, sustainRate, patternAccuracy, taps, sustainHits,
    correctNotes, expectedTaps, playedNotes, slips, heldDownAtTap,
  };
}

export class FingerIndependenceTrainer {
  /**
   * @param {object} opts
   * @param {number[]} opts.held
   * @param {number[]} opts.pattern
   * @param {number} opts.reps     音型重复遍数（默认 2）
   */
  constructor(opts = {}) {
    this.held = [...new Set((opts.held || []).map((n) => n | 0))];
    this.pattern = (opts.pattern || []).map((n) => n | 0);
    this.reps = Math.max(1, opts.reps ?? 2);
    this.events = [];
    this.rounds = 0;
    this.best = 0;
    this.lastResult = null;
    this.onEvent = () => {};    // (event, downCount) => void
    this.onComplete = () => {}; // (result) => void
    this._down = new Set();
    this._movingSeen = 0;
  }

  /** 一遍要敲的移动音总数 */
  get targetTaps() { return this.pattern.length * this.reps; }
  get progress() { return this._movingSeen; }
  get done() { return this._movingSeen >= this.targetTaps && this.targetTaps > 0; }

  /** 喂一个 note-on。满 targetTaps 个移动敲击后自动结算。返回结果或 null。 */
  noteOn(note, time) {
    if (this.done) return null;
    const n = note | 0;
    const t = typeof time === 'number' ? time : 0;
    this.events.push({ note: n, type: 'on', time: t });
    this._down.add(n);
    const isHeld = this.held.includes(n);
    if (!isHeld) this._movingSeen++;
    this.onEvent({ note: n, type: 'on', time: t }, this._down.size);
    if (this.done) return this._finish();
    return null;
  }

  /** 喂一个 note-off。 */
  noteOff(note, time) {
    const n = note | 0;
    const t = typeof time === 'number' ? time : 0;
    this.events.push({ note: n, type: 'off', time: t });
    this._down.delete(n);
    this.onEvent({ note: n, type: 'off', time: t }, this._down.size);
    return null;
  }

  _finish() {
    const fullPattern = [];
    for (let r = 0; r < this.reps; r++) fullPattern.push(...this.pattern);
    const res = evaluateIndependence(this.events, { held: this.held, pattern: fullPattern });
    res.reps = this.reps;
    this.rounds++;
    if (res.score > this.best) this.best = res.score;
    this.lastResult = res;
    this.onComplete(res);
    return res;
  }

  /** 清空当前这遍，保留 best/rounds。 */
  reset() { this.events = []; this._down = new Set(); this._movingSeen = 0; }
  /** 全部清零。 */
  resetAll() { this.reset(); this.rounds = 0; this.best = 0; this.lastResult = null; }
}
