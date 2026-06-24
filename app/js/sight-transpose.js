/**
 * sight-transpose.js — 移调视奏（sight transposition）纯逻辑引擎
 *
 * 屏幕给出一段短旋律（用唱名/音级显示在【原调】里）+ 一个【目标调】，
 * 你要把同一段旋律【移到目标调】弹出来：第一个音落在目标主音上，
 * 其余音保持和原曲一样的音程关系。这是"看谱移调"这项真实技能
 * （移调乐器、合唱伴奏常用），和"移调器"（整体升降键盘）、"视奏闪卡"
 * （照谱原样弹）、"旋律听写"（凭听复奏原音高）都不同。
 *
 * 旋律用相对主音的半音偏移表示（如大调 do-mi-sol = [0,4,7]），
 * 与调无关；移到某主音 = 偏移逐个加上主音 MIDI。
 *
 * 纯逻辑：不碰 MIDI / DOM，方便确定性单元测试（注入 rng）。
 */

/** 预置旋律：offsets 为相对主音的半音偏移（大调音阶内），name 用唱名描述 */
export const MELODIES = [
  { id: 'updown5', name: '上下行五音', solfa: 'do re mi fa sol fa mi re do', offsets: [0, 2, 4, 5, 7, 5, 4, 2, 0] },
  { id: 'arp', name: '主和弦琶音', solfa: 'do mi sol mi do', offsets: [0, 4, 7, 4, 0] },
  { id: 'twinkle', name: '小星星开头', solfa: 'do do sol sol la la sol', offsets: [0, 0, 7, 7, 9, 9, 7] },
  { id: 'ode', name: '欢乐颂开头', solfa: 'mi mi fa sol sol fa mi re', offsets: [4, 4, 5, 7, 7, 5, 4, 2] },
  { id: 'mary', name: '玛丽有只小羊', solfa: 'mi re do re mi mi mi', offsets: [4, 2, 0, 2, 4, 4, 4] },
  { id: 'desc', name: '下行四音', solfa: 'sol fa mi re', offsets: [7, 5, 4, 2] },
];

/** 目标调（主音）候选：名称 + 主音 MIDI（取靠近中央 C 的一组） */
export const TARGET_KEYS = [
  { id: 'C', name: 'C 大调', root: 60 },
  { id: 'D', name: 'D 大调', root: 62 },
  { id: 'E', name: 'E 大调', root: 64 },
  { id: 'F', name: 'F 大调', root: 65 },
  { id: 'G', name: 'G 大调', root: 67 },
  { id: 'A', name: 'A 大调', root: 57 },
  { id: 'Bb', name: '♭B 大调', root: 58 },
];

/** 原调（题面展示用主音），默认 C */
export const SOURCE_ROOT = 60;

/** 把偏移序列移到某主音 → MIDI 序列 */
export function transpose(offsets, rootMidi) {
  return offsets.map((o) => rootMidi + o);
}

/** 相邻音程（半音，带符号） */
export function intervals(seq) {
  const out = [];
  for (let i = 1; i < seq.length; i++) out.push(seq[i] - seq[i - 1]);
  return out;
}

/** 同一音级（pitch class）判断：忽略八度 */
function samePc(a, b) { return (((a - b) % 12) + 12) % 12 === 0; }

/**
 * 评分。把用户弹的音和"移到目标调后的期望序列"逐音比较。
 *   - 音级正确率（忽略八度）：弹对的音 / 期望音数
 *   - 音程形状正确率：相邻音程与期望一致的比例（抓"调对没对上但旋律对"）
 *   - 起音是否落在目标主音上
 * 综合分 = 音级正确率 × 100（个数不足按期望数摊薄；多弹计入 extra）。
 *
 * @param {number[]} played    用户弹的 MIDI 序列
 * @param {number[]} expected  目标调里的期望 MIDI 序列
 * @param {object} opts        { octaveFlexible=true }
 */
