/**
 * hands-sync.test.mjs — 双手协调练习单元测试
 * 运行：node js/hands-sync.test.mjs
 */
import {
  DEFAULT_SPLIT, handOf, clusterByTime, evalBeat, spreadScore, HandsSync,
} from './hands-sync.js';

let pass = 0, fail = 0;
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error('  ✗', msg); } }
function eq(a, b, msg) { ok(a === b, `${msg} (期望 ${b}，实际 ${a})`); }

// ---- handOf ----
eq(DEFAULT_SPLIT, 60, '默认分割 60');
eq(handOf(48), 'L', 'C3 左手');
eq(handOf(59), 'L', 'B3 左手');
eq(handOf(60), 'R', 'C4 右手（含界）');
eq(handOf(72), 'R', 'C5 右手');
eq(handOf(55, 60), 'L', '自定义分割：G3 左');
eq(handOf(64, 60), 'R', '自定义分割：E4 右');

// ---- clusterByTime ----
{
  const ev = [
    { t: 0, note: 48 }, { t: 10, note: 72 },     // 拍1
    { t: 500, note: 50 }, { t: 520, note: 74 },  // 拍2
    { t: 1000, note: 52 },                        // 拍3
  ];
  const cl = clusterByTime(ev, 250);
  eq(cl.length, 3, '聚成 3 拍');
  eq(cl[0].length, 2, '拍1 两音');
  eq(cl[1].length, 2, '拍2 两音');
  eq(cl[2].length, 1, '拍3 一音');
}
{
  eq(clusterByTime([], 250).length, 0, '空事件 0 簇');
  const cl = clusterByTime([{ t: 0, note: 60 }], 250);
  eq(cl.length, 1, '单事件 1 簇');
}
{
  // 边界：恰好等于 window 不分裂（需 > window 才分）
  const cl = clusterByTime([{ t: 0, note: 48 }, { t: 250, note: 72 }], 250);
  eq(cl.length, 1, '间隔=window 仍同拍');
  const cl2 = clusterByTime([{ t: 0, note: 48 }, { t: 251, note: 72 }], 250);
  eq(cl2.length, 2, '间隔>window 分拍');
}

// ---- evalBeat ----
{
  const e = evalBeat([{ t: 0, note: 48 }, { t: 20, note: 72 }]);
  ok(e.hasLeft && e.hasRight && e.bothHands, '双手齐');
  eq(e.spread, 20, 'spread=20');
  eq(e.size, 2, 'size=2');
}
{
  const e = evalBeat([{ t: 0, note: 72 }, { t: 5, note: 76 }]); // 都是右手
  ok(!e.hasLeft && e.hasRight && !e.bothHands, '只有右手');
}
{
  const e = evalBeat([{ t: 0, note: 48 }, { t: 5, note: 52 }]); // 都是左手
  ok(e.hasLeft && !e.hasRight && !e.bothHands, '只有左手');
}
{
  const e = evalBeat([]);
  eq(e.spread, 0, '空拍 spread 0');
  ok(!e.bothHands, '空拍非双手');
}

// ---- spreadScore ----
eq(spreadScore(0), 100, 'spread 0 满分');
eq(spreadScore(30), 100, 'spread=tight 满分');
eq(spreadScore(200), 0, 'spread=loose 0 分');
eq(spreadScore(300), 0, 'spread>loose 0 分');
eq(spreadScore(115), 50, 'spread 中点 50 分');
ok(spreadScore(60) > 0 && spreadScore(60) < 100, 'spread 60 中间分');

// ---- HandsSync 基本：双手整齐 ----
{
  const hs = new HandsSync({ windowMs: 250, beats: 0 });
  hs.feed(48, 0);    // 左
  hs.feed(72, 15);   // 右（同拍，spread 15<tight）
  const r = hs.finish();
  ok(r.bothHands, '双手到齐');
  eq(r.score, 100, '整齐 100 分');
  eq(hs.goodBeats, 1, 'goodBeats 1');
  eq(hs.attempts, 1, 'attempts 1');
  eq(hs.streak, 1, 'streak 1');
}

