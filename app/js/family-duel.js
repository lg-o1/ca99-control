/**
 * family-duel.js — 👯 双人对战（家庭对战，纯逻辑，可测试）
 *
 * 把练琴变成<b>亲子互动</b>：两位玩家（如 👧 Lily / 👨 爸爸 / 👩 妈妈）<b>轮流上场</b>，
 * 每回合照着给定的音符序列弹，弹对一个得 1 分；几个回合下来比总分。
 * 命中家庭「连接」核心价值——不是孤独练习，而是一起玩。
 *
 * 鼓励向：弹错<b>不扣分</b>（只是不得分），结束时<b>两人都祝贺</b>、强调合作总分，
 * 平局也有专门文案。所有随机由调用方注入序列，便于单元测试。
 */

/** 默认对战双方 */
export const DEFAULT_PLAYERS = [
  { name: 'Lily', emoji: '👧', color: '#f472b6' },
  { name: '爸爸', emoji: '👨', color: '#38bdf8' },
];

/** 音名（用于八度无关比较） */
export function pitchClass(midi) { return ((midi % 12) + 12) % 12; }

export class FamilyDuel {
  /**
   * @param {object} opts
   * @param {Array<{name,emoji,color}>} opts.players  对战双方（默认 Lily / 爸爸）
   * @param {number} opts.rounds        每人回合数（默认 3）
   * @param {boolean} opts.octaveAgnostic 是否忽略八度（默认 true）
   */
  constructor(opts = {}) {
    this.players = (opts.players && opts.players.length >= 2) ? opts.players.slice(0, 2) : DEFAULT_PLAYERS;
    this.rounds = opts.rounds || 3;
    this.octaveAgnostic = opts.octaveAgnostic !== false;
    // 轮次顺序：玩家0、玩家1 交替，各 rounds 次 → [0,1,0,1,...]
    this.turnOrder = [];
    for (let r = 0; r < this.rounds; r++) for (let p = 0; p < this.players.length; p++) this.turnOrder.push(p);
    this.reset();
  }

  reset() {
    this.turnIndex = 0;
    this.scores = this.players.map(() => 0);     // 累计分
    this.turnScores = [];                         // 每个回合得分（与 turnOrder 对齐）
    this.seq = [];                                // 当前回合的目标音序列
    this.pos = 0;                                 // 当前回合已弹对个数
    this.turnHits = 0;
    this.turnMiss = 0;
  }

  /** 当前上场玩家下标（结束后返回 null） */
  get currentPlayer() {
    return this.isOver() ? null : this.turnOrder[this.turnIndex];
  }

  /** 当前玩家进行到自己的第几回合（1-based，用于显示） */
  roundNumber() {
    if (this.isOver()) return this.rounds;
    const p = this.currentPlayer;
    let c = 0;
    for (let i = 0; i <= this.turnIndex; i++) if (this.turnOrder[i] === p) c++;
    return c;
  }

  /** 总回合数 / 已完成回合数 */
  get totalTurns() { return this.turnOrder.length; }

  /** 开始当前回合：设置目标音序列 */
  startTurn(seq) {
    this.seq = seq.slice();
    this.pos = 0;
    this.turnHits = 0;
    this.turnMiss = 0;
  }

  _match(a, b) {
    return this.octaveAgnostic ? pitchClass(a) === pitchClass(b) : a === b;
  }

  /** 当前要弹的目标音（无则 null） */
  current() { return this.pos < this.seq.length ? this.seq[this.pos] : null; }

  /**
   * 当前玩家弹一个音。
   * @returns {{hit:boolean, done:boolean, turnScore:number}}
   *  弹对 → 前进 + 当前玩家 +1 分；弹错 → 不扣分（turnMiss++）。
   *  done=true 表示本回合序列弹完（调用方随后应调 endTurn）。
   */
  press(midi) {
    if (this.isOver() || !this.seq.length) return { hit: false, done: false, turnScore: this.turnHits };
    const want = this.current();
    if (want != null && this._match(midi, want)) {
      this.pos += 1;
      this.turnHits += 1;
      this.scores[this.currentPlayer] += 1;
      const done = this.pos >= this.seq.length;
      return { hit: true, done, turnScore: this.turnHits };
    }
    this.turnMiss += 1;
    return { hit: false, done: false, turnScore: this.turnHits };
  }

  /** 结束当前回合：记录回合分、切换到下一位玩家/回合 */
  endTurn() {
    if (this.isOver()) return;
    this.turnScores.push({ player: this.currentPlayer, score: this.turnHits, miss: this.turnMiss });
    this.turnIndex += 1;
    this.seq = [];
    this.pos = 0;
    this.turnHits = 0;
    this.turnMiss = 0;
  }

  /** 对战是否结束 */
  isOver() { return this.turnIndex >= this.turnOrder.length; }

  /** 进度 0..1 */
  progress() { return this.totalTurns ? this.turnIndex / this.totalTurns : 0; }

  /** 各玩家总分 */
  totals() { return this.scores.slice(); }

  /** 合作总分（两人相加，强调一起玩） */
  teamTotal() { return this.scores.reduce((a, b) => a + b, 0); }

  /**
   * 胜负结果。
   * @returns {{tie:boolean, winner:number|null, scores:number[]}}
   */
  result() {
    const s = this.scores;
    const max = Math.max(...s);
    const leaders = s.map((v, i) => (v === max ? i : -1)).filter((i) => i >= 0);
    if (leaders.length !== 1) return { tie: true, winner: null, scores: s.slice() };
    return { tie: false, winner: leaders[0], scores: s.slice() };
  }
}
