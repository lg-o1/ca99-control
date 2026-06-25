/**
 * pitch-direction.js — ↕️ 高低音方向感（零基础音高方向启蒙）纯逻辑
 *
 * 玩法：app 弹一个**参考音**，并出一个方向提示（⬆️ 更高 / ⬇️ 更低）。
 * 你在**真实琴键**上随便弹一个音——只要方向对（比参考音更高 / 更低，且差得够明显）就算对。
 * 答对了连击 +1，难度会让"够明显"的门槛越来越小（大跳 → 小步），越来越考验耳朵。
 *
 * 这是给**完全零基础**的孩子练「高的音在右边、低的音在左边」「这个音比那个高还是低」的第一课，
 * 是「找中央 C / 音区认知」的姊妹篇：那个练绝对位置，这个练**相对高低方向**。
 *
 * 关键设计：
 *  - 不要求弹某个特定音——**任何**满足方向 + 最小音程的音都算对（鼓励探索，不怕弹错）。
 *  - 判定纯看 played - ref 的符号与绝对值，速度/音色无关。
 *
 * 本文件只放可单元测试的纯逻辑（关卡、出题、判定、状态机），
 * DOM 播放/亮键/采集在 app.js 的 renderPitchDirection 里。
 */

/**
 * 难度级别：minGap = 算"对"所需的最小音程（半音）。
 * 数字越小越难（要求你能分辨更接近的高低）。refLo/refHi 限定参考音范围，
 * 留出足够空间让两个方向都能弹得出来。
 */
export const PD_LEVELS = [
  { id: 'octave', name: '🟢 大跳 (≥八度)', minGap: 12, refLo: 55, refHi: 79 },
  { id: 'fifth',  name: '🎵 五度上下',     minGap: 7,  refLo: 52, refHi: 81 },
  { id: 'third',  name: '🟡 三度上下',     minGap: 4,  refLo: 50, refHi: 83 },
  { id: 'step',   name: '🔴 一步之遥',     minGap: 2,  refLo: 48, refHi: 84 },
];

/** 按 id 取级别（找不到回退第一个） */
export function levelById(id) {
  return PD_LEVELS.find((l) => l.id === id) || PD_LEVELS[0];
}

/** 方向 → 中文/箭头 */
export function dirName(dir) {
  return dir === 'up' ? '⬆️ 更高' : '⬇️ 更低';
}

/**
 * 出一道题：在 [refLo, refHi] 里挑一个参考音，并随机一个方向。
 * 为保证该方向至少存在一个合法答案，会把参考音夹在能留出 minGap 空间的范围内。
 * @param {object} level PD_LEVELS 之一
 * @param {function} rng
 * @returns {{ref:number, dir:'up'|'down', minGap:number}}
 */
export function generatePrompt(level, rng = Math.random) {
  const dir = rng() < 0.5 ? 'up' : 'down';
  // 键盘可用范围（与 88 键一致：21..108），留出 minGap 的余量
  const KB_LO = 21, KB_HI = 108;
  let lo = level.refLo, hi = level.refHi;
  if (dir === 'up') hi = Math.min(hi, KB_HI - level.minGap);     // 参考音不能太高，否则没有更高的合法音
  else lo = Math.max(lo, KB_LO + level.minGap);                  // 参考音不能太低，否则没有更低的合法音
  if (hi < lo) hi = lo;
  const ref = lo + Math.floor(rng() * (hi - lo + 1));
  return { ref, dir, minGap: level.minGap };
}

/**
 * 判定玩家弹的音是否满足题目方向 + 最小音程。
 * @param {number} ref 参考音
 * @param {number} played 玩家弹的音
 * @param {'up'|'down'} dir 题目方向
 * @param {number} minGap 最小音程（半音）
 * @returns {{correct:boolean, gap:number, rightDir:boolean, enough:boolean}}
 *   gap = played - ref（正=更高，负=更低）；rightDir=方向对；enough=幅度够。
 */
export function judgeDirection(ref, played, dir, minGap) {
  const gap = played - ref;
  const rightDir = dir === 'up' ? gap > 0 : gap < 0;
  const enough = Math.abs(gap) >= minGap;
  return { correct: rightDir && enough, gap, rightDir, enough };
}

/**
 * 高低音方向感状态机。
 * state: idle → playing（正在放参考音）→ answer（轮到你弹）→ right / wrong
 */
export class PitchDirection {
  constructor(opts = {}) {
    const lv = opts.level || PD_LEVELS[0];
    this.level = lv;
    this.rng = opts.rng || Math.random;
    this.reset();
  }

  reset() {
    this.prompt = null;   // {ref, dir, minGap}
    this.streak = 0;      // 当前连击
    this.best = 0;        // 最佳连击
    this.attempts = 0;    // 总出题数
    this.correct = 0;     // 答对数
    this.state = 'idle';  // idle | playing | answer | right | wrong
    this.lastJudge = null;
  }

  /** 设置难度（下题生效） */
  setLevel(level) { this.level = level; }

  /** 出新题，进入 playing 状态 */
  next() {
    this.prompt = generatePrompt(this.level, this.rng);
    this.state = 'playing';
    this.lastJudge = null;
    return this.prompt;
  }

  /** 参考音放完，轮到玩家弹 */
  ready() {
    if (this.state === 'playing') this.state = 'answer';
  }

  /**
   * 玩家弹了一个音。仅 answer 状态有效。
   * @returns {null|object} judgeDirection 结果
   */
  answer(played) {
    if (this.state !== 'answer' || !this.prompt) return null;
    const j = judgeDirection(this.prompt.ref, played, this.prompt.dir, this.prompt.minGap);
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
