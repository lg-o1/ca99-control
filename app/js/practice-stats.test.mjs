/** practice-stats.test.mjs — 练习成就仪表盘纯逻辑单元测试 */
import {
  dayKey, daysBetween, ACHIEVEMENTS, PracticeStats,
} from './practice-stats.js';
import { MemoryStorage } from './preset-store.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) { pass++; } else { fail++; console.error(`FAIL ${msg}: ${A} !== ${B}`); }
}
function ok(c, msg) { if (c) { pass++; } else { fail++; console.error(`FAIL ${msg}`); } }

// 固定时钟工具：用本地日期构造时间戳
function tsOf(y, m, d, h = 12) { return new Date(y, m - 1, d, h, 0, 0).getTime(); }

// ---- dayKey ----
eq(dayKey(tsOf(2026, 6, 23)), '2026-06-23', 'dayKey 格式');
eq(dayKey(tsOf(2026, 1, 5)), '2026-01-05', 'dayKey 补零');

// ---- daysBetween ----
eq(daysBetween('2026-06-23', '2026-06-24'), 1, '相邻一天');
eq(daysBetween('2026-06-23', '2026-06-23'), 0, '同一天');
eq(daysBetween('2026-06-30', '2026-07-01'), 1, '跨月');
eq(daysBetween('2026-06-24', '2026-06-23'), -1, '反向负数');
eq(daysBetween('2025-12-31', '2026-01-01'), 1, '跨年');

// ---- 基本记录 ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  const newly = s.record({ moduleId: 'sight', label: '视奏闪卡', attempts: 10, correct: 8, bestStreak: 5 });
  const snap = s.snapshot();
  eq(snap.totalSessions, 1, '总次数 1');
  eq(snap.totalAttempts, 10, '总答题 10');
  eq(snap.totalCorrect, 8, '总答对 8');
  eq(Math.round(snap.accuracy * 100), 80, '正确率 80%');
  eq(snap.bestStreak, 5, '最佳连击 5');
  eq(snap.modulesPlayed, 1, '玩过 1 模块');
  eq(snap.dayStreak, 1, '连续 1 天');
  ok(newly.includes('first-steps'), '解锁第一步');
}

// ---- correct 被夹到 [0, attempts] ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  s.record({ moduleId: 'x', attempts: 5, correct: 99, bestStreak: 0 });
  eq(s.snapshot().totalCorrect, 5, 'correct 不超过 attempts');
  s.record({ moduleId: 'x', attempts: 5, correct: -3, bestStreak: 0 });
  eq(s.snapshot().totalCorrect, 5, 'correct 不为负');
}

// ---- 模块细分统计 ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  s.record({ moduleId: 'sight', label: '视奏', attempts: 10, correct: 9, bestStreak: 4 });
  s.record({ moduleId: 'sight', label: '视奏', attempts: 10, correct: 7, bestStreak: 6 });
  s.record({ moduleId: 'ear', label: '听辨', attempts: 4, correct: 4, bestStreak: 4 });
  const ms = s.moduleStats();
  eq(ms.length, 2, '两个模块');
  eq(ms[0].id, 'sight', '视奏次数最多排第一');
  eq(ms[0].sessions, 2, '视奏 2 次');
  eq(ms[0].attempts, 20, '视奏共 20 题');
  eq(ms[0].correct, 16, '视奏共对 16');
  eq(ms[0].bestStreak, 6, '视奏最佳连击 6');
  eq(Math.round(ms[0].accuracy * 100), 80, '视奏正确率 80%');
}

// ---- dayStreak：连续/中断 ----
{
  const store = new MemoryStorage();
  let now;
  const s = new PracticeStats({ storage: store, clock: () => now });
  now = tsOf(2026, 6, 21); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  now = tsOf(2026, 6, 22); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  now = tsOf(2026, 6, 23); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  eq(s.dayStreak(), 3, '连续 3 天');

  // 跳过 6/24，6/25 再练 -> 断了，重新从 1
  now = tsOf(2026, 6, 25); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  eq(s.dayStreak(), 1, '中断后重置为 1');

  // 今天是 6/27，最近练习是 6/25（差 2 天）-> streak 0
  now = tsOf(2026, 6, 27);
  eq(s.dayStreak(), 0, '超过一天没练 streak 归零');

  // 今天是 6/26（昨天练过）-> 仍算 streak 1（宽限到昨天）
  now = tsOf(2026, 6, 26);
  eq(s.dayStreak(), 1, '昨天练过今天还没练，streak 保留');
}

// ---- #4 连胜宽恕（forgive）+ 欢迎回来 ----
{
  const store = new MemoryStorage();
  let now;
  const s = new PracticeStats({ storage: store, clock: () => now });
  now = tsOf(2026, 6, 21); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  now = tsOf(2026, 6, 22); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  // 漏练 6/23，6/24 再练
  now = tsOf(2026, 6, 24); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  eq(s.dayStreak(), 1, '严格：漏 1 天后重置为 1');
  eq(s.dayStreak({ forgive: 1 }), 3, '宽恕 1 天：跨过漏练日，连胜 3');
  eq(s.dayStreak({ forgive: 0 }), 1, 'forgive=0 等同严格');

  // 漏练 2 天（6/25、6/26 都没练），6/27 再练 -> forgive:1 不够补，归 1
  now = tsOf(2026, 6, 27); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  eq(s.dayStreak({ forgive: 1 }), 1, '宽恕 1 天补不平漏 2 天，重置为 1');
  // 序列 6/21,22,24,27：6/24→6/27 漏 2 天、6/22→6/24 漏 1 天，共漏 3 天
  eq(s.dayStreak({ forgive: 2 }), 2, '宽恕 2 天只够补 6/24→6/27 那段，连胜 2');
  eq(s.dayStreak({ forgive: 3 }), 4, '宽恕 3 天补平全部漏练，连胜 4');

  // 今天 6/28 还没练：宽恕 1 天让「昨天练过」的连胜显示保留
  now = tsOf(2026, 6, 28);
  eq(s.dayStreak(), 1, '今天没练但昨天练过，严格仍保留 1');
}

