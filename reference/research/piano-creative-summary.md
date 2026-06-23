# Kawai CA99 Creative MIDI/SysEx Projects — Inspiration Guide
## Researched via browserctl, saved 2026-06-23 01:43

---

## 📱 CAN IT RUN FROM A PHONE?

**Android (Chrome/Edge/Opera):** YES — Web MIDI API is fully supported. Connect CA99 via:
- USB: "To Host" cable + USB OTG (USB-C to USB-A) adapter (~)  
- Bluetooth MIDI: use an adapter like Yamaha MD-BT01, pair in Android settings

**iOS (Safari):** NO native support. Workaround: MIDIWeb app from App Store acts as a bridge.

**Phone-only rule of thumb:** If it uses the Web MIDI API (browser JS), it can run from Android Chrome with NO app, NO computer.
Source: supersimplepiano.com "Web MIDI in 2026: Which Browsers Actually Work", StudioCode.dev, Piano Buyer

---

## 🎨 CATEGORY 1: Auto Sound-Switching / Generative Timbre ⭐ (User's Example)

### 1a. Beat-Triggered Sound Rotation
**Idea:** Every N bars, send a SysEx/Program Change to CA99 to cycle through voices (Grand Piano → Strings → Vibraphone → Harpsichord...).
**Phone-only:** YES — Pure Web MIDI JS, no backend
**Code effort:** ~20-50 lines Python or JS
**Libraries:** mido (Python), WebMIDI.js (JS)
**Notes:** You've already reverse-engineered the SysEx. This is essentially just a timer + send SysEx. Can randomize from a curated list.

### 1b. Expression-Responsive Sound Switch
**Idea:** Monitor playing velocity/register. Soft low-register playing → strings/cello sound. Hard high-register → lead synth/brass.
**Phone-only:** YES (Web MIDI reads note velocity in real-time)
**Code effort:** ~50-100 lines
**Libraries:** mido, python-rtmidi or WebMIDI.js
**Source:** Google AI overview on q1-creative-midi

### 1c. "Key of the Moment" Scale Lock + Sound Change
**Idea:** Define a scale; snap wrong notes to nearest in-scale note. Every time you change the key (via app button), auto-swap the CA99's voice.
**Phone-only:** YES — phone browser can send SysEx to CA99 via WebMIDI
**Code effort:** ~1 weekend (scale snapping + key selection UI)
**Libraries:** WebMIDI.js, Tone.js for scale logic
**Source:** q1-creative-midi AI overview

### 1d. Virtual Technician Param Randomizer
**Idea:** Every N bars, randomize VT params (key touch, voicing, damper resonance) within musical ranges to keep timbre evolving.
**Phone-only:** YES — you have the SysEx protocol
**Code effort:** ~30 lines (you have the hard part: the SysEx reverse-engineered)
**UNIQUE to CA99 owners — almost nobody else can do this!**

---

## 🎹 CATEGORY 2: Auto-Accompaniment / Harmonization ⭐ (CA99 has NO built-in arranger — this ADDS one in code!)

### 2a. Chord-Detection + Backing Generator
**Idea:** Listen to notes you play, detect the implied chord (C major, G7, etc.), generate a bass+rhythm accompaniment pattern and send it back to CA99 (different MIDI channel → different voice).
**Phone-only:** Partial — chord detection math works in JS; for ML models you'd need a tiny server
**Code effort:** 1 weekend for rule-based; 2-4 weeks for ML-based
**Libraries:** 
  - Python: music21, autochord, music-x-lab/midi-chord-recognition + mido
  - JS: Tonal.js (chord detection), WebMIDI.js (output)
**Source:** q5-generative-harmonize, Loopy Pro Forum (auto MIDI accompaniment generator), q3-python-mido

### 2b. Smart Auto-Arpeggiator
**Idea:** While you hold chords, the script generates arpeggiated patterns and sends them back to CA99 on a separate MIDI channel, with voice switching on each loop reset.
**Phone-only:** YES — all JS
**Code effort:** ~100-200 lines JS or Python
**Libraries:** Tone.js (scheduling), WebMIDI.js
**Source:** q1-creative-midi AI overview

