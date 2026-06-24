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
    midi-core.js      ← MIDI 连接层（双传输：Web MIDI 默认 / WebSocket 桥接走蓝牙）
    bridge-protocol.js ← 桥接协议（纯函数 + BridgeClient，midi-core 与 Python 桥共用）
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
    beat-stability.js ← 节拍稳定度分析（采集击键间隔算稳定度/估BPM/赶拍拖拍，纯逻辑，58 单元测试）
    hands-sync.js     ← 双手协调练习（按音高分左右手，测每拍双手落键时间差算协调度，纯逻辑，58 单元测试）
    arpeggio-runs.js  ← 琶音跑动速度测试（根音+性质+八度+方向生成目标琶音，按序弹测速度/均匀度评分，纯逻辑，90 单元测试）
    articulation.js   ← 连奏/断奏控制（用按住时长÷起音间隔的触键比判连奏/断奏并逐音打分，纯逻辑，60 单元测试）
    pedal-timing.js   ← 踏板配合时机（切分踏板法，测新音到重新踩下的间隔判干净/脏/干，纯逻辑，70 单元测试）
    trill.js          ← 颤音速度训练（两音快速交替，测颤音速度Hz+均匀度+交替正确性，纯逻辑，77 单元测试）
    ornament.js       ← 装饰音训练（倚音/波音/回音，按目标音序列逐音匹配+测干脆度/均匀度，纯逻辑，88 单元测试）
    leap.js           ← 音程大跳准确度（生成大跳序列，逐音跳准，测一次弹准率，纯逻辑，70 单元测试）
    voicing.js        ← 旋律声部突出（和弦里目标声部力度是否高于内声部，纯逻辑，63 单元测试）
    crescendo.js      ← 力度渐变曲线（一串音的力度走向是否平滑渐强/渐弱，测方向/平滑度/跨度，纯逻辑，70 单元测试）
    tempo-ramp.js     ← 速度渐变（一串击键间隔是否平滑渐快/渐慢，测方向/平滑度/变速幅度，纯逻辑，72 单元测试）
    polyrhythm.js     ← 复节奏（两声部 a:b 平分周期，按音高/按钮分左右手分别判命中，纯逻辑，66 单元测试）
    evenness.js       ← 颗粒性（一串跑动音的力度/时值是否均匀，用变异系数 CV 打分，纯逻辑，57 单元测试）
    finger-independence.js ← 手指独立性（按住几个键不放、动其他手指，测按住音是否滑脱+音型对错，纯逻辑，44 单元测试）
    scale-span.js     ← 音阶八度跨度（音阶连跑 2~3 个八度，测音符正确+速度均匀+穿指衔接，纯逻辑，62 单元测试）
    rhythm-dictation.js ← 节奏听写（听一段节奏后凭记忆敲回来，与速度无关只比长短比例，纯逻辑，60 单元测试）
    sight-transpose.js ← 移调视奏（看 C 调小旋律移到目标调弹出来，测移调音级正确率+旋律形状，纯逻辑，55 单元测试）
    chord-inversion.js ← 和弦转位听辨（听一个三和弦，判断原位/第一/第二转位，纯逻辑，47 单元测试）
    key-signature.js  ← 调号识别（看调号几个升/降号，判断大调/小调，五度圈，纯逻辑，402 单元测试）
    scale-fingering.js ← 音阶指法提示（显示标准音阶指法、跟弹高亮、穿指点，纯逻辑，113 单元测试）
    interval-build.js  ← 音程构建（给根音+音程名，弹出目标音，纯逻辑，48 单元测试）
    mode-id.js         ← 调式识别（听教会调式音阶多选辨认，纯逻辑，146 单元测试）
    solfege.js         ← 唱名/音级听辨（建立调性后辨认音级 Do-Re-Mi，纯逻辑，196 单元测试）
    chord-quality.js   ← 和弦性质听辨（听和弦辨大/小/增/减/七和弦类型，纯逻辑，185 单元测试）
    progression-ear.js ← 和声进行听辨（听大调进行辨每个和弦的罗马数字级数，纯逻辑，337 单元测试）
    cadence.js         ← 终止式辨认（听两个和弦的终止式辨正格/变格/半终止/阻碍，纯逻辑，287 单元测试）
    note-id.js         ← 键盘音名认知（音名↔88键位双向认键：看音名找键/看键认音名，纯逻辑，1182 单元测试）
    staff-read.js      ← 五线谱识谱卡（看谱认音名：看谱选音名/看谱点键、带线间口诀、高音/低音/大谱表，纯逻辑，2270 单元测试）
    sight-phrase.js    ← 乐句视奏（读一句标准记谱短旋律：带节奏+调号，照谱逐音弹奏判分，8 调/3 档节奏，纯逻辑，21 单元测试）
    chord-sight.js     ← 和弦视奏（读五线谱上的叠置和弦：三/七和弦、可转位、带调号，整组同时按下判分并报和弦名，纯逻辑，21 单元测试）
    rhythm-sight.js    ← 节奏视奏（读单行节奏谱：随机生成各拍时值+休止符，节拍器预备拍后照谱击打任意键/TAP，判分完美/良好/漏击/多击+抢拍拖拍倾向+落点时间对比图，4/4·3/4·3 档难度，纯逻辑，20 单元测试）
    accompaniment.js   ← 伴奏音型（把所选调上的和弦进行用柱式/阿尔贝蒂低音/华尔兹/分解琶音/行进低音五种伴奏型展开成"该弹的音"步骤，照高亮按顺序弹出即推进，步进式判分+连击+评星，复用 chord-progression 调与进行库，纯逻辑，21 单元测试）
    chord-color.js     ← 和弦色彩板（弹下任意和弦→识别和弦名+和声功能，映射成颜色光：大调暖/小调冷/属七减和弦闪烁"想回家/紧张"，设调后给出罗马级数 I/ii/V7 与功能名+"解决回主"提示，复用 chord-detect，纯逻辑，24 单元测试）
    piano-keyboard.js  ← 通用全幅 88 键虚拟钢琴组件（可点击发声/高亮答案/演示点亮，纯布局逻辑 46 单元测试）
    score-follow.js    ← 曲谱跟弹（Synthesia 式：内置 7 首乐曲/上传 MIDI 落音符到琴键、3 档训练、音名标签/节拍器/渐进提速/提示/区间循环/落点时间对比图、左右手分色/和弦/变速、力度可视化/真琴发声/每曲历史最高分/三星彩屑庆祝/随机选曲/练习足迹统计，纯逻辑，33 单元测试）
    midi-file.js       ← 标准 MIDI 文件(SMF)解析器（解析多轨/VLQ/note on-off/running status/tempo map，tick→ms，自动按音轨或音高分配左右手，纯逻辑，13 单元测试）
    circle-of-fifths.js ← 五度圈交互工具（点调看调号/关系小调/正确拼写音阶/顺阶和弦 I–vii°，可试听音阶+和弦+终止式，纯逻辑，21 单元测试）
    app.js            ← 主入口 + 各玩法模块
  data/               ← 从逆向数据生成的 CA99 专属精简表
    sounds.json       ← 346 CA99 音色（name/category/pc/msb/lsb）
    sysex.json        ← 526 CA99 SysEx 参数定义
    vt.json           ← VT 参数
    rhythm.json       ← 100 节奏
