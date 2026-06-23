# 方案评估与第一步选型 (Approach Evaluation & First-Step Decision)

> 结合全部调研（架构、社区项目、CA99 逆向资源、孩子学习 App），对"第一步做什么"做多维度打分评估。
> Combining all research, scoring candidate first-steps across multiple dimensions to decide where to start.

---

## 一、候选方案 (Candidate Approaches)

| 编号 | 方案 | 说明 |
|------|------|------|
| A | **PWA + Web MIDI 自建 App**（复用提取的 JSON + 官方 webmidi.js） | 新写轻量 Vue/原生网页，import sysex.json/sound.json，复用官方连接层 |
| B | **Python USB 脚本**（Phase 0 验证） | 命令行 mido 脚本，先验证 SysEx 切音色/VT 通不通 |
| C | **复用官方 Vue 前端**（appui-full） | 直接跑解密的官方网页 App，stub 掉 JsInterface 换 Web MIDI |
| D | **直接用现成开源项目**（midiano.com / PianoBooster / Piano-LED-Visualizer） | 不开发，装现成的学习/灯光项目 |
| E | **原生 Android APK**（Kotlin + 蓝牙） | 从零写原生 App |

---

## 二、打分维度 (Scoring Dimensions)

每项 1-5 分（5 最好）：

1. **有 UI** — 是否有图形界面（vs 纯命令行）
2. **所见即所得 (WYSIWYG)** — 改了立刻看到/听到效果，调试直观
3. **现成项目可借鉴** — 社区有成熟代码直接抄
4. **利用已有 CA99 资源** — 能否直接用我们逆向提取的 sysex.json/sound.json/vt.json + 官方 webmidi.js/kawaipiano.js/chord_dictionary.js
5. **上手速度** — 多快能跑起来第一个效果
6. **默认双连接（USB+蓝牙）** — 一套代码同时支持两种连接
7. **可成长性** — 能否平滑扩展到 10+ 玩法 + 灯光

---

## 三、打分表 (Scoring Matrix)

| 维度 | A: PWA+WebMIDI | B: Python USB | C: 复用官方Vue | D: 现成开源 | E: 原生APK |
|------|:---:|:---:|:---:|:---:|:---:|
| 有 UI | 5 | 1 | 5 | 5 | 5 |
| 所见即所得 | 5 | 3 | 4 | 4 | 3 |
| 现成项目可借鉴 | 5 | 4 | 3 | 5 | 2 |
| 利用 CA99 资源 | 5 | 4 | 5 | 1 | 4 |
| 上手速度 | 4 | 5 | 2 | 5 | 1 |
| 默认双连接 | 5 | 3 | 5 | 3 | 3 |
| 可成长性 | 5 | 3 | 3 | 2 | 4 |
| **总分(35)** | **34** | **23** | **27** | **25** | **22** |

---

## 四、结论：第一步用 PWA + Web MIDI（方案 A），但先借 B 验证

### 🥇 方案 A（PWA + Web MIDI）= 34/35 最高分，是主路线

