/**
 * note-id.test.mjs — 键盘音名认知引擎单元测试
 */
import {
  SHARP_NAMES, FLAT_NAMES, WHITE_PCS,
  isBlack, pcName, noteName, NoteIdGame,
} from './note-id.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.error('FAIL:', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${a}, want ${b})`); }

// 顺序 rng：吐出预设序列，循环
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }

// ---- 数据完整性 ----
eq(SHARP_NAMES.length, 12, 'SHARP_NAMES 有 12 个');
eq(FLAT_NAMES.length, 12, 'FLAT_NAMES 有 12 个');
eq(SHARP_NAMES[0], 'C', 'SHARP[0]=C');
eq(SHARP_NAMES[1], 'C#', 'SHARP[1]=C#');
eq(FLAT_NAMES[1], 'Db', 'FLAT[1]=Db');
eq(FLAT_NAMES[10], 'Bb', 'FLAT[10]=Bb');
eq(WHITE_PCS.length, 7, '白键 7 个音级');
ok(WHITE_PCS.includes(0) && WHITE_PCS.includes(11), '白键含 C 和 B');

// ---- isBlack ----
ok(!isBlack(60), 'C4(60) 是白键');
ok(isBlack(61), 'C#4(61) 是黑键');
ok(!isBlack(62), 'D4(62) 是白键');
ok(isBlack(66), 'F#4(66) 是黑键');
ok(!isBlack(71), 'B4(71) 是白键');
ok(!isBlack(48), 'C3(48) 白键');
ok(isBlack(49), 'C#3(49) 黑键');
// 负数/越界稳健
ok(!isBlack(0), 'midi 0 (C-1) 白键');
ok(isBlack(1), 'midi 1 黑键');

// ---- pcName ----
eq(pcName(0), 'C', 'pc0=C');
eq(pcName(1), 'C#', 'pc1=C# (sharp)');
eq(pcName(1, 'flat'), 'Db', 'pc1=Db (flat)');
eq(pcName(13), 'C#', 'pc13 回绕=C#');
eq(pcName(-1), 'B', 'pc-1 回绕=B');

// ---- noteName ----
eq(noteName(60), 'C4', 'midi60=C4 中央C');
eq(noteName(61), 'C#4', 'midi61=C#4');
eq(noteName(61, { accidental: 'flat' }), 'Db4', 'midi61=Db4 (flat)');
eq(noteName(57), 'A3', 'midi57=A3');
eq(noteName(21), 'A0', 'midi21=A0 (88键最低)');
eq(noteName(108), 'C8', 'midi108=C8 (88键最高)');
eq(noteName(72), 'C5', 'midi72=C5');
eq(noteName(60, { useOctave: false }), 'C', 'useOctave=false 去掉八度');
eq(noteName(66, { useOctave: false }), 'F#', 'F# 无八度');

// ---- 构造 & 默认值 ----
{
  const g = new NoteIdGame();
  eq(g.mode, 'name2key', '默认模式 name2key');
  eq(g.midiMin, 48, '默认 midiMin=48');
  eq(g.midiMax, 72, '默认 midiMax=72');
  ok(!g.whiteOnly, '默认非 whiteOnly');
  ok(g.useOctave, '默认 useOctave');
  eq(g.accidental, 'sharp', '默认升号');
  eq(g.score, 0, '初始分 0');
  eq(g.accuracy, 0, '初始正确率 0');
  // 池含全部 25 个键 48..72
  eq(g.pool.length, 25, '默认池 48..72 共 25 键');
}

// midiMin>midiMax 自动交换
{
  const g = new NoteIdGame({ midiMin: 72, midiMax: 48 });
  eq(g.midiMin, 48, 'min/max 自动交换 min');
  eq(g.midiMax, 72, 'min/max 自动交换 max');
}

// whiteOnly 只含白键
{
  const g = new NoteIdGame({ midiMin: 60, midiMax: 72, whiteOnly: true });
  ok(g.pool.every((m) => !isBlack(m)), 'whiteOnly 池全白键');
  // C4..C5 白键: C D E F G A B C = 8
  eq(g.pool.length, 8, 'C4..C5 白键 8 个');
}

// choiceCount 夹紧
{
  const g = new NoteIdGame({ midiMin: 60, midiMax: 61, choiceCount: 10 });
  ok(g.choiceCount <= g.pool.length, 'choiceCount 不超过池大小');
  const g2 = new NoteIdGame({ choiceCount: 1 });
  eq(g2.choiceCount, 2, 'choiceCount 至少 2');
}

// ---- name2key: next + target + 校验 ----
{
  // rng 第一次调用决定 pick 索引；用 0 取池首元素=48
  const g = new NoteIdGame({ rng: seqRng([0]), midiMin: 48, midiMax: 72 });
  const q = g.next();
  eq(q.midi, 48, 'rng=0 取池首 48');
  eq(g.target(), 48, 'target=48');
  eq(g.promptName(), 'C3', 'promptName=C3');
  ok(g.choices().length === 0, 'name2key 无 choices');
  // 点对键
  ok(g.check(48), '点对 48 正确');
  eq(g.score, 1, '得分 1');
  eq(g.streak, 1, '连击 1');
  // 下一题点错
  g.next();
  const wrong = g.target() === 48 ? 50 : 48;
  ok(!g.check(wrong), '点错键判错');
  eq(g.streak, 0, '错后连击清零');
}

