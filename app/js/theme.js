/**
 * theme.js — 全局外观主题（纯逻辑，可单元测试）
 *
 * 设计：所有「品牌/外观」配色都集中在 app.css 的 CSS 变量里（:root = 默认主题，
 * 各 [data-theme="X"] 块覆盖同名变量）。本模块只负责：
 *   1) 维护主题清单（id/名称/emoji）
 *   2) 读/写用户选择（localStorage）
 *   3) 把选中的主题 id 写到 <html data-theme="X">（空=默认 midnight）
 * 切换主题 = 改一个 data-theme 属性，全 app 的背景/面板/渐变/键盘/落音符/
 * 五线谱音符色一次性跟随，无需逐处改色。
 *
 * 语义反馈色（红=错 / 绿=对 / 黄=提示）不在主题覆盖范围内——跨主题保持稳定。
 */

export const THEME_STORAGE_KEY = 'ca99_theme';

/** 主题清单。id='midnight' 为默认（对应 :root，不写 data-theme）。 */
export const THEMES = [
  { id: 'midnight', name: '午夜',  emoji: '🌙', blurb: '靛蓝紫·默认' },
  { id: 'ocean',    name: '海洋',  emoji: '🌊', blurb: '青蓝·清爽' },
  { id: 'candy',    name: '糖果',  emoji: '🍭', blurb: '粉紫·甜美' },
  { id: 'forest',   name: '森林',  emoji: '🌲', blurb: '绿意·自然' },
  { id: 'twilight', name: '暮光',  emoji: '🔥', blurb: '橙红·温暖' },
];

export const DEFAULT_THEME = 'midnight';

/** 给定 id 是否为合法主题。 */
export function isValidTheme(id) {
  return THEMES.some((t) => t.id === id);
}

/** 取主题对象（找不到回退到默认）。 */
export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES.find((t) => t.id === DEFAULT_THEME);
}

/** 从 storage 读已保存主题；非法/缺失 → 默认。 */
export function getTheme(storage) {
  try {
    const v = storage && storage.getItem(THEME_STORAGE_KEY);
    return isValidTheme(v) ? v : DEFAULT_THEME;
  } catch (e) {
    return DEFAULT_THEME;
  }
}

/** 写入 storage（非法 id 不写，返回是否成功）。 */
export function setTheme(storage, id) {
  if (!isValidTheme(id)) return false;
  try {
    if (storage) storage.setItem(THEME_STORAGE_KEY, id);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 把主题应用到根元素：默认主题清空 data-theme（走 :root），其余写 data-theme=id。
 * @param {string} id 主题 id
 * @param {HTMLElement} root document.documentElement（测试时传桩对象）
 * @returns {string} 实际生效的主题 id
 */
export function applyTheme(id, root) {
  const eff = isValidTheme(id) ? id : DEFAULT_THEME;
  if (!root) return eff;
  if (eff === DEFAULT_THEME) {
    if (root.removeAttribute) root.removeAttribute('data-theme');
    else if (root.dataset) delete root.dataset.theme;
  } else if (root.setAttribute) {
    root.setAttribute('data-theme', eff);
  } else if (root.dataset) {
    root.dataset.theme = eff;
  }
  return eff;
}

/** 一步到位：读 storage → 应用到 root。返回生效 id。 */
export function initTheme(storage, root) {
  const id = getTheme(storage);
  return applyTheme(id, root);
}

const exported = {
  THEMES, THEME_STORAGE_KEY, DEFAULT_THEME,
  isValidTheme, themeById, getTheme, setTheme, applyTheme, initTheme,
};
export default exported;
