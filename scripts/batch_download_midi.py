"""
Batch download top 100 MIDI from OnlineSequencer via browserctl.
Searches popular songs, extracts sequence IDs, then downloads .mid files.

⚠️ WARNING: The EXPORT_JS in this script is BROKEN — it produces pitch=0 for all notes
because song.notes[].type is a string like "A6", not an integer MIDI number.
Use redownload_midi.py instead, which intercepts the site's own exportMidi()/saveBlob.
"""
import subprocess, json, time, os, re, sys, base64

CLI = "D:/workspaces/vscode/tools/browserctl/dist/browserctl-cli/cli.mjs"
OUT_DIR = "D:/workspaces/tmp/top100-midi"
LOG = os.path.join(OUT_DIR, "download.log")
INDEX = os.path.join(OUT_DIR, "index.json")

os.makedirs(OUT_DIR, exist_ok=True)

SONGS = [
    "river flows in you", "fur elise", "moonlight sonata", "canon in d",
    "megalovania", "never gonna give you up", "bohemian rhapsody",
    "all of me john legend", "someone like you adele", "hallelujah",
    "despacito piano", "shape of you", "let it go frozen", "take on me",
    "careless whisper", "still dre", "interstellar main theme",
    "harry potter hedwig", "pirates caribbean", "zelda theme",
    "mario theme", "minecraft sweden", "undertale megalovania",
    "giorno theme jojo", "attack on titan", "demon slayer gurenge",
    "spy family mixed nuts", "one piece", "naruto sadness sorrow",
    "jojo golden wind", "tokyo ghoul unravel", "my hero academia",
    "dance monkey", "blinding lights", "bad guy billie eilish",
    "lovely billie eilish", "stay kid laroi", "heat waves",
    "as it was harry styles", "anti hero taylor swift",
    "flowers miley cyrus", "cruel summer", "vampire olivia rodrigo",
    "paint the town red", "espresso sabrina carpenter",
    "birds of a feather billie eilish", "ocean eyes billie eilish",
    "happier marshmello", "everything i wanted billie eilish",
    "photograph ed sheeran", "perfect ed sheeran", "thinking out loud",
    "shallow lady gaga", "a thousand years", "say something",
    "swan lake", "clair de lune", "gymnopedie satie",
    "spring waltz chopin", "nocturne chopin", "turkish march mozart",
    "comptine amelie", "la vie en rose", "fly me to the moon",
    "autumn leaves", "blue danube waltz",
    "tetris theme", "sonic green hill", "kirby gourmet race",
    "among us drip", "mii channel theme", "wii sports",
    "animal crossing theme", "rush e",
    "flight of bumblebee", "fantasie impromptu chopin",
    "wedding march", "happy birthday", "jingle bells",
    "twinkle twinkle", "ode to joy", "ave maria",
    "chopsticks piano", "heart and soul", "lean on me",
    "imagine john lennon", "yesterday beatles", "let it be beatles",
    "dont stop believin", "africa toto", "take five dave brubeck",
    "bella ciao", "final countdown", "sandstorm darude",
    "coffin dance", "nyan cat", "rickroll piano",
    "bad apple touhou", "unravel piano", "blue bird naruto",
    "crossing field sao", "cruel angel thesis evangelion",
    "your lie in april", "a cruel angel thesis"
]

def run_cli(*args, timeout=20):
    try:
        r = subprocess.run(["node", CLI] + list(args),
                          capture_output=True, text=True, timeout=timeout)
        if r.stdout.strip():
            return json.loads(r.stdout)
    except:
        pass
    return None

