/**
 * chord-detect.js — 和弦/音程识别（纯逻辑，可测试）
 *
 * 给定一组同时按下的 MIDI 音符号，识别出和弦名称（如 C、Am、G7、Dm7）。
 * 用于学琴练习游戏：实时显示"你正在弹的和弦"。
 *
 * 算法：把音符归一到 0-11 音级集合，对每个可能的根音尝试匹配已知和弦音程模板，
 * 选出能解释全部音级的最佳匹配。
 */

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** 和弦模板：根音=0，列出相对半音音程集合。顺序=优先级（先匹配更"基础"的）。 */
export const CHORD_TEMPLATES = [
  { suffix: '',     name: 'major',        intervals: [0, 4, 7] },
  { suffix: 'm',    name: 'minor',        intervals: [0, 3, 7] },
  { suffix: 'dim',  name: 'diminished',   intervals: [0, 3, 6] },
  { suffix: 'aug',  name: 'augmented',    intervals: [0, 4, 8] },
  { suffix: 'sus4', name: 'sus4',         intervals: [0, 5, 7] },
  { suffix: 'sus2', name: 'sus2',         intervals: [0, 2, 7] },
  { suffix: '7',    name: 'dominant 7th', intervals: [0, 4, 7, 10] },
  { suffix: 'maj7', name: 'major 7th',    intervals: [0, 4, 7, 11] },
  { suffix: 'm7',   name: 'minor 7th',    intervals: [0, 3, 7, 10] },
  { suffix: 'm7b5', name: 'half-dim 7th', intervals: [0, 3, 6, 10] },
  { suffix: 'dim7', name: 'diminished 7th', intervals: [0, 3, 6, 9] },
  { suffix: '6',    name: 'major 6th',    intervals: [0, 4, 7, 9] },
  { suffix: 'm6',   name: 'minor 6th',    intervals: [0, 3, 7, 9] },
  { suffix: '9',    name: 'dominant 9th', intervals: [0, 2, 4, 7, 10] },
  { suffix: 'add9', name: 'add9',         intervals: [0, 2, 4, 7] },
];

/** 音符号 -> 音级 0-11 */
export function pitchClass(note) { return ((note % 12) + 12) % 12; }

/** 音符号 -> 名称（含八度，C4=60） */
export function noteName(note) {
  return NOTE_NAMES[pitchClass(note)] + (Math.floor(note / 12) - 1);
}

/** 一组音符 -> 排序去重的音级集合 */
export function pitchClassSet(notes) {
  return [...new Set(notes.map(pitchClass))].sort((a, b) => a - b);
}

/** 两个音的音程名（半音差 0-12+） */
export function intervalName(a, b) {
  const names = ['同度', '小二度', '大二度', '小三度', '大三度', '纯四度',
    '三全音', '纯五度', '小六度', '大六度', '小七度', '大七度', '纯八度'];
  const semis = Math.abs(a - b);
  return semis <= 12 ? names[semis] : `${semis}半音`;
}

/**
 * 识别和弦。
 * @param {number[]} notes 同时按下的 MIDI 音符号
 * @returns {?{root:string, suffix:string, name:string, symbol:string, inversion:boolean, bass:string}}
 *   无法识别返回 null。
 */
export function detectChord(notes) {
  const pcs = pitchClassSet(notes);
  if (pcs.length < 3) return null; // 和弦至少 3 音
  const pcSet = new Set(pcs);
  const bassPc = pitchClass(Math.min(...notes));

  const tryMatch = (rootOnlyBass) => {
    for (const tpl of CHORD_TEMPLATES) {
      if (tpl.intervals.length !== pcs.length) continue;
      for (const root of pcs) {
        // 第一遍只接受根位（根音=低音），第二遍接受任意转位
        if (rootOnlyBass && root !== bassPc) continue;
        const expected = new Set(tpl.intervals.map(iv => (root + iv) % 12));
        if (expected.size !== pcSet.size) continue;
        let match = true;
        for (const pc of pcSet) if (!expected.has(pc)) { match = false; break; }
        if (match) {
          const rootName = NOTE_NAMES[root];
          const symbol = rootName + tpl.suffix;
          const inversion = bassPc !== root;
          return {
            root: rootName,
            suffix: tpl.suffix,
            name: tpl.name,
            symbol: inversion ? `${symbol}/${NOTE_NAMES[bassPc]}` : symbol,
            inversion,
            bass: NOTE_NAMES[bassPc],
          };
        }
      }
    }
    return null;
  };

  // 优先根位解释（消除 sus2/sus4、C6/Am7 等转位二义性），再退而求其次接受转位
  return tryMatch(true) || tryMatch(false);
}

/**
 * 描述当前按下的音：和弦优先；2 音给音程名；1 音给音名。
 * @param {number[]} notes
 * @returns {string}
 */
export function describeNotes(notes) {
  if (!notes.length) return '';
  if (notes.length === 1) return noteName(notes[0]);
  if (notes.length === 2) {
    const sorted = [...notes].sort((a, b) => a - b);
    return `${noteName(sorted[0])} + ${noteName(sorted[1])}（${intervalName(sorted[0], sorted[1])}）`;
  }
  const chord = detectChord(notes);
  if (chord) return chord.symbol + (chord.inversion ? '（转位）' : '');
  // 无法识别和弦时列出音名
  return [...notes].sort((a, b) => a - b).map(noteName).join(' ');
}
