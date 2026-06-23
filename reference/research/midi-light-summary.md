# MIDI + LED Light Sync Research Summary
# For: Kawai CA99 piano player wanting Govee lights to react to color+rhythm
# Date: 2026-06-23

==========================================================================
## 1. MIDI → LED PROJECTS (GitHub / Community)
==========================================================================

### A. Piano-LED-Visualizer (onlaj)
- URL: https://github.com/onlaj/Piano-LED-Visualizer
- Language: Python
- How it works: Connects LED strip to digital piano via MIDI; syncs LED lighting with playing.
  Detailed hardware instructions for WS2812B strips and Raspberry Pi.
- Most directly relevant to Kawai CA99 (MIDI out → Raspberry Pi → LED strip under keys).

### B. Piano-lights-sw (ddribin)
- URL: https://github.com/ddribin/piano-lights-sw
- Language: Python / Raspberry Pi
- How it works: Reads MIDI Note On/Off events, maps notes to HSV spectrum.
  Adjustable saturation/brightness via potentiometers. Lightweight.

### C. midi-light-py (dodgyrabbit)
- URL: https://github.com/dodgyrabbit/midi-light-py
- Language: Python (Raspberry Pi)
- How it works: Wall-mounted ambient light script. Processes MIDI inputs in real time,
  creates mood/ambient effects on addressable LED strips.

### D. LightSync-MIDI (Yogarathinam)
- URL: https://github.com/Yogarathinam/LightSync-MIDI
- Language: Python GUI + ESP32 firmware
- How it works: Python GUI maps MIDI inputs to WS2812B/ARGB LED strips via ESP32 microcontroller.
  Supports 61, 76, and 88-key layouts. Controllable colors, brightness, effects.
  Created: July 2024.

### E. music-to-led (tfrere)
- URL: https://github.com/tfrere/music-to-led
- Language: Python + Arduino + Electron
- How it works: Open source app for real-time audio AND MIDI visualizations on LED strips.
  16 visualization effects, 8 mods. Effects changeable live via dedicated MIDI channels.
  More complex/robust setup.

### F. midi-piano-lights (cohnt)
- URL: https://github.com/cohnt/midi-piano-lights
- Language: Python scripts
- How it works: LED strip connected to electric keyboard with MIDI output. Collection of scripts.

### G. midi-lights (ohnoitsalobo)
- URL: https://github.com/ohnoitsalobo/midi-lights
- Language: Arduino (ESP8266)
- How it works: Lights LED strip in response to MIDI received on ESP8266 serial port.

### H. midi-visualiser (benjaminrall)
- URL: https://github.com/benjaminrall/midi-visualiser
- Language: Python + Pygame
- How it works: MIDI player/visualiser. Auto-assigns different colors to notes from different
  MIDI channels.

### I. Raspberry Pi article (Aaron Chambers)
- URL: https://www.raspberrypi.com/news/... (Apr 10, 2019)
- Bind MIDI inputs to LED lights using Raspberry Pi + Python.

==========================================================================
## 2. AUDIO / MP3 REACTIVE LED PROJECTS (FFT Beat Detection)
==========================================================================

### A. audio-reactive-led-strip (scottlawsonbc) ← THE CLASSIC
- URL: https://github.com/scottlawsonbc/audio-reactive-led-strip
- Language: Python + ESP8266 or Raspberry Pi
- How it works: Real-time LED strip music visualization. FFT → frequency bands (bass/mid/treble)
  → color/brightness commands sent via Wi-Fi UDP to ESP8266.
  THE canonical reference for audio-reactive LED projects.

### B. dancyPi-audio-reactive-led (ibielopolskyi)
- URL: https://github.com/ibielopolskyi/dancyPi-audio-reactive-led
- Language: Python (Raspberry Pi)
- How it works: Analyzes system audio using numpy, visualizes on LED strips. Can be adapted to
  send color/brightness data to Govee API endpoints. Master-client architecture.

### C. music-to-led (tfrere) — also handles audio
- URL: https://github.com/tfrere/music-to-led  (same as above)
- Does both MIDI and audio reactive visualization.

