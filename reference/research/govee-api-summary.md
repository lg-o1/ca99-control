# Govee LED Music Sync Research Summary
Generated: 2026-06-23 02:16
Sources: Google AI Overviews, developer.govee.com, app-h5.govee.com/user-manual/wlan-guide, 
         GitHub (wez/govee-py, wez/govee2mqtt, JimmyJammed/govee-python-sdk, LaggAt/python-govee-api),
         Govee Community, openHAB community, Home Assistant community

═══════════════════════════════════════════════════════════════════════
1. GOVEE CLOUD API vs LAN API (which for music sync?)
═══════════════════════════════════════════════════════════════════════

## Cloud REST API (developer.govee.com)
- Endpoint: https://openapi.api.govee.com/router/api/v1/
- Auth: HTTP header "Govee-API-Key" — get key from Govee Home App → Settings → Apply for API Key
- RATE LIMITS: ~10 requests/minute (some sources say 100/day for standard devices). 
  Strictly enforced. Will be immediately rate-limited on music beat sync.
- LATENCY: 1–5+ seconds (cloud round-trip via AWS IoT). USELESS for beat sync.
- CAPABILITIES (rich): on/off, brightness, color RGB, color temp, scenes (built-in + DIY),
  segment color control (segmentedColorRgb / segmentedBrightness), music_setting mode,
  dynamic_scene. Full capability list returned per device via /router/api/v1/user/devices
- VERDICT: ❌ NOT suitable for real-time music sync due to latency + rate limits.
  Use for: scene setup, initial configuration, segment programming on RGBIC devices.

## LAN API (local UDP, no internet required)
- Protocol: UDP over local Wi-Fi
- Discovery: Multicast UDP to 239.255.255.250 port 4001
- Control:   UDP to device IP, port 4003
- Feedback:  Device replies on UDP port 4002
- LATENCY: <10–50ms (near-instant). Suitable for beat sync.
- RATE LIMITS: None. Can send UDP commands as fast as your router handles.
- CAPABILITIES (limited): on/off, brightness, single solid color, color temperature ONLY.
  ⚠️ NO segment control, NO scenes, NO DIY modes, NO music modes via LAN API.
  ⚠️ Cannot disable built-in hardware fade/transition effect on color changes.
  ⚠️ Multi-zone / RGBIC segment addressing NOT available via LAN API.
- ENABLE: Govee Home App → device settings → LAN Control toggle ON (per device).
  If toggle missing: power-cycle the device, wait 30 min, retry.
- VERDICT: ✅ Best for music sync IF single-color reactive lighting is acceptable.
           ❌ NOT usable for per-segment RGBIC music sync.

## Verdict for Music Sync (MIDI/MP3):
- For beat-reactive SOLID-color sync: LAN API (UDP). Latency <50ms. No rate limits.
- For segment/zone-reactive sync: Currently impossible via any API. Only cloud API has
  segment control but 1-5s latency and 10 req/min rate limit makes it unusable for beats.
- BEST REALISTIC APPROACH: LAN API for whole-device color+brightness, synced to beat
  detection in Python. Or use Govee's built-in music mode (microphone-based).

═══════════════════════════════════════════════════════════════════════
2. YOUR SPECIFIC MODELS — API SUPPORT & SEGMENT CONTROL
═══════════════════════════════════════════════════════════════════════

## Device A: Govee Glide RGBIC LED Wall Light = Model H6062
- CLOUD API: ✅ YES — supported. Can control color, brightness, on/off, scenes.
  Segment control via cloud API: ✅ YES via "segmentedColorRgb" capability.
  Segments mapped to up to 15 interpolated zones regardless of physical bar count.
  Example cmd: { "name": "segmentColor", "value": [{"segment":1,"color":{"r":255,"g":0,"b":0}}] }
  Rate limit: ~10 req/min — too slow for beat sync, but usable for "scene switching" per bar.
- LAN API: ✅ YES — H6062 is officially listed in Govee's LAN API supported products page
  (app-h5.govee.com/user-manual/wlan-guide). Can control on/off, brightness, solid color.
  ⚠️ LAN API does NOT support individual segment control on H6062.
- MUSIC SYNC STRATEGY for H6062:
  → Use LAN UDP for fast whole-device color changes synced to beat.
  → For per-segment effects: use Cloud API between beats (very slow), or use 
    the built-in "Govee Glide Music Wall Light" scene if available.

## Device B: Govee LED Smart Light Bars with Camera = Model H6054 (Flow Pro / DreamView P1)
- CLOUD API: ✅ YES — supported for basic power, brightness, color.
  Cannot control the camera or video/DreamView sync modes via API.
