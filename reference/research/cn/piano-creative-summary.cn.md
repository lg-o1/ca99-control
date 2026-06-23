# Kawai CA99 创意 MIDI/SysEx 项目——灵感指南
## 通过 browserctl 调研，保存于 2026-06-23 01:43

---

## 📱 能从手机上运行吗？

**Android（Chrome/Edge/Opera）**：可以——Web MIDI API 完全支持。连接 CA99 的方式：
- USB："To Host" 数据线 + USB OTG（USB-C to USB-A）转接头（约数美元）  
- 蓝牙 MIDI：使用 Yamaha MD-BT01 等适配器，在 Android 设置中配对

**iOS（Safari）**：原生不支持。变通方案：从 App Store 安装 MIDIWeb，充当桥接。

**手机使用的经验法则**：只要使用 Web MIDI API（浏览器 JS），就能在 Android Chrome 上运行，无需任何 App，也不需要电脑。
来源：supersimplepiano.com "Web MIDI in 2026: Which Browsers Actually Work"、StudioCode.dev、Piano Buyer

---

## 🎨 类别一：自动切换音色 / 生成式音色变化 ⭐（用户案例）

### 1a. 节拍触发音色轮换
**创意**：每 N 小节发送一次 SysEx/Program Change，让 CA99 循环切换音色（三角钢琴 → 弦乐 → 颤音琴 → 羽管键琴……）。
**手机可用**：是——纯 Web MIDI JS，无需后端
**代码量**：约 20–50 行 Python 或 JS
**库**：mido（Python）、WebMIDI.js（JS）
**备注**：SysEx 已经逆向工程完毕。本质上只是一个定时器 + 发送 SysEx，可从精选列表中随机选取。

### 1b. 演奏表情响应音色切换
**创意**：实时监测演奏力度/音区。低音区轻弹 → 切换到弦乐/大提琴音色；高音区重击 → 切换到主奏合成器/铜管。
**手机可用**：是（Web MIDI 实时读取音符力度）
**代码量**：约 50–100 行
**库**：mido、python-rtmidi 或 WebMIDI.js
**来源**：Google AI overview on q1-creative-midi

### 1c. "当前调性"音阶锁定 + 音色切换
**创意**：定义一个音阶，将错误音符自动吸附到音阶内最近的音。每次通过 App 按钮更改调性时，自动切换 CA99 的音色。
**手机可用**：是——手机浏览器可通过 WebMIDI 向 CA99 发送 SysEx
**代码量**：约一个周末（音阶吸附 + 调性选择 UI）
**库**：WebMIDI.js、Tone.js（音阶逻辑）
**来源**：q1-creative-midi AI overview

### 1d. Virtual Technician 参数随机化器
**创意**：每 N 小节，在音乐合理范围内随机化 VT 参数（触键感、音色调整、制音踏板共鸣），使音色持续演变。
**手机可用**：是——SysEx 协议已在你手中
**代码量**：约 30 行（难点已攻克：SysEx 已逆向完毕）
**这是 CA99 用户独有的功能——几乎没有人能做到！**

---

## 🎹 类别二：自动伴奏 / 和声化 ⭐（CA99 没有内置编曲功能——用代码补上！）

### 2a. 和弦检测 + 伴奏生成
**创意**：监听你弹奏的音符，推断隐含和弦（C 大调、G7 等），生成低音+节奏伴奏型并将其发回 CA99（通过不同 MIDI 通道触发不同音色）。
**手机可用**：部分——和弦检测数学运算可在 JS 中完成；ML 模型需要一个小型服务器
**代码量**：基于规则的方案约需一个周末；基于 ML 的方案需 2–4 周
**库**：
  - Python: music21、autochord、music-x-lab/midi-chord-recognition + mido
  - JS: Tonal.js（和弦检测）、WebMIDI.js（输出）
**来源**：q5-generative-harmonize、Loopy Pro Forum（自动 MIDI 伴奏生成器）、q3-python-mido

### 2b. 智能自动琶音器
**创意**：持续按住和弦时，脚本自动生成琶音型并通过独立 MIDI 通道发回 CA99，每次循环重置时切换音色。
**手机可用**：是——纯 JS
**代码量**：约 100–200 行 JS 或 Python
**库**：Tone.js（调度）、WebMIDI.js
**来源**：q1-creative-midi AI overview

