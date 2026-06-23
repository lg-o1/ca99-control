# Kawai CA99 MIDI Control — Architecture Research Summary
## Sources: 7 Google AI Overview searches, Jan/Feb 2026

---

## 1. ARCHITECTURE OPTIONS COMPARISON

### Option A: Computer over USB MIDI (Python mido / Node.js)
**How**: Connect piano via USB-B → USB-A cable to PC; use python-rtmidi, mido, or Node.js jzz/midi packages.
**Pros**:
- Simplest to start: zero browser restrictions, direct OS MIDI access.
- Lowest latency: 1–3ms round-trip, no overhead.
- Can send/receive full SysEx without any API limitations.
- No UI framework needed for initial testing; just scripts.
- Mido/rtmidi are battle-tested; handle SysEx, clock, all MIDI message types.
**Cons**:
- Desktop-only. Can't use phone for convenience.
- Need Python/Node environment set up on the machine.
- No GUI unless you build one (Tkinter, Electron, etc.).
**Verdict**: ✅ Best for initial development and testing. Get SysEx commands working here first.

### Option B: Native Android APK (Kotlin + Bluetooth MIDI / USB-OTG)
**How**: Build Kotlin app using Android MIDI API (android.media.midi.*); connect BLE MIDI or USB-OTG.
**Pros**:
- Full OS-level MIDI access on Android.
- Can use BLE MIDI natively for wireless convenience.
- Can be published to Play Store.
**Cons**:
- Significant dev work: Kotlin boilerplate, build/sign pipeline, Play Store process.
- BLE MIDI on Android is unreliable: "can vary widely depending on hardware manufacturer and OS version" — jitter, dropouts, pairing issues.
- USB-OTG requires manual Android USB mode switch to MIDI.
- Separate codebase from any desktop/web solution.
**Verdict**: ❌ Highest effort, worst BLE MIDI reliability on Android. Not recommended unless Play Store distribution is needed.

### Option C: Web App / PWA using Web MIDI API (RECOMMENDED)
**How**: HTML/JS/Vue PWA served locally (or from a simple Flask/Node static server). Uses 
avigator.requestMIDIAccess(). Chrome on desktop and Android Chrome both support Web MIDI API.
**Pros**:
- **ONE codebase for USB (desktop/Android) AND BLE MIDI (Android)**.
- Chrome on Android + USB-OTG: plug piano, change USB mode to MIDI, open Chrome → piano appears as MIDI port immediately.
- WEBMIDI.js library simplifies port enumeration, SysEx, hot-plug detection.
- Vue.js frontend from the PianoRemote extraction can be directly reused (after stubbing JsInterface).
- PWA "Add to Home Screen" gives app-like experience with zero Play Store overhead.
- Flask/Node backend optional (only needed for preset storage, not for MIDI itself).
**Cons**:
- Chrome on Android requires USB MIDI mode to be set manually (notification panel → change to MIDI).
- BLE MIDI on Android Chrome: requires pairing at OS level first; support varies by manufacturer.
- Web MIDI API not available on Firefox or Safari (Chrome/Chromium only).
- SysEx requires explicit permission flag (sysex: true in requestMIDIAccess).
**Verdict**: ✅✅ SMARTEST PATH. One app, runs on desktop AND Android, no Play Store needed.

---

## 2. IS PWA / WEB MIDI THE SMARTEST SINGLE-CODEBASE PATH?

**YES** — confirmed by research:
- Web MIDI API exposes all connected MIDI ports (USB and BLE) identically via MIDIPort objects.
- Switching between USB and BLE is transparent: just pick the correct port from inputs/outputs.
- Chrome on Android supports Web MIDI API; PWA installs via "Add to Home Screen" with no app store.
- WEBMIDI.js provides clean abstraction: WebMidi.enable({ sysex: true }) then iterate outputs.
- A single Vue SPA served by a local Python/Node server works on desktop browser AND Android Chrome over the same USB or Wi-Fi network.

---

## 3. USB-FIRST THEN BLE STRATEGY — IS IT VALID?

**YES — Strongly recommended strategy**:
1. **Phase 1 (Development)**: Connect PC → Piano via USB. Use Python mido or Node.js to validate all SysEx command tables (from your decrypted JSON). Zero-friction debugging.
2. **Phase 2 (Web UI)**: Build PWA with Web MIDI API. Test on desktop Chrome via USB. Develop and validate UI against USB connection (1–3ms, no dropouts).
3. **Phase 3 (Mobile BLE)**: On Android, pair piano via BLE MIDI, open PWA in Chrome. Same code, just different port selected. Add any BLE-specific retry/reconnect logic.

Web MIDI API treats USB and BLE ports identically — switching requires zero code changes, just port selection. This makes the staged approach trivially easy.

---

## 4. USB vs BLE MIDI LATENCY — REAL-WORLD NUMBERS

