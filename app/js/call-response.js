/**
 * call-response.js — 🎼 即兴问答（Call & Response 旋律接龙）纯逻辑
 *
 * 玩法：app 弹一句「问句」（一段开放的、不落在主音上的短旋律，听起来"还没说完"），
 * 你在琴上即兴弹一句「答句」回应。与「旋律回声」「旋律听写」不同——
 * 这里**不要求照抄**，而是按"音乐性"打分：
 *   ① 答句尽量留在音阶里（不跑调）
 *   ② 最后落回**主音**（= 回家🏠，给人"说完了"的收束感）
 *   ③ 有合理长度、有高低起伏（不是杵着一个音）
 * 鼓励**即兴 / 乐句感 / 音阶地理**，零基础也能自由发挥、怎么弹都不算"错"，只看更音乐与否。
 *
 * 本文件只放可单元测试的纯逻辑（音阶/主音、问句生成、答句评分、状态机），
 * DOM 渲染/播放动画在 app.js 的 renderCallResponse 里。
 */

/** pitch class（0–11） */
export function pc(midi) { return (((midi % 12) + 12) % 12); }

/**
 * 难度级别：每个级别一个音阶（pool）+ 主音（tonic, 用 MIDI 表示其 pitch class）+ 问句长度。
 * 五声音阶最友好（怎么连都好听），大调其次，小调带一点忧郁色彩。
 */
export const CR_LEVELS = [
  { id: 'pentaC', name: '🟢 C 五声音阶 (最好听)', pool: [60, 62, 64, 67, 69, 72], tonic: 60, qlen: 3 },
  { id: 'majC',   name: '🎵 C 大调',             pool: [60, 62, 64, 65, 67, 69, 71, 72], tonic: 60, qlen: 3 },
  { id: 'majG',   name: '🟡 G 大调',             pool: [67, 69, 71, 72, 74, 76, 78, 79], tonic: 67, qlen: 4 },
  { id: 'minA',   name: '🔵 a 小调 (忧郁)',       pool: [69, 71, 72, 74, 76, 77, 79, 81], tonic: 69, qlen: 4 },
];

/** 按 id 取级别（找不到回退第一个） */
export function levelById(id) {
  return CR_LEVELS.find((l) => l.id === id) || CR_LEVELS[0];
}

/** 从音池随机取一个音 */
export function randomNote(pool, rng = Math.random) {
  return pool[Math.floor(rng() * pool.length)];
}

/** 取下一个音，尽量避免与上一个立即重复（更像旋律） */
export function pickNext(prev, pool, rng = Math.random) {
  if (pool.length <= 1) return pool[0];
  let n, guard = 0;
  do { n = randomNote(pool, rng); guard++; } while (n === prev && guard < 24);
  return n;
}

/**
 * 生成一句「问句」：在音阶内取 len 个音，并保证**末音不是主音**——
 * 这样听起来"悬着、没说完"，自然召唤一句落回主音的答句。
 */
export function generateQuestion(pool, tonic, len, rng = Math.random) {
  const tpc = pc(tonic);
  const seq = [];
  let prev = null;
  for (let i = 0; i < len; i++) {
    let n = pickNext(prev, pool, rng);
    // 末音落在主音上就换一个非主音的音（让问句保持开放）
    if (i === len - 1 && pc(n) === tpc) {
      const alt = pool.filter((x) => pc(x) !== tpc && x !== prev);
      if (alt.length) n = alt[Math.floor(rng() * alt.length)];
    }
    seq.push(n);
    prev = n;
  }
  return seq;
}

/**
 * 给「答句」打分（纯函数，便于测试）。
 * @param {number[]} answer 玩家弹的音（MIDI）
 * @param {{pool:number[], tonic:number}} ctx 当前音阶与主音
 * @returns {{
 *   total:number, inScaleCount:number, inScaleRatio:number,
 *   resolvesHome:boolean, hasContour:boolean, distinctPcs:number,
 *   lengthOk:boolean, score:number, stars:number
 * }}
 */
