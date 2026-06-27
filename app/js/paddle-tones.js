/**
 * paddle-tones.js — 🏓 弹球接音（Paddle Tones，纯逻辑）
 *
 * 设计（Theta 最上瘾的玩法之一，搬到 88 键上）：
 *  - 一颗颗"音球"从顶上落下，每颗球带一个<b>目标音</b>（音级，去八度）；
 *  - 球落到底之前，玩家在琴上<b>弹出对应的音</b>把它"弹回去"接住 🏓——接住得分、攒连击；
 *  - 弹错音不扣分（只断连击、温和），球落到地面 = 漏接（也只断连击，无 game-over）。
 *
 * 两种模式：
 *  - 看音名（球上写 C/D/E…，练读音名 + 找键）
 *  - 听音接（球是空白的，落下时发声，靠耳朵找音——和 ear-training 同精神）
 *
 * 时间戳由调用方喂入（performance.now()），便于单元测试。纯逻辑：不碰 MIDI/DOM/音频。
 */

const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 音球的来源音池（按难度累进） */
export const POOLS = [
  { id: 'penta', name: '五声·简单', emoji: '🌱', level: 1, pcs: [0, 2, 4, 7, 9] },              // C D E G A
  { id: 'cmaj',  name: 'C 大调',    emoji: '🌿', level: 2, pcs: [0, 2, 4, 5, 7, 9, 11] },        // C D E F G A B
  { id: 'chromatic', name: '半音·挑战', emoji: '🔥', level: 3, pcs: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

export function poolById(id) {
  return POOLS.find((p) => p.id === id) || POOLS[0];
}

/** 音级 0..11 → 音名 */
export function pcName(pc) {
  return NN[((pc % 12) + 12) % 12];
}

/** MIDI → 音级 0..11 */
export function pitchClass(midi) {
  return ((midi % 12) + 12) % 12;
}

/**
 * 生成一局的音球序列：count 颗球，spawn 时刻按 gapMs 等距，每颗随机取池中音级（避免连续重复）。
 * @returns {Array<{i,pc,name,spawnMs}>}
 */
export function buildBalls({ pool, count = 12, gapMs = 1400, leadMs = 800, rng = Math.random } = {}) {
  const p = typeof pool === 'string' ? poolById(pool) : (pool || POOLS[0]);
  const balls = [];
  let prev = -1;
  for (let i = 0; i < count; i++) {
    let pc = p.pcs[Math.floor(rng() * p.pcs.length)];
    if (p.pcs.length > 1 && pc === prev) {
      pc = p.pcs[(p.pcs.indexOf(pc) + 1) % p.pcs.length];
    }
    prev = pc;
    balls.push({ i, pc, name: pcName(pc), spawnMs: leadMs + i * gapMs });
  }
  return balls;
}

/**
 * 一局弹球接音。
 */
export class PaddleTones {
  /**
   * @param {object} opts
   * @param {string|object} opts.pool 音池 id 或对象
   * @param {number} opts.count  球数（默认 12）
   * @param {number} opts.fallMs 一颗球从顶落到底的时间（默认 2600）
   * @param {number} opts.gapMs  相邻球的出生间隔（默认 1400）
   * @param {number} opts.catchTop 可接区上界（y，默认 0.45：屏幕下半部才能接，像球拍在下方）
   * @param {number} opts.catchBottom 可接区下界（y，默认 1.12：略低于地面线仍可救）
   */
  constructor(opts = {}) {
    this.pool = typeof opts.pool === 'string' ? poolById(opts.pool) : (opts.pool || POOLS[0]);
    this.fallMs = opts.fallMs ?? 2600;
    this.gapMs = opts.gapMs ?? 1400;
    this.catchTop = opts.catchTop ?? 0.45;
    this.catchBottom = opts.catchBottom ?? 1.12;
    this.balls = buildBalls({
      pool: this.pool, count: opts.count ?? 12, gapMs: this.gapMs,
      leadMs: opts.leadMs ?? 800, rng: opts.rng,
    }).map((b) => ({ ...b, caught: false, missed: false }));
    this.reset();
  }

  reset() {
    for (const b of this.balls) { b.caught = false; b.missed = false; }
    this.combo = 0;
    this.bestCombo = 0;
    this.score = 0;
    this.caughtCount = 0;
    this.missedCount = 0;
    this.strayCount = 0;
  }

  get total() { return this.balls.length; }
  get settled() { return this.caughtCount + this.missedCount; }

  /** 一颗球在 now 的下落进度 y（0=顶, 1=地面线） */
  yOf(ball, now) {
    return (now - ball.spawnMs) / this.fallMs;
  }

  /** 总时长（最后一颗球落地 + 余量） */
  durationMs() {
    const last = this.balls[this.balls.length - 1];
    return (last ? last.spawnMs : 0) + this.fallMs + 400;
  }

  /**
   * 在 now 时刻弹了一个音（midi）。接住可接区内、音级匹配、最靠近地面的那颗球。
   * @returns {{hit:boolean, stray?:boolean, ball?:object, y?:number, combo?:number, perfect?:boolean}}
   *   stray=true：弹的音不匹配任何可接球（断连击但不扣分）。
   */
  play(midi, now) {
    const pc = pitchClass(midi);
    let best = null, bestY = -Infinity;
    for (const b of this.balls) {
      if (b.caught || b.missed) continue;
      if (b.pc !== pc) continue;
      const y = this.yOf(b, now);
      if (y < this.catchTop || y > this.catchBottom) continue;
      if (y > bestY) { best = b; bestY = y; } // 越靠近地面越优先
    }
    if (!best) {
      this.strayCount += 1;
      this.combo = 0;
      return { hit: false, stray: true, pc };
    }
    best.caught = true;
    this.caughtCount += 1;
    this.combo += 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    // 越接近地面接住越"惊险"，给满分；上半区从容接住给基础分
    const perfect = bestY >= 0.78;
    this.score += perfect ? 100 : 70;
    return { hit: true, ball: best, y: bestY, combo: this.combo, perfect };
  }

  /**
   * 推进到 now：把落过地面线（y > catchBottom）仍未接住的球标记为漏接、断连击。
   * @returns {number[]} 本次新漏接的球下标
   */
  expire(now) {
    const missed = [];
    for (const b of this.balls) {
      if (b.caught || b.missed) continue;
      if (this.yOf(b, now) > this.catchBottom) {
        b.missed = true;
        this.missedCount += 1;
        this.combo = 0;
        missed.push(b.i);
      }
    }
    return missed;
  }

  /**
   * 渲染用：当前在屏幕上可见的球及其 y。
   */
  activeBalls(now) {
    const out = [];
    for (const b of this.balls) {
      const y = this.yOf(b, now);
      if (y >= -0.05 && y <= 1.2 && !b.caught) {
        out.push({ i: b.i, pc: b.pc, name: b.name, y, missed: b.missed });
      }
    }
    return out;
  }

  /** 接住率 0..100 */
  catchRate() {
    return this.total ? Math.round(this.caughtCount / this.total * 100) : 0;
  }

  /** 评星 1..3（按接住率） */
  stars() {
    const r = this.catchRate();
    if (r >= 90) return 3;
    if (r >= 60) return 2;
    if (r >= 1) return 1;
    return 0;
  }

  isDone() { return this.balls.every((b) => b.caught || b.missed); }
  progress() { return this.total ? this.settled / this.total : 0; }
}

const exported = {
  POOLS, poolById, pcName, pitchClass, buildBalls, PaddleTones,
};
export default exported;
