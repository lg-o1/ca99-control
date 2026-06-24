/**
 * finger-independence.test.mjs — 手指独立性引擎单元测试
 */
import {
  FINGER_PRESETS, buildEvents, evaluateIndependence, FingerIndependenceTrainer,
} from './finger-independence.js';

let passed = 0, failed = 0;
function ok(cond, msg) {
  if (cond) { passed++; } else { failed++; console.log('  FAIL:', msg); }
}
function approx(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ${b}±${eps})`); }

// ---- presets sanity ----
ok(FINGER_PRESETS.length >= 4, 'has presets');
ok(FINGER_PRESETS.every((p) => p.id && p.name && Array.isArray(p.held) && Array.isArray(p.pattern) && p.pattern.length > 0), 'preset shape valid');

// ---- buildEvents ----
{
  const ev = buildEvents([
    { note: 60, type: 'on', time: 100 },
    { note: 67, type: 'on', time: 50 },
    { note: 'x', type: 'on', time: 0 },     // filtered (note not number)
    { note: 67, type: 'bogus', time: 10 },  // filtered (bad type)
    { note: 67, type: 'off', time: 80 },
  ]);
  ok(ev.length === 3, 'buildEvents filters bad entries');
  ok(ev[0].time === 50 && ev[1].time === 80 && ev[2].time === 100, 'buildEvents sorts by time');
}

// ---- perfect run: hold C+E, tap G four times, hold never lifts ----
{
  const held = [60, 64], pattern = [67, 67, 67, 67];
  const events = [
    { note: 60, type: 'on', time: 0 },
    { note: 64, type: 'on', time: 5 },
    { note: 67, type: 'on', time: 100 }, { note: 67, type: 'off', time: 150 },
    { note: 67, type: 'on', time: 200 }, { note: 67, type: 'off', time: 250 },
    { note: 67, type: 'on', time: 300 }, { note: 67, type: 'off', time: 350 },
    { note: 67, type: 'on', time: 400 }, { note: 67, type: 'off', time: 450 },
    { note: 64, type: 'off', time: 500 },
    { note: 60, type: 'off', time: 505 },
  ];
  const r = evaluateIndependence(events, { held, pattern });
  ok(r.taps === 4, 'perfect: 4 moving taps');
  ok(r.sustainHits === 4, 'perfect: all 4 sustained');
  ok(r.sustainRate === 1, 'perfect: sustainRate 1');
  ok(r.correctNotes === 4 && r.patternAccuracy === 1, 'perfect: pattern accuracy 1');
  ok(r.slips === 0, 'perfect: no slips');
  ok(r.score === 100, 'perfect: score 100');
  ok(r.heldDownAtTap.every(Boolean), 'perfect: heldDownAtTap all true');
}

// ---- held note lifts mid-way: sustain hurts ----
{
  const held = [60, 64], pattern = [67, 67, 67, 67];
  const events = [
    { note: 60, type: 'on', time: 0 },
    { note: 64, type: 'on', time: 5 },
    { note: 67, type: 'on', time: 100 }, { note: 67, type: 'off', time: 150 },
    { note: 64, type: 'off', time: 160 },   // SLIP: E lifted early
    { note: 67, type: 'on', time: 200 }, { note: 67, type: 'off', time: 250 }, // E not down -> miss
    { note: 67, type: 'on', time: 300 }, { note: 67, type: 'off', time: 350 }, // E not down -> miss
    { note: 67, type: 'on', time: 400 }, { note: 67, type: 'off', time: 450 }, // E not down -> miss
    { note: 60, type: 'off', time: 505 },
  ];
  const r = evaluateIndependence(events, { held, pattern });
  ok(r.taps === 4, 'slip: still 4 taps');
  ok(r.sustainHits === 1, 'slip: only first tap fully sustained');
  approx(r.sustainRate, 0.25, 1e-9, 'slip: sustainRate 0.25');
  ok(r.slips === 1, 'slip: 1 slip counted');
  ok(r.patternAccuracy === 1, 'slip: pattern still correct');
  // score = 100*(0.6*0.25 + 0.4*1) = 100*(0.15+0.4)=55
  ok(r.score === 55, 'slip: score 55');
}

// ---- wrong moving notes: pattern accuracy hurts ----
{
  const held = [60], pattern = [67, 69, 67, 69];
  const events = [
    { note: 60, type: 'on', time: 0 },
    { note: 67, type: 'on', time: 100 }, { note: 67, type: 'off', time: 150 }, // correct
    { note: 71, type: 'on', time: 200 }, { note: 71, type: 'off', time: 250 }, // wrong (want 69)
    { note: 67, type: 'on', time: 300 }, { note: 67, type: 'off', time: 350 }, // correct
    { note: 72, type: 'on', time: 400 }, { note: 72, type: 'off', time: 450 }, // wrong (want 69)
    { note: 60, type: 'off', time: 500 },
  ];
  const r = evaluateIndependence(events, { held, pattern });
  ok(r.taps === 4, 'wrong: 4 taps');
  ok(r.correctNotes === 2, 'wrong: 2 correct');
  approx(r.patternAccuracy, 0.5, 1e-9, 'wrong: patternAccuracy 0.5');
  ok(r.sustainRate === 1, 'wrong: held C stayed down (sustainRate 1)');
  // score = 100*(0.6*1 + 0.4*0.5) = 80
  ok(r.score === 80, 'wrong: score 80');
}

// ---- pattern loops across reps ----
{
  const held = [60], pattern = [67, 69];
  // play 67,69,67,69 (two reps) all correct
  const events = [
    { note: 60, type: 'on', time: 0 },
    { note: 67, type: 'on', time: 100 },
    { note: 69, type: 'on', time: 200 },
    { note: 67, type: 'on', time: 300 },
    { note: 69, type: 'on', time: 400 },
  ];
  const r = evaluateIndependence(events, { held, pattern: [67, 69, 67, 69] });
  ok(r.correctNotes === 4 && r.patternAccuracy === 1, 'loop: all correct across reps');
}

// ---- no held notes -> sustainRate 1 ----
{
  const r = evaluateIndependence([
    { note: 67, type: 'on', time: 0 },
    { note: 69, type: 'on', time: 100 },
  ], { held: [], pattern: [67, 69] });
  ok(r.sustainRate === 1, 'no held: sustainRate 1');
  ok(r.taps === 2, 'no held: taps counted');
}

// ---- empty input ----
{
  const r = evaluateIndependence([], { held: [60], pattern: [67] });
  ok(r.taps === 0 && r.score === 0, 'empty: zero taps and score');
}

// ---- Trainer: auto-finish on targetTaps ----
{
  const tr = new FingerIndependenceTrainer({ held: [60, 64], pattern: [67, 69], reps: 2 });
  ok(tr.targetTaps === 4, 'trainer targetTaps = pattern*reps');
  let events = 0, completes = 0, result = null;
  tr.onEvent = () => { events++; };
  tr.onComplete = (r) => { completes++; result = r; };
  // press held first (do not count as moving)
  tr.noteOn(60, 0); tr.noteOn(64, 5);
  ok(tr.progress === 0, 'held presses do not advance progress');
  // moving taps
  ok(tr.noteOn(67, 100) === null, 'tap1 null');
  tr.noteOff(67, 150);
  ok(tr.noteOn(69, 200) === null, 'tap2 null');
  tr.noteOff(69, 250);
  ok(tr.noteOn(67, 300) === null, 'tap3 null');
  tr.noteOff(67, 350);
  const last = tr.noteOn(69, 400); // 4th moving tap -> finish
  ok(last !== null, 'tap4 finishes');
  ok(last.score === 100, 'trainer perfect score 100');
  ok(completes === 1, 'onComplete once');
  ok(tr.done && tr.progress === 4, 'trainer done at 4');
  ok(tr.rounds === 1 && tr.best === 100, 'rounds/best updated');
  ok(tr.noteOn(72, 500) === null, 'noteOn after done ignored');
}

// ---- Trainer: slip lowers score and best keeps max ----
{
  const tr = new FingerIndependenceTrainer({ held: [60], pattern: [67], reps: 2 });
  // round 1 perfect
  tr.noteOn(60, 0);
  tr.noteOn(67, 100); tr.noteOff(67, 150);
  const r1 = tr.noteOn(67, 200);
  ok(r1.score === 100, 'round1 perfect');
  tr.reset();
  // round 2: lift held before second tap
  tr.noteOn(60, 0);
  tr.noteOn(67, 100); tr.noteOff(67, 150);
  tr.noteOff(60, 160);  // slip
  const r2 = tr.noteOn(67, 200);
  ok(r2.slips === 1, 'round2 slip detected');
  ok(r2.score < 100, 'round2 lower score');
  ok(tr.best === 100, 'best stays 100');
  ok(tr.rounds === 2, 'rounds = 2');
}

// ---- Trainer: resetAll ----
{
  const tr = new FingerIndependenceTrainer({ held: [60], pattern: [67], reps: 1 });
  tr.noteOn(60, 0); tr.noteOn(67, 100);
  ok(tr.rounds === 1 && tr.best === 100, 'pre-resetAll');
  tr.resetAll();
  ok(tr.rounds === 0 && tr.best === 0 && tr.events.length === 0 && tr.progress === 0 && tr.lastResult === null, 'resetAll clears');
}

console.log(`finger-independence: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
