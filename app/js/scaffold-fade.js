/**
 * scaffold-fade.js — 🪜 多阶段脚手架淡出（Multi-stage Scaffold Fade）纯逻辑
 *
 * 灵感来自 PianoVision 的"分级脚手架"。note-color.js 只能淡出"颜色"一种辅助，
 * 本模块把识谱辅助分成**三层脚手架**，随掌握度**逐层撤掉**，最终走到真正的读谱/记忆：
 *   阶段 0 全脚手架：音名标签 + 彩色音符 + 下落提示  （零基础）
 *   阶段 1 去音名：    彩色音符 + 下落提示
 *   阶段 2 去颜色：    只剩下落提示
 *   阶段 3 全撤：      纯五线谱（凭记忆/真读谱）
 *
 * 关键：辅助必须能"渐隐"而非突然消失——每个阶段切换时，**正在被撤掉的那层**会按
 * 阶段内进度从 1→0 平滑淡出，孩子几乎察觉不到地"断奶"。复用 note-color 的配色。
 *
 * 纯逻辑：按 {correct, attempts} 给阶段与各层不透明度，便于单元测试。
 */

import { noteColor } from './note-color.js';

/** 三层脚手架的阶段定义。aids 表示该阶段"完全显示"哪些层。 */
export const STAGES = [
  { idx: 0, id: 'full',  label: '全脚手架', aids: { name: true,  color: true,  drop: true  }, fading: 'name',  minAcc: 0,    minN: 0  },
  { idx: 1, id: 'nolab', label: '去音名',   aids: { name: false, color: true,  drop: true  }, fading: 'color', minAcc: 0.6,  minN: 8  },
  { idx: 2, id: 'nocol', label: '去颜色',   aids: { name: false, color: false, drop: true  }, fading: 'drop',  minAcc: 0.8,  minN: 16 },
  { idx: 3, id: 'bare',  label: '纯读谱',   aids: { name: false, color: false, drop: false }, fading: null,    minAcc: 0.92, minN: 24 },
];

/** 正确率（0..1），attempts 不足返回 0 */
export function accuracy(correct, attempts) {
  return attempts > 0 ? correct / attempts : 0;
}

/**
 * 据掌握度求当前阶段索引（0..3）。必须同时满足"样本够 + 正确率达标"才升级，
 * 始终返回能稳定满足条件的最高阶段（单调、不跳级回退靠调用方持久化处理）。
 */
export function stageForMastery({ correct = 0, attempts = 0 } = {}) {
  const acc = accuracy(correct, attempts);
  let s = 0;
  for (const st of STAGES) {
    if (attempts >= st.minN && acc >= st.minAcc) s = st.idx;
  }
  return s;
}

/** 阶段对象 */
export function stage(idx) {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, idx))];
}

/**
 * 阶段内进度（0..1）：当前掌握度在"本阶段门槛 → 下阶段门槛"之间走到哪了。
 * 用于让"正在被撤掉的那层"平滑淡出。最后一阶段恒为 1。
 */
export function stageProgress({ correct = 0, attempts = 0 } = {}) {
  const idx = stageForMastery({ correct, attempts });
  const cur = STAGES[idx];
  const next = STAGES[idx + 1];
  if (!next) return 1;
  const acc = accuracy(correct, attempts);
  // 以正确率从 cur.minAcc → next.minAcc 的比例为进度（attempts 不足时压低）
  const span = next.minAcc - cur.minAcc;
  let p = span > 0 ? (acc - cur.minAcc) / span : 1;
  p = Math.max(0, Math.min(1, p));
  // 样本不足时，进度封顶（避免颜色还没练就开始淡出）
  if (attempts < next.minN) p = Math.min(p, 0.5);
  return p;
}

/**
 * 给出三层辅助各自的"当前不透明度"（0..1）——把离散阶段 + 阶段内淡出合成连续值。
 * 完全显示的层 = 1；已撤掉的层 = 0；当前正在淡出的那层 = 1 - 阶段进度。
 *
 * @returns {{name:number, color:number, drop:number, stage:number, label:string}}
 */
export function scaffoldOpacity({ correct = 0, attempts = 0 } = {}) {
  const idx = stageForMastery({ correct, attempts });
  const st = STAGES[idx];
  const p = stageProgress({ correct, attempts });
  const op = { name: 0, color: 0, drop: 0 };
  // 该阶段完全显示的层先置 1
  for (const k of ['name', 'color', 'drop']) op[k] = st.aids[k] ? 1 : 0;
  // 正在淡出的层从 1 平滑降到 0
  if (st.fading) op[st.fading] = 1 - p;
  return { ...op, stage: idx, label: st.label };
}

/**
 * 某个音符当前应渲染的脚手架（合成结果，供 UI 直接用）。
 * @param {number} midi
 * @param {string} name  音名文本（如 'C4'）
 * @param {object} mastery {correct, attempts}
 */
export function noteScaffold(midi, name, mastery = {}) {
  const op = scaffoldOpacity(mastery);
  return {
    stage: op.stage,
    stageLabel: op.label,
    label: { text: name, opacity: op.name },
    color: { value: noteColor(midi), opacity: op.color },
    drop: { show: op.drop > 0, opacity: op.drop },
  };
}