### D. FastLED Audio Examples
- URL: https://fastled.io/docs (advanced audio examples)
- FFT analysis, beat detection, various visualization techniques for addressable LEDs.

### E. Instructables / Medium tutorials
- "Make Lights React to Audio" (Instructables, Feb 15 2015)
- "Music to LED strip tutorial (using Fourier Transform)" (Medium, Yolanda Luque H.)
- These explain the FFT pipeline: microphone → PyAudio → numpy FFT → bass bin peaks → beats.

==========================================================================
## 3. GOVEE + MUSIC SYNC (Custom, Beyond Official App)
==========================================================================

### A. LumiSync (Minlor) ← MOST DIRECTLY USEFUL FOR GOVEE
- URL: https://github.com/Minlor/LumiSync
- Language: Python (PyQt6 GUI)
- How it works: Desktop app that captures PC audio output OR microphone and syncs to Govee
  lights dynamically using BLE (Bluetooth Low Energy). Real-time music sync.
  Tags: python, led, govee, govee-api, govee-light.

### B. govee-control-scripts (tayiorbeii)
- URL: https://github.com/tayiorbeii/govee-control-scripts
- Language: Python
- How it works: Scripts to control Govee lights via the Govee API. Requires API key from
  Govee app (Profile → Gear → API key request).

### C. govee-py (wez)
- URL: https://github.com/wez/govee-py
- Language: Python
- How it works: Python library for Govee HTTP and LAN APIs. Built for Home Assistant.
  Supports LAN device discovery (zero-delay local UDP control). Foundation for custom scripts.
  Related: hacs-govee-lan repo for Home Assistant integration.

### D. govee2mqtt (wez)
- URL: https://github.com/wez/govee2mqtt
- Language: Python / Home Assistant Add-On
- How it works: HA Add-On for Govee local LAN API. Supports setting DIY Scenes on Govee lights.
  Can set custom color scenes via MQTT bridge.

### E. Govee LAN API (Official)
- URL: https://lan.govee.com
- Protocol: Local UDP on port 4003 (device) and 4001 (host). Zero-delay local control.
  Commands: {"msg":{"cmd":"colorwc","data":{"color":{"r":255,"g":0,"b":0},"colorTemInKelvin":0}}}
  Requires: Enable "LAN Control" in Govee app device settings + firmware update.

### F. govee-py2 (Sxzo)
- URL: https://github.com/Sxzo/Govee-Python-Library  (pip install govee-py2)
- Simple Python interface for Govee smart lights.

### G. Govee Music Sync Box (hardware)
- URL: https://us.govee.com (hardware product, ~)
- Official hardware sync box. Controls Govee lights in same space. But limited to Govee ecosystem.

### H. Reddit community scripts
- r/Govee: "I developed a script that syncs smart lights with RPM" (Jul 13, 2024)
- Various DIY approaches documented. Some use screen-capture color averaging + Govee API.

==========================================================================
## 4. NOTE → COLOR MAPPING SCHEMES
==========================================================================

### A. Scriabin's Clavier à Lumières (Circle of Fifths mapping)
Wikipedia: https://en.wikipedia.org/wiki/Clavier_%C3%A0_lumi%C3%A8res
Following the CIRCLE OF FIFTHS (not chromatic scale):
  C  → Red (intense/deep red)
  G  → Orange-yellow
  D  → Yellow
  A  → Green
  E  → Sky blue (moonshine/frost)
  B  → Bright blue / steel blue  
  F# → Bright blue / violet-purple
  Db → Violet
  Ab → Purple / violet
  Eb → Rose / flesh (glint of steel)
  Bb → Rose / flesh
  F  → Deep red / bright red
Note: When ORDERED BY CIRCLE OF FIFTHS, colors follow a spectrum — this is not accidental.
Scriabin linked "lighter colors" (blues/violets) to "spirit" and darker shades to "matter" (theosophical).

