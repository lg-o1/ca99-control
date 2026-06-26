/**
 * pet-grow.js — 🐣 养成小伙伴（练琴养成宠物，纯逻辑，可测试）
 *
 * 一只会<b>随累计练习成长 / 进化</b>的音乐小伙伴。它的成长值<b>直接复用经验系统</b>
 * （`xpFromStats`）——所以孩子每练一次，宠物和等级一起长，是同一条成长主线，
 * 叠加「养成 + 拥有感」（Octalysis 拥有感）：孩子<b>为了它</b>而练。
 *
 * 鼓励向：宠物<b>只会越长越大、从不退化、从不死亡</b>；没练时只是「有点想你」（温和），
 * 绝不惩罚。进化是惊喜奖励。
 *
 * 本模块不碰 DOM / 时间——只做成长值→阶段的映射，渲染由调用方（app.js）完成。
 */

import { xpFromStats } from './xp-level.js';

/** 8 个进化阶段（成长值门槛递增；早期进化快＝多鼓励） */
export const PET_STAGES = [
  { id: 'egg', emoji: '🥚', name: '音乐蛋', min: 0, desc: '一颗暖暖的蛋，里面好像有歌声…' },
  { id: 'chick', emoji: '🐣', name: '破壳雏鸟', min: 60, desc: '破壳啦！它跟着你的琴声啾啾叫。' },
  { id: 'bird', emoji: '🐤', name: '唱歌小鸡', min: 160, desc: '会跟着你哼简单的小调了。' },
  { id: 'song', emoji: '🐦', name: '旋律鸟', min: 320, desc: '羽毛长齐，能唱出完整的旋律。' },
  { id: 'parrot', emoji: '🦜', name: '七彩鹦鹉', min: 560, desc: '五彩斑斓，会模仿你弹的每个音。' },
  { id: 'peacock', emoji: '🦚', name: '音乐孔雀', min: 900, desc: '一开屏，音符像彩虹一样洒出来。' },
  { id: 'swan', emoji: '🦢', name: '天鹅歌者', min: 1400, desc: '优雅的歌者，和你一起演奏二重唱。' },
  { id: 'eagle', emoji: '🦅', name: '传奇音乐鹰', min: 2200, desc: '翱翔天际的传奇——和你一起，无所不能。' },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** 由累计练习统计算出宠物成长值（＝总经验，与等级系统同源） */
export function petXp(stats = {}) { return xpFromStats(stats); }

/** 成长值 → 当前阶段下标 */
export function stageIndexFor(xp) {
  const v = Math.max(0, xp || 0);
  let idx = 0;
  for (let i = 0; i < PET_STAGES.length; i++) if (v >= PET_STAGES[i].min) idx = i;
  return idx;
}

/** 成长值 → 当前阶段对象 */
export function stageFor(xp) { return PET_STAGES[stageIndexFor(xp)]; }

/** 下一阶段对象（已满级则 null） */
export function nextStageOf(xp) {
  const idx = stageIndexFor(xp);
  return idx + 1 < PET_STAGES.length ? PET_STAGES[idx + 1] : null;
}

/** 到下一次进化的进度 */
export function progressToNext(xp) {
  const v = Math.max(0, xp || 0);
  const idx = stageIndexFor(xp);
  const cur = PET_STAGES[idx];
  const next = PET_STAGES[idx + 1];
  if (!next) return { maxed: true, into: 0, span: 0, frac: 1, toNext: 0 };
  const span = next.min - cur.min;
  const into = v - cur.min;
  return { maxed: false, into, span, frac: clamp(into / span, 0, 1), toNext: Math.max(0, next.min - v) };
}

/**
 * 宠物心情（温和，从不悲伤/惩罚）。
 * @param {{practicedToday?:boolean}} o
 */
export function moodFor(o = {}) {
  if (o.practicedToday) return { emoji: '😍', text: '今天一起玩了音乐，它超开心！' };
  return { emoji: '😴', text: '它有点想你了～弹几个音，它马上精神！' };
}

/** 汇总：阶段 / 进度 / 心情 / 是否刚进化（与传入的 lastStageId 比较） */
export function petSummary(stats = {}, o = {}) {
  const xp = petXp(stats);
  const stage = stageFor(xp);
  const prog = progressToNext(xp);
  const mood = moodFor({ practicedToday: !!o.practicedToday });
  const evolved = o.lastStageId != null && o.lastStageId !== stage.id
    && stageIndexFor(xp) > PET_STAGES.findIndex((s) => s.id === o.lastStageId);
  return { xp, stage, next: nextStageOf(xp), progress: prog, mood, evolved };
}
