# Kids Learning Piano: Apps / OSS Projects / Sight-Reading / Score Scanning

> A **parallel** track to this project (programmatic CA99 control): let the kid use CA99 to learn piano, get feedback, stay engaged.
> Key: CA99 is a standard MIDI device — every keypress (note + velocity + pedal) streams via Bluetooth/USB in real-time, so all apps/projects work. **No SQLite hacking needed.**

## CA99 connection to learning apps (confirmed)

| Connection | Supported | Latency |
|------------|:---:|---------|
| Bluetooth MIDI (on by default) | ✅ | ~5-15ms (fine for kids) |
| USB to Host (USB-B port) | ✅ | ~1-2ms (best) |
| MIDI DIN 5-pin | ❌ | — |

⚠️ **Critical pairing rule**: never pair from the iOS/Android OS Bluetooth menu — always pair inside the app's own MIDI settings.
Wired zero-latency: USB-B→USB-A cable + Apple Camera Adapter → iPad.

## 1. Consumer learning apps (turnkey; listen via MIDI, judge correctness + encourage)

| App | Style | Price | Best for |
|-----|-------|-------|----------|
| 🥇 **Simply Piano** | Falling notes + star rewards + backing track, like a video game | Free basic + sub | Bored kids, most gamified |
| 🥈 **Synthesia** | Falling notes, Wait Mode (waits for correct key) | One-time buy | Visual learners + custom MIDI |
| **Flowkey** | Real hand-cam videos + Wait Mode | Sub | Pop/game songs |
| **Yousician** | Guitar-Hero style, stars + streaks + leaderboards | Free trial + sub | Kids who love high scores |
| 🆓 **Piano Marvel** | Reddit's top free MIDI app, per-note grading, strong sight-reading | Free tier | Best value for serious learners |
| 🆓 **Hoffman Academy** | Free video lessons, best for beginners | Free | Onboarding |

⚠️ **Simply Piano side-effect**: kids may memorize colors/guess notes instead of really reading — pair with sight-reading apps below.
**MIDI vs mic**: MIDI (cable/Bluetooth) is far more accurate/reliable than microphone.

## 2. Sight-reading trainers (encourage when kid plays correctly; fixes "can't read notes")

| App | Style | Price |
|-----|-------|-------|
| 🥇 **Note Rush** | Shows a note, kid plays on piano, listens via MIDI/mic; themes (rockets/soccer) + 5 stars; only waits, never "fails" (zero frustration); enforces correct octave | Sub |
| **NoteWorks** | "Hungry monster eats the correct notes" | $4.99 |
| **My Note Games** | 6 mini-games, listens to real playing, multi-account family | Free + $6.99 full |

## 3. Score scanning → MIDI (photograph existing sheet music for the kid to play along)

| App/Tool | Strength | Price |
|----------|----------|-------|
| 🥇 **PlayScore 2** | Best-in-class OMR, multi-voice/lyrics/dynamics, exports MIDI/MusicXML | Free tier + sub |
| **Sheet Music Scanner** | Reliable on simple scores | <$5 buy |
| **Audiveris** (OSS) | Desktop OMR gold standard, whole books, manual correction (85-95%) | Free |
| **oemer / homr** (OSS) | Phone photo → MusicXML (homr more accurate) | Free (Python) |

Pipeline: photograph score → PlayScore 2/Audiveris → export .mid → feed to Synthesia/Piano-LED-Visualizer.

## 4. Open-source DIY projects (best fit for a technical parent)

| Project | Stars | What it is |
|---------|:---:|-----------|
| 🥇 **onlaj/Piano-LED-Visualizer** | 741★ | **Best match for "color lights"**! RPi + LED strip, keys light up; Learn mode lights which key to press, waits for correct, wrong keys go red, loop hard passages. Hardware ~$75-100, pre-built image (no coding) |
| 🥇 **pianobooster/PianoBooster** | 556★ | Classic OSS "learn piano with MIDI", "Follow you" mode: stops when you stop, waits for correct; different sounds for right/wrong; built-in course. Cross-platform |
| **ImAxel0/Openthesia** | 202★ | Synthesia OSS clone, wait-for-key, SoundFont real piano, Windows |
| **leandrodaf/pianalyze** | 17★ | Hidden gem! Real-time "Perfect/Good/OK" grading (exactly the encouragement feedback), <30µs latency |
| **Bewelge/MIDIano** (midiano.com) | ~500★ | Zero-install! Chrome + USB MIDI keyboard → open page → falling notes + wait mode. Best to try first |
| **Audiveris** | ~1800★ | Score scan → MusicXML → MIDI |

> Full OSS comparison in `reference/research/midi-light-summary.md` (all GitHub URLs + hardware BOM + difficulty ratings).

## 5. Recommended path for the kid (easy → advanced)

**Step 1 (tonight, zero cost/install)**:
- CA99 Bluetooth → iPad → install Simply Piano (most gamified, fixes boredom) or Chrome → midiano.com
- Kid plays correctly → stars/advance — instant "it understands my keys" feedback

**Step 2 (add sight-reading, fix root cause)**:
- Add Note Rush (note-reading game that encourages via MIDI) + free Piano Marvel (serious sight-reading)

**Step 3 (DIY cool lights, kid gets very excited)**:
- Build Piano-LED-Visualizer (~$75 RPi + LED strip) — keys light up + Learn mode shows which key + wrong = red

**Step 4 (scan existing scores to play along)**:
- PlayScore 2 or OSS Audiveris → photograph → MIDI → feed Synthesia/Piano-LED-Visualizer

## 6. Relationship to this project

| This track (kid learning) | This project (your creative control) |
|---------------------------|--------------------------------------|
| Use ready-made apps/projects | Build custom PWA (Approach A, see EVALUATION.md) |
| Goal: learn, read notes, stay engaged | Goal: switch voices/adjust VT/auto-accompaniment/light sync |
| CA99 sends one MIDI stream to learning app | CA99 sends another MIDI stream to your PWA |

Both run in parallel without conflict — CA99 can feed multiple MIDI consumers simultaneously.

---

> Sources: 4-5 Sonnet/research subagents, raw data in SQLite `browserctl/ca99-midi/`, `piano-apps`, `omr`, etc.
