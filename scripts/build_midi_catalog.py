#!/usr/bin/env python3
"""Build the CA99 built-in MIDI library for the Synthesia module.

Authoritative source = reference/appui-extract/music.json — the song catalog
extracted from Kawai's PianoRemote APK. It maps every built-in MIDI to a real
title, composer, function (lesson / concertMagic / hymn / pianoMusic / relax /
soundDemo) and category (Beyer 106, Czerny 100, Premier Piano 1A, ...).

For each catalogued song we copy its .mid (reference/midi/<smfPath>) into
app/midi/<function-slug>/<file> so the self-contained PWA can fetch it, then
write app/midi/catalog.json. MIDI files present on disk but absent from
music.json (alternate model demos: ES7*, anime tunes, ...) go into an "other"
folder with a filename-derived title.

Re-run when reference data changes:  python scripts/build_midi_catalog.py
reference/ is the single source of truth; app/midi/ is a generated artifact.
"""
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "reference", "midi")
MUSIC = os.path.join(ROOT, "reference", "appui-extract", "music.json")
DST = os.path.join(ROOT, "app", "midi")

# function value -> (slug, emoji, bilingual label)   [display order]
FUNCTIONS = [
    ("lesson", "lesson", "📚", "教程练习 Lessons"),
    ("pianoMusic", "piano", "🎹", "钢琴名曲 Piano Music"),
    ("concertMagic", "concert", "🎩", "Concert Magic"),
    ("hymn", "hymn", "⛪", "赞美诗 Hymns"),
    ("relax", "relax", "🌙", "放松音乐 Relax"),
    ("soundDemo", "demo", "🔊", "音色示范 Sound Demo"),
    ("other", "other", "🎵", "其他 Other"),
]
FN_SLUG = {fn: slug for fn, slug, _, _ in FUNCTIONS}
FN_META = {slug: {"slug": slug, "emoji": e, "label": lbl, "count": 0}
           for fn, slug, e, lbl in FUNCTIONS}


def clean_title(name, composer):
    name = (name or "").strip().strip('"').strip()
    composer = (composer or "").strip()
    if not name:
        return ""
    if composer and composer.lower() not in name.lower():
        return f"{name} · {composer}"
    return name


def main():
    if not os.path.isfile(MUSIC):
        print(f"ERROR: music.json not found: {MUSIC}", file=sys.stderr)
        return 1
    if not os.path.isdir(SRC):
        print(f"ERROR: source midi dir not found: {SRC}", file=sys.stderr)
        return 1

    entries = json.load(open(MUSIC, encoding="utf-8"))
    files = sorted(f for f in os.listdir(SRC) if f.lower().endswith((".mid", ".midi")))
    fileset = set(files)

    # fresh output
    if os.path.isdir(DST):
        shutil.rmtree(DST)
    os.makedirs(DST, exist_ok=True)

    songs = []
    seen = set()  # dedupe by smfPath (some entries share a file)
    for e in entries:
        smf = e.get("smfPath", "")
        if not smf or smf in seen or smf not in fileset:
            continue
        seen.add(smf)
        fn = e.get("function", "") or "other"
        slug = FN_SLUG.get(fn, "other")
        title = clean_title(e.get("name"), e.get("composer"))
        if not title:
            title = os.path.splitext(smf)[0].replace("_", " ")
        d = os.path.join(DST, slug)
        os.makedirs(d, exist_ok=True)
        shutil.copy2(os.path.join(SRC, smf), os.path.join(d, smf))
        FN_META[slug]["count"] += 1
        songs.append({
            "file": smf,
            "title": title,
            "composer": (e.get("composer") or "").strip(),
            "cat": (e.get("category") or "").strip(),
            "fn": slug,
            "path": f"midi/{slug}/{smf}",
        })

    # leftover files not referenced by music.json -> "other"
    for f in files:
        if f in seen:
            continue
        slug = "other"
        d = os.path.join(DST, slug)
        os.makedirs(d, exist_ok=True)
        shutil.copy2(os.path.join(SRC, f), os.path.join(d, f))
        FN_META[slug]["count"] += 1
        songs.append({
            "file": f,
            "title": os.path.splitext(f)[0].replace("_", " ").strip(),
            "composer": "",
            "cat": "",
            "fn": slug,
            "path": f"midi/{slug}/{f}",
        })

    def natkey(s):
        key = (s["cat"] or "~", s["title"])
        return [int(t) if t.isdigit() else t.lower()
                for part in key for t in re.split(r"(\d+)", str(part))]
    songs.sort(key=lambda s: (s["fn"], natkey(s)))

    categories = [FN_META[slug] for _, slug, _, _ in FUNCTIONS if FN_META[slug]["count"] > 0]
    catalog = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "reference/appui-extract/music.json (Kawai CA99 built-in songs)",
        "total": len(songs),
        "categories": categories,
        "songs": songs,
    }
    with open(os.path.join(DST, "catalog.json"), "w", encoding="utf-8") as fh:
        json.dump(catalog, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(songs)} songs into {len(categories)} groups -> app/midi/")
    for c in categories:
        print(f"  {c['emoji']} {c['label']}: {c['count']}")
    # sub-category coverage
    subcats = sorted({s["cat"] for s in songs if s["cat"]})
    print(f"  ({len(subcats)} sub-categories from music.json)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
