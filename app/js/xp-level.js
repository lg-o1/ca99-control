/**
 * xp-level.js — 统一经验/等级系统（纯逻辑，可测试）
 *
 * 把分散的 medals / microstars / streak 串成一条「总成长主线」：任何练习都喂经验，
 * 攒够就升级，建立「我是越来越棒的音乐人」的长期身份认同（元进度＝最强留存胶水）。
 *
 * 经验完全从已有累计统计派生（纯函数，不引入新事件管线）：
 *   答对题 / 练习次数 / 玩过的模块种类 / 连练天数 / 已解锁成就。
 */

/** 经验权重——鼓励「多练、多探索、坚持、成就」 */
export const XP_WEIGHTS = {
  correct: 2,      // 每答对一题
  session: 10,     // 每次练习
  module: 30,      // 每玩过一种不同模块（探索奖励）
  streakDay: 15,   // 连练天数（坚持奖励）
  achievement: 50, // 每解锁一个成就
};

/** 等级称号阶梯——建立「音乐人」身份（超出末级则沿用最后一个） */
export const LEVEL_TITLES = [
  { icon: '🌱', name: '小芽琴手' },
  { icon: '🎵', name: '音符新手' },
  { icon: '🎹', name: '见习乐手' },
  { icon: '🎼', name: '小小演奏家' },
  { icon: '⭐', name: '闪耀琴童' },
  { icon: '🎷', name: '乐队成员' },
  { icon: '🏅', name: '演奏能手' },
  { icon: '🔥', name: '舞台新星' },
  { icon: '🎖️', name: '钢琴大师' },
  { icon: '👑', name: '传奇演奏家' },
];

/** 从累计统计算总经验（纯函数，单调不减） */
export function xpFromStats(s = {}) {
  const w = XP_WEIGHTS;
  return Math.max(0, Math.round(
    (s.totalCorrect || 0) * w.correct +
    (s.totalSessions || 0) * w.session +
    (s.modulesPlayed || 0) * w.module +
    (s.dayStreak || 0) * w.streakDay +
    (s.achievements || 0) * w.achievement
  ));
}

/** 从第 L 级升到第 L+1 级所需经验（随等级缓慢增长，早期升级快＝多鼓励） */
export function levelXpNeeded(level) {
  const L = Math.max(1, Math.floor(level));
  return 60 + (L - 1) * 40;
}

/** 「正好处于第 L 级」所需的累计经验门槛 */
export function xpThreshold(level) {
  const L = Math.max(1, Math.floor(level));
  let sum = 0;
  for (let k = 1; k < L; k++) sum += levelXpNeeded(k);
  return sum;
}

/** 第 level 级的称号（从 1 起；超出则用最后一个） */
export function titleForLevel(level) {
  const i = Math.min(LEVEL_TITLES.length, Math.max(1, Math.floor(level))) - 1;
  return LEVEL_TITLES[i];
}

/**
 * 由总经验解算等级与进度。
 * @returns {{level,totalXp,intoLevel,span,toNext,progress,title}}
 *  - intoLevel：当前等级内已积累的经验
 *  - span：本级总跨度
 *  - toNext：还差多少升级
 *  - progress：0..1 本级进度
 */
export function levelFromXp(totalXp) {
  const xp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  while (xp >= xpThreshold(level + 1)) level++;
  const base = xpThreshold(level);
  const span = levelXpNeeded(level);
  const intoLevel = xp - base;
  const toNext = Math.max(0, span - intoLevel);
  const progress = span > 0 ? Math.max(0, Math.min(1, intoLevel / span)) : 0;
  return { level, totalXp: xp, intoLevel, span, toNext, progress, title: titleForLevel(level) };
}

/** 便捷：直接从统计算等级信息 */
export function levelFromStats(s = {}) {
  return levelFromXp(xpFromStats(s));
}

/** 经验来源拆解（给 UI 展示「经验从哪来」） */
export function xpBreakdown(s = {}) {
  const w = XP_WEIGHTS;
  return [
    { key: 'correct', icon: '✅', label: '答对题', count: s.totalCorrect || 0, xp: (s.totalCorrect || 0) * w.correct },
    { key: 'session', icon: '🎹', label: '练习次数', count: s.totalSessions || 0, xp: (s.totalSessions || 0) * w.session },
    { key: 'module', icon: '🌈', label: '玩过的玩法', count: s.modulesPlayed || 0, xp: (s.modulesPlayed || 0) * w.module },
    { key: 'streak', icon: '🔥', label: '连练天数', count: s.dayStreak || 0, xp: (s.dayStreak || 0) * w.streakDay },
    { key: 'achievement', icon: '🏅', label: '解锁成就', count: s.achievements || 0, xp: (s.achievements || 0) * w.achievement },
  ];
}
