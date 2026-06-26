/**
 * score-follow.js — Synthesia 式"曲谱跟弹"练习引擎（纯逻辑，可单元测试）
 *
 * 给一首内置乐曲（单旋律线），把每个音符放在时间轴上（按 BPM 把"拍"换成毫秒）。
 * 播放时一个"播放头"沿时间前进；玩家在正确时刻弹出正确的键就判定 PERFECT/GOOD，
 * 过了判定窗还没弹就算 MISS——和 Synthesia / 节奏游戏一样按"音高 + 时机"双重打分。
 *
 * UI 层（app.js）负责：每帧把 performance.now() 换成播放头时间 t（毫秒），
 * 调用 expire(t) 自动判漏弹、judge(midi,t) 判定一次弹奏、active/upcoming 取要画的音符。
 * 本文件不依赖任何浏览器 API。
 */

export const GRADE = { PERFECT: 'perfect', GOOD: 'good', MISS: 'miss' };

/** 拍 -> 毫秒 */
export function beatToMs(beat, bpm) { return (beat * 60000) / bpm; }

/** 音级（0..11） */
function pcOf(m) { return ((m % 12) + 12) % 12; }

/**
 * 内置乐曲库。每首：{ id, title, clef, bpm, seq }
 * seq 为顺序记谱：[midi, durBeats]，midi 为 null 表示休止（只推进拍数、不出音符）。
 * 全部为公有领域童谣/经典旋律，单手单音旋律线，适合识谱+跟弹。
 */
export const SONGS = [
  {
    id: 'find-c', title: '🐣 中央C 在哪里', clef: 'treble', bpm: 80, beginner: true,
    seq: [
      [60, 2, 1], [60, 2, 1], [60, 2, 1], [60, 2, 1], [60, 2, 1], [60, 2, 1],
    ],
  },
  {
    id: 'three-c', title: '🐣 低·中·高 C（音区）', clef: 'treble', bpm: 80, beginner: true,
    seq: [
      [48, 2], [60, 2], [72, 2], [72, 2], [60, 2], [48, 2],
    ],
  },
  {
    id: 'updown', title: '🐣 高低音方向', clef: 'treble', bpm: 80, beginner: true,
    seq: [
      [60, 1], [64, 1], [67, 1], [64, 1], [60, 1], [64, 1], [67, 1], [72, 2],
    ],
  },
  {
    id: 'five-finger', title: '🐣 五指阶梯 C-D-E-F-G', clef: 'treble', bpm: 84, beginner: true,
    seq: [
      [60, 1, 1], [62, 1, 2], [64, 1, 3], [65, 1, 4], [67, 1, 5], [65, 1, 4], [64, 1, 3], [62, 1, 2], [60, 2, 1],
    ],
  },
  {
    id: 'twinkle', title: '小星星 Twinkle Twinkle', clef: 'treble', bpm: 88,
    seq: [
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
      [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
      [67, 1], [67, 1], [65, 1], [65, 1], [64, 1], [64, 1], [62, 2],
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
    ],
  },
  {
    id: 'ode', title: '欢乐颂 Ode to Joy', clef: 'treble', bpm: 96,
    seq: [
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
      [60, 1], [60, 1], [62, 1], [64, 1], [64, 1.5], [62, 0.5], [62, 2],
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1], [62, 1],
      [60, 1], [60, 1], [62, 1], [64, 1], [62, 1.5], [60, 0.5], [60, 2],
    ],
  },
  {
    id: 'mary', title: '玛丽的小羊 Mary Had a Little Lamb', clef: 'treble', bpm: 92,
    seq: [
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 2],
      [62, 1], [62, 1], [62, 2], [64, 1], [67, 1], [67, 2],
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 1], [64, 1],
      [62, 1], [62, 1], [64, 1], [62, 1], [60, 4],
    ],
  },
  {
    id: 'jingle', title: '铃儿响叮当 Jingle Bells', clef: 'treble', bpm: 104,
    seq: [
      [64, 1], [64, 1], [64, 2], [64, 1], [64, 1], [64, 2],
      [64, 1], [67, 1], [60, 1], [62, 1], [64, 4],
      [65, 1], [65, 1], [65, 1.5], [65, 0.5], [65, 1], [64, 1], [64, 1], [64, 0.5], [64, 0.5],
      [64, 1], [62, 1], [62, 1], [64, 1], [62, 2], [67, 2],
    ],
  },
  {
    id: 'minuet', title: '🎼 巴赫小步舞曲 G（简单）', clef: 'treble', bpm: 120, meter: 3,
    seq: [
      [74, 1], [67, 0.5], [69, 0.5], [71, 0.5], [72, 0.5],   // D5 | G4 A4 B4 C5
      [74, 1], [67, 1], [67, 1],                              // D5 G4 G4
      [76, 1], [72, 0.5], [74, 0.5], [76, 0.5], [78, 0.5],   // E5 | C5 D5 E5 F#5
      [79, 1], [67, 1], [67, 1],                              // G5 G4 G4
      [72, 1], [74, 0.5], [72, 0.5], [71, 0.5], [69, 0.5],   // C5 | D5 C5 B4 A4
      [71, 1], [72, 0.5], [71, 0.5], [69, 0.5], [67, 0.5],   // B4 | C5 B4 A4 G4
      [69, 1], [71, 1], [67, 2],                              // A4 B4 | G4
    ],
  },
  {
    id: 'furelise', title: '🎼 致爱丽丝（入门 8 小节）', clef: 'treble', bpm: 100, meter: 3,
    seq: [
      [76, 0.5], [75, 0.5], [76, 0.5], [75, 0.5], [76, 0.5], [71, 0.5], [74, 0.5], [72, 0.5],
      [69, 1], [null, 0.5], [60, 0.5], [64, 0.5], [69, 0.5],
      [71, 1], [null, 0.5], [64, 0.5], [68, 0.5], [71, 0.5],
      [72, 1], [null, 0.5], [64, 0.5], [76, 0.5], [75, 0.5],
      [76, 0.5], [75, 0.5], [76, 0.5], [71, 0.5], [74, 0.5], [72, 0.5],
      [69, 2],
    ],
  },
  {
    id: 'nocturne', title: '🎼 肖邦夜曲 Op.9 No.2（进阶）', clef: 'treble', bpm: 52,
    seq: [
      [70, 1.5], [67, 0.5], [68, 0.5], [70, 0.5],   // Bb4. | G4 Ab4 Bb4
      [72, 1], [70, 1], [68, 0.5], [67, 0.5],        // C5 Bb4 Ab4 G4
      [65, 1.5], [63, 0.5], [65, 1], [67, 1],        // F4. Eb4 | F4 G4
      [68, 2], [67, 1], [65, 1],                      // Ab4 G4 F4
      [63, 2], [null, 1],
    ],
  },
];

