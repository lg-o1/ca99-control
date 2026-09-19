"""Fill gap to 1000 MIDIs by searching OnlineSequencer with fresh queries."""
import json, os, sys, time, subprocess, base64, struct, re, hashlib

OUT_DIR = "D:/workspaces/tmp/top100-midi"
PDF_DIR = os.path.join(OUT_DIR, "pdf")
INDEX = os.path.join(OUT_DIR, "index.json")
CLI = "D:/workspaces/vscode/tools/browserctl/dist/browserctl-cli/cli.mjs"
LOG = os.path.join(OUT_DIR, "fill1000.log")

# Fresh queries - focus on well-known songs likely on OnlineSequencer
SONGS = [
    # Top pop hits 2020-2026
    "Blinding Lights", "Levitating", "Save Your Tears", "Peaches", "Kiss Me More",
    "Stay", "Industry Baby", "Montero", "Good 4 U", "drivers license",
    "positions", "deja vu", "Butter", "Permission to Dance", "My Universe",
    "Heat Waves", "As It Was", "About Damn Time", "Anti-Hero", "Unholy",
    "Flowers", "Kill Bill", "Calm Down", "Vampire", "Paint The Town Red",
    "Greedy", "Water", "Cruel Summer", "Espresso", "Beautiful Things",
    # Classic rock
    "Stairway to Heaven", "Hotel California", "Bohemian Rhapsody", "Comfortably Numb",
    "Sweet Child O Mine", "November Rain", "Dream On", "Free Bird",
    "Kashmir", "Black Dog", "Whole Lotta Love", "Purple Haze",
    "All Along the Watchtower", "Smoke on the Water", "Iron Man",
    "Back in Black", "Thunderstruck", "Highway to Hell",
    "Enter Sandman", "Nothing Else Matters", "One Metallica",
    "Smells Like Teen Spirit", "Come As You Are", "Heart Shaped Box",
    # Video game OST (high hit rate on OnlineSequencer)
    "Minecraft Sweden", "Minecraft Wet Hands", "Minecraft Haggstrom",
    "Minecraft Mice on Venus", "Minecraft Danny",
    "Undertale Megalovania", "Undertale His Theme", "Undertale Spider Dance",
    "Undertale Bonetrousle", "Undertale Waterfall", "Undertale Memory",
    "Deltarune", "Deltarune Big Shot", "Deltarune Smart Race",
    "Hollow Knight", "Hollow Knight City of Tears", "Hollow Knight Greenpath",
    "Celeste", "Celeste Resurrections", "Celeste Reach for the Summit",
    "Cuphead", "Cuphead Floral Fury", "Cuphead Die House",
    "Geometry Dash", "Geometry Dash Stereo Madness", "Geometry Dash Fingerdash",
    "Geometry Dash Deadlocked", "Geometry Dash Electroman",
    "Terraria", "Terraria Boss 2", "Terraria Plantera",
    "Stardew Valley", "Stardew Valley Spring", "Stardew Valley Summer",
    "FNAF", "FNAF 2", "FNAF Sister Location",
    "Among Us", "Among Us Drip", "Impostor",
    "Roblox", "Roblox Theme", "Roblox Oof",
    "Genshin Impact", "Genshin Mondstadt", "Genshin Liyue",
    "Omori", "Omori Duet", "Omori My Time",
    "Touhou Bad Apple", "Touhou UN Owen", "Touhou Beloved Tomboyish Girl",
    "Kirby Gourmet Race", "Kirby Green Greens",
    "Wii Sports", "Wii Shop", "Mii Channel", "Mii Maker",
    "Pokemon", "Pokemon Center", "Pokemon Battle",
    "Sonic Green Hill", "Sonic Chemical Plant", "Sonic City Escape",
    "Megaman", "Megaman 2 Wily", "Megaman X",
    # Anime
    "Unravel Tokyo Ghoul", "Gurenge Demon Slayer", "Zankyou Sanka",
    "Inferno Fire Force", "Black Catcher", "Blue Bird Naruto",
    "Silhouette Naruto", "Sign Naruto", "Naruto Main Theme",
    "One Piece We Are", "Binks Sake", "One Piece Opening",
    "Attack on Titan", "Shinzou wo Sasageyo", "Rumbling",
    "My Hero Academia Peace Sign", "My Hero Academia You Say Run",
    "Jujutsu Kaisen Kaikai Kitan", "Jujutsu Specialz",
    "Spy x Family Mixed Nuts", "Chainsaw Man Kick Back",
    "Bocchi the Rock", "Frieren", "Solo Leveling",
    "Death Note", "Tokyo Drift", "Initial D",
    "Dragon Ball", "Dragon Ball Cha La", "Sailor Moon",
    "Neon Genesis Evangelion", "Cruel Angel Thesis",
    "Cowboy Bebop Tank", "Steins Gate",
    # Disney / Movie
    "Let It Go", "Into the Unknown", "Show Yourself",
    "How Far I'll Go", "You're Welcome Moana", "We Don't Talk About Bruno",
    "Surface Pressure", "What Else Can I Do", "Waiting on a Miracle",
    "A Whole New World", "Friend Like Me", "Prince Ali",
    "Circle of Life", "Hakuna Matata", "Can You Feel the Love Tonight",
    "Beauty and the Beast", "Be Our Guest", "Under the Sea",
    "Part of Your World", "Kiss the Girl",
    "Coco Remember Me", "Coco Un Poco Loco",
    "Tangled I See the Light", "Tangled When Will My Life Begin",
    "Frozen Do You Want to Build a Snowman",
    "Wish", "Strange World",
    # Meme / Internet
    "Megalovania", "Never Gonna Give You Up", "All Star",
    "Gangnam Style", "Baby Shark", "Nyan Cat",
    "Caramelldansen", "Ievan Polkka", "Astronomia Coffin Dance",
    "Running in the 90s", "Deja Vu Initial D", "Gas Gas Gas",
    "Rush E", "Flight of the Bumblebee", "Giorno Theme",
    "Il Vento d'Oro", "Lacrimosa", "Requiem Mozart",
    "Turkish March", "Rondo Alla Turca",
    # Musical theater
    "Hamilton", "Hamilton My Shot", "Hamilton Satisfied",
    "Phantom of the Opera", "Music of the Night",
    "Les Miserables", "I Dreamed a Dream", "One Day More",
    "Wicked Defying Gravity", "Wicked Popular",
    "Dear Evan Hansen Waving", "Heathers",
    # R&B / Soul / Jazz
    "Fly Me to the Moon", "Autumn Leaves", "Take Five",
    "Blue Bossa", "Misty", "Georgia On My Mind",
    "What a Wonderful World", "Somewhere Over the Rainbow",
    "Moon River", "The Way You Look Tonight",
]

