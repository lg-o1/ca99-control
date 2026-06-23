"""
build_ca99_data.py — 从逆向提取的 sound.json / sysex.json / vt.json
生成 app 用的精简 CA99 专属数据文件（只含 CA99 适用项）。
输出到 app/data/ 供统一 PWA 各模块共用。
"""
import json, sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SRC = r'D:\tmp\ca99-control\reference\appui-full\lib\kawaipianojs\json'
OUT = r'D:\tmp\ca99-control\app\data'
os.makedirs(OUT, exist_ok=True)

# ---- 1. CA99 sounds (346) ----
sound = json.load(open(SRC + r'\sound.json', encoding='utf-8'))
ca99_sounds = []
for s in sound:
    if s.get('model') == 'CA99':
        ca99_sounds.append({
            'id': s['id'],
            'name': s['name'],
            'nameJa': s.get('nameJa', ''),
            'category': s.get('category', ''),
            'tag': s.get('tag', ''),
            'pc': s['pc'], 'msb': s['msb'], 'lsb': s['lsb'],
        })
json.dump(ca99_sounds, open(OUT + r'\sounds.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print(f'sounds.json: {len(ca99_sounds)} CA99 voices')

# categories
cats = {}
for s in ca99_sounds:
    cats.setdefault(s['category'], 0)
    cats[s['category']] += 1
print('  categories:', dict(sorted(cats.items(), key=lambda x: -x[1])))

# ---- 2. CA99 sysex params (only CA99-applicable) ----
sysex = json.load(open(SRC + r'\sysex.json', encoding='utf-8'))
ca99_params = []
for e in sysex:
    if str(e.get('CA99', '')).strip() == '':
        continue  # not applicable to CA99
    ca99_params.append({
        'parameter': e['parameter'],
        'value': e['value'],
        'valueJa': e.get('valueJa', ''),
        'fn': e['fn'], 'v1': e['v1'], 'v2': e['v2'],
        'v4Type': e.get('v4Type', ''), 'v4': e.get('v4', ''),
        'v5Type': e.get('v5Type', ''), 'v5': e.get('v5', ''),
        'unit': e.get('unit', ''),
    })
json.dump(ca99_params, open(OUT + r'\sysex.json', 'w', encoding='utf-8'),
          ensure_ascii=False, indent=1)
print(f'sysex.json: {len(ca99_params)} CA99 SysEx param entries')

# ---- 3. VT params (Virtual Technician) ----
try:
    vt = json.load(open(SRC + r'\vt.json', encoding='utf-8'))
    json.dump(vt, open(OUT + r'\vt.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    n = len(vt) if isinstance(vt, list) else len(vt.keys())
    print(f'vt.json: {n} entries (copied)')
except Exception as ex:
    print('vt.json skip:', ex)

# ---- 4. rhythm ----
try:
    rhythm = json.load(open(SRC + r'\rhythm.json', encoding='utf-8'))
    json.dump(rhythm, open(OUT + r'\rhythm.json', 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    n = len(rhythm) if isinstance(rhythm, list) else len(rhythm.keys())
    print(f'rhythm.json: {n} entries (copied)')
except Exception as ex:
    print('rhythm.json skip:', ex)

print('\nDone -> ', OUT)
