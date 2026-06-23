/**
 * ca99.js — CA99 协议库
 * 把逆向提取的数据 (sounds/sysex/vt) 转成可发送的 MIDI 字节。
 * 纯函数 buildXxx() 便于单元测试（不依赖真实 MIDI 端口）。
 *
 * CA99 SysEx 通用格式 (来自官方 kawaipiano.js getMidi()):
 *   F0 40 7F [fn] 08 02 [v1] [v2] [part] [data...] F7
 * 切音色用标准 MIDI Bank Select + Program Change（sound.json 里有 pc/msb/lsb）
 */

export const PART = { Main1: 0x00, Main2: 0x01, Layer: 0x08, Lower: 0x09, Global: 0x0F, System: 0x7F };

/** 把 "0x50" / "80" / 80 统一转成数字 */
export function hex(v) {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    v = v.trim();
    if (v === '') return 0;
    return v.toLowerCase().startsWith('0x') ? parseInt(v, 16) : parseInt(v, 10);
  }
  return 0;
}

/**
 * 构造切音色命令（标准 MIDI，最可靠）
 * 返回 3 条 MIDI 消息：Bank MSB(CC0), Bank LSB(CC32), Program Change
 * @param {{msb:number,lsb:number,pc:number}} sound - 来自 sounds.json
 * @param {number} channel - MIDI 通道 0-15（默认 0 = Main1）
 */
export function buildSoundSelect(sound, channel = 0) {
  const ch = channel & 0x0F;
  return [
    [0xB0 | ch, 0x00, hex(sound.msb) & 0x7F],   // Bank Select MSB
    [0xB0 | ch, 0x20, hex(sound.lsb) & 0x7F],   // Bank Select LSB
    [0xC0 | ch, hex(sound.pc) & 0x7F],          // Program Change
  ];
}

/**
 * 构造 CA99 SysEx（通用格式）
 * @param {string|number} fn  function (0x10=set)
 * @param {string|number} v1  参数组
 * @param {string|number} v2  子地址
 * @param {number} part       PART.*
 * @param {number[]} data     数据字节
 */
export function buildSysEx(fn, v1, v2, part = PART.System, data = []) {
  return [0xF0, 0x40, 0x7F, hex(fn), 0x08, 0x02, hex(v1), hex(v2), part & 0x7F, ...data.map(d => d & 0x7F), 0xF7];
}

/**
 * 从 sysex.json 的某条参数定义 + 选定值，构造命令
 * @param {object} param - sysex.json 条目（含 fn/v1/v2/v4...）
 * @param {number} value - 要设的值（0-127）
 * @param {number} part
 */
export function buildParam(param, value, part = PART.System) {
  return buildSysEx(param.fn, param.v1, param.v2, part, [value & 0x7F]);
}

/** 系统：音量 (v1=0x55 v2=0x01) */
export function buildVolume(value, part = PART.System) {
  return buildSysEx(0x10, 0x55, 0x01, part, [value & 0x7F]);
}

/** 系统：混响类型 (v1=0x55 v2=0x08) 0-5 */
export function buildReverbType(value, part = PART.System) {
  return buildSysEx(0x10, 0x55, 0x08, part, [value & 0x07]);
}

/** 键盘模式 (v1=0x53 v2=0x00) 0单/1双/2分键/3四手 */
export function buildKeyboardMode(mode) {
  return buildSysEx(0x10, 0x53, 0x00, PART.System, [mode & 0x03]);
}

/** 鼓点节奏 (v1=0x56 v2=0x09) 0x00-0x63 */
export function buildRhythmSelect(index) {
  return buildSysEx(0x10, 0x56, 0x09, PART.System, [index & 0x7F]);
}

/** 把字节数组转可读 hex 字符串（调试/测试用） */
export function toHex(bytes) {
  return bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

/** 解析输入 MIDI 消息 -> {type, note, velocity, channel} */
export function parseMessage(bytes) {
  const status = bytes[0];
  const type = status & 0xF0;
  const channel = status & 0x0F;
  if (type === 0x90 && bytes[2] > 0) return { type: 'noteon', note: bytes[1], velocity: bytes[2], channel };
  if (type === 0x80 || (type === 0x90 && bytes[2] === 0)) return { type: 'noteoff', note: bytes[1], channel };
  if (type === 0xB0) return { type: 'cc', controller: bytes[1], value: bytes[2], channel };
  if (status === 0xF0) return { type: 'sysex', data: bytes };
  return { type: 'other', bytes };
}

/** 音符号 -> 名称（C4 = 60） */
export function noteName(num) {
  const names = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  return names[num % 12] + (Math.floor(num / 12) - 1);
}
