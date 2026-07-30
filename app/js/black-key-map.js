/**
 * black-key-map.js — 🎹 黑键地图（用黑键分组认键盘）纯逻辑
 *
 * 面向**完全零基础**的第一课：钢琴的黑键永远是「2 个一组」和「3 个一组」交替排列，
 * 这是导航整个键盘的**视觉地标**。看懂了它，不用记音名也能秒找到 C、D、E…：
 *   - 【2 个黑键】：左边白键 = C，正中间白键 = D，右边白键 = E
 *   - 【3 个黑键】：左边白键 = F，右边白键 = B
 *
 * 玩法：app 出一句话（如「找一组 <b>2 个黑键</b>」/「2 个黑键<b>左边</b>的白键（C）」），
 * 你在**真实琴键**上弹**任意一个**符合的键就算对（音区随你，全键盘哪个都行），
 * 练的是「靠黑键分组定位」这个最底层的键盘地理能力。
 *
 * 与「键盘音名认知 note-id」不同：那个练【看音名 ↔ 认键位】（要会读 C4/F#3 这种名字），
 * 这个更早一步——**先靠黑键的形状**找到键，是识谱认名之前的地基。
 *
 * 关键设计：判定**与音区无关**——只看你弹的键的「音级」（pitch class = midi % 12）
 * 是否落在该题的答案集合里，全键盘 88 键上任何一个符合的键都算对。
 *
 * 本文件只放可单元测试的纯逻辑（题库、出题、判定、状态机），
 * DOM 提示/亮键/采集在 app.js 的 renderBlackKeyMap 里。
 */

/** midi → 音级（0=C … 11=B） */
export function pcOf(midi) {
  return ((midi % 12) + 12) % 12;
}

/**
 * 题库：每题给一句提示 + 合法答案音级集合。
 * two/three 是「弹任意一个属于该黑键组的黑键」；其余是黑键组旁边的白键地标。
 */
export const TASKS = {
  two:   { id: 'two',   prompt: '找一组 <b>2 个黑键</b>（弹其中任意一个黑键）', pcs: [1, 3],      landmark: '2黑' },
  three: { id: 'three', prompt: '找一组 <b>3 个黑键</b>（弹其中任意一个黑键）', pcs: [6, 8, 10], landmark: '3黑' },
  C:     { id: 'C',     prompt: '2 个黑键<b>左边</b>的白键 = <b>C</b>',        pcs: [0],  landmark: '2黑左' },
  D:     { id: 'D',     prompt: '2 个黑键<b>正中间</b>的白键 = <b>D</b>',      pcs: [2],  landmark: '2黑中' },
  E:     { id: 'E',     prompt: '2 个黑键<b>右边</b>的白键 = <b>E</b>',        pcs: [4],  landmark: '2黑右' },
  F:     { id: 'F',     prompt: '3 个黑键<b>左边</b>的白键 = <b>F</b>',        pcs: [5],  landmark: '3黑左' },
  B:     { id: 'B',     prompt: '3 个黑键<b>右边</b>的白键 = <b>B</b>',        pcs: [11], landmark: '3黑右' },
};

/** 取一道题的定义（找不到回退 two） */
export function taskById(id) {
  return TASKS[id] || TASKS.two;
}

/**
 * 难度级别：决定该关抽哪些题（tasks = 题目 id 列表）。
 */
export const BK_LEVELS = [
  { id: 'groups', name: '🟢 认黑键组 (2/3)',    tasks: ['two', 'three'] },
  { id: 'cd',     name: '🎵 找 C 和 D',          tasks: ['C', 'D'] },
  { id: 'whites', name: '🟡 白键地标 (CDEFB)',   tasks: ['C', 'D', 'E', 'F', 'B'] },
  { id: 'all',    name: '🔴 全部混合',           tasks: ['two', 'three', 'C', 'D', 'E', 'F', 'B'] },
];

/** 按 id 取级别（找不到回退第一个） */
export function levelById(id) {
  return BK_LEVELS.find((l) => l.id === id) || BK_LEVELS[0];
}

/**
 * 出一道题：从该级别的 tasks 里抽一个（尽量避免与上一题相同），返回题目定义。
 * @param {object} level BK_LEVELS 之一
 * @param {string|null} prevId 上一题 id（避免连续重复）
 * @param {function} rng
 * @returns {{id,prompt,pcs,landmark}}
 */
export function generateTask(level, prevId = null, rng = Math.random) {
  const pool = level.tasks;
  if (pool.length <= 1) return taskById(pool[0]);
  let id, guard = 0;
  do { id = pool[Math.floor(rng() * pool.length)]; guard++; } while (id === prevId && guard < 24);
  return taskById(id);
}

/**
 * 判定玩家弹的键是否符合题目（音区无关，只看音级）。
 * @param {object} task TASKS 之一
 * @param {number} midi 玩家弹的 midi 音高
 * @returns {{correct:boolean, pc:number}}
 */
export function judge(task, midi) {
  const pc = pcOf(midi);
  return { correct: task.pcs.includes(pc), pc };
}

/**
 * 黑键地图状态机。
 * state: idle → ask（等你弹）→ right / wrong
 */
export class BlackKeyMap {
  constructor(opts = {}) {
    this.level = opts.level || BK_LEVELS[0];
    this.rng = opts.rng || Math.random;
    this.reset();
  }

  reset() {
    this.task = null;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.correct = 0;
    this.state = 'idle';   // idle | ask | right | wrong
    this.lastJudge = null;
  }

  /** 设置难度（下题生效） */
  setLevel(level) { this.level = level; }

  /** 出新题，进入 ask 状态 */
  next() {
    const prevId = this.task ? this.task.id : null;
    this.task = generateTask(this.level, prevId, this.rng);
    this.state = 'ask';
    this.lastJudge = null;
    return this.task;
  }

  /**
   * 玩家弹一个键。仅 ask 状态有效。
   * @returns {null|{correct:boolean, pc:number}}
   */
  answer(midi) {
    if (this.state !== 'ask' || !this.task) return null;
    const j = judge(this.task, midi);
    this.lastJudge = j;
    this.attempts++;
    if (j.correct) {
      this.correct++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
      this.state = 'right';
    } else {
      this.streak = 0;
      this.state = 'wrong';
    }
    return j;
  }

  /** 正确率（0..1） */
  accuracy() { return this.attempts ? this.correct / this.attempts : 0; }
}
