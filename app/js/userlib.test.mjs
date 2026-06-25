import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDirListing, fileTitle, encodePath, buildUserCatalog, catalogFromManifest } from './userlib.js';

test('parseDirListing extracts subdirs and midi files from autoindex html', () => {
  const html = `
    <ul>
      <li><a href="../">../</a></li>
      <li><a href="jpop/">jpop/</a></li>
      <li><a href="classical/">classical/</a></li>
      <li><a href="tabi.mid">tabi.mid</a></li>
      <li><a href="Song%20Two.MIDI">Song Two.MIDI</a></li>
      <li><a href="notes.txt">notes.txt</a></li>
      <li><a href="sysex.json">sysex.json</a></li>
    </ul>`;
  const { dirs, files } = parseDirListing(html);
  assert.deepEqual(dirs, ['jpop', 'classical']);
  assert.deepEqual(files, ['tabi.mid', 'Song Two.MIDI']);
});

test('parseDirListing ignores external links, query/anchor and absolute paths', () => {
  const html = `
    <a href="https://example.com/x.mid">ext</a>
    <a href="?C=N;O=D">sort</a>
    <a href="#top">top</a>
    <a href="/root/abs.mid">abs</a>
    <a href="ok.mid">ok</a>`;
  const { dirs, files } = parseDirListing(html);
  assert.deepEqual(dirs, []);
  assert.deepEqual(files, ['ok.mid']);
});

test('parseDirListing dedupes repeated entries', () => {
  const html = `<a href="a.mid">a</a><a href="a.mid">a</a><a href="d/">d/</a><a href="d/">d/</a>`;
  const { dirs, files } = parseDirListing(html);
  assert.deepEqual(files, ['a.mid']);
  assert.deepEqual(dirs, ['d']);
});

test('fileTitle strips extension and underscores', () => {
  assert.equal(fileTitle('tabi.mid'), 'tabi');
  assert.equal(fileTitle('my_favourite_song.MIDI'), 'my favourite song');
  assert.equal(fileTitle('  spaced  .mid'), 'spaced');
});

test('encodePath encodes each segment and keeps slashes', () => {
  assert.equal(encodePath('data', 'jpop', 'tabi.mid'), 'data/jpop/tabi.mid');
  assert.equal(encodePath('data', 'j pop', 'a b.mid'), 'data/j%20pop/a%20b.mid');
  assert.equal(encodePath('data', null, 'x.mid'), 'data/x.mid');
});

test('buildUserCatalog: subdirs become categories, root files go to 未分类', () => {
  const scan = {
    base: 'data',
    rootFiles: ['loose.mid'],
    dirs: [
      { name: 'jpop', files: ['tabi.mid', 'sakura.mid'] },
      { name: 'classical', files: ['fur_elise.mid'] },
    ],
  };
  const cat = buildUserCatalog(scan);
  assert.equal(cat.total, 4);
  assert.equal(cat.categories.length, 3);
  assert.equal(cat.categories[0].label, 'jpop');
  assert.equal(cat.categories[0].count, 2);
  const last = cat.categories[cat.categories.length - 1];
  assert.equal(last.label, '未分类');
  // path correctness
  const tabi = cat.songs.find((s) => s.file === 'tabi.mid');
  assert.equal(tabi.path, 'data/jpop/tabi.mid');
  assert.equal(tabi.fn, 'ud0');
  const loose = cat.songs.find((s) => s.file === 'loose.mid');
  assert.equal(loose.path, 'data/loose.mid');
  assert.equal(loose.fn, 'uroot');
});

test('buildUserCatalog: empty scan yields empty catalog', () => {
  const cat = buildUserCatalog({ base: 'data', rootFiles: [], dirs: [] });
  assert.equal(cat.total, 0);
  assert.deepEqual(cat.categories, []);
});

test('buildUserCatalog sorts files naturally within a category', () => {
  const scan = { base: 'data', rootFiles: [], dirs: [{ name: 'x', files: ['s10.mid', 's2.mid', 's1.mid'] }] };
  const cat = buildUserCatalog(scan);
  assert.deepEqual(cat.songs.map((s) => s.file), ['s1.mid', 's2.mid', 's10.mid']);
});

test('catalogFromManifest groups by cat when given flat song list', () => {
  const manifest = {
    base: 'data',
    songs: [
      { path: 'data/jpop/tabi.mid', title: 'Tabi', cat: 'J-Pop' },
      { path: 'data/jpop/sakura.mid', cat: 'J-Pop' },
      { path: 'data/x/y.mid', title: 'Y' },
    ],
  };
  const cat = catalogFromManifest(manifest);
  assert.equal(cat.total, 3);
  assert.equal(cat.categories.length, 2);
  assert.equal(cat.categories[0].label, 'J-Pop');
  assert.equal(cat.categories[0].count, 2);
  // derived title from filename when missing
  const sakura = cat.songs.find((s) => s.path.endsWith('sakura.mid'));
  assert.equal(sakura.title, 'sakura');
  assert.equal(cat.categories[1].label, '未分类');
});

test('catalogFromManifest passes through a complete catalog', () => {
  const full = {
    base: 'data',
    categories: [{ slug: 'a', emoji: '📁', label: 'A', count: 1 }],
    songs: [{ file: 'x.mid', title: 'X', composer: '', cat: '', fn: 'a', path: 'data/a/x.mid' }],
  };
  const cat = catalogFromManifest(full);
  assert.equal(cat.total, 1);
  assert.equal(cat.categories[0].slug, 'a');
});

test('catalogFromManifest returns null/empty safely', () => {
  assert.equal(catalogFromManifest(null), null);
  const empty = catalogFromManifest({ songs: [] });
  assert.equal(empty.total, 0);
});
