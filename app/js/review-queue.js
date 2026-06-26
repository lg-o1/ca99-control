/**
 * review-queue.js — 🔄 智能复习队列（间隔重复 / spaced repetition）纯逻辑引擎
 *
 * 叠在 heatmap.js 的 per-skill「上次练习时间 + 累计次数」之上，按遗忘曲线
 * 算出「今天该复习哪几项」。核心理念延续热力图的温柔基调——
 *   · 到期不是「你不行」，而是「这个技能想你啦，回来复习一下」💚
 *   · 练得越多 → 间隔越长（记得越牢，越久才需再练）= 间隔重复的科学
 *   · 从未练过的不算「逾期」，而是单独的「待探索」邀请，绝不施压
 *
 * 用 Leitner 盒 / SM-2-lite 的渐长间隔：每多练一次，下次复习就推得更远。
 * 纯函数 + 可注入，便于确定性单元测试。
 */

/**
 * 复习间隔表（天）。按「累计练习次数」选盒：
 * 练 1 次→1 天后该复习，2 次→2 天，3 次→4 天，4 次→7 天，5 次→15 天，≥6 次→30 天。
 * 越往后间隔越长，体现「记得越牢、越久才需再碰」。
 */
export const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30];

/**
 * 累计练习次数 → 复习间隔天数。
 * count<=0（从未练）返回 null（不参与到期判定，归为「待探索」）。
 * @param {number} count 累计练习次数
 * @param {number[]} intervals 间隔表（默认 REVIEW_INTERVALS）
 * @returns {number|null}
 */
export function intervalForCount(count, intervals = REVIEW_INTERVALS) {
  const n = count | 0;
  if (n <= 0) return null;
  const box = Math.min(n, intervals.length) - 1; // 1 次→第 0 盒，封顶在最后一盒
  return intervals[box];
}

/**
 * 为单个技能算复习状态。
 * @param {{id,label,icon,count,daysAgo}} entry heatmap.all() 的一项（daysAgo 可为 null=从未练）
 * @param {number[]} intervals 间隔表
 * @returns {{id,label,icon,count,daysAgo,interval,never,due,overdue,ratio}}
 *   never  = 从未练过；
 *   due    = 已练且 daysAgo>=interval（到期该复习）；
 *   overdue= 逾期天数（daysAgo-interval，最小 0）；
 *   ratio  = daysAgo/interval（>=1 即到期，越大越急；从未练为 0）。
 */
export function reviewStatusOf(entry, intervals = REVIEW_INTERVALS) {
  const id = entry && entry.id;
  const label = (entry && entry.label) || id || '';
  const icon = (entry && entry.icon) || '';
  const count = (entry && entry.count) | 0;
  const daysAgo = entry && entry.daysAgo != null ? (entry.daysAgo | 0) : null;
  const interval = intervalForCount(count, intervals);
  const never = interval == null || daysAgo == null;
  let due = false, overdue = 0, ratio = 0;
  if (!never) {
    ratio = interval > 0 ? daysAgo / interval : 0;
    due = daysAgo >= interval;
    overdue = Math.max(0, daysAgo - interval);
  }
  return { id, label, icon, count, daysAgo, interval, never, due, overdue, ratio };
}

/**
 * 把一组技能（heatmap.all 的输出）聚合成今日复习队列。
 * @param {Array<{id,label,icon,count,daysAgo}>} entries
 * @param {object} [opts]
 * @param {number} [opts.limit=3]   今日推荐复习上限（pick 取前 N 项）
 * @param {number[]} [opts.intervals] 间隔表
 * @returns {{
 *   due: Array, explore: Array, fresh: Array, pick: Array,
 *   counts: {due:number, explore:number, fresh:number, total:number}
 * }}
 *   due    = 到期该复习的，按「逾期比 ratio 降序 → 逾期天数降序 → 名称」排（最急在前）；
 *   explore= 从未练过的「待探索」邀请，按名称排；
 *   fresh  = 已练但还没到期（记忆还新鲜）的；
 *   pick   = due 的前 limit 项 = 今日复习卡。
 */
export function buildReviewQueue(entries = [], opts = {}) {
  const intervals = opts.intervals || REVIEW_INTERVALS;
  const limit = opts.limit != null ? opts.limit : 3;
  const due = [], explore = [], fresh = [];
  for (const e of entries) {
    if (!e || !e.id) continue;
    const s = reviewStatusOf(e, intervals);
    if (s.never) explore.push(s);
    else if (s.due) due.push(s);
    else fresh.push(s);
  }
  due.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.overdue !== a.overdue) return b.overdue - a.overdue;
    return (a.label || '').localeCompare(b.label || '');
  });
  explore.sort((a, b) => (a.label || '').localeCompare(b.label || ''));
  fresh.sort((a, b) => (a.ratio === b.ratio ? 0 : b.ratio - a.ratio)); // 越接近到期越靠前
  return {
    due,
    explore,
    fresh,
    pick: due.slice(0, Math.max(0, limit)),
    counts: { due: due.length, explore: explore.length, fresh: fresh.length, total: due.length + explore.length + fresh.length },
  };
}
