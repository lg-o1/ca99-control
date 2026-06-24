/**
 * note-id.js — 键盘音名认知（keyboard note identification）纯逻辑引擎
 *
 * 面向新手的地基练习：把【音名】和【88 键上的实际键位】对应起来。
 * 这是看懂任何练习答案的前提——知道 "C4" 是哪个键、某个键叫什么音。
 *
 * 两种模式：
 *   name2key（看音名找键）：屏幕给一个音名（如 "C4" / "F#3"），你在键盘上点对应的键。
 *   key2name（看键认音名）：屏幕在键盘上点亮一个键，你从若干音名里选出它的名字。
 *
 * 与现有模块都不同：
 *   - 唱名/音级听辨 solfège：靠【听】辨相对主音的音级（练耳）
 *   - 音程/和弦/调式听辨：都依赖听觉
 *   这里练的是【看谱/认键】的视觉-空间对应，是纯新手最该先打牢的基本功。
 *
 * 纯逻辑：不碰 Web Audio / MIDI / DOM，只产生题目并校验答案。播放/渲染交给 UI。
 */

/** 升号体系音名（C 大调白键 + 黑键写作升号） */
export const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
/** 降号体系音名（黑键写作降号） */
export const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
/** 白键音级（pitch class） */
export const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];

/** 某 MIDI 是不是黑键 */
export function isBlack(midi) {
  return !WHITE_PCS.includes(((midi % 12) + 12) % 12);
}

/** pitch class -> 音名（不含八度） */
export function pcName(pc, accidental = 'sharp') {
  const p = ((pc % 12) + 12) % 12;
  return (accidental === 'flat' ? FLAT_NAMES : SHARP_NAMES)[p];
}

/** MIDI -> 音名（C4 = 60 = 中央 C） */
export function noteName(midi, opts = {}) {
  const { accidental = 'sharp', useOctave = true } = opts;
  const name = pcName(midi, accidental);
  if (!useOctave) return name;
  const oct = Math.floor(midi / 12) - 1;
  return name + oct;
}

export class NoteIdGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string} opts.mode         'name2key'（看音名找键，默认）或 'key2name'（看键认音名）
   * @param {number} opts.midiMin      MIDI 下限（默认 C3 = 48）
   * @param {number} opts.midiMax      MIDI 上限（默认 C5 = 72）
   * @param {boolean} opts.whiteOnly   只考白键（新手友好，默认 false）
   * @param {boolean} opts.useOctave   音名是否带八度数字（默认 true）
   * @param {string} opts.accidental   黑键写法 'sharp'（默认）或 'flat'
   * @param {number} opts.choiceCount  key2name 模式选项个数（默认 4）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.mode = opts.mode === 'key2name' ? 'key2name' : 'name2key';
    this.midiMin = opts.midiMin ?? 48;
    this.midiMax = opts.midiMax ?? 72;
    if (this.midiMax < this.midiMin) { const t = this.midiMax; this.midiMax = this.midiMin; this.midiMin = t; }
    this.whiteOnly = !!opts.whiteOnly;
    this.useOctave = opts.useOctave !== false;
    this.accidental = opts.accidental === 'flat' ? 'flat' : 'sharp';
    // 候选音池：范围内（可选只白键）
    this.pool = [];
    for (let m = this.midiMin; m <= this.midiMax; m++) {
      if (this.whiteOnly && isBlack(m)) continue;
      this.pool.push(m);
    }
    if (!this.pool.length) { for (let m = this.midiMin; m <= this.midiMax; m++) this.pool.push(m); }
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, this.pool.length));
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { midi, name, pc, octave, choices }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** 出下一题，返回当前题目对象 */
  next() {
    const midi = this._pick(this.pool);
    const name = noteName(midi, { accidental: this.accidental, useOctave: this.useOctave });
    const pc = ((midi % 12) + 12) % 12;
    const octave = Math.floor(midi / 12) - 1;
    let choices = null;
    if (this.mode === 'key2name') {
      // 干扰项：从音池里取“音名不同”的其他键，映射成音名
      const pool = this.pool.filter((m) => noteName(m, { accidental: this.accidental, useOctave: this.useOctave }) !== name);
      const picks = [];
      const seen = new Set([name]);
      while (picks.length < this.choiceCount - 1 && pool.length) {
        const idx = Math.floor(this.rng() * pool.length);
        const m = pool.splice(idx, 1)[0];
        const nm = noteName(m, { accidental: this.accidental, useOctave: this.useOctave });
        if (seen.has(nm)) continue;
        seen.add(nm);
        picks.push({ midi: m, name: nm });
      }
      const all = picks.concat([{ midi, name }]);
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      choices = all;
    }
    this.current = { midi, name, pc, octave, choices };
    this.onNew(this.current);
    return this.current;
  }

  /** 目标键 MIDI */
  target() { return this.current ? this.current.midi : null; }
  /** 目标音名（name2key 显示给用户；key2name 是正确答案） */
  promptName() { return this.current ? this.current.name : null; }
  /** key2name 选项（{midi,name} 数组） */
  choices() { return this.current && this.current.choices ? this.current.choices.slice() : []; }

  /**
   * 校验答案。
   *   name2key：answer 是点下的键 MIDI（数字）。useOctave=true 要求同一个键；
   *             useOctave=false 只要音名（pitch class）对即可（任意八度的同名键）。
   *   key2name：answer 是选中的音名字符串。
   * @returns {boolean}
   */
  check(answer) {
    if (!this.current) return false;
    this.attempts++;
    let correct;
    if (this.mode === 'name2key') {
      if (typeof answer !== 'number') correct = false;
      else if (this.useOctave) correct = answer === this.current.midi;
      else correct = (((answer % 12) + 12) % 12) === this.current.pc;
    } else {
      correct = answer === this.current.name;
    }
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    this.onResult(correct, {
      answer, midi: this.current.midi, name: this.current.name,
      score: this.score, streak: this.streak,
    });
    return correct;
  }

  get accuracy() { return this.attempts ? this.score / this.attempts : 0; }
  reset() { this.score = 0; this.streak = 0; this.best = 0; this.attempts = 0; this.current = null; }
}
