// 用户自定义曲库：扫描用户自己整理的目录（如 app/data/<分类>/xxx.mid）并构建可浏览的 catalog。
// 两条数据来源都归一到与 CA99 内置曲库相同的 catalog 形状，便于复用同一个浏览器 UI：
//   { total, categories:[{slug,emoji,label,count}], songs:[{file,title,composer,cat,fn,path}] }
//
// 纯逻辑（无 DOM / 无网络），便于单元测试；app.js 里负责 fetch 目录索引/manifest 后调用这里。

// 从 `python -m http.server` 等自动目录索引页 HTML 里解析出子目录名和 .mid 文件名。
// 只取相对的最后一段（autoindex 通常就是裸文件名/目录名），忽略 ../ 与外链。
export function parseDirListing(html) {
  const dirs = [];
  const files = [];
  const re = /href\s*=\s*"([^"]+)"/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    let href = m[1];
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(href)) continue; // 绝对外链
    if (href.startsWith('?') || href.startsWith('#') || href.startsWith('/')) continue;
    href = href.split('?')[0].split('#')[0];
    let name;
    try { name = decodeURIComponent(href); } catch (_) { name = href; }
    if (!name || name === '../' || name === './') continue;
    if (name.endsWith('/')) {
      const d = name.replace(/\/+$/, '');
      if (d && !d.includes('/') && d !== '..' && d !== '.') dirs.push(d);
    } else if (/\.midi?$/i.test(name) && !name.includes('/')) {
      files.push(name);
    }
  }
  return { dirs: dedupe(dirs), files: dedupe(files) };
}

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) { if (!seen.has(x)) { seen.add(x); out.push(x); } }
  return out;
}

// 文件名 → 友好曲名：去扩展名、下划线转空格、压缩空白。
export function fileTitle(filename) {
  return String(filename || '')
    .replace(/\.midi?$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 把一个路径按段编码后拼接（每段 encodeURIComponent，分隔符保持 /）。
export function encodePath(...segments) {
  return segments
    .filter((s) => s !== '' && s != null)
    .map((s) => String(s).split('/').filter(Boolean).map(encodeURIComponent).join('/'))
    .join('/');
}

// 把目录扫描结果构建成 catalog。
// scan = { base, rootFiles:[name...], dirs:[{ name, files:[name...] }] }
//   base       —— 曲库根的 URL 前缀（如 'data'）
//   rootFiles  —— 直接放在 base 下的 .mid（归入“未分类”）
//   dirs       —— base 下每个子目录及其 .mid（子目录名即分类）
export function buildUserCatalog(scan, opts = {}) {
  const base = (scan && scan.base) || '';
  const rootLabel = opts.rootLabel || '未分类';
  const categories = [];
  const songs = [];

  const addCategory = (slug, label, emoji, files, dirName) => {
    const list = (files || []).slice().sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (!list.length) return;
    categories.push({ slug, emoji, label, count: list.length });
    for (const f of list) {
      songs.push({
        file: f,
        title: fileTitle(f),
        composer: '',
        cat: '',
        fn: slug,
        path: [base, dirName, f].filter((s) => s !== '' && s != null).join('/'),
      });
    }
  };

  (scan && scan.dirs ? scan.dirs : []).forEach((d, i) => {
    addCategory('ud' + i, d.name, '📁', d.files, d.name);
  });
  if (scan && scan.rootFiles && scan.rootFiles.length) {
    addCategory('uroot', rootLabel, '🎵', scan.rootFiles, null);
  }

  return { total: songs.length, base, categories, songs };
}

// manifest（data/userlib.json）→ catalog。manifest 形如：
//   { songs:[{file, title?, cat?, path}] }  或直接已经是完整 catalog。
// 用于不支持自动目录索引的静态主机：用户用 scripts/build_user_catalog.py 生成。
export function catalogFromManifest(manifest) {
  if (!manifest) return null;
  if (Array.isArray(manifest.categories) && Array.isArray(manifest.songs)) {
    return { total: manifest.songs.length, base: manifest.base || '', categories: manifest.categories, songs: manifest.songs };
  }
  const songs = Array.isArray(manifest.songs) ? manifest.songs : [];
  if (!songs.length) return { total: 0, base: manifest.base || '', categories: [], songs: [] };
  const byCat = new Map();
  for (const s of songs) {
    const cat = s.cat || '未分类';
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push({
      file: s.file || (s.path || '').split('/').pop(),
      title: s.title || fileTitle((s.path || '').split('/').pop()),
      composer: s.composer || '',
      cat: '',
      path: s.path,
    });
  }
  const categories = [];
  const out = [];
  let i = 0;
  for (const [label, list] of byCat) {
    const slug = 'um' + (i++);
    categories.push({ slug, emoji: '📁', label, count: list.length });
    for (const s of list) out.push({ ...s, fn: slug });
  }
  return { total: out.length, base: manifest.base || '', categories, songs: out };
}
