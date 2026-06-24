/**
 * score-follow.test.mjs — 曲谱跟弹引擎单元测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoreFollow, GRADE, SONGS, getSong, beatToMs, songFromMidi } from './score-follow.js';

// ---- beatToMs ----
test('beatToMs：1 拍在 60bpm 为 1000ms', () => {
  assert.equal(beatToMs(1, 60), 1000);
  assert.equal(beatToMs(2, 120), 1000);
  assert.equal(beatToMs(0, 90), 0);
});

// ---- 乐曲库 ----
test('SONGS 至少 4 首，字段齐全', () => {
  assert.ok(SONGS.length >= 4);
  for (const s of SONGS) {
    assert.ok(s.id && s.title && s.clef && s.bpm > 0);
    assert.ok(Array.isArray(s.seq) && s.seq.length > 0);
  }
});

test('getSong 按 id 取曲，未知 id 回退第一首', () => {
  assert.equal(getSong('ode').id, 'ode');
  assert.equal(getSong('不存在').id, SONGS[0].id);
});

// ---- 构建：拍 -> 毫秒，休止符不产生音符但推进时间 ----
test('构建音符：时间轴正确、休止符跳过', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [null, 1], [62, 2]] };
  const sf = new ScoreFollow(song);
  assert.equal(sf.total, 2);
  assert.equal(sf.notes[0].ms, 0);
  assert.equal(sf.notes[1].ms, 2000); // 1 拍音 + 1 拍休止 = 2 秒后
  assert.equal(sf.notes[1].durMs, 2000);
  assert.equal(sf.totalBeats, 4);
  assert.equal(sf.durationMs, 4000);
});

test('bpm 覆盖会缩放时间轴', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const slow = new ScoreFollow(song, { bpm: 60 });
  const fast = new ScoreFollow(song, { bpm: 120 });
  assert.equal(slow.notes[1].ms, 1000);
  assert.equal(fast.notes[1].ms, 500);
});

// ---- judge：PERFECT / GOOD / 时机偏差 ----
test('judge：正中目标时刻为 PERFECT', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const sf = new ScoreFollow(song, { perfectMs: 130, goodMs: 320 });
  const r = sf.judge(60, 0);
  assert.equal(r.grade, GRADE.PERFECT);
  assert.equal(r.note.midi, 60);
  assert.equal(sf.perfect, 1);
  assert.equal(sf.combo, 1);
});

test('judge：在 good 窗内但偏离为 GOOD', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const sf = new ScoreFollow(song, { perfectMs: 130, goodMs: 320 });
  const r = sf.judge(60, 200); // 偏 200ms，超过 perfect 130 但在 good 320 内
  assert.equal(r.grade, GRADE.GOOD);
  assert.equal(sf.good, 1);
});

test('judge：超出 good 窗或音高不符则不判定（grade=null）', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 320 });
  assert.equal(sf.judge(60, 1000).grade, null); // 太晚
  assert.equal(sf.judge(61, 0).grade, null);    // 音高不符
  assert.equal(sf.judgedCount, 0);
});

test('judge：选择时间上最近的匹配音符', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [60, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 1200 });
  const r = sf.judge(60, 900); // 距 0 是 900，距 1000 是 100 -> 选第二个
  assert.equal(r.note.i, 1);
});

test('judge：已判定的音符不会被重复命中', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const sf = new ScoreFollow(song);
  sf.judge(60, 0);
  const r = sf.judge(60, 0);
  assert.equal(r.grade, null);
  assert.equal(sf.perfect, 1);
});

// ---- octaveAgnostic ----
test('简单模式忽略八度', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const strict = new ScoreFollow(song, { octaveAgnostic: false });
  assert.equal(strict.judge(72, 0).grade, null);
  const easy = new ScoreFollow(song, { octaveAgnostic: true });
  assert.equal(easy.judge(72, 0).grade, GRADE.PERFECT);
});

// ---- expire / MISS / combo 断 ----
test('expire：过窗未弹判 MISS 并断连击', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 320 });
  sf.judge(60, 0);            // combo=1
  assert.equal(sf.combo, 1);
  const missed = sf.expire(2000); // 第二个音 ms=1000，2000-1000>320 -> miss
  assert.equal(missed.length, 1);
  assert.equal(sf.miss, 1);
  assert.equal(sf.combo, 0);
});

test('expire：窗内的音符不会被误判 MISS', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 320 });
  assert.equal(sf.expire(100).length, 0);
  assert.equal(sf.miss, 0);
});

// ---- active / upcoming ----
test('active：返回判定窗覆盖 t 的未判音符', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 320 });
  assert.deepEqual(sf.active(0).map((n) => n.i), [0]);
  assert.deepEqual(sf.active(1000).map((n) => n.i), [1]);
  assert.deepEqual(sf.active(500).map((n) => n.i), []); // 两个音都在窗外
});

test('upcoming：返回向前看窗口内仍可弹的音符', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1], [64, 1]] };
  const sf = new ScoreFollow(song);
  const up = sf.upcoming(0, 1500); // 看 0..1500ms：含 ms=0 和 ms=1000
  assert.deepEqual(up.map((n) => n.i), [0, 1]);
});

// ---- accuracy / stars / summary ----
test('accuracy 与 stars 计算', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1], [64, 1], [65, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 1200, perfectMs: 1200 });
  sf.judge(60, 0); sf.judge(62, 1000); sf.judge(64, 2000); // 3 对
  sf.expire(99999); // 第 4 个 miss
  assert.equal(sf.judgedCount, 4);
  assert.equal(sf.accuracy, 0.75);
  assert.equal(sf.stars, 2); // 75% -> 2 星
});

test('summary 字段完整', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const sf = new ScoreFollow(song);
  sf.judge(60, 0);
  const s = sf.summary();
  assert.equal(s.total, 1);
  assert.equal(s.perfect, 1);
  assert.equal(s.accuracy, 100);
  assert.equal(s.stars, 3);
  assert.ok('maxCombo' in s && 'score' in s && 'good' in s && 'miss' in s);
});

// ---- range / reset ----
test('range 返回音高范围', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [72, 1], [55, 1]] };
  const sf = new ScoreFollow(song);
  assert.deepEqual(sf.range, [55, 72]);
});

test('reset 清零统计与判定状态', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1]] };
  const sf = new ScoreFollow(song);
  sf.judge(60, 0);
  sf.reset();
  assert.equal(sf.perfect, 0);
  assert.equal(sf.judgedCount, 0);
  assert.equal(sf.notes[0].judged, false);
});

// ---- done ----
test('done：全部判定后为真', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const sf = new ScoreFollow(song, { goodMs: 1200 });
  assert.equal(sf.done, false);
  sf.judge(60, 0); sf.judge(62, 1000);
  assert.equal(sf.done, true);
});

// ---- 绝对时间记谱（MIDI 导入 / 复音 / 双手） ----
test('notes 绝对记谱：直接用 ms/durMs/hand 构建', () => {
  const song = {
    id: 'm', title: 'm', clef: 'treble', bpm: 120, hands: true,
    notes: [
      { midi: 72, ms: 0, durMs: 500, beat: 0, dur: 1, hand: 'r' },
      { midi: 48, ms: 0, durMs: 500, beat: 0, dur: 1, hand: 'l' },
      { midi: 74, ms: 500, durMs: 500, beat: 1, dur: 1, hand: 'r' },
    ],
  };
  const sf = new ScoreFollow(song);
  assert.equal(sf.total, 3);
  assert.equal(sf.notes[0].ms, 0);
  assert.equal(sf.notes[0].hand, 'r');
  assert.equal(sf.notes[1].hand, 'l');
  assert.equal(sf.notes[2].ms, 500);
  assert.equal(sf.durationMs, 1000);
});

test('timeScale 缩放整条时间轴', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, notes: [
    { midi: 60, ms: 0, durMs: 500, beat: 0, dur: 1 },
    { midi: 62, ms: 500, durMs: 500, beat: 1, dur: 1 },
  ] };
  const slow = new ScoreFollow(song, { timeScale: 2 });   // 慢一倍
  assert.equal(slow.notes[1].ms, 1000);
  assert.equal(slow.notes[1].durMs, 1000);
  const fast = new ScoreFollow(song, { timeScale: 0.5 }); // 快一倍
  assert.equal(fast.notes[1].ms, 250);
});

test('timeScale 也作用于 seq 记谱', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const sf = new ScoreFollow(song, { timeScale: 0.5 });
  assert.equal(sf.notes[1].ms, 500); // 1 拍@60bpm=1000ms，×0.5=500
});

// ---- handFilter 手别过滤 ----
test('handFilter 只统计/判定该手的音符', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, hands: true, notes: [
    { midi: 72, ms: 0, durMs: 200, hand: 'r' },
    { midi: 48, ms: 0, durMs: 200, hand: 'l' },
    { midi: 74, ms: 300, durMs: 200, hand: 'r' },
  ] };
  const right = new ScoreFollow(song, { handFilter: 'r' });
  assert.equal(right.total, 2);
  assert.deepEqual(right.range, [72, 74]);
  // 弹左手音符不应判定（不属于该手）
  assert.equal(right.judge(48, 0).grade, null);
  assert.equal(right.judge(72, 0).grade, GRADE.PERFECT);
  const left = new ScoreFollow(song, { handFilter: 'l' });
  assert.equal(left.total, 1);
  assert.equal(left.judge(48, 0).grade, GRADE.PERFECT);
});

test('handFilter=both 时统计全部', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, hands: true, notes: [
    { midi: 72, ms: 0, durMs: 200, hand: 'r' },
    { midi: 48, ms: 0, durMs: 200, hand: 'l' },
  ] };
  const sf = new ScoreFollow(song, { handFilter: 'both' });
  assert.equal(sf.total, 2);
});

test('handFilter 下 done 只看该手是否弹完', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, hands: true, notes: [
    { midi: 72, ms: 0, durMs: 200, hand: 'r' },
    { midi: 48, ms: 0, durMs: 200, hand: 'l' },
  ] };
  const right = new ScoreFollow(song, { handFilter: 'r', goodMs: 500 });
  assert.equal(right.done, false);
  right.judge(72, 0);
  assert.equal(right.done, true); // 右手只有一个音，弹完即 done
});

// ---- groups 分组（等待模式 / 和弦） ----
test('groups：同时刻音符归为一组（和弦）', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, notes: [
    { midi: 60, ms: 0, durMs: 200 }, { midi: 64, ms: 0, durMs: 200 }, { midi: 67, ms: 0, durMs: 200 },
    { midi: 72, ms: 500, durMs: 200 },
  ] };
  const g = new ScoreFollow(song).groups();
  assert.equal(g.length, 2);
  assert.equal(g[0].notes.length, 3); // 第一组是三和弦
  assert.equal(g[1].notes.length, 1);
  assert.equal(g[0].ms, 0);
  assert.equal(g[1].ms, 500);
});

test('groups 受 handFilter 影响', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, hands: true, notes: [
    { midi: 72, ms: 0, durMs: 200, hand: 'r' },
    { midi: 48, ms: 0, durMs: 200, hand: 'l' },
    { midi: 74, ms: 500, durMs: 200, hand: 'r' },
  ] };
  const g = new ScoreFollow(song, { handFilter: 'r' }).groups();
  assert.equal(g.length, 2);
  assert.ok(g.every((grp) => grp.notes.every((n) => n.hand === 'r')));
});

// ---- beatAt 光标插值 ----
test('beatAt：在音符间线性插值拍位', () => {
  const song = { id: 'm', title: 'm', clef: 'treble', bpm: 120, notes: [
    { midi: 60, ms: 0, durMs: 500, beat: 0, dur: 1 },
    { midi: 62, ms: 1000, durMs: 500, beat: 2, dur: 1 },
  ] };
  const sf = new ScoreFollow(song);
  assert.equal(sf.beatAt(0), 0);
  assert.equal(sf.beatAt(500), 1);   // 一半时间 -> 一半拍位（0..2 拍）
  assert.equal(sf.beatAt(1000), 2);
});

// ---- songFromMidi ----
test('songFromMidi 映射 parseMidi 结构', () => {
  const parsed = {
    bpm: 100, hasHands: true, durationMs: 1000,
    notes: [
      { midi: 60, ms: 0, durMs: 500, beat: 0, dur: 1, hand: 'r' },
      { midi: 48, ms: 0, durMs: 500, beat: 0, dur: 1, hand: 'l' },
    ],
  };
  const song = songFromMidi(parsed, { id: 'up', title: '我的曲子' });
  assert.equal(song.id, 'up');
  assert.equal(song.title, '我的曲子');
  assert.equal(song.bpm, 100);
  assert.equal(song.hands, true);
  assert.equal(song.notes.length, 2);
  const sf = new ScoreFollow(song);
  assert.equal(sf.total, 2);
  assert.equal(sf.notes[1].hand, 'l');
});

test('每首内置乐曲都能构建出音符', () => {
  for (const s of SONGS) {
    const sf = new ScoreFollow(s);
    assert.ok(sf.total > 0, `${s.id} 应有音符`);
    assert.ok(sf.durationMs > 0);
    const [lo, hi] = sf.range;
    assert.ok(lo >= 21 && hi <= 108, `${s.id} 音高应在 88 键内`);
  }
});

// ---- timings 落点时间对比 ----
test('timings：按顺序给出每个音的误差与抢/拖/准统计', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1], [64, 1], [65, 1]] };
  const sf = new ScoreFollow(song, { perfectMs: 130, goodMs: 320 });
  sf.judge(60, -200);  // 抢拍（早 200ms）
  sf.judge(62, 1000);  // 正中
  sf.judge(64, 2250);  // 拖拍（晚 250ms）
  sf.expire(99999);    // 第 4 个 miss
  const t = sf.timings();
  assert.equal(t.notes.length, 4);
  assert.equal(t.notes[0].deltaMs, -200);
  assert.equal(t.notes[0].grade, GRADE.GOOD);
  assert.equal(t.notes[1].deltaMs, 0);
  assert.equal(t.notes[3].grade, GRADE.MISS);
  assert.equal(t.notes[3].deltaMs, null);
  assert.equal(t.early, 1);
  assert.equal(t.late, 1);
  assert.equal(t.onTime, 1);
  assert.equal(t.miss, 1);
  assert.equal(t.avgAbs, Math.round((200 + 0 + 250) / 3));
  assert.equal(t.maxAbs, 250);
});

test('timings：未演奏时统计为空、平均误差 0', () => {
  const song = { id: 't', title: 't', clef: 'treble', bpm: 60, seq: [[60, 1], [62, 1]] };
  const t = new ScoreFollow(song).timings();
  assert.equal(t.notes.length, 2);
  assert.equal(t.early + t.late + t.onTime + t.miss, 0);
  assert.equal(t.avgAbs, 0);
  assert.equal(t.maxAbs, 0);
});
