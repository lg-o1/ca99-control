/**
 * speed-run.js — 🚀 极速挑战（把音阶/乐句弹对又弹快 → 刷新个人 BPM 纪录，纯逻辑）
 *
 * 设计（低挫败 + 内在动机）：
 *  - 不强制跟节拍器（那种"卡点"压力对易放弃的孩子最劝退），而是 **整段计时**：
 *    把一段乐句<b>按顺序弹对</b>，引擎计算从第一个音到最后一个音的<b>有效速度(BPM)</b>。
 *  - 弹得比当前目标快 → <b>升一档</b>(+5 BPM) 并刷新个人纪录；没达标 → 目标不变，鼓励再试。
 *  - 弹错 → 本次作废、从头再来（不惩罚目标速度）。追求"刷自己的纪录"而非跟别人比。
 */

const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function nameToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  const v = NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}
const seq = (...n) => n.map(nameToMidi);

/** 内置乐句（音阶/琶音，由短到长） */
export const RUNS = [
  { id: 'cmaj-up',   name: 'C 大调音阶 ↑', notes: seq('C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5') },
  { id: 'cmaj-down', name: 'C 大调音阶 ↓', notes: seq('C5', 'B4', 'A4', 'G4', 'F4', 'E4', 'D4', 'C4') },
  { id: 'cmaj-updn', name: 'C 大调上下行', notes: seq('C4', 'D4', 'E4', 'F4', 'G4', 'F4', 'E4', 'D4', 'C4') },
  { id: 'arp-c',     name: 'C 大三琶音',   notes: seq('C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'C4') },
];
export function getRun(id) { return RUNS.find((r) => r.id === id) || RUNS[0]; }

const pc = (m) => ((m % 12) + 12) % 12;

/** 由整段耗时算有效 BPM（len-1 个相邻音程铺在 elapsed 毫秒里，每音 beatsPerNote 拍） */
export function bpmFromElapsed(noteCount, elapsedMs, beatsPerNote = 1) {
  if (elapsedMs <= 0 || noteCount < 2) return 0;
  const beats = (noteCount - 1) * beatsPerNote;
  return Math.round(beats / (elapsedMs / 60000));
}

/**
 * 极速挑战状态机。
 * opts: { run, startBpm=50, step=5, beatsPerNote=1, octaveAgnostic=true }
 */
export class SpeedRun {
  constructor({ run, startBpm = 50, step = 5, beatsPerNote = 1, octaveAgnostic = true } = {}) {
    this.run = typeof run === 'string' ? getRun(run) : (run || RUNS[0]);
    this.notes = this.run.notes.slice();
    this.startBpm = startBpm;
    this.step = step;
    this.beatsPerNote = beatsPerNote;
    this.octaveAgnostic = octaveAgnostic !== false;
    this.reset();
  }

  reset() {
    this.targetBpm = this.startBpm;
    this.bestBpm = 0;
    this.idx = 0;
    this.runStartMs = 0;
    this.runs = 0;          // 完成的干净次数
    this.records = 0;       // 刷新纪录次数
    this.history = [];      // 每次完成的有效 BPM
    return this;
  }

  current() { return this.idx < this.notes.length ? this.notes[this.idx] : null; }
  _match(midi) {
    const t = this.notes[this.idx];
    return this.octaveAgnostic ? pc(midi) === pc(t) : midi === t;
  }

  /**
   * 弹一个键（带时间戳）。返回：
   *  - 进行中：{ok, advance, idx, started}
   *  - 弹错：  {ok:false, wrong:true}
   *  - 完成：  {ok:true, complete:true, effBpm, clean:true, leveledUp, targetBpm, bestBpm, newRecord}
   */
  press(midi, nowMs) {
    if (this._match(midi)) {
      const started = this.idx === 0;
      if (started) this.runStartMs = nowMs;
      this.idx++;
      if (this.idx >= this.notes.length) {
        const elapsed = nowMs - this.runStartMs;
        const effBpm = bpmFromElapsed(this.notes.length, elapsed, this.beatsPerNote);
        this.runs++;
        this.history.push(effBpm);
        const newRecord = effBpm > this.bestBpm;
        if (newRecord) this.bestBpm = effBpm;
        const leveledUp = effBpm >= this.targetBpm;
        if (leveledUp) { this.targetBpm += this.step; this.records++; }
        this.idx = 0;
        this.runStartMs = 0;
        return { ok: true, complete: true, effBpm, clean: true, leveledUp, newRecord, targetBpm: this.targetBpm, bestBpm: this.bestBpm };
      }
      return { ok: true, advance: true, complete: false, idx: this.idx, started };
    }
    // 弹错 → 整段作废从头来
    this.idx = 0;
    this.runStartMs = 0;
    return { ok: false, wrong: true, complete: false };
  }
}
