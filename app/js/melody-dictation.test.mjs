/**
 * melody-dictation.test.mjs — 旋律听写单元测试
 * 运行：node js/melody-dictation.test.mjs
 */
import {
  MAJOR_STEPS, MINOR_STEPS, KEYS, scaleSteps, degreeToMidi, samePitchClass, MelodyDictation,
} from './melody-dictation.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('  ✗', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (期望 ${b}，实际 ${a})`); }
function arrEq(a, b, msg) { ok(JSON.stringify(a) === JSON.stringify(b), `${msg} (期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)})`); }

// 固定 rng 工具：按给定序列返回 [0,1)
function seqRng(vals) { let i = 0; return () => vals[i++ % vals.length]; }

// ---- 音阶表 ----
arrEq(MAJOR_STEPS, [0, 2, 4, 5, 7, 9, 11], '大调步进');
arrEq(MINOR_STEPS, [0, 2, 3, 5, 7, 8, 10], '小调步进');
arrEq(scaleSteps('major'), MAJOR_STEPS, 'scaleSteps major');
arrEq(scaleSteps('minor'), MINOR_STEPS, 'scaleSteps minor');
arrEq(scaleSteps('weird'), MAJOR_STEPS, 'scaleSteps 默认 major');

// ---- KEYS ----
ok(KEYS.length >= 6, '至少 6 个预置调');
KEYS.forEach((k) => {
  ok(typeof k.id === 'string', `调 ${k.id} 有 id`);
  ok(k.tonic >= 0 && k.tonic <= 127, `调 ${k.id} 主音合法`);
  ok(k.scale === 'major' || k.scale === 'minor', `调 ${k.id} 音阶类型合法`);
});

// ---- degreeToMidi ----
eq(degreeToMidi(60, 'major', 0), 60, 'C大调 0级 = C4');
eq(degreeToMidi(60, 'major', 1), 62, 'C大调 1级 = D4');
eq(degreeToMidi(60, 'major', 2), 64, 'C大调 2级 = E4');
eq(degreeToMidi(60, 'major', 3), 65, 'C大调 3级 = F4');
eq(degreeToMidi(60, 'major', 4), 67, 'C大调 4级 = G4');
eq(degreeToMidi(60, 'major', 7), 72, 'C大调 7级 = C5（高八度主音）');
eq(degreeToMidi(60, 'major', 8), 74, 'C大调 8级 = D5');
eq(degreeToMidi(60, 'major', -1), 59, 'C大调 -1级 = B3（下方七级）');
eq(degreeToMidi(60, 'major', -7), 48, 'C大调 -7级 = C3（下八度主音）');
eq(degreeToMidi(57, 'minor', 0), 57, 'A小调 0级 = A3');
eq(degreeToMidi(57, 'minor', 2), 60, 'A小调 2级 = C4');

// ---- samePitchClass ----
ok(samePitchClass(60, 72), 'C4 与 C5 同音名');
ok(samePitchClass(60, 48), 'C4 与 C3 同音名');
ok(!samePitchClass(60, 61), 'C 与 C# 不同');
ok(samePitchClass(61, 73), 'C#4 与 C#5 同音名');
ok(samePitchClass(0, 12), '边界 0 与 12');

// ---- 生成旋律：首音主音 + 长度 ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 5, rng: seqRng([0.5]) });
  const notes = m.next();
  eq(notes.length, 5, '旋律长度 5');
  eq(notes[0], 60, '首音是主音 C4');
  notes.forEach((n) => ok(MAJOR_STEPS.includes(((n - 60) % 12 + 12) % 12), `音符 ${n} 在 C 大调内`));
}

// ---- startOnTonic=false 时首音不强制主音 ----
{
  // rng 恒定 0 → _randDegree = -span；span=4 → -4 级
  const m = new MelodyDictation({ key: KEYS[0], length: 3, span: 4, startOnTonic: false, rng: seqRng([0]) });
  const notes = m.next();
  eq(notes[0], degreeToMidi(60, 'major', -4), '首音 = -4 级');
}

// ---- 复奏全对（忽略八度） ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 3, rng: seqRng([0.5]) });
  let resultCorrect = null;
  m.onResult = (correct, info) => { if (info.score !== undefined && correct) resultCorrect = info; };
  const notes = m.next();
  // 用高八度复奏（octaveAgnostic 默认 true）
  let r;
  r = m.play(notes[0] + 12); eq(r.ok, true, '首音对'); eq(r.done, false, '未完成');
  r = m.play(notes[1] + 12); eq(r.ok, true, '次音对');
  r = m.play(notes[2] + 12); eq(r.done, true, '复奏完成'); eq(r.correct, true, '全对');
  eq(m.score, 1, '得分 1');
  eq(m.streak, 1, '连击 1');
  eq(m.attempts, 1, '尝试 1');
  ok(resultCorrect !== null, 'onResult 成功回调');
}

