/**
 * auto-rotate.test.mjs — 自动换音色引擎单元测试
 * 运行: node app/js/auto-rotate.test.mjs
 */
import { RotateEngine, diversePool } from './auto-rotate.js';

let pass = 0, fail = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n    got:  ${g}\n    want: ${w}`); }
}

console.log('=== sequential next() ===');
{
  const e = new RotateEngine({ pool: [10, 20, 30], order: 'sequential' });
  eq('start at first', e.current(), 10);
  eq('next 1', e.next(), 20);
  eq('next 2', e.next(), 30);
  eq('wraps around', e.next(), 10);
}

console.log('=== onChange callback ===');
{
  const seen = [];
  const e = new RotateEngine({ pool: [1, 2], order: 'sequential' });
  e.onChange = (id) => seen.push(id);
  e.next(); e.next();
  eq('callbacks fired', seen, [2, 1]);
}

console.log('=== beat mode tick() ===');
{
  const e = new RotateEngine({ pool: [100, 200], mode: 'beat', interval: 4 });
  e.start();  // beat mode: no timer
  eq('no change before interval', [e.tick(), e.tick(), e.tick()], [null, null, null]);
  eq('change on 4th beat', e.tick(), 200);
  eq('counter resets', [e.tick(), e.tick(), e.tick()], [null, null, null]);
  eq('change again on 8th', e.tick(), 100);
  e.stop();
}

console.log('=== beat mode ignores tick when stopped ===');
{
  const e = new RotateEngine({ pool: [1, 2], mode: 'beat', interval: 2 });
  eq('tick before start = null', e.tick(), null);
}

console.log('=== time mode uses injected setInterval ===');
{
  let cb = null;
  const fakeSet = (fn) => { cb = fn; return 1; };
  const fakeClear = () => { cb = null; };
  const seen = [];
  const e = new RotateEngine({ pool: [5, 6, 7], mode: 'time', interval: 2 });
  e.onChange = (id) => seen.push(id);
  e.start(fakeSet);
  eq('start applies current', seen, [5]);
  cb(); cb();  // simulate 2 timer fires
  eq('timer advances', seen, [5, 6, 7]);
  e.stop(fakeClear);
  eq('stopped', e.running, false);
}

console.log('=== random order avoids immediate repeat ===');
{
  const e = new RotateEngine({ pool: [1, 2, 3, 4], order: 'random' });
  let ok = true;
  let prev = e.current();
  for (let i = 0; i < 50; i++) {
    const n = e.next();
    if (n === prev) ok = false;
    prev = n;
  }
  eq('no immediate repeats in 50 draws', ok, true);
}

console.log('=== single-item pool ===');
{
  const e = new RotateEngine({ pool: [42], order: 'random' });
  eq('random single stays', e.next(), 42);
  const e2 = new RotateEngine({ pool: [42], order: 'sequential' });
  eq('seq single stays', e2.next(), 42);
}

console.log('=== empty pool ===');
{
  const e = new RotateEngine({ pool: [] });
  eq('current null', e.current(), null);
  eq('next null', e.next(), null);
}

console.log('=== diversePool ===');
{
  const sounds = [
    { id: 0, category: 'Piano 1' }, { id: 1, category: 'Piano 1' },
    { id: 2, category: 'Strings' }, { id: 3, category: 'Organ' },
  ];
  eq('picks first per category', diversePool(sounds, ['Piano 1', 'Strings', 'Organ']), [0, 2, 3]);
  eq('skips missing category', diversePool(sounds, ['Piano 1', 'Nonexistent']), [0]);
}

console.log('=== reset ===');
{
  const e = new RotateEngine({ pool: [1, 2, 3] });
  e.next(); e.next();
  e.reset();
  eq('reset to first', e.current(), 1);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
