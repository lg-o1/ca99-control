/**
 * microstars.js — 8 星微进度（micro-progress stars）纯逻辑引擎
 *
 * 灵感来自 Meludia：与其把一个技能做成「会 / 不会」的二元开关，
 * 不如拆成 8 颗小星——每练对一些音符就点亮一颗，**胜利时刻 ×8**。
 * 对易放弃的孩子（Lily）特别友好：第 1 颗星只要练对 1 个就到手，
 * 立刻有「我做到了」的成就感；之后每一小步都被看见、被庆祝。
 * 星星按「累计练对数」点亮，**只升不降**——再差也不会丢星。
 *
 * 存储后端与时钟均可注入，便于确定性单元测试。
 */

import { MemoryStorage } from './preset-store.js';

/**
 * 8 颗星的累计「练对数」阈值（从易到难）。
 * 第 1 颗仅需练对 1 个 → 即时奖励；越往后越需要长期积累 → 鼓励持续练。
 */
export const STAR_THRESHOLDS = [1, 5, 12, 25, 45, 75, 120, 200];

/** 满星数 */
export const MAX_STARS = STAR_THRESHOLDS.length;

/** 累计值 → 已点亮星数（0..8） */
export function starsForValue(value, thresholds = STAR_THRESHOLDS) {
  let n = 0;
  for (const t of thresholds) if (value >= t) n++; else break;
  return n;
}

/** 距下一颗星还差多少（已满返回 0） */
export function toNextStar(value, thresholds = STAR_THRESHOLDS) {
  for (const t of thresholds) if (value < t) return t - value;
  return 0;
}

export class MicroStars {
  /**
   * @param {object} opts
   * @param {Storage|MemoryStorage} opts.storage 存储后端（默认内存）
   * @param {string} opts.key 存储键
   * @param {() => number} opts.clock 取当前时间（ms），默认 Date.now
   * @param {number[]} opts.thresholds 自定义阈值（默认 STAR_THRESHOLDS）
   */
  constructor(opts = {}) {
    this.storage = opts.storage || new MemoryStorage();
    this.key = opts.key || 'ca99-microstars';
    this.clock = opts.clock || (() => Date.now());
    this.thresholds = opts.thresholds || STAR_THRESHOLDS;
    this.data = this._read();
  }

  _blank() {
    return { skills: {} }; // { skillId: { label, stars, value } }
  }

  _read() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return this._blank();
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object' || typeof obj.skills !== 'object') return this._blank();
      return Object.assign(this._blank(), obj);
    } catch {
      return this._blank();
    }
  }

  _write() {
    this.storage.setItem(this.key, JSON.stringify(this.data));
  }

  /**
   * 用某技能的最新「累计练对数」刷新星数（只升不降）。
   * @param {string} id    技能标识（= recordPractice 的 moduleId）
   * @param {number} value 该技能累计练对数
   * @param {string} label 中文名
   * @returns {object} { stars, prevStars, gained:number[]（新点亮的星序号 1..8）, justMaxed }
   */
  sync(id, value, label) {
    if (!id) return { stars: 0, prevStars: 0, gained: [], justMaxed: false };
    const v = Math.max(0, value | 0);
    const prev = this.data.skills[id] || { label: label || id, stars: 0, value: 0 };
    const prevStars = prev.stars | 0;
    const earned = starsForValue(v, this.thresholds);
    const stars = Math.max(prevStars, earned);
    const gained = [];
    for (let i = prevStars + 1; i <= stars; i++) gained.push(i);
    this.data.skills[id] = {
      label: label || prev.label || id,
      stars,
      value: Math.max(prev.value | 0, v),
    };
    this._write();
    return { stars, prevStars, gained, justMaxed: prevStars < MAX_STARS && stars === MAX_STARS };
  }

  /** 该技能已点亮星数 */
  starsOf(id) {
    const s = this.data.skills[id];
    return s ? (s.stars | 0) : 0;
  }

  /** 该技能累计值 */
  valueOf(id) {
    const s = this.data.skills[id];
    return s ? (s.value | 0) : 0;
  }

  /**
   * 合并目录与已记录，返回每个技能的星数/进度。
   * 排序：星数升序（最需要鼓励的、星少的排前面），同星数按累计值降序。
   * @param {Array<{id,label,icon}>} catalog 已知技能目录
   */
  all(catalog = []) {
    const map = new Map();
    for (const c of catalog) {
      if (!c || !c.id) continue;
      map.set(c.id, { id: c.id, label: c.label || c.id, icon: c.icon || '', stars: 0, value: 0 });
    }
    for (const [id, s] of Object.entries(this.data.skills)) {
      const e = map.get(id) || { id, label: s.label || id, icon: '', stars: 0, value: 0 };
      e.label = s.label || e.label;
      e.stars = s.stars | 0;
      e.value = s.value | 0;
      map.set(id, e);
    }
    const arr = [...map.values()].map((e) => ({
      ...e,
      maxStars: MAX_STARS,
      toNext: toNextStar(e.value, this.thresholds),
      nextThreshold: e.stars < MAX_STARS ? this.thresholds[e.stars] : null,
      maxed: e.stars >= MAX_STARS,
    }));
    arr.sort((a, b) => (a.stars - b.stars) || (b.value - a.value) || (a.label || '').localeCompare(b.label || ''));
    return arr;
  }

  /** 全部技能星数总和 */
  totalStars(catalog = []) {
    return this.all(catalog).reduce((sum, e) => sum + e.stars, 0);
  }

  /** 汇总：已得星 / 满星 / 已集齐(8星)技能数 */
  counts(catalog = []) {
    const all = this.all(catalog);
    const earned = all.reduce((s, e) => s + e.stars, 0);
    const maxed = all.filter((e) => e.maxed).length;
    return { earned, max: all.length * MAX_STARS, skills: all.length, maxed };
  }

  /** 清空所有数据 */
  reset() {
    this.data = this._blank();
    this._write();
  }
}
