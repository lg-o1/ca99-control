// 音阶指法提示（模块43）——显示标准钢琴音阶指法，跟弹时高亮当前手指 + 穿指/跨指点
// 纯逻辑，无 DOM 依赖，可在 Node 下单元测试
// 一个八度上行（8 个音：do re mi fa sol la ti do），指法长度 8

// 半音偏移（相对主音）一个八度上行
const MAJOR_OFFSETS = [0, 2, 4, 5, 7, 9, 11, 12];
const NAT_MINOR_OFFSETS = [0, 2, 3, 5, 7, 8, 10, 12];

// 标准指法库（一个八度上行）
// rh = 右手 1=拇指…5=小指；lh = 左手 5=小指…1=拇指
// 这组都用最经典、各权威教材一致的指法
const FINGERINGS = {
  // ---- 大调 ----
  C:  { name: 'C 大调',  mode: 'major', root: 'C',  offsets: MAJOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  G:  { name: 'G 大调',  mode: 'major', root: 'G',  offsets: MAJOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  D:  { name: 'D 大调',  mode: 'major', root: 'D',  offsets: MAJOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  A:  { name: 'A 大调',  mode: 'major', root: 'A',  offsets: MAJOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  E:  { name: 'E 大调',  mode: 'major', root: 'E',  offsets: MAJOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  // F 大调是经典"例外"：右手 1 2 3 4 1 2 3 4（小指不参与上行）
  F:  { name: 'F 大调',  mode: 'major', root: 'F',  offsets: MAJOR_OFFSETS, rh: [1, 2, 3, 4, 1, 2, 3, 4], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  // ---- 自然小调 ----
  Am: { name: 'A 小调',  mode: 'minor', root: 'A',  offsets: NAT_MINOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  Em: { name: 'E 小调',  mode: 'minor', root: 'E',  offsets: NAT_MINOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
  Dm: { name: 'D 小调',  mode: 'minor', root: 'D',  offsets: NAT_MINOR_OFFSETS, rh: [1, 2, 3, 1, 2, 3, 4, 5], lh: [5, 4, 3, 2, 1, 3, 2, 1] },
};

// 主音字母 -> 半音值
const ROOT_SEMITONE = {
  C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11,
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function noteName(midi) {
  return NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}

function listScales() {
  return Object.keys(FINGERINGS);
}

function getFingering(id) {
  return FINGERINGS[id] || null;
}

// 给定调 id 与基准八度的主音 MIDI，返回一个八度上行的 MIDI 序列
function scaleNotes(id, rootMidi) {
  const f = FINGERINGS[id];
  if (!f) return [];
  if (rootMidi == null) rootMidi = 60 + ROOT_SEMITONE[f.root]; // 默认 C4 区间
  return f.offsets.map((o) => rootMidi + o);
}

// 默认主音 MIDI（让音阶落在中央 C 附近，C4=60）
function defaultRootMidi(id) {
  const f = FINGERINGS[id];
  if (!f) return 60;
  return 60 + ROOT_SEMITONE[f.root];
}

// 取某手的指法数组
function fingers(id, hand) {
  const f = FINGERINGS[id];
  if (!f) return [];
  return hand === 'lh' ? f.lh.slice() : f.rh.slice();
}

// 穿指/跨指点：返回索引数组
// 右手上行：拇指穿过（thumb-under）= 当前手指为 1 且不是第一个音
// 左手上行：手指跨过拇指（finger-over）= 前一个手指为 1 而当前不为 1
function crossingPoints(fingerArr, hand) {
  const pts = [];
  for (let i = 1; i < fingerArr.length; i++) {
    if (hand === 'lh') {
      if (fingerArr[i - 1] === 1 && fingerArr[i] !== 1) pts.push(i);
    } else {
      if (fingerArr[i] === 1) pts.push(i);
    }
  }
  return pts;
}

// 跟弹会话：依次弹出音阶音，记录正确/错误，给出当前应弹手指
class ScaleFingeringSession {
  constructor(id, opts = {}) {
    const f = FINGERINGS[id];
    if (!f) throw new Error('unknown scale: ' + id);
    this.id = id;
    this.hand = opts.hand === 'lh' ? 'lh' : 'rh';
    this.rootMidi = opts.rootMidi != null ? opts.rootMidi : defaultRootMidi(id);
    // 是否上行后再下行
    this.bidirectional = !!opts.bidirectional;
    this.tolerateOctave = opts.tolerateOctave !== false; // 默认允许八度等价
    this.build();
    this.reset();
    this.onAdvance = null;   // (index, correct) => {}
    this.onComplete = null;  // (summary) => {}
  }

  build() {
    const up = scaleNotes(this.id, this.rootMidi);
    const upFingers = fingers(this.id, this.hand);
    if (this.bidirectional) {
      // 下行：去掉顶音重复，反向
      const downNotes = up.slice(0, -1).reverse();
      const downFingers = upFingers.slice(0, -1).reverse();
      this.notes = up.concat(downNotes);
      this.fingerSeq = upFingers.concat(downFingers);
    } else {
      this.notes = up;
      this.fingerSeq = upFingers;
    }
  }

  reset() {
    this.pointer = 0;
    this.correct = 0;
    this.wrong = 0;
    this.done = false;
  }

  get total() { return this.notes.length; }

  // 当前应弹的音 / 手指
  currentNote() { return this.done ? null : this.notes[this.pointer]; }
  currentFinger() { return this.done ? null : this.fingerSeq[this.pointer]; }

  matches(note) {
    const expected = this.notes[this.pointer];
    if (note === expected) return true;
    if (this.tolerateOctave) return ((note - expected) % 12 + 12) % 12 === 0;
    return false;
  }

  // 喂入一个弹下的音；返回 {advanced, correct, index, finger, done, summary?}
  feed(note) {
    if (this.done) return { advanced: false, done: true };
    const expected = this.notes[this.pointer];
    const isMatch = this.matches(note);
    if (isMatch) {
      const idx = this.pointer;
      const finger = this.fingerSeq[idx];
      this.correct++;
      this.pointer++;
      if (this.onAdvance) this.onAdvance(idx, true);
      if (this.pointer >= this.notes.length) {
        this.done = true;
        const summary = this.summary();
        if (this.onComplete) this.onComplete(summary);
        return { advanced: true, correct: true, index: idx, finger, done: true, summary };
      }
      return { advanced: true, correct: true, index: idx, finger, expected, done: false };
    }
    // 弹错音：不前进，记一次错
    this.wrong++;
    if (this.onAdvance) this.onAdvance(this.pointer, false);
    return { advanced: false, correct: false, index: this.pointer, expected, done: false };
  }

  get accuracy() {
    const tot = this.correct + this.wrong;
    return tot ? Math.round((this.correct / tot) * 100) : 0;
  }

  summary() {
    return {
      id: this.id,
      hand: this.hand,
      total: this.total,
      correct: this.correct,
      wrong: this.wrong,
      accuracy: this.accuracy,
    };
  }
}

const exported = {
  MAJOR_OFFSETS, NAT_MINOR_OFFSETS, FINGERINGS, ROOT_SEMITONE, NOTE_NAMES,
  noteName, listScales, getFingering, scaleNotes, defaultRootMidi, fingers,
  crossingPoints, ScaleFingeringSession,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = exported;
}
if (typeof window !== 'undefined') {
  window.ScaleFingering = exported;
}
export {
  MAJOR_OFFSETS, NAT_MINOR_OFFSETS, FINGERINGS, ROOT_SEMITONE, NOTE_NAMES,
  noteName, listScales, getFingering, scaleNotes, defaultRootMidi, fingers,
  crossingPoints, ScaleFingeringSession,
};
