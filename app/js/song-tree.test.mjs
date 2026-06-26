import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSongTree, findNode, findSub, searchSongs, countMatches, NOSUB } from './song-tree.js';

const CAT = {
  categories: [
    { slug: 'lesson', emoji: '📚', label: '教程练习', count: 4 },
    { slug: 'piano', emoji: '🎹', label: '钢琴名曲', count: 2 },
    { slug: 'relax', emoji: '🌙', label: '放松音乐', count: 1 },
  ],
  songs: [
    { title: 'Beyer No.1', composer: 'Beyer', cat: 'Beyer 106', fn: 'lesson', path: 'midi/lesson/b1.mid' },
    { title: 'Beyer No.2', composer: 'Beyer', cat: 'Beyer 106', fn: 'lesson', path: 'midi/lesson/b2.mid' },
    { title: 'Czerny No.1', composer: 'Czerny', cat: 'Czerny 100', fn: 'lesson', path: 'midi/lesson/c1.mid' },
    { title: 'Hanon No.1', composer: 'Hanon', cat: 'Hanon', fn: 'lesson', path: 'midi/lesson/h1.mid' },
    { title: 'Für Elise', composer: 'Beethoven', cat: 'Piano Music', fn: 'piano', path: 'midi/piano/elise.mid' },
    { title: 'Nocturne', composer: 'Chopin', cat: 'Piano Music', fn: 'piano', path: 'midi/piano/noct.mid' },
    { title: 'Calm Waves', composer: '', cat: '', fn: 'relax', path: 'midi/relax/calm.mid' },
  ],
};

test('buildSongTree groups by fn then cat, preserves category order', () => {
  const tree = buildSongTree(CAT);
  assert.equal(tree.length, 3);
  assert.deepEqual(tree.map((n) => n.slug), ['lesson', 'piano', 'relax']);
  const lesson = tree[0];
  assert.equal(lesson.count, 4);
  assert.deepEqual(lesson.subs.map((s) => s.key), ['Beyer 106', 'Czerny 100', 'Hanon']);
  assert.equal(lesson.subs[0].count, 2);
  assert.equal(lesson.singleSub, false);
});

test('single-sub category flagged, empty cat falls back to category label', () => {
  const tree = buildSongTree(CAT);
  const relax = findNode(tree, 'relax');
  assert.equal(relax.singleSub, true);
  assert.equal(relax.subs.length, 1);
  assert.equal(relax.subs[0].key, NOSUB);
  assert.equal(relax.subs[0].label, '放松音乐'); // empty cat -> category label
  assert.equal(relax.subs[0].songs[0].title, 'Calm Waves');
});

test('piano category two songs one sub', () => {
  const tree = buildSongTree(CAT);
  const piano = findNode(tree, 'piano');
  assert.equal(piano.count, 2);
  assert.equal(piano.singleSub, true);
  assert.equal(piano.subs[0].key, 'Piano Music');
});

test('fn not present in categories gets synthesized and appended', () => {
  const cat = {
    categories: [{ slug: 'lesson', emoji: '📚', label: '教程', count: 1 }],
    songs: [
      { title: 'A', cat: 'X', fn: 'lesson', path: 'a' },
      { title: 'B', cat: 'Y', fn: 'mystery', path: 'b' },
    ],
  };
  const tree = buildSongTree(cat);
  assert.deepEqual(tree.map((n) => n.slug), ['lesson', 'mystery']);
  const m = findNode(tree, 'mystery');
  assert.equal(m.emoji, '🎵');
  assert.equal(m.count, 1);
});

test('empty categories filtered out', () => {
  const cat = {
    categories: [
      { slug: 'a', emoji: '📚', label: 'A', count: 0 },
      { slug: 'b', emoji: '🎹', label: 'B', count: 1 },
    ],
    songs: [{ title: 'S', cat: 'k', fn: 'b', path: 'p' }],
  };
  const tree = buildSongTree(cat);
  assert.deepEqual(tree.map((n) => n.slug), ['b']);
});

test('findSub returns the right sub or null', () => {
  const tree = buildSongTree(CAT);
  const lesson = findNode(tree, 'lesson');
  assert.equal(findSub(lesson, 'Hanon').count, 1);
  assert.equal(findSub(lesson, 'Nope'), null);
  assert.equal(findSub(null, 'x'), null);
});

test('searchSongs matches title, composer, cat; case-insensitive', () => {
  assert.equal(searchSongs(CAT, 'beyer').length, 2); // composer + cat both match the 2 beyer songs
  assert.equal(searchSongs(CAT, 'CZERNY').length, 1);
  assert.equal(searchSongs(CAT, 'elise').length, 1);
  assert.equal(searchSongs(CAT, '').length, 0);
});

test('searchSongs respects limit', () => {
  assert.equal(searchSongs(CAT, 'no', 1).length, 1); // "No.1" etc match many, capped at 1
});

test('countMatches counts without truncating', () => {
  assert.equal(countMatches(CAT, 'beyer'), 2);
  assert.equal(countMatches(CAT, 'nonexistent'), 0);
  assert.equal(countMatches(CAT, ''), 0);
});

test('empty / missing catalog is safe', () => {
  assert.deepEqual(buildSongTree(null), []);
  assert.deepEqual(buildSongTree({}), []);
  assert.deepEqual(searchSongs(null, 'x'), []);
  assert.equal(countMatches(undefined, 'x'), 0);
});

test('starter-style synthetic category with _scfId songs', () => {
  const cat = {
    categories: [{ slug: '__starter', emoji: '🐣', label: '启蒙小曲', count: 2 }],
    songs: [
      { title: 'Find C', _scfId: 'find-c', cat: '启蒙', fn: '__starter' },
      { title: 'Twinkle', _scfId: 'twinkle', cat: '启蒙', fn: '__starter' },
    ],
  };
  const tree = buildSongTree(cat);
  const node = findNode(tree, '__starter');
  assert.equal(node.singleSub, true);
  assert.equal(node.subs[0].songs[1]._scfId, 'twinkle');
});