EXPORT_JS = r"""(function(){
try{
var origSave=window.saveBlob;var result=null;
window.saveBlob=function(name,parts,mime){
var u8=parts[0];var bin='';for(var i=0;i<u8.length;i++)bin+=String.fromCharCode(u8[i]);
result={midi:btoa(bin),name:name,size:u8.length};
};
exportMidi();
window.saveBlob=origSave;
if(!result)return JSON.stringify({error:'no result from exportMidi'});
return JSON.stringify(result);
}catch(ex){return JSON.stringify({error:ex.message});}
})()"""

def fix_midi_offsets(data):
    positions = []
    idx = 0
    while True:
        p = data.find(b'MTrk', idx)
        if p < 0: break
        positions.append(p)
        idx = p + 4
    if len(positions) < 1: return data
    out = bytearray(data[:positions[0]])
    for i, pos in enumerate(positions):
        end = positions[i+1] if i+1 < len(positions) else len(data)
        chunk_data = data[pos+8:end]
        real_len = len(chunk_data)
        out += b'MTrk' + struct.pack('>I', real_len) + chunk_data
    return bytes(out)

CONVERT_ONE_PY = r'''
import music21, json, sys, os
os.environ["LILYPOND_PATH"] = r"C:\Users\siweili\scoop\apps\lilypond\current\bin\lilypond.exe"
fp, out = sys.argv[1], sys.argv[2]
try:
    m = music21.converter.parse(fp)
    notes = len(m.flatten().notes)
    tracks = len(m.parts)
    if notes < 200: diff = "Beginner"
    elif notes < 500: diff = "Easy"
    elif notes < 1500: diff = "Medium"
    elif notes < 3000: diff = "Hard"
    else: diff = "Expert"
    lp = m.write("lilypond")
    import subprocess as sp
    sp.run([r"C:\Users\siweili\scoop\apps\lilypond\current\bin\lilypond.exe",
            "--pdf", "-o", out.replace(".pdf",""), str(lp)],
           capture_output=True, timeout=120)
    ok = os.path.exists(out)
    print(json.dumps({"ok": ok, "notes": notes, "tracks": tracks, "difficulty": diff}))
except Exception as e:
    print(json.dumps({"ok": False, "error": str(e)}))
'''

