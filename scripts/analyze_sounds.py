import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'D:\tmp\ca99-control\reference\appui-full\lib\kawaipianojs\json'
sound = json.load(open(BASE + r'\sound.json', encoding='utf-8'))
sysex = json.load(open(BASE + r'\sysex.json', encoding='utf-8'))

# Filter sounds that apply to CA99
# Check what fields indicate CA99 applicability
print('=== sound.json sample full entry ===')
print(json.dumps(sound[0], ensure_ascii=False, indent=2))

# Count sounds by model field
print('\n=== sounds by model field ===')
models = {}
for s in sound:
    m = s.get('model', '?')
    models[m] = models.get(m, 0) + 1
for m, c in sorted(models.items(), key=lambda x: -x[1])[:15]:
    print(f'  {m}: {c}')

# CA99 column in sysex - how is applicability marked?
print('\n=== sysex CA99 column values ===')
ca99vals = {}
for e in sysex:
    v = e.get('CA99', '?')
    ca99vals[str(v)] = ca99vals.get(str(v), 0) + 1
print(ca99vals)

# A CA99-applicable sound entry: check if there's a per-model filter in sound.json
print('\n=== sound.json: does it have CA99 column? ===')
print('keys:', [k for k in sound[0].keys()])
