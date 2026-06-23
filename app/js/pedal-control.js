/**
 * pedal-control.js — 踏板控制扩展（纯逻辑，可测试）
 *
 * 监听标准踏板 CC（延音 64 / 保持 66 / 弱音 67 / 表情 11），把每个踏板的
 * 当前状态（开关 + 0-127 深度）对外汇报，并可把某个踏板的连续深度实时映射
 * 到一个 VT 参数（例：踩下延音踏板越深，击弦共鸣越强）——CA99 表现力延伸。
 *
 * 引擎本身不发 MIDI，只解释踏板事件并回答"该把哪个 VT 参数设成多少"。
 */

/** 标准踏板 CC 号 */
export const PEDAL_CC = {
  damper: 64,      // 延音踏板（右）
  sostenuto: 66,   // 保持踏板（中）
  soft: 67,        // 弱音踏板（左）
  expression: 11,  // 表情
};

/** CC 号 -> 踏板名（反查） */
export const CC_TO_PEDAL = Object.fromEntries(
  Object.entries(PEDAL_CC).map(([name, cc]) => [cc, name])
);

/** 把 src 区间的 v 线性映射到 dst 区间并夹取 */
export function mapRange(v, srcMin, srcMax, dstMin, dstMax) {
  if (srcMax === srcMin) return dstMin;
  let t = (v - srcMin) / (srcMax - srcMin);
  t = Math.max(0, Math.min(1, t));
  return dstMin + (dstMax - dstMin) * t;
}

/** 踏板开关判定阈值（>=64 视为踩下，符合 MIDI 惯例） */
export const PEDAL_ON_THRESHOLD = 64;

export class PedalController {
  /**
   * @param {object} opts
   * @param {?{pedal:string, v2:number, outMin:number, outMax:number, invert?:boolean}} opts.map
   *        可选：把某踏板深度映射到一个 VT 参数。
   */
  constructor(opts = {}) {
    this.map = opts.map || null;
    this._state = {}; // pedal -> {value, on}
    this._lastApplied = null; // 上次发送的 VT 整数值
    this.onPedal = () => {};   // (pedalName, {value, on}) => void  任意踏板变化
    this.onApply = () => {};   // (v2, value) => void  仅映射通道整数值变化时
  }

  setMap(map) { this.map = map || null; this._lastApplied = null; }

  /** 当前某踏板状态 */
  state(pedal) { return this._state[pedal] || { value: 0, on: false }; }

  /**
   * 喂入一个 CC 事件。若是已知踏板 CC，则更新状态、触发 onPedal，
   * 并在该踏板被映射时按深度触发 onApply（仅整数值变化）。
   * @param {number} controller CC 号
   * @param {number} value 0-127
   * @returns {?{pedal:string, value:number, on:boolean}} 命中的踏板状态，否则 null
   */
  feedCC(controller, value) {
    const pedal = CC_TO_PEDAL[controller];
    if (!pedal) return null;
    const on = value >= PEDAL_ON_THRESHOLD;
    const st = { value, on };
    this._state[pedal] = st;
    this.onPedal(pedal, st);

    if (this.map && this.map.pedal === pedal) {
      const lo = this.map.invert ? this.map.outMax : this.map.outMin;
      const hi = this.map.invert ? this.map.outMin : this.map.outMax;
      const iv = Math.round(mapRange(value, 0, 127, lo, hi));
      if (iv !== this._lastApplied) {
        this._lastApplied = iv;
        this.onApply(this.map.v2, iv);
      }
    }
    return { pedal, value, on };
  }

  reset() { this._state = {}; this._lastApplied = null; }
}
