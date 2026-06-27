/**
 * rhythm-puzzles.js — 🧩 节奏拼图（Rhythm Puzzles，纯逻辑）
 *
 * 玩法（Kodály/Orff 音节式节奏教学，搬成拼图）：
 *  - 先<b>听</b>一条节奏（电脑拍出来）；
 *  - 玩家从<b>节奏音节卡</b>（ta / ti-ti / ta-a / 休止 / tika-tika …）里<b>拼出</b>刚听到的节奏；
 *  - 拼满一小节、且节奏结构一致 = 通关。听辨 + 读节奏，零音高、最低门槛。
 *
 * 只判<b>节奏结构</b>（attack/rest 的时值序列），等价排列都算对；不判音高。
 * 时间戳 / 音频 / DOM 一律不碰——纯逻辑，便于单元测试。
 */

/**
 * 节奏音节卡片库。
 *  - beats：这张卡占多少拍（四分音符 = 1 拍）
 *  - cells：卡内的"格子"结构 [{dur, rest?}]——dur 为该格时值（拍），rest=true 为休止（不发声）
 *  - level：难度（1 最简单）
 */
export const CARDS = [
  { id: 'ta',        label: 'ta',        sym: '♩',   beats: 1, level: 1, cells: [{ dur: 1 }] },
  { id: 'ti-ti',     label: 'ti-ti',     sym: '♫',   beats: 1, level: 1, cells: [{ dur: 0.5 }, { dur: 0.5 }] },
  { id: 'ta-a',      label: 'ta-a',      sym: '𝅗𝅥',  beats: 2, level: 2, cells: [{ dur: 2 }] },
  { id: 'rest',      label: '休',        sym: '𝄽',   beats: 1, level: 2, cells: [{ dur: 1, rest: true }] },
  { id: 'tika-tika', label: 'tika-tika', sym: '♬',   beats: 1, level: 3, cells: [{ dur: 0.25 }, { dur: 0.25 }, { dur: 0.25 }, { dur: 0.25 }] },
  { id: 'ti-tika',   label: 'ti-tika',   sym: '♪♬',  beats: 1, level: 3, cells: [{ dur: 0.5 }, { dur: 0.25 }, { dur: 0.25 }] },
];

/** 按 id 取卡片 */
export function cardById(id) {
  return CARDS.find((c) => c.id === id) || null;
}

/** 该难度（含以下）可用的卡片库 */
export function cardsUpToLevel(level) {
  return CARDS.filter((c) => c.level <= level);
}

/** 把一串卡片展开成完整的格子序列（整小节节奏） */
export function flattenCards(ids) {
  const out = [];
  for (const id of ids) {
    const c = cardById(id);
    if (c) for (const cell of c.cells) out.push({ dur: cell.dur, rest: !!cell.rest });
  }
  return out;
}

/** 格子序列 → 可比较的签名字符串（判等价） */
export function signature(cells) {
  return cells.map((c) => `${c.rest ? 'r' : 'x'}${c.dur}`).join('|');
}

/** 一串卡片占的总拍数 */
export function beatsOf(ids) {
  return ids.reduce((sum, id) => sum + (cardById(id)?.beats || 0), 0);
}

/**
 * 把展开的格子序列转换成"敲击时刻表"（用于播放/可视）。
 * @returns {Array<{beat,dur,rest}>} 每格的起拍位置 beat（累加）+ 时值 + 是否休止
 */
export function onsetCells(ids) {
  const cells = flattenCards(ids);
  const out = [];
  let t = 0;
  for (const c of cells) { out.push({ beat: t, dur: c.dur, rest: c.rest }); t += c.dur; }
  return out;
}

/**
 * 生成一道拼图：随机用 ≤level 的卡片填满 barBeats 拍。
 * @returns {{target:string[], bank:string[], barBeats:number}}
 *   target：正确答案的卡片序列；bank：玩家可用的卡片类型（去重，可重复使用）
 */
export function generatePuzzle({ level = 1, barBeats = 4, rng = Math.random } = {}) {
  const bank = cardsUpToLevel(level).map((c) => c.id);
  const pickable = cardsUpToLevel(level);
  let target = [];
  let attempts = 0;
  do {
    target = [];
    let remaining = barBeats;
    let guard = 0;
    while (remaining > 0 && guard++ < 64) {
      const fits = pickable.filter((c) => c.beats <= remaining);
      if (!fits.length) break;
      const c = fits[Math.floor(rng() * fits.length)];
      target.push(c.id);
      remaining -= c.beats;
    }
    attempts++;
  } while (beatsOf(target) !== barBeats && attempts < 40);
  // 兜底：若没凑满，用 ta 补齐
  let rem = barBeats - beatsOf(target);
  while (rem >= 1) { target.push('ta'); rem -= 1; }
  return { target, bank, barBeats };
}

/**
 * 一道节奏拼图的状态机。
 */
export class RhythmPuzzle {
  /**
   * @param {object} opts
   * @param {string[]} opts.target 正确答案卡片序列
   * @param {number} opts.barBeats 小节拍数（默认 target 的总拍数）
   */
  constructor(opts = {}) {
    this.target = (opts.target || []).slice();
    this.barBeats = opts.barBeats ?? beatsOf(this.target);
    this.placed = [];
  }

  /** 玩家放下的总拍数 */
  filledBeats() { return beatsOf(this.placed); }
  /** 还差多少拍 */
  remainingBeats() { return this.barBeats - this.filledBeats(); }

  /** 追加一张卡片（放不下则拒绝） */
  place(id) {
    const c = cardById(id);
    if (!c) return false;
    if (this.filledBeats() + c.beats > this.barBeats + 1e-9) return false;
    this.placed.push(id);
    return true;
  }

  /** 移除指定位置的卡片 */
  removeAt(i) {
    if (i < 0 || i >= this.placed.length) return false;
    this.placed.splice(i, 1);
    return true;
  }

  /** 撤销最后一张 */
  pop() { return this.placed.pop(); }
  /** 清空 */
  clear() { this.placed = []; }

  /** 是否已填满整小节 */
  isFull() { return Math.abs(this.filledBeats() - this.barBeats) < 1e-9; }

  /** 拼出的节奏结构是否与答案等价 */
  isCorrect() {
    return this.isFull() && signature(flattenCards(this.placed)) === signature(flattenCards(this.target));
  }

  /** 综合校验 */
  check() {
    return {
      full: this.isFull(),
      correct: this.isCorrect(),
      filledBeats: this.filledBeats(),
      barBeats: this.barBeats,
    };
  }

  /** 进度 0..1（已填拍数 / 总拍数） */
  progress() { return this.barBeats ? Math.min(1, this.filledBeats() / this.barBeats) : 0; }
}

const exported = {
  CARDS, cardById, cardsUpToLevel, flattenCards, signature, beatsOf, onsetCells, generatePuzzle, RhythmPuzzle,
};
export default exported;