### 2c. AI Harmonization (Google Magenta)
**Idea:** Play a melody; Google's Magenta.js AI generates a harmonized accompaniment in real-time (trained on classical/jazz).
**Phone-only:** YES — Magenta.js runs entirely in-browser (TensorFlow.js)
**Code effort:** 1-2 days (Magenta has ready-to-use models)
**Libraries:** @magenta/music (Magenta.js), html-midi-player (cifkao on GitHub uses it)
**Source:** q2-webmidi-github (html-midi-player is "powered by @magenta/music")

### 2d. Markov Chain Chord Progressions
**Idea:** Train a Markov model on your favorite chord progressions; it generates the next chord live based on what you just played.
**Phone-only:** YES if pre-trained; JS Markov implementation is tiny
**Code effort:** ~1 weekend
**Libraries:** musicpy (Python high-level), mido
**Source:** q3-python-mido, q5-generative-harmonize

---

## 🌈 CATEGORY 3: Visualizers / Light Shows

### 3a. Falling-Notes Visualizer (Rousseau-style)
**Idea:** Connect CA99 via MIDI; play and record a Synthesia/SeeMusic-style falling-notes video for YouTube.
**Phone-only:** Partially — Midiano (midiano.com) runs in browser/phone Chrome
**Code effort:** Zero (use existing tools) to ~1 weekend (custom web visualizer)
**Tools/Projects:**
  - Synthesia (commercial, Windows/Android app)
  - SeeMusic (commercial, pro output for YouTube)
  - Midiano (open source, browser-based — runs on phone!)
  - midee (GitHub: aayushdutt/midee — browser MIDI studio, exports 1080p video)
  - html-midi-player (GitHub: cifkao/html-midi-player — embeddable waterfall visualizer)
  - midi-jumper (GitHub: rfranr/game.midi-jumper — Three.js 3D visualizer)
**Source:** q2-webmidi-github, q4-lightshow-visualizer, q8-reddit-cool-things

### 3b. LED Light Strip on Piano Keys
**Idea:** WS2812B addressable LEDs under the piano key rail. Each note sends MIDI → Arduino/RPi → LED lights the exact key in a color.
**Phone-only:** NO — requires microcontroller hardware
**Code effort:** 1-2 weekends (hardware build + code)
**Tools:** Arduino/RPi + FastLED library, klearliu's "Ultimate Guide to Piano LED" (YouTube tutorial, 33 min)
**Source:** q4-lightshow-visualizer

### 3c. Philips Hue Synesthesia Room Lighting
**Idea:** Each note → color mapped to Philips Hue bulbs. DX Wu's open-source project on GitHub Pages.
**Phone-only:** YES — it's a Chrome Web MIDI web app
**Code effort:** Near-zero (open source project exists: dxwu.github.io/Synesthesia)
**Libraries:** Philips Hue API + WebMIDI.js
**Source:** q4-lightshow-visualizer AI overview

### 3d. Real-time Canvas/Particle Visualizer
**Idea:** Browser canvas shows particle explosions, color washes, ink-in-water effects triggered by notes. p5.js + WebMIDI.
**Phone-only:** YES — p5.js browser canvas + WebMIDI
**Code effort:** ~1 weekend
**Libraries:** p5.js (Processing for web), WebMIDI.js
**Source:** q2-webmidi-github Facebook post (webmidi + P5 mentioned)

---

## 🎮 CATEGORY 4: Practice & Learning Games

### 4a. Falling-Notes Learning Game
**Idea:** Display MIDI file as falling bars; CA99 lights up (if connected) or gives feedback when you hit/miss.
**Phone-only:** YES — open source browser apps
**Code effort:** Zero (use existing); 1-2 weeks to build custom
**Projects:**
  - Midiano (midiano.com — open source, browser, phone-friendly)
  - Sightread (github.com/sightread/sightread — React, "Sheet Hero" mode)
  - PianoFun (github.com/victorantos/PianoFun)
  - PianoBooster (desktop, GitHub: pianobooster/PianoBooster)
