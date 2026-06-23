/**
 * midi-core.js — CA99 统一 MIDI 连接层
 * 借鉴官方 webmidi.js（reference/appui-full/lib/kawaipianojs/midi/webmidi.js）
 * 默认同时支持 USB + 蓝牙 MIDI（都通过 Web MIDI API 枚举为 MIDIPort）
 */
export class MidiCore {
  constructor() {
    this.access = null;
    this.input = null;      // 当前选中的输入端口（接收按键）
    this.output = null;     // 当前选中的输出端口（发命令）
    this.onMessage = () => {};      // 收到 MIDI 消息回调
    this.onPortsChanged = () => {}; // 端口变化回调
  }

  /** 初始化：请求 Web MIDI 访问（含 SysEx 权限） */
  async init() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('此浏览器不支持 Web MIDI API。请用 Chrome / Edge。');
    }
    this.access = await navigator.requestMIDIAccess({ sysex: true });
    this.access.onstatechange = () => this.onPortsChanged(this.listPorts());
    return this.listPorts();
  }

  /** 列出所有端口（USB + 蓝牙都在这里） */
  listPorts() {
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
    const pick = (arr) => arr.find(p => /ca99|kawai/i.test(p.name + p.manufacturer)) || arr[0];
    const i = pick(inputs), o = pick(outputs);
    if (i) this.selectInput(i.id);
    if (o) this.selectOutput(o.id);
    return { input: i, output: o };
  }

  selectInput(id) {
    if (this.input) this.input.onmidimessage = null;
    this.input = this.access.inputs.get(id);
    if (this.input) {
      this.input.onmidimessage = (e) => this.onMessage(Array.from(e.data));
    }
  }

  selectOutput(id) {
    this.output = this.access.outputs.get(id);
  }

  /** 发送原始字节数组 */
  send(bytes) {
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
