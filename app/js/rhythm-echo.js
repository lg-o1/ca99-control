/**
 * rhythm-echo.js — 🥁 节奏回声（Simon 式节奏记忆游戏）纯逻辑
 *
 * 玩法：app 用「亮灯 + 打点」播放一段节奏型（长短音的组合，例如 ♩ ♩ ♫ ♩），
 * 你在琴键 / 空格上把这段节奏**拍回来**。拍对了，节奏型末尾再追加一个音——
 * 越来越长，考验**节奏记忆 + 长短感 + 内在拍感**。这是「旋律回声」的节奏姊妹篇：
 * 旋律回声练音高记忆，节奏回声练时值记忆。
 *
 * 关键设计：判定**与速度无关**——只看你拍出来的「长短比例」对不对，
 * 不要求你卡在某个固定 BPM 上（小朋友很难精确卡拍，但能记住"长长短短长"的模式）。
 *
 * 本文件只放可单元测试的纯逻辑（节奏型生成、拍点→间隔、速度归一化比对、状态机），
 * DOM 播放动画 / 采集敲击时间在 app.js 的 renderRhythmEcho 里。
 */

/**
 * 难度级别：决定可用时值（pool，单位=拍）与起始长度（startLen）。
 * 时值：0.5=八分♪ 1=四分♩ 1.5=附点四分♩. 2=二分𝅗𝅥
 */
export const RHYTHM_LEVELS = [
  // 只有四分和二分：最直观的"短 vs 长"
  { id: 'longshort', name: '🟢 长短音 (♩ 𝅗𝅥)',     pool: [1, 2],            startLen: 3, tol: 0.40 },
  // 加入八分音符：开始有"哒哒"的快音
  { id: 'eighth',    name: '🎵 含八分 (♪ ♩)',       pool: [0.5, 1],         startLen: 3, tol: 0.38 },
  // 混合八分/四分/二分
  { id: 'mixed',     name: '🟡 混合 (♪ ♩ 𝅗𝅥)',      pool: [0.5, 1, 2],      startLen: 4, tol: 0.35 },
  // 加附点：最难，长短层次最多
  { id: 'dotted',    name: '🔴 含附点 (♪ ♩ ♩. 𝅗𝅥)', pool: [0.5, 1, 1.5, 2], startLen: 4, tol: 0.32 },
];

/** 按 id 取级别（找不到回退第一个） */
export function levelById(id) {
  return RHYTHM_LEVELS.find((l) => l.id === id) || RHYTHM_LEVELS[0];
}

/** 时值（拍）→ 名称/符号 */
export function durName(d) {
  const map = { 0.5: '♪', 1: '♩', 1.5: '♩.', 2: '𝅗𝅥', 3: '𝅗𝅥.', 4: '𝅝' };
  return map[d] || (d + '拍');
}

