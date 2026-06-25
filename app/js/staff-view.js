// staff-view.js — Pure-logic engine for the Grand-Staff Sheet-Music Viewer module.
// Maps absolute-time MIDI notes ({midi, ms, durMs, hand, velocity}) to grand-staff
// (treble + bass) geometry: diatonic step, accidental, clef, ledger lines, measures.
// No browser deps — fully unit-testable. Pairs with midi-player.js (same note format).

// Diatonic white-key step within an octave (C..B → 0..6) and whether the pitch
// class is a black key (rendered as the lower white note + sharp).
const WHITE_STEP  = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6];
const IS_SHARP    = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
const MIDDLE_C_DI = 35; // diatonicIndex(60)

// Absolute diatonic index: octave*7 + white-step. Black keys share the lower white step.
export function diatonicIndex(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return Math.floor(midi / 12) * 7 + WHITE_STEP[pc];
}

// Staff step relative to middle C (C4 = 0). Higher pitch → larger (drawn higher).
export function staffStep(midi) {
  return diatonicIndex(midi) - MIDDLE_C_DI;
}

// '♯' for black keys, '' otherwise.
export function noteAccidental(midi) {
  const pc = ((midi % 12) + 12) % 12;
  return IS_SHARP[pc] ? '♯' : '';
}

// Clef assignment: explicit hand wins ('r'→treble, 'l'→bass); else split at middle C.
export function clefOf(midi, hand) {
  if (hand === 'r') return 'treble';
  if (hand === 'l') return 'bass';
  return midi >= 60 ? 'treble' : 'bass';
}

// Ledger-line step positions for a note (lines live on even steps in this coordinate).
// Treble staff lines: steps 2..10 (E4,G4,B4,D5,F5). Bass: -10..-2 (G2..A3).
// Middle C (step 0) gets a shared ledger between the staves.
export function ledgerSteps(step) {
  const out = [];
  if (step >= 12) {                   // above treble: round down to line below note
    const noteLine = step - (step & 1);
    for (let s = 12; s <= noteLine; s += 2) out.push(s);
  } else if (step <= -12) {           // below bass: round up to line above note
    const noteLine = step + (step & 1);
    for (let s = -12; s >= noteLine; s -= 2) out.push(s);
  } else if (step === 0 || step === 1 || step === -1) {
    out.push(0);                      // middle-C ledger zone
  }
  return out;
}

// Total duration (ms) across notes.
export function totalMs(notes) {
  let m = 0;
  for (const n of notes) { const e = n.ms + n.durMs; if (e > m) m = e; }
  return m;
}

// Group notes into measures by wall-clock time. measureMs = (60000/bpm)*beatsPerBar.
// Returns [{index, startMs, endMs}], covering 0..totalMs (at least one measure).
export function measures(notes, { bpm = 120, beatsPerBar = 4 } = {}) {
  const measMs = (60000 / bpm) * beatsPerBar;
  const dur = Math.max(totalMs(notes), 1);
  const count = Math.max(1, Math.ceil(dur / measMs));
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({ index: i, startMs: i * measMs, endMs: (i + 1) * measMs });
  }
  return out;
}

// Horizontal layout: x = ms*pxPerMs (+leftPad). y is supplied by the renderer via
// stepY (so CSS owns spacing); the engine returns the step and metadata per note.
//   opts: { pxPerMs=0.16, leftPad=70, bpm, beatsPerBar }
// Returns { width, leftPad, pxPerMs, glyphs:[...], barlines:[x...], dur }.
export function layoutStaff(notes, opts = {}) {
  const pxPerMs = opts.pxPerMs ?? 0.16;
  const leftPad = opts.leftPad ?? 70;
  const dur = totalMs(notes);
  const width = leftPad + Math.max(1, Math.ceil(dur * pxPerMs)) + 40;
  const glyphs = notes.map((n) => {
    const step = staffStep(n.midi);
    const clef = clefOf(n.midi, n.hand);
    return {
      midi: n.midi,
      hand: n.hand || (clef === 'bass' ? 'l' : 'r'),
      ms: n.ms,
      durMs: n.durMs,
      velocity: n.velocity ?? 96,
      x: leftPad + n.ms * pxPerMs,
      step,
      clef,
      accidental: noteAccidental(n.midi),
      ledgers: ledgerSteps(step),
    };
  });
  const bars = measures(notes, opts).map(m => leftPad + m.startMs * pxPerMs);
  return { width, leftPad, pxPerMs, glyphs, barlines: bars, dur };
}

// Playback cursor x for time t.
export function cursorX(t, opts = {}) {
  const pxPerMs = opts.pxPerMs ?? 0.16;
  const leftPad = opts.leftPad ?? 70;
  return leftPad + t * pxPerMs;
}

// Notes sounding at time t (ms <= t < ms+durMs).
export function activeAt(notes, t) {
  const out = [];
  for (const n of notes) if (n.ms <= t && t < n.ms + n.durMs) out.push(n);
  return out;
}

// Notes whose onset falls in (prevT, t].
export function triggered(notes, prevT, t) {
  const out = [];
  for (const n of notes) if (n.ms > prevT && n.ms <= t) out.push(n);
  return out;
}

// Concert-pitch note name for labels.
const PC_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export function noteName(midi) {
  return PC_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
}
