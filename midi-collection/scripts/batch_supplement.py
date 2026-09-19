"""Quick supplement to reach 1000 MIDIs."""
import json, os, sys, time, subprocess, base64, struct, re, hashlib

OUT_DIR = "D:/workspaces/tmp/top100-midi"
PDF_DIR = os.path.join(OUT_DIR, "pdf")
INDEX = os.path.join(OUT_DIR, "index.json")
CLI = "D:/workspaces/vscode/tools/browserctl/dist/browserctl-cli/cli.mjs"

SONGS = [
    "Twinkle Twinkle Little Star", "Mary Had a Little Lamb", "Happy Birthday",
    "Jingle Bells", "Silent Night", "Deck the Halls",
    "We Wish You a Merry Christmas", "Frosty the Snowman",
    "Rudolph the Red Nosed Reindeer", "O Come All Ye Faithful",
    "Joy to the World", "The First Noel", "O Holy Night",
    "Away in a Manger", "Hark the Herald Angels Sing",
    "Little Drummer Boy", "White Christmas", "Winter Wonderland",
    "Feliz Navidad", "Auld Lang Syne",
    "Ode to Joy", "Clair de Lune",
    "Gymnopedie", "Prelude in C Major",
    "Maple Leaf Rag", "Chopsticks",
    "Take On Me", "Africa Toto",
    "Billie Jean", "Thriller", "Beat It",
    "Smooth Criminal", "Imagine John Lennon",
    "Yesterday Beatles", "Hey Jude", "Let It Be",
    "Piano Man", "Tiny Dancer", "Rocket Man",
    "Bohemian Rhapsody Queen", "Dont Stop Me Now",
    "Somebody That I Used to Know", "Pumped Up Kicks",
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
        out += b'MTrk' + struct.pack('>I', len(chunk_data)) + chunk_data
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

def main():
    with open(INDEX, encoding="utf-8") as f:
        index = json.load(f)
    os.makedirs(PDF_DIR, exist_ok=True)
    tab_out = run_node("page", "open", "https://onlinesequencer.net", "--json")
    tab_id = str(json.loads(tab_out)['data']['tabId'])
    time.sleep(3)
    downloaded = 0
    for query in SONGS:
        if len([f for f in os.listdir(OUT_DIR) if f.endswith('.mid')]) >= 1000:
            print(f"REACHED 1000!"); break
        url = f"https://onlinesequencer.net/sequences?search={query.replace(' ','+')}"
        run_node("--tab", tab_id, "page", "open", url, "--json")
        time.sleep(4)
        js = "JSON.stringify([...document.querySelectorAll('a[href]')].map(a=>a.href).filter(h=>/onlinesequencer\\.net\\/\\d{5,}/.test(h)))"
        links_raw = run_node("--tab", tab_id, "page", "eval", js)
        try:
            w = json.loads(links_raw)
            val = w.get('value','[]') if isinstance(w, dict) else links_raw
            urls = json.loads(val)
            seq_ids = list(dict.fromkeys(re.findall(r'/(\d{5,})', ' '.join(urls))))
        except:
            seq_ids = []
        if not seq_ids:
            print(f"  SEARCH FAIL: {query}"); continue
        seq_id = seq_ids[0]
        if seq_id in index:
            print(f"  SKIP: {query} -> #{seq_id}"); continue
        run_node("--tab", tab_id, "page", "open", f"https://onlinesequencer.net/{seq_id}", "--json")
        time.sleep(4)
        for _ in range(6):
            check = run_node("--tab", tab_id, "page", "eval",
                "typeof song !== 'undefined' && song.notes && song.notes.length > 0 ? 'ready' : 'loading'")
            if 'ready' in check: break
            time.sleep(2)
        result = run_node("--tab", tab_id, "page", "eval", EXPORT_JS)
        try:
            w = json.loads(result)
            data = json.loads(w['value']) if isinstance(w, dict) and 'value' in w else w
        except:
            print(f"  EXPORT FAIL: {query} #{seq_id}"); continue
        if 'error' in data or not data.get('midi'):
            print(f"  EXPORT ERROR: {query} #{seq_id}"); continue
        raw = fix_midi_offsets(base64.b64decode(data['midi']))
        safe_name = re.sub(r'[<>:"/\\|?*]', '_', query)[:80]
        fname = f"{safe_name}.mid"
        fpath = os.path.join(OUT_DIR, fname)
        if os.path.exists(fpath):
            fname = f"{safe_name}_{hashlib.md5(raw).hexdigest()[:6]}.mid"
            fpath = os.path.join(OUT_DIR, fname)
        with open(fpath, 'wb') as f: f.write(raw)
        script_path = os.path.join(OUT_DIR, '_convert_one.py')
        with open(script_path, 'w') as f: f.write(CONVERT_ONE_PY)
        pdf_path = os.path.join(PDF_DIR, fname.replace('.mid','.pdf'))
        diff_info = {}
        try:
            r = subprocess.run([sys.executable, script_path, fpath, pdf_path],
                              capture_output=True, text=True, timeout=240)
            if r.returncode == 0: diff_info = json.loads(r.stdout.strip())
        except: pass
        index[seq_id] = {"name": query, "file": fname, "size": len(raw),
            "query": query, "source": "supplement",
            **({k: diff_info[k] for k in ('difficulty','notes','tracks') if k in diff_info})}
        downloaded += 1
        print(f"  OK: {query} -> {fname} ({len(raw)} bytes)")
        if downloaded % 5 == 0:
            with open(INDEX, 'w', encoding='utf-8') as f:
                json.dump(index, f, indent=2, ensure_ascii=False)
    with open(INDEX, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)
    total_mid = len([f for f in os.listdir(OUT_DIR) if f.endswith('.mid')])
    total_pdf = len([f for f in os.listdir(PDF_DIR) if f.endswith('.pdf')])
    print(f"DONE: +{downloaded}, Total: {total_mid} MIDIs, {total_pdf} PDFs")

if __name__ == "__main__":
    main()
