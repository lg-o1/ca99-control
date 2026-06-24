/**
 * rhythm-dictation.js — 节奏听写（rhythm dictation）纯逻辑引擎
 *
 * 与"节奏跟拍"不同：这里【不显示】节奏型，UI 只把一段节奏【放给你听】，
 * 你在任意一个键上把它【敲回来】。评分【与速度无关】——只看你敲出的
 * 相邻间隔（IOI）的【比例】是否和目标一致，所以你敲快敲慢都行，关键是
 * 长短关系对不对（如 短短长 vs 长短短）。
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM——只生成节奏（相对时值序列）并校验
 * 敲击时间戳，方便确定性单元测试（注入 rng）。播放与采集交给 UI。
 *
 * 时间以毫秒计。一段含 N 个音的节奏 → N 个落点 → N-1 个间隔（IOI），
 * 评分比较这 N-1 个间隔的比例。
 */

/** 时值词表：以八分音符为 1 个单位 */
export const DURATIONS = {
  sixteenth: { units: 0.5, name: '十六分', sym: '♬' },
  eighth: { units: 1, name: '八分', sym: '♪' },
  dottedEighth: { units: 1.5, name: '附点八分', sym: '♪.' },
  quarter: { units: 2, name: '四分', sym: '♩' },
  dottedQuarter: { units: 3, name: '附点四分', sym: '♩.' },
  half: { units: 4, name: '二分', sym: '𝅗𝅥' },
};

/** 难度预设：每级可用的时值单位集合 + 音符个数范围 */
export const DICTATION_LEVELS = [
  { id: 'easy', name: '入门', desc: '八分 + 四分，4~5 个音', pool: [1, 2], min: 4, max: 5 },
  { id: 'medium', name: '进阶', desc: '加附点四分，5~6 个音', pool: [1, 2, 3], min: 5, max: 6 },
  { id: 'hard', name: '挑战', desc: '加十六分/附点八分，6~8 个音', pool: [0.5, 1, 1.5, 2, 3], min: 6, max: 8 },
];

/** 默认评分容差：相邻间隔相对误差到 tol 即得 0 分，0 误差得满分 */
export const DEFAULT_DICT_TOL = 0.30;

function clamp(x, lo = 0, hi = 1) { return Math.max(lo, Math.min(hi, x)); }

/** 把时间戳序列转成相邻间隔（IOI）数组 */
export function ioisFromTimes(times) {
  const out = [];
  for (let i = 1; i < times.length; i++) out.push(times[i] - times[i - 1]);
  return out;
}

/** 求和 */
function sum(arr) { return arr.reduce((s, x) => s + x, 0); }

/**
 * 生成一段节奏。返回 { durations, iois, totalUnits }：
 *   durations  每个音的时值（八分单位），长度 = 音符个数
 *   iois       相邻音之间的间隔（= durations 去掉最后一个），长度 = 音符个数 - 1
 * @param {function} rng  返回 [0,1) 的随机函数（默认 Math.random）
 * @param {object} level  DICTATION_LEVELS 之一
 */
export function generatePattern(rng = Math.random, level = DICTATION_LEVELS[0]) {
  const n = level.min + Math.floor(rng() * (level.max - level.min + 1));
  const durations = [];
  for (let i = 0; i < n; i++) {
    const u = level.pool[Math.floor(rng() * level.pool.length)];
    durations.push(u);
  }
  // 至少要有一点长短变化，避免全是同一个值（听写没意义）
  if (level.pool.length > 1 && durations.every((d) => d === durations[0])) {
    const others = level.pool.filter((u) => u !== durations[0]);
    durations[Math.floor(rng() * durations.length)] = others[Math.floor(rng() * others.length)];
  }
  const iois = durations.slice(0, durations.length - 1);
  return { durations, iois, totalUnits: sum(durations) };
}

/**
 * 把时值（八分单位）按 BPM 换算成落点时间戳。
 * 一个四分音符 = 1 拍 = 60000/bpm 毫秒，八分单位 = 半拍。
 */
export function patternToOnsets(durations, bpm, startTime = 0) {
  const eighthMs = (60000 / bpm) / 2;
  const onsets = [startTime];
  for (let i = 0; i < durations.length - 1; i++) {
    onsets.push(onsets[onsets.length - 1] + durations[i] * eighthMs);
  }
  return onsets;
}

