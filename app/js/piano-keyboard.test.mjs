/**
 * piano-keyboard.test.mjs — 通用钢琴键盘布局纯函数测试
 */
import {
  WHITE_PCS, BLACK_PCS, pc, isBlack, noteName, whiteCount, buildLayout, HL_PALETTE,
} from './piano-keyboard.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('  FAIL:', msg); } }
const J = (x) => JSON.stringify(x);

// ---- pc / isBlack / noteName ----
ok(pc(60) === 0, 'pc 60 = 0');
ok(pc(61) === 1, 'pc 61 = 1');
ok(pc(-1) === 11, 'pc -1 wraps to 11');
ok(J(WHITE_PCS) === J([0, 2, 4, 5, 7, 9, 11]), 'white pcs');
ok(J(BLACK_PCS) === J([1, 3, 6, 8, 10]), 'black pcs');
ok(!isBlack(60) && isBlack(61) && !isBlack(62) && isBlack(63) && !isBlack(64) && !isBlack(65) && isBlack(66), 'isBlack C..F#');
ok(noteName(60) === 'C4', '60 = C4');
ok(noteName(21) === 'A0', '21 = A0 (88-key low)');
ok(noteName(108) === 'C8', '108 = C8 (88-key high)');
ok(noteName(69) === 'A4', '69 = A4');
ok(noteName(61) === 'C#4', '61 = C#4');

// ---- whiteCount ----
ok(whiteCount(60, 72) === 8, 'C4..C5 = 8 white');
ok(whiteCount(21, 108) === 52, '88-key = 52 white');

// ---- buildLayout: 88-key default ----
{
  const L = buildLayout(21, 108);
  ok(L.keys.length === 88, '88 keys');
  ok(L.whiteCount === 52, '52 white keys');
  ok(L.first === 21 && L.last === 108, 'range');
  ok(L.width === 52 * L.whiteW, 'width = 52*whiteW');
  ok(L.keys[0].midi === 21 && !L.keys[0].black, 'first key A0 white');
  ok(L.keys[L.keys.length - 1].midi === 108 && !L.keys[L.keys.length - 1].black, 'last key C8 white');
  // white keys x strictly increasing
  const whites = L.keys.filter((k) => !k.black);
  let inc = true; for (let i = 1; i < whites.length; i++) if (whites[i].x <= whites[i - 1].x) inc = false;
  ok(inc, 'white x strictly increasing');
  ok(whites[0].x === 0, 'first white x=0');
  // every black key sits between its neighbor whites
  const blacks = L.keys.filter((k) => k.black);
  ok(blacks.length === 36, '36 black keys');
  ok(blacks.every((b) => { const c = b.x + b.w / 2; return c > 0 && c < L.width; }), 'black centers within board');
  // white/black height
  ok(whites.every((k) => k.h === L.height), 'white full height');
  ok(blacks.every((k) => k.h === L.blackH && k.h < L.height), 'black shorter');
}

// ---- buildLayout: precise geometry C4..C5 with round sizes ----
{
  const L = buildLayout(60, 72, { whiteW: 10, blackW: 6, height: 100, blackH: 60 });
  const byMidi = (m) => L.keys.find((k) => k.midi === m);
  ok(byMidi(60).x === 0, 'C4 x=0');
  ok(byMidi(61).x === 10 - 3, 'C#4 x=7 (between C and D)');
  ok(byMidi(62).x === 10, 'D4 x=10');
  ok(byMidi(63).x === 20 - 3, 'D#4 x=17');
  ok(byMidi(64).x === 20, 'E4 x=20');
  ok(byMidi(65).x === 30, 'F4 x=30');
  ok(byMidi(66).x === 40 - 3, 'F#4 x=37');
  ok(byMidi(67).x === 40, 'G4 x=40');
  ok(byMidi(68).x === 50 - 3, 'G#4 x=47');
  ok(byMidi(69).x === 50, 'A4 x=50');
  ok(byMidi(70).x === 60 - 3, 'A#4 x=57');
  ok(byMidi(71).x === 60, 'B4 x=60');
  ok(byMidi(72).x === 70, 'C5 x=70');
  ok(L.width === 80, 'width = 8 white * 10');
  ok(L.whiteCount === 8, '8 white');
}

// ---- buildLayout: swapped args normalized ----
{
  const L = buildLayout(72, 60);
  ok(L.first === 60 && L.last === 72, 'swapped range normalized');
  ok(L.keys.length === 13, '13 keys C4..C5');
}

// ---- buildLayout: single white key ----
{
  const L = buildLayout(60, 60);
  ok(L.keys.length === 1 && L.whiteCount === 1, 'single C key');
}

// ---- buildLayout: black-key derived size default ----
{
  const L = buildLayout(60, 72, { whiteW: 20 });
  ok(L.blackW === Math.round(20 * 0.62), 'blackW derived from whiteW');
}

// ---- palette ----
ok(Array.isArray(HL_PALETTE) && HL_PALETTE.length >= 6, 'palette has colors');
ok(HL_PALETTE.every((c) => /^#[0-9a-f]{6}$/i.test(c)), 'palette valid hex');

console.log(`piano-keyboard: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
