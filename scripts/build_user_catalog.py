#!/usr/bin/env python3
"""Build a manifest for the user's own MIDI library (Synthesia "我的曲库").

The score-follow module can discover user songs two ways:
  1. Runtime directory scan — works out of the box with `python -m http.server`
     (it serves auto-generated directory listings the app parses). Just drop
     .mid files under app/<root>/<category>/ and click "重新扫描".
  2. This manifest — for static hosts that DON'T list directories. Run this
     script; it scans app/<root>/ and writes app/<root>/userlib.json, which the
     app loads in preference to a live scan.

Layout: app/<root>/<category>/<song>.mid  (sub-folder name becomes the category;
.mid placed directly under <root> go to "未分类").

Usage:
  python scripts/build_user_catalog.py            # root = app/data
  python scripts/build_user_catalog.py mysongs    # root = app/mysongs
"""
import json
import os
import re
import sys

APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")


def file_title(name):
    return re.sub(r"\s+", " ", os.path.splitext(name)[0].replace("_", " ")).strip()


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else "data"
    base = os.path.join(APP, root)
    if not os.path.isdir(base):
        print(f"ERROR: {base} does not exist. Create it and add <category>/<song>.mid", file=sys.stderr)
        return 1

    categories = []
    songs = []

    def add(slug, label, emoji, files, dirname):
        mids = sorted(f for f in files if f.lower().endswith((".mid", ".midi")))
        if not mids:
            return
        categories.append({"slug": slug, "emoji": emoji, "label": label, "count": len(mids)})
        for f in mids:
            rel = "/".join([root] + ([dirname] if dirname else []) + [f])
            songs.append({"file": f, "title": file_title(f), "composer": "",
                          "cat": "", "fn": slug, "path": rel})

    # subdirectories = categories
    subdirs = sorted(d for d in os.listdir(base) if os.path.isdir(os.path.join(base, d)))
    for i, d in enumerate(subdirs):
        add(f"ud{i}", d, "📁", os.listdir(os.path.join(base, d)), d)
    # loose .mid directly under root
    loose = [f for f in os.listdir(base) if os.path.isfile(os.path.join(base, f))]
    add("uroot", "未分类", "🎵", loose, None)

    manifest = {
        "base": root,
        "total": len(songs),
        "categories": categories,
        "songs": songs,
    }
    out = os.path.join(base, "userlib.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, ensure_ascii=False, separators=(",", ":"))

    print(f"Wrote {len(songs)} songs into {len(categories)} categories -> {os.path.relpath(out, APP)}")
    for c in categories:
        print(f"  {c['emoji']} {c['label']}: {c['count']}")
    if not songs:
        print(f"  (no .mid found under app/{root}/ — add <category>/<song>.mid then re-run)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
