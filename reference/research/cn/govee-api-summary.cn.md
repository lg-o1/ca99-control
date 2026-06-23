# Govee LED 音乐同步研究总结
生成时间：2026-06-23 02:16
来源：Google AI Overviews、developer.govee.com、app-h5.govee.com/user-manual/wlan-guide、
      GitHub（wez/govee-py、wez/govee2mqtt、JimmyJammed/govee-python-sdk、LaggAt/python-govee-api）、
      Govee 社区、openHAB 社区、Home Assistant 社区

═══════════════════════════════════════════════════════════════════════
1. Govee 云端 API vs LAN API（哪个适合音乐同步？）
═══════════════════════════════════════════════════════════════════════

## 云端 REST API（developer.govee.com）
- 接口地址：https://openapi.api.govee.com/router/api/v1/
- 鉴权：HTTP 请求头 "Govee-API-Key"——在 Govee Home App → 设置 → 申请 API Key 中获取
- 频率限制：约每分钟 10 次请求（部分资料称标准设备每天 100 次）。
  严格执行。用于音乐节拍同步时会立即触发限流。
- 延迟：1–5 秒以上（通过 AWS IoT 的云端往返）。对节拍同步完全没用。
- 功能（丰富）：开/关、亮度、RGB 颜色、色温、场景（内置 + DIY）、
  分段颜色控制（segmentedColorRgb / segmentedBrightness）、music_setting 模式、
  dynamic_scene。完整能力列表通过 /router/api/v1/user/devices 按设备返回。
- 结论：❌ 因延迟高和频率限制，不适合实时音乐同步。
  适用场景：场景配置、初始化设置、RGBIC 设备的分段编程。

## LAN API（本地 UDP，无需联网）
- 协议：通过本地 Wi-Fi 的 UDP
- 设备发现：组播 UDP 到 239.255.255.250 端口 4001
- 控制：UDP 到设备 IP，端口 4003
- 反馈：设备回复 UDP 端口 4002
- 延迟：<10–50ms（近乎即时）。适合节拍同步。
- 频率限制：无限制。UDP 命令发送速率仅受路由器处理能力约束。
- 功能（有限）：开/关、亮度、单一纯色、色温。
  ⚠️ LAN API 不支持分段控制、不支持场景、不支持 DIY 模式、不支持音乐模式。
  ⚠️ 无法禁用颜色切换时的内置硬件淡入淡出效果。
  ⚠️ LAN API 不支持多区 / RGBIC 分段寻址。
- 启用方式：Govee Home App → 设备设置 → 开启 LAN Control（每台设备单独开启）。
  如果没有该开关：将设备断电重启，等待 30 分钟后重试。
- 结论：✅ 只要接受纯色灯光联动，LAN API 是音乐同步的最佳选择。
           ❌ 不支持按 RGBIC 分段进行音乐同步。

## 音乐同步结论（MIDI/MP3）：
- 节拍联动纯色同步：LAN API（UDP）。延迟 <50ms，无频率限制。
- 分段/区域联动同步：目前所有 API 均无法实现。云端 API 虽有分段控制，
  但 1-5 秒延迟加上每分钟 10 次的频率限制，根本无法用于节拍同步。
- 最佳可行方案：通过 Python 进行节拍检测，用 LAN API 控制整灯颜色+亮度同步；
  或直接使用 Govee 内置的麦克风音乐模式。

═══════════════════════════════════════════════════════════════════════
2. 你的具体设备——API 支持情况与分段控制
═══════════════════════════════════════════════════════════════════════

## 设备 A：Govee Glide RGBIC LED 墙灯 = 型号 H6062
- 云端 API：✅ 支持——可控制颜色、亮度、开/关、场景。
  云端 API 分段控制：✅ 支持，通过 "segmentedColorRgb" 能力实现。
  无论实际灯条数量多少，最多可映射 15 个插值区域。
  示例命令：`{ "name": "segmentColor", "value": [{"segment":1,"color":{"r":255,"g":0,"b":0}}] }`
  频率限制：约每分钟 10 次——对节拍同步太慢，但可用于"每小节切换场景"。
- LAN API：✅ 支持——H6062 已列入 Govee LAN API 官方支持产品页面
  （app-h5.govee.com/user-manual/wlan-guide）。可控制开/关、亮度、纯色。
  ⚠️ LAN API 不支持 H6062 的单独分段控制。
- H6062 音乐同步策略：
  → 使用 LAN UDP 实现快速整灯颜色变化，与节拍同步。
  → 分段效果：在节拍间使用云端 API（非常慢），或使用内置的 "Govee Glide Music Wall Light" 场景（如有）。

## 设备 B：Govee LED 智能灯条（带摄像头）= 型号 H6054（Flow Pro / DreamView P1）
- 云端 API：✅ 支持——基本电源、亮度、颜色控制。
  无法通过 API 控制摄像头或视频/DreamView 同步模式。