### B. Common Chromesthesia / Pitch-Class to Hue (software projects)
  C  → Red      (0°)
  C# → Red-Orange (30°)
  D  → Orange   (60°)
  D# → Yellow-Orange
  E  → Yellow   (90°)
  F  → Yellow-Green
  F# → Green    (150°)
  G  → Cyan     (180°)
  G# → Light Blue
  A  → Blue     (210°)
  A# → Indigo
  B  → Violet   (270°)
This maps the 12 pitch classes evenly around the color wheel (30° per semitone).

### C. Linear MIDI Note → Hue (simplest, used in piano-lights-sw, LightSync-MIDI)
  hue = note_number / 127.0  (0.0 to 1.0, then HSV → RGB)
  Low notes = red end, high notes = violet end of spectrum.
  Velocity (0-127) → brightness (Value in HSV).

### D. Circle of Fifths / Chroma Circle (used in advanced projects)
  Maps 12 notes of chromatic scale to color wheel.
  C=Red, C#=Red-Orange, D=Orange ... wrapping around at B.
  Mimics most common forms of genuine musical chromesthesia.

### E. Synthesia Synesthesia (rileyjshaw)
- URL: https://github.com/rileyjshaw/synthesia
- React/Canvas web project. Maps distinct MIDI notes to specific colors in browser.

### F. Chromestesia (Python/Raspberry Pi project)
- Listens to electronic keyboard, turns on mapped RGB LEDs to color of note being played.

==========================================================================
## 5. MIDI-SYNC (EASY) vs MP3-SYNC (FFT NEEDED)
==========================================================================

### PATH A: MIDI → Light (EASY — you have discrete events) ← KAWAI CA99 NATURAL FIT
The Kawai CA99 has MIDI output (USB-MIDI and standard MIDI DIN).
Pipeline:
  CA99 MIDI out → USB → PC/Raspberry Pi → Python (mido or python-rtmidi)
                                         → map note to color (HSV/Scriabin)
                                         → send to Govee via LAN API (UDP)
                                         → Govee lights react in real time

Advantages:
- ZERO latency for beats: note_on event fires EXACTLY when key is pressed
- No audio processing needed — you get pitch + velocity + timing for free
- Velocity maps directly to brightness
- note_on → light ON, note_off → light OFF or fade
- Chord detection is trivial (multiple simultaneous note_on events)
- Libraries: mido (pure Python), python-rtmidi (faster, C++ backend)

Code skeleton:
  import mido
  # Listen for MIDI events
  with mido.open_input() as port:
      for msg in port:
          if msg.type == 'note_on' and msg.velocity > 0:
              hue = msg.note / 127.0
              brightness = msg.velocity / 127
              # → Send to Govee LAN API

### PATH B: MP3 / AUDIO → Light (HARDER — needs FFT analysis)
When playing back recorded audio (MP3/WAV) and no MIDI is available.
Pipeline:
  Audio stream → PyAudio (capture) → numpy FFT (frequency analysis)
               → extract bass/beat bins (50-150 Hz peaks = beat)
               → map amplitude to brightness + frequency to color
               → send to Govee via LAN API

Steps:
1. Audio capture: PyAudio (microphone or loopback/system audio)
2. FFT: numpy.fft.rfft() on audio chunks (e.g., 1024 samples at 44100 Hz)
3. Beat detection: monitor energy in low freq bins; peak = beat
   - Simple: energy threshold / onset detection
   - Library: librosa (beat_track, onset_detect), aubio (onset/beat)
   - Web: Web Audio API AnalyserNode.getByteFrequencyData()
4. Color: map dominant frequency to hue, amplitude to brightness
5. Send: HTTP/UDP to Govee LAN API

Key libraries:
- librosa: beat_track(), tempo detection, onset_detect (best for offline MP3)
- aubio: real-time onset/beat detection (faster, for live audio)
- scipy.signal.fft: manual FFT if you want low-level control
- PyAudio / sounddevice: audio capture from mic or system output

Latency challenge: Audio analysis adds ~50-200ms lag. Govee LAN API adds ~10-20ms.
For live performance, MIDI is far superior.