- LAN API: ❌ NO — H6054 is NOT listed in Govee's LAN API supported products.
  Confirmed absent from official LAN guide (app-h5.govee.com/user-manual/wlan-guide).
- CAMERA/MUSIC MODE: H6054 has a built-in camera (ColorSense technology) that captures
  on-screen colors from TV/monitor and maps them to light bars. This is hardware-based
  and NOT accessible via any API. It only works through the Govee Home App.
  Music mode uses built-in microphone in the control box — also only app-controlled.
- MUSIC SYNC STRATEGY for H6054:
  → Use Cloud API for color/brightness changes (slow, ~10 req/min limit).
  → For real-time sync, consider using the H6054's built-in music mic mode (app).
  → Cannot use LAN API — not supported on this model.

═══════════════════════════════════════════════════════════════════════
3. REALISTIC LATENCY FOR BEAT-SYNC
═══════════════════════════════════════════════════════════════════════

| Method           | Latency      | Rate Limit     | Segment Ctrl | Music Sync |
|------------------|--------------|----------------|--------------|------------|
| Cloud REST API   | 1,000–5,000ms| ~10 req/min    | YES (H6062)  | ❌ too slow|
| LAN UDP API      | <10–50ms     | None           | NO           | ✅ solid color|
| BLE              | 50–200ms     | None           | Partial      | ⚠️ unstable|
| Built-in mic mode| Hardware ~0ms| N/A (app only) | YES (app)    | ✅ best     |

- For 120 BPM music: beats every 500ms. LAN API at <50ms easily handles this.
- For 180 BPM: beats every 333ms. LAN API still fine. Cloud API at 1-5s: cannot keep up.
- Cloud API 10 req/min = one command every 6 seconds. Hopeless for beat sync.
- UDP on 2.4GHz Wi-Fi: occasional packet loss (crowded networks). Assign static IPs.
- Recommendation: LAN UDP for H6062 (whole color), Cloud API for pre-programmed scenes.
  For H6054: use the built-in hardware mic/camera modes via Govee app for real-time sync.

═══════════════════════════════════════════════════════════════════════
4. PYTHON LIBRARIES FOR GOVEE CONTROL
═══════════════════════════════════════════════════════════════════════

## govee-python-sdk (JimmyJammed/govee-python-sdk) ★8 forks:2
- pip install govee-python
- Supports BOTH LAN (UDP) and Cloud (HTTPS) APIs with automatic fallback
- prefer_lan=True tries LAN first, falls back to cloud
- Has CLI wizard (govee-sync), batch operations, state management, scene support
- Most modern/actively maintained library for dual-protocol control
- GitHub: https://github.com/JimmyJammed/govee-python-sdk

## govee-api-laggat (LaggAt/python-govee-api) ★100 forks:29
- pip install govee-api-laggat
- Cloud API focused, used by Home Assistant custom integration (hacs-govee)
- Most starred Python Govee library on GitHub
- Note: "unrealistic rate limiting from api" mentioned in commit history
- GitHub: https://github.com/LaggAt/python-govee-api

## govee-led-wez (wez/govee-py) ★41 forks:8
- pip install govee-led-wez
- LAN API emphasis + HTTP fallback + BLE support
- Built for Home Assistant (govee-lan-hass)
- Prefers: LAN > BLE > HTTP (lowest to highest latency)
- Explicitly notes "tight rate limits" on HTTP API, avoids read-after-write
- GitHub: https://github.com/wez/govee-py

## BLE-only: govee_H613_BTcontroller
- pip3 install govee_H613_BTcontroller
- Direct Bluetooth control, no API key needed
- Limited model support, async (asyncio)
- Use for BLE-only devices or when Wi-Fi unavailable

## For Music Sync Recommendation:
1. govee-python-sdk — easiest to use, prefer_lan=True for H6062 LAN control
2. govee-led-wez — best if integrating with Home Assistant ecosystem
3. Custom UDP implementation — for maximum performance (raw socket, port 4003)

═══════════════════════════════════════════════════════════════════════
5. BUILT-IN CAMERA / MUSIC MODE (H6054 DreamView P1)
═══════════════════════════════════════════════════════════════════════

## Camera Mode (DreamView / Screen Sync / ColorSense):
- Camera mounts on TV/monitor and continuously captures on-screen colors
- Govee app maps camera view into left/right/center zones
- Colors are mapped to the light bars in real-time (hardware processing, ~0ms)
- App-ONLY. Cannot be triggered via REST API or LAN API.
- Note from AWS-hosted API docs: "The API cannot toggle the camera or activate 
  DreamView/Video auto-sync modes"

