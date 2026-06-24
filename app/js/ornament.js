/**
 * ornament.js — 装饰音（ornaments）纯逻辑引擎
 *
 * 练习三种常见钢琴装饰音，按"目标音符序列"逐音匹配，并评估装饰音的"干脆度/速度"：
 *
 *   - 倚音 acciaccatura（grace）：一个小音 + 主音，序列 = [grace, main]
 *       上行 grace = main+interval；下行 grace = main−interval
 *   - 波音 mordent（涟音）：主-辅-主，序列 = [main, aux, main]
 *       上波音 aux = main+interval；下波音 aux = main−interval
 *   - 回音 turn（grupetto）：上辅-主-下辅-主，序列 = [main+iv, main, main−iv, main]
 *
 * 评估：
 *   - 音高正确性：逐音必须与目标序列一致；弹错音 = wrongNotes（不推进序列）
 *   - 干脆度/速度：装饰音的"前几个音"（除最后落到主音外）应当快速且均匀，
 *     用相邻音间隔(IOI)的均值与目标 crisp(ms) 比较，越快越干脆；多个间隔时再看均匀度
 *
 * 纯逻辑：音符与时间戳由调用方喂入，便于单元测试。
 */

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

/** 变异系数 */
export function cv(arr) {
  const m = mean(arr);
  return m > 0 ? stddev(arr) / m : 0;
}

/** 均匀度评分：CV<=0 给 100，>=loose 给 0，线性 */
export function evennessScore(iois, loose = 0.6) {
  if (iois.length < 2) return 100;
  const c = cv(iois);
  if (c <= 0) return 100;
  if (c >= loose) return 0;
  return Math.round(100 * (1 - c / loose));
}

export const ORNAMENT_LABELS = {
  grace: '倚音',
  mordent: '波音',
  turn: '回音',
};

/**
 * 构造装饰音的目标音符序列。
 * @param {object} opts {type, main, direction:'upper'|'lower', interval}
 * @returns {number[]} MIDI 音符序列
 */
export function buildOrnament(opts = {}) {
  const type = opts.type ?? 'mordent';
  const main = opts.main ?? 60;
  const iv = opts.interval ?? 2;
  const dir = opts.direction ?? 'upper';
  const sign = dir === 'lower' ? -1 : 1;
  if (type === 'grace') {
    return [main + sign * iv, main];
  }
  if (type === 'mordent') {
    return [main, main + sign * iv, main];
  }
  if (type === 'turn') {
    // 回音：上辅 - 主 - 下辅 - 主
    return [main + iv, main, main - iv, main];
  }
  throw new Error('unknown ornament type: ' + type);
}

/** 速度评分：装饰音间隔均值 m 越接近/快于 crisp 越高（m<=crisp 给 100，>=crisp*3 给 0） */
export function crispScore(meanIoi, crisp = 120) {
  if (meanIoi <= 0) return 100;
  if (meanIoi <= crisp) return 100;
  const hi = crisp * 3;
  if (meanIoi >= hi) return 0;
  return Math.round(100 * (1 - (meanIoi - crisp) / (hi - crisp)));
}

export class OrnamentTrainer {
  /**
   * @param {object} opts
   * @param {string} opts.type       'grace' | 'mordent' | 'turn'（默认 mordent）
   * @param {number} opts.main       主音 MIDI（默认 60 = C4）
   * @param {string} opts.direction  'upper' | 'lower'（默认 upper）
   * @param {number} opts.interval   装饰音与主音的半音间隔（默认 2 = 全音）
   * @param {number} opts.crisp      装饰音目标间隔 ms（默认 120，越小越要求干脆）
   */
  constructor(opts = {}) {
    this.type = opts.type ?? 'mordent';
    this.main = opts.main ?? 60;
    this.direction = opts.direction ?? 'upper';
    this.interval = opts.interval ?? 2;
    this.crisp = opts.crisp ?? 120;
    this.seq = buildOrnament(this);
    this.best = 0;
    this.runs = 0;
    this.restart();
  }

  /** 重新构造目标序列（改参数后调用） */
  rebuild() {
    this.seq = buildOrnament(this);
    this.restart();
  }

  /** 开新一轮，保留 best/runs */
  restart() {
    this.idx = 0;          // 下一个期望的序列位置
    this.times = [];       // 命中各目标音的时间戳
    this.wrongNotes = 0;   // 弹错音次数
    this.done = false;
    this.lastResult = null;
    this.onHit = () => {};      // (info)
    this.onComplete = () => {}; // (result)
  }

  get length() { return this.seq.length; }
  /** 已命中的音数 */
  get progress() { return this.idx; }
  /** 下一个期望音（已完成则 null） */
  get expected() { return this.done ? null : this.seq[this.idx]; }

  /**
   * 喂入一次敲击。
   * @returns {'wrong'|'hit'|'done'|'idle'}
   */
  feed(note, t) {
    if (this.done) return 'idle';
    const exp = this.seq[this.idx];
    if (note !== exp) {
      this.wrongNotes++;
      this.onHit({ kind: 'wrong', note, expected: exp, index: this.idx });
      return 'wrong';
    }
    this.times.push(t);
    const index = this.idx;
    this.idx++;
    this.onHit({ kind: 'hit', note, index });
    if (this.idx >= this.seq.length) {
      this._finish();
      return 'done';
    }
    return 'hit';
  }

  /** 装饰音部分的相邻间隔（除最后落到主音之外的快速部分；这里取全部相邻 IOI） */
  _iois() {
    const out = [];
    for (let i = 1; i < this.times.length; i++) out.push(this.times[i] - this.times[i - 1]);
    return out;
  }

  _finish() {
    if (this.done) return;
    const iois = this._iois();
    const meanIoi = mean(iois);
    const speed = crispScore(meanIoi, this.crisp);
    const evenness = evennessScore(iois, 0.6);
    // 综合：速度 50% + 均匀 50%，再按错音扣分（每个 -8）
    let score = Math.round(speed * 0.5 + evenness * 0.5);
    score = Math.max(0, score - this.wrongNotes * 8);
    this.lastResult = {
      type: this.type,
      score, speed, evenness,
      meanIoi: Math.round(meanIoi),
      wrongNotes: this.wrongNotes,
      notes: this.seq.length,
    };
    this.done = true;
    this.runs++;
    if (score > this.best) this.best = score;
    this.onComplete(this.lastResult);
  }

  /** 手动结束（提前停止时调用） */
  finish() { this._finish(); }
}
