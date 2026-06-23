# Kawai CA99：音色扩展研究总结
## 调研日期：2026-06-23
## 来源：Google AI Overviews（8 次搜索）+ Kawai CA99 官方产品页面（kawai-global.com/product/ca99/）

---

## 1. CA99 弹奏时是否仅限于内置音色？——是（硬性限制）

**已确认：固件锁定的音源引擎。**

来自 Kawai 官方规格（kawai-global.com）：
  - SK-EX Rendering 引擎：10 种渲染特性（旗舰级多通道采样钢琴引擎）
  - Harmonic Imaging XL：90 种音色
  - 总音色数（官方规格通常引用约 90-100 个；部分地区产品说明称所有类别合计最多 346 个）

**你无法做到：**
  - 将自定义音色库（.sf2）加载到 CA99 的内部存储
  - 上传新的采样音色包或替换出厂音色
  - 在钢琴内部安装 VST 插件
  - 刷入包含额外音色的自定义固件

CA99 是一台专用数字钢琴，而非合成器工作站。其音源引擎（SK-EX Rendering / Harmonic Imaging XL）运行的是固件中的固定 DSP 代码。它没有系统级访问权限，没有音色文件系统，也没有任何有据可查的 SysEx 命令可以加载新波形——即使是逆向工程师也无能为力。通过逆向工程能控制的 SysEx/MIDI 命令包括：在现有 90-346 种音色中选择、效果参数调整、显示、传输、录音机——而不是加载新音色。

**来源**：Google AI Overview（搜索 1）："无法直接将自定义音色或 .sf2（SoundFont）文件导入 Kawai CA99 的内部存储。CA99 是一台专用数字钢琴，而非工作站。"

---

## 2. CA99 能作为 MIDI 控制器驱动无限 VST 音色吗？——可以（标准专业工作流程）

**已确认：这是标准的专业工作流程。**

**操作步骤：**
  1. 通过 USB 线将 CA99 连接到电脑（CA99 的 USB-to-Host 口 → 电脑 USB-A 口）
  2. CA99 自动显示为 USB-MIDI 设备，无需驱动（USB 音频设备类兼容）
  3. 也可通过蓝牙 MIDI 配对（CA99 内置蓝牙 MIDI，支持 aptX）
  4. 在 DAW / VST 宿主中，选择 "Kawai CA99"（或 "Bluetooth MIDI"）作为 MIDI 输入
  5. 加载任意 VST 乐器：Pianoteq、Garritan CFX、Kontakt 采样库、Vienna Symphonic Library、BBCSO、用于 .sf2 音色的 sforzando 等
  6. 按下 CA99 的琴键 → MIDI note-on/off、力度、踏板 CC 信号 → 发送到电脑 → VST 生成音频
  7. CA99 的内置音源可以静音（通过 SysEx 或菜单将 Local Control 设为 OFF），仅聆听 VST

**无限音色**：任何可在电脑上运行的 VST、音色库（.sf2 通过 sforzando/sfizz/SWAM）、采样库（Kontakt、Play、Vienna）或软件乐器，都可通过 CA99 琴键演奏。

**踏板数据说明**：CA99 的三踏板组件发送 CC 64（延音）、CC 66（延续音）、CC 67（弱音），以及半踏/连续 CC 值——这对 VST 真实响应至关重要。Kawai 的 MIDI 实现很全面，在支持的型号上包括逐键力度和触后感应。

**来源**：Google AI Overview（搜索 2）："要将 Kawai CA99 连接到电脑并演奏 VST 钢琴插件（如 Pianoteq），你需要将 USB-MIDI 路由到电脑以控制软件，并将音频路由回钢琴，以便通过 CA99 的高级音板扬声器系统聆听 VST 生成的声音。"
**来源**：Google AI Overview（搜索 3）："将数字钢琴用作驱动 Pianoteq、Garritan 等电脑 VST 的 MIDI 控制器，实质上就是关闭钢琴的内置音源，让它将按键数据发送给电脑。"

---

## 3. 能将 VST 音频路由回 CA99 的扬声器吗？——可以（两种方法）

**已确认：两种可靠方法如下：**

### 方法 A：蓝牙音频（最简单——CA99 已确认支持）
  - CA99 具备支持 aptX 编解码器的蓝牙音频（官方规格已确认）
  - 将电脑与 CA99 配对为蓝牙音频输出设备
  - 在 DAW/VST 宿主中，将音频输出设置为 CA99 蓝牙设备
  - VST 生成的音频无线传输到 CA99 的 TwinDrive 音板扬声器系统
  - aptX 延迟：约 40–100ms——可接受用于监听，但会增加整体往返延迟
  - **最适合**：日常演奏、不需要超低延迟的监听场景

