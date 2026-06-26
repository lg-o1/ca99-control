/**
 * ghost-race.js — 👻 幽灵竞速（和「过去的自己」赛跑，纯逻辑）
 *
 * 设计（成长思维友好，直击 Lily 成长思维 2.3/6 的脆弱点）：
 *  - 不和别人比、不排行榜——对手是<b>你自己过去最快的一次</b>（「幽灵」）。
 *  - 把一段乐句<b>按顺序弹对</b>，引擎从第一个音计时到最后一个音；幽灵是上次最佳
 *    用时，按时间在赛道上同步前进。比幽灵先到 = 打败昨天的我 → 刷新纪录。
 *  - 弹错只是<b>本次作废从头来</b>（幽灵纪录不变、不惩罚），鼓励「超越自我」而非挫败。
 *
 * 纯逻辑：赛道位置 / 领先量 / 用时格式 / 奖牌判定都是纯函数，可单测；
 * DOM、localStorage（存每条赛道的个人最佳用时）留给 app.js 渲染层。
 */

const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function nameToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  const v = NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}
const seq = (...n) => n.map(nameToMidi);

/** 内置赛道（短乐句，由短到长） */
export const RACES = [
  { id: 'cmaj-up',   name: 'C 大调音阶 ↑', emoji: '🏃', notes: seq('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5') },
  { id: 'arp-c',     name: 'C 大三琶音',   emoji: '🚀', notes: seq('C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4') },
  { id: 'cmaj-updn', name: 'C 大调上下行', emoji: '🏎️', notes: seq('C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4') },
  { id: 'gmaj-up',   name: 'G 大调音阶 ↑', emoji: '🐎', notes: seq('G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F#5', 'G5') },
];
export function getRace(id) { return RACES.find((r) => r.id === id) || RACES[0]; }

const pc = (m) => ((m % 12) + 12) % 12;

/** 幽灵在赛道上的进度比例（0-1）：已用时 / 幽灵总用时。无幽灵或非正用时 → 0。 */
export function ghostFrac(elapsedMs, ghostMs) {
  if (!ghostMs || ghostMs <= 0) return 0;
  return Math.max(0, Math.min(1, elapsedMs / ghostMs));
}

/** 玩家进度比例（0-1）：已弹对音数 / 总音数。 */
export function playerFrac(idx, total) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, idx / total));
}

/** 按当前节奏预测的完成用时（外推）。idx<2 → null（还没足够数据）。 */
export function projectedMs(elapsedMs, idx, total) {
  if (idx < 2 || total < 2) return null;
  const perInterval = elapsedMs / (idx - 1); // 计时从第 1 个音起，已完成 idx-1 个音程
  return Math.round(perInterval * (total - 1));
}

/**
 * 领先量（玩家进度比例 − 幽灵进度比例）。
 * 正 = 玩家领先（在幽灵前面）；负 = 落后。无幽灵 → 玩家进度本身。
 */
export function lead(elapsedMs, idx, total, ghostMs) {
  const p = playerFrac(idx, total);
  if (!ghostMs || ghostMs <= 0) return p;
  return p - ghostFrac(elapsedMs, ghostMs);
}

/** 把毫秒格式化为「1.23 秒」。 */
export function formatMs(ms) {
  if (ms == null || !isFinite(ms)) return '—';
  return (Math.round(ms) / 1000).toFixed(2) + ' 秒';
}

/**
 * 奖牌判定：
 *  - 'first'  无幽灵（首次完成）
 *  - 'record' 打破纪录（比幽灵快）
 *  - 'close'  没破纪录但很接近（差 ≤ 10%）
 *  - 'tryagain' 比幽灵慢较多
 */
export function medalFor(timeMs, ghostMs) {
  if (!ghostMs || ghostMs <= 0) return 'first';
  if (timeMs < ghostMs) return 'record';
  if (timeMs <= ghostMs * 1.1) return 'close';
  return 'tryagain';
}

/**
 * 幽灵竞速状态机。计时玩家把整段乐句按序弹对的用时，与传入的幽灵（上次最佳）比较。
 * opts: { race, ghostMs=null, octaveAgnostic=true }
 */
export class GhostRace {
  constructor({ race, ghostMs = null, octaveAgnostic = true } = {}) {
    this.race = typeof race === 'string' ? getRace(race) : (race || RACES[0]);
    this.notes = this.race.notes.slice();
    this.ghostMs = ghostMs && ghostMs > 0 ? ghostMs : null;
    this.octaveAgnostic = octaveAgnostic !== false;
    this.reset();
  }

  reset() {
    this.idx = 0;
    this.runStartMs = 0;
    this.runs = 0;       // 完成的干净次数
    this.records = 0;    // 刷新纪录次数
    this.lastMs = null;  // 上次完成用时
    return this;
  }

  setGhost(ms) { this.ghostMs = ms && ms > 0 ? ms : null; return this; }
  total() { return this.notes.length; }
  current() { return this.idx < this.notes.length ? this.notes[this.idx] : null; }
  _match(midi) {
    const t = this.notes[this.idx];
    return this.octaveAgnostic ? pc(midi) === pc(t) : midi === t;
  }

  /** 自起跑以来的已用毫秒（未起跑 → 0）。 */
  elapsed(nowMs) {
    return this.idx > 0 && this.runStartMs ? Math.max(0, nowMs - this.runStartMs) : 0;
  }

  /**
   * 弹一个键（带时间戳）。返回：
   *  - 进行中：{ok:true, advance:true, idx, started, complete:false}
   *  - 弹错：  {ok:false, wrong:true, complete:false}
   *  - 完成：  {ok:true, complete:true, timeMs, beat, newRecord, medal, deltaMs, ghostMs}
   */
  press(midi, nowMs) {
    if (this._match(midi)) {
      const started = this.idx === 0;
      if (started) this.runStartMs = nowMs;
      this.idx++;
      if (this.idx >= this.notes.length) {
        const timeMs = Math.max(0, nowMs - this.runStartMs);
        const prevGhost = this.ghostMs;
        const beat = prevGhost == null || timeMs < prevGhost;
        const newRecord = prevGhost == null || timeMs < prevGhost;
        const medal = medalFor(timeMs, prevGhost);
        const deltaMs = prevGhost == null ? null : timeMs - prevGhost;
        this.runs++;
        this.lastMs = timeMs;
        if (newRecord) { this.records++; this.ghostMs = timeMs; }
        this.idx = 0;
        this.runStartMs = 0;
        return { ok: true, complete: true, timeMs, beat, newRecord, medal, deltaMs, ghostMs: prevGhost };
      }
      return { ok: true, advance: true, complete: false, idx: this.idx, started };
    }
    // 弹错 → 整段作废从头来
    this.idx = 0;
    this.runStartMs = 0;
    return { ok: false, wrong: true, complete: false };
  }
}
