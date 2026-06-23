/**
 * articulation.js — 连奏/断奏控制练习（legato / staccato articulation）纯逻辑引擎
 *
 * 通过 note-on 与 note-off 的时间，测每个音的「触键比」(legato ratio)：
 *   ratio = 音的实际按住时长(duration) / 到下一个音的间隔(IOI)
 *   - ratio 接近/超过 1.0 → 连奏 legato（音与音连绵不断、甚至略有重叠）
 *   - ratio 很小（<0.4） → 断奏 staccato（音短促、音间有明显间隙）
 *
 * 给定目标演奏法（legato 或 staccato），逐音打分，结束后给平均分。
 *
 * 纯逻辑：note-on / note-off 与时间戳由调用方喂入，便于单元测试。
 */

/** 触键比 = 时值 / 相邻起音间隔 */
export function legatoRatio(durationMs, ioiMs) {
  if (ioiMs <= 0) return 0;
  return durationMs / ioiMs;
}

/** 把触键比归类成演奏法 */
export function classifyArticulation(ratio) {
  if (ratio >= 0.9) return 'legato';
  if (ratio <= 0.45) return 'staccato';
  return 'portato'; // 介于两者之间（非连非断）
}

/** 连奏评分：ratio>=0.9 给 100，<=0.3 给 0，线性 */
export function legatoScore(ratio) {
  if (ratio >= 0.9) return 100;
  if (ratio <= 0.3) return 0;
  return Math.round((100 * (ratio - 0.3)) / (0.9 - 0.3));
}

/** 断奏评分：ratio<=0.3 给 100，>=0.8 给 0，线性 */
export function staccatoScore(ratio) {
  if (ratio <= 0.3) return 100;
  if (ratio >= 0.8) return 0;
  return Math.round((100 * (0.8 - ratio)) / (0.8 - 0.3));
}

/** 按目标演奏法给一个触键比打分 */
export function scoreFor(ratio, target) {
  return target === 'staccato' ? staccatoScore(ratio) : legatoScore(ratio);
}

export class ArticulationTrainer {
  /**
   * @param {object} opts
   * @param {'legato'|'staccato'} opts.target 目标演奏法（默认 legato）
   * @param {number} opts.notes  需评估的音数（默认 8）；玩家实际需弹 notes+1 个音
   */
  constructor(opts = {}) {
    this.target = opts.target ?? 'legato';
    this.notes = opts.notes ?? 8;
    this.reset();
  }

  reset() {
    this.records = [];   // {note, on, off, ioi, duration, ratio, score, finalized}
    this.scores = [];    // 已结算音的分数
    this.done = false;
    this.best = 0;       // 历史最佳平均分
    this.runs = 0;
    this.onNote = () => {};     // (record) 每结算一个音
    this.onComplete = () => {}; // ({avgScore, count, target})
  }

  /** 已评估音数 */
  get count() {
    return this.scores.length;
  }

  /** 平均分 */
  get avgScore() {
    return this.scores.length
      ? Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length)
      : 0;
  }

  /** 喂入一次按键 */
  noteOn(note, t) {
    if (this.done) return;
    const prev = this.records[this.records.length - 1];
    if (prev && prev.ioi == null) prev.ioi = t - prev.on; // 上一个音到这个音的起音间隔
    this.records.push({
      note, on: t, off: null, ioi: null, duration: null, ratio: null, score: null, finalized: false,
    });
    this._tryFinalize();
  }

  /** 喂入一次松键 */
  noteOff(note, t) {
    if (this.done) return;
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      if (r.note === note && r.off == null) {
        r.off = t;
        r.duration = Math.max(0, t - r.on);
        break;
      }
    }
    this._tryFinalize();
  }

  /** 把所有「时值和起音间隔都已知」的音结算打分 */
  _tryFinalize() {
    for (const r of this.records) {
      if (!r.finalized && r.duration != null && r.ioi != null) {
        r.ratio = legatoRatio(r.duration, r.ioi);
        r.articulation = classifyArticulation(r.ratio);
        r.score = scoreFor(r.ratio, this.target);
        r.finalized = true;
        this.scores.push(r.score);
        this.onNote(r);
        if (this.scores.length >= this.notes) { this._finish(); break; }
      }
    }
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this.runs++;
    const avg = this.avgScore;
    if (avg > this.best) this.best = avg;
    this.onComplete({ avgScore: avg, count: this.scores.length, target: this.target });
  }

  /** 手动结束（如停止采集时调用） */
  finish() {
    this._finish();
  }

  /** 开新一轮，保留 best/runs 统计 */
  restart() {
    this.records = [];
    this.scores = [];
    this.done = false;
  }
}
