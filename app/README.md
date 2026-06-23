# CA99 Control App — 统一 PWA

> 单一应用，所有玩法作为模块集中在这里，便于维护。
> 基于打分最高方案：PWA + Web MIDI（详见 `../docs/EVALUATION.md`）。

## 架构

```
app/
  index.html          ← 单页主界面（顶栏连接 + 侧栏模块切换）
  manifest.json       ← PWA manifest
  css/app.css         ← 样式
  js/
    midi-core.js      ← Web MIDI 连接层（USB+蓝牙统一，借鉴官方 webmidi.js）
    ca99.js           ← CA99 协议库（buildSoundSelect/buildSysEx/buildVT... 纯函数，可测试）
    ca99.test.mjs     ← 协议库单元测试（20 用例，node 运行）
    auto-rotate.js    ← 自动换音色引擎（纯逻辑，21 单元测试）
    vt-morph.js       ← VT 参数渐变引擎（纯逻辑，32 单元测试）
    velocity-switch.js← 力度感应换音色路由（纯逻辑，33 单元测试）
    vel-vt-link.js    ← 力度→VT 参数联动（纯逻辑，22 单元测试）
    pedal-control.js  ← 踏板控制扩展（纯逻辑，27 单元测试）
    preset-store.js   ← 演出预设存储（纯逻辑，40 单元测试，可注入存储后端）
    chord-detect.js   ← 和弦/音程识别（纯逻辑，46 单元测试）
    chord-trainer.js  ← 和弦练习挑战逻辑（纯逻辑，32 单元测试）
    metronome.js      ← 节拍器 + 演奏速度检测（纯逻辑，33 单元测试）
    recorder.js       ← 弹奏录制 + 标准 MIDI 文件编码（纯逻辑，38 单元测试）
    scale-trainer.js  ← 音阶练习引导（纯逻辑，41 单元测试）
    sight-reading.js  ← 视奏闪卡（五线谱→音名，纯逻辑，62 单元测试）
    ear-training.js   ← 音程听辨（听辨音程，纯逻辑，49 单元测试）
    dynamics-trainer.js ← 力度练习（弹出目标强弱，纯逻辑，52 单元测试）
    transposer.js     ← 移调器（一键升降调，纯逻辑，74 单元测试）
    practice-stats.js ← 练习成就仪表盘（聚合各模块成绩+成就，纯逻辑，51 单元测试）
    rhythm-trainer.js ← 节奏跟拍训练（按拍点敲击判时间误差，纯逻辑，119 单元测试）
    melody-dictation.js ← 旋律听写（听调内短旋律后复奏，逐音校验，纯逻辑，486 单元测试）
    chord-progression.js ← 和弦进行练习（著名进行展开成具体和弦按序弹，复用和弦识别，纯逻辑，120 单元测试）
    app.js            ← 主入口 + 各玩法模块
  data/               ← 从逆向数据生成的 CA99 专属精简表
    sounds.json       ← 346 CA99 音色（name/category/pc/msb/lsb）
    sysex.json        ← 526 CA99 SysEx 参数定义
    vt.json           ← VT 参数
    rhythm.json       ← 100 节奏
```

## 已实现模块（玩法）