- LAN API：❌ 不支持——H6054 未列入 Govee LAN API 支持产品列表。
  已在官方 LAN 指南（app-h5.govee.com/user-manual/wlan-guide）中确认缺席。
- 摄像头/音乐模式：H6054 内置摄像头（ColorSense 技术），可实时捕捉电视/显示器画面颜色
  并映射到灯条。该功能由硬件实现，无法通过任何 API 调用，只能在 Govee Home App 中使用。
  音乐模式使用控制盒内置麦克风——同样只能通过 App 控制。
- H6054 音乐同步策略：
  → 通过云端 API 修改颜色/亮度（速度慢，每分钟 10 次限制）。
  → 实时同步建议直接在 App 中启用 H6054 的内置音乐麦克风模式，让它自主联动。
  → 该型号不支持 LAN API。

═══════════════════════════════════════════════════════════════════════
3. 节拍同步的实际延迟
═══════════════════════════════════════════════════════════════════════

| 方式 | 延迟 | 频率限制 | 分段控制 | 音乐同步 |
|---|---|---|---|---|
| 云端 REST API | 1,000–5,000ms | ~每分钟 10 次 | 支持（H6062） | ❌ 太慢 |
| LAN UDP API | <10–50ms | 无 | 不支持 | ✅ 纯色 |
| BLE | 50–200ms | 无 | 部分 | ⚠️ 不稳定 |
| 内置麦克风模式 | 硬件约 0ms | 不适用（仅 App） | 支持（App） | ✅ 最佳 |

- 120 BPM 音乐：每 500ms 一拍。LAN API <50ms，轻松应对。
- 180 BPM：每 333ms 一拍。LAN API 依然没问题。云端 API 1-5 秒：完全跟不上。
- 云端 API 每分钟 10 次 = 每 6 秒才能发一条命令。节拍同步毫无希望。
- 2.4GHz Wi-Fi UDP：在拥堵网络中可能丢包。建议为设备分配静态 IP。
- 推荐：H6062 用 LAN UDP（整灯颜色），云端 API 用于预编程场景切换。
  H6054：通过 Govee App 使用内置硬件麦克风/摄像头模式实现实时同步。

═══════════════════════════════════════════════════════════════════════
4. 用于控制 Govee 的 Python 库
═══════════════════════════════════════════════════════════════════════

## govee-python-sdk（JimmyJammed/govee-python-sdk）★8 forks:2
- pip install govee-python
- 同时支持 LAN（UDP）和云端（HTTPS）API，并可自动降级
- `prefer_lan=True` 优先尝试 LAN，失败后降级到云端
- 内置 CLI 向导（govee-sync）、批量操作、状态管理、场景支持
- 最现代、维护最活跃的双协议控制库
- GitHub: https://github.com/JimmyJammed/govee-python-sdk

## govee-api-laggat（LaggAt/python-govee-api）★100 forks:29
- pip install govee-api-laggat
- 专注于云端 API，用于 Home Assistant 自定义集成（hacs-govee）
- GitHub 上 Star 最多的 Python Govee 库
- 注意：commit 历史中提到"API 频率限制不合理"
- GitHub: https://github.com/LaggAt/python-govee-api

## govee-led-wez（wez/govee-py）★41 forks:8
- pip install govee-led-wez
- 侧重 LAN API + HTTP 降级 + BLE 支持
- 为 Home Assistant（govee-lan-hass）而生
- 优先级：LAN > BLE > HTTP（按延迟从低到高排序）
- 明确指出 HTTP API 的"严格频率限制"，避免写后立即读
- GitHub: https://github.com/wez/govee-py

## 仅支持 BLE：govee_H613_BTcontroller
- pip3 install govee_H613_BTcontroller
- 直接蓝牙控制，无需 API 密钥
- 支持型号有限，异步（asyncio）
- 适用于仅支持 BLE 的设备或 Wi-Fi 不可用的场景

## 音乐同步推荐：
1. govee-python-sdk——最易上手，H6062 设置 `prefer_lan=True` 走 LAN 控制
2. govee-led-wez——与 Home Assistant 生态集成时的最佳选择
3. 自定义 UDP 实现——追求极致性能（原始 socket，端口 4003）

═══════════════════════════════════════════════════════════════════════
5. 内置摄像头 / 音乐模式（H6054 DreamView P1）
═══════════════════════════════════════════════════════════════════════

## 摄像头模式（DreamView / 屏幕同步 / ColorSense）：
- 摄像头安装在电视/显示器上，持续捕捉画面颜色
- Govee App 将摄像头视野映射为左/右/中心区域
- 颜色实时映射到灯条（硬件处理，约 0ms）
- 仅限 App。无法通过 REST API 或 LAN API 触发。
- AWS 托管的 API 文档说明："API 无法切换摄像头或激活 DreamView/视频自动同步模式"

