"""Backfill difficulty for existing MIDIs in index.json that lack it."""
import json, os, sys, subprocess

OUT_DIR = "D:/workspaces/tmp/top100-midi"
PDF_DIR = os.path.join(OUT_DIR, "pdf")
INDEX = os.path.join(OUT_DIR, "index.json")

ANALYZE_PY = r'''
import music21, json, sys
fp = sys.argv[1]
m = music21.converter.parse(fp)
notes = len(m.flatten().notes)
tracks = len(m.parts)
if notes < 200: diff = "Beginner"
elif notes < 500: diff = "Easy"
elif notes < 1500: diff = "Medium"
elif notes < 3000: diff = "Hard"
else: diff = "Expert"
print(json.dumps({"notes":notes,"tracks":tracks,"difficulty":diff}))
'''

def main():
    with open(INDEX, encoding="utf-8") as f:
        index = json.load(f)
    
    script = os.path.join(OUT_DIR, '_analyze.py')
    with open(script, 'w') as f:
        f.write(ANALYZE_PY)
    
    updated = 0
    failed = 0
    for seq_id, info in index.items():
        if 'difficulty' in info:
            continue
        filepath = os.path.join(OUT_DIR, info.get('file', ''))
        if not os.path.exists(filepath):
            continue
        try:
            r = subprocess.run([sys.executable, script, filepath],
                              capture_output=True, text=True, timeout=120)
            if r.returncode == 0:
                d = json.loads(r.stdout.strip())
                info['difficulty'] = d['difficulty']
                info['notes'] = d['notes']
                info['tracks'] = d['tracks']
                updated += 1
                if updated % 50 == 0:
                    print(f"  Updated {updated}...", flush=True)
                    with open(INDEX, "w", encoding="utf-8") as f:
                        json.dump(index, f, indent=2, ensure_ascii=False)
        except:
            failed += 1
    
    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    print(f"Done: {updated} updated, {failed} failed")

if __name__ == "__main__":
    main()