### HYBRID APPROACH (Recommended for Kawai CA99 owner):
- When PLAYING the piano: use MIDI path (real-time, exact, zero-latency)
- When LISTENING to MP3: use audio reactive path (FFT beat detection)
- LumiSync (Govee BLE) or custom script using govee-py (LAN) handles both modes

==========================================================================
## 6. HOME ASSISTANT AS HUB FOR GOVEE + AUTOMATIONS
==========================================================================

### Integration: "Govee Lights Local" (official HA integration)
- Settings → Devices & Services → Add Integration → "Govee Lights Local"
- Requires: LAN Control enabled in Govee app + same WiFi network
- Discovers devices automatically via UDP broadcast
- Control: color, brightness, effects, on/off

### MIDI → Home Assistant bridge
- Tool: midi2mqtt (GitHub) — listens to hardware MIDI, publishes events to MQTT broker
- Then in HA: automation trigger on specific MIDI event payload (note_on, specific CC value)
- Action: call light.turn_on for Govee device with RGB + brightness

### LedFx integration
- LedFx: open-source audio visualization tool (https://www.ledfx.app)
- Real-time audio beat analysis → syncs color frames to HA lights via API
- HA can control LedFx via its own API

### Typical HA automation flow:
  Trigger: MQTT message from midi2mqtt (note_on C4)
  Condition: (optional, e.g., time of day)
  Action: light.turn_on {entity_id: govee_strip, rgb_color: [255, 0, 0], brightness: 200}

### Govee Community: DIY Scenes
- govee2mqtt (wez) supports setting DIY Scenes on Govee lights from HA
- DIY Scenes = custom color segment patterns, can be synced to music beats

==========================================================================
## 7. RECOMMENDED PROJECT FOR KAWAI CA99 OWNER
==========================================================================

SIMPLEST DIRECT PATH:
1. Use Piano-LED-Visualizer (onlaj) as reference/starting point
   → https://github.com/onlaj/Piano-LED-Visualizer
2. Connect CA99 USB-MIDI to Raspberry Pi (or Windows PC)
3. Use mido to capture note_on/off events
4. Map notes to colors using:
   - Option A: Scriabin circle-of-fifths color table (artistic, traditional)
   - Option B: hue = note/127.0 (smooth gradient, visually striking)
   - Option C: pitch class (note % 12) → 12 fixed Scriabin colors
5. Send colors to Govee via LAN API (wez/govee-py) OR via Home Assistant

FOR GOVEE SPECIFICALLY:
- LumiSync (Minlor) is the closest "plug and play" Govee music sync script
  → https://github.com/Minlor/LumiSync (uses BLE)
- wez/govee-py is best for custom Python scripting via LAN API
  → https://github.com/wez/govee-py

==========================================================================
## KEY URLS SUMMARY
==========================================================================
GitHub Projects:
- https://github.com/onlaj/Piano-LED-Visualizer
- https://github.com/ddribin/piano-lights-sw
- https://github.com/dodgyrabbit/midi-light-py
- https://github.com/Yogarathinam/LightSync-MIDI
- https://github.com/tfrere/music-to-led
- https://github.com/scottlawsonbc/audio-reactive-led-strip
- https://github.com/ibielopolskyi/dancyPi-audio-reactive-led
- https://github.com/Minlor/LumiSync
- https://github.com/wez/govee-py
- https://github.com/wez/govee2mqtt
- https://github.com/tayiorbeii/govee-control-scripts
- https://github.com/benjaminrall/midi-visualiser
- https://github.com/rileyjshaw/synthesia

Wikipedia / Reference:
- https://en.wikipedia.org/wiki/Clavier_%C3%A0_lumi%C3%A8res (Scriabin color-tone mapping)

Home Assistant:
- https://www.home-assistant.io/integrations/govee_ble/ 
- https://www.home-assistant.io/integrations/govee_light_local/

LedFx:
- https://www.ledfx.app

==========================================================================
END OF SUMMARY
==========================================================================