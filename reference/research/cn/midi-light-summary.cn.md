# MIDI + LED 灯光同步研究总结
# 适用对象：拥有 Kawai CA99 钢琴、希望 Govee 灯光与颜色+节奏联动的用户
# 日期：2026-06-23

==========================================================================
## 1. MIDI → LED 项目（GitHub / 社区）
==========================================================================

### A. Piano-LED-Visualizer（onlaj）
- URL: https://github.com/onlaj/Piano-LED-Visualizer
- 语言：Python
- 工作原理：通过 MIDI 将 LED 灯带连接到数字钢琴，演奏时同步 LED 灯光效果。
  提供 WS2812B 灯带和 Raspberry Pi 的详细硬件接线说明。
- 与 Kawai CA99 的相关性最强（MIDI 输出 → Raspberry Pi → 键下 LED 灯带）。

### B. Piano-lights-sw（ddribin）
- URL: https://github.com/ddribin/piano-lights-sw
- 语言：Python / Raspberry Pi
- 工作原理：读取 MIDI Note On/Off 事件，将音符映射到 HSV 色谱。
  可通过电位器调节饱和度/亮度。轻量级实现。

### C. midi-light-py（dodgyrabbit）
- URL: https://github.com/dodgyrabbit/midi-light-py
- 语言：Python（Raspberry Pi）
- 工作原理：挂墙式氛围灯脚本。实时处理 MIDI 输入，在可寻址 LED 灯带上营造氛围/情绪效果。

### D. LightSync-MIDI（Yogarathinam）
- URL: https://github.com/Yogarathinam/LightSync-MIDI
- 语言：Python GUI + ESP32 固件
- 工作原理：Python GUI 通过 ESP32 微控制器将 MIDI 输入映射到 WS2812B/ARGB LED 灯带。
  支持 61、76 和 88 键布局，颜色、亮度和效果均可自定义。
  创建于 2024 年 7 月。

### E. music-to-led（tfrere）
- URL: https://github.com/tfrere/music-to-led
- 语言：Python + Arduino + Electron
- 工作原理：在 LED 灯带上实现实时音频和 MIDI 可视化的开源应用。
  16 种可视化效果，8 种模式，可通过专用 MIDI 通道实时切换效果。
  配置更复杂，功能更完整。

### F. midi-piano-lights（cohnt）
- URL: https://github.com/cohnt/midi-piano-lights
- 语言：Python 脚本
- 工作原理：LED 灯带连接到带 MIDI 输出的电子键盘。脚本集合。

### G. midi-lights（ohnoitsalobo）
- URL: https://github.com/ohnoitsalobo/midi-lights
- 语言：Arduino（ESP8266）
- 工作原理：根据 ESP8266 串口接收到的 MIDI 信号点亮 LED 灯带。

### H. midi-visualiser（benjaminrall）
- URL: https://github.com/benjaminrall/midi-visualiser
- 语言：Python + Pygame
- 工作原理：MIDI 播放器/可视化工具，自动为不同 MIDI 通道的音符分配不同颜色。

### I. Raspberry Pi 教程（Aaron Chambers）
- URL: https://www.raspberrypi.com/news/...（2019 年 4 月 10 日）
- 使用 Raspberry Pi + Python 将 MIDI 输入绑定到 LED 灯。

==========================================================================
## 2. 音频 / MP3 响应式 LED 项目（FFT 节拍检测）
==========================================================================

### A. audio-reactive-led-strip（scottlawsonbc）← 经典之作
- URL: https://github.com/scottlawsonbc/audio-reactive-led-strip
- 语言：Python + ESP8266 或 Raspberry Pi
- 工作原理：LED 灯带实时音乐可视化。FFT → 频段分解（低音/中音/高音）
  → 颜色/亮度命令通过 Wi-Fi UDP 发送到 ESP8266。
  音频响应式 LED 项目的权威参考实现。

### B. dancyPi-audio-reactive-led（ibielopolskyi）
- URL: https://github.com/ibielopolskyi/dancyPi-audio-reactive-led
- 语言：Python（Raspberry Pi）
- 工作原理：使用 numpy 分析系统音频，在 LED 灯带上可视化呈现。可改造为
  向 Govee API 端点发送颜色/亮度数据。主从架构。

