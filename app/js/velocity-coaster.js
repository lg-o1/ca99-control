/**
 * velocity-coaster.js — 🎢 力度过山车（纯逻辑）
 *
 * 设计（把"练强弱控制"变成开过山车的游戏，CA99 真实力度感应才好玩）：
 *  - 屏幕画一条起伏的轨道（小山坡 / 山谷 / 波浪 / 楼梯…），每个站点有一个<b>目标力度</b>；
 *  - 孩子按琴键，用<b>触键的轻重</b>"开车"经过每个站点——轨道高 = 要弹得响，轨道低 = 要弹得轻；
 *  - 按 note-on 的 velocity 和目标比，越接近评价越高（perfect/good/ok/miss），连续接近攒 combo。
 *
 * 复用 dynamics-trainer 的 6 档力度（DYNAMICS）给站点贴 pp~ff 标签。纯逻辑：不碰 MIDI/DOM。
 */

import { DYNAMICS, velocityToIndex } from './dynamics-trainer.js';

/** 轨道形状：每种给出一个 height(0..1) 生成函数（i=站点序号, n=总数） */
export const SHAPES = [
  { id: 'hill',       name: '小山坡', emoji: '⛰️', desc: '先轻轻爬坡 → 最响 → 再轻下来' },
  { id: 'valley',     name: '山谷',   emoji: '🏞️', desc: '先大声冲下 → 谷底最轻 → 再爬上来' },
  { id: 'stairsUp',   name: '上楼梯', emoji: '📈', desc: '一级一级越来越响（渐强）' },
  { id: 'stairsDown', name: '下楼梯', emoji: '📉', desc: '一级一级越来越轻（渐弱）' },
  { id: 'wave',       name: '波浪',   emoji: '🌊', desc: '一上一下像海浪起伏' },
  { id: 'zigzag',     name: '锯齿',   emoji: '⚡', desc: '忽轻忽响，考验快速切换' },
];

const SHAPE_BY_ID = new Map(SHAPES.map((s) => [s.id, s]));
export function shapeById(id) { return SHAPE_BY_ID.get(id) || SHAPES[0]; }

/** 力度区间：避开两端极值，映射到舒适可控范围 */
export const COASTER_VMIN = 26;
export const COASTER_VMAX = 118;

function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

/** 归一高度 0..1 → velocity（四舍五入到 COASTER_VMIN..COASTER_VMAX） */
export function heightToVelocity(h) {
  return Math.round(COASTER_VMIN + clamp01(h) * (COASTER_VMAX - COASTER_VMIN));
}

/** velocity → 归一高度 0..1（heightToVelocity 的逆，便于把实际弹奏画到轨道上） */
export function velocityToHeight(vel) {
  const h = (vel - COASTER_VMIN) / (COASTER_VMAX - COASTER_VMIN);
  return clamp01(h);
}

/** 按形状生成 n 个站点的高度序列（0..1） */
function heightsForShape(id, n, rng) {
  const r = rng || Math.random;
  const out = [];
  const last = n - 1;
  for (let i = 0; i < n; i++) {
    const t = last === 0 ? 0 : i / last; // 0..1
    let h;
    switch (id) {
      case 'hill':       h = 1 - Math.abs(t - 0.5) * 2; break;           // 三角：中间最高
      case 'valley':     h = Math.abs(t - 0.5) * 2; break;               // 倒三角：中间最低
      case 'stairsUp':   h = 0.1 + 0.9 * t; break;
      case 'stairsDown': h = 1 - 0.9 * t; break;
      case 'wave':       h = 0.5 + 0.45 * Math.sin(t * Math.PI * 2); break;
      case 'zigzag':     h = i % 2 === 0 ? 0.2 : 0.9; break;
      default:           h = clamp01(r());
    }
    out.push(clamp01(h));
  }
  return out;
}

/**
 * 生成一条轨道。
 * @param {string} shapeId
 * @param {number} [n] 站点数（默认 8）
 * @param {Function} [rng]
 * @returns {{shape, points:[{i, height, velocity, dyn}]}}
 */
export function makeTrack(shapeId, n = 8, rng = Math.random) {
  const count = Math.max(2, n | 0);
  const shape = shapeById(shapeId);
  const heights = heightsForShape(shape.id, count, rng);
  const points = heights.map((height, i) => {
    const velocity = heightToVelocity(height);
    return { i, height, velocity, dyn: DYNAMICS[velocityToIndex(velocity)] };
  });
  return { shape, points };
}

/** 随机选一个形状生成轨道 */
export function randomTrack(n = 8, rng = Math.random) {
  const shape = SHAPES[Math.floor((rng || Math.random)() * SHAPES.length)];
  return makeTrack(shape.id, n, rng);
}

/** 评分阈值（velocity 差） */
export const RATING_BANDS = [
  { rating: 'perfect', emoji: '🌟', maxDiff: 8,  score: 3 },
  { rating: 'good',    emoji: '👍', maxDiff: 18, score: 2 },
  { rating: 'ok',      emoji: '🆗', maxDiff: 32, score: 1 },
  { rating: 'miss',    emoji: '💨', maxDiff: Infinity, score: 0 },
];

/** 比较目标力度与实际弹奏力度，给出评价 */
export function judgeHit(targetVel, playedVel) {
  const diff = Math.abs(targetVel - playedVel);
  const band = RATING_BANDS.find((b) => diff <= b.maxDiff);
  const dir = playedVel > targetVel ? 'loud' : (playedVel < targetVel ? 'soft' : 'exact');
  return { rating: band.rating, emoji: band.emoji, score: band.score, diff, dir };
}

/**
 * 一局过山车：逐站点行进、计分、combo。
 * combo 在 perfect/good 累加，ok/miss 清零（ok 不算"接近"但也不惩罚分数）。
 */
export class VelocityCoaster {
  constructor(track, { rng = Math.random } = {}) {
    this.track = track || randomTrack(8, rng);
    this.idx = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.hits = [];
  }

  current() { return this.track.points[this.idx] || null; }
  isDone() { return this.idx >= this.track.points.length; }
  get total() { return this.track.points.length; }
  maxScore() { return this.total * 3; }

  /**
   * 在当前站点弹一下（velocity）。推进到下一站。
   * @returns {{rating, emoji, score, diff, dir, target, played, combo, idx, done}}
   */
  play(vel) {
    const pt = this.current();
    if (!pt) return { done: true, rating: 'miss', score: this.score, idx: this.idx, combo: this.combo };
    const j = judgeHit(pt.velocity, vel);
    this.score += j.score;
    this.hits.push({ rating: j.rating, diff: j.diff, target: pt.velocity, played: vel });
    if (j.rating === 'perfect' || j.rating === 'good') {
      this.combo += 1;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    } else {
      this.combo = 0;
    }
    this.idx += 1;
    return {
      ...j, target: pt.velocity, played: vel,
      combo: this.combo, idx: this.idx, done: this.isDone(), score: this.score,
    };
  }

  /** 完成度评分 0..1（按累计得分 / 满分） */
  accuracy() {
    const max = this.maxScore();
    return max ? this.score / max : 0;
  }

  /** 用满分百分比给一个星级 0..3（结算用） */
  stars() {
    const a = this.accuracy();
    if (a >= 0.9) return 3;
    if (a >= 0.7) return 2;
    if (a >= 0.45) return 1;
    return 0;
  }
}

const exported = {
  SHAPES, shapeById, COASTER_VMIN, COASTER_VMAX,
  heightToVelocity, velocityToHeight, makeTrack, randomTrack,
  RATING_BANDS, judgeHit, VelocityCoaster,
};
export default exported;
