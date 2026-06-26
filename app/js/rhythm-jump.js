/**
 * rhythm-jump.js — 🥁 节奏跳跳（太鼓达人式，纯逻辑，可测试）
 *
 * 节奏方块顺着轨道落到「击拍线」，玩家在<b>这一刻按任意键</b>把它拍中。
 * 与「接音水滴 / 看谱击落」区分：这里<b>只判节奏不判音高</b>——不用找对键，
 * 门槛比 drops 更低，纯粹的打击爽快感，最适合热身 / 低能量日。
 * 无 game-over——漏拍只断连击、不结束。判定分 完美 / 不错 / 漏拍。
 *
 * 多种节奏型（四分 / 华尔兹 3拍 / 八分 / 混合 / 切分）+ 可调 BPM，
 * 时间戳由调用方喂入（performance.now()），便于单元测试。
 */

/** 内置节奏型：beats 为每个音符的时值（四分音符 = 1 拍），barBeats 为每小节拍数（重音分组用） */
export const PATTERNS = [
  { id: 'quarter', label: '四分音符', emoji: '🚶', desc: '♩ ♩ ♩ ♩', level: 1, barBeats: 4, beats: [1, 1, 1, 1] },
  { id: 'waltz', label: '华尔兹', emoji: '💃', desc: '♩ ♩ ♩（3/4）', level: 1, barBeats: 3, beats: [1, 1, 1] },
  { id: 'eighth', label: '八分音符', emoji: '🏃', desc: '♪♪ ♪♪ ♪♪ ♪♪', level: 2, barBeats: 4, beats: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5] },
  { id: 'mixed', label: '混合节奏', emoji: '🎵', desc: '♩ ♪♪ ♩ ♪♪', level: 2, barBeats: 4, beats: [1, 0.5, 0.5, 1, 0.5, 0.5] },
  { id: 'syncopa', label: '切分音', emoji: '🌀', desc: '♪ ♩ ♩ ♩ ♪', level: 3, barBeats: 4, beats: [0.5, 1, 1, 1, 0.5] },
];

/** 按 id 取节奏型 */
export function patternById(id) {
  return PATTERNS.find((p) => p.id === id) || PATTERNS[0];
}

/** 时值数组 → 各音符的起拍位置（拍，累加，不含末尾总长） */
export function onsetBeats(beats) {
  const out = [];
  let t = 0;
  for (const d of beats) { out.push(t); t += d; }
  return out;
}

/** 一拍多少毫秒 */
export function beatMsOf(bpm) {
  return bpm > 0 ? 60000 / bpm : 0;
}

/**
 * 由节奏型生成击拍时刻表。
 * @returns {{beatMs,leadMs,barMs,patternBeats,times:number[]}}
 *  times：每个节奏方块应被拍中的时刻（ms，从 0 起算，含预备拍偏移）
 */
export function buildTimes({ bpm = 90, pattern, bars = 4, leadInBeats = 4 } = {}) {
  const p = typeof pattern === 'string' ? patternById(pattern) : (pattern || PATTERNS[0]);
  const beatMs = beatMsOf(bpm);
  const leadMs = leadInBeats * beatMs;
  const patternBeats = p.beats.reduce((a, b) => a + b, 0);
  const onsets = onsetBeats(p.beats);
  const times = [];
  for (let b = 0; b < bars; b++) {
    const barOffset = b * patternBeats;
    for (const o of onsets) times.push(leadMs + (barOffset + o) * beatMs);
  }
  return { beatMs, leadMs, barMs: patternBeats * beatMs, patternBeats, times };
}

export class RhythmJump {
  /**
   * @param {object} opts
   * @param {number} opts.bpm        速度（默认 90）
   * @param {string|object} opts.pattern  节奏型 id 或对象（默认 quarter）
   * @param {number} opts.bars       小节数（默认 4）
   * @param {number} opts.leadInBeats 预备拍数（默认 4，不算节奏方块）
   * @param {number} opts.perfectMs  完美判定窗口（±ms，默认 55）
   * @param {number} opts.goodMs     不错判定窗口（±ms，默认 130）
   */
  constructor(opts = {}) {
    this.bpm = opts.bpm || 90;
    this.pattern = typeof opts.pattern === 'string' ? patternById(opts.pattern) : (opts.pattern || PATTERNS[0]);
    this.bars = opts.bars || 4;
    this.leadInBeats = opts.leadInBeats ?? 4;
    this.perfectMs = opts.perfectMs ?? 55;
    this.goodMs = opts.goodMs ?? 130;
    const built = buildTimes({ bpm: this.bpm, pattern: this.pattern, bars: this.bars, leadInBeats: this.leadInBeats });
    this.beatMs = built.beatMs;
    this.leadMs = built.leadMs;
    this.barMs = built.barMs;
    this.notes = built.times.map((ms, i) => ({ i, ms, judged: false, result: null, delta: 0 }));
    this.reset();
  }