### 2c. AI 和声化（Google Magenta）
**创意**：演奏旋律，Google 的 Magenta.js AI 实时生成和声伴奏（基于古典/爵士乐训练）。
**手机可用**：是——Magenta.js 完全在浏览器内运行（TensorFlow.js）
**代码量**：1–2 天（Magenta 提供即用模型）
**库**：@magenta/music（Magenta.js）、html-midi-player（cifkao 在 GitHub 上用到了它）
**来源**：q2-webmidi-github（html-midi-player 由 @magenta/music 驱动）

### 2d. 马尔可夫链和弦进行
**创意**：用你喜欢的和弦进行训练马尔可夫模型；根据你刚弹奏的内容，实时生成下一个和弦。
**手机可用**：是（预训练后使用）；JS 的马尔可夫实现非常轻量
**代码量**：约一个周末
**库**：musicpy（Python 高级接口）、mido
**来源**：q3-python-mido、q5-generative-harmonize

---

## 🌈 类别三：可视化 / 灯光秀

### 3a. 瀑布式音符可视化（Rousseau 风格）
**创意**：连接 CA99 的 MIDI，弹奏并录制 Synthesia/SeeMusic 风格的瀑布式音符下落视频，用于 YouTube。
**手机可用**：部分——Midiano（midiano.com）可在浏览器/手机 Chrome 中运行
**代码量**：零（使用现有工具）到约一个周末（自制 Web 可视化）
**工具/项目**：
  - Synthesia（商业软件，Windows/Android App）
  - SeeMusic（商业软件，YouTube 专业输出）
  - Midiano（开源，基于浏览器——可在手机上运行！）
  - midee（GitHub: aayushdutt/midee——浏览器 MIDI 工作室，支持导出 1080p 视频）
  - html-midi-player（GitHub: cifkao/html-midi-player——可嵌入的瀑布式可视化）
  - midi-jumper（GitHub: rfranr/game.midi-jumper——Three.js 3D 可视化）
**来源**：q2-webmidi-github、q4-lightshow-visualizer、q8-reddit-cool-things

### 3b. 钢琴键下 LED 灯带
**创意**：WS2812B 可寻址 LED 安装在琴键导轨下方。每个音符触发 MIDI → Arduino/RPi → LED 以对应颜色点亮精确的琴键。
**手机可用**：否——需要微控制器硬件
**代码量**：1–2 个周末（硬件搭建 + 编码）
**工具**：Arduino/RPi + FastLED 库，klearliu 的"Ultimate Guide to Piano LED"（YouTube 教程，33 分钟）
**来源**：q4-lightshow-visualizer

### 3c. Philips Hue 通感式房间灯光
**创意**：每个音符 → 颜色映射到 Philips Hue 灯泡。DX Wu 在 GitHub Pages 上的开源项目。
**手机可用**：是——Chrome Web MIDI 网页应用
**代码量**：接近零（开源项目已存在：dxwu.github.io/Synesthesia）
**库**：Philips Hue API + WebMIDI.js
**来源**：q4-lightshow-visualizer AI overview

### 3d. 实时 Canvas/粒子可视化
**创意**：浏览器 canvas 展示由音符触发的粒子爆炸、颜色冲刷、水墨晕染效果。p5.js + WebMIDI。
**手机可用**：是——p5.js 浏览器 canvas + WebMIDI
**代码量**：约一个周末
**库**：p5.js（Processing 的 Web 版）、WebMIDI.js
**来源**：q2-webmidi-github Facebook 帖（提到 webmidi + P5）

---

## 🎮 类别四：练习与学习游戏

### 4a. 瀑布式音符学习游戏
**创意**：将 MIDI 文件显示为下落的音条；连接 CA99 后，击中/漏掉音符时给出反馈（如有灯光）。
**手机可用**：是——开源浏览器 App
**代码量**：零（使用现有工具）；自制需 1–2 周
**项目**：
  - Midiano（midiano.com——开源，浏览器运行，手机友好）
  - Sightread（github.com/sightread/sightread——React，含 "Sheet Hero" 模式）
  - PianoFun（github.com/victorantos/PianoFun）
  - PianoBooster（桌面端，GitHub: pianobooster/PianoBooster）
