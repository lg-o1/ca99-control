/**
 * play-mood.js — 🎭 情绪演奏（Play the Mood）纯逻辑引擎
 *
 * 给一张【情绪卡】（开心 / 神秘 / 暴风雨 / 平静 / 悲伤 / 魔法），孩子用<b>力度 + 速度 + 音色</b>
 * 自由表达这份情绪——<b>没有对错、没有分数、没有 game-over</b>。引擎把孩子弹的一段演奏
 * 收集起来，算出「你弹得多轻/多响、多快/多慢」，再用<b>永远鼓励</b>的话反射回去：
 * 「你弹得轻轻的，正好配上这份神秘 🌙」。重点是培养音乐表现力（technique 之外的"音乐性"）。
 *
 * 复用：dynamics-trainer 的 velocity→力度档；chord-color 的和弦品质情绪色（音色提示）。
 * 纯逻辑：不碰 MIDI/DOM/音频；按下的音由调用方喂入，便于单元测试。
 */

import { DYNAMICS, velocityToDynamic, indexByKey } from './dynamics-trainer.js';

/** 速度感（音符密度，每秒音数）阈值 */
export const TEMPO_FAST = 2.5;
export const TEMPO_SLOW = 1.1;

/**
 * 情绪卡。每张给出：
 *  - hue：主色相（UI 上色）
 *  - dynamic：建议力度档（dynamics-trainer 的 key）
 *  - tempo：建议速度感 'slow' | 'med' | 'fast'
 *  - qualities：建议的和弦品质（chord-color 的 suffix），当作"音色/和声"提示
 *  - blurb：给孩子的一句引导（怎么弹出这份情绪）
 */
export const MOODS = [
  { id: 'happy',   name: '开心',   emoji: '☀️', hue: 45,  dynamic: 'f',  tempo: 'fast', qualities: ['', 'maj7', '6'],     blurb: '弹得明亮、欢快，像阳光在蹦蹦跳跳 ☀️' },
  { id: 'mystery', name: '神秘',   emoji: '🌙', hue: 285, dynamic: 'p',  tempo: 'slow', qualities: ['aug', 'm7', 'sus2'], blurb: '弹得轻轻的、慢慢的，像月夜里藏着秘密 🌙' },
  { id: 'storm',   name: '暴风雨', emoji: '⛈️', hue: 220, dynamic: 'ff', tempo: 'fast', qualities: ['dim', 'dim7', 'm'],  blurb: '用力、又快又响，像电闪雷鸣 ⛈️' },
  { id: 'calm',    name: '平静',   emoji: '🌊', hue: 175, dynamic: 'mp', tempo: 'slow', qualities: ['', 'add9', 'sus2'],  blurb: '缓缓地、温柔地，像平静的湖面 🌊' },
  { id: 'sad',     name: '悲伤',   emoji: '💧', hue: 215, dynamic: 'p',  tempo: 'slow', qualities: ['m', 'm7', 'm6'],     blurb: '轻轻的、慢慢的小调，像下着小雨 💧' },
  { id: 'magic',   name: '魔法',   emoji: '✨', hue: 300, dynamic: 'mf', tempo: 'med',  qualities: ['maj7', 'add9', 'sus4'], blurb: '忽高忽低、闪闪发光，像撒了一把魔法粉 ✨' },
];

export function moodById(id) { return MOODS.find((m) => m.id === id) || MOODS[0]; }

const TEMPO_LABEL = { slow: '慢', med: '中速', fast: '快' };

/** 音符密度（每秒音数）→ 速度感档 */
export function tempoFeel(notesPerSec) {
  if (notesPerSec >= TEMPO_FAST) return 'fast';
  if (notesPerSec <= TEMPO_SLOW) return 'slow';
  return 'med';
}

/**
 * 情绪演奏状态机：选情绪卡 → 自由弹一段 → 反射「你弹出了什么样的情绪」（永远鼓励）。
 * opts: { rng? }
 */
export class PlayMood {
  constructor({ rng = null } = {}) {
    this.rng = rng;
    this.mood = null;
    this.notes = [];      // {midi, vel, t}
    this.recording = false;
    this.startT = 0;
    this.performed = 0;   // 完成的情绪演奏次数（喂打卡，非评分）
    this.lastIdx = -1;
  }

  /** 选一张情绪卡（不重复上一张）；不传 rng 时用 Math.random。 */
  roll() {
    const r = this.rng || Math.random;
    let idx = Math.floor(r() * MOODS.length);
    if (MOODS.length > 1 && idx === this.lastIdx) idx = (idx + 1) % MOODS.length;
    this.lastIdx = idx;
    this.mood = MOODS[idx];
    return this.mood;
  }

