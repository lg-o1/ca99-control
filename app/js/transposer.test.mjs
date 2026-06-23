/** transposer.test.mjs — 移调器纯逻辑单元测试 */
import {
  TRANSPOSE_MIN, TRANSPOSE_MAX, clampTranspose, encodeTransposeByte,
  decodeTransposeByte, transposeNote, semitoneLabel, targetKeyName, Transposer,
} from './transposer.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) { pass++; } else { fail++; console.error(`FAIL ${msg}: ${A} !== ${B}`); }
}
function ok(c, msg) { if (c) { pass++; } else { fail++; console.error(`FAIL ${msg}`); } }

// ---- 范围常量 ----
eq(TRANSPOSE_MIN, -12, 'min -12');
eq(TRANSPOSE_MAX, 12, 'max +12');

// ---- clampTranspose ----
eq(clampTranspose(0), 0, 'clamp 0');
eq(clampTranspose(5), 5, 'clamp 5');
eq(clampTranspose(20), 12, 'clamp 上界');
eq(clampTranspose(-99), -12, 'clamp 下界');
eq(clampTranspose(2.6), 3, 'clamp 四舍五入');
eq(clampTranspose('3'), 3, 'clamp 字符串');
eq(clampTranspose(NaN), 0, 'clamp NaN -> 0');

// ---- encode / decode 互逆，且匹配真机数据 ----
eq(encodeTransposeByte(0), 0x40, '0 -> 0x40');
eq(encodeTransposeByte(-12), 0x34, '-12 -> 0x34（匹配 sysex.json）');
eq(encodeTransposeByte(12), 0x4C, '+12 -> 0x4C（匹配 sysex.json）');
eq(encodeTransposeByte(2), 66, '+2 -> 66');
for (let s = -12; s <= 12; s++) {
  eq(decodeTransposeByte(encodeTransposeByte(s)), s, `encode/decode 互逆 ${s}`);
}

// ---- transposeNote ----
eq(transposeNote(60, 2), 62, 'C4 +2 = D4');
eq(transposeNote(60, -12), 48, 'C4 -12 = C3');
eq(transposeNote(127, 5), null, '超上界返回 null');
eq(transposeNote(0, -5), null, '超下界返回 null');
eq(transposeNote(122, 5), 127, '正好到 127 合法');
eq(transposeNote(5, -5), 0, '正好到 0 合法');

// ---- semitoneLabel ----
eq(semitoneLabel(0), '0', 'label 0');
eq(semitoneLabel(3), '+3', 'label +3');
eq(semitoneLabel(-4), '-4', 'label -4');
eq(semitoneLabel(99), '+12', 'label 夹紧+12');

// ---- targetKeyName ----
eq(targetKeyName(0), 'C', 'C +0 = C');
eq(targetKeyName(2), 'D', 'C +2 = D');
eq(targetKeyName(-1), 'B', 'C -1 = B');
eq(targetKeyName(12), 'C', 'C +12 = C（绕回）');
eq(targetKeyName(2, 'G'), 'A', 'G +2 = A');
eq(targetKeyName(-2, 'C'), 'A#', 'C -2 = A#');

// ---- Transposer 类 ----
{
  const t = new Transposer();
  eq(t.semitones, 0, '初始 0');
  eq(t.byte, 0x40, 'byte 0x40');
  eq(t.label, '0', 'label 0');
  eq(t.keyName, 'C', 'keyName C');

  let last = null;
  t.onChange = (v) => { last = v; };
  eq(t.set(3), 3, 'set 3');
  eq(last, 3, 'onChange 收到 3');
  eq(t.byte, 0x43, 'byte 0x43');
  eq(t.label, '+3', 'label +3');
  eq(t.keyName, 'D#', 'keyName D#');

  // set 相同值不触发 onChange
  last = null;
  t.set(3);
  eq(last, null, 'set 相同值不触发 onChange');

  eq(t.nudge(1), 4, 'nudge +1 = 4');
  eq(t.nudge(-2), 2, 'nudge -2 = 2');
  eq(t.set(99), 12, 'set 超界夹紧 12');
  eq(t.nudge(5), 12, 'nudge 已到上界不变');

  eq(t.transform(60), 72, 'transform C4 +12 = C5');
  eq(t.reset(), 0, 'reset 归零');
  eq(t.transform(60), 60, 'reset 后 transform 不变');
}

// ---- 初始 semitones 选项 ----
{
  const t = new Transposer({ semitones: -5 });
  eq(t.semitones, -5, '初始 -5');
  eq(t.byte, encodeTransposeByte(-5), 'byte 一致');
  const t2 = new Transposer({ semitones: 50 });
  eq(t2.semitones, 12, '初始超界夹紧');
}

console.log(`transposer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
