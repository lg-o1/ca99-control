# CA99 玩法规划 PLAYBOOK

> 从简单到复杂的玩法清单。先做 10 个**不带灯**的（纯钢琴控制），再做**结合灯**的。
> 所有玩法都基于 PWA + Web MIDI（USB/蓝牙都支持），尽量借鉴成熟社区方案。

## 技术底座（所有玩法共用）

- **连接层**：[WEBMIDI.js](https://github.com/djipco/webmidi) —— 封装 Web MIDI API，自动枚举 USB+蓝牙端口、热插拔、SysEx 支持
- **数据层**：直接 import `reference/appui-extract/sysex.json` + `sound.json` + `vt.json` + `rhythm.json`
- **发送层**：参考 `reference/appui-extract/kawaipiano.js` 的 `getMidi()` 组帧逻辑
- **默认双连接**：启动时 `navigator.requestMIDIAccess({sysex:true})` 枚举所有端口，列出 USB 和蓝牙设备让用户选（或自动选第一个含 "CA99"/"Kawai" 的）

### SysEx 速查（来自 reference/protocol/）
```
通用：    F0 40 7F [fn] 08 02 [v1] [v2] [part] [data] F7
切音色：  F0 40 7F 10 08 02 55 00 [part] [msb] [lsb] [pc] F7
VT参数：  F0 40 7F 10 08 02 50 [v2] [part] [val] F7   (v2: voicing=01 等)
音量：    F0 40 7F 10 08 02 55 01 [part] [0-127] F7
混响：    F0 40 7F 10 08 02 55 08 [part] [0-5] F7
键盘模式：F0 40 7F 10 08 02 53 00 7F [0单/1双/2分键/3四手] F7
节奏：    F0 40 7F 10 08 02 56 09 7F [0x00-0x63] F7
part：    Main1=00 Main2=01 Layer=08 Lower=09 System=7F
```

---

## 第一阶段：10 个不带灯的玩法（纯钢琴控制）

### 🟢 入门（1-2小时，验证链路）

**1. 音色浏览器**
- 列出 346 个音色（从 sound.json），点一下手机/网页按钮就切换钢琴音色
- 验证：Web MIDI 连接 + 切音色 SysEx 通
- 借鉴：官方 kawaipiano.js 的 sound 选择逻辑

**2. 一键场景（Registration）**
- 预设几套"音色+混响+VT"组合，一键切换（如"音乐会三角钢琴"、"爵士电钢"、"梦幻弦乐"）
- 借鉴：官方 registration 概念

**3. VT 实时调音台**
- 网页上几个滑块，实时调 Virtual Technician（混响深度、音色塑造、琴弦共鸣等 21 项）
- 比钢琴自带触摸屏更直观——这是你逆向出 VT 协议的直接价值

### 🟡 进阶（半天-1天，加入定时/逻辑）

**4. 每 N 拍自动换音色 ⭐（你最初的想法）**
- 定时器每 N 小节发 SysEx 切下一个音色，演奏更有趣
- 可选音色池：钢琴→电钢→弦乐→管风琴循环
- ~20 行代码，最简单的"有逻辑"玩法

**5. 力度感应换音色**
- 监听 note_on velocity：轻柔低音→弦乐，强力高音→铜管
- 读 MIDI 输入 + 阈值判断 + 切音色

**6. VT 参数渐变器 ⭐（独有杀手锏）**
- 边弹边缓慢 morph 制音共鸣/音色塑造/亮度，让钢琴"手感和音质"随时间流动
- 别人没逆向 VT 协议，做不了这个

**7. 自动鼓点伴奏陪练**
- 从 rhythm.json 选 100 种鼓点之一，配合节拍器陪练
- 借鉴：官方 rhythm 选择

### 🔴 高级（1-2周，需音乐逻辑/AI）

**8. 代码自动伴奏（CA99 没有，自己造）⭐**
- 检测你弹的和弦（[Tonal.js](https://github.com/tonaljs/tonal) 和弦识别）→ 在另一个 MIDI 声部/Layer 生成贝斯+节奏
- CA99 是纯钢琴无 arranger，这个让它独一无二
- 借鉴：music21(Python) 或 Tonal.js(JS) 和弦逻辑

**9. 智能琶音器**
- 按住和弦，脚本自动琶音化并每轮换音色
- 借鉴：Tone.js Transport

**10. AI 实时和声（Magenta）**
- 弹旋律，[@magenta/music](https://github.com/magenta/magenta-js) 的 MusicRNN 在浏览器里实时生成伴奏
- 纯前端，手机也能跑

---

## 第二阶段：结合灯光的玩法（Govee 联动）

> ⚠️ 灯光需后端：Web MIDI 在浏览器，但 Govee LAN UDP 需本地脚本/服务。
> 方案：PWA 前端 + 本地 Python/Node 后端（发 UDP 给 Glide 墙灯 H6062:4003）。
> 或用 [govee-python-sdk](https://github.com/) `prefer_lan=True`。
> 摄像头灯条 H6054 不支持 LAN，只能 App 里开机内麦克风音乐模式自己跑。

**L1. 音符→颜色（最简单）**
- note_on pitch → 颜色（hue=note/127），velocity → 亮度
- 发 UDP 给 Glide 墙灯，零延迟
- 借鉴：[Piano-LED-Visualizer](https://github.com/onlaj/Piano-LED-Visualizer)

**L2. Scriabin 色彩映射**
- 按五度圈配色（C=红 G=橙 D=黄 A=绿 E=天蓝...）
- 更有"音乐家"味道

**L3. 和弦→主色调**
- 检测和弦 → 整面墙灯主色（大调暖色、小调冷色）

**L4. MP3 跟拍（氛围模式）**
- 放 MP3 → librosa/aubio 节拍检测(FFT) → 灯跟拍变色
- 比 MIDI 复杂，适合背景/听歌
- 借鉴：[audio-reactive-led-strip](https://github.com/scottlawsonbc/audio-reactive-led-strip)

**L5. 演奏可视化大屏 + 灯**
- 网页落音可视化（Synthesia 风格）+ 墙灯同步律动
- 借鉴：Midiano、midee

**L6. 双灯协同**
- Glide 墙灯走 LAN UDP（你的代码控制音符颜色）
- 摄像头灯条开机内音乐模式（自己跟环境声）
- 或用 SignalRGB(Windows) 统一驱动两个灯

---

## 开发路线（建议顺序）

```
Phase 0: scripts/ 下 Python mido + USB 先验证协议（切音色/VT/节奏都通）
Phase 1: app/ 搭 PWA 骨架（WEBMIDI.js + 端口选择 + sysex.json 导入）
         → 实现玩法 1,2,3（音色浏览器/场景/VT调音台）
Phase 2: 玩法 4,5,6,7（定时/力度/渐变/鼓点）
Phase 3: 玩法 8,9,10（自动伴奏/琶音/AI）
Phase 4: 灯光后端 + L1-L6（先 Glide 墙灯音符→颜色）
```

## 借鉴的成熟社区方案清单

| 用途 | 项目 | 语言 |
|------|------|------|
| Web MIDI 封装 | WEBMIDI.js | JS |
| MIDI→灯 | Piano-LED-Visualizer | Python |
| 音频→灯(FFT) | audio-reactive-led-strip | Python |
| Govee LAN 控制 | govee-python-sdk / govee-py(wez) | Python |
| 和弦识别 | Tonal.js / music21 | JS / Python |
| AI 作曲/和声 | @magenta/music | JS |
| 生成音乐 | Tone.js | JS |
| 落音可视化 | Midiano / midee | 浏览器 |
| PC音频→Govee | LumiSync / SignalRGB | Python/Win |

详见 `reference/research/` 各 summary。