**Source:** q6-learning-game

### 4b. Note Recognition / Ear Training Game
**Idea:** App plays a note (sends MIDI to CA99 to sound it), you must identify it or play it back. Score + streaks.
**Phone-only:** YES — WebMIDI in Chrome
**Code effort:** ~1 weekend
**Libraries:** WebMIDI.js, Tone.js

### 4c. Sight-Reading Trainer
**Idea:** Show random sheet music or chord; detect what you actually play from MIDI; score timing and accuracy.
**Phone-only:** YES — Sightread already does this in browser
**Code effort:** Zero (Sightread exists); weeks to build custom
**Source:** q6-learning-game

### 4d. Jazz Piano Trainer
**Idea:** Existing Reddit project — Python + mido + rtmidi reads MIDI, tests jazz theory/chord voicings in real-time.
**Phone-only:** NO — Python backend needed (but could be hosted on phone via Termux)
**Code effort:** 1-2 weekends
**Source:** q3-python-mido (r/madeinpython post)

### 4e. Midi Survivor (web game)
**Idea:** Play specific notes to survive in a real-time game (literally "play piano IRL to survive").
**Phone-only:** YES — browser game via WebMIDI
**Source:** q2-webmidi-github (YouTube: Fun With Computer Vision, Feb 2026)

---

## 🤖 CATEGORY 5: Generative / Algorithmic Music

### 5a. Ambient Generative Loop
**Idea:** Code generates evolving MIDI sequences (ambient music) and plays them through CA99 automatically — no human playing needed.
**Phone-only:** YES if JS; better with tiny Python server
**Code effort:** ~1-2 days (rule-based); 1 week (Markov)
**Libraries:** musicpy (Python), Tone.js (JS Transport), mido

