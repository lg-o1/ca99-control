/**
 * concert-sim.js — 🎤 迷你音乐会模拟（Live Concert Simulator）纯逻辑引擎
 *
 * 灵感来自 Casio Music Space 的"观众反应"。把孤独的练习变成一场小型音乐会：
 * 观众的掌声/欢呼会随**曲段**（前奏/主歌/副歌/尾声）和**力度**（弹得越投入越热烈）动态变化。
 * 副歌弹得有力 → 全场欢呼；尾声收得漂亮 → 起立鼓掌。给情感回报，正合 Lily 音乐 MI 85%。
 *
 * 纯逻辑：调用方喂入每个音的力度（velocity 0..127）与播放进度（0..1），
 * 引擎判断当前曲段、累计能量、产出观众反应等级。全部可注入、确定性可测。
 */

/**
 * 曲段（按播放进度 0..1 的区间划分）。每段有"基础热度"——副歌天然更燃。
 * 默认四段式，可由调用方覆盖（传入自定义 boundaries）。
 */
export const SECTIONS = [
  { id: 'intro',  label: '前奏', emoji: '🎼', base: 0.2, lo: 0.0,  hi: 0.2 },
  { id: 'verse',  label: '主歌', emoji: '🎵', base: 0.4, lo: 0.2,  hi: 0.5 },
  { id: 'chorus', label: '副歌', emoji: '🔥', base: 0.7, lo: 0.5,  hi: 0.85 },
  { id: 'outro',  label: '尾声', emoji: '🌟', base: 0.5, lo: 0.85, hi: 1.0001 },
];

/** 观众反应等级（按 0..1 的热度分档） */
export const REACTIONS = [
  { id: 'quiet',   emoji: '🤫', label: '安静聆听', min: 0.0,  sound: 'hush'    },
  { id: 'nod',     emoji: '🙂', label: '点头微笑', min: 0.3,  sound: 'murmur'  },
  { id: 'clap',    emoji: '👏', label: '鼓掌',     min: 0.5,  sound: 'clap'    },
  { id: 'cheer',   emoji: '🎉', label: '欢呼',     min: 0.72, sound: 'cheer'   },
  { id: 'standing', emoji: '🙌', label: '起立鼓掌', min: 0.9, sound: 'ovation' },
];

/** 进度（0..1）→ 当前曲段 */
export function sectionAt(frac, sections = SECTIONS) {
  const f = Math.max(0, Math.min(1, frac));
  for (const s of sections) if (f >= s.lo && f < s.hi) return s;
  return sections[sections.length - 1];
}

/** 力度 0..127 → 归一化强度 0..1 */
export function dynamicLevel(velocity) {
  return Math.max(0, Math.min(1, (velocity || 0) / 127));
}

/**
 * 热度 → 观众反应（取 min 阈值不超过 heat 的最高一档）。
 * @param {number} heat 0..1
 */
export function reactionFor(heat) {
  const h = Math.max(0, Math.min(1, heat));
  let r = REACTIONS[0];
  for (const x of REACTIONS) if (h >= x.min) r = x;
  return r;
}

/**
 * 一场音乐会模拟。滚动跟踪最近力度（指数平滑），结合当前曲段基础热度产出反应。
 * @param {object} o
 *   sections  曲段定义（默认 SECTIONS）
 *   smooth    力度平滑系数 0..1（默认 0.3，越大越跟最近一击）
 */
export class ConcertSim {
  constructor({ sections = SECTIONS, smooth = 0.3 } = {}) {
    this.sections = sections;
    this.smooth = smooth;
    this.reset();
  }

  reset() {
    this.avgDyn = 0;     // 平滑后的力度强度 0..1
    this.notes = 0;
    this.sumDyn = 0;     // 力度强度累加（算全场平均，用于谢幕）
    this.curSection = null;
    this.peakHeat = 0;
  }

  /**
   * 喂入一个音，返回当前观众反应。
   * @param {number} velocity 0..127
   * @param {number} frac 播放进度 0..1
   * @returns {{section, reaction, heat:number}}
   */
  note(velocity, frac) {
    const dyn = dynamicLevel(velocity);
    this.avgDyn = this.notes === 0 ? dyn : this.avgDyn + this.smooth * (dyn - this.avgDyn);
    this.notes++;
    this.sumDyn += dyn;
    const section = sectionAt(frac, this.sections);
    this.curSection = section;
    const heat = this.heatFor(section, this.avgDyn);
    if (heat > this.peakHeat) this.peakHeat = heat;
    return { section, reaction: reactionFor(heat), heat };
  }

  /** 曲段基础热度与力度的加权混合（副歌权重更偏力度，更易点燃） */
  heatFor(section, dyn) {
    const base = section ? section.base : 0.3;
    const w = section && section.id === 'chorus' ? 0.65 : 0.5; // 副歌力度占比更高
    return Math.max(0, Math.min(1, base * (1 - w) + dyn * w));
  }

  /** 全场平均力度强度 */
  avgDynamic() { return this.notes ? this.sumDyn / this.notes : 0; }

  /**
   * 谢幕：综合全场平均力度 + 峰值热度给最终反应与星级（1..5）。
   */
  finale() {
    const avg = this.avgDynamic();
    const finalHeat = Math.max(0, Math.min(1, avg * 0.6 + this.peakHeat * 0.4));
    const reaction = reactionFor(finalHeat);
    const stars = Math.max(1, Math.min(5, Math.round(1 + finalHeat * 4)));
    return {
      reaction,
      stars,
      finalHeat,
      avgDynamic: avg,
      peakHeat: this.peakHeat,
      message: finaleMessage(stars),
    };
  }
}

/** 谢幕寄语（正向、有仪式感） */
export function finaleMessage(stars) {
  switch (stars) {
    case 5: return '全场起立鼓掌！一场完美的演出 🌟🌟🌟🌟🌟';
    case 4: return '观众欢呼不断，演得太精彩了！🎉';
    case 3: return '掌声热烈，这是一场很棒的演出 👏';
    case 2: return '观众微笑点头，下次再放开一点会更燃！';
    default: return '勇敢地开了一场音乐会，这本身就值得鼓掌 👏';
  }
}
