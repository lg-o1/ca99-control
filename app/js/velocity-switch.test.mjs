/**
 * velocity-switch.test.mjs — 力度感应换音色单元测试
 * 运行: node js/velocity-switch.test.mjs
 */
import { VelocityRouter, splitZones } from './velocity-switch.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- soundFor: basic zones ----
{
  const r = new VelocityRouter([
    { min: 0, max: 63, soundId: 10 },
    { min: 64, max: 127, soundId: 20 },
  ]);
  eq(r.soundFor(0), 10, 'soft -> 10');
  eq(r.soundFor(63), 10, 'boundary 63 -> 10');
  eq(r.soundFor(64), 20, 'boundary 64 -> 20');
  eq(r.soundFor(127), 20, 'loud -> 20');
}

// ---- soundFor: no match returns null ----
{
  const r = new VelocityRouter([{ min: 10, max: 20, soundId: 99 }]);
  eq(r.soundFor(5), null, 'below all -> null');
  eq(r.soundFor(50), null, 'above all -> null');
  eq(r.soundFor(15), 99, 'inside -> 99');
}

// ---- overlapping zones: first match wins ----
{
  const r = new VelocityRouter([
    { min: 0, max: 100, soundId: 1 },
    { min: 50, max: 127, soundId: 2 },
  ]);
  eq(r.soundFor(70), 1, 'overlap picks first');
}

// ---- feed: only switches on change ----
{
  const switched = [];
  const r = new VelocityRouter([
    { min: 0, max: 63, soundId: 10 },
    { min: 64, max: 127, soundId: 20 },
  ]);
  r.onSwitch = (id) => switched.push(id);
  eq(r.feed(30), 10, 'first soft note switches to 10');
  eq(r.feed(40), null, 'second soft note no switch');
  eq(r.feed(90), 20, 'loud note switches to 20');
  eq(r.feed(100), null, 'second loud note no switch');
  eq(r.feed(20), 10, 'back to soft switches to 10');
  eq(switched, [10, 20, 10], 'onSwitch fired 3 times with right ids');
}

// ---- feed: null velocity zone gives no switch ----
{
  const r = new VelocityRouter([{ min: 64, max: 127, soundId: 5 }]);
  eq(r.feed(10), null, 'unmatched velocity -> no switch');
  eq(r.feed(80), 5, 'matched -> switch');
}

// ---- reset forces next switch ----
{
  const r = new VelocityRouter([{ min: 0, max: 127, soundId: 7 }]);
  eq(r.feed(50), 7, 'first feed switches');
  eq(r.feed(60), null, 'same sound no switch');
  r.reset();
  eq(r.feed(60), 7, 'after reset switches again');
}

// ---- zoneFor returns the zone object ----
{
  const r = new VelocityRouter([{ min: 0, max: 63, soundId: 10 }]);
  eq(r.zoneFor(30), { min: 0, max: 63, soundId: 10 }, 'zoneFor returns object');
  eq(r.zoneFor(100), null, 'zoneFor null when unmatched');
}

// ---- splitZones: covers full range, no gaps ----
{
  const z = splitZones([1, 2]);
  eq(z.length, 2, 'split into 2');
  eq(z[0].min, 0, 'first starts at 0');
  eq(z[z.length - 1].max, 127, 'last ends at 127');
  ok(z[1].min === z[0].max + 1, 'no overlap/gap between zones');
  eq(z[0].soundId, 1, 'zone0 sound');
  eq(z[1].soundId, 2, 'zone1 sound');
}

// ---- splitZones: 3 zones contiguous ----
{
  const z = splitZones([10, 20, 30]);
  eq(z.length, 3, 'split into 3');
  eq(z[0].min, 0, '3-zone start 0');
  eq(z[2].max, 127, '3-zone end 127');
  ok(z[1].min === z[0].max + 1 && z[2].min === z[1].max + 1, '3-zone contiguous');
}

// ---- splitZones: every velocity 0-127 maps to exactly one zone ----
{
  const z = splitZones([1, 2, 3, 4]);
  const r = new VelocityRouter(z);
  let allMatched = true;
  for (let v = 0; v <= 127; v++) if (r.soundFor(v) == null) { allMatched = false; break; }
  ok(allMatched, 'splitZones covers all 0-127');
}

// ---- splitZones: empty ----
eq(splitZones([]), [], 'splitZones empty -> []');

console.log(`\nvelocity-switch: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
