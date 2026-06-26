/**
 * sound-paint.js — 🎨 音画涂鸦（边弹边作画，纯逻辑，可测试）
 *
 * 把 Lily 弹的<b>每一个音</b>变成画布上的一笔彩色光斑：
 *   - 音高 → 颜色（12 色彩虹）+ 横向位置
 *   - 时间 → 纵向位置（画面从上往下慢慢填满）
 *   - 力度 → 大小 + 透明度
 * <b>零失败、无评分、无 game-over</b>——怎么弹都会出现一幅独一无二的画，
 * 弹完可保存成 PNG 分享给家长（喂「家长认可」关联感）。
 *
 * 本模块不碰 canvas / DOM / 时间——只做映射与收集，画图由调用方（app.js）完成。
 */

/** 音名（0=C..11=B） */
export function pitchClass(midi) { return ((midi % 12) + 12) % 12; }

/** 音高 → 色相（12 音 = 12 色彩轮，C=红 0°，每半音 +30°） */
export function hueForPitch(midi) { return pitchClass(midi) * 30; }

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * 把一个音映射成一笔「画笔光斑」。
 * @param {object} o
 * @param {number} o.midi      音高 21..108
 * @param {number} [o.velocity=90] 力度 1..127
 * @param {number} [o.tMs=0]    距开始的毫秒（决定纵向位置）
 * @param {number} [o.durationMs=60000] 画布纵向对应的时长窗口（超出后回卷到顶）
 * @param {number} [o.W=900]    画布宽
 * @param {number} [o.H=520]    画布高
 * @param {function} [o.rng=Math.random] 注入随机（抖动，便于测试可传常量）
 * @returns {{x,y,r,hue,sat,light,alpha,midi}}
 */
export function strokeFor(o = {}) {
  const midi = clamp(o.midi | 0, 0, 127);
  const velocity = clamp(o.velocity == null ? 90 : o.velocity, 1, 127);
  const tMs = Math.max(0, o.tMs || 0);
  const durationMs = o.durationMs || 60000;
  const W = o.W || 900;
  const H = o.H || 520;
  const rng = o.rng || Math.random;
  // 横向：音高 21..108 铺满整宽，外加小幅抖动
  const lo = 21, hi = 108;
  const fx = clamp((midi - lo) / (hi - lo), 0, 1);
  const jitterX = (rng() - 0.5) * (W * 0.04);
  const x = clamp(fx * W + jitterX, 0, W);
  // 纵向：时间在窗口内推进，回卷；外加小幅抖动
  const fy = (tMs % durationMs) / durationMs;
  const jitterY = (rng() - 0.5) * (H * 0.04);
  const y = clamp(fy * H + jitterY, 0, H);
  // 大小 / 透明度：力度驱动
  const fv = velocity / 127;
  const r = Math.round(10 + fv * 46);          // 10..56 px
  const alpha = +(0.35 + fv * 0.5).toFixed(3);  // 0.35..0.85
  return { x: +x.toFixed(2), y: +y.toFixed(2), r, hue: hueForPitch(midi), sat: 85, light: 60, alpha, midi };
}

export class SoundPainting {
  constructor(opts = {}) {
    this.W = opts.W || 900;
    this.H = opts.H || 520;
    this.durationMs = opts.durationMs || 60000;
    this.rng = opts.rng || Math.random;
    this.reset();
  }

  reset() { this.strokes = []; }

  /** 已画笔触数 */
  get count() { return this.strokes.length; }

  /** 是否还是空白画布 */
  get isEmpty() { return this.strokes.length === 0; }

  /**
   * 弹一个音 → 生成并记录一笔。
   * @returns {object} 该笔的 stroke
   */
  add(midi, velocity = 90, tMs = 0) {
    const s = strokeFor({ midi, velocity, tMs, durationMs: this.durationMs, W: this.W, H: this.H, rng: this.rng });
    this.strokes.push(s);
    return s;
  }

  /** 用过的色相集合（去重，升序） */
  palette() {
    return Array.from(new Set(this.strokes.map((s) => s.hue))).sort((a, b) => a - b);
  }

  /** 画面统计：笔数、配色数、最低/最高音、音域跨度（半音） */
  summary() {
    if (!this.strokes.length) return { notes: 0, colors: 0, lowest: null, highest: null, spanSemitones: 0 };
    const midis = this.strokes.map((s) => s.midi);
    const lowest = Math.min(...midis);
    const highest = Math.max(...midis);
    return { notes: this.strokes.length, colors: this.palette().length, lowest, highest, spanSemitones: highest - lowest };
  }
}