### C. music-to-led（tfrere）——同时支持音频
- URL: https://github.com/tfrere/music-to-led（同上）
- 同时支持 MIDI 和音频响应可视化。

### D. FastLED 音频示例
- URL: https://fastled.io/docs（高级音频示例）
- FFT 分析、节拍检测、可寻址 LED 的多种可视化技术。

### E. Instructables / Medium 教程
- "Make Lights React to Audio"（Instructables，2015 年 2 月 15 日）
- "Music to LED strip tutorial (using Fourier Transform)"（Medium，Yolanda Luque H.）
- 这些教程解释了 FFT 流程：麦克风 → PyAudio → numpy FFT → 低频峰值 → 节拍。

==========================================================================
## 3. Govee + 音乐同步（自定义方案，超越官方 App）
==========================================================================

### A. LumiSync（Minlor）← 最适合 Govee 的方案
- URL: https://github.com/Minlor/LumiSync
- 语言：Python（PyQt6 GUI）
- 工作原理：桌面应用，捕获 PC 音频输出或麦克风声音，通过 BLE（蓝牙低功耗）动态同步到
  Govee 灯具。实时音乐同步。
  标签：python、led、govee、govee-api、govee-light。

### B. govee-control-scripts（tayiorbeii）
- URL: https://github.com/tayiorbeii/govee-control-scripts
- 语言：Python
- 工作原理：通过 Govee API 控制 Govee 灯具的脚本集合。需要从 Govee App
  获取 API Key（个人资料 → 齿轮图标 → 申请 API Key）。

### C. govee-py（wez）
- URL: https://github.com/wez/govee-py
- 语言：Python
- 工作原理：Govee HTTP 和 LAN API 的 Python 库，为 Home Assistant 而构建。
  支持 LAN 设备发现（零延迟本地 UDP 控制）。自定义脚本的基础库。
  相关项目：hacs-govee-lan（Home Assistant 集成）。

### D. govee2mqtt（wez）
- URL: https://github.com/wez/govee2mqtt
- 语言：Python / Home Assistant Add-On
- 工作原理：Govee 本地 LAN API 的 HA 插件，支持在 Govee 灯具上设置 DIY 场景。
  可通过 MQTT 桥接设置自定义颜色场景。

### E. Govee LAN API（官方）
- URL: https://lan.govee.com
- 协议：本地 UDP，设备端口 4003，主机端口 4001。零延迟本地控制。
  命令：`{"msg":{"cmd":"colorwc","data":{"color":{"r":255,"g":0,"b":0},"colorTemInKelvin":0}}}`
  前提：在 Govee App 设备设置中启用 "LAN Control" + 更新固件。

### F. govee-py2（Sxzo）
- URL: https://github.com/Sxzo/Govee-Python-Library（pip install govee-py2）
- 用于 Govee 智能灯具的简单 Python 接口。

### G. Govee Music Sync Box（硬件）
- URL: https://us.govee.com（硬件产品）
- 官方硬件同步盒，控制同一空间内的 Govee 灯具。但仅限 Govee 生态系统。

### H. Reddit 社区脚本
- r/Govee："I developed a script that syncs smart lights with RPM"（2024 年 7 月 13 日）
- 记录了各种 DIY 方案，部分使用屏幕截图颜色均值 + Govee API。

==========================================================================
## 4. 音符 → 颜色映射方案
==========================================================================

### A. 斯克里亚宾的 Clavier à Lumières（五度圈映射）
Wikipedia: https://en.wikipedia.org/wiki/Clavier_%C3%A0_lumi%C3%A8res
按照五度圈（而非半音音阶）排列：
  C  → 红（深沉/浓烈的红）
  G  → 橙黄
  D  → 黄
  A  → 绿
  E  → 天蓝（月光/霜冻）
  B  → 明蓝 / 钢蓝  
  F# → 明蓝 / 紫罗兰
  Db → 紫罗兰
  Ab → 紫 / 紫罗兰
  Eb → 玫瑰 / 肤色（钢铁的闪光）
  Bb → 玫瑰 / 肤色
  F  → 深红 / 亮红
注：按五度圈排列时，颜色构成一段光谱——这并非偶然。
斯克里亚宾将"较浅的颜色"（蓝色/紫色）与"精神"相联系，较深的色调则对应"物质"（神智学理念）。

