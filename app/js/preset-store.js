/**
 * preset-store.js — 演出预设存储（纯逻辑，可测试）
 *
 * 把一套现场设置（音色 + VT 参数 + 系统/混响等）命名保存，一键调用。
 * 存储后端可注入：浏览器用 localStorage，测试用内存 Map，便于单测。
 *
 * 本模块只负责"命名 / 持久化 / 序列化"，不碰 MIDI——
 * 捕获当前设置和应用预设由调用方（app.js）完成。
 */

/** 内存存储后端（实现 getItem/setItem 接口，供测试或无 localStorage 时用） */
export class MemoryStorage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(k) ? this._m.get(k) : null; }
  setItem(k, v) { this._m.set(k, String(v)); }
  removeItem(k) { this._m.delete(k); }
}

export class PresetStore {
  /**
   * @param {object} opts
   * @param {Storage|MemoryStorage} opts.storage  存储后端（默认内存）
   * @param {string} opts.key  存储键名
   */
  constructor(opts = {}) {
    this.storage = opts.storage || new MemoryStorage();
    this.key = opts.key || 'ca99-presets';
  }

  /** 读出全部预设对象 {name: data}（损坏时返回 {}） */
  _readAll() {
    const raw = this.storage.getItem(this.key);
    if (!raw) return {};
    try {
      const obj = JSON.parse(raw);
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch {
      return {};
    }
  }

  _writeAll(obj) {
    this.storage.setItem(this.key, JSON.stringify(obj));
  }

  /** 预设名列表（按字母排序） */
  list() {
    return Object.keys(this._readAll()).sort();
  }

  /** 是否存在某预设 */
  has(name) {
    return Object.prototype.hasOwnProperty.call(this._readAll(), this._norm(name));
  }

  _norm(name) { return String(name == null ? '' : name).trim(); }

  /**
   * 保存（覆盖同名）。空名抛错。data 会被深拷贝快照。
   * @returns {object} 保存后的数据
   */
  save(name, data) {
    const n = this._norm(name);
    if (!n) throw new Error('预设名不能为空');
    const all = this._readAll();
    all[n] = JSON.parse(JSON.stringify(data ?? {}));
    this._writeAll(all);
    return all[n];
  }

  /** 读取某预设（不存在返回 null） */
  load(name) {
    const all = this._readAll();
    const n = this._norm(name);
    return Object.prototype.hasOwnProperty.call(all, n) ? all[n] : null;
  }

  /** 删除（返回是否删除了） */
  remove(name) {
    const all = this._readAll();
    const n = this._norm(name);
    if (!Object.prototype.hasOwnProperty.call(all, n)) return false;
    delete all[n];
    this._writeAll(all);
    return true;
  }

  /** 重命名（新名已存在或旧名不存在则抛错） */
  rename(oldName, newName) {
    const all = this._readAll();
    const o = this._norm(oldName), nn = this._norm(newName);
    if (!nn) throw new Error('新名不能为空');
    if (!Object.prototype.hasOwnProperty.call(all, o)) throw new Error('原预设不存在');
    if (o !== nn && Object.prototype.hasOwnProperty.call(all, nn)) throw new Error('新名已存在');
    all[nn] = all[o];
    if (o !== nn) delete all[o];
    this._writeAll(all);
    return true;
  }

  /** 导出全部为 JSON 字符串（便于备份/分享） */
  exportJSON() {
    return JSON.stringify(this._readAll(), null, 2);
  }

  /**
   * 从 JSON 字符串导入。merge=true 合并，false 覆盖。
   * @returns {number} 导入的预设数
   */
  importJSON(json, merge = true) {
    let incoming;
    try { incoming = JSON.parse(json); }
    catch { throw new Error('JSON 解析失败'); }
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      throw new Error('JSON 格式不是预设对象');
    }
    const base = merge ? this._readAll() : {};
    for (const [k, v] of Object.entries(incoming)) {
      const n = this._norm(k);
      if (n) base[n] = v;
    }
    this._writeAll(base);
    return Object.keys(incoming).length;
  }

  /** 清空全部 */
  clear() { this.storage.removeItem(this.key); }
}
