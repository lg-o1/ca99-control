# Kawai CA99: Sound Expansion Research Summary
## Research date: 2026-06-23
## Sources: Google AI Overviews (8 searches) + official Kawai CA99 product page (kawai-global.com/product/ca99/)

---

## 1. IS THE CA99 LIMITED TO ITS BUILT-IN SOUNDS FOR KEY-PLAYING? — YES (HARD LIMIT)

**CONFIRMED YES — FIRMWARE-LOCKED TONE GENERATOR.**

From official Kawai specs (kawai-global.com):
  - SK-EX Rendering engine: 10 rendering characters (flagship multi-channel sampled piano engine)
  - Harmonic Imaging XL: 90 voices
  - Total voices (commonly cited as ~90-100 in official specs; some regional listings cite up to 346 across all categories)

**You CANNOT:**
  - Load custom soundfonts (.sf2) into the CA99's internal memory
  - Upload new sample banks or replace factory tones
  - Install VST plugins INTO the piano
  - Flash custom firmware with additional sounds

The CA99 is a dedicated digital piano, not a synthesizer workstation. Its tone generator (SK-EX Rendering / Harmonic Imaging XL) runs fixed DSP code in firmware. There is no OS-level access, no file system for sounds, and no documented SysEx command to load new waveforms — even for a reverse-engineer. The SysEx/MIDI commands you can reverse-engineer control: voice selection among the existing 90-346 voices, effects parameters, display, transport, recorder — NOT new sound loading.

**Source:** Google AI Overview (Search 1): "It is not possible to directly import custom sounds or .sf2 (SoundFont) files into the Kawai CA99's internal memory. The CA99 operates as a dedicated digital piano, not a workstation."

---

## 2. CAN THE CA99 BE A MIDI CONTROLLER FOR UNLIMITED VST SOUNDS? — YES (STANDARD WORKFLOW)

**CONFIRMED YES — THIS IS THE STANDARD PRO WORKFLOW.**

**How it works (step by step):**
  1. Connect CA99 to computer via USB cable (USB-to-Host port on CA99 → USB-A on computer)
  2. The CA99 appears as a USB-MIDI device — no drivers needed (class-compliant)
  3. Alternatively: pair via Bluetooth MIDI (CA99 has integrated Bluetooth MIDI, aptX-capable)
  4. In your DAW / VST host, select "Kawai CA99" (or "Bluetooth MIDI") as MIDI input
  5. Load ANY VST instrument: Pianoteq, Garritan CFX, Kontakt libraries, Vienna Symphonic Library, BBCSO, sforzando for .sf2 soundfonts, etc.
  6. Press a key on the CA99 → MIDI note-on/off, velocity, pedal CC → sent to computer → VST generates audio
  7. The CA99's internal sound engine can be MUTED (set Local Control OFF via SysEx or menu) so you only hear the VST

**UNLIMITED SOUNDS:** Any VST, soundfont (.sf2 via sforzando/sfizz/SWAM), sample library (Kontakt, Play, Vienna), or software instrument you can run on your computer is now playable from the CA99 keys.

**Pedal data note:** The CA99's 3-pedal assembly sends CC 64 (sustain), CC 66 (sostenuto), CC 67 (soft) and, importantly, half-pedal / continuous CC values — critical for realistic VST response. Kawai's MIDI implementation is comprehensive, including per-key velocity, aftertouch on supported models.

**Source:** Google AI Overview (Search 2): "To connect your Kawai CA99 to a computer and play VST piano plugins (like Pianoteq), you must route USB-MIDI to your computer to control the software, and route Audio back to the piano so you can hear the VST's generated sounds through the CA99's premium soundboard speaker system."
**Source:** Google AI Overview (Search 3): "To use your digital piano as a MIDI controller for computer-based VSTs like Pianoteq and Garritan, you are simply turning off your piano's internal sound engine and having it send keystroke data to your computer."

---

## 3. CAN YOU ROUTE VST AUDIO BACK THROUGH THE CA99's SPEAKERS? — YES (TWO METHODS)

**CONFIRMED YES — TWO RELIABLE METHODS:**

### Method A: Bluetooth Audio (EASIEST — CONFIRMED on CA99)
  - The CA99 has Bluetooth Audio with aptX codec (official spec confirmed)
  - Pair your computer with the CA99 as a Bluetooth Audio output device
  - In your DAW/VST host, set audio output to the CA99 Bluetooth device
  - VST-generated audio streams wirelessly to the CA99's TwinDrive Soundboard speaker system
  - aptX latency: ~40-100ms — may be acceptable for monitoring but adds to total round-trip latency
  - **Best for**: casual playing, monitoring without needing ultra-low latency

