/**
 * medals.js — 「奖牌只升不降」每首曲个人最好成绩（pure logic engine）
 *
 * 灵感：Virtual Piano / Melodics —— 每首曲存一枚金/银/铜奖牌，奖牌**永不下降**，
 * 只会在弹得更好时升级。这直接对抗固定思维的"重弹焦虑"：再弹一遍零风险，
 * 最差也只是维持原奖牌。配合「奖牌墙」收集面板，把练习变成"收集所有金牌"。
 *
 * 奖牌四档（按正确率，外加白金需全 PERFECT）：
 *   🥉 bronze   ≥50%
 *   🥈 silver   ≥70%
 *   🥇 gold     ≥90%
 *   💎 platinum  100% 且全程 PERFECT（无 good / 无 miss）—— 拉伸目标
 *
 * 存储后端可注入，便于确定性单元测试。
 */

import { MemoryStorage } from './preset-store.js';

/** 奖牌档位定义（rank 从低到高） */
export const MEDAL_TIERS = [
  { id: 'none',     rank: 0, icon: '🔒', name: '未获得', min: 0 },
  { id: 'bronze',   rank: 1, icon: '🥉', name: '铜牌',   min: 50 },
  { id: 'silver',   rank: 2, icon: '🥈', name: '银牌',   min: 70 },
  { id: 'gold',     rank: 3, icon: '🥇', name: '金牌',   min: 90 },
  { id: 'platinum', rank: 4, icon: '💎', name: '白金',   min: 100, requirePerfect: true },
];

const BY_ID = Object.fromEntries(MEDAL_TIERS.map((t) => [t.id, t]));

/** 取某档位定义（未知返回 none） */
export function tierOf(id) { return BY_ID[id] || MEDAL_TIERS[0]; }

/**
 * 根据本遍成绩算应得奖牌档位 id。
 * @param {number} accuracy 正确率 0-100（整数）
 * @param {boolean} allPerfect 是否全程 PERFECT（无 good / 无 miss）
 * @returns {string} 档位 id：'none'|'bronze'|'silver'|'gold'|'platinum'
 */
export function medalForResult(accuracy, allPerfect = false) {
  const acc = Math.max(0, Math.min(100, Number(accuracy) || 0));
  if (acc >= 100 && allPerfect) return 'platinum';
  // 100% 但非全 PERFECT 仍算金牌
  for (let i = MEDAL_TIERS.length - 1; i >= 0; i--) {
    const t = MEDAL_TIERS[i];
    if (t.requirePerfect) continue;
    if (acc >= t.min) return t.id;
  }
  return 'none';
}

export class Medals {
  /**
   * @param {object} opts
   * @param {Storage|MemoryStorage} opts.storage 存储后端（默认内存）
   * @param {string} opts.key 存储键
   * @param {() => number} opts.clock 取当前时间（ms）
   */
  constructor(opts = {}) {
    this.storage = opts.storage || new MemoryStorage();
    this.key = opts.key || 'ca99-medals';
    this.clock = opts.clock || (() => Date.now());
    this.data = this._read();
  }

  _read() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return {};
    try {
      const obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    } catch { return {}; }
  }

  _write() { this.storage.setItem(this.key, JSON.stringify(this.data)); }

  /**
   * 记录一遍成绩，奖牌只升不降。
   * @param {string} songId
   * @param {object} r
   * @param {number} r.accuracy 正确率 0-100
   * @param {boolean} [r.allPerfect] 是否全 PERFECT
   * @param {string} [r.title] 曲名（用于奖牌墙展示）
   * @returns {{medal:string, prevMedal:string, upgraded:boolean, isNew:boolean, plays:number, bestPct:number}}
   */
  award(songId, r = {}) {
    if (!songId) songId = 'unknown';
    const acc = Math.max(0, Math.min(100, Number(r.accuracy) || 0));
    const earned = medalForResult(acc, !!r.allPerfect);
    const prev = this.data[songId] || { medal: 'none', bestPct: 0, plays: 0, title: r.title || songId };
    const prevMedal = prev.medal || 'none';
    const isNew = !prev.plays;
    const upgraded = tierOf(earned).rank > tierOf(prevMedal).rank;

    const next = {
      medal: upgraded ? earned : prevMedal,           // 只升不降
      bestPct: Math.max(prev.bestPct || 0, acc),
      plays: (prev.plays || 0) + 1,
      title: r.title || prev.title || songId,
      ts: this.clock(),
    };
    this.data[songId] = next;
    this._write();
    return { medal: next.medal, prevMedal, upgraded, isNew, plays: next.plays, bestPct: next.bestPct };
  }

  /** 某首曲当前奖牌记录（无记录返回 null） */
  medalOf(songId) { return this.data[songId] || null; }

  /** 全部已获奖牌记录数组（按档位高→低、再按 bestPct 高→低） */
  all() {
    return Object.entries(this.data)
      .map(([id, m]) => ({ id, ...m }))
      .sort((a, b) => tierOf(b.medal).rank - tierOf(a.medal).rank || (b.bestPct || 0) - (a.bestPct || 0));
  }

  /** 各档位计数 + 总枚数 { bronze, silver, gold, platinum, total } */
  counts() {
    const c = { bronze: 0, silver: 0, gold: 0, platinum: 0, total: 0 };
    for (const m of Object.values(this.data)) {
      const id = m.medal;
      if (id && id !== 'none') { c[id] = (c[id] || 0) + 1; c.total += 1; }
    }
    return c;
  }

  reset() { this.data = {}; this._write(); }
}
