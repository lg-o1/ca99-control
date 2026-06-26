/**
 * drops.js — 接音水滴（Theta「Drops」式，纯逻辑，可测试）
 *
 * 音符「水滴」从顶部落下，玩家在钢琴上弹出对应的音把它接住 🫧。
 * 与「看谱击落」区分：这里走<b>音名 + 声音</b>（不读五线谱），训练键盘地理与听辨；
 * 而且<b>轻松无 game-over</b>——漏掉只是断连击、不结束，重在多接、连击刷新纪录。
 *
 * 所有随机/计时由调用方注入（rng / dt），便于单测。
 */

export const POOL_C = [60, 62, 64, 65, 67, 69, 71, 72]; // C4–C5 自然音

const WHITE = [0, 2, 4, 5, 7, 9, 11];
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export function noteLetter(midi) {
  const pc = ((midi % 12) + 12) % 12;
  let i = WHITE.indexOf(pc); if (i < 0) i = 0;
  return LETTERS[i];
}

/** 种子随机（mulberry32），便于测试确定性 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Drops {
  constructor(opts = {}) {
    this.pool = opts.pool || POOL_C;
    this.rng = opts.rng || Math.random;
    this.fallSpeed = opts.fallSpeed || 0.18;   // 每秒下落比例（0=顶,1=地面）
    this.spawnEvery = opts.spawnEvery || 1.8;  // 多少秒生成一个
    this.matchExact = opts.matchExact || false;
    this.reset();
  }

  reset() {
    this.drops = [];   // {id, midi, y, x}
    this.caught = 0;
    this.missed = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this._id = 0;
    this._spawnT = 0;
  }

  spawn() {
    const midi = this.pool[Math.floor(this.rng() * this.pool.length) % this.pool.length];
    const d = { id: ++this._id, midi, y: 0, x: 0.1 + this.rng() * 0.8 };
    this.drops.push(d);
    return d;
  }

  /** 推进 dt 秒：下落 + 按需生成；落地者回收并断连击。返回 {floored:[]} */
  tick(dt) {
    this._spawnT += dt;
    while (this._spawnT >= this.spawnEvery) { this._spawnT -= this.spawnEvery; this.spawn(); }
    for (const d of this.drops) d.y += this.fallSpeed * dt;
    const floored = this.drops.filter(d => d.y >= 1);
    if (floored.length) {
      this.drops = this.drops.filter(d => d.y < 1);
      this.missed += floored.length;
      this.combo = 0;
    }
    return { floored };
  }

  /** 弹键接住：命中最靠下（最紧急）的同音名水滴；返回 {caught, drop?} */
  catch(midi) {
    const same = (a, b) => this.matchExact ? a === b : noteLetter(a) === noteLetter(b);
    let target = null;
    for (const d of this.drops) {
      if (same(d.midi, midi) && (!target || d.y > target.y)) target = d;
    }
    if (!target) return { caught: false, miss: true };
    this.drops = this.drops.filter(d => d.id !== target.id);
    this.caught += 1;
    this.combo += 1;
    if (this.combo > this.bestCombo) this.bestCombo = this.combo;
    return { caught: true, drop: target };
  }
}
