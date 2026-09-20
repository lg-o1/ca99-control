"""
Re-download all MIDIs using the site's native exportMidi() function.
The previous download had a critical bug: note names (strings like "A6") were
passed directly as MIDI pitch values, resulting in all notes being pitch 0.

This script uses the site's own exportMidi() which correctly maps note names
to MIDI numbers via midiNoteNamesToIndex.

Usage: python redownload_midi.py [--start N] [--limit N] [--output DIR]
"""
import json, base64, subprocess, time, sys, os, re, argparse

BROWSERCTL = "D:/workspaces/vscode/tools/browserctl/dist/browserctl-cli/cli.mjs"
CATALOG = r"D:\tmp\ca99-control\app\midi-collection\catalog.json"
OUTPUT_DIR = r"D:\workspaces\tmp\redownload_midi"

def run_bc(args, timeout=20):
    cmd = ["node", BROWSERCTL] + args + ["--json"]
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        if r.returncode == 0 and r.stdout.strip():
            return json.loads(r.stdout)
        return None
    except:
        return None

def download_one(seq_id, out_path, tab_id=None):
    """Open sequence page, wait for load, call site's exportMidi(), capture blob."""
    url = f"https://onlinesequencer.net/{seq_id}"
    
    # Open page
    r = run_bc(["page", "open", url], timeout=30)
    if not r:
        return False, "failed to open page"
    tid = r.get("data", {}).get("tabId")
    if not tid:
        return False, "no tabId"
    
    # Wait for page to load (song.notes must exist)
    time.sleep(5)
    
    # Check if song loaded
    r = run_bc(["--tab", str(tid), "page", "eval",
        "typeof song !== 'undefined' && song.notes && song.notes.length > 0 ? song.notes.length : 0"],
        timeout=15)
    note_count = 0
    if r:
        val = r.get("data", {}).get("value")
        if val:
            note_count = int(val) if str(val).isdigit() else 0
    
    if note_count == 0:
        # Wait more and retry
        time.sleep(5)
        r = run_bc(["--tab", str(tid), "page", "eval",
            "typeof song !== 'undefined' && song.notes && song.notes.length > 0 ? song.notes.length : 0"],
            timeout=15)
        if r:
            val = r.get("data", {}).get("value")
            if val:
                note_count = int(val) if str(val).isdigit() else 0
    
    if note_count == 0:
        # Close tab
        run_bc(["--tab", str(tid), "page", "close"], timeout=5)
        return False, "song not loaded"
    
    # Intercept saveBlob and call site's own exportMidi()
    export_js = """
new Promise(function(resolve, reject) {
    try {
        var origSaveBlob = window.saveBlob;
        window.saveBlob = function(name, parts, mime) {
            try {
                var bytes = parts[0];
                var b = '';
                for(var i=0; i<Math.min(bytes.length, 500000); i++) b += String.fromCharCode(bytes[i]);
                window._capturedMidi = {name: name, b64: btoa(b), size: bytes.length};
                window.saveBlob = origSaveBlob;
                resolve('ok:' + bytes.length);
            } catch(e) {
                window.saveBlob = origSaveBlob;
                reject(e.message);
            }
        };
        exportMidi();
    } catch(e) {
        reject(e.message);
    }
})
"""
    r = run_bc(["--tab", str(tid), "page", "eval", export_js], timeout=30)
    if not r:
        run_bc(["--tab", str(tid), "page", "close"], timeout=5)
        return False, "export eval failed"
    
    val = r.get("data", {}).get("value", "")
    if not str(val).startswith("ok:"):
        run_bc(["--tab", str(tid), "page", "close"], timeout=5)
        return False, f"export failed: {val}"
    
    # Get captured data
    r = run_bc(["--tab", str(tid), "page", "eval", "JSON.stringify(window._capturedMidi)"], timeout=15)
    if not r:
        run_bc(["--tab", str(tid), "page", "close"], timeout=5)
        return False, "capture read failed"
    
    captured_json = r.get("data", {}).get("value", "")
    try:
        captured = json.loads(captured_json)
        midi_data = base64.b64decode(captured["b64"])
    except:
        run_bc(["--tab", str(tid), "page", "close"], timeout=5)
        return False, "decode failed"
    
    # Verify: check for non-zero note bytes
    has_real_notes = False
    for i in range(len(midi_data) - 2):
        if (midi_data[i] & 0xF0) == 0x90 and midi_data[i+2] > 0:
            if midi_data[i+1] > 0:
                has_real_notes = True
                break
    
    if not has_real_notes:
        run_bc(["--tab", str(tid), "page", "close"], timeout=5)
        return False, "still has pitch=0 (export bug not fixed)"
    
    # Save
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "wb") as f:
        f.write(midi_data)
    
    # Close tab
    run_bc(["--tab", str(tid), "page", "close"], timeout=5)
    return True, f"{len(midi_data)} bytes, {note_count} notes"

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0, help="0=all")
    parser.add_argument("--output", default=OUTPUT_DIR)
    parser.add_argument("--progress-file", default=None)
    args = parser.parse_args()
    
    # Load index (seq_id -> song info)
    INDEX = r"D:\workspaces\tmp\top100-midi\index.json"
    with open(INDEX) as f:
        idx = json.load(f)
    
    entries = []
    for seq_id, info in idx.items():
        entries.append({
            "seq_id": seq_id,
            "file": info.get("file", f"{seq_id}.mid"),
            "title": info.get("name", seq_id),
        })
    
    print(f"Total songs with seq_id: {len(entries)}")
    
    # Progress tracking
    progress_file = args.progress_file or os.path.join(args.output, "progress.json")
    done = set()
    if os.path.exists(progress_file):
        with open(progress_file) as f:
            done = set(json.load(f).get("done", []))
        print(f"Already done: {len(done)}")
    
    os.makedirs(args.output, exist_ok=True)
    
    # Process
    entries = entries[args.start:]
    if args.limit > 0:
        entries = entries[:args.limit]
    
    success = 0
    fail = 0
    for i, e in enumerate(entries):
        sid = e["seq_id"]
        if sid in done:
            continue
        
        # Output path: flat directory with seq_id in filename
        out_path = os.path.join(args.output, e["file"])
        
        print(f"[{i+1}/{len(entries)}] {e['title']} (seq={sid})...", end=" ", flush=True)
        ok, msg = download_one(sid, out_path)
        if ok:
            success += 1
            done.add(sid)
            print(f"OK - {msg}")
        else:
            fail += 1
            print(f"FAIL - {msg}")
        
        # Save progress every 10
        if (success + fail) % 10 == 0:
            with open(progress_file, "w") as f:
                json.dump({"done": list(done), "success": success, "fail": fail}, f)
        
        # Small delay between downloads
        time.sleep(1)
    
    # Final save
    with open(progress_file, "w") as f:
        json.dump({"done": list(done), "success": success, "fail": fail}, f)
    
    print(f"\nDone! Success: {success}, Failed: {fail}, Total done: {len(done)}")

if __name__ == "__main__":
    main()
