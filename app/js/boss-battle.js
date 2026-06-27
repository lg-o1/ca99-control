/**
 * boss-battle.js — 🐉 Boss 战（把难片段变成打怪游戏，纯逻辑，可单元测试）
 *
 * 设计目标（针对易放弃的孩子，低挫败 + 清晰进度）：
 *  - 把一小段"乐句"（passage）做成 Boss 的护盾，按顺序在键盘上弹对就削血。
 *  - **没有时间压力**（等待模式：弹对才前进），任何年龄都能上手。
 *  - 进度可视化：50 格血条；弹错只扣一颗 ❤（给容错空间），不直接判负。
 *  - "连续完美"通关给三星——鼓励精度，但出错也能慢慢磨过去（保留已削的血）。
 */

const NN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
/** "C4" / "G4" → MIDI（中央 C=C4=60） */
export function nameToMidi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('bad note ' + name);
  let v = NN[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return v + (parseInt(m[3], 10) + 1) * 12;
}
const seq = (...names) => names.map(nameToMidi);

/** 内置 Boss（由易到难，passage 是要按顺序弹的乐句） */
export const BOSSES = [
  { id: 'slime',   name: '果冻史莱姆', emoji: '🟢', hp: 50, reps: 3, passage: seq('C4', 'D4', 'E4'),                       reward: '🎀 缎带' },
  { id: 'bat',     name: '音符蝙蝠',   emoji: '🦇', hp: 50, reps: 3, passage: seq('E4', 'D4', 'C4', 'D4'),                 reward: '🔮 魔珠' },
  { id: 'golem',   name: '五度石巨人', emoji: '🗿', hp: 50, reps: 3, passage: seq('C4', 'E4', 'G4', 'E4', 'C4'),           reward: '💎 宝石' },
  { id: 'dragon',  name: '音阶飞龙',   emoji: '🐉', hp: 60, reps: 3, passage: seq('C4', 'D4', 'E4', 'F4', 'G4', 'A4'),     reward: '👑 王冠' },
];

export function getBoss(id) { return BOSSES.find((b) => b.id === id) || BOSSES[0]; }

const pc = (m) => ((m % 12) + 12) % 12;

/**
 * Boss 战状态机。
 * opts: { boss, hearts=3, octaveAgnostic=true }
 */
export class BossBattle {
  constructor({ boss, hearts = 3, octaveAgnostic = true } = {}) {
    this.boss = typeof boss === 'string' ? getBoss(boss) : (boss || BOSSES[0]);
    this.passage = this.boss.passage.slice();
    this.maxHp = this.boss.hp;
    this.reps = this.boss.reps || 3;
    this.dmgPerPass = Math.ceil(this.maxHp / this.reps);
    this.maxHearts = hearts;
    this.octaveAgnostic = octaveAgnostic !== false;
    this.reset();
  }

  reset() {
    this.hp = this.maxHp;
    this.hearts = this.maxHearts;
    this.idx = 0;               // 乐句内当前位置
    this.passes = 0;           // 完成乐句次数
    this.cleanPasses = 0;      // 无错完成的乐句次数（评星用）
    this.passHadError = false; // 本次乐句是否出过错
    this.combo = 0;            // 连续弹对的音数
    this.bestCombo = 0;
    this.totalCorrect = 0;
    this.totalWrong = 0;
    this.defeated = false;
    this.failed = false;
    return this;
  }

  /** 💛 复活：恢复满心、清除失败状态，保留已削的血量从当前进度继续 */
  revive() {
    this.hearts = this.maxHearts;
    this.failed = false;
    this.idx = 0;
    this.passHadError = false;
    this.combo = 0;
    return this;
  }

  /** 当前该弹的目标音（MIDI），已通关/失败则 null */
  current() {
    if (this.defeated || this.failed) return null;
    return this.passage[this.idx];
  }

  /** 是否匹配目标音（可忽略八度） */
  _match(midi) {
    const t = this.passage[this.idx];
    return this.octaveAgnostic ? pc(midi) === pc(t) : midi === t;
  }

  /**
   * 弹一个键。返回 {ok, hit, miss, passageDone, dmg, defeated, failed, target}
   */
  press(midi) {
    if (this.defeated || this.failed) {
      return { ok: false, hit: false, miss: false, passageDone: false, dmg: 0, defeated: this.defeated, failed: this.failed, target: null };
    }
    if (this._match(midi)) {
      this.idx++;
      this.combo++;
      this.totalCorrect++;
      if (this.combo > this.bestCombo) this.bestCombo = this.combo;
      if (this.idx >= this.passage.length) {
        // 完成一次乐句 → 削血
        const dmg = Math.min(this.dmgPerPass, this.hp);
        this.hp -= dmg;
        this.passes++;
        if (!this.passHadError) this.cleanPasses++;
        this.idx = 0;
        this.passHadError = false;
        if (this.hp <= 0) { this.hp = 0; this.defeated = true; }
        return { ok: true, hit: true, miss: false, passageDone: true, dmg, defeated: this.defeated, failed: false, target: this.current() };
      }
      return { ok: true, hit: true, miss: false, passageDone: false, dmg: 0, defeated: false, failed: false, target: this.current() };
    }
    // 弹错 → 扣一颗心、本次乐句标记出错、从头再来（不清已削的血）
    this.hearts--;
    this.totalWrong++;
    this.combo = 0;
    this.passHadError = true;
    this.idx = 0;
    if (this.hearts <= 0) { this.hearts = 0; this.failed = true; }
    return { ok: false, hit: false, miss: true, passageDone: false, dmg: 0, defeated: false, failed: this.failed, target: this.current() };
  }

  /** 血量比例 0..1（血条用） */
  progress() { return this.maxHp ? this.hp / this.maxHp : 0; }

  /** 评星：无伤通关=3，掉≤1心=2，否则=1 */
  stars() {
    if (!this.defeated) return 0;
    const lost = this.maxHearts - this.hearts;
    if (lost === 0 && this.cleanPasses >= this.reps) return 3;
    if (lost <= 1) return 2;
    return 1;
  }
}
