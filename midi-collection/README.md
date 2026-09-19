# 🎹 Piano CA99 MIDI Collection

A curated collection of **1000 MIDI piano pieces** downloaded from [OnlineSequencer.net](https://onlinesequencer.net/), with automated PDF sheet music generation.

## What's Included

- **1000 MIDI files** spanning classical, pop, game, anime, and film music
- **PDF sheet music** auto-generated via music21 + LilyPond
- **Difficulty ratings** (Beginner → Expert) based on note density, range, and polyphony
- **`index.json`** metadata catalog with song names, difficulty, note counts, and track info

## Scripts

### `scripts/batch_download.py`
Main batch downloader that searches OnlineSequencer.net for piano MIDIs, downloads them, converts to PDF via music21/LilyPond, and maintains `index.json`. Targets 1000 songs with deduplication and quality filtering.

### `scripts/batch_supplement.py`
Supplementary downloader for filling gaps — uses alternative search queries and sources to reach the 1000-song target.

### `scripts/backfill_difficulty.py`
Retroactively computes difficulty ratings for MIDI files missing that metadata, updating `index.json` in place.

## Dependencies

- Python 3.10+
- `music21` — MIDI parsing and MusicXML conversion
- `mido` — lightweight MIDI analysis for difficulty estimation
- [LilyPond](https://lilypond.org/) — PDF engraving
- `httpx` — async HTTP downloads
- Chromium browser (for OnlineSequencer search via browserctl)

## Song Menu

See [SONG_MENU.md](SONG_MENU.md) for the full 1000-song catalog sorted by popularity.

## License

Scripts are provided as-is for personal/educational use. MIDI sequences are user-created content from OnlineSequencer.net.
