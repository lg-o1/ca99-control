/**
 * piano-keyboard.js — 通用全幅（88 键）虚拟钢琴组件
 *
 * 两部分：
 *  1) 纯函数布局（可单元测试）：buildLayout / isBlack / noteName / whiteCount
 *  2) DOM 组件 PianoKeyboard（仅浏览器）：可点击发声、可高亮答案/演示、按下带炫彩
 *
 * 设计目标：每个练习/音色浏览器都能复用同一个键盘。
 *  - 点击琴键 → onNoteOn(midi) / onNoteOff(midi) 回调（由调用方决定发 MIDI 还是合成音）
 *  - 看答案 → highlightMany([{midi,color,text}]) 把要弹的键画在 88 键的真实位置上
 *  - 看演示 → flash(midi) 跟着播放节奏点亮琴键
 */

export const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
export const BLACK_PCS = [1, 3, 6, 8, 10];

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function pc(midi) { return ((midi % 12) + 12) % 12; }
export function isBlack(midi) { return BLACK_PCS.includes(pc(midi)); }
export function noteName(midi) { return NOTE_NAMES[pc(midi)] + (Math.floor(midi / 12) - 1); }

/** 默认配色：高亮答案用的炫彩调色板（按顺序循环） */
export const HL_PALETTE = ['#667eea', '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#fb7185', '#4ade80'];

/**
 * 计算键盘几何布局（纯函数）。
 * 白键等宽并排；黑键居中压在相邻两白键的缝上。
 * @returns {{first,last,whiteW,blackW,height,blackH,whiteCount,width,keys:Array}}
 */
export function buildLayout(first = 21, last = 108, opts = {}) {
  const whiteW = opts.whiteW ?? 22;
  const blackW = opts.blackW ?? Math.round(whiteW * 0.62);
  const height = opts.height ?? 130;
  const blackH = opts.blackH ?? Math.round(height * 0.62);
  if (last < first) { const t = first; first = last; last = t; }
  const keys = [];
  let whiteIndex = 0;
  for (let m = first; m <= last; m++) {
    const black = isBlack(m);
    if (black) {
      // 黑键压在当前 whiteIndex（下一个白键）位置的左侧缝上
      keys.push({ midi: m, pc: pc(m), octave: Math.floor(m / 12) - 1, name: noteName(m), black: true, x: whiteIndex * whiteW - blackW / 2, w: blackW, h: blackH });
    } else {
      keys.push({ midi: m, pc: pc(m), octave: Math.floor(m / 12) - 1, name: noteName(m), black: false, x: whiteIndex * whiteW, w: whiteW, h: height, whiteIndex });
      whiteIndex++;
    }
  }
  return { first, last, whiteW, blackW, height, blackH, whiteCount: whiteIndex, width: whiteIndex * whiteW, keys };
}

/** 统计区间内白键数量（纯函数） */
export function whiteCount(first, last) {
  let n = 0;
  for (let m = first; m <= last; m++) if (!isBlack(m)) n++;
  return n;
}

/* ===================== DOM 组件 ===================== */
/* istanbul ignore next  (浏览器渲染部分，由冒烟测试覆盖) */
export class PianoKeyboard {
  /**
   * @param {HTMLElement} container 挂载容器
   * @param {object} opts {first=21,last=108,whiteW,labels:'c'|'white'|'all'|'none',onNoteOn,onNoteOff}
   */
  constructor(container, opts = {}) {
    if (!container) throw new Error('PianoKeyboard: container required');
    this.container = container;
    this.first = opts.first ?? 21;
    this.last = opts.last ?? 108;
    this.labels = opts.labels ?? 'c';
    this.onNoteOn = opts.onNoteOn || null;
    this.onNoteOff = opts.onNoteOff || null;
    // 是否让真实 MIDI 输入像点击一样驱动该键盘的识别（"点击即作答"类练习开启）
    this.recognizeExternal = opts.recognizeExternal || false;
    this.layout = buildLayout(this.first, this.last, opts);
    this._highlights = new Map();
    this._down = new Set();
    this._render();
    PianoKeyboard.instances.add(this);
  }

  /** 该键盘当前是否显示在屏幕上（隐藏模块的容器 offsetParent 为 null） */
  isVisible() { return !!(this.container && this.container.offsetParent); }

  _render() {
    const L = this.layout;
    const scroll = document.createElement('div');
    scroll.className = 'kb-scroll';
    const inner = document.createElement('div');
    inner.className = 'kb-inner';
    inner.style.width = L.width + 'px';
    inner.style.height = L.height + 'px';

    // 先白键，再黑键（黑键 z-index 更高压在上面）
    const ordered = [...L.keys].sort((a, b) => (a.black === b.black) ? 0 : (a.black ? 1 : -1));
    for (const k of ordered) {
      const el = document.createElement('div');
      el.className = 'kb-key ' + (k.black ? 'kb-black' : 'kb-white');
      el.dataset.midi = k.midi;
      el.style.left = k.x + 'px';
      el.style.width = k.w + 'px';
      el.style.height = k.h + 'px';
      // 音名标签
      const showName = this.labels === 'all'
        || (this.labels === 'white' && !k.black)
        || (this.labels === 'c' && k.pc === 0);
      if (showName) {
        const nm = document.createElement('span');
        nm.className = 'kb-name';
        nm.textContent = k.name;
        el.appendChild(nm);
      }
      const badge = document.createElement('span');
      badge.className = 'kb-badge';
      el.appendChild(badge);
      this._wire(el, k.midi);
      inner.appendChild(el);
    }
    scroll.appendChild(inner);
    this.container.innerHTML = '';
    this.container.appendChild(scroll);
    this._scroll = scroll;
    this._inner = inner;
  }