/**
 * 评分（与速度无关）。把用户敲击整体缩放到与目标同样的总时长后，
 * 逐间隔比较相对误差。
 *
 * @param {number[]} targetIois  目标相邻间隔（任意单位，比例才重要）
 * @param {number[]} userIois    用户敲击得到的相邻间隔（毫秒）
 * @param {object} opts          { tol }
 * @returns {object} {
 *   score, rhythmAccuracy, countScore, correct, total,
 *   perInterval:[{target,scaledUser,relErr,score}], scale, extra
 * }
 */
export function evaluateDictation(targetIois, userIois, opts = {}) {
  const tol = opts.tol ?? DEFAULT_DICT_TOL;
  const n = targetIois.length;
  const m = userIois.length;
  if (n === 0) {
    return { score: 0, rhythmAccuracy: 0, countScore: 0, correct: 0, total: 0, perInterval: [], scale: 1, extra: m };
  }
  if (m === 0) {
    return { score: 0, rhythmAccuracy: 0, countScore: 0, correct: 0, total: n, perInterval: [], scale: 1, extra: -n };
  }
  // 整体缩放：把用户总时长对齐到目标总时长 → 去掉速度因素
  const tTotal = sum(targetIois);
  const uTotal = sum(userIois);
  const scale = uTotal > 0 ? tTotal / uTotal : 1;

  const k = Math.min(n, m);
  const perInterval = [];
  let correct = 0;
  for (let i = 0; i < k; i++) {
    const scaledUser = userIois[i] * scale;
    const relErr = targetIois[i] > 0 ? Math.abs(scaledUser - targetIois[i]) / targetIois[i] : 0;
    const iScore = clamp(1 - relErr / tol);
    if (iScore >= 0.5) correct++;
    perInterval.push({ target: targetIois[i], scaledUser, relErr, score: iScore });
  }
  const rhythmAccuracy = perInterval.reduce((s, p) => s + p.score, 0) / k;
  // 个数匹配（Dice 系数）：个数对得 1，多敲/少敲都打折
  const countScore = (2 * k) / (n + m);
  const score = Math.round(100 * rhythmAccuracy * countScore);
  return {
    score,
    rhythmAccuracy,
    countScore,
    correct,
    total: n,
    perInterval,
    scale,
    extra: m - n,
  };
}

/** 一轮节奏听写训练；UI 放完节奏后采集敲击时间戳喂进来。 */
export class RhythmDictationTrainer {
  /**
   * @param {object} opts { rng, level, bpm }
   *   bpm 仅用于 UI 播放与默认参考；评分与速度无关。
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.level = opts.level || DICTATION_LEVELS[0];
    this.bpm = opts.bpm || 90;
    this.tol = opts.tol ?? DEFAULT_DICT_TOL;
    this.best = 0;
    this.rounds = 0;
    this.newPattern();
  }

  /** 生成新的一段节奏，重置本轮采集 */
  newPattern() {
    const p = generatePattern(this.rng, this.level);
    this.durations = p.durations;
    this.targetIois = p.iois;
    this.taps = [];           // 敲击时间戳
    this.finished = false;
    this.lastResult = null;
    return p;
  }

  /** 该段节奏的音符个数 = 期望敲击次数 */
  get expectedTaps() { return this.durations.length; }

  /** UI 播放用：落点时间戳（以 startTime 起算） */
  onsets(startTime = 0) { return patternToOnsets(this.durations, this.bpm, startTime); }

  /**
   * 敲一下（note 可忽略，节奏听写只看时间）。
   * 采满 expectedTaps 个敲击后自动结算并返回 summary（done:true）；
   * 否则返回 { done:false, taps }。
   */
  feed(note, time) {
    if (this.finished) return this.lastResult;
    this.taps.push(time);
    if (this.taps.length >= this.expectedTaps) return this.finish();
    return { done: false, taps: this.taps.length, expected: this.expectedTaps };
  }

  /** 结束并评分当前已采集的敲击（用户可少敲后手动结束） */
  finish() {
    if (this.finished && this.lastResult) return this.lastResult;
    const userIois = ioisFromTimes(this.taps);
    const ev = evaluateDictation(this.targetIois, userIois, { tol: this.tol });
    this.finished = true;
    this.rounds++;
    if (ev.score > this.best) this.best = ev.score;
    this.lastResult = { done: true, ...ev, taps: this.taps.length, expected: this.expectedTaps, best: this.best, rounds: this.rounds };
    return this.lastResult;
  }
}
