import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTRUMENTS, resolveInstruments, makeRound, checkAnswer, TimbreGuess,
} from './timbre-guess.js';

// 假 SOUNDS：覆盖 catalog 里部分乐器名 + 一个无关音色
const FAKE_SOUNDS = [
  { id: 1, name: 'Concert', category: 'Piano 1' },
  { id: 2, name: 'Classic Electric Piano', category: 'Electric Piano' },
  { id: 3, name: 'Harpsichord', category: 'Harpsi & Mallets' },
  { id: 4, name: 'Vibraphone', category: 'Harpsi & Mallets' },
  { id: 5, name: 'Marimba', category: 'Harpsi & Mallets' },
  { id: 6, name: 'Celesta', category: 'Harpsi & Mallets' },
  { id: 7, name: 'Church Organ', category: 'Organ' },
  { id: 8, name: 'Jazz Organ', category: 'Organ' },
  { id: 9, name: 'String Ensemble', category: 'Strings' },
  { id: 10, name: 'Harp', category: 'Strings' },
  { id: 11, name: 'Nylon Acoustic', category: 'MIDI (GM2 Tones)' },
  { id: 99, name: 'Totally Unknown Pad', category: 'Vocal & Pad' },
];

// 确定性 rng（线性同余）
function seededRng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

test('INSTRUMENTS catalog 字段完整且 key 唯一', () => {
  assert.ok(INSTRUMENTS.length >= 12);
  const keys = INSTRUMENTS.map((i) => i.key);
  assert.equal(new Set(keys).size, keys.length);
  for (const i of INSTRUMENTS) {
    assert.equal(typeof i.key, 'string');
    assert.equal(typeof i.name, 'string');
    assert.equal(typeof i.emoji, 'string');
    assert.equal(typeof i.family, 'string');
    assert.equal(typeof i.sound, 'string');
  }
});

test('resolveInstruments 只保留能匹配到音色的乐器并附 soundId', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  // FAKE_SOUNDS 覆盖了 grand/epiano/harpsi/vibe/marimba/celesta/church/jazzorgan/strings/harp/nylon = 11
  assert.equal(pool.length, 11);
  for (const i of pool) {
    assert.equal(typeof i.soundId, 'number');
    assert.equal(typeof i.category, 'string');
  }
  const grand = pool.find((i) => i.key === 'grand');
  assert.equal(grand.soundId, 1);
  assert.equal(grand.category, 'Piano 1');
});

test('resolveInstruments 大小写/空格容错', () => {
  const pool = resolveInstruments([{ id: 50, name: '  cOnCeRt  ', category: 'Piano 1' }]);
  assert.equal(pool.length, 1);
  assert.equal(pool[0].key, 'grand');
  assert.equal(pool[0].soundId, 50);
});

test('resolveInstruments 非数组返回空', () => {
  assert.deepEqual(resolveInstruments(null), []);
  assert.deepEqual(resolveInstruments(undefined), []);
});

test('makeRound 生成 4 选项含目标且 key 不重复', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const rng = seededRng(42);
  for (let n = 0; n < 50; n++) {
    const r = makeRound(pool, rng);
    assert.equal(r.options.length, 4);
    const keys = r.options.map((o) => o.key);
    assert.equal(new Set(keys).size, 4, '选项 key 不应重复');
    assert.ok(keys.includes(r.target.key), '选项必须含目标');
  }
});

test('makeRound 优先放同家族干扰项', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const rng = seededRng(7);
  // 多次取以 vibe(敲击家族, 同族有 marimba/celesta) 为目标的题，验证至少含一个同族干扰
  let sawSameFamDistractor = false;
  for (let n = 0; n < 200; n++) {
    const r = makeRound(pool, rng);
    if (r.target.key === 'vibe') {
      const fam = r.options.filter((o) => o.family === '敲击' && o.key !== 'vibe');
      if (fam.length >= 1) sawSameFamDistractor = true;
    }
  }
  assert.ok(sawSameFamDistractor, '敲击家族目标应至少有一次带同族干扰');
});

