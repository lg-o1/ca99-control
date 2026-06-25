/**
 * midi-core.js — CA99 统一 MIDI 连接层
 * 借鉴官方 webmidi.js（reference/appui-full/lib/kawaipianojs/midi/webmidi.js）
 *
 * 支持两种传输（对上层 API 完全一致，前端/各模块零改动）：
 *   1. webmidi   — 浏览器 Web MIDI API（USB + 蓝牙都枚举为 MIDIPort）。默认。
 *   2. websocket — 通过桥接进程（Python/C# winrt 桥）走 WinRT MIDI，
 *                  支持 Web MIDI 看不到的 BLE-MIDI。见 bridge/ 与 bridge-protocol.js。
 *
 * 传输选择（new MidiCore() 无需传参，自动探测）：
 *   - 从局域网 IP 打开页面（非 localhost）→ 自动用 ws://<本页host>:8765 桥，
 *     所以远程设备只需打开 http://<机器IP>:8099/，不必再手填 ?bridge=。
 *   - URL ?bridge=1 / ?bridge=8765 / ?bridge=ws://host:port → 用 websocket
 *   - URL ?bridge=0 → 强制 webmidi（关闭桥）
 *   - localStorage 'ca99.bridgeUrl' → 用 websocket
 *   - 本机 localhost 且无以上配置 → webmidi（USB 直连）
 *   也可显式 new MidiCore({ bridgeUrl }) 或 new MidiCore({ mode:'webmidi' }) 强制。
 */
import { BridgeClient } from './bridge-protocol.js';

export const DEFAULT_BRIDGE_PORT = 8765;
export const DEFAULT_BRIDGE_URL = 'ws://127.0.0.1:' + DEFAULT_BRIDGE_PORT;

export class MidiCore {
  constructor(opts = {}) {
    this.access = null;
    this.input = null;      // webmidi: 当前选中的输入端口
    this.output = null;     // webmidi: 当前选中的输出端口
    this.onMessage = () => {};      // 收到 MIDI 消息回调：(bytes[]) =>
    this.onPortsChanged = () => {}; // 端口变化回调：(ports) =>

    // 传输配置
    const detected = MidiCore.detectBridgeUrl();
    if (opts.mode === 'webmidi') {
      this.mode = 'webmidi';
      this.bridgeUrl = null;
    } else if (opts.bridgeUrl) {
      this.mode = 'websocket';
      this.bridgeUrl = opts.bridgeUrl;
    } else if (opts.mode === 'websocket') {
      this.mode = 'websocket';
      this.bridgeUrl = detected || MidiCore.bridgeForHost();
    } else if (detected) {
      this.mode = 'websocket';
      this.bridgeUrl = detected;
    } else {
      this.mode = 'webmidi';
      this.bridgeUrl = null;
    }

    // websocket 内部状态
    this._ws = null;
    this._client = null;
    this._ports = { inputs: [], outputs: [] };
    this._connected = false;
  }

  /** 由当前页面主机推导桥地址：ws://<本页host>:8765。
   *  Node/无 location 时回退到 127.0.0.1。 */
  static bridgeForHost() {
    try {
      if (typeof location !== 'undefined' && location.hostname) {
        return `ws://${location.hostname}:${DEFAULT_BRIDGE_PORT}`;
      }
    } catch (e) { /* ignore */ }
    return DEFAULT_BRIDGE_URL;
  }

