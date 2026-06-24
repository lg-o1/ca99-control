/**
 * score-follow.test.mjs — 曲谱跟弹引擎单元测试
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { ScoreFollow, GRADE, SONGS, getSong, beatToMs } from './score-follow.js';

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

// ---- 内置曲库可正常构建 ----
test('每首内置乐曲都能构建出音符', () => {
  for (const s of SONGS) {
    const sf = new ScoreFollow(s);
    assert.ok(sf.total > 0, `${s.id} 应有音符`);
    assert.ok(sf.durationMs > 0);
    const [lo, hi] = sf.range;
    assert.ok(lo >= 21 && hi <= 108, `${s.id} 音高应在 88 键内`);
  }
});
