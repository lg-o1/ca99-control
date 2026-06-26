/**
 * warmup-routine.js — 🌅 每日热身例程（纯逻辑，可注入 storage/rng）
 *
 * 给「不知道今天该练什么」的日子一个【零决策入口】：一键生成「今日 5 分钟例程」——
 * 模拟真实钢琴老师的热身流程：1 个音阶 + 1 个节奏 + 1 首小曲，跟着走完打卡。
 *
 * 设计要点：
 *  - 例程<b>按日期确定性生成</b>（同一天刷新页面不变，换一天换一批）——复用 daily-goal 的 hashStr。
 *  - 三步各复用现成件：音阶（dice-warmup 的 KEYS×PATTERNS，可在键盘上逐音弹对校验）、
 *    节奏（metro-kit 的 METERS 拍号 + 一个温和 bpm）、小曲（从 app 传入的歌曲/游戏目录里挑一个，跳转去玩）。
 *  - 走完三步 → 打卡（accumulate 累计天数）。鼓励向：步骤超小、低门槛、高频成功。
 *
 * 引擎只管「挑哪三步 + 跟踪进度/打卡」，不碰 DOM/音频；音阶发声与导航由 app.js 负责。
 */

import { KEYS, PATTERNS, rootMidi } from './dice-warmup.js';
import { METERS } from './metro-kit.js';
import { hashStr } from './daily-goal.js';

/** 热身用的温和速度档（BPM）——慢一点，听清每个音。 */
export const WARMUP_BPMS = [60, 66, 72, 80];

/** 兜底小曲目录（app 一般会传入自己的目录覆盖；保证引擎可独立测试）。 */
export const DEFAULT_SONGS = [
  { id: 'scorefollow', label: '曲谱跟弹', icon: '🎹', nav: 'scf' },
  { id: 'playstage',   label: '演奏台',   icon: '🎬', nav: 'play' },
  { id: 'sight',       label: '视奏闪卡', icon: '👀', nav: 'sight' },
  { id: 'guess',       label: '猜歌视奏', icon: '🕵️', nav: 'guess' },
];

const DEFAULT_KEY = 'ca99-warmup';

/** 按 dayKey + salt 确定性地取一个 0..len-1 的下标。 */
function pickIndex(dayKey, salt, len) {
  if (len <= 0) return 0;
  return hashStr(String(dayKey) + '|' + salt) % len;
}

/**
 * 按日期确定性地组出今日 3 步例程。
 * @param {string} dayKey YYYY-MM-DD
 * @param {object} [opts] { songs?: Array<{id,label,icon,nav}>, keys?, patterns?, meters?, bpms? }
 * @returns {{ steps: [scaleStep, rhythmStep, songStep] }}
 */
export function pickRoutine(dayKey, opts = {}) {
  const keys = opts.keys || KEYS;
  const patterns = opts.patterns || PATTERNS;
  const meters = opts.meters || METERS;
  const bpms = opts.bpms || WARMUP_BPMS;
  const songs = (opts.songs && opts.songs.length) ? opts.songs : DEFAULT_SONGS;

  const key = keys[pickIndex(dayKey, 'key', keys.length)];
  const pattern = patterns[pickIndex(dayKey, 'pat', patterns.length)];
  const notes = pattern.gen(rootMidi(key.pc));
  const scaleStep = {
    type: 'scale',
    key, pattern, notes,
    label: `${key.name} · ${pattern.name}`,
    hint: '在键盘上把这条音阶弹一遍 🎹',
  };

  const meter = meters[pickIndex(dayKey, 'meter', meters.length)];
  const bpm = bpms[pickIndex(dayKey, 'bpm', bpms.length)];
  const rhythmStep = {
    type: 'rhythm',
    meter, bpm, bars: 2,
    label: `${meter.name} · ${bpm} BPM`,
    hint: '跟着节拍器拍 2 小节，把拍子稳住 🥁',
  };

  const song = songs[pickIndex(dayKey, 'song', songs.length)];
  const songStep = {
    type: 'song',
    id: song.id, label: song.label, icon: song.icon || '🎵', nav: song.nav || song.id,
    hint: '去弹一首小曲，把手指活动开 🎵',
  };

  return { steps: [scaleStep, rhythmStep, songStep] };
}

const pc = (m) => ((m % 12) + 12) % 12;

/**
 * 每日热身例程状态机：3 步顺序走完 → 打卡。
 *  - 音阶步可在键盘上逐音弹对校验（八度无关，弹错从头来，不惩罚）。
 *  - 节奏步/小曲步由 app 在完成动作后调用 completeStep() 标记。
 *  - 完成状态<b>按日持久化</b>（换天自动重置三步，但保留累计打卡天数 totalDone）。
 *
 * opts: { storage, key='ca99-warmup', dayKey, songs?, octaveAgnostic=true, rng? }
 */
