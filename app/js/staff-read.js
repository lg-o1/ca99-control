/**
 * staff-read.js — 五线谱识谱卡（grand-staff note reading flashcard）纯逻辑引擎
 *
 * 新手读谱的第一步：看到五线谱上一个音符，立刻说出它的音名。这是"看谱→音名→键位"
 * 读谱链条的中间环（note-id 练音名↔键位，本模块练五线谱↔音名）。
 *
 * 和视奏闪卡 sight-reading 不同：那个要你【在键盘上弹出】来作答（需要会弹），
 * 这里是【认读命名】——看谱选音名（多选）或在键盘上点出它，纯识谱、无需会弹，
 * 还带<b>口诀教学</b>（高音谱号线 EGBDF / 间 FACE 等），是真正零基础的读谱入门。
 *
 * 复用 sight-reading 的谱面数学（自然音级步数 / 谱位 / 加线 / 白键映射）。
 * 纯逻辑：不碰 DOM / 音频，只产生题目并校验答案，渲染交给 UI。
 */
import {
  diatonicStep, staffPosition, needsLedger, stepToWhiteNote,
  noteLabel, CLEFS,
} from './sight-reading.js';

export { diatonicStep, staffPosition, needsLedger, stepToWhiteNote, noteLabel, CLEFS };

/** 音名（自然音，识谱只考白键） */
export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

/** MIDI -> 自然音名字母（不含八度，识谱用） */
export function letterOf(midi) {
  const c = noteLabel(midi); // 如 'C#4' / 'C4'
  return c[0];
}

/** MIDI -> 含八度音名（白键，如 'C4'） */
export function fullName(midi) {
  const lbl = noteLabel(midi);
  // noteLabel 可能给出 'C#4'，识谱只用白键，取字母+八度
  return lbl.replace('#', '');
}

/**
 * 各谱号常见线/间的记忆口诀（自下而上）。
 * lines: 5 条线音名（底→顶）；spaces: 4 个间音名（底→顶）。
 */
export const MNEMONICS = {
  treble: {
    label: '高音谱号',
    lines: ['E', 'G', 'B', 'D', 'F'],
    spaces: ['F', 'A', 'C', 'E'],
    lineTip: '五条线 E-G-B-D-F：「Every Good Boy Does Fine」',
    spaceTip: '四个间 F-A-C-E：正好拼成「FACE」',
  },
  bass: {
    label: '低音谱号',
    lines: ['G', 'B', 'D', 'F', 'A'],
    spaces: ['A', 'C', 'E', 'G'],
    lineTip: '五条线 G-B-D-F-A：「Good Boys Do Fine Always」',
    spaceTip: '四个间 A-C-E-G：「All Cows Eat Grass」',
  },
};

/** 某谱号、某谱位（0=底线,2=次线…8=顶线；奇数=间）的口诀提示 */
export function positionTip(clef, position) {
  const m = MNEMONICS[clef];
  if (!m) return '';
  if (position < 0 || position > 8) {
    return position < 0 ? '在谱表下方加线区' : '在谱表上方加线区';
  }
  if (position % 2 === 0) {
    const idx = position / 2; // 0..4 线
    return `第 ${idx + 1} 线（${m.lineTip}）`;
  }
  const idx = (position - 1) / 2; // 0..3 间
  return `第 ${idx + 1} 间（${m.spaceTip}）`;
}

/**
 * 在某谱号常见识谱范围内随机取一个白键音符。
 * 默认范围 position -3..11（底线下加二线 ~ 顶线上加一线半），覆盖最常见识谱区。
 */
export function randomStaffNote(opts = {}) {
  const clef = CLEFS[opts.clef] ? opts.clef : 'treble';
  const rng = opts.rng || Math.random;
  const minPos = opts.minPos ?? -3;
  const maxPos = opts.maxPos ?? 11;
  const base = diatonicStep(CLEFS[clef].bottomLineNote);
  const pos = minPos + Math.floor(rng() * (maxPos - minPos + 1));
  return stepToWhiteNote(base + pos);
}

