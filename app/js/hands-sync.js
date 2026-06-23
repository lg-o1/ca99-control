/**
 * hands-sync.js — 双手协调练习（hands coordination）纯逻辑引擎
 *
 * 给一串"双手齐奏"的目标拍点，玩家每拍要同时弹一个低音区（左手）和一个高音区
 * （右手）的音。引擎按音高分手（以 splitPoint 为界），把同一拍内左右手的击键
 * 时间差（onset spread）作为"协调度"，越接近 0 越整齐。
 *
 * 纯逻辑：时间戳与音符由调用方喂入，便于单元测试。
 */

/** 默认左右手分割点：C4 = MIDI 60（含）以下为左手，以上为右手 */
export const DEFAULT_SPLIT = 60;

/** 判断音符属于哪只手 */
export function handOf(note, split = DEFAULT_SPLIT) {
  return note < split ? 'L' : 'R';
}

/**
 * 把一组（时间, 音符）事件按"拍窗"聚类：相邻事件间隔小于 windowMs 视为同一拍。
 * @param {{t:number, note:number}[]} events  已按时间升序
 * @param {number} windowMs
 * @returns {{t:number, note:number}[][]}
 */
export function clusterByTime(events, windowMs) {
  const clusters = [];
  let cur = null;
  for (const e of events) {
    if (!cur || e.t - cur[cur.length - 1].t > windowMs) {
      cur = [e];
      clusters.push(cur);
    } else {
      cur.push(e);
    }
  }
  return clusters;
}

/** 评估一拍的协调度：左右手都到齐才算成功，spread=本拍最大与最小时间差 */
export function evalBeat(cluster, split = DEFAULT_SPLIT) {
  const hands = new Set(cluster.map((e) => handOf(e.note, split)));
  const times = cluster.map((e) => e.t);
  const spread = times.length ? Math.max(...times) - Math.min(...times) : 0;
  return {
    hasLeft: hands.has('L'),
    hasRight: hands.has('R'),
    bothHands: hands.has('L') && hands.has('R'),
    spread,
    size: cluster.length,
  };
}

/** spread(ms) → 协调评分 0..100：<=tight 给 100，>=loose 给 0，线性 */
export function spreadScore(spread, tight = 30, loose = 200) {
  if (spread <= tight) return 100;
  if (spread >= loose) return 0;
  return Math.round(100 * (1 - (spread - tight) / (loose - tight)));
}

export class HandsSync {
  /**
   * @param {object} opts
   * @param {number} opts.split      左右手分割 MIDI（默认 60）
   * @param {number} opts.windowMs   同拍聚类时间窗（默认 250ms）
   * @param {number} opts.tightMs    协调满分阈值（默认 30ms）
   * @param {number} opts.looseMs    协调零分阈值（默认 200ms）
   * @param {number} opts.beats      目标拍数（达到即一轮完成；0=不限）
   */
  constructor(opts = {}) {
    this.split = opts.split ?? DEFAULT_SPLIT;
    this.windowMs = opts.windowMs ?? 250;
    this.tightMs = opts.tightMs ?? 30;
    this.looseMs = opts.looseMs ?? 200;
    this.beats = opts.beats ?? 8;
    this.reset();
  }

  reset() {
    this.pending = [];     // 当前拍窗内累计的事件
    this.lastT = null;     // 上一个事件时间
    this.results = [];     // 每个完成拍的评估 {bothHands, spread, score}
    this.score = 0;        // 累计协调分总和（用于均值）
    this.goodBeats = 0;    // 双手到齐的拍数
    this.attempts = 0;     // 判定过的拍数
    this.streak = 0;
    this.best = 0;
    this.onBeat = () => {};    // (result)
    this.onComplete = () => {}; // ({goodBeats, avgScore})
  }

  /** 把当前 pending 结算成一拍 */
  _flush() {
    if (!this.pending.length) return;
    const ev = evalBeat(this.pending, this.split);
    const sc = ev.bothHands ? spreadScore(ev.spread, this.tightMs, this.looseMs) : 0;
    const result = { bothHands: ev.bothHands, hasLeft: ev.hasLeft, hasRight: ev.hasRight, spread: ev.spread, score: sc };
    this.results.push(result);
    this.attempts++;
    this.score += sc;
    if (ev.bothHands) {
      this.goodBeats++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.pending = [];
    this.onBeat(result);
    if (this.beats && this.attempts >= this.beats) {
      this.onComplete({ goodBeats: this.goodBeats, avgScore: this.avgScore, attempts: this.attempts });
    }
    return result;
  }

  /**
   * 喂入一次击键。若与上一击间隔超过 windowMs，先结算上一拍。
   * @returns {{flushed:object|null}}
   */
  feed(note, t) {
    let flushed = null;
    if (this.lastT !== null && t - this.lastT > this.windowMs) {
      flushed = this._flush();
    }
    this.pending.push({ t, note });
    this.lastT = t;
    return { flushed };
  }

  /** 手动结算当前未完成拍（如停止时调用） */
  finish() {
    return this._flush();
  }

  /** 平均协调分（0..100） */
  get avgScore() {
    return this.attempts ? Math.round(this.score / this.attempts) : 0;
  }

  /** 双手到齐率 */
  get bothHandsRate() {
    return this.attempts ? this.goodBeats / this.attempts : 0;
  }
}
