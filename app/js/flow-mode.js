/**
 * flow-mode.js — 🌊 心流演奏（Flow / 静默演奏模式）纯逻辑引擎
 *
 * 灵感来自"弹琴吧"的"弹错不停"理念。练习时若每弹错一个音就跳红、报错、打断，
 * 孩子会停下纠结而练不出"从头到尾连贯地走完一遍"的能力。心流模式 = 演奏过程中
 * **不打断**（屏蔽所有实时报错 overlay），只默默采集事件，等弹完一次性给一份温和报告：
 * 弹了多久、共多少音、流畅度（最长不中断连击）、几处磕绊（停顿）——重过程、轻对错。
 *
 * 纯逻辑：调用方把每个音的时间戳（ms）喂进来，引擎累计统计，end() 出报告。
 * 时间由调用方提供，便于确定性单元测试。
 */

/** 超过该间隔（ms）视为一次"磕绊/停顿"——默认 1.2 秒 */
export const HESITATION_MS = 1200;

/**
 * 一次心流演奏会话。
 * @param {object} o
 *   hesitationMs  判定停顿的间隔阈值（默认 HESITATION_MS）
 */
export class FlowSession {
  constructor({ hesitationMs = HESITATION_MS } = {}) {
    this.hesitationMs = hesitationMs;
    this.reset();
  }

  reset() {
    this.running = false;
    this.startedAt = null;
    this.lastAt = null;
    this.notes = 0;          // 总音数
    this.hesitations = 0;    // 停顿次数（间隔 > 阈值）
    this.curStreak = 0;      // 当前连续不停顿音数
    this.bestStreak = 0;     // 最长不中断连击
    this.firstAt = null;
    this.endAt = null;
  }

  /** 开始一次演奏（清零计数） */
  start(now) {
    this.reset();
    this.running = true;
    this.startedAt = now;
    return this;
  }

  /**
   * 记录一个弹下的音（仅采集，不评判对错——心流模式重在不打断）。
   * @param {number} now  该音的时间戳（ms）
   * @returns {{hesitated:boolean}} 该音之前是否发生了停顿
   */
  note(now) {
    if (!this.running) return { hesitated: false };
    let hesitated = false;
    if (this.firstAt == null) {
      this.firstAt = now;
    } else {
      const gap = now - this.lastAt;
      if (gap > this.hesitationMs) {
        hesitated = true;
        this.hesitations++;
        this.curStreak = 0;
      }
    }
    this.notes++;
    this.curStreak++;
    if (this.curStreak > this.bestStreak) this.bestStreak = this.curStreak;
    this.lastAt = now;
    return { hesitated };
  }

  /** 演奏总时长（ms）：从第一个音到最后一个音；不足两音返回 0 */
  durationMs() {
    if (this.firstAt == null || this.lastAt == null) return 0;
    return Math.max(0, this.lastAt - this.firstAt);
  }

  /**
   * 流畅度评分 0..100：最长不中断连击占总音数的比例，再按停顿数轻微扣分。
   * 没有停顿 = 满分（一气呵成）；停顿越多越低，但底线温和（最低 0）。
   */
  flowScore() {
    if (this.notes <= 1) return this.notes === 1 ? 100 : 0;
    const continuity = this.bestStreak / this.notes;          // 0..1
    const penalty = Math.min(0.5, this.hesitations * 0.08);   // 每次停顿扣 8%，封顶 50%
    return Math.max(0, Math.round((continuity - penalty) * 100));
  }

  /** 结束演奏，返回温和的过程报告 */
  end(now) {
    this.running = false;
    this.endAt = now != null ? now : this.lastAt;
    const score = this.flowScore();
    return {
      notes: this.notes,
      durationMs: this.durationMs(),
      hesitations: this.hesitations,
      bestStreak: this.bestStreak,
      flowScore: score,
      grade: gradeFor(score),
      message: encourage(score, this.hesitations),
    };
  }
}

/** 分数 → 等级标签（始终正向，不出现"差/不及格"字样） */
export function gradeFor(score) {
  if (score >= 85) return { emoji: '🌟', label: '一气呵成' };
  if (score >= 65) return { emoji: '😃', label: '很流畅' };
  if (score >= 40) return { emoji: '🙂', label: '渐入佳境' };
  return { emoji: '🌱', label: '慢慢来' };
}

/** 鼓励语（重过程、不批评），按流畅度与停顿数选词 */
export function encourage(score, hesitations) {
  if (score >= 85) return '哇，一口气弹完，完全没被难住！🎉';
  if (hesitations <= 1) return '很棒，几乎没停过——继续保持这种连贯感！';
  if (score >= 40) return `中间停了 ${hesitations} 次没关系，重要的是你没有放弃，走完了整首。`;
  return '弹错了也不停下来，这就是最了不起的进步。再走一遍会更顺！';
}