| 模块 | 状态 | 说明 |
|------|------|------|
| 🎵 音色浏览器 | ✅ | 346 音色，按分类筛选/搜索，点击切换（标准 Bank Select + PC） |
| 🔧 VT 调音台 | ✅ | 42 个 Virtual Technician 参数，滑块/下拉实时调 |
| 🎛️ 系统/混响 | ✅ | 音量/混响类型/键盘模式 |
| 🥁 节奏 | ✅ | 100 鼓点节奏选择 |
| 🔄 自动换音色 | ✅ | 定时(每N秒)或按节拍(弹N个音符)循环切换音色，可选音色池+顺序/随机 |
| 🌗 VT 渐变器 | ✅ | CA99 独有：边弹边把共鸣/击弦等 VT 参数从起点平滑插值到终点（缓动/往返循环） |
| 🎚️ 力度换音色 | ✅ | 按弹奏力度自动切换音色（2-4 层），轻弹/重弹不同音色，演奏更有层次 |
| 💫 力度→VT联动 | ✅ | CA99 独有：弹奏力度实时驱动 VT 参数（越重击弦共鸣越强），带平滑防抖 |
| 🦶 踏板控制 | ✅ | 实时显示三踏板（延音/保持/弱音）深度，可把踏板深度映射到 VT 参数 |
| ⭐ 演出预设 | ✅ | 把音色+VT 调音组合命名保存，一键调用；localStorage 持久化 + JSON 导入导出 |
| 🎓 和弦练习 | ✅ | 实时识别弹奏的和弦/音程（含转位），挑战模式按提示弹和弦闯关计分 |
| 🎵 节拍器 | ✅ | 可视+可听节拍器（强弱拍/拍号），弹奏时实测你的实际速度 BPM |
| ⏺ 录制回放 | ✅ | 录下弹奏，回放欣赏，或导出标准 MIDI 文件（.mid）保存/分享 |
| 🎼 音阶练习 | ✅ | 选调+音阶类型，按高亮提示依次弹奏，实时检查对错+进度（8 种音阶/上下行/忽略八度） |
| 👀 视奏闪卡 | ✅ | SVG 五线谱出题，看谱在琴键弹出对应音，弹对自动出下一题（高/低音谱号/连击/正确率/忽略八度） |
| 👂 音程听辨 | ✅ | 电脑发声播放两个音，辨认它们的音程并点按钮作答（上行/下行/和声/混合，可选音程范围，连击/正确率） |
| 💪 力度练习 | ✅ | 屏幕给目标力度（pp~ff），用触键强弱命中它，力度刻度条+指针实时显示你的 velocity（6 档/容差可调/连击/正确率） |
| 🎹 移调器 | ✅ | 一键把整个键盘升/降调（-12~+12 半音），用熟悉指法弹任意调，发 CA99 移调 SysEx 让钢琴自身也移调（滑块/±按钮/预设/听感调显示） |
| 🥁 节奏跟拍 | ✅ | 屏幕给节奏型（四分/八分/切分/附点），先一小节预备拍（节拍器引导），跟着拍点在琴键敲击，按时间误差判完美/良好/漏拍/多敲，播放头+落点高亮，平均误差统计（无琴可空格键敲） |
| 🎼 旋律听写 | ✅ | 听一段调内短旋律（首音为主音锚点，Web Audio 三角波播放），在琴键上逐音复奏，对的灯变绿、错的不前进，整条全对自动出下一条；可选调/长度/忽略八度/速度，带屏幕琴键，可再听/放弃看答案，成绩入仪表盘 |
| 🎹 和弦进行 | ✅ | 把"万能流行 I–V–vi–IV""ii–V–I""卡农""12 小节布鲁斯"等 7 条著名进行在所选调（含大小调）上展开成具体和弦（C–G–Am–F），按序弹出每个和弦即推进（忽略转位，复用和弦识别），罗马数字+和弦名高亮，可试听整条/替我弹演示，循环计圈，成绩入仪表盘 |
| 🏆 成就仪表盘 | ✅ | 汇总视奏/听辨/力度/音阶/节奏/旋律/和弦进行各训练成绩，统计总练习次数/正确率/连续天数/最佳连击，最近 7 天柱状图、模块细分表、10 枚成就徽章墙（已解锁/即将解锁/锁定） |
| 📡 MIDI 监视器 | ✅ | 实时显示钢琴发来的音符/CC/SysEx |

> 后续玩法（自动伴奏/灯光同步）作为新模块加入 `app.js` + 侧栏，不另起 app。

### 模块实现说明

