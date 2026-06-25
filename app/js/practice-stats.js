/**
 * practice-stats.js — 练习成就仪表盘（practice stats & achievements）纯逻辑引擎
 *
 * 记录各训练模块（视奏/听辨/力度/音阶/和弦…）的练习成绩，统计：
 *   · 总练习次数、总答题数、总正确数、总体正确率
 *   · 每个模块的细分统计与最佳连击
 *   · 连续练习天数（streak）—— 鼓励每天练一点
 *   · 解锁的成就徽章
 * 存储后端与时钟均可注入，便于确定性单元测试。
 */

import { MemoryStorage } from './preset-store.js';

/** 把时间戳（ms）转成本地日期字符串 YYYY-MM-DD */
export function dayKey(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 两个 YYYY-MM-DD 之间相差的天数（b - a） */
export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86400000);
}

/** 成就徽章定义。check(stats) -> boolean 是否解锁 */
export const ACHIEVEMENTS = [
  { id: 'first-steps', icon: '🌱', name: '第一步', desc: '完成第一次练习', check: (s) => s.totalSessions >= 1 },
  { id: 'ten-sessions', icon: '🎯', name: '小有所成', desc: '累计 10 次练习', check: (s) => s.totalSessions >= 10 },
  { id: 'fifty-sessions', icon: '🏅', name: '勤学不辍', desc: '累计 50 次练习', check: (s) => s.totalSessions >= 50 },
  { id: 'hundred-correct', icon: '💯', name: '百题达人', desc: '累计答对 100 题', check: (s) => s.totalCorrect >= 100 },
  { id: 'sharp-shooter', icon: '🎖️', name: '神准', desc: '单次正确率 ≥ 90%（≥10 题）', check: (s) => s.bestSessionAccuracy >= 0.9 && s.bestSessionAccuracyAttempts >= 10 },
  { id: 'combo-10', icon: '🔥', name: '十连击', desc: '任意模块连击达到 10', check: (s) => s.bestStreak >= 10 },
  { id: 'combo-25', icon: '⚡', name: '二十五连击', desc: '任意模块连击达到 25', check: (s) => s.bestStreak >= 25 },
  { id: 'streak-3', icon: '📅', name: '三日连练', desc: '连续练习 3 天', check: (s) => s.dayStreak >= 3 },
  { id: 'streak-7', icon: '🗓️', name: '一周不断', desc: '连续练习 7 天', check: (s) => s.dayStreak >= 7 },
  { id: 'all-rounder', icon: '🌈', name: '全能选手', desc: '玩过 5 种不同的练习模块', check: (s) => s.modulesPlayed >= 5 },
];

export class PracticeStats {
  /**
   * @param {object} opts
   * @param {Storage|MemoryStorage} opts.storage 存储后端（默认内存）
   * @param {string} opts.key 存储键
   * @param {() => number} opts.clock 取当前时间（ms），默认 Date.now
   */
  constructor(opts = {}) {
    this.storage = opts.storage || new MemoryStorage();
    this.key = opts.key || 'ca99-practice-stats';
    this.clock = opts.clock || (() => Date.now());
    this.data = this._read();
  }

  _blank() {
    return {
      totalSessions: 0,
      totalAttempts: 0,
      totalCorrect: 0,
      bestStreak: 0,
      bestSessionAccuracy: 0,
      bestSessionAccuracyAttempts: 0,
      modules: {},          // { moduleId: {label, sessions, attempts, correct, bestStreak} }
      days: {},             // { 'YYYY-MM-DD': sessionsCount }
      unlocked: {},         // { achievementId: unlockedDayKey }
    };
  }

