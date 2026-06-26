/**
 * heatmap.js — 练习热力图（recency heatmap）纯逻辑引擎
 *
 * 灵感来自 ABRSM Scales Trainer：每个练习技能按「多久没练」着色，
 * 而**不是**按正确率。核心理念——
 *   · 绿 = 刚练过、热乎；红 = 该复习啦（不是「你不行」）；灰 = 待探索（邀请去玩）
 * 「红/灰」表达的是时间，而非失败，对易放弃的孩子远比「正确率红」温柔。
 * 目标：让 Lily 想把整面板都点亮成绿色 = 每个技能都常去练一练。
 *
 * 存储后端与时钟均可注入，便于确定性单元测试。
 */

import { MemoryStorage } from './preset-store.js';

/** 一天的毫秒数 */
const DAY_MS = 86400000;

/**
 * 按「距上次练习的天数」分档（从新到旧）。maxDays 为该档的上界（不含）。
 * fresh: 0-1 天（今天/昨天）；recent: 2-3 天；fading: 4-7 天；stale: ≥8 天。
 */
export const HEAT_BUCKETS = [
  { id: 'fresh',  emoji: '🟢', color: '#22c55e', label: '刚练过',   maxDays: 2 },
  { id: 'recent', emoji: '🟢', color: '#84cc16', label: '最近练过', maxDays: 4 },
  { id: 'fading', emoji: '🟡', color: '#f59e0b', label: '有点久了', maxDays: 8 },
  { id: 'stale',  emoji: '🔴', color: '#f87171', label: '该复习啦', maxDays: Infinity },
];

/** 从未练过的技能 —— 邀请去探索，而非惩罚 */
export const NEVER_BUCKET = { id: 'never', emoji: '⚪', color: '#64748b', label: '待探索', maxDays: null };

/** 距上次练习的整天数（向下取整）；从未练过返回 null */
export function daysAgo(lastTs, now) {
  if (lastTs == null) return null;
  return Math.max(0, Math.floor((now - lastTs) / DAY_MS));
}

/** 天数 → 分档对象。null（从未练）→ NEVER_BUCKET */
export function bucketForDays(days) {
  if (days == null) return NEVER_BUCKET;
  for (const b of HEAT_BUCKETS) if (days < b.maxDays) return b;
  return HEAT_BUCKETS[HEAT_BUCKETS.length - 1];
}

export class Heatmap {
  /**
   * @param {object} opts
   * @param {Storage|MemoryStorage} opts.storage 存储后端（默认内存）
   * @param {string} opts.key 存储键
   * @param {() => number} opts.clock 取当前时间（ms），默认 Date.now
   */
  constructor(opts = {}) {
    this.storage = opts.storage || new MemoryStorage();
    this.key = opts.key || 'ca99-heatmap';
    this.clock = opts.clock || (() => Date.now());
    this.data = this._read();
  }

  _blank() {
    return { skills: {} }; // { skillId: { label, lastTs, count } }
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
   * 记一次练习：把该技能标记为「刚刚练过」。
   * @param {string} id    技能标识（= recordPractice 的 moduleId）
   * @param {string} label 中文名
   * @returns {object|null} 更新后的技能记录
   */
  touch(id, label) {
    if (!id) return null;
    const now = this.clock();
    const s = this.data.skills[id] || { label: label || id, lastTs: 0, count: 0 };
    if (label) s.label = label;
    s.lastTs = now;
    s.count = (s.count | 0) + 1;
    this.data.skills[id] = s;
    this._write();
    return s;
  }

  /** 该技能上次练习时间戳（ms），从未练过返回 null */
  lastTs(id) {
    const s = this.data.skills[id];
    return s && s.lastTs ? s.lastTs : null;
  }

  /** 该技能距今天数，从未练过返回 null */
  daysAgo(id) {
    return daysAgo(this.lastTs(id), this.clock());
  }

  /** 该技能的分档对象 */
  bucketOf(id) {
    return bucketForDays(this.daysAgo(id));
  }

  /**
   * 合并「目录」与已练记录，返回带分档/天数的技能数组。
   * 排序：已练的按「越久没练越靠前」（温柔提醒去复习），从未练的排最后。
   * @param {Array<{id,label,icon}>} catalog 已知技能目录（让从未练的也显示「待探索」卡）
   */
  all(catalog = []) {
    const now = this.clock();
    const map = new Map();
    for (const c of catalog) {
      if (!c || !c.id) continue;
      map.set(c.id, { id: c.id, label: c.label || c.id, icon: c.icon || '', lastTs: null, count: 0 });
    }
    for (const [id, s] of Object.entries(this.data.skills)) {
      const e = map.get(id) || { id, label: s.label || id, icon: '', lastTs: null, count: 0 };
      e.label = s.label || e.label;
      e.lastTs = s.lastTs || null;
      e.count = s.count | 0;
      map.set(id, e);
    }
    const arr = [...map.values()].map((e) => {
      const d = daysAgo(e.lastTs, now);
      return { ...e, daysAgo: d, bucket: bucketForDays(d) };
    });
    arr.sort((a, b) => {
      const an = a.lastTs == null, bn = b.lastTs == null;
      if (an !== bn) return an ? 1 : -1; // 从未练的排最后
      if (an && bn) return (a.label || '').localeCompare(b.label || '');
      return a.lastTs - b.lastTs;        // lastTs 越小（越久没练）越靠前
    });
    return arr;
  }

  /** 各分档计数 + 总数 */
  counts(catalog = []) {
    const all = this.all(catalog);
    const c = { fresh: 0, recent: 0, fading: 0, stale: 0, never: 0, total: all.length };
    for (const e of all) c[e.bucket.id] = (c[e.bucket.id] || 0) + 1;
    return c;
  }

  /** 清空所有数据 */
  reset() {
    this.data = this._blank();
    this._write();
  }
}
