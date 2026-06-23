/**
 * auto-rotate.js — 自动换音色引擎（纯逻辑，可测试）
 * 支持两种触发：按时间（每 N 秒）或按节拍（监听 MIDI 时钟/手动 tap）。
 * 引擎本身不发 MIDI，只决定"下一个该用哪个音色"，由调用方发送。
 */

export class RotateEngine {
  /**
   * @param {object} opts
   * @param {number[]} opts.pool     音色 id 池（按此顺序循环）
   * @param {string}   opts.mode     'time' | 'beat'
   * @param {number}   opts.interval time 模式=秒；beat 模式=拍数
   * @param {string}   opts.order    'sequential' | 'random'
   */
  constructor(opts = {}) {
    this.pool = opts.pool || [];
    this.mode = opts.mode || 'time';
    this.interval = opts.interval || 4;
    this.order = opts.order || 'sequential';
    this._idx = 0;
    this._beatCount = 0;
    this._running = false;
    this.onChange = () => {}; // (soundId) => void
  }

  /** 当前应使用的音色 id */
  current() {
    return this.pool.length ? this.pool[this._idx % this.pool.length] : null;
  }

  /** 推进到下一个音色，返回新 id */
  next() {
    if (!this.pool.length) return null;
    if (this.order === 'random') {
      // 随机但避免连续重复
      if (this.pool.length === 1) { /* keep */ }
      else {
        let n;
        do { n = Math.floor(Math.random() * this.pool.length); } while (n === this._idx);
        this._idx = n;
      }
    } else {
      this._idx = (this._idx + 1) % this.pool.length;
    }
    const id = this.current();
    this.onChange(id);
    return id;
  }

  /**
   * beat 模式：每收到一拍调用。累计到 interval 拍就换。
   * @returns {?number} 换了则返回新 id，否则 null
   */
  tick() {
    if (this.mode !== 'beat' || !this._running) return null;
    this._beatCount++;
    if (this._beatCount >= this.interval) {
      this._beatCount = 0;
      return this.next();
    }
    return null;
  }

  /** 启动（time 模式用 setInterval；beat 模式靠 tick()） */
  start(setIntervalFn = setInterval) {
    if (this._running) return;
    this._running = true;
    this._beatCount = 0;
    // 启动即应用当前音色
    this.onChange(this.current());
    if (this.mode === 'time') {
      this._timer = setIntervalFn(() => this.next(), this.interval * 1000);
    }
  }

  /** 停止 */
  stop(clearIntervalFn = clearInterval) {
    this._running = false;
    if (this._timer) { clearIntervalFn(this._timer); this._timer = null; }
  }

  get running() { return this._running; }

  /** 重置到池首 */
  reset() { this._idx = 0; this._beatCount = 0; }
}

/**
 * 从音色列表构造常用音色池（用 id）
 * 例：取每个分类的第一个，做一个"多样化"池
 */
export function diversePool(sounds, categories) {
  const pool = [];
  for (const cat of categories) {
    const first = sounds.find(s => s.category === cat);
    if (first) pool.push(first.id);
  }
  return pool;
}