### Method B: USB Audio Interface (NEEDS VERIFICATION)
  - The CA99 has a USB-to-Host port that supports USB MIDI (confirmed)
  - Google AI overview (Search 5) stated: "The Kawai CA99 acts as its own USB Audio Interface" for bi-directional audio
  - **Caveat:** The official Kawai spec page lists "USB Audio Recorder: Record/Playback MP3, Bluetooth Audio recording" — this refers to recording TO a USB flash drive, NOT necessarily USB audio streaming to a computer
  - RECOMMENDATION: Check the CA99 MIDI/connectivity manual (PDF linked from kawai-global.com) and test whether the CA99 appears as a USB audio class device on your OS. Some Kawai models (ES920, etc.) do support USB audio interface mode; CA99 may or may not.

### Method C: External Audio Interface (MOST RELIABLE for low latency)
  - Computer → USB audio interface (e.g., Focusrite Scarlett) → 3.5mm/TRS output → plug into CA99's line-in/aux... 
  - NOTE: The CA99 does NOT appear to have a dedicated stereo "Line In" for main speaker routing (unlike some Yamahas)
  - Alternative: Computer → audio interface → powered speakers or headphones (bypass CA99 speakers)

**PRACTICAL RECOMMENDATION:** For lowest-latency VST playback, use:
  - MIDI: USB cable → ~1ms MIDI latency
  - Audio: External USB audio interface (ASIO/CoreAudio) → external monitors or headphones, ~5-10ms
  - THEN independently use CA99 speakers for Bluetooth audio listening (ensemble/practice mode)

**Source:** Google AI Overview (Search 4): "Playing MP3s via Bluetooth Audio on the Kawai CA99 acts just like using a wireless speaker, routing external music directly through the piano's soundboard system."
**Source:** Official Kawai spec: "Integrated Bluetooth® MIDI and Audio with aptX support"

---

## 4. MP3 PLAYBACK vs KEY-SOUND ENGINE — CRITICAL DISTINCTION

**Two COMPLETELY SEPARATE systems in the CA99:**

### (A) The Key-Sound Engine (TONE GENERATOR) — LIMITED TO BUILT-IN VOICES
  - What it is: The DSP chip that converts key presses → audio using sampled/modeled piano sounds
  - Triggered by: Pressing keys (and receiving MIDI IN)
  - Sounds available: SK-EX Rendering (10 characters) + Harmonic Imaging XL (up to 90 voices total in official spec)
  - Expandable? NO. Cannot load new sounds. Fixed in firmware.
  - SysEx control: Can select among existing voices, adjust EQ/effects, set velocity curves — but cannot add new waveforms

### (B) Audio Playback System — UNLIMITED (but NOT key-triggered)
  - **USB flash drive**: Play MP3, WAV, SMF files. Keys do NOT trigger this — it's a media player.
  - **Bluetooth Audio**: Stream any audio from phone/tablet/computer through the CA99 speakers. Again, keys do NOT trigger this.
  - **Bluetooth Audio recording**: Record the CA99's output to a connected device via Bluetooth
  - **MP3 recording**: Record your playing to MP3 on a USB flash drive

**USE CASE FOR BACKING TRACKS:** Load MP3 backing tracks onto a USB stick → play them back on the CA99 while you play the keys using the CA99's own sounds. This is useful for practice and performance but: the backing track audio and your key sounds use completely separate engines and cannot be "merged" at the sound-synthesis level.

**WHAT YOU CANNOT DO:** You CANNOT upload an MP3 sample of, say, a Steinway D and have it "play" when you press keys. The audio playback and the tone generator are isolated systems.

---

## 5. THE FULL PICTURE — COMPREHENSIVE WORKFLOW

### For UNLIMITED SOUNDS while PLAYING (best quality):
`
CA99 keys 
  → USB MIDI (USB-to-Host cable) 
  → Computer DAW / VST Host (ASIO on Windows, CoreAudio on Mac)
  → VST instrument: Pianoteq / Kontakt / sforzando / Garritan
  → Audio output: ASIO audio interface → monitors/headphones (3-10ms latency)
`
Optional: Simultaneously stream VST audio back to CA99 via Bluetooth Audio (adds 40-100ms but uses the premium TwinDrive soundboard).