- 每个模块是 `app.js` 里一个 `renderXxx()` 函数，渲染到对应 `#module-xxx` 容器
- 共享 `midi-core.js`（连接）+ `ca99.js`（协议）+ 数据表
- 自动换音色用独立引擎 `auto-rotate.js`（纯逻辑，21 单元测试），UI 在 app.js
- **节拍模式**：监听 MIDI 输入的 note-on 驱动 `engine.tick()`，弹够 N 个音符就换
- VT 渐变用独立引擎 `vt-morph.js`（纯逻辑，32 单元测试），定时器逐帧线性/缓动插值
- **可渐变参数识别**：取 `sysex.json` 中 v1=0x50 且恰好 2 条值（min/max 范围）的连续型参数（如 StringResonance 0-127、DamperResonance 0-10），排除枚举型（Voicing）和命令型（PerNote）
- 力度换音色用独立路由 `velocity-switch.js`（纯逻辑，33 单元测试），`splitZones()` 把 0-127 等分成层，note-on 力度命中哪层就切到该音色（仅在层变化时发 PC，避免每音符重复）
- 力度→VT 联动用独立引擎 `vel-vt-link.js`（纯逻辑，22 单元测试），`mapRange()` 把力度线性映射到 VT 输出范围，指数平滑（EMA）防抖，仅整数值变化时发 SysEx。可多通道、可反向映射
- VT 连续参数检测抽成共享 `continuousVtParams()`，渐变器与联动模块共用
- 踏板控制用独立引擎 `pedal-control.js`（纯逻辑，27 单元测试），解析标准踏板 CC（延音64/保持66/弱音67/表情11），实时汇报开关+深度，并可把某踏板深度 `mapRange` 映射到一个 VT 参数（仅整数值变化时发 SysEx，支持反向）
- 演出预设用独立存储 `preset-store.js`（纯逻辑，40 单元测试），存储后端可注入（浏览器=localStorage，测试=内存 Map）；支持保存/调用/删除/重命名/导入导出，损坏 JSON 容错。`capturePreset()` 从 DOM 抓当前音色+VT 控件值，`applyPreset()` 一键发回钢琴
- 和弦识别用 `chord-detect.js`（纯逻辑，46 单元测试），把同时按下音符归一到音级集合，对每个根音匹配 15 种和弦模板（含 7/maj7/m7/dim/aug/sus 等），两遍扫描优先根位、消除 sus2/sus4 与 C6/Am7 转位二义性
- 和弦练习挑战用 `chord-trainer.js`（纯逻辑，32 单元测试），`HeldNotes` 追踪当前按下音符，`ChordChallenge` 随机出题+计分/连击（rng 可注入便于测试）。onMidiIn 的 note-on/off 维护 heldNotes 并驱动面板
- 节拍器用 `metronome.js`（纯逻辑，33 单元测试）：`Metronome` 按 BPM 产生强/弱拍（定时器可注入），UI 用 Web Audio 发 click 声 + 节拍点闪烁；`TempoTracker` 用相邻 note-on 间隔的移动平均实测演奏 BPM（大间隔自动重置乐句）
- 录制回放用 `recorder.js`（纯逻辑，38 单元测试）：`Recorder` 以毫秒时间戳记录 MIDI 事件，回放用注入定时器按相对时间重派发，`toMidiFile()` 编码标准 MIDI 文件（Type 0，VLQ delta、tempo meta、跳过非通道事件）。onMidiIn 录制所有输入；导出用 Blob 触发 .mid 下载
- 音阶练习用 `scale-trainer.js`（纯逻辑，41 单元测试）：`buildScale`/`buildScaleUpDown` 生成 8 种音阶（大调/三种小调/五声/布鲁斯/半音阶）的 MIDI 序列，`ScaleSession` 按依次弹奏检查进度（可忽略八度），note-on 驱动前进/报错/完成，UI 高亮当前应弹的音
- 视奏闪卡用 `sight-reading.js`（纯逻辑，62 单元测试）：`staffPosition`/`needsLedger`/`randomNote` 把 MIDI 音符映射到五线谱位置（高/低音谱号、自动加线），`SightReadingGame` 随机出题并校验（可忽略八度），记录得分/连击/最佳/正确率，UI 用 SVG 实时绘制谱表+符头，note-on 驱动判分与翻题
- 音程听辨用 `ear-training.js`（纯逻辑，49 单元测试）：`INTERVALS` 表（0..12 半音）+ `EarTrainingGame` 随机出根音+音程（方向 up/down/harmonic/mixed，可选音程集合，自动保证音符落在合法 MIDI 范围），`check` 校验并记录得分/连击/最佳/正确率，UI 用 Web Audio 三角波发声播放，点按钮作答（无需连钢琴）
- 力度练习用 `dynamics-trainer.js`（纯逻辑，52 单元测试）：`DYNAMICS` 把 velocity 1..127 无缝划成 6 档（pp/p/mp/mf/f/ff），`velocityToIndex` 定位档位，`DynamicsGame` 出目标力度并按 note-on velocity 校验（容差可调，相邻档可算对），记录得分/连击/最佳/正确率，UI 用刻度色带+指针实时显示你弹的力度落点
- 移调器用 `transposer.js`（纯逻辑，74 单元测试）：`encodeTransposeByte` 把半音 -12..12 编码成 CA99 TransposeValue 字节（0x40+半音，实测 -12→0x34/+12→0x4C），`Transposer` 跟踪移调量、`targetKeyName` 算听感调、`transposeNote` 软件移调音符；UI 用滑块/±按钮/预设切换，`CA99.buildTranspose` 发 SysEx 让钢琴自身发声也移调
- 成就仪表盘用 `practice-stats.js`（纯逻辑，51 单元测试）：`PracticeStats` 注入存储+时钟（便于确定性测试），`record` 把每次练习成绩累加进 localStorage，算总练习/正确率/连续天数（`dayStreak` 含昨日宽限）/最佳连击，`allAchievements` 判定 10 枚徽章解锁状态；各训练模块（视奏/听辨/力度停止时、音阶完成时）调 `recordPractice()` 写入，仪表盘聚合展示柱状图/细分表/徽章墙
- 节奏跟拍用 `rhythm-trainer.js`（纯逻辑，119 单元测试）：`beatsToOnsets` 把拍点位置按 BPM 换算成毫秒落点，`RhythmTrainer.tap(time)` 把每次敲击匹配到最近未命中落点并按时间误差 `rateError` 判完美(±55ms)/良好(±120ms)/多敲，`finish` 统计漏拍与平均误差；UI 有预备拍节拍器引导、播放头动画、落点高亮，note-on 或空格键触发敲击，完成后写入成就仪表盘
- 旋律听写用 `melody-dictation.js`（纯逻辑，486 单元测试）：`degreeToMidi` 把音阶级数（含跨八度/下行）映射成 MIDI，`MelodyDictation.next()` 在所选调音阶内生成首音为主音的随机短旋律，`play(note)` 逐音校验复奏（`samePitchClass` 支持忽略八度），整条全对才计分、有错完成不计分、可 `giveUp` 看答案；UI 用 Web Audio 三角波播放旋律、屏幕琴键、note-on 复奏，完成后写入成就仪表盘
- 和弦进行练习用 `chord-progression.js`（纯逻辑，120 单元测试）：`chordForDegree` 按调的音阶+各级品质把罗马数字级数（I/ii/.../vii°）展开成具体和弦，`expandProgression` 把整条进行换调展开，`ChordProgression.check(notes)` 复用 `chord-detect.js` 的 `detectChord` 比对根音+类型（忽略转位）判推进，整条走完计圈、可循环、`miss` 记错并清连击；UI 用 Web Audio 试听整条、罗马数字+和弦名 chip 高亮当前目标、"替我弹"演示推进，完成后写入成就仪表盘
- **调试钩子**：无真机时控制台调 `window.__feedMidi(note, velocity)` 模拟弹奏、`window.__feedNoteOff(note)` 模拟松键、`window.__feedCC(controller, value)` 模拟踏板/控制器，测试依赖 MIDI 输入的模块

