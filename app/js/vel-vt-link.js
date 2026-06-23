/**
 * vel-vt-link.js — 力度 → VT 参数联动（纯逻辑，可测试）
 *
 * 把弹奏力度（note-on velocity 0-127）实时映射到一个或多个 VT 参数值，
 * 让"弹得越重，击弦共鸣/亮度越强"这类表现力随手而动。CA99 独有玩法。
 *
 * 为避免抖动，对映射结果做指数平滑（EMA）；并设节流，只有当某通道
 * 平滑后的整数值变化时才回调发送，减少 SysEx 流量。
 */

/** 把 src 区间的 v 线性映射到 dst 区间，并夹取 */
export function mapRange(v, srcMin, srcMax, dstMin, dstMax) {
  if (srcMax === srcMin) return dstMin;
  let t = (v - srcMin) / (srcMax - srcMin);
  t = Math.max(0, Math.min(1, t));
  return dstMin + (dstMax - dstMin) * t;
}

export class VelVtLink {
  /**
   * @param {object} opts
   * @param {Array<{v2:number, outMin:number, outMax:number, invert?:boolean}>} opts.lanes
   *        每条通道：VT 子地址 v2、输出范围、是否反向（力度越大值越小）。
   * @param {number} opts.velMin  力度输入下限（默认 1）
   * @param {number} opts.velMax  力度输入上限（默认 127）
   * @param {number} opts.smooth  平滑系数 0..1（0=不平滑立即跟随，0.8=很平滑）默认 0.5
   */
  constructor(opts = {}) {
    this.lanes = opts.lanes || [];
    this.velMin = opts.velMin ?? 1;
    this.velMax = opts.velMax ?? 127;
    this.smooth = opts.smooth ?? 0.5;
    this._ema = {};      // v2 -> 平滑后的浮点值
    this._last = {};     // v2 -> 上次发送的整数值
    this.onApply = () => {}; // (v2, value) => void 仅在整数值变化时触发
  }

  setLanes(lanes) { this.lanes = lanes || []; this.reset(); }

  /** 给定力度，计算每条通道的目标（未平滑）整数值。纯函数，便于测试。 */
  targetsFor(velocity) {
    return this.lanes.map(ln => {
      const lo = ln.invert ? ln.outMax : ln.outMin;
      const hi = ln.invert ? ln.outMin : ln.outMax;
      const raw = mapRange(velocity, this.velMin, this.velMax, lo, hi);
      return { v2: ln.v2, value: Math.round(raw) };
    });
  }

  /**
   * 喂入一个力度：更新每条通道的平滑值，对发生整数变化的通道触发 onApply。
   * @param {number} velocity 0-127
   * @returns {Array<{v2:number, value:number}>} 本次实际发生变化（已发送）的通道
   */
  feed(velocity) {
    const changed = [];
    for (const ln of this.lanes) {
      const lo = ln.invert ? ln.outMax : ln.outMin;
      const hi = ln.invert ? ln.outMin : ln.outMax;
      const target = mapRange(velocity, this.velMin, this.velMax, lo, hi);
      const prev = this._ema[ln.v2];
      const ema = prev == null ? target : prev * this.smooth + target * (1 - this.smooth);
      this._ema[ln.v2] = ema;
      const iv = Math.round(ema);
      if (this._last[ln.v2] !== iv) {
        this._last[ln.v2] = iv;
        this.onApply(ln.v2, iv);
        changed.push({ v2: ln.v2, value: iv });
      }
    }
    return changed;
  }

  /** 清空平滑/历史（下次 feed 立即跟随目标） */
  reset() { this._ema = {}; this._last = {}; }
}