  /** 按 id 直接选卡 */
  choose(id) {
    this.mood = moodById(id);
    this.lastIdx = MOODS.indexOf(this.mood);
    return this.mood;
  }

  /** 开始录这段表达（清空上一段） */
  start(t = 0) {
    this.notes = [];
    this.recording = true;
    this.startT = t;
  }

  /** 喂一个音（带力度 + 相对/绝对时间）。仅录制中生效。 */
  addNote(midi, vel = 80, t = 0) {
    if (!this.recording) return false;
    this.notes.push({ midi, vel: Math.max(1, Math.min(127, vel | 0)), t });
    return true;
  }

  /** 停止录制（不评分） */
  stop() { this.recording = false; }

  get noteCount() { return this.notes.length; }

  /**
   * 这段演奏的客观画像（不含好坏评判）：
   *  noteCount / avgVel / dynamic（力度档对象）/ span（音域半音数）/ durationMs /
   *  notesPerSec / tempo（速度感档）
   */
  expression() {
    const n = this.notes.length;
    if (!n) {
      return { noteCount: 0, avgVel: 0, dynamic: null, span: 0, durationMs: 0, notesPerSec: 0, tempo: 'med' };
    }
    let sumV = 0, minM = Infinity, maxM = -Infinity, minT = Infinity, maxT = -Infinity;
    for (const e of this.notes) {
      sumV += e.vel;
      if (e.midi < minM) minM = e.midi;
      if (e.midi > maxM) maxM = e.midi;
      if (e.t < minT) minT = e.t;
      if (e.t > maxT) maxT = e.t;
    }
    const avgVel = Math.round(sumV / n);
    const durationMs = Math.max(0, maxT - minT);
    const notesPerSec = durationMs > 0 ? (n - 1) / (durationMs / 1000) : 0;
    return {
      noteCount: n,
      avgVel,
      dynamic: velocityToDynamic(avgVel),
      span: maxM - minM,
      durationMs,
      notesPerSec,
      tempo: tempoFeel(notesPerSec),
    };
  }

  /**
   * 把这段演奏「反射」成永远鼓励的话。对照情绪卡的建议力度/速度，但<b>不判对错</b>——
   * 贴近 → 「正好配上这份情绪」；不同 → 「这是你自己的表达，也很棒」。
   * @returns {{ dynamicMatch:boolean, tempoMatch:boolean, lines:string[], empty:boolean }}
   */
  reflect() {
    const mood = this.mood || MOODS[0];
    const s = this.expression();
    if (!s.noteCount) {
      return { dynamicMatch: false, tempoMatch: false, empty: true,
        lines: [`按「⏺ 开始表达」，然后用钢琴弹出「${mood.name}」的感觉——怎么弹都行 🎹`] };
    }
    const playedDynIdx = velocityToDynamic(s.avgVel) ? indexByKey(velocityToDynamic(s.avgVel).key) : 2;
    const wantDynIdx = indexByKey(mood.dynamic);
    const dynamicMatch = Math.abs(playedDynIdx - wantDynIdx) <= 1;
    const tempoMatch = s.tempo === mood.tempo;

    const lines = [];
    const playedDyn = s.dynamic ? s.dynamic.name : '中强';
    if (dynamicMatch) {
      lines.push(`🎚️ 你弹得很「${playedDyn}」，正好配上这份「${mood.name}」${mood.emoji}！`);
    } else {
      lines.push(`🎚️ 你选了「${playedDyn}」的力度——这是你自己的表达，也很有味道 👍`);
    }
    if (tempoMatch) {
      lines.push(`⏱️ 速度也很搭：${TEMPO_LABEL[s.tempo]}，刚好像「${mood.name}」的样子。`);
    } else {
      lines.push(`⏱️ 你弹得偏「${TEMPO_LABEL[s.tempo]}」——换个速度感，「${mood.name}」会有不一样的味道，试试看？`);
    }
    if (s.span >= 12) lines.push(`🌈 你用了很宽的音域（跨了 ${s.span} 个半音），声音很有层次！`);
    lines.push(`🎵 这段你弹了 ${s.noteCount} 个音——每一个都是你的情绪，没有对错，弹得真好！`);
    return { dynamicMatch, tempoMatch, empty: false, lines };
  }

  /** 标记完成一次情绪演奏（喂打卡，非评分） */
  finish() { this.performed++; return this.performed; }
}