test('makeRound avoidKey 不作为目标', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const rng = seededRng(3);
  for (let n = 0; n < 100; n++) {
    const r = makeRound(pool, rng, { avoidKey: 'grand' });
    assert.notEqual(r.target.key, 'grand');
  }
});

test('makeRound 池太小抛错', () => {
  assert.throws(() => makeRound([{ key: 'a', family: 'x' }]), /至少/);
  assert.throws(() => makeRound([]), /至少/);
});

test('makeRound options 不超过池大小', () => {
  const pool = resolveInstruments(FAKE_SOUNDS).slice(0, 3);
  const r = makeRound(pool, seededRng(1), { options: 4 });
  assert.equal(r.options.length, 3);
});

test('checkAnswer', () => {
  const round = { target: { key: 'vibe' } };
  assert.equal(checkAnswer(round, 'vibe'), true);
  assert.equal(checkAnswer(round, 'marimba'), false);
  assert.equal(checkAnswer(null, 'vibe'), false);
});

test('TimbreGuess 答对加分加连对', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const g = new TimbreGuess(pool, { rng: seededRng(11) });
  const r = g.next();
  const res = g.guess(r.target.key);
  assert.equal(res.correct, true);
  assert.equal(res.score, 1);
  assert.equal(res.streak, 1);
  assert.equal(g.correctCount, 1);
});

test('TimbreGuess 连对≥3 有加成', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const g = new TimbreGuess(pool, { rng: seededRng(5) });
  let score = 0;
  for (let i = 0; i < 5; i++) {
    const r = g.next();
    g.guess(r.target.key);
  }
  // 5 连对：前2题各+1，第3/4/5题各 +2 → 2 + 6 = 8
  assert.equal(g.score, 8);
  assert.equal(g.streak, 5);
  assert.equal(g.bestStreak, 5);
});

test('TimbreGuess 答错断连对但不扣分', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const g = new TimbreGuess(pool, { rng: seededRng(9) });
  let r = g.next(); g.guess(r.target.key); // +1, streak1
  r = g.next();
  const wrong = g.options ? null : null;
  // 找一个非目标 key
  const notTarget = r.options.find((o) => o.key !== r.target.key).key;
  const before = g.score;
  const res = g.guess(notTarget);
  assert.equal(res.correct, false);
  assert.equal(g.score, before, '答错不扣分');
  assert.equal(g.streak, 0, '答错断连对');
});

test('TimbreGuess 重复答对同题不重复加分', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const g = new TimbreGuess(pool, { rng: seededRng(2) });
  const r = g.next();
  g.guess(r.target.key);
  const s1 = g.score;
  const res2 = g.guess(r.target.key); // 再点一次正确答案
  assert.equal(g.score, s1, '同题不应二次加分');
  assert.equal(res2.correct, true);
});

test('TimbreGuess accuracy', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const g = new TimbreGuess(pool, { rng: seededRng(13) });
  assert.equal(g.accuracy(), 0);
  let r = g.next(); g.guess(r.target.key);           // 对
  r = g.next();
  const wrong = r.options.find((o) => o.key !== r.target.key).key;
  g.guess(wrong);                                     // 错
  assert.equal(g.rounds, 2);
  assert.equal(g.correctCount, 1);
  assert.equal(g.accuracy(), 0.5);
});

test('TimbreGuess next 尽量不连续重复同一目标', () => {
  const pool = resolveInstruments(FAKE_SOUNDS);
  const g = new TimbreGuess(pool, { rng: seededRng(17) });
  let prev = null, repeats = 0;
  for (let i = 0; i < 100; i++) {
    const r = g.next();
    if (prev && r.target.key === prev) repeats++;
    prev = r.target.key;
  }
  assert.equal(repeats, 0, '相邻两题目标不应相同');
});
