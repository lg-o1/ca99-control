/**
 * articulation.test.mjs — 连奏/断奏控制引擎单元测试
 */
import {
  legatoRatio, classifyArticulation, legatoScore, staccatoScore, scoreFor, ArticulationTrainer,
} from './articulation.js';

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) passed++; else { failed++; console.log('FAIL: ' + msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (got ${a}, want ${b})`); }
function near(a, b, eps, msg) { ok(Math.abs(a - b) <= eps, `${msg} (got ${a}, want ~${b})`); }

// ---- legatoRatio ----
eq(legatoRatio(100, 100), 1, 'ratio equal = 1');
eq(legatoRatio(50, 100), 0.5, 'ratio half');
eq(legatoRatio(120, 100), 1.2, 'ratio overlap > 1');
eq(legatoRatio(100, 0), 0, 'ratio zero ioi = 0');
eq(legatoRatio(100, -5), 0, 'ratio neg ioi = 0');

// ---- classifyArticulation ----
eq(classifyArticulation(1.0), 'legato', 'classify 1.0 legato');
eq(classifyArticulation(0.9), 'legato', 'classify 0.9 legato');
eq(classifyArticulation(0.3), 'staccato', 'classify 0.3 staccato');
eq(classifyArticulation(0.45), 'staccato', 'classify 0.45 staccato');
eq(classifyArticulation(0.6), 'portato', 'classify 0.6 portato');

// ---- legatoScore ----
eq(legatoScore(0.9), 100, 'legatoScore 0.9 = 100');
eq(legatoScore(1.2), 100, 'legatoScore >0.9 = 100');
eq(legatoScore(0.3), 0, 'legatoScore 0.3 = 0');
eq(legatoScore(0.1), 0, 'legatoScore <0.3 = 0');
eq(legatoScore(0.6), 50, 'legatoScore 0.6 = 50');

// ---- staccatoScore ----
eq(staccatoScore(0.3), 100, 'staccatoScore 0.3 = 100');
eq(staccatoScore(0.1), 100, 'staccatoScore <0.3 = 100');
eq(staccatoScore(0.8), 0, 'staccatoScore 0.8 = 0');
eq(staccatoScore(1.0), 0, 'staccatoScore >0.8 = 0');
eq(staccatoScore(0.55), 50, 'staccatoScore 0.55 = 50');

// ---- scoreFor ----
eq(scoreFor(1.0, 'legato'), 100, 'scoreFor legato 1.0');
eq(scoreFor(0.2, 'staccato'), 100, 'scoreFor staccato 0.2');
eq(scoreFor(1.0, 'staccato'), 0, 'scoreFor staccato 1.0 = 0');

// ---- ArticulationTrainer: construction ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 4 });
  eq(a.target, 'legato', 'init target legato');
  eq(a.notes, 4, 'init notes 4');
  eq(a.count, 0, 'init count 0');
  eq(a.done, false, 'init not done');
  eq(a.avgScore, 0, 'init avg 0');
  eq(a.best, 0, 'init best 0');
}

// ---- defaults ----
{
  const a = new ArticulationTrainer();
  eq(a.target, 'legato', 'default target');
  eq(a.notes, 8, 'default notes 8');
}

// ---- perfect legato run ----
{
  // notes connected: each duration ~= IOI. IOI = 200ms, duration = 190ms (ratio 0.95)
  const a = new ArticulationTrainer({ target: 'legato', notes: 3 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  // 4 notes to evaluate 3 (last has no IOI)
  // note 60 on@0 off@190; note 62 on@200 off@390; note 64 on@400 off@590; note 65 on@600
  a.noteOn(60, 0);
  a.noteOff(60, 190);
  a.noteOn(62, 200);   // sets note60.ioi=200 -> ratio 0.95 -> finalize note60
  a.noteOff(62, 390);
  a.noteOn(64, 400);   // note62.ioi=200 -> ratio 0.95 -> finalize note62
  a.noteOff(64, 590);
  a.noteOn(65, 600);   // note64.ioi=200 -> ratio 0.95 -> finalize note64 -> 3 done
  eq(a.count, 3, 'legato counted 3');
  eq(a.done, true, 'legato done at 3');
  ok(completed !== null, 'onComplete fired');
  eq(completed.avgScore, 100, 'legato perfect avg 100');
  eq(a.best, 100, 'best 100');
  eq(a.runs, 1, 'runs 1');
}

// ---- perfect staccato run ----
{
  // short notes with gaps: IOI=200, duration=40 (ratio 0.2)
  const a = new ArticulationTrainer({ target: 'staccato', notes: 2 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  a.noteOn(60, 0); a.noteOff(60, 40);
  a.noteOn(62, 200); a.noteOff(62, 240);  // note60.ioi=200, ratio 0.2 -> 100
  a.noteOn(64, 400);                        // note62.ioi=200, ratio 0.2 -> 100, count 2 -> done
  eq(a.count, 2, 'staccato counted 2');
  eq(completed.avgScore, 100, 'staccato perfect avg 100');
  eq(completed.target, 'staccato', 'complete target staccato');
}

// ---- legato player but staccato target -> low score ----
{
  const a = new ArticulationTrainer({ target: 'staccato', notes: 2 });
  let completed = null;
  a.onComplete = (r) => { completed = r; };
  // connected playing: ratio ~1.0
  a.noteOn(60, 0); a.noteOff(60, 195);
  a.noteOn(62, 200); a.noteOff(62, 395);
  a.noteOn(64, 400);
  ok(completed.avgScore < 20, 'legato playing scores low on staccato target');
}

// ---- onNote callback ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 2 });
  const seen = [];
  a.onNote = (r) => seen.push({ note: r.note, score: r.score, art: r.articulation });
  a.noteOn(60, 0); a.noteOff(60, 190);
  a.noteOn(62, 200); a.noteOff(62, 390);
  a.noteOn(64, 400);
  eq(seen.length, 2, 'onNote fired twice');
  eq(seen[0].note, 60, 'first note 60');
  eq(seen[0].art, 'legato', 'first art legato');
}

// ---- note-off out of order / interleaved ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 2 });
  // overlapping legato: note60 still held when note62 starts
  a.noteOn(60, 0);
  a.noteOn(62, 200);     // note60.ioi = 200
  a.noteOff(60, 210);    // note60.duration = 210 -> ratio 1.05 -> finalize -> 100
  a.noteOn(64, 400);     // note62.ioi = 200
  a.noteOff(62, 410);    // note62.duration=210 -> ratio 1.05 -> finalize -> count 2 done
  eq(a.count, 2, 'interleaved counted 2');
  eq(a.avgScore, 100, 'interleaved legato 100');
}

// ---- ignore events after done ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 1 });
  a.noteOn(60, 0); a.noteOff(60, 190);
  a.noteOn(62, 200);  // finalize note60 -> count 1 -> done
  eq(a.done, true, 'done at 1');
  a.noteOn(64, 400);  // ignored
  a.noteOff(62, 400);
  eq(a.count, 1, 'count stays 1 after done');
}

// ---- finish() manual ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 8 });
  a.noteOn(60, 0); a.noteOff(60, 190);
  a.noteOn(62, 200); a.noteOff(62, 390);
  a.noteOn(64, 400);  // 2 notes evaluated, not yet 8
  eq(a.count, 2, 'count 2 before finish');
  eq(a.done, false, 'not auto done');
  a.finish();
  eq(a.done, true, 'finish sets done');
  eq(a.runs, 1, 'finish increments runs');
}

// ---- avgScore mixed ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 2 });
  // note1 ratio 0.95 -> 100, note2 ratio 0.6 -> 50
  a.noteOn(60, 0); a.noteOff(60, 190);
  a.noteOn(62, 200); a.noteOff(62, 320);  // duration 120, ioi will be 200 -> ratio 0.6
  a.noteOn(64, 400);
  eq(a.avgScore, 75, 'mixed avg (100+50)/2 = 75');
}

// ---- restart preserves best/runs ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 2 });
  a.noteOn(60, 0); a.noteOff(60, 190);
  a.noteOn(62, 200); a.noteOff(62, 390);
  a.noteOn(64, 400);
  eq(a.best, 100, 'best 100');
  eq(a.runs, 1, 'runs 1');
  a.restart();
  eq(a.count, 0, 'restart count 0');
  eq(a.done, false, 'restart not done');
  eq(a.best, 100, 'restart keeps best');
  eq(a.runs, 1, 'restart keeps runs');
}

// ---- duration never negative ----
{
  const a = new ArticulationTrainer({ target: 'legato', notes: 1 });
  a.noteOn(60, 100);
  a.noteOff(60, 50);  // off before on (shouldn't happen) -> duration clamped 0
  a.noteOn(62, 300);  // note60.ioi=200, duration 0 -> ratio 0 -> score 0
  eq(a.avgScore, 0, 'clamped duration gives ratio 0');
}

console.log(`articulation: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
