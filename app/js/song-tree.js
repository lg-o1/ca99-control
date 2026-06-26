// 🌳 曲库层级树（song-tree）——把扁平的 catalog 整理成两级：
//   顶层分类（fn，如 教程/钢琴名曲/Concert Magic）→ 子分类（cat，如 Beyer 106 / Czerny 100）→ 曲目。
// 纯逻辑、无 DOM，给「分类 › 子分类 › 选曲」的层级弹窗浏览器复用，并便于单测。
//
// catalog 形状：{ categories:[{slug,emoji,label,count}], songs:[{title,composer,cat,fn,path,_scfId?,_demo?}] }

const NOSUB = '__nosub';

// 把 catalog 整理成 [{slug, emoji, label, count, subs:[{key,label,count,songs:[]}], singleSub}]。
// 顺序：先按 categories 给定顺序，未在 categories 里出现的 fn 追加在后；空分类剔除。
export function buildSongTree(catalog) {
  const cats = (catalog && catalog.categories) || [];
  const songs = (catalog && catalog.songs) || [];
  const byFn = new Map();
  const mk = (slug, emoji, label) => ({
    slug, emoji: emoji || '🎵', label: label || slug || '其他',
    count: 0, subs: [], _subMap: new Map(),
  });
  for (const c of cats) if (!byFn.has(c.slug)) byFn.set(c.slug, mk(c.slug, c.emoji, c.label));
  for (const s of songs) {
    let node = byFn.get(s.fn);
    if (!node) { node = mk(s.fn, '🎵', s.fn); byFn.set(s.fn, node); }
    const raw = (s.cat || '').trim();
    const key = raw || NOSUB;
    let sub = node._subMap.get(key);
    if (!sub) { sub = { key, label: raw || node.label, count: 0, songs: [] }; node._subMap.set(key, sub); node.subs.push(sub); }
    sub.songs.push(s);
    sub.count++;
    node.count++;
  }
  const finalize = (node) => { node.singleSub = node.subs.length <= 1; delete node._subMap; return node; };
  const result = [];
  for (const c of cats) {
    const node = byFn.get(c.slug);
    if (node) { result.push(finalize(node)); byFn.delete(c.slug); }
  }
  for (const node of byFn.values()) result.push(finalize(node));
  return result.filter((n) => n.count > 0);
}

export function findNode(tree, slug) {
  return (tree || []).find((n) => n.slug === slug) || null;
}

export function findSub(node, key) {
  return node ? (node.subs || []).find((s) => s.key === key) || null : null;
}

function hit(s, q) {
  return s.title.toLowerCase().includes(q)
    || (s.composer || '').toLowerCase().includes(q)
    || (s.cat || '').toLowerCase().includes(q);
}

// 跨全库扁平搜索（曲名 / 作曲家 / 子分类），最多返回 limit 条。
export function searchSongs(catalog, query, limit = 400) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const songs = (catalog && catalog.songs) || [];
  const out = [];
  for (const s of songs) {
    if (hit(s, q)) { out.push(s); if (out.length >= limit) break; }
  }
  return out;
}

// 搜索命中总数（不截断），用于「显示 N / 共 M」提示。
export function countMatches(catalog, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return 0;
  const songs = (catalog && catalog.songs) || [];
  let n = 0;
  for (const s of songs) if (hit(s, q)) n++;
  return n;
}

export { NOSUB };