## 连接方式（默认双支持）

`midi-core.js` 用 `navigator.requestMIDIAccess({sysex:true})` 枚举所有端口——**USB 和蓝牙 MIDI 都在列表里**，运行时在顶栏下拉选择，或自动选含 "CA99"/"Kawai" 的端口。无需改代码切换连接方式。

## 前置依赖

| 用途 | 需要 | 说明 |
|------|------|------|
| 运行 app | **Chrome 或 Edge** | Web MIDI 仅 Chromium 系支持；Firefox/Safari 不行 |
| 起本地服务器 | **Python 3** 或 Node | 任选其一起静态服务器（Web MIDI 需 http/https，不能 file://） |
| 跑单元测试 | **Node ≥ 16** | 测试是原生 ESM（`.mjs`），无需安装任何 npm 依赖 |
| 真机 USB 验证脚本 | **Python 3 + mido + python-rtmidi** | 仅 `scripts/validate_ca99_usb.py` 需要，见下方 |

> 本项目零构建、零 npm 依赖：HTML/CSS/JS 直接跑，测试用 Node 内置能力。

## 安装与运行

```bash
# 0. 克隆仓库
git clone https://github.com/lg-o1/ca99-control.git
cd ca99-control/app

# 1. 本地起静态服务器（二选一；Web MIDI 需要 http/https，不能 file://）
python -m http.server 8099        # 用 Python
#   或
npx http-server -p 8099           # 用 Node

# 2. 用 Chrome 或 Edge 打开（Firefox/Safari 不支持 Web MIDI）
#    http://localhost:8099/index.html

# 3. 点"连接" → 授权 MIDI（含 SysEx）→ 选 CA99 端口 → 玩
```