**为什么 A 赢：**
- **有 UI + 所见即所得**：网页界面，点按钮立刻切音色、拉滑块立刻调 VT，调试直观
- **现成项目可借鉴满分**：[WEBMIDI.js](https://github.com/djipco/webmidi)、midiano.com 思路、Piano-LED-Visualizer 配色逻辑都能抄
- **完美利用 CA99 资源**：直接 import 我们提取的 `sysex.json`(986命令)/`sound.json`(346音色)/`vt.json`，**还能直接复用官方的 `webmidi.js`（干净非压缩代码，已确认用 `requestMIDIAccess({sysex:true})` 处理 USB+蓝牙）+ `kawaipiano.js`(getMidi组帧) + `chord_dictionary.js`(和弦字典做自动伴奏)**
- **默认双连接满分**：官方 webmidi.js 把 USB 和蓝牙都当 MIDIPort 枚举，你电脑有蓝牙——一套代码两种连接随便切，无需改代码
- **可成长性满分**：从玩法1到玩法10再到灯光，全在一个 PWA 里加模块

### 🥈 但建议先花 1 小时用 B（Python USB）做"协议验证"

A 的唯一风险是：**我们逆向的 SysEx 字节没在真机上验证过**。所以：
- **Phase 0（1小时）**：用 Python mido + USB，发一条切音色 SysEx 给真 CA99，确认琴真的换音色了 → 验证整条链路（提取的协议字节是对的）
- 验证通过后，**全力做 A（PWA）**

> 这不是走两条路——B 只是 A 的"协议体检"，确认地基稳了再盖楼。Web MIDI 和 mido 发的是同样的 SysEx 字节，B 验证过的命令直接搬进 A。

### 为什么不选其他

- **C（复用官方Vue）27分**：能跑但要 stub 掉所有 `JsInterface` 原生桥调用换成 Web MIDI，是"拆解遗留代码"的累活，不如新写干净
- **D（现成开源）25分**：midiano.com/PianoBooster 是**给孩子学琴用的**，不是"控制 CA99 音色/VT/灯光"——**用途不同**。它们该装（孩子学琴），但不是本项目（编程控制 CA99）的"第一步"。**两件事并行**：孩子学琴用 D，你的创意控制玩法用 A
- **E（原生APK）22分**：工作量最大、安卓蓝牙最不稳、单平台，不值得

---

## 五、所见即所得 + 现成借鉴 + CA99 资源 — 逐条回答你的问题

| 你的问题 | 答案 |
|---------|------|
| **第一步就用 PWA/MIDI API 做？** | ✅ 是。PWA+Web MIDI 34分最高。但先用 Python+USB 花1小时验证协议字节，再全力做 PWA |
| **是否有 UI？** | ✅ 有。PWA 就是网页 UI，手机/电脑都能开 |
| **是否所见即所得？** | ✅ 是。点按钮立刻切音色、拉滑块立刻调 VT、改代码刷新就见效——Web 开发的最大优势 |
| **是否有现成项目直接借鉴？** | ✅ 大量。WEBMIDI.js(连接)、midiano.com(落音符思路)、Piano-LED-Visualizer(配色)、官方 webmidi.js/kawaipiano.js(直接复用) |
| **是否利用已有 CA99 资源？** | ✅ 充分。sysex.json/sound.json/vt.json/rhythm.json + 官方 webmidi.js/bluetoothmidi.js/kawaipiano.js/chord_dictionary.js + 1543 内置 MIDI 全部可用 |

---

## 六、PWA 技术栈建议（基于已有资源）

```
连接层:  官方 webmidi.js（复用）或 WEBMIDI.js 库 —— 自动枚举 USB+蓝牙端口
组帧层:  参考官方 kawaipiano.js 的 getMidi() —— 把参数转成 SysEx 字节
数据层:  import sysex.json + sound.json + vt.json + rhythm.json（已提取）
和弦层:  复用官方 chord_dictionary.js（做自动伴奏玩法）
UI 层:   Vue 3 + Vite（PWA），或纯原生 HTML/JS（更轻）
灯光层:  本地 Node/Python 后端发 UDP 给 Govee Glide墙灯(H6062:4003)
```

启动流程：
```javascript
navigator.requestMIDIAccess({sysex: true}).then(access => {
  // 枚举所有端口（USB + 蓝牙都在这里）
  for (const out of access.outputs.values()) {
    // 列出让用户选，或自动选含 "CA99"/"Kawai" 的
  }
});
```

---

## 七、双轨建议（孩子学琴 vs 你的创意控制）

这是**两个独立的事**，可并行：

| 用途 | 用什么 | 谁主导 |
|------|--------|--------|
| **孩子学琴**（识谱/落音符/鼓励反馈） | 现成 App/项目：Simply Piano、Note Rush、Piano-LED-Visualizer、PianoBooster | 孩子用，你帮配 |
| **你的创意控制**（切音色/VT/自动伴奏/灯光同步） | 本项目自建 PWA（方案 A） | 你开发 |

> CA99 蓝牙/USB 可同时连多个：孩子的学习 App 接一个 MIDI 流，你的 PWA 接另一个，互不干扰。

---

> 数据来源：本项目全部调研（reference/research/）+ CA99 逆向资源（reference/appui-full/）
