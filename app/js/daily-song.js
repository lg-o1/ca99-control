/**
 * daily-song.js — 🎲 今日推荐曲 纯逻辑
 *
 * 从内置曲库（midi/catalog.json 的 songs 数组）里**按日期确定性**地推一首
 * 「今天试试这首」——同一天打开永远是同一首（像每日任务），换一首则随机跳。
 * 破解孩子「不知道弹什么」的选择困难，零内容成本。
 *
 * 本文件只放可单元测试的纯逻辑（日期键、哈希、确定性选号、曲名清洗）。
 */

/** 本地日期 → 'YYYY-MM-DD'（用作每日确定性种子） */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 字符串 → 32 位无符号哈希（FNV-1a 变体，确定性） */
export function hashStr(s) {
  let h = 2166136261 >>> 0;
  const str = String(s);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * 按日期确定性地取曲目下标 [0,count)。
 * salt 用于「换一首」：同一天不同 salt → 不同曲目。
 */
export function pickDailyIndex(count, date = new Date(), salt = 0) {
  if (!count || count <= 0) return 0;
  const h = hashStr(dayKey(date) + '#' + salt);
  return h % count;
}

/** 从文件名兜底清洗出可读曲名（catalog 缺 title 时用：去扩展名、分隔符转空格、首字母大写） */
export function prettyName(song) {
  if (song && song.title && song.title.trim()) return song.title.trim();
  const file = (song && (song.file || song.path)) || '';
  const base = String(file).split('/').pop().replace(/\.(midi?|MIDI?)$/i, '');
  const words = base.replace(/[_\-]+/g, ' ').replace(/\d+$/, '').trim();
  return words.replace(/\b\w/g, (c) => c.toUpperCase()) || '未命名曲目';
}

/** 分类文件夹 → emoji（用于卡片视觉） */
export const CAT_EMOJI = {
  lesson: '📕', piano: '🎹', concert: '🎼', hymn: '⛪', relax: '🌙', demo: '🎧', other: '🎵',
};

/** 取分类 emoji（找不到回退 🎵） */
export function catEmoji(fn) {
  return CAT_EMOJI[fn] || '🎵';
}
