/**
 * chord-progression.test.mjs — 和弦进行练习单元测试
 * 运行：node js/chord-progression.test.mjs
 */
import {
  MAJOR_SCALE, MINOR_SCALE, MAJOR_QUALITIES, MINOR_QUALITIES,
  PROG_KEYS, PROGRESSIONS, scaleOf, qualitiesOf, romanOf,
  chordForDegree, expandProgression, ChordProgression,
} from './chord-progression.js';
import { NOTE_NAMES } from './chord-detect.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('  ✗', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (期望 ${b}，实际 ${a})`); }

// 把和弦 symbol（root+suffix）生成一组 MIDI 三/四和弦音（根位，C4 区域）
const SUFFIX_INTERVALS = {
  '': [0, 4, 7], 'm': [0, 3, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8],
  '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10],
};
function midiFor(root, suffix) {
  const rootPc = NOTE_NAMES.indexOf(root);
  const base = 60 + rootPc; // C4 起
  return SUFFIX_INTERVALS[suffix].map((iv) => base + iv);
}

// ---- 常量表 ----
eq(MAJOR_SCALE.length, 7, '大调音阶 7 音');
eq(MINOR_SCALE.length, 7, '小调音阶 7 音');
eq(MAJOR_QUALITIES.length, 7, '大调品质 7 个');
eq(MINOR_QUALITIES.length, 7, '小调品质 7 个');
eq(scaleOf('major')[2], 4, 'scaleOf major');
eq(scaleOf('minor')[2], 3, 'scaleOf minor');
eq(qualitiesOf('major')[5], 'm', 'C大调 vi 是小三');
eq(qualitiesOf('minor')[0], 'm', '小调 i 是小三');
eq(romanOf('major')[0], 'I', '大调 I');
eq(romanOf('minor')[1], 'ii°', '小调 ii°');

// ---- chordForDegree: C 大调全音阶和弦 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const expect = [
    [1, 'C', '', 'I'], [2, 'D', 'm', 'ii'], [3, 'E', 'm', 'iii'],
    [4, 'F', '', 'IV'], [5, 'G', '', 'V'], [6, 'A', 'm', 'vi'], [7, 'B', 'dim', 'vii°'],
  ];
  for (const [deg, root, suf, rom] of expect) {
    const c = chordForDegree(C, deg);
    eq(c.root, root, `C大调 ${deg}级根音`);
    eq(c.suffix, suf, `C大调 ${deg}级品质`);
    eq(c.symbol, root + suf, `C大调 ${deg}级符号`);
    eq(c.roman, rom, `C大调 ${deg}级罗马数字`);
  }
}

// ---- chordForDegree: A 小调 ----
{
  const Am = PROG_KEYS.find(k => k.id === 'Am');
  const expect = [
    [1, 'A', 'm', 'i'], [2, 'B', 'dim', 'ii°'], [3, 'C', '', 'III'],
    [4, 'D', 'm', 'iv'], [5, 'E', 'm', 'v'], [6, 'F', '', 'VI'], [7, 'G', '', 'VII'],
  ];
  for (const [deg, root, suf, rom] of expect) {
    const c = chordForDegree(Am, deg);
    eq(c.symbol, root + suf, `A小调 ${deg}级符号`);
    eq(c.roman, rom, `A小调 ${deg}级罗马`);
  }
}

// ---- chordForDegree: G 大调（验证移调） ----
{
  const G = PROG_KEYS.find(k => k.id === 'G');
  eq(chordForDegree(G, 1).symbol, 'G', 'G大调 I = G');
  eq(chordForDegree(G, 4).symbol, 'C', 'G大调 IV = C');
  eq(chordForDegree(G, 5).symbol, 'D', 'G大调 V = D');
  eq(chordForDegree(G, 6).symbol, 'Em', 'G大调 vi = Em');
}

// ---- degree 越界回绕 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  eq(chordForDegree(C, 8).symbol, chordForDegree(C, 1).symbol, '8级回绕=1级');
}

// ---- expandProgression: I-V-vi-IV in C ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const chords = expandProgression(C, [1, 5, 6, 4]);
  eq(chords.map(c => c.symbol).join('-'), 'C-G-Am-F', 'C 调流行进行');
}

// ---- PROGRESSIONS / PROG_KEYS 完整性 ----
ok(PROGRESSIONS.length >= 6, '至少 6 条预置进行');
PROGRESSIONS.forEach(p => {
  ok(typeof p.id === 'string' && p.name, `进行 ${p.id} 有名字`);
  ok(Array.isArray(p.degrees) && p.degrees.length >= 2, `进行 ${p.id} 有级数`);
  ok(p.degrees.every(d => d >= 1 && d <= 7), `进行 ${p.id} 级数 1..7`);
});
ok(PROG_KEYS.length >= 6, '至少 6 个调');

