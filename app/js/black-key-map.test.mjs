import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pcOf, TASKS, taskById, BK_LEVELS, levelById, generateTask, judge, BlackKeyMap,
} from './black-key-map.js';

// ---- pcOf ----
test('pcOf maps midi to pitch class', () => {
  assert.equal(pcOf(60), 0);   // C4
  assert.equal(pcOf(61), 1);   // C#4
  assert.equal(pcOf(72), 0);   // C5
  assert.equal(pcOf(21), 9);   // A0
  assert.equal(pcOf(108), 0);  // C8
});

// ---- TASKS / taskById ----
test('TASKS have prompt + pcs, black groups map to right pitch classes', () => {
  assert.deepEqual(TASKS.two.pcs, [1, 3]);    // C#, D#
  assert.deepEqual(TASKS.three.pcs, [6, 8, 10]); // F#, G#, A#
  assert.deepEqual(TASKS.C.pcs, [0]);
  assert.deepEqual(TASKS.D.pcs, [2]);
  assert.deepEqual(TASKS.E.pcs, [4]);
  assert.deepEqual(TASKS.F.pcs, [5]);
  assert.deepEqual(TASKS.B.pcs, [11]);
  for (const k of Object.keys(TASKS)) assert.ok(TASKS[k].prompt && TASKS[k].landmark);
});

test('taskById falls back to two', () => {
  assert.equal(taskById('C').id, 'C');
  assert.equal(taskById('nope').id, 'two');
});

// ---- levels ----
test('BK_LEVELS has 4 levels; every task id valid', () => {
  assert.equal(BK_LEVELS.length, 4);
  for (const l of BK_LEVELS) {
    assert.ok(l.id && l.name && Array.isArray(l.tasks) && l.tasks.length >= 1);
    for (const t of l.tasks) assert.ok(TASKS[t], `task ${t} exists`);
  }
});

test('levelById finds / falls back to first', () => {
  assert.equal(levelById('whites').id, 'whites');
  assert.equal(levelById('nope').id, BK_LEVELS[0].id);
});

// ---- generateTask ----
test('generateTask returns a task from the level pool', () => {
  const lv = levelById('whites');
  for (let i = 0; i < 50; i++) {
    const t = generateTask(lv, null, Math.random);
    assert.ok(lv.tasks.includes(t.id));
  }
});

test('generateTask avoids immediate repeat when pool > 1', () => {
  const lv = levelById('groups'); // ['two','three']
  let calls = 0;
  const rng = () => (calls++ === 0 ? 0 : 0.9); // first->two, retry->three
  const t = generateTask(lv, 'two', rng);
  assert.notEqual(t.id, 'two');
});

test('generateTask returns the single task when pool has one', () => {
  const lv = { id: 'x', name: 'x', tasks: ['D'] };
  assert.equal(generateTask(lv, 'D', Math.random).id, 'D');
});

// ---- judge (octave-independent) ----
test('judge accepts any octave of a matching pitch class', () => {
  assert.ok(judge(TASKS.C, 60).correct);  // C4
  assert.ok(judge(TASKS.C, 72).correct);  // C5
  assert.ok(judge(TASKS.C, 24).correct);  // C1
  assert.equal(judge(TASKS.C, 62).correct, false); // D4
});

test('judge two-group accepts C# or D# in any octave', () => {
  assert.ok(judge(TASKS.two, 61).correct);   // C#4
  assert.ok(judge(TASKS.two, 63).correct);   // D#4
  assert.ok(judge(TASKS.two, 73).correct);   // C#5
  assert.equal(judge(TASKS.two, 66).correct, false); // F#4 (belongs to 3-group)
});

test('judge three-group accepts F#/G#/A#', () => {
  assert.ok(judge(TASKS.three, 66).correct); // F#4
  assert.ok(judge(TASKS.three, 68).correct); // G#4
  assert.ok(judge(TASKS.three, 70).correct); // A#4
  assert.equal(judge(TASKS.three, 61).correct, false); // C#4 (2-group)
});

test('judge returns the played pitch class', () => {
  assert.equal(judge(TASKS.D, 62).pc, 2);
});

// ---- BlackKeyMap state machine ----
test('lifecycle idle -> ask -> right, streak grows', () => {
  const g = new BlackKeyMap({ level: levelById('cd'), rng: () => 0.1 }); // pool ['C','D'], rng->'C'
  assert.equal(g.state, 'idle');
  const t = g.next();
  assert.equal(g.state, 'ask');
  assert.ok(['C', 'D'].includes(t.id));
  // play a correct key for this task (first legal pc in octave 4)
  const midi = 60 + t.pcs[0];
  const j = g.answer(midi);
  assert.ok(j.correct);
  assert.equal(g.state, 'right');
  assert.equal(g.streak, 1);
  assert.equal(g.best, 1);
  assert.equal(g.attempts, 1);
  assert.equal(g.correct, 1);
});

test('wrong answer resets streak, keeps best', () => {
  const g = new BlackKeyMap({ level: levelById('cd'), rng: () => 0.1 });
  let t = g.next(); g.answer(60 + t.pcs[0]);   // correct streak1
  t = g.next(); g.answer(60 + t.pcs[0]);        // correct streak2
  assert.equal(g.streak, 2); assert.equal(g.best, 2);
  t = g.next();
  // play a definitely-wrong key (a pc not in the answer set)
  const wrongPc = t.pcs.includes(1) ? 0 : 1;
  const j = g.answer(60 + wrongPc);
  assert.equal(j.correct, false);
  assert.equal(g.state, 'wrong');
  assert.equal(g.streak, 0);
  assert.equal(g.best, 2);
});

test('answer only valid in ask state', () => {
  const g = new BlackKeyMap({ level: levelById('cd'), rng: () => 0.1 });
  assert.equal(g.answer(60), null);  // idle
  const t = g.next();
  assert.notEqual(g.answer(60 + t.pcs[0]), null); // ask -> grades
  assert.equal(g.answer(60), null);  // now in right/wrong, not ask
});

test('accuracy computed correctly', () => {
  const g = new BlackKeyMap({ level: levelById('cd'), rng: () => 0.1 });
  let t = g.next(); g.answer(60 + t.pcs[0]);            // correct
  t = g.next(); g.answer(60 + (t.pcs.includes(1) ? 0 : 1)); // wrong
  assert.ok(Math.abs(g.accuracy() - 0.5) < 1e-9);
});

test('setLevel affects next task pool', () => {
  const g = new BlackKeyMap({ level: levelById('cd'), rng: () => 0.1 });
  g.setLevel(levelById('groups'));
  const t = g.next();
  assert.ok(['two', 'three'].includes(t.id));
});

test('reset clears everything', () => {
  const g = new BlackKeyMap({ level: levelById('cd'), rng: () => 0.1 });
  const t = g.next(); g.answer(60 + t.pcs[0]);
  g.reset();
  assert.equal(g.state, 'idle');
  assert.equal(g.streak, 0);
  assert.equal(g.best, 0);
  assert.equal(g.attempts, 0);
  assert.equal(g.correct, 0);
  assert.equal(g.task, null);
  assert.equal(g.lastJudge, null);
});
