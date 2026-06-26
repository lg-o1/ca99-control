/**
 * note-color.js — 彩色音符脚手架（color-note scaffolding，纯逻辑，可单元测试）
 *
 * 启蒙识谱阶段给每个音符头按音名上色（C=红、D=橙…七个白键 = 彩虹七色），
 * 帮零基础孩子把"五线谱位置 → 音名 → 键位"对应起来（Boomwhackers 教学法）。
 *
 * 关键："脚手架"必须能 **撤掉**——孩子练熟后颜色逐渐淡出，最终回到普通音符，
 * 避免长期依赖颜色而学不会真正读谱。scaffoldStrength() 据正确率给出 1→0 的不透明度：
 * 还在学（样本少 / 正确率没过线）= 满色；越练越准 = 越淡；接近全对 = 几乎隐去。
 */

/** 12 个音级的颜色：七个白键走彩虹（C 红→B 紫），黑键取相邻过渡色 */
export const PC_COLORS = [
  '#ef4444', // 0  C  红
  '#f4733a', // 1  C# 红橙
  '#f97316', // 2  D  橙
  '#d99a12', // 3  D# 橙黄
  '#eab308', // 4  E  黄
  '#22c55e', // 5  F  绿
  '#16a3a3', // 6  F# 青绿
  '#3b82f6', // 7  G  蓝
  '#4f6bf0', // 8  G# 蓝靛
  '#6366f1', // 9  A  靛
  '#8457e8', // 10 A# 靛紫
  '#a855f7', // 11 B  紫
];

/** 音级（0..11） */
export function pitchClass(midi) { return ((midi % 12) + 12) % 12; }

/** 取某 MIDI 音高对应的脚手架颜色 */
export function noteColor(midi) { return PC_COLORS[pitchClass(midi)]; }

/**
 * 脚手架强度（音符头颜色的不透明度，1=满色，0=完全隐去）。
 * 随掌握度递减——样本足够且正确率超过阈值后开始线性淡出。
 * @param {object} o
 *   correct   答对次数
 *   attempts  作答总次数
 *   threshold 开始淡出的正确率阈值（默认 0.85）
 *   minAttempts 达到此样本量前一律满色（默认 8，避免一上来侥幸全对就淡出）
 * @returns {number} 0..1
 */
export function scaffoldStrength({ correct = 0, attempts = 0, threshold = 0.85, minAttempts = 8 } = {}) {
  if (attempts < minAttempts) return 1;
  const acc = attempts > 0 ? correct / attempts : 0;
  if (acc <= threshold) return 1;
  const faded = 1 - (acc - threshold) / (1 - threshold); // acc=threshold→1，acc=1→0
  return Math.max(0, Math.min(1, faded));
}

/** 给定掌握度，是否已经几乎不需要颜色了（用于提示孩子"你已经能自己读谱啦"） */
export function isWeaned(o, eps = 0.05) { return scaffoldStrength(o) <= eps; }
