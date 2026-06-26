/**
 * loop-trainer.js — 🔁 AB 循环慢练器（分段精练）纯逻辑引擎
 *
 * 老师布置曲子时最需要的「分段精练」工具：
 *   ① 框选某几小节（A→B）→ 只循环这一段（区间循环）
 *   ② 从慢速起步（默认 60%）→ 每弹干净一遍自动提速 +10%，直到 100%（速度阶梯）
 *   ③ 左右手分层：只练单手 / 双手（复用 ScoreFollow 的 handFilter）
 *
 * 复用 score-follow.js 的 ScoreFollow（音符解析 / 等待容差匹配 waitMatch / 分组 groups /
 * 手别过滤 / 八度无关）；本文件只新增「速度阶梯 + 小节窗口 + 逐组等待练习 + 干净遍计数」，
 * 纯逻辑，不碰 DOM / MIDI / 浏览器 API，可单元测试。
 */

import { ScoreFollow } from './score-follow.js';

/** 速度百分比 → ScoreFollow 的 timeScale（<1 加速、>1 减速）。60% → 100/60 ≈ 1.667（更慢）。 */
export function timeScaleForPct(pct) { return 100 / Math.max(1, pct); }

/**
 * 速度阶梯：从 start% 起步，每弹「干净一遍」自动 +step%，封顶 target%。
 * 弹脏（有错）的一遍不提速，留在原速再练。
 */
export class SpeedLadder {
  constructor({ start = 60, step = 10, target = 100 } = {}) {
    this.start = Math.max(10, Math.min(start, 100));
    this.step = Math.max(1, step);
    this.target = Math.max(this.start, Math.min(target, 100));
    this.pct = this.start;
  }

  get current() { return this.pct; }
  atTarget() { return this.pct >= this.target; }

  /** 走完一遍：clean=true 且未封顶则提速；返回新速度百分比 */
  pass(clean = true) {
    if (clean && this.pct < this.target) {
      this.pct = Math.min(this.target, this.pct + this.step);
    }
    return this.pct;
  }

  reset() { this.pct = this.start; }
}

/**
 * 小节 → 拍位窗口。meter=每小节拍数；fromM/toM 为 1-based 含端点小节号。
 * 返回 { startBeat, endBeat, fromM, toM }（endBeat 为开区间右端：< endBeat）。
 */
export function measureWindow(meter, fromM, toM) {
  const m = Math.max(1, meter | 0 || 4);
  let f = Math.max(1, Math.min(fromM, toM));
  let t = Math.max(f, Math.max(fromM, toM));
  return { startBeat: (f - 1) * m, endBeat: t * m, fromM: f, toM: t };
}

/**
 * 循环慢练 session：持有一首乐曲在「某手别 + 某小节窗口」下的待弹分组，
 * 以「等待模式」逐组推进（弹对当前组所有音才走下一组），段尾自动回到段首并按
 * 速度阶梯结算（干净遍提速）。
 */
export class LoopSession {
  /**
   * @param {object} song ScoreFollow 乐曲（seq 或 notes 记谱）
   * @param {object} opts
   *   meter 每小节拍数（默认取 song.meter 或 4）
   *   hand 'both'|'r'|'l'
   *   fromM/toM 1-based 小节窗口
   *   octaveAgnostic 八度无关（默认 true，慢练以音名为主）
   *   tolerant 容差等待（默认 true）；semis 容差半音（默认 2）
   *   ladder { start, step, target } 速度阶梯参数
   */
  constructor(song, opts = {}) {
    this.song = song;
    this.meter = opts.meter || song.meter || 4;
    this.hand = opts.hand || 'both';
    this.octaveAgnostic = opts.octaveAgnostic ?? true;
    this.tolerant = opts.tolerant ?? true;
    this.semis = opts.semis ?? 2;
    this.ladder = new SpeedLadder(opts.ladder || {});
    this.sf = new ScoreFollow(song, {
      handFilter: this.hand, octaveAgnostic: this.octaveAgnostic, timeScale: 1,
    });
    this.passes = 0;
    this.cleanPasses = 0;
    this.idx = 0;
    this.wrongInPass = 0;
    this.setWindow(opts.fromM ?? 1, opts.toM ?? this.totalMeasures);
  }

