/**
 * vt-morph.js — Virtual Technician 参数渐变器（纯逻辑，可测试）
 *
 * CA99 独有杀手锏：边弹边把多个 VT 参数（音色塑造 Voicing、共鸣 Resonance、
 * 击弦噪声等）从起点平滑插值到目标，营造"音色慢慢变化"的演出效果。
 *
 * 引擎本身不发 MIDI，只负责"在某一时刻，每条 VT 通道应是什么值"，
 * 由调用方把 (v2, value) 转成 SysEx 发送。
 */

/** 线性插值 */
export function lerp(from, to, t) {
  return from + (to - from) * t;
}

/** 缓动函数：ease-in-out（平滑加速再减速，更有"呼吸感"） */
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** 线性（无缓动） */
export function linear(t) { return t; }

export const EASINGS = { linear, easeInOut };

export class MorphEngine {
  /**
   * @param {object} opts
   * @param {Array<{v2:number, from:number, to:number}>} opts.lanes  渐变通道
   * @param {number} opts.durationMs  总时长（毫秒）
   * @param {number} opts.tickMs      每帧间隔（毫秒），决定发送密度
   * @param {string} opts.easing      'linear' | 'easeInOut'
   * @param {boolean} opts.pingpong   到终点后是否反向回到起点（往返循环）
   */
  constructor(opts = {}) {
    this.lanes = opts.lanes || [];
    this.durationMs = opts.durationMs || 8000;
    this.tickMs = opts.tickMs || 120;
    this.easing = opts.easing || 'easeInOut';
    this.pingpong = !!opts.pingpong;
    this._running = false;
    this._startTime = 0;
    this._reverse = false;
    this.onApply = () => {};   // (v2, value) => void   每帧每通道回调
    this.onDone = () => {};    // () => void           完成（非 pingpong）回调
  }

  /** 把进度 0..1 通过缓动转换 */
  _ease(t) {
    const fn = EASINGS[this.easing] || linear;
    return fn(Math.max(0, Math.min(1, t)));
  }

  /**
   * 计算给定线性进度 p(0..1) 下每条通道的整数值。
   * 纯函数，便于测试。
   * @returns {Array<{v2:number, value:number}>}
   */
  frameAt(p) {
    const e = this._ease(p);
    return this.lanes.map(ln => ({
      v2: ln.v2,
      value: Math.round(lerp(ln.from, ln.to, e)),
    }));
  }

  /**
   * 根据当前时间推进一帧。纯逻辑：调用方传入 now（毫秒）。
   * 对每条通道触发 onApply。到终点触发 onDone（除非 pingpong）。
   * @param {number} now  当前时间（毫秒，与 start 时同源）
   * @returns {boolean} 是否仍在运行
   */
  tick(now) {
    if (!this._running) return false;
    let elapsed = now - this._startTime;
    let p = this.durationMs > 0 ? elapsed / this.durationMs : 1;

    if (p >= 1) {
      p = 1;
      const frame = this.frameAt(this._reverse ? 1 - p : p);
      frame.forEach(f => this.onApply(f.v2, f.value));
      if (this.pingpong) {
        // 反向，重置计时
        this._reverse = !this._reverse;
        this._startTime = now;
        return true;
      }
      this._running = false;
      this.onDone();
      return false;
    }

    const frame = this.frameAt(this._reverse ? 1 - p : p);
    frame.forEach(f => this.onApply(f.v2, f.value));
    return true;
  }

  /** 启动；timer 由调用方注入（默认 setInterval） */
  start(now, setIntervalFn = setInterval) {
    if (this._running) return;
    this._running = true;
    this._reverse = false;
    this._startTime = now;
    // 立即应用起点
    this.frameAt(0).forEach(f => this.onApply(f.v2, f.value));
    this._timer = setIntervalFn(() => this.tick(this.nowFn()), this.tickMs);
  }

  /** 注入获取当前时间的函数（浏览器用 performance.now） */
  set nowFn(fn) { this._nowFn = fn; }
  get nowFn() { return this._nowFn || (() => Date.now()); }

  stop(clearIntervalFn = clearInterval) {
    this._running = false;
    if (this._timer) { clearIntervalFn(this._timer); this._timer = null; }
  }

  get running() { return this._running; }
}
