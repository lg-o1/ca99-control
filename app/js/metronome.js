/**
 * metronome.js — 节拍器 + 演奏速度检测（纯逻辑，可测试）
 *
 * 两部分：
 *  1) Metronome：按 BPM 产生节拍 tick，区分强拍（每小节第一拍）和弱拍，
 *     由调用方在 tick 回调里发声/闪灯。计时器可注入便于测试。
 *  2) TempoTracker：根据玩家弹奏的 note-on 时间戳估算实时 BPM（用相邻
 *     音符间隔的移动平均），用于"你弹多快"反馈。
 *
 * 不碰 Web Audio/DOM——发声与显示由调用方完成。
 */

/** BPM -> 每拍毫秒 */
export function bpmToMs(bpm) {
  if (bpm <= 0) return 0;
  return 60000 / bpm;
}

/** 每拍毫秒 -> BPM */
export function msToBpm(ms) {
  if (ms <= 0) return 0;
  return 60000 / ms;
}

export class Metronome {
  /**
   * @param {object} opts
   * @param {number} opts.bpm        每分钟拍数（默认 90）
   * @param {number} opts.beatsPerBar 每小节拍数（默认 4）
   */
  constructor(opts = {}) {
    this.bpm = opts.bpm || 90;
    this.beatsPerBar = opts.beatsPerBar || 4;
    this._beat = 0;        // 当前拍序号（0-based，跨小节累加后取模）
    this._running = false;
    this._timer = null;
    this.onTick = () => {}; // ({beat, bar, isAccent}) => void
  }

  setBpm(bpm) {
    this.bpm = Math.max(1, bpm);
    if (this._running) { this.stop(); this.start(this._setInterval, this._clearInterval); }
  }

  setBeatsPerBar(n) { this.beatsPerBar = Math.max(1, n); }

  /** 当前拍在小节内的位置（0-based） */
  get beatInBar() { return this._beat % this.beatsPerBar; }

  /** 触发一拍，返回该拍信息。强拍 = 小节第一拍。 */
  tickOnce() {
    const beatInBar = this._beat % this.beatsPerBar;
    const bar = Math.floor(this._beat / this.beatsPerBar);
    const info = { beat: beatInBar, bar, isAccent: beatInBar === 0 };
    this.onTick(info);
    this._beat++;
    return info;
  }

  /** 启动（定时器可注入）。立即触发第一拍。 */
  start(setIntervalFn = setInterval, clearIntervalFn = clearInterval) {
    if (this._running) return;
    this._running = true;
    this._beat = 0;
    this._setInterval = setIntervalFn;
    this._clearInterval = clearIntervalFn;
    this.tickOnce(); // 立即第一拍（强拍）
    this._timer = setIntervalFn(() => this.tickOnce(), bpmToMs(this.bpm));
  }

  stop(clearIntervalFn) {
    const clr = clearIntervalFn || this._clearInterval || clearInterval;
    this._running = false;
    if (this._timer) { clr(this._timer); this._timer = null; }
  }

  get running() { return this._running; }
  reset() { this._beat = 0; }
}

export class TempoTracker {
  /**
   * @param {object} opts
   * @param {number} opts.window  用于平均的最近间隔数（默认 4）
   * @param {number} opts.maxGapMs 超过此间隔视为新乐句，重置（默认 2000ms）
   */
  constructor(opts = {}) {
    this.window = opts.window || 4;
    this.maxGapMs = opts.maxGapMs || 2000;
    this._times = [];   // 最近的 note-on 时间戳
  }

  /**
   * 喂入一个 note-on 时间戳，返回当前估算 BPM（不足 2 个音符返回 null）。
   * @param {number} t 毫秒时间戳
   * @returns {?number} 估算 BPM（四舍五入），或 null
   */
  feed(t) {
    const last = this._times[this._times.length - 1];
    if (last != null && (t - last) > this.maxGapMs) {
      // 间隔太久，重新开始计速
      this._times = [t];
      return null;
    }
    this._times.push(t);
    if (this._times.length > this.window + 1) this._times.shift();
    if (this._times.length < 2) return null;
    // 计算相邻间隔平均
    let sum = 0, cnt = 0;
    for (let i = 1; i < this._times.length; i++) {
      sum += this._times[i] - this._times[i - 1];
      cnt++;
    }
    const avg = sum / cnt;
    if (avg <= 0) return null;
    return Math.round(msToBpm(avg));
  }

  reset() { this._times = []; }
}