// ---- lastActiveBeforeToday / comebackGap ----
{
  const store = new MemoryStorage();
  let now;
  const s = new PracticeStats({ storage: store, clock: () => now });
  eq(s.comebackGap(), 0, '无历史，gap 0');
  now = tsOf(2026, 6, 20); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  now = tsOf(2026, 6, 24);
  eq(s.lastActiveBeforeToday(), '2026-06-20', '今天之前最近练习日');
  eq(s.comebackGap(), 4, '距上次练习 4 天');
  // 今天也练了一次后，「今天之前」仍指向 6/20
  s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  eq(s.comebackGap(), 4, '今天练过不影响 comebackGap（看今天之前）');
  // 没有更早历史时（只有今天）gap=0
  const s2 = new PracticeStats({ storage: new MemoryStorage(), clock: () => tsOf(2026, 6, 24) });
  s2.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  eq(s2.comebackGap(), 0, '只有今天，无久别');
}


// ---- 成就解锁：10 次练习 / 连击 / 连续天数 ----
{
  const store = new MemoryStorage();
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: store, clock: () => now });
  for (let i = 0; i < 9; i++) s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  ok(!s.data.unlocked['ten-sessions'], '9 次还没解锁 10 次成就');
  const newly = s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  ok(newly.includes('ten-sessions'), '第 10 次解锁小有所成');
  // 成就只解锁一次
  const again = s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  ok(!again.includes('ten-sessions'), '已解锁不重复返回');
}

// ---- combo & accuracy 成就 ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  const newly = s.record({ moduleId: 'a', attempts: 10, correct: 10, bestStreak: 10 });
  ok(newly.includes('combo-10'), '十连击解锁');
  ok(newly.includes('sharp-shooter'), '神准解锁（100%，10题）');
}

// ---- sharp-shooter 要求 ≥10 题 ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  const newly = s.record({ moduleId: 'a', attempts: 5, correct: 5, bestStreak: 5 });
  ok(!newly.includes('sharp-shooter'), '只有 5 题不解锁神准');
}

// ---- all-rounder：5 个不同模块 ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  ['m1', 'm2', 'm3', 'm4'].forEach(id => s.record({ moduleId: id, attempts: 1, correct: 1, bestStreak: 1 }));
  ok(!s.data.unlocked['all-rounder'], '4 模块还没解锁');
  const newly = s.record({ moduleId: 'm5', attempts: 1, correct: 1, bestStreak: 1 });
  ok(newly.includes('all-rounder'), '第 5 个模块解锁全能');
}

// ---- allAchievements 结构 ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  const all = s.allAchievements();
  eq(all.length, ACHIEVEMENTS.length, 'allAchievements 数量匹配');
  const first = all.find(a => a.id === 'first-steps');
  eq(first.unlocked, true, 'first-steps 已解锁');
  const fifty = all.find(a => a.id === 'fifty-sessions');
  eq(fifty.unlocked, false, 'fifty 未解锁');
}

// ---- recentDays ----
{
  const store = new MemoryStorage();
  let now;
  const s = new PracticeStats({ storage: store, clock: () => now });
  now = tsOf(2026, 6, 21); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  now = tsOf(2026, 6, 23); s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  s.record({ moduleId: 'a', attempts: 1, correct: 1, bestStreak: 1 });
  const rd = s.recentDays(3); // 6/21,6/22,6/23
  eq(rd.length, 3, 'recentDays 长度');
  eq(rd[0].day, '2026-06-21', '最早是 6/21');
  eq(rd[0].sessions, 1, '6/21 一次');
  eq(rd[1].sessions, 0, '6/22 没练');
  eq(rd[2].sessions, 2, '6/23 两次');
}

// ---- 持久化：重新载入保留数据 ----
{
  const store = new MemoryStorage();
  let now = tsOf(2026, 6, 23);
  const s1 = new PracticeStats({ storage: store, clock: () => now });
  s1.record({ moduleId: 'sight', label: '视奏', attempts: 10, correct: 8, bestStreak: 5 });
  const s2 = new PracticeStats({ storage: store, clock: () => now });
  eq(s2.snapshot().totalSessions, 1, '重载保留次数');
  eq(s2.snapshot().totalCorrect, 8, '重载保留答对数');
  ok(s2.data.unlocked['first-steps'], '重载保留成就');
}

// ---- 损坏数据容错 ----
{
  const store = new MemoryStorage();
  store.setItem('ca99-practice-stats', '{不是合法json');
  const s = new PracticeStats({ storage: store, clock: () => tsOf(2026, 6, 23) });
  eq(s.snapshot().totalSessions, 0, '损坏数据回退空白');
}

// ---- reset ----
{
  let now = tsOf(2026, 6, 23);
  const s = new PracticeStats({ storage: new MemoryStorage(), clock: () => now });
  s.record({ moduleId: 'a', attempts: 5, correct: 5, bestStreak: 5 });
  s.reset();
  eq(s.snapshot().totalSessions, 0, 'reset 清零');
  eq(s.moduleStats().length, 0, 'reset 清空模块');
  eq(Object.keys(s.data.unlocked).length, 0, 'reset 清空成就');
}

console.log(`practice-stats: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
