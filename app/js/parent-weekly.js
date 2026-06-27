/**
 * parent-weekly.js — 家长周报卡（纯逻辑，可测试）
 *
 * 把已有的 practice-stats（每日练习次数 / 各模块统计 / 连胜 / 正确率）
 * 与 heatmap（技能覆盖面 / 待复习）聚合成一张「本周亮点」家长周报，
 * 由 app.js 画成可保存/分享的 PNG 卡片。
 *
 * 设计取向（家庭北极星·连接 + 成长）：
 *   · 全部为「成长向」措辞，从不羞辱「练得少」——少练只是「下周的机会」
 *   · 给家长一扇了解孩子状态的窗，而非一张 KPI 考核表
 *
 * 不碰 canvas / DOM / 存储——只接收已抽取的原始数字，便于确定性单元测试。
 */

/** 把 recentDays(14) 切成「上周 7 天 / 本周 7 天」两段并各自汇总 */
export function splitWeeks(days14) {
  const arr = Array.isArray(days14) ? days14.slice(-14) : [];
  const pad = [];
  for (let i = arr.length; i < 14; i++) pad.push({ day: '', sessions: 0 });
  const full = pad.concat(arr);
  const last = full.slice(0, 7);
  const cur = full.slice(7, 14);
  return { lastWeek: summariseWeek(last), thisWeek: summariseWeek(cur) };
}

/** 汇总一周 [{day,sessions}] → {sessions,activeDays,perDay,busiest} */
export function summariseWeek(week) {
  const perDay = (week || []).map((d) => Math.max(0, (d && d.sessions) | 0));
  const sessions = perDay.reduce((a, b) => a + b, 0);
  const activeDays = perDay.filter((n) => n > 0).length;
  let busiest = 0;
  for (const n of perDay) if (n > busiest) busiest = n;
  return { sessions, activeDays, perDay, busiest };
}

/** 与上周比的趋势（成长向措辞，从不说「退步」） */
export function trendOf(thisSessions, lastSessions) {
  const delta = (thisSessions | 0) - (lastSessions | 0);
  if (lastSessions <= 0 && thisSessions > 0) {
    return { dir: 'up', delta, text: '本周开练，好的开始！🌱' };
  }
  if (delta > 0) return { dir: 'up', delta, text: `比上周多练了 ${delta} 次，稳步上升 📈` };
  if (delta === 0 && thisSessions > 0) return { dir: 'flat', delta, text: '和上周一样稳，保持住 🎵' };
  if (delta < 0 && thisSessions > 0) return { dir: 'steady', delta, text: '这周也来练了，继续保持 💪' };
  return { dir: 'rest', delta, text: '这周休息了一下，下周再出发 🌈' };
}

/** 取练得最多的前 n 个模块（按累计次数降序，只取练过的） */
export function topModules(moduleStats, n = 3) {
  return (moduleStats || [])
    .filter((m) => m && (m.sessions | 0) > 0)
    .slice()
    .sort((a, b) => (b.sessions | 0) - (a.sessions | 0))
    .slice(0, Math.max(0, n));
}

/** 从 heatmap.counts 派生覆盖面：涉猎过多少 / 还有多少待复习 / 多少待探索 */
export function coverageOf(heatCounts) {
  const c = heatCounts || {};
  const total = c.total | 0;
  const never = c.never | 0;
  const needReview = (c.fading | 0) + (c.stale | 0);
  return {
    total,
    practiced: Math.max(0, total - never),
    fresh: c.fresh | 0,
    needReview,
    never,
  };
}

/** 拼出 2-4 行「本周亮点」（家长视角，成长向） */
export function highlightLines(ctx) {
  const { thisWeek, dayStreak, bestStreak, accuracyPct, top, coverage } = ctx;
  const lines = [];
  if (thisWeek.activeDays >= 5) lines.push('这周几乎天天坐到琴前 👏');
  else if (thisWeek.activeDays >= 3) lines.push(`这周练了 ${thisWeek.activeDays} 天，节奏不错 🎵`);
  else if (thisWeek.activeDays > 0) lines.push(`这周练了 ${thisWeek.activeDays} 天，每一次都算数 🌱`);

  if (dayStreak >= 3) lines.push(`连续练习 ${dayStreak} 天，习惯正在养成 🔥`);
  if (bestStreak >= 10) lines.push(`单次最高连对 ${bestStreak} 次，越来越专注 🎯`);
  if (top && top[0]) lines.push(`最常玩的是「${top[0].label}」`);
  if (coverage && coverage.needReview > 0 && lines.length < 4) {
    lines.push(`有 ${coverage.needReview} 项技能可以找时间再练一练 🔁`);
  }
  if (!lines.length) lines.push('随时回来，琴一直在等你 🎹');
  return lines.slice(0, 4);
}

const PARENT_PRAISE = [
  '陪她坚持，就是最好的礼物 💛',
  '每一次练习都在悄悄长大 🌳',
  '看见努力，比看见完美更重要 ✨',
  'music 让家更近一点 🎶',
];

/** 给家长的一句话（确定性，可注入索引） */
export function parentPraise(idx) {
  const i = ((idx == null ? 0 : idx) % PARENT_PRAISE.length + PARENT_PRAISE.length) % PARENT_PRAISE.length;
  return PARENT_PRAISE[i];
}

/**
 * 组装完整周报对象。
 * @param {object} input
 * @param {Array} input.days14      practiceStats.recentDays(14)
 * @param {Array} input.moduleStats practiceStats.moduleStats()
 * @param {object} input.snapshot   practiceStats.snapshot()
 * @param {object} input.heatCounts heatmap.counts(catalog)
 * @param {number} [input.praiseIdx]
 */
export function buildParentReport(input = {}) {
  const { thisWeek, lastWeek } = splitWeeks(input.days14);
  const snap = input.snapshot || {};
  const top = topModules(input.moduleStats, 3);
  const coverage = coverageOf(input.heatCounts);
  const trend = trendOf(thisWeek.sessions, lastWeek.sessions);
  const accuracyPct = Math.round((snap.accuracy || 0) * 100);
  const ctx = {
    thisWeek,
    dayStreak: snap.dayStreak | 0,
    bestStreak: snap.bestStreak | 0,
    accuracyPct,
    top,
    coverage,
  };
  const highlights = highlightLines(ctx);
  const praiseIdx = input.praiseIdx == null ? thisWeek.sessions : input.praiseIdx;
  return {
    thisWeek,
    lastWeek,
    trend,
    dayStreak: snap.dayStreak | 0,
    bestStreak: snap.bestStreak | 0,
    accuracyPct,
    totalSessions: snap.totalSessions | 0,
    modulesPlayed: snap.modulesPlayed | 0,
    top,
    coverage,
    highlights,
    praise: parentPraise(praiseIdx),
  };
}