## Music Mode (Audio Sync):
- Uses built-in microphone in H6054 control box (or phone mic via app)
- Modes: Vivid, Rhythm, Strike, Vibrate — react to beat/bass/melody
- App: Govee Home App → device → Music tab → Music Sync from device mic
- Only RGB and RGBIC lights support Music Mode
- RGBIC devices in Music Mode: each segment can react independently to frequencies
- App-ONLY. Cannot be triggered via any cloud or LAN API programmatically.
- Cannot be activated via govee-python-sdk or other Python libraries.

## DreamView (Multi-device sync):
- One "primary" device (camera) broadcasts color data to other Govee devices in room
- Allows TV light bars + wall lights + strips to all sync to same video content
- Also app-only, no API access.

## Workaround for Programmatic Music Sync:
- SignalRGB (Windows): intercepts audio, sends color data via Govee LAN API in real-time
- Hyperion: open-source ambient light software, some Govee support
- LumiaStream: streams live color data from audio/screen to Govee via LAN
- Custom Python: use librosa/aubio for beat detection from MIDI/MP3, send UDP color 
  commands to H6062 (LAN supported); use cloud API for H6054 (slow but possible).

═══════════════════════════════════════════════════════════════════════
6. ARCHITECTURE RECOMMENDATION FOR MIDI/MP3 MUSIC SYNC
═══════════════════════════════════════════════════════════════════════

For your use case (MIDI playback + MP3 audio → color+brightness sync):

Step 1: Beat/note detection
  - MIDI: parse MIDI events directly (note_on velocity → brightness, note pitch → color hue)
  - MP3: use librosa (onset detection) or aubio (beat tracking) in Python

Step 2: Map to color
  - Map musical notes/frequency bands to HSV color space
  - Bass → red/orange, Mid → green/yellow, High → blue/purple (customize as desired)
  - Velocity/amplitude → brightness level

Step 3: Send to lights
  - H6062 (Glide Wall): UDP to port 4003 → LAN API color command (<50ms latency) ✅
    Payload: {"msg":{"cmd":"colorwc","data":{"color":{"r":R,"g":G,"b":B},"colorTemInKelvin":0}}}
  - H6054 (Light Bars + Camera): Cloud API → color command (1-5s latency, 10/min limit) ⚠️
    Better: manually enable H6054 Music Mode mic in app, let it react autonomously.
    Or: consider SignalRGB to handle H6054 sync separately.

Step 4: Rate limiting
  - H6062 LAN: no limit — send every beat or even every 16th note at 120 BPM (OK)
  - H6054 Cloud: max 10/min → only change every 6s (scene changes, not beat sync)

UDP Payload format for LAN color command:
{
  "msg": {
    "cmd": "colorwc",
    "data": {
      "color": {"r": 255, "g": 0, "b": 128},
      "colorTemInKelvin": 0
    }
  }
}
Send to: device_ip:4003 via UDP socket

Sources:
- [1] Google AI Overview: Govee Cloud API — https://www.google.com/search?q=Govee+developer+API+control
- [2] Govee Developer Platform — https://developer.govee.com/reference/get-you-devices  
- [3] Google AI Overview: Govee LAN API — https://www.google.com/search?q=Govee+LAN+API+local+control
- [4] Govee Official LAN Guide — https://app-h5.govee.com/user-manual/wlan-guide
- [5] Google AI Overview: Segments — https://www.google.com/search?q=Govee+Glide+RGBIC+wall+light+API+segments
- [6] Google AI Overview: Latency comparison — https://www.google.com/search?q=Govee+local+API+vs+cloud+API+latency
- [7] Google AI Overview: Python libs — https://www.google.com/search?q=control+Govee+lights+python+github
- [8] Google AI Overview: Camera/Music — https://www.google.com/search?q=Govee+light+bars+camera+music+mode
- [9] Google AI Overview: H6062 LAN — https://www.google.com/search?q=Govee+Glide+RGBIC+H6062+LAN
- [10] GitHub govee2mqtt LAN docs — https://github.com/wez/govee2mqtt/blob/main/docs/LAN.md
- [11] GitHub govee-python-sdk — https://github.com/JimmyJammed/govee-python-sdk
- [12] GitHub govee-api-laggat — https://github.com/LaggAt/python-govee-api
- [13] GitHub wez/govee-py — https://github.com/wez/govee-py
- [14] Govee Developer API Reference v2.0 — https://govee-public.s3.amazonaws.com/developer-docs/GoveeDeveloperAPIReference.pdf