  reset() {
    for (const n of this.notes) { n.judged = false; n.result = null; n.delta = 0; }
    this.combo = 0;
    this.bestCombo = 0;
    this.score = 0;
    this.counts = { perfect: 0, good: 0, miss: 0 };
    this._deltas = [];
  }

  get total() { return this.notes.length; }
  get judgedCount() { return this.counts.perfect + this.counts.good + this.counts.miss; }

  /** 该次曲目的总时长（ms，最后一拍 + 一拍余韵） */
  durationMs() {
    return (this.notes.length ? this.notes[this.notes.length - 1].ms : this.leadMs) + this.beatMs;
  }

  /** 误差绝对值 → 判定等级（null = 窗口外） */
  classify(absDelta) {
    if (absDelta <= this.perfectMs) return 'perfect';
    if (absDelta <= this.goodMs) return 'good';
    return null;
  }

  /**
   * 在 now 时刻按了一下（任意键）。命中窗口内最近的未判定节奏方块。
   * @returns {{hit:boolean, stray?:boolean, result?:string, delta?:number, late?:boolean, index?:number}}
   *  stray=true 表示附近没有方块（空挥）——不扣连击，温和处理。
   */
  tap(now) {
    let best = null, bestAbs = Infinity;
    for (const n of this.notes) {
      if (n.judged) continue;
      const abs = Math.abs(now - n.ms);
      if (abs <= this.goodMs && abs < bestAbs) { best = n; bestAbs = abs; }
    }
    if (!best) return { hit: false, stray: true };
    const result = this.classify(bestAbs);   // 命中窗口内必非 null
    best.judged = true;
    best.result = result;
    best.delta = now - best.ms;
    this._deltas.push(best.delta);
    this.counts[result] += 1;
    this.combo += 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    this.score += result === 'perfect' ? 100 : 50;
    return { hit: true, result, delta: best.delta, late: best.delta > 0, index: best.i };
  }

  /**
   * 推进到 now：把已错过窗口（now > ms + goodMs）的未判定方块标记为漏拍、断连击。
   * @returns {number[]} 本次新漏拍的方块下标
   */
  expire(now) {
    const missed = [];
    for (const n of this.notes) {
      if (n.judged) continue;
      if (now > n.ms + this.goodMs) {
        n.judged = true; n.result = 'miss';
        this.counts.miss += 1;
        this.combo = 0;
        missed.push(n.i);
      }
    }
    return missed;
  }

  /**
   * 渲染用：返回当前在轨道上可见的方块及其位置 y（0=顶,1=击拍线）。
   * @param {number} now      当前时刻
   * @param {number} travelMs 方块从顶落到击拍线所需时间
   */
  activeNotes(now, travelMs) {
    const out = [];
    for (const n of this.notes) {
      const y = 1 - (n.ms - now) / travelMs;
      if (y >= -0.05 && y <= 1.35) out.push({ i: n.i, ms: n.ms, y, judged: n.judged, result: n.result });
    }
    return out;
  }

  /** 命中率 0..100（完美+不错 占总数） */
  hitRate() {
    return this.total ? Math.round((this.counts.perfect + this.counts.good) / this.total * 100) : 0;
  }

  /** 平均绝对误差（ms，仅命中的方块） */
  meanAbsErrMs() {
    if (!this._deltas.length) return 0;
    const s = this._deltas.reduce((a, b) => a + Math.abs(b), 0);
    return Math.round(s / this._deltas.length);
  }

  /** 评星 1..3（按命中率） */
  stars() {
    const r = this.hitRate();
    if (r >= 90) return 3;
    if (r >= 65) return 2;
    if (r >= 1) return 1;
    return 0;
  }

  /** 是否全部判定完毕 */
  isDone() { return this.notes.every((n) => n.judged); }

  /** 进度 0..1（已判定 / 总数） */
  progress() { return this.total ? this.judgedCount / this.total : 0; }
}
