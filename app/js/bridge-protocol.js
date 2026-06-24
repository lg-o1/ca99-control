/**
 * bridge-protocol.js — CA99 MIDI 桥接协议（前端 ↔ 桥接进程）
 *
 * 纯逻辑、无 DOM / 无 WebSocket 依赖，可在 Node 下单元测试。
 * midi-core.js 的 WebSocket 传输模式用它来收发；Python/C# 桥按同一契约实现服务端。
 *
 * ── 协议契约 ──────────────────────────────────────────────
 * 客户端 → 桥（命令，JSON 字符串）:
 *   {"cmd":"list"}                         请求端口列表
 *   {"cmd":"selectInput","id":"<portId>"}  选择输入端口
 *   {"cmd":"selectOutput","id":"<portId>"} 选择输出端口
 *   {"cmd":"send","bytes":[0xF0,...,0xF7]}  发送原始 MIDI 字节
 *
 * 桥 → 客户端（事件，JSON 字符串）:
 *   {"evt":"hello","version":1,"transport":"winrt"}     连接握手
 *   {"evt":"ports","inputs":[{id,name,manufacturer}],"outputs":[...]}
 *   {"evt":"message","bytes":[144,60,100]}              选中输入收到的 MIDI
 *   {"evt":"error","message":"..."}                     错误
 *   {"evt":"selected","input":"<id|null>","output":"<id|null>"}  选择确认（可选）
 * ─────────────────────────────────────────────────────────
 */

export const PROTOCOL_VERSION = 1;

// ---- 命令编码（客户端发出）----
export function encodeList() {
  return JSON.stringify({ cmd: 'list' });
}
export function encodeSelectInput(id) {
  return JSON.stringify({ cmd: 'selectInput', id: id == null ? null : String(id) });
}
export function encodeSelectOutput(id) {
  return JSON.stringify({ cmd: 'selectOutput', id: id == null ? null : String(id) });
}
export function encodeSend(bytes) {
  return JSON.stringify({ cmd: 'send', bytes: Array.from(bytes, (b) => b & 0xff) });
}

// ---- 事件解析（客户端收到）----
export function parseEvent(raw) {
  let msg;
  try {
    msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return { evt: 'error', message: 'invalid JSON', _raw: raw };
  }
  if (!msg || typeof msg !== 'object' || typeof msg.evt !== 'string') {
    return { evt: 'error', message: 'malformed event', _raw: raw };
  }
  return msg;
}

// 规整端口列表为 {id,name,manufacturer} 形状
export function normalizePorts(msg) {
  const norm = (arr) => (Array.isArray(arr) ? arr : []).map((p) => ({
    id: String(p.id),
    name: p.name || '',
    manufacturer: p.manufacturer || '',
  }));
  return { inputs: norm(msg && msg.inputs), outputs: norm(msg && msg.outputs) };
}

/**
 * BridgeClient — 传输无关的协议状态机。
 * 注入一个 `send(str)` 函数（真实环境是 WebSocket.send；测试是 fake）。
 * 把收到的原始字符串喂给 handle(raw)，它会派发到对应回调。
 */
export class BridgeClient {
  constructor(opts = {}) {
    this._send = opts.send || (() => {});
    this.ports = { inputs: [], outputs: [] };
    this.selectedInput = null;
    this.selectedOutput = null;
    this.serverVersion = null;
    this.transport = null;
    // 回调
    this.onPorts = () => {};       // (ports) =>
    this.onMessage = () => {};     // (bytes[]) =>
    this.onError = () => {};       // (message) =>
    this.onHello = () => {};       // (info) =>
  }

  // ---- 出站命令 ----
  list() { this._send(encodeList()); }
  selectInput(id) {
    this.selectedInput = id == null ? null : String(id);
    this._send(encodeSelectInput(id));
  }
  selectOutput(id) {
    this.selectedOutput = id == null ? null : String(id);
    this._send(encodeSelectOutput(id));
  }
  sendMidi(bytes) { this._send(encodeSend(bytes)); }

  // ---- 入站事件 ----
  handle(raw) {
    const msg = parseEvent(raw);
    switch (msg.evt) {
      case 'hello':
        this.serverVersion = msg.version != null ? msg.version : null;
        this.transport = msg.transport || null;
        this.onHello(msg);
        break;
      case 'ports':
        this.ports = normalizePorts(msg);
        this.onPorts(this.ports);
        break;
      case 'message':
        if (Array.isArray(msg.bytes)) this.onMessage(msg.bytes.map((b) => b & 0xff));
        break;
      case 'selected':
        if ('input' in msg) this.selectedInput = msg.input;
        if ('output' in msg) this.selectedOutput = msg.output;
        break;
      case 'error':
        this.onError(msg.message || 'bridge error');
        break;
      default:
        // 未知事件忽略（向前兼容）
        break;
    }
    return msg;
  }

  // 自动挑选像 CA99/Kawai 的端口；返回 {input, output}
  autoSelect() {
    const pick = (arr) => arr.find((p) => /ca99|kawai/i.test(p.name + p.manufacturer)) || arr[0];
    const i = pick(this.ports.inputs);
    const o = pick(this.ports.outputs);
    if (i) this.selectInput(i.id);
    if (o) this.selectOutput(o.id);
    return { input: i || null, output: o || null };
  }
}

const _exports = {
  PROTOCOL_VERSION, encodeList, encodeSelectInput, encodeSelectOutput,
  encodeSend, parseEvent, normalizePorts, BridgeClient,
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = _exports;
}
