/**
 * rhythm-sight.js — 节奏视奏（rhythm sight-reading）纯逻辑引擎
 *
 * 视奏 = 读懂音高 + 读懂节奏。乐句视奏 sight-phrase 练的是【音高】（按自己节奏弹），
 * 这个模块练的是另一半——【节奏】：屏幕给一段【随机生成的标准节奏记谱】
 * （四分/八分/十六分/附点/休止符、带小节线、3/4 或 4/4 拍），先给一小节预备拍，
 * 然后你跟着节拍器在正确的时间点【击打任意键】，引擎按每次击打与谱面落点的
 * 时间误差判定 完美 / 良好 / 漏击 / 多击，并算出"偏抢/偏拖"的落点时间报告。
 *
 * 和现有节奏模块不同：
 *   - 节奏跟拍 rhythm-trainer：只有【预置】几个节拍型、单小节、不画真实记谱；
 *   - 节奏听写 rhythm-dictation：靠【耳朵】听节奏复奏，不读谱；
 *   这里是【看真正的节奏谱、随机多样、多小节、含休止符、跟拍击打】——读谱练节奏。
 *
 * 引擎职责（纯逻辑，不碰 Web Audio / MIDI / DOM）：
 *   1) 生成一段每小节时值正好填满的节奏（含休止符），给出每个事件 {beat,dur,rest}；
 *   2) 提供该击打的落点（非休止事件的起拍 beat）；
 *   3) 把"击打时间序列 + 起始时刻"判成 完美/良好/漏击/多击，给逐拍误差报告。
 * 谱面绘制与计时交给 UI。注入 rng 便于确定性测试。
 */

/** 难度 -> 每个"一拍单元"可选的填充模式（每种模式时值和为 1 拍） */
export const CELL_PATTERNS = {
  easy: [
    [{ d: 1 }],                          // 四分音符
    [{ d: 0.5 }, { d: 0.5 }],            // 两个八分
    [{ d: 1, r: true }],                 // 四分休止
  ],
  medium: [
    [{ d: 1 }],
    [{ d: 0.5 }, { d: 0.5 }],
    [{ d: 1, r: true }],
    [{ d: 0.5, r: true }, { d: 0.5 }],   // 八分休止 + 八分
    [{ d: 0.75 }, { d: 0.25 }],          // 附点八分 + 十六分
  ],
  hard: [
    [{ d: 1 }],
    [{ d: 0.5 }, { d: 0.5 }],
    [{ d: 0.25 }, { d: 0.25 }, { d: 0.25 }, { d: 0.25 }], // 四个十六分
    [{ d: 0.5 }, { d: 0.25 }, { d: 0.25 }],
    [{ d: 0.25 }, { d: 0.25 }, { d: 0.5 }],
    [{ d: 0.75 }, { d: 0.25 }],
    [{ d: 0.5, r: true }, { d: 0.5 }],
    [{ d: 1, r: true }],
  ],
};

/** 默认判定窗口（毫秒） */
export const DEFAULT_TOL = { perfect: 90, good: 200 };

/** 时值（拍）-> 记谱信息（用于 UI 画符头/符干/符尾旗/附点；rest 由调用方另判） */
export function rhythmGlyph(dur) {
  if (dur >= 4) return { filled: false, stem: false, beams: 0, dotted: false };  // 全
  if (dur >= 3) return { filled: false, stem: true, beams: 0, dotted: true };    // 附点二分
  if (dur >= 2) return { filled: false, stem: true, beams: 0, dotted: false };   // 二分
  if (dur >= 1.5) return { filled: true, stem: true, beams: 0, dotted: true };   // 附点四分
  if (dur >= 1) return { filled: true, stem: true, beams: 0, dotted: false };    // 四分
  if (dur >= 0.75) return { filled: true, stem: true, beams: 1, dotted: true };  // 附点八分
  if (dur >= 0.5) return { filled: true, stem: true, beams: 1, dotted: false };  // 八分
  return { filled: true, stem: true, beams: 2, dotted: false };                  // 十六分
}

export class RhythmSight {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng        随机源（默认 Math.random）
   * @param {number} opts.meter            每小节拍数（默认 4）
   * @param {number} opts.measures         小节数（默认 2）
   * @param {string} opts.difficulty       'easy'|'medium'|'hard'（默认 easy）
   * @param {number} opts.bpm              速度（默认 80）
   * @param {object} opts.tol              判定窗口 {perfect,good}（毫秒）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.meter = opts.meter || 4;
    this.measures = opts.measures || 2;
    this.difficulty = opts.difficulty || 'easy';
    this.bpm = opts.bpm || 80;
    this.tol = opts.tol || DEFAULT_TOL;

    this.events = [];      // [{beat, dur, rest, measure}]
    this.onsets = [];      // 非休止事件的 beat（该击打的落点）
    this.totalBeats = 0;

    this.attempts = 0;
    this.score = 0;        // 累计"练习段数"（完成一段+1）
    this.streak = 0;
    this.best = 0;
    this.lastResult = null;

