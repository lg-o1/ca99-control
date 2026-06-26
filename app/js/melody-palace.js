/**
 * melody-palace.js — 🧠 旋律记忆宫殿 纯逻辑
 *
 * 与「旋律回声」(melody-echo) 不同：那是随机不断生长的序列；
 * 这是用**一首真实曲子**的旋律（小星星 / 欢乐颂 …），每轮只揭示前 N 个音，
 * 复奏成功后 N→N+1，逐音累积，**最终凭耳朵 + 记忆学会整首曲子**（不读谱）。
 *
 * 契合 Lily 听觉智能 85% 的最强项：用「听 → 弹回 → 再长一句」的方式，
 * 把一首歌一点点搬进脑子里，零读谱、纯听记。
 *
 * 本文件只放可单元测试的纯逻辑（音高提取、逐音比对、渐进状态机），
 * DOM 渲染/播放动画在 app.js 的 renderMelodyPalace 里。
 */

/** 从 [midi, beats] 或 {midi} 的 seq 中提取纯音高数组 */
export function pitchesFromSeq(seq) {
  if (!Array.isArray(seq)) return [];
  return seq
    .map((s) => (Array.isArray(s) ? s[0] : (s && typeof s === 'object' ? s.midi : s)))
    .filter((n) => typeof n === 'number' && isFinite(n));
}

/**
 * 逐音比对。
 * @param ignoreOctave 只比音名（pitch class）
 * @param semis 容差半音数（容错模式下相差 ≤semis 也算对）
 */
export function noteMatch(expected, actual, ignoreOctave = true, semis = 0) {
  if (ignoreOctave) {
    const pcE = (((expected % 12) + 12) % 12);
    const pcA = (((actual % 12) + 12) % 12);
    let d = Math.abs(pcE - pcA);
    d = Math.min(d, 12 - d);
    return d <= semis;
  }
  return Math.abs(expected - actual) <= semis;
}

/**
 * 旋律记忆宫殿状态机。
 * 用固定的真实旋律 `melody`（midi 数组），逐轮揭示 revealLen 个音。
 * state: idle → showing（正在播放前 revealLen 个音）→ input（轮到你照弹）
 *        → win（本轮全对，未到结尾）/ mastered（全对且揭示到曲尾）/ fail（弹错）
 */
export class MelodyPalace {
  constructor(melody, opts = {}) {
    this.melody = (melody || []).slice();
    this.startLen = Math.max(1, opts.startLen || 3);
    this.growBy = Math.max(1, opts.grow || 1);            // 每复奏成功生长几个音
    this.ignoreOctave = opts.ignoreOctave !== false;      // 默认忽略八度
    this.tolerant = !!opts.tolerant;                      // 容错模式
    this.semis = this.tolerant ? (opts.semis == null ? 1 : opts.semis) : 0;
    this.reset();
  }

  reset() {
    this.revealLen = Math.min(this.startLen, this.melody.length) || 0;
    this.pos = 0;          // 当前等待输入的下标
    this.rounds = 0;       // 已成功复奏的轮数
    this.best = 0;         // 历史最长连续正确（达到的 pos）
    this.state = this.melody.length ? 'showing' : 'idle';
    this.lastError = null;
  }

  /** 本轮要播放/复奏的乐句（前 revealLen 个音） */
  current() {
    return this.melody.slice(0, this.revealLen);
  }

  /** 播放完毕，轮到玩家从头复奏 */
  ready() {
    this.pos = 0;
    this.state = 'input';
  }

  /** 玩家弹一个音，仅在 input 状态有效 */
  play(note) {
    if (this.state !== 'input') return null;
    const expected = this.melody[this.pos];
    if (noteMatch(expected, note, this.ignoreOctave, this.semis)) {
      this.pos++;
      if (this.pos > this.best) this.best = this.pos;
      if (this.pos >= this.revealLen) {
        this.rounds++;
        const whole = this.revealLen >= this.melody.length;
        this.state = whole ? 'mastered' : 'win';
        return { ok: true, done: true, whole, pos: this.pos, expected, actual: note, revealLen: this.revealLen, total: this.melody.length };
      }
      return { ok: true, done: false, whole: false, pos: this.pos, expected: this.melody[this.pos], actual: note, revealLen: this.revealLen, total: this.melody.length };
    }
    this.lastError = { expected, actual: note, pos: this.pos };
    this.state = 'fail';
    return { ok: false, done: false, whole: false, pos: this.pos, expected, actual: note, revealLen: this.revealLen, total: this.melody.length };
  }

  /** 本轮成功 → 生长，进入下一轮 showing（已到曲尾则保持 mastered 不再生长） */
  advance() {
    if (this.revealLen >= this.melody.length) {
      this.state = 'mastered';
      return this.current();
    }
    this.revealLen = Math.min(this.melody.length, this.revealLen + this.growBy);
    this.pos = 0;
    this.state = 'showing';
    return this.current();
  }

  /** 弹错后重试本轮（不生长，回到 showing） */
  retry() {
    this.pos = 0;
    this.state = 'showing';
    this.lastError = null;
    return this.current();
  }

  /** 掌握进度 0..1（按已揭示长度 / 全曲长度） */
  progress() {
    return this.melody.length ? this.revealLen / this.melody.length : 0;
  }
}
