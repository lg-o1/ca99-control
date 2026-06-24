/**
 * sight-phrase.js — 乐句视奏（phrase sight-reading）纯逻辑引擎
 *
 * 钢琴最核心的读谱技能：屏幕给一句【标准五线谱】记谱的短旋律（带节奏、调号），
 * 玩家照着谱在键盘上【逐音弹出来】——这是真正的"视奏"。
 *
 * 和现有模块都不同：
 *   - 视奏闪卡 sight-reading：一次只认/弹【一个音】，没有节奏与乐句感
 *   - 五线谱识谱卡 staff-read：看谱只【说音名】，不弹
 *   - 旋律听写 melody-dictation：靠【耳朵】听旋律复奏，谱面不显示
 *   - 曲谱跟弹 score-follow：音符像 Synthesia【下落】并【计时】判分
 *   这里练的是【看着真正的五线谱、按自己的节奏把一整句弹出来】——脱离听觉、
 *   脱离下落提示，纯靠读谱，是识谱迈向流畅演奏的关键一步。
 *
 * 引擎职责（纯逻辑，不碰 Web Audio / MIDI / DOM）：
 *   1) 生成一句"可读、好听"的调内旋律：以级进为主、首尾落在主音、活动范围克制；
 *   2) 配上节奏（每个音的时值，按难度从四分/二分/八分/附点里取，按小节填满）；
 *   3) 提供调号信息（升降号顺序与个数）供 UI 画谱；
 *   4) 逐音校验玩家弹奏（可忽略八度），统计对错/连击/得分。
 * 播放与谱面绘制交给 UI。注入 rng 便于确定性测试。
 */

/** 大调音阶半音步进（相对主音） */
export const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
/** 自然小调音阶半音步进 */
export const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

/** 调号里升号出现的字母顺序（F C G D A E B） */
export const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
/** 调号里降号出现的字母顺序（B E A D G C F） */
export const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

/**
 * 预置调：主音 MIDI（以 C4=60 一组）+ 调式 + 调号（升/降号个数）。
 * 选这些常见、读谱友好的调（升降号 ≤2）。
 */
export const KEYS = [
  { id: 'C',  name: 'C 大调',  tonic: 60, scale: 'major', sig: { type: 'none',  count: 0 } },
  { id: 'G',  name: 'G 大调',  tonic: 67, scale: 'major', sig: { type: 'sharp', count: 1 } },
  { id: 'D',  name: 'D 大调',  tonic: 62, scale: 'major', sig: { type: 'sharp', count: 2 } },
  { id: 'F',  name: 'F 大调',  tonic: 65, scale: 'major', sig: { type: 'flat',  count: 1 } },
  { id: 'Bb', name: 'B♭ 大调', tonic: 70, scale: 'major', sig: { type: 'flat',  count: 2 } },
  { id: 'Am', name: 'A 小调',  tonic: 57, scale: 'minor', sig: { type: 'none',  count: 0 } },
  { id: 'Em', name: 'E 小调',  tonic: 64, scale: 'minor', sig: { type: 'sharp', count: 1 } },
  { id: 'Dm', name: 'D 小调',  tonic: 62, scale: 'minor', sig: { type: 'flat',  count: 1 } },
];

/** id -> 调对象 */
export function keyById(id) { return KEYS.find((k) => k.id === id) || KEYS[0]; }

/** 取某调式的音阶步进表 */
export function scaleSteps(scale) {
  return scale === 'minor' ? MINOR_STEPS : MAJOR_STEPS;
}

/**
 * 调号里需要画的升/降号字母列表（按标准顺序，长度=个数）。
 * @param {object} sig {type:'sharp'|'flat'|'none', count}
 * @returns {{type:string, letters:string[]}}
 */
