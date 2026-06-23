# Kawai CA99 MIDI 控制 — 架构研究总结
## 来源：7 次 Google AI Overview 搜索，2026 年 1/2 月

---

## 1. 架构方案对比

### 方案 A：通过 USB MIDI 连接电脑（Python mido / Node.js）
**连接方式**：用 USB-B → USB-A 线将钢琴接到电脑；使用 python-rtmidi、mido 或 Node.js 的 jzz/midi 包。
**优点**：
- 上手最简单：无浏览器限制，直接访问系统 MIDI。
- 延迟最低：往返仅 1–3ms，无额外开销。
- 可无限制收发完整 SysEx，不受任何 API 约束。
- 初期测试无需 UI 框架，写脚本即可。
- Mido/rtmidi 久经考验，支持 SysEx、时钟及所有 MIDI 消息类型。
**缺点**：
- 仅限桌面端，无法用手机操控。
- 需在电脑上配置 Python/Node 环境。
- 除非自己动手（Tkinter、Electron 等），否则没有图形界面。
**结论**：✅ 最适合初期开发和调试。先在这里把 SysEx 命令跑通。

### 方案 B：原生 Android APK（Kotlin + Bluetooth MIDI / USB-OTG）
**连接方式**：使用 Android MIDI API（android.media.midi.*）编写 Kotlin 应用；通过 BLE MIDI 或 USB-OTG 连接。
**优点**：
- Android 系统级 MIDI 访问权限完整。
- 可原生使用 BLE MIDI，无线操控更方便。
- 可发布到 Play Store。
**缺点**：
- 开发工作量大：Kotlin 样板代码、构建/签名流程、Play Store 审核等一个都少不了。
- Android 上的 BLE MIDI 稳定性差："效果因硬件厂商和系统版本不同而差异显著"——抖动、断连、配对问题层出不穷。
- USB-OTG 需要手动将 Android USB 模式切换为 MIDI。
- 与桌面/Web 方案完全独立，代码无法复用。
**结论**：❌ 开发成本最高，Android 上 BLE MIDI 可靠性最差。除非必须上架 Play Store，否则不推荐。

### 方案 C：Web 应用 / PWA，使用 Web MIDI API（推荐）
**连接方式**：本地托管（或通过简单的 Flask/Node 静态服务器）的 HTML/JS/Vue PWA，调用 navigator.requestMIDIAccess()。桌面 Chrome 和 Android Chrome 均支持 Web MIDI API。
**优点**：
- **一套代码同时支持 USB（桌面/Android）和 BLE MIDI（Android）**。
- Android Chrome + USB-OTG：插上钢琴、将 USB 模式改为 MIDI、打开 Chrome，钢琴立即显示为 MIDI 端口。
- WEBMIDI.js 库简化了端口枚举、SysEx 收发和热插拔检测。
- PianoRemote 解密出来的 Vue.js 前端可以直接复用（替换 JsInterface 即可）。
- PWA "添加到主屏幕"提供接近原生 App 的体验，无需上架 Play Store。
- Flask/Node 后端可选（仅在需要预设存储时才用，MIDI 本身不依赖后端）。
**缺点**：
- Android Chrome 需要手动在通知栏将 USB 模式切换为 MIDI。
- Android Chrome 上的 BLE MIDI：需先在系统层面完成配对，且兼容性因厂商而异。
- Web MIDI API 不支持 Firefox 或 Safari（仅限 Chrome/Chromium）。
- SysEx 需要显式授权（requestMIDIAccess 时传入 `sysex: true`）。
**结论**：✅✅ 最优路径。一套应用，桌面和 Android 均可运行，无需上架 Play Store。

---

## 2. PWA / Web MIDI 是否真的是最聪明的单一代码库方案？

**是的**——研究已证实：
- Web MIDI API 通过 MIDIPort 对象统一暴露所有已连接的 MIDI 端口（USB 和 BLE 均如此）。
- USB 和 BLE 之间的切换完全透明：只需从 inputs/outputs 中选择正确的端口。
- Android Chrome 支持 Web MIDI API；PWA 可通过"添加到主屏幕"安装，无需应用商店。
- WEBMIDI.js 提供简洁的抽象层：`WebMidi.enable({ sysex: true })`，然后遍历 outputs 即可。
- 一个由本地 Python/Node 服务器托管的 Vue SPA，在桌面浏览器和 Android Chrome（同一 USB 或 Wi-Fi 网络下）上均可使用。

---

## 3. USB 先行、再转 BLE 的策略是否可行？

**是的——强烈推荐此策略**：
1. **第一阶段（开发）**：PC → 钢琴 USB 连接。使用 Python mido 或 Node.js 验证所有 SysEx 命令表（来自你解密的 JSON）。调试毫无阻力。
2. **第二阶段（Web UI）**：构建基于 Web MIDI API 的 PWA，在桌面 Chrome 上通过 USB 测试，在 USB 连接下（1–3ms，无断连）开发并验证 UI。
3. **第三阶段（移动端 BLE）**：在 Android 上通过 BLE MIDI 配对钢琴，在 Chrome 中打开 PWA。代码完全不变，只需选择不同端口。根据需要添加 BLE 专用的重试/重连逻辑。

Web MIDI API 对 USB 和 BLE 端口一视同仁——切换时无需改动任何代码，仅选择端口即可。这使得分阶段推进极为轻松。

---

## 4. USB vs BLE MIDI 延迟——真实数据