/** 按 id 取乐曲 */
export function getSong(id) { return SONGS.find((s) => s.id === id) || SONGS[0]; }

/**
 * 把 MIDI 解析结果（midi-file.js 的 parseMidi 输出）转成 ScoreFollow 乐曲。
 * 用 notes 绝对时间格式（每个音符自带 ms/durMs/hand），不依赖 bpm 推算，
 * 因此支持变速 MIDI 与复音（和弦/双手）。
 * @param {object} parsed parseMidi 输出
 * @param {object} meta {id, title}
 */
export function songFromMidi(parsed, meta = {}) {
  return {
    id: meta.id || 'midi-custom',
    title: meta.title || 'MIDI 文件',
    clef: 'treble',
    bpm: parsed.bpm || 120,
    hands: !!parsed.hasHands,
    durationMs: parsed.durationMs,
    notes: parsed.notes.map((n) => ({
      midi: n.midi, ms: n.ms, durMs: n.durMs, beat: n.beat, dur: n.dur, hand: n.hand || 'r',
      velocity: n.velocity,
    })),
  };
}

export class ScoreFollow {
  /**
   * @param {object} song 乐曲定义（见 SONGS；可含 seq 相对记谱 或 notes 绝对时间记谱）
   * @param {object} opts
   *   bpm 覆盖速度（默认用 song.bpm，仅对 seq 记谱生效）
   *   timeScale 时间轴缩放（默认 1；<1 加速，>1 减速，统一用于变速控制）
   *   octaveAgnostic 是否忽略八度（简单模式，只比音名）
   *   handFilter 'both'|'r'|'l' 只练某只手（仅对带 hand 的 notes 记谱有意义）
   *   perfectMs / goodMs 判定窗（毫秒，距目标时刻的容差）
   */
  constructor(song, opts = {}) {
    this.song = song;
    this.bpm = opts.bpm || song.bpm || 90;
    this.clef = song.clef || 'treble';
    this.octaveAgnostic = !!opts.octaveAgnostic;
    this.timeScale = opts.timeScale ?? 1;
    this.handFilter = opts.handFilter || 'both';
    this.perfectMs = opts.perfectMs ?? 130;
    this.goodMs = opts.goodMs ?? 320;
    this._build();
  }