export class WarmupRoutine {
  constructor({ storage, key = DEFAULT_KEY, dayKey, songs, octaveAgnostic = true, rng = null } = {}) {
    this.storage = storage;
    this.key = key;
    this.dayKey = dayKey;
    this.rng = rng;
    this.octaveAgnostic = octaveAgnostic !== false;
    this.routine = pickRoutine(dayKey, { songs });
    this.scaleIdx = 0;
    const persisted = this._load();
    if (persisted.dayKey === dayKey) {
      this.stepDone = persisted.stepDone.slice(0, 3);
      while (this.stepDone.length < 3) this.stepDone.push(false);
      this.counted = !!persisted.counted;
    } else {
      this.stepDone = [false, false, false];
      this.counted = false;
    }
  }

  _load() {
    try {
      const r = this.storage && this.storage.getItem(this.key);
      const d = r ? JSON.parse(r) : null;
      if (d && typeof d === 'object') {
        return {
          dayKey: d.dayKey || null,
          stepDone: Array.isArray(d.stepDone) ? d.stepDone.map((x) => !!x) : [false, false, false],
          counted: !!d.counted,
          totalDone: d.totalDone | 0,
        };
      }
    } catch { /* 容错 */ }
    return { dayKey: null, stepDone: [false, false, false], counted: false, totalDone: 0 };
  }

  _save() {
    try {
      const prev = this._load();
      this.storage && this.storage.setItem(this.key, JSON.stringify({
        dayKey: this.dayKey,
        stepDone: this.stepDone,
        counted: this.counted,
        totalDone: prev.totalDone | 0,
      }));
    } catch { /* 静默 */ }
  }

  /** 第 i 步内容（0=音阶 1=节奏 2=小曲）。 */
  step(i) { return this.routine.steps[i] || null; }

  /** 当前应做的步号（第一个未完成），全完成则 -1。 */
  activeIndex() {
    for (let i = 0; i < this.stepDone.length; i++) if (!this.stepDone[i]) return i;
    return -1;
  }

  /** 音阶步当前要弹的目标音（已完成或非音阶步时为 null）。 */
  currentScaleNote() {
    if (this.stepDone[0]) return null;
    const s = this.step(0);
    if (!s || s.type !== 'scale') return null;
    return this.scaleIdx < s.notes.length ? s.notes[this.scaleIdx] : null;
  }

  /**
   * 弹一个键校验音阶步。返回 {ok, advance|wrong|complete, idx}。
   * 弹错从头来（不惩罚）；弹完整条 → 标记音阶步完成。
   */
  pressScale(midi) {
    const s = this.step(0);
    if (this.stepDone[0] || !s || s.type !== 'scale') return { ok: false };
    const t = s.notes[this.scaleIdx];
    const hit = this.octaveAgnostic ? pc(midi) === pc(t) : midi === t;
    if (hit) {
      this.scaleIdx++;
      if (this.scaleIdx >= s.notes.length) {
        const r = this.completeStep(0);
        return { ok: true, complete: true, allDone: r.allDone };
      }
      return { ok: true, advance: true, idx: this.scaleIdx };
    }
    this.scaleIdx = 0;
    return { ok: false, wrong: true, idx: 0 };
  }

  /**
   * 标记第 i 步完成。若这一步让三步全部完成且今天还没打过卡，则累计 +1。
   * @returns {{ changed, allDone, justCounted }}
   */
  completeStep(i) {
    if (i < 0 || i >= this.stepDone.length) return { changed: false, allDone: this.isAllDone(), justCounted: false };
    const changed = !this.stepDone[i];
    this.stepDone[i] = true;
    let justCounted = false;
    const allDone = this.isAllDone();
    if (allDone && !this.counted) {
      this.counted = true;
      justCounted = true;
      try {
        const prev = this._load();
        this.storage && this.storage.setItem(this.key, JSON.stringify({
          dayKey: this.dayKey,
          stepDone: this.stepDone,
          counted: true,
          totalDone: (prev.totalDone | 0) + 1,
        }));
      } catch { /* 静默 */ }
      return { changed, allDone, justCounted };
    }
    this._save();
    return { changed, allDone, justCounted };
  }

  isAllDone() { return this.stepDone.every(Boolean); }

  /** 进度 {done, total}。 */
  progress() { return { done: this.stepDone.filter(Boolean).length, total: this.stepDone.length }; }

  /** 累计完成的例程天数。 */
  get totalDone() { return this._load().totalDone; }
}
