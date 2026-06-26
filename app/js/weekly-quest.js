/**
 * weekly-quest.js — 限时主题挑战赛季（纯逻辑，可测试）
 *
 * 每个自然周（周一 → 周日）有一个轮换主题（五声创作周 / 节奏周 / 识谱周…），
 * 主题下有 2-3 个任务（在指定模块里练够 N 次）。一周内全部完成即可领取一枚
 * 专属「赛季徽章」。周日结束未完成则本周进度清零、下周换新主题——制造
 * 「这周不玩就过期」的温和回访动机（不惩罚，只是错过一枚徽章）。
 *
 * 进度计数靠 applyPractice：每次某模块记一次练习（recordPractice），就把
 * 引用该模块的、尚未完成的任务 +1。本模块不碰 DOM/localStorage。
 *
 * 模块 id 同时是 recordPractice 的 moduleId 和 nav 的 data-module（已核对一致），
 * 所以任务的「去玩」按钮可直接 switchModule(task.module)。
 */

const DAY_MS = 86400000;

/** 主题轮换表。每周按 weekIndex 取模选一个。 */
export const THEMES = [
  { id: 'penta', name: '五声创作周', emoji: '🪄', blurb: '本周一起「玩音乐」——用魔法五声怎么弹都好听！',
    tasks: [
      { id: 'mj', label: '魔法即兴沙盒自由创作', emoji: '🪄', module: 'magicjam', goal: 4 },
      { id: 'sc', label: '练音阶', emoji: '🎼', module: 'scale', goal: 2 },
      { id: 'tr', label: '移调挑战', emoji: '🔀', module: 'trans', goal: 1 },
    ] },
  { id: 'rhythm', name: '节奏周', emoji: '🥁', blurb: '本周练稳节奏——跟着拍子动起来！',
    tasks: [
      { id: 'rt', label: '节奏跟拍', emoji: '🥁', module: 'rhythm', goal: 4 },
      { id: 'bt', label: '节拍稳定度', emoji: '📈', module: 'beat', goal: 2 },
      { id: 'sw', label: 'Staff Wars 击落', emoji: '🚀', module: 'staffwars', goal: 2 },
    ] },
  { id: 'reading', name: '识谱周', emoji: '👀', blurb: '本周练眼睛——看谱越来越快！',
    tasks: [
      { id: 'sg', label: '视奏闪卡', emoji: '👀', module: 'sight', goal: 4 },
      { id: 'sv', label: '五线谱跟弹', emoji: '🎼', module: 'staffview', goal: 2 },
      { id: 'sc', label: '练音阶热身', emoji: '🎹', module: 'scale', goal: 2 },
    ] },
  { id: 'ear', name: '听辨周', emoji: '👂', blurb: '本周练耳朵——听一听就知道是什么！',
    tasks: [
      { id: 'er', label: '音程听辨', emoji: '👂', module: 'ear', goal: 3 },
      { id: 'dt', label: '旋律听写', emoji: '✍️', module: 'dict', goal: 2 },
      { id: 'ml', label: '旋律模唱', emoji: '🎵', module: 'melody', goal: 2 },
    ] },
  { id: 'harmony', name: '和声周', emoji: '🎵', blurb: '本周练和弦——让音乐有色彩！',
    tasks: [
      { id: 'cq', label: '和弦音质辨识', emoji: '🎵', module: 'cquality', goal: 3 },
      { id: 'cp', label: '和弦进行', emoji: '🔗', module: 'chordprog', goal: 2 },
      { id: 'cf', label: '五度圈拼图', emoji: '🧩', module: 'cofpuzzle', goal: 1 },
    ] },
  { id: 'arcade', name: '街机挑战周', emoji: '🚀', blurb: '本周来点刺激——闯关、提速、打 Boss！',
    tasks: [
      { id: 'bs', label: '打 Boss 战', emoji: '👾', module: 'boss', goal: 1 },
      { id: 'sr', label: '极速挑战刷纪录', emoji: '🚀', module: 'speedrun', goal: 3 },
      { id: 'sw', label: 'Staff Wars 击落', emoji: '🛸', module: 'staffwars', goal: 3 },
    ] },
];

/** 把日期归到本周周一 0 点（本地时区）。 */
export function mondayOf(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7; // 周一=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 周键：本周周一的 YYYY-MM-DD，用于判断是否进入了新的一周。 */
export function weekKey(date = new Date()) {
  const m = mondayOf(date);
  const p = (n) => String(n).padStart(2, '0');
  return `${m.getFullYear()}-${p(m.getMonth() + 1)}-${p(m.getDate())}`;
}

/** 自纪元起的周序号（用于主题轮换）。 */
export function weekIndex(date = new Date()) {
  return Math.floor(mondayOf(date).getTime() / (7 * DAY_MS));
}

/** 本周主题。 */
export function themeForWeek(date = new Date()) {
  const n = THEMES.length;
  return THEMES[((weekIndex(date) % n) + n) % n];
}

/** 本周范围 {start: 周一0点, end: 周日23:59:59.999}。 */
export function weekRange(date = new Date()) {
  const start = mondayOf(date);
  const end = new Date(start.getTime() + 7 * DAY_MS - 1);
  return { start, end };
}

/** 距本周结束的毫秒数（最小 0）。 */
export function msToWeekEnd(date = new Date()) {
  return Math.max(0, weekRange(date).end.getTime() - date.getTime());
}

/** 某任务是否完成。 */
export function taskDone(task, progress) {
  return (progress[task.id] || 0) >= task.goal;
}

/** 整个赛季是否完成（所有任务达标）。 */
export function questComplete(theme, progress) {
  return theme.tasks.every((t) => taskDone(t, progress));
}

/** 完成百分比（0-1）：各任务 min(count,goal) 之和 / 各 goal 之和。 */
export function questPercent(theme, progress) {
  let got = 0, tot = 0;
  for (const t of theme.tasks) {
    got += Math.min(progress[t.id] || 0, t.goal);
    tot += t.goal;
  }
  return tot > 0 ? got / tot : 0;
}

/**
 * 记一次某模块的练习：给引用该模块、且尚未完成的任务 +1（封顶 goal）。
 * 返回新的 progress（不修改入参）。
 */
export function applyPractice(theme, progress, moduleId) {
  const next = { ...progress };
  for (const t of theme.tasks) {
    if (t.module === moduleId && (next[t.id] || 0) < t.goal) {
      next[t.id] = (next[t.id] || 0) + 1;
    }
  }
  return next;
}
