// 调号识别（模块42）——看一个调号（几个升/降号），判断它是哪个大调/小调
// 纯逻辑，无 DOM 依赖，可在 Node 下单元测试
// 基于五度圈：升号顺序 F C G D A E B，降号顺序 B E A D G C F

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

// 升号数 -> 大调名（0~7）
const MAJOR_SHARP = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#'];
// 降号数 -> 大调名（0~7）
const MAJOR_FLAT = ['C', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb'];
// 升号数 -> 小调名（0~7）
const MINOR_SHARP = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'A#m'];
// 降号数 -> 小调名（0~7）
const MINOR_FLAT = ['Am', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm'];

// 调名 -> 主音半音值（用于播放音阶/主音）。小调用其主音字母。
const TONIC_SEMITONE = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5,
  'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11, 'Cb': 11,
};

// 大调音阶半音步进、和声小调用自然小调
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11, 12];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10, 12];

function isMinor(key) {
  return /m$/.test(key);
}

// 取调名的主音字母部分（去掉 m）
function tonicLetter(key) {
  return key.replace(/m$/, '');
}

// 给定升/降号数量与类型，返回带升降记号的音名列表（按书写顺序）
function accidentalList(count, type) {
  if (count <= 0) return [];
  const order = type === 'sharp' ? SHARP_ORDER : FLAT_ORDER;
  const sym = type === 'sharp' ? '#' : 'b';
  return order.slice(0, count).map((n) => n + sym);
}

// 给定升/降号数量、类型、调式，返回调名
function keyForSignature(count, type, mode) {
  if (count === 0) return mode === 'minor' ? 'Am' : 'C';
  if (type === 'sharp') {
    return mode === 'minor' ? MINOR_SHARP[count] : MAJOR_SHARP[count];
  }
  return mode === 'minor' ? MINOR_FLAT[count] : MAJOR_FLAT[count];
}

// 给定调名 + 调式，返回该调的调号 {count, type, accidentals}
function signatureFor(key, mode) {
  const table = mode === 'minor'
    ? { sharp: MINOR_SHARP, flat: MINOR_FLAT }
    : { sharp: MAJOR_SHARP, flat: MAJOR_FLAT };
  let i = table.sharp.indexOf(key);
  if (i >= 0) {
    const type = i === 0 ? 'none' : 'sharp';
    return { count: i, type, accidentals: accidentalList(i, 'sharp') };
  }
  i = table.flat.indexOf(key);
  if (i >= 0) {
    const type = i === 0 ? 'none' : 'flat';
    return { count: i, type, accidentals: accidentalList(i, 'flat') };
  }
  return null;
}

// 识别"窍门"提示文字
function hintFor(count, type, mode) {
  if (count === 0) return mode === 'minor' ? 'A 小调（无升降号）' : 'C 大调（无升降号）';
  if (type === 'sharp') {
    const last = SHARP_ORDER[count - 1] + '#';
    if (mode === 'major') return `最后一个升号是 ${last}，大调主音在它上方半音`;
    return `先找大调（最后升号 ${last} 上方半音），再下小三度得关系小调`;
  }
  const list = accidentalList(count, 'flat');
  if (mode === 'major') {
    if (count === 1) return '只有一个降号 Bb 时固定是 F 大调';
    return `倒数第二个降号 ${list[count - 2]} 就是大调主音`;
  }
  return '先找大调（倒数第二个降号），再下小三度得关系小调';
}

// 返回该调主音的 MIDI 音高（给定基准八度的 C，默认 C4=60 区间）
function tonicMidi(key, baseC = 60) {
  const semi = TONIC_SEMITONE[tonicLetter(key)];
  return baseC + semi;
}

// 返回该调一个八度音阶的 MIDI 序列
function scaleMidi(key, baseC = 60) {
  const root = tonicMidi(key, baseC);
  const steps = isMinor(key) ? MINOR_STEPS : MAJOR_STEPS;
  return steps.map((s) => root + s);
}

