/**
 * leap.js — 音程大跳准确度（leap accuracy）纯逻辑引擎
 *
 * 练"大跳"：旋律里相邻音相距很远（如八度以上），手要直接跳到位、一次弹准，
 * 不能"摸索"（连按几个错音才找到目标）。本模块生成一串相邻间隔较大的目标音，
 * 玩家依次跳到每个目标音上：
 *   - 一次弹准（该目标音之前没弹错）= firstTry 命中，准确度最高
 *   - 弹错音（miss）= 没跳准，不推进，需要继续找到正确目标音才前进
 *   - 命中目标音后推进到下一个
 *
 * 评估：
 *   - 准确度 accuracy：一次弹准的目标数 / 总目标数（核心指标）
 *   - 失误数 misses：总共弹错的次数
 *   - 反应速度（可选）：每个目标从"上一个命中"到"本次命中"的间隔均值
 *
 * 纯逻辑：目标序列可由调用方传入（便于测试），也可用 buildLeaps 随机生成；
 * 音符与时间戳由调用方喂入。
 */

/** 数组均值 */
export function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

/**
 * 生成一串"大跳"目标音序列：相邻音的间隔（半音）>= minLeap。
 * @param {object} opts {low, high, count, minLeap, rand}
 *   low/high  音域 MIDI 上下界（含）
 *   count     目标音个数
 *   minLeap   相邻最小间隔（半音，默认 12 = 八度）
 *   rand      可注入的随机函数（默认 Math.random），便于测试确定性
 * @returns {number[]}
 */
export function buildLeaps(opts = {}) {
  const low = opts.low ?? 48;
  const high = opts.high ?? 84;
  const count = opts.count ?? 8;
  const minLeap = opts.minLeap ?? 12;
  const rand = opts.rand ?? Math.random;
  if (high - low < minLeap) {
    throw new Error('音域太窄，放不下要求的大跳');
  }
  const pick = () => low + Math.floor(rand() * (high - low + 1));
  const seq = [pick()];
  let guard = 0;
  while (seq.length < count) {
    const prev = seq[seq.length - 1];
    let n = pick();
    // 确保与上一个音相距至少 minLeap；尝试多次，必要时强制跳到对侧
    if (Math.abs(n - prev) < minLeap) {
      // 往离 prev 更远的一侧取
      if (prev - low >= high - prev) {
        // 下半区更宽 -> 取低音侧
        const hi = prev - minLeap;
        n = low + Math.floor(rand() * Math.max(1, hi - low + 1));
      } else {
        const lo = prev + minLeap;
        n = lo + Math.floor(rand() * Math.max(1, high - lo + 1));
      }
    }
    n = Math.max(low, Math.min(high, n));
    if (Math.abs(n - prev) >= minLeap) {
      seq.push(n);
    } else if (++guard > 200) {
      // 兜底：强制对侧端点
      seq.push(prev - low >= high - prev ? low : high);
      guard = 0;
    }
  }
  return seq;
}

/** 大跳幅度评分（仅用于展示）：间隔越大给分越高，封顶 100 */
export function leapSpan(seq) {
  if (seq.length < 2) return 0;
  const spans = [];
  for (let i = 1; i < seq.length; i++) spans.push(Math.abs(seq[i] - seq[i - 1]));
  return Math.round(mean(spans));
}

export class LeapTrainer {
  /**
   * @param {object} opts
   * @param {number[]} opts.seq    直接给定目标序列（优先）；否则用下面参数随机生成
   * @param {number} opts.low      音域下界（默认 48 = C3）
   * @param {number} opts.high     音域上界（默认 84 = C6）
   * @param {number} opts.count    目标数（默认 8）
   * @param {number} opts.minLeap  相邻最小间隔半音（默认 12）
   * @param {function} opts.rand   随机函数（测试可注入）
   */
  constructor(opts = {}) {
    this.opts = opts;
    this.seq = opts.seq ? opts.seq.slice() : buildLeaps(opts);
    this.best = 0;
    this.runs = 0;
    this.restart();
  }

  /** 重新生成/重置目标序列（不保留进度，保留 best/runs） */
  regenerate() {
    this.seq = this.opts.seq ? this.opts.seq.slice() : buildLeaps(this.opts);
    this.restart();
  }

  /** 开新一轮，保留 best/runs */
  restart() {
    this.idx = 0;            // 下一个期望目标位置
    this.times = [];         // 命中各目标音的时间戳
    this.misses = 0;         // 总失误数
    this.curMissed = false;  // 当前目标是否已经发生过失误（决定是否算 firstTry）
    this.firstTryHits = 0;   // 一次弹准的目标数
    this.done = false;
    this.lastResult = null;
    this.onHit = () => {};      // (info)
    this.onComplete = () => {}; // (result)
  }

  get length() { return this.seq.length; }
  get progress() { return this.idx; }
  get expected() { return this.done ? null : this.seq[this.idx]; }

  /**
   * 喂入一次敲击。
   * @returns {'miss'|'hit'|'done'|'idle'}
   */
  feed(note, t) {
    if (this.done) return 'idle';
    const exp = this.seq[this.idx];
    if (note !== exp) {
      this.misses++;
      this.curMissed = true;
      this.onHit({ kind: 'miss', note, expected: exp, index: this.idx });
      return 'miss';
    }
    if (!this.curMissed) this.firstTryHits++;
    this.times.push(t);
    const index = this.idx;
    const firstTry = !this.curMissed;
    this.idx++;
    this.curMissed = false;
    this.onHit({ kind: 'hit', note, index, firstTry });
    if (this.idx >= this.seq.length) {
      this._finish();
      return 'done';
    }
    return 'hit';
  }

  /** 命中目标之间的间隔（反应速度） */
  _iois() {
    const out = [];
    for (let i = 1; i < this.times.length; i++) out.push(this.times[i] - this.times[i - 1]);
    return out;
  }

  _finish() {
    if (this.done) return;
    const total = this.seq.length;
    const accuracy = total ? Math.round((this.firstTryHits / total) * 100) : 0;
    const meanIoi = Math.round(mean(this._iois()));
    this.lastResult = {
      accuracy,
      firstTryHits: this.firstTryHits,
      total,
      misses: this.misses,
      meanIoi,
      score: accuracy, // 综合分即一次弹准率
      span: leapSpan(this.seq),
    };
    this.done = true;
    this.runs++;
    if (accuracy > this.best) this.best = accuracy;
    this.onComplete(this.lastResult);
  }

  /** 手动结束 */
  finish() { this._finish(); }
}
