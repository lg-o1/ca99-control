/**
 * pedal-timing.js — 踏板配合时机训练（syncopated / legato pedaling）纯逻辑引擎
 *
 * 连奏踏板法（切分踏板）的要领：弹下新音后，先把延音踏板抬起（清掉上一个和声），
 * 再重新踩下"接住"新音。关键时机是「新音起音」到「踏板重新踩下(repress)」的间隔：
 *   gap = tRepress - tNoteOn
 *   - gap 太小（重新踩太早）→ 上一个和声没清干净 → 脏音 muddy
 *   - gap 适中（音后 40–220ms 踩下）→ 干净的连奏 clean
 *   - gap 太大（踩得太晚）→ 新音失去延音 → 发干/断 dry
 *
 * 纯逻辑：note-on 与踏板 CC 由调用方喂入（含时间戳），便于单元测试。
 */

export const PEDAL_THRESHOLD = 64; // CC64 >= 64 视为踩下

/** 默认时机参数 */
export const DEFAULTS = {
  catchLow: 40,    // 重踩至少应在音后这么久
  catchHigh: 220,  // 也不应晚于音后这么久
  earlyMax: 50,    // 早于 catchLow：到 catchLow-earlyMax 处为 0 分
  lateMax: 260,    // 晚于 catchHigh：到 catchHigh+lateMax 处为 0 分
};

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

/** 按重踩间隔 gap 打分（0..100） */
export function pedalScore(gap, opts = {}) {
  const { catchLow, catchHigh, earlyMax, lateMax } = { ...DEFAULTS, ...opts };
  if (gap >= catchLow && gap <= catchHigh) return 100;
  if (gap < catchLow) {
    const dev = catchLow - gap;
    return clamp(Math.round(100 * (1 - dev / earlyMax)), 0, 100);
  }
  const dev = gap - catchHigh;
  return clamp(Math.round(100 * (1 - dev / lateMax)), 0, 100);
}

/** 把 gap 归类成 clean / muddy / dry */
export function classifyPedal(gap, opts = {}) {
  const { catchLow, catchHigh } = { ...DEFAULTS, ...opts };
  if (gap < catchLow) return 'muddy';
  if (gap > catchHigh) return 'dry';
  return 'clean';
}

export class PedalTiming {
  /**
   * @param {object} opts
   * @param {number} opts.changes  评估的换踏板次数（默认 8）
   * @param {boolean} opts.pedalDown 初始踏板是否踩下（默认 true）
   * @param {number} opts.catchLow / catchHigh / earlyMax / lateMax  覆盖默认时机参数
   */
  constructor(opts = {}) {
    this.changes = opts.changes ?? 8;
    this.params = {
      catchLow: opts.catchLow ?? DEFAULTS.catchLow,
      catchHigh: opts.catchHigh ?? DEFAULTS.catchHigh,
      earlyMax: opts.earlyMax ?? DEFAULTS.earlyMax,
      lateMax: opts.lateMax ?? DEFAULTS.lateMax,
    };
    this._initDown = opts.pedalDown ?? true;
    this.reset();
  }

  reset() {
    this.pending = null;   // {note, t} 等待重踩配对的音
    this.prevDown = this._initDown;
    this.lifted = false;   // 自上次配对以来是否抬起过踏板
    this.records = [];     // {note, gap, score, kind}
    this.scores = [];
    this.done = false;
    this.best = 0;
    this.runs = 0;
    this.onChange = () => {};   // (record)
    this.onComplete = () => {}; // ({avgScore, count})
  }

  get count() { return this.scores.length; }

  get avgScore() {
    return this.scores.length
      ? Math.round(this.scores.reduce((a, b) => a + b, 0) / this.scores.length)
      : 0;
  }

  /** 各演奏法统计 {clean, muddy, dry} */
  get breakdown() {
    const b = { clean: 0, muddy: 0, dry: 0 };
    for (const r of this.records) b[r.kind]++;
    return b;
  }

  /** 喂入一次按键（新音） */
  noteOn(note, t) {
    if (this.done) return;
    this.pending = { note, t };
    this.lifted = false;
  }

  /** 喂入一次踏板状态（true=踩下） */
  pedal(isDown, t) {
    if (this.done) return;
    if (!isDown && this.prevDown) {
      // 抬起
      this.lifted = true;
    } else if (isDown && !this.prevDown) {
      // 重新踩下：与待配对的音结算
      if (this.pending && this.lifted) {
        this._scoreChange(t);
      }
    }
    this.prevDown = isDown;
  }

  /** 喂入原始 CC 值 */
  feedCC(value, t) {
    this.pedal(value >= PEDAL_THRESHOLD, t);
  }

  _scoreChange(tRepress) {
    const gap = tRepress - this.pending.t;
    const score = pedalScore(gap, this.params);
    const kind = classifyPedal(gap, this.params);
    const rec = { note: this.pending.note, gap, score, kind };
    this.records.push(rec);
    this.scores.push(score);
    this.pending = null;
    this.lifted = false;
    this.onChange(rec);
    if (this.scores.length >= this.changes) this._finish();
  }

  _finish() {
    if (this.done) return;
    this.done = true;
    this.runs++;
    const avg = this.avgScore;
    if (avg > this.best) this.best = avg;
    this.onComplete({ avgScore: avg, count: this.scores.length, breakdown: this.breakdown });
  }

  /** 手动结束 */
  finish() { this._finish(); }

  /** 开新一轮，保留 best/runs */
  restart() {
    this.pending = null;
    this.prevDown = this._initDown;
    this.lifted = false;
    this.records = [];
    this.scores = [];
    this.done = false;
  }
}
