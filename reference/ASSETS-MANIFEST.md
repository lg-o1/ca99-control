# 资产清单与来源链 (ASSETS MANIFEST)

> 记录 repo 中每份资产的来源，避免日后搞不清文件从哪来、怎么得到的。

## 来源链（Provenance Chain）

```
官方 PianoRemote APK v1.1.11 (jp.co.kawai.denshi.PianoRemote)
  └─ 从 APKCombo 下载 XAPK (82MB)
     └─ 解包 → jp.co.kawai.denshi.PianoRemote.apk (80MB)
        └─ assets/ 下 3 个 AES 加密文件 (.xxx):
           ├─ version.xxx (0.1KB)  → 解密得密钥链 (key 的 key)
           ├─ appUI.xxx (68MB)     → AES解密 → ZIP(286文件) → Vue 网页应用
           └─ smf/Kawai-default.xxx (3.4MB) → AES解密 → ZIP → 1544 个内置 MIDI

解密算法 (KWMCryptor)：
  AES/CBC/PKCS7Padding, 256位key + 128位IV
  密钥由 Java LCG 按文件名种子派生：
    seed = Σ(ord(c)-48 for c in 文件名)
    seed = (seed ^ 25214903917) & 0xFFFFFFFFFFFF
    nextByte: seed = (seed*25214903917 + 11) & 0xFFFFFFFFFFFF; return (seed>>16)%256
  详见 reference/protocol/01-kwmcryptor-key.txt
```

## repo 目录对应关系

| repo 目录 | 来源 | 内容 |
|-----------|------|------|
| `reference/protocol/` | 从 appUI 的 sysex.json/vt.json 等分析整理 | CA99 SysEx 协议总结（人类可读） |
| `reference/appui-full/` | **appUI.xxx 解密后的完整代码镜像** | 整个 Vue App 的 JS/JSON/HTML/CSS（97文件，仅排除图片字体） |
| `reference/appui-extract/` | appUI 的关键子集（快速访问） | 13个JSON数据表 + 核心库 + UI源码 + 开发模式 |
| `reference/midi/` | **Kawai-default.xxx 解密后的 ZIP** | 1543 个内置 SMF MIDI（示范曲/Concert Magic/Lesson/音阶和弦琶音） |
| `reference/research/` | browserctl 社区调研 | 5份英文 summary + cn/ 中文版 |

## 关键数据表（reference/appui-full/lib/kawaipianojs/json/ 或 appui-extract/）

| 文件 | 大小 | 内容 |
|------|------|------|
| sysex.json | 1.2MB | **986 条 SysEx 命令定义**（核心） |
| sound.json | 5.3MB | 7613 音色（346 为 CA99） |
| vt.json | 106KB | Virtual Technician 参数定义 |
| rhythm.json | 21KB | 100 鼓点节奏 |
| music.json | 1.2MB | 内置曲目元数据 |
| model.json | 35KB | 172 型号定义 |
| presetSound.json | 185KB | 预设音色 |
| smfSound.json | 109KB | SMF 音色映射 |
| timbre_unified.json | 65KB | 统一音色表 |
| initdata.json | 177KB | 初始化数据 |
| destination.json / result.json / system.json | 小 | 配置 |

## 关键代码（reference/appui-full/lib/kawaipianojs/）

| 文件 | 内容 | 对开发的价值 |
|------|------|-------------|
| kawaipiano.js | getMidi() SysEx 组帧函数 | ⭐ 直接参考组帧逻辑 |
| kawaipiano.dev.js | 完整 webpack bundle | 全部领域逻辑 |
| kwm/bluetoothmidi.js | 官方蓝牙 MIDI 实现 | ⭐ 双连接参考 |
| kwm/kwm.js | 核心管理 | |
| kwm/music.js | 曲目播放逻辑 | |
| kwm/rhythm.js | 节奏逻辑 | |
| midi/midimanager.js | MIDI 管理 | ⭐ |
| midi/webmidi.js | Web MIDI 封装 | ⭐ PWA 直接用 |
| worker/*.js | 后台 worker（录音等） | |

## UI 源码（reference/appui-full/ui/js/）

| 文件 | 价值 |
|------|------|
| app.js (287KB) | 官方 Vue UI 主逻辑 |
| chord_dictionary.js / _s.js | ⭐ **和弦字典**（做自动伴奏玩法直接用） |
| concertmagic.js | Concert Magic 逻辑 |
| smfplayer.js | SMF 播放器 |
| vtUiParams.js | VT UI 参数 |
| touchcurve_graph.js / temperament_graph.js / pernote_graph.js | 各种图形 |

## 开发模式代码（reference/appui-full/developper/）

factorymode/kwmcoretest/touchpaneltest/dpupdatemode/ca49updater —— 工厂/测试/更新模式，**可能含隐藏命令**，逆向时可挖。

## 原始加密文件位置（本地，未入 repo）

```
D:\tmp\pianoremote\apk_raw\assets\appUI.xxx (68MB 加密)
D:\tmp\pianoremote\apk_raw\assets\version.xxx
D:\tmp\pianoremote\apk_raw\assets\smf\Kawai-default.xxx (3.4MB 加密)
D:\tmp\pianoremote\appUI_decrypted\ (解密产物完整目录，含图片字体)
D:\tmp\pianoremote\smf_extracted\ (1544 MIDI 解压目录)
```

## 三处备份

| 形态 | 位置 |
|------|------|
| GitHub | `lg-o1/ca99-control`（私有） |
| 本地 git | `D:\tmp\ca99-control` |
| SQLite | `D:\workspaces\.ls\data\lg-o1-ca99-control.sqlite`（全文索引，规避 Defender） |
