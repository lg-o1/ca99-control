/**
 * chorus-lite.js — 🍬 副歌速通 Lite（30 秒钩子版）纯逻辑
 *
 * 灵感来自日本「ピアノメロディ」：每首曲子只弹**最抓耳的 ~30 秒副歌**，
 * 作为「即时多巴胺」和入门漏斗——对易放弃的孩子（Lily 挑战维度 2.3/6）极有效：
 * 低门槛、快速成就感、几十秒就能「弹完一首」。
 *
 * 本文件只放可单元测试的纯逻辑（时间轴构建 + 副歌窗口选取 + 切片重置零点）。
 * 渲染/播放在 app.js 的 renderChorusLite() 里，复用屏幕键盘 flash + playTone。
 *
 * 选取策略（pickHook）：
 *   1. 曲子带显式 song.hook = [startBeat, endBeat] → 直接用（OMR/人工标注的真副歌）。
 *   2. 曲子很短（≤ fullThresholdSec）→ 整首就是「副歌」，全弹。
 *   3. 否则滑动一个 targetSec 长的窗口，选**音符最密集**的一段（副歌通常最密/最抓耳），
 *      平局取较早出现的一段（更具代表性、含引子）。
 */

export const DEFAULT_TARGET_SEC = 30;
export const FULL_THRESHOLD_SEC = 38;

/**
 * 把 score-follow 的 seq（[[midi,durBeats,finger?], ...]，midi=null 为休止）展开成带时间的音符表。
 * @returns {{notes:Array, totalBeats:number, beatMs:number, totalMs:number}}
 */
export function buildTimeline(seq, bpm) {
  const beatMs = 60000 / (bpm > 0 ? bpm : 100);
  const notes = [];
  let beat = 0;
  for (const ev of (seq || [])) {
    const midi = ev[0];
    const dur = (ev[1] == null) ? 1 : ev[1];
    const finger = (ev[2] == null) ? null : ev[2];
    if (midi != null) {
      notes.push({ midi, beat, dur, finger, ms: beat * beatMs, durMs: dur * beatMs });
    }
    beat += dur;
  }
  return { notes, totalBeats: beat, beatMs, totalMs: beat * beatMs };
}

/** 取 [startBeat, endBeat) 区间，并把第一拍重置为 0（方便从头播放）。 */
function sliceWindow(tl, startBeat, endBeat) {
  const eps = 1e-9;
  const notes = tl.notes
    .filter((n) => n.beat >= startBeat - eps && n.beat < endBeat - eps)
    .map((n) => ({
      midi: n.midi,
      finger: n.finger,
      beat: n.beat - startBeat,
      dur: n.dur,
      ms: (n.beat - startBeat) * tl.beatMs,
      durMs: n.durMs,
    }));
  const durationSec = ((endBeat - startBeat) * tl.beatMs) / 1000;
  return { notes, startBeat, endBeat, durationSec, noteCount: notes.length };
}

/**
 * 选出一首曲子的「副歌」窗口。
 * @param {{bpm:number, seq:Array, hook?:[number,number]}} song
 * @param {{targetSec?:number, fullThresholdSec?:number}} opts
 * @returns {{notes:Array,startBeat:number,endBeat:number,durationSec:number,noteCount:number,whole:boolean,explicit?:boolean}}
 */
export function pickHook(song, opts = {}) {
  const targetSec = opts.targetSec == null ? DEFAULT_TARGET_SEC : opts.targetSec;
  const fullSec = opts.fullThresholdSec == null ? FULL_THRESHOLD_SEC : opts.fullThresholdSec;
  const bpm = (song && song.bpm) || 100;
  const tl = buildTimeline(song && song.seq, bpm);

  if (!tl.notes.length) {
    return { ...sliceWindow(tl, 0, 0), whole: true };
  }

  // 1. 显式标注的副歌区间
  if (Array.isArray(song.hook) && song.hook.length === 2) {
    const a = Math.max(0, song.hook[0]);
    const b = Math.min(tl.totalBeats, song.hook[1]);
    return { ...sliceWindow(tl, a, b), whole: false, explicit: true };
  }

  // 2. 整首已经很短 → 全弹
  if (tl.totalMs <= fullSec * 1000) {
    return { ...sliceWindow(tl, 0, tl.totalBeats), whole: true };
  }

  // 3. 滑窗找最密集的一段
  const winBeats = (targetSec * 1000) / tl.beatMs;
  let best = null;
  for (const n of tl.notes) {
    const start = n.beat;
    // 别滑进只剩尾巴的短窗（已有候选时停）
    if (best && (tl.totalBeats - start) < winBeats * 0.5) break;
    const end = Math.min(start + winBeats, tl.totalBeats);
    let count = 0;
    for (const x of tl.notes) if (x.beat >= start && x.beat < end) count++;
    if (!best || count > best.count) best = { start, end, count };
  }
  return { ...sliceWindow(tl, best.start, best.end), whole: false };
}

/** 给副歌窗口估一个「难度/长度」徽章文案（UI 用）。 */
export function hookBadge(hook) {
  const sec = Math.round(hook.durationSec);
  if (hook.whole) return `全曲 · ${sec}秒 · ${hook.noteCount}音`;
  if (hook.explicit) return `副歌 · ${sec}秒 · ${hook.noteCount}音`;
  return `高潮片段 · ${sec}秒 · ${hook.noteCount}音`;
}
