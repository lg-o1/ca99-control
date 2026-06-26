/**
 * bingo-card.js — 🎯 练习宾果卡（5×5 任务格，连成线/填满给奖励，纯逻辑）
 *
 * 设计（用"多样化菜单 + 连线奖励"打散枯燥重复）：
 *  - 一张 5×5 卡，每格一个超小练习任务（弹音阶/找中央C/弹首爱的曲子/闭眼弹…），
 *    中心格是 ⭐ 免费格（已点亮）。
 *  - 做完一格就点亮它；连成一整行/列/斜线 → 小奖励（撒花）；整张填满 → 大奖励。
 *  - 任务多样、可由家长/老师按当前曲目定制；消除"练同一样东西"的厌烦。
 */

/** 任务池（小而多样，偏鼓励、低门槛） */
export const TASK_POOL = [
  { emoji: '🎹', text: '弹 C 大调音阶 ↑↓' },
  { emoji: '🌟', text: '弹一首你喜欢的曲子 30 秒' },
  { emoji: '👀', text: '闭上眼找到中央 C' },
  { emoji: '🤚', text: '右手弹一段琶音' },
  { emoji: '✋', text: '左手弹一段琶音' },
  { emoji: '🙌', text: '双手一起弹一个和弦' },
  { emoji: '🐢', text: '把难的一小段慢慢弹 3 遍' },
  { emoji: '🚀', text: '把一段音阶弹得更快一点' },
  { emoji: '🎵', text: '唱出 do-re-mi-fa-so' },
  { emoji: '👏', text: '拍出一段节奏 4 拍' },
  { emoji: '🔁', text: '复习昨天练的曲子' },
  { emoji: '💪', text: '弹一个强音 ff 再弹弱音 pp' },
  { emoji: '🎼', text: '认 3 个五线谱上的音' },
  { emoji: '🌈', text: '弹一个大三和弦 + 小三和弦' },
  { emoji: '🦋', text: '连奏一段（音连成线）' },
  { emoji: '⚡', text: '断奏一段（音弹得短）' },
  { emoji: '🎶', text: '即兴弹 5 个好听的音' },
  { emoji: '🕵️', text: '找出曲子里最难的一小节' },
  { emoji: '🎯', text: '弹一段不看手' },
  { emoji: '🧩', text: '把一首曲子分成两段分别练' },
  { emoji: '🎈', text: '弹一首给家人听' },
  { emoji: '🔔', text: '弹一段渐强（越来越响）' },
  { emoji: '🌙', text: '弹一段渐弱（越来越轻）' },
  { emoji: '🎪', text: '换一个有趣的音色弹一段' },
];

/** Fisher–Yates 洗牌（可注入 rng 以便测试确定性） */
export function shuffle(arr, rng) {
  const a = arr.slice();
  const rnd = rng || Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 枚举所有获胜线（行/列/两条对角线）→ 每条是一组格子索引 */
export function winLines(size = 5) {
  const lines = [];
  for (let r = 0; r < size; r++) lines.push(Array.from({ length: size }, (_, c) => r * size + c));
  for (let c = 0; c < size; c++) lines.push(Array.from({ length: size }, (_, r) => r * size + c));
  lines.push(Array.from({ length: size }, (_, i) => i * size + i));
  lines.push(Array.from({ length: size }, (_, i) => i * size + (size - 1 - i)));
  return lines;
}

/**
 * 宾果卡状态机。opts: { size=5, rng=null, freeCenter=true }
 */
export class BingoCard {
  constructor({ size = 5, rng = null, freeCenter = true } = {}) {
    this.size = size;
    this.freeCenter = freeCenter !== false;
    const need = size * size - (this.freeCenter ? 1 : 0);
    const picked = shuffle(TASK_POOL, rng).slice(0, need);
    const center = Math.floor((size * size) / 2);
    this.cells = [];
    let p = 0;
    for (let i = 0; i < size * size; i++) {
      if (this.freeCenter && i === center) this.cells.push({ free: true, task: { emoji: '⭐', text: 'FREE' } });
      else this.cells.push({ free: false, task: picked[p++] });
    }
    this.marked = new Set();
    this._wonLines = new Set();
    if (this.freeCenter) this.marked.add(center);
  }

  /** 切换一格的完成状态（免费格不可切换）。返回 {marked, newLines:[lineArrays], full} */
  toggle(i) {
    if (i < 0 || i >= this.cells.length || this.cells[i].free) return { marked: this.isMarked(i), newLines: [], full: this.isFull() };
    if (this.marked.has(i)) this.marked.delete(i); else this.marked.add(i);
    return this._evaluate();
  }

  /** 只点亮（不取消） */
  mark(i) {
    if (i < 0 || i >= this.cells.length || this.cells[i].free) return { marked: this.isMarked(i), newLines: [], full: this.isFull() };
    this.marked.add(i);
    return this._evaluate();
  }

  _evaluate() {
    const lines = winLines(this.size);
    const newLines = [];
    lines.forEach((ln, idx) => {
      const complete = ln.every((c) => this.marked.has(c));
      if (complete && !this._wonLines.has(idx)) { this._wonLines.add(idx); newLines.push(ln); }
      if (!complete && this._wonLines.has(idx)) this._wonLines.delete(idx);
    });
    return { marked: true, newLines, full: this.isFull() };
  }

  isMarked(i) { return this.marked.has(i); }
  /** 已完成的获胜线数量 */
  lineCount() { return this._wonLines.size; }
  /** 整张是否全部点亮 */
  isFull() { return this.cells.every((c, i) => c.free || this.marked.has(i)); }
  /** 已点亮的任务格数（不含免费格） */
  doneCount() {
    let n = 0;
    this.cells.forEach((c, i) => { if (!c.free && this.marked.has(i)) n++; });
    return n;
  }
}
