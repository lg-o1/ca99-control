/**
 * ca99.test.mjs — 协议库单元测试（Node.js 运行，不需真实 MIDI）
 * 运行: node app/js/ca99.test.mjs
 */
import {
  hex, buildSoundSelect, buildSysEx, buildVolume, buildReverbType,
  buildKeyboardMode, buildRhythmSelect, toHex, parseMessage, noteName, PART
} from './ca99.js';

let pass = 0, fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n    got:  ${g}\n    want: ${w}`); }
}

console.log('=== hex() ===');
eq('hex 0x50', hex('0x50'), 0x50);
eq('hex "80"', hex('80'), 80);
eq('hex number', hex(127), 127);
eq('hex empty', hex(''), 0);

console.log('=== buildSoundSelect (Concert Grand: pc0 msb121 lsb0) ===');
const cg = { msb: 121, lsb: 0, pc: 0 };
eq('sound select ch0', buildSoundSelect(cg, 0), [
  [0xB0, 0x00, 121], [0xB0, 0x20, 0], [0xC0, 0]
]);
eq('sound select ch1', buildSoundSelect(cg, 1), [
  [0xB1, 0x00, 121], [0xB1, 0x20, 0], [0xC1, 0]
]);

console.log('=== buildSysEx (general format) ===');
// F0 40 7F 10 08 02 55 00 7F [data] F7
eq('sysex sound base', buildSysEx(0x10, 0x55, 0x00, PART.System, []),
  [0xF0, 0x40, 0x7F, 0x10, 0x08, 0x02, 0x55, 0x00, 0x7F, 0xF7]);
eq('sysex with string args', buildSysEx('0x10', '0x50', '0x01', PART.Main1, [0x02]),
  [0xF0, 0x40, 0x7F, 0x10, 0x08, 0x02, 0x50, 0x01, 0x00, 0x02, 0xF7]);

console.log('=== system params ===');
eq('volume 100', buildVolume(100), [0xF0,0x40,0x7F,0x10,0x08,0x02,0x55,0x01,0x7F,100,0xF7]);
eq('reverb type 3', buildReverbType(3), [0xF0,0x40,0x7F,0x10,0x08,0x02,0x55,0x08,0x7F,3,0xF7]);
eq('keyboard mode dual', buildKeyboardMode(1), [0xF0,0x40,0x7F,0x10,0x08,0x02,0x53,0x00,0x7F,1,0xF7]);
eq('rhythm select 5', buildRhythmSelect(5), [0xF0,0x40,0x7F,0x10,0x08,0x02,0x56,0x09,0x7F,5,0xF7]);

console.log('=== value clamping (0x7F mask) ===');
eq('volume clamps >127', buildVolume(200)[9], 200 & 0x7F);

console.log('=== toHex ===');
eq('toHex', toHex([0xF0, 0x40, 0x7F]), 'F0 40 7F');

console.log('=== parseMessage ===');
eq('note on', parseMessage([0x90, 60, 100]), { type:'noteon', note:60, velocity:100, channel:0 });
eq('note off (vel0)', parseMessage([0x90, 60, 0]), { type:'noteoff', note:60, channel:0 });
eq('note off explicit', parseMessage([0x80, 60, 0]), { type:'noteoff', note:60, channel:0 });
eq('cc', parseMessage([0xB0, 64, 127]), { type:'cc', controller:64, value:127, channel:0 });

console.log('=== noteName ===');
eq('middle C', noteName(60), 'C4');
eq('A4', noteName(69), 'A4');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
