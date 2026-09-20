"""
Batch convert MIDI files to PDF sheet music using music21 + LilyPond.
"""
import os, sys, time, traceback

os.environ["PYTHONIOENCODING"] = "utf-8"
import music21
from music21 import environment

env = environment.UserSettings()
env['lilypondPath'] = r'C:\Users\siweili\scoop\apps\lilypond\current\bin\lilypond.exe'

MIDI_DIR = r"D:\workspaces\tmp\top100-midi"
PDF_DIR = os.path.join(MIDI_DIR, "pdf")
LOG = os.path.join(PDF_DIR, "convert.log")

os.makedirs(PDF_DIR, exist_ok=True)

def log(msg):
    print(msg, flush=True)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

midi_files = sorted([f for f in os.listdir(MIDI_DIR) if f.endswith('.mid')])
log(f"Found {len(midi_files)} MIDI files to convert")

success = 0
failed = 0

for i, mf in enumerate(midi_files):
    base = os.path.splitext(mf)[0]
    pdf_out = os.path.join(PDF_DIR, base + ".pdf")
    
    if os.path.exists(pdf_out) and os.path.getsize(pdf_out) > 1000:
        log(f"[{i+1}/{len(midi_files)}] SKIP (exists): {mf}")
        success += 1
        continue
    
    log(f"[{i+1}/{len(midi_files)}] Converting: {mf}")
    try:
        m = music21.converter.parse(os.path.join(MIDI_DIR, mf))
        
        # Skip very large MIDIs (>500 notes) - they hang LilyPond
        note_count = len(m.flatten().notes)
        if note_count > 5000:
            log(f"  SKIP (too complex: {note_count} notes)")
            failed += 1
            continue
        
        # Write lilypond source first
        tmp_out = os.path.join(PDF_DIR, base)
        ly_file = tmp_out + '.ly'
        m.write('lilypond', fp=ly_file)
        
        # Run lilypond with timeout
        import subprocess
        lp = r'C:\Users\siweili\scoop\apps\lilypond\current\bin\lilypond.exe'
        try:
            subprocess.run(
                [lp, '--pdf', '-o', tmp_out, ly_file],
                cwd=PDF_DIR, timeout=120, capture_output=True
            )
        except subprocess.TimeoutExpired:
            log(f"  TIMEOUT (>120s)")
            failed += 1
            for ext in ['.ly', '.pdf']:
                p = tmp_out + ext
                if os.path.exists(p): os.remove(p)
            continue
        
        # Clean up .ly
        if os.path.exists(ly_file): os.remove(ly_file)
        
        if os.path.exists(pdf_out) and os.path.getsize(pdf_out) > 100:
            size = os.path.getsize(pdf_out)
            log(f"  OK: {base}.pdf ({size} bytes)")
            success += 1
        else:
            log(f"  FAILED: no PDF output")
            failed += 1
    except Exception as e:
        log(f"  FAILED: {e}")
        failed += 1

log(f"\n=== DONE === Success: {success}, Failed: {failed}")
log(f"PDFs in {PDF_DIR}")