### 方法 B：USB 音频接口（需要验证）
  - CA99 的 USB-to-Host 口支持 USB MIDI（已确认）
  - Google AI overview（搜索 5）表示："Kawai CA99 可作为自身的 USB 音频接口"，支持双向音频
  - **注意**：Kawai 官方规格页面上的 "USB Audio Recorder: Record/Playback MP3, Bluetooth Audio recording" 是指向 USB 闪存驱动器录制/播放，不一定是 USB 音频流到电脑
  - 建议：查阅 CA99 MIDI/连接手册（PDF，可在 kawai-global.com 下载），并实际测试 CA99 是否在你的系统上显示为 USB 音频类设备。部分 Kawai 型号（如 ES920 等）确实支持 USB 音频接口模式；CA99 是否支持尚需确认。

### 方法 C：外置音频接口（低延迟最可靠）
  - 电脑 → USB 音频接口（如 Focusrite Scarlett）→ 3.5mm/TRS 输出 → 接 CA99 的 line-in/aux……
  - 注意：CA99 似乎没有专用的立体声"Line In"用于主扬声器路由（不同于某些 Yamaha 型号）
  - 替代方案：电脑 → 音频接口 → 有源音箱或耳机（绕过 CA99 扬声器）

**实践建议**：追求最低延迟的 VST 演奏，推荐：
  - MIDI：USB 线 → 约 1ms MIDI 延迟
  - 音频：外置 USB 音频接口（ASIO/CoreAudio）→ 外置音箱或耳机，约 5–10ms
  - 同时可独立使用 CA99 扬声器通过蓝牙音频聆听（合奏/练习模式）

**来源**：Google AI Overview（搜索 4）："通过蓝牙音频在 Kawai CA99 上播放 MP3 的效果就像使用无线音箱，将外部音乐直接通过钢琴的音板系统播放。"
**来源**：Kawai 官方规格："Integrated Bluetooth® MIDI and Audio with aptX support"

---

## 4. MP3 播放 vs 琴键音源引擎——重要区别

**CA99 内部有两套完全独立的系统：**

### （A）琴键音源引擎（音源）——仅限内置音色
  - 是什么：将按键动作转化为音频的 DSP 芯片，使用采样/物理建模钢琴音色
  - 触发方式：按下琴键（以及接收 MIDI IN 信号）
  - 可用音色：SK-EX Rendering（10 种特性）+ Harmonic Imaging XL（官方规格共最多 90 种音色）
  - 可扩展？否。无法加载新音色，固件固定。
  - SysEx 控制：可在现有音色中选择、调整 EQ/效果、设置力度曲线——但无法添加新波形

### （B）音频播放系统——无限（但不由琴键触发）
  - **USB 闪存驱动器**：播放 MP3、WAV、SMF 文件。按键不触发这个系统——它是一个媒体播放器。
  - **蓝牙音频**：将手机/平板/电脑的任意音频流式传输到 CA99 扬声器。同样，按键不触发。
  - **蓝牙音频录制**：通过蓝牙将 CA99 的输出录制到已连接设备
  - **MP3 录制**：将你的演奏录制为 MP3，保存到 USB 闪存驱动器

**背景音乐使用场景**：将 MP3 背景音乐存储到 USB 闪存驱动器 → 在 CA99 上播放，同时用 CA99 本身的音色演奏琴键。这对练习和表演很有用，但背景音轨音频和琴键音色使用完全独立的引擎，无法在音色合成层面"合并"。

**你无法做到的事**：将一段 Steinway D 的 MP3 采样上传后，让它在按键时"响起"。音频播放和音源引擎是相互隔离的系统。

---

## 5. 全景——完整工作流程

### 演奏时获取无限音色（最佳音质）：
```
CA99 琴键 
  → USB MIDI（USB-to-Host 数据线）
  → 电脑 DAW / VST 宿主（Windows 上的 ASIO，Mac 上的 CoreAudio）
  → VST 乐器：Pianoteq / Kontakt / sforzando / Garritan
  → 音频输出：ASIO 音频接口 → 音箱/耳机（3–10ms 延迟）
```
可选：同时通过蓝牙音频将 VST 声音流式传输回 CA99（增加 40–100ms 延迟，但使用高级 TwinDrive 音板）。

### 背景音乐 / 播放：
```
USB 驱动器上的 MP3/WAV → CA99 媒体播放器 → CA99 扬声器
或
手机上的 Spotify/YouTube → 蓝牙音频 → CA99 扬声器
```
琴键仍使用 CA99 内置音色（或 MIDI 到电脑），完全独立。