export function keySignatureAccidentals(sig) {
  if (!sig || sig.type === 'none' || !sig.count) return { type: 'none', letters: [] };
  const order = sig.type === 'sharp' ? SHARP_ORDER : FLAT_ORDER;
  return { type: sig.type, letters: order.slice(0, Math.min(sig.count, 7)) };
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

/** 难度 -> 允许的时值（拍）。值越小越短：0.5=八分，1=四分，1.5=附点四分，2=二分。 */
export const RHYTHM_LEVELS = {
  easy:   [1, 2],
  medium: [0.5, 1, 2],
  hard:   [0.5, 1, 1.5, 2],
};

/** 时值（拍）-> 记谱信息（音符头是否实心、是否带符尾旗、附点） */
export function durGlyph(dur) {
  if (dur >= 4) return { filled: false, stem: false, flags: 0, dotted: false };   // 全
  if (dur >= 3) return { filled: false, stem: true,  flags: 0, dotted: true };    // 附点二分
  if (dur >= 2) return { filled: false, stem: true,  flags: 0, dotted: false };   // 二分
  if (dur >= 1.5) return { filled: true, stem: true,  flags: 0, dotted: true };   // 附点四分
  if (dur >= 1) return { filled: true,  stem: true,  flags: 0, dotted: false };   // 四分
  if (dur >= 0.75) return { filled: true, stem: true, flags: 1, dotted: true };   // 附点八分
  return { filled: true, stem: true, flags: 1, dotted: false };                   // 八分
}

export class SightPhrase {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng        随机源（默认 Math.random）
   * @param {object} opts.key              调对象（默认 C 大调）
   * @param {number} opts.measures         小节数（默认 2）
   * @param {number} opts.meter            每小节拍数（默认 4）
   * @param {string} opts.rhythm           'easy'|'medium'|'hard'（默认 easy）
   * @param {boolean} opts.octaveAgnostic  弹奏校验是否忽略八度（默认 true，适合初学）
   * @param {number} opts.lowDegree        旋律级数下限（默认 -1，主音下方一点）
   * @param {number} opts.highDegree       旋律级数上限（默认 8，主音上方八度+）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.key = opts.key || KEYS[0];
    this.measures = Math.max(1, opts.measures || 2);
    this.meter = Math.max(2, opts.meter || 4);
    this.rhythm = RHYTHM_LEVELS[opts.rhythm] ? opts.rhythm : 'easy';
    this.octaveAgnostic = opts.octaveAgnostic !== false;
    this.lowDegree = opts.lowDegree ?? -1;
    this.highDegree = opts.highDegree ?? 8;

    this.phrase = [];     // 当前题目：[{midi, degree, beat, dur}]
    this.pos = 0;         // 弹到第几个音
    this.mistakes = 0;    // 当前题弹错次数
    this.score = 0;       // 累计"整句一次弹对"的条数
    this.attempts = 0;    // 累计出题条数
    this.streak = 0;
    this.best = 0;
    this.onNew = () => {};
    this.onProgress = () => {};  // (pos, total)
    this.onResult = () => {};    // (correct, info)
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 生成一小节节奏（时值数组，和恰为 meter 拍）。八分尽量成对出现。 */
  _genMeasureRhythm() {
    const allowed = RHYTHM_LEVELS[this.rhythm];
    const out = [];
    let rem = this.meter;
    let guard = 0;
    while (rem > 1e-6 && guard < 64) {
      guard++;
      const fits = allowed.filter((d) => d <= rem + 1e-6);
      if (!fits.length) { out.push(rem); break; }
      let d = this._pick(fits);
      // 八分（0.5）尽量成对：若选到 0.5 且剩余 ≥1，补成一对
      if (Math.abs(d - 0.5) < 1e-6 && rem >= 1 - 1e-6) {
        out.push(0.5); out.push(0.5); rem -= 1; continue;
      }
      out.push(d); rem -= d;
    }
    return out;
  }

  /** 在 [low, high] 级数范围内做"以级进为主"的随机走步，返回下一个级数。 */
  _nextDegree(prev) {
    const r = this.rng();
    let step;
    if (r < 0.62) step = (this.rng() < 0.5 ? 1 : -1);        // 级进
    else if (r < 0.88) step = (this.rng() < 0.5 ? 2 : -2);   // 三度小跳
    else step = (this.rng() < 0.5 ? 3 : -3);                 // 四度跳
    let deg = prev + step;
    if (deg < this.lowDegree) deg = prev + Math.abs(step);
    if (deg > this.highDegree) deg = prev - Math.abs(step);
    if (deg < this.lowDegree || deg > this.highDegree) deg = prev; // 兜底
    return deg;
  }

  /** 生成下一句旋律，返回音符数组并触发 onNew。 */
  next() {
    // 1) 节奏：逐小节填满
    const durs = [];
    for (let m = 0; m < this.measures; m++) durs.push(...this._genMeasureRhythm());
    const N = durs.length;

    // 2) 级数走步：首音主音(0)、尾音落主音(0)、倒数第二个音级进到主音（终止感）
    const degs = new Array(N);
    degs[0] = 0;
    for (let i = 1; i < N; i++) degs[i] = this._nextDegree(degs[i - 1]);
    if (N >= 1) degs[N - 1] = 0;
    if (N >= 2) {
      // 倒数第二个音改成主音的上/下邻音（2 级或 7 级），制造级进收束
      degs[N - 2] = (this.rng() < 0.5) ? 1 : -1;
    }

    // 3) 级数 + 节奏 -> 音符（含拍位）
    const notes = [];
    let beat = 0;
    for (let i = 0; i < N; i++) {
      notes.push({
        midi: degreeToMidi(this.key.tonic, this.key.scale, degs[i]),
        degree: degs[i], beat, dur: durs[i],
      });
      beat += durs[i];
    }
    this.phrase = notes;
    this.totalBeats = beat;
    this.pos = 0;
    this.mistakes = 0;
    this.onNew(notes.slice());
    return notes.slice();
  }

  /** 当前期望弹的下一个音（已弹完返回 null） */
  expected() {
    return this.pos < this.phrase.length ? this.phrase[this.pos].midi : null;
  }

  _match(played, want) {
    return this.octaveAgnostic ? samePitchClass(played, want) : played === want;
  }

  /**
   * 喂入一个弹奏音符。返回：
   *   { ok:true,  done:false, pos }          对了，继续
   *   { ok:true,  done:true,  correct:true } 整句弹完且全对
   *   { ok:false, expected }                 错了（不前进，计一次错）
   *   null                                   当前没有进行中的题目
   */
  play(note) {
    if (!this.phrase.length || this.pos >= this.phrase.length) return null;
    const want = this.phrase[this.pos].midi;
    if (this._match(note, want)) {
      this.pos++;
      this.onProgress(this.pos, this.phrase.length);
      if (this.pos >= this.phrase.length) {
        this.attempts++;
        const perfect = this.mistakes === 0;
        if (perfect) { this.score++; this.streak++; if (this.streak > this.best) this.best = this.streak; }
        else { this.streak = 0; }
        this.onResult(true, { phrase: this.phrase.slice(), mistakes: this.mistakes, score: this.score, streak: this.streak });
        return { ok: true, done: true, correct: true, mistakes: this.mistakes };
      }
      return { ok: true, done: false, pos: this.pos };
    }
    this.mistakes++;
    this.onResult(false, { expected: want, played: note, mistakes: this.mistakes });
    return { ok: false, expected: want, played: note };
  }

  /** 放弃当前题（算一次尝试、连击清零，不计分） */
  giveUp() {
    if (!this.phrase.length) return;
    this.attempts++;
    this.streak = 0;
    const p = this.phrase.slice();
    this.phrase = [];
    this.pos = 0;
    this.onResult(false, { phrase: p, gaveUp: true, score: this.score, streak: this.streak });
  }

  /** 音高范围 [lo,hi]（MIDI），UI 用来设键盘可见区间 */
  range() {
    if (!this.phrase.length) return [this.key.tonic, this.key.tonic + 12];
    const ms = this.phrase.map((n) => n.midi);
    return [Math.min(...ms), Math.max(...ms)];
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }

  reset() {
    this.phrase = []; this.pos = 0; this.mistakes = 0;
    this.score = 0; this.attempts = 0; this.streak = 0; this.best = 0;
  }
}
