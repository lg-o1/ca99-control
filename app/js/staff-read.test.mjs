/**
 * staff-read.test.mjs — 五线谱识谱卡引擎单元测试
 */
import {
  LETTERS, MNEMONICS, letterOf, fullName, positionTip,
  randomStaffNote, staffPosition, needsLedger, StaffReadGame,
} from './staff-read.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.error('FAIL:', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${a}, want ${b})`); }
function seqRng(seq) { let i = 0; return () => seq[i++ % seq.length]; }

// ---- 数据完整性 ----
eq(LETTERS.length, 7, '7 个白键音名');
eq(LETTERS[0], 'C', 'LETTERS[0]=C');
eq(LETTERS[6], 'B', 'LETTERS[6]=B');
ok(MNEMONICS.treble && MNEMONICS.bass, '两个谱号口诀都有');
eq(MNEMONICS.treble.lines.join(''), 'EGBDF', '高音谱号线 EGBDF');
eq(MNEMONICS.treble.spaces.join(''), 'FACE', '高音谱号间 FACE');
eq(MNEMONICS.bass.lines.join(''), 'GBDFA', '低音谱号线 GBDFA');
eq(MNEMONICS.bass.spaces.join(''), 'ACEG', '低音谱号间 ACEG');

// ---- letterOf / fullName ----
eq(letterOf(60), 'C', 'midi60 字母 C');
eq(letterOf(64), 'E', 'midi64 字母 E');
eq(letterOf(71), 'B', 'midi71 字母 B');
eq(fullName(60), 'C4', 'midi60 全名 C4');
eq(fullName(64), 'E4', 'midi64 全名 E4');
eq(fullName(43), 'G2', 'midi43 全名 G2 (低音底线)');

// ---- staffPosition 校准 ----
// 高音谱号底线 = E4(64) -> position 0
eq(staffPosition(64, 'treble'), 0, 'E4 是高音谱号底线 pos0');
// G4(67) 是底线上方第一线? E F G -> E=line1(0), F=space(1), G=line2(2)
eq(staffPosition(67, 'treble'), 2, 'G4 高音谱号 pos2 (第二线)');
// B4(71) = 中线 pos4
eq(staffPosition(71, 'treble'), 4, 'B4 高音谱号 pos4 (中线)');
// F5(77) 顶线 pos8
eq(staffPosition(77, 'treble'), 8, 'F5 高音谱号 pos8 (顶线)');
// 中央 C C4(60) 在高音谱号下方加一线 pos -2
eq(staffPosition(60, 'treble'), -2, '中央C 高音谱号 pos-2 (下加一线)');
// 低音谱号底线 G2(43) pos0
eq(staffPosition(43, 'bass'), 0, 'G2 是低音谱号底线 pos0');
// 中央 C C4(60) 在低音谱号上方加一线 pos10
eq(staffPosition(60, 'bass'), 10, '中央C 低音谱号 pos10 (上加一线)');

// ---- positionTip ----
ok(positionTip('treble', 0).includes('第 1 线'), 'pos0=第1线');
ok(positionTip('treble', 1).includes('第 1 间'), 'pos1=第1间');
ok(positionTip('treble', 8).includes('第 5 线'), 'pos8=第5线');
ok(positionTip('treble', 7).includes('第 4 间'), 'pos7=第4间');
ok(positionTip('treble', -2).includes('下方'), 'pos-2 下方加线');
ok(positionTip('treble', 10).includes('上方'), 'pos10 上方加线');
ok(positionTip('treble', 0).includes('EGBDF') || positionTip('treble', 0).includes('Every'), 'pos0 含线口诀');

// ---- randomStaffNote: 白键 + 在范围内 ----
{
  for (let i = 0; i < 300; i++) {
    const m = randomStaffNote({ clef: 'treble', minPos: -3, maxPos: 11 });
    const p = staffPosition(m, 'treble');
    ok(p >= -3 && p <= 11, `treble 随机谱位 ${p} 在范围内`);
    // 白键：pitch class 属于自然音
    ok([0, 2, 4, 5, 7, 9, 11].includes(((m % 12) + 12) % 12), '随机音是白键');
  }
}
{
  for (let i = 0; i < 200; i++) {
    const m = randomStaffNote({ clef: 'bass', minPos: -3, maxPos: 11 });
    const p = staffPosition(m, 'bass');
    ok(p >= -3 && p <= 11, `bass 随机谱位 ${p} 在范围内`);
  }
}

// ---- 构造默认值 ----
{
  const g = new StaffReadGame();
  eq(g.mode, 'name', '默认 name 模式');
  ok(g.clefs.length === 1 && g.clefs[0] === 'treble', '默认高音谱号');
  ok(g.octaveAgnostic, '默认忽略八度(key模式)');
  ok(!g.useOctave, '默认音名不带八度');
  eq(g.choiceCount, 4, '默认 4 选项');
  eq(g.score, 0, '初始分0');
}

// grand = 两谱号
{
  const g = new StaffReadGame({ clefs: 'grand' });
  eq(g.clefs.length, 2, 'grand 含两谱号');
  ok(g.clefs.includes('treble') && g.clefs.includes('bass'), 'grand 含 treble+bass');
}
// 数组 clefs + 过滤非法
{
  const g = new StaffReadGame({ clefs: ['bass', 'xxx'] });
  ok(g.clefs.length === 1 && g.clefs[0] === 'bass', '非法谱号被过滤');
}
// 全非法 -> 回退 treble
{
  const g = new StaffReadGame({ clefs: ['nope'] });
  eq(g.clefs[0], 'treble', '全非法回退 treble');
}
// choiceCount 夹紧
{
  eq(new StaffReadGame({ choiceCount: 99 }).choiceCount, 7, 'choiceCount 上限 7');
  eq(new StaffReadGame({ choiceCount: 1 }).choiceCount, 2, 'choiceCount 下限 2');
}