// 简单可种子化 RNG
function makeRng(seed) {
  if (typeof seed !== 'number') return Math.random;
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 生成一道题的可选答案（正确 + 干扰项），干扰项取五度圈相邻调
function buildChoices(rng, count, type, mode, n = 4) {
  const correct = keyForSignature(count, type, mode);
  const all = [];
  // 收集同调式的所有调名（去重）
  const sharps = mode === 'minor' ? MINOR_SHARP : MAJOR_SHARP;
  const flats = mode === 'minor' ? MINOR_FLAT : MAJOR_FLAT;
  for (let i = 0; i <= 7; i++) {
    all.push(sharps[i]);
    if (i > 0) all.push(flats[i]); // i=0 与 sharps[0] 相同(C/Am)
  }
  const uniq = [...new Set(all)].filter((k) => k !== correct);
  const distractors = shuffle(rng, uniq).slice(0, n - 1);
  return shuffle(rng, [correct, ...distractors]);
}

class KeySignatureGame {
  constructor(opts = {}) {
    this.rng = opts.rng || makeRng(opts.seed);
    // modes: 数组，可含 'major' / 'minor'
    this.modes = opts.modes && opts.modes.length ? opts.modes : ['major'];
    // 最大升/降号数（1~7）
    this.maxAccidentals = opts.maxAccidentals != null ? opts.maxAccidentals : 7;
    // 是否包含 C/Am（0 号）
    this.includeNatural = opts.includeNatural !== false;
    this.choiceCount = opts.choiceCount || 4;
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null;
    this.onNew = null;
    this.onResult = null;
  }

  get accuracy() {
    return this.attempts ? Math.round((this.score / this.attempts) * 100) : 0;
  }

  next() {
    const mode = pick(this.rng, this.modes);
    const min = this.includeNatural ? 0 : 1;
    const max = Math.max(min, Math.min(7, this.maxAccidentals));
    const count = min + Math.floor(this.rng() * (max - min + 1));
    let type;
    if (count === 0) type = 'none';
    else type = this.rng() < 0.5 ? 'sharp' : 'flat';
    const answer = keyForSignature(count, type, mode);
    const accidentals = accidentalList(count, type);
    const choices = buildChoices(this.rng, count, type, mode, this.choiceCount);
    this.current = {
      mode, count, type, accidentals, answer, choices,
      hint: hintFor(count, type, mode),
    };
    if (this.onNew) this.onNew(this.current);
    return this.current;
  }

  check(answerKey) {
    if (!this.current) return null;
    this.attempts++;
    const correct = answerKey === this.current.answer;
    if (correct) {
      this.score++;
      this.streak++;
      if (this.streak > this.best) this.best = this.streak;
    } else {
      this.streak = 0;
    }
    const result = {
      correct,
      answer: this.current.answer,
      picked: answerKey,
      scale: scaleMidi(this.current.answer),
    };
    if (this.onResult) this.onResult(result);
    return result;
  }

  reset() {
    this.score = 0;
    this.streak = 0;
    this.best = 0;
    this.attempts = 0;
    this.current = null;
  }
}

const exported = {
  SHARP_ORDER, FLAT_ORDER, MAJOR_SHARP, MAJOR_FLAT, MINOR_SHARP, MINOR_FLAT,
  TONIC_SEMITONE, MAJOR_STEPS, MINOR_STEPS,
  isMinor, tonicLetter, accidentalList, keyForSignature, signatureFor,
  hintFor, tonicMidi, scaleMidi, makeRng, buildChoices, KeySignatureGame,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.KeySignature = exported;
}
export {
  SHARP_ORDER, FLAT_ORDER, MAJOR_SHARP, MAJOR_FLAT, MINOR_SHARP, MINOR_FLAT,
  TONIC_SEMITONE, MAJOR_STEPS, MINOR_STEPS,
  isMinor, tonicLetter, accidentalList, keyForSignature, signatureFor,
  hintFor, tonicMidi, scaleMidi, makeRng, buildChoices, KeySignatureGame,
};
