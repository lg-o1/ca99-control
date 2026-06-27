/**
 * timbre-guess.js — 🎨 音色猜猜乐（CA99 硬件独家，纯逻辑）
 *
 * 设计（346 音色是 CA99 的杀手锏，别的 app 物理上做不了）：
 *  - 每题随机切到一个乐器音色（真琴发声），孩子随便弹几下<b>听音色</b>；
 *  - 从 4 个乐器选项里<b>猜这是什么乐器</b>，猜对 +分 + 撒花，猜错只是"再听听"（不惩罚）；
 *  - 干扰项<b>优先同家族</b>（钢片琴 vs 八音盒 vs 钟琴 —— 越像越难），不够再跨家族补，
 *    既能做"同 category 干扰"（按用户要求），又能渐进加难度。
 *
 * 本模块纯逻辑、不依赖 SOUNDS：catalog 用乐器名占位，`resolveInstruments(sounds)`
 * 在运行时把 catalog 映射到真实音色 id（找不到的条目自动剔除），便于单元测试。
 */

/** 给孩子的乐器图鉴：name=中文名, emoji, family=家族(同家族互为干扰), sound=在 SOUNDS 里的精确名 */
export const INSTRUMENTS = [
  // 🎹 键盘家族
  { key: 'grand',     name: '三角钢琴',   emoji: '🎹', family: '键盘',   sound: 'Concert' },
  { key: 'epiano',    name: '电钢琴',     emoji: '🎛️', family: '键盘',   sound: 'Classic Electric Piano' },
  { key: 'harpsi',    name: '羽管键琴',   emoji: '🎼', family: '键盘',   sound: 'Harpsichord' },
  { key: 'clavi',     name: '击弦古钢琴', emoji: '🎚️', family: '键盘',   sound: 'Clavi' },
  // 🔔 敲击/钟铃家族（音色都"叮叮当当"，最容易混，做同家族干扰最棒）
  { key: 'vibe',      name: '颤音琴',     emoji: '🎶', family: '敲击',   sound: 'Vibraphone' },
  { key: 'marimba',   name: '马林巴',     emoji: '🪵', family: '敲击',   sound: 'Marimba' },
  { key: 'celesta',   name: '钢片琴',     emoji: '✨', family: '敲击',   sound: 'Celesta' },
  { key: 'glock',     name: '钟琴',       emoji: '🛎️', family: '敲击',   sound: 'Glockenspiel' },
  { key: 'musicbox',  name: '八音盒',     emoji: '🎁', family: '敲击',   sound: 'Music Box' },
  { key: 'xylo',      name: '木琴',       emoji: '🎵', family: '敲击',   sound: 'Xylophone' },
  { key: 'tubular',   name: '管钟',       emoji: '🔔', family: '敲击',   sound: 'Tubular Bells' },
  // ⛪ 管风琴/簧片家族
  { key: 'church',    name: '教堂管风琴', emoji: '⛪', family: '管风琴', sound: 'Church Organ' },
  { key: 'jazzorgan', name: '爵士管风琴', emoji: '🎙️', family: '管风琴', sound: 'Jazz Organ' },
  { key: 'accordion', name: '手风琴',     emoji: '🪗', family: '管风琴', sound: 'Accordion' },
  { key: 'harmonica', name: '口琴',       emoji: '😮', family: '管风琴', sound: 'Harmonica' },
  // 🎻 弦乐家族
  { key: 'strings',   name: '弦乐合奏',   emoji: '🎻', family: '弦乐',   sound: 'String Ensemble' },
  { key: 'harp',      name: '竖琴',       emoji: '🪕', family: '弦乐',   sound: 'Harp' },
  { key: 'pizz',      name: '拨弦弦乐',   emoji: '🎻', family: '弦乐',   sound: 'Pizzicato Strings' },
  // 🎸 吉他/贝斯家族
  { key: 'nylon',     name: '尼龙吉他',   emoji: '🎸', family: '吉他',   sound: 'Nylon Acoustic' },
  { key: 'steel',     name: '钢弦吉他',   emoji: '🎸', family: '吉他',   sound: 'Steel Guitar' },
  { key: 'ukulele',   name: '尤克里里',   emoji: '🌺', family: '吉他',   sound: 'Ukulele' },
  { key: 'ebass',     name: '电贝斯',     emoji: '🔊', family: '吉他',   sound: 'Electric Bass' },
  // 🎤 人声家族
  { key: 'choir',     name: '人声合唱',   emoji: '🎤', family: '人声',   sound: 'Choir' },
];

/** 不区分大小写/空格的名字归一，便于容错匹配 SOUNDS 名 */
function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