    this.onNew = opts.onNew || (() => {});
    this.onResult = opts.onResult || (() => {});
  }

  _rint(n) { return Math.floor(this.rng() * n); }
  _pick(arr) { return arr[this._rint(arr.length)]; }

  get beatMs() { return 60000 / this.bpm; }

  /** 生成下一段节奏。返回 events 拷贝。 */
  next() {
    const patterns = CELL_PATTERNS[this.difficulty] || CELL_PATTERNS.easy;
    const events = [];
    let beat = 0;
    for (let m = 0; m < this.measures; m++) {
      let cell = 0;
      while (cell < this.meter) {
        const beatsLeft = this.meter - cell;
        // 一定概率放一个二分/附点二分（占多拍），让节奏更有呼吸
        const r = this.rng();
        if (beatsLeft >= 2 && r < 0.18) {
          const useDotted = beatsLeft >= 3 && this.rng() < 0.4;
          const dur = useDotted ? 3 : 2;
          events.push({ beat, dur, rest: false, measure: m });
          beat += dur; cell += dur;
          continue;
        }
        const pat = this._pick(patterns);
        for (const note of pat) {
          events.push({ beat, dur: note.d, rest: !!note.r, measure: m });
          beat += note.d;
        }
        cell += 1;
      }
    }
    // 保证整段第一个事件是"该击打"的音（不是休止），否则把它翻成非休止
    if (events.length && events[0].rest) events[0].rest = false;
    this.events = events;
    this.totalBeats = this.measures * this.meter;
    this.onsets = events.filter((e) => !e.rest).map((e) => e.beat);
    this.onNew(this._copy());
    return this._copy();
  }

  _copy() {
    return {
      events: this.events.map((e) => ({ ...e })),
      onsets: this.onsets.slice(),
      totalBeats: this.totalBeats,
      meter: this.meter,
      measures: this.measures,
      bpm: this.bpm,
    };
  }

  /** 每个落点对应的绝对毫秒时刻（startMs = beat 0 的时刻） */
  expectedTimes(startMs = 0) {
    return this.onsets.map((b) => startMs + b * this.beatMs);
  }

  /**
   * 把一串击打时间判分（纯函数）。
   * @param {number[]} tapTimes 击打时刻（毫秒，绝对）
   * @param {number} startMs    谱面 beat 0 的绝对时刻
   * @returns {object} {
   *   results:[{beat, onsetMs, tapMs|null, deltaMs|null, judge:'perfect'|'good'|'miss'}],
   *   extras:[tapMs...], perfect, good, miss, extra, total,
   *   avgAbs, maxAbs, score(0..1), tendency:'early'|'late'|'even'
   * }
   */
  grade(tapTimes, startMs = 0) {
    const expected = this.expectedTimes(startMs);
    const taps = (tapTimes || []).slice().sort((a, b) => a - b);
    const used = new Array(taps.length).fill(false);
    const results = [];
    for (let i = 0; i < expected.length; i++) {
      const eMs = expected[i];
      // 找最近的未用击打
      let bestIdx = -1, bestAbs = Infinity;
      for (let j = 0; j < taps.length; j++) {
        if (used[j]) continue;
        const ab = Math.abs(taps[j] - eMs);
        if (ab < bestAbs) { bestAbs = ab; bestIdx = j; }
      }
      if (bestIdx >= 0 && bestAbs <= this.tol.good) {
        used[bestIdx] = true;
        const delta = taps[bestIdx] - eMs;
        const judge = Math.abs(delta) <= this.tol.perfect ? 'perfect' : 'good';
        results.push({ beat: this.onsets[i], onsetMs: eMs, tapMs: taps[bestIdx], deltaMs: delta, judge });
      } else {
        results.push({ beat: this.onsets[i], onsetMs: eMs, tapMs: null, deltaMs: null, judge: 'miss' });
      }
    }
    const extras = taps.filter((_, j) => !used[j]);
    const hit = results.filter((r) => r.judge !== 'miss');
    const perfect = results.filter((r) => r.judge === 'perfect').length;
    const good = results.filter((r) => r.judge === 'good').length;
    const miss = results.filter((r) => r.judge === 'miss').length;
    const deltas = hit.map((r) => r.deltaMs);
    const avgAbs = deltas.length ? deltas.reduce((s, d) => s + Math.abs(d), 0) / deltas.length : 0;
    const maxAbs = deltas.length ? Math.max(...deltas.map((d) => Math.abs(d))) : 0;
    const signed = deltas.length ? deltas.reduce((s, d) => s + d, 0) / deltas.length : 0;
    const tendency = Math.abs(signed) < 18 ? 'even' : (signed < 0 ? 'early' : 'late');
    const total = expected.length;
    const score = total ? (perfect + good * 0.5) / total : 0;
    return { results, extras, perfect, good, miss, extra: extras.length, total, avgAbs, maxAbs, signed, tendency, score };
  }

  /** 提交一次完整作答，更新统计。判定标准：score≥0.6 且无多击过多算"完成"，全 perfect 才连击+。 */
  submit(tapTimes, startMs = 0) {
    const g = this.grade(tapTimes, startMs);
    this.attempts++;
    this.lastResult = g;
    const clean = g.miss === 0 && g.extra === 0;
    const allPerfect = clean && g.good === 0 && g.perfect === g.total;
    if (allPerfect) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else if (g.score >= 0.6 && clean) {
      this.score++;
      this.streak = 0;
    } else {
      this.streak = 0;
    }
    this.onResult(g);
    return g;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }

  reset() {
    this.events = []; this.onsets = []; this.totalBeats = 0;
    this.attempts = 0; this.score = 0; this.streak = 0; this.best = 0; this.lastResult = null;
  }
}
