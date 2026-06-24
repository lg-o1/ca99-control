// 五度圈（模块49）——交互式乐理工具
// 纯逻辑，无 DOM 依赖，可在 Node 下单元测试
// 顺时针每格升五度：C G D A E B F#/Gb Db Ab Eb Bb F，共 12 格

// 字母自然半音值
const LETTER_SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

// 大调音阶半音步进 / 自然小调步进
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_STEPS = [0, 2, 3, 5, 7, 8, 10];

// 顺时针 12 格：每格 = {major, minor, sharps, flats}
// sharps/flats 互斥（除 6 点钟可双拼），用于显示调号
const WHEEL = [
  { major: 'C', minor: 'Am', sharps: 0, flats: 0 },
  { major: 'G', minor: 'Em', sharps: 1, flats: 0 },
  { major: 'D', minor: 'Bm', sharps: 2, flats: 0 },
  { major: 'A', minor: 'F#m', sharps: 3, flats: 0 },
  { major: 'E', minor: 'C#m', sharps: 4, flats: 0 },
  { major: 'B', minor: 'G#m', sharps: 5, flats: 0 },
  { major: 'F#', minor: 'D#m', sharps: 6, flats: 6, enharmonic: 'Gb' },
  { major: 'Db', minor: 'Bbm', sharps: 0, flats: 5 },
  { major: 'Ab', minor: 'Fm', sharps: 0, flats: 4 },
  { major: 'Eb', minor: 'Cm', sharps: 0, flats: 3 },
  { major: 'Bb', minor: 'Gm', sharps: 0, flats: 2 },
  { major: 'F', minor: 'Dm', sharps: 0, flats: 1 },
];

// 取调名主音字母与升降记号 -> 半音值（0..11）
function tonicSemitone(key) {
  const m = key.match(/^([A-G])([#b]?)/);
  if (!m) return null;
  let s = LETTER_SEMI[m[1]];
  if (m[2] === '#') s += 1;
  else if (m[2] === 'b') s -= 1;
  return ((s % 12) + 12) % 12;
}

// 把半音差规整到 -3..3，返回升降记号字符串（##/#/''/b/bb）
function accidentalStr(diff) {
  let d = ((diff + 6) % 12) - 6; // -6..5
  if (d > 6) d -= 12;
  if (d === 0) return '';
  if (d === 1) return '#';
  if (d === 2) return '##';
  if (d === -1) return 'b';
  if (d === -2) return 'bb';
  return d > 0 ? '#'.repeat(d) : 'b'.repeat(-d);
}

// 给定大调名，返回 7 个正确拼写的音阶音名
function majorScaleSpelling(majorKey) {
  const m = majorKey.match(/^([A-G])([#b]?)/);
  const startLetterIdx = LETTERS.indexOf(m[1]);
  const tonic = tonicSemitone(majorKey);
  return MAJOR_STEPS.map((step, i) => {
    const letter = LETTERS[(startLetterIdx + i) % 7];
    const target = (tonic + step) % 12;
    const natural = LETTER_SEMI[letter];
    return letter + accidentalStr(target - natural);
  });
}

// 大调七级和弦质量
const MAJOR_QUALITIES = ['', 'm', 'm', '', '', 'm', 'dim'];
const ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const TRIAD = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6] };

// 给定大调名，返回 7 个顺阶三和弦
function diatonicChords(majorKey) {
  const names = majorScaleSpelling(majorKey);
  const tonic = tonicSemitone(majorKey);
  return MAJOR_STEPS.map((step, i) => {
    const q = MAJOR_QUALITIES[i];
    const rootSemi = (tonic + step) % 12;
    return {
      roman: ROMAN[i],
      degree: i + 1,
      quality: q,
      root: names[i],
      name: names[i] + q,
      rootSemitone: rootSemi,
      intervals: TRIAD[q],
    };
  });
}

// 给定大调名 + 基准 C（默认 C4=60），返回某级三和弦的 MIDI 音
function chordMidi(majorKey, degree, baseC = 60) {
  const chords = diatonicChords(majorKey);
  const c = chords[degree - 1];
  const root = baseC + c.rootSemitone;
  return c.intervals.map((iv) => root + iv);
}

// 给定调名（大或小），返回一个八度音阶的 MIDI 序列（含高八度主音）
function scaleMidi(key, baseC = 60) {
  const isMin = /m$/.test(key);
  const tonic = tonicSemitone(key);
  const steps = isMin ? MINOR_STEPS : MAJOR_STEPS;
  const root = baseC + tonic;
  return [...steps, 12].map((s) => root + s);
}

// 取某大调在圈上的位置（0=12点钟，顺时针）
function wheelIndex(majorKey) {
  return WHEEL.findIndex((w) => w.major === majorKey || w.enharmonic === majorKey);
}

// 取圈上相邻的调（左 = 下四度/逆时针，右 = 上五度/顺时针）
function neighbors(majorKey) {
  const i = wheelIndex(majorKey);
  if (i < 0) return null;
  return {
    cw: WHEEL[(i + 1) % 12].major, // 属方向（顺时针，+1 升号）
    ccw: WHEEL[(i + 11) % 12].major, // 下属方向（逆时针）
    relativeMinor: WHEEL[i].minor,
  };
}

// 调号描述文字
function signatureLabel(w) {
  if (w.sharps === 0 && w.flats === 0) return '无升降号';
  if (w.sharps && w.flats) return `${w.sharps}♯ / ${w.flats}♭`;
  if (w.sharps) return `${w.sharps} 个升号 ♯`;
  return `${w.flats} 个降号 ♭`;
}

const exported = {
  WHEEL, LETTERS, LETTER_SEMI, MAJOR_STEPS, MINOR_STEPS, ROMAN, MAJOR_QUALITIES,
  tonicSemitone, accidentalStr, majorScaleSpelling, diatonicChords,
  chordMidi, scaleMidi, wheelIndex, neighbors, signatureLabel,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.CircleOfFifths = exported;
}
export {
  WHEEL, LETTERS, LETTER_SEMI, MAJOR_STEPS, MINOR_STEPS, ROMAN, MAJOR_QUALITIES,
  tonicSemitone, accidentalStr, majorScaleSpelling, diatonicChords,
  chordMidi, scaleMidi, wheelIndex, neighbors, signatureLabel,
};