def run_node(*args):
    r = subprocess.run(["node", CLI] + list(args), capture_output=True, text=True, timeout=30)
    return r.stdout.strip()

def search_and_download(query, tab_id, index, log_f):
    """Search for a song, download first result MIDI."""
    url = f"https://onlinesequencer.net/sequences?search={query.replace(' ','+')}"
    run_node("--tab", tab_id, "page", "open", url, "--json")
    time.sleep(4)
    
    # Extract sequence links via JS eval
    js = "JSON.stringify([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>/onlinesequencer\\.net\\/\\d{5,}/.test(h)))"
    links_raw = run_node("--tab", tab_id, "page", "eval", js)
    seq_ids = []
    try:
        val = links_raw
        if '"value"' in val:
            val = json.loads(val).get('value','[]')
        urls = json.loads(val)
        seq_ids = list(dict.fromkeys(re.findall(r'/(\d{5,})', ' '.join(urls))))
    except:
        seq_ids = re.findall(r'/(\d{5,})', links_raw)
    
    if not seq_ids:
        log_f.write(f"  SEARCH FAIL: {query}\n")
        log_f.flush()
        return None
    
    seq_id = seq_ids[0]
    if seq_id in index:
        log_f.write(f"  SKIP (exists): {query} -> #{seq_id}\n")
        log_f.flush()
        return None
    
    # Open the sequence
    run_node("--tab", tab_id, "page", "open", f"https://onlinesequencer.net/{seq_id}", "--json")
    time.sleep(4)
    # Wait for song.notes to be populated
    for _ in range(6):
        check = run_node("--tab", tab_id, "page", "eval", "typeof song !== 'undefined' && song.notes && song.notes.length > 0 ? 'ready' : 'loading'")
        if 'ready' in check:
            break
        time.sleep(2)
    
    # Export MIDI via JS
    result = run_node("--tab", tab_id, "page", "eval", EXPORT_JS)
    try:
        # browserctl wraps eval result in {"value": "...", "type": "string"}
        wrapper = json.loads(result)
        if isinstance(wrapper, dict) and 'value' in wrapper:
            data = json.loads(wrapper['value'])
        else:
            data = wrapper
    except:
        try:
            data = json.loads(result.strip().strip('"').replace('\\"','"'))
        except:
            log_f.write(f"  EXPORT FAIL: {query} #{seq_id}\n")
            log_f.flush()
            return None
    
    if 'error' in data:
        log_f.write(f"  EXPORT ERROR: {query} #{seq_id}: {data['error']}\n")
        log_f.flush()
        return None
    
    midi_b64 = data.get('midi','')
    if not midi_b64:
        log_f.write(f"  NO MIDI DATA: {query} #{seq_id}\n")
        log_f.flush()
        return None
    
    raw = base64.b64decode(midi_b64)
    raw = fix_midi_offsets(raw)
    
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', query)[:80]
    fname = f"{safe_name}.mid"
    fpath = os.path.join(OUT_DIR, fname)
    
    if os.path.exists(fpath):
        h = hashlib.md5(raw).hexdigest()[:6]
        fname = f"{safe_name}_{h}.mid"
        fpath = os.path.join(OUT_DIR, fname)
    
    with open(fpath, 'wb') as f:
        f.write(raw)
    
    return {"seq_id": seq_id, "file": fname, "size": len(raw), "query": query}

