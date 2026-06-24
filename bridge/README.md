# CA99 蓝牙 MIDI 桥（WinRT → WebSocket）

Windows 上 Chrome / Edge 的 **Web MIDI 走 WinMM**，看不到 **蓝牙 MIDI（BLE-MIDI）**
设备。本桥用 **WinRT**（`Windows.Devices.Midi`）枚举/打开 MIDI 端口——WinRT 能看到
蓝牙 MIDI，并且 `MidiInPort` 会**自动把分片的 BLE SysEx 重新拼成完整消息**，因此对
CA99 的 SysEx 协议完整支持。

桥把 WinRT 端口通过一个 **WebSocket** 暴露给浏览器；前端 `midi-core.js` 检测到桥地址
后自动切到 websocket 传输——**整个 app（43 个模块）零改动复用**。

```
浏览器 app (不变)
  └ midi-core.js  ──ws──>  ca99_midi_bridge.py  ──WinRT──>  CA99 (USB / 蓝牙)
       7 方法 API            (Python winsdk)
```

## 何时需要它

| 连接方式 | 推荐 | 说明 |
|---------|------|------|
| **USB-B** | 直接用 Web MIDI，**不需要桥** | class-compliant，Chrome 直接可见，延迟最低 |
| **蓝牙 (BLE-MIDI)** | **需要本桥** | Web MIDI 看不到 BLE；本桥走 WinRT 才能连上 |

## 安装

```powershell
pip install -r requirements-bridge.txt
```

（`winsdk` 仅 Windows；首次安装会编译 wheel，约 3-5 分钟。）

## 运行

```powershell
python ca99_midi_bridge.py                      # 默认 127.0.0.1:8765
python ca99_midi_bridge.py --host 0.0.0.0 --port 8765
```

启动时会打印一次端口清单，便于确认蓝牙设备是否已配对可见：

```
[bridge] CA99 MIDI bridge (WinRT) listening on ws://127.0.0.1:8765
[bridge] inputs=1 outputs=1
[bridge]   IN  CA99
[bridge]   OUT CA99
```

## 让前端用桥

两种方式（任选其一），**app 本身不用改**：

1. URL 加 query：`http://<app>/?bridge=ws://127.0.0.1:8765`
   （`?bridge=1` 等价于默认地址 `ws://127.0.0.1:8765`）
2. 浏览器控制台：`localStorage.setItem('ca99.bridgeUrl','ws://127.0.0.1:8765')` 后刷新

`midi-core.js` 会自动探测；没有桥地址时仍走默认 Web MIDI（USB），**老用户无感**。

## 协议（PROTOCOL_VERSION = 1）

契约与测试都在 `app/js/bridge-protocol.js`（纯函数 + `BridgeClient` 状态机，
`app/js/bridge-protocol.test.mjs` 39 个测试覆盖）。

**Client → Bridge**

```json
{"cmd":"list"}
{"cmd":"selectInput","id":"<deviceId>"}
{"cmd":"selectOutput","id":"<deviceId>"}
{"cmd":"send","bytes":[240,64,...,247]}
```

**Bridge → Client**

```json
{"evt":"hello","version":1,"transport":"winrt"}
{"evt":"ports","inputs":[{"id","name","manufacturer"}],"outputs":[...]}
{"evt":"message","bytes":[...]}
{"evt":"selected","input":"<id|null>","output":"<id|null>"}
{"evt":"error","message":"..."}
```

`send` 的字节会被掩到 0-255；输入消息由 WinRT 自动重组后整条下发。

## 已验证

- `bridge-protocol.test.mjs` — 39 passed
- Python WS 客户端 ↔ 桥：hello / list / ports / selectOutput / send 全通
- 浏览器（**未改动的 app.js**）+ `?bridge=`：自动切 websocket、连接、枚举端口、
  autoSelect、状态栏显示「已连接」——前端复用验证通过
- WinRT 枚举用 `DeviceInformation.find_all_async(selector, [])` **2 参数形式**
  （1 参数形式会被解析成 `DeviceClass(int)` 重载而报错）

## 已知限制

- **Microsoft GS Wavetable Synth**（系统自带虚拟合成器）通过
  `MidiOutPort.from_id_async` 返回 `None`，无法打开——这是该虚拟设备的 WinRT 特性，
  与桥无关。**真实的 CA99（USB / 蓝牙）可正常打开收发。**
- BLE-MIDI 需先在 Windows「蓝牙和设备」里完成配对，桥才能枚举到。

## 其它语言能写桥吗？

可以——协议是语言无关的 WebSocket 字节契约。但**蓝牙必须走 WinRT**
（C# `Windows.Devices.Midi` 或 Python `winsdk`）。Node/Go/Rust 的 MIDI 库基本都是
RtMidi = WinMM，**同样看不到 BLE**，所以蓝牙场景不能用 Node。这里选 Python-`winsdk`。