**不连钢琴也能用**：所有训练模块（视奏/听辨/力度/音阶/节奏/和弦）都能在没有真机时玩——
听辨/听写用 Web Audio 发声，节奏跟拍可用空格键敲击，其余可在浏览器控制台用调试钩子
`window.__feedMidi(note, velocity)` / `window.__feedNoteOff(note)` / `window.__feedCC(cc, val)` 模拟弹奏。

手机：Android Chrome 同样可用（USB-OTG 或蓝牙 MIDI）。

## 测试

**一键跑全部 20 套测试**：

```bash
cd app
# Bash / Linux / macOS
for f in js/*.test.mjs; do node "$f"; done

# 或 PowerShell（Windows）
Get-ChildItem js\*.test.mjs | ForEach-Object { node $_.FullName }
```

全绿即每行输出 `xxx: N passed, 0 failed`。单独跑某一套：

```bash
# 协议库单元测试（20 用例）
node js/ca99.test.mjs
# 自动换音色引擎单元测试（21 用例）
node js/auto-rotate.test.mjs
# VT 渐变引擎单元测试（32 用例）
node js/vt-morph.test.mjs
# 力度换音色路由单元测试（33 用例）
node js/velocity-switch.test.mjs
# 力度→VT 联动单元测试（22 用例）
node js/vel-vt-link.test.mjs
# 踏板控制单元测试（27 用例）
node js/pedal-control.test.mjs
# 演出预设存储单元测试（40 用例）
node js/preset-store.test.mjs
# 和弦识别单元测试（46 用例）
node js/chord-detect.test.mjs
# 和弦练习挑战单元测试（32 用例）
node js/chord-trainer.test.mjs
# 节拍器 + 速度检测单元测试（33 用例）
node js/metronome.test.mjs
# 录制 + SMF 编码单元测试（38 用例）
node js/recorder.test.mjs
# 音阶练习单元测试（41 用例）
node js/scale-trainer.test.mjs
# 视奏闪卡单元测试（62 用例）
node js/sight-reading.test.mjs
# 音程听辨单元测试（49 用例）
node js/ear-training.test.mjs
# 力度练习单元测试（52 用例）
node js/dynamics-trainer.test.mjs
# 移调器单元测试（74 用例）
node js/transposer.test.mjs
# 练习成就仪表盘单元测试（51 用例）
node js/practice-stats.test.mjs
# 节奏跟拍训练单元测试（119 用例）
node js/rhythm-trainer.test.mjs
# 旋律听写单元测试（486 断言）
node js/melody-dictation.test.mjs
# 和弦进行练习单元测试（120 用例）
node js/chord-progression.test.mjs
```

## 数据生成（如需重建）

```bash
python ../scripts/build_ca99_data.py   # 从 reference/ 提取 CA99 专属数据到 app/data/
```

## ⚠️ 待真机验证

协议库已通过单元测试（组帧字节正确），但**逆向的 SysEx 字节尚未在真 CA99 上验证**。

### 快速验证：Python USB 脚本

`scripts/validate_ca99_usb.py` 基于 `app/data/sounds.json` + `sysex.json`，向真机发"切到
Concert Grand"的标准 Bank Select + Program Change（可选再发一条 CA99 SysEx 开启
Rendering），用来确认逆向数据在真机上有效：

```bash
pip install mido python-rtmidi          # 安装 MIDI 后端
python scripts/validate_ca99_usb.py --list          # 1) 看有哪些 MIDI 输出口
python scripts/validate_ca99_usb.py                 # 2) 自动找 CA99 口，切到 Concert Grand
python scripts/validate_ca99_usb.py --sysex         # 3) 切音色 + 发 SysEx 开启 Rendering
python scripts/validate_ca99_usb.py --dry-run --sysex   # 只打印字节不发送（无需硬件/依赖）
```

USB 线把 CA99 的 "USB to Host" 接电脑、开机后运行。若钢琴面板音色变成 Concert Grand、
声音对，即说明逆向的 `msb/lsb/pc` 与 SysEx 帧格式在真机上验证通过。

### 其他验证途径
1. USB 连真 CA99 → 打开 app → 音色浏览器点一个音色 → 看琴是否真换音色
2. 若不换，对照 `reference/appui-full/lib/kawaipianojs/kawaipiano.js` 的 getMidi() 核对组帧
3. 或用 MIDI 监视器：在钢琴面板手动改设置，看回传的 SysEx，反推正确字节