  _wire(el, midi) {
    const down = (e) => {
      e.preventDefault();
      if (this._down.has(midi)) return;
      this._down.add(midi);
      el.classList.add('kb-press');
      this._ripple(el);
      if (this.onNoteOn) try { this.onNoteOn(midi); } catch (_) { /* ignore */ }
    };
    const up = () => {
      if (!this._down.has(midi)) return;
      this._down.delete(midi);
      el.classList.remove('kb-press');
      if (this.onNoteOff) try { this.onNoteOff(midi); } catch (_) { /* ignore */ }
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointerleave', up);
    el.addEventListener('pointercancel', up);
  }

  _ripple(el) {
    el.classList.remove('kb-flash');
    void el.offsetWidth; // 重启动画
    el.classList.add('kb-flash');
    setTimeout(() => el.classList.remove('kb-flash'), 420);
  }

  _key(midi) { return this._inner ? this._inner.querySelector(`[data-midi="${midi}"]`) : null; }

  /** 清空所有高亮 */
  clear() {
    this._highlights.clear();
    if (!this._inner) return;
    this._inner.querySelectorAll('.kb-key').forEach((el) => {
      el.classList.remove('kb-hl');
      el.style.removeProperty('--hl');
      const b = el.querySelector('.kb-badge');
      if (b) b.textContent = '';
    });
  }

  /** 高亮单个键 @param {number} midi @param {object} o {color,text} */
  highlight(midi, o = {}) {
    const el = this._key(midi);
    if (!el) return;
    const color = o.color || HL_PALETTE[0];
    el.classList.add('kb-hl');
    el.style.setProperty('--hl', color);
    const b = el.querySelector('.kb-badge');
    if (b && o.text != null) b.textContent = o.text;
    this._highlights.set(midi, o);
  }

  /** 一次性高亮一组键（先清空）。items: [{midi,color,text}] 或 [midi] */
  highlightMany(items, opt = {}) {
    if (opt.keep !== true) this.clear();
    (items || []).forEach((it, i) => {
      if (typeof it === 'number') this.highlight(it, { color: HL_PALETTE[i % HL_PALETTE.length] });
      else this.highlight(it.midi, { color: it.color || HL_PALETTE[i % HL_PALETTE.length], text: it.text });
    });
    if (opt.scroll !== false && items && items.length) {
      const ms = items.map((it) => (typeof it === 'number' ? it : it.midi));
      this.scrollToShow(Math.min(...ms), Math.max(...ms));
    }
  }

  /** 瞬时点亮（演示/播放跟随用） */
  flash(midi, color) {
    const el = this._key(midi);
    if (!el) return;
    if (color) el.style.setProperty('--hl', color);
    this._ripple(el);
    el.classList.add('kb-demo');
    setTimeout(() => el.classList.remove('kb-demo'), 360);
  }

  /** 视觉按下/抬起（外部 MIDI 输入回显用） */
  press(midi) { const el = this._key(midi); if (el) el.classList.add('kb-press'); }
  release(midi) { const el = this._key(midi); if (el) el.classList.remove('kb-press'); }

  /** 滚动让 [lo,hi] 区间可见并尽量居中 */
  scrollToShow(lo, hi) {
    if (!this._scroll || !this._inner) return;
    const a = this._key(lo), b = this._key(hi);
    if (!a || !b) return;
    const left = a.offsetLeft;
    const right = b.offsetLeft + b.offsetWidth;
    const mid = (left + right) / 2;
    const target = mid - this._scroll.clientWidth / 2;
    this._scroll.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  }

  destroy() { PianoKeyboard.instances.delete(this); if (this.container) this.container.innerHTML = ''; }
}

/* ---- 全局键盘注册表：真实 MIDI 输入回显到所有"当前可见"的键盘 ----
 * 早先只有"曲谱跟弹"用 scfKbEcho 把真琴按键点亮到屏幕 88 键；
 * 这里通用化，让任何练习的键盘都能跟随真实 CA99 按键点亮/抬起。 */
PianoKeyboard.instances = new Set();
PianoKeyboard.echoOn = (midi) => {
  for (const kb of PianoKeyboard.instances) if (kb.isVisible()) kb.press(midi);
};
PianoKeyboard.echoOff = (midi) => {
  for (const kb of PianoKeyboard.instances) if (kb.isVisible()) kb.release(midi);
};
