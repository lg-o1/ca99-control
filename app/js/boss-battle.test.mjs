import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSSES, getBoss, nameToMidi, BossBattle } from './boss-battle.js';

test('nameToMidi 中央 C=60', () => {
  assert.equal(nameToMidi('C4'), 60);
  assert.equal(nameToMidi('A4'), 69);
  assert.equal(nameToMidi('C5'), 72);
  assert.equal(nameToMidi('B3'), 59);
});

test('BOSSES 结构合法', () => {
  assert.ok(BOSSES.length >= 3);
  BOSSES.forEach((b) => {
    assert.ok(b.id && b.name && b.emoji);
    assert.ok(b.hp > 0 && b.reps > 0);
    assert.ok(Array.isArray(b.passage) && b.passage.length >= 3);
  });
  assert.equal(getBoss('golem').id, 'golem');
  assert.equal(getBoss('nope').id, BOSSES[0].id); // 回退
});

test('press 弹对推进、完成乐句削血', () => {
  const g = new BossBattle({ boss: 'slime' }); // passage C D E, hp 50, reps 3 → 17/pass
  assert.equal(g.current(), 60);
  let r = g.press(60); assert.ok(r.hit && !r.passageDone); assert.equal(g.current(), 62);
  r = g.press(62); assert.ok(r.hit && !r.passageDone);
  r = g.press(64); assert.ok(r.hit && r.passageDone); // 完成一遍
  assert.equal(r.dmg, 17);
  assert.equal(g.hp, 33);
  assert.equal(g.idx, 0);
  assert.equal(g.current(), 60); // 回到乐句开头
});

test('三遍干净通关 → defeated + 3 星', () => {
  const g = new BossBattle({ boss: 'slime' });
  for (let p = 0; p < 3; p++) { g.press(60); g.press(62); g.press(64); }
  assert.equal(g.defeated, true);
  assert.equal(g.hp, 0);
  assert.equal(g.cleanPasses, 3);
  assert.equal(g.hearts, 3);
  assert.equal(g.stars(), 3);
});

test('弹错扣心、乐句从头、已削血保留', () => {
  const g = new BossBattle({ boss: 'slime' });
  g.press(60); g.press(62); g.press(64); // 一遍 clean，hp 33
  g.press(60);
  const r = g.press(99); // 错音
  assert.ok(r.miss && !r.failed);
  assert.equal(g.hearts, 2);
  assert.equal(g.idx, 0);        // 回到乐句头
  assert.equal(g.hp, 33);        // 血没回
  assert.equal(g.combo, 0);
});

test('忽略八度：高低八度同名键算对', () => {
  const g = new BossBattle({ boss: 'slime', octaveAgnostic: true });
  assert.ok(g.press(72).hit); // C5 当 C4
  assert.ok(g.press(50).hit); // D3 当 D4
});

test('精确八度模式：错八度算错', () => {
  const g = new BossBattle({ boss: 'slime', octaveAgnostic: false });
  const r = g.press(72); // C5 != C4
  assert.ok(r.miss);
  assert.equal(g.hearts, 2);
});

test('掉光心 → failed，之后按键无效', () => {
  const g = new BossBattle({ boss: 'slime', hearts: 2 });
  g.press(1); g.press(1);
  assert.equal(g.failed, true);
  assert.equal(g.current(), null);
  const r = g.press(60);
  assert.equal(r.ok, false);
});

test('带伤通关评 2 星 / 1 星', () => {
  const g = new BossBattle({ boss: 'slime', hearts: 5 });
  g.press(99); // 掉 1 心
  for (let p = 0; p < 3; p++) { g.press(60); g.press(62); g.press(64); }
  assert.equal(g.defeated, true);
  assert.equal(g.stars(), 2); // 掉 1 心

  const g2 = new BossBattle({ boss: 'slime', hearts: 5 });
  g2.press(99); g2.press(99); // 掉 2 心
  for (let p = 0; p < 3; p++) { g2.press(60); g2.press(62); g2.press(64); }
  assert.equal(g2.stars(), 1);
});

test('progress 血条比例', () => {
  const g = new BossBattle({ boss: 'slime' });
  assert.equal(g.progress(), 1);
  g.press(60); g.press(62); g.press(64);
  assert.ok(Math.abs(g.progress() - 33 / 50) < 1e-9);
});

test('revive 恢复满心并保留削血进度', () => {
  const g = new BossBattle({ boss: 'slime', hearts: 2 });
  // 完成一遍乐句削血
  g.press(60); g.press(62); g.press(64);
  const hpAfterPass = g.hp;
  // 弹错耗尽两颗心 → failed
  g.press(61); g.press(61);
  assert.equal(g.failed, true);
  assert.equal(g.hearts, 0);
  // 复活
  g.revive();
  assert.equal(g.failed, false);
  assert.equal(g.hearts, g.maxHearts);
  assert.equal(g.hp, hpAfterPass); // 削过的血保留
  assert.equal(g.current(), 60);   // 从乐句开头继续
});

