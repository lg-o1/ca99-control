import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTIONS, REACTIONS, sectionAt, dynamicLevel, reactionFor,
  ConcertSim, finaleMessage,
} from './concert-sim.js';

test('SECTIONS cover 0..1 contiguously', () => {
  assert.equal(SECTIONS[0].lo, 0);
  for (let i = 1; i < SECTIONS.length; i++) assert.equal(SECTIONS[i].lo, SECTIONS[i - 1].hi);
});

test('sectionAt maps progress to section', () => {
  assert.equal(sectionAt(0).id, 'intro');
  assert.equal(sectionAt(0.3).id, 'verse');
  assert.equal(sectionAt(0.6).id, 'chorus');
  assert.equal(sectionAt(0.95).id, 'outro');
  assert.equal(sectionAt(1).id, 'outro');
});

test('dynamicLevel normalizes velocity', () => {
  assert.equal(dynamicLevel(0), 0);
  assert.equal(dynamicLevel(127), 1);
  assert.ok(Math.abs(dynamicLevel(64) - 0.5) < 0.02);
  assert.equal(dynamicLevel(999), 1);
});

test('reactionFor escalates with heat', () => {
  assert.equal(reactionFor(0).id, 'quiet');
  assert.equal(reactionFor(0.4).id, 'nod');
  assert.equal(reactionFor(0.6).id, 'clap');
  assert.equal(reactionFor(0.8).id, 'cheer');
  assert.equal(reactionFor(0.95).id, 'standing');
});

test('REACTIONS thresholds are ascending', () => {
  for (let i = 1; i < REACTIONS.length; i++) assert.ok(REACTIONS[i].min > REACTIONS[i - 1].min);
});

test('note returns section and reaction', () => {
  const sim = new ConcertSim();
  const r = sim.note(100, 0.6); // chorus, strong
  assert.equal(r.section.id, 'chorus');
  assert.ok(r.heat > 0);
  assert.ok(r.reaction.id);
});

test('strong chorus playing yields hot reaction', () => {
  const sim = new ConcertSim({ smooth: 1 });
  let last;
  for (let i = 0; i < 5; i++) last = sim.note(120, 0.6);
  assert.ok(last.heat >= 0.7);
  assert.ok(['cheer', 'standing'].includes(last.reaction.id));
});

test('soft intro stays calm', () => {
  const sim = new ConcertSim({ smooth: 1 });
  const r = sim.note(20, 0.05);
  assert.ok(r.heat < 0.4);
  assert.ok(['quiet', 'nod'].includes(r.reaction.id));
});

test('peakHeat tracks the loudest moment', () => {
  const sim = new ConcertSim({ smooth: 1 });
  sim.note(30, 0.1);
  sim.note(127, 0.6);
  sim.note(20, 0.9);
  assert.ok(sim.peakHeat >= 0.7);
});

test('avgDynamic averages all notes', () => {
  const sim = new ConcertSim();
  sim.note(0, 0.1);
  sim.note(127, 0.6);
  assert.ok(Math.abs(sim.avgDynamic() - 0.5) < 0.02);
});

test('finale gives stars 1..5 and message', () => {
  const sim = new ConcertSim({ smooth: 1 });
  for (let i = 0; i < 6; i++) sim.note(120, 0.6);
  const f = sim.finale();
  assert.ok(f.stars >= 1 && f.stars <= 5);
  assert.ok(f.reaction.id);
  assert.ok(f.message.length > 0);
});

test('weak whole performance still gives at least 1 star', () => {
  const sim = new ConcertSim({ smooth: 1 });
  sim.note(5, 0.1);
  const f = sim.finale();
  assert.ok(f.stars >= 1);
});

test('finaleMessage covers all star levels', () => {
  for (let s = 1; s <= 5; s++) assert.ok(finaleMessage(s).length > 0);
});

test('reset clears state', () => {
  const sim = new ConcertSim();
  sim.note(100, 0.6);
  sim.reset();
  assert.equal(sim.notes, 0);
  assert.equal(sim.peakHeat, 0);
});
