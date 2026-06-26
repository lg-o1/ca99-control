// 🎁 惊喜盲盒 × 音色解锁引擎（纯逻辑，可注入 storage + rng）
//
// 设计：每完成一次练习，有 `chance` 概率「开出一个盲盒」，从音色池 `poolIds`
// 里随机解锁一个【尚未拥有】的好玩音色 → 攒成「音色图鉴」。
// 可变奖励（不是每次都开）是最强的行为维持机制；收集欲叠加 Octalysis「拥有感」。
// 内容成本≈0：直接复用 CA99 的 346 音色库。
//
// 引擎只管「概率 + 解锁集合 + 图鉴统计」，不关心音色具体数据——
// 调用方传入 poolIds（候选音色 id 数组），engine 负责挑没解锁过的。

// rng() 约定返回 [0,1) 的浮点数（默认 Math.random）。

/** 是否开盒：rng() < chance */
export function rollOpen(rng, chance) {
  const c = Number.isFinite(chance) ? chance : 0.1;
  return rng() < c;
}

/**
 * 从 poolIds 里挑一个不在 unlockedSet 的 id（均匀随机）。
 * 全部已解锁 → 返回 null。
 */
export function pickReward(poolIds, unlockedSet, rng) {
  const remaining = poolIds.filter((id) => !unlockedSet.has(id));
  if (!remaining.length) return null;
  const i = Math.floor(rng() * remaining.length);
  return remaining[Math.min(i, remaining.length - 1)];
}

const DEFAULT_KEY = 'ca99-mystery-box';

export class MysteryBox {
  /**
   * @param {object}   opts
   * @param {Storage}  opts.storage  localStorage 兼容对象（getItem/setItem）
   * @param {Function} [opts.rng]    返回 [0,1) 的随机源（测试可注入确定序列）
   * @param {number}   [opts.chance] 每次练习开盒概率（默认 0.1）
   * @param {string}   [opts.key]    存储键
   */
  constructor({ storage, rng = Math.random, chance = 0.1, key = DEFAULT_KEY } = {}) {
    this.storage = storage;
    this.rng = rng;
    this.chance = chance;
    this.key = key;
  }

  _load() {
    try {
      const raw = this.storage && this.storage.getItem(this.key);
      const d = raw ? JSON.parse(raw) : null;
      if (d && Array.isArray(d.unlocked)) {
        return { unlocked: d.unlocked.slice(), opened: d.opened | 0 };
      }
    } catch { /* 容错：损坏数据当空 */ }
    return { unlocked: [], opened: 0 };
  }

  _save(d) {
    try {
      this.storage && this.storage.setItem(this.key, JSON.stringify(d));
    } catch { /* 存储满/隐私模式：静默 */ }
  }

  /** 已解锁音色 id 数组（按解锁顺序） */
  unlockedIds() {
    return this._load().unlocked;
  }

  /** 累计开盒次数 */
  openCount() {
    return this._load().opened;
  }

  isUnlocked(id) {
    return this._load().unlocked.includes(id);
  }

  /** 手动解锁一个 id；返回是否为新解锁 */
  unlock(id) {
    const d = this._load();
    if (d.unlocked.includes(id)) return false;
    d.unlocked.push(id);
    this._save(d);
    return true;
  }

  /** 图鉴统计：{ total, unlocked, remaining, pct } */
  stats(poolIds) {
    const set = new Set(this._load().unlocked);
    const total = poolIds.length;
    const unlocked = poolIds.filter((id) => set.has(id)).length;
    return {
      total,
      unlocked,
      remaining: total - unlocked,
      pct: total ? Math.round((unlocked / total) * 100) : 0,
    };
  }

  /**
   * 一次练习后摇盒。
   * @returns {{opened:boolean, reward:(any|null), isNew:boolean, allUnlocked:boolean}}
   */
  roll(poolIds) {
    const d = this._load();
    const set = new Set(d.unlocked);
    const allUnlocked = poolIds.length > 0 && poolIds.every((id) => set.has(id));
    if (allUnlocked) {
      return { opened: false, reward: null, isNew: false, allUnlocked: true };
    }
    if (!rollOpen(this.rng, this.chance)) {
      return { opened: false, reward: null, isNew: false, allUnlocked: false };
    }
    const reward = pickReward(poolIds, set, this.rng);
    if (reward == null) {
      return { opened: false, reward: null, isNew: false, allUnlocked: true };
    }
    d.unlocked.push(reward);
    d.opened = (d.opened | 0) + 1;
    this._save(d);
    return { opened: true, reward, isNew: true, allUnlocked: false };
  }
}
