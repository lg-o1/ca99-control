import json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE = r'D:\tmp\ca99-control\reference\appui-full\lib\kawaipianojs\json'
sysex = json.load(open(BASE + r'\sysex.json', encoding='utf-8'))

print('=== full schema keys ===')
print(list(sysex[0].keys()))

print('\n=== sound-related parameters (first occurrences) ===')
seen = set()
for e in sysex:
    p = e.get('parameter', '')
    if any(x in p.lower() for x in ['sound', 'voice', 'instrument', 'tone']) and p not in seen:
        seen.add(p)
        print(f"  {p} | fn={e['fn']} v1={e['v1']} v2={e['v2']} v4Type={e.get('v4Type')} v4={e.get('v4')}")

print('\n=== unique parameter names (count) ===')
params = {}
for e in sysex:
    params[e['parameter']] = params.get(e['parameter'], 0) + 1
print('total unique params:', len(params))
for p in list(params.keys())[:40]:
    print(f'  {p} ({params[p]})')

# sound.json structure
print('\n=== sound.json ===')
sound = json.load(open(BASE + r'\sound.json', encoding='utf-8'))
print('type:', type(sound).__name__)
if isinstance(sound, list):
    print('len:', len(sound))
    print('sample[0]:', json.dumps(sound[0], ensure_ascii=False)[:400])
elif isinstance(sound, dict):
    print('keys:', list(sound.keys())[:10])
    k = list(sound.keys())[0]
    print(f'sample[{k}]:', json.dumps(sound[k], ensure_ascii=False)[:400])