export class StaffReadGame {
  /**
   * @param {object} opts
   * @param {() => number} opts.rng
   * @param {string} opts.mode          'name'（看谱选音名，默认）或 'key'（看谱点键）
   * @param {string|string[]} opts.clefs 谱号：'treble'|'bass'|'grand'(=两者随机) 或数组（默认 'treble'）
   * @param {boolean} opts.octaveAgnostic key 模式下是否忽略八度（默认 true，适合初学）
   * @param {boolean} opts.useOctave    name 模式音名是否带八度数字（默认 false，只认字母）
   * @param {number} opts.choiceCount   name 模式选项数（默认 4，2..7）
   * @param {number} opts.minPos
   * @param {number} opts.maxPos
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.mode = opts.mode === 'key' ? 'key' : 'name';
    let clefs = opts.clefs ?? 'treble';
    if (clefs === 'grand') clefs = ['treble', 'bass'];
    if (!Array.isArray(clefs)) clefs = [clefs];
    clefs = clefs.filter((c) => CLEFS[c]);
    this.clefs = clefs.length ? clefs : ['treble'];
    this.octaveAgnostic = opts.octaveAgnostic !== false;
    this.useOctave = !!opts.useOctave;
    this.choiceCount = Math.max(2, Math.min(opts.choiceCount ?? 4, 7));
    this.minPos = opts.minPos ?? -3;
    this.maxPos = opts.maxPos ?? 11;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null; // { midi, clef, position, name, letter, choices, tip }
    this.onNew = () => {};
    this.onResult = () => {};
  }

  _pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  /** name 模式的答案音名（按 useOctave 决定带不带八度） */
  _name(midi) { return this.useOctave ? fullName(midi) : letterOf(midi); }

  /** 出下一题 */
  next() {
    const clef = this._pick(this.clefs);
    const midi = randomStaffNote({ clef, rng: this.rng, minPos: this.minPos, maxPos: this.maxPos });
    const position = staffPosition(midi, clef);
    const letter = letterOf(midi);
    const name = this._name(midi);
    const tip = positionTip(clef, position);
    let choices = null;
    if (this.mode === 'name') {
      const pool = LETTERS.filter((L) => L !== letter);
      // 干扰项：随机取其他字母；若 useOctave，则映射成"该字母最近的八度名"较复杂，
      // 简化：useOctave 时也只在字母层面区分，选项展示带正确音的八度（教学足够）
      const picks = [];
      const tmp = pool.slice();
      while (picks.length < this.choiceCount - 1 && tmp.length) {
        const idx = Math.floor(this.rng() * tmp.length);
        picks.push(tmp.splice(idx, 1)[0]);
      }
      const oct = fullName(midi).replace(/^[A-G]/, '');
      const all = picks.concat([letter]).map((L) => (this.useOctave ? L + oct : L));
      for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
      }
      choices = all;
    }
    this.current = { midi, clef, position, name, letter, choices, tip };
    this.onNew(this.current);
    return this.current;
  }

  /** 目标 MIDI */
  target() { return this.current ? this.current.midi : null; }
  /** 当前谱号 */
  clef() { return this.current ? this.current.clef : null; }
  /** 谱位（0=底线…8=顶线） */
  position() { return this.current ? this.current.position : null; }
  /** 正确答案音名 */
  answerName() { return this.current ? this.current.name : null; }
  /** name 模式选项 */
  choices() { return this.current && this.current.choices ? this.current.choices.slice() : []; }
  /** 口诀教学提示 */
  tip() { return this.current ? this.current.tip : ''; }

  /**
   * 校验答案。
   *   name：answer 是选中的音名字符串。
   *   key：answer 是点下的键 MIDI（数字）；octaveAgnostic 时只比字母/音级。
   * @returns {boolean}
   */
  check(answer) {
    if (!this.current) return false;
    this.attempts++;
    let correct;
    if (this.mode === 'name') {
      correct = answer === this.current.name;
    } else if (typeof answer !== 'number') {
      correct = false;
    } else if (this.octaveAgnostic) {
      correct = letterOf(answer) === this.current.letter;
    } else {
      correct = answer === this.current.midi;
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
