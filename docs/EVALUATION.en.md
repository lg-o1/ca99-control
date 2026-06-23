# Approach Evaluation & First-Step Decision

> Combining all research (architecture, community projects, CA99 reverse-engineered assets, kids' learning apps),
> scoring candidate "first steps" across multiple dimensions to decide where to start.

---

## 1. Candidate Approaches

| ID | Approach | Description |
|----|----------|-------------|
| A | **PWA + Web MIDI custom app** (reuse extracted JSON + official webmidi.js) | New lightweight Vue/vanilla web app, import sysex.json/sound.json, reuse official connection layer |
| B | **Python USB script** (Phase 0 validation) | CLI mido script to first validate SysEx sound-switch/VT on real hardware |
| C | **Reuse official Vue frontend** (appui-full) | Run the decrypted official web app, stub JsInterface → Web MIDI |
| D | **Use existing OSS projects** (midiano.com / PianoBooster / Piano-LED-Visualizer) | Don't build — install ready-made learning/LED projects |
| E | **Native Android APK** (Kotlin + Bluetooth) | Build native app from scratch |

---

## 2. Scoring Dimensions (1–5, 5=best)

1. **Has UI** — graphical interface vs pure CLI
2. **WYSIWYG** — change → instantly see/hear result, intuitive debugging
3. **Borrowable projects** — mature community code to copy
4. **Leverages CA99 assets** — can directly use our extracted sysex.json/sound.json/vt.json + official webmidi.js/kawaipiano.js/chord_dictionary.js
5. **Time-to-first-result** — how fast to get first working effect
6. **Default dual-connection (USB+BLE)** — one codebase supports both
7. **Growth potential** — smooth path to 10+ features + lights

---

## 3. Scoring Matrix

| Dimension | A: PWA+WebMIDI | B: Python USB | C: Reuse Vue | D: OSS | E: Native APK |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Has UI | 5 | 1 | 5 | 5 | 5 |
| WYSIWYG | 5 | 3 | 4 | 4 | 3 |
| Borrowable projects | 5 | 4 | 3 | 5 | 2 |
| Leverages CA99 assets | 5 | 4 | 5 | 1 | 4 |
| Time-to-first-result | 4 | 5 | 2 | 5 | 1 |
| Default dual-connection | 5 | 3 | 5 | 3 | 3 |
| Growth potential | 5 | 3 | 3 | 2 | 4 |
| **Total (35)** | **34** | **23** | **27** | **25** | **22** |

---

## 4. Decision: First step = PWA + Web MIDI (A), preceded by a 1-hour B validation

### 🥇 Approach A (PWA + Web MIDI) = 34/35, the main line

**Why A wins:**
- **Has UI + WYSIWYG**: web interface; click to switch voice, drag slider to change VT instantly — intuitive debugging
- **Max borrowable code**: [WEBMIDI.js](https://github.com/djipco/webmidi), midiano.com patterns, Piano-LED-Visualizer color logic all copyable
- **Perfectly leverages CA99 assets**: directly import our extracted `sysex.json`(986 cmds)/`sound.json`(346 voices)/`vt.json`, **AND directly reuse the official `webmidi.js` (clean un-minified code, confirmed using `requestMIDIAccess({sysex:true})` for both USB+BLE) + `kawaipiano.js`(getMidi framing) + `chord_dictionary.js`(for auto-accompaniment)**
- **Default dual-connection**: official webmidi.js enumerates USB and Bluetooth both as MIDIPort; your PC has Bluetooth — one codebase, switch freely, no code changes
- **Growth potential**: features 1→10 plus lights all live in one PWA as modules

### 🥈 But spend 1 hour on B (Python USB) first for protocol validation

A's only risk: **our reverse-engineered SysEx bytes haven't been verified on real hardware.** So:
- **Phase 0 (1 hour)**: Python mido + USB, send one sound-switch SysEx to the real CA99, confirm the piano actually changes voice → validates the whole chain (the extracted protocol bytes are correct)
- Once validated, **go all-in on A (PWA)**

> This isn't two paths — B is just A's "protocol health-check." Web MIDI and mido send the identical SysEx bytes; commands validated in B transfer directly into A.

### Why not the others

- **C (Reuse official Vue) 27**: works but requires stubbing every `JsInterface` native-bridge call with Web MIDI — tedious legacy untangling; cleaner to write fresh
- **D (OSS projects) 25**: midiano.com/PianoBooster are **for kids learning piano**, not "controlling CA99 voices/VT/lights" — **different purpose**. They should be installed (kid learning) but aren't this project's first step. **Run in parallel**: kid learning uses D, your creative control uses A
- **E (Native APK) 22**: most effort, worst Android BLE reliability, single platform — not worth it

---

## 5. Direct answers to your questions

| Your question | Answer |
|---------------|--------|
| **First step = PWA/MIDI API?** | ✅ Yes. PWA+Web MIDI scores highest (34). But do a 1-hour Python+USB protocol validation first, then go all-in on PWA |
| **Is there a UI?** | ✅ Yes. PWA is a web UI, opens on phone/desktop |
| **Is it WYSIWYG?** | ✅ Yes. Click → instant voice switch, drag → instant VT change, edit code → refresh → see result. Web dev's biggest advantage |
| **Existing projects to borrow?** | ✅ Many. WEBMIDI.js (connection), midiano.com (falling-note pattern), Piano-LED-Visualizer (colors), official webmidi.js/kawaipiano.js (direct reuse) |
| **Leverages existing CA99 assets?** | ✅ Fully. sysex.json/sound.json/vt.json/rhythm.json + official webmidi.js/bluetoothmidi.js/kawaipiano.js/chord_dictionary.js + 1543 built-in MIDI |

---

## 6. Suggested PWA tech stack (based on existing assets)

```
Connection:  official webmidi.js (reuse) or WEBMIDI.js lib — auto-enumerate USB+BLE ports
Framing:     reference official kawaipiano.js getMidi() — params → SysEx bytes
Data:        import sysex.json + sound.json + vt.json + rhythm.json (extracted)
Chords:      reuse official chord_dictionary.js (for auto-accompaniment)
UI:          Vue 3 + Vite (PWA), or vanilla HTML/JS (lighter)
Lights:      local Node/Python backend → UDP to Govee Glide wall light (H6062:4003)
```

Startup:
```javascript
navigator.requestMIDIAccess({sysex: true}).then(access => {
  for (const out of access.outputs.values()) {
    // list for user to pick, or auto-pick one containing "CA99"/"Kawai"
  }
});
```

---

## 7. Dual-track recommendation (kid learning vs your creative control)

These are **two independent things** that run in parallel:

| Purpose | Use | Owner |
|---------|-----|-------|
| **Kid learning** (sight-reading/falling-notes/encouragement) | Ready-made apps/projects: Simply Piano, Note Rush, Piano-LED-Visualizer, PianoBooster | Kid uses, you set up |
| **Your creative control** (voice/VT/auto-accompaniment/light-sync) | This project's custom PWA (Approach A) | You build |

> CA99 Bluetooth/USB can connect multiple consumers at once: kid's learning app takes one MIDI stream, your PWA takes another, no interference.

---

> Sources: all project research (reference/research/) + CA99 reverse-engineered assets (reference/appui-full/)