def log(msg):
    print(msg)
    with open(LOG, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

def get_existing_mids():
    """Get set of .mid files already in output dir"""
    return {f for f in os.listdir(OUT_DIR) if f.endswith('.mid')}

def search_sequence(tab_id, query):
    """Navigate to search and return first result (id, name)"""
    url = f"https://onlinesequencer.net/sequences?search={query.replace(' ', '+')}&sort=popular"
    r = run_cli("--tab", str(tab_id), "page", "open", url, "--json")
    if not r or not r.get("ok", r.get("data")):
        return None
    time.sleep(3)
    
    ids = run_cli("--tab", str(tab_id), "page", "eval",
        'JSON.stringify([...document.querySelectorAll("a")]'
        '.filter(a=>/^\\/\\d{4,}$/.test(a.pathname)&&a.textContent.trim().length>0)'
        '.slice(0,1).map(a=>({n:a.textContent.trim().substring(0,70),id:a.pathname.replace("/","")})))',
        "--json")
    
    if ids and ids.get("ok"):
        seqs = json.loads(ids["data"]["value"])
        if seqs:
            return seqs[0]["id"], seqs[0]["n"]
    return None

EXPORT_JS = (
    '(function(){'
    'let title=getTitle();let bpm=song.settings.bpm||120;let channelId=0;let lastTime=0;'
    'function et(t){const d=t-lastTime;lastTime=t;return new Midi.Delta(Math.round(d*96))}'
    'let mpqn=1/(bpm/60)*1e6;let file=new Midi.File(384);let first=true;'
    'for(let i of new Set(song.notes.map(n=>n.instrument))){'
    'let iv=song.settings.instruments[i]?.volume??1;'
    'let notes=song.notes.filter(n=>n.instrument===i).sort((a,b)=>a.time-b.time);'
    'if(!notes.length)continue;let track=new Midi.Track();'
    'if(first){track.appendEvent(new Midi.Event.TimeSignatureEvent(getTimeSig(),4));'
    'track.appendEvent(new Midi.Event.SetTempoEvent(mpqn));first=false}'
    'lastTime=0;let ch;if(typeof instMgr!=="undefined"&&instMgr.isDrum&&instMgr.isDrum(i)){ch=9}'
    'else{ch=channelId;if(channelId===8)channelId=10;channelId++}'
    'let baseId=typeof instMgr!=="undefined"&&instMgr.baseId?instMgr.baseId(i):i;'
    'let det=song.settings.instruments[i]?.detune??0;'
    'track.appendEvent(new Midi.Event.ProgramChangeEvent(ch,baseId),new Midi.Delta(0));'
    'if(det!==0)track.appendEvent(new Midi.Event.PitchBendEvent(ch,det),new Midi.Delta(0));'
    'let evs=[];for(let n of notes){'
    'evs.push([{time:n.time,type:n.type,isOn:true},Math.max(n.volume*iv*50,0)]);'
    'evs.push([{time:n.time+n.length,type:n.type,isOn:false},0])}'
    'evs.sort((a,b)=>a[0].time===b[0].time?(a[0].isOn?1:-1):(a[0].time-b[0].time));'
    'for(let e of evs){let d=et(e[0].time);let p=e[0].type;'
    'let ev=e[0].isOn?new Midi.Event.NoteOnEvent(ch,p,e[1]):new Midi.Event.NoteOffEvent(ch,p,0);'
    'track.appendEvent(ev,d)}'
    'track.appendEvent(new Midi.Event.EndOfTrackEvent());file.addTrack(track)}'
    'let data=file.getData();let bytes=new Uint8Array(data);'
    'let b="";for(let i=0;i<bytes.length;i++)b+=String.fromCharCode(bytes[i]);'
    'return JSON.stringify({title:title,b64:btoa(b),size:bytes.length})})()'
)

def download_midi(tab_id, seq_id):
    """Navigate to sequence page, generate MIDI in browser, extract as base64"""
    import base64
    r = run_cli("--tab", str(tab_id), "page", "open",
                f"https://onlinesequencer.net/{seq_id}", "--json")
    time.sleep(5)
    
    r = run_cli("--tab", str(tab_id), "page", "eval", EXPORT_JS, "--json", timeout=30)
    if not r or not r.get("ok"):
        return None
    
    try:
        val = json.loads(r["data"]["value"])
        midi_bytes = base64.b64decode(val["b64"])
        title = val.get("title", str(seq_id))
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', title)[:60].strip()
        dest = f"{safe_name}.mid"
        if os.path.exists(os.path.join(OUT_DIR, dest)):
            dest = f"{safe_name}_{seq_id}.mid"
        dst = os.path.join(OUT_DIR, dest)
        with open(dst, "wb") as f:
            f.write(midi_bytes)
        return dest, len(midi_bytes)
    except Exception as e:
        log(f"  EXTRACT ERROR: {e}")
        return None

def main():
    # Load existing index
    index = {}
    if os.path.exists(INDEX):
        with open(INDEX, encoding="utf-8") as f:
            index = json.load(f)
    
    # Open one tab and reuse it
    r = run_cli("page", "open", "https://onlinesequencer.net/sequences", "--json")
    if not r:
        log("ERROR: Cannot open browser")
        return
    tab_id = r.get("data", {}).get("tabId")
    if not tab_id:
        log("ERROR: No tab ID")
        return
    time.sleep(3)
    
    downloaded = 0
    skipped = 0
    failed = 0
    
    for i, song in enumerate(SONGS):
        if downloaded >= 100:
            break
            
        log(f"[{i+1}/{len(SONGS)}] Searching: {song}")
        
        result = search_sequence(tab_id, song)
        if not result:
            log(f"  NOT FOUND")
            failed += 1
            continue
        
        seq_id, seq_name = result
        
        # Skip if already downloaded
        if seq_id in index:
            log(f"  SKIP (already have): {seq_id} = {seq_name}")
            skipped += 1
            downloaded += 1
            continue
        
        log(f"  FOUND: {seq_id} = {seq_name}")
        
        result_dl = download_midi(tab_id, seq_id)
        if result_dl:
            dest, size = result_dl
            index[seq_id] = {"name": seq_name, "file": dest, "query": song, "size": size}
            downloaded += 1
            log(f"  DOWNLOADED: {dest} ({size} bytes) [{downloaded}/100]")
        else:
            log(f"  DOWNLOAD FAILED")
            failed += 1
        
        # Save index periodically
        if downloaded % 5 == 0:
            with open(INDEX, "w", encoding="utf-8") as f:
                json.dump(index, f, ensure_ascii=False, indent=2)
    
    # Final save
    with open(INDEX, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    
    log(f"\n=== DONE === Downloaded: {downloaded}, Skipped: {skipped}, Failed: {failed}")
    log(f"Files in {OUT_DIR}")

if __name__ == "__main__":
    main()
