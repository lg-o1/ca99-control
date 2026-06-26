/**
 * metro-kit.js — 节拍器「音色 + 拍号」工具箱（纯逻辑，可测试）
 *
 * 让节拍器变得有趣 + 可定制：
 *  1) METERS：常见拍号（2/4 进行曲、3/4 华尔兹、4/4、5/4、6/8 摇篮曲、7/8…），
 *     每拍带「重音级别」——强拍 accent / 次强 mid / 弱拍 weak，复合拍号也能正确分组。
 *  2) SOUNDS：多种可选音效（经典电子 / 木鱼 / 嘀嗒 / 鼓 / 铃铛 / 拍手 / 啾啾鸟），
 *     每种音效给出三个重音级别的合成参数（频率/增益/时长/滤波）。
 *  3) clickSpec(soundId, level)：把「音色 × 重音级别」解析成一份纯数据合成规格，
 *     真正的 Web Audio 合成由调用方（app.js）完成——本模块绝不碰音频/DOM。
 *
 * 所有发声都走浏览器 Web Audio，绝不经过 CA99（真琴留给孩子弹）。
 */

/** 三个重音级别 */
export const LEVELS = ['weak', 'mid', 'accent'];

/**
 * 拍号预设。accents 数组逐拍给出重音码：2=accent（强拍）/1=mid（次强）/0=weak（弱拍）。
 * 复合拍号按音乐惯例分组（6/8 = 2 组三连，重音落在第 1、4 拍；7/8 = 2+2+3）。
 */
export const METERS = [
  { id: '2/4', name: '2/4 进行曲', beats: 2, accents: [2, 0] },
  { id: '3/4', name: '3/4 华尔兹', beats: 3, accents: [2, 0, 0] },
  { id: '4/4', name: '4/4 流行', beats: 4, accents: [2, 0, 1, 0] },
  { id: '5/4', name: '5/4 (3+2)', beats: 5, accents: [2, 0, 0, 1, 0] },
  { id: '6/8', name: '6/8 摇篮曲', beats: 6, accents: [2, 0, 0, 1, 0, 0] },
  { id: '7/8', name: '7/8 (2+2+3)', beats: 7, accents: [2, 0, 1, 0, 1, 0, 0] },
];

/** 按 id 取拍号；找不到回落到 4/4。 */
export function meterById(id) {
  return METERS.find((m) => m.id === id) || METERS[2];
}

/** 某拍号每小节拍数。 */
export function beatsOf(id) {
  return meterById(id).beats;
}

/**
 * 某拍号、某拍（小节内 0-based，允许越界自动取模）的重音级别。
 * @returns {'accent'|'mid'|'weak'}
 */
export function accentAt(id, beatInBar) {
  const m = meterById(id);
  const n = m.beats;
  const i = (((beatInBar | 0) % n) + n) % n;
  const code = m.accents[i];
  return code === 2 ? 'accent' : code === 1 ? 'mid' : 'weak';
}

/**
 * 音色预设。kind 决定合成方式：
 *  - 'tone'  ：单振荡器（wave 波形 + freq 频率），清脆短促
 *  - 'kick'  ：低频下滑正弦（鼓点）
 *  - 'bell'  ：双失谐正弦 + 长衰减（铃铛余音）
 *  - 'noise' ：带通滤波白噪声（拍手/沙锤）
 *  - 'chirp' ：上滑正弦（可爱鸟鸣）
 * 每个数值字段都按 accent/mid/weak 给三档，弱拍更轻更暗。
 */
export const SOUNDS = [
  { id: 'classic', name: '经典电子', emoji: '🔔', kind: 'tone', wave: 'square',
    freq: { accent: 1500, mid: 1200, weak: 900 }, gain: { accent: 0.5, mid: 0.4, weak: 0.3 }, dur: 0.05 },
  { id: 'wood', name: '木鱼', emoji: '🪵', kind: 'tone', wave: 'triangle',
    freq: { accent: 1100, mid: 900, weak: 760 }, gain: { accent: 0.55, mid: 0.42, weak: 0.32 }, dur: 0.04 },
  { id: 'beep', name: '清脆嘀嗒', emoji: '⏱️', kind: 'tone', wave: 'sine',
    freq: { accent: 2000, mid: 1600, weak: 1300 }, gain: { accent: 0.4, mid: 0.32, weak: 0.24 }, dur: 0.035 },
  { id: 'drum', name: '鼓', emoji: '🥁', kind: 'kick',
    freq: { accent: 175, mid: 145, weak: 120 }, gain: { accent: 0.75, mid: 0.58, weak: 0.44 }, dur: 0.18 },
  { id: 'bell', name: '铃铛', emoji: '🛎️', kind: 'bell',
    freq: { accent: 1320, mid: 1100, weak: 880 }, gain: { accent: 0.45, mid: 0.36, weak: 0.28 }, dur: 0.5 },
  { id: 'clap', name: '拍手', emoji: '👏', kind: 'noise',
    filter: { accent: 2200, mid: 1800, weak: 1500 }, gain: { accent: 0.5, mid: 0.4, weak: 0.3 }, dur: 0.07 },
  { id: 'chirp', name: '啾啾鸟', emoji: '🐤', kind: 'chirp',
    freq: { accent: 1700, mid: 1400, weak: 1150 }, gain: { accent: 0.4, mid: 0.32, weak: 0.26 }, dur: 0.09 },
];

/** 按 id 取音色；找不到回落到第一个。 */
export function soundById(id) {
  return SOUNDS.find((s) => s.id === id) || SOUNDS[0];
}

/**
 * 解析「音色 × 重音级别」→ 纯数据合成规格，供调用方做 Web Audio 合成。
 * @returns {{kind:string, dur:number, gain:number, wave?:string, freq?:number, filter?:number}}
 */
export function clickSpec(soundId, level) {
  const s = soundById(soundId);
  const lv = (level === 'accent' || level === 'mid' || level === 'weak') ? level : 'weak';
  const spec = { kind: s.kind, dur: s.dur, gain: s.gain[lv] };
  if (s.wave) spec.wave = s.wave;
  if (s.freq) spec.freq = s.freq[lv];
  if (s.filter) spec.filter = s.filter[lv];
  return spec;
}

/** 兼容旧的布尔 isAccent → 级别（true→accent，false→weak）。 */
export function levelFromAccent(isAccent) {
  return isAccent ? 'accent' : 'weak';
}