**来源**：q6-learning-game

### 4b. 音符识别 / 听音训练游戏
**创意**：App 播放一个音符（向 CA99 发送 MIDI 让其发声），你需要辨认并弹奏出来。计分 + 连击统计。
**手机可用**：是——Chrome 中的 WebMIDI
**代码量**：约一个周末
**库**：WebMIDI.js、Tone.js

### 4c. 视奏训练器
**创意**：随机显示乐谱或和弦；从 MIDI 中检测你实际弹奏的内容；对时值和准确性打分。
**手机可用**：是——Sightread 已在浏览器中实现
**代码量**：零（Sightread 已存在）；自制需数周
**来源**：q6-learning-game

### 4d. 爵士钢琴训练器
**创意**：Reddit 上已有项目——Python + mido + rtmidi 读取 MIDI，实时测试爵士乐理/和弦排列。
**手机可用**：否——需要 Python 后端（但可通过 Termux 在手机上托管）
**代码量**：1–2 个周末
**来源**：q3-python-mido（r/madeinpython 帖）

### 4e. Midi Survivor（网页游戏）
**创意**：弹奏特定音符才能在实时游戏中生存（字面意义上"弹钢琴才能活命"）。
**手机可用**：是——通过 WebMIDI 运行的浏览器游戏
**来源**：q2-webmidi-github（YouTube: Fun With Computer Vision，2026 年 2 月）

---

## 🤖 类别五：生成式 / 算法音乐

### 5a. 氛围生成循环
**创意**：代码自动生成演变中的 MIDI 序列（环境音乐），无需人工演奏，自动通过 CA99 播放。
**手机可用**：JS 版可以；配合小型 Python 服务器效果更好
**代码量**：约 1–2 天（基于规则）；约 1 周（马尔可夫）
**库**：musicpy（Python）、Tone.js（JS Transport）、mido

### 5b. 随机/分形作曲器
**创意**：L 系统、概率矩阵或分形算法生成和弦进行，通过 MIDI 输出到 CA99。
**手机可用**：否（需要 Python 后端）或 是（JS 实现）
**代码量**：1–2 个周末
**库**：musicpy、GenAI_ChordRhythmChain_Music（GitHub）
**来源**：q5-generative-harmonize（Valerio Velardo 的 "Sound of AI" 频道，使用生成语法进行和弦生成）

### 5c. LSTM/Transformer AI 作曲
**创意**：训练或使用预训练模型（Magenta MusicRNN），实时生成你演奏的延续乐段。
**手机可用**：是——Magenta.js（TensorFlow.js）在 Chrome 中运行
**代码量**：集成 Magenta.js 需 1–2 天
**库**：@magenta/music、miditok（ML 词元化）
**来源**：q3-python-mido、q5-generative-harmonize

---

## 📼 类别六：录制与分析

### 6a. 实时 MIDI 捕获 → 自动生成乐谱
**创意**：通过 MIDI 录制演奏，用 music21 进行量化 + 转录 → 导出 MusicXML/PDF 乐谱。
**手机可用**：否——需要 Python 后端（music21 仅限 Python）
**代码量**：约 1 天（music21 内置 MIDI→乐谱转换）
**库**：music21、mido

### 6b. 演奏分析仪表盘
**创意**：跟踪你的练习情况：哪些音符弹对/弹错了，力度模式，速度一致性。可视化趋势。
**手机可用**：数据采集是（WebMIDI）；分析否（Python）
**代码量**：完整仪表盘需 1–2 个周末
**库**：mido、pandas、plotly

### 6c. MIDI 素材回收 / 模式变奏器
**创意**：录制一个乐句，脚本自动创建变奏（逆行、倒影、扩张、叠加）。
**手机可用**：否（Python）
**代码量**：约 1 天
**来源**：q1-creative-midi（r/FL_Studio 中的 "RECYCLER" Python 脚本）

---

## 💡 类别七：智能家居 / 趣味集成

### 7a. 钢琴 → 智能家居触发器
**创意**：特定音符模式触发智能家居场景（连按三下 C5 → 打开客厅灯；弹一个和弦 → 通过 Home Assistant 启动咖啡机）。
**手机可用**：是——Web MIDI + Fetch API → Home Assistant webhook
**代码量**：约 50 行

