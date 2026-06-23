# ca99-control

Kawai CA99 数码钢琴的编程控制项目 —— 逆向提取的完整 SysEx 协议 + PWA(Web MIDI) 应用 + Govee 灯光联动。

> 私有 repo。CA99 是 2020-2021 年的 Concert Artist 旗舰纯钢琴。
> 官方 PianoRemote App 闭源，本项目通过解包 + 解密官方 APK 完整提取了控制协议。

## 目录结构

```
reference/                  ← 所有调研与逆向成果（参考资料）
  protocol/                 ← CA99 SysEx 协议（逆向提取）
    01-kwmcryptor-key.txt   ← APK 解密密钥派生算法
    02-appui-format.txt     ← 解密后的 appUI 结构
    03-sysex-format.txt     ← SysEx 通用格式
    04-vt-params.txt        ← Virtual Technician 参数表
    05-sounds-ca99.txt      ← 346 个音色 + MSB/LSB/PC
    06-system-params.txt    ← 音量/混响/键盘模式等
    07-rhythms.txt          ← 100 鼓点节奏
    SUMMARY.txt             ← 协议总览
  appui-extract/            ← 从官方 APK 解密的原始数据表（金矿）
    sysex.json (1.2MB)      ← 986 条 SysEx 命令定义
    sound.json (5.3MB)      ← 7613 音色（346 为 CA99）
    vt.json (106KB)         ← VT 参数定义
    rhythm.json             ← 节奏表
    kawaipiano.js (173KB)   ← 官方 getMidi() 组帧函数
    kawaipiano.dev.js (6.5MB) ← 完整 webpack bundle（含全部逻辑）
    其他 JSON 数据表
  research/                 ← browserctl 社区调研汇总
    app-arch-summary.md     ← 架构选型（PWA+WebMIDI 最优）
    midi-light-summary.md   ← MIDI/音频→灯光项目
    govee-api-summary.md    ← Govee API（LAN UDP 同步）
    sound-limits-summary.md ← 音色限制 + VST 方案
    piano-creative-summary.md ← 创意玩法清单
app/                        ← PWA + Web MIDI 应用（待开发）
scripts/                    ← Python 原型脚本（USB 测试用）
docs/
  PLAYBOOK.md               ← 玩法规划（10个不带灯 + 结合灯）
```

## 技术方案（已确定）

- **架构**：PWA + Web MIDI API —— 一套代码，电脑(USB) + 安卓 Chrome(USB-OTG/蓝牙)都能跑
- **连接**：默认同时支持 USB 和蓝牙 MIDI（Web MIDI 把两者都当 MIDIPort，运行时让用户选）
- **协议**：直接复用 `reference/appui-extract/` 的 JSON 数据表 + `reference/protocol/` 的格式说明
- **借鉴社区**：尽量用成熟开源方案（WEBMIDI.js、Piano-LED-Visualizer、govee-python-sdk 等，见 research/）

## 快速开始

见 `docs/PLAYBOOK.md` 玩法规划，从最简单的开始。

## 关键事实速查

- CA99 键盘音源**锁死 346 音色**（固件），但可当 MIDI 控制器接电脑 VST(Pianoteq)获无限音色
- **无自动伴奏**（纯钢琴），但有 100 鼓点节奏 + 可用代码自己造伴奏
- Govee **Glide 墙灯(H6062)** 支持 LAN UDP(<50ms)可做音乐同步；**摄像头灯条(H6054)** 不支持 LAN
- SysEx 通用格式：`F0 40 7F [fn] 08 02 [v1] [v2] [part] [data] F7`
