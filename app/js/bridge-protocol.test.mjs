import {
  PROTOCOL_VERSION, encodeList, encodeSelectInput, encodeSelectOutput,
  encodeSend, parseEvent, normalizePorts, BridgeClient,
} from './bridge-protocol.js';

let pass = 0, fail = 0;
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa === sb) { pass++; } else { fail++; console.error(`FAIL: ${msg}\n  got ${sa}\n  exp ${sb}`); }
}
function ok(c, msg) { if (c) pass++; else { fail++; console.error(`FAIL: ${msg}`); } }

// ---- command encoders produce valid, parseable JSON ----
eq(JSON.parse(encodeList()), { cmd: 'list' }, 'encodeList');
eq(JSON.parse(encodeSelectInput('abc')), { cmd: 'selectInput', id: 'abc' }, 'encodeSelectInput');
eq(JSON.parse(encodeSelectInput(null)), { cmd: 'selectInput', id: null }, 'encodeSelectInput null');
eq(JSON.parse(encodeSelectOutput('xyz')), { cmd: 'selectOutput', id: 'xyz' }, 'encodeSelectOutput');
eq(JSON.parse(encodeSend([0xF0, 0x40, 0xF7])), { cmd: 'send', bytes: [240, 64, 247] }, 'encodeSend');
// byte masking: values >255 wrap to low 8 bits, negatives handled
eq(JSON.parse(encodeSend([256 + 5, -1, 300])), { cmd: 'send', bytes: [5, 255, 44] }, 'encodeSend masks to 0-255');
// accepts typed array
eq(JSON.parse(encodeSend(Uint8Array.from([144, 60, 100]))), { cmd: 'send', bytes: [144, 60, 100] }, 'encodeSend Uint8Array');

// ---- parseEvent ----
eq(parseEvent('{"evt":"ports","inputs":[]}').evt, 'ports', 'parse ports');
eq(parseEvent('not json').evt, 'error', 'bad json -> error event');
eq(parseEvent('{"foo":1}').evt, 'error', 'missing evt -> error');
eq(parseEvent('123').evt, 'error', 'non-object -> error');
// already-object passthrough
eq(parseEvent({ evt: 'hello', version: 1 }).version, 1, 'parse object passthrough');

// ---- normalizePorts ----
const np = normalizePorts({
  inputs: [{ id: 5, name: 'CA99' }],
  outputs: [{ id: 'o1', name: 'Out', manufacturer: 'Kawai' }],
});
eq(np, {
  inputs: [{ id: '5', name: 'CA99', manufacturer: '' }],
  outputs: [{ id: 'o1', name: 'Out', manufacturer: 'Kawai' }],
}, 'normalizePorts coerces id to string + fills blanks');
eq(normalizePorts({}), { inputs: [], outputs: [] }, 'normalizePorts handles empty');
eq(normalizePorts(null), { inputs: [], outputs: [] }, 'normalizePorts handles null');

// ---- BridgeClient: outbound commands go through injected send ----
let sentLog = [];
const client = new BridgeClient({ send: (s) => sentLog.push(s) });

client.list();
eq(JSON.parse(sentLog[0]), { cmd: 'list' }, 'client.list sends list');

client.selectInput('in-1');
eq(JSON.parse(sentLog[1]), { cmd: 'selectInput', id: 'in-1' }, 'client.selectInput sends');
eq(client.selectedInput, 'in-1', 'client tracks selectedInput');

client.selectOutput('out-1');
eq(client.selectedOutput, 'out-1', 'client tracks selectedOutput');

client.sendMidi([0x90, 60, 100]);
eq(JSON.parse(sentLog[3]), { cmd: 'send', bytes: [144, 60, 100] }, 'client.sendMidi sends');

// ---- BridgeClient: inbound events dispatch to callbacks ----
let gotPorts = null, gotMsg = null, gotErr = null, gotHello = null;
client.onPorts = (p) => { gotPorts = p; };
client.onMessage = (b) => { gotMsg = b; };
client.onError = (m) => { gotErr = m; };
client.onHello = (h) => { gotHello = h; };

client.handle('{"evt":"hello","version":1,"transport":"winrt"}');
eq(gotHello.transport, 'winrt', 'hello dispatched');
eq(client.serverVersion, 1, 'serverVersion stored');
eq(client.transport, 'winrt', 'transport stored');

client.handle(JSON.stringify({ evt: 'ports', inputs: [{ id: 'i', name: 'CA99 USB' }], outputs: [{ id: 'o', name: 'CA99 USB' }] }));
ok(gotPorts && gotPorts.inputs.length === 1, 'ports dispatched');
eq(client.ports.inputs[0].name, 'CA99 USB', 'ports stored on client');

client.handle('{"evt":"message","bytes":[144,60,100]}');
eq(gotMsg, [144, 60, 100], 'message dispatched');

// byte masking on inbound
client.handle('{"evt":"message","bytes":[400,60,-1]}');
eq(gotMsg, [144, 60, 255], 'inbound bytes masked');

client.handle('{"evt":"error","message":"port gone"}');
eq(gotErr, 'port gone', 'error dispatched');

// selected event updates tracking
client.handle('{"evt":"selected","input":null,"output":"o2"}');
eq(client.selectedInput, null, 'selected updates input');
eq(client.selectedOutput, 'o2', 'selected updates output');

// unknown event ignored (forward-compat)
const before = sentLog.length;
const r = client.handle('{"evt":"futurething","x":1}');
eq(r.evt, 'futurething', 'unknown event returned as-is');
eq(sentLog.length, before, 'unknown event causes no side effect');

// bad json inbound -> onError
gotErr = null;
client.handle('garbage{');
eq(gotErr, 'invalid JSON', 'bad inbound json triggers onError');

// ---- BridgeClient.autoSelect prefers CA99/Kawai ----
const c2 = new BridgeClient({ send: () => {} });
c2.handle(JSON.stringify({
  evt: 'ports',
  inputs: [{ id: 'a', name: 'Some Synth' }, { id: 'b', name: 'Kawai CA99' }],
  outputs: [{ id: 'c', name: 'CA99' }, { id: 'd', name: 'Other' }],
}));
const picked = c2.autoSelect();
eq(picked.input.id, 'b', 'autoSelect picks Kawai input');
eq(picked.output.id, 'c', 'autoSelect picks CA99 output');
eq(c2.selectedInput, 'b', 'autoSelect sets selectedInput');

// autoSelect falls back to first when no match
const c3 = new BridgeClient({ send: () => {} });
c3.handle(JSON.stringify({ evt: 'ports', inputs: [{ id: 'x', name: 'Generic' }], outputs: [] }));
const picked3 = c3.autoSelect();
eq(picked3.input.id, 'x', 'autoSelect falls back to first input');
eq(picked3.output, null, 'autoSelect output null when none');

// ---- protocol version constant ----
ok(PROTOCOL_VERSION === 1, 'protocol version is 1');

console.log(`bridge-protocol: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