| 连接方式 | 延迟（往返） | 可靠性 | 备注 |
|---|---|---|---|
| USB MIDI | **1–3 ms** | 接近完美 | 黄金标准；不会断连 |
| BLE MIDI（标准系统） | **15–22.5 ms** | 偶有断连 | Android 因 OEM 不同而有差异 |
| BLE MIDI（CME WIDI 硬件） | **3–6 ms** | 良好 | 专用 BLE 5 适配器 |
| BLE MIDI（Android 通用） | **10–30 ms+** | 抖动不定 | 取决于厂商和系统版本 |

**对本使用场景有影响吗？**
- **SysEx 控制消息**（修改混响、选择音色、EQ 调节）：**没有影响**——25ms 的延迟在 UI 交互中根本感觉不到。
- **演奏音符**（现场弹奏）：USB 更好，但 CA99 的控制主要是参数/预设管理，不是现场演奏。
- 对于 CA99 的使用场景（发送配置 SysEx），BLE 延迟**完全无关紧要**——你并不是在实时演奏音符。
- **结论**：一旦通过 USB 测试确认 SysEx 正确，BLE 完全能胜任 CA99 控制场景。

---

## 5. 重新打包 APK vs 复用 Vue 前端 vs 从零编写 Web App

### 重新打包官方 PianoRemote APK
**结论：❌ 不推荐**
- 需要：重新打包所有解密资产、重新编译 KWMCore 原生 .so 库（闭源 C++）、用新密钥库重新签名、应对 Android 安全认证。
- JsInterface 桥接层（Java/Kotlin ↔ WebView JavaScript）需要完整重新实现。
- 即便做完，App 也缺乏 Kawai 签名，可能被系统级签名校验拦截。
- 工作量：数周乃至数月。原生层可能无法完整复现，且相比 Web App 毫无实质优势。

### 在浏览器中复用解密的 Vue.js 前端
**结论：⚠️ 部分可行，但不建议直接使用**
- Vue.js 文件（HTML/JS/CSS）可从 assets/ 中提取，用 http-server 托管。
- **问题**：前端的所有 MIDI 操作均通过 `window.JsInterface.*`（或类似 Android 桥接方式）调用，这些调用在浏览器中会静默失败或抛出异常。
- 你需要：对 `window.JsInterface` 打桩/模拟，将调用转发给 Web MIDI API（navigator.requestMIDIAccess）。
- 路由模式须从 createWebHistory 改为 createWebHashHistory 以支持本地文件服务。
- 由于你已经拥有解密后的 SysEx/sound/VT JSON 表，直接写一个轻量 Vue 组件，可能比在现有代码中逐一处理所有 JsInterface 调用点更省力。
- **工作量**：中等。如果现有 Vue UI 已经很完善且你希望保留，值得考虑。

### 复用提取的 JSON 数据表，从零构建 Web App
**结论：✅✅ 推荐**
- 构建一个新的轻量 Vue 3（或纯 HTML/JS）PWA。
- 直接导入你的 sysex.json、sound.json、t.json、hythm.json。
- 使用 WEBMIDI.js 管理端口和发送 SysEx。
- 用 `python -m http.server` 或一个小型 Flask/FastAPI/Express 服务器托管。
- 对 UI 有完全掌控权，没有遗留 JsInterface 的历史包袱。
- 在桌面 Chrome（USB）和 Android Chrome（USB-OTG 或 BLE）上均可运行。
- 可安装为 PWA（添加到主屏幕）。
- **工作量**：数天到 1–2 周。代码清晰，易于维护，无逆向工程包袱。

---

## 推荐实施路线图

```
第 1 周：Python mido + USB
  → 验证所有 SysEx 命令（音色选择、混响、EQ、踏板等）是否在 CA99 上正常工作
  → 根据解密的数据表构建 sysex_builder.py

第 2 周：PWA 骨架
  → Vue 3 + WEBMIDI.js + Vite
  → 导入 sysex.json、sound.json
  → 桌面 Chrome 通过 USB MIDI 实现收发

第 3 周：Android
  → 通过 USB-OTG（数据线 + USB MIDI 模式）在 Android Chrome 上测试
  → 添加 PWA manifest，"添加到主屏幕"
  → 测试 Android 上的 BLE MIDI 配对

第 4 周：完善
  → 预设保存（localStorage 或小型 Flask 后端）
  → 音色浏览器、EQ 滑块、节奏选择器
  → 可选：Electron 封装，打包为离线桌面应用
```

---

## 主要来源
- Google AI Overview："Web MIDI API phone vs desktop USB Bluetooth MIDI latency reliability comparison"
- supersimplepiano.com："USB MIDI is essentially instant: 1–3ms. Bluetooth MIDI typically adds 10–25ms."
- Music Stack Exchange："Apple USB MIDI latency ~3.5ms; Apple BLE MIDI macOS latency ~17ms"
- CME Pro / Thomas Gerbrands（Medium，2020 年 1 月）：WIDI 硬件可将 BLE 延迟压到 3ms
- Google AI Overview："controlling MIDI from web app — WEBMIDI.js + Web MIDI API"
- Google AI Overview："PWA Web MIDI Android Chrome — USB-C/OTG + grant permissions → works without app install"
- Google AI Overview："decrypted Android WebView Vue.js in browser — mock JsInterface, change router to hash mode"
- flykeys.com：USB MIDI 延迟对比数据
- Zynthian Discourse：BLE MIDI 连接间隔时序分析