### B. 常见通感 / 音级到色相映射（软件项目采用）
  C  → 红（0°）
  C# → 红橙（30°）
  D  → 橙（60°）
  D# → 黄橙
  E  → 黄（90°）
  F  → 黄绿
  F# → 绿（150°）
  G  → 青（180°）
  G# → 浅蓝
  A  → 蓝（210°）
  A# → 靛蓝
  B  → 紫（270°）
将 12 个音级均匀分布在色轮上（每个半音 30°）。

### C. MIDI 音符线性 → 色相（最简单，piano-lights-sw、LightSync-MIDI 采用）
  hue = note_number / 127.0（0.0 到 1.0，再转 HSV → RGB）
  低音 = 色谱红端，高音 = 紫端。
  力度（0-127）→ 亮度（HSV 中的 Value）。

### D. 五度圈 / 色度圆（高级项目采用）
  将半音音阶的 12 个音符映射到色轮。
  C=红、C#=红橙、D=橙……到 B 绕回。
  模拟最常见的真实音乐通感体验。

### E. Synthesia Synesthesia（rileyjshaw）
- URL: https://github.com/rileyjshaw/synthesia
- React/Canvas 网页项目，在浏览器中将特定 MIDI 音符映射到指定颜色。

### F. Chromestesia（Python/Raspberry Pi 项目）
- 监听电子键盘，将按下的音符映射颜色并点亮对应 RGB LED。

==========================================================================
## 5. MIDI 同步（简单）vs MP3 同步（需 FFT）
==========================================================================

### 路径 A：MIDI → 灯光（简单——有离散事件）← Kawai CA99 天然适合
Kawai CA99 具有 MIDI 输出（USB-MIDI 和标准 MIDI DIN）。
流程：
  CA99 MIDI 输出 → USB → PC/Raspberry Pi → Python（mido 或 python-rtmidi）
                                           → 音符映射到颜色（HSV/Scriabin）
                                           → 通过 LAN API（UDP）发送到 Govee
                                           → Govee 灯具实时响应

优势：
- 节拍零延迟：note_on 事件在按键的瞬间精确触发
- 无需音频处理——音高、力度、时序信息随 MIDI 事件直接获取
- 力度直接映射为亮度
- note_on → 灯亮，note_off → 灯灭或渐隐
- 和弦检测轻而易举（多个同时发生的 note_on 事件）
- 库：mido（纯 Python）、python-rtmidi（更快，C++ 后端）

代码骨架：
```python
import mido
# 监听 MIDI 事件
with mido.open_input() as port:
    for msg in port:
        if msg.type == 'note_on' and msg.velocity > 0:
            hue = msg.note / 127.0
            brightness = msg.velocity / 127
            # → 发送到 Govee LAN API
```

### 路径 B：MP3 / 音频 → 灯光（较难——需要 FFT 分析）
播放录音（MP3/WAV）且无可用 MIDI 信号时使用。
流程：
  音频流 → PyAudio（采集）→ numpy FFT（频率分析）
          → 提取低音/节拍频段（50-150 Hz 峰值 = 节拍）
          → 振幅映射到亮度，频率映射到颜色
          → 通过 LAN API 发送到 Govee

步骤：
1. 音频采集：PyAudio（麦克风或系统音频回环）
2. FFT：对音频块做 numpy.fft.rfft()（如 44100 Hz 下 1024 个采样点）
3. 节拍检测：监测低频段能量；峰值 = 节拍
   - 简单方法：能量阈值 / 起始点检测
   - 库：librosa（beat_track、onset_detect）、aubio（起始点/节拍）
   - Web：Web Audio API AnalyserNode.getByteFrequencyData()
4. 颜色：将主频率映射到色相，振幅映射到亮度
5. 发送：HTTP/UDP 到 Govee LAN API

关键库：
- librosa：beat_track()、速度检测、onset_detect（最适合离线 MP3）
- aubio：实时起始点/节拍检测（更快，适合现场音频）
- scipy.signal.fft：需要底层控制时手动 FFT
- PyAudio / sounddevice：从麦克风或系统输出采集音频

延迟挑战：音频分析约增加 50-200ms 延迟，Govee LAN API 约增加 10-20ms。
现场演奏时，MIDI 远优于音频路径。

