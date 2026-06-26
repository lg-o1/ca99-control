/**
 * staff-wars.js — 看谱击落（Staff Wars 式街机，纯逻辑，可测试）
 *
 * 音符像「入侵者」从右侧飞向左侧炮台；玩家读出音符、在真琴上弹对应的键 → 击落它。
 * 飞到最左（炮台）就丢一条命；得分到阈值升级、提速。只用白键音（无升降号），
 * 适合初学者读谱。所有随机、计时由调用方注入（rng / dt），便于单测。
 */

// 谱号音池（全为自然音，便于读谱）
export const TREBLE_POOL = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79]; // C4–G5
export const BASS_POOL = [43, 45, 47, 48, 50, 52, 53, 55, 57, 59, 60, 62];   // G2–D4

const WHITE = [0, 2, 4, 5, 7, 9, 11];
/** 白键的「全音阶序号」（C 系列计数），给五线谱纵向定位用 */
export function diatonicIndex(midi) {
  const pc = ((midi % 12) + 12) % 12;
  const oct = Math.floor(midi / 12);
  let i = WHITE.indexOf(pc);
  if (i < 0) i = 0; // 容错：非白键归到最近的下方白键
  return oct * 7 + i;
}

const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
/** 音名字母（不含八度），如 60→'C' */
export function noteLetter(midi) {
  return LETTERS[((diatonicIndex(midi) % 7) + 7) % 7];
}

/** 简单可注入的种子随机数（mulberry32），便于测试确定性 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickNote(rng, pool) {
  return pool[Math.floor(rng() * pool.length) % pool.length];
}

export class StaffWars {
  constructor(opts = {}) {
    this.pool = opts.pool || TREBLE_POOL;
    this.rng = opts.rng || Math.random;
    this.baseSpeed = opts.speed || 0.07;     // 每秒移动的轨道比例
    this.baseSpawn = opts.spawnEvery || 2.4; // 多少秒生成一个
    this.maxLives = opts.lives || 3;
    this.matchExact = opts.matchExact || false;
    this.reset();
  }

  reset() {
    this.invaders = []; // {id, midi, x}  x: 1=最右出生, 0=最左炮台
    this.lives = this.maxLives;
    this.score = 0;
    this.hits = 0;
    this.level = 1;
    this.alive = true;
    this._id = 0;
    this._spawnT = 0;
    this._speed = this.baseSpeed;
    this._spawnEvery = this.baseSpawn;
  }

  get speed() { return this._speed; }
  get spawnEvery() { return this._spawnEvery; }

  spawn() {
    const midi = pickNote(this.rng, this.pool);
    const inv = { id: ++this._id, midi, x: 1 };
    this.invaders.push(inv);
    return inv;
  }

  /** 推进 dt 秒：移动入侵者、按需生成、回收越界者（每个丢一条命） */
  tick(dt) {
    if (!this.alive) return { expired: [] };
    this._spawnT += dt;
    while (this._spawnT >= this._spawnEvery) {
      this._spawnT -= this._spawnEvery;
      this.spawn();
    }
    for (const inv of this.invaders) inv.x -= this._speed * dt;
    const expired = [];
    this.invaders = this.invaders.filter(inv => {
      if (inv.x <= 0) { expired.push(inv); return true; }
      return true;
    }).filter(inv => inv.x > 0);
    for (const e of expired) this._loseLife();
    return { expired };
  }

  _loseLife() {
    this.lives = Math.max(0, this.lives - 1);
    if (this.lives === 0) this.alive = false;
  }

  /** 弹键判定：命中最靠左（最危险）的同音高入侵者；返回 {hit, note?}
   *  默认按音名字母匹配（任意八度都算对，对初学者更友好）；matchExact 则要求精确音高。 */
  hit(midi) {
    if (!this.alive) return { hit: false };
    const same = (a, b) => this.matchExact ? a === b : noteLetter(a) === noteLetter(b);
    let target = null;
    for (const inv of this.invaders) {
      if (same(inv.midi, midi) && (!target || inv.x < target.x)) target = inv;
    }
    if (!target) return { hit: false, miss: true };
    this.invaders = this.invaders.filter(i => i.id !== target.id);
    this.score += 10;
    this.hits += 1;
    if (this.hits % 5 === 0) this._levelUp();
    return { hit: true, note: target };
  }

  _levelUp() {
    this.level += 1;
    this._speed *= 1.15;
    this._spawnEvery = Math.max(0.9, this._spawnEvery * 0.9);
  }
}