```

## 已实现模块（玩法）

> 侧边栏按「演奏控制 / 练习训练 / 工具」三组分类，每组标题带模块数量徽章，顶部带🔍 实时搜索框（输入即过滤模块，Esc 清空），可滚动；切换模块时顶栏面包屑显示当前模块名、内容区自动回到顶部；窄屏（≤1024px 收窄、≤720px 折叠为图标条）自适应。各模块标题带渐变色条、统计数字用渐变描字，整体配色/动画统一。

| 模块 | 状态 | 说明 |
|------|------|------|
| 🎵 音色浏览器 | ✅ | 346 音色，按分类筛选/搜索，点击切换（标准 Bank Select + PC）。下方配<b>全幅 88 键虚拟钢琴</b>，切音色后直接点键即发真实 MIDI 试听，不用去琴上弹就能判断音色对不对 |
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
| 🎡 五度圈 | ✅ | 交互式<b>五度圈</b>乐理中枢：SVG 圆盘外环 12 大调 / 内环关系小调，顺时针每格升五度（多 1♯）、逆时针降五度（多 1♭）。点任意调即显<b>调号</b>、<b>关系小调</b>、正确拼写的<b>音阶</b>（如 G→F#、Db→全降）与<b>顺阶三和弦 I ii iii IV V vi vii°</b>（罗马数字按大/小/减三色标）。可🔊播放音阶、点和弦试听、听 <b>I–IV–V–I 终止式</b>，钢琴上同步高亮（主音金色）。相邻调只差一个音——转调/扒谱/即兴配和声的核心地图，接 CA99 可直接弹真琴 |
| ⏺ 录制回放 | ✅ | 录下弹奏，回放欣赏，或导出标准 MIDI 文件（.mid）保存/分享 |
| 🎼 音阶练习 | ✅ | 选调+音阶类型，按高亮提示依次弹奏，实时检查对错+进度（8 种音阶/上下行/忽略八度） |
| 👀 视奏闪卡 | ✅ | SVG 五线谱出题，看谱在琴键弹出对应音，弹对自动出下一题（高/低音谱号/连击/正确率/忽略八度） |
| 🎹 曲谱跟弹 | ✅ | <b>Synthesia 式</b>跟弹，<b>支持上传任意 .mid/.midi 文件</b>作为曲谱（自动识别多轨/和弦/左右手/变速），也可选内置曲目：<b>🐣 4 个零基础启蒙关卡</b>（找中央C/低·中·高C 音区认知/高低音方向感/五指阶梯 C-D-E-F-G——选中即自动开音名标签并提示用 🐢 等待练习，把"找中央C/音区/方向感"这些最缺的零基础启蒙环节直接融进有趣的 Synthesia 玩法，而非另开模块）+ <b>7 首乐曲</b>（小星星/欢乐颂/玛丽的小羊/铃儿响叮当/🎼巴赫小步舞曲G/🎼致爱丽丝/🎼肖邦夜曲Op.9No.2）。音符像 Synthesia 从上往下<b>落到对应琴键</b>，块上直接标<b>音名</b>（C4/E4…可关），上方<b>五线谱</b>同步走光标（右手蓝/左手紫，带图例）。<b>三档由易到难的训练</b>：🔊 <b>听示范</b>（看+听不判分）→ 🐢 <b>等待练习</b>（播放头停在当前音符组、弹齐才前进，最适合入门，卡住按 💡 <b>提示</b>让该弹的键闪 3 秒并发声）→ 🎯 <b>跟弹判分</b>（音符落到判定线那刻弹对应键，按<b>音高+时机</b>双重判分：正中=PERFECT、稍偏=GOOD、漏弹=MISS，连对累计 Combo，结束按正确率给 ★☆ 评星）。可开 🥁 <b>节拍器</b>（跟随播放头按拍点击、重拍加重音、显示实时 BPM 徽章）、🐇 <b>渐进提速</b>（每遍正确率 ≥80% 自动 +0.05× 直到 1.5×）、🔁 <b>区间循环</b>（选「第 X–Y 小节」反复练某个难点段落，五线谱上高亮循环区，跳回段首不自动结束、停止时记成绩）。完成后画 ⏱️ <b>落点时间对比图</b>（每个音点在「准点线」上下：<b>抢拍</b>在上、<b>拖拍</b>在下，颜色按 PERFECT/GOOD/MISS 区分，附平均误差、最大误差与「偏抢/偏拖/均衡」总评，知道自己习惯抢拍还是拖拍）。MIDI 含左右手时可选<b>练右手/左手/双手</b>（其余手音符淡显）。可选速度（0.5/0.75/1×）、难度（简单忽略八度/标准要弹准八度），没接 MIDI 也能点屏幕琴键作答，成绩入仪表盘。还有更多趣味开关：💪 <b>力度可视化</b>（上传 MIDI 自带 velocity 时强音更亮、弱音更暗，一眼看出原曲强弱起伏）、🎹 <b>真琴发声</b>（接 CA99 时示范/提示直接用钢琴当前音色在真琴上发声，更沉浸）、<b>每曲历史最高分</b>（用 localStorage 存每首的最佳「★★★ 92% 练过 N 遍」，切歌即显，刷新纪录有 🏅 提示）、🎲 <b>随机一首</b>（换口味时帮你随机挑一首没在练的）、三星满分时撒一阵 🎉 <b>彩屑庆祝</b>，<b>每弹对一个音</b>还会在对应琴键位置迸发一束 ✨ <b>彩色火花</b>、判定线随命中<b>发光脉冲</b>——而且火花<b>跟着你的 MIDI 力度走</b>：轻弹少量冷蓝小火花、重弹一大片暖红大火花，判定线发光也随力度增强（接 CA99 时直接把触键力度画成声光），连对到 5/10/15… 时弹出 🔥 <b>连击里程碑</b>飘字（可用 ✨ 击中特效开关一键关掉）。<b>🐣 启蒙关卡</b>还会在下落块和琴键上标出<b>手指号</b>（1=拇指…5=小指，如五指阶梯 C-D-E-F-G 标 1·2·3·4·5），零基础照着按。完成后还会推荐去 🎼 <b>乐句视奏</b>脱离下落提示纯读谱练同一句，形成识谱闭环。底部 🎼 <b>练习足迹</b>面板用 localStorage 记录每遍计分演奏：<b>每首练了几次</b>（条形排行 + 最佳星级/正确率 + 最近练习时间）、<b>近 7 天每日练习量</b>柱状图、<b>本周练最多</b>是哪首，一眼看清自己的练习分布。另有 📷 <b>拍谱识别（实验）</b>入口：填入本机 OMR 服务地址（如 homr，接收 <code>image</code> 表单字段、返回标准 MIDI），上传/拍一张乐谱图片即自动识别成可跟弹的曲目；无服务时友好提示改用「上传 MIDI」 |
| 👂 音程听辨 | ✅ | 电脑发声播放两个音，辨认它们的音程并点按钮作答（上行/下行/和声/混合，可选音程范围，连击/正确率） |
| 💪 力度练习 | ✅ | 屏幕给目标力度（pp~ff），用触键强弱命中它，力度刻度条+指针实时显示你的 velocity（6 档/容差可调/连击/正确率） |
| 🎹 移调器 | ✅ | 一键把整个键盘升/降调（-12~+12 半音），用熟悉指法弹任意调，发 CA99 移调 SysEx 让钢琴自身也移调（滑块/±按钮/预设/听感调显示） |
| 🥁 节奏跟拍 | ✅ | 屏幕给节奏型（四分/八分/切分/附点），先一小节预备拍（节拍器引导），跟着拍点在琴键敲击，按时间误差判完美/良好/漏拍/多敲，播放头+落点高亮，平均误差统计（无琴可空格键敲） |
| 🎼 旋律听写 | ✅ | 听一段调内短旋律（首音为主音锚点，Web Audio 三角波播放），在琴键上逐音复奏，对的灯变绿、错的不前进，整条全对自动出下一条；可选调/长度/忽略八度/速度，带屏幕琴键，可再听/放弃看答案，成绩入仪表盘 |
| 🎹 和弦进行 | ✅ | 把"万能流行 I–V–vi–IV""ii–V–I""卡农""12 小节布鲁斯"等 7 条著名进行在所选调（含大小调）上展开成具体和弦（C–G–Am–F），按序弹出每个和弦即推进（忽略转位，复用和弦识别），罗马数字+和弦名高亮，可试听整条/替我弹演示，循环计圈，成绩入仪表盘 |
| 📈 节拍稳定度 | ✅ | 持续均匀弹奏（或空格键敲击），采集击键间隔算出稳定度评分（基于变异系数 CV）、估算 BPM、判断赶拍/拖拍/稳定；可开跟拍模式对照固定 BPM 测准度（带节拍器试听），实时间隔条形图（绿/黄/红显示偏差），成绩入仪表盘 |
| 🙌 双手协调 | ✅ | 每拍同时弹一个低音区（左手）和一个高音区（右手）音，按音高分手，测两手落键时间差（onset spread）算协调度评分，圆形仪表+逐拍色点显示，统计平均协调/双手到齐率/连击/最佳，成绩入仪表盘 |
| 🎶 琶音跑动 | ✅ | 选根音+和弦性质（大/小/属七/大七…）+八度+方向（上/下/上下行）生成目标琶音音序，按序弹出，引擎测速度（音/秒）与均匀度（IOI 变异系数）综合评分，目标音序高亮推进，**88 键键盘高亮目标音序（紫色目标+黄 ▶ 当前音，可点键试弹）**，成绩入仪表盘 |
| 🎻 连奏断奏 | ✅ | 选目标演奏法（连奏 legato / 断奏 staccato），连续弹音，引擎用每个音的按住时长÷到下一音的间隔得"触键比"判连贯/短促并逐音打分，色块分数墙显示，**88 键键盘实时显示按住的音（连奏重叠点亮、断奏短促闪过，绿/红=达标与否）**，成绩入仪表盘 |
| 🦶 踏板时机 | ✅ | 练切分踏板法（连奏踏板）：弹新音后抬延音踏板再重新踩下，引擎测"新音→重新踩下"间隔判干净/脏（踩太早）/干（踩太晚），踏板状态可视化+净脏干色点，三种难度窗口，成绩入仪表盘 |
| 🪶 颤音速度 | ✅ | 练颤音（两个相邻音快速来回交替 C–D–C–D…）：选下方音+音程（半音/全音/小三度），又快又匀地交替弹两音，引擎测颤音速度（次/秒）、均匀度（IOI变异系数）、交替正确性（弹错音/没交替会扣分），速度计可视化+双键模拟，**88 键键盘标出两个颤音键（蓝"下"/橙"上"，每击闪光）**，成绩入仪表盘 |
| 🎵 装饰音 | ✅ | 练三种装饰音：倚音（小音+主音，2音）、波音（主-辅-主，3音）、回音（上辅-主-下辅-主，4音）；按目标音序列逐音匹配（弹错音不推进且扣分），引擎测干脆度（装饰音间隔越短越好）+ 均匀度，目标序列可视化逐音点亮 + 一键模拟弹奏，成绩入仪表盘 |
| 🎯 音程大跳 | ✅ | 练"大跳"（相邻音相距八度以上）：生成一串相邻间隔≥设定跳度的目标音，依次"一次弹准"才满分，弹错（摸索）不推进且扣准确度；可选音域（2/3/5 八度）+ 最小跳度（五度/八度/十度）+ 目标数，目标序列点亮/抖动反馈 + 一键模拟，**88 键键盘画出每一跳（蓝"从"→黄"到"，直观看到跳多远）**，成绩入仪表盘 |
| 🔝 旋律突出 | ✅ | 练"声部平衡/voicing"：弹和弦时让旋律声部（最高音，或选最低音）比内声部更响；每轮同时按一个和弦，引擎比较目标声部力度与其余音的最大力度之差，达到设定余量即满分，被埋没（更轻）给 0；可选目标声部/力度余量/和弦数，每和弦色块+力度显示+两种模拟，**88 键键盘显示和弦键位（金"响"=目标声部、蓝色内声部带力度标）**，成绩入仪表盘 |
| 🎚️ 力度渐变 | ✅ | 练 crescendo/decrescendo：连续弹一串音（5/8/12 个），力度整体平滑渐强或渐弱；引擎按方向正确度（相邻力度差符号对不对，权重 50%）+ 平滑度（与首尾线性斜坡的平均偏差，30%）+ 力度跨度（首尾差到设定值封顶，20%）综合评分，SVG 实时画力度曲线（绿/红点标方向对错、虚线为理想斜坡），两种模拟，成绩入仪表盘 |
| 🚀 速度渐变 | ✅ | 练 accelerando/ritardando（含 rubato 收放）：连续敲一串音（6/9/13 下，任意键或空格），速度整体平滑渐快或渐慢；引擎测每两下的间隔 IOI，按方向正确度（间隔变小/变大对不对，50%）+ 平滑度（IOI 与理想斜坡的相对偏差，30%）+ 变速幅度（首尾速度比，20%）综合评分，SVG 实时画 BPM 曲线（绿/红点标方向对错、虚线为理想斜坡），两种模拟，成绩入仪表盘 |
| 🥁 复节奏 | ✅ | 练 polyrhythm（2:3 / 3:2 / 3:4 / 4:3）：两声部在同一周期里平分成不同份数，先听一遍预览再跟着两条轨道敲——连琴时中央 C 以下=左手声部 A、及以上=右手声部 B，没连琴用按钮或键盘 F/J；引擎为两声部各建理想落点网格，按声部把每次敲击匹配到最近未命中落点判 完美/良好/漏/多，综合分=命中率 70%+时间精度 30%，双轨道实时高亮命中、模拟一遍，成绩入仪表盘 |
| 💧 颗粒性 | ✅ | 练 evenness（颗粒感）：连弹一串跑动音（8/12/16 个），让每个音的力度与每两音的间隔都尽量均匀；引擎用变异系数 CV（标准差÷均值）量化离散度，力度均匀分+时值均匀分按可调权重综合（默认各 50%），双排柱状图按相对均值偏差着色（绿=齐、橙=偏），连琴练力度+时值、按钮/空格只练时值，模拟一遍，成绩入仪表盘。与"力度控制"（打目标档）、"节拍稳定度"（跟匀速拍）互补 |
| 🖐️ 手指独立性 | ✅ | 练 finger independence：用部分手指按住几个键不放，同时用其他手指反复敲移动音型（5 套预设，如按 C+E 动 G、按 C+E+G 动 B↔D），可选重复 2/3/4 遍；引擎边记 note-on/off，每敲一个移动音就快照"该按住的音是否都还按着"，统计独立保持率 + 音型正确率（顺序对不对），综合分=独立保持 60%+音型 40%，并计滑脱次数（按住音在收尾前被抬起）；按住键/移动键实时高亮，**88 键键盘标注键位（琥珀"按"=按住键、蓝"移"=移动音型，敲击/滑脱实时闪烁）**，需连琴检测按住与松开、模拟一遍演示评分，成绩入仪表盘 |
| 🎹 音阶八度跨度 | ✅ | 练 scale span：把音阶连续跑过 2~3 个八度（上行/上下行，任意调+8 种音阶），重点不只是音对不对——综合分=音符正确 50%+速度均匀 30%（整串 IOI 的变异系数）+穿指衔接 20%（跨八度根音处间隔是否明显慢于中位=卡顿）；琴键条按八度铺开、穿指点标橙边、跟弹时实时高亮命中/错音，需连琴依次弹、模拟一遍演示评分，成绩入仪表盘。与"音阶练习"（只判音准/进度）互补 |
| 👂 节奏听写 | ✅ | 练 rhythm dictation（耳朵）：先<b>听</b>一段节奏（屏幕<b>不显示</b>长短），再在<b>任意一个键</b>上把它<b>敲回来</b>；评分<b>与速度无关</b>——把你敲出的相邻间隔（IOI）整体缩放到与目标同样的总时长后，逐间隔比相对误差，只看<b>长短比例</b>对不对（短短长 vs 长短短），所以敲快敲慢都行。综合分=节奏比例准确度 × 敲击个数匹配度（多敲/少敲打折）；3 档难度（八分/四分→加附点四分→加十六分/附点八分），听完用 Web Audio 咔哒声播放、敲回来时点亮圆点、打分后用对比条画"目标 vs 你的"长短，需连琴敲、模拟一遍演示评分，成绩入仪表盘。与"节奏跟拍"（看着谱跟节拍器、判绝对落点）不同，这里全凭听 |
| 🎼 移调视奏 | ✅ | 练 sight transposition（看谱移调）：屏幕给一段<b>原调（C）</b>小旋律（6 首唱名片段：上下行五音/主和弦琶音/小星星/欢乐颂/玛丽小羊/下行四音）+ 一个<b>目标调</b>（7 个调），你要把同一段旋律<b>移到目标调</b>弹出来——起音落目标音、其余保持一样音程。综合分=移调后音级正确率（忽略八度）；另算<b>旋律形状</b>（音程序列）正确率，用来识别"旋律对了但调没移对"并给提示；可🔊听原调旋律、👁看答案、🎲模拟一遍，需连琴弹，成绩入仪表盘。和"移调器"（整体升降键盘）、"视奏闪卡"（照谱原样弹）、"旋律听写"（凭听复奏原音高）都不同 |
| 🎹 和弦转位听辨 | ✅ | 练<b>和弦转位</b>听辨：随机播放一个三和弦（大/小三和弦，根音范围可调），你凭听判断它是<b>原位/第一转位/第二转位</b>（多选按钮答题，纯耳朵练习无需连琴）。原位=两个三度叠起来；第一转位=最上方出现纯四度；第二转位=最下方出现纯四度。答完🔊揭晓和弦音名（最低音高亮为低音），统计正确率/连击/最佳，成绩入仪表盘。和"和弦构建"（按名弹和弦、不分转位）、"和弦进行"、"和弦识别"都不同——这里专练<b>转位的听觉辨识</b> |
| 🎼 调号识别 | ✅ | 练<b>调号</b>读谱：屏幕显示一个调号（1~7 个升号 ♯ 或降号 ♭，可限定 ±2/±4/±7），你判断它是哪个<b>大调/小调</b>（多选按钮，纯乐理无需连琴）。基于<b>五度圈</b>：升号顺序 F C G D A E B、降号顺序 B E A D G C F。诀窍——升号调看<b>最后一个升号上方半音</b>是大调主音；降号调看<b>倒数第二个降号</b>是大调主音（仅 1 降号固定 F 大调）；小调再下小三度取关系调。答完显示诀窍提示并🔊播放该调音阶。和"音阶练习"（弹音阶）、"和弦识别"都不同——这里专练<b>看调号秒认调名</b>
- 音程构建用 `interval-build.js`（纯逻辑，48 单元测试）：`INTERVALS` 列出 12 个音程（m2..P8 对应半音 1..12，含名称/简写/半音数）、`DIRECTIONS` 上行(+1)/下行(-1)。`intervalBySemitones(st)`/`intervalById(id)`/`noteName(midi)`/`targetMidi(root,st,dir)` 是纯工具函数。`IntervalBuildGame({rng,intervals,directions,rootMin,rootMax})`：`next()` 随机出题（根音范围按方向+音程收紧，保证目标音落在 0..127）、`check(playedMidi)` 须精确等于目标音才判对、`score/streak/best/accuracy/reset()`，`onNew`/`onResult` 回调。UI 显示"从 X 根音 向上/下 某音程"，🔊 播根音参考，note-on 接 `ivbOnNote` 钩子判分，弹对 700ms 后自动出下一题、弹错提示差几个半音，成绩入仪表盘。和"听音训练"相反——练<b>反向构建</b>能力 |
- 调式识别用 `mode-id.js`（纯逻辑，146 单元测试）：`MODES` 列出 7 个教会调式（各含 `offsets[7]` 相对主音半音、`degree` 在大调中的级数、`hint` 特征提示）、`scaleMidi(root,modeId)` 生成 8 音音阶（含八度）、`stepPattern(modeId)` 返回全/半音步进指纹（如 Ionian=[2,2,1,2,2,2,1]、Dorian 是回文）。`ModeIdGame({rng,modes,rootMin,rootMax,choiceCount})`：`next()` 随机出题并构建打乱的多选干扰项、`notes()`/`choices()`/`check(answerId)`/`score/streak/best/accuracy/reset()`，`onNew`/`onResult` 回调。这是<b>纯听辨多选</b>（像调号识别/和弦转位），用 `playTone` 播音阶、点选项判分，无 note-on 钩子。答完显示调式特征提示，可🔊再听，成绩入仪表盘 |
- 唱名听辨用 `solfege.js`（纯逻辑，196 单元测试）：`SCALES`（大调/小调的半音步进 + 可动唱名，小调用 Me/Le/Te）、`DEGREES` 七级功能名+诀窍、`degreeMidi(tonic,degree,scaleType)`/`tonicTriad(tonic,scaleType)`/`syllable(degree,scaleType)` 是纯工具函数。`SolfegeGame({rng,scaleType,degrees,tonicMin,tonicMax,choiceCount})`：`next()` 随机选主音+音级（启用音级里取干扰项打乱）、`triad()`/`target()`/`tonic()`/`choices()`/`check(answerDegree)`/`score/streak/best/accuracy/reset()`，`onNew`/`onResult` 回调。<b>纯听辨多选</b>，UI 先用 `playTone` 播主和弦建立调性、隔 750ms 再播目标音，点选项判分（无 note-on 钩子），主和弦与目标音可分别重听，成绩入仪表盘 |
- 和弦性质听辨用 `chord-quality.js`（纯逻辑，185 单元测试）：`QUALITIES` 列出 9 种和弦性质（4 三和弦 major/minor/aug/dim + 5 七和弦 dom7/maj7/min7/m7b5/dim7，各含 `intervals[]` 相对根音半音、`symbol` 和弦记号、`family` 三/七和弦、`hint` 色彩诀窍）、`chordMidi(root,qualityId)` 构造和弦音。`ChordQualityGame({rng,qualities,rootMin,rootMax,choiceCount})`：`next()` 随机出题并构建打乱的多选干扰项、`notes()`/`choices()`/`root()`/`check(answerId)`/`score/streak/best/accuracy/reset()`，`onNew`/`onResult` 回调。<b>纯听辨多选</b>（像调式识别/转位听辨），UI 用 `playTone` 按选定方式播整块和弦/琶音、点选项判分（无 note-on 钩子），可🔊再听，成绩入仪表盘
- 和声进行听辨用 `progression-ear.js`（纯逻辑，337 单元测试）：`DEGREES` 列出大调 7 个自然音级三和弦（罗马数字 I/ii/iii/IV/V/vi/vii°，各含 `quality`/`name`/`hint` 功能诀窍）、`PROGRESSIONS` 含 8 个常用进行（流行 I-V-vi-IV、doo-wop、卡农、ii-V-I、变格、正格、忧伤、摇滚）、`chordMidi(tonicMidi,degree)` 按调内三度叠置构造自然音级三和弦（含八度回绕）。`ProgressionEarGame({rng,progressions,tonicMin,tonicMax,choiceCount})`：`next()` 随机选进行+主音并构建整段和弦（第 1 个 I 为锚点）、`progressionNotes()`/`chords()`/`currentChord()`/`choices()`/`check(answerDegree)` 逐个和弦判分推进、`isComplete()`/`score/streak/best/accuracy/reset()`，`onNew`/`onResult`/`onComplete` 回调。<b>纯听辨多选</b>，UI 用 `playTone` 顺序播整段、高亮当前待辨和弦、点罗马数字选项判分，成绩入仪表盘
- **通用全幅虚拟钢琴** `piano-keyboard.js`（纯布局逻辑 46 单元测试）：一个可在任意模块复用的 88 键（A0–C8）钢琴组件。纯函数 `buildLayout(first,last,opts)` 算出白/黑键的绝对几何位置（白键等宽并排、黑键居中压缝），`isBlack`/`noteName`/`whiteCount` 等辅助；DOM 类 `PianoKeyboard(container,{labels,onNoteOn,onNoteOff})` 渲染可点击键盘，方法 `highlight/highlightMany(把答案音画在真实键位上，带炫彩描边+序号徽章)`、`flash(演示跟随点亮)`、`press/release(回显外部 MIDI)`、`scrollToShow(自动滚动居中)`、`clear`。按下/点亮带渐变发光动画。已接入：**音色浏览器**（点键发真实 MIDI 试听当前音色，切音色后不用去琴上就能判断对错）、**音阶练习**（整条音阶高亮+▶标下一个该弹的键）、**旋律听写**（点键输入、播放跟随点亮、放弃看答案时按顺序高亮）、**音程听辨/唱名听辨/和弦性质听辨/和声进行听辨**（答完把正确音画在键盘上）、**视奏闪卡**（没接 MIDI 也能点键作答，答错把正确音高亮）、**和弦练习**（挑战开始即把目标和弦该按的键高亮）、**和弦转位听辨**（答完画出三和弦音，低音特别标色）、**音程构建**（弹错/弹对都画出根音+目标音）、**调号识别/调式识别**（答完把该调/调式音阶带级数 1-7 画在键上）、**移调视奏**（看答案/完成把移调后目标音按序画出）、**移调器**（点键发真实移调 MIDI 直接听效果）、**和弦进行**（当前该弹的和弦实时高亮）、**音阶指法提示**（整条音阶画在 88 键上、每键标手指号、▶ 标当前该弹的键、红色标穿指/跨指点）、**曲谱跟弹**（Synthesia 式落音符到对应键、判定时刻高亮该弹的键）、**乐句视奏**（看答案把整句按序号画在 88 键上、弹错高亮该弹的音）、**和弦视奏**（看答案把整组叠置和弦该按的键画在 88 键上、按对变绿/按错变红）、**五度圈**（当前调音阶高亮+主音金色、点和弦/终止式点亮试听三和弦）。这样即使看不懂题目，看答案在 88 键上的位置就知道该怎么弹 |
| 🖐️ 音阶指法提示 | ✅ | 学标准钢琴<b>音阶指法</b>：屏幕给一个八度音阶（9 个调：C/G/D/A/E/F 大调 + A/E/D 自然小调），每个音上方标注<b>该用几号手指</b>（右手 1=拇指…5=小指，左手相反），可切左/右手、上行/上下行。<b>跟着弹</b>——弹对当前音就高亮下一个，红框标出<b>穿指/跨指点</b>（右手拇指穿过、左手手指跨过）。诀窍：C/G/D/A/E 大调右手都是 <b>1 2 3 1 2 3 4 5</b>、F 大调例外 <b>1 2 3 4 1 2 3 4</b>；左手都是 <b>5 4 3 2 1 3 2 1</b>。可🔊听一遍，需连琴弹，成绩入仪表盘。和"音阶练习"（练音准/速度）、"音阶八度跨度"（练跨多个八度）都不同——这里专练<b>正确指法与穿指动作</b> |
| 🎯 音程构建 | ✅ | "听音训练"的<b>反向能力</b>：屏幕给一个<b>根音</b>+一个<b>音程名</b>（如"从 C4 往上弹纯五度"），你在键盘上<b>弹出目标音</b>。可选基础 6 种（M2/m3/M3/P4/P5/P8）或全部 12 种音程，方向可选向上/向下/双向。🔊 先听根音找位置，弹对自动判分并播下一题，弹错显示差几个半音。练即兴/移调/和声的核心手上功夫，需连琴弹，成绩入仪表盘。和"听音训练"（听两音辨音程）相反——这里练<b>知道音程名就在键盘上秒构建</b> |
| 🎶 调式识别 | ✅ | 🔊 听一段<b>调式音阶</b>（7 个教会调式 Ionian/Dorian/Phrygian/Lydian/Mixolydian/Aeolian/Locrian 之一），从多个选项中<b>辨认是哪个调式</b>。可自选调式范围与选项数量（3/4/7 选 1）。答完显示调式特征提示（如利底亚=升四度、混合利底亚=降七度、弗里几亚=降二度），可🔊再听。无需连琴（纯听辨多选），成绩入仪表盘。补足"音阶训练"（练手）和"听音训练"（辨音程）之外的<b>调式色彩听辨</b>能力 |
| 🎵 唱名听辨 | ✅ | 视唱练耳的<b>地基</b>：先🔊听一个<b>主和弦</b>建立调性，再听一个音，判断它是音阶里的<b>第几级</b>（唱名 Do Re Mi Fa Sol La Ti / 1-7）。支持大调/小调（小调用 Me/Le/Te 唱名）、自选音级范围与选项数量（3/4/7 选 1），可分别🔊再听主和弦或目标音。答完显示该音级的功能名与诀窍（如 Ti→Do、Fa→Mi）。无需连琴（纯听辨多选），成绩入仪表盘。和"音程听辨"（听两音距离、不依赖调性）不同——这里练<b>调性感/相对音高</b>，是即兴扒谱视唱的核心 |
| 🎹 和弦性质听辨 | ✅ | 🔊 听一个<b>和弦</b>，辨认它的<b>性质/类型</b>：大三/小三/增三/减三（三和弦）或属七/大七/小七/半减七/减七（七和弦）。可自选和弦范围、播放方式（仅整块/仅琶音/整块+琶音）与选项数量（3/4/9 选 1）。答完显示该和弦的色彩诀窍（如增三悬浮对称、减七极度紧张）。无需连琴（纯听辨多选），成绩入仪表盘。和"和弦转位"（练同一和弦的不同排列）、"和弦练习"（弹出和弦名）都不同——这里练<b>和弦色彩/类型听觉</b>，是和声听辨的地基 |
| 🎶 和声进行听辨 | ✅ | 🔊 听一段<b>大调和弦进行</b>，逐个辨认每个和弦的<b>罗马数字级数</b>（I/ii/iii/IV/V/vi/vii°）。第 1 个和弦固定 I 作锚点，之后辨每个和弦的功能/走向。可自选进行范围（流行/doo-wop/卡农/ii-V-I/变格/正格/忧伤/摇滚 8 种）与选项数量（3/4/7 选 1）。答完显示该级功能诀窍（如 V 强烈想回 I、vii° 极不稳定）。无需连琴（纯听辨多选），成绩入仪表盘。和"和弦进行"（看级数弹出和弦）不同——这里练<b>和声功能/进行走向听觉</b>，是扒和弦/即兴/编配的核心 |
| 🔚 终止式辨认 | ✅ | 🔊 听一个<b>两个和弦</b>的<b>终止式</b>（乐句的和声落点），辨认它属于哪一类：<b>正格 V→I</b>（最有结束感像句号）、<b>变格 IV→I</b>（柔和庄重的"阿门"）、<b>半终止 ?→V</b>（停在属和弦上悬而未决像逗号）、<b>阻碍 V→vi</b>（本想回主却走到 vi 制造意外）。可自选终止式范围与选项数量（2/3/4 选 1），答完显示功能诀窍并把<b>两个和弦画在 88 键上</b>（第①个蓝/第②个金、标罗马数字）。无需连琴（纯听辨多选），成绩入仪表盘。是听辨乐句结构、即兴收束、扒歌分段的核心能力 |
| 🔤 键盘音名认知 | ✅ | 最基础的<b>认键基本功</b>：把<b>音名</b>（C4=中央 C、F#3…）和 88 键上的<b>实际键位</b>对应起来——看懂任何练习答案的前提。两种练法：<b>看音名找键</b>（屏幕给音名 → 在键盘上点对应的键，答完绿色标出正确键、点错红色标出）、<b>看键认音名</b>（键盘点亮一个键 → 从 4 个选项里选出它叫什么）。可选音域（中音区 C3–C5 / 宽 C2–C6 / 全 88 键）、<b>只白键</b>（新手友好）、音名<b>带不带八度数字</b>（带八度时只认同一个键、不带时任意八度同名键都算对）。无需连琴，成绩入仪表盘 |
| 🎼 五线谱识谱卡 | ✅ | 看懂五线谱的<b>第一步</b>：屏幕在五线谱上画一个音符 → 你<b>说出它的音名</b>（"看谱→音名→键位"读谱链的中间环，和"键盘音名认知"配合从此读谱不靠数线）。两种练法：<b>看谱选音名</b>（从 4 选项选）、<b>看谱点键</b>（在 88 键上点出它）。答完显示<b>记忆口诀</b>（高音谱号线 EGBDF·间 FACE / 低音谱号线 GBDFA·间 ACEG）并把音画在键盘上。可选谱号（高音 𝄞 / 低音 𝄢 / 大谱表随机）、音名带不带八度。和"视奏闪卡"（必须真弹）不同——这里纯认读，零基础也能上手。无需连琴，成绩入仪表盘 |
| 🎼 乐句视奏 | ✅ | 从识谱迈向<b>流畅演奏</b>的关键一步：屏幕给一句<b>标准五线谱</b>记谱的短旋律（带<b>节奏</b>符头/符干/符尾旗/附点 + <b>调号</b>升降号 + 4/4 拍号 + 小节线），你<b>照着谱、按自己的节奏从左到右逐音弹出来</b>。弹对的音<b>变绿</b>、当前该弹的音<b>金色高亮</b>并自动滚动居中，弹错<b>闪红不前进</b>并提示该弹音名——整句一遍弹对才计满分、累计连击。和"视奏闪卡"（只一个音）、"识谱卡"（只说音名）、"旋律听写"（靠耳朵）、"曲谱跟弹"（音符下落+计时）都不同：<b>这里脱离听觉与下落提示，纯靠读谱</b>。可选调（升降号 ≤2 的 8 个调）、乐句长度（1–3 小节）、节奏难度（入门四分/二分 → 进阶加八分 → 挑战加附点）、是否忽略八度。卡住可 👂 <b>试听</b>一遍或 🏳 <b>看答案</b>（把整句按序号画在键盘上）。没接 MIDI 也能点屏幕琴键作答，成绩入仪表盘 |
| 🎹 和弦视奏 | ✅ | 真实钢琴谱里大量的音是<b>竖向叠在一起的和弦</b>——看懂一摞叠置三度音符、一眼认出该<b>同时按哪几个键</b>，是从单音识谱走向弹真正乐曲的核心技能。屏幕在五线谱上画一个<b>叠置和弦</b>（三和弦/七和弦，可带<b>转位</b>、带<b>调号</b>，相邻二度音符自动错位、共用符干），你在键盘上<b>把整组音同时按下</b>即过关：按对的键/符头<b>变绿</b>、按错<b>闪红</b>并提示松开，集齐即判分并报出<b>和弦名</b>（如「C 大三和弦」「A 小三和弦」），转位模式还会校验<b>最低音</b>是否弹对。和"和弦练习"（给<b>和弦名</b>让你弹，不读谱）、"和弦性质听辨"（靠<b>耳朵</b>，谱面不显示）、"五线谱识谱卡/视奏闪卡"（只<b>单音</b>）、"乐句视奏"（<b>横向单音旋律</b>）都不同——<b>这里读纵向叠置和弦、整组同时按</b>。可选调（8 个）、和弦类型（三/七/混合）、是否含转位、是否忽略八度。没接 MIDI 时可<b>逐键点选</b>（再点取消），集齐自动判定，卡住可 🏳 看答案。成绩入仪表盘 |
| 🥁 节奏视奏 | ✅ | 视奏的另一半是<b>节奏</b>——光会认音名/音高还不够，得能<b>看着节奏谱按准拍子</b>。屏幕画一行<b>单声部节奏谱</b>（随机生成各小节时值组合：四分/八分/十六分/二分/附点 + 休止符 + 符梁/符干/附点，每小节恰好填满拍号），点「预备—开始」后<b>节拍器先给一小节预备拍</b>，然后你跟着谱子<b>按任意键或点大 TAP 按钮击打</b>，光标随拍走。判分给出<b>完美/良好/漏击/多击</b>计数 + <b>抢拍/拖拍倾向</b> + 复用「曲谱跟弹」的<b>落点时间对比图</b>（中线为准点、绿带±完美、青带±良好、点在上=抢拍、下=拖拍）。和"乐句/和弦视奏"（读音高）、"曲谱跟弹"（音符下落自带计时提示）都不同——<b>这里只读节奏、纯靠内心拍感击打</b>。可选拍号（4/4·3/4）、小节数（1/2/4）、难度、BPM。无需 MIDI，点屏幕 TAP 键即可，成绩入仪表盘 |
| 🪗 伴奏音型 | ✅ | 会按和弦 ≠ 会伴奏——真实弹琴时左手不是干巴巴按柱式，而是用各种<b>伴奏型</b>把同一串和弦弹出律动。本模块把所选调上的<b>和弦进行</b>（复用"和弦进行练习"的万能流行/卡农/ii–V–I/12 小节布鲁斯等级数库）用<b>五种伴奏型</b>展开成一串"该弹的音"步骤：<b>柱式和弦</b>（整三和弦齐按）、<b>阿尔贝蒂低音</b>（低-高-中-高分解，C：C-G-E-G，莫扎特奏鸣曲经典）、<b>华尔兹</b>（蓬-恰-恰：低音+两下和弦，3/4）、<b>分解琶音</b>（根-三-五-八上行）、<b>行进低音</b>（根-五-六-五布吉低音，布鲁斯/摇滚）。屏幕上方<b>和弦进行卡片</b>标当前和弦，中间<b>伴奏型步骤条</b>逐拍显示该弹的角色（低/高/中/根/三/五/八/六）与音名，88 键上把<b>当前该弹的音</b>带角色标签高亮，你<b>照位置按顺序弹出</b>即逐步推进（步进式判分，不靠下落计时），连续弹对累计 <b>Combo</b>，走完整条按正确率给 ★ 评星。和"和弦进行练习"（只按出和弦本身、不讲伴奏型）、"曲谱跟弹"（跟现成曲子）都不同——<b>这里专练把和弦变成伴奏的左手织体</b>。没连琴可点 🔊 <b>试听整条</b>（按 BPM 播放音型+视觉走光）或 🎹 <b>替我弹当前</b>逐步演示。可选调（8 个）、进行（7 条）、伴奏型（5 种）、速度（60/90/120）、忽略八度/要弹准八度，成绩入仪表盘 |
| 🌈 和弦色彩板 | ✅ | 入门<b>声光 + 和声</b>启蒙：在琴上弹下任意和弦（≥3 键，或点快捷和弦/直接点琴键搭），屏幕舞台与 88 键立刻<b>染上对应的颜色光</b>，并报出<b>名字 / 性格情绪 / 在调里的功能</b>。配色按和声品质区分——<b>大三暖橙☀️、小三冷蓝🌙、属七亮黄"想回家"🏃、减和弦警示红"紧张"😣、增三梦幻紫🌀、大七爵士暖🍷</b>等；属七/减/增/半减/减七等张力和弦会<b>闪烁</b>提醒。设了<b>调</b>（C/G/D/F/A 大调、a/e/d 小调）后还会算出它的<b>罗马级数</b>（I·ii·V7·vii°…）与<b>功能名</b>（主/下属/属），弹到"属"功能时同时把<b>主和弦（家🏠）</b>淡淡标在键上，提示你可以"解决回家"。另含 <b>🎯 认色挑战</b>：给出品质名（大三/小七/属七…）让你弹出对应和弦，8 关计分入仪表盘。复用 chord-detect 识别，把抽象和声变成看得见的光、听得懂的情绪 |
| 🏆 成就仪表盘 | ✅ | 汇总视奏/听辨/力度/音阶/节奏/旋律/和弦进行/节拍稳定度/双手协调/琶音跑动/连奏断奏/踏板时机/颤音速度/装饰音/音程大跳/旋律突出/力度渐变/速度渐变/复节奏/颗粒性/手指独立性/音阶八度跨度/节奏听写/移调视奏/和弦转位听辨/调号识别/音阶指法提示/音程构建/调式识别/唱名听辨/和弦性质听辨/和声进行听辨/曲谱跟弹/终止式辨认/键盘音名认知/五线谱识谱卡/乐句视奏/和弦视奏/节奏视奏/伴奏音型/和弦色彩板各训练成绩，统计总练习次数/正确率/连续天数/最佳连击，最近 7 天柱状图、模块细分表、10 枚成就徽章墙（已解锁/即将解锁/锁定） || 📡 MIDI 监视器 | ✅ | 实时显示钢琴发来的音符/CC/SysEx |

> 后续玩法（自动伴奏/灯光同步）作为新模块加入 `app.js` + 侧栏，不另起 app。

### 已知协议坑点

#### 🥁 节奏（鼓点）模块

CA99 的节拍器内部有两个子模式，**必须按顺序发三条 SysEx**，单独发 `RhythmSelect` 无效：

| 步骤 | SysEx | 说明 |
|---|---|---|
| 1 | `MetronomeMode = Rhythm` (`fn=0x10 v1=0x56 v2=0x0A v4=0x01`) | 切到鼓点模式（默认是普通节拍） |
| 2 | `RhythmSelect = [index]` (`fn=0x10 v1=0x56 v2=0x09 v4=[0-99]`) | 选节奏型 |
| 3 | `MetronomeRun = Start` (`fn=0x10 v1=0x56 v2=0x08 v4=0x01`) | 启动 |

切换节奏时需要先 **Stop → Mode → Select → Start**，热切（播放中直接换）无效。
`ca99.js` 已提供 `buildMetronomeMode(mode)` 和 `buildMetronomeRun(running)` 函数。

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
- 五度圈用 `circle-of-fifths.js`（纯逻辑，21 单元测试）：`WHEEL` 12 格（顺时针每格升五度、关系大小调主音差小三度，6 点钟含 F#/Gb 等音）；`majorScaleSpelling(key)` 用字母序列+半音差算出<b>正确拼写</b>的 7 音音阶（保证 7 个字母不重复，如 G→F#、Db→全降、含必要重升降）；`diatonicChords(key)` 给出顺阶七级三和弦（罗马数字+质量 maj/min/dim+和弦名）；`chordMidi(key,degree,baseC)`/`scaleMidi(key,baseC)` 算 MIDI 供试听；`neighbors(key)` 取顺/逆时针相邻调与关系小调；`signatureLabel` 生成调号文字。UI 用 SVG 环形扇区手绘圆盘（`pt(r,deg)`+`sector(rIn,rOut,a0,a1)` 算annular sector path，0°在 12 点钟顺时针），外环大调/内环小调可点击选调、中心 hub 显示当前调+调号；右侧信息卡列调号/关系小调/音阶/相邻调+7 个配色和弦按钮；点和弦/「播放音阶」/「I–IV–V–I 终止式」用 Web Audio 发声并在 88 键上高亮（主音金色）。纯探索工具不计分
- 视奏闪卡用 `sight-reading.js`（纯逻辑，62 单元测试）：`staffPosition`/`needsLedger`/`randomNote` 把 MIDI 音符映射到五线谱位置（高/低音谱号、自动加线），`SightReadingGame` 随机出题并校验（可忽略八度），记录得分/连击/最佳/正确率，UI 用 SVG 实时绘制谱表+符头，note-on 驱动判分与翻题
- 曲谱跟弹用 `score-follow.js`（纯逻辑，33 单元测试）+ `midi-file.js`（SMF 解析，13 单元测试）：曲谱有两种记谱——内置 7 首公有领域旋律用顺序记谱 `[midi,durBeats]`（`null`=休止，可带 `meter` 拍号供节拍器重拍），上传的 MIDI 经 `parseMidi()` 解析为<b>绝对时间记谱</b> `notes:[{midi,ms,durMs,beat,dur,hand}]`（支持和弦/双手/变速），`songFromMidi()` 转成 ScoreFollow 曲目。`ScoreFollow._build` 兼容两种记谱并用 `timeScale`（默认 1，速度倍率走 `1/speed`）统一缩放时间轴；播放头时间 `t`（毫秒）驱动 `judge(midi,t)`（找最近、音高匹配、在 good 窗内的未判音符，按 `|t−目标ms|` 分 PERFECT≤130ms/GOOD≤320ms，连对累计 Combo+加分）、`expire(t)`（过窗未弹自动判 MISS 并断连击）、`active(t)`/`upcoming(t,ahead)`（取该弹/即将落下的音符），`groups(tol)`（同起音时刻音符归一组，供等待模式逐组推进+和弦显示）、`beatAt(t)`（按 (ms,beat) 线性插值算五线谱光标拍位，兼容变速 MIDI，也用于节拍器整拍触发）、`accuracy`/`stars`（90/70/50% → ★★★/★★/★）。`handFilter`（'both'|'r'|'l'）让 judge/expire/active/total/range 只算该手，实现<b>分手练习</b>。UI 用 `requestAnimationFrame`：上方 SVG 五线谱整曲横向铺开 + 光标随拍前进并自动滚动居中、音符按手别染色（右手蓝/左手紫）/按判定结果染色、非练习手淡显；中间 Synthesia 式下落高速路（用 `piano-keyboard.js` 的 `buildLayout` 取每键 x 中心，音符块按 `(目标ms−t)` 下落到判定线、对齐下方 88 键，<b>块上叠音名标签</b>可关）；落到判定线时高亮该弹的键、弹对/漏弹弹出 PERFECT/GOOD/MISS×Combo 飘字。<b>三档训练</b>：🔊 听示范（自动播放不判分）/ 🐢 等待练习（播放头停在当前组、`waitOnNote` 验证弹齐整组才 `frozen=false` 推进、不计时、💡 提示让该组键闪 3 秒并发声）/ 🎯 跟弹判分（judge 计分）。辅助：🥁 节拍器（`tickMetro` 按 `beatAt(t)` 整拍触发 `clickSound`、`meter` 重拍加重音、`scf-bpm` 徽章显示 `bpm×speed`）、🐇 渐进提速（finish 时正确率 ≥80% 把 `speed` +0.05 上限 1.5× 并 `prepare()` 重建）、🔁 区间循环（按 `meter` 把小节换算成拍区间 `[loopStartBeat,loopEndBeat)`→毫秒，start 时把窗外音符标 `judged+null`（不画/不判/不漏）、wait 模式按窗口过滤 `groups`；frame 到段尾 `resetWindow()` 重置窗内 judged 并把 `t0`/`waitClock` 跳回段首，循环不自动 finish，停止时补记成绩；五线谱画半透明 `scf-loop-region` 标出循环区）。完成后 `timings()` 按起音顺序导出每个音的判定结果与误差（负=抢拍/正=拖拍），`drawTimingChart()` 用内联 SVG 画 ⏱️ <b>落点时间对比图</b>：准点线居中、±perfectMs 绿带/±goodMs 青带，命中点按 `deltaMs/goodMs` 映射到上（抢）下（拖）、MISS 画灰叉，附 `early/late/onTime/avgAbs/maxAbs` 统计与偏抢/偏拖/均衡总评。上传 MIDI 经 `<input type=file>` → `FileReader.readAsArrayBuffer` → `parseMidi` → `songFromMidi` 加入选曲。结束写入成就仪表盘
- 音程听辨用 `ear-training.js`（纯逻辑，49 单元测试）：`INTERVALS` 表（0..12 半音）+ `EarTrainingGame` 随机出根音+音程（方向 up/down/harmonic/mixed，可选音程集合，自动保证音符落在合法 MIDI 范围），`check` 校验并记录得分/连击/最佳/正确率，UI 用 Web Audio 三角波发声播放，点按钮作答（无需连钢琴）
- 力度练习用 `dynamics-trainer.js`（纯逻辑，52 单元测试）：`DYNAMICS` 把 velocity 1..127 无缝划成 6 档（pp/p/mp/mf/f/ff），`velocityToIndex` 定位档位，`DynamicsGame` 出目标力度并按 note-on velocity 校验（容差可调，相邻档可算对），记录得分/连击/最佳/正确率，UI 用刻度色带+指针实时显示你弹的力度落点
- 移调器用 `transposer.js`（纯逻辑，74 单元测试）：`encodeTransposeByte` 把半音 -12..12 编码成 CA99 TransposeValue 字节（0x40+半音，实测 -12→0x34/+12→0x4C），`Transposer` 跟踪移调量、`targetKeyName` 算听感调、`transposeNote` 软件移调音符；UI 用滑块/±按钮/预设切换，`CA99.buildTranspose` 发 SysEx 让钢琴自身发声也移调
- 成就仪表盘用 `practice-stats.js`（纯逻辑，51 单元测试）：`PracticeStats` 注入存储+时钟（便于确定性测试），`record` 把每次练习成绩累加进 localStorage，算总练习/正确率/连续天数（`dayStreak` 含昨日宽限）/最佳连击，`allAchievements` 判定 10 枚徽章解锁状态；各训练模块（视奏/听辨/力度停止时、音阶完成时）调 `recordPractice()` 写入，仪表盘聚合展示柱状图/细分表/徽章墙
- 节奏跟拍用 `rhythm-trainer.js`（纯逻辑，119 单元测试）：`beatsToOnsets` 把拍点位置按 BPM 换算成毫秒落点，`RhythmTrainer.tap(time)` 把每次敲击匹配到最近未命中落点并按时间误差 `rateError` 判完美(±55ms)/良好(±120ms)/多敲，`finish` 统计漏拍与平均误差；UI 有预备拍节拍器引导、播放头动画、落点高亮，note-on 或空格键触发敲击，完成后写入成就仪表盘
- 旋律听写用 `melody-dictation.js`（纯逻辑，486 单元测试）：`degreeToMidi` 把音阶级数（含跨八度/下行）映射成 MIDI，`MelodyDictation.next()` 在所选调音阶内生成首音为主音的随机短旋律，`play(note)` 逐音校验复奏（`samePitchClass` 支持忽略八度），整条全对才计分、有错完成不计分、可 `giveUp` 看答案；UI 用 Web Audio 三角波播放旋律、屏幕琴键、note-on 复奏，完成后写入成就仪表盘
- 和弦进行练习用 `chord-progression.js`（纯逻辑，120 单元测试）：`chordForDegree` 按调的音阶+各级品质把罗马数字级数（I/ii/.../vii°）展开成具体和弦，`expandProgression` 把整条进行换调展开，`ChordProgression.check(notes)` 复用 `chord-detect.js` 的 `detectChord` 比对根音+类型（忽略转位）判推进，整条走完计圈、可循环、`miss` 记错并清连击；UI 用 Web Audio 试听整条、罗马数字+和弦名 chip 高亮当前目标、"替我弹"演示推进，完成后写入成就仪表盘
- 节拍稳定度分析用 `beat-stability.js`（纯逻辑，58 单元测试）：`BeatStability.tap(t)` 采集击键时间戳，`iois` 算相邻间隔，`bpm` 取间隔中位数抗离群估速，`cv`（标准差/均值）量化波动，`stabilityScore` 把 CV 线性映射成 0–100 分，`trend` 用间隔的线性回归斜率判赶拍/拖拍/稳定，跟拍模式 `targetEval` 算对照目标 BPM 的平均绝对误差与准度；UI 实时条形图（按偏差染色）、节拍器试听、note-on 或空格键采集，完成后写入成就仪表盘
- 双手协调练习用 `hands-sync.js`（纯逻辑，58 单元测试）：`handOf(note, split)` 按音高分左右手，`clusterByTime` 把相邻击键聚成一拍，`evalBeat` 判断该拍是否双手到齐并算落键时间差 spread，`spreadScore` 把 spread 线性映射成协调度；`HandsSync.feed(note,t)` 累计当前拍、超过窗口自动结算上一拍，统计 `goodBeats/streak/best/avgScore/bothHandsRate`；UI 圆形仪表 + 逐拍色点，note-on 喂入或左右手按钮模拟，完成后写入成就仪表盘
- 琶音跑动测试用 `arpeggio-runs.js`（纯逻辑，90 单元测试）：`buildArpeggio(root,quality,octaves,direction)` 由根音+和弦性质（`CHORD_INTERVALS`）+八度+方向生成目标 MIDI 音序，`ArpeggioRuns.feed(note,t)` 按序校验（hit/miss/done），记录正确音之间的 IOI；`speedNps` 算每秒音数、`evennessScore` 把 IOI 变异系数线性映射成均匀度，综合分=均匀 60%+速度达标 40%−错误扣分；UI 目标音序高亮推进 + 进度条，note-on 喂入或点音序模拟，完成后写入成就仪表盘
- 连奏/断奏控制用 `articulation.js`（纯逻辑，60 单元测试）：`legatoRatio(duration,ioi)=按住时长÷到下一音起音间隔`，比值≈1 为连奏、<0.4 为断奏；`ArticulationTrainer.noteOn/noteOff(note,t)` 同时吃按键与松键事件，每个音在「时值已知 + 下一音已起」时结算，按目标 `legatoScore`/`staccatoScore` 线性打分；这是首个用到 note-off 时间的模块，UI 逐音色块分数墙 + 连奏/断奏模拟按钮，完成后写入成就仪表盘
- 踏板配合时机用 `pedal-timing.js`（纯逻辑，70 单元测试）：切分踏板法 = 弹新音→抬延音踏板→重新踩下接住新音；`PedalTiming.noteOn(note,t)` 记新音、`pedal(isDown,t)`/`feedCC(value,t)` 吃 CC64，检测"抬起后重新踩下"的瞬间与新音的间隔 gap=tRepress−tNote，`pedalScore`/`classifyPedal` 判干净（音后 40–220ms）/脏（踩太早）/干（踩太晚）；这是首个用到延音踏板 CC64 时机的模块，UI 踏板状态动画 + 净/脏/干色点 + 三档难度窗口，完成后写入成就仪表盘
- 颤音速度训练用 `trill.js`（纯逻辑，77 单元测试）：颤音 = 两个相邻目标音（lower/upper）之间快速来回交替；`TrillTrainer.feed(note,t)` 吃每次敲击，`trillHz(iois)`=1000/均值/2（每秒交替次数），`evennessScore` 用相邻击键间隔(IOI)的变异系数CV判均匀度；弹非目标音=wrongNote、连续同一目标音=repeat（没交替），综合分=均匀50%+速度达标50%−错音×6−没交替×4；UI 双键速度计可视化 + 下方音/音程/敲击数/目标速度选择 + 双键模拟，完成后写入成就仪表盘
- 装饰音训练用 `ornament.js`（纯逻辑，88 单元测试）：`buildOrnament({type,main,direction,interval})` 构造目标音序列——倚音 grace=[辅,主]、波音 mordent=[主,辅,主]、回音 turn=[上辅,主,下辅,主]；`OrnamentTrainer.feed(note,t)` 逐音匹配目标序列，弹错音=wrongNote（不推进序列），全部命中后用相邻音间隔(IOI)的均值算 `crispScore`（越快越干脆，≤crisp给100、≥3×crisp给0）+ `evennessScore` 算均匀度，综合分=干脆50%+均匀50%−错音×8；UI 目标序列逐音点亮 + 类型/主音/方向/音程/干脆度选择 + 一键模拟弹奏，完成后写入成就仪表盘
- 音程大跳准确度用 `leap.js`（纯逻辑，70 单元测试）：`buildLeaps({low,high,count,minLeap,rand})` 生成相邻间隔≥minLeap 的目标音序列（rand 可注入便于测试）；`LeapTrainer.feed(note,t)` 逐音匹配，弹对目标音前若没弹错=firstTry 一次弹准，弹错=miss（不推进、需继续找到目标），准确度 accuracy=一次弹准数÷总数（即综合分），同时记失误数 misses 与平均跳度 span；UI 目标序列点亮（绿）/抖动（红 miss）+ 音域/跳度/个数选择 + 一键模拟弹准，完成后写入成就仪表盘
- 旋律声部突出用 `voicing.js`（纯逻辑，63 单元测试）：`scoreVoicing(chord, {targetVoice,margin})` 评估一个和弦 `[{note,vel}]`——`targetIndex` 找目标声部（top=最高音/bottom=最低音），diff=目标力度−其余音最大力度，diff≥margin 给 100、diff≤0（旋律被埋没）给 0、线性；`VoicingTrainer.feed(note,vel,t)` 把窗口内的音聚成和弦、`flush()` 结算，跑满 rounds 个和弦后汇总平均分与达标数（≥80）；UI 和弦力度色块 + 每和弦评分点 + 旋律突出/埋没两种模拟，完成后写入成就仪表盘
- 力度渐变曲线用 `crescendo.js`（纯逻辑，70 单元测试）：`idealRamp(start,end,count)` 生成首尾间线性力度斜坡（画理想参考线）；`rampScore(velocities,{direction,minSpan,smoothTol})` 给一串力度打分——方向正确度 monotonic=相邻力度差符号与期望（渐强+1/渐弱−1）一致的比例（权重 0.5）、平滑度 smoothness=与首尾线性斜坡的平均绝对偏差映射（0.3）、跨度 spanScore=首尾力度差÷minSpan 封顶（0.2）；`CrescendoTrainer.feed(velocity)` 累积 count 个力度后自动 `_finish()` 结算并回调 onComplete，记 best/rounds，reset 清当前曲线保留统计；UI 用 SVG 实时画力度折线（绿/红点标每步方向对错、虚线为理想斜坡）+ 方向/音数/跨度选择 + 平滑/忽强忽弱两种模拟，完成后写入成就仪表盘
- 速度渐变用 `tempo-ramp.js`（纯逻辑，72 单元测试）：`toIois(times)` 把击键时间戳转相邻间隔、`ioiToBpm(ioi)=60000/ioi`；`tempoScore(times,{direction,minRatio,smoothTol})` 给一串时间戳打分——方向正确度 monotonic=相邻 IOI 差符号与期望（渐快 accel 间隔变小=−1 / 渐慢 rit 间隔变大=+1）一致的比例（权重 0.5）、平滑度 smoothness=IOI 与首尾线性斜坡的平均"相对"偏差映射（除以均值抗速度量级，0.3）、变速幅度 spanScore=首尾速度变化量÷minRatio 封顶（0.2）；`TempoRampTrainer.feed(time)` 累积 count 次击键后自动结算，记 best/rounds；UI 用 SVG 实时画 BPM 折线（绿/红点标每步方向对错、虚线为理想斜坡）+ 方向/敲击数/变速幅度选择 + 空格键敲击 + 平滑/忽快忽慢两种模拟，完成后写入成就仪表盘。与"节拍稳定度"（追求匀速）互补
- 复节奏用 `polyrhythm.js`（纯逻辑，66 单元测试）：`buildVoiceOnsets(taps,period,cycles,start)` 为一个声部生成理想落点时间戳、`combinedGrid(a,b,period)` 把 a:b 两声部在一周期内的落点合并成排序网格（教学/可视化用）；`PolyrhythmTrainer` 持两个 `VoiceState`（A/B），`tap(voice,time)` 只在该声部内把敲击匹配到最近未命中落点（声部隔离——左手敲击不消耗右手落点），按 `rateError` 判 完美(≤55ms)/良好(≤120ms)/多敲；`summary()` 综合分=命中率 70%+时间精度 30%（时间精度=1−平均误差÷good 窗口）；UI 双横向轨道按比例铺落点、播放头随预览+正式段推进、命中点实时高亮，连琴按中央 C 分左右手（note<60→A）、无琴用按钮或键盘 F/J，先听一遍预览再跟敲，模拟一遍写入成就仪表盘。与"节奏跟拍"（单声部）互补
- 颗粒性用 `evenness.js`（纯逻辑，57 单元测试）：核心是变异系数 `cv(arr)=stddev/mean`（越小越均匀）；`evennessScore(events,{velTol,ioiTol,velWeight})` 取一串音的力度数组与相邻间隔 IOI 数组各算 CV，再 `cvToScore(cv,tol)=clamp(1−cv/tol)` 线性映射成力度均匀分/时值均匀分（默认 tol=0.22 即 22% 离散为 0 分），综合分=力度分×velWeight+时值分×(1−velWeight)；同时给出每个音相对均值的"相对偏差"数组（velDev/ioiDev）供 UI 柱状着色（绿=齐、橙=偏）。`EvennessTrainer.feed(note,vel,time)` 累积 count 个音后自动结算，记 best/rounds；UI 双排柱（力度高度∝velocity、间隔高度∝IOI）实时生成、力度权重可调，连琴喂真实力度+时间、按钮/空格只喂固定力度（只练时值），模拟一遍写入成就仪表盘。与"力度控制"（打目标档）、"节拍稳定度"（跟匀速拍）互补——这里只看"一串音内部是否一致"，与绝对速度无关
- 手指独立性用 `finger-independence.js`（纯逻辑，44 单元测试）：`evaluateIndependence(events,{held,pattern})` 在 note-on/off 事件流上重放并维护"当前按下键集合"，每遇到一个移动音（非 held 的 on）就快照 `held.every(h=>down.has(h))` 记入 `heldDownAtTap`，独立保持率=全按住的敲击数÷移动敲击数；音型正确率=移动音逐位与 pattern（循环展开）相符的比例；综合分=独立保持×0.6+音型×0.4；另统计 `slips`（held 音在最后一个移动音之前被松开的次数，收尾正常松开不计——靠预扫描的 `lastMovingTime` 区分）。`FingerIndependenceTrainer.noteOn/noteOff(note,time)` 累积到 `targetTaps=pattern.length*reps` 个移动敲击后自动结算，记 best/rounds；UI 5 套预设（按 C+E 动 G 等）、按住键/移动键实时高亮，连琴检测按住与松开、模拟一遍演示评分（含偶发滑脱），成绩入仪表盘。与"双手协调""琶音跑动"互补——这里专练"按住的不动、该动的动"
- 音阶八度跨度用 `scale-span.js`（纯逻辑，62 单元测试，复用 evenness 的 `cv`/`toIois`、scale-trainer 的 `SCALE_TYPES`/`rootPitchClass`）：`buildSpan(root,type,octave,octaves,direction)` 生成跨 N 个八度的音阶 MIDI 序列（上行/上下行不重复顶点），`crossingIndices(seq,rootPc)` 找出每次跨入新八度根音的下标（穿指点）；`evaluateSpan(events,{expected,crossings})` 三段打分——音符正确率（逐位对，0.5）+速度均匀度（整串 IOI 的 `cv` 经 `1−cv/evenTol` 映射，0.3）+穿指衔接（穿指点进入音的 IOI 是否 > 中位 IOI×hitchRatio=卡顿，按未卡顿比例，0.2）。`ScaleSpanTrainer.feed(note,time)` 累积到 total 个音自动结算，记 best/rounds；UI 琴键条按八度铺开、穿指点橙边、跟弹实时高亮命中/错音，连琴依次弹、模拟一遍（含偶发穿指卡顿与错音）演示评分，成绩入仪表盘。与"音阶练习"（只判音准/进度）互补——这里多看"跨八度的连贯与均匀"
- 节奏听写用 `rhythm-dictation.js`（纯逻辑，60 单元测试）：`generatePattern(rng,level)` 按难度生成一串时值（以八分音符为 1 单位，3 档可用 0.5~4 单位），`iois` 取时值序列去掉末位即相邻间隔；`patternToOnsets(durations,bpm,start)` 供 UI 用 Web Audio 播放。核心 `evaluateDictation(targetIois,userIois,{tol})` <b>与速度无关</b>：先把用户总时长缩放对齐到目标总时长（`scale=sum(target)/sum(user)`）去掉速度因素，再逐间隔算相对误差 `relErr=|scaledUser−target|/target`、`1−relErr/tol` 映射成 0~1 分取均值得节奏准确度；个数匹配用 Dice 系数 `2k/(n+m)`（多敲/少敲都打折），综合分=节奏准确度×个数匹配度×100。`RhythmDictationTrainer.feed(note,time)` 只看时间不看音高，采满 `expectedTaps`（=音符个数）自动结算、也可少敲后手动 `finish()`，记 best/rounds；UI 听完点亮圆点、对比条画"目标 vs 你的"长短，连琴敲、模拟一遍演示评分，成绩入仪表盘。与"节奏跟拍"（看谱跟节拍器判绝对落点）互补——这里凭听、判相对长短
- 移调视奏用 `sight-transpose.js`（纯逻辑，55 单元测试）：旋律用相对主音的半音偏移表示（与调无关），`transpose(offsets,rootMidi)` 移到某主音，`intervals(seq)` 取相邻音程。`evaluateTranspose(played,expected,{octaveFlexible})` 把用户弹的音和"移到目标调的期望序列"逐音比——音级正确率（默认忽略八度，用 pitch class 比）×100 即综合分，多弹按 `min(0.3, extra×0.1)` 轻度扣分；另算<b>形状正确率</b>（相邻音程序列匹配比例）与<b>起音是否对</b>，当形状≥0.8 但音级<0.6 且起音错时置 `wrongKey` 提示"旋律对了但调没移对"。`SightTransposeTrainer.feed(note)` 采满 `total`（=音符数）自动结算、也可少弹手动 `finish()`，记 best/rounds；UI 展示原调音名片段+目标调、可🔊听原调（Web Audio 三角波音序）、👁看答案、弹奏实时填色（对绿错红）、模拟一遍演示评分，成绩入仪表盘。和"移调器"（整体升降键盘）、"视奏闪卡"（照谱原样弹）、"旋律听写"（凭听复奏原音高）都不同——这里练"看谱即时移调"
- 和弦转位听辨用 `chord-inversion.js`（纯逻辑，47 单元测试）：`QUALITIES`=大三[0,4,7]/小三[0,3,7]，`INVERSIONS`=原位/第一转位/第二转位。`buildInversion(rootMidi,intervals,inv)` 把最低 `inv` 个音各升一个八度再升序排列，得到三种排布；`stackIntervals(notes)` 取相邻半音间隔。判别"信号"：原位=两个三度叠（无纯四度）；第一转位=纯四度在<b>最上方</b>；第二转位=纯四度在<b>最下方</b>。`ChordInversionGame` 沿用耳训 API：`next()` 返回和弦音、`check(answerInv)` 判分、`score/streak/best/attempts/accuracy/reset()`、`onNew`/`onResult` 回调；根音范围钳制使最高音≤127。UI 仿耳训多选题——🔊播放和弦（可琶音/柱式，Web Audio 三角波）、三个转位按钮答题、答完揭晓音名（最低音高亮 `.inv-bass` 低音）、统计入仪表盘。和"和弦构建"（按名弹、忽略转位）、"和弦进行"、"和弦识别"都不同——这里专练转位的<b>听觉辨识</b>
- 调号识别用 `key-signature.js`（纯逻辑，402 单元测试）：基于五度圈，`SHARP_ORDER`=F C G D A E B、`FLAT_ORDER`=B E A D G C F；`accidentalList(count,type)` 按书写顺序生成升降记号、`keyForSignature(count,type,mode)` 反查调名（大调升号表 C G D A E B F# C#、降号表 C F Bb Eb Ab Db Gb Cb；小调为各自关系调）、`signatureFor(key,mode)` 正向查调号并与前者互为逆运算（测试做了全表 round-trip）。`hintFor()` 生成识别诀窍文字（升号调=最后升号上方半音、降号调=倒数第二个降号、1 降号固定 F）。`scaleMidi(key)` 用 `MAJOR_STEPS`/`MINOR_STEPS` 给出一个八度音阶供🔊播放。`KeySignatureGame` 沿用耳训/转位的 API：`next()` 随机出题（可配 `modes`/`maxAccidentals`/`includeNatural`/`choiceCount`，干扰项取五度圈相邻调）、`check(answerKey)` 判分、`score/streak/best/accuracy/reset()`。UI 仿多选题——显示调号 ♯/♭ 记号、四选一、答完高亮正确项+给诀窍提示+播放该调音阶，成绩入仪表盘。和"音阶练习""和弦识别"都不同——专练<b>看调号秒认调名</b>
- **调试钩子**：无真机时控制台调 `window.__feedMidi(note, velocity)` 模拟弹奏、`window.__feedNoteOff(note)` 模拟松键、`window.__feedCC(controller, value)` 模拟踏板/控制器，测试依赖 MIDI 输入的模块

## 连接方式（默认双支持）

`midi-core.js` 用 `navigator.requestMIDIAccess({sysex:true})` 枚举所有端口——**USB 和蓝牙 MIDI 都在列表里**，运行时在顶栏下拉选择，或自动选含 "CA99"/"Kawai" 的端口。无需改代码切换连接方式。

### 蓝牙 MIDI 桥（Windows）

Windows 上 Chrome/Edge 的 Web MIDI 走 WinMM，**看不到蓝牙 (BLE-MIDI)**。`bridge/` 下提供一个 Python-`winsdk` 桥（走 WinRT，能看到蓝牙且自动重组分片 SysEx）。前端**零改动**复用：打开 app 时加 `?bridge=ws://127.0.0.1:8765`（或 `localStorage.setItem('ca99.bridgeUrl', ...)`），`midi-core.js` 自动切到 WebSocket 传输；没配桥时仍走默认 Web MIDI。USB-B 连接最简单、延迟最低、**不需要桥**。详见 `../bridge/README.md`。

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