export function evaluateTranspose(played, expected, opts = {}) {
  const octaveFlexible = opts.octaveFlexible !== false;
  const n = expected.length;
  const m = played.length;
  if (n === 0) {
    return { score: 0, noteAccuracy: 0, shapeAccuracy: 0, rootOk: false, correct: 0, total: 0, extra: m, perNote: [], wrongKey: false };
  }
  const k = Math.min(n, m);
  let correct = 0;
  const perNote = [];
  for (let i = 0; i < k; i++) {
    const exact = played[i] === expected[i];
    const pc = samePc(played[i], expected[i]);
    const okNote = octaveFlexible ? pc : exact;
    if (okNote) correct++;
    perNote.push({ played: played[i], expected: expected[i], exact, pc, ok: okNote });
  }
  const noteAccuracy = correct / n;

  // 形状（音程）正确率
  const eInt = intervals(expected);
  const pInt = intervals(played.slice(0, k));
  let shapeCorrect = 0;
  const sN = eInt.length;
  for (let i = 0; i < Math.min(eInt.length, pInt.length); i++) {
    if (eInt[i] === pInt[i]) shapeCorrect++;
  }
  const shapeAccuracy = sN ? shapeCorrect / sN : 1;

  const rootOk = m > 0 && samePc(played[0], expected[0]);
  const extra = m - n;
  // 多弹的音轻度扣分
  const extraPenalty = extra > 0 ? Math.min(0.3, extra * 0.1) : 0;
  const score = Math.round(100 * noteAccuracy * (1 - extraPenalty));
  // 旋律对但调没移对：形状准但音级不准且起音不在主音
  const wrongKey = shapeAccuracy >= 0.8 && noteAccuracy < 0.6 && !rootOk;

  return { score, noteAccuracy, shapeAccuracy, rootOk, correct, total: n, extra, perNote, wrongKey };
}

/** 一轮移调视奏训练；UI 出题后采集用户弹的音喂进来。 */
export class SightTransposeTrainer {
  /**
   * @param {object} opts { rng, melody, targetKey, octaveFlexible }
   *   melody    MELODIES 之一（默认随机）
   *   targetKey TARGET_KEYS 之一（默认随机，且不等于原调时更有意义）
   */
  constructor(opts = {}) {
    this.rng = opts.rng || Math.random;
    this.octaveFlexible = opts.octaveFlexible !== false;
    this.best = 0;
    this.rounds = 0;
    this.newRound(opts);
  }

  /** 出新题：随机（或指定）旋律 + 目标调 */
  newRound(opts = {}) {
    const pick = (arr) => arr[Math.floor(this.rng() * arr.length)];
    this.melody = opts.melody || pick(MELODIES);
    this.targetKey = opts.targetKey || pick(TARGET_KEYS);
    this.expected = transpose(this.melody.offsets, this.targetKey.root);
    this.sourceSeq = transpose(this.melody.offsets, SOURCE_ROOT);
    this.played = [];
    this.finished = false;
    this.lastResult = null;
    return { melody: this.melody, targetKey: this.targetKey, expected: this.expected };
  }

  /** 期望音符个数 = 需要弹的次数 */
  get total() { return this.expected.length; }

  /**
   * 弹一个音。采满 total 个音后自动结算返回 summary（done:true）；
   * 否则返回 { done:false, played }。
   */
  feed(note) {
    if (this.finished) return this.lastResult;
    this.played.push(note);
    if (this.played.length >= this.total) return this.finish();
    return { done: false, played: this.played.length, total: this.total };
  }

  /** 结束并评分当前已弹的音（可少弹后手动结束） */
  finish() {
    if (this.finished && this.lastResult) return this.lastResult;
    const ev = evaluateTranspose(this.played, this.expected, { octaveFlexible: this.octaveFlexible });
    this.finished = true;
    this.rounds++;
    if (ev.score > this.best) this.best = ev.score;
    this.lastResult = { done: true, ...ev, playedCount: this.played.length, best: this.best, rounds: this.rounds };
    return this.lastResult;
  }
}
