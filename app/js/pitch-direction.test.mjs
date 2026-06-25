import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PD_LEVELS, levelById, dirName, generatePrompt, judgeDirection, PitchDirection,
} from './pitch-direction.js';

// ---- levels ----
test('PD_LEVELS has 4 levels with required fields, decreasing minGap', () => {
  assert.equal(PD_LEVELS.length, 4);
  let prev = Infinity;
  for (const l of PD_LEVELS) {
    assert.ok(l.id && l.name);
    assert.ok(l.minGap >= 1);
    assert.ok(l.refLo < l.refHi);
    assert.ok(l.minGap <= prev); // 难度递增 → minGap 递减
    prev = l.minGap;
  }
});

test('levelById finds / falls back to first', () => {
  assert.equal(levelById('third').id, 'third');
  assert.equal(levelById('nope').id, PD_LEVELS[0].id);
});

// ---- dirName ----
test('dirName maps direction', () => {
  assert.ok(dirName('up').includes('更高'));
  assert.ok(dirName('down').includes('更低'));
});

// ---- generatePrompt ----
test('generatePrompt up leaves room for a higher legal note', () => {
  const lv = levelById('octave');
  for (let i = 0; i < 50; i++) {
    const p = generatePrompt(lv, () => 0.2); // rng<0.5 -> up
    assert.equal(p.dir, 'up');
    assert.ok(p.ref + lv.minGap <= 108, `ref ${p.ref} + gap ${lv.minGap} <= 108`);
  }
});

test('generatePrompt down leaves room for a lower legal note', () => {
  const lv = levelById('octave');
  for (let i = 0; i < 50; i++) {
    const p = generatePrompt(lv, () => 0.8); // rng>=0.5 -> down
    assert.equal(p.dir, 'down');
    assert.ok(p.ref - lv.minGap >= 21, `ref ${p.ref} - gap ${lv.minGap} >= 21`);
  }
});

test('generatePrompt ref within level range', () => {
  const lv = levelById('step');
  let up = 0, down = 0;
  for (let i = 0; i < 200; i++) {
    const p = generatePrompt(lv, Math.random);
    assert.ok(p.minGap === lv.minGap);
    if (p.dir === 'up') up++; else down++;
  }
  assert.ok(up > 0 && down > 0); // both directions appear
});

// ---- judgeDirection ----
test('correct when higher and far enough (up)', () => {
  const j = judgeDirection(60, 72, 'up', 12);
  assert.ok(j.correct);
  assert.equal(j.gap, 12);
  assert.ok(j.rightDir && j.enough);
});

test('wrong direction fails even if far', () => {
  const j = judgeDirection(60, 48, 'up', 5);
  assert.equal(j.correct, false);
  assert.equal(j.rightDir, false);
});

test('right direction but too small fails', () => {
  const j = judgeDirection(60, 62, 'up', 5);
  assert.equal(j.correct, false);
  assert.equal(j.rightDir, true);
  assert.equal(j.enough, false);
});

test('correct lower (down)', () => {
  const j = judgeDirection(60, 53, 'down', 7);
  assert.ok(j.correct);
  assert.equal(j.gap, -7);
});

test('exactly at minGap counts (boundary inclusive)', () => {
  assert.ok(judgeDirection(60, 64, 'up', 4).correct);
  assert.ok(judgeDirection(60, 56, 'down', 4).correct);
});

test('same note fails (no direction)', () => {
  const j = judgeDirection(60, 60, 'up', 1);
  assert.equal(j.correct, false);
  assert.equal(j.gap, 0);
});

// ---- PitchDirection state machine ----
test('lifecycle idle -> playing -> answer -> right, streak grows', () => {
  const g = new PitchDirection({ level: levelById('octave'), rng: () => 0.2 }); // always up
  assert.equal(g.state, 'idle');
  const p = g.next();
  assert.equal(g.state, 'playing');
  assert.ok(p.dir === 'up');
  g.ready();
  assert.equal(g.state, 'answer');
  const j = g.answer(p.ref + 12);
  assert.ok(j.correct);
  assert.equal(g.state, 'right');
  assert.equal(g.streak, 1);
  assert.equal(g.best, 1);
  assert.equal(g.attempts, 1);
  assert.equal(g.correct, 1);
});

test('wrong answer resets streak, keeps best', () => {
  const g = new PitchDirection({ level: levelById('fifth'), rng: () => 0.2 }); // up
  g.next(); g.ready(); g.answer(g.prompt.ref + 7); // correct, streak1
  g.next(); g.ready(); g.answer(g.prompt.ref + 7); // correct, streak2
  assert.equal(g.streak, 2); assert.equal(g.best, 2);
  g.next(); g.ready(); g.answer(g.prompt.ref - 1); // wrong dir
  assert.equal(g.state, 'wrong');
  assert.equal(g.streak, 0);
  assert.equal(g.best, 2);
});

test('answer only valid in answer state', () => {
  const g = new PitchDirection({ level: levelById('third'), rng: () => 0.2 });
  assert.equal(g.answer(80), null);  // idle
  g.next();
  assert.equal(g.answer(80), null);  // playing
  g.ready();
  assert.notEqual(g.answer(g.prompt.ref + 4), null); // answer
});

test('accuracy computed correctly', () => {
  const g = new PitchDirection({ level: levelById('octave'), rng: () => 0.2 });
  g.next(); g.ready(); g.answer(g.prompt.ref + 12); // correct
  g.next(); g.ready(); g.answer(g.prompt.ref - 1);  // wrong
  assert.ok(Math.abs(g.accuracy() - 0.5) < 1e-9);
});

test('setLevel affects next prompt minGap', () => {
  const g = new PitchDirection({ level: levelById('octave'), rng: () => 0.2 });
  g.setLevel(levelById('step'));
  const p = g.next();
  assert.equal(p.minGap, 2);
});

test('reset clears everything', () => {
  const g = new PitchDirection({ level: levelById('fifth'), rng: () => 0.2 });
  g.next(); g.ready(); g.answer(g.prompt.ref + 7);
  g.reset();
  assert.equal(g.state, 'idle');
  assert.equal(g.streak, 0);
  assert.equal(g.best, 0);
  assert.equal(g.attempts, 0);
  assert.equal(g.correct, 0);
  assert.equal(g.prompt, null);
  assert.equal(g.lastJudge, null);
});