**一键跑全部 58 套测试**：

```bash
cd app
# Bash / Linux / macOS
for f in js/*.test.mjs; do node "$f"; done

# 或 PowerShell（Windows）
Get-ChildItem js\*.test.mjs | ForEach-Object { node $_.FullName }
```

全绿即每行输出 `xxx: N passed, 0 failed`。单独跑某一套：

> ⚠️ **检查 `app.js` 语法务必用模块模式**：`Get-Content js/app.js -Raw | node --input-type=module --check`。
> 直接 `node --check js/app.js` 按 CommonJS 解析，会漏掉某些只在 ES module（严格模式）下才报的错（例如误删 `function xxx() {` 导致的括号失衡），结果是浏览器加载时整段 `main()` 静默失败、所有模块空白。

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
# 节拍稳定度分析单元测试（58 用例）
node js/beat-stability.test.mjs

# 双手协调练习单元测试（58 用例）
node js/hands-sync.test.mjs

# 琶音跑动测试单元测试（90 用例）
node js/arpeggio-runs.test.mjs

# 连奏/断奏控制单元测试（60 用例）
node js/articulation.test.mjs

# 踏板配合时机单元测试（70 用例）
node js/pedal-timing.test.mjs
node js/trill.test.mjs
node js/ornament.test.mjs
node js/leap.test.mjs
node js/voicing.test.mjs
node js/crescendo.test.mjs
node js/tempo-ramp.test.mjs
node js/polyrhythm.test.mjs
node js/evenness.test.mjs
node js/finger-independence.test.mjs
node js/scale-span.test.mjs
node js/rhythm-dictation.test.mjs
node js/sight-transpose.test.mjs
node js/chord-inversion.test.mjs
node js/key-signature.test.mjs
node js/scale-fingering.test.mjs
node js/interval-build.test.mjs
node js/mode-id.test.mjs
node js/solfege.test.mjs
node js/chord-quality.test.mjs
node js/progression-ear.test.mjs
node js/cadence.test.mjs
node js/note-id.test.mjs
node js/staff-read.test.mjs
node js/sight-phrase.test.mjs
node js/chord-sight.test.mjs
node js/rhythm-sight.test.mjs
node js/accompaniment.test.mjs
node js/chord-color.test.mjs
node js/piano-keyboard.test.mjs
node js/score-follow.test.mjs
node js/midi-file.test.mjs
node js/circle-of-fifths.test.mjs
node js/bridge-protocol.test.mjs
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

