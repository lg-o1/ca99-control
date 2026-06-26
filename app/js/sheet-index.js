// 📖 课本谱面索引（sheet-index）——解析切图工具产出的 <stem>/index.json，
// 把「真实课本照片按小节切成的 m001.png… + 时间索引」变成 app 可渲染的横向 ribbon。
//
// index.json 形状（由 ribbon.py 之类的 OMR 切图工具生成）：
//   { stem, height, bpm, bar_seconds, n_measures, total_seconds,
//     measures:[{ i, file, w, t_start, t_end, low_confidence }] }
// 每个 measures[k] 对应一张 <stem>/<file>（零填充命名，字典序=演奏序），w 为该小节源像素宽。
//
// 设计要点：光标/滚动「不」用 t_start/t_end 秒数驱动（慢练 60%、渐进提速、变速 MIDI 会让秒数漂移），
// 而是用 app 播放引擎的「乐拍位置」按 totalBeats↔n_measures 均匀映射到小节——天然跟随 timeScale，
// 真实谱面、合成五线谱、下落光柱三者帧帧同步。秒数仅作可选回退/校验保留。
// 纯逻辑、无 DOM，便于单测。

// 解析 + 归一化：算出每小节在 ribbon 中的累计像素 x（x0..x1）与总宽 totalWidth。
// 若每小节带 beat_start/beat_end（OMR 给出的真实 MIDI 拍区间，按演奏顺序排列、单调不减），
// 则置 hasBeats=true，渲染时改用「按拍区间二分」精确定位——可正确处理弱起小节、变拍号、
// D.S./反复/二房等「同一谱面小节被演奏多遍或跳转」的情形（均匀映射在这些跳转点必崩）。
export function parseSheetIndex(json) {
  const src = (json && Array.isArray(json.measures)) ? json.measures : [];
  const measures = src.map((m) => {
    const hasBS = m.beat_start != null && m.beat_end != null;
    const bs = +m.beat_start, be = +m.beat_end;
    return {
      i: +m.i || 0,
      file: String(m.file || ''),
      w: Math.max(1, Math.round(+m.w || 1)),
      t_start: +m.t_start || 0,
      t_end: +m.t_end || 0,
      // 拍区间：缺省 null（回退均匀映射）；非法（NaN/非递增）会让 hasBeats 整体置 false
      beatStart: hasBS && Number.isFinite(bs) ? bs : null,
      beatEnd: hasBS && Number.isFinite(be) ? be : null,
      lowConf: !!m.low_confidence,
      x0: 0, x1: 0,
    };
  });
  let x = 0;
  for (const m of measures) { m.x0 = x; x += m.w; m.x1 = x; }
  // 校验拍区间可用性：每格都得有有效 beatEnd>beatStart，且 beatStart 单调不减（演奏顺序）
  let hasBeats = measures.length > 0;
  let prev = -Infinity;
  for (const m of measures) {
    if (m.beatStart == null || m.beatEnd == null || !(m.beatEnd > m.beatStart) || m.beatStart < prev) {
      hasBeats = false; break;
    }
    prev = m.beatStart;
  }
  return {
    stem: (json && json.stem) || '',
    height: Math.max(1, Math.round((json && +json.height) || 240)),
    bpm: (json && +json.bpm) || 0,
    barSeconds: (json && +json.bar_seconds) || 0,
    nMeasures: measures.length,
    totalSeconds: (json && +json.total_seconds) || 0,
    totalWidth: x,
    hasBeats,
    measures,
  };
}

// 主映射（均匀回退）：把整曲乐拍区间 [0, totalBeats) 均匀铺到 n 个谱面小节上。
// 返回 { idx(0基), f(该小节内 0..1 进度) }。totalBeats 缺省时退化为「每小节 1 拍」。
// 仅在 index.json 未提供 beat_start/beat_end 时使用——无法处理反复/弱起/变拍。
export function measureAtBeat(beat, totalBeats, nMeasures) {
  const n = Math.max(0, nMeasures | 0);
  if (n <= 0) return { idx: 0, f: 0 };
  const span = totalBeats > 0 ? totalBeats / n : 1;
  let idx = Math.floor((beat || 0) / span);
  if (idx < 0) idx = 0;
  if (idx > n - 1) idx = n - 1;
  let f = span > 0 ? ((beat || 0) - idx * span) / span : 0;
  if (f < 0) f = 0;
  if (f > 1) f = 1;
  return { idx, f };
}

