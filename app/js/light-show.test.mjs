import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  clamp01, heatColor, pitchHue, THEMES, pickColor,
  sparkSpec, beamHeight, stageFrac, isMilestone, ComboCounter,
} from './light-show.js';

test('clamp01 bounds values to [0,1]', () => {
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(0.4), 0.4);
  assert.equal(clamp01(9), 1);
});

test('heatColor goes cool (blue) for soft, warm (red) for loud', () => {
  const soft = heatColor(10);
  const loud = heatColor(127);
  // extract hue
  const hSoft = Number(soft.match(/hsl\((\d+)/)[1]);
  const hLoud = Number(loud.match(/hsl\((\d+)/)[1]);
  assert.ok(hSoft >= 180 && hSoft <= 210, `soft hue ~200 got ${hSoft}`);
  assert.ok(hLoud >= 330 && hLoud <= 360, `loud hue ~350 got ${hLoud}`);
});

test('heatColor handles null velocity (default mid)', () => {
  assert.match(heatColor(null), /^hsl\(\d+,95%,\d+%\)$/);
});

test('pitchHue maps low note to red(0) and high note to violet(300)', () => {
  assert.equal(pitchHue(21), 0);
  assert.equal(pitchHue(108), 300);
  assert.ok(pitchHue(60) > 0 && pitchHue(60) < 300);
});

test('THEMES exposes the four expected themes', () => {
  const ids = THEMES.map((t) => t.id);
  assert.deepEqual(ids, ['heat', 'rainbow', 'aurora', 'neon']);
  THEMES.forEach((t) => assert.ok(t.name && t.name.length));
});

test('pickColor=heat depends on velocity not pitch', () => {
  assert.equal(pickColor('heat', 30, 60), heatColor(30));
  assert.notEqual(pickColor('heat', 30, 60), pickColor('heat', 120, 60));
});

test('pickColor=rainbow depends on pitch not velocity (deterministic)', () => {
  assert.equal(pickColor('rainbow', 10, 60), pickColor('rainbow', 120, 60));
  assert.notEqual(pickColor('rainbow', 90, 30), pickColor('rainbow', 90, 90));
});

test('pickColor aurora/neon return valid hsl', () => {
  assert.match(pickColor('aurora', 90, 60), /^hsl\(\d+,85%,60%\)$/);
  assert.match(pickColor('neon', 90, 61), /^hsl\(\d+,95%,64%\)$/);
});

test('pickColor unknown theme falls back to heat', () => {
  assert.equal(pickColor('???', 64, 60), heatColor(64));
});

test('sparkSpec: louder => more, bigger, wider', () => {
  const soft = sparkSpec(10);
  const loud = sparkSpec(127);
  assert.ok(loud.count > soft.count);
  assert.ok(loud.size > soft.size);
  assert.ok(loud.spread > soft.spread);
  assert.equal(soft.count, 8 + Math.round((10 / 127) * 22));
});

test('sparkSpec big milestone is more explosive than normal', () => {
  const norm = sparkSpec(100);
  const big = sparkSpec(100, { big: true });
  assert.ok(big.count > norm.count);
  assert.ok(big.size > norm.size);
  assert.ok(big.spread > norm.spread);
});

test('beamHeight scales with velocity within bounds', () => {
  assert.equal(beamHeight(0), 40);
  assert.equal(beamHeight(127, 220), 220);
  assert.ok(beamHeight(64, 220) > 40 && beamHeight(64, 220) < 220);
});

test('stageFrac maps keyboard range to 0..1', () => {
  assert.equal(stageFrac(21), 0);
  assert.equal(stageFrac(108), 1);
  assert.ok(Math.abs(stageFrac(64) - (64 - 21) / 87) < 1e-9);
});

test('isMilestone true only at 5,10,15...', () => {
  assert.equal(isMilestone(4), false);
  assert.equal(isMilestone(5), true);
  assert.equal(isMilestone(10), true);
  assert.equal(isMilestone(12), false);
  assert.equal(isMilestone(0), false);
});

test('ComboCounter increments within window, resets after gap', () => {
  const c = new ComboCounter(1000);
  assert.equal(c.hit(0), 1);
  assert.equal(c.hit(500), 2);
  assert.equal(c.hit(1400), 3);    // 900ms gap, within window
  assert.equal(c.hit(3000), 1);    // 1600ms gap, breaks combo
  assert.equal(c.max, 3);
  assert.equal(c.total, 4);
});

test('ComboCounter reset clears state', () => {
  const c = new ComboCounter(1000);
  c.hit(0); c.hit(100);
  c.reset();
  assert.equal(c.combo, 0);
  assert.equal(c.max, 0);
  assert.equal(c.total, 0);
  assert.equal(c.hit(0), 1);
});