  /** 探测桥地址。优先级：?bridge= → localStorage → 非本机访问时自动推导 → null(用 Web MIDI)。
   *  ?bridge 接受：1/true(=本页host:8765)、0/false(强制 Web MIDI)、纯端口、纯主机、完整 ws:// URL。 */
  static detectBridgeUrl() {
    try {
      if (typeof location !== 'undefined' && location.href) {
        const u = new URL(location.href);
        if (u.searchParams.has('bridge')) {
          const q = (u.searchParams.get('bridge') || '').trim();
          if (q === '0' || q === 'false' || q === 'off') return null;          // 强制 Web MIDI
          if (q === '' || q === '1' || q === 'true') return MidiCore.bridgeForHost();
          if (/^\d+$/.test(q)) return `ws://${location.hostname}:${q}`;          // 只给端口
          if (/^wss?:\/\//i.test(q)) return q;                                   // 完整 URL
          if (!q.includes(':')) return `ws://${q}:${DEFAULT_BRIDGE_PORT}`;        // 只给主机
          return q.includes('://') ? q : `ws://${q}`;                            // host:port
        }
      }
    } catch (e) { /* ignore */ }
    try {
      if (typeof localStorage !== 'undefined') {
        const ls = localStorage.getItem('ca99.bridgeUrl');
        if (ls) return ls;
      }
    } catch (e) { /* ignore */ }
    // 未显式配置：若页面从非本机地址（局域网 IP）打开，远程浏览器无法直接 Web MIDI，
    // 自动切到同主机的桥；本机 localhost 则保持 Web MIDI（USB 直连）。
    try {
      if (typeof location !== 'undefined' && location.hostname) {
        const h = location.hostname;
        if (h !== 'localhost' && h !== '127.0.0.1' && h !== '::1' && h !== '') {
          return MidiCore.bridgeForHost();
        }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  /** 初始化：按当前传输模式连接 */
  async init() {
    if (this.mode === 'websocket') return this._initWebSocket();
    return this._initWebMidi();
  }

  // ─────────── Web MIDI 传输 ───────────
  async _initWebMidi() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('此浏览器不支持 Web MIDI API。请用 Chrome / Edge，或启用桥接模式（蓝牙）。');
    }
    this.access = await navigator.requestMIDIAccess({ sysex: true });
    this.access.onstatechange = () => this.onPortsChanged(this.listPorts());
    return this.listPorts();
  }

  // ─────────── WebSocket 桥接传输 ───────────
  _initWebSocket() {
    if (typeof WebSocket === 'undefined') {
      return Promise.reject(new Error('当前环境无 WebSocket，无法连接 MIDI 桥。'));
    }
    return new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(this.bridgeUrl);
      this._ws = ws;
      const client = new BridgeClient({ send: (s) => { if (ws.readyState === 1) ws.send(s); } });
      this._client = client;

      client.onPorts = (ports) => {
        this._ports = ports;
        this.onPortsChanged(ports);
        if (!settled) { settled = true; resolve(ports); }
      };
      client.onMessage = (bytes) => this.onMessage(bytes);
      client.onError = (m) => { console.warn('[bridge]', m); };

      ws.onopen = () => { this._connected = true; client.list(); };
      ws.onmessage = (ev) => client.handle(ev.data);
      ws.onerror = () => {
        if (!settled) { settled = true; reject(new Error(`无法连接 MIDI 桥 ${this.bridgeUrl}（桥接进程是否在运行？）`)); }
      };
      ws.onclose = () => {
        this._connected = false;
        if (!settled) { settled = true; reject(new Error(`MIDI 桥连接被关闭 ${this.bridgeUrl}`)); }
      };
      // 超时保护：3 秒内没拿到端口就用空列表 resolve（连接已建立但桥未发 ports）
      setTimeout(() => {
        if (!settled && ws.readyState === 1) { settled = true; resolve(this._ports); }
      }, 3000);
    });
  }

  /** 列出所有端口（USB + 蓝牙都在这里） */
  listPorts() {
    if (this.mode === 'websocket') {
      return { inputs: this._ports.inputs.slice(), outputs: this._ports.outputs.slice() };
    }
    const inputs = [], outputs = [];
    if (!this.access) return { inputs, outputs };
    for (const p of this.access.inputs.values()) {
      inputs.push({ id: p.id, name: p.name, manufacturer: p.manufacturer || '' });
    }
    for (const p of this.access.outputs.values()) {
      outputs.push({ id: p.id, name: p.name, manufacturer: p.manufacturer || '' });
    }
    return { inputs, outputs };
  }

  /** 自动选第一个像 CA99/Kawai 的端口 */
  autoSelect() {
    const { inputs, outputs } = this.listPorts();
    const pick = (arr) => arr.find((p) => /ca99|kawai/i.test(p.name + p.manufacturer)) || arr[0];
    const i = pick(inputs), o = pick(outputs);
    if (i) this.selectInput(i.id);
    if (o) this.selectOutput(o.id);
    return { input: i, output: o };
  }

  selectInput(id) {
    if (this.mode === 'websocket') {
      if (this._client) this._client.selectInput(id);
      return;
    }
    if (this.input) this.input.onmidimessage = null;
    this.input = this.access.inputs.get(id);
    if (this.input) {
      this.input.onmidimessage = (e) => this.onMessage(Array.from(e.data));
    }
  }

  selectOutput(id) {
    if (this.mode === 'websocket') {
      if (this._client) this._client.selectOutput(id);
      return;
    }
    this.output = this.access.outputs.get(id);
  }

  /** 发送原始字节数组 */
  send(bytes) {
    if (this.mode === 'websocket') {
      if (!this._client) throw new Error('MIDI 桥未连接');
      this._client.sendMidi(bytes);
      return;
    }
    if (!this.output) throw new Error('未选择输出端口');
    this.output.send(bytes);
  }

  /** 发送 SysEx（确保 F0 开头 F7 结尾） */
  sendSysEx(bytes) {
    const b = bytes.slice();
    if (b[0] !== 0xF0) b.unshift(0xF0);
    if (b[b.length - 1] !== 0xF7) b.push(0xF7);
    this.send(b);
  }
}