/**
 * 把 catalog 映射到真实音色：给每个乐器附 soundId（SOUNDS 里精确名首个匹配）。
 * 找不到音色的条目剔除，保证 UI 只列出真能发声的乐器。
 * @param {Array} sounds SOUNDS 数组（[{id,name,category,...}]）
 * @param {Array} [catalog] 默认 INSTRUMENTS
 * @returns {Array} [{...instrument, soundId, category}]
 */
export function resolveInstruments(sounds, catalog = INSTRUMENTS) {
  if (!Array.isArray(sounds)) return [];
  const byName = new Map();
  for (const s of sounds) {
    const k = norm(s.name);
    if (!byName.has(k)) byName.set(k, s); // 首个匹配优先
  }
  const out = [];
  for (const inst of catalog) {
    const s = byName.get(norm(inst.sound));
    if (s) out.push({ ...inst, soundId: s.id, category: s.category });
  }
  return out;
}

function shuffle(arr, rng) {
  const a = arr.slice();
  const rnd = rng || Math.random;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * 生成一题：目标 + 干扰项（优先同家族 → 再跨家族补满），打乱顺序。
 * @param {Array} pool 已 resolve 的乐器池
 * @param {Function} [rng]
 * @param {Object} [opts] { options=4, avoidKey } avoidKey=上题答案(尽量不连续重复)
 * @returns {{target, options}}
 */
export function makeRound(pool, rng = Math.random, opts = {}) {
  if (!pool || pool.length < 2) throw new Error('timbre-guess: 乐器池至少需要 2 个');
  const nOpt = Math.min(opts.options || 4, pool.length);
  let candidates = pool;
  if (opts.avoidKey && pool.length > 1) {
    const filtered = pool.filter((i) => i.key !== opts.avoidKey);
    if (filtered.length) candidates = filtered;
  }
  const target = candidates[Math.floor(rng() * candidates.length)];
  const sameFam = pool.filter((i) => i.family === target.family && i.key !== target.key);
  const otherFam = pool.filter((i) => i.family !== target.family);
  const distract = [...shuffle(sameFam, rng), ...shuffle(otherFam, rng)].slice(0, nOpt - 1);
  const options = shuffle([target, ...distract], rng);
  return { target, options };
}

/** 判定：选中 key 是否等于本题目标 */
export function checkAnswer(round, key) {
  return !!round && !!round.target && round.target.key === key;
}

/**
 * 一局会话：维护出题、计分、连对。
 *  - score：每答对 +1（连对有额外奖励：连对 N≥3 时多 +1）
 *  - streak/bestStreak：连对计数（答错清零，但不扣分——降挫败）
 *  - rounds：总出题数（用于正确率统计）
 */
export class TimbreGuess {
  constructor(pool, { rng = Math.random, options = 4 } = {}) {
    this.pool = pool || [];
    this.rng = rng;
    this.options = options;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.rounds = 0;
    this.correctCount = 0;
    this.round = null;
    this.answered = false;
  }

  /** 出新一题（清空作答态），返回 round */
  next() {
    const avoidKey = this.round && this.round.target ? this.round.target.key : null;
    this.round = makeRound(this.pool, this.rng, { options: this.options, avoidKey });
    this.answered = false;
    this.rounds += 1;
    return this.round;
  }

  /** 当前题目标乐器（含 soundId） */
  current() { return this.round ? this.round.target : null; }

  /**
   * 提交一个选项 key。
   * @returns {{correct, target, streak, score, bestStreak, alreadyAnswered}}
   */
  guess(key) {
    if (!this.round) return { correct: false, target: null, streak: this.streak, score: this.score, bestStreak: this.bestStreak };
    const correct = checkAnswer(this.round, key);
    if (correct && !this.answered) {
      this.answered = true;
      this.correctCount += 1;
      this.streak += 1;
      if (this.streak > this.bestStreak) this.bestStreak = this.streak;
      this.score += 1 + (this.streak >= 3 ? 1 : 0); // 连对≥3 加成
    } else if (!correct) {
      this.streak = 0; // 不扣分，只断连对
    }
    return {
      correct,
      alreadyAnswered: this.answered && !correct,
      target: this.round.target,
      streak: this.streak,
      score: this.score,
      bestStreak: this.bestStreak,
    };
  }

  /** 正确率 0..1（无出题返回 0） */
  accuracy() { return this.rounds ? this.correctCount / this.rounds : 0; }
}

const exported = { INSTRUMENTS, resolveInstruments, makeRound, checkAnswer, TimbreGuess };
export default exported;
