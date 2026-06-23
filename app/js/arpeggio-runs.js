/**
 * arpeggio-runs.js — 琶音跑动速度测试（arpeggio runs）纯逻辑引擎
 *
 * 给定一个目标琶音（根音 + 和弦性质 + 八度数 + 方向），玩家按顺序把它弹出来。
 * 引擎按序校验音高，记录每个正确音之间的时间间隔（IOI），结束后给出：
 *   - 速度 speed：每秒音数（notes/sec）
 *   - 均匀度 evenness：IOI 的变异系数（CV）越小越均匀，映射成 0..100 分
 *   - 综合评分 score：速度达标 + 均匀两者结合
 *
 * 纯逻辑：音符与时间戳由调用方喂入，rng 可注入，便于单元测试。
 */

/** 各和弦性质的半音音程（相对根音） */
export const CHORD_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  dom7: [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
};

export const QUALITY_LABELS = {
  maj: '大三和弦',
  min: '小三和弦',
  dim: '减三和弦',
  aug: '增三和弦',
  dom7: '属七和弦',
  maj7: '大七和弦',
  min7: '小七和弦',
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI → 音名（带八度），如 60 → C4 */
export function midiName(note) {
  return NOTE_NAMES[((note % 12) + 12) % 12] + (Math.floor(note / 12) - 1);
}

/**
 * 构建琶音目标音序。
 * @param {number} rootMidi  根音 MIDI（如 60 = C4）
 * @param {string} quality   和弦性质（CHORD_INTERVALS 的 key）
 * @param {number} octaves   跨几个八度（>=1）
 * @param {'up'|'down'|'updown'} direction 方向
 * @returns {number[]} MIDI 音序
 */
export function buildArpeggio(rootMidi, quality = 'maj', octaves = 1, direction = 'up') {
  const ivs = CHORD_INTERVALS[quality] || CHORD_INTERVALS.maj;
  const up = [];
  for (let o = 0; o < octaves; o++) {
    for (const iv of ivs) up.push(rootMidi + 12 * o + iv);
  }
  up.push(rootMidi + 12 * octaves); // 顶端再补一个根音收束
  if (direction === 'down') return up.slice().reverse();
  if (direction === 'updown') {
    const down = up.slice(0, -1).reverse(); // 去掉重复顶点
    return up.concat(down);
  }
  return up;
}

/** 数组均值 */
export function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/** 总体标准差 */
export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(mean(arr.map((x) => (x - m) ** 2)));
}

/** 变异系数 CV = 标准差 / 均值 */
export function cv(arr) {
  const m = mean(arr);
  return m > 0 ? stddev(arr) / m : 0;
}

/**
 * 均匀度评分：CV<=0 给 100，CV>=loose 给 0，线性。
 * @param {number[]} iois  相邻正确音的时间间隔(ms)
 * @param {number} loose   CV 满偏阈值（默认 0.5 = 50% 抖动算 0 分）
 */
export function evennessScore(iois, loose = 0.5) {
  if (iois.length < 2) return 100;
  const c = cv(iois);
  if (c <= 0) return 100;
  if (c >= loose) return 0;
  return Math.round(100 * (1 - c / loose));
}

/** 速度：每秒音数（基于相邻 IOI 均值） */
export function speedNps(iois) {
  const m = mean(iois);
  return m > 0 ? 1000 / m : 0;
}

export class ArpeggioRuns {
  /**
   * @param {object} opts
   * @param {number} opts.rootMidi   根音 MIDI（默认 60 = C4）
   * @param {string} opts.quality    和弦性质（默认 'maj'）
   * @param {number} opts.octaves    八度数（默认 2）
   * @param {string} opts.direction  'up'|'down'|'updown'（默认 'up'）
   * @param {number} opts.targetNps  目标速度（每秒音数，默认 6）用于速度达标率
   * @param {number} opts.evenLoose  均匀度 CV 满偏阈值（默认 0.5）
   */
  constructor(opts = {}) {
    this.rootMidi = opts.rootMidi ?? 60;
    this.quality = opts.quality ?? 'maj';
    this.octaves = opts.octaves ?? 2;
    this.direction = opts.direction ?? 'up';
    this.targetNps = opts.targetNps ?? 6;
    this.evenLoose = opts.evenLoose ?? 0.5;
    this.target = buildArpeggio(this.rootMidi, this.quality, this.octaves, this.direction);
    this.reset();
  }

  reset() {
    this.idx = 0;          // 下一个待弹目标下标
    this.lastT = null;     // 上一个正确音时间
    this.iois = [];        // 相邻正确音间隔
    this.errors = 0;       // 弹错次数（弹了非目标音）
    this.done = false;
    this.lastResult = null; // 完成后的 {speed, evenness, score, errors, durationMs}
    this.best = 0;          // 历史最佳综合分
    this.bestSpeed = 0;     // 历史最佳速度
    this.runs = 0;          // 完成的轮数
    this.onProgress = () => {}; // (idx, total)
    this.onError = () => {};    // (playedNote, expectedNote)
    this.onComplete = () => {}; // (result)
  }

  /** 当前进度 0..1 */
  get progress() {
    return this.target.length ? this.idx / this.target.length : 0;
  }

  /**
   * 喂入一次击键。
   * @returns {'hit'|'miss'|'done'|'idle'}
   */
  feed(note, t) {
    if (this.done) return 'idle';
    const expected = this.target[this.idx];
    if (note === expected) {
      if (this.lastT !== null) this.iois.push(t - this.lastT);
      this.lastT = t;
      this.idx++;
      this.onProgress(this.idx, this.target.length);
      if (this.idx >= this.target.length) {
        this._finish();
        return 'done';
      }
      return 'hit';
    }
    // 弹错：记一次错误，但不打断序列（允许玩家继续找对的音）
    this.errors++;
    this.onError(note, expected);
    return 'miss';
  }

  _finish() {
    const speed = speedNps(this.iois);
    const evenness = evennessScore(this.iois, this.evenLoose);
    // 速度达标率 0..100（达到 targetNps 即 100，线性封顶）
    const speedScore = Math.max(0, Math.min(100, Math.round((speed / this.targetNps) * 100)));
    // 综合：均匀 60% + 速度达标 40%，再按错误数扣分（每错扣 5，最多扣到 0）
    let score = Math.round(evenness * 0.6 + speedScore * 0.4);
    score = Math.max(0, score - this.errors * 5);
    const durationMs = this.iois.reduce((a, b) => a + b, 0);
    this.lastResult = { speed, evenness, speedScore, score, errors: this.errors, durationMs, notes: this.target.length };
    this.done = true;
    this.runs++;
    if (score > this.best) this.best = score;
    if (speed > this.bestSpeed) this.bestSpeed = speed;
    this.onComplete(this.lastResult);
  }

  /** 开始新一轮（保留 best/bestSpeed/runs 统计） */
  restart() {
    this.idx = 0;
    this.lastT = null;
    this.iois = [];
    this.errors = 0;
    this.done = false;
    this.lastResult = null;
  }
}