## 音乐模式（音频同步）：
- 使用 H6054 控制盒内置麦克风（或通过 App 使用手机麦克风）
- 模式：Vivid、Rhythm、Strike、Vibrate——对节拍/低音/旋律做出反应
- App 操作：Govee Home App → 设备 → 音乐标签 → 从设备麦克风开启 Music Sync
- 仅 RGB 和 RGBIC 灯支持音乐模式
- RGBIC 设备在音乐模式下：每个分段可对不同频段独立响应
- 仅限 App。无法通过任何云端或 LAN API 以编程方式触发。
- govee-python-sdk 及其他 Python 库均无法激活该模式。

## DreamView（多设备同步）：
- 一台"主设备"（摄像头）将颜色数据广播给房间内其他 Govee 设备
- 可让电视灯条 + 墙灯 + 灯带全部同步显示同一视频内容
- 同样仅限 App，无 API 访问。

## 编程式音乐同步的替代方案：
- SignalRGB（Windows）：拦截音频，通过 Govee LAN API 实时发送颜色数据
- Hyperion：开源氛围灯软件，部分支持 Govee
- LumiaStream：将音频/屏幕的实时颜色数据通过 LAN 推送到 Govee
- 自定义 Python：使用 librosa/aubio 对 MIDI/MP3 进行节拍检测，通过 UDP 颜色命令
  发送到 H6062（LAN 支持）；对 H6054 使用云端 API（速度慢但可行）。

═══════════════════════════════════════════════════════════════════════
6. MIDI/MP3 音乐同步的架构建议
═══════════════════════════════════════════════════════════════════════

针对你的使用场景（MIDI 播放 + MP3 音频 → 颜色+亮度同步）：

第 1 步：节拍/音符检测
  - MIDI：直接解析 MIDI 事件（note_on 力度 → 亮度，音符音高 → 色相）
  - MP3：使用 Python 中的 librosa（起始点检测）或 aubio（节拍追踪）

第 2 步：映射到颜色
  - 将音符/频段映射到 HSV 颜色空间
  - 低音 → 红/橙，中音 → 绿/黄，高音 → 蓝/紫（可按喜好自定义）
  - 力度/振幅 → 亮度级别

第 3 步：发送到灯具
  - H6062（Glide 墙灯）：UDP 到端口 4003 → LAN API 颜色命令（<50ms 延迟）✅
    数据包：`{"msg":{"cmd":"colorwc","data":{"color":{"r":R,"g":G,"b":B},"colorTemInKelvin":0}}}`
  - H6054（灯条 + 摄像头）：云端 API → 颜色命令（1-5s 延迟，每分钟 10 次限制）⚠️
    更好的方案：在 App 中手动启用 H6054 的音乐麦克风模式，让它自主响应。
    或：考虑用 SignalRGB 单独处理 H6054 的同步。

第 4 步：频率控制
  - H6062 LAN：无限制——每拍甚至每个十六分音符发送一次（120 BPM 下完全可行）
  - H6054 云端：最多每分钟 10 次 → 每 6 秒才能更换一次（适合场景切换，不适合节拍同步）

LAN 颜色命令的 UDP 数据包格式：
```json
{
  "msg": {
    "cmd": "colorwc",
    "data": {
      "color": {"r": 255, "g": 0, "b": 128},
      "colorTemInKelvin": 0
    }
  }
}
```
发送至：device_ip:4003（UDP socket）

来源：
- [1] Google AI Overview：Govee 云端 API — https://www.google.com/search?q=Govee+developer+API+control
- [2] Govee Developer Platform — https://developer.govee.com/reference/get-you-devices  
- [3] Google AI Overview：Govee LAN API — https://www.google.com/search?q=Govee+LAN+API+local+control
- [4] Govee 官方 LAN 指南 — https://app-h5.govee.com/user-manual/wlan-guide
- [5] Google AI Overview：分段控制 — https://www.google.com/search?q=Govee+Glide+RGBIC+wall+light+API+segments
- [6] Google AI Overview：延迟对比 — https://www.google.com/search?q=Govee+local+API+vs+cloud+API+latency
- [7] Google AI Overview：Python 库 — https://www.google.com/search?q=control+Govee+lights+python+github
- [8] Google AI Overview：摄像头/音乐模式 — https://www.google.com/search?q=Govee+light+bars+camera+music+mode
- [9] Google AI Overview：H6062 LAN — https://www.google.com/search?q=Govee+Glide+RGBIC+H6062+LAN
- [10] GitHub govee2mqtt LAN 文档 — https://github.com/wez/govee2mqtt/blob/main/docs/LAN.md
- [11] GitHub govee-python-sdk — https://github.com/JimmyJammed/govee-python-sdk
- [12] GitHub govee-api-laggat — https://github.com/LaggAt/python-govee-api
- [13] GitHub wez/govee-py — https://github.com/wez/govee-py
- [14] Govee Developer API Reference v2.0 — https://govee-public.s3.amazonaws.com/developer-docs/GoveeDeveloperAPIReference.pdf