  get baseBpm() { return this.sf.bpm; }
  get totalBeats() { return this.sf.totalBeats; }
  get totalMeasures() { return Math.max(1, Math.ceil(this.totalBeats / this.meter - 1e-6)); }
  /** 当前阶梯速度对应的实际 BPM（节拍器用） */
  get bpm() { return Math.max(1, Math.round((this.baseBpm * this.ladder.current) / 100)); }
  get pct() { return this.ladder.current; }

  setHand(hand) {
    this.hand = hand;
    this.sf.handFilter = hand;
    this._rebuildGroups();
    this.idx = 0; this.wrongInPass = 0;
  }

  setWindow(fromM, toM) {
    const tm = this.totalMeasures;
    this.win = measureWindow(this.meter, Math.min(fromM, tm), Math.min(toM, tm));
    this._rebuildGroups();
    this.idx = 0; this.wrongInPass = 0;
  }

  _rebuildGroups() {
    // 先清掉所有判定态（groups 复用 sf.notes 引用，避免上一遍残留）
    this.sf.notes.forEach((n) => { n.judged = false; n.grade = null; });
    const all = this.sf.groups();
    this.groups = all.filter((g) => {
      const b = g.notes[0].beat;
      return b >= this.win.startBeat - 1e-6 && b < this.win.endBeat - 1e-6;
    });
  }

  get totalGroups() { return this.groups.length; }
  get current() { return this.groups[this.idx] || null; }
  get done() { return this.idx >= this.groups.length; }
  get progress() { return { idx: Math.min(this.idx, this.totalGroups), total: this.totalGroups }; }

  /** 当前组里还没弹到的音（UI 高亮用） */
  currentTargets() {
    const g = this.current;
    return g ? g.notes.filter((n) => !n.judged).map((n) => n.midi) : [];
  }

  /**
   * 弹一个音。返回 { ok, wrong, exact, advanced, complete }
   *   ok=true 命中当前组某音；wrong=true 不属于当前组（容差也不收）
   *   advanced=true 当前组弹完、已前进；complete=true 整段弹完（需调用 completePass）
   */
  press(midi) {
    const g = this.current;
    if (!g) return { ok: false, wrong: false, advanced: false, complete: false };
    const m = this.sf.waitMatch(midi, g.notes, { tolerant: this.tolerant, semis: this.semis });
    if (!m) { this.wrongInPass++; return { ok: false, wrong: true, advanced: false, complete: false }; }
    m.note.judged = true;
    const remaining = g.notes.some((n) => !n.judged);
    if (remaining) return { ok: true, wrong: false, exact: m.exact, advanced: false, complete: false };
    this.idx++;
    const complete = this.idx >= this.groups.length;
    return { ok: true, wrong: false, exact: m.exact, advanced: true, complete };
  }

  /**
   * 整段走完一遍时调用：结算干净与否、按阶梯提速、重置回段首。
   * 返回 { clean, passes, cleanPasses, climbed, fromPct, toPct, reachedTarget, mastered }
   *   mastered=true 表示「在 100% 速度干净弹完了一遍」——这段算练成了。
   */
  completePass() {
    this.passes++;
    const clean = this.wrongInPass === 0;
    if (clean) this.cleanPasses++;
    const before = this.ladder.current;
    const wasAtTarget = this.ladder.atTarget();
    const after = this.ladder.pass(clean);
    const result = {
      clean,
      passes: this.passes,
      cleanPasses: this.cleanPasses,
      climbed: after > before,
      fromPct: before,
      toPct: after,
      reachedTarget: this.ladder.atTarget(),
      mastered: clean && wasAtTarget,
    };
    this._rebuildGroups();
    this.idx = 0; this.wrongInPass = 0;
    return result;
  }

  /** 全部重置（速度回起点、计数清零、回段首） */
  reset() {
    this.ladder.reset();
    this.passes = 0; this.cleanPasses = 0;
    this._rebuildGroups();
    this.idx = 0; this.wrongInPass = 0;
  }
}