// ---- ChordProgression 基本 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const pop = PROGRESSIONS.find(p => p.id === 'pop');
  const g = new ChordProgression({ key: C, progression: pop });
  eq(g.list().map(c => c.symbol).join('-'), 'C-G-Am-F', 'list 展开');
  eq(g.current().symbol, 'C', '起始目标 C');
  eq(g.progress, 0, '初始进度 0');
}

// ---- check: 正确推进 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const pop = PROGRESSIONS.find(p => p.id === 'pop');
  const g = new ChordProgression({ key: C, progression: pop, loop: false });
  let r;
  r = g.check(midiFor('C', '')); eq(r.ok, true, '弹 C 对'); eq(r.advanced, true, '推进');
  eq(g.current().symbol, 'G', '下一目标 G');
  r = g.check(midiFor('G', '')); eq(r.ok, true, '弹 G 对');
  r = g.check(midiFor('A', 'm')); eq(r.ok, true, '弹 Am 对');
  eq(r.completed, false, '还没到最后');
  r = g.check(midiFor('F', '')); eq(r.ok, true, '弹 F 对');
  eq(r.completed, true, '整条完成');
  eq(g.laps, 1, '走完 1 圈');
  eq(g.score, 4, '得分 4');
  eq(g.streak, 4, '连击 4');
  eq(g.current(), null, '不循环时结束 current=null');
}

// ---- check: 转位也算对（忽略低音） ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'pop') });
  // C 第一转位：E G C → [64,67,72]
  const r = g.check([64, 67, 72]);
  eq(r.ok, true, 'C 转位也算对');
}

// ---- check: 错和弦不推进 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'pop') });
  const r = g.check(midiFor('G', '')); // 目标是 C，弹了 G
  eq(r.ok, false, '错和弦 ok=false');
  eq(r.advanced, false, '不推进');
  eq(g.pos, 0, 'pos 不变');
  eq(g.current().symbol, 'C', '目标仍是 C');
}

// ---- check: 无法识别的音符 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'pop') });
  const r = g.check([60, 61]); // 两个音不成和弦
  eq(r.ok, false, '非和弦 ok=false');
}

// ---- loop: 循环回到开头 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'two-five-one'), loop: true });
  // ii-V-I in C = Dm - G - C
  eq(g.list().map(c => c.symbol).join('-'), 'Dm-G-C', 'ii-V-I 展开');
  g.check(midiFor('D', 'm'));
  g.check(midiFor('G', ''));
  const r = g.check(midiFor('C', ''));
  eq(r.completed, true, '完成一圈');
  eq(g.pos, 0, 'loop 回到开头');
  eq(g.current().symbol, 'Dm', '循环后目标回到 Dm');
  eq(g.laps, 1, 'laps=1');
}

// ---- miss: 连击清零 + 正确率分母 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'pop') });
  g.check(midiFor('C', '')); // 对，streak=1, attempts=1, score=1
  eq(g.streak, 1, '一次对连击 1');
  g.miss();                  // attempts=2, streak=0
  eq(g.streak, 0, 'miss 清零连击');
  eq(g.attempts, 2, 'miss 计入尝试');
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, '正确率 1/2');
}

// ---- progress ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'pop'), loop: false });
  g.check(midiFor('C', ''));
  g.check(midiFor('G', ''));
  ok(Math.abs(g.progress - 0.5) < 1e-9, '弹完 2/4 进度 0.5');
}

// ---- reset ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'pop') });
  g.check(midiFor('C', '')); g.check(midiFor('G', ''));
  g.reset();
  eq(g.pos, 0, 'reset pos'); eq(g.score, 0, 'reset score');
  eq(g.streak, 0, 'reset streak'); eq(g.laps, 0, 'reset laps');
}

// ---- 小调进行：安达卢西亚 i-VII-VI-V in Am ----
{
  const Am = PROG_KEYS.find(k => k.id === 'Am');
  const g = new ChordProgression({ key: Am, progression: PROGRESSIONS.find(p => p.id === 'andalusian') });
  // i-VII-VI-V in Am = Am - G - F - Em
  eq(g.list().map(c => c.symbol).join('-'), 'Am-G-F-Em', 'Am 安达卢西亚展开');
}

// ---- 回调触发 ----
{
  const C = PROG_KEYS.find(k => k.id === 'C');
  const g = new ChordProgression({ key: C, progression: PROGRESSIONS.find(p => p.id === 'two-five-one'), loop: false });
  let advanced = 0, completed = 0, results = 0;
  g.onAdvance = () => advanced++;
  g.onComplete = () => completed++;
  g.onResult = () => results++;
  g.check(midiFor('D', 'm'));
  g.check(midiFor('G', ''));
  g.check(midiFor('C', ''));
  eq(advanced, 3, 'onAdvance 触发 3 次');
  eq(completed, 1, 'onComplete 触发 1 次');
  eq(results, 3, 'onResult 触发 3 次');
}

console.log(`chord-progression: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
