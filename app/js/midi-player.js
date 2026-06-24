// midi-player.js — Pure-logic engine for the DAW-style MIDI Piano-Roll Player module.
// No browser dependencies; fully unit-testable. Consumes either built-in DEMO_SONGS
// or notes produced by midi-file.js (parseMidi). Notes use absolute-time form:
//   { midi, ms, durMs, hand:'r'|'l', velocity }

const MIN_MIDI = 21;  // A0
const MAX_MIDI = 108; // C8

export function isBlackKey(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10;
}

// Total duration in ms = max(ms + durMs) across notes (0 if empty).
export function totalMs(notes) {
  let m = 0;
  for (const n of notes) {
    const end = n.ms + n.durMs;
    if (end > m) m = end;
  }
  return m;
}

// Pitch range [lo, hi] padded by padSemis then snapped to octave boundaries,
// clamped to [21, 108]. Empty → a sensible default around middle C.
export function pitchRange(notes, padSemis = 2) {
  if (!notes.length) return [60 - 12, 60 + 12];
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) {
    if (n.midi < lo) lo = n.midi;
    if (n.midi > hi) hi = n.midi;
  }
  lo -= padSemis;
  hi += padSemis;
  // snap lo down / hi up to octave (C) boundaries
  lo = Math.floor(lo / 12) * 12;
  hi = Math.ceil((hi + 1) / 12) * 12 - 1;
  if (lo < MIN_MIDI) lo = MIN_MIDI;
  if (hi > MAX_MIDI) hi = MAX_MIDI;
  if (hi <= lo) hi = Math.min(MAX_MIDI, lo + 11);
  return [lo, hi];
}

// Compute DAW piano-roll geometry. Time flows left→right (x = ms*pxPerMs),
// pitch maps to rows (higher pitch = smaller y). Rectangles outside [lo,hi] are
// dropped. Returns { width, height, rowH, lo, hi, rows, rects:[...] }.
export function layoutRoll(notes, opts = {}) {
  const pxPerMs = opts.pxPerMs ?? 0.12;
  const rowH = opts.rowH ?? 12;
  const minW = opts.minW ?? 4;
  const gap = opts.gap ?? 1;
  let [lo, hi] = (opts.lo != null && opts.hi != null)
    ? [opts.lo, opts.hi]
    : pitchRange(notes);
  const rows = hi - lo + 1;
  const height = rows * rowH;
  const dur = totalMs(notes);
  const width = Math.max(1, Math.ceil(dur * pxPerMs));
  const rects = [];
  for (const n of notes) {
    if (n.midi < lo || n.midi > hi) continue;
    const x = n.ms * pxPerMs;
    const w = Math.max(minW, n.durMs * pxPerMs - gap);
    const y = (hi - n.midi) * rowH;
    rects.push({
      midi: n.midi,
      hand: n.hand || 'r',
      velocity: n.velocity ?? 96,
      x, y,
      w,
      h: rowH - gap,
      black: isBlackKey(n.midi),
    });
  }
  return { width, height, rowH, lo, hi, rows, rects };
}

export function playheadX(t, pxPerMs = 0.12) {
  return t * pxPerMs;
}

// Notes whose onset falls in (prevT, t]  → use to trigger sound/flash this frame.
export function triggered(notes, prevT, t) {
  const out = [];
  for (const n of notes) {
    if (n.ms > prevT && n.ms <= t) out.push(n);
  }
  return out;
}

// Notes currently sounding at time t:  ms <= t < ms + durMs.
export function activeAt(notes, t) {
  const out = [];
  for (const n of notes) {
    if (n.ms <= t && t < n.ms + n.durMs) out.push(n);
  }
  return out;
}

// Summary stats for the info bar.
export function rollStats(notes, meta = {}) {
  let r = 0, l = 0;
  let lo = Infinity, hi = -Infinity;
  for (const n of notes) {
    if (n.hand === 'l') l++; else r++;
    if (n.midi < lo) lo = n.midi;
    if (n.midi > hi) hi = n.midi;
  }
  if (!notes.length) { lo = 0; hi = 0; }
  return {
    count: notes.length,
    right: r,
    left: l,
    lo, hi,
    durationMs: totalMs(notes),
    bpm: meta.bpm ?? null,
    title: meta.title ?? null,
  };
}

// ---- Built-in demo songs (absolute-time notes) ------------------------------

function buildDemoOde() {
  // Ode to Joy — RH melody + LH simple roots. Quarter ~ 500ms.
  const Q = 500;
  const mel = [
    64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62,
    64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
  ];
  const notes = [];
  let t = 0;
  for (let i = 0; i < mel.length; i++) {
    notes.push({ midi: mel[i], ms: t, durMs: Q - 40, hand: 'r', velocity: 92 });
    t += Q;
  }
  // LH: a root note under every 2 beats
  let lt = 0;
  const roots = [48, 48, 43, 48, 48, 43, 48, 48, 43, 48, 48, 43, 48, 48, 43];
  for (let i = 0; i < roots.length; i++) {
    notes.push({ midi: roots[i], ms: lt, durMs: 2 * Q - 40, hand: 'l', velocity: 70 });
    lt += 2 * Q;
  }
  notes.sort((a, b) => a.ms - b.ms || a.midi - b.midi);
  return notes;
}

function buildDemoCanon() {
  // Pachelbel Canon fragment — RH only, eighth notes ~ 300ms.
  const E = 300;
  const seq = [
    66, 69, 74, 73, 71, 69, 66, 64,
    62, 64, 66, 64, 62, 61, 62, 64,
    66, 69, 71, 73, 74, 73, 71, 69,
  ];
  const notes = [];
  let t = 0;
  for (let i = 0; i < seq.length; i++) {
    notes.push({ midi: seq[i], ms: t, durMs: E - 30, hand: 'r', velocity: 88 });
    t += E;
  }
  notes.sort((a, b) => a.ms - b.ms || a.midi - b.midi);
  return notes;
}

export const DEMO_SONGS = [
  { id: 'ode-2h', title: '欢乐颂（双手）', bpm: 120, notes: buildDemoOde() },
  { id: 'canon-rh', title: '卡农片段（右手）', bpm: 100, notes: buildDemoCanon() },
];