// name2key + useOctave=false：同音名任意八度都算对
{
  const g = new NoteIdGame({ rng: seqRng([0]), midiMin: 60, midiMax: 72, useOctave: false });
  g.next(); // midi 60 = C
  eq(g.promptName(), 'C', '无八度提示名=C');
  ok(g.check(72), '点 C5(72) 同名也算对 (useOctave=false)');
  g.next();
  ok(g.check(60), '点 C4(60) 也算对');
}

// name2key check 非数字答案 -> 错
{
  const g = new NoteIdGame({ rng: seqRng([0]) });
  g.next();
  ok(!g.check('C3'), 'name2key 传字符串判错');
}

// ---- key2name: choices + 校验 ----
{
  const g = new NoteIdGame({ mode: 'key2name', rng: seqRng([0]), midiMin: 48, midiMax: 72, choiceCount: 4 });
  const q = g.next();
  const ch = g.choices();
  eq(ch.length, 4, 'key2name 4 个选项');
  ok(ch.some((c) => c.name === q.name), '选项含正确音名');
  // 选项音名不重复
  const names = ch.map((c) => c.name);
  eq(new Set(names).size, names.length, '选项音名不重复');
  // 答对
  ok(g.check(q.name), '选对音名正确');
  eq(g.score, 1, 'key2name 得分 1');
  // 答错
  g.next();
  const correctName = g.promptName();
  const wrongName = g.choices().map((c) => c.name).find((n) => n !== correctName);
  ok(!g.check(wrongName), '选错音名判错');
  eq(g.streak, 0, 'key2name 错后连击清零');
}

// key2name 正确答案恒在选项中（多轮）
{
  const g = new NoteIdGame({ mode: 'key2name', rng: Math.random, midiMin: 21, midiMax: 108, choiceCount: 4 });
  for (let i = 0; i < 200; i++) {
    const q = g.next();
    const ch = g.choices();
    ok(ch.length === 4, `第${i}轮 4 选项`);
    ok(ch.some((c) => c.name === q.name), `第${i}轮含正确答案`);
    const names = ch.map((c) => c.name);
    ok(new Set(names).size === names.length, `第${i}轮音名不重复`);
  }
}

// ---- target 落在范围内（多轮） ----
{
  const g = new NoteIdGame({ midiMin: 36, midiMax: 84 });
  for (let i = 0; i < 300; i++) {
    g.next();
    const m = g.target();
    ok(m >= 36 && m <= 84, `target ${m} 在 36..84`);
  }
}

// whiteOnly: target 永远白键
{
  const g = new NoteIdGame({ midiMin: 48, midiMax: 84, whiteOnly: true });
  for (let i = 0; i < 200; i++) {
    g.next();
    ok(!isBlack(g.target()), 'whiteOnly target 是白键');
  }
}

// ---- accuracy ----
{
  const g = new NoteIdGame({ rng: seqRng([0]), midiMin: 60, midiMax: 60 });
  g.next(); g.check(60); // 对
  g.next(); g.check(61); // 错（目标恒 60）
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy=0.5');
  eq(g.attempts, 2, 'attempts=2');
}

// ---- 回调 ----
{
  let newCount = 0, resCount = 0, lastCorrect = null;
  const g = new NoteIdGame({ rng: seqRng([0]), midiMin: 60, midiMax: 60 });
  g.onNew = () => newCount++;
  g.onResult = (c) => { resCount++; lastCorrect = c; };
  g.next();
  eq(newCount, 1, 'onNew 触发 1 次');
  g.check(60);
  eq(resCount, 1, 'onResult 触发');
  ok(lastCorrect === true, 'onResult 传 correct=true');
}

// ---- reset ----
{
  const g = new NoteIdGame({ rng: seqRng([0]) });
  g.next(); g.check(g.target());
  g.reset();
  eq(g.score, 0, 'reset 分数清零');
  eq(g.streak, 0, 'reset 连击清零');
  eq(g.attempts, 0, 'reset 次数清零');
  ok(g.current === null, 'reset current=null');
}

// ---- 未 next 直接 check / target ----
{
  const g = new NoteIdGame();
  ok(g.target() === null, '未 next target=null');
  ok(g.promptName() === null, '未 next promptName=null');
  ok(g.choices().length === 0, '未 next choices 空');
  ok(!g.check(60), '未 next check 返回 false');
}

// best 连击记录
{
  const g = new NoteIdGame({ rng: seqRng([0]), midiMin: 60, midiMax: 60 });
  g.next(); g.check(60);
  g.next(); g.check(60);
  g.next(); g.check(60);
  eq(g.best, 3, 'best=3');
  g.next(); g.check(61); // 错
  eq(g.streak, 0, '错后 streak=0');
  eq(g.best, 3, 'best 保持 3');
}

console.log(`note-id: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