### 5b. Stochastic/Fractal Composer
**Idea:** L-systems, probability matrices, or fractal algorithms generate chord progressions; output to CA99 via MIDI.
**Phone-only:** NO (Python backend) or YES (JS implementation)
**Code effort:** 1-2 weekends
**Libraries:** musicpy, GenAI_ChordRhythmChain_Music (GitHub)
**Source:** q5-generative-harmonize (Valerio Velardo's "Sound of AI" channel, chord generation with generative grammars)

### 5c. LSTM/Transformer AI Composition
**Idea:** Train or use pretrained model (Magenta MusicRNN) to generate continuations of your playing in real-time.
**Phone-only:** YES — Magenta.js (TensorFlow.js) runs in Chrome
**Code effort:** 1-2 days to integrate Magenta.js
**Libraries:** @magenta/music, miditok (for ML tokenization)
**Source:** q3-python-mido, q5-generative-harmonize

---

## 📼 CATEGORY 6: Recording & Analysis

### 6a. Live MIDI Capture → Auto Sheet Music
**Idea:** Record your playing via MIDI, run through music21 to quantize + transcribe → export MusicXML/PDF sheet music.
**Phone-only:** NO — needs Python backend (music21 is Python only)
**Code effort:** ~1 day (music21 has built-in MIDI→score conversion)
**Libraries:** music21, mido

### 6b. Performance Analysis Dashboard
**Idea:** Track your practice over time: which notes you hit/miss, velocity patterns, tempo consistency. Visualize trends.
**Phone-only:** YES (data collection via WebMIDI); NO for analysis (Python)
**Code effort:** 1-2 weekends (full dashboard)
**Libraries:** mido, pandas, plotly

### 6c. MIDI Recycler / Pattern Flipper
**Idea:** Record a phrase; the script automatically creates variations (retrograde, inversion, augmentation, layering).
**Phone-only:** NO (Python)
**Code effort:** ~1 day
**Source:** q1-creative-midi (r/FL_Studio "RECYCLER" Python script)

---

## 💡 CATEGORY 7: Smart Home / Fun Integrations

### 7a. Piano → Smart Home Trigger
**Idea:** Specific note patterns trigger smart home scenes (play C5 three times → turn on living room lights; play a chord → start coffee maker via Home Assistant).
**Phone-only:** YES — Web MIDI + Fetch API → Home Assistant webhook
**Code effort:** ~50 lines

### 7b. Rousseau-Style YouTube Content
**Idea:** Record CA99 MIDI performance → feed into SeeMusic/Piano VFX → sync with top-down camera → YouTube video.
**Phone-only:** NO (video editing requires desktop)
**Code effort:** Zero code; creative production effort
**Source:** q8-reddit-cool-things, r/synthesia community

### 7c. MIDI Surf as Phone Remote Control
**Idea:** midisurf.app is a free web-based MIDI controller — use your phone browser AS the controller to send CCs/notes to CA99 wirelessly over BLE MIDI.
**Phone-only:** YES — it's a PWA (installable)
**Code effort:** Zero (app exists at midisurf.app)
**Source:** q7-phone-control

---

## 📚 KEY LIBRARIES & PROJECTS REFERENCE

| Library/Project | Language | What it does | Phone? |
|---|---|---|---|
| mido | Python | MIDI I/O, ports, files | No (Python) |
| python-rtmidi | Python | Low-latency MIDI backend | No |
| music21 | Python | Music theory, MIDI→score | No |
| musicpy | Python | High-level music programming | No |
| miditok | Python | MIDI tokenization for ML | No |
| autochord | Python | Chord detection from MIDI | No |
| WebMIDI.js | JS | Web MIDI wrapper, easy API | YES |
| Tone.js | JS | Browser audio scheduling | YES |
| @magenta/music | JS | Google AI music generation | YES |
| p5.js | JS | Canvas visuals | YES |
| Tonal.js | JS | Music theory in JS | YES |
| Midiano | Web app | Piano learning, open source | YES |
| Sightread | Web app | Sight-reading trainer | YES |
| html-midi-player | Web | Embeddable MIDI visualizer | YES |
| PianoFun | Web | Learning game, GitHub | YES |
| midee | Web | MIDI studio, 1080p export | YES |
| midi-jumper | Web | Three.js 3D visualizer | YES |
| WebMIDICon (dtinth) | Web | MIDI instruments in browser | YES |
| Synthesia | Desktop/Android | Falling notes learning | Android only |
| SeeMusic | Desktop | Pro visualizer videos | No |
| MIDI Surf | PWA | Phone→piano MIDI controller | YES |
| PianoBooster | Desktop | MIDI learning game | No |

---

## 🌟 TOP 5 RECOMMENDATIONS FOR THIS USER (Kawai CA99 with SysEx control)

1. **⭐ Beat-triggered Sound Rotation** — You literally have all the pieces. Timer + SysEx you already know. ~20 lines. Works from phone.

2. **⭐⭐ Code-based Auto-Accompaniment** — The CA99 has NO arranger. You can BUILD one: detect chords from your MIDI → generate bass/rhythm → send to CA99's second MIDI channel at a different voice. Nobody else does this without an arranger piano. Weekend project.

3. **VT Param Randomizer** — Your reversed SysEx for Virtual Technician is the secret weapon. Slowly morph damper resonance, voicing, key touch as you play. Wildly unique.

4. **Philips Hue Synesthesia** — Open source exists (dxwu.github.io/Synesthesia), Chrome Web MIDI, works from phone. Instant wow factor.

5. **Rousseau-Style MIDI Visualizer Video** — Use Midiano or midee (both browser-based, phone-friendly for monitoring) to generate falling-notes video of your CA99 performances. No code needed.

---
Sources: Google AI Overviews (8 searches), GitHub (PianoFun, html-midi-player, midee, WebMIDICon, Sightread, midi-jumper), 
Reddit (r/synthesizers, r/piano, r/synthesia, r/madeinpython, r/FL_Studio), 
Midiano, SeeMusic, Synthesia, supersimplepiano.com, midisurf.app, dxwu.github.io/Synesthesia, mido.readthedocs.io