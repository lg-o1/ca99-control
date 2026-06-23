# 孩子学琴：App / 开源项目 / 识谱 / 扫谱方案

> 与本项目（编程控制 CA99）**并行**的另一条线：让孩子用 CA99 学琴、获得反馈、保持兴趣。
> 关键：CA99 是标准 MIDI 设备，每个按键（音符+力度+踏板）通过蓝牙/USB 实时输出，所有 App/项目都能接，**不需要碰 SQLite**。

## CA99 连接学习 App（已确认）

| 连接 | 支持 | 延迟 |
|------|:---:|------|
| 蓝牙 MIDI（出厂默认开） | ✅ | ~5-15ms（孩子够用） |
| USB to Host（USB-B 口） | ✅ | ~1-2ms（最佳） |
| MIDI DIN 5针 | ❌ | — |

⚠️ **关键配对技巧**：别从 iOS/安卓系统蓝牙菜单配对——一定在 App 自己的 MIDI 设置里配对。
有线零延迟：USB-B→USB-A 线 + Apple 相机转接头 → iPad。

## 一、消费级学习 App（开箱即用，听 MIDI 判断对错 + 鼓励）

| App | 玩法 | 价格 | 适合 |
|-----|------|------|------|
| 🥇 **Simply Piano** | 落音符+星星奖励+背景伴奏，像电子游戏 | 免费基础+订阅 | 无聊孩子首选，最游戏化 |
| 🥈 **Synthesia** | 落音符，Wait Mode 等按对才继续 | 买断 | 视觉学习+自定义 MIDI 谱 |
| **Flowkey** | 真人俯拍手部视频 + Wait Mode | 订阅 | 想弹流行曲/游戏曲 |
| **Yousician** | Guitar-Hero 风格，星星+连胜+排行榜 | 免费试+订阅 | 爱刷高分的孩子 |
| 🆓 **Piano Marvel** | Reddit 公认最佳免费 MIDI，逐音评分、视奏强 | 有免费层 | 认真学的性价比之王 |
| 🆓 **Hoffman Academy** | 免费视频课，最适合入门小孩 | 免费 | 启蒙 |

⚠️ **Simply Piano 副作用**：孩子可能靠记颜色/猜音符而非真读谱——配合下面识谱 App 补足。
**MIDI vs 麦克风**：用 MIDI（线/蓝牙）比麦克风准确可靠得多。

## 二、识谱训练 App（听到按对就鼓励，治"不会读谱"）

| App | 玩法 | 价格 |
|-----|------|------|
| 🥇 **Note Rush** | 屏幕显示音符，琴上弹，听 MIDI/麦克风判断；主题(飞船/足球)+五星；只会等不会"输"（孩子零挫败）；强制正确八度 | 订阅 |
| **NoteWorks** | "饿肚子小怪物吃对的音符" | $4.99 |
| **My Note Games** | 6个小游戏，听真实演奏，多账号家庭 | 免费下+$6.99全解锁 |

## 三、扫谱→MIDI（拍现成谱子让孩子跟弹）

| App/工具 | 强项 | 价格 |
|---------|------|------|
| 🥇 **PlayScore 2** | 业界最强 OMR，多声部/歌词/力度，导出 MIDI/MusicXML | 免费层+订阅 |
| **Sheet Music Scanner** | 简单谱可靠 | <$5 买断 |
| **Audiveris**（开源） | 桌面 OMR 金标准，整本谱，可手动改错(85-95%) | 免费 |
| **oemer / homr**（开源） | 手机拍照→MusicXML（homr 更准） | 免费(Python) |

流程：拍谱 → PlayScore 2/Audiveris → 导出 .mid → 喂给 Synthesia/Piano-LED-Visualizer 跟弹。

## 四、开源 DIY 项目（技术型家长最对口）

| 项目 | Star | 这是什么 |
|------|:---:|---------|
| 🥇 **onlaj/Piano-LED-Visualizer** | 741★ | **最匹配"灯光颜色"需求**！树莓派+LED灯条，按键亮灯；学习模式亮灯提示该按哪键、等按对才继续、按错亮红灯、可循环练难段。硬件~$75-100，有预制镜像免编程 |
| 🥇 **pianobooster/PianoBooster** | 556★ | 经典开源"跟 MIDI 学琴"，"Follow you"模式：你停它停、等弹对；对错音不同音色；内置渐进课程。跨平台 |
| **ImAxel0/Openthesia** | 202★ | Synthesia 开源克隆，等按对才继续，SoundFont 真钢琴音，Windows |
| **leandrodaf/pianalyze** | 17★ | 隐藏宝藏！实时"Perfect/Good/OK"评分（正是鼓励反馈），<30µs 延迟 |
| **Bewelge/MIDIano** (midiano.com) | ~500★ | 零安装！Chrome+USB MIDI 键盘→开网页→落音符+等按对模式。先试水最佳 |
| **Audiveris** | ~1800★ | 扫谱→MusicXML→MIDI |

> 完整开源项目对比见 `reference/research/midi-light-summary.md`（含全部 GitHub URL + 硬件清单 + 难度评级）。

## 五、给孩子的推荐路径（从易到难）

**第1步（今晚就能试，零成本/零安装）**：
- CA99 蓝牙连 iPad → 装 Simply Piano（最游戏化，治无聊）或 Chrome 开 midiano.com
- 孩子按对就有星星/继续——立刻看到"懂我按键"的反馈

**第2步（补识谱，治根本）**：
- 加 Note Rush（听按键给鼓励的识谱游戏）+ 免费 Piano Marvel（认真视奏）

**第3步（DIY 炫酷灯光，孩子超兴奋）**：
- 搭 Piano-LED-Visualizer（~$75 树莓派+LED灯条）——按键亮彩灯 + 学习模式亮灯提示 + 按错亮红

**第4步（扫现成谱子跟弹）**：
- PlayScore 2 或开源 Audiveris 拍谱→MIDI→喂 Synthesia/Piano-LED-Visualizer

## 六、与本项目的关系

| 这条线（孩子学琴） | 本项目（你的创意控制） |
|-------------------|----------------------|
| 用现成 App/项目 | 自建 PWA（方案 A，见 EVALUATION.md） |
| 目的：学琴、识谱、保持兴趣 | 目的：切音色/调 VT/自动伴奏/灯光同步 |
| CA99 出一路 MIDI 给学习 App | CA99 出另一路 MIDI 给你的 PWA |

两者并行不冲突——CA99 可同时连多个 MIDI 消费端。

---

> 数据来源：4-5 个 Sonnet/research subagent 调研，原始数据存 SQLite `browserctl/ca99-midi/`、`piano-apps`、`omr` 等
