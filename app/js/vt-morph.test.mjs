/**
 * vt-morph.test.mjs — VT 渐变器单元测试（不需真机/浏览器）
 * 运行: node js/vt-morph.test.mjs
 */
import { lerp, easeInOut, linear, MorphEngine } from './vt-morph.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; }
  else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function approx(actual, expected, msg, eps = 1e-9) {
  const ok = Math.abs(actual - expected) < eps;
  if (ok) { pass++; }
  else { fail++; console.error(`✗ ${msg}\n   expected ~${expected}, got ${actual}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }

// ---- lerp ----
approx(lerp(0, 100, 0), 0, 'lerp t=0');
approx(lerp(0, 100, 1), 100, 'lerp t=1');
approx(lerp(0, 100, 0.5), 50, 'lerp t=0.5');
approx(lerp(20, 60, 0.25), 30, 'lerp 20->60 @0.25');

// ---- easing ----
approx(linear(0.3), 0.3, 'linear identity');
approx(easeInOut(0), 0, 'easeInOut(0)=0');
approx(easeInOut(1), 1, 'easeInOut(1)=1');
approx(easeInOut(0.5), 0.5, 'easeInOut(0.5)=0.5');
ok(easeInOut(0.25) < 0.25, 'easeInOut slow start (<linear at 0.25)');
ok(easeInOut(0.75) > 0.75, 'easeInOut fast-then-slow (>linear at 0.75)');

// ---- frameAt: linear ----
{
  const m = new MorphEngine({ lanes: [{ v2: 0x10, from: 0, to: 100 }], easing: 'linear' });
  eq(m.frameAt(0), [{ v2: 0x10, value: 0 }], 'frameAt(0) linear');
  eq(m.frameAt(1), [{ v2: 0x10, value: 100 }], 'frameAt(1) linear');
  eq(m.frameAt(0.5), [{ v2: 0x10, value: 50 }], 'frameAt(0.5) linear');
}

// ---- frameAt: multi-lane + rounding ----
{
  const m = new MorphEngine({
    lanes: [{ v2: 1, from: 0, to: 127 }, { v2: 2, from: 127, to: 0 }],
    easing: 'linear',
  });
  eq(m.frameAt(0.5), [{ v2: 1, value: 64 }, { v2: 2, value: 64 }], 'multi-lane @0.5 (rounded)');
  eq(m.frameAt(0), [{ v2: 1, value: 0 }, { v2: 2, value: 127 }], 'multi-lane @0 endpoints');
}

// ---- frameAt clamps out-of-range progress ----
{
  const m = new MorphEngine({ lanes: [{ v2: 1, from: 0, to: 10 }], easing: 'linear' });
  eq(m.frameAt(-0.5), [{ v2: 1, value: 0 }], 'frameAt clamps below 0');
  eq(m.frameAt(2), [{ v2: 1, value: 10 }], 'frameAt clamps above 1');
}

// ---- tick drives onApply and completes ----
{
  const applied = [];
  let doneCalled = false;
  const m = new MorphEngine({
    lanes: [{ v2: 0x10, from: 0, to: 100 }],
    durationMs: 1000, tickMs: 100, easing: 'linear',
  });
  m.onApply = (v2, value) => applied.push({ v2, value });
  m.onDone = () => { doneCalled = true; };

  // manual time control (no real timer)
  m._running = true; m._startTime = 0; m._reverse = false;
  ok(m.tick(0) === true, 'tick @0 running');
  eq(applied[applied.length - 1], { v2: 0x10, value: 0 }, 'apply @0 = from');
  m.tick(500);
  eq(applied[applied.length - 1], { v2: 0x10, value: 50 }, 'apply @500ms = mid');
  const stillRunning = m.tick(1000);
  ok(stillRunning === false, 'tick @duration stops');
  eq(applied[applied.length - 1], { v2: 0x10, value: 100 }, 'apply @end = to');
  ok(doneCalled === true, 'onDone fired at completion');
  ok(m.running === false, 'engine not running after done');
}

// ---- tick returns false when not running ----
{
  const m = new MorphEngine({ lanes: [{ v2: 1, from: 0, to: 1 }] });
  ok(m.tick(0) === false, 'tick when stopped returns false');
}

// ---- pingpong reverses instead of stopping ----
{
  const applied = [];
  const m = new MorphEngine({
    lanes: [{ v2: 1, from: 0, to: 100 }],
    durationMs: 1000, easing: 'linear', pingpong: true,
  });
  m.onApply = (v2, value) => applied.push(value);
  m._running = true; m._startTime = 0; m._reverse = false;
  const r = m.tick(1000); // reach end
  ok(r === true, 'pingpong keeps running at end');
  ok(m.running === true, 'pingpong still running');
  eq(applied[applied.length - 1], 100, 'pingpong end value = to');
  // now reversed; at the new "end" it should return to from
  m.tick(2000);
  eq(applied[applied.length - 1], 0, 'pingpong reversed back to from');
}

// ---- start applies start frame immediately ----
{
  const applied = [];
  const m = new MorphEngine({
    lanes: [{ v2: 5, from: 20, to: 80 }], durationMs: 1000, tickMs: 50, easing: 'linear',
  });
  m.onApply = (v2, value) => applied.push({ v2, value });
  const noopTimer = () => 0;
  m.start(0, noopTimer); // injected timer that never fires
  eq(applied[0], { v2: 5, value: 20 }, 'start applies start frame');
  ok(m.running === true, 'running after start');
  m.stop(() => {});
  ok(m.running === false, 'stopped');
}

console.log(`\nvt-morph: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