// ---- name 模式：选项 + 校验 ----
{
  const g = new StaffReadGame({ mode: 'name', rng: seqRng([0]), clefs: 'treble', choiceCount: 4 });
  const q = g.next();
  const ch = g.choices();
  eq(ch.length, 4, 'name 4 选项');
  ok(ch.includes(q.name), '选项含正确答案');
  eq(new Set(ch).size, ch.length, '选项不重复');
  ok(g.check(q.name), '选对判正确');
  eq(g.score, 1, '得分1');
  // 答错
  g.next();
  const wrong = g.choices().find((c) => c !== g.answerName());
  ok(!g.check(wrong), '选错判错');
  eq(g.streak, 0, '错后连击0');
}

// name 正确答案恒在选项（多轮，含 grand）
{
  const g = new StaffReadGame({ mode: 'name', clefs: 'grand', choiceCount: 4 });
  for (let i = 0; i < 300; i++) {
    const q = g.next();
    const ch = g.choices();
    ok(ch.length === 4, `第${i}轮4选项`);
    ok(ch.includes(q.name), `第${i}轮含正确答案 ${q.name}`);
    ok(new Set(ch).size === ch.length, `第${i}轮选项不重复`);
    ok(['treble', 'bass'].includes(q.clef), `第${i}轮谱号合法`);
  }
}

// name + useOctave：选项与答案都带八度
{
  const g = new StaffReadGame({ mode: 'name', useOctave: true, clefs: 'treble' });
  const q = g.next();
  ok(/^[A-G]\d/.test(q.name), 'useOctave 答案带八度数字');
  ok(g.choices().every((c) => /^[A-G]\d/.test(c)), '选项都带八度');
}

// ---- key 模式：octaveAgnostic 校验 ----
{
  const g = new StaffReadGame({ mode: 'key', rng: seqRng([0]), clefs: 'treble', octaveAgnostic: true });
  g.next();
  const tgt = g.target();
  const L = letterOf(tgt);
  ok(g.choices().length === 0, 'key 模式无 choices');
  // 找另一个同字母不同八度的键
  ok(g.check(tgt + 12) === (letterOf(tgt + 12) === L), 'octaveAgnostic 同字母即对');
  // 直接点对的键一定对
  g.next();
  ok(g.check(g.target()), 'key 点对目标键正确');
}
// key + 非数字 -> 错
{
  const g = new StaffReadGame({ mode: 'key', rng: seqRng([0]) });
  g.next();
  ok(!g.check('C4'), 'key 模式传字符串判错');
}
// key + 严格八度
{
  const g = new StaffReadGame({ mode: 'key', octaveAgnostic: false, clefs: 'treble' });
  g.next();
  const tgt = g.target();
  ok(g.check(tgt), '严格八度点对正确');
  g.next();
  const t2 = g.target();
  ok(!g.check(t2 + 12), '严格八度点高八度判错');
}

// ---- accuracy ----
{
  const g = new StaffReadGame({ mode: 'name', rng: seqRng([0]), clefs: 'treble' });
  g.next(); g.check(g.answerName()); // 对
  g.next(); g.check('___nope___'); // 错
  ok(Math.abs(g.accuracy - 0.5) < 1e-9, 'accuracy=0.5');
  eq(g.attempts, 2, 'attempts=2');
}

// ---- 回调 ----
{
  let nc = 0, rc = 0, last = null;
  const g = new StaffReadGame({ mode: 'name', rng: seqRng([0]), clefs: 'treble' });
  g.onNew = () => nc++;
  g.onResult = (c) => { rc++; last = c; };
  g.next();
  eq(nc, 1, 'onNew 1 次');
  g.check(g.answerName());
  eq(rc, 1, 'onResult 触发');
  ok(last === true, 'onResult correct=true');
}

// ---- reset / before-next ----
{
  const g = new StaffReadGame({ mode: 'name', rng: seqRng([0]) });
  ok(g.target() === null, '未 next target null');
  ok(g.answerName() === null, '未 next answerName null');
  ok(g.choices().length === 0, '未 next choices 空');
  ok(g.tip() === '', '未 next tip 空');
  ok(!g.check('C'), '未 next check false');
  g.next(); g.check(g.answerName());
  g.reset();
  eq(g.score, 0, 'reset 分0');
  ok(g.current === null, 'reset current null');
}

// best 连击
{
  const g = new StaffReadGame({ mode: 'name', rng: seqRng([0]), clefs: 'treble' });
  for (let i = 0; i < 3; i++) { g.next(); g.check(g.answerName()); }
  eq(g.best, 3, 'best=3');
  g.next(); g.check('___'); // 错
  eq(g.streak, 0, '错后streak0');
  eq(g.best, 3, 'best保持3');
}

// position 与 tip 一致性（多轮）
{
  const g = new StaffReadGame({ mode: 'name', clefs: 'grand' });
  for (let i = 0; i < 100; i++) {
    g.next();
    const p = g.position();
    ok(typeof p === 'number', 'position 是数字');
    ok(typeof g.tip() === 'string' && g.tip().length > 0, 'tip 非空');
  }
}

console.log(`staff-read: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
