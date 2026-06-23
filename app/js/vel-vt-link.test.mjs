/**
 * vel-vt-link.test.mjs — 力度→VT 联动单元测试
 * 运行: node js/vel-vt-link.test.mjs
 */
import { mapRange, VelVtLink } from './vel-vt-link.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function approx(actual, expected, msg, eps = 1e-9) {
  if (Math.abs(actual - expected) < eps) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ~${expected}, got ${actual}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- mapRange ----
approx(mapRange(0, 0, 127, 0, 127), 0, 'map identity 0');
approx(mapRange(127, 0, 127, 0, 127), 127, 'map identity 127');
approx(mapRange(64, 0, 128, 0, 256), 128, 'map scale up');
approx(mapRange(1, 1, 127, 0, 100), 0, 'map src min -> dst min');
approx(mapRange(127, 1, 127, 0, 100), 100, 'map src max -> dst max');
approx(mapRange(-5, 0, 127, 0, 127), 0, 'map clamps below');
approx(mapRange(200, 0, 127, 0, 127), 127, 'map clamps above');
approx(mapRange(50, 50, 50, 10, 20), 10, 'map zero-width src -> dstMin');

// ---- targetsFor: normal lane ----
{
  const link = new VelVtLink({ lanes: [{ v2: 4, outMin: 0, outMax: 127 }], velMin: 1, velMax: 127 });
  eq(link.targetsFor(1), [{ v2: 4, value: 0 }], 'soft -> outMin');
  eq(link.targetsFor(127), [{ v2: 4, value: 127 }], 'loud -> outMax');
}

// ---- targetsFor: inverted lane (louder = lower) ----
{
  const link = new VelVtLink({ lanes: [{ v2: 5, outMin: 0, outMax: 100, invert: true }], velMin: 1, velMax: 127 });
  eq(link.targetsFor(1), [{ v2: 5, value: 100 }], 'invert soft -> outMax');
  eq(link.targetsFor(127), [{ v2: 5, value: 0 }], 'invert loud -> outMin');
}

// ---- feed with no smoothing follows target immediately ----
{
  const applied = [];
  const link = new VelVtLink({ lanes: [{ v2: 4, outMin: 0, outMax: 127 }], smooth: 0 });
  link.onApply = (v2, value) => applied.push({ v2, value });
  const c1 = link.feed(127);
  eq(c1, [{ v2: 4, value: 127 }], 'no-smooth feed loud = 127');
  const c2 = link.feed(1);
  eq(c2, [{ v2: 4, value: 0 }], 'no-smooth feed soft = 0');
  eq(applied, [{ v2: 4, value: 127 }, { v2: 4, value: 0 }], 'onApply fired both');
}

// ---- feed only reports changed channels ----
{
  const link = new VelVtLink({ lanes: [{ v2: 4, outMin: 0, outMax: 127 }], smooth: 0 });
  link.feed(64);
  const again = link.feed(64); // same velocity -> same rounded value -> no change
  eq(again, [], 'same velocity twice -> no change reported');
}

// ---- smoothing moves gradually toward target ----
{
  const link = new VelVtLink({ lanes: [{ v2: 4, outMin: 0, outMax: 127 }], smooth: 0.5, velMin: 1, velMax: 127 });
  // first feed: prev null -> jumps to target
  link.feed(127); // ema = 127
  // now feed soft repeatedly: should decrease but not instantly to 0
  const c1 = link.feed(1); // ema = 127*0.5 + 0*0.5 = 63.5 -> 64
  eq(c1, [{ v2: 4, value: 64 }], 'smoothing halfway 127->~64');
  const c2 = link.feed(1); // ema = 64*0.5 + 0 = 32
  ok(c2[0].value < 64 && c2[0].value > 0, 'continues decreasing toward 0');
}

// ---- multi-lane ----
{
  const applied = [];
  const link = new VelVtLink({
    lanes: [
      { v2: 4, outMin: 0, outMax: 127 },             // String reso: louder=stronger
      { v2: 2, outMin: 0, outMax: 10, invert: true }, // Damper reso: louder=less
    ],
    smooth: 0,
  });
  link.onApply = (v2, value) => applied.push({ v2, value });
  const c = link.feed(127);
  eq(c, [{ v2: 4, value: 127 }, { v2: 2, value: 0 }], 'multi-lane loud');
  const c2 = link.feed(1);
  eq(c2, [{ v2: 4, value: 0 }, { v2: 2, value: 10 }], 'multi-lane soft');
}

// ---- reset clears smoothing/history ----
{
  const link = new VelVtLink({ lanes: [{ v2: 4, outMin: 0, outMax: 127 }], smooth: 0 });
  link.feed(100);
  link.reset();
  const c = link.feed(100); // after reset, _last cleared -> reports again
  eq(c.length, 1, 'after reset same value re-reported');
}

// ---- setLanes swaps and resets ----
{
  const link = new VelVtLink({ lanes: [{ v2: 4, outMin: 0, outMax: 127 }], smooth: 0 });
  link.feed(50);
  link.setLanes([{ v2: 9, outMin: 0, outMax: 10 }]);
  const c = link.feed(127);
  eq(c, [{ v2: 9, value: 10 }], 'setLanes applies new lane');
}

console.log(`\nvel-vt-link: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
