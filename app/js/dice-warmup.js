/**
 * dice-warmup.js — 🎲 骰子热身（掷骰子随机生成今日小任务，纯逻辑）
 *
 * 设计（消除"今天练什么"的选择抗拒）：
 *  - 不让孩子自己挑（选择即压力），而是<b>掷骰子</b>随机给一个超小的热身任务卡：
 *    调性 × 音型 × 手别 × 风味（连奏/断奏/弱→强…）。
 *  - 可弹的音型（音阶/琶音）会生成<b>音符序列</b>，孩子在 88 键上按顺序弹对即"完成"，
 *    引擎逐音校验（忽略八度），完成一张就撒花、掷下一张。低门槛、高频成功。
 */

const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PC_NAME = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

/** 12 个调（大调），按五度圈友好顺序，root 落在 C4(60)~B4(71) */
export const KEYS = [
  { id: 'C', name: 'C 大调', pc: 0 },
  { id: 'G', name: 'G 大调', pc: 7 },
  { id: 'D', name: 'D 大调', pc: 2 },
  { id: 'A', name: 'A 大调', pc: 9 },
  { id: 'E', name: 'E 大调', pc: 4 },
  { id: 'F', name: 'F 大调', pc: 5 },
];

const MAJOR = [0, 2, 4, 5, 7, 9, 11, 12]; // 大调音阶半音偏移

/** 音型：给定 root midi → 音符序列 */
export const PATTERNS = [
  { id: 'scale-up',   name: '音阶 ↑',   gen: (r) => MAJOR.map((s) => r + s) },
  { id: 'scale-down', name: '音阶 ↓',   gen: (r) => MAJOR.slice().reverse().map((s) => r + s) },
  { id: 'scale-updn', name: '音阶 ↑↓',  gen: (r) => { const up = MAJOR.map((s) => r + s); return up.concat(up.slice(0, -1).reverse()); } },
  { id: 'arp',        name: '大三琶音', gen: (r) => [0, 4, 7, 12].map((s) => r + s) },
];

export const HANDS = [
  { id: 'r', name: '右手 🤚' },
  { id: 'l', name: '左手 ✋' },
  { id: 'both', name: '双手 🙌' },
];

/** 风味（只是表演提示，不改音符；让重复练习有变化） */
export const FLAVORS = [
  { id: 'legato', name: '连奏（音连成线）' },
  { id: 'staccato', name: '断奏（音弹得短）' },
  { id: 'cresc', name: '弱→强（越弹越响）' },
  { id: 'slow', name: '慢慢来（每个音都听清）' },
  { id: 'count', name: '数着拍子（1-2-3-4）' },
];

export function keyById(id) { return KEYS.find((k) => k.id === id) || KEYS[0]; }
export function rootMidi(pc) { return 60 + pc; } // C4 起

/** 简单可注入随机：默认 Math.random */
function pick(arr, rng) { return arr[Math.floor((rng ? rng() : Math.random()) * arr.length)]; }

/** 掷一张任务卡 */
export function rollMission(rng) {
  const key = pick(KEYS, rng);
  const pattern = pick(PATTERNS, rng);
  const hand = pick(HANDS, rng);
  const flavor = pick(FLAVORS, rng);
  const notes = pattern.gen(rootMidi(key.pc));
  return {
    key, pattern, hand, flavor, notes,
    label: `${key.name} · ${pattern.name} · ${hand.name} · ${flavor.name}`,
  };
}

const pc = (m) => ((m % 12) + 12) % 12;

/**
 * 骰子热身状态机：掷骰 → 弹对当前任务的音序 → 完成计数 → 再掷。
 * opts: { octaveAgnostic=true }
 */
export class DiceWarmup {
  constructor({ octaveAgnostic = true, rng = null } = {}) {
    this.octaveAgnostic = octaveAgnostic !== false;
    this.rng = rng;
    this.done = 0;       // 完成的任务数
    this.streak = 0;     // 连续无错完成
    this.mission = null;
    this.idx = 0;
  }

  roll() {
    this.mission = rollMission(this.rng);
    this.idx = 0;
    this._dirty = false; // 本张是否弹错过
    return this.mission;
  }

  current() {
    if (!this.mission) return null;
    return this.idx < this.mission.notes.length ? this.mission.notes[this.idx] : null;
  }

  _match(midi) {
    const t = this.current();
    if (t == null) return false;
    return this.octaveAgnostic ? pc(midi) === pc(t) : midi === t;
  }

  /** 弹一个键。返回 {ok, advance|wrong|complete, idx, done, streak} */
  press(midi) {
    if (!this.mission) return { ok: false };
    if (this._match(midi)) {
      this.idx++;
      if (this.idx >= this.mission.notes.length) {
        this.done++;
        if (this._dirty) this.streak = 0; else this.streak++;
        return { ok: true, complete: true, done: this.done, streak: this.streak };
      }
      return { ok: true, advance: true, idx: this.idx };
    }
    this._dirty = true;
    this.idx = 0; // 从头来（不惩罚，鼓励再试）
    return { ok: false, wrong: true, idx: 0 };
  }
}
