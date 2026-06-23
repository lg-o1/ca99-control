/**
 * melody-dictation.js — 旋律听写（melody dictation）纯逻辑引擎
 *
 * 引擎随机生成一段在某调音阶内的短旋律，UI 播放给用户听，用户在琴键上把它复奏出来。
 * 引擎逐音校验复奏（支持忽略八度），统计每条旋律的对错、连击与得分。
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM——只生成旋律（MIDI 音符序列）并校验输入，
 * 方便确定性单元测试（注入 rng）。播放与采集交给 UI。
 */

/** 大调音阶半音步进（相对主音） */
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
/** 自然小调音阶半音步进 */
export const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/** 预置调：主音 MIDI（以 C4=60 一组）+ 名称 */
export const KEYS = [
  { id: 'C', name: 'C 大调', tonic: 60, scale: 'major' },
  { id: 'G', name: 'G 大调', tonic: 67, scale: 'major' },
  { id: 'F', name: 'F 大调', tonic: 65, scale: 'major' },
  { id: 'D', name: 'D 大调', tonic: 62, scale: 'major' },
  { id: 'Am', name: 'A 小调', tonic: 57, scale: 'minor' },
  { id: 'Em', name: 'E 小调', tonic: 64, scale: 'minor' },
];

/** 取某调的音阶步进表 */
export function scaleSteps(scale) {
  return scale === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
}

/**
 * 把"音阶级数"（0=主音，7=高八度主音，可为负）映射成 MIDI 音符。
 * 支持跨八度：degree 7 = 主音 + 12，degree -1 = 下方七级。
 */
export function degreeToMidi(tonic, scale, degree) {
  const steps = scaleSteps(scale);
  const n = steps.length; // 7
  const oct = Math.floor(degree / n);
  let idx = degree % n;
  if (idx < 0) idx += n;
  return tonic + oct * 12 + steps[idx];
}

/** 两个 MIDI 音是否同一音名（忽略八度） */
export function samePitchClass(a, b) {
  return ((a % 12) + 12) % 12 === ((b % 12) + 12) % 12;
}

export class MelodyDictation {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng        随机源（默认 Math.random）
   * @param {object} opts.key              调对象（默认 C 大调）
   * @param {number} opts.length           旋律音符数（默认 4）
   * @param {number} opts.span             级数活动范围（默认 ±4 级，含主音上下行）
   * @param {boolean} opts.octaveAgnostic  复奏时是否忽略八度（默认 true，适合初学）
   * @param {boolean} opts.startOnTonic    首音是否固定为主音（默认 true，给个锚点）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.key = opts.key || KEYS[0];
    this.length = Math.max(2, opts.length || 4);
    this.span = opts.span || 4;
    this.octaveAgnostic = opts.octaveAgnostic !== false;
    this.startOnTonic = opts.startOnTonic !== false;

    this.melody = [];     // 当前题目的 MIDI 音符序列
    this.pos = 0;         // 复奏到第几个音
    this.mistakes = 0;    // 当前题目复奏错误次数
    this.score = 0;       // 累计答对的旋律条数
    this.attempts = 0;    // 累计出题条数
    this.streak = 0;
    this.best = 0;
    this.onNew = () => {};
    this.onProgress = () => {}; // (pos, total) 复奏进度
    this.onResult = () => {};   // (correct, {melody, mistakes, score, streak})
  }

  _randDegree() {
    // 在 [-span, span] 内随机取一个级数
    const range = this.span * 2 + 1;
    return Math.floor(this.rng() * range) - this.span;
  }

  /** 生成下一条旋律，返回 MIDI 音符数组并触发 onNew */
  next() {
    const notes = [];
    let prevDeg = 0;
    for (let i = 0; i < this.length; i++) {
      let deg;
      if (i === 0 && this.startOnTonic) {
        deg = 0;
      } else {
        deg = this._randDegree();
        // 避免与上一个音同度（让旋律有走向），最多重试几次
        let guard = 0;
        while (deg === prevDeg && guard < 6) { deg = this._randDegree(); guard++; }
      }
      prevDeg = deg;
      notes.push(degreeToMidi(this.key.tonic, this.key.scale, deg));
    }
    this.melody = notes;
    this.pos = 0;
    this.mistakes = 0;
    this.onNew(notes.slice());
    return notes.slice();
  }

  /** 当前期望复奏的下一个音（已复奏完返回 null） */
  expected() {
    return this.pos < this.melody.length ? this.melody[this.pos] : null;
  }

  _match(played, want) {
    return this.octaveAgnostic ? samePitchClass(played, want) : played === want;
  }

  /**
   * 喂入一个复奏音符。返回：
   *   { ok:true,  done:false, pos }        对了，继续
   *   { ok:true,  done:true,  correct:true } 整条复奏完成且全对
   *   { ok:false, expected }               错了（不前进）
   *   null                                 当前没有进行中的题目
   */
  play(note) {
    if (!this.melody.length || this.pos >= this.melody.length) return null;
    const want = this.melody[this.pos];
    if (this._match(note, want)) {
      this.pos++;
      this.onProgress(this.pos, this.melody.length);
      if (this.pos >= this.melody.length) {
        // 整条复奏成功
        this.attempts++;
        const perfect = this.mistakes === 0;
        if (perfect) { this.score++; this.streak++; if (this.streak > this.best) this.best = this.streak; }
        else { this.streak = 0; }
        this.onResult(true, { melody: this.melody.slice(), mistakes: this.mistakes, score: this.score, streak: this.streak });
        return { ok: true, done: true, correct: true, mistakes: this.mistakes };
      }
      return { ok: true, done: false, pos: this.pos };
    }
    // 复奏错误：不前进，计一次错
    this.mistakes++;
    this.onResult(false, { expected: want, played: note, mistakes: this.mistakes });
    return { ok: false, expected: want, played: note };
  }

  /** 放弃当前题（算一次尝试、连击清零，不计分） */
  giveUp() {
    if (!this.melody.length) return;
    this.attempts++;
    this.streak = 0;
    const m = this.melody.slice();
    this.melody = [];
    this.pos = 0;
    this.onResult(false, { melody: m, gaveUp: true, score: this.score, streak: this.streak });
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }

  reset() {
    this.melody = []; this.pos = 0; this.mistakes = 0;
    this.score = 0; this.attempts = 0; this.streak = 0; this.best = 0;
  }
}
