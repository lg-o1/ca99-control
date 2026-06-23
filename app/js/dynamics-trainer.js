/**
 * dynamics-trainer.js — 力度练习（dynamics trainer）纯逻辑引擎
 *
 * 给出一个目标力度（pp/p/mp/mf/f/ff），玩家按一个琴键，
 * 根据 note-on 的力度（velocity 1..127）判断是否落在目标力度范围内，
 * 训练"控制弹奏强弱"的表现力。纯逻辑：不碰 MIDI/DOM。
 */

/** 6 档力度，按 velocity 区间划分（覆盖 1..127，无缝衔接） */
export const DYNAMICS = [
  { key: 'pp', name: '极弱', sym: 'pp', min: 1,   max: 31 },
  { key: 'p',  name: '弱',   sym: 'p',  min: 32,  max: 51 },
  { key: 'mp', name: '中弱', sym: 'mp', min: 52,  max: 67 },
  { key: 'mf', name: '中强', sym: 'mf', min: 68,  max: 84 },
  { key: 'f',  name: '强',   sym: 'f',  min: 85,  max: 105 },
  { key: 'ff', name: '极强', sym: 'ff', min: 106, max: 127 },
];

const INDEX_BY_KEY = new Map(DYNAMICS.map((d, i) => [d.key, i]));

/** velocity(1..127) -> 力度档位下标（0..5）。越界自动夹到两端。 */
export function velocityToIndex(vel) {
  if (vel <= DYNAMICS[0].max) return 0;
  for (let i = 0; i < DYNAMICS.length; i++) {
    if (vel >= DYNAMICS[i].min && vel <= DYNAMICS[i].max) return i;
  }
  return DYNAMICS.length - 1; // >127 兜底
}

/** velocity -> 力度对象 */
export function velocityToDynamic(vel) {
  return DYNAMICS[velocityToIndex(vel)];
}

/** key -> 力度档位下标（找不到返回 -1） */
export function indexByKey(key) {
  return INDEX_BY_KEY.has(key) ? INDEX_BY_KEY.get(key) : -1;
}

/** 默认练习档位：p / mf / f（初学先练三档对比） */
export const DEFAULT_LEVELS = ['p', 'mf', 'f'];

export class DynamicsGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string[]} opts.levels    参与练习的力度 key 集合
   * @param {number} opts.tolerance   允许偏差档数（0=必须精确命中，1=相邻档也算对）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    const lv = (opts.levels && opts.levels.length ? opts.levels : DEFAULT_LEVELS)
      .filter((k) => INDEX_BY_KEY.has(k));
    this.levels = lv.length ? lv : DEFAULT_LEVELS.slice();
    this.tolerance = opts.tolerance ?? 0;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // 目标力度 key
    this.onNew = () => {};
    this.onResult = () => {}; // (correct, {velocity, playedKey, targetKey, diff, score, streak}) => void
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题（目标力度），返回目标 key */
  next() {
    this.current = this._pick(this.levels);
    this.onNew(this.current);
    return this.current;
  }

  /** 当前目标力度对象 */
  target() { return this.current ? DYNAMICS[INDEX_BY_KEY.get(this.current)] : null; }

  /**
   * 按某个 velocity 作答。
   * @param {number} velocity note-on 力度（1..127）
   * @returns {boolean}
   */
  check(velocity) {
    if (!this.current) return false;
    this.attempts++;
    const targetIdx = INDEX_BY_KEY.get(this.current);
    const playedIdx = velocityToIndex(velocity);
    const diff = playedIdx - targetIdx;
    const correct = Math.abs(diff) <= this.tolerance;
    const playedKey = DYNAMICS[playedIdx].key;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      velocity, playedKey, targetKey: this.current, diff,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