### 混合方案（推荐给 Kawai CA99 用户）：
- 弹钢琴时：使用 MIDI 路径（实时、精准、零延迟）
- 听 MP3 时：使用音频响应路径（FFT 节拍检测）
- LumiSync（Govee BLE）或基于 govee-py（LAN）的自定义脚本可处理这两种模式

==========================================================================
## 6. 以 Home Assistant 为枢纽整合 Govee + 自动化
==========================================================================

### 集成方式："Govee Lights Local"（官方 HA 集成）
- 设置 → 设备与服务 → 添加集成 → "Govee Lights Local"
- 前提：在 Govee App 中启用 LAN Control + 连接同一 WiFi 网络
- 通过 UDP 广播自动发现设备
- 控制：颜色、亮度、效果、开/关

### MIDI → Home Assistant 桥接
- 工具：midi2mqtt（GitHub）——监听硬件 MIDI，将事件发布到 MQTT broker
- 在 HA 中：触发器监听特定 MIDI 事件载荷（note_on、特定 CC 值）
- 动作：为 Govee 设备调用 light.turn_on，附带 RGB + 亮度参数

### LedFx 集成
- LedFx：开源音频可视化工具（https://www.ledfx.app）
- 实时音频节拍分析 → 通过 API 将颜色帧同步到 HA 灯具
- HA 可通过自身 API 控制 LedFx

### 典型 HA 自动化流程：
  触发器：来自 midi2mqtt 的 MQTT 消息（note_on C4）
  条件：（可选，如一天中的时间段）
  动作：light.turn_on {entity_id: govee_strip, rgb_color: [255, 0, 0], brightness: 200}

### Govee 社区：DIY 场景
- govee2mqtt（wez）支持在 HA 中为 Govee 灯具设置 DIY 场景
- DIY 场景 = 自定义颜色分段图案，可与音乐节拍同步

==========================================================================
## 7. 针对 Kawai CA99 用户的推荐方案
==========================================================================

最简直接路径：
1. 以 Piano-LED-Visualizer（onlaj）为参考起点
   → https://github.com/onlaj/Piano-LED-Visualizer
2. 将 CA99 USB-MIDI 连接到 Raspberry Pi（或 Windows PC）
3. 使用 mido 捕获 note_on/off 事件
4. 使用以下任一方案将音符映射到颜色：
   - 方案 A：Scriabin 五度圈颜色表（艺术性强，传统经典）
   - 方案 B：hue = note/127.0（平滑渐变，视觉冲击力强）
   - 方案 C：音级（note % 12）→ 12 种固定 Scriabin 颜色
5. 通过 LAN API（wez/govee-py）或 Home Assistant 将颜色发送到 Govee

针对 Govee 的具体方案：
- LumiSync（Minlor）是最接近"即插即用"的 Govee 音乐同步脚本
  → https://github.com/Minlor/LumiSync（使用 BLE）
- wez/govee-py 最适合通过 LAN API 编写自定义 Python 脚本
  → https://github.com/wez/govee-py

==========================================================================
## 主要 URL 汇总
==========================================================================
GitHub 项目：
- https://github.com/onlaj/Piano-LED-Visualizer
- https://github.com/ddribin/piano-lights-sw
- https://github.com/dodgyrabbit/midi-light-py
- https://github.com/Yogarathinam/LightSync-MIDI
- https://github.com/tfrere/music-to-led
- https://github.com/scottlawsonbc/audio-reactive-led-strip
- https://github.com/ibielopolskyi/dancyPi-audio-reactive-led
- https://github.com/Minlor/LumiSync
- https://github.com/wez/govee-py
- https://github.com/wez/govee2mqtt
- https://github.com/tayiorbeii/govee-control-scripts
- https://github.com/benjaminrall/midi-visualiser
- https://github.com/rileyjshaw/synthesia

Wikipedia / 参考资料：
- https://en.wikipedia.org/wiki/Clavier_%C3%A0_lumi%C3%A8res（斯克里亚宾音色映射）

Home Assistant：
- https://www.home-assistant.io/integrations/govee_ble/ 
- https://www.home-assistant.io/integrations/govee_light_local/

LedFx：
- https://www.ledfx.app

==========================================================================
总结完毕
==========================================================================