  _read() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return this._blank();
    try {
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return this._blank();
      return Object.assign(this._blank(), obj);
    } catch {
      return this._blank();
    }
  }

  _write() {
    this.storage.setItem(this.key, JSON.stringify(this.data));
  }

  /**
   * 记录一次练习成绩。
   * @param {object} r
   * @param {string} r.moduleId    模块标识（如 'sight'）
   * @param {string} r.label       模块中文名（如 '视奏闪卡'）
   * @param {number} r.attempts    本次答题数
   * @param {number} r.correct     本次答对数
   * @param {number} r.bestStreak  本次最佳连击
   * @returns {string[]} 本次新解锁的成就 id 列表
   */
  record(r) {
    const moduleId = r.moduleId || 'unknown';
    const attempts = Math.max(0, r.attempts | 0);
    const correct = Math.max(0, Math.min(attempts, r.correct | 0));
    const bestStreak = Math.max(0, r.bestStreak | 0);
    const today = dayKey(this.clock());

    const d = this.data;
    d.totalSessions += 1;
    d.totalAttempts += attempts;
    d.totalCorrect += correct;
    if (bestStreak > d.bestStreak) d.bestStreak = bestStreak;

    const acc = attempts > 0 ? correct / attempts : 0;
    if (acc > d.bestSessionAccuracy || (acc === d.bestSessionAccuracy && attempts > d.bestSessionAccuracyAttempts)) {
      d.bestSessionAccuracy = acc;
      d.bestSessionAccuracyAttempts = attempts;
    }

    const m = d.modules[moduleId] || { label: r.label || moduleId, sessions: 0, attempts: 0, correct: 0, bestStreak: 0 };
    m.label = r.label || m.label;
    m.sessions += 1;
    m.attempts += attempts;
    m.correct += correct;
    if (bestStreak > m.bestStreak) m.bestStreak = bestStreak;
    d.modules[moduleId] = m;

    d.days[today] = (d.days[today] || 0) + 1;

    const newly = this._refreshAchievements(today);
    this._write();
    return newly;
  }

  /** 连续练习天数（含今天，如果今天练过；否则到最近一次的连续段不含今天则为 0）
   * @param {object} [opts]
   * @param {number} [opts.forgive=0] 宽恕额度：允许跨过这么多个「漏练的单日」而不中断连胜（连胜冻结/freeze）。
   *   forgive=0 时与原严格语义完全一致（成就判定用严格值）；UI 显示可传 forgive=1 让漏 1 天不归零。
   */
  dayStreak(opts = {}) {
    const days = Object.keys(this.data.days).sort();
    if (!days.length) return 0;
    let freezes = Math.max(0, opts.forgive | 0);
    const today = dayKey(this.clock());
    const last = days[days.length - 1];
    // 若最近练习日离今天太远：用宽恕额度填补「漏练的天数」，填不平则连胜中断
    const gapToToday = daysBetween(last, today);
    if (gapToToday > 1) {
      const missed = gapToToday - 1;
      if (missed <= freezes) freezes -= missed; else return 0;
    }
    let streak = 1;
    for (let i = days.length - 1; i > 0; i--) {
      const g = daysBetween(days[i - 1], days[i]);
      if (g === 1) { streak++; continue; }
      const missed = g - 1; // 中间漏练的天数
      if (missed > 0 && missed <= freezes) { freezes -= missed; streak++; continue; }
      break;
    }
    return streak;
  }

  /** 今天之前最近一次练习是哪天（YYYY-MM-DD），没有历史返回 null。用于「欢迎回来」判定 */
  lastActiveBeforeToday() {
    const today = dayKey(this.clock());
    const days = Object.keys(this.data.days).filter((d) => d < today).sort();
    return days.length ? days[days.length - 1] : null;
  }

  /** 距「今天之前最近一次练习」相隔的天数；没有更早的历史返回 0。gap≥2 表示昨天没练（久别归来） */
  comebackGap() {
    const last = this.lastActiveBeforeToday();
    return last ? daysBetween(last, dayKey(this.clock())) : 0;
  }

  /** 派生统计快照（含 dayStreak / modulesPlayed），用于成就判定和 UI */
  snapshot() {
    const d = this.data;
    return {
      totalSessions: d.totalSessions,
      totalAttempts: d.totalAttempts,
      totalCorrect: d.totalCorrect,
      accuracy: d.totalAttempts ? d.totalCorrect / d.totalAttempts : 0,
      bestStreak: d.bestStreak,
      bestSessionAccuracy: d.bestSessionAccuracy,
      bestSessionAccuracyAttempts: d.bestSessionAccuracyAttempts,
      dayStreak: this.dayStreak(),
      modulesPlayed: Object.keys(d.modules).length,
    };
  }

  _refreshAchievements(today) {
    const snap = this.snapshot();
    const newly = [];
    for (const a of ACHIEVEMENTS) {
      if (!this.data.unlocked[a.id] && a.check(snap)) {
        this.data.unlocked[a.id] = today;
        newly.push(a.id);
      }
    }
    return newly;
  }

  /** 已解锁成就列表（带定义） */
  unlockedAchievements() {
    return ACHIEVEMENTS.filter((a) => this.data.unlocked[a.id])
      .map((a) => ({ ...a, unlockedAt: this.data.unlocked[a.id] }));
  }

  /** 全部成就 + 是否解锁（用于展示锁定/未锁定） */
  allAchievements() {
    const snap = this.snapshot();
    return ACHIEVEMENTS.map((a) => ({
      id: a.id, icon: a.icon, name: a.name, desc: a.desc,
      unlocked: !!this.data.unlocked[a.id],
      unlockedAt: this.data.unlocked[a.id] || null,
      ready: !this.data.unlocked[a.id] && a.check(snap),
    }));
  }

  /** 各模块统计数组（按练习次数降序） */
  moduleStats() {
    return Object.entries(this.data.modules)
      .map(([id, m]) => ({
        id, label: m.label, sessions: m.sessions, attempts: m.attempts,
        correct: m.correct, bestStreak: m.bestStreak,
        accuracy: m.attempts ? m.correct / m.attempts : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions);
  }

  /** 最近 N 天的练习次数（含没练的 0），用于折线/柱状图 */
  recentDays(n = 7) {
    const out = [];
    const now = this.clock();
    for (let i = n - 1; i >= 0; i--) {
      const k = dayKey(now - i * 86400000);
      out.push({ day: k, sessions: this.data.days[k] || 0 });
    }
    return out;
  }

  /** 清空所有数据 */
  reset() {
    this.data = this._blank();
    this._write();
  }
}