def convert_to_pdf(fname):
    fpath = os.path.join(OUT_DIR, fname)
    pdf_name = fname.replace('.mid', '.pdf')
    pdf_path = os.path.join(PDF_DIR, pdf_name)
    
    script = os.path.join(OUT_DIR, '_convert_one.py')
    with open(script, 'w') as f:
        f.write(CONVERT_ONE_PY)
    
    try:
        r = subprocess.run([sys.executable, script, fpath, pdf_path],
                          capture_output=True, text=True, timeout=240)
        if r.returncode == 0:
            d = json.loads(r.stdout.strip())
            return d
    except:
        pass
    return {"ok": False}

def main():
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    
    with open(INDEX, encoding="utf-8") as f:
        index = json.load(f)
    
    os.makedirs(PDF_DIR, exist_ok=True)
    
    # Open browser tab
    tab_out = run_node("page", "open", "https://onlinesequencer.net", "--json")
    try:
        tab_id = str(json.loads(tab_out)['data']['tabId'])
    except:
        m = re.search(r'"tabId"\s*:\s*(\d+|"[^"]+")', tab_out)
        tab_id = m.group(1).strip('"') if m else None
    
    if not tab_id:
        print("ERROR: Could not open browser tab")
        return
    
    time.sleep(3)
    
    downloaded = 0
    pdf_ok = 0
    pdf_fail = 0
    search_fail = 0
    
    with open(LOG, 'w', encoding='utf-8') as log_f:
        log_f.write(f"=== Fill to 1000 — starting from query {start}, index has {len(index)} entries ===\n")
        
        for i, query in enumerate(SONGS[start:], start):
            current_total = len([f for f in os.listdir(OUT_DIR) if f.endswith('.mid')])
            if current_total >= 1000:
                log_f.write(f"\n*** REACHED 1000 MIDIs ({current_total}) ***\n")
                break
            
            log_f.write(f"[{i+1}/{len(SONGS)}] Searching: {query}\n")
            log_f.flush()
            
            result = search_and_download(query, tab_id, index, log_f)
            if not result:
                search_fail += 1
                continue
            
            downloaded += 1
            seq_id = result['seq_id']
            log_f.write(f"  Saved: {result['file']} ({result['size']} bytes)\n")
            
            # Convert to PDF
            d = convert_to_pdf(result['file'])
            if d.get('ok'):
                pdf_ok += 1
                result['difficulty'] = d.get('difficulty','')
                result['notes'] = d.get('notes',0)
                result['tracks'] = d.get('tracks',0)
                log_f.write(f"  PDF: OK:{d.get('notes',0)}\n")
            else:
                pdf_fail += 1
                log_f.write(f"  PDF: FAIL\n")
            
            index[seq_id] = {
                "name": query,
                "file": result['file'],
                "size": result['size'],
                "query": query,
                "source": "fill1000",
                **({k: result[k] for k in ('difficulty','notes','tracks') if k in result})
            }
            
            # Save index every 10 downloads
            if downloaded % 10 == 0:
                with open(INDEX, 'w', encoding='utf-8') as f:
                    json.dump(index, f, indent=2, ensure_ascii=False)
                log_f.write(f"  --- Saved index ({len(index)} entries) ---\n")
            
            log_f.flush()
        
        # Final save
        with open(INDEX, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
        
        total_mid = len([f for f in os.listdir(OUT_DIR) if f.endswith('.mid')])
        total_pdf = len([f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')])
        
        summary = f"\n=== DONE === Downloaded: {downloaded}, PDF OK: {pdf_ok}, PDF Fail: {pdf_fail}, Search Fail: {search_fail}\nTotal: {total_mid} MIDIs, {total_pdf} PDFs\n"
        log_f.write(summary)
        print(summary)

if __name__ == "__main__":
    main()