### 7b. Rousseau 风格 YouTube 内容
**创意**：录制 CA99 MIDI 演奏 → 导入 SeeMusic/Piano VFX → 与俯拍摄像机画面同步 → 制作 YouTube 视频。
**手机可用**：否（视频剪辑需要桌面端）
**代码量**：零代码；创意制作上的投入
**来源**：q8-reddit-cool-things、r/synthesia 社区

### 7c. MIDI Surf 作为手机遥控器
**创意**：midisurf.app 是一款免费的基于 Web 的 MIDI 控制器——用手机浏览器作为控制器，通过 BLE MIDI 无线向 CA99 发送 CC/音符。
**手机可用**：是——这是一个 PWA（可安装）
**代码量**：零（App 已在 midisurf.app 上线）
**来源**：q7-phone-control

---

## 📚 关键库与项目参考

| 库/项目 | 语言 | 功能 | 手机可用？ |
|---|---|---|---|
| mido | Python | MIDI I/O、端口、文件 | 否（Python）|
| python-rtmidi | Python | 低延迟 MIDI 后端 | 否 |
| music21 | Python | 乐理、MIDI→乐谱 | 否 |
| musicpy | Python | 高级音乐编程 | 否 |
| miditok | Python | MIDI ML 词元化 | 否 |
| autochord | Python | 从 MIDI 检测和弦 | 否 |
| WebMIDI.js | JS | Web MIDI 封装库 | 是 |
| Tone.js | JS | 浏览器音频调度 | 是 |
| @magenta/music | JS | Google AI 音乐生成 | 是 |
| p5.js | JS | Canvas 可视化 | 是 |
| Tonal.js | JS | JS 版乐理库 | 是 |
| Midiano | Web 应用 | 钢琴学习，开源 | 是 |
| Sightread | Web 应用 | 视奏训练器 | 是 |
| html-midi-player | Web | 可嵌入 MIDI 可视化 | 是 |
| PianoFun | Web | 学习游戏，GitHub | 是 |
| midee | Web | MIDI 工作室，1080p 导出 | 是 |
| midi-jumper | Web | Three.js 3D 可视化 | 是 |
| WebMIDICon（dtinth）| Web | 浏览器 MIDI 乐器 | 是 |
| Synthesia | 桌面/Android | 瀑布式音符学习 | 仅 Android |
| SeeMusic | 桌面 | 专业可视化视频 | 否 |
| MIDI Surf | PWA | 手机 → 钢琴 MIDI 控制器 | 是 |
| PianoBooster | 桌面 | MIDI 学习游戏 | 否 |

---

## 🌟 给本用户的 Top 5 推荐（拥有 SysEx 控制权的 Kawai CA99 用户）

1. **⭐ 节拍触发音色轮换**——所有零件你都已齐备。定时器 + 你已掌握的 SysEx，约 20 行代码，手机可用。

2. **⭐⭐ 代码驱动的自动伴奏**——CA99 没有编曲功能。你可以自己构建：从 MIDI 检测和弦 → 生成低音/节奏 → 用不同音色发送到 CA99 的第二 MIDI 通道。没有编曲钢琴的人无法做到这一点。一个周末的项目。

3. **VT 参数随机化器**——你逆向工程的 Virtual Technician SysEx 是独家秘密武器。演奏时缓慢调变制音踏板共鸣、音色调整、触键感。极具独特性。

4. **Philips Hue 通感**——开源项目已存在（dxwu.github.io/Synesthesia），Chrome Web MIDI，手机可用。即时震撼效果。

5. **Rousseau 风格 MIDI 可视化视频**——使用 Midiano 或 midee（均为浏览器端，手机监控友好），为你的 CA99 演奏生成瀑布式音符下落视频。无需编写任何代码。

---
来源：Google AI Overviews（8 次搜索）、GitHub（PianoFun、html-midi-player、midee、WebMIDICon、Sightread、midi-jumper）、
Reddit（r/synthesizers、r/piano、r/synthesia、r/madeinpython、r/FL_Studio）、
Midiano、SeeMusic、Synthesia、supersimplepiano.com、midisurf.app、dxwu.github.io/Synesthesia、mido.readthedocs.io
