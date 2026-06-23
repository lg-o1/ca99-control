/**
 * preset-store.test.mjs — 演出预设存储单元测试
 * 运行: node js/preset-store.test.mjs
 */
import { PresetStore, MemoryStorage } from './preset-store.js';

let pass = 0, fail = 0;
function eq(actual, expected, msg) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass++; else { fail++; console.error(`✗ ${msg}\n   expected ${JSON.stringify(expected)}\n   got      ${JSON.stringify(actual)}`); }
}
function ok(cond, msg) { if (cond) pass++; else { fail++; console.error(`✗ ${msg}`); } }
function throws(fn, msg) { try { fn(); fail++; console.error(`✗ ${msg} (did not throw)`); } catch { pass++; } }

const mk = () => new PresetStore({ storage: new MemoryStorage() });

// ---- empty store ----
{
  const s = mk();
  eq(s.list(), [], 'empty list');
  eq(s.load('x'), null, 'load missing -> null');
  eq(s.has('x'), false, 'has missing -> false');
  eq(s.remove('x'), false, 'remove missing -> false');
}

// ---- save + load ----
{
  const s = mk();
  const data = { sound: { id: 5, channel: 0 }, vt: { 4: 100, 2: 8 } };
  s.save('Jazz', data);
  eq(s.has('Jazz'), true, 'has after save');
  eq(s.load('Jazz'), data, 'load returns saved data');
  eq(s.list(), ['Jazz'], 'list has one');
}

// ---- save snapshots (deep copy, not reference) ----
{
  const s = mk();
  const data = { vt: { 4: 50 } };
  s.save('P', data);
  data.vt[4] = 999; // mutate original after save
  eq(s.load('P').vt[4], 50, 'saved snapshot unaffected by later mutation');
}

// ---- save overwrites same name ----
{
  const s = mk();
  s.save('P', { a: 1 });
  s.save('P', { a: 2 });
  eq(s.load('P'), { a: 2 }, 'overwrite same name');
  eq(s.list().length, 1, 'still one entry');
}

// ---- list sorted ----
{
  const s = mk();
  s.save('Zeta', {}); s.save('Alpha', {}); s.save('Mid', {});
  eq(s.list(), ['Alpha', 'Mid', 'Zeta'], 'list alphabetical');
}

// ---- name normalization (trim) ----
{
  const s = mk();
  s.save('  Spacey  ', { v: 1 });
  eq(s.has('Spacey'), true, 'trimmed name stored');
  eq(s.load('Spacey'), { v: 1 }, 'load trimmed');
}

// ---- empty name rejected ----
{
  const s = mk();
  throws(() => s.save('', { a: 1 }), 'empty name throws');
  throws(() => s.save('   ', { a: 1 }), 'whitespace name throws');
}

// ---- remove ----
{
  const s = mk();
  s.save('A', {}); s.save('B', {});
  eq(s.remove('A'), true, 'remove returns true');
  eq(s.list(), ['B'], 'A removed');
  eq(s.remove('A'), false, 'remove again false');
}

// ---- rename ----
{
  const s = mk();
  s.save('Old', { x: 1 });
  ok(s.rename('Old', 'New'), 'rename ok');
  eq(s.has('Old'), false, 'old gone');
  eq(s.load('New'), { x: 1 }, 'new has data');
}

// ---- rename errors ----
{
  const s = mk();
  s.save('A', {}); s.save('B', {});
  throws(() => s.rename('A', 'B'), 'rename to existing throws');
  throws(() => s.rename('Missing', 'C'), 'rename missing throws');
  throws(() => s.rename('A', ''), 'rename to empty throws');
}

// ---- rename to same name is allowed (no-op) ----
{
  const s = mk();
  s.save('Same', { v: 1 });
  ok(s.rename('Same', 'Same'), 'rename to itself ok');
  eq(s.load('Same'), { v: 1 }, 'data intact after self-rename');
}

// ---- persistence across instances sharing storage ----
{
  const storage = new MemoryStorage();
  const s1 = new PresetStore({ storage });
  s1.save('Shared', { hello: 'world' });
  const s2 = new PresetStore({ storage });
  eq(s2.load('Shared'), { hello: 'world' }, 'second instance sees saved preset');
}

// ---- corrupt storage tolerated ----
{
  const storage = new MemoryStorage();
  storage.setItem('ca99-presets', '{not valid json');
  const s = new PresetStore({ storage });
  eq(s.list(), [], 'corrupt -> empty list');
  s.save('Recover', { ok: true });
  eq(s.load('Recover'), { ok: true }, 'can save after corrupt');
}

// ---- non-object JSON tolerated ----
{
  const storage = new MemoryStorage();
  storage.setItem('ca99-presets', '[1,2,3]');
  const s = new PresetStore({ storage });
  eq(s.list(), [], 'array json -> empty');
}

// ---- export / import ----
{
  const s = mk();
  s.save('A', { x: 1 }); s.save('B', { y: 2 });
  const json = s.exportJSON();
  const s2 = mk();
  const n = s2.importJSON(json);
  eq(n, 2, 'imported 2');
  eq(s2.load('A'), { x: 1 }, 'import A');
  eq(s2.load('B'), { y: 2 }, 'import B');
}

// ---- import merge vs overwrite ----
{
  const s = mk();
  s.save('Keep', { k: 1 });
  s.importJSON(JSON.stringify({ New: { n: 1 } }), true); // merge
  eq(s.list(), ['Keep', 'New'], 'merge keeps existing');

  s.importJSON(JSON.stringify({ Only: { o: 1 } }), false); // overwrite
  eq(s.list(), ['Only'], 'overwrite replaces all');
}

// ---- import invalid ----
{
  const s = mk();
  throws(() => s.importJSON('not json'), 'invalid json throws');
  throws(() => s.importJSON('[1,2]'), 'array import throws');
}

// ---- clear ----
{
  const s = mk();
  s.save('A', {}); s.save('B', {});
  s.clear();
  eq(s.list(), [], 'cleared');
}

// ---- custom key isolation ----
{
  const storage = new MemoryStorage();
  const s1 = new PresetStore({ storage, key: 'k1' });
  const s2 = new PresetStore({ storage, key: 'k2' });
  s1.save('A', { from: 1 });
  eq(s2.list(), [], 'different key isolated');
  eq(s1.list(), ['A'], 's1 still has A');
}

console.log(`\npreset-store: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