// ---- 自动结算：跨窗触发上一拍 ----
{
  const hs = new HandsSync({ windowMs: 250, beats: 0 });
  hs.feed(48, 0);
  hs.feed(72, 20);
  const r = hs.feed(50, 400); // 间隔 380>250 → 结算拍1
  ok(r.flushed && r.flushed.bothHands, '跨窗结算拍1双手');
  eq(hs.attempts, 1, '结算 1 拍');
  hs.feed(74, 410); // 拍2 右
  hs.finish();
  eq(hs.attempts, 2, '共 2 拍');
  eq(hs.goodBeats, 2, '两拍都双手');
}

// ---- 只有一只手：不算 good，分 0，连击清零 ----
{
  const hs = new HandsSync({ windowMs: 250, beats: 0 });
  hs.feed(48, 0); hs.feed(50, 10); // 都左手
  const r = hs.finish();
  ok(!r.bothHands, '单手拍');
  eq(r.score, 0, '单手 0 分');
  eq(hs.goodBeats, 0, 'goodBeats 0');
  eq(hs.streak, 0, 'streak 0');
}

// ---- 连击与最佳 ----
{
  const hs = new HandsSync({ windowMs: 250, beats: 0 });
  // 拍1 双手
  hs.feed(48, 0); hs.feed(72, 10); hs.feed(48, 400);
  // 拍2 双手
  hs.feed(72, 410); hs.feed(48, 800);
  // 拍3 单手（只左）
  hs.feed(50, 810); hs.feed(48, 1200);
  // 拍4 双手
  hs.feed(72, 1210); hs.finish();
  eq(hs.attempts, 4, '4 拍');
  eq(hs.goodBeats, 3, '3 拍双手');
  eq(hs.best, 2, '最佳连击 2（拍1-2）');
  eq(hs.streak, 1, '当前连击 1（拍4）');
}

// ---- 松散 spread 降分 ----
{
  const hs = new HandsSync({ windowMs: 250, tightMs: 30, looseMs: 200 });
  hs.feed(48, 0); hs.feed(72, 115); // spread 115 → 50 分
  const r = hs.finish();
  eq(r.spread, 115, 'spread 115');
  eq(r.score, 50, '松散 50 分');
}

// ---- avgScore / bothHandsRate ----
{
  const hs = new HandsSync({ windowMs: 250, beats: 0 });
  hs.feed(48, 0); hs.feed(72, 10); hs.feed(48, 400);  // 拍1 100
  hs.feed(50, 410);                                     // 拍2 单手 0
  hs.finish();
  eq(hs.attempts, 2, '2 拍');
  eq(hs.avgScore, 50, '平均 (100+0)/2=50');
  ok(Math.abs(hs.bothHandsRate - 0.5) < 1e-9, '双手率 0.5');
}

// ---- beats 完成回调 ----
{
  const hs = new HandsSync({ windowMs: 250, beats: 2 });
  let completed = null, beatCount = 0;
  hs.onComplete = (info) => { completed = info; };
  hs.onBeat = () => beatCount++;
  hs.feed(48, 0); hs.feed(72, 10);      // pending 拍1
  hs.feed(48, 400); hs.feed(72, 410);   // 结算拍1，pending 拍2
  hs.feed(48, 800);                      // 结算拍2 → 完成
  ok(completed !== null, '完成回调触发');
  eq(completed.attempts, 2, '完成时 2 拍');
  eq(beatCount, 2, 'onBeat 触发 2 次');
}

// ---- 自定义分割点 ----
{
  const hs = new HandsSync({ split: 64, windowMs: 250 }); // E4 分界
  hs.feed(60, 0);  // C4 < 64 → 左
  hs.feed(67, 10); // G4 >= 64 → 右
  const r = hs.finish();
  ok(r.bothHands, '自定义分割双手判定');
}

// ---- reset ----
{
  const hs = new HandsSync({ windowMs: 250 });
  hs.feed(48, 0); hs.feed(72, 10); hs.finish();
  hs.reset();
  eq(hs.attempts, 0, 'reset attempts');
  eq(hs.goodBeats, 0, 'reset goodBeats');
  eq(hs.results.length, 0, 'reset results');
  eq(hs.streak, 0, 'reset streak');
}

console.log(`hands-sync: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
