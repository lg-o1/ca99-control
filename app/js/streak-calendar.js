// 打卡火焰日历 —— 纯逻辑引擎。
// 把 practice-stats 的 days 映射（'YYYY-MM-DD' -> 当日练习次数）派生成
// 「连胜 + 多周火焰格子 + 豁免券 + 久别归来」所需的展示数据。
// 日期算术全部走 UTC（与 practice-stats.daysBetween 完全一致），避免时区/夏令时漂移。

function parseUTC(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function keyOfUTC(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 两个 'YYYY-MM-DD' 之间的日历天数差（b - a），与 practice-stats 同语义 */
export function daysBetween(a, b) {
  return Math.round((parseUTC(b) - parseUTC(a)) / 86400000);
}

function activeSorted(daysMap) {
  return Object.keys(daysMap).filter((k) => (daysMap[k] | 0) > 0).sort();
}

/** 当日练习次数 -> 0..4 火焰深浅档（0=没练，越多越旺） */
export function heatLevel(sessions) {
  const n = sessions | 0;
  if (n <= 0) return 0;
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n <= 4) return 3;
  return 4;
}

/**
 * 当前连胜（镜像 practice-stats.dayStreak 的 freeze 语义）。
 * @param {object} daysMap  { 'YYYY-MM-DD': sessions }
 * @param {string} todayKey 今天的 dayKey
 * @param {number} forgive  可冻结的「漏练单日」数（豁免券），0 = 严格
 */
export function currentStreak(daysMap, todayKey, forgive = 0) {
  const days = activeSorted(daysMap);
  if (!days.length) return 0;
  let freezes = Math.max(0, forgive | 0);
  const last = days[days.length - 1];
  const gapToToday = daysBetween(last, todayKey);
  if (gapToToday > 1) {
    const missed = gapToToday - 1;
    if (missed <= freezes) freezes -= missed; else return 0;
  }
  let streak = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const g = daysBetween(days[i - 1], days[i]);
    if (g === 1) { streak++; continue; }
    const missed = g - 1;
    if (missed > 0 && missed <= freezes) { freezes -= missed; streak++; continue; }
    break;
  }
  return streak;
}

/** 历史最长连胜（严格连续日历天） */
export function longestStreak(daysMap) {
  const days = activeSorted(daysMap);
  if (!days.length) return 0;
  let best = 1, cur = 1;
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) === 1) cur++; else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

/** 今天之前最近一次练习到今天相隔多少天；无更早历史返回 0。gap>=2 = 昨天没练（久别归来） */
export function comebackGap(daysMap, todayKey) {
  const earlier = activeSorted(daysMap).filter((k) => k < todayKey);
  if (!earlier.length) return 0;
  return daysBetween(earlier[earlier.length - 1], todayKey);
}

/**
 * 构建火焰日历格子：最后一行一定包含今天，整图按「周」对齐。
 * @param {object} opts.weeks      显示多少周（默认 5）
 * @param {number} opts.weekStart  一周从哪天起，0=周日（默认）、1=周一
 * @returns {{weeks:Array<Array>, weekStart:number, total:number, activeInRange:number}}
 *          每个格子 { key, sessions, level, practiced, isToday, inFuture, dow }
 */
export function buildCalendar(daysMap, todayKey, opts = {}) {
  const weeks = Math.max(1, (opts.weeks | 0) || 5);
  const weekStart = opts.weekStart | 0; // 0=Sun
  const todayMs = parseUTC(todayKey);
  const todayDow = new Date(todayMs).getUTCDay();
  const offToEnd = (weekStart + 6 - todayDow + 7) % 7; // 到本周最后一格的天数
  const lastMs = todayMs + offToEnd * 86400000;
  const total = weeks * 7;
  const firstMs = lastMs - (total - 1) * 86400000;
  const cells = [];
  for (let i = 0; i < total; i++) {
    const ms = firstMs + i * 86400000;
    const key = keyOfUTC(ms);
    const sessions = daysMap[key] | 0;
    cells.push({
      key,
      sessions,
      level: heatLevel(sessions),
      practiced: sessions > 0,
      isToday: key === todayKey,
      inFuture: daysBetween(todayKey, key) > 0,
      dow: new Date(ms).getUTCDay(),
    });
  }
  const rows = [];
  for (let i = 0; i < weeks; i++) rows.push(cells.slice(i * 7, i * 7 + 7));
  return {
    weeks: rows,
    weekStart,
    total,
    activeInRange: cells.filter((c) => c.practiced && !c.inFuture).length,
  };
}

/**
 * 综合摘要：当前/严格连胜、冻结是否生效、豁免券、今天是否已练、久别天数、最长连胜、活跃天数。
 * @param {number} opts.forgiveTokens 本期豁免券（默认 1，漏 1 天不断）
 */
export function streakSummary(daysMap, todayKey, opts = {}) {
  const tokens = opts.forgiveTokens == null ? 1 : Math.max(0, opts.forgiveTokens | 0);
  const strict = currentStreak(daysMap, todayKey, 0);
  const current = currentStreak(daysMap, todayKey, tokens);
  return {
    current,
    strict,
    forgiveUsed: current > strict,
    forgiveTokens: tokens,
    practicedToday: (daysMap[todayKey] | 0) > 0,
    comebackGap: comebackGap(daysMap, todayKey),
    longest: longestStreak(daysMap),
    activeDays: activeSorted(daysMap).length,
  };
}
