// 🎯 每日自选微目标引擎（纯逻辑，可注入 storage）
//
// 直击 SDT「自主感」：每天开场给孩子 2-3 个推荐玩法，让她【自己选一个】当今日目标。
// 目标超小化——「练 1 次就达成」，降低抗拒；自己选 → 练琴不再是「义务」而是「我的决定」。
//
// 引擎只管：① 按日期确定性地挑选今日推荐项（同一天刷新页面选项稳定）
//           ② 记录今天选了哪个 + 是否达成 + 累计达成天数
// 不关心模块怎么渲染/导航。

/** 确定性字符串哈希（FNV-1a 变体），用于「按日期稳定洗牌」 */
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * 按日期确定性地从 catalog 里挑 count 个推荐项。
 * 同一 dayKey 永远得到同一组（刷新不变），换一天就换一批。
 * @param {Array<{id:string,label:string}>} catalog
 * @param {string} dayKey  YYYY-MM-DD
 * @param {number} [count=3]
 */
export function pickDailyOptions(catalog, dayKey, count = 3) {
  const scored = catalog.map((it) => ({ it, k: hashStr(dayKey + '|' + it.id) }));
  scored.sort((a, b) => (a.k - b.k) || (a.it.id < b.it.id ? -1 : 1));
  return scored.slice(0, Math.min(count, catalog.length)).map((s) => s.it);
}

const DEFAULT_KEY = 'ca99-daily-goal';

export class DailyGoal {
  constructor({ storage, key = DEFAULT_KEY } = {}) {
    this.storage = storage;
    this.key = key;
  }

  _load() {
    try {
      const r = this.storage && this.storage.getItem(this.key);
      const d = r ? JSON.parse(r) : null;
      if (d && typeof d === 'object') {
        return {
          dayKey: d.dayKey || null,
          chosenId: d.chosenId || null,
          done: !!d.done,
          totalDone: d.totalDone | 0,
        };
      }
    } catch { /* 容错 */ }
    return { dayKey: null, chosenId: null, done: false, totalDone: 0 };
  }

  _save(d) {
    try {
      this.storage && this.storage.setItem(this.key, JSON.stringify(d));
    } catch { /* 静默 */ }
  }

  /** 今天的状态（换天自动重置 chosen/done，但保留 totalDone） */
  state(dayKey) {
    const d = this._load();
    if (d.dayKey === dayKey) {
      return { chosenId: d.chosenId, done: d.done, totalDone: d.totalDone };
    }
    return { chosenId: null, done: false, totalDone: d.totalDone };
  }

  /** 选定今日目标；若重选的是同一个且今天已达成则保留达成状态 */
  choose(dayKey, moduleId) {
    const d = this._load();
    const keepDone = (d.dayKey === dayKey && d.chosenId === moduleId) ? d.done : false;
    this._save({ dayKey, chosenId: moduleId, done: keepDone, totalDone: d.totalDone });
    return { chosenId: moduleId, done: keepDone };
  }

  /** 练了某模块 → 若它正是今日所选且还没达成，则标记达成（返回是否「刚刚达成」） */
  complete(dayKey, moduleId) {
    const d = this._load();
    if (d.dayKey === dayKey && d.chosenId === moduleId && !d.done) {
      d.done = true;
      d.totalDone = (d.totalDone | 0) + 1;
      this._save(d);
      return true;
    }
    return false;
  }

  /** 累计达成的日目标数 */
  totalDone() {
    return this._load().totalDone;
  }
}
