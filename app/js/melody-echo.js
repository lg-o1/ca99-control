/**
 * melody-echo.js — 🔁 旋律回声（Simon 式记忆游戏）纯逻辑
 *
 * 玩法：app 亮键 + 发声播放一段短旋律，你照着在琴键上弹回来。
 * 与「旋律听写」不同的是：这是一条**不断生长**的序列——
 * 复奏成功后，原序列末尾再追加一个音，越来越长，考验**耳朵 + 记忆 + 键盘地理**。
 *
 * 本文件只放可单元测试的纯逻辑（音池、序列生成、逐音比对、状态机），
 * DOM 渲染/播放动画在 app.js 的 renderMelodyEcho 里。
 */

/** 难度级别：决定可用音池（pool）与起始长度（startLen） */
export const ECHO_LEVELS = [
  // 五指位：C D E F G，零基础最友好
  { id: 'five',  name: '🟢 五指位 (C–G)',      pool: [60, 62, 64, 65, 67],                 startLen: 2 },
  // 五声音阶：没有半音冲突，怎么连都好听
  { id: 'penta', name: '🎵 五声音阶 (好听)',    pool: [60, 62, 64, 67, 69, 72],             startLen: 2 },
  // C 大调一个八度
  { id: 'oct',   name: '🟡 C大调八度',          pool: [60, 62, 64, 65, 67, 69, 71, 72],     startLen: 2 },
  // 半音挑战：含黑键，最难
  { id: 'chrom', name: '🔴 半音挑战 (含黑键)',  pool: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72], startLen: 2 },
];

/** 按 id 取级别（找不到回退第一个） */
export function levelById(id) {
  return ECHO_LEVELS.find((l) => l.id === id) || ECHO_LEVELS[0];
}

/** 从音池随机取一个音 */
export function randomNote(pool, rng = Math.random) {
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * 取下一个音：尽量避免与上一个音立即重复（更像旋律、也更难蒙对），
 * 但音池只有 1 个音或多次重试无果时允许重复。
 */
export function pickNext(prev, pool, rng = Math.random) {
  if (pool.length <= 1) return pool[0];
  let n, guard = 0;
  do { n = randomNote(pool, rng); guard++; } while (n === prev && guard < 24);
  return n;
}

/** 逐音比对：ignoreOctave 时只比音名（pitch class） */
export function noteMatch(expected, actual, ignoreOctave = true) {
  if (ignoreOctave) return (((expected % 12) + 12) % 12) === (((actual % 12) + 12) % 12);
  return expected === actual;
}

/**
 * 旋律回声状态机。
 * state: idle → showing（正在播放）→ input（轮到你）→ win（本轮全对）/ fail（弹错）
 */
export class MelodyEcho {
  constructor(opts = {}) {
    this.pool = opts.pool || ECHO_LEVELS[0].pool;
    this.startLen = opts.startLen || 2;
    this.ignoreOctave = opts.ignoreOctave !== false; // 默认忽略八度
    this.rng = opts.rng || Math.random;
    this.reset();
  }

  reset() {
    this.seq = [];        // 当前完整序列
    this.pos = 0;         // 当前等待输入的下标
    this.rounds = 0;      // 已成功复奏的轮数
    this.best = 0;        // 历史最长成功序列
    this.state = 'idle';  // idle | showing | input | win | fail
    this.lastError = null;
  }

  /** 内部：在序列尾部追加一个（尽量不与上一个重复的）音 */
  _append() {
    const prev = this.seq.length ? this.seq[this.seq.length - 1] : null;
    this.seq.push(pickNext(prev, this.pool, this.rng));
  }

  /** 开新局：生成 startLen 长的初始序列，进入 showing 状态 */
  start() {
    this.seq = [];
    this.pos = 0;
    this.rounds = 0;
    this.lastError = null;
    for (let i = 0; i < this.startLen; i++) this._append();
    this.state = 'showing';
    return this.seq.slice();
  }

  /** 播放完毕，轮到玩家输入 */
  ready() {
    this.pos = 0;
    this.state = 'input';
  }

  /** 本轮成功后生长一个音，进入下一轮的 showing 状态 */
  grow() {
    this._append();
    this.pos = 0;
    this.state = 'showing';
    return this.seq.slice();
  }

  /** 重新挑战：用同样的池重新开局（best 保留） */
  restart() {
    const best = this.best;
    this.reset();
    this.best = best;
    return this.start();
  }

  /**
   * 玩家弹一个音。仅在 input 状态有效。
   * @returns {null|{ok:boolean, done:boolean, pos:number, expected:number, actual:number, length:number, reached:number}}
   */
  play(note) {
    if (this.state !== 'input') return null;
    const expected = this.seq[this.pos];
    if (noteMatch(expected, note, this.ignoreOctave)) {
      this.pos++;
      if (this.pos >= this.seq.length) {
        this.rounds++;
        if (this.seq.length > this.best) this.best = this.seq.length;
        this.state = 'win';
        return { ok: true, done: true, pos: this.pos, expected, actual: note, length: this.seq.length, reached: this.pos };
      }
      return { ok: true, done: false, pos: this.pos, expected: this.seq[this.pos], actual: note, length: this.seq.length, reached: this.pos };
    }
    this.lastError = { expected, actual: note, pos: this.pos };
    this.state = 'fail';
    return { ok: false, done: false, pos: this.pos, expected, actual: note, length: this.seq.length, reached: this.pos };
  }
}
