/**
 * light-show.js — 🎆 自由演奏灯光秀（Free-Play Light Show）纯逻辑
 *
 * 不绑定任何曲目：你弹的每个 MIDI 音都在屏幕上迸发力度感应的火花和光柱。
 * 本文件只放可单元测试的纯函数（颜色/火花参数/光柱高度/连击计数），
 * DOM 渲染在 app.js 的 renderLightShow 里。
 */

export function clamp01(x) { return Math.max(0, Math.min(1, x)); }

/** MIDI 力度 → 热力配色：轻=冷蓝(~200°)，重=暖红(~350°)，越重越亮 */
export function heatColor(vel) {
  const v = clamp01((vel == null ? 90 : vel) / 127);
  const h = (200 - v * 210 + 360) % 360;
  const l = 55 + v * 12;
  return `hsl(${Math.round(h)},95%,${Math.round(l)}%)`;
}

/** 音高 → 彩虹色相：低音红(0°) → 高音紫(300°) */
export function pitchHue(midi) {
  const v = clamp01(((midi == null ? 60 : midi) - 21) / 87);
  return Math.round(v * 300);
}

/** 主题列表（决定火花配色逻辑） */
export const THEMES = [
  { id: 'heat',    name: '🔥 力度热力' },
  { id: 'rainbow', name: '🌈 音高彩虹' },
  { id: 'aurora',  name: '🌌 极光' },
  { id: 'neon',    name: '💖 霓虹' },
];

/** 按主题取一个颜色（全部确定性，方便测试） */
export function pickColor(theme, vel, midi) {
  switch (theme) {
    case 'rainbow':
      return `hsl(${pitchHue(midi)},88%,62%)`;
    case 'aurora': {
      const h = 150 + Math.round(clamp01(((midi == null ? 60 : midi) - 21) / 87) * 140); // 150..290
      return `hsl(${h},85%,60%)`;
    }
    case 'neon': {
      const hs = [320, 285, 255, 200, 170];
      const i = (((midi == null ? 60 : midi) % hs.length) + hs.length) % hs.length;
      return `hsl(${hs[i]},95%,64%)`;
    }
    case 'heat':
    default:
      return heatColor(vel);
  }
}

/**
 * 力度 → 火花参数：弹得越重，火花越多、飞散越广、越大。
 * 里程碑（连击 5/10/…）时 big=true 更炸裂。
 * @returns {{count:number, spread:number, size:number}}
 */
export function sparkSpec(vel, opts = {}) {
  const v = clamp01((vel == null ? 90 : vel) / 127);
  let count = Math.round(8 + v * 22);   // 8 ~ 30
  let spread = 30 + v * 55;             // 飞散半径 px
  let size = 5 + v * 7;                 // 5 ~ 12 px
  if (opts.big) { count = Math.round(count * 1.7); spread += 24; size += 2; }
  return { count, spread, size };
}

/** 力度 → 光柱高度（px），轻短重高 */
export function beamHeight(vel, maxH = 220) {
  const v = clamp01((vel == null ? 90 : vel) / 127);
  return Math.round(40 + v * (maxH - 40));
}

/** MIDI 音(21..108) → 舞台横向位置比例 0..1（用于光柱/火花横坐标） */
export function stageFrac(midi) {
  return clamp01(((midi == null ? 60 : midi) - 21) / 87);
}

/** 连击是否到达里程碑（5 的倍数，且 ≥5） */
export function isMilestone(combo) {
  return combo >= 5 && combo % 5 === 0;
}

/**
 * 连击计数器：相邻两音间隔 ≤ windowMs 视为连击递增，否则重置为 1。
 * 同时记录总音数与历史最高连击。
 */
export class ComboCounter {
  constructor(windowMs = 1400) {
    this.windowMs = windowMs;
    this.reset();
  }
  reset() {
    this.combo = 0;
    this.max = 0;
    this.total = 0;
    this._last = -Infinity;
  }
  /** 记一次击键，返回当前连击数 */
  hit(now) {
    this.total++;
    if (now - this._last <= this.windowMs) this.combo++;
    else this.combo = 1;
    this._last = now;
    if (this.combo > this.max) this.max = this.combo;
    return this.combo;
  }
}