// ---- 复奏出错不前进 ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 3, rng: seqRng([0.5]) });
  const notes = m.next();
  let r = m.play(notes[0] === 61 ? 62 : 61); // 一个肯定错的音
  eq(r.ok, false, '错音 ok=false');
  eq(m.pos, 0, '错音不前进');
  eq(m.mistakes, 1, '记一次错');
  // 再弹对的
  r = m.play(notes[0]);
  eq(r.ok, true, '改对后前进');
  eq(m.pos, 1, 'pos 前进到 1');
}

// ---- 有错也能完成，但不计分、连击清零 ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 2, rng: seqRng([0.5]) });
  const notes = m.next();
  m.play(notes[0]);
  // 故意弹错一次
  m.play(notes[1] === 61 ? 62 : 61);
  // 再弹对
  const r = m.play(notes[1]);
  eq(r.done, true, '完成');
  eq(r.correct, true, 'done correct=true（复奏成功）');
  eq(m.score, 0, '有错不计分');
  eq(m.streak, 0, '连击清零');
  eq(m.attempts, 1, '仍算一次尝试');
}

// ---- octaveAgnostic=false 必须同八度 ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 2, octaveAgnostic: false, rng: seqRng([0.5]) });
  const notes = m.next();
  let r = m.play(notes[0] + 12); // 高八度 → 不算对
  eq(r.ok, false, '严格模式高八度算错');
  r = m.play(notes[0]);          // 正确八度
  eq(r.ok, true, '严格模式同八度算对');
}

// ---- 连续两条全对：连击累加 ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 2, rng: seqRng([0.5]) });
  let notes = m.next();
  m.play(notes[0]); m.play(notes[1]);
  notes = m.next();
  m.play(notes[0]); m.play(notes[1]);
  eq(m.score, 2, '两条全对得分 2');
  eq(m.streak, 2, '连击 2');
  eq(m.best, 2, '最佳连击 2');
}

// ---- giveUp ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 4, rng: seqRng([0.5]) });
  m.next();
  m.play(m.expected());
  m.giveUp();
  eq(m.attempts, 1, '放弃算一次尝试');
  eq(m.score, 0, '放弃不计分');
  eq(m.streak, 0, '放弃连击清零');
  eq(m.melody.length, 0, '放弃后清空旋律');
}

// ---- expected ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 2, rng: seqRng([0.5]) });
  const notes = m.next();
  eq(m.expected(), notes[0], 'expected 首音');
  m.play(notes[0]);
  eq(m.expected(), notes[1], 'expected 次音');
  m.play(notes[1]);
  eq(m.expected(), null, '完成后 expected = null');
}

// ---- play 在无题时返回 null ----
{
  const m = new MelodyDictation();
  eq(m.play(60), null, '无题 play 返回 null');
}

// ---- accuracy / reset ----
{
  const m = new MelodyDictation({ key: KEYS[0], length: 2, rng: seqRng([0.5]) });
  const notes = m.next();
  m.play(notes[0]); m.play(notes[1]);
  ok(m.accuracy === 1, 'accuracy = 1');
  m.reset();
  eq(m.score, 0, 'reset 分数'); eq(m.attempts, 0, 'reset 尝试'); eq(m.best, 0, 'reset 最佳');
  eq(m.accuracy, 0, 'reset 后 accuracy 0');
}

// ---- 相邻音尽量不同度（rng 让首个候选与上音同，应重试） ----
{
  // length 2, startOnTonic true → 首音 0 级；次音若 rng 给到 0 级应重试到别的
  // seqRng: 第一次出 0.5→degree=round? _randDegree=floor(0.5*9)-4=0（与上音同）→重试
  // 下一个 rng 0.9→floor(0.9*9)-4=4 级，不同
  const m = new MelodyDictation({ key: KEYS[0], length: 2, span: 4, rng: seqRng([0.5, 0.9]) });
  const notes = m.next();
  ok(notes[1] !== notes[0], '次音与首音不同（重试生效）');
}

// ---- 所有生成音符都在合法 MIDI 范围 ----
{
  const m = new MelodyDictation({ key: KEYS[3], length: 8, span: 7, rng: Math.random });
  for (let t = 0; t < 50; t++) {
    const notes = m.next();
    notes.forEach((n) => ok(n >= 0 && n <= 127, `音符 ${n} 在 0..127`));
  }
}

console.log(`melody-dictation: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