| Connection        | Latency (round-trip) | Reliability           | Notes |
|-------------------|---------------------|-----------------------|-------|
| USB MIDI          | **1–3 ms**          | Near-perfect          | Gold standard; no dropouts |
| BLE MIDI (standard OS) | **15–22.5 ms** | Occasional dropouts  | Android varies by OEM |
| BLE MIDI (CME WIDI hardware) | **3–6 ms** | Good               | Dedicated BLE 5 adapter |
| BLE MIDI on Android (generic) | **10–30 ms+** | Variable jitter   | Manufacturer/OS dependent |

**Does it matter for this use case?**
- For **SysEx control messages** (changing reverb, sound selection, EQ): **No** — 25ms delay is imperceptible for UI interaction.
- For **note performance** (live playing): USB is better, but CA99 control is primarily parameter/preset management, not live playing.
- For the CA99 use case (sending configuration SysEx), BLE latency is **irrelevant** — you're not playing notes in real-time.
- **Conclusion**: BLE is perfectly acceptable for the CA99 control use case once USB testing confirms correct SysEx.

---

## 5. REBUILD APK vs REUSE VUE FRONTEND vs FRESH WEB APP

### Rebuild official PianoRemote APK
**Verdict: ❌ NOT RECOMMENDED**
- Would require: repackaging all decrypted assets, rebuilding the KWMCore native .so library (closed-source C++), re-signing with a new keystore, dealing with Android security attestation.
- The JsInterface bridge (Java/Kotlin ↔ WebView JavaScript) would need to be fully reimplemented.
- Even if done, the app would be unsigned by Kawai and potentially blocked by OS-level app signing checks.
- Effort: Weeks to months. Risk of incomplete native layer. No real advantage over a web app.

### Reuse decrypted Vue.js frontend in a browser
**Verdict: ⚠️ PARTIALLY FEASIBLE but not recommended as-is**
- The Vue.js files (HTML/JS/CSS) CAN be extracted from assets/ and served via http-server.
- **Problem**: The frontend calls window.JsInterface.* (or similar Android bridge) for ALL MIDI operations. These calls will silently fail or throw in a browser.
- You would need to: stub/mock window.JsInterface → forward calls to Web MIDI API (navigator.requestMIDIAccess).
- Router mode must change from createWebHistory to createWebHashHistory for local file serving.
- Since you already have the decrypted SysEx/sound/VT JSON tables, it may be easier to write a fresh lightweight Vue component than to untangle all JsInterface call sites in the existing code.
- **Effort**: Moderate. Might be worth it if the existing Vue UI is polished and you want to preserve it.

### Fresh Web App reusing extracted JSON data tables
**Verdict: ✅✅ RECOMMENDED**
- Build a new lightweight Vue 3 (or even plain HTML/JS) PWA.
- Import your sysex.json, sound.json, t.json, hythm.json directly.
- Use WEBMIDI.js for port management and SysEx sending.
- Serve with python -m http.server or a tiny Flask/FastAPI/Express server.
- Full control over UI, no legacy JsInterface debt.
- Works on desktop Chrome (USB), Android Chrome (USB-OTG or BLE).
- Can be installed as a PWA (Add to Home Screen).
- **Effort**: Days to 1–2 weeks. Clean, maintainable, no reverse-engineering debt.

---

## RECOMMENDED IMPLEMENTATION ROADMAP

`
Week 1: Python mido + USB
  → Validate all SysEx commands against CA99 (sound select, reverb, eq, pedal, etc.)
  → Build sysex_builder.py from your decrypted tables

Week 2: PWA skeleton
  → Vue 3 + WEBMIDI.js + Vite
  → Import sysex.json, sound.json
  → USB MIDI on desktop Chrome: send/receive working

Week 3: Android
  → Test on Android Chrome via USB-OTG (cable + USB MIDI mode)
  → Add PWA manifest, "Add to Home Screen"
  → Test BLE MIDI pairing on Android
  
Week 4: Polish
  → Preset saving (localStorage or tiny Flask backend)
  → Sound browser, EQ sliders, rhythm selector
  → Optional: Electron wrapper for offline desktop app
`

---

## KEY SOURCES
- Google AI Overview: "Web MIDI API phone vs desktop USB Bluetooth MIDI latency reliability comparison"
- supersimplepiano.com: "USB MIDI is essentially instant: 1–3ms. Bluetooth MIDI typically adds 10–25ms."
- Music Stack Exchange: "Apple USB MIDI latency ~3.5ms; Apple BLE MIDI macOS latency ~17ms"
- CME Pro / Thomas Gerbrands (Medium, Jan 2020): WIDI hardware can achieve 3ms BLE latency
- Google AI Overview: "controlling MIDI from web app — WEBMIDI.js + Web MIDI API" 
- Google AI Overview: "PWA Web MIDI Android Chrome — USB-C/OTG + grant permissions → works without app install"
- Google AI Overview: "decrypted Android WebView Vue.js in browser — mock JsInterface, change router to hash mode"
- flykeys.com: USB MIDI latency comparison data
- Zynthian Discourse: BLE MIDI connection interval timing analysis