  _build() {
    this.notes = [];
    const sc = this.timeScale;
    if (Array.isArray(this.song.notes)) {
      // 绝对时间记谱（MIDI 导入 / 复音 / 双手）
      let i = 0;
      for (const n of this.song.notes) {
        const ms = (n.ms != null ? n.ms : beatToMs(n.beat || 0, this.bpm)) * sc;
        const durMs = (n.durMs != null ? n.durMs : beatToMs(n.dur || 0, this.bpm)) * sc;
        this.notes.push({
          i: i++, midi: n.midi, beat: n.beat ?? 0, dur: n.dur ?? 0,
          ms, durMs, hand: n.hand || 'r', velocity: n.velocity ?? null,
          judged: false, grade: null, deltaMs: null,
        });
      }
      this.totalBeats = this.song.notes.reduce((mx, n) => Math.max(mx, (n.beat || 0) + (n.dur || 0)), 0);
    } else {
      // 顺序记谱：[midi, durBeats]（可选第三项 finger=1..5 指法），midi=null 为休止
      let beat = 0; let i = 0;
      for (const [midi, dur, finger] of this.song.seq) {
        if (midi != null) {
          this.notes.push({
            i: i++, midi, beat, dur, hand: 'r', finger: finger ?? null,
            ms: beatToMs(beat, this.bpm) * sc, durMs: beatToMs(dur, this.bpm) * sc,
            judged: false, grade: null, deltaMs: null,
          });
        }
        beat += dur;
      }
      this.totalBeats = beat;
    }
    this._byMs = this.notes.slice().sort((a, b) => a.ms - b.ms);
    this.perfect = 0; this.good = 0; this.miss = 0; this.wrong = 0;
    this.combo = 0; this.maxCombo = 0; this.score = 0;
  }

  reset() { this._build(); }

  /** 该音符是否属于当前练习手别 */
  _handOk(n) { return this.handFilter === 'both' || n.hand === this.handFilter; }

  /** 当前手别过滤后的音符集合 */
  get playNotes() { return this.handFilter === 'both' ? this.notes : this.notes.filter((n) => this._handOk(n)); }

  get total() { return this.playNotes.length; }
  get durationMs() { return this.notes.length ? Math.max(...this.notes.map((n) => n.ms + n.durMs)) : 0; }
  get judgedCount() { return this.perfect + this.good + this.miss; }
  get done() { const f = this.playNotes; return f.length > 0 && f.every((n) => n.judged); }
  get accuracy() { return this.judgedCount ? (this.perfect + this.good) / this.judgedCount : 0; }

  /** 音高范围 [lo,hi]（MIDI），按当前手别过滤，UI 用于设置键盘可见区间 */
  get range() {
    const f = this.playNotes;
    if (!f.length) return [60, 72];
    const ms = f.map((n) => n.midi);
    return [Math.min(...ms), Math.max(...ms)];
  }

  /**
   * 按起音时刻把音符分组（同一时刻的和弦/双手归一组），用于"等待模式"逐组推进。
   * @param {number} tol 同组的最大时间差（毫秒）
   * @returns {Array<{ms, notes:[]}>} 按 ms 升序
   */
  groups(tol = 30) {
    const f = this.playNotes.slice().sort((a, b) => a.ms - b.ms);
    const gs = [];
    for (const n of f) {
      const last = gs[gs.length - 1];
      if (last && Math.abs(n.ms - last.ms) <= tol) last.notes.push(n);
      else gs.push({ ms: n.ms, notes: [n] });
    }
    return gs;
  }

