/**
 * score-error.js — 🎯 谱面错误热力图（Score Error Heatmap）纯逻辑引擎
 *
 * 区别于 heatmap.js（"多久没练"的日历 recency 热图）：本模块是**谱面逐拍的错误空间图**。
 * 弹完一遍后，把每个音/每拍按错误类型着色——
 *   · 红 = 音高错（按错键）
 *   · 蓝 = 节奏错（来早/来晚，超出容差）
 *   · 黄 = 犹豫（明显停顿后才弹对）
 *   · 绿 = 干净弹对
 * 把抽象的"你错了 N 个"变成可点击、可定位的空间反馈：哪一小节最该回去练，一目了然。
 *
 * 纯逻辑：调用方喂入"期望事件"（含理想时间 + 音高）与"实际事件"（实弹时间 + 音高），
 * 引擎对齐并逐音分类，再按小节聚合。时间单位 ms，全部可注入、确定性可测。
 */

/** 错误类型常量（与配色绑定，配色取主题安全色，换主题不撞底） */
export const CELL_KINDS = {
  clean:     { id: 'clean',     emoji: '🟢', color: '#22c55e', label: '弹对'   },
  pitch:     { id: 'pitch',     emoji: '🔴', color: '#ef4444', label: '音高错' },
  rhythm:    { id: 'rhythm',    emoji: '🔵', color: '#3b82f6', label: '节奏错' },
  hesitate:  { id: 'hesitate',  emoji: '🟡', color: '#eab308', label: '犹豫'   },
  missed:    { id: 'missed',    emoji: '⚪', color: '#64748b', label: '漏弹'   },
};

/** 默认判定阈值（ms） */
export const DEFAULTS = {
  rhythmTol: 150,    // 实弹与理想时间偏差超过此值 = 节奏错
  hesitateGap: 700,  // 与上一个实弹音的间隔超过此值（且这一拍弹对）= 犹豫
};

/** 音级（0..11），用于八度无关的音高比较时可选 */
export function pitchClass(m) { return ((m % 12) + 12) % 12; }

/**
 * 对单个音分类。
 * @param {object} exp   期望事件 {t, midi}
 * @param {object|null} act  对齐到的实际事件 {t, midi} 或 null（漏弹）
 * @param {object} o    {rhythmTol, hesitateGap, prevActT, octaveAgnostic}
 * @returns {string} CELL_KINDS 的 id
 */
export function classifyNote(exp, act, o = {}) {
  if (!act) return 'missed';
  const tol = o.rhythmTol != null ? o.rhythmTol : DEFAULTS.rhythmTol;
  const hg = o.hesitateGap != null ? o.hesitateGap : DEFAULTS.hesitateGap;
  const same = o.octaveAgnostic ? pitchClass(act.midi) === pitchClass(exp.midi) : act.midi === exp.midi;
  if (!same) return 'pitch';
  // 音高对：再看节奏与犹豫
  if (Math.abs(act.t - exp.t) > tol) return 'rhythm';
  if (o.prevActT != null && (act.t - o.prevActT) > hg) return 'hesitate';
  return 'clean';
}

/**
 * 把期望序列与实际序列按"贪心最近邻、同序"对齐并逐音分类。
 * 期望与实际都假定按时间升序。对每个期望音，在实际序列里向前找尚未用过的、
 * 时间最接近的音作为它的演奏（简单贪心，足够课堂场景用）。
 *
 * @param {Array<{t:number,midi:number}>} expected
 * @param {Array<{t:number,midi:number}>} actual
 * @param {object} opts  {rhythmTol, hesitateGap, octaveAgnostic}
 * @returns {Array<{i:number, exp, act, kind:string}>}
 */
export function analyzeNotes(expected, actual, opts = {}) {
  const acts = (actual || []).slice().sort((a, b) => a.t - b.t);
  const used = new Array(acts.length).fill(false);
  const tol = opts.rhythmTol != null ? opts.rhythmTol : DEFAULTS.rhythmTol;
  const out = [];
  let prevActT = null;
  (expected || []).forEach((exp, i) => {
    // 找未用过的、时间最接近 exp.t 的实弹音（窗口放宽到 4×容差，避免错配太远）
    let best = -1, bestD = Infinity;
    for (let j = 0; j < acts.length; j++) {
      if (used[j]) continue;
      const d = Math.abs(acts[j].t - exp.t);
      if (d < bestD) { bestD = d; best = j; }
    }
    let act = null;
    if (best >= 0 && bestD <= tol * 4) { act = acts[best]; used[best] = true; }
    const kind = classifyNote(exp, act, { ...opts, prevActT });
    if (act) prevActT = act.t;
    out.push({ i, exp, act, kind });
  });
  return out;
}

/**
 * 按小节聚合逐音结果。每个期望音用 exp.measure（1-based）归组；
 * 缺失 measure 时按 notesPerBar 平均切分（兜底）。
 *
 * @param {Array} noteResults  analyzeNotes 的输出
 * @param {object} o  {notesPerBar}
 * @returns {Array<{measure:number, cells:Array, counts:object, worstKind:string, accuracy:number}>}
 */
export function aggregateByMeasure(noteResults, o = {}) {
  const npb = o.notesPerBar || 4;
  const bars = new Map();
  noteResults.forEach((r, idx) => {
    const m = (r.exp && r.exp.measure) || (Math.floor(idx / npb) + 1);
    if (!bars.has(m)) bars.set(m, []);
    bars.get(m).push(r);
  });
  const order = [...bars.keys()].sort((a, b) => a - b);
  return order.map((m) => {
    const cells = bars.get(m);
    const counts = { clean: 0, pitch: 0, rhythm: 0, hesitate: 0, missed: 0 };
    cells.forEach((c) => { counts[c.kind] = (counts[c.kind] || 0) + 1; });
    const total = cells.length || 1;
    const accuracy = Math.round((counts.clean / total) * 100);
    return { measure: m, cells, counts, worstKind: worstKind(counts), accuracy };
  });
}

/** 一个小节里"最该回去练"的错误类型（漏弹>音高>节奏>犹豫>干净） */
export function worstKind(counts) {
  const order = ['missed', 'pitch', 'rhythm', 'hesitate'];
  for (const k of order) if (counts[k] > 0) return k;
  return 'clean';
}

/** 整曲汇总：总体准确率 + 最该回去练的前 N 个小节 */
export function summarize(measureResults, topN = 3) {
  let total = 0, clean = 0;
  measureResults.forEach((mr) => {
    Object.values(mr.counts).forEach((v) => { total += v; });
    clean += mr.counts.clean;
  });
  const accuracy = total ? Math.round((clean / total) * 100) : 0;
  const worst = measureResults
    .filter((mr) => mr.worstKind !== 'clean')
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, topN)
    .map((mr) => mr.measure);
  return { accuracy, totalNotes: total, cleanNotes: clean, worstMeasures: worst };
}