export function scoreAnswer(answer, ctx) {
  const pool = ctx.pool || [];
  const tpc = pc(ctx.tonic);
  const scalePcs = new Set(pool.map(pc));
  const total = answer.length;
  if (total === 0) {
    return { total: 0, inScaleCount: 0, inScaleRatio: 0, resolvesHome: false, hasContour: false, distinctPcs: 0, lengthOk: false, score: 0, stars: 0 };
  }
  const inScaleCount = answer.reduce((a, n) => a + (scalePcs.has(pc(n)) ? 1 : 0), 0);
  const inScaleRatio = inScaleCount / total;
  const resolvesHome = pc(answer[total - 1]) === tpc;
  const distinctPcs = new Set(answer.map(pc)).size;
  const hasContour = distinctPcs >= 2;
  const lengthOk = total >= 2 && total <= 16;

  // 权重：留在音阶 40 + 落回主音 30 + 合理长度 15 + 有起伏 15
  const score = Math.round(inScaleRatio * 40 + (resolvesHome ? 30 : 0) + (lengthOk ? 15 : 0) + (hasContour ? 15 : 0));
  let stars = 0;
  if (score >= 85) stars = 3; else if (score >= 60) stars = 2; else if (score >= 35) stars = 1;
  return { total, inScaleCount, inScaleRatio, resolvesHome, hasContour, distinctPcs, lengthOk, score, stars };
}

/** 把评分变成一句鼓励/提示文案（最薄弱的一项给建议） */
export function feedbackFor(s) {
  if (s.total === 0) return '还没弹呢～随便在音阶里弹几个音，最后落回主音试试 🏠';
  if (s.stars === 3) return '🌟 太有乐感了！留在音阶里，又漂亮地落回了家（主音）';
  const tips = [];
  if (s.inScaleRatio < 1) tips.push('有几个音跑出音阶了，多用高亮的那些键');
  if (!s.resolvesHome) tips.push('试着**最后落回主音**（家🏠），收束感会更强');
  if (!s.hasContour) tips.push('加点高低起伏，别老停在一个音上');
  if (!s.lengthOk) tips.push('答句太短啦，至少弹 2 个音');
  if (!tips.length) return '不错！再多一点变化会更出彩 ✨';
  return '💡 ' + tips[0];
}

/**
 * 即兴问答状态机。
 * state: idle → question（正在播放问句）→ answer（轮到你即兴）→ scored（已评分）
 */
export class CallResponse {
  constructor(opts = {}) {
    this.pool = opts.pool || CR_LEVELS[0].pool;
    this.tonic = opts.tonic != null ? opts.tonic : CR_LEVELS[0].tonic;
    this.qlen = opts.qlen || 3;
    this.rng = opts.rng || Math.random;
    this.reset();
  }

  reset() {
    this.question = [];
    this.answer = [];
    this.rounds = 0;     // 已完成的问答轮数
    this.best = 0;       // 历史最高分
    this.bestStars = 0;  // 历史最高星级
    this.last = null;    // 最近一次评分结果
    this.state = 'idle'; // idle | question | answer | scored
  }

  /** 出一句新问句，进入 question（播放）状态 */
  newQuestion() {
    this.question = generateQuestion(this.pool, this.tonic, this.qlen, this.rng);
    this.answer = [];
    this.last = null;
    this.state = 'question';
    return this.question.slice();
  }

  /** 问句播放完毕，轮到玩家即兴 */
  beginAnswer() {
    this.answer = [];
    this.state = 'answer';
  }

  /** 记录玩家弹的一个音（仅 answer 状态有效） */
  record(note) {
    if (this.state !== 'answer') return false;
    this.answer.push(note);
    return true;
  }

  /** 结束答句并评分（仅 answer 状态有效），返回评分对象；更新 best/rounds */
  finishAnswer() {
    if (this.state !== 'answer') return null;
    const s = scoreAnswer(this.answer, { pool: this.pool, tonic: this.tonic });
    this.last = s;
    this.rounds++;
    if (s.score > this.best) this.best = s.score;
    if (s.stars > this.bestStars) this.bestStars = s.stars;
    this.state = 'scored';
    return s;
  }
}