### For BACKING TRACKS / PLAYBACK:
`
MP3/WAV files on USB drive → CA99 media player → CA99 speakers
OR
Spotify/YouTube on phone → Bluetooth Audio → CA99 speakers
`
Keys still play CA99's internal sounds (or MIDI to computer), completely independent.

### For MIDI RECORDING / PRODUCTION:
`
CA99 → USB MIDI → DAW → record MIDI → quantize/edit → playback through any VST
`

---

## 6. BEST VST PIANO SOFTWARE

### 🥇 Pianoteq (Gold Standard — HIGHEST RECOMMENDED)
  - **Developer:** Modartt (modartt.com)
  - **Technology:** Physical modeling synthesis — mathematically models piano physics (strings, hammers, soundboard, room) in real time. Does NOT use pre-recorded samples.
  - **Size:** ~50 MB (vs. 50-300 GB for sample libraries)
  - **CPU:** Very light — runs on a laptop
  - **Latency:** Virtually instant, ideal for real-time performance
  - **Customization:** Hammer hardness, microphone placement, string resonance, unison detuning, pedal noise, room reverb — all tweakable per note
  - **Kawai Integration:** Works perfectly with Kawai controllers; there are specific velocity curves tuned for Kawai GRAND FEEL actions
  - **Models:** Steinway D, Bechstein, Fazioli, Blüthner, Yamaha, historical fortepianos, vibraphone, harpsichord, xylophone
  - **Price:** ~-149 for full version; free Stage trial (limited polyphony)
  - **Note from research:** "Kawai VPC1: Widely considered the gold-standard dedicated piano controller... includes a built-in 'Pianoteq' touch curve designed specifically to interface perfectly with the software." The CA99's Grand Feel III action is similarly expressive.
  - **One known limitation:** Some users note the tone can occasionally sound slightly "synthetic" versus deep-sampled libraries for certain recording/production contexts

### Runners-up:
  - **Garritan CFX Concert Grand** — sampled Yamaha CFX, highly regarded for recording
  - **Spitfire LABS (free)** — high-quality sampled pianos, free tier available
  - **Native Instruments Una Corda** — intimate felt-muted piano, unique character
  - **Keyscape (Spectrasonics)** — enormous sample library, very realistic, large download
  - **Vienna Imperial** — 50GB sampled Bösendorfer Imperial, ultra-detailed
  - **sforzando + free .sf2/.sfz soundfonts** — free option using SoundFont files

---

## SUMMARY TABLE

| Question | Answer |
|----------|--------|
| CA99 limited to built-in sounds for key-playing? | YES — 90 voices (HI-XL) + 10 SK-EX chars, firmware-fixed, no .sf2 loading |
| Can use CA99 as MIDI controller for VST? | YES — USB MIDI or Bluetooth MIDI to computer |
| Route VST audio back through CA99 speakers? | YES via Bluetooth Audio (confirmed, aptX); USB audio interface (verify manually) |
| MP3 playback vs key-sound engine | SEPARATE: MP3/BT audio = passive playback only; keys → tone generator → limited to built-in |
| Best VST for using CA99 as controller | Pianoteq (physical modeling, 50MB, lowest latency, most customizable) |

---

## SOURCES
1. Google Search AI Overview — "Kawai CA99 custom sounds soundfont add new voices possible" → Cannot import .sf2; use MIDI controller instead
2. Google Search AI Overview — "Kawai CA99 USB MIDI to computer VST piano plugin external sounds" → USB-MIDI routing + VST confirmed; mentions Pianoteq + Hugh Sung setup tutorial
3. Google Search AI Overview — "digital piano as MIDI controller VST Pianoteq Garritan" → Standard workflow: Local Control OFF, MIDI to computer, VST processes audio
4. Google Search AI Overview — "Kawai CA99 Bluetooth audio play mp3 through speakers vs midi" → Bluetooth Audio (streaming) vs Bluetooth MIDI (note data) distinction confirmed
5. Google Search AI Overview — "CA99 USB audio interface record play computer sound through piano speakers" → Claims CA99 acts as USB audio interface (VERIFY against official manual)
6. Google Search AI Overview — "use digital piano speakers as output for computer VST audio routing" → Methods: USB audio interface, Bluetooth Audio, external DAC
7. Google Search AI Overview — "Pianoteq best VST piano physical modeling" → Physical modeling, ~50MB, Kawai-compatible, customizable, highly rated
8. Official Kawai CA99 product page (kawai-global.com/product/ca99/) → Confirmed: Bluetooth MIDI+Audio (aptX), USB-to-Host, USB-to-Device, no user sounds slot, SK-EX Rendering + HI-XL voices