/** dynamics-trainer.test.mjs — 力度练习纯逻辑单元测试 */
import {
  DYNAMICS, velocityToIndex, velocityToDynamic, indexByKey,
  DEFAULT_LEVELS, DynamicsGame,
} from './dynamics-trainer.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A === B) { pass++; } else { fail++; console.error(`FAIL ${msg}: ${A} !== ${B}`); }
}
function ok(c, msg) { if (c) { pass++; } else { fail++; console.error(`FAIL ${msg}`); } }
function seqRng(vals) { let i = 0; return () => vals[(i++) % vals.length]; }

// ---- DYNAMICS 表：无缝覆盖 1..127 ----
eq(DYNAMICS.length, 6, '6 档力度');
eq(DYNAMICS[0].min, 1, '最弱档从 1 开始');
eq(DYNAMICS[5].max, 127, '最强档到 127');
for (let i = 1; i < DYNAMICS.length; i++) {
  eq(DYNAMICS[i].min, DYNAMICS[i - 1].max + 1, `档 ${i} 与上一档无缝衔接`);
}

// ---- velocityToIndex ----
eq(velocityToIndex(1), 0, 'vel 1 -> pp');
eq(velocityToIndex(31), 0, 'vel 31 -> pp');
eq(velocityToIndex(32), 1, 'vel 32 -> p');
eq(velocityToIndex(67), 2, 'vel 67 -> mp');
eq(velocityToIndex(68), 3, 'vel 68 -> mf');
eq(velocityToIndex(100), 4, 'vel 100 -> f');
eq(velocityToIndex(127), 5, 'vel 127 -> ff');
eq(velocityToIndex(200), 5, '越上界夹到 ff');
eq(velocityToIndex(0), 0, '越下界夹到 pp');

// ---- velocityToDynamic / indexByKey ----
eq(velocityToDynamic(40).key, 'p', 'velocityToDynamic 40 = p');
eq(velocityToDynamic(120).sym, 'ff', 'velocityToDynamic 120 = ff');
eq(indexByKey('mf'), 3, 'indexByKey mf=3');
eq(indexByKey('ff'), 5, 'indexByKey ff=5');
eq(indexByKey('zzz'), -1, 'indexByKey 未知=-1');

// ---- DEFAULT_LEVELS ----
eq(DEFAULT_LEVELS, ['p', 'mf', 'f'], '默认三档');

// ---- DynamicsGame: 出题 ----
{
  const g = new DynamicsGame({ rng: seqRng([0]), levels: ['mf'] });
  eq(g.next(), 'mf', 'next 选中 mf');
  eq(g.target().sym, 'mf', 'target 对象');
}

// ---- check: 精确命中（tolerance 0）----
{
  const g = new DynamicsGame({ rng: seqRng([0]), levels: ['mf'], tolerance: 0 });
  g.next();
  let info = null;
  g.onResult = (c, i) => { info = i; };
  eq(g.check(75), true, 'vel75 命中 mf');
  eq(g.score, 1, 'score=1');
  eq(g.streak, 1, 'streak=1');
  eq(info.playedKey, 'mf', 'playedKey mf');
  eq(info.diff, 0, 'diff 0');

  eq(g.check(40), false, 'vel40 是 p，未命中 mf');
  eq(g.streak, 0, '答错 streak 归零');
  eq(g.score, 1, 'score 不变');
}

// ---- tolerance 1：相邻档也算对 ----
{
  const g = new DynamicsGame({ rng: seqRng([0]), levels: ['mf'], tolerance: 1 });
  g.next();
  eq(g.check(60), true, 'vel60(mp) 距 mf 1 档，容差内算对');
  eq(g.check(95), true, 'vel95(f) 距 mf 1 档，容差内算对');
  g.next(); // 重置 current 仍 mf
  eq(g.check(20), false, 'vel20(pp) 距 mf 3 档，超容差');
}

// ---- best 连击记录 ----
{
  const g = new DynamicsGame({ rng: seqRng([0]), levels: ['f'], tolerance: 0 });
  g.next(); g.check(90); // f
  g.next(); g.check(95); // f
  g.next(); g.check(100); // f
  eq(g.streak, 3, 'streak=3');
  eq(g.best, 3, 'best=3');
  g.next(); g.check(40); // 错
  eq(g.streak, 0, 'streak 归零');
  eq(g.best, 3, 'best 保持 3');
  eq(g.attempts, 4, 'attempts=4');
  eq(Math.round(g.accuracy * 100), 75, '正确率 3/4=75%');
}

// ---- check 无题目 ----
{
  const g = new DynamicsGame();
  eq(g.check(80), false, '没出题 check 返回 false');
}

// ---- reset ----
{
  const g = new DynamicsGame({ rng: seqRng([0]), levels: ['mf'] });
  g.next(); g.check(75);
  g.reset();
  eq(g.score, 0, 'reset score');
  eq(g.streak, 0, 'reset streak');
  eq(g.best, 0, 'reset best');
  eq(g.attempts, 0, 'reset attempts');
  eq(g.current, null, 'reset current');
}

// ---- 非法 levels 过滤 + 兜底 ----
{
  const g = new DynamicsGame({ levels: ['zzz', 'mf'] });
  eq(g.levels, ['mf'], '过滤掉非法档位');
  const g2 = new DynamicsGame({ levels: ['zzz'] });
  eq(g2.levels, DEFAULT_LEVELS, '全非法时回退默认');
  const g3 = new DynamicsGame({ levels: [] });
  eq(g3.levels, DEFAULT_LEVELS, '空集合回退默认');
}

// ---- 多档位随机选择 ----
{
  const g = new DynamicsGame({ rng: seqRng([0.99]), levels: ['pp', 'p', 'mf'] });
  eq(g.next(), 'mf', 'rng≈1 选最后一档');
}

console.log(`dynamics-trainer: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