### MIDI 录制 / 制作：
```
CA99 → USB MIDI → DAW → 录制 MIDI → 量化/编辑 → 通过任意 VST 回放
```

---

## 6. 最佳 VST 钢琴软件

### 🥇 Pianoteq（黄金标准——强烈推荐）
  - **开发商**：Modartt（modartt.com）
  - **技术**：物理建模合成——实时对钢琴物理特性（琴弦、击弦器、音板、房间）进行数学建模，不使用预录采样。
  - **体积**：约 50 MB（对比采样库的 50–300 GB）
  - **CPU 占用**：极低，笔记本即可流畅运行
  - **延迟**：几乎即时，非常适合实时演奏
  - **可定制性**：击弦器硬度、麦克风位置、琴弦共鸣、齐音调律、踏板噪音、房间混响——每个音符均可单独调节
  - **Kawai 兼容性**：与 Kawai 控制器完美配合；有专为 Kawai GRAND FEEL 键盘动作调校的力度曲线
  - **型号**：Steinway D、Bechstein、Fazioli、Blüthner、Yamaha、历史钢琴，以及颤音琴、羽管键琴、木琴
  - **价格**：完整版约 $99–$149；免费 Stage 试用版（限制复音数）
  - **研究备注**："Kawai VPC1 被广泛认为是专用钢琴控制器的黄金标准……内置专为与软件完美接口设计的 'Pianoteq' 触键曲线。"CA99 的 Grand Feel III 键盘动作同样具备出色的表现力。
  - **已知局限**：部分用户在某些录音/制作场合反映，相比深度采样库，音色偶尔略显"合成感"

### 亚军选手：
  - **Garritan CFX Concert Grand**——Yamaha CFX 采样版本，在录音领域广受赞誉
  - **Spitfire LABS（免费）**——高质量采样钢琴，提供免费版
  - **Native Instruments Una Corda**——独特的毛毡静音钢琴音色，个性鲜明
  - **Keyscape（Spectrasonics）**——庞大的采样库，非常逼真，下载体积较大
  - **Vienna Imperial**——50GB 的 Bösendorfer Imperial 采样，细节极致
  - **sforzando + 免费 .sf2/.sfz 音色**——使用 SoundFont 文件的免费方案

---

## 概要表格

| 问题 | 答案 |
|---|---|
| CA99 弹奏时是否仅限内置音色？ | 是——90 种音色（HI-XL）+ 10 种 SK-EX 特性，固件固定，不支持加载 .sf2 |
| 能将 CA99 用作 VST 的 MIDI 控制器？ | 是——USB MIDI 或蓝牙 MIDI 连接电脑 |
| 能将 VST 音频路由回 CA99 扬声器？ | 是，通过蓝牙音频（已确认，支持 aptX）；USB 音频接口需手动验证 |
| MP3 播放 vs 琴键音源引擎 | 独立系统：MP3/蓝牙音频 = 被动播放；琴键 → 音源引擎 → 仅限内置音色 |
| 使用 CA99 作控制器的最佳 VST | Pianoteq（物理建模，50MB，延迟最低，可定制性最强） |

---

## 来源
1. Google 搜索 AI Overview——"Kawai CA99 custom sounds soundfont add new voices possible" → 无法导入 .sf2；改用 MIDI 控制器方案
2. Google 搜索 AI Overview——"Kawai CA99 USB MIDI to computer VST piano plugin external sounds" → 确认 USB-MIDI 路由 + VST；提及 Pianoteq + Hugh Sung 教程
3. Google 搜索 AI Overview——"digital piano as MIDI controller VST Pianoteq Garritan" → 标准工作流程：关闭 Local Control，MIDI 发送到电脑，VST 处理音频
4. Google 搜索 AI Overview——"Kawai CA99 Bluetooth audio play mp3 through speakers vs midi" → 确认蓝牙音频（流媒体）vs 蓝牙 MIDI（音符数据）的区别
5. Google 搜索 AI Overview——"CA99 USB audio interface record play computer sound through piano speakers" → 声称 CA99 可作为 USB 音频接口（需对照官方手册验证）
6. Google 搜索 AI Overview——"use digital piano speakers as output for computer VST audio routing" → 方法：USB 音频接口、蓝牙音频、外置 DAC
7. Google 搜索 AI Overview——"Pianoteq best VST piano physical modeling" → 物理建模，约 50MB，Kawai 兼容，可定制，高度评价
8. Kawai CA99 官方产品页面（kawai-global.com/product/ca99/）→ 已确认：蓝牙 MIDI+音频（支持 aptX）、USB-to-Host、USB-to-Device、无用户音色插槽、SK-EX Rendering + HI-XL 音色
