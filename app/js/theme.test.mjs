import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  THEMES, THEME_STORAGE_KEY, DEFAULT_THEME,
  isValidTheme, themeById, getTheme, setTheme, applyTheme, initTheme,
} from './theme.js';

// 极简 localStorage 桩
function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    _map: m,
  };
}

// 极简 root 元素桩（支持 set/removeAttribute）
function fakeRoot() {
  const attrs = {};
  return {
    setAttribute: (k, v) => { attrs[k] = v; },
    removeAttribute: (k) => { delete attrs[k]; },
    getAttribute: (k) => (k in attrs ? attrs[k] : null),
    _attrs: attrs,
  };
}

test('THEMES 含默认主题且字段完整', () => {
  assert.ok(THEMES.length >= 2);
  assert.ok(THEMES.some((t) => t.id === DEFAULT_THEME));
  for (const t of THEMES) {
    assert.equal(typeof t.id, 'string');
    assert.equal(typeof t.name, 'string');
    assert.equal(typeof t.emoji, 'string');
  }
});

test('THEME ids 唯一', () => {
  const ids = THEMES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('isValidTheme', () => {
  assert.equal(isValidTheme('midnight'), true);
  assert.equal(isValidTheme('ocean'), true);
  assert.equal(isValidTheme('nope'), false);
  assert.equal(isValidTheme(null), false);
  assert.equal(isValidTheme(undefined), false);
});

test('themeById 回退到默认', () => {
  assert.equal(themeById('ocean').id, 'ocean');
  assert.equal(themeById('bogus').id, DEFAULT_THEME);
});

test('getTheme 默认值', () => {
  assert.equal(getTheme(fakeStorage()), DEFAULT_THEME);
  assert.equal(getTheme(null), DEFAULT_THEME);
});

test('getTheme 读已存值', () => {
  assert.equal(getTheme(fakeStorage({ [THEME_STORAGE_KEY]: 'candy' })), 'candy');
});

test('getTheme 非法值回退默认', () => {
  assert.equal(getTheme(fakeStorage({ [THEME_STORAGE_KEY]: 'xxx' })), DEFAULT_THEME);
});

test('setTheme 写入合法值', () => {
  const s = fakeStorage();
  assert.equal(setTheme(s, 'forest'), true);
  assert.equal(s.getItem(THEME_STORAGE_KEY), 'forest');
});

test('setTheme 拒绝非法值', () => {
  const s = fakeStorage();
  assert.equal(setTheme(s, 'bogus'), false);
  assert.equal(s.getItem(THEME_STORAGE_KEY), null);
});

test('applyTheme 默认主题清空 data-theme', () => {
  const r = fakeRoot();
  r.setAttribute('data-theme', 'ocean');
  assert.equal(applyTheme('midnight', r), 'midnight');
  assert.equal(r.getAttribute('data-theme'), null);
});

test('applyTheme 非默认写 data-theme', () => {
  const r = fakeRoot();
  assert.equal(applyTheme('twilight', r), 'twilight');
  assert.equal(r.getAttribute('data-theme'), 'twilight');
});

test('applyTheme 非法 id 回退默认并清空', () => {
  const r = fakeRoot();
  r.setAttribute('data-theme', 'ocean');
  assert.equal(applyTheme('bogus', r), DEFAULT_THEME);
  assert.equal(r.getAttribute('data-theme'), null);
});

test('applyTheme 无 root 不抛错', () => {
  assert.equal(applyTheme('ocean', null), 'ocean');
});

test('initTheme 读 storage 并应用', () => {
  const r = fakeRoot();
  const s = fakeStorage({ [THEME_STORAGE_KEY]: 'candy' });
  assert.equal(initTheme(s, r), 'candy');
  assert.equal(r.getAttribute('data-theme'), 'candy');
});

test('initTheme 默认时清空 data-theme', () => {
  const r = fakeRoot();
  r.setAttribute('data-theme', 'stale');
  const s = fakeStorage();
  assert.equal(initTheme(s, r), DEFAULT_THEME);
  assert.equal(r.getAttribute('data-theme'), null);
});

test('往返：set 后 get 一致', () => {
  const s = fakeStorage();
  for (const t of THEMES) {
    setTheme(s, t.id);
    assert.equal(getTheme(s), t.id);
  }
});