/** 从时值池随机取一个 */
export function randomDur(pool, rng = Math.random) {
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * 取下一个时值：尽量避免与上一个完全相同（让节奏有长短变化、更像音乐），
 * 但池里只有一个值或多次重试无果时允许重复。
 */
export function pickNext(prev, pool, rng = Math.random) {
  if (pool.length <= 1) return pool[0];
  let n, guard = 0;
  do { n = randomDur(pool, rng); guard++; } while (n === prev && guard < 24);
  return n;
}

/**
 * 把一串敲击时间戳（毫秒）转成相邻间隔（毫秒）。
 * n 次敲击 → n-1 个间隔。
 */
export function tapsToGaps(tapTimes) {
  const gaps = [];
  for (let i = 1; i < tapTimes.length; i++) gaps.push(tapTimes[i] - tapTimes[i - 1]);
  return gaps;
}

/**
 * 给一次节奏复奏打分（纯函数，速度无关）。
 *
 * 期望节奏型 pattern（时值数组，长度 = 音符数 n）对应 n 个起拍点、n-1 个间隔，
 * 期望间隔 = pattern[0 .. n-2]（最后一个音的时值是它自己的延音，不产生后续起拍）。
 * 玩家敲了 taps 次（时间戳），产生 taps-1 个间隔。
 *
 * 先用「总时长之比」估计玩家速度 scale，再逐个间隔比较相对误差。
 *
 * @param {number[]} tapTimes 玩家敲击时间戳（ms）
 * @param {number[]} pattern  期望节奏型（拍）
 * @param {number}   tol      相对误差容忍度（默认 0.35）
 * @returns {{
 *   countOk:boolean, expectedTaps:number, actualTaps:number,
 *   scale:number, perGap:{ok:boolean,expBeat:number,actMs:number,err:number}[],
 *   allOk:boolean, accuracy:number, firstError:number
 * }}
 */
export function gradeRhythm(tapTimes, pattern, tol = 0.35) {
  const n = pattern.length;
  const expectedTaps = n;
  const actualTaps = tapTimes.length;
  const expGaps = pattern.slice(0, n - 1);        // n-1 个期望间隔（拍）
  const userGaps = tapsToGaps(tapTimes);          // 玩家间隔（ms）

  const base = {
    countOk: actualTaps === expectedTaps,
    expectedTaps, actualTaps,
    scale: 0, perGap: [], allOk: false, accuracy: 0, firstError: -1,
  };
  // 敲击次数不对：直接算未通过（但仍给出尽量多的信息）
  if (actualTaps !== expectedTaps || expGaps.length === 0) {
    return base;
  }

  const sumExp = expGaps.reduce((a, b) => a + b, 0);   // 总期望拍数
  const sumUser = userGaps.reduce((a, b) => a + b, 0); // 总实际毫秒
  // scale = 每一拍对应多少毫秒（玩家自选的速度）
  const scale = sumExp > 0 ? sumUser / sumExp : 0;

  let allOk = true, accSum = 0, firstError = -1;
  const perGap = expGaps.map((eb, i) => {
    const expMs = scale * eb;
    const actMs = userGaps[i];
    const err = expMs > 0 ? Math.abs(actMs - expMs) / expMs : 1;
    const ok = err <= tol;
    if (!ok) { allOk = false; if (firstError < 0) firstError = i; }
    accSum += Math.max(0, 1 - Math.min(err, 1));
    return { ok, expBeat: eb, actMs, err };
  });

  return {
    countOk: true, expectedTaps, actualTaps,
    scale, perGap, allOk,
    accuracy: perGap.length ? accSum / perGap.length : 0,
    firstError,
  };
}

/**
 * 节奏回声状态机。
 * state: idle → showing（正在打节奏）→ input（轮到你拍）→ win（全对）/ fail（拍错）
 */
export class RhythmEcho {
  constructor(opts = {}) {
    this.pool = opts.pool || RHYTHM_LEVELS[0].pool;
    this.startLen = opts.startLen || 3;
    this.tol = opts.tol != null ? opts.tol : 0.35;
    this.rng = opts.rng || Math.random;
    this.reset();
  }

  reset() {
    this.seq = [];       // 当前节奏型（时值数组）
    this.rounds = 0;     // 已成功复奏轮数
    this.best = 0;       // 历史最长成功节奏型
    this.state = 'idle'; // idle | showing | input | win | fail
    this.lastGrade = null;
  }

  /** 内部：在序列尾部追加一个（尽量不与上一个重复的）时值 */
  _append() {
    const prev = this.seq.length ? this.seq[this.seq.length - 1] : null;
    this.seq.push(pickNext(prev, this.pool, this.rng));
  }

  /** 开新局：生成 startLen 长的初始节奏型，进入 showing 状态 */
  start() {
    this.seq = [];
    this.rounds = 0;
    this.lastGrade = null;
    for (let i = 0; i < this.startLen; i++) this._append();
    this.state = 'showing';
    return this.seq.slice();
  }

  /** 播放完毕，轮到玩家拍 */
  ready() {
    this.state = 'input';
  }

  /**
   * 玩家提交一次复奏（一串敲击时间戳）。仅 input 状态有效。
   * @returns {null|object} gradeRhythm 的结果（附带 length）
   */
  submit(tapTimes) {
    if (this.state !== 'input') return null;
    const g = gradeRhythm(tapTimes, this.seq, this.tol);
    g.length = this.seq.length;
    this.lastGrade = g;
    if (g.allOk) {
      this.rounds++;
      if (this.seq.length > this.best) this.best = this.seq.length;
      this.state = 'win';
    } else {
      this.state = 'fail';
    }
    return g;
  }

  /** 本轮成功后生长一个时值，进入下一轮的 showing 状态 */
  grow() {
    this._append();
    this.state = 'showing';
    return this.seq.slice();
  }

  /** 重新挑战：用同样的池重新开局（best 保留） */
  restart() {
    const best = this.best;
    this.reset();
    this.best = best;
    return this.start();
  }
}
