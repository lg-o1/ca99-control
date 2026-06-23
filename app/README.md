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
| 📡 MIDI 监视器 | ✅ | 实时显示钢琴发来的音符/CC/SysEx |

> 后续玩法（自动换音色/VT渐变/自动伴奏/灯光同步）作为新模块加入 `app.js` + 侧栏，不另起 app。

## 连接方式（默认双支持）

`midi-core.js` 用 `navigator.requestMIDIAccess({sysex:true})` 枚举所有端口——**USB 和蓝牙 MIDI 都在列表里**，运行时在顶栏下拉选择，或自动选含 "CA99"/"Kawai" 的端口。无需改代码切换连接方式。

## 运行

```bash
# 1. 本地起静态服务器（Web MIDI 需要 http/https，不能 file://）
cd app
python -m http.server 8099

# 2. 用 Chrome 或 Edge 打开（Firefox/Safari 不支持 Web MIDI）
#    http://localhost:8099/index.html

# 3. 点"连接" → 授权 MIDI（含 SysEx）→ 选 CA99 端口 → 玩
```

手机：Android Chrome 同样可用（USB-OTG 或蓝牙 MIDI）。

## 测试

```bash
# 协议库单元测试（20 用例，不需真机）
node js/ca99.test.mjs
```

## 数据生成（如需重建）

```bash
python ../scripts/build_ca99_data.py   # 从 reference/ 提取 CA99 专属数据到 app/data/
```

## ⚠️ 待真机验证

协议库已通过单元测试（组帧字节正确），但**逆向的 SysEx 字节尚未在真 CA99 上验证**。建议：
1. USB 连真 CA99 → 打开 app → 音色浏览器点一个音色 → 看琴是否真换音色
2. 若不换，对照 `reference/appui-full/lib/kawaipianojs/kawaipiano.js` 的 getMidi() 核对组帧
3. 或用 MIDI 监视器：在钢琴面板手动改设置，看回传的 SysEx，反推正确字节