  /** 把缩放后的播放头时间 t 映射为乐谱拍位（五线谱光标用），按音符 (ms,beat) 线性插值 */
  beatAt(t) {
    const a = this._byMs;
    if (!a.length) return 0;
    if (t <= a[0].ms) return a[0].beat;
    const last = a[a.length - 1];
    if (t >= last.ms) {
      // 末尾用最后一段斜率外推
      if (a.length >= 2) {
        const prev = a[a.length - 2];
        const dm = last.ms - prev.ms;
        if (dm > 0) return last.beat + ((t - last.ms) * (last.beat - prev.beat)) / dm;
      }
      return last.beat + (t - last.ms) / (beatToMs(1, this.bpm) * this.timeScale);
    }
    let lo = 0, hi = a.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (a[mid].ms <= t) lo = mid; else hi = mid; }
    const dm = a[hi].ms - a[lo].ms;
    if (dm <= 0) return a[lo].beat;
    return a[lo].beat + ((t - a[lo].ms) * (a[hi].beat - a[lo].beat)) / dm;
  }

  matches(a, b) { return this.octaveAgnostic ? pcOf(a) === pcOf(b) : a === b; }

  /**
   * 判定一次弹奏：在播放头时间 t（毫秒）找最近的、音高匹配且仍在判定窗内的未判音符。
   * @returns {{grade, note, deltaMs, wrong, due}}
   *   grade=PERFECT/GOOD 表示弹对；
   *   grade=null 表示这次弹奏没有可判定的目标。此时若 wrong=true 表示"此刻确有一个该弹的音
   *   但你弹的是别的键"（音高错，UI 标红）；wrong=false 表示纯属多弹（此刻无音该弹，不惩罚）。
   *   due 为发生音高错时本该弹的最近音符（供 UI 高亮/提示）。
   */
  judge(midi, t) {
    let best = null, bd = Infinity;
    for (const n of this.notes) {
      if (n.judged || !this._handOk(n)) continue;
      if (!this.matches(n.midi, midi)) continue;
      const d = Math.abs(t - n.ms);
      if (d <= this.goodMs && d < bd) { best = n; bd = d; }
    }
    if (!best) {
      // 没弹中任何目标——判断此刻是不是"该弹某个音却弹错了键"（音高错）
      let due = null, dd = Infinity;
      for (const n of this.notes) {
        if (n.judged || !this._handOk(n)) continue;
        const d = Math.abs(t - n.ms);
        if (d <= this.goodMs && d < dd) { due = n; dd = d; }
      }
      if (due) { this.wrong++; this.combo = 0; return { grade: null, note: null, deltaMs: null, wrong: true, due }; }
      return { grade: null, note: null, deltaMs: null, wrong: false, due: null };
    }
    const delta = t - best.ms;
    const grade = Math.abs(delta) <= this.perfectMs ? GRADE.PERFECT : GRADE.GOOD;
    best.judged = true; best.grade = grade; best.deltaMs = delta;
    const comboBonus = Math.min(this.combo, 20);
    if (grade === GRADE.PERFECT) { this.perfect++; this.score += 100 + comboBonus * 5; }
    else { this.good++; this.score += 50 + comboBonus * 2; }
    this.combo++; if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    return { grade, note: best, deltaMs: delta, wrong: false, due: null };
  }

  /** 把已经过了判定窗仍未弹的音符标记为 MISS（每帧调用），返回新判漏的音符 */
  expire(t) {
    const missed = [];
    for (const n of this.notes) {
      if (n.judged || !this._handOk(n)) continue;
      if (t - n.ms > this.goodMs) { n.judged = true; n.grade = GRADE.MISS; this.miss++; this.combo = 0; missed.push(n); }
    }
    return missed;
  }

  /** 当前"该弹"的音符（判定窗覆盖 t 的未判音符，按手别过滤） */
  active(t) {
    return this.notes.filter((n) => !n.judged && this._handOk(n) && Math.abs(n.ms - t) <= this.goodMs);
  }

  /** 即将到来 + 仍可弹的音符（用于绘制下落高速路），aheadMs 为向前看的毫秒数（按手别过滤） */
  upcoming(t, aheadMs) {
    return this.notes.filter((n) => !n.judged && this._handOk(n) && n.ms >= t - this.goodMs && n.ms <= t + aheadMs);
  }

  /** 星级评定：3 星 ≥90%，2 星 ≥70%，1 星 ≥50%，否则 0 */
  get stars() {
    const a = this.accuracy;
    if (a >= 0.9) return 3;
    if (a >= 0.7) return 2;
    if (a >= 0.5) return 1;
    return 0;
  }

  summary() {
    return {
      total: this.total, perfect: this.perfect, good: this.good, miss: this.miss,
      maxCombo: this.maxCombo, score: this.score,
      accuracy: Math.round(this.accuracy * 100), stars: this.stars,
    };
  }

  /**
   * 落点时间对比数据（演奏后画"抢拍/拖拍"图用）。
   * 按起音时刻顺序返回每个（当前手别的）音符的判定结果：
   *   order  从 0 起的演奏顺序
   *   midi   音高
   *   grade  'perfect' | 'good' | 'miss' | null（未判到，正常情况下不会出现）
   *   deltaMs 弹奏相对目标时刻的误差（负=抢拍/早，正=拖拍/晚，miss 为 null）
   * 同时附带统计：early/late/onTime 计数与平均绝对误差。
   * @returns {{notes:Array, early:number, late:number, onTime:number, miss:number, avgAbs:number, maxAbs:number}}
   */
  timings() {
    const ordered = this.playNotes.slice().sort((a, b) => a.ms - b.ms);
    const notes = ordered.map((n, i) => ({
      order: i, midi: n.midi, grade: n.grade, deltaMs: n.deltaMs,
    }));
    let early = 0, late = 0, onTime = 0, miss = 0, sumAbs = 0, hit = 0, maxAbs = 0;
    for (const n of notes) {
      if (n.grade === GRADE.MISS || n.deltaMs == null) { if (n.grade === GRADE.MISS) miss++; continue; }
      const d = n.deltaMs, ad = Math.abs(d);
      sumAbs += ad; hit++;
      if (ad > maxAbs) maxAbs = ad;
      if (d < -this.perfectMs) early++;
      else if (d > this.perfectMs) late++;
      else onTime++;
    }
    return {
      notes, early, late, onTime, miss,
      avgAbs: hit ? Math.round(sumAbs / hit) : 0, maxAbs: Math.round(maxAbs),
    };
  }
}
