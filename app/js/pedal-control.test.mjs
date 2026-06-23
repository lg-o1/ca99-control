/**
 * pedal-control.test.mjs — 踏板控制单元测试
 * 运行: node js/pedal-control.test.mjs
 */
import { PedalController, PEDAL_CC, CC_TO_PEDAL, mapRange, PEDAL_ON_THRESHOLD } from './pedal-control.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- constants ----
eq(PEDAL_CC.damper, 64, 'damper = CC64');
eq(PEDAL_CC.sostenuto, 66, 'sostenuto = CC66');
eq(PEDAL_CC.soft, 67, 'soft = CC67');
eq(PEDAL_CC.expression, 11, 'expression = CC11');
eq(CC_TO_PEDAL[64], 'damper', 'reverse lookup 64');
eq(CC_TO_PEDAL[67], 'soft', 'reverse lookup 67');
eq(PEDAL_ON_THRESHOLD, 64, 'threshold 64');

// ---- mapRange ----
ok(Math.abs(mapRange(0, 0, 127, 0, 100) - 0) < 1e-9, 'map 0');
ok(Math.abs(mapRange(127, 0, 127, 0, 100) - 100) < 1e-9, 'map full');
ok(Math.abs(mapRange(64, 0, 128, 0, 256) - 128) < 1e-9, 'map scale');

// ---- feedCC: unknown CC returns null ----
{
  const p = new PedalController();
  eq(p.feedCC(1, 100), null, 'mod wheel (CC1) ignored');
  eq(p.feedCC(7, 100), null, 'volume (CC7) ignored');
}

// ---- feedCC: damper on/off ----
{
  const events = [];
  const p = new PedalController();
  p.onPedal = (pedal, st) => events.push({ pedal, ...st });
  eq(p.feedCC(64, 127), { pedal: 'damper', value: 127, on: true }, 'damper pressed');
  eq(p.feedCC(64, 0), { pedal: 'damper', value: 0, on: false }, 'damper released');
  eq(p.feedCC(64, 63), { pedal: 'damper', value: 63, on: false }, 'damper 63 = off (below threshold)');
  eq(p.feedCC(64, 64), { pedal: 'damper', value: 64, on: true }, 'damper 64 = on (at threshold)');
  eq(events.length, 4, 'onPedal fired 4x');
}

// ---- state() tracks latest ----
{
  const p = new PedalController();
  eq(p.state('damper'), { value: 0, on: false }, 'default state');
  p.feedCC(64, 100);
  eq(p.state('damper'), { value: 100, on: true }, 'state after press');
  eq(p.state('soft'), { value: 0, on: false }, 'untouched pedal default');
}

// ---- mapping: pedal depth -> VT param ----
{
  const applied = [];
  const p = new PedalController({ map: { pedal: 'damper', v2: 4, outMin: 0, outMax: 127 } });
  p.onApply = (v2, value) => applied.push({ v2, value });
  p.feedCC(64, 0);    // -> 0
  p.feedCC(64, 127);  // -> 127
  p.feedCC(64, 64);   // -> 64
  eq(applied, [{ v2: 4, value: 0 }, { v2: 4, value: 127 }, { v2: 4, value: 64 }], 'depth maps to VT value');
}

// ---- mapping: only emits on integer change ----
{
  const applied = [];
  const p = new PedalController({ map: { pedal: 'damper', v2: 4, outMin: 0, outMax: 10 } });
  p.onApply = (v2, value) => applied.push(value);
  p.feedCC(64, 0);   // 0
  p.feedCC(64, 5);   // round(5/127*10)=0 -> no change
  p.feedCC(64, 64);  // round(64/127*10)=5 -> change
  eq(applied, [0, 5], 'only integer changes emitted');
}

// ---- mapping: inverted ----
{
  const applied = [];
  const p = new PedalController({ map: { pedal: 'soft', v2: 1, outMin: 0, outMax: 100, invert: true } });
  p.onApply = (v2, value) => applied.push({ v2, value });
  p.feedCC(67, 0);    // invert: 0 depth -> outMax 100
  p.feedCC(67, 127);  // invert: full depth -> outMin 0
  eq(applied, [{ v2: 1, value: 100 }, { v2: 1, value: 0 }], 'inverted mapping');
}

// ---- mapping only fires for mapped pedal ----
{
  const applied = [];
  const p = new PedalController({ map: { pedal: 'damper', v2: 4, outMin: 0, outMax: 127 } });
  p.onApply = (v2, value) => applied.push(value);
  p.feedCC(67, 127); // soft pedal, not mapped
  eq(applied, [], 'non-mapped pedal does not apply');
  p.feedCC(64, 127); // damper, mapped
  eq(applied, [127], 'mapped pedal applies');
}

// ---- setMap swaps mapping + resets ----
{
  const applied = [];
  const p = new PedalController({ map: { pedal: 'damper', v2: 4, outMin: 0, outMax: 127 } });
  p.onApply = (v2, value) => applied.push({ v2, value });
  p.feedCC(64, 100);
  p.setMap({ pedal: 'damper', v2: 9, outMin: 0, outMax: 10 });
  p.feedCC(64, 127);
  eq(applied[applied.length - 1], { v2: 9, value: 10 }, 'setMap applies new target');
}

// ---- reset clears state ----
{
  const p = new PedalController();
  p.feedCC(64, 127);
  p.reset();
  eq(p.state('damper'), { value: 0, on: false }, 'reset clears state');
}

console.log(`\npedal-control: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