// 精确映射（首选，当 hasBeats）：按每小节真实 MIDI 拍区间 [beatStart, beatEnd) 二分定位。
// measures 须按演奏顺序、beatStart 单调不减（反复段会被 OMR 展开成重复条目，各带不同拍区间）。
// 返回 { idx, f }。落在两格之间的间隙时停在前一格末尾（f=1，等待下一格）；超界两端各自夹紧。
export function measureAtBeatRange(measures, beat) {
  const ms = measures || [];
  if (!ms.length) return { idx: 0, f: 0 };
  const b = +beat || 0;
  if (b <= ms[0].beatStart) return { idx: 0, f: 0 };
  // 二分：取最后一个 beatStart <= b 的小节
  let lo = 0, hi = ms.length - 1, idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (ms[mid].beatStart <= b) { idx = mid; lo = mid + 1; } else { hi = mid - 1; }
  }
  const m = ms[idx];
  const span = m.beatEnd - m.beatStart;
  let f = span > 0 ? (b - m.beatStart) / span : 0;
  if (f < 0) f = 0;
  if (f > 1) f = 1;
  return { idx, f };
}

// 回退映射：按秒数（t_start/t_end）定位小节，供无引擎拍位时使用。
export function measureAtTime(measures, tSec) {
  const ms = measures || [];
  if (!ms.length) return { idx: 0, f: 0 };
  const t = +tSec || 0;
  let idx = 0;
  for (let i = 0; i < ms.length; i++) { if (t >= ms[i].t_start) idx = i; else break; }
  const m = ms[idx];
  const dur = (m.t_end - m.t_start) || 1;
  let f = (t - m.t_start) / dur;
  if (f < 0) f = 0;
  if (f > 1) f = 1;
  return { idx, f };
}

// 光标在 ribbon 中的源像素 X（小节 idx + 小节内进度 f）。
export function cursorX(measures, idx, f) {
  const m = (measures || [])[idx];
  if (!m) return 0;
  return m.x0 + (f || 0) * (m.x1 - m.x0);
}

// 从 .mid 路径推出同名谱面文件夹与 index.json 路径（约定：去掉 .mid 后缀即文件夹）。
export function sheetPaths(midiPath) {
  const folder = String(midiPath || '').replace(/\.mid$/i, '');
  return { folder, index: folder + '/index.json' };
}

// 单张小节图的 URL。
export function pngUrl(folder, file) {
  return String(folder || '') + '/' + String(file || '');
}

// 谱面卷帘「显示高度」配置：源切图高度（index.json 的 height）只是缩放基准，
// 显示高度与之无关——平板横/竖屏可视空间差异大，应按视口动态取值并允许手动调节。
export const SHEET_H = { min: 72, max: 360, frac: 0.24, key: 'ca99.sheetH' };

// 把任意高度夹到合理区间（手动调节/读 localStorage 时用）。无效值回退到 min。
export function clampSheetHeight(h, cfg = SHEET_H) {
  const min = cfg.min, max = cfg.max;
  const v = Math.round(+h || 0);
  if (!(v > 0)) return min;
  return Math.max(min, Math.min(max, v));
}

// 按视口高度算「自适应默认显示高度」：取视口高的一定比例再夹到 [min,max]。
// 竖屏视口高 → 谱面更大更易读；横屏视口矮 → 谱面收窄，给键盘/光柱留空间。
export function defaultSheetHeight(viewportH, cfg = SHEET_H) {
  const h = Math.round((+viewportH || 700) * cfg.frac);
  return Math.max(cfg.min, Math.min(cfg.max, h));
}
