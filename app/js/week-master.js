/**
 * week-master.js — 🗓️ 一周成曲（One Week Master）纯逻辑引擎
 *
 * 灵感来自 Roland Piano App 的"分天练"。把"练一首曲子"这件大事拆成 7 个
 * 超小的当日任务（D1 只摸旋律 → D2 加左手 → … → D7 开一场小音乐会 + 录音），
 * 直击 Lily「不知道今天该练什么」的决策疲劳——每天只盯一个明确小目标。
 *
 * 纯逻辑：计划是固定模板（与具体曲子无关，曲名只用于存储键和标题展示），
 * 完成状态按曲子存 localStorage（可注入存储后端与时钟，便于单元测试）。
 */

import { MemoryStorage } from './preset-store.js';

/** 7 天计划模板。每天一个聚焦点，循序渐进、低门槛高频成功。 */
export const WEEK_PLAN = [
  { day: 1, icon: '🎵', title: '只摸旋律',   focus: 'melody',   hint: '只用右手把主旋律慢慢摸一遍，错了不要紧，先认识它。' },
  { day: 2, icon: '🤚', title: '加上左手',   focus: 'lh',       hint: '单独练左手伴奏，慢到能弹对为止，先不用合手。' },
  { day: 3, icon: '🙌', title: '双手合起来', focus: 'hands',    hint: '把左右手合起来，用很慢的速度走一遍，卡住就分段。' },
  { day: 4, icon: '🐌', title: '难句循环',   focus: 'loop',     hint: '挑出最难的 1～2 个小节，用 AB 循环反复磨顺。' },
  { day: 5, icon: '🎚️', title: '加表情力度', focus: 'dynamics', hint: '加上强弱起伏，让它好听起来，不再是"弹对就行"。' },
  { day: 6, icon: '⏱️', title: '提速连贯',   focus: 'tempo',    hint: '一点点把速度提到接近正常，从头到尾尽量不停。' },
  { day: 7, icon: '🎬', title: '开音乐会',   focus: 'recital',  hint: '当成正式演出，完整弹一遍并录音，给家人听！' },
];

/** 总天数 */
export const TOTAL_DAYS = WEEK_PLAN.length;

/** 取第 n 天（1..7）的模板；越界返回 null */
export function dayPlan(n) {
  return WEEK_PLAN.find((d) => d.day === n) || null;
}

/** 存储键：每首曲子一条记录 */
export function storageKey(songId) {
  return `ca99-week-${songId == null ? '_' : songId}`;
}

/**
 * 一周成曲进度跟踪器（按曲子）。
 * @param {object} o
 *   songId   曲子标识（用于存储键）
 *   title    曲名（仅展示）
 *   storage  存储后端（默认内存）
 *   clock    时钟函数（默认 Date.now），便于测试
 */
export class WeekMaster {
  constructor({ songId = '_', title = '', storage, clock } = {}) {
    this.songId = songId;
    this.title = title;
    this.storage = storage || new MemoryStorage();
    this.clock = clock || (() => Date.now());
    this.done = this._load();           // { '1': ts, '3': ts, ... }
  }

  _load() {
    try {
      const raw = this.storage.getItem(storageKey(this.songId));
      if (!raw) return {};
      const o = JSON.parse(raw);
      return (o && typeof o === 'object') ? o : {};
    } catch (_) { return {}; }
  }

  _save() {
    try { this.storage.setItem(storageKey(this.songId), JSON.stringify(this.done)); } catch (_) {}
  }

  /** 第 day 天是否完成 */
  isDone(day) { return Object.prototype.hasOwnProperty.call(this.done, String(day)); }

  /** 标记第 day 天完成（幂等）；返回是否为"首次"完成 */
  markDone(day) {
    if (day < 1 || day > TOTAL_DAYS) return false;
    if (this.isDone(day)) return false;
    this.done[String(day)] = this.clock();
    this._save();
    return true;
  }

  /** 取消第 day 天的完成标记 */
  unmark(day) {
    if (!this.isDone(day)) return false;
    delete this.done[String(day)];
    this._save();
    return true;
  }

  /** 切换第 day 天完成状态 */
  toggle(day) {
    return this.isDone(day) ? (this.unmark(day), false) : (this.markDone(day), true);
  }

  /** 已完成天数 */
  doneCount() { return Object.keys(this.done).length; }

  /** 是否七天全部完成 */
  isComplete() { return this.doneCount() >= TOTAL_DAYS; }

  /** 当前应练的那天（第一个未完成；全部完成返回 null） */
  currentDay() {
    for (let d = 1; d <= TOTAL_DAYS; d++) if (!this.isDone(d)) return d;
    return null;
  }

  /** 完成百分比（0..100，取整） */
  percent() { return Math.round((this.doneCount() / TOTAL_DAYS) * 100); }

  /** 返回 7 天的完整视图（模板 + done/doneAt + current 标记） */
  view() {
    const cur = this.currentDay();
    return WEEK_PLAN.map((d) => ({
      ...d,
      done: this.isDone(d.day),
      doneAt: this.done[String(d.day)] || null,
      current: d.day === cur,
    }));
  }

  /** 重置整首曲子的进度 */
  reset() { this.done = {}; this._save(); }
}
