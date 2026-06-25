/**
 * app.js — CA99 Control 统一应用主入口
 * 所有玩法模块集中在此 app 内，通过侧边栏切换。便于统一维护。
 */
import { MidiCore } from './midi-core.js';
import * as CA99 from './ca99.js';
import { RotateEngine, diversePool } from './auto-rotate.js';
import { MorphEngine } from './vt-morph.js';
import { VelocityRouter, splitZones } from './velocity-switch.js';
import { VelVtLink } from './vel-vt-link.js';
import { PedalController, PEDAL_CC } from './pedal-control.js';
import { PresetStore } from './preset-store.js';
import { describeNotes, detectChord } from './chord-detect.js';
import { HeldNotes, ChordChallenge } from './chord-trainer.js';
import { Metronome, TempoTracker } from './metronome.js';
import { Recorder } from './recorder.js';
import { SCALE_TYPES, buildScale, buildScaleUpDown, ScaleSession } from './scale-trainer.js';
import { noteName as chordNoteName } from './chord-detect.js';
import { SightReadingGame, staffPosition, needsLedger, noteLabel as sightNoteLabel } from './sight-reading.js';
import { INTERVALS, EarTrainingGame, intervalName } from './ear-training.js';
import { DYNAMICS, DynamicsGame, velocityToDynamic } from './dynamics-trainer.js';
import { Transposer, semitoneLabel, targetKeyName } from './transposer.js';
import { PracticeStats } from './practice-stats.js';
import { RHYTHM_PATTERNS, RhythmTrainer, barDurationMs } from './rhythm-trainer.js';
import { KEYS as MEL_KEYS, MelodyDictation } from './melody-dictation.js';
import { PROG_KEYS, PROGRESSIONS, ChordProgression } from './chord-progression.js';
import { Accompaniment, PATTERNS as ACCOMP_PATTERNS, getPattern as accompGetPattern } from './accompaniment.js';
import { analyzeChord, COLOR_KEYS as CCOLOR_KEYS, tonicTriadPcs as ccolorTonicTriad } from './chord-color.js';
import { heatColor as lsHeatColor, pickColor as lsPickColor, sparkSpec as lsSparkSpec, beamHeight as lsBeamHeight, stageFrac as lsStageFrac, isMilestone as lsIsMilestone, THEMES as LS_THEMES, ComboCounter as LsCombo } from './light-show.js';
import { ECHO_LEVELS as ME_LEVELS, levelById as meLevelById, MelodyEcho } from './melody-echo.js';
import { CR_LEVELS, levelById as crLevelById, CallResponse } from './call-response.js';
import { RHYTHM_LEVELS as RE_LEVELS, levelById as reLevelById, durName as reDurName, RhythmEcho } from './rhythm-echo.js';
import { PD_LEVELS, levelById as pdLevelById, dirName as pdDirName, PitchDirection } from './pitch-direction.js';
import { BeatStability } from './beat-stability.js';
import { HandsSync, DEFAULT_SPLIT } from './hands-sync.js';
import { ArpeggioRuns, CHORD_INTERVALS, QUALITY_LABELS, midiName } from './arpeggio-runs.js';
import { ArticulationTrainer } from './articulation.js';
import { PedalTiming, PEDAL_THRESHOLD } from './pedal-timing.js';
import { TrillTrainer } from './trill.js';
import { OrnamentTrainer, ORNAMENT_LABELS } from './ornament.js';
import { LeapTrainer } from './leap.js';
import { VoicingTrainer } from './voicing.js';
import { CrescendoTrainer, CRESC_DIRECTIONS, idealRamp } from './crescendo.js';
import { TempoRampTrainer, TEMPO_DIRECTIONS, ioiToBpm } from './tempo-ramp.js';
import { PolyrhythmTrainer, POLY_RATIOS, combinedGrid } from './polyrhythm.js';
import { EvennessTrainer } from './evenness.js';
import { FingerIndependenceTrainer, FINGER_PRESETS } from './finger-independence.js';
import { ScaleSpanTrainer, SCALE_TYPES as SPAN_SCALE_TYPES, SPAN_OCTAVES, SPAN_DIRECTIONS } from './scale-span.js';
import { RhythmDictationTrainer, DICTATION_LEVELS, patternToOnsets as dictOnsets } from './rhythm-dictation.js';
import { SightTransposeTrainer, MELODIES as TRANS_MELODIES, TARGET_KEYS as TRANS_KEYS, SOURCE_ROOT as TRANS_SOURCE } from './sight-transpose.js';
import { ChordInversionGame, INVERSIONS as INV_OPTIONS, QUALITIES as INV_QUALITIES, inversionName, stackIntervals as invStack } from './chord-inversion.js';
import { KeySignatureGame, accidentalList as ksAccidentals, scaleMidi as ksScale } from './key-signature.js';
import { ScaleFingeringSession, FINGERINGS as SF_FINGERINGS, listScales as sfList, scaleNotes as sfNotes, defaultRootMidi as sfRoot, fingers as sfFingers, crossingPoints as sfCross } from './scale-fingering.js';
import { IntervalBuildGame, INTERVALS as IB_INTERVALS, DIRECTIONS as IB_DIRECTIONS, noteName as ibNoteName } from './interval-build.js';
import { ModeIdGame, MODES as MID_MODES, modeName as midModeName } from './mode-id.js';
import { SolfegeGame, DEGREES as SOL_DEGREES, syllable as solSyllable, noteName as solNoteName } from './solfege.js';
import { ChordQualityGame, QUALITIES as CQ_QUALITIES, qualityName as cqName } from './chord-quality.js';
import { ProgressionEarGame, PROGRESSIONS as PE_PROGS, DEGREES as PE_DEGREES, romanOf as peRoman } from './progression-ear.js';
import { PianoKeyboard, noteName as kbNoteName, HL_PALETTE, buildLayout as kbBuildLayout } from './piano-keyboard.js';
import { ScoreFollow, SONGS as SCF_SONGS, getSong as scfGetSong, GRADE as SCF_GRADE, songFromMidi as scfFromMidi, beatToMs as scfBeatToMs } from './score-follow.js';
import { CadenceGame, CADENCES as CAD_LIST, cadenceInfo, romanOf as cadRoman } from './cadence.js';
import { NoteIdGame, noteName as niNoteName, isBlack as niIsBlack } from './note-id.js';
import { StaffReadGame, staffPosition as srStaffPos } from './staff-read.js';
import { SightPhrase, KEYS as SP_KEYS, keyById as spKeyById, keySignatureAccidentals as spKeySig, degreeToMidi as spDegToMidi, durGlyph as spDurGlyph } from './sight-phrase.js';
import { ChordSight, KEYS as CS_KEYS, keyById as csKeyById, keySignatureAccidentals as csKeySig, CHORD_LEVELS as CS_LEVELS, INVERSION_NAMES as CS_INV } from './chord-sight.js';
import { RhythmSight, rhythmGlyph as rsGlyph } from './rhythm-sight.js';
import { parseMidi, countHand } from './midi-file.js';
import { parseDirListing, buildUserCatalog, catalogFromManifest } from './userlib.js';
import { DEMO_SONGS, pitchRange as mplPitchRange, totalMs as mplTotalMs, layoutRoll as mplLayoutRoll, isBlackKey as mplIsBlackKey, playheadX as mplPlayheadX, triggered as mplTriggered, activeAt as mplActiveAt, rollStats as mplRollStats } from './midi-player.js';
import { layoutStaff as svLayoutStaff, cursorX as svCursorX, activeAt as svActiveAt, triggered as svTriggered, totalMs as svTotalMs, staffStep as svStaffStep, noteName as svNoteName } from './staff-view.js';
import { WHEEL as COF_WHEEL, diatonicChords as cofChords, chordMidi as cofChordMidi, scaleMidi as cofScaleMidi, signatureLabel as cofSigLabel, majorScaleSpelling as cofSpelling, neighbors as cofNeighbors } from './circle-of-fifths.js';

const midi = new MidiCore();
if (typeof window !== 'undefined') window.__midi = midi;  // 调试钩子：便于排查传输/端口
let SOUNDS = [], SYSEX = [], VT = [], RHYTHM = [];
let rotateEngine = null;   // 自动换音色引擎（模块6使用，提前声明避免 TDZ）
let morphEngine = null;    // VT 渐变引擎（模块7使用，提前声明避免 TDZ）
let velocityRouter = null; // 力度换音色路由（模块8使用，提前声明避免 TDZ）
let velVtLink = null;      // 力度→VT 联动（模块9使用，提前声明避免 TDZ）
let pedalController = null;// 踏板控制扩展（模块10使用，提前声明避免 TDZ）
let presetStore = null;    // 演出预设存储（模块11使用，提前声明避免 TDZ）
const heldNotes = new HeldNotes(); // 当前按下的音符（模块12和弦练习用）
let chordOnNotesChanged = null;    // 和弦面板的音符变化回调（模块12注册）
let metronome = null;      // 节拍器（模块13使用，提前声明避免 TDZ）
let tempoOnNote = null;    // 演奏速度检测的 note-on 回调（模块13注册）
const recorder = new Recorder(); // 弹奏录制器（模块14使用）
let recorderOnChange = null;      // 录制状态变化回调（模块14注册）
let scaleOnNote = null;    // 音阶练习的 note-on 回调（模块15注册）
let sightOnNote = null;    // 视奏闪卡的 note-on 回调（模块16注册）
let dynOnNote = null;      // 力度练习的 note-on 回调（模块18注册）
let rhythmTapOnNote = null; // 节奏跟拍的 note-on 回调（模块21注册）
let melodyOnNote = null;    // 旋律听写的 note-on 回调（模块22注册）
let chordProgOnNotesChanged = null; // 和弦进行练习的音符变化回调（模块23注册）
let accompOnNotesChanged = null; // 伴奏音型练习的音符变化回调（模块57注册）
let beatTapOnNote = null;   // 节拍稳定度的 note-on 回调（模块24注册）
let handsOnNote = null;     // 双手协调的 note-on 回调（模块25注册）
let arpOnNote = null;       // 琶音跑动的 note-on 回调（模块26注册）
let articOnNoteOn = null;   // 连奏/断奏的 note-on 回调（模块27注册）
let articOnNoteOff = null;  // 连奏/断奏的 note-off 回调（模块27注册）
let pedalTimeOnNote = null; // 踏板时机的 note-on 回调（模块28注册）
let pedalTimeOnCC = null;   // 踏板时机的 CC 回调（模块28注册）
let trillOnNote = null;     // 颤音训练的 note-on 回调（模块29注册）
let ornamentOnNote = null;  // 装饰音训练的 note-on 回调（模块30注册）
let leapOnNote = null;      // 大跳准确度的 note-on 回调（模块31注册）
let voicingOnNote = null;   // 旋律声部突出的 note-on 回调（模块32注册，带力度）
let crescOnNote = null;     // 力度渐变曲线的 note-on 回调（模块33注册，带力度）
let tempoRampOnNote = null; // 速度渐变的 note-on 回调（模块34注册，带时间）
let polyOnNote = null;      // 复节奏的 note-on 回调（模块35注册，带音高+时间，按音高分左右手）
let evenOnNote = null;      // 颗粒性的 note-on 回调（模块36注册，带力度+时间）
let fingerOnNote = null;    // 手指独立性的 note-on 回调（模块37注册）
let fingerOffNote = null;   // 手指独立性的 note-off 回调（模块37注册）
let spanOnNote = null;      // 音阶八度跨度的 note-on 回调（模块38注册，带时间）
let dictOnNote = null;      // 节奏听写的 note-on 回调（模块39注册，带时间）
let transOnNote = null;     // 移调视奏的 note-on 回调（模块40注册）
let fingOnNote = null;      // 音阶指法提示的 note-on 回调（模块43注册）
let ivbOnNote = null;       // 音程构建的 note-on 回调（模块44注册）
let scfOnNote = null;       // 曲谱跟弹的 note-on 回调（模块45注册，带时间在内部取）
let scfKbEcho = null;       // 曲谱跟弹键盘回显：真实 MIDI note-on → 屏幕 88 键点亮（任何模式都生效）
let scfKbEchoOff = null;    // 曲谱跟弹键盘回显：真实 MIDI note-off → 屏幕键抬起
let spOnNote = null;        // 乐句视奏的 note-on 回调（模块48注册）
let chordSightOnNotesChanged = null; // 和弦视奏的"按下集合变化"回调（模块49注册）
let rhythmSightTap = null;  // 节奏视奏的击打回调（模块50注册，任意键当一次击打）
let chordColorOnNotesChanged = null; // 和弦色彩板的"按下集合变化"回调（模块58注册）
let lightShowOnNote = null;  // 自由演奏灯光秀的 note-on 回调（模块59注册，带力度）
let lightShowOffNote = null; // 自由演奏灯光秀的 note-off 回调（模块59注册）
let melEchoOnNote = null;    // 旋律回声记忆游戏的 note-on 回调（模块60注册）
let callRespOnNote = null;   // 即兴问答的 note-on 回调（模块61注册）
let rhythmEchoTap = null;    // 节奏回声的击打回调（模块62注册，任意 note-on 当一次敲击）
let pitchDirOnNote = null;   // 高低音方向感的 note-on 回调（模块63注册）
// 练习成就仪表盘（模块20）：各训练模块结束时把成绩记进来，仪表盘聚合展示
const practiceStats = new PracticeStats({
  storage: (typeof localStorage !== 'undefined') ? localStorage : undefined,
});
let dashboardOnUpdate = null; // 仪表盘刷新回调（模块20注册）
// 把一次练习成绩记入统计；newly 为新解锁成就，弹个轻提示
function recordPractice(moduleId, label, attempts, correct, bestStreak) {
  if (!attempts) return; // 没答过题不记
  const newly = practiceStats.record({ moduleId, label, attempts, correct, bestStreak });
  if (dashboardOnUpdate) dashboardOnUpdate();
  newly.forEach((id) => {
    const a = practiceStats.allAchievements().find((x) => x.id === id);
    if (a) log(`🏆 解锁成就：${a.icon} ${a.name} — ${a.desc}`, 'ok');
  });
}

// ---------- 工具 ----------
const $ = (s) => document.querySelector(s);

/**
 * 提取「连续数值型」VT 参数（v1=0x50 且恰好 2 条值 = min/max 范围）。
 * 例：StringResonance ['Off','127'] / DamperResonance ['Off','10']。
 * 排除枚举型（Voicing 多条离散模式）和 PerNote 命令（1 条）。
 * @returns {Array<{name:string, v2:number, min:number, max:number}>}
 */
function continuousVtParams() {
  const parseRange = (v) => {
    if (v == null) return null;
    const s = String(v).trim();
    if (/^off$/i.test(s)) return 0;
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };
  const vtEntries = SYSEX.filter(e => CA99.hex(e.v1) === 0x50);
  const byParam = {};
  for (const e of vtEntries) (byParam[e.parameter] ||= []).push(e);
  return Object.entries(byParam)
    .filter(([, entries]) => entries.length === 2)
    .map(([pname, entries]) => ({
      name: pname,
      v2: CA99.hex(entries[0].v2),
      min: parseRange(entries[0].value),
      max: parseRange(entries[1].value),
    }))
    .filter(c => c.min !== null && c.max !== null && c.min >= 0 && c.max > c.min);
}

function log(msg, cls = '') {
  const el = $('#log');
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  el.prepend(line);
  while (el.children.length > 50) el.lastChild.remove();
}

// ---------- 数据加载 ----------
async function loadData() {
  const [s, x, v, r] = await Promise.all([
    fetch('data/sounds.json').then(r => r.json()),
    fetch('data/sysex.json').then(r => r.json()),
    fetch('data/vt.json').then(r => r.json()).catch(() => []),
    fetch('data/rhythm.json').then(r => r.json()).catch(() => []),
  ]);
  SOUNDS = s; SYSEX = x; VT = v; RHYTHM = r;
  log(`数据加载: ${SOUNDS.length} 音色, ${SYSEX.length} SysEx 参数`, 'ok');
}

// ---------- 连接 ----------
function refreshPortSelects(ports) {
  const fill = (sel, arr, kind) => {
    const cur = sel.value;
    sel.innerHTML = `<option value="">(选择${kind})</option>` +
      arr.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    if (arr.find(p => p.id === cur)) sel.value = cur;
  };
  fill($('#output-select'), ports.outputs, '输出');
  fill($('#input-select'), ports.inputs, '输入');
}

async function connect() {
  try {
    const ports = await midi.init();
    midi.onPortsChanged = refreshPortSelects;
    midi.onMessage = onMidiIn;
    refreshPortSelects(ports);
    const sel = midi.autoSelect();
    if (sel.output) $('#output-select').value = sel.output.id;
    if (sel.input) $('#input-select').value = sel.input.id;
    $('#conn-status').textContent = sel.output ? `已连接: ${sel.output.name}` : '已就绪(请选端口)';
    $('#conn-status').className = 'status on';
    log(`Web MIDI 就绪。输出=${sel.output?.name || '无'} 输入=${sel.input?.name || '无'}`, 'ok');
  } catch (e) {
    $('#conn-status').textContent = '连接失败';
    log(e.message, 'err');
  }
}

function onMidiIn(bytes) {
  const m = CA99.parseMessage(bytes);
  // 录制：记录所有输入的 MIDI 事件
  if (recorder.recording) {
    recorder.record(bytes, performance.now());
    if (recorderOnChange) recorderOnChange();
  }
  if (m.type === 'noteon') {
    addMonitorLine(`音符 ON  ${CA99.noteName(m.note)} (${m.note}) 力度 ${m.velocity}`, 'note-on');
    // 驱动 beat 模式的自动换音色
    if (rotateEngine && rotateEngine.running && rotateEngine.mode === 'beat') rotateEngine.tick();
    // 驱动力度感应换音色
    if (velocityRouter) velocityRouter.feed(m.velocity);
    // 驱动力度→VT 联动
    if (velVtLink) velVtLink.feed(m.velocity);
    // 追踪按下音符，驱动和弦练习
    heldNotes.on(m.note);
    if (chordOnNotesChanged) chordOnNotesChanged(heldNotes.notes);
    // 驱动演奏速度检测
    if (tempoOnNote) tempoOnNote(performance.now());
    // 驱动音阶练习
    if (scaleOnNote) scaleOnNote(m.note);
    // 驱动视奏闪卡
    if (sightOnNote) sightOnNote(m.note);
    // 驱动力度练习
    if (dynOnNote) dynOnNote(m.note, m.velocity);
    // 驱动节奏跟拍（任意键当作一次敲击）
    if (rhythmTapOnNote) rhythmTapOnNote(performance.now());
    // 驱动旋律听写
    if (melodyOnNote) melodyOnNote(m.note);
    // 驱动和弦进行练习
    if (chordProgOnNotesChanged) chordProgOnNotesChanged(heldNotes.notes);
    // 驱动节拍稳定度分析
    if (beatTapOnNote) beatTapOnNote(performance.now());
    // 驱动双手协调练习
    if (handsOnNote) handsOnNote(m.note, performance.now());
    // 驱动琶音跑动测试
    if (arpOnNote) arpOnNote(m.note, performance.now());
    // 驱动连奏/断奏控制（按键）
    if (articOnNoteOn) articOnNoteOn(m.note, performance.now());
    // 驱动踏板配合时机（新音）
    if (pedalTimeOnNote) pedalTimeOnNote(m.note, performance.now());
    // 驱动颤音速度训练
    if (trillOnNote) trillOnNote(m.note, performance.now());
    // 驱动装饰音训练
    if (ornamentOnNote) ornamentOnNote(m.note, performance.now());
    // 驱动大跳准确度训练
    if (leapOnNote) leapOnNote(m.note, performance.now());
    // 驱动旋律声部突出（带力度）
    if (voicingOnNote) voicingOnNote(m.note, m.velocity, performance.now());
    // 驱动力度渐变曲线（带力度）
    if (crescOnNote) crescOnNote(m.velocity);
    // 驱动速度渐变（带时间）
    if (tempoRampOnNote) tempoRampOnNote(performance.now());
    // 驱动复节奏（按音高分左右手）
    if (polyOnNote) polyOnNote(m.note, performance.now());
    // 驱动颗粒性（带力度+时间）
    if (evenOnNote) evenOnNote(m.note, m.velocity, performance.now());
    // 驱动手指独立性（note-on）
    if (fingerOnNote) fingerOnNote(m.note, performance.now());
    // 驱动音阶八度跨度（带时间）
    if (spanOnNote) spanOnNote(m.note, performance.now());
    // 驱动节奏听写（带时间）
    if (dictOnNote) dictOnNote(m.note, performance.now());
    // 驱动移调视奏
    if (transOnNote) transOnNote(m.note);
    // 驱动音阶指法提示
    if (fingOnNote) fingOnNote(m.note);
    // 驱动音程构建
    if (ivbOnNote) ivbOnNote(m.note);
    // 驱动曲谱跟弹
    if (scfOnNote) scfOnNote(m.note, m.velocity);
    // 曲谱跟弹键盘回显：任何模式下，真实 CA99 按键都点亮屏幕 88 键（初学者"屏幕镜像真琴"）
    if (scfKbEcho) scfKbEcho(m.note, m.velocity);
    // 驱动乐句视奏
    if (spOnNote) spOnNote(m.note);
    // 驱动和弦视奏（按下集合）
    if (chordSightOnNotesChanged) chordSightOnNotesChanged(heldNotes.notes);
    // 驱动节奏视奏（任意键当一次击打）
    if (rhythmSightTap) rhythmSightTap(performance.now());
    // 驱动伴奏音型练习（按下集合）
    if (accompOnNotesChanged) accompOnNotesChanged(heldNotes.notes);
    // 驱动和弦色彩板（按下集合）
    if (chordColorOnNotesChanged) chordColorOnNotesChanged(heldNotes.notes);
    // 驱动自由演奏灯光秀（带力度）
    if (lightShowOnNote) lightShowOnNote(m.note, m.velocity);
    // 驱动旋律回声记忆游戏
    if (melEchoOnNote) melEchoOnNote(m.note);
    // 驱动即兴问答（Call & Response）
    if (callRespOnNote) callRespOnNote(m.note, m.velocity);
    // 驱动节奏回声（任意音当一次敲击）
    if (rhythmEchoTap) rhythmEchoTap();
    // 驱动高低音方向感
    if (pitchDirOnNote) pitchDirOnNote(m.note);
  }
  else if (m.type === 'noteoff') {
    addMonitorLine(`音符 OFF ${CA99.noteName(m.note)}`);
    heldNotes.off(m.note);
    if (chordOnNotesChanged) chordOnNotesChanged(heldNotes.notes);
    if (chordProgOnNotesChanged) chordProgOnNotesChanged(heldNotes.notes);
    if (chordSightOnNotesChanged) chordSightOnNotesChanged(heldNotes.notes);
    if (accompOnNotesChanged) accompOnNotesChanged(heldNotes.notes);
    if (chordColorOnNotesChanged) chordColorOnNotesChanged(heldNotes.notes);
    // 驱动连奏/断奏控制（松键）
    if (articOnNoteOff) articOnNoteOff(m.note, performance.now());
    // 驱动手指独立性（note-off，检测按住音是否滑脱）
    if (fingerOffNote) fingerOffNote(m.note, performance.now());
    // 驱动自由演奏灯光秀（松键）
    if (lightShowOffNote) lightShowOffNote(m.note);
    // 曲谱跟弹键盘回显：真实 CA99 松键 → 屏幕键抬起
    if (scfKbEchoOff) scfKbEchoOff(m.note);
  }
  else if (m.type === 'cc') {
    addMonitorLine(`CC ${m.controller} = ${m.value}`);
    // 驱动踏板控制扩展
    if (pedalController) pedalController.feedCC(m.controller, m.value);
    // 驱动踏板配合时机（延音踏板 CC64）
    if (pedalTimeOnCC && m.controller === 64) pedalTimeOnCC(m.value, performance.now());
  }
  else if (m.type === 'sysex') addMonitorLine(`SysEx ← ${CA99.toHex(m.data)}`);
}

function send(bytes) {
  try { midi.send(bytes); }
  catch (e) { log(e.message, 'err'); }
}
function sendMulti(msgs) { msgs.forEach(send); }

// 发真实 MIDI 音符到钢琴（音色浏览器试听用 → 听到的就是当前选中的真实音色）
function kbMidiOn(midi, channel = 0, vel = 82) { send([0x90 | (channel & 0x0f), midi & 0x7f, vel & 0x7f]); }
function kbMidiOff(midi, channel = 0) { send([0x80 | (channel & 0x0f), midi & 0x7f, 0]); }

// ========== 模块 1: 音色浏览器 ==========
function renderSounds() {
  const root = $('#module-sounds');
  const cats = [...new Set(SOUNDS.map(s => s.category))];
  root.innerHTML = `
    <div class="toolbar">
      <input type="search" id="sound-search" placeholder="搜索音色名…">
      <select id="sound-cat"><option value="">全部分类</option>${cats.map(c => `<option>${c}</option>`).join('')}</select>
      <label>通道(part): <select id="sound-part">
        <option value="0">Main1</option><option value="1">Main2</option>
        <option value="8">Layer</option><option value="9">Lower</option>
      </select></label>
    </div>
    <div class="sound-grid" id="sound-grid"></div>
    <div class="kb-wrap">
      <div class="kb-cap">🎹 点击琴键试听当前音色（发真实 MIDI 到钢琴，切换音色后直接点键判断音色对不对，无需去琴上弹）</div>
      <div id="sound-kb"></div>
    </div>`;
  const kb = new PianoKeyboard($('#sound-kb'), {
    labels: 'c',
    onNoteOn: (m) => { kbMidiOn(m, +$('#sound-part').value); },
    onNoteOff: (m) => { kbMidiOff(m, +$('#sound-part').value); },
  });
  kb.scrollToShow(48, 72);
  const grid = $('#sound-grid');
  const draw = () => {
    const q = $('#sound-search').value.toLowerCase();
    const cat = $('#sound-cat').value;
    const list = SOUNDS.filter(s =>
      (!cat || s.category === cat) &&
      (!q || s.name.toLowerCase().includes(q) || (s.nameJa || '').includes(q)));
    grid.innerHTML = list.slice(0, 400).map(s => `
      <div class="sound-card" data-id="${s.id}">
        <div class="name">${s.name}</div>
        <div class="meta">${s.category} · PC${s.pc} MSB${s.msb} LSB${s.lsb}</div>
      </div>`).join('');
    grid.querySelectorAll('.sound-card').forEach(card => {
      card.onclick = () => {
        const s = SOUNDS.find(x => x.id === +card.dataset.id);
        const ch = +$('#sound-part').value;
        sendMulti(CA99.buildSoundSelect(s, ch));
        grid.querySelectorAll('.sound-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        log(`切音色: ${s.name} (ch${ch})`, 'ok');
      };
    });
  };
  $('#sound-search').oninput = draw;
  $('#sound-cat').onchange = draw;
  draw();
}

// ========== 模块 2: VT 调音台 ==========
function renderVT() {
  const root = $('#module-vt');
  // 从 sysex.json 提取 VT 参数（v1=0x50），按 parameter 分组取枚举值
  const vtEntries = SYSEX.filter(e => CA99.hex(e.v1) === 0x50);
  const byParam = {};
  for (const e of vtEntries) {
    (byParam[e.parameter] ||= []).push(e);
  }
  let html = '<h2 style="margin-bottom:12px">Virtual Technician 实时调音</h2>';
  for (const [pname, entries] of Object.entries(byParam)) {
    const first = entries[0];
    const v2 = CA99.hex(first.v2);
    if (entries.length > 1) {
      // 枚举：下拉
      html += `<div class="param-row"><label>${pname}</label>
        <select data-v2="${v2}">${entries.map(e => `<option value="${CA99.hex(e.v4)}">${e.value}${e.valueJa ? ' / ' + e.valueJa : ''}</option>`).join('')}</select></div>`;
    } else {
      // 连续：滑块 0-127
      html += `<div class="param-row"><label>${pname}</label>
        <input type="range" min="0" max="127" value="64" data-v2="${v2}">
        <span class="val">64</span></div>`;
    }
  }
  root.innerHTML = html || '<p>无 VT 参数</p>';
  root.querySelectorAll('select[data-v2]').forEach(sel => {
    sel.onchange = () => {
      const v2 = +sel.dataset.v2;
      send(CA99.buildSysEx(0x10, 0x50, v2, CA99.PART.System, [+sel.value]));
      log(`VT v2=${v2.toString(16)} = ${sel.value}`, 'ok');
    };
  });
  root.querySelectorAll('input[type=range][data-v2]').forEach(sl => {
    sl.oninput = () => { sl.nextElementSibling.textContent = sl.value; };
    sl.onchange = () => {
      const v2 = +sl.dataset.v2;
      send(CA99.buildSysEx(0x10, 0x50, v2, CA99.PART.System, [+sl.value]));
      log(`VT v2=${v2.toString(16)} = ${sl.value}`, 'ok');
    };
  });
}

// ========== 模块 3: 系统/混响 ==========
function renderSystem() {
  const root = $('#module-system');
  root.innerHTML = `
    <h2 style="margin-bottom:12px">系统设置</h2>
    <div class="param-row"><label>音量 Volume</label>
      <input type="range" min="0" max="127" value="100" id="sys-vol"><span class="val">100</span></div>
    <div class="param-row"><label>混响类型 Reverb</label>
      <select id="sys-reverb"><option value="0">Room</option><option value="1">Lounge</option><option value="2">Small Hall</option><option value="3">Concert Hall</option><option value="4">Live Hall</option><option value="5">Cathedral</option></select></div>
    <div class="param-row"><label>键盘模式</label>
      <select id="sys-mode"><option value="0">单键盘</option><option value="1">双层(Dual)</option><option value="2">分键(Split)</option><option value="3">四手</option></select></div>
    <p style="color:var(--muted);font-size:0.85em;margin-top:10px;line-height:1.6">
      <b>键盘模式用法：</b><br>
      • <b>单键盘</b>：全键盘弹 Main1 音色，正常演奏默认用此模式。<br>
      • <b>双层(Dual)</b>：全键盘同时发两个音色叠加（Main1 + Layer）。<br>
        先在「音色浏览器」选 <b>通道→Layer</b> 设好叠加音色，再切到此模式。<br>
      • <b>分键(Split)</b>：键盘左半区用 Lower 音色，右半区用 Main1 音色。<br>
        先在「音色浏览器」选 <b>通道→Lower</b> 设好左手音色，再切到此模式。<br>
      • <b>四手</b>：键盘从中间分成两个独立半区，供两人并排演奏。
    </p>`;
  const vol = $('#sys-vol');
  vol.oninput = () => vol.nextElementSibling.textContent = vol.value;
  vol.onchange = () => { send(CA99.buildVolume(+vol.value)); log(`音量=${vol.value}`, 'ok'); };
  $('#sys-reverb').onchange = (e) => { send(CA99.buildReverbType(+e.target.value)); log(`混响=${e.target.value}`, 'ok'); };
  $('#sys-mode').onchange = (e) => { send(CA99.buildKeyboardMode(+e.target.value)); log(`键盘模式=${e.target.value}`, 'ok'); };
}

// ========== 模块 4: 节奏 ==========
function renderRhythm() {
  const root = $('#module-rhythm');
  const items = Array.isArray(RHYTHM) ? RHYTHM : Object.values(RHYTHM);
  root.innerHTML = `<h2 style="margin-bottom:12px">鼓点节奏 (${items.length})</h2>
    <p style="color:var(--muted);font-size:0.85em;margin-bottom:10px;line-height:1.6">
      点击节奏型会自动执行：<b>停止 → 切换节奏 → 重新启动</b>（如果当前在播放中）。<br>
      也可用下方按钮手动控制启停。CA99 需先进入节奏模式（▶ 启动后生效）。
    </p>
    <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
      <button id="rhythm-start" class="big-btn" style="min-width:90px">▶ 启动</button>
      <button id="rhythm-stop"  class="big-btn" style="min-width:90px;background:#e53e3e">■ 停止</button>
      <span id="rhythm-status" style="color:var(--muted);font-size:0.85em">未播放</span>
    </div>
    <div class="btn-grid" id="rhythm-grid"></div>`;

  let playing = false;

  function setPlaying(v) {
    playing = v;
    $('#rhythm-status').textContent = v ? '▶ 播放中…' : '■ 已停止';
    $('#rhythm-start').disabled = v;
    $('#rhythm-stop').disabled = !v;
  }
  setPlaying(false);

  $('#rhythm-start').onclick = () => {
    send(CA99.buildMetronomeMode(1));          // 切到 Rhythm 模式
    send(CA99.buildMetronomeRun(true));         // Start
    setPlaying(true);
    log('节奏启动', 'ok');
  };
  $('#rhythm-stop').onclick = () => {
    send(CA99.buildMetronomeRun(false));        // Stop
    setPlaying(false);
    log('节奏停止', 'ok');
  };

  const grid = $('#rhythm-grid');
  grid.innerHTML = items.slice(0, 100).map((r, i) => {
    const name = (r && (r.name || r.nameEn || r.value)) || `节奏 ${i}`;
    return `<button class="grid-btn" data-idx="${i}">${i}: ${name}</button>`;
  }).join('');
  grid.querySelectorAll('.grid-btn').forEach(b => {
    b.onclick = () => {
      const idx = +b.dataset.idx;
      if (playing) {
        // Stop → Select → Start
        send(CA99.buildMetronomeRun(false));
        send(CA99.buildMetronomeMode(1));
        send(CA99.buildRhythmSelect(idx));
        send(CA99.buildMetronomeRun(true));
      } else {
        send(CA99.buildMetronomeMode(1));
        send(CA99.buildRhythmSelect(idx));
      }
      log(`节奏 ${idx}`, 'ok');
      // highlight selected
      grid.querySelectorAll('.grid-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    };
  });
}

// ========== 模块 5: MIDI 监视器 ==========
let monitorEl;
function renderMonitor() {
  $('#module-monitor').innerHTML = `<h2 style="margin-bottom:12px">MIDI 输入监视器</h2>
    <p style="color:var(--muted);margin-bottom:8px">弹琴或在钢琴上改设置，这里实时显示收到的 MIDI。</p>
    <div id="monitor-out"></div>`;
  monitorEl = $('#monitor-out');
}
function addMonitorLine(text, cls = '') {
  if (!monitorEl) return;
  const d = document.createElement('div');
  if (cls) d.className = cls;
  d.textContent = text;
  monitorEl.prepend(d);
  while (monitorEl.children.length > 200) monitorEl.lastChild.remove();
}

// ========== 模块 6: 自动换音色 ==========
function applySound(id, ch = 0) {
  const s = SOUNDS.find(x => x.id === id);
  if (!s) return;
  sendMulti(CA99.buildSoundSelect(s, ch));
  log(`🔄 自动切音色: ${s.name}`, 'ok');
  // 高亮当前在自动模块的显示
  const cur = $('#rotate-current');
  if (cur) cur.textContent = `当前: ${s.name} (${s.category})`;
}

function renderAutoRotate() {
  const root = $('#module-auto');
  const cats = [...new Set(SOUNDS.map(s => s.category))];
  // 默认多样化池：钢琴/电钢/弦乐/管风琴/颤音
  const defaultCats = ['Piano 1', 'Electric Piano', 'Strings', 'Organ', 'Harpsi & Mallets']
    .filter(c => cats.includes(c));
  const defaultPool = diversePool(SOUNDS, defaultCats);

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🔄 自动换音色</h2>
    <p style="color:var(--muted);margin-bottom:14px">定时或按节拍自动循环切换音色，演奏更有趣。你最初的想法 ✨</p>

    <div class="card-panel">
      <div class="param-row"><label>触发模式</label>
        <select id="rot-mode">
          <option value="time">按时间（每 N 秒）</option>
          <option value="beat">按节拍（弹 N 个音符换一次）</option>
        </select></div>
      <div class="param-row"><label id="rot-interval-label">间隔（秒）</label>
        <input type="range" id="rot-interval" min="1" max="30" value="6"><span class="val" id="rot-interval-val">6</span></div>
      <div class="param-row"><label>顺序</label>
        <select id="rot-order">
          <option value="sequential">顺序循环</option>
          <option value="random">随机</option>
        </select></div>
      <div class="param-row"><label>输出通道</label>
        <select id="rot-ch"><option value="0">Main1</option><option value="1">Main2</option></select></div>
    </div>

    <h3 style="margin:16px 0 8px">音色池（点击切换是否包含）</h3>
    <p style="color:var(--muted);font-size:13px;margin-bottom:8px">默认选了几个分类的代表音色。点卡片增删。</p>
    <div class="sound-grid" id="rot-pool"></div>

    <div class="rotate-bar">
      <button id="rot-toggle" class="big-btn">▶ 开始</button>
      <span id="rotate-current" style="color:var(--muted)">未运行</span>
    </div>`;

  // 池状态：用 Set 存 id
  const poolSet = new Set(defaultPool);
  const poolGrid = $('#rot-pool');
  function drawPool() {
    // 展示常用分类的音色供选择（避免 346 全列）
    const candidates = SOUNDS.filter(s => defaultCats.includes(s.category) || poolSet.has(s.id));
    poolGrid.innerHTML = candidates.map(s => `
      <div class="sound-card ${poolSet.has(s.id) ? 'active' : ''}" data-id="${s.id}">
        <div class="name">${s.name}</div>
        <div class="meta">${s.category}</div>
      </div>`).join('');
    poolGrid.querySelectorAll('.sound-card').forEach(card => {
      card.onclick = () => {
        const id = +card.dataset.id;
        if (poolSet.has(id)) poolSet.delete(id); else poolSet.add(id);
        card.classList.toggle('active');
      };
    });
  }
  drawPool();

  // 模式切换时改 interval label/范围
  const modeSel = $('#rot-mode'), intervalSlider = $('#rot-interval');
  modeSel.onchange = () => {
    const beat = modeSel.value === 'beat';
    $('#rot-interval-label').textContent = beat ? '间隔（音符数）' : '间隔（秒）';
    intervalSlider.min = beat ? 2 : 1;
    intervalSlider.max = beat ? 64 : 30;
    intervalSlider.value = beat ? 16 : 6;
    $('#rot-interval-val').textContent = intervalSlider.value;
  };
  intervalSlider.oninput = () => $('#rot-interval-val').textContent = intervalSlider.value;

  $('#rot-toggle').onclick = () => {
    if (rotateEngine && rotateEngine.running) {
      rotateEngine.stop();
      rotateEngine = null;
      $('#rot-toggle').textContent = '▶ 开始';
      $('#rot-toggle').classList.remove('running');
      $('#rotate-current').textContent = '已停止';
      log('自动换音色: 停止');
      return;
    }
    const pool = [...poolSet];
    if (!pool.length) { log('音色池为空，请先选音色', 'err'); return; }
    const ch = +$('#rot-ch').value;
    rotateEngine = new RotateEngine({
      pool,
      mode: modeSel.value,
      interval: +intervalSlider.value,
      order: $('#rot-order').value,
    });
    rotateEngine.onChange = (id) => applySound(id, ch);
    rotateEngine.start();
    $('#rot-toggle').textContent = '⏸ 停止';
    $('#rot-toggle').classList.add('running');
    log(`自动换音色: 启动（${modeSel.value} 模式, ${pool.length} 个音色）`, 'ok');
  };
}

// ========== 模块 7: VT 参数渐变器（CA99 独有） ==========
function renderMorph() {
  const root = $('#module-morph');
  const continuous = continuousVtParams();

  // 默认选最具"塑造感"的共鸣/击弦参数
  const prefer = ['StringResonance', 'DamperResonance', 'KeyAttackNoise', 'CabinetResonance', 'DamperNoise'];
  const defaults = new Set();
  for (const p of prefer) {
    const hit = continuous.find(c => c.name === p);
    if (hit) defaults.add(hit.v2);
    if (defaults.size >= 2) break;
  }
  if (defaults.size === 0) continuous.slice(0, 2).forEach(c => defaults.add(c.v2));

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🌗 VT 参数渐变器</h2>
    <p style="color:var(--muted);margin-bottom:14px">边弹边把 Virtual Technician 参数从起点平滑变化到终点，营造"音色慢慢呼吸"的效果。<b>CA99 独有玩法</b> ✨</p>

    <div class="card-panel">
      <div class="param-row"><label>时长（秒）</label>
        <input type="range" id="morph-dur" min="2" max="60" value="12"><span class="val" id="morph-dur-val">12</span></div>
      <div class="param-row"><label>曲线</label>
        <select id="morph-ease">
          <option value="easeInOut">平滑（缓入缓出）</option>
          <option value="linear">线性</option>
        </select></div>
      <div class="param-row"><label>往返循环</label>
        <select id="morph-pingpong">
          <option value="0">否（到终点停止）</option>
          <option value="1">是（终点→起点反复）</option>
        </select></div>
    </div>

    <h3 style="margin:16px 0 8px">渐变通道（勾选要变化的参数，设起点/终点）</h3>
    <div id="morph-lanes"></div>

    <div class="rotate-bar">
      <button id="morph-toggle" class="big-btn">▶ 开始渐变</button>
      <span id="morph-status" style="color:var(--muted)">未运行</span>
    </div>`;

  const lanesBox = $('#morph-lanes');
  lanesBox.innerHTML = continuous.map(c => `
    <div class="card-panel" style="margin-bottom:8px" data-v2="${c.v2}">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" class="morph-on" ${defaults.has(c.v2) ? 'checked' : ''}>
        <b>${c.name}</b> <span style="color:var(--muted);font-size:12px">(${c.min}–${c.max})</span></label>
      <div class="param-row"><label>起点</label>
        <input type="range" class="morph-from" min="${c.min}" max="${c.max}" value="${c.min}"><span class="val">${c.min}</span></div>
      <div class="param-row"><label>终点</label>
        <input type="range" class="morph-to" min="${c.min}" max="${c.max}" value="${c.max}"><span class="val">${c.max}</span></div>
    </div>`).join('') || '<p style="color:var(--muted)">无可用的连续 VT 参数</p>';

  lanesBox.querySelectorAll('input[type=range]').forEach(sl => {
    sl.oninput = () => { sl.nextElementSibling.textContent = sl.value; };
  });
  $('#morph-dur').oninput = (e) => $('#morph-dur-val').textContent = e.target.value;

  $('#morph-toggle').onclick = () => {
    if (morphEngine && morphEngine.running) {
      morphEngine.stop();
      morphEngine = null;
      $('#morph-toggle').textContent = '▶ 开始渐变';
      $('#morph-toggle').classList.remove('running');
      $('#morph-status').textContent = '已停止';
      log('VT 渐变: 停止');
      return;
    }
    // 收集勾选的通道
    const lanes = [];
    lanesBox.querySelectorAll('[data-v2]').forEach(box => {
      if (box.querySelector('.morph-on').checked) {
        lanes.push({
          v2: +box.dataset.v2,
          from: +box.querySelector('.morph-from').value,
          to: +box.querySelector('.morph-to').value,
        });
      }
    });
    if (!lanes.length) { log('请至少勾选一个渐变通道', 'err'); return; }

    morphEngine = new MorphEngine({
      lanes,
      durationMs: +$('#morph-dur').value * 1000,
      tickMs: 120,
      easing: $('#morph-ease').value,
      pingpong: $('#morph-pingpong').value === '1',
    });
    morphEngine.nowFn = () => performance.now();
    morphEngine.onApply = (v2, value) => {
      send(CA99.buildSysEx(0x10, 0x50, v2, CA99.PART.System, [value]));
    };
    morphEngine.onDone = () => {
      $('#morph-toggle').textContent = '▶ 开始渐变';
      $('#morph-toggle').classList.remove('running');
      $('#morph-status').textContent = '✓ 完成';
      log('VT 渐变: 完成', 'ok');
      morphEngine = null;
    };
    // 状态显示每帧更新（用包一层 onApply 计算进度略复杂，这里简单显示运行中）
    morphEngine.start(performance.now());
    $('#morph-toggle').textContent = '⏸ 停止';
    $('#morph-toggle').classList.add('running');
    $('#morph-status').textContent = `运行中（${lanes.length} 通道）`;
    log(`VT 渐变: 启动（${lanes.length} 通道, ${$('#morph-dur').value}s, ${$('#morph-ease').value}）`, 'ok');
  };
}

// ========== 模块 8: 力度感应换音色 ==========
function renderVelocity() {
  const root = $('#module-velocity');
  // 默认用钢琴/电钢/弦乐三个力度层（找得到就用，找不到取前三）
  const pickByName = (kw) => SOUNDS.find(s => (s.name || '').toLowerCase().includes(kw));
  const def = [
    pickByName('piano') || SOUNDS[0],
    pickByName('e.piano') || pickByName('electric') || SOUNDS[1],
    pickByName('strings') || pickByName('pad') || SOUNDS[2],
  ].filter(Boolean);

  // 当前分层状态：力度从弱到强的音色 id 列表
  let layerIds = def.map(s => s.id);

  const soundOptions = (selId) => SOUNDS.map(s =>
    `<option value="${s.id}" ${s.id === selId ? 'selected' : ''}>${s.name}（${s.category}）</option>`).join('');

  function render() {
    const zones = splitZones(layerIds);
    root.innerHTML = `
      <h2 style="margin-bottom:6px">🎚️ 力度感应换音色</h2>
      <p style="color:var(--muted);margin-bottom:14px">按弹奏力度自动切换音色：轻弹一个音色，重弹换另一个，演奏更有层次。需先在顶栏选好 <b>MIDI 输入</b>端口。</p>

      <div class="card-panel">
        <div class="param-row"><label>输出通道</label>
          <select id="vel-ch"><option value="0">Main1</option><option value="1">Main2</option></select></div>
        <div class="param-row"><label>层数</label>
          <select id="vel-layers">
            <option value="2" ${layerIds.length === 2 ? 'selected' : ''}>2 层</option>
            <option value="3" ${layerIds.length === 3 ? 'selected' : ''}>3 层</option>
            <option value="4" ${layerIds.length === 4 ? 'selected' : ''}>4 层</option>
          </select></div>
      </div>

      <h3 style="margin:16px 0 8px">力度分层（从弱到强）</h3>
      <div>
        ${layerIds.map((id, i) => `
          <div class="card-panel" style="margin-bottom:8px">
            <div class="param-row"><label>力度 ${zones[i].min}–${zones[i].max}</label>
              <select class="vel-sound" data-i="${i}" style="flex:1">${soundOptions(id)}</select></div>
          </div>`).join('')}
      </div>

      <div class="rotate-bar">
        <button id="vel-toggle" class="big-btn">▶ 启用</button>
        <span id="vel-status" style="color:var(--muted)">未启用</span>
      </div>`;

    $('#vel-layers').onchange = (e) => {
      const n = +e.target.value;
      const cur = layerIds.slice(0, n);
      while (cur.length < n) cur.push(SOUNDS[cur.length] ? SOUNDS[cur.length].id : layerIds[0]);
      layerIds = cur;
      const wasOn = velocityRouter != null;
      render();
      if (wasOn) startRouter(); // 保持启用并刷新分区
    };
    root.querySelectorAll('.vel-sound').forEach(sel => {
      sel.onchange = () => {
        layerIds[+sel.dataset.i] = +sel.value;
        if (velocityRouter) startRouter(); // 实时更新
      };
    });
    $('#vel-toggle').onclick = () => {
      if (velocityRouter) {
        velocityRouter = null;
        $('#vel-toggle').textContent = '▶ 启用';
        $('#vel-toggle').classList.remove('running');
        $('#vel-status').textContent = '已停用';
        log('力度换音色: 停用');
      } else {
        startRouter();
        $('#vel-toggle').textContent = '⏸ 停用';
        $('#vel-toggle').classList.add('running');
        log(`力度换音色: 启用（${layerIds.length} 层）`, 'ok');
      }
    };
  }

  function startRouter() {
    const ch = +($('#vel-ch')?.value || 0);
    velocityRouter = new VelocityRouter(splitZones(layerIds));
    velocityRouter.onSwitch = (id, zone) => {
      applySound(id, ch);
      const s = SOUNDS.find(x => x.id === id);
      $('#vel-status').textContent = `当前: ${s ? s.name : id}（力度${zone.min}-${zone.max}）`;
    };
  }

  render();
}

// ========== 模块 9: 力度→VT 联动 ==========
function renderVelVt() {
  const root = $('#module-velvt');
  const continuous = continuousVtParams();

  // 默认联动最有"表现力"的参数：StringResonance（越重越强）+ DamperNoise
  const prefer = ['StringResonance', 'DamperNoise', 'KeyAttackNoise', 'CabinetResonance'];
  const defaults = new Set();
  for (const p of prefer) {
    if (continuous.find(c => c.name === p)) defaults.add(p);
    if (defaults.size >= 2) break;
  }
  if (defaults.size === 0) continuous.slice(0, 2).forEach(c => defaults.add(c.name));

  root.innerHTML = `
    <h2 style="margin-bottom:6px">💫 力度 → VT 联动</h2>
    <p style="color:var(--muted);margin-bottom:14px">弹奏力度<b>实时驱动</b> VT 参数：弹得越重，击弦共鸣/噪声越强，音色随手而动。需先选好 <b>MIDI 输入</b>端口。<b>CA99 独有表现力玩法</b> ✨</p>

    <div class="card-panel">
      <div class="param-row"><label>平滑度</label>
        <input type="range" id="vv-smooth" min="0" max="90" value="50"><span class="val" id="vv-smooth-val">50%</span></div>
      <p style="color:var(--muted);font-size:12px;margin:0">平滑度越高，参数跟随力度变化越柔和（不抖动）；越低越灵敏。</p>
    </div>

    <h3 style="margin:16px 0 8px">联动通道（勾选要随力度变化的 VT 参数）</h3>
    <div id="vv-lanes"></div>

    <div class="rotate-bar">
      <button id="vv-toggle" class="big-btn">▶ 启用</button>
      <span id="vv-status" style="color:var(--muted)">未启用</span>
    </div>`;

  const lanesBox = $('#vv-lanes');
  lanesBox.innerHTML = continuous.map(c => `
    <div class="card-panel" style="margin-bottom:8px" data-v2="${c.v2}" data-min="${c.min}" data-max="${c.max}">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
        <input type="checkbox" class="vv-on" ${defaults.has(c.name) ? 'checked' : ''}>
        <b>${c.name}</b> <span style="color:var(--muted);font-size:12px">(${c.min}–${c.max})</span></label>
      <div class="param-row"><label>映射方向</label>
        <select class="vv-dir">
          <option value="0">越重越强（${c.min}→${c.max}）</option>
          <option value="1">越重越弱（${c.max}→${c.min}）</option>
        </select></div>
    </div>`).join('') || '<p style="color:var(--muted)">无可用的连续 VT 参数</p>';

  $('#vv-smooth').oninput = (e) => {
    $('#vv-smooth-val').textContent = e.target.value + '%';
    if (velVtLink) velVtLink.smooth = +e.target.value / 100;
  };
  lanesBox.querySelectorAll('.vv-on, .vv-dir').forEach(el => {
    el.onchange = () => { if (velVtLink) startLink(); };
  });

  function collectLanes() {
    const lanes = [];
    lanesBox.querySelectorAll('[data-v2]').forEach(box => {
      if (box.querySelector('.vv-on').checked) {
        lanes.push({
          v2: +box.dataset.v2,
          outMin: +box.dataset.min,
          outMax: +box.dataset.max,
          invert: box.querySelector('.vv-dir').value === '1',
        });
      }
    });
    return lanes;
  }

  function startLink() {
    const lanes = collectLanes();
    if (!lanes.length) { log('请至少勾选一个联动通道', 'err'); return false; }
    velVtLink = new VelVtLink({ lanes, smooth: +$('#vv-smooth').value / 100 });
    velVtLink.onApply = (v2, value) => {
      send(CA99.buildSysEx(0x10, 0x50, v2, CA99.PART.System, [value]));
      $('#vv-status').textContent = `运行中（${lanes.length} 通道）`;
    };
    return true;
  }

  $('#vv-toggle').onclick = () => {
    if (velVtLink) {
      velVtLink = null;
      $('#vv-toggle').textContent = '▶ 启用';
      $('#vv-toggle').classList.remove('running');
      $('#vv-status').textContent = '已停用';
      log('力度→VT 联动: 停用');
    } else {
      if (!startLink()) return;
      $('#vv-toggle').textContent = '⏸ 停用';
      $('#vv-toggle').classList.add('running');
      $('#vv-status').textContent = '运行中（等待弹奏…）';
      log(`力度→VT 联动: 启用（${collectLanes().length} 通道）`, 'ok');
    }
  };
}

// ========== 模块 10: 踏板控制扩展 ==========
function renderPedal() {
  const root = $('#module-pedal');
  const continuous = continuousVtParams();
  const pedalNames = { damper: '延音踏板（右）', sostenuto: '保持踏板（中）', soft: '弱音踏板（左）', expression: '表情' };

  const vtOptions = (selV2) => continuous.map(c =>
    `<option value="${c.v2}" data-min="${c.min}" data-max="${c.max}" ${c.v2 === selV2 ? 'selected' : ''}>${c.name}（${c.min}-${c.max}）</option>`).join('');
  const defaultParam = continuous.find(c => c.name === 'StringResonance') || continuous[0];

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🦶 踏板控制扩展</h2>
    <p style="color:var(--muted);margin-bottom:14px">实时显示三个踏板的状态，并可把<b>踏板深度</b>映射到一个 VT 参数（例：延音踏板踩得越深，击弦共鸣越强）。需先选好 <b>MIDI 输入</b>端口。</p>

    <h3 style="margin:0 0 8px">踏板状态</h3>
    <div class="pedal-grid" id="pedal-status">
      ${Object.entries(pedalNames).map(([k, label]) => `
        <div class="pedal-card" data-pedal="${k}">
          <div class="pedal-name">${label}</div>
          <div class="pedal-bar"><div class="pedal-fill" style="height:0%"></div></div>
          <div class="pedal-val">0</div>
        </div>`).join('')}
    </div>

    <h3 style="margin:18px 0 8px">踏板 → VT 映射（可选）</h3>
    <div class="card-panel">
      <div class="param-row"><label>映射开关</label>
        <select id="ped-map-on"><option value="0">关闭</option><option value="1">开启</option></select></div>
      <div class="param-row"><label>用哪个踏板</label>
        <select id="ped-map-pedal">
          ${Object.entries(pedalNames).map(([k, label]) => `<option value="${k}">${label}</option>`).join('')}
        </select></div>
      <div class="param-row"><label>驱动哪个 VT 参数</label>
        <select id="ped-map-vt">${vtOptions(defaultParam?.v2)}</select></div>
      <div class="param-row"><label>映射方向</label>
        <select id="ped-map-dir">
          <option value="0">踩得越深越强</option>
          <option value="1">踩得越深越弱</option>
        </select></div>
    </div>
    <div class="rotate-bar"><span id="ped-map-status" style="color:var(--muted)">映射未开启</span></div>`;

  // 踏板状态实时反映
  function paintPedal(pedal, st) {
    const card = root.querySelector(`.pedal-card[data-pedal="${pedal}"]`);
    if (!card) return;
    const pct = Math.round((st.value / 127) * 100);
    card.querySelector('.pedal-fill').style.height = pct + '%';
    card.querySelector('.pedal-val').textContent = st.value;
    card.classList.toggle('on', st.on);
  }

  function buildMap() {
    const vtSel = $('#ped-map-vt');
    const opt = vtSel.options[vtSel.selectedIndex];
    return {
      pedal: $('#ped-map-pedal').value,
      v2: +vtSel.value,
      outMin: +opt.dataset.min,
      outMax: +opt.dataset.max,
      invert: $('#ped-map-dir').value === '1',
    };
  }

  function refresh() {
    const on = $('#ped-map-on').value === '1';
    // 控制器始终存在（用于状态显示），映射按需设置
    if (!pedalController) {
      pedalController = new PedalController();
      pedalController.onPedal = paintPedal;
      pedalController.onApply = (v2, value) => {
        send(CA99.buildSysEx(0x10, 0x50, v2, CA99.PART.System, [value]));
      };
    }
    if (on) {
      pedalController.setMap(buildMap());
      const opt = $('#ped-map-vt').options[$('#ped-map-vt').selectedIndex];
      $('#ped-map-status').textContent = `映射开启：${pedalNames[$('#ped-map-pedal').value]} → ${opt.textContent}`;
      log(`踏板映射: ${$('#ped-map-pedal').value} → VT v2=${$('#ped-map-vt').value}`, 'ok');
    } else {
      pedalController.setMap(null);
      $('#ped-map-status').textContent = '映射未开启（踏板状态仍实时显示）';
    }
  }

  ['#ped-map-on', '#ped-map-pedal', '#ped-map-vt', '#ped-map-dir'].forEach(sel => {
    $(sel).onchange = refresh;
  });
  // 初始化控制器（仅状态显示，无映射）
  refresh();
}

// ========== 模块 11: 演出预设 ==========
/** 捕获当前设置快照：激活音色 + VT 控件当前值 */
function capturePreset() {
  const snap = { vt: [] };
  // 激活的音色卡（音色浏览器里点过的）
  const activeCard = document.querySelector('#module-sounds .sound-card.active');
  if (activeCard) {
    snap.sound = { id: +activeCard.dataset.id, channel: +($('#sound-part')?.value || 0) };
  }
  // VT 调音台当前所有控件值
  document.querySelectorAll('#module-vt [data-v2]').forEach(el => {
    snap.vt.push({ v2: +el.dataset.v2, value: +el.value });
  });
  return snap;
}

/** 应用预设快照到钢琴（发 MIDI） */
function applyPreset(snap) {
  let n = 0;
  if (snap.sound) {
    const s = SOUNDS.find(x => x.id === snap.sound.id);
    if (s) { sendMulti(CA99.buildSoundSelect(s, snap.sound.channel || 0)); n++; }
  }
  for (const p of (snap.vt || [])) {
    send(CA99.buildSysEx(0x10, 0x50, p.v2, CA99.PART.System, [p.value & 0x7f]));
    n++;
  }
  return n;
}

function renderPresets() {
  const root = $('#module-presets');
  if (!presetStore) {
    const storage = (typeof localStorage !== 'undefined') ? localStorage : undefined;
    presetStore = new PresetStore({ storage, key: 'ca99-presets' });
  }

  root.innerHTML = `
    <h2 style="margin-bottom:6px">⭐ 演出预设</h2>
    <p style="color:var(--muted);margin-bottom:14px">把当前的<b>音色 + VT 调音</b>组合命名保存，演出时一键调用。数据存于浏览器本地（localStorage），可导出备份。</p>

    <div class="card-panel">
      <div class="param-row"><label>预设名</label>
        <input type="text" id="preset-name" placeholder="如：温暖爵士 / 明亮古典" style="flex:1;background:var(--accent);color:var(--text);border:1px solid var(--line);border-radius:8px;padding:9px 12px;font-size:14px"></div>
      <div class="param-row" style="border:none">
        <button id="preset-save" class="big-btn" style="padding:11px 24px;font-size:15px">💾 保存当前设置</button>
      </div>
    </div>

    <h3 style="margin:18px 0 8px">已保存预设 <span id="preset-count" style="color:var(--muted);font-size:13px"></span></h3>
    <div id="preset-list"></div>

    <div class="toolbar" style="margin-top:18px">
      <button id="preset-export" class="grid-btn">⬇ 导出 JSON</button>
      <button id="preset-import" class="grid-btn">⬆ 导入 JSON</button>
    </div>
    <textarea id="preset-io" placeholder="导出的 JSON 会显示在这里；粘贴 JSON 后点导入" style="display:none;width:100%;height:140px;margin-top:10px;background:#0d1020;color:var(--text);border:1px solid var(--line);border-radius:10px;padding:12px;font-family:ui-monospace,monospace;font-size:12px"></textarea>`;

  function drawList() {
    const names = presetStore.list();
    $('#preset-count').textContent = `(${names.length})`;
    const box = $('#preset-list');
    if (!names.length) {
      box.innerHTML = '<p style="color:var(--muted)">还没有预设。设好音色和 VT 后，输入名字点"保存当前设置"。</p>';
      return;
    }
    box.innerHTML = names.map(name => {
      const d = presetStore.load(name) || {};
      const sn = d.sound ? (SOUNDS.find(s => s.id === d.sound.id)?.name || `音色#${d.sound.id}`) : '（无音色）';
      const vtCount = (d.vt || []).length;
      return `<div class="card-panel preset-item" style="margin-bottom:8px;display:flex;align-items:center;gap:12px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:15px">${name}</div>
          <div style="color:var(--muted);font-size:12px;margin-top:3px">🎵 ${sn} · 🔧 ${vtCount} 个 VT 参数</div>
        </div>
        <button class="grid-btn preset-apply" data-name="${name}" style="border-color:var(--ok)">▶ 调用</button>
        <button class="grid-btn preset-del" data-name="${name}" style="border-color:var(--hi)">🗑</button>
      </div>`;
    }).join('');
    box.querySelectorAll('.preset-apply').forEach(b => {
      b.onclick = () => {
        const d = presetStore.load(b.dataset.name);
        if (!d) return;
        const n = applyPreset(d);
        log(`调用预设「${b.dataset.name}」：发送 ${n} 条设置`, 'ok');
      };
    });
    box.querySelectorAll('.preset-del').forEach(b => {
      b.onclick = () => {
        presetStore.remove(b.dataset.name);
        log(`删除预设「${b.dataset.name}」`);
        drawList();
      };
    });
  }

  $('#preset-save').onclick = () => {
    const name = $('#preset-name').value.trim();
    if (!name) { log('请先输入预设名', 'err'); return; }
    const snap = capturePreset();
    presetStore.save(name, snap);
    $('#preset-name').value = '';
    const vtN = (snap.vt || []).length;
    log(`保存预设「${name}」：${snap.sound ? '含音色' : '无音色'} + ${vtN} 个 VT 参数`, 'ok');
    drawList();
  };

  $('#preset-export').onclick = () => {
    const io = $('#preset-io');
    io.style.display = 'block';
    io.value = presetStore.exportJSON();
    log('已导出预设 JSON（可复制备份）', 'ok');
  };
  $('#preset-import').onclick = () => {
    const io = $('#preset-io');
    if (io.style.display === 'none') { io.style.display = 'block'; io.placeholder = '在此粘贴预设 JSON，再点一次导入'; return; }
    const text = io.value.trim();
    if (!text) { log('请先在文本框粘贴 JSON', 'err'); return; }
    try {
      const n = presetStore.importJSON(text, true);
      log(`导入成功：${n} 个预设`, 'ok');
      drawList();
    } catch (e) { log('导入失败: ' + e.message, 'err'); }
  };

  drawList();
}

// ========== 模块 12: 和弦练习 ==========
function renderChord() {
  const root = $('#module-chord');
  let challenge = null;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎓 和弦练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">在钢琴上弹和弦，下方实时显示和弦名。开启挑战模式，按提示弹出和弦闯关。需先选好 <b>MIDI 输入</b>端口。</p>

    <div class="chord-display card-panel">
      <div style="color:var(--muted);font-size:13px">当前弹奏</div>
      <div id="chord-now" class="chord-now">—</div>
      <div id="chord-detail" style="color:var(--muted);font-size:13px;min-height:18px"></div>
    </div>

    <h3 style="margin:18px 0 10px">挑战模式</h3>
    <div class="card-panel">
      <div class="rotate-bar" style="margin:0">
        <button id="chord-start" class="big-btn">▶ 开始挑战</button>
        <div class="chord-stats">
          <span>得分 <b id="chord-score">0</b></span>
          <span>连击 <b id="chord-streak">0</b></span>
          <span>最佳 <b id="chord-best">0</b></span>
        </div>
      </div>
      <div id="chord-quiz" style="display:none;margin-top:16px;text-align:center">
        <div style="color:var(--muted);font-size:13px">请弹出</div>
        <div id="chord-target" class="chord-target">—</div>
        <div id="chord-feedback" style="min-height:24px;font-weight:700"></div>
      </div>
      <div class="kb-wrap">
        <div class="kb-cap">🎹 挑战开始后，这里把目标和弦该按的键高亮在 88 键上（点键可试听）；照着位置在钢琴上弹出即可过关</div>
        <div id="chord-kb"></div>
      </div>
    </div>`;

  const CT_IV = { '': [0, 4, 7], 'm': [0, 3, 7], '7': [0, 4, 7, 10], 'maj7': [0, 4, 7, 11], 'm7': [0, 3, 7, 10] };
  const CT_NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function chordTargetMidi(q) { const base = 60 + CT_NOTE.indexOf(q.root); return (CT_IV[q.suffix] || [0, 4, 7]).map((iv) => base + iv); }
  const chordKb = new PianoKeyboard($('#chord-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  chordKb.scrollToShow(55, 79);

  const nowEl = $('#chord-now'), detailEl = $('#chord-detail');

  // 实时显示当前按下的和弦/音符
  chordOnNotesChanged = (notes) => {
    if (!notes.length) { nowEl.textContent = '—'; detailEl.textContent = ''; return; }
    nowEl.textContent = describeNotes(notes) || '—';
    const chord = detectChord(notes);
    detailEl.textContent = chord ? `${chord.name}${chord.inversion ? ' · 转位（低音 ' + chord.bass + '）' : ''}` : `${notes.length} 个音`;
    // 挑战判定
    if (challenge && challenge.current) {
      if (challenge.check(notes)) {
        flashFeedback(true);
      }
    }
  };

  function flashFeedback(okk) {
    const fb = $('#chord-feedback');
    if (okk) { fb.textContent = '✓ 正确！'; fb.style.color = 'var(--ok)'; }
    setTimeout(() => { if (fb) fb.textContent = ''; }, 700);
  }

  function paintStats() {
    $('#chord-score').textContent = challenge.score;
    $('#chord-streak').textContent = challenge.streak;
    $('#chord-best').textContent = challenge.best;
  }

  $('#chord-start').onclick = () => {
    if (challenge) {
      challenge = null;
      $('#chord-start').textContent = '▶ 开始挑战';
      $('#chord-start').classList.remove('running');
      $('#chord-quiz').style.display = 'none';
      chordKb.clear();
      log('和弦挑战: 结束');
      return;
    }
    challenge = new ChordChallenge();
    challenge.onCorrect = () => paintStats();
    challenge.onNew = (q) => {
      $('#chord-target').textContent = `${q.root} ${q.label}`;
      const notes = chordTargetMidi(q);
      chordKb.highlightMany(notes.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
    };
    challenge.next();
    paintStats();
    $('#chord-start').textContent = '⏸ 结束挑战';
    $('#chord-start').classList.add('running');
    $('#chord-quiz').style.display = 'block';
    log('和弦挑战: 开始', 'ok');
  };
}

// ========== 模块 13: 节拍器 + 节奏练习 ==========
let _audioCtx = null;
function clickSound(isAccent) {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = isAccent ? 1500 : 900;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(isAccent ? 0.5 : 0.3, ctx.currentTime + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.05);
  } catch (e) { /* 静默：无音频上下文时只显示视觉 */ }
}

function renderMetro() {
  const root = $('#module-metro');
  const tempoTracker = new TempoTracker({ window: 6 });

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎵 节拍器 + 节奏练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">可视+可听节拍器帮你稳定节奏；弹奏时下方实时显示你的<b>实际速度（BPM）</b>，练习时一目了然。</p>

    <div class="card-panel">
      <div class="param-row"><label>速度（BPM）</label>
        <input type="range" id="metro-bpm" min="40" max="208" value="90"><span class="val" id="metro-bpm-val">90</span></div>
      <div class="param-row"><label>拍号（每小节拍数）</label>
        <select id="metro-beats">
          <option value="2">2/4</option>
          <option value="3">3/4</option>
          <option value="4" selected>4/4</option>
          <option value="6">6/8</option>
        </select></div>
    </div>

    <div class="metro-beats" id="metro-dots"></div>

    <div class="rotate-bar">
      <button id="metro-toggle" class="big-btn">▶ 开始</button>
      <div class="chord-stats">
        <span>你的速度 <b id="metro-tempo">—</b> BPM</span>
      </div>
    </div>`;

  function drawDots() {
    const n = +$('#metro-beats').value;
    $('#metro-dots').innerHTML = Array.from({ length: n }, (_, i) =>
      `<div class="metro-dot ${i === 0 ? 'accent' : ''}" data-beat="${i}"></div>`).join('');
  }
  drawDots();

  function flashDot(beat) {
    const dots = $('#metro-dots').querySelectorAll('.metro-dot');
    dots.forEach(d => d.classList.remove('active'));
    const dot = dots[beat];
    if (dot) {
      dot.classList.add('active');
      setTimeout(() => dot.classList.remove('active'), 120);
    }
  }

  $('#metro-bpm').oninput = (e) => {
    $('#metro-bpm-val').textContent = e.target.value;
    if (metronome) metronome.setBpm(+e.target.value);
  };
  $('#metro-beats').onchange = (e) => {
    drawDots();
    if (metronome) metronome.setBeatsPerBar(+e.target.value);
  };

  $('#metro-toggle').onclick = () => {
    if (metronome && metronome.running) {
      metronome.stop();
      metronome = null;
      $('#metro-toggle').textContent = '▶ 开始';
      $('#metro-toggle').classList.remove('running');
      log('节拍器: 停止');
      return;
    }
    metronome = new Metronome({ bpm: +$('#metro-bpm').value, beatsPerBar: +$('#metro-beats').value });
    metronome.onTick = (info) => { clickSound(info.isAccent); flashDot(info.beat); };
    metronome.start();
    $('#metro-toggle').textContent = '⏸ 停止';
    $('#metro-toggle').classList.add('running');
    log(`节拍器: 开始（${$('#metro-bpm').value} BPM, ${$('#metro-beats').value} 拍/小节）`, 'ok');
  };

  // 演奏速度检测：每个 note-on 更新估算 BPM
  tempoOnNote = (t) => {
    const bpm = tempoTracker.feed(t);
    if (bpm) $('#metro-tempo').textContent = bpm;
  };
}

// ========== 模块 14: 录制回放 ==========
function renderRecorder() {
  const root = $('#module-recorder');
  let playTimers = [];

  root.innerHTML = `
    <h2 style="margin-bottom:6px">⏺ 录制回放</h2>
    <p style="color:var(--muted);margin-bottom:14px">录下你在钢琴上的弹奏，回放欣赏，或导出为标准 MIDI 文件（.mid）保存/分享。需先选好 <b>MIDI 输入</b>端口。</p>

    <div class="card-panel" style="text-align:center;padding:24px">
      <div id="rec-indicator" class="rec-indicator">●</div>
      <div id="rec-info" style="color:var(--muted);font-size:14px;margin-top:8px">未录制 · 0 个事件</div>
    </div>

    <div class="rotate-bar" style="flex-wrap:wrap">
      <button id="rec-toggle" class="big-btn">⏺ 开始录制</button>
      <button id="rec-play" class="grid-btn" style="padding:12px 20px">▶ 回放</button>
      <button id="rec-stop-play" class="grid-btn" style="padding:12px 20px">⏹ 停止回放</button>
      <button id="rec-export" class="grid-btn" style="padding:12px 20px">⬇ 导出 .mid</button>
      <button id="rec-clear" class="grid-btn" style="padding:12px 20px;border-color:var(--hi)">🗑 清空</button>
    </div>

    <div class="card-panel" style="margin-top:16px">
      <div class="param-row" style="border:none"><label>导出速度（BPM）</label>
        <input type="range" id="rec-bpm" min="40" max="208" value="120"><span class="val" id="rec-bpm-val">120</span></div>
    </div>`;

  function paintInfo() {
    const ind = $('#rec-indicator');
    if (recorder.recording) {
      ind.classList.add('active');
      $('#rec-info').textContent = `🔴 录制中 · ${recorder.count} 个事件 · ${(recorder.durationMs / 1000).toFixed(1)}s`;
    } else {
      ind.classList.remove('active');
      $('#rec-info').textContent = recorder.isEmpty
        ? '未录制 · 0 个事件'
        : `已录制 · ${recorder.count} 个事件 · ${(recorder.durationMs / 1000).toFixed(1)}s`;
    }
  }
  recorderOnChange = paintInfo;

  $('#rec-bpm').oninput = (e) => $('#rec-bpm-val').textContent = e.target.value;

  $('#rec-toggle').onclick = () => {
    if (recorder.recording) {
      recorder.stop();
      $('#rec-toggle').textContent = '⏺ 开始录制';
      $('#rec-toggle').classList.remove('running');
      log(`录制结束：${recorder.count} 个事件`, 'ok');
    } else {
      recorder.start(performance.now());
      $('#rec-toggle').textContent = '⏹ 停止录制';
      $('#rec-toggle').classList.add('running');
      log('开始录制…弹琴吧', 'ok');
    }
    paintInfo();
  };

  $('#rec-play').onclick = () => {
    if (recorder.isEmpty) { log('还没有录制内容', 'err'); return; }
    playTimers = recorder.play((bytes) => send(bytes));
    log(`回放：${recorder.count} 个事件`, 'ok');
  };
  $('#rec-stop-play').onclick = () => {
    playTimers.forEach(t => clearTimeout(t));
    playTimers = [];
    log('停止回放');
  };

  $('#rec-export').onclick = () => {
    if (recorder.isEmpty) { log('还没有录制内容', 'err'); return; }
    const bytes = recorder.toMidiFile({ ppq: 480, bpm: +$('#rec-bpm').value });
    const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ca99-recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.mid`;
    a.click();
    URL.revokeObjectURL(url);
    log(`导出 MIDI 文件（${bytes.length} 字节）`, 'ok');
  };

  $('#rec-clear').onclick = () => {
    recorder.clear();
    $('#rec-toggle').textContent = '⏺ 开始录制';
    $('#rec-toggle').classList.remove('running');
    paintInfo();
    log('已清空录制');
  };

  paintInfo();
}

// ========== 模块 15: 音阶练习 ==========
function renderScale() {
  const root = $('#module-scale');
  let session = null;

  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 音阶练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">选调和音阶类型，按高亮提示依次弹奏音阶。弹对自动前进，弹错给提示。需先选好 <b>MIDI 输入</b>端口。</p>

    <div class="card-panel">
      <div class="param-row"><label>根音（调）</label>
        <select id="scale-root">${roots.map(r => `<option value="${r}" ${r === 'C' ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="param-row"><label>音阶类型</label>
        <select id="scale-type">${Object.entries(SCALE_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
      <div class="param-row"><label>方向</label>
        <select id="scale-dir">
          <option value="up">上行</option>
          <option value="updown">上行+下行</option>
        </select></div>
      <div class="param-row"><label>忽略八度</label>
        <select id="scale-octave">
          <option value="0">否（要弹准八度）</option>
          <option value="1">是（任意八度都算对）</option>
        </select></div>
    </div>

    <div class="scale-keys" id="scale-keys"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 整条音阶画在 88 键上 — <span class="kb-legend" style="color:#5b8cff"><i></i>音阶音</span> <span class="kb-legend" style="color:#fbbf24"><i></i>▶ 下一个该弹的键</span>（点键可试听）</div>
      <div id="scale-kb"></div>
    </div>

    <div class="rotate-bar">
      <button id="scale-start" class="big-btn">▶ 开始练习</button>
      <span id="scale-status" style="color:var(--muted)">未开始</span>
    </div>`;

  const kb = new PianoKeyboard($('#scale-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  function paintKb(seq, idx) {
    const map = new Map();
    seq.forEach((n) => { if (!map.has(n)) map.set(n, { midi: n, color: '#5b8cff' }); });
    if (idx >= 0 && idx < seq.length) map.set(seq[idx], { midi: seq[idx], color: '#fbbf24', text: '▶' });
    kb.highlightMany([...map.values()], { scroll: false });
    if (seq.length) kb.scrollToShow(Math.min(...seq), Math.max(...seq));
  }

  function currentSeq() {
    const r = $('#scale-root').value, type = $('#scale-type').value;
    return $('#scale-dir').value === 'updown' ? buildScaleUpDown(r, type, 4) : buildScale(r, type, 4);
  }

  function drawKeys() {
    const seq = currentSeq();
    const idx = session ? session.index : -1;
    $('#scale-keys').innerHTML = seq.map((n, i) => {
      let cls = 'scale-key';
      if (session) {
        if (i < idx) cls += ' done';
        else if (i === idx) cls += ' current';
      }
      return `<div class="${cls}">${chordNoteName(n)}</div>`;
    }).join('');
    paintKb(seq, idx);
  }
  drawKeys();

  ['#scale-root', '#scale-type', '#scale-dir'].forEach(sel => {
    $(sel).onchange = () => { if (!session) drawKeys(); };
  });

  $('#scale-start').onclick = () => {
    if (session) {
      session = null;
      scaleOnNote = null;
      $('#scale-start').textContent = '▶ 开始练习';
      $('#scale-start').classList.remove('running');
      $('#scale-status').textContent = '已停止';
      drawKeys();
      log('音阶练习: 停止');
      return;
    }
    const seq = currentSeq();
    session = new ScaleSession(seq, { octaveAgnostic: $('#scale-octave').value === '1' });
    session.onAdvance = () => { drawKeys(); paintStatus(); };
    session.onError = (exp) => {
      $('#scale-status').textContent = `❌ 弹错了，下一个应是 ${chordNoteName(exp)}`;
      $('#scale-status').style.color = 'var(--hi2)';
    };
    session.onComplete = () => {
      $('#scale-status').textContent = `🎉 完成！错误 ${session.errors} 次`;
      $('#scale-status').style.color = 'var(--ok)';
      $('#scale-start').textContent = '▶ 开始练习';
      $('#scale-start').classList.remove('running');
      const done = session;
      recordPractice('scale', '音阶练习', done.sequence.length + done.errors, done.sequence.length, 0);
      session = null; scaleOnNote = null;
      drawKeysFor(done.sequence, done.sequence.length);
      log(`音阶练习完成：错误 ${done.errors} 次`, 'ok');
    };
    scaleOnNote = (note) => session && session.feed(note);
    $('#scale-start').textContent = '⏸ 停止练习';
    $('#scale-start').classList.add('running');
    paintStatus();
    drawKeys();
    log('音阶练习: 开始', 'ok');
  };

  function paintStatus() {
    if (!session) return;
    $('#scale-status').style.color = 'var(--muted)';
    $('#scale-status').textContent = `进度 ${session.index}/${session.total} · 下一个: ${chordNoteName(session.nextNote)}`;
  }

  function drawKeysFor(seq, idx) {
    $('#scale-keys').innerHTML = seq.map((n, i) =>
      `<div class="scale-key ${i < idx ? 'done' : ''}">${chordNoteName(n)}</div>`).join('');
    paintKb(seq, -1);
  }
}

function renderSight() {
  const root = $('#module-sight');
  let game = null;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">👀 视奏闪卡</h2>
    <p style="color:var(--muted);margin-bottom:14px">看五线谱上的音符，在琴键上弹出它。弹对自动出下一题，连对累计连击。需先选好 <b>MIDI 输入</b>端口。</p>

    <div class="card-panel">
      <div class="param-row"><label>谱号</label>
        <select id="sight-clef">
          <option value="treble">高音谱号 𝄞</option>
          <option value="bass">低音谱号 𝄢</option>
        </select></div>
      <div class="param-row"><label>忽略八度</label>
        <select id="sight-octave">
          <option value="1">是（任意八度都算对，适合初学）</option>
          <option value="0">否（要弹准八度）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div class="sight-staff-wrap"><div id="sight-staff"></div></div>
      <div id="sight-feedback" class="sight-feedback">按"开始"出题</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 没接 MIDI 也能点琴键当作弹奏作答；答错时会把正确音高亮在 88 键上，照着位置弹就懂了</div>
      <div id="sight-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="sight-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sight-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sight-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sight-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="sight-start" class="big-btn">▶ 开始练习</button>
      <span id="sight-status" style="color:var(--muted)">未开始</span>
    </div>`;

  // ---- SVG 五线谱绘制 ----
  const CLEF_GLYPH = { treble: '𝄞', bass: '𝄢' };
  function drawStaff(note, clef) {
    const W = 240, H = 200;
    const topY = 64, stepPx = 7;            // pos 8 = 顶线；每步 7px（两步=一线距14px）
    const yForPos = (pos) => topY + (8 - pos) * stepPx;
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="sight-svg" preserveAspectRatio="xMidYMid meet">`;
    // 五条谱线（pos 0,2,4,6,8）
    for (let p = 0; p <= 8; p += 2) {
      const y = yForPos(p);
      svg += `<line x1="30" y1="${y}" x2="${W - 16}" y2="${y}" class="staff-line"/>`;
    }
    // 谱号
    svg += `<text x="38" y="${yForPos(2) + 6}" class="clef-glyph">${CLEF_GLYPH[clef]}</text>`;

    if (note != null) {
      const pos = staffPosition(note, clef);
      const cy = yForPos(pos);
      const cx = 150;
      // 加线（音符超出谱表时）
      if (pos > 8) { for (let p = 10; p <= pos; p += 2) svg += `<line x1="${cx - 16}" y1="${yForPos(p)}" x2="${cx + 16}" y2="${yForPos(p)}" class="ledger-line"/>`; }
      if (pos < 0) { for (let p = -2; p >= pos; p -= 2) svg += `<line x1="${cx - 16}" y1="${yForPos(p)}" x2="${cx + 16}" y2="${yForPos(p)}" class="ledger-line"/>`; }
      // 符头（椭圆，略斜）
      svg += `<g id="sight-head" transform="translate(${cx},${cy})"><ellipse rx="10" ry="7.5" transform="rotate(-20)" class="note-head"/></g>`;
      // 升号
      if (isSharpNote(note)) svg += `<text x="${cx - 26}" y="${cy + 5}" class="note-sharp">♯</text>`;
    }
    svg += `</svg>`;
    $('#sight-staff').innerHTML = svg;
  }
  function isSharpNote(note) { return [1, 3, 6, 8, 10].includes(((note % 12) + 12) % 12); }

  function refreshStats() {
    if (!game) return;
    $('#sight-score').textContent = game.score;
    $('#sight-streak').textContent = game.streak;
    $('#sight-best').textContent = game.best;
    $('#sight-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function flash(ok) {
    const wrap = $('#sight-staff');
    wrap.classList.remove('flash-ok', 'flash-no');
    void wrap.offsetWidth;
    wrap.classList.add(ok ? 'flash-ok' : 'flash-no');
  }

  drawStaff(null, $('#sight-clef').value);

  const sightKb = new PianoKeyboard($('#sight-kb'), {
    labels: 'c',
    onNoteOn: (m) => { playTone(midiToFreq(m), 0, 0.6); if (sightOnNote) sightOnNote(m); },
  });
  sightKb.scrollToShow(55, 79);

  $('#sight-clef').onchange = () => { if (!game) drawStaff(null, $('#sight-clef').value); };

  $('#sight-start').onclick = () => {
    if (game) {
      recordPractice('sight', '视奏闪卡', game.attempts, game.score, game.best);
      game = null; sightOnNote = null;
      $('#sight-start').textContent = '▶ 开始练习';
      $('#sight-start').classList.remove('running');
      $('#sight-status').textContent = '已停止';
      $('#sight-feedback').textContent = '按"开始"出题';
      $('#sight-feedback').className = 'sight-feedback';
      drawStaff(null, $('#sight-clef').value);
      log('视奏闪卡: 停止');
      return;
    }
    const clef = $('#sight-clef').value;
    game = new SightReadingGame({ clef, octaveAgnostic: $('#sight-octave').value === '1' });
    game.onNew = (note) => { drawStaff(note, clef); sightKb.clear(); };
    game.onResult = (ok, info) => {
      refreshStats();
      flash(ok);
      const fb = $('#sight-feedback');
      if (ok) {
        fb.textContent = `✅ 对了！${sightNoteLabel(info.note)} · 连击 ${info.streak}`;
        fb.className = 'sight-feedback ok';
      } else {
        fb.textContent = `❌ 不对，正确答案是 ${sightNoteLabel(game.current)}`;
        fb.className = 'sight-feedback no';
      }
      if (game && game.current != null) sightKb.highlightMany([{ midi: game.current, color: ok ? '#34d399' : '#fbbf24', text: ok ? '✓' : '答' }]);
    };
    sightOnNote = (note) => game && game.check(note);
    $('#sight-start').textContent = '⏸ 停止练习';
    $('#sight-start').classList.add('running');
    $('#sight-status').textContent = '进行中…';
    refreshStats();
    game.next();
    log('视奏闪卡: 开始', 'ok');
  };
}

// ========== 模块 17: 音程听辨 ==========
function midiToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
function playTone(freq, startOffset, dur, gainPeak = 0.22) {
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    const t0 = ctx.currentTime + startOffset;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(gainPeak, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  } catch (e) { /* 无音频上下文时静默 */ }
}
function playInterval(notes, harmonic) {
  if (!notes || notes.length < 2) return;
  if (harmonic) {
    playTone(midiToFreq(notes[0]), 0, 1.1);
    playTone(midiToFreq(notes[1]), 0, 1.1);
  } else {
    playTone(midiToFreq(notes[0]), 0, 0.6);
    playTone(midiToFreq(notes[1]), 0.65, 0.6);
  }
}

function renderEar() {
  const root = $('#module-ear');
  let game = null;
  const enabled = new Set([2, 3, 4, 5, 7, 12]); // 默认初学集合

  root.innerHTML = `
    <h2 style="margin-bottom:6px">👂 音程听辨</h2>
    <p style="color:var(--muted);margin-bottom:14px">听电脑播放的两个音，辨认它们之间的<b>音程</b>。点对应按钮作答，弹对累计连击。无需连钢琴也能玩（用电脑发声）。</p>

    <div class="card-panel">
      <div class="param-row"><label>方向</label>
        <select id="ear-dir">
          <option value="up">上行（先低后高）</option>
          <option value="down">下行（先高后低）</option>
          <option value="harmonic">和声（同时响）</option>
          <option value="mixed">混合（随机）</option>
        </select></div>
      <div class="param-row" style="align-items:flex-start"><label>音程范围</label>
        <div class="ear-chips" id="ear-chips"></div></div>
    </div>

    <div class="sight-stage">
      <button id="ear-replay" class="big-btn" disabled>🔊 再听一次</button>
      <div id="ear-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
    </div>

    <div class="ear-answers" id="ear-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完显示这两个音在 88 键上的位置 — <span class="kb-legend" style="color:#5b8cff"><i></i>低音</span> <span class="kb-legend" style="color:#fbbf24"><i></i>高音</span>（点键试听）</div>
      <div id="ear-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="ear-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ear-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ear-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ear-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="ear-start" class="big-btn">▶ 开始练习</button>
      <span id="ear-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawChips() {
    $('#ear-chips').innerHTML = INTERVALS.filter(i => i.semis > 0).map(i =>
      `<button class="ear-chip ${enabled.has(i.semis) ? 'on' : ''}" data-semis="${i.semis}">${i.name}</button>`).join('');
    $('#ear-chips').querySelectorAll('.ear-chip').forEach(b => {
      b.onclick = () => {
        if (game) return;
        const s = +b.dataset.semis;
        if (enabled.has(s)) { if (enabled.size > 1) enabled.delete(s); } else enabled.add(s);
        drawChips();
      };
    });
  }
  drawChips();

  function drawAnswers() {
    const list = INTERVALS.filter(i => enabled.has(i.semis)).sort((a, b) => a.semis - b.semis);
    $('#ear-answers').innerHTML = list.map(i =>
      `<button class="ear-ans" data-semis="${i.semis}" disabled>${i.name}<small>${i.short}</small></button>`).join('');
    $('#ear-answers').querySelectorAll('.ear-ans').forEach(b => {
      b.onclick = () => answer(+b.dataset.semis, b);
    });
  }
  drawAnswers();

  drawAnswers();

  const earKb = new PianoKeyboard($('#ear-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  earKb.scrollToShow(55, 79);

  function refreshStats() {
    $('#ear-score').textContent = game.score;
    $('#ear-streak').textContent = game.streak;
    $('#ear-best').textContent = game.best;
    $('#ear-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  let answering = false;
  function answer(semis, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctSemis = game.current.semis;
    const ok = game.check(semis);
    refreshStats();
    $('#ear-answers').querySelectorAll('.ear-ans').forEach(b => {
      const s = +b.dataset.semis;
      if (s === correctSemis) b.classList.add('correct');
      else if (s === semis) b.classList.add('wrong');
      b.disabled = true;
    });
    const fb = $('#ear-feedback');
    if (ok) { fb.textContent = `✅ 对了！是${intervalName(correctSemis)} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${intervalName(correctSemis)}`; fb.className = 'sight-feedback no'; }
    const ns = game.notes();
    if (ns && ns.length >= 2) earKb.highlightMany([{ midi: ns[0], color: '#5b8cff', text: '低' }, { midi: ns[1], color: '#fbbf24', text: '高' }]);
    setTimeout(() => { if (game) nextQuestion(); }, 1100);
  }

  function nextQuestion() {
    answering = false;
    const notes = game.next();
    earKb.clear();
    $('#ear-answers').querySelectorAll('.ear-ans').forEach(b => { b.disabled = false; b.classList.remove('correct', 'wrong'); });
    $('#ear-feedback').textContent = '🎧 听一听，选出音程';
    $('#ear-feedback').className = 'sight-feedback';
    playInterval(notes, game.isHarmonic());
  }

  $('#ear-replay').onclick = () => { if (game && game.current) playInterval(game.notes(), game.isHarmonic()); };

  $('#ear-start').onclick = () => {
    if (game) {
      recordPractice('ear', '音程听辨', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#ear-start').textContent = '▶ 开始练习';
      $('#ear-start').classList.remove('running');
      $('#ear-status').textContent = '已停止';
      $('#ear-replay').disabled = true;
      $('#ear-feedback').textContent = '选好范围，按"开始"出题';
      $('#ear-feedback').className = 'sight-feedback';
      drawChips(); drawAnswers();
      log('音程听辨: 停止');
      return;
    }
    game = new EarTrainingGame({ intervals: [...enabled], direction: $('#ear-dir').value });
    $('#ear-start').textContent = '⏸ 停止练习';
    $('#ear-start').classList.add('running');
    $('#ear-status').textContent = '进行中…';
    $('#ear-replay').disabled = false;
    drawChips(); drawAnswers();
    refreshStats();
    nextQuestion();
    log('音程听辨: 开始', 'ok');
  };
}

// ========== 模块 18: 力度练习 ==========
function renderDynamics() {
  const root = $('#module-dynamics');
  let game = null;
  const enabled = new Set(['p', 'mf', 'f']);

  root.innerHTML = `
    <h2 style="margin-bottom:6px">💪 力度练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">屏幕给出目标力度（pp~ff），用对应的<b>触键强弱</b>弹任意一个琴键命中它，训练你的强弱控制。需先选好 <b>MIDI 输入</b>端口。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>练习档位</label>
        <div class="ear-chips" id="dyn-chips"></div></div>
      <div class="param-row"><label>容差</label>
        <select id="dyn-tol">
          <option value="0">严格（必须精确命中该档）</option>
          <option value="1" selected>宽松（相邻一档也算对）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div class="dyn-target" id="dyn-target">按"开始"出题</div>
      <div class="dyn-meter"><div class="dyn-bands" id="dyn-bands"></div><div class="dyn-needle" id="dyn-needle" style="left:0%"></div></div>
      <div id="dyn-feedback" class="sight-feedback">选好档位，按"开始"</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="dyn-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="dyn-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="dyn-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="dyn-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="dyn-start" class="big-btn">▶ 开始练习</button>
      <span id="dyn-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawChips() {
    $('#dyn-chips').innerHTML = DYNAMICS.map(d =>
      `<button class="ear-chip ${enabled.has(d.key) ? 'on' : ''}" data-key="${d.key}">${d.sym} <small>${d.name}</small></button>`).join('');
    $('#dyn-chips').querySelectorAll('.ear-chip').forEach(b => {
      b.onclick = () => {
        if (game) return;
        const k = b.dataset.key;
        if (enabled.has(k)) { if (enabled.size > 1) enabled.delete(k); } else enabled.add(k);
        drawChips();
      };
    });
  }
  drawChips();

  // 力度刻度条：6 档色带
  function drawBands(targetKey) {
    $('#dyn-bands').innerHTML = DYNAMICS.map(d => {
      const w = (d.max - d.min + 1) / 127 * 100;
      const isT = d.key === targetKey;
      return `<div class="dyn-band ${isT ? 'target' : ''}" style="width:${w}%">${d.sym}</div>`;
    }).join('');
  }
  drawBands(null);

  function setNeedle(vel) {
    $('#dyn-needle').style.left = (vel / 127 * 100) + '%';
  }

  function refreshStats() {
    $('#dyn-score').textContent = game.score;
    $('#dyn-streak').textContent = game.streak;
    $('#dyn-best').textContent = game.best;
    $('#dyn-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  let answering = false;
  function showTarget() {
    const t = game.target();
    $('#dyn-target').innerHTML = `请弹出 <b class="dyn-sym">${t.sym}</b>（${t.name}）`;
    drawBands(game.current);
  }

  function onNote(note, velocity) {
    if (!game || !game.current || answering) return;
    answering = true;
    setNeedle(velocity);
    const played = velocityToDynamic(velocity);
    const ok = game.check(velocity);
    refreshStats();
    const fb = $('#dyn-feedback');
    if (ok) { fb.textContent = `✅ 命中 ${game.target().sym}！你弹了力度 ${velocity}（${played.sym}）· 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 你弹了 ${played.sym}（力度 ${velocity}），目标是 ${game.target().sym}`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 1200);
  }

  function nextQuestion() {
    answering = false;
    game.next();
    showTarget();
    $('#dyn-feedback').textContent = '🎹 触键弹出目标力度';
    $('#dyn-feedback').className = 'sight-feedback';
  }

  $('#dyn-start').onclick = () => {
    if (game) {
      recordPractice('dynamics', '力度练习', game.attempts, game.score, game.best);
      game = null; dynOnNote = null; answering = false;
      $('#dyn-start').textContent = '▶ 开始练习';
      $('#dyn-start').classList.remove('running');
      $('#dyn-status').textContent = '已停止';
      $('#dyn-target').textContent = '按"开始"出题';
      $('#dyn-feedback').textContent = '选好档位，按"开始"';
      $('#dyn-feedback').className = 'sight-feedback';
      drawBands(null); setNeedle(0);
      drawChips();
      log('力度练习: 停止');
      return;
    }
    game = new DynamicsGame({ levels: [...enabled], tolerance: +$('#dyn-tol').value });
    dynOnNote = (note, velocity) => onNote(note, velocity);
    $('#dyn-start').textContent = '⏸ 停止练习';
    $('#dyn-start').classList.add('running');
    $('#dyn-status').textContent = '进行中…';
    drawChips();
    refreshStats();
    nextQuestion();
    log('力度练习: 开始', 'ok');
  };
}

// ========== 模块 19: 移调器 ==========
function renderTransposer() {
  const root = $('#module-transpose');
  const transposer = new Transposer();

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 移调器</h2>
    <p style="color:var(--muted);margin-bottom:14px">一键把整个键盘升/降调（-12 ~ +12 半音）。用熟悉的指法弹任意调的曲子——发 CA99 移调 SysEx，钢琴自身发声也跟着移调。需先连接钢琴。</p>

    <div class="card-panel" style="text-align:center">
      <div class="trans-display">
        <div class="trans-amt" id="trans-amt">0</div>
        <div class="trans-sub">半音 · 听感调 <b id="trans-key">C</b></div>
      </div>
      <div class="trans-controls">
        <button id="trans-minus" class="trans-btn">−</button>
        <input type="range" id="trans-slider" min="-12" max="12" step="1" value="0" class="trans-slider">
        <button id="trans-plus" class="trans-btn">＋</button>
      </div>
      <div class="trans-presets" id="trans-presets"></div>
      <div class="rotate-bar" style="justify-content:center;margin-top:14px">
        <button id="trans-reset" class="big-btn" style="max-width:160px">↺ 归零</button>
      </div>
      <p id="trans-hint" style="color:var(--muted);font-size:13px;margin-top:10px">移调 0：原调</p>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 点击琴键发<b>真实 MIDI</b> 到钢琴（已随当前移调量发声）——不用伸手去琴键就能听移调效果对不对</div>
      <div id="trans-kb"></div>
    </div>`;

  const transKb = new PianoKeyboard($('#trans-kb'), {
    labels: 'c',
    onNoteOn: (m) => kbMidiOn(m, 0),
    onNoteOff: (m) => kbMidiOff(m, 0),
  });
  transKb.scrollToShow(48, 72);

  const presets = [
    { s: -12, t: '低八度' }, { s: -5, t: '降4度' }, { s: -2, t: '降全音' },
    { s: 2, t: '升全音' }, { s: 5, t: '升4度' }, { s: 12, t: '高八度' },
  ];
  $('#trans-presets').innerHTML = presets.map(p =>
    `<button class="ear-chip" data-s="${p.s}">${p.t} (${semitoneLabel(p.s)})</button>`).join('');

  function paint() {
    const s = transposer.semitones;
    $('#trans-amt').textContent = semitoneLabel(s);
    $('#trans-key').textContent = transposer.keyName;
    $('#trans-slider').value = s;
    $('#trans-amt').style.color = s === 0 ? 'var(--text)' : '#667eea';
    let hint = '移调 0：原调';
    if (s > 0) hint = `升 ${s} 半音：用 C 的指法弹出 ${transposer.keyName} 调`;
    else if (s < 0) hint = `降 ${-s} 半音：用 C 的指法弹出 ${transposer.keyName} 调`;
    $('#trans-hint').textContent = hint;
    $('#trans-presets').querySelectorAll('.ear-chip').forEach(b =>
      b.classList.toggle('on', +b.dataset.s === s));
  }

  function apply(s) {
    transposer.set(s);
    paint();
    send(CA99.buildTranspose(transposer.semitones));
    log(`移调: ${semitoneLabel(transposer.semitones)} 半音（听感调 ${transposer.keyName}）`, 'ok');
  }

  $('#trans-minus').onclick = () => apply(transposer.semitones - 1);
  $('#trans-plus').onclick = () => apply(transposer.semitones + 1);
  $('#trans-slider').oninput = () => apply(+$('#trans-slider').value);
  $('#trans-reset').onclick = () => apply(0);
  $('#trans-presets').querySelectorAll('.ear-chip').forEach(b => {
    b.onclick = () => apply(+b.dataset.s);
  });

  paint();
}

// ---------- 模块21：节奏跟拍训练 ----------
function renderRhythmTrainer() {
  const root = $('#module-rhythmtrain');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🥁 节奏跟拍</h2>
    <p style="color:var(--muted);margin-bottom:14px">屏幕给一段节奏型，先有一小节预备拍（节拍器引导），然后跟着拍点在琴键上敲击（任意键都算一次敲击）。引擎按你的时间误差判 <b>完美 / 良好 / 漏拍 / 多敲</b>。没连琴可用下方"敲击"按钮或空格键。</p>

    <div class="card-panel">
      <div class="param-row"><label>节奏型</label>
        <select id="rt-pattern">${RHYTHM_PATTERNS.map(p => `<option value="${p.id}">${p.name}（${p.desc}）</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>速度 BPM</label>
        <input id="rt-bpm" type="range" min="50" max="160" value="80" class="trans-slider" style="max-width:240px">
        <span id="rt-bpm-val" style="color:#667eea;font-weight:700;min-width:48px">80</span>
      </div>
      <div class="param-row"><label>循环</label>
        <select id="rt-loop"><option value="1">是（连续练习）</option><option value="0">否（练一遍停）</option></select>
      </div>
    </div>

    <div class="card-panel">
      <div class="rt-track-wrap">
        <div id="rt-track" class="rt-track"></div>
        <div id="rt-playhead" class="rt-playhead"></div>
      </div>
      <div id="rt-feedback" class="sight-feedback" style="margin-top:14px">按"开始"，听预备拍后跟着敲</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="rt-perfect" class="sight-stat-num">0</div><div class="sight-stat-lbl">完美</div></div>
      <div class="sight-stat"><div id="rt-good" class="sight-stat-num">0</div><div class="sight-stat-lbl">良好</div></div>
      <div class="sight-stat"><div id="rt-miss" class="sight-stat-num">0</div><div class="sight-stat-lbl">漏/多</div></div>
      <div class="sight-stat"><div id="rt-combo" class="sight-stat-num">0</div><div class="sight-stat-lbl">连击</div></div>
      <div class="sight-stat"><div id="rt-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">命中率</div></div>
    </div>

    <div class="rotate-bar">
      <button id="rt-start" class="big-btn">▶ 开始练习</button>
      <button id="rt-tap" class="big-btn" style="background:#667eea" disabled>👆 敲击（空格）</button>
      <span id="rt-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null, raf = 0, ac = null, playing = false, looping = false;
  let onsetEls = [], clickTimes = [], clickIdx = 0, barStart = 0, playEnd = 0;
  const beatsPerBar = 4;

  function ctx() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    return ac;
  }
  function click(strong) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = strong ? 1600 : 1050;
      o.connect(g); g.connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(0.28, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.start(t); o.stop(t + 0.06);
    } catch { /* 无音频环境忽略 */ }
  }
  function patternObj() { return RHYTHM_PATTERNS.find(p => p.id === $('#rt-pattern').value); }
  function bpm() { return +$('#rt-bpm').value; }

  function drawTrack(pat) {
    const wrap = $('#rt-track');
    wrap.innerHTML = '';
    // 拍线（0..4）
    for (let b = 0; b <= beatsPerBar; b++) {
      const ln = document.createElement('div');
      ln.className = 'rt-beatline' + (b % beatsPerBar === 0 ? ' strong' : '');
      ln.style.left = (b / beatsPerBar * 100) + '%';
      wrap.appendChild(ln);
    }
    onsetEls = pat.beats.map((b, i) => {
      const el = document.createElement('div');
      el.className = 'rt-dot';
      el.style.left = (b / beatsPerBar * 100) + '%';
      el.dataset.i = i;
      wrap.appendChild(el);
      return el;
    });
  }

  function updateStats() {
    if (!trainer) return;
    $('#rt-perfect').textContent = trainer.perfect;
    $('#rt-good').textContent = trainer.good;
    $('#rt-miss').textContent = (trainer.total - trainer.taps) + trainer.extras;
    $('#rt-combo').textContent = trainer.combo;
    $('#rt-acc').textContent = trainer.taps ? Math.round(trainer.accuracy * 100) + '%' : '—';
  }

  function flash(r) {
    const fb = $('#rt-feedback');
    if (r.rating === 'perfect') { fb.textContent = '✨ 完美！'; fb.className = 'sight-feedback ok'; }
    else if (r.rating === 'good') { fb.textContent = '👍 良好（' + (r.errMs > 0 ? '偏晚' : '偏早') + ' ' + Math.abs(Math.round(r.errMs)) + 'ms）'; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = '✋ 多敲了'; fb.className = 'sight-feedback no'; }
  }

  function doTap() {
    if (!playing || !trainer) return;
    const r = trainer.tap(performance.now());
    if (r.index >= 0 && onsetEls[r.index]) onsetEls[r.index].classList.add(r.rating);
    flash(r);
    updateStats();
  }

  function startOne() {
    const pat = patternObj();
    const bMs = 60000 / bpm();
    drawTrack(pat);
    trainer = new RhythmTrainer({ bpm: bpm(), pattern: pat, beatsPerBar });
    const t0 = performance.now();
    barStart = t0 + bMs * beatsPerBar;     // 预备拍一小节后正式开始
    trainer.start(barStart);
    playEnd = barStart + bMs * beatsPerBar + trainer.tol.good; // 留个尾巴收晚到的敲击
    // 预备拍 + 正式拍的节拍器引导点
    clickTimes = [];
    for (let k = 0; k < beatsPerBar * 2; k++) clickTimes.push({ t: t0 + k * bMs, strong: k % beatsPerBar === 0 });
    clickIdx = 0;
    playing = true;
    $('#rt-tap').disabled = false;
    loop();
  }

  function loop() {
    const now = performance.now();
    while (clickIdx < clickTimes.length && now >= clickTimes[clickIdx].t) {
      click(clickTimes[clickIdx].strong); clickIdx++;
    }
    // 播放头：预备拍阶段在左侧灰行进，正式拍阶段在轨道上行进
    const ph = $('#rt-playhead');
    if (now < barStart) {
      const f = 1 - (barStart - now) / (60000 / bpm() * beatsPerBar);
      ph.style.left = '0%'; ph.style.opacity = '0.35';
      $('#rt-status').textContent = '预备…' + Math.max(1, Math.ceil((barStart - now) / (60000 / bpm())));
    } else {
      const f = Math.min(1, (now - barStart) / (60000 / bpm() * beatsPerBar));
      ph.style.left = (f * 100) + '%'; ph.style.opacity = '1';
      $('#rt-status').textContent = '跟着敲！';
    }
    if (now >= playEnd) { endOne(); return; }
    raf = requestAnimationFrame(loop);
  }

  function endOne() {
    playing = false;
    cancelAnimationFrame(raf);
    const s = trainer.finish();
    updateStats();
    recordPractice('rhythm', '节奏跟拍', s.total, s.hits, s.best);
    const fb = $('#rt-feedback');
    fb.className = 'sight-feedback ok';
    fb.textContent = `本遍：完美 ${s.perfect} · 良好 ${s.good} · 漏 ${s.misses} · 多 ${s.extras} · 平均误差 ${Math.round(s.avgError)}ms`;
    if (looping && $('#module-rhythmtrain').classList.contains('active')) {
      setTimeout(() => { if (looping) startOne(); }, 900);
    } else {
      stopAll();
    }
  }

  function stopAll() {
    playing = false; looping = false;
    cancelAnimationFrame(raf);
    rhythmTapOnNote = null;
    $('#rt-start').textContent = '▶ 开始练习';
    $('#rt-start').classList.remove('running');
    $('#rt-tap').disabled = true;
    $('#rt-status').textContent = '已停止';
    $('#rt-playhead').style.opacity = '0';
  }

  $('#rt-bpm').oninput = () => { $('#rt-bpm-val').textContent = $('#rt-bpm').value; };
  $('#rt-pattern').onchange = () => { if (!playing) drawTrack(patternObj()); };
  $('#rt-tap').onclick = doTap;
  $('#rt-start').onclick = () => {
    if (playing || looping) { stopAll(); return; }
    looping = $('#rt-loop').value === '1';
    rhythmTapOnNote = () => doTap();
    $('#rt-start').textContent = '⏸ 停止练习';
    $('#rt-start').classList.add('running');
    ['#rt-perfect', '#rt-good', '#rt-miss', '#rt-combo'].forEach(s => $(s).textContent = '0');
    $('#rt-acc').textContent = '—';
    startOne();
  };

  // 空格键敲击（仅当本模块激活时）
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && $('#module-rhythmtrain').classList.contains('active') && playing) {
      e.preventDefault();
      if (!e.repeat) doTap();
    }
  });

  drawTrack(patternObj());
}

// ---------- 模块22：旋律听写 ----------
function renderMelody() {
  const root = $('#module-melody');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 旋律听写</h2>
    <p style="color:var(--muted);margin-bottom:14px">先听一段调内短旋律（首音为主音作锚点），再在琴键上把它复奏出来。引擎逐音校验，弹对的灯变绿，整条全对自动出下一条。没连琴可点下方音符按钮当琴键。</p>

    <div class="card-panel">
      <div class="param-row"><label>调</label>
        <select id="mel-key">${MEL_KEYS.map(k => `<option value="${k.id}">${k.name}</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>旋律长度</label>
        <select id="mel-len"><option value="3">3 音（入门）</option><option value="4" selected>4 音</option><option value="5">5 音</option><option value="6">6 音（挑战）</option></select>
      </div>
      <div class="param-row"><label>忽略八度</label>
        <select id="mel-octave"><option value="1" selected>是（任意八度都算对）</option><option value="0">否（须同八度）</option></select>
      </div>
      <div class="param-row"><label>速度</label>
        <input id="mel-tempo" type="range" min="60" max="160" value="100" class="trans-slider" style="max-width:220px">
        <span id="mel-tempo-val" style="color:#667eea;font-weight:700;min-width:64px">100/分</span>
      </div>
    </div>

    <div class="card-panel">
      <div id="mel-dots" class="mel-dots"></div>
      <div id="mel-feedback" class="sight-feedback" style="margin-top:14px">按"开始"出题并听旋律</div>
      <div id="mel-keyboard" class="mel-keyboard"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="mel-score" class="sight-stat-num">0</div><div class="sight-stat-lbl">通过</div></div>
      <div class="sight-stat"><div id="mel-streak" class="sight-stat-num">0</div><div class="sight-stat-lbl">连击</div></div>
      <div class="sight-stat"><div id="mel-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
      <div class="sight-stat"><div id="mel-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">通过率</div></div>
    </div>

    <div class="rotate-bar">
      <button id="mel-start" class="big-btn">▶ 开始练习</button>
      <button id="mel-replay" class="big-btn" style="background:#667eea" disabled>🔊 再听一遍</button>
      <button id="mel-giveup" class="big-btn" style="background:var(--panel2)" disabled>👀 放弃看答案</button>
      <span id="mel-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let game = null, ac = null, kb = null;
  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(midi, when, dur) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.25, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* 无音频环境忽略 */ }
  }
  function keyObj() { return MEL_KEYS.find(k => k.id === $('#mel-key').value); }
  function noteDur() { return 60 / (+$('#mel-tempo').value); }

  function playMelody() {
    if (!game || !game.melody.length) return;
    const c = ctx(); const start = c.currentTime + 0.08; const d = noteDur();
    game.melody.forEach((n, i) => {
      tone(n, start + i * d, d * 0.9);
      setTimeout(() => { if (kb) kb.flash(n, '#22d3ee'); }, 80 + i * d * 1000);
    });
  }

  function drawDots() {
    const wrap = $('#mel-dots');
    if (!game || !game.melody.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = game.melody.map((n, i) => {
      let cls = 'mel-dot';
      if (i < game.pos) cls += ' done';
      else if (i === game.pos) cls += ' current';
      const label = game.revealed ? CA99.noteName(n) : (i < game.pos ? CA99.noteName(n) : '·');
      return `<div class="${cls}">${label}</div>`;
    }).join('');
  }

  // 全幅 88 键：可点击当琴键输入，揭晓答案时把旋律按顺序画在键上
  function drawKeyboard() {
    const k = keyObj();
    if (!kb) {
      kb = new PianoKeyboard($('#mel-keyboard'), {
        labels: 'c',
        onNoteOn: (m) => { tone(m, ctx().currentTime + 0.001, 0.5); feed(m); },
      });
    }
    kb.scrollToShow(k.tonic - 2, k.tonic + 14);
  }
  function paintAnswer() {
    if (!kb || !game || !game.melody.length) return;
    kb.highlightMany(game.melody.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
  }

  function updateStats() {
    if (!game) return;
    $('#mel-score').textContent = game.score;
    $('#mel-streak').textContent = game.streak;
    $('#mel-best').textContent = game.best;
    $('#mel-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function nextRound() {
    game.revealed = false;
    game.next();
    if (kb) kb.clear();
    drawDots();
    $('#mel-feedback').textContent = '🎧 听好了，复奏出来…';
    $('#mel-feedback').className = 'sight-feedback';
    $('#mel-status').textContent = '复奏中';
    setTimeout(playMelody, 200);
  }

  function feed(note) {
    if (!game || !game.melody.length) return;
    const r = game.play(note);
    if (!r) return;
    if (r.ok) {
      if (kb) kb.flash(note, '#34d399');
      drawDots();
      const fb = $('#mel-feedback');
      if (r.done) {
        fb.className = 'sight-feedback ok';
        fb.textContent = r.mistakes === 0 ? '✅ 完美复奏！' : `✅ 完成（错 ${r.mistakes} 次）`;
        updateStats();
        setTimeout(() => { if (game) nextRound(); }, 850);
      } else {
        fb.className = 'sight-feedback';
        fb.textContent = `👍 对，继续（${game.pos}/${game.melody.length}）`;
      }
    } else {
      const fb = $('#mel-feedback');
      fb.className = 'sight-feedback no';
      fb.textContent = '❌ 不对，再试这个音';
      if (kb) kb.flash(note, '#fb7185');
    }
  }

  function stop() {
    if (game) recordPractice('melody', '旋律听写', game.attempts, game.score, game.best);
    game = null; melodyOnNote = null;
    $('#mel-start').textContent = '▶ 开始练习';
    $('#mel-start').classList.remove('running');
    $('#mel-replay').disabled = true;
    $('#mel-giveup').disabled = true;
    $('#mel-status').textContent = '已停止';
    $('#mel-feedback').textContent = '按"开始"出题并听旋律';
    $('#mel-feedback').className = 'sight-feedback';
    $('#mel-dots').innerHTML = '';
  }

  $('#mel-tempo').oninput = () => { $('#mel-tempo-val').textContent = $('#mel-tempo').value + '/分'; };
  $('#mel-key').onchange = drawKeyboard;
  $('#mel-replay').onclick = playMelody;
  $('#mel-giveup').onclick = () => {
    if (!game || !game.melody.length) return;
    game.revealed = true;
    drawDots();
    paintAnswer();
    $('#mel-feedback').className = 'sight-feedback no';
    $('#mel-feedback').textContent = '答案已显示，听一遍后继续';
    game.giveUp();
    updateStats();
    setTimeout(() => { if (game) nextRound(); }, 1600);
  };
  $('#mel-start').onclick = () => {
    if (game) { stop(); return; }
    game = new MelodyDictation({
      key: keyObj(),
      length: +$('#mel-len').value,
      octaveAgnostic: $('#mel-octave').value === '1',
    });
    game.revealed = false;
    melodyOnNote = (note) => feed(note);
    $('#mel-start').textContent = '⏸ 停止练习';
    $('#mel-start').classList.add('running');
    $('#mel-replay').disabled = false;
    $('#mel-giveup').disabled = false;
    ['#mel-score', '#mel-streak', '#mel-best'].forEach(s => $(s).textContent = '0');
    $('#mel-acc').textContent = '—';
    nextRound();
  };

  drawKeyboard();
}

// ---------- 模块23：和弦进行练习 ----------
function renderChordProg() {
  const root = $('#module-chordprog');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 和弦进行练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">把"万能流行""ii–V–I""卡农"等著名和弦进行在所选调上展开成具体和弦，按顺序弹出每个和弦即推进（忽略转位）。没连琴可点"替我弹当前"演示推进。</p>

    <div class="card-panel">
      <div class="param-row"><label>调</label>
        <select id="cp-key">${PROG_KEYS.map(k => `<option value="${k.id}">${k.name}</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>进行</label>
        <select id="cp-prog">${PROGRESSIONS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>循环</label>
        <select id="cp-loop"><option value="1" selected>是（走完自动从头）</option><option value="0">否（走完即停）</option></select>
      </div>
    </div>

    <div class="card-panel">
      <div id="cp-chips" class="cp-chips"></div>
      <div id="cp-target" class="cp-target">按"开始"出题</div>
      <div id="cp-feedback" class="sight-feedback" style="margin-top:10px">选好调与进行，点开始</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 练习时把<b>当前该弹的和弦</b>高亮在 88 键上（带序号），照着位置在钢琴上弹出即可推进（点键可试听）</div>
      <div id="cp-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="cp-score" class="sight-stat-num">0</div><div class="sight-stat-lbl">弹对</div></div>
      <div class="sight-stat"><div id="cp-streak" class="sight-stat-num">0</div><div class="sight-stat-lbl">连击</div></div>
      <div class="sight-stat"><div id="cp-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
      <div class="sight-stat"><div id="cp-laps" class="sight-stat-num">0</div><div class="sight-stat-lbl">完成圈</div></div>
    </div>

    <div class="rotate-bar">
      <button id="cp-start" class="big-btn">▶ 开始练习</button>
      <button id="cp-listen" class="big-btn" style="background:#667eea" disabled>🔊 试听整条</button>
      <button id="cp-auto" class="big-btn" style="background:var(--panel2)" disabled>🎹 替我弹当前</button>
      <span id="cp-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let game = null, ac = null, judging = false;
  const cpKb = new PianoKeyboard($('#cp-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  cpKb.scrollToShow(48, 72);
  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  // 把和弦符号转成根位 MIDI（C4 区域），用于试听与"替我弹"
  const CP_INTERVALS = { '': [0, 4, 7], 'm': [0, 3, 7], 'dim': [0, 3, 6], 'aug': [0, 4, 8] };
  function chordMidi(chord) {
    const pc = CA99 && chordNoteName ? null : null;
    const NOTE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const rootPc = NOTE.indexOf(chord.root);
    const base = 60 + rootPc;
    return (CP_INTERVALS[chord.suffix] || [0, 4, 7]).map(iv => base + iv);
  }
  function tone(midi, when, dur) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.18, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* 无音频环境忽略 */ }
  }
  function playChord(chord, when, dur) {
    chordMidi(chord).forEach(n => tone(n, when, dur));
  }
  function listenAll() {
    if (!game) return;
    const c = ctx(); let t = c.currentTime + 0.08; const d = 0.55;
    game.list().forEach(ch => { playChord(ch, t, d * 0.92); t += d; });
  }

  function keyObj() { return PROG_KEYS.find(k => k.id === $('#cp-key').value); }
  function progObj() { return PROGRESSIONS.find(p => p.id === $('#cp-prog').value); }

  function drawChips() {
    const wrap = $('#cp-chips');
    if (!game) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = game.list().map((ch, i) => {
      let cls = 'cp-chip';
      if (i < game.pos) cls += ' done';
      else if (i === game.pos) cls += ' current';
      return `<div class="${cls}"><span class="cp-rom">${ch.roman}</span><span class="cp-sym">${ch.symbol}</span></div>`;
    }).join('');
  }

  function showTarget() {
    const t = game && game.current();
    $('#cp-target').textContent = t ? `🎯 现在弹：${t.symbol}（${t.roman}）` : '✅ 已走完整条';
    if (t) {
      const ns = chordMidi(t);
      cpKb.highlightMany(ns.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
    } else cpKb.clear();
  }

  function updateStats() {
    if (!game) return;
    $('#cp-score').textContent = game.score;
    $('#cp-streak').textContent = game.streak;
    $('#cp-best').textContent = game.best;
    $('#cp-laps').textContent = game.laps;
  }

  function judge(notes) {
    if (!game || judging) return;
    if (notes.length < 3) return; // 不足以构成和弦
    const r = game.check(notes);
    if (!r) return;
    const fb = $('#cp-feedback');
    if (r.ok) {
      judging = true; // 防止同一把按住重复判定
      drawChips(); showTarget(); updateStats();
      if (r.completed) {
        fb.className = 'sight-feedback ok';
        fb.textContent = game.loop ? '🎉 完成整条！自动从头继续' : '🎉 完成整条！';
        playChord(r.expected, ctx().currentTime + 0.02, 0.5);
        if (!game.loop) finishStop();
      } else {
        fb.className = 'sight-feedback ok';
        fb.textContent = `✓ ${r.expected.symbol} 对，继续`;
      }
    } else {
      const chord = detectChord(notes);
      if (chord) {
        game.miss(); updateStats();
        fb.className = 'sight-feedback no';
        fb.textContent = `❌ 听到 ${chord.symbol}，目标是 ${r.expected.symbol}`;
      }
    }
  }

  function finishStop() {
    if (game) recordPractice('chordprog', '和弦进行', game.attempts, game.score, game.best);
    game = null; chordProgOnNotesChanged = null;
    $('#cp-start').textContent = '▶ 开始练习';
    $('#cp-start').classList.remove('running');
    $('#cp-listen').disabled = true;
    $('#cp-auto').disabled = true;
    $('#cp-status').textContent = '已停止';
    cpKb.clear();
  }

  $('#cp-key').onchange = () => { if (game) restart(); };
  $('#cp-prog').onchange = () => { if (game) restart(); };
  $('#cp-loop').onchange = () => { if (game) restart(); };
  $('#cp-listen').onclick = listenAll;
  $('#cp-auto').onclick = () => {
    if (!game) return;
    const t = game.current();
    if (!t) return;
    judging = false;
    judge(chordMidi(t));
  };

  function restart() {
    game = new ChordProgression({ key: keyObj(), progression: progObj(), loop: $('#cp-loop').value === '1' });
    drawChips(); showTarget(); updateStats();
    chordProgOnNotesChanged = (notes) => {
      if (notes.length < 3) judging = false; // 松开后允许下一次判定
      judge(notes);
    };
    $('#cp-feedback').className = 'sight-feedback';
    $('#cp-feedback').textContent = '🎧 按顺序弹出高亮的和弦';
    $('#cp-status').textContent = '练习中';
  }

  $('#cp-start').onclick = () => {
    if (game) { finishStop(); return; }
    restart();
    $('#cp-start').textContent = '⏸ 停止练习';
    $('#cp-start').classList.add('running');
    $('#cp-listen').disabled = false;
    $('#cp-auto').disabled = false;
    setTimeout(listenAll, 250);
  };

  drawChips();
}

// ---------- 模块24：节拍稳定度分析 ----------
function renderBeatStability() {
  const root = $('#module-beat');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">📈 节拍稳定度分析</h2>
    <p style="color:var(--muted);margin-bottom:14px">持续均匀地弹（或敲空格键），引擎采集你的击键间隔，算出稳定度评分、估算 BPM，并判断你是越弹越快（赶拍）还是越弹越慢（拖拍）。开"跟拍"模式可对照固定 BPM 测准度。</p>

    <div class="card-panel">
      <div class="param-row"><label>模式</label>
        <select id="bs-mode"><option value="free" selected>自由（测自身稳定度）</option><option value="target">跟拍（对照目标 BPM）</option></select>
      </div>
      <div class="param-row" id="bs-bpm-row" style="display:none"><label>目标 BPM</label>
        <input id="bs-bpm" type="range" min="40" max="200" value="90" class="trans-slider" style="max-width:240px">
        <span id="bs-bpm-val" style="color:#667eea;font-weight:700;min-width:64px">90</span>
        <button id="bs-click" class="grid-btn" style="margin-left:8px">🔊 试听节拍</button>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div id="bs-score" class="bs-score">—</div>
      <div id="bs-score-lbl" style="color:var(--muted);margin-top:2px">稳定度评分</div>
      <div id="bs-trend" class="bs-trend">敲 4 下以上开始分析</div>
      <div id="bs-bars" class="bs-bars"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="bs-count" class="sight-stat-num">0</div><div class="sight-stat-lbl">击键</div></div>
      <div class="sight-stat"><div id="bs-bpm-est" class="sight-stat-num">—</div><div class="sight-stat-lbl">估算 BPM</div></div>
      <div class="sight-stat"><div id="bs-cv" class="sight-stat-num">—</div><div class="sight-stat-lbl">波动 CV</div></div>
      <div class="sight-stat"><div id="bs-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">跟拍准度</div></div>
    </div>

    <div class="rotate-bar">
      <button id="bs-start" class="big-btn">▶ 开始采集</button>
      <button id="bs-reset" class="big-btn" style="background:var(--panel2)">🔄 清空</button>
      <span id="bs-status" style="color:var(--muted)">未开始；采集中也可按空格键敲</span>
    </div>`;

  let bs = null, ac = null, clickTimer = null, keyHandler = null;
  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function click(when) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'square'; o.frequency.value = 1500;
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.2, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
      o.start(when); o.stop(when + 0.06);
    } catch { /* 忽略 */ }
  }
  function startClick() {
    stopClick();
    const bpm = +$('#bs-bpm').value; const period = 60000 / bpm;
    let n = 0; const c = ctx();
    const tick = () => { click(c.currentTime + 0.01); };
    tick();
    clickTimer = setInterval(tick, period);
  }
  function stopClick() { if (clickTimer) { clearInterval(clickTimer); clickTimer = null; } }

  function drawBars() {
    const wrap = $('#bs-bars');
    if (!bs) { wrap.innerHTML = ''; return; }
    const io = bs.iois();
    if (!io.length) { wrap.innerHTML = ''; return; }
    const mx = Math.max(...io);
    const target = bs.targetBpm ? 60000 / bs.targetBpm : (io.reduce((a, b) => a + b, 0) / io.length);
    wrap.innerHTML = io.slice(-40).map(v => {
      const h = Math.max(6, Math.round((v / mx) * 60));
      const dev = Math.abs(v - target) / target;
      const col = dev < 0.05 ? 'var(--ok)' : dev < 0.12 ? '#facc15' : 'var(--hi2)';
      return `<div class="bs-bar" style="height:${h}px;background:${col}" title="${Math.round(v)}ms"></div>`;
    }).join('');
  }

  function refresh() {
    if (!bs) return;
    const s = bs.stats();
    $('#bs-count').textContent = s.count;
    $('#bs-bpm-est').textContent = s.bpm || '—';
    $('#bs-cv').textContent = s.intervals >= 2 ? (s.cv * 100).toFixed(1) + '%' : '—';
    $('#bs-acc').textContent = s.target ? s.target.accuracy + '%' : '—';
    const scoreEl = $('#bs-score');
    if (s.intervals >= 2) {
      scoreEl.textContent = s.stability;
      scoreEl.style.color = s.stability >= 80 ? 'var(--ok)' : s.stability >= 50 ? '#facc15' : 'var(--hi2)';
    } else { scoreEl.textContent = '—'; scoreEl.style.color = 'var(--text)'; }
    const trEl = $('#bs-trend');
    if (s.intervals >= 3) {
      const map = { rushing: '⏩ 越弹越快（赶拍）', dragging: '⏪ 越弹越慢（拖拍）', steady: '✅ 速度稳定' };
      trEl.textContent = `${map[s.trend.label]} · ${s.intervals} 个间隔` + (s.stdMs ? ` · 抖动 ±${s.stdMs}ms` : '');
      trEl.style.color = s.trend.label === 'steady' ? 'var(--ok)' : '#facc15';
    } else { trEl.textContent = '敲 4 下以上开始分析'; trEl.style.color = 'var(--muted)'; }
    drawBars();
  }

  function doTap() {
    if (!bs) return;
    bs.tap(performance.now());
    refresh();
  }

  function stop() {
    if (bs && bs.count >= 3) {
      const s = bs.stats();
      const acc = s.target ? s.target.accuracy : s.stability;
      recordPractice('beat', '节拍稳定度', s.count, Math.round((acc / 100) * s.count), s.count);
    }
    bs = null; beatTapOnNote = null;
    if (keyHandler) { window.removeEventListener('keydown', keyHandler); keyHandler = null; }
    stopClick();
    $('#bs-start').textContent = '▶ 开始采集';
    $('#bs-start').classList.remove('running');
    $('#bs-status').textContent = '已停止';
  }

  $('#bs-mode').onchange = () => {
    $('#bs-bpm-row').style.display = $('#bs-mode').value === 'target' ? 'flex' : 'none';
  };
  $('#bs-bpm').oninput = () => {
    $('#bs-bpm-val').textContent = $('#bs-bpm').value;
    if (clickTimer) startClick();
  };
  $('#bs-click').onclick = () => { if (clickTimer) stopClick(); else startClick(); };
  $('#bs-reset').onclick = () => { if (bs) { bs.reset(); refresh(); } };
  $('#bs-start').onclick = () => {
    if (bs) { stop(); return; }
    const target = $('#bs-mode').value === 'target' ? +$('#bs-bpm').value : 0;
    bs = new BeatStability({ targetBpm: target });
    beatTapOnNote = () => doTap();
    keyHandler = (e) => { if (e.code === 'Space') { e.preventDefault(); doTap(); } };
    window.addEventListener('keydown', keyHandler);
    $('#bs-start').textContent = '⏸ 停止采集';
    $('#bs-start').classList.add('running');
    $('#bs-status').textContent = '采集中：均匀弹琴或按空格键';
    ['#bs-count'].forEach(s => $(s).textContent = '0');
    refresh();
  };
}

// ---------- 模块25：双手协调练习 ----------
function renderHandsSync() {
  const root = $('#module-hands');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🙌 双手协调练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">每拍同时弹一个低音区（左手）和一个高音区（右手）的音，引擎按音高分手，测量两手落键的时间差（越接近 0 越整齐），给出协调度评分。适合练双手齐奏的整齐度。没连琴可点下方"左手/右手"按钮模拟。</p>

    <div class="card-panel">
      <div class="param-row"><label>左右手分割</label>
        <select id="hs-split">
          <option value="60" selected>C4（中央 C）以下为左手</option>
          <option value="64">E4 以下为左手</option>
          <option value="55">G3 以下为左手</option>
        </select>
      </div>
      <div class="param-row"><label>目标拍数</label>
        <select id="hs-beats"><option value="8" selected>8 拍</option><option value="12">12 拍</option><option value="16">16 拍</option><option value="0">不限</option></select>
      </div>
      <div class="param-row"><label>整齐严格度</label>
        <select id="hs-strict"><option value="50">宽松（±50ms 满分）</option><option value="30" selected>标准（±30ms 满分）</option><option value="18">严格（±18ms 满分）</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div id="hs-gauge" class="hs-gauge"><div id="hs-gauge-fill" class="hs-gauge-fill"></div><div id="hs-gauge-num" class="hs-gauge-num">—</div></div>
      <div id="hs-feedback" class="sight-feedback" style="margin-top:12px">按"开始"后，每拍双手各弹一个音</div>
      <div class="hs-hands">
        <button id="hs-left" class="hs-hand-btn">👈 左手（低音）</button>
        <button id="hs-right" class="hs-hand-btn">右手（高音）👉</button>
      </div>
      <div id="hs-beatdots" class="hs-beatdots"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="hs-avg" class="sight-stat-num">—</div><div class="sight-stat-lbl">平均协调</div></div>
      <div class="sight-stat"><div id="hs-good" class="sight-stat-num">0</div><div class="sight-stat-lbl">双手到齐</div></div>
      <div class="sight-stat"><div id="hs-streak" class="sight-stat-num">0</div><div class="sight-stat-lbl">连击</div></div>
      <div class="sight-stat"><div id="hs-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="hs-start" class="big-btn">▶ 开始练习</button>
      <span id="hs-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let hs = null;
  const beatdots = $('#hs-beatdots');

  function setGauge(score) {
    const fill = $('#hs-gauge-fill'); const num = $('#hs-gauge-num');
    if (score == null) { fill.style.height = '0%'; num.textContent = '—'; num.style.color = 'var(--muted)'; return; }
    fill.style.height = score + '%';
    fill.style.background = score >= 80 ? 'var(--ok)' : score >= 50 ? '#facc15' : 'var(--hi2)';
    num.textContent = score;
    num.style.color = score >= 80 ? 'var(--ok)' : score >= 50 ? '#facc15' : 'var(--hi2)';
  }

  function addBeatDot(result) {
    const d = document.createElement('div');
    d.className = 'hs-bdot ' + (result.bothHands ? (result.score >= 80 ? 'great' : result.score >= 50 ? 'okk' : 'loose') : 'miss');
    d.title = result.bothHands ? `${result.score} 分 · 时差 ${Math.round(result.spread)}ms` : '缺一只手';
    beatdots.appendChild(d);
  }

  function refresh() {
    if (!hs) return;
    $('#hs-avg').textContent = hs.attempts ? hs.avgScore : '—';
    $('#hs-good').textContent = hs.goodBeats;
    $('#hs-streak').textContent = hs.streak;
    $('#hs-best').textContent = hs.best;
  }

  function onBeat(result) {
    setGauge(result.bothHands ? result.score : 0);
    const fb = $('#hs-feedback');
    if (!result.bothHands) {
      fb.className = 'sight-feedback no';
      fb.textContent = result.hasLeft ? '❌ 只弹了左手，右手呢？' : '❌ 只弹了右手，左手呢？';
    } else if (result.score >= 80) {
      fb.className = 'sight-feedback ok';
      fb.textContent = `✅ 很整齐！时差仅 ${Math.round(result.spread)}ms`;
    } else if (result.score >= 50) {
      fb.className = 'sight-feedback';
      fb.textContent = `👍 还行，时差 ${Math.round(result.spread)}ms，再齐一点`;
    } else {
      fb.className = 'sight-feedback no';
      fb.textContent = `⚠ 两手差 ${Math.round(result.spread)}ms，努力同步`;
    }
    addBeatDot(result);
    refresh();
  }

  function feed(note) {
    if (!hs) return;
    hs.feed(note, performance.now());
  }

  function stop() {
    if (hs) {
      hs.finish();
      refresh();
      if (hs.attempts) recordPractice('hands', '双手协调', hs.attempts, hs.goodBeats, hs.best);
    }
    hs = null; handsOnNote = null;
    $('#hs-start').textContent = '▶ 开始练习';
    $('#hs-start').classList.remove('running');
    $('#hs-status').textContent = '已停止';
  }

  $('#hs-left').onclick = () => feed(+$('#hs-split').value - 12);
  $('#hs-right').onclick = () => feed(+$('#hs-split').value + 12);
  $('#hs-start').onclick = () => {
    if (hs) { stop(); return; }
    const beats = +$('#hs-beats').value;
    hs = new HandsSync({
      split: +$('#hs-split').value,
      beats,
      tightMs: +$('#hs-strict').value,
    });
    hs.onBeat = onBeat;
    hs.onComplete = (info) => {
      $('#hs-feedback').className = 'sight-feedback ok';
      $('#hs-feedback').textContent = `🎉 完成 ${info.attempts} 拍！平均协调 ${info.avgScore} 分，双手到齐 ${info.goodBeats} 拍`;
      stop();
    };
    handsOnNote = (note) => feed(note);
    beatdots.innerHTML = '';
    setGauge(null);
    $('#hs-start').textContent = '⏸ 停止练习';
    $('#hs-start').classList.add('running');
    $('#hs-status').textContent = '练习中：每拍双手各一音';
    $('#hs-feedback').className = 'sight-feedback';
    $('#hs-feedback').textContent = '🎧 每拍同时弹低音 + 高音';
    refresh();
  };

  setGauge(null);
}

// ---------- 模块26：琶音跑动速度测试 ----------
function renderArpeggio() {
  const root = $('#module-arp');
  if (!root) return;
  const QOPTS = Object.keys(QUALITY_LABELS).map(q => `<option value="${q}">${QUALITY_LABELS[q]}（${q}）</option>`).join('');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎶 琶音跑动速度测试</h2>
    <p style="color:var(--muted);margin-bottom:14px">选好根音、和弦性质、八度与方向，引擎给出目标琶音音序。按顺序弹出每个音，引擎测你的<b>速度</b>（每秒音数）和<b>均匀度</b>（音与音间隔是否一致），综合给分。没连琴可点目标音序里的音键模拟。</p>

    <div class="card-panel">
      <div class="param-row"><label>根音</label>
        <select id="arp-root"></select>
      </div>
      <div class="param-row"><label>和弦性质</label>
        <select id="arp-quality">${QOPTS}</select>
      </div>
      <div class="param-row"><label>八度数</label>
        <select id="arp-oct"><option value="1">1 个八度</option><option value="2" selected>2 个八度</option><option value="3">3 个八度</option></select>
      </div>
      <div class="param-row"><label>方向</label>
        <select id="arp-dir"><option value="up" selected>上行 ↑</option><option value="down">下行 ↓</option><option value="updown">上行+下行 ↑↓</option></select>
      </div>
      <div class="param-row"><label>目标速度</label>
        <select id="arp-nps"><option value="4">慢（4 音/秒）</option><option value="6" selected>中（6 音/秒）</option><option value="8">快（8 音/秒）</option><option value="10">极快（10 音/秒）</option></select>
      </div>
    </div>

    <div class="card-panel">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="color:var(--muted);font-size:13px">目标音序（按顺序弹）</span>
        <span id="arp-progtxt" style="color:var(--muted);font-size:13px">0 / 0</span>
      </div>
      <div id="arp-seq" class="arp-seq"></div>
      <div class="arp-progbar"><div id="arp-progfill" class="arp-progfill"></div></div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 整条琶音的<b>音序与走向</b>都画在 88 键上（紫=目标音，黄 ▶=当前该弹的音），看着键位<b>按顺序弹出</b>更直观；没连琴可直接点键模拟</div>
      <div id="arp-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="arp-speed" class="sight-stat-num">—</div><div class="sight-stat-lbl">速度(音/秒)</div></div>
      <div class="sight-stat"><div id="arp-even" class="sight-stat-num">—</div><div class="sight-stat-lbl">均匀度</div></div>
      <div class="sight-stat"><div id="arp-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="arp-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳分</div></div>
    </div>

    <div id="arp-feedback" class="sight-feedback">点"开始"生成目标琶音</div>

    <div class="rotate-bar">
      <button id="arp-start" class="big-btn">▶ 开始 / 下一条</button>
      <span id="arp-status" style="color:var(--muted)">未开始</span>
    </div>`;

  // 根音下拉：C3..C5
  const rootSel = $('#arp-root');
  for (let n = 48; n <= 72; n++) {
    const o = document.createElement('option');
    o.value = String(n); o.textContent = chordNoteName(n);
    if (n === 60) o.selected = true;
    rootSel.appendChild(o);
  }

  let arp = null;
  const seqBox = $('#arp-seq');
  const arpKb = new PianoKeyboard($('#arp-kb'), {
    labels: 'c',
    onNoteOn: (m) => { if (arp && !arp.done) feed(m); else playTone(midiToFreq(m), 0, 0.6); },
  });
  arpKb.scrollToShow(48, 84);

  function paintKb() {
    if (!arp) { arpKb.clear(); return; }
    const uniq = [...new Set(arp.target)];
    arpKb.highlightMany(uniq.map((n) => ({ midi: n, color: 'hsl(265,55%,56%)' })), { scroll: false });
    const cur = arp.target[arp.idx];
    if (cur != null && !arp.done) arpKb.highlight(cur, { color: 'hsl(48,100%,55%)', text: '▶' });
  }

  function renderSeq() {
    seqBox.innerHTML = '';
    if (!arp) return;
    arp.target.forEach((n, i) => {
      const el = document.createElement('button');
      el.className = 'arp-note' + (i < arp.idx ? ' done' : i === arp.idx ? ' cur' : '');
      el.textContent = chordNoteName(n);
      el.onclick = () => { if (arp && !arp.done) feed(n); };
      seqBox.appendChild(el);
    });
    const total = arp.target.length;
    $('#arp-progtxt').textContent = `${arp.idx} / ${total}`;
    $('#arp-progfill').style.width = (total ? (arp.idx / total * 100) : 0) + '%';
    paintKb();
  }

  function showResult(r) {
    $('#arp-speed').textContent = r.speed.toFixed(1);
    $('#arp-even').textContent = r.evenness;
    $('#arp-score').textContent = r.score;
    $('#arp-best').textContent = arp.best;
    const fb = $('#arp-feedback');
    if (r.score >= 85) { fb.className = 'sight-feedback ok'; fb.textContent = `🎉 ${r.score} 分！速度 ${r.speed.toFixed(1)} 音/秒，均匀度 ${r.evenness}${r.errors ? `，弹错 ${r.errors} 次` : '，零失误'}`; }
    else if (r.score >= 60) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${r.score} 分。速度 ${r.speed.toFixed(1)} 音/秒，均匀度 ${r.evenness}，再稳一点更好`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${r.score} 分。速度 ${r.speed.toFixed(1)} 音/秒，均匀度 ${r.evenness}${r.errors ? `，弹错 ${r.errors} 次` : ''}，慢练求匀`; }
    recordPractice('arp', '琶音跑动', r.notes, Math.round(r.score / 100 * r.notes), arp.best);
    arpOnNote = null;
    $('#arp-status').textContent = '完成 · 可点"下一条"再来';
  }

  function feed(note) {
    if (!arp || arp.done) return;
    arp.feed(note, performance.now());
    renderSeq();
  }

  function start() {
    arp = new ArpeggioRuns({
      rootMidi: +rootSel.value,
      quality: $('#arp-quality').value,
      octaves: +$('#arp-oct').value,
      direction: $('#arp-dir').value,
      targetNps: +$('#arp-nps').value,
    });
    arp.onComplete = (r) => showResult(r);
    arpOnNote = (note) => feed(note);
    const lo = Math.min(...arp.target), hi = Math.max(...arp.target);
    arpKb.scrollToShow(Math.max(21, lo - 2), Math.min(108, hi + 2));
    $('#arp-speed').textContent = '—'; $('#arp-even').textContent = '—'; $('#arp-score').textContent = '—';
    $('#arp-best').textContent = arp.best;
    const fb = $('#arp-feedback'); fb.className = 'sight-feedback'; fb.textContent = '🎯 按顺序弹出目标音序，越匀越快分越高';
    $('#arp-status').textContent = '进行中…';
    renderSeq();
  }

  $('#arp-start').onclick = start;
}

// ---------- 模块27：连奏/断奏控制 ----------
function renderArticulation() {
  const root = $('#module-artic');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎻 连奏 / 断奏控制</h2>
    <p style="color:var(--muted);margin-bottom:14px">选好目标演奏法，连续弹一串音。引擎用每个音的<b>按住时长</b>与<b>到下一个音的间隔</b>之比来判断你弹得是连奏（legato，音连绵）还是断奏（staccato，音短促），逐音打分。没连琴可点"模拟连奏/断奏一个音"按钮体验。</p>

    <div class="card-panel">
      <div class="param-row"><label>目标演奏法</label>
        <select id="ar-target">
          <option value="legato" selected>连奏 Legato（音与音连绵不断）</option>
          <option value="staccato">断奏 Staccato（音短促、有间隙）</option>
        </select>
      </div>
      <div class="param-row"><label>评估音数</label>
        <select id="ar-notes"><option value="6">6 个音</option><option value="8" selected>8 个音</option><option value="12">12 个音</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div id="ar-target-hint" class="ar-hint"></div>
      <div id="ar-dots" class="ar-dots"></div>
      <div id="ar-feedback" class="sight-feedback" style="margin-top:12px">点"开始"，然后连续弹音</div>
      <div class="ar-sim">
        <button id="ar-sim-leg" class="ar-sim-btn">🎵 模拟连奏一个音</button>
        <button id="ar-sim-stac" class="ar-sim-btn">• 模拟断奏一个音</button>
      </div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 你弹的音实时显示在 88 键上：<b>按住时键点亮</b>——连奏时下一个音按下、上一个还没松，相邻键会<b>重叠点亮</b>；断奏时键一个个<b>短促闪过</b>有间隙。绿=判为连贯/干净，红=不达标</div>
      <div id="ar-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="ar-avg" class="sight-stat-num">—</div><div class="sight-stat-lbl">平均分</div></div>
      <div class="sight-stat"><div id="ar-cnt" class="sight-stat-num">0</div><div class="sight-stat-lbl">已评估</div></div>
      <div class="sight-stat"><div id="ar-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="ar-start" class="big-btn">▶ 开始 / 重来</button>
      <span id="ar-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let at = null;
  const dotsBox = $('#ar-dots');
  let simNote = 60;   // 模拟时轮换音高
  let simT = 0;       // 模拟时间轴（ms）

  const arKb = new PianoKeyboard($('#ar-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  arKb.scrollToShow(48, 84);

  function targetHint() {
    const t = $('#ar-target').value;
    $('#ar-target-hint').innerHTML = t === 'legato'
      ? '🎯 目标 <b style="color:var(--ok)">连奏</b>：手指像"交棒"——下一个音按下时上一个音才松，听起来连成一条线'
      : '🎯 目标 <b style="color:#facc15">断奏</b>：每个音弹得短而轻快，音与音之间留出清晰的间隙';
  }

  function addDot(r) {
    const d = document.createElement('div');
    const good = r.score >= 80, mid = r.score >= 50;
    d.className = 'ar-dot ' + (good ? 'great' : mid ? 'okk' : 'bad');
    d.textContent = r.score;
    d.title = `${chordNoteName(r.note)} · ${r.articulation} · 触键比 ${r.ratio.toFixed(2)}`;
    dotsBox.appendChild(d);
  }

  function refresh() {
    if (!at) return;
    $('#ar-avg').textContent = at.count ? at.avgScore : '—';
    $('#ar-cnt').textContent = at.count;
    $('#ar-best').textContent = at.best;
  }

  function onNote(r) {
    addDot(r);
    refresh();
    arKb.flash(r.note, r.score >= 80 ? 'hsl(140,70%,48%)' : r.score >= 50 ? 'hsl(48,100%,55%)' : 'hsl(0,75%,55%)');
    const fb = $('#ar-feedback');
    if (r.score >= 80) { fb.className = 'sight-feedback ok'; fb.textContent = `✅ ${chordNoteName(r.note)} 很${at.target === 'legato' ? '连贯' : '干净'}！触键比 ${r.ratio.toFixed(2)}`; }
    else if (r.score >= 50) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${chordNoteName(r.note)} 还行，触键比 ${r.ratio.toFixed(2)}`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = at.target === 'legato' ? `⚠ ${chordNoteName(r.note)} 断了，音之间要更连` : `⚠ ${chordNoteName(r.note)} 太长，要更短促`; }
  }

  function stop() {
    if (at) {
      at.finish();
      refresh();
      if (at.count) recordPractice('artic', '连奏断奏', at.count, Math.round(at.avgScore / 100 * at.count), at.best);
    }
    articOnNoteOn = null; articOnNoteOff = null;
  }

  $('#ar-target').onchange = targetHint;

  $('#ar-start').onclick = () => {
    if (at && !at.done) stop();
    at = new ArticulationTrainer({ target: $('#ar-target').value, notes: +$('#ar-notes').value });
    at.onNote = onNote;
    at.onComplete = (info) => {
      const fb = $('#ar-feedback');
      fb.className = info.avgScore >= 70 ? 'sight-feedback ok' : 'sight-feedback';
      fb.textContent = `🎉 完成 ${info.count} 个音！平均 ${info.avgScore} 分（目标：${info.target === 'legato' ? '连奏' : '断奏'}）`;
      stop();
      $('#ar-status').textContent = '完成 · 可重来';
    };
    articOnNoteOn = (note, t) => { if (at) { at.noteOn(note, t); arKb.press(note); } };
    articOnNoteOff = (note, t) => { if (at) { at.noteOff(note, t); arKb.release(note); } };
    dotsBox.innerHTML = '';
    arKb.clear();
    $('#ar-feedback').className = 'sight-feedback';
    $('#ar-feedback').textContent = '🎧 连续弹音，引擎逐音判定';
    $('#ar-status').textContent = '进行中…';
    refresh();
  };

  // 模拟：legato = 时值≈间隔(0.95)，staccato = 时值短(0.2)，间隔固定 200ms
  function simulate(kind) {
    if (!at || at.done) return;
    const ioi = 200;
    const dur = kind === 'legato' ? 190 : 40;
    at.noteOn(simNote, simT);
    at.noteOff(simNote, simT + dur);
    const n = simNote;
    arKb.press(n);
    setTimeout(() => arKb.release(n), kind === 'legato' ? 360 : 90);
    simT += ioi;
    simNote = simNote >= 71 ? 60 : simNote + 2;
  }
  $('#ar-sim-leg').onclick = () => { if (!at || at.done) { simT = 0; simNote = 60; $('#ar-start').click(); } simulate('legato'); };
  $('#ar-sim-stac').onclick = () => { if (!at || at.done) { simT = 0; simNote = 60; $('#ar-start').click(); } simulate('staccato'); };

  targetHint();
}

// ---------- 模块28：踏板配合时机 ----------
function renderPedalTiming() {
  const root = $('#module-pedt');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🦶 踏板配合时机</h2>
    <p style="color:var(--muted);margin-bottom:14px">练"切分踏板法"（连奏踏板）：弹下新音后，先<b>抬起</b>延音踏板清掉上一个和声，再<b>重新踩下</b>接住新音。引擎测每次"新音→重新踩下"的时间间隔，判断换得<b>干净</b>（clean）、<b>脏</b>（muddy，踩太早）还是<b>发干</b>（dry，踩太晚）。没连琴可点下方模拟按钮体验。</p>

    <div class="card-panel">
      <div class="param-row"><label>评估换踏板次数</label>
        <select id="pt-changes"><option value="5">5 次</option><option value="8" selected>8 次</option><option value="12">12 次</option></select>
      </div>
      <div class="param-row"><label>难度（容许窗口）</label>
        <select id="pt-diff">
          <option value="wide">宽松（音后 40–220ms）</option>
          <option value="std" selected>标准（音后 50–180ms）</option>
          <option value="tight">严格（音后 60–140ms）</option>
        </select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div class="pt-pedal-wrap">
        <div id="pt-pedal" class="pt-pedal">踏板<br><span id="pt-pedal-state">踩下</span></div>
      </div>
      <div id="pt-dots" class="pt-dots"></div>
      <div id="pt-feedback" class="sight-feedback" style="margin-top:12px">点"开始"，然后按"演示一次换踏板"</div>
      <div class="pt-sim">
        <button id="pt-sim-clean" class="pt-sim-btn">✅ 演示干净换踏板</button>
        <button id="pt-sim-muddy" class="pt-sim-btn">🌫 演示脏（踩太早）</button>
        <button id="pt-sim-dry" class="pt-sim-btn">🏜 演示干（踩太晚）</button>
      </div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="pt-avg" class="sight-stat-num">—</div><div class="sight-stat-lbl">平均分</div></div>
      <div class="sight-stat"><div id="pt-clean" class="sight-stat-num">0</div><div class="sight-stat-lbl">干净次数</div></div>
      <div class="sight-stat"><div id="pt-cnt" class="sight-stat-num">0</div><div class="sight-stat-lbl">已评估</div></div>
      <div class="sight-stat"><div id="pt-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="pt-start" class="big-btn">▶ 开始 / 重来</button>
      <span id="pt-status" style="color:var(--muted)">未开始</span>
    </div>`;

  const DIFF = {
    wide: { catchLow: 40, catchHigh: 220, earlyMax: 50, lateMax: 260 },
    std: { catchLow: 50, catchHigh: 180, earlyMax: 45, lateMax: 230 },
    tight: { catchLow: 60, catchHigh: 140, earlyMax: 40, lateMax: 200 },
  };

  let pt = null;
  const dotsBox = $('#pt-dots');
  let simT = 0;
  let simNote = 60;

  function setPedalVisual(down) {
    const el = $('#pt-pedal');
    el.classList.toggle('down', down);
    $('#pt-pedal-state').textContent = down ? '踩下' : '抬起';
  }

  function addDot(r) {
    const d = document.createElement('div');
    const cls = r.kind === 'clean' ? 'clean' : r.kind === 'muddy' ? 'muddy' : 'dry';
    d.className = 'pt-dot ' + cls;
    d.textContent = r.kind === 'clean' ? '净' : r.kind === 'muddy' ? '脏' : '干';
    d.title = `${r.score} 分 · 间隔 ${Math.round(r.gap)}ms`;
    dotsBox.appendChild(d);
  }

  function refresh() {
    if (!pt) return;
    $('#pt-avg').textContent = pt.count ? pt.avgScore : '—';
    $('#pt-clean').textContent = pt.breakdown.clean;
    $('#pt-cnt').textContent = pt.count;
    $('#pt-best').textContent = pt.best;
  }

  function onChange(r) {
    addDot(r);
    refresh();
    const fb = $('#pt-feedback');
    if (r.kind === 'clean') { fb.className = 'sight-feedback ok'; fb.textContent = `✅ 干净！间隔 ${Math.round(r.gap)}ms（${r.score} 分）`; }
    else if (r.kind === 'muddy') { fb.className = 'sight-feedback no'; fb.textContent = `🌫 脏了——踩得太早（${Math.round(r.gap)}ms），上一个和声没清掉`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `🏜 发干——踩得太晚（${Math.round(r.gap)}ms），新音失去延音`; }
  }

  function stop() {
    if (pt) {
      pt.finish();
      refresh();
      if (pt.count) recordPractice('pedt', '踏板时机', pt.count, pt.breakdown.clean, pt.best);
    }
    pedalTimeOnNote = null; pedalTimeOnCC = null;
  }

  $('#pt-start').onclick = () => {
    if (pt && !pt.done) stop();
    pt = new PedalTiming({ changes: +$('#pt-changes').value, ...DIFF[$('#pt-diff').value] });
    pt.onChange = onChange;
    pt.onComplete = (info) => {
      const fb = $('#pt-feedback');
      fb.className = info.avgScore >= 70 ? 'sight-feedback ok' : 'sight-feedback';
      fb.textContent = `🎉 完成 ${info.count} 次换踏板！平均 ${info.avgScore} 分（干净 ${info.breakdown.clean} 次）`;
      stop();
      $('#pt-status').textContent = '完成 · 可重来';
    };
    pedalTimeOnNote = (note, t) => { if (pt && !pt.done) pt.noteOn(note, t); };
    pedalTimeOnCC = (val, t) => { if (pt && !pt.done) { pt.feedCC(val, t); setPedalVisual(val >= PEDAL_THRESHOLD); } };
    dotsBox.innerHTML = '';
    setPedalVisual(true);
    $('#pt-feedback').className = 'sight-feedback';
    $('#pt-feedback').textContent = '🎧 弹新音后，抬踏板再重新踩下';
    $('#pt-status').textContent = '进行中…';
    refresh();
  };

  // 模拟一次换踏板：note@simT，lift，repress@simT+gap
  function simulate(gap) {
    if (!pt || pt.done) { simT = 0; simNote = 60; $('#pt-start').click(); }
    pt.noteOn(simNote, simT);
    pt.feedCC(0, simT + 20); setPedalVisual(false);       // 抬起
    pt.feedCC(127, simT + gap); setPedalVisual(true);     // 重新踩下
    simT += 600;
    simNote = simNote >= 71 ? 60 : simNote + 2;
  }
  $('#pt-sim-clean').onclick = () => simulate(110);  // 干净
  $('#pt-sim-muddy').onclick = () => simulate(8);    // 踩太早
  $('#pt-sim-dry').onclick = () => simulate(420);    // 踩太晚

  setPedalVisual(true);
}

// ---------- 模块29：颤音速度训练 ----------
function renderTrill() {
  const root = $('#module-trill');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🪶 颤音速度训练</h2>
    <p style="color:var(--muted);margin-bottom:14px">颤音 = 在两个相邻音之间快速来回交替（如 C–D–C–D…）。选好下方音与音程，尽量<b>又快又匀</b>地交替弹这两个音。引擎测你的颤音速度（次/秒）、均匀度，并检查是否在两音之间正确交替（弹错音或没交替会扣分）。没连琴可点下方两个音键模拟。</p>

    <div class="card-panel">
      <div class="param-row"><label>下方音</label>
        <select id="tr-lower"></select>
      </div>
      <div class="param-row"><label>颤音音程</label>
        <select id="tr-iv"><option value="1">小二度（半音）</option><option value="2" selected>大二度（全音）</option><option value="3">小三度</option></select>
      </div>
      <div class="param-row"><label>采集敲击数</label>
        <select id="tr-taps"><option value="12">12 击</option><option value="16" selected>16 击</option><option value="24">24 击</option></select>
      </div>
      <div class="param-row"><label>目标速度</label>
        <select id="tr-hz"><option value="4">慢（4 次/秒）</option><option value="6" selected>中（6 次/秒）</option><option value="8">快（8 次/秒）</option><option value="10">极快（10 次/秒）</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div class="tr-keys">
        <button id="tr-key-lo" class="tr-key">下<br><span id="tr-lo-lbl">C4</span></button>
        <button id="tr-key-hi" class="tr-key">上<br><span id="tr-hi-lbl">D4</span></button>
      </div>
      <div class="tr-meter"><div id="tr-meter-fill" class="tr-meter-fill"></div></div>
      <div id="tr-feedback" class="sight-feedback" style="margin-top:12px">点"开始"，然后在两个音之间快速交替</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 两个颤音键标在 88 键上（蓝<b>"下"</b>=下方音、橙<b>"上"</b>=上方音），看着键位在两键间<b>快速来回交替</b>；每敲一下对应键会闪光，点键也能模拟</div>
      <div id="tr-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="tr-speed" class="sight-stat-num">—</div><div class="sight-stat-lbl">速度(次/秒)</div></div>
      <div class="sight-stat"><div id="tr-even" class="sight-stat-num">—</div><div class="sight-stat-lbl">均匀度</div></div>
      <div class="sight-stat"><div id="tr-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="tr-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="tr-start" class="big-btn">▶ 开始 / 重来</button>
      <span id="tr-status" style="color:var(--muted)">未开始</span>
    </div>`;

  // 下方音下拉 C3..C5
  const loSel = $('#tr-lower');
  for (let n = 48; n <= 72; n++) {
    const o = document.createElement('option');
    o.value = String(n); o.textContent = chordNoteName(n);
    if (n === 60) o.selected = true;
    loSel.appendChild(o);
  }

  let tr = null;
  let simT = 0;
  let simUp = false; // 模拟时下一击是上方音？

  const trKb = new PianoKeyboard($('#tr-kb'), {
    labels: 'c',
    onNoteOn: (m) => { const { lo, hi } = curNotes(); if (m === lo || m === hi) { if (!tr || tr.done) start(); feed(m); } else playTone(midiToFreq(m), 0, 0.6); },
  });

  function paintKb() {
    const { lo, hi } = curNotes();
    trKb.highlightMany([
      { midi: lo, color: 'hsl(205,75%,55%)', text: '下' },
      { midi: hi, color: 'hsl(28,90%,55%)', text: '上' },
    ], { scroll: false });
    trKb.scrollToShow(Math.max(21, lo - 3), Math.min(108, hi + 3));
  }

  function curNotes() {
    const lo = +loSel.value;
    return { lo, hi: lo + (+$('#tr-iv').value) };
  }
  function updateKeyLabels() {
    const { lo, hi } = curNotes();
    $('#tr-lo-lbl').textContent = chordNoteName(lo);
    $('#tr-hi-lbl').textContent = chordNoteName(hi);
    paintKb();
  }

  function pulseKey(note) {
    const { lo, hi } = curNotes();
    const el = note === lo ? $('#tr-key-lo') : note === hi ? $('#tr-key-hi') : null;
    if (!el) return;
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 90);
    trKb.flash(note, note === hi ? 'hsl(28,90%,55%)' : 'hsl(205,75%,55%)');
    // 速度计随击动一下
    const fill = $('#tr-meter-fill');
    fill.style.width = (tr && tr.count ? Math.min(100, tr.count / tr.taps * 100) : 0) + '%';
  }

  function onTap(info) {
    if (info.kind === 'wrong') {
      const fb = $('#tr-feedback'); fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${chordNoteName(info.note)} 不是目标音`;
      return;
    }
    pulseKey(info.note);
    if (info.kind === 'repeat') {
      const fb = $('#tr-feedback'); fb.className = 'sight-feedback'; fb.textContent = '↔ 要在两个音之间交替，别连弹同一个';
    }
  }

  function showResult(r) {
    $('#tr-speed').textContent = r.speedHz.toFixed(1);
    $('#tr-even').textContent = r.evenness;
    $('#tr-score').textContent = r.score;
    $('#tr-best').textContent = tr.best;
    const fb = $('#tr-feedback');
    const extra = (r.wrongNotes || r.repeats) ? `（错音 ${r.wrongNotes}，没交替 ${r.repeats}）` : '，干净利落';
    if (r.score >= 85) { fb.className = 'sight-feedback ok'; fb.textContent = `🎉 ${r.score} 分！颤音 ${r.speedHz.toFixed(1)} 次/秒，均匀度 ${r.evenness}${extra}`; }
    else if (r.score >= 60) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${r.score} 分。${r.speedHz.toFixed(1)} 次/秒，均匀度 ${r.evenness}${extra}`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${r.score} 分。${r.speedHz.toFixed(1)} 次/秒，均匀度 ${r.evenness}${extra}，慢练求匀`; }
    recordPractice('trill', '颤音训练', r.taps, Math.round(r.score / 100 * r.taps), tr.best);
    trillOnNote = null;
    $('#tr-status').textContent = '完成 · 可重来';
    $('#tr-meter-fill').style.width = '100%';
  }

  function feed(note) {
    if (!tr || tr.done) return;
    tr.feed(note, performance.now());
  }

  function start() {
    const { lo, hi } = curNotes();
    tr = new TrillTrainer({ lower: lo, upper: hi, taps: +$('#tr-taps').value, targetHz: +$('#tr-hz').value });
    tr.onTap = onTap;
    tr.onComplete = (r) => showResult(r);
    trillOnNote = (note) => feed(note);
    simT = 0; simUp = false;
    $('#tr-speed').textContent = '—'; $('#tr-even').textContent = '—'; $('#tr-score').textContent = '—';
    $('#tr-best').textContent = tr.best;
    $('#tr-meter-fill').style.width = '0%';
    const fb = $('#tr-feedback'); fb.className = 'sight-feedback'; fb.textContent = '🎧 在两个音之间又快又匀地交替';
    $('#tr-status').textContent = '进行中…';
  }

  // 模拟：交替弹两个目标音，每 120ms 一击（约 4.2 次/秒）
  function simTap() {
    if (!tr || tr.done) start();
    const { lo, hi } = curNotes();
    tr.feed(simUp ? hi : lo, simT);
    simUp = !simUp;
    simT += 120;
  }

  loSel.onchange = updateKeyLabels;
  $('#tr-iv').onchange = updateKeyLabels;
  $('#tr-key-lo').onclick = () => { if (!tr || tr.done) start(); feed(curNotes().lo); };
  $('#tr-key-hi').onclick = () => { if (!tr || tr.done) start(); feed(curNotes().hi); };
  $('#tr-start').onclick = start;

  updateKeyLabels();
}

// ---------- 模块30：装饰音训练 ----------
function renderOrnament() {
  const root = $('#module-ornament');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎵 装饰音训练</h2>
    <p style="color:var(--muted);margin-bottom:14px">装饰音是钢琴曲里给旋律"加花"的小音群。本模块练三种：<b>倚音</b>（小音抢在主音前，两音）、<b>波音</b>（主-辅-主，三音）、<b>回音</b>（上辅-主-下辅-主，四音）。看下方"目标音序列"，按顺序又快又匀地弹出来——装饰音要<b>干脆</b>（音与音间隔越短越好）。没连琴可点目标音键模拟。</p>

    <div class="card-panel">
      <div class="param-row"><label>装饰音类型</label>
        <select id="or-type">
          <option value="grace">倚音（2 音）</option>
          <option value="mordent" selected>波音（3 音）</option>
          <option value="turn">回音（4 音）</option>
        </select>
      </div>
      <div class="param-row"><label>主音</label>
        <select id="or-main"></select>
      </div>
      <div class="param-row" id="or-dir-row"><label>方向</label>
        <select id="or-dir"><option value="upper" selected>上方（辅音偏高）</option><option value="lower">下方（辅音偏低）</option></select>
      </div>
      <div class="param-row"><label>辅音音程</label>
        <select id="or-iv"><option value="1">小二度（半音）</option><option value="2" selected>大二度（全音）</option></select>
      </div>
      <div class="param-row"><label>干脆度要求</label>
        <select id="or-crisp"><option value="160">轻松（≤160ms）</option><option value="120" selected>标准（≤120ms）</option><option value="80">严格（≤80ms）</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div id="or-seq" class="or-seq"></div>
      <div id="or-feedback" class="sight-feedback" style="margin-top:12px">点"开始"，然后按目标序列依次弹</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="or-speed" class="sight-stat-num">—</div><div class="sight-stat-lbl">干脆度</div></div>
      <div class="sight-stat"><div id="or-even" class="sight-stat-num">—</div><div class="sight-stat-lbl">均匀度</div></div>
      <div class="sight-stat"><div id="or-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="or-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="or-start" class="big-btn">▶ 开始 / 重来</button>
      <button id="or-sim" class="big-btn" style="background:var(--panel2)">🎹 模拟弹一遍</button>
      <span id="or-status" style="color:var(--muted)">未开始</span>
    </div>`;

  // 主音下拉 C3..C5
  const mainSel = $('#or-main');
  for (let n = 48; n <= 72; n++) {
    const o = document.createElement('option');
    o.value = String(n); o.textContent = chordNoteName(n);
    if (n === 60) o.selected = true;
    mainSel.appendChild(o);
  }

  let or = null;

  function opts() {
    return {
      type: $('#or-type').value,
      main: +mainSel.value,
      direction: $('#or-dir').value,
      interval: +$('#or-iv').value,
      crisp: +$('#or-crisp').value,
    };
  }

  function renderSeq() {
    const seq = or ? or.seq : (new OrnamentTrainer(opts())).seq;
    const idx = or ? or.progress : 0;
    $('#or-seq').innerHTML = seq.map((n, i) => {
      const cls = i < idx ? 'done' : i === idx && or && !or.done ? 'cur' : '';
      return `<button class="or-note ${cls}" data-note="${n}">${chordNoteName(n)}</button>`;
    }).join('<span class="or-arrow">→</span>');
    // 绑定点击模拟弹该音
    $('#or-seq').querySelectorAll('.or-note').forEach((b) => {
      b.onclick = () => { if (!or || or.done) start(); feed(+b.dataset.note); };
    });
  }

  function pulse(index) {
    const btns = $('#or-seq').querySelectorAll('.or-note');
    const el = btns[index];
    if (!el) return;
    el.classList.add('lit');
    setTimeout(() => el.classList.remove('lit'), 110);
  }

  function onHit(info) {
    if (info.kind === 'wrong') {
      const fb = $('#or-feedback'); fb.className = 'sight-feedback no';
      fb.textContent = `⚠ 弹错了，下一个应是 ${chordNoteName(info.expected)}`;
      return;
    }
    pulse(info.index);
    renderSeq();
  }

  function showResult(r) {
    $('#or-speed').textContent = r.speed;
    $('#or-even').textContent = r.evenness;
    $('#or-score').textContent = r.score;
    $('#or-best').textContent = or.best;
    const fb = $('#or-feedback');
    const label = ORNAMENT_LABELS[r.type] || '装饰音';
    const extra = r.wrongNotes ? `（错音 ${r.wrongNotes}）` : '，音准全对';
    if (r.score >= 85) { fb.className = 'sight-feedback ok'; fb.textContent = `🎉 ${label} ${r.score} 分！平均间隔 ${r.meanIoi}ms，干脆利落${extra}`; }
    else if (r.score >= 60) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${label} ${r.score} 分。平均间隔 ${r.meanIoi}ms${extra}`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${label} ${r.score} 分。平均间隔 ${r.meanIoi}ms${extra}，再快一点更干脆`; }
    recordPractice('ornament', label, r.notes, Math.round(r.score / 100 * r.notes), or.best);
    ornamentOnNote = null;
    $('#or-status').textContent = '完成 · 可重来';
    renderSeq();
  }

  function feed(note) {
    if (!or || or.done) return;
    or.feed(note, performance.now());
  }

  function start() {
    or = new OrnamentTrainer(opts());
    or.onHit = onHit;
    or.onComplete = (r) => showResult(r);
    ornamentOnNote = (note) => feed(note);
    $('#or-speed').textContent = '—'; $('#or-even').textContent = '—'; $('#or-score').textContent = '—';
    $('#or-best').textContent = or.best;
    const fb = $('#or-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `🎧 按顺序弹：${or.seq.map(chordNoteName).join(' → ')}`;
    $('#or-status').textContent = '进行中…';
    renderSeq();
  }

  // 模拟：按序列每 90ms 弹一个
  function sim() {
    if (!or || or.done) start();
    const seq = or.seq.slice();
    let i = 0;
    const step = () => {
      if (!or || or.done || i >= seq.length) return;
      or.feed(seq[i], performance.now());
      i++;
      if (i < seq.length) setTimeout(step, 90);
    };
    step();
  }

  function refreshDirRow() {
    // 回音没有方向选项（固定上-主-下-主）
    $('#or-dir-row').style.display = $('#or-type').value === 'turn' ? 'none' : '';
  }

  $('#or-type').onchange = () => { refreshDirRow(); or = null; renderSeq(); };
  mainSel.onchange = () => { or = null; renderSeq(); };
  $('#or-dir').onchange = () => { or = null; renderSeq(); };
  $('#or-iv').onchange = () => { or = null; renderSeq(); };
  $('#or-start').onclick = start;
  $('#or-sim').onclick = sim;

  refreshDirRow();
  renderSeq();
}

// ---------- 模块31：音程大跳准确度 ----------
function renderLeap() {
  const root = $('#module-leap');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎯 音程大跳准确度</h2>
    <p style="color:var(--muted);margin-bottom:14px">"大跳"指旋律里相邻音相距很远（八度甚至更多）。难点是手要<b>直接跳到位、一次弹准</b>，不能挨个摸索。下方会给一串大跳目标音，请依次跳到每个音上——<b>一次弹准</b>准确度才满分；弹错（摸索）会扣准确度。没连琴可点亮着的目标音模拟。</p>

    <div class="card-panel">
      <div class="param-row"><label>音域</label>
        <select id="lp-range">
          <option value="48,72">C3–C5（2 个八度）</option>
          <option value="48,84" selected>C3–C6（3 个八度）</option>
          <option value="36,96">C2–C7（5 个八度）</option>
        </select>
      </div>
      <div class="param-row"><label>最小跳度</label>
        <select id="lp-leap">
          <option value="7">五度（7 半音）</option>
          <option value="12" selected>八度（12 半音）</option>
          <option value="16">十度（16 半音）</option>
        </select>
      </div>
      <div class="param-row"><label>目标个数</label>
        <select id="lp-count"><option value="6">6 个</option><option value="8" selected>8 个</option><option value="12">12 个</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div id="lp-seq" class="lp-seq"></div>
      <div id="lp-feedback" class="sight-feedback" style="margin-top:12px">点"开始"生成一串大跳，然后依次跳准</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 大跳画在 88 键上：蓝<b>"从"</b>=刚弹的上一个音、黄 ▶<b>"到"</b>=当前要跳到的目标音，两键之间的距离就是这一跳要跨多远；紫=后续目标。没连琴可点键模拟</div>
      <div id="lp-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="lp-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">一次弹准率</div></div>
      <div class="sight-stat"><div id="lp-miss" class="sight-stat-num">—</div><div class="sight-stat-lbl">失误数</div></div>
      <div class="sight-stat"><div id="lp-span" class="sight-stat-num">—</div><div class="sight-stat-lbl">平均跳度</div></div>
      <div class="sight-stat"><div id="lp-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="lp-start" class="big-btn">▶ 开始 / 换一串</button>
      <button id="lp-sim" class="big-btn" style="background:var(--panel2)">🎹 模拟全部弹准</button>
      <span id="lp-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let lp = null;

  const lpKb = new PianoKeyboard($('#lp-kb'), {
    labels: 'c',
    onNoteOn: (m) => { if (lp && !lp.done) feed(m); else playTone(midiToFreq(m), 0, 0.6); },
  });
  lpKb.scrollToShow(48, 84);

  function paintKb() {
    if (!lp) { lpKb.clear(); return; }
    const idx = lp.progress;
    const items = lp.seq.map((n, i) => {
      if (i < idx) return { midi: n, color: 'hsl(140,25%,42%)' };
      if (i === idx) return null;
      return { midi: n, color: 'hsl(265,45%,52%)' };
    }).filter(Boolean);
    lpKb.highlightMany(items, { scroll: false });
    if (!lp.done) {
      const cur = lp.seq[idx];
      const prev = idx > 0 ? lp.seq[idx - 1] : null;
      if (prev != null) lpKb.highlight(prev, { color: 'hsl(205,75%,55%)', text: '从' });
      if (cur != null) {
        lpKb.highlight(cur, { color: 'hsl(48,100%,55%)', text: '到' });
        const lo = prev != null ? Math.min(prev, cur) : cur;
        const hi = prev != null ? Math.max(prev, cur) : cur;
        lpKb.scrollToShow(Math.max(21, lo - 2), Math.min(108, hi + 2));
      }
    }
  }

  function opts() {
    const [low, high] = $('#lp-range').value.split(',').map(Number);
    return { low, high, minLeap: +$('#lp-leap').value, count: +$('#lp-count').value };
  }

  function renderSeq() {
    if (!lp) { $('#lp-seq').innerHTML = '<span style="color:var(--muted)">点"开始"生成大跳序列</span>'; return; }
    const idx = lp.progress;
    $('#lp-seq').innerHTML = lp.seq.map((n, i) => {
      const cls = i < idx ? 'done' : i === idx && !lp.done ? 'cur' : '';
      return `<button class="lp-note ${cls}" data-note="${n}">${chordNoteName(n)}</button>`;
    }).join('');
    $('#lp-seq').querySelectorAll('.lp-note').forEach((b) => {
      b.onclick = () => { if (!lp || lp.done) return; feed(+b.dataset.note); };
    });
    paintKb();
  }

  function pulse(index, miss) {
    const btns = $('#lp-seq').querySelectorAll('.lp-note');
    const el = btns[index];
    if (!el) return;
    el.classList.add(miss ? 'missed' : 'lit');
    setTimeout(() => el.classList.remove(miss ? 'missed' : 'lit'), 130);
  }

  function onHit(info) {
    if (info.kind === 'miss') {
      pulse(info.index, true);
      const fb = $('#lp-feedback'); fb.className = 'sight-feedback no';
      fb.textContent = `⚠ 跳错了，目标是 ${chordNoteName(info.expected)} — 别摸索，直接跳`;
      return;
    }
    pulse(info.index, false);
    const fb = $('#lp-feedback'); fb.className = 'sight-feedback';
    fb.textContent = info.firstTry ? `✓ ${chordNoteName(info.note)} 一次弹准！` : `○ ${chordNoteName(info.note)} 找到了`;
    renderSeq();
  }

  function showResult(r) {
    $('#lp-acc').textContent = r.accuracy + '%';
    $('#lp-miss').textContent = r.misses;
    $('#lp-span').textContent = r.span;
    $('#lp-best').textContent = lp.best + '%';
    const fb = $('#lp-feedback');
    if (r.accuracy >= 85) { fb.className = 'sight-feedback ok'; fb.textContent = `🎉 一次弹准率 ${r.accuracy}%（${r.firstTryHits}/${r.total}），失误 ${r.misses}，平均跳度 ${r.span} 半音`; }
    else if (r.accuracy >= 60) { fb.className = 'sight-feedback'; fb.textContent = `👍 一次弹准率 ${r.accuracy}%（${r.firstTryHits}/${r.total}），失误 ${r.misses}`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ 一次弹准率 ${r.accuracy}%（${r.firstTryHits}/${r.total}）。先慢一点、看准位置再跳`; }
    recordPractice('leap', '大跳准确度', r.total, r.firstTryHits, lp.best);
    leapOnNote = null;
    $('#lp-status').textContent = '完成 · 可换一串';
    renderSeq();
  }

  function feed(note) {
    if (!lp || lp.done) return;
    lp.feed(note, performance.now());
  }

  function start() {
    lp = new LeapTrainer(opts());
    lp.onHit = onHit;
    lp.onComplete = (r) => showResult(r);
    leapOnNote = (note) => feed(note);
    $('#lp-acc').textContent = '—'; $('#lp-miss').textContent = '—'; $('#lp-span').textContent = leapSpanShow(lp.seq);
    $('#lp-best').textContent = lp.best + '%';
    const fb = $('#lp-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `🎯 依次跳到：${lp.seq.map(chordNoteName).join(' · ')}`;
    $('#lp-status').textContent = '进行中…';
    renderSeq();
  }

  function leapSpanShow(seq) {
    if (seq.length < 2) return 0;
    let s = 0; for (let i = 1; i < seq.length; i++) s += Math.abs(seq[i] - seq[i - 1]);
    return Math.round(s / (seq.length - 1));
  }

  // 模拟：按序列每 250ms 弹准一个
  function sim() {
    if (!lp || lp.done) start();
    const seq = lp.seq.slice();
    let i = 0;
    const step = () => {
      if (!lp || lp.done || i >= seq.length) return;
      lp.feed(seq[i], performance.now());
      i++;
      if (i < seq.length) setTimeout(step, 250);
    };
    step();
  }

  $('#lp-range').onchange = () => { lp = null; renderSeq(); };
  $('#lp-leap').onchange = () => { lp = null; renderSeq(); };
  $('#lp-count').onchange = () => { lp = null; renderSeq(); };
  $('#lp-start').onclick = start;
  $('#lp-sim').onclick = sim;

  renderSeq();
}

// ---------- 模块32：旋律声部突出 ----------
function renderVoicing() {
  const root = $('#module-voicing');
  if (!root) return;
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🔝 旋律声部突出（Voicing）</h2>
    <p style="color:var(--muted);margin-bottom:14px">钢琴进阶技巧：弹和弦时，<b>旋律声部</b>（通常是最高音）要比内声部更响，让旋律"浮"在和声之上。本模块每轮请你<b>同时按下一个和弦</b>（至少 2 个音），引擎检查目标声部的力度是否明显高于其它音。和弦弹完后会自动结算（约 ${'80'}ms 内按下的算同一和弦）。没连琴可点下方"模拟"按钮。</p>

    <div class="card-panel">
      <div class="param-row"><label>目标声部</label>
        <select id="vo-voice"><option value="top" selected>最高音（旋律在上）</option><option value="bottom">最低音（旋律在下/低音突出）</option></select>
      </div>
      <div class="param-row"><label>力度余量要求</label>
        <select id="vo-margin"><option value="10">轻松（高 10）</option><option value="15" selected>标准（高 15）</option><option value="25">严格（高 25）</option></select>
      </div>
      <div class="param-row"><label>练习和弦数</label>
        <select id="vo-rounds"><option value="3">3 个</option><option value="5" selected>5 个</option><option value="8">8 个</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div id="vo-chord" class="vo-chord"><span style="color:var(--muted)">点"开始"，然后同时按下一个和弦</span></div>
      <div id="vo-feedback" class="sight-feedback" style="margin-top:12px">每个和弦让旋律音更响</div>
      <div id="vo-dots" class="vo-dots"></div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 你按下的和弦显示在 88 键上，<b>金色"响"=该突出的旋律声部</b>、蓝色=内声部（键上小字是力度 v 值）；目标就是让金键力度明显高于蓝键</div>
      <div id="vo-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="vo-avg" class="sight-stat-num">—</div><div class="sight-stat-lbl">平均分</div></div>
      <div class="sight-stat"><div id="vo-clean" class="sight-stat-num">—</div><div class="sight-stat-lbl">达标和弦</div></div>
      <div class="sight-stat"><div id="vo-prog" class="sight-stat-num">0</div><div class="sight-stat-lbl">进度</div></div>
      <div class="sight-stat"><div id="vo-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="vo-start" class="big-btn">▶ 开始 / 重来</button>
      <button id="vo-sim-good" class="big-btn" style="background:var(--panel2)">🎹 模拟（旋律突出）</button>
      <button id="vo-sim-bad" class="big-btn" style="background:var(--panel2)">🎹 模拟（旋律埋没）</button>
      <span id="vo-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let vo = null;
  let flushTimer = 0;
  const WINDOW = 80;
  const voKb = new PianoKeyboard($('#vo-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  voKb.scrollToShow(55, 79);

  function paintKb() {
    if (!vo || !vo.buffer || !vo.buffer.length) { voKb.clear(); return; }
    const sorted = vo.buffer.slice().sort((a, b) => a.note - b.note);
    const targetNote = $('#vo-voice').value === 'top'
      ? sorted[sorted.length - 1].note : sorted[0].note;
    voKb.highlightMany(sorted.map((b) => ({
      midi: b.note,
      color: b.note === targetNote ? 'hsl(45,100%,55%)' : 'hsl(215,62%,55%)',
      text: b.note === targetNote ? '响' : 'v' + b.vel,
    })), { scroll: false });
  }

  function opts() {
    return { targetVoice: $('#vo-voice').value, margin: +$('#vo-margin').value, rounds: +$('#vo-rounds').value, window: WINDOW };
  }

  function renderDots() {
    const rounds = vo ? vo.rounds : +$('#vo-rounds').value;
    const res = vo ? vo.results : [];
    let html = '';
    for (let i = 0; i < rounds; i++) {
      const r = res[i];
      const cls = !r ? 'pending' : r.score >= 80 ? 'good' : r.score >= 40 ? 'mid' : 'bad';
      const txt = r ? r.score : '·';
      html += `<div class="vo-dot ${cls}">${txt}</div>`;
    }
    $('#vo-dots').innerHTML = html;
    $('#vo-prog').textContent = `${res.length}/${rounds}`;
  }

  function showChord(r) {
    const voice = $('#vo-voice').value === 'top' ? '最高音' : '最低音';
    const fb = $('#vo-feedback');
    if (r.single) { fb.className = 'sight-feedback'; fb.textContent = '⚠ 只按了一个音，请同时按 2 个以上音组成和弦'; }
    else if (r.score >= 80) { fb.className = 'sight-feedback ok'; fb.textContent = `🎉 ${voice}力度 ${r.vTarget}，比内声部高 ${r.diff} — 旋律很突出！`; }
    else if (r.score >= 40) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${voice}比内声部高 ${r.diff}，再多突出一点（目标 +${vo.margin}）`; }
    else if (r.diff <= 0) { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${voice}被埋没了（差 ${r.diff}）— 旋律音要更用力`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${voice}只高 ${r.diff}，远不够（目标 +${vo.margin}）`; }
    renderDots();
  }

  function showSummary(s) {
    $('#vo-avg').textContent = s.avgScore;
    $('#vo-clean').textContent = `${s.clean}/${s.chords}`;
    $('#vo-best').textContent = vo.best;
    const fb = $('#vo-feedback');
    if (s.avgScore >= 80) { fb.className = 'sight-feedback ok'; fb.textContent = `🏆 平均 ${s.avgScore} 分，${s.clean}/${s.chords} 个和弦旋律突出到位！`; }
    else if (s.avgScore >= 50) { fb.className = 'sight-feedback'; fb.textContent = `平均 ${s.avgScore} 分，${s.clean}/${s.chords} 达标。多练旋律声部的"重量"` }
    else { fb.className = 'sight-feedback no'; fb.textContent = `平均 ${s.avgScore} 分。试试旋律手指多沉一点、内声部放轻` }
    recordPractice('voicing', '旋律声部突出', s.chords, s.clean, vo.best);
    voicingOnNote = null;
    $('#vo-status').textContent = '完成 · 可重来';
    renderDots();
  }

  function scheduleFlush() {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { if (vo && !vo.done) vo.flush(); }, WINDOW + 40);
  }

  function feedNote(note, vel) {
    if (!vo || vo.done) return;
    vo.feed(note, vel, performance.now());
    $('#vo-chord').innerHTML = vo.buffer
      .slice().sort((a, b) => a.note - b.note)
      .map((b) => `<span class="vo-key">${chordNoteName(b.note)}<small>v${b.vel}</small></span>`).join('');
    paintKb();
    scheduleFlush();
  }

  function start() {
    vo = new VoicingTrainer(opts());
    vo.onChord = (r) => showChord(r);
    vo.onComplete = (s) => showSummary(s);
    voicingOnNote = (note, vel) => feedNote(note, vel);
    $('#vo-avg').textContent = '—'; $('#vo-clean').textContent = '—'; $('#vo-best').textContent = vo.best;
    $('#vo-chord').innerHTML = '<span style="color:var(--muted)">同时按下一个和弦…</span>';
    const fb = $('#vo-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `🎯 弹 ${vo.rounds} 个和弦，每个让${$('#vo-voice').value === 'top' ? '最高' : '最低'}音更响`;
    $('#vo-status').textContent = '进行中…';
    voKb.clear();
    renderDots();
  }

  // 模拟：按一个 C 大三和弦，旋律突出 / 埋没
  function sim(good) {
    if (!vo || vo.done) start();
    const voice = $('#vo-voice').value;
    // C(60) E(64) G(67)，目标声部 top=67 / bottom=60
    const target = voice === 'top' ? 67 : 60;
    const t = performance.now();
    [60, 64, 67].forEach((n) => {
      let v = 50;
      if (n === target) v = good ? 95 : 35;  // 突出 or 埋没
      vo.feed(n, v, t);
    });
    $('#vo-chord').innerHTML = vo.buffer.slice().sort((a, b) => a.note - b.note)
      .map((b) => `<span class="vo-key">${chordNoteName(b.note)}<small>v${b.vel}</small></span>`).join('');
    paintKb();
    vo.flush();
  }

  $('#vo-voice').onchange = () => { vo = null; voKb.clear(); renderDots(); };
  $('#vo-margin').onchange = () => { vo = null; voKb.clear(); renderDots(); };
  $('#vo-rounds').onchange = () => { vo = null; voKb.clear(); renderDots(); };
  $('#vo-start').onclick = start;
  $('#vo-sim-good').onclick = () => sim(true);
  $('#vo-sim-bad').onclick = () => sim(false);

  renderDots();
}

// ---------- 模块33：力度渐变曲线（crescendo / decrescendo） ----------
function renderCrescendo() {
  const root = $('#module-cresc');
  if (!root) return;
  root.innerHTML = `
    <h2>🎚️ 力度渐变曲线（Crescendo / Decrescendo）</h2>
    <p style="color:var(--muted);margin-bottom:14px">表现力进阶：把一串音的力度<b>平滑地推上去（渐强）</b>或<b>收下来（渐弱）</b>，是塑造乐句呼吸感的关键。本模块请你连续弹 <b id="cr-count-lbl">8</b> 个音，引擎记录每个音的力度并画成曲线，按<b>方向正确度</b>、<b>平滑度</b>、<b>力度跨度</b>综合评分。没连琴可点下方"模拟"按钮。</p>

    <div class="card-panel">
      <div class="param-row"><label>方向</label>
        <select id="cr-dir"><option value="cresc" selected>渐强 cresc. ＜（弱→强）</option><option value="decresc">渐弱 decresc. ＞（强→弱）</option></select>
      </div>
      <div class="param-row"><label>音数</label>
        <select id="cr-count"><option value="5">5 个</option><option value="8" selected>8 个</option><option value="12">12 个</option></select>
      </div>
      <div class="param-row"><label>跨度要求</label>
        <select id="cr-span"><option value="30">轻松（首尾差 30）</option><option value="40" selected>标准（首尾差 40）</option><option value="60">明显（首尾差 60）</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <svg id="cr-curve" class="cr-curve" viewBox="0 0 480 180" preserveAspectRatio="none"></svg>
      <div id="cr-feedback" class="sight-feedback" style="margin-top:10px">点"开始"，然后依次弹出渐变的力度</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="cr-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">本条分数</div></div>
      <div class="sight-stat"><div id="cr-dir-pct" class="sight-stat-num">—</div><div class="sight-stat-lbl">方向正确</div></div>
      <div class="sight-stat"><div id="cr-smooth" class="sight-stat-num">—</div><div class="sight-stat-lbl">平滑度</div></div>
      <div class="sight-stat"><div id="cr-prog" class="sight-stat-num">0</div><div class="sight-stat-lbl">进度</div></div>
      <div class="sight-stat"><div id="cr-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="cr-start" class="big-btn">▶ 开始 / 重来</button>
      <button id="cr-sim-good" class="big-btn" style="background:var(--panel2)">🎹 模拟（平滑渐变）</button>
      <button id="cr-sim-bad" class="big-btn" style="background:var(--panel2)">🎹 模拟（忽强忽弱）</button>
      <span id="cr-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let cr = null;

  function opts() {
    return { direction: $('#cr-dir').value, count: +$('#cr-count').value, minSpan: +$('#cr-span').value };
  }

  // 画力度曲线：x = 音序，y = 力度（顶=127）。绿点=方向正确，红点=方向错。虚线=理想斜坡。
  function drawCurve(velocities, result) {
    const W = 480, H = 180, pad = 14;
    const count = cr ? cr.count : +$('#cr-count').value;
    const sign = $('#cr-dir').value === 'decresc' ? -1 : 1;
    const x = (i) => pad + (count <= 1 ? 0 : (W - 2 * pad) * i / (count - 1));
    const y = (v) => H - pad - (H - 2 * pad) * (v - 1) / 126;
    let svg = '';
    // 网格基线（pp..ff 的几条参考横线）
    [31, 67, 105].forEach((v) => {
      svg += `<line x1="${pad}" y1="${y(v).toFixed(1)}" x2="${W - pad}" y2="${y(v).toFixed(1)}" stroke="var(--line)" stroke-width="1"/>`;
    });
    // 理想斜坡（结算后才有）
    if (result && result.ideal && result.ideal.length >= 2) {
      const id = result.ideal;
      const pts = id.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6"/>`;
    }
    // 实际折线
    if (velocities.length >= 2) {
      const pts = velocities.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="url(#crg)" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    // 点
    velocities.forEach((v, i) => {
      let col = 'var(--hi2)';
      if (i === 0) col = 'var(--muted)';
      else col = Math.sign(v - velocities[i - 1]) === sign ? 'var(--ok)' : 'var(--hi)';
      svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" fill="${col}"/>`;
    });
    svg = `<defs><linearGradient id="crg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#667eea"/><stop offset="1" stop-color="#e94560"/></linearGradient></defs>` + svg;
    $('#cr-curve').innerHTML = svg;
  }

  function showResult(r) {
    $('#cr-score').textContent = r.score;
    $('#cr-dir-pct').textContent = Math.round(r.monotonic * 100) + '%';
    $('#cr-smooth').textContent = Math.round(r.smoothness * 100) + '%';
    $('#cr-best').textContent = cr.best;
    drawCurve(r.velocities, r);
    const dirName = r.direction === 'decresc' ? '渐弱' : '渐强';
    const fb = $('#cr-feedback');
    if (r.score >= 85) { fb.className = 'sight-feedback ok'; fb.textContent = `🏆 ${r.score} 分！${dirName}既到位又平滑，跨度 ${r.span}`; }
    else if (r.score >= 60) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${r.score} 分。方向 ${Math.round(r.monotonic * 100)}%、平滑 ${Math.round(r.smoothness * 100)}%、跨度 ${r.span}，再均匀一点`; }
    else if (r.monotonic < 0.5) { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${r.score} 分：方向只对 ${Math.round(r.monotonic * 100)}%，注意整体要${dirName}（别忽强忽弱）`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${r.score} 分：${r.span < 20 ? '力度跨度太小，拉开强弱对比' : '起伏不够平滑，让每一步差不多大'}`; }
    recordPractice('cresc', '力度渐变曲线', 1, r.score >= 60 ? 1 : 0, cr.best);
    crescOnNote = null;
    $('#cr-status').textContent = '完成 · 可重来';
  }

  function feed(vel) {
    if (!cr || cr.done) return;
    cr.feed(vel);
    $('#cr-prog').textContent = `${cr.progress}/${cr.count}`;
    drawCurve(cr.velocities, null);
  }

  function start() {
    cr = new CrescendoTrainer(opts());
    cr.onComplete = (r) => showResult(r);
    crescOnNote = (vel) => feed(vel);
    $('#cr-score').textContent = '—'; $('#cr-dir-pct').textContent = '—'; $('#cr-smooth').textContent = '—';
    $('#cr-best').textContent = cr.best; $('#cr-prog').textContent = `0/${cr.count}`;
    const fb = $('#cr-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `🎯 连续弹 ${cr.count} 个音，力度整体${cr.direction === 'decresc' ? '渐弱（强→弱）' : '渐强（弱→强）'}`;
    $('#cr-status').textContent = '进行中…';
    drawCurve([], null);
  }

  // 模拟：平滑渐变 or 忽强忽弱
  function sim(good) {
    start();
    const sign = cr.direction === 'decresc' ? -1 : 1;
    const ideal = idealRamp(sign > 0 ? 25 : 110, sign > 0 ? 110 : 25, cr.count);
    ideal.forEach((v) => {
      const noise = good ? (Math.random() * 6 - 3) : (Math.random() * 70 - 35);
      cr.feed(v + noise);
    });
  }

  $('#cr-dir').onchange = () => { cr = null; drawCurve([], null); };
  $('#cr-count').onchange = () => { cr = null; $('#cr-count-lbl').textContent = $('#cr-count').value; drawCurve([], null); };
  $('#cr-span').onchange = () => { cr = null; };
  $('#cr-start').onclick = start;
  $('#cr-sim-good').onclick = () => sim(true);
  $('#cr-sim-bad').onclick = () => sim(false);

  drawCurve([], null);
}

// ---------- 模块34：速度渐变（accelerando / ritardando） ----------
function renderTempoRamp() {
  const root = $('#module-temporamp');
  if (!root) return;
  root.innerHTML = `
    <h2>🚀 速度渐变（Accelerando / Ritardando）</h2>
    <p style="color:var(--muted);margin-bottom:14px">表现力进阶：在一串音里<b>平滑地把速度推快（渐快 accel.）</b>或<b>拉慢（渐慢 rit.）</b>，是乐句收放、rubato 的核心。和"节拍稳定度"（追求匀速）相反，这里追求<b>有方向地变速</b>。连续敲 <b id="tr-count-lbl">9</b> 下（任意琴键或空格键），引擎测每两下的间隔，画成 BPM 曲线并按方向/平滑度/变速幅度评分。</p>

    <div class="card-panel">
      <div class="param-row"><label>方向</label>
        <select id="tr-dir"><option value="accel" selected>渐快 accel. »（慢→快）</option><option value="rit">渐慢 rit. «（快→慢）</option></select>
      </div>
      <div class="param-row"><label>敲击数</label>
        <select id="tr-count"><option value="6">6 下</option><option value="9" selected>9 下</option><option value="13">13 下</option></select>
      </div>
      <div class="param-row"><label>变速幅度要求</label>
        <select id="tr-ratio"><option value="0.25">轻松（变速 25%）</option><option value="0.4" selected>标准（变速 40%）</option><option value="0.6">明显（变速 60%）</option></select>
      </div>
    </div>

    <div class="card-panel" style="text-align:center">
      <svg id="tr-curve" class="cr-curve" viewBox="0 0 480 180" preserveAspectRatio="none"></svg>
      <div id="tr-feedback" class="sight-feedback" style="margin-top:10px">点"开始"，然后依次敲出渐变的速度</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="tr-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">本条分数</div></div>
      <div class="sight-stat"><div id="tr-dir-pct" class="sight-stat-num">—</div><div class="sight-stat-lbl">方向正确</div></div>
      <div class="sight-stat"><div id="tr-smooth" class="sight-stat-num">—</div><div class="sight-stat-lbl">平滑度</div></div>
      <div class="sight-stat"><div id="tr-prog" class="sight-stat-num">0</div><div class="sight-stat-lbl">进度</div></div>
      <div class="sight-stat"><div id="tr-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="tr-start" class="big-btn">▶ 开始 / 重来</button>
      <button id="tr-tap" class="big-btn" style="background:var(--accent)">👆 敲击（或按空格）</button>
      <button id="tr-sim-good" class="big-btn" style="background:var(--panel2)">🎹 模拟（平滑变速）</button>
      <button id="tr-sim-bad" class="big-btn" style="background:var(--panel2)">🎹 模拟（忽快忽慢）</button>
      <span id="tr-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let tr = null;

  function opts() {
    return { direction: $('#tr-dir').value, count: +$('#tr-count').value, minRatio: +$('#tr-ratio').value };
  }

  // 画 BPM 曲线：x = 间隔序号，y = BPM。绿点=方向正确，红点=方向错。虚线=理想斜坡。
  function drawCurve(bpms, result) {
    const W = 480, H = 180, pad = 16;
    const dir = $('#tr-dir').value;
    // accel: BPM 应递增（diff>0 对）；rit: 应递减（diff<0 对）
    const wantSign = dir === 'rit' ? -1 : 1;
    const all = bpms.slice();
    if (result && result.idealIois) all.push(...result.idealIois.map(ioiToBpm));
    const lo = all.length ? Math.min(...all) : 60;
    const hi = all.length ? Math.max(...all) : 180;
    const pad2 = Math.max(10, (hi - lo) * 0.15);
    const yMin = lo - pad2, yMax = hi + pad2;
    const count = (tr ? tr.count : +$('#tr-count').value) - 1; // 间隔数
    const x = (i) => pad + (count <= 1 ? 0 : (W - 2 * pad) * i / (count - 1));
    const y = (v) => H - pad - (H - 2 * pad) * (v - yMin) / (yMax - yMin || 1);
    let svg = '';
    // 理想斜坡（结算后）
    if (result && result.idealIois && result.idealIois.length >= 2) {
      const idb = result.idealIois.map(ioiToBpm);
      const pts = idb.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6"/>`;
    }
    if (bpms.length >= 2) {
      const pts = bpms.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="url(#trg)" stroke-width="2.5" stroke-linejoin="round"/>`;
    }
    bpms.forEach((v, i) => {
      let col = 'var(--hi2)';
      if (i === 0) col = 'var(--muted)';
      else col = Math.sign(v - bpms[i - 1]) === wantSign ? 'var(--ok)' : 'var(--hi)';
      svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" fill="${col}"/>`;
    });
    svg = `<defs><linearGradient id="trg" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#667eea"/><stop offset="1" stop-color="#4ade80"/></linearGradient></defs>` + svg;
    $('#tr-curve').innerHTML = svg;
  }

  function showResult(r) {
    $('#tr-score').textContent = r.score;
    $('#tr-dir-pct').textContent = Math.round(r.monotonic * 100) + '%';
    $('#tr-smooth').textContent = Math.round(r.smoothness * 100) + '%';
    $('#tr-best').textContent = tr.best;
    drawCurve(r.bpms, r);
    const dirName = r.direction === 'rit' ? '渐慢' : '渐快';
    const startBpm = Math.round(r.bpms[0] || 0), endBpm = Math.round(r.bpms[r.bpms.length - 1] || 0);
    const fb = $('#tr-feedback');
    if (r.score >= 85) { fb.className = 'sight-feedback ok'; fb.textContent = `🏆 ${r.score} 分！${dirName}平滑到位（${startBpm}→${endBpm} BPM）`; }
    else if (r.score >= 60) { fb.className = 'sight-feedback'; fb.textContent = `👍 ${r.score} 分。方向 ${Math.round(r.monotonic * 100)}%、平滑 ${Math.round(r.smoothness * 100)}%（${startBpm}→${endBpm} BPM），再均匀一点`; }
    else if (r.monotonic < 0.5) { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${r.score} 分：方向只对 ${Math.round(r.monotonic * 100)}%，注意整体要${dirName}（别忽快忽慢）`; }
    else { fb.className = 'sight-feedback no'; fb.textContent = `⚠ ${r.score} 分：${r.spanScore < 0.4 ? '变速幅度太小，速度差再拉大些' : '起伏不够平滑，让每一步变速差不多大'}`; }
    recordPractice('temporamp', '速度渐变', 1, r.score >= 60 ? 1 : 0, tr.best);
    tempoRampOnNote = null;
    $('#tr-status').textContent = '完成 · 可重来';
  }

  function tap(time) {
    if (!tr || tr.done) return;
    tr.feed(time);
    $('#tr-prog').textContent = `${tr.progress}/${tr.count}`;
    // 实时画当前已有间隔的 BPM
    drawCurve(tempoBpms(), null);
  }

  function tempoBpms() {
    if (!tr) return [];
    const b = [];
    for (let i = 1; i < tr.times.length; i++) b.push(ioiToBpm(tr.times[i] - tr.times[i - 1]));
    return b;
  }

  function start() {
    tr = new TempoRampTrainer(opts());
    tr.onComplete = (r) => showResult(r);
    tempoRampOnNote = (time) => tap(time);
    $('#tr-score').textContent = '—'; $('#tr-dir-pct').textContent = '—'; $('#tr-smooth').textContent = '—';
    $('#tr-best').textContent = tr.best; $('#tr-prog').textContent = `0/${tr.count}`;
    const fb = $('#tr-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `🎯 敲 ${tr.count} 下，速度整体${tr.direction === 'rit' ? '渐慢（快→慢）' : '渐快（慢→快）'}`;
    $('#tr-status').textContent = '进行中…';
    drawCurve([], null);
  }

  // 模拟：从初始 IOI 平滑变速 or 忽快忽慢，造时间戳喂入
  function sim(good) {
    start();
    const dir = tr.direction;
    const ratio = tr.minRatio + 0.1;
    const startIoi = dir === 'accel' ? 600 : 600 * (1 - ratio);
    const endIoi = dir === 'accel' ? 600 * (1 - ratio) : 600;
    const m = tr.count - 1; // 间隔数
    let t = performance.now();
    tr.feed(t);
    for (let i = 0; i < m; i++) {
      const ideal = startIoi + (endIoi - startIoi) * i / (m - 1 || 1);
      const noise = good ? (Math.random() * 30 - 15) : (Math.random() * 240 - 120);
      t += Math.max(80, ideal + noise);
      tr.feed(t);
    }
  }

  $('#tr-dir').onchange = () => { tr = null; drawCurve([], null); };
  $('#tr-count').onchange = () => { tr = null; $('#tr-count-lbl').textContent = $('#tr-count').value; drawCurve([], null); };
  $('#tr-ratio').onchange = () => { tr = null; };
  $('#tr-start').onclick = start;
  $('#tr-tap').onclick = () => tap(performance.now());
  $('#tr-sim-good').onclick = () => sim(true);
  $('#tr-sim-bad').onclick = () => sim(false);
  // 空格键敲击（仅当本模块激活时）
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && root.classList.contains('active') && tr && !tr.done) {
      e.preventDefault();
      tap(performance.now());
    }
  });

  drawCurve([], null);
}

// ---------- 模块35：复节奏（polyrhythm） ----------
function renderPolyrhythm() {
  const root = $('#module-poly');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🥁 复节奏</h2>
    <p style="color:var(--muted);margin-bottom:14px">两个声部在同一周期里平分成不同份数（如 3:2 = 一手 3 下、一手 2 下）。先听一遍预览，然后跟着两条轨道敲：连琴时<b>中央 C 以下</b>算左手（声部 A）、<b>中央 C 及以上</b>算右手（声部 B）；没连琴可用按钮或键盘 <b>F</b>（左手）/<b>J</b>（右手）。引擎按声部分别判 完美 / 良好 / 漏 / 多。</p>

    <div class="card-panel">
      <div class="param-row"><label>比例</label>
        <select id="pl-ratio">${POLY_RATIOS.map(r => `<option value="${r.id}">${r.name}（${r.desc}）</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>周期时长</label>
        <input id="pl-cycle" type="range" min="1500" max="4000" step="250" value="2500" class="trans-slider" style="max-width:240px">
        <span id="pl-cycle-val" style="color:#667eea;font-weight:700;min-width:64px">2.5s</span>
      </div>
      <div class="param-row"><label>周期数</label>
        <select id="pl-cycles"><option value="2">2 个周期</option><option value="3">3 个周期</option><option value="4">4 个周期</option></select>
      </div>
    </div>

    <div class="card-panel">
      <div class="pl-voice-lbl"><span class="pl-tag pl-tag-a">A 左手</span><span id="pl-a-ratio" style="color:var(--muted)">3 下/周期</span></div>
      <div class="rt-track-wrap"><div id="pl-track-a" class="rt-track"></div></div>
      <div class="pl-voice-lbl" style="margin-top:12px"><span class="pl-tag pl-tag-b">B 右手</span><span id="pl-b-ratio" style="color:var(--muted)">2 下/周期</span></div>
      <div class="rt-track-wrap"><div id="pl-track-b" class="rt-track"></div><div id="pl-playhead" class="rt-playhead"></div></div>
      <div id="pl-feedback" class="sight-feedback" style="margin-top:14px">按"开始"：先听一遍预览，再跟着敲两条轨道</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="pl-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="pl-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">命中率</div></div>
      <div class="sight-stat"><div id="pl-ahits" class="sight-stat-num">0</div><div class="sight-stat-lbl">A 命中</div></div>
      <div class="sight-stat"><div id="pl-bhits" class="sight-stat-num">0</div><div class="sight-stat-lbl">B 命中</div></div>
      <div class="sight-stat"><div id="pl-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="pl-start" class="big-btn">▶ 开始练习</button>
      <button id="pl-tap-a" class="big-btn" style="background:#e8794a" disabled>👈 左手 A（F）</button>
      <button id="pl-tap-b" class="big-btn" style="background:#4a7de8" disabled>右手 B 👉（J）</button>
      <button id="pl-sim" class="big-btn" style="background:#667eea">🎲 模拟一遍</button>
      <span id="pl-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null, raf = 0, ac = null, playing = false;
  let aEls = [], bEls = [], previewClicks = [], clickIdx = 0;
  let barStart = 0, playEnd = 0, totalMs = 0, leadMs = 0;

  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function click(freq, vol = 0.25) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(c.destination);
      const t = c.currentTime;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.start(t); o.stop(t + 0.06);
    } catch { /* 无音频环境忽略 */ }
  }
  function ratioObj() { return POLY_RATIOS.find(r => r.id === $('#pl-ratio').value); }
  function cycleMs() { return +$('#pl-cycle').value; }
  function cycles() { return +$('#pl-cycles').value; }

  function drawTracks(r, nCycles) {
    $('#pl-a-ratio').textContent = r.a + ' 下/周期';
    $('#pl-b-ratio').textContent = r.b + ' 下/周期';
    const draw = (wrapId, taps) => {
      const wrap = $(wrapId); wrap.innerHTML = '';
      for (let c = 0; c <= nCycles; c++) {
        const ln = document.createElement('div');
        ln.className = 'rt-beatline strong';
        ln.style.left = (c / nCycles * 100) + '%';
        wrap.appendChild(ln);
      }
      const els = [];
      for (let c = 0; c < nCycles; c++) {
        for (let i = 0; i < taps; i++) {
          const pos = (c + i / taps) / nCycles;
          const el = document.createElement('div');
          el.className = 'rt-dot';
          el.style.left = (pos * 100) + '%';
          wrap.appendChild(el);
          els.push(el);
        }
      }
      return els;
    };
    aEls = draw('#pl-track-a', r.a);
    bEls = draw('#pl-track-b', r.b);
  }

  function updateStats() {
    if (!trainer) return;
    const s = trainer.summary();
    $('#pl-acc').textContent = trainer.totalHits ? Math.round(s.accuracy * 100) + '%' : '—';
    $('#pl-ahits').textContent = s.A.hits;
    $('#pl-bhits').textContent = s.B.hits;
  }

  function doTap(voice) {
    if (!playing || !trainer) return;
    const r = trainer.tap(voice, performance.now());
    const els = voice === 'B' ? bEls : aEls;
    if (r.index >= 0 && els[r.index]) els[r.index].classList.add(r.rating);
    const fb = $('#pl-feedback');
    if (r.rating === 'perfect') { fb.textContent = `✨ ${voice} 完美！`; fb.className = 'sight-feedback ok'; }
    else if (r.rating === 'good') { fb.textContent = `👍 ${voice} 良好（${r.errMs > 0 ? '偏晚' : '偏早'} ${Math.abs(Math.round(r.errMs))}ms）`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `✋ ${voice} 多敲/太偏`; fb.className = 'sight-feedback no'; }
    updateStats();
  }

  function startOne() {
    const r = ratioObj(), cm = cycleMs(), nC = cycles();
    drawTracks(r, nC);
    trainer = new PolyrhythmTrainer({ ratio: r, cycleMs: cm, cycles: nC });
    totalMs = cm * nC; leadMs = cm;
    const t0 = performance.now();
    barStart = t0 + leadMs;            // 预览一个周期后正式开始
    trainer.start(barStart);
    playEnd = barStart + totalMs + trainer.tol.good;
    // 预览：在第一个周期里把两声部都按真实音高点出来（A 低 B 高），让玩家先听一遍
    previewClicks = [];
    for (let i = 0; i < r.a; i++) previewClicks.push({ t: t0 + (i * cm) / r.a, freq: 760 });
    for (let i = 0; i < r.b; i++) previewClicks.push({ t: t0 + (i * cm) / r.b, freq: 1320 });
    // 正式段每个周期起点给一个强拍引导
    for (let c = 0; c < nC; c++) previewClicks.push({ t: barStart + c * cm, freq: 1600, strong: true });
    previewClicks.sort((x, y) => x.t - y.t);
    clickIdx = 0;
    playing = true;
    $('#pl-tap-a').disabled = false; $('#pl-tap-b').disabled = false;
    loop();
  }

  function loop() {
    const now = performance.now();
    while (clickIdx < previewClicks.length && now >= previewClicks[clickIdx].t) {
      click(previewClicks[clickIdx].freq, previewClicks[clickIdx].strong ? 0.3 : 0.22);
      clickIdx++;
    }
    const ph = $('#pl-playhead');
    if (now < barStart) {
      ph.style.left = '0%'; ph.style.opacity = '0.35';
      $('#pl-status').textContent = '预览…' + Math.max(1, Math.ceil((barStart - now) / 500));
    } else {
      const f = Math.min(1, (now - barStart) / totalMs);
      ph.style.left = (f * 100) + '%'; ph.style.opacity = '1';
      $('#pl-status').textContent = '跟着敲两条轨道！';
    }
    if (now >= playEnd) { endOne(); return; }
    raf = requestAnimationFrame(loop);
  }

  function endOne() {
    playing = false;
    cancelAnimationFrame(raf);
    const s = trainer.finish();
    $('#pl-score').textContent = s.score;
    $('#pl-best').textContent = trainer.best;
    updateStats();
    recordPractice('poly', '复节奏', s.totalOnsets, s.totalHits, s.score);
    const fb = $('#pl-feedback');
    fb.className = 'sight-feedback ok';
    fb.textContent = `本遍 ${s.ratio}：综合 ${s.score} 分 · 命中率 ${Math.round(s.accuracy * 100)}% · A ${s.A.hits}/${s.A.total} · B ${s.B.hits}/${s.B.total} · 平均误差 ${Math.round(s.avgError)}ms`;
    stopAll();
  }

  function stopAll() {
    playing = false;
    cancelAnimationFrame(raf);
    polyOnNote = null;
    $('#pl-start').textContent = '▶ 开始练习';
    $('#pl-start').classList.remove('running');
    $('#pl-tap-a').disabled = true; $('#pl-tap-b').disabled = true;
    $('#pl-status').textContent = '已停止';
    $('#pl-playhead').style.opacity = '0';
  }

  function simulate() {
    if (playing) return;
    const r = ratioObj(), cm = cycleMs(), nC = cycles();
    drawTracks(r, nC);
    trainer = new PolyrhythmTrainer({ ratio: r, cycleMs: cm, cycles: nC });
    trainer.start(0);
    // 模拟玩家：在每个理想落点附近加 ±35ms 抖动敲击
    const jitter = () => (Math.random() - 0.5) * 70;
    trainer.A.onsets.forEach((t, i) => { const res = trainer.tap('A', t + jitter()); if (res.index >= 0 && aEls[res.index]) aEls[res.index].classList.add(res.rating); });
    trainer.B.onsets.forEach((t, i) => { const res = trainer.tap('B', t + jitter()); if (res.index >= 0 && bEls[res.index]) bEls[res.index].classList.add(res.rating); });
    const s = trainer.finish();
    $('#pl-score').textContent = s.score;
    $('#pl-best').textContent = trainer.best;
    updateStats();
    recordPractice('poly', '复节奏', s.totalOnsets, s.totalHits, s.score);
    const fb = $('#pl-feedback');
    fb.className = 'sight-feedback ok';
    fb.textContent = `🎲 模拟 ${s.ratio}：综合 ${s.score} 分 · 命中率 ${Math.round(s.accuracy * 100)}% · A ${s.A.hits}/${s.A.total} · B ${s.B.hits}/${s.B.total}`;
  }

  $('#pl-cycle').oninput = () => { $('#pl-cycle-val').textContent = (cycleMs() / 1000).toFixed(2) + 's'; };
  $('#pl-ratio').onchange = () => { if (!playing) drawTracks(ratioObj(), cycles()); };
  $('#pl-cycles').onchange = () => { if (!playing) drawTracks(ratioObj(), cycles()); };
  $('#pl-tap-a').onclick = () => doTap('A');
  $('#pl-tap-b').onclick = () => doTap('B');
  $('#pl-sim').onclick = simulate;
  $('#pl-start').onclick = () => {
    if (playing) { stopAll(); return; }
    polyOnNote = (note) => doTap(note < 60 ? 'A' : 'B');
    $('#pl-start').textContent = '⏸ 停止练习';
    $('#pl-start').classList.add('running');
    $('#pl-score').textContent = '—'; $('#pl-acc').textContent = '—';
    $('#pl-ahits').textContent = '0'; $('#pl-bhits').textContent = '0';
    startOne();
  };

  document.addEventListener('keydown', (e) => {
    if (!$('#module-poly').classList.contains('active') || !playing || e.repeat) return;
    if (e.code === 'KeyF') { e.preventDefault(); doTap('A'); }
    else if (e.code === 'KeyJ') { e.preventDefault(); doTap('B'); }
  });

  drawTracks(ratioObj(), cycles());
}

// ---------- 模块36：颗粒性 / 均匀度 ----------
function renderEvenness() {
  const root = $('#module-even');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">💧 颗粒性</h2>
    <p style="color:var(--muted);margin-bottom:14px">钢琴基本功"颗粒性"：连弹一串跑动音（音阶/琶音），让<b>每个音的力度</b>和<b>每两音的间隔</b>都尽量均匀——没有忽强忽弱、忽快忽慢。引擎用变异系数（离散度）打分：力度越齐、节奏越匀，分越高。<b>连琴</b>能同时练力度+时值；没连琴用按钮 / 空格只能练时值均匀（力度固定）。</p>

    <div class="card-panel">
      <div class="param-row"><label>音数</label>
        <select id="ev-count"><option value="8">8 个音</option><option value="12">12 个音</option><option value="16">16 个音</option></select>
      </div>
      <div class="param-row"><label>力度权重</label>
        <input id="ev-vw" type="range" min="0" max="100" step="10" value="50" class="trans-slider" style="max-width:220px">
        <span id="ev-vw-val" style="color:#667eea;font-weight:700;min-width:120px">力度 50% · 时值 50%</span>
      </div>
    </div>

    <div class="card-panel">
      <div class="ev-row-lbl"><span class="pl-tag pl-tag-a">力度 velocity</span><span id="ev-vel-cv" style="color:var(--muted)">越齐越好</span></div>
      <div id="ev-vel-bars" class="ev-bars"></div>
      <div class="ev-row-lbl" style="margin-top:14px"><span class="pl-tag pl-tag-b">间隔 timing</span><span id="ev-ioi-cv" style="color:var(--muted)">越匀越好</span></div>
      <div id="ev-ioi-bars" class="ev-bars"></div>
      <div id="ev-feedback" class="sight-feedback" style="margin-top:14px">按"开始"，然后均匀地连敲一串音</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="ev-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="ev-vscore" class="sight-stat-num">—</div><div class="sight-stat-lbl">力度均匀</div></div>
      <div class="sight-stat"><div id="ev-tscore" class="sight-stat-num">—</div><div class="sight-stat-lbl">时值均匀</div></div>
      <div class="sight-stat"><div id="ev-bpm" class="sight-stat-num">—</div><div class="sight-stat-lbl">速度 BPM</div></div>
      <div class="sight-stat"><div id="ev-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="ev-start" class="big-btn">▶ 开始</button>
      <button id="ev-tap" class="big-btn" style="background:#4a7de8" disabled>👆 敲一下（空格）</button>
      <button id="ev-sim" class="big-btn" style="background:#667eea">🎲 模拟一遍</button>
      <span id="ev-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null, playing = false;
  const count = () => +$('#ev-count').value;
  const velWeight = () => +$('#ev-vw').value / 100;

  function clearBars() { $('#ev-vel-bars').innerHTML = ''; $('#ev-ioi-bars').innerHTML = ''; }

  function addVelBar(ev) {
    const bar = document.createElement('div');
    bar.className = 'ev-bar';
    const h = 18 + Math.min(1, (ev.velocity || 0) / 127) * 82;
    bar.style.height = h + '%';
    $('#ev-vel-bars').appendChild(bar);
  }

  function paintResult(r) {
    // 力度柱按相对均值偏差着色
    const vbars = [...$('#ev-vel-bars').children];
    r.velDev.forEach((d, i) => {
      if (!vbars[i]) return;
      const a = Math.abs(d);
      vbars[i].classList.toggle('ev-good', a <= trainer.velTol * 0.5);
      vbars[i].classList.toggle('ev-off', a > trainer.velTol);
    });
    // 间隔柱（从第二个音起，共 n-1 根）
    const wrap = $('#ev-ioi-bars'); wrap.innerHTML = '';
    const maxIoi = Math.max(...r.iois, 1);
    r.iois.forEach((x, i) => {
      const bar = document.createElement('div');
      bar.className = 'ev-bar';
      bar.style.height = (18 + Math.min(1, x / maxIoi) * 82) + '%';
      const a = Math.abs(r.ioiDev[i] || 0);
      if (a <= trainer.ioiTol * 0.5) bar.classList.add('ev-good');
      else if (a > trainer.ioiTol) bar.classList.add('ev-off');
      wrap.appendChild(bar);
    });
    $('#ev-vel-cv').textContent = '离散 ' + Math.round(r.velCV * 100) + '%';
    $('#ev-ioi-cv').textContent = '离散 ' + Math.round(r.ioiCV * 100) + '%';
  }

  function finishRound(r) {
    playing = false;
    evenOnNote = null;
    $('#ev-score').textContent = r.score;
    $('#ev-vscore').textContent = Math.round(r.velScore * 100);
    $('#ev-tscore').textContent = Math.round(r.timingScore * 100);
    $('#ev-bpm').textContent = r.bpm ? Math.round(r.bpm) : '—';
    $('#ev-best').textContent = trainer.best;
    paintResult(r);
    recordPractice('even', '颗粒性', r.n, Math.round(r.n * r.score / 100), r.score);
    const fb = $('#ev-feedback');
    fb.className = 'sight-feedback ok';
    const worst = r.velScore < r.timingScore ? '力度' : '时值';
    fb.textContent = `综合 ${r.score} 分 · 力度均匀 ${Math.round(r.velScore * 100)} · 时值均匀 ${Math.round(r.timingScore * 100)} · ${Math.round(r.bpm)} BPM —— 多注意「${worst}」的一致性`;
    $('#ev-tap').disabled = true;
    $('#ev-start').textContent = '▶ 开始';
    $('#ev-start').classList.remove('running');
    $('#ev-status').textContent = '完成';
  }

  function startOne() {
    clearBars();
    $('#ev-ioi-bars').innerHTML = '';
    trainer = new EvennessTrainer({ count: count(), velWeight: velWeight() });
    trainer.onTap = (ev, n, c) => { addVelBar(ev); $('#ev-status').textContent = `已敲 ${n}/${c}`; };
    trainer.onComplete = (r) => finishRound(r);
    playing = true;
    evenOnNote = (note, vel, time) => { if (playing) trainer.feed(note, vel, time); };
    $('#ev-tap').disabled = false;
    $('#ev-start').textContent = '⏸ 停止';
    $('#ev-start').classList.add('running');
    $('#ev-score').textContent = '—'; $('#ev-vscore').textContent = '—';
    $('#ev-tscore').textContent = '—'; $('#ev-bpm').textContent = '—';
    $('#ev-status').textContent = `已敲 0/${count()}`;
    const fb = $('#ev-feedback'); fb.className = 'sight-feedback';
    fb.textContent = '均匀地连敲一串音——连琴练力度+时值，按钮/空格只练时值';
  }

  function stopAll() {
    playing = false; evenOnNote = null;
    $('#ev-tap').disabled = true;
    $('#ev-start').textContent = '▶ 开始';
    $('#ev-start').classList.remove('running');
    $('#ev-status').textContent = '已停止';
  }

  function manualTap() { if (playing && trainer) trainer.feed(60, 80, performance.now()); }

  function simulate() {
    if (playing) return;
    clearBars();
    trainer = new EvennessTrainer({ count: count(), velWeight: velWeight() });
    trainer.onTap = (ev) => addVelBar(ev);
    trainer.onComplete = (r) => finishRound(r);
    const n = count();
    let t = 0;
    for (let i = 0; i < n; i++) {
      const vel = 82 + (Math.random() - 0.5) * 26;       // 力度 ±13 抖动
      trainer.feed(60 + i, Math.round(vel), t);
      t += 165 + (Math.random() - 0.5) * 40;             // 间隔 165ms ±20 抖动
    }
  }

  $('#ev-vw').oninput = () => {
    const v = +$('#ev-vw').value;
    $('#ev-vw-val').textContent = `力度 ${v}% · 时值 ${100 - v}%`;
  };
  $('#ev-tap').onclick = manualTap;
  $('#ev-sim').onclick = simulate;
  $('#ev-start').onclick = () => { if (playing) { stopAll(); } else { startOne(); } };

  document.addEventListener('keydown', (e) => {
    if (!$('#module-even').classList.contains('active') || !playing || e.repeat) return;
    if (e.code === 'Space') { e.preventDefault(); manualTap(); }
  });
}

// ---------- 模块37：手指独立性 ----------
function renderFingerInd() {
  const root = $('#module-finger');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🖐️ 手指独立性</h2>
    <p style="color:var(--muted);margin-bottom:14px">钢琴基本功"手指独立"：用部分手指<b>按住几个键不放</b>，同时用其他手指反复敲一段移动音型。关键——敲移动音时被按住的键<b>不能跟着抬起来</b>。引擎边记 note-on/off，每敲一个移动音就检查"该按住的音是否都还按着"，统计独立保持率 + 音型正确率。<b>需要连琴</b>才能练（要检测按住与松开）；没连琴可用"模拟一遍"看评分逻辑。</p>

    <div class="card-panel">
      <div class="param-row"><label>练习</label>
        <select id="fi-preset">${FINGER_PRESETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>重复遍数</label>
        <select id="fi-reps"><option value="2">2 遍</option><option value="3">3 遍</option><option value="4">4 遍</option></select>
      </div>
    </div>

    <div class="card-panel">
      <div class="ev-row-lbl"><span class="pl-tag pl-tag-a">按住 hold</span><span id="fi-held" style="color:var(--muted)">—</span></div>
      <div id="fi-held-keys" class="fi-keys"></div>
      <div class="ev-row-lbl" style="margin-top:14px"><span class="pl-tag pl-tag-b">移动 move</span><span id="fi-move" style="color:var(--muted)">—</span></div>
      <div id="fi-move-keys" class="fi-keys"></div>
      <div id="fi-feedback" class="sight-feedback" style="margin-top:14px">按"开始"，先按住 hold 的键，再用其他手指敲 move 音型</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 在 88 键上看清<b>哪些键要按住不放</b>（琥珀"按"，按住时变亮、若滑脱抬起会闪红）与<b>哪些键来回敲</b>（蓝"移"，敲到时闪一下）——空间位置一目了然</div>
      <div id="fi-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="fi-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="fi-sustain" class="sight-stat-num">—</div><div class="sight-stat-lbl">独立保持</div></div>
      <div class="sight-stat"><div id="fi-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">音型正确</div></div>
      <div class="sight-stat"><div id="fi-slips" class="sight-stat-num">0</div><div class="sight-stat-lbl">滑脱次数</div></div>
      <div class="sight-stat"><div id="fi-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="fi-start" class="big-btn">▶ 开始</button>
      <button id="fi-sim" class="big-btn" style="background:#667eea">🎲 模拟一遍</button>
      <span id="fi-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null, playing = false;
  const preset = () => FINGER_PRESETS[+$('#fi-preset').value];
  const reps = () => +$('#fi-reps').value;
  const fiKb = new PianoKeyboard($('#fi-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });

  function paintKb() {
    const p = preset();
    const items = [];
    const seen = new Set();
    p.pattern.forEach((n) => { if (!seen.has(n)) { seen.add(n); items.push({ midi: n, color: 'hsl(215,70%,55%)', text: '移' }); } });
    p.held.forEach((n) => items.push({ midi: n, color: 'hsl(35,92%,55%)', text: '按' }));
    fiKb.highlightMany(items, { scroll: false });
    const all = [...p.held, ...p.pattern];
    if (all.length) fiKb.scrollToShow(Math.max(21, Math.min(...all) - 2), Math.min(108, Math.max(...all) + 2));
  }

  function renderKeys() {
    const p = preset();
    $('#fi-held').textContent = p.held.map(n => CA99.noteName(n)).join(' + ') || '（无）';
    $('#fi-move').textContent = p.pattern.map(n => CA99.noteName(n)).join(' → ');
    const drawHeld = $('#fi-held-keys'); drawHeld.innerHTML = '';
    p.held.forEach(n => {
      const k = document.createElement('div'); k.className = 'fi-key fi-key-hold';
      k.dataset.note = n; k.textContent = CA99.noteName(n); drawHeld.appendChild(k);
    });
    const drawMove = $('#fi-move-keys'); drawMove.innerHTML = '';
    p.pattern.forEach((n, i) => {
      const k = document.createElement('div'); k.className = 'fi-key fi-key-move';
      k.dataset.idx = i; k.textContent = CA99.noteName(n); drawMove.appendChild(k);
    });
    paintKb();
  }

  function lightHeld(note, on) {
    document.querySelectorAll(`#fi-held-keys .fi-key[data-note="${note}"]`).forEach(k => k.classList.toggle('active', on));
    if (on) fiKb.press(note); else fiKb.release(note);
  }

  function finishRound(r) {
    playing = false;
    fingerOnNote = null; fingerOffNote = null;
    $('#fi-score').textContent = r.score;
    $('#fi-sustain').textContent = Math.round(r.sustainRate * 100) + '%';
    $('#fi-acc').textContent = Math.round(r.patternAccuracy * 100) + '%';
    $('#fi-slips').textContent = r.slips;
    $('#fi-best').textContent = trainer.best;
    recordPractice('finger', '手指独立性', r.taps, Math.round(r.taps * r.score / 100), r.score);
    const fb = $('#fi-feedback');
    fb.className = 'sight-feedback ok';
    const tip = r.sustainRate < r.patternAccuracy ? '注意别让按住的手指跟着抬起' : '注意移动音型的准确度';
    fb.textContent = `综合 ${r.score} 分 · 独立保持 ${Math.round(r.sustainRate * 100)}% · 音型正确 ${Math.round(r.patternAccuracy * 100)}% · 滑脱 ${r.slips} 次 —— ${tip}`;
    $('#fi-start').textContent = '▶ 开始';
    $('#fi-start').classList.remove('running');
    $('#fi-status').textContent = '完成';
    document.querySelectorAll('#fi-held-keys .fi-key').forEach(k => k.classList.remove('active'));
    document.querySelectorAll('#fi-move-keys .fi-key').forEach(k => k.classList.remove('done'));
    preset().held.forEach(n => fiKb.release(n));
  }

  function startOne() {
    const p = preset();
    renderKeys();
    trainer = new FingerIndependenceTrainer({ held: p.held, pattern: p.pattern, reps: reps() });
    let moveIdx = 0;
    trainer.onEvent = (ev) => {
      if (ev.type === 'on') {
        if (p.held.includes(ev.note)) { lightHeld(ev.note, true); }
        else {
          const keys = document.querySelectorAll('#fi-move-keys .fi-key');
          const k = keys[moveIdx % keys.length]; if (k) { k.classList.add('done'); setTimeout(() => k.classList.remove('done'), 200); }
          fiKb.flash(ev.note, 'hsl(215,80%,60%)');
          moveIdx++;
        }
      } else {
        if (p.held.includes(ev.note)) {
          lightHeld(ev.note, false);
          // 练习中途松开了该按住的键 = 滑脱，闪红提醒
          if (playing && !trainer.done) fiKb.flash(ev.note, 'hsl(0,85%,58%)');
        }
      }
      $('#fi-status').textContent = `移动 ${trainer.progress}/${trainer.targetTaps}`;
    };
    trainer.onComplete = (r) => finishRound(r);
    playing = true;
    fingerOnNote = (note, time) => { if (playing) trainer.noteOn(note, time); };
    fingerOffNote = (note, time) => { if (playing) trainer.noteOff(note, time); };
    $('#fi-start').textContent = '⏸ 停止';
    $('#fi-start').classList.add('running');
    $('#fi-score').textContent = '—'; $('#fi-sustain').textContent = '—';
    $('#fi-acc').textContent = '—'; $('#fi-slips').textContent = '0';
    $('#fi-status').textContent = `移动 0/${trainer.targetTaps}`;
    const fb = $('#fi-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `先按住 ${p.held.map(n => CA99.noteName(n)).join('+') || '（无）'}，再敲 ${p.pattern.map(n => CA99.noteName(n)).join('→')}（×${reps()}）`;
  }

  function stopAll() {
    playing = false; fingerOnNote = null; fingerOffNote = null;
    $('#fi-start').textContent = '▶ 开始';
    $('#fi-start').classList.remove('running');
    $('#fi-status').textContent = '已停止';
    document.querySelectorAll('#fi-held-keys .fi-key').forEach(k => k.classList.remove('active'));
    preset().held.forEach(n => fiKb.release(n));
  }

  function simulate() {
    if (playing) return;
    const p = preset();
    renderKeys();
    trainer = new FingerIndependenceTrainer({ held: p.held, pattern: p.pattern, reps: reps() });
    trainer.onComplete = (r) => finishRound(r);
    let t = 0;
    // 按住 held
    p.held.forEach(n => { trainer.noteOn(n, t); t += 8; });
    // 移动音型，90% 概率弹对，5% 概率中途松开一个 held（滑脱）
    const full = []; for (let r = 0; r < reps(); r++) full.push(...p.pattern);
    full.forEach((n, i) => {
      t += 150;
      const note = Math.random() < 0.9 ? n : n + 1; // 偶尔弹错相邻键
      trainer.noteOn(note, t);
      // 偶尔松开一个 held 再按回（模拟滑脱）
      if (p.held.length && Math.random() < 0.12 && i < full.length - 1) {
        const h = p.held[0];
        trainer.noteOff(h, t + 30);
        trainer.noteOn(h, t + 60);
      }
      trainer.noteOff(note, t + 80);
    });
    // 收尾松开 held（不算滑脱）
    p.held.forEach(n => { t += 20; trainer.noteOff(n, t); });
  }

  $('#fi-preset').onchange = renderKeys;
  $('#fi-sim').onclick = simulate;
  $('#fi-start').onclick = () => { if (playing) { stopAll(); } else { startOne(); } };

  renderKeys();
}

// ---------- 模块38：音阶八度跨度 ----------
function renderScaleSpan() {
  const root = $('#module-span');
  const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 音阶八度跨度</h2>
    <p style="color:var(--muted);margin-bottom:14px">把音阶连续跑过 2~3 个八度（上行或上下行）。和单八度练习不同，这里重点考核<b>跨八度穿指衔接是否平顺</b>、整串<b>速度是否均匀</b>，而不只是"音对不对"。综合分 = 音符正确 50% + 速度均匀 30% + 穿指衔接 20%。<b>需连琴</b>按高亮提示依次弹；没连琴可"模拟一遍"看评分逻辑。</p>

    <div class="card-panel">
      <div class="param-row"><label>根音（调）</label>
        <select id="sp-root">${roots.map(r => `<option value="${r}" ${r === 'C' ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="param-row"><label>音阶类型</label>
        <select id="sp-type">${Object.entries(SPAN_SCALE_TYPES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></div>
      <div class="param-row"><label>跨几个八度</label>
        <select id="sp-oct">${SPAN_OCTAVES.map(o => `<option value="${o}" ${o === 2 ? 'selected' : ''}>${o} 个八度</option>`).join('')}</select></div>
      <div class="param-row"><label>方向</label>
        <select id="sp-dir">${Object.values(SPAN_DIRECTIONS).map(d => `<option value="${d.key}">${d.name}</option>`).join('')}</select></div>
    </div>

    <div class="card-panel">
      <div class="sp-keys" id="sp-keys"></div>
      <div id="sp-feedback" class="sight-feedback" style="margin-top:14px">按"开始"，跟着高亮依次把音阶跑过多个八度（穿指点会标橙边）</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="sp-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="sp-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">音符正确</div></div>
      <div class="sight-stat"><div id="sp-even" class="sight-stat-num">—</div><div class="sight-stat-lbl">速度均匀</div></div>
      <div class="sight-stat"><div id="sp-cross" class="sight-stat-num">—</div><div class="sight-stat-lbl">穿指衔接</div></div>
      <div class="sight-stat"><div id="sp-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="sp-start" class="big-btn">▶ 开始</button>
      <button id="sp-sim" class="big-btn" style="background:#667eea">🎲 模拟一遍</button>
      <span id="sp-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null, playing = false;
  const cfg = () => ({
    root: $('#sp-root').value, type: $('#sp-type').value,
    octave: 4, octaves: +$('#sp-oct').value, direction: $('#sp-dir').value,
  });

  function drawKeys() {
    const t = new ScaleSpanTrainer(cfg());
    const crossSet = new Set(t.crossings);
    const wrap = $('#sp-keys'); wrap.innerHTML = '';
    t.expected.forEach((n, i) => {
      const k = document.createElement('div');
      k.className = 'sp-key' + (crossSet.has(i) ? ' sp-cross' : '');
      k.dataset.idx = i;
      k.textContent = CA99.noteName(n);
      wrap.appendChild(k);
    });
    return t;
  }

  function lightUpTo(idx, correct) {
    const keys = document.querySelectorAll('#sp-keys .sp-key');
    keys.forEach((k, i) => {
      k.classList.toggle('next', i === idx);
      if (i === idx - 1) k.classList.add(correct ? 'hit' : 'miss');
    });
  }

  function finishRound(r) {
    playing = false; spanOnNote = null;
    $('#sp-score').textContent = r.score;
    $('#sp-acc').textContent = Math.round(r.noteAccuracy * 100) + '%';
    $('#sp-even').textContent = Math.round(r.evenScore * 100);
    $('#sp-cross').textContent = Math.round(r.crossingScore * 100);
    $('#sp-best').textContent = trainer.best;
    recordPractice('span', '音阶八度跨度', r.total, r.correctNotes, r.score);
    const fb = $('#sp-feedback');
    fb.className = 'sight-feedback ok';
    const lo = Math.min(r.noteAccuracy, r.evenScore, r.crossingScore);
    const tip = lo === r.noteAccuracy ? '先把音弹准' : (lo === r.evenScore ? '保持每个音间隔均匀' : '穿指处别卡顿');
    fb.textContent = `综合 ${r.score} 分 · 正确 ${Math.round(r.noteAccuracy * 100)}% · 均匀 ${Math.round(r.evenScore * 100)} · 穿指 ${Math.round(r.crossingScore * 100)}（卡顿 ${r.hitches}/${r.crossingCount}） · ${Math.round(r.bpm)} BPM —— ${tip}`;
    $('#sp-start').textContent = '▶ 开始';
    $('#sp-start').classList.remove('running');
    $('#sp-status').textContent = '完成';
  }

  function startOne() {
    trainer = new ScaleSpanTrainer(cfg());
    drawKeys();
    trainer.onNote = (note, idx, total, correct) => {
      lightUpTo(idx, correct);
      $('#sp-status').textContent = `${idx}/${total}`;
    };
    trainer.onComplete = (r) => finishRound(r);
    playing = true;
    spanOnNote = (note, time) => { if (playing) trainer.feed(note, time); };
    lightUpTo(0, true);
    $('#sp-start').textContent = '⏸ 停止';
    $('#sp-start').classList.add('running');
    $('#sp-score').textContent = '—'; $('#sp-acc').textContent = '—';
    $('#sp-even').textContent = '—'; $('#sp-cross').textContent = '—';
    $('#sp-status').textContent = `0/${trainer.total}`;
    const fb = $('#sp-feedback'); fb.className = 'sight-feedback';
    fb.textContent = '跟着高亮依次弹，跨八度（橙边）处尽量平顺不卡顿';
  }

  function stopAll() {
    playing = false; spanOnNote = null;
    $('#sp-start').textContent = '▶ 开始';
    $('#sp-start').classList.remove('running');
    $('#sp-status').textContent = '已停止';
    document.querySelectorAll('#sp-keys .sp-key').forEach(k => k.classList.remove('next'));
  }

  function simulate() {
    if (playing) return;
    trainer = new ScaleSpanTrainer(cfg());
    drawKeys();
    trainer.onComplete = (r) => finishRound(r);
    const crossSet = new Set(trainer.crossings);
    let t = 0;
    trainer.expected.forEach((n, i) => {
      // 均匀 150ms，穿指点偶尔卡顿、偶尔弹错相邻音
      t += i === 0 ? 0 : (150 + (Math.random() - 0.5) * 40 + (crossSet.has(i) && Math.random() < 0.4 ? 160 : 0));
      const note = Math.random() < 0.92 ? n : n + 1;
      trainer.feed(note, t);
    });
  }

  ['#sp-root', '#sp-type', '#sp-oct', '#sp-dir'].forEach(id => { $(id).onchange = () => { if (!playing) drawKeys(); }; });
  $('#sp-sim').onclick = simulate;
  $('#sp-start').onclick = () => { if (playing) { stopAll(); } else { startOne(); } };

  drawKeys();
}

function renderRhythmDictation() {
  const root = $('#module-dict');
  const TEMPOS = [{ name: '慢', bpm: 70 }, { name: '中', bpm: 95 }, { name: '快', bpm: 120 }];
  root.innerHTML = `
    <h2 style="margin-bottom:6px">👂 节奏听写</h2>
    <p style="color:var(--muted);margin-bottom:14px">练<b>耳朵</b>：先<b>听</b>一段节奏（屏幕<b>不显示</b>长短），再在<b>任意一个键</b>上把它<b>敲回来</b>。评分<b>与速度无关</b>——只看你敲出的<b>长短比例</b>对不对（如 短短长 vs 长短短），所以你敲快敲慢都行。综合分 = 节奏比例准确度 × 敲击个数匹配度。和"节奏跟拍"（看着谱跟节拍器）不同，这里全凭听。</p>

    <div class="card-panel">
      <div class="param-row"><label>难度</label>
        <select id="rd-level">${DICTATION_LEVELS.map((l, i) => `<option value="${i}" ${i === 0 ? 'selected' : ''}>${l.name} · ${l.desc}</option>`).join('')}</select></div>
      <div class="param-row"><label>播放速度</label>
        <select id="rd-tempo">${TEMPOS.map((t, i) => `<option value="${t.bpm}" ${i === 1 ? 'selected' : ''}>${t.name}（${t.bpm} BPM）</option>`).join('')}</select></div>
    </div>

    <div class="card-panel" style="text-align:center">
      <div class="rd-pulse" id="rd-pulse">●</div>
      <div id="rd-taps" class="rd-taps"></div>
      <div id="rd-bars" class="rd-bars" style="margin-top:12px"></div>
      <div id="rd-feedback" class="sight-feedback" style="margin-top:14px">点"👂 听一遍"，听完后在任意键上把节奏敲回来</div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="rd-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="rd-rhythm" class="sight-stat-num">—</div><div class="sight-stat-lbl">节奏准确</div></div>
      <div class="sight-stat"><div id="rd-count" class="sight-stat-num">—</div><div class="sight-stat-lbl">个数</div></div>
      <div class="sight-stat"><div id="rd-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="rd-listen" class="big-btn">👂 听一遍</button>
      <button id="rd-replay" class="big-btn" style="background:#475569" disabled>🔁 再听</button>
      <button id="rd-done" class="big-btn" style="background:#475569" disabled>✓ 结束打分</button>
      <button id="rd-new" class="big-btn" style="background:#667eea">🎲 换一条</button>
      <button id="rd-sim" class="big-btn" style="background:#667eea">🎲 模拟一遍</button>
      <span id="rd-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null;
  let phase = 'idle';   // idle | playing | tapping | done
  let timers = [];

  function newTrainer() {
    const li = +$('#rd-level').value;
    trainer = new RhythmDictationTrainer({ level: DICTATION_LEVELS[li], bpm: +$('#rd-tempo').value });
  }

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function resetTapDots() {
    const wrap = $('#rd-taps'); wrap.innerHTML = '';
    for (let i = 0; i < trainer.expectedTaps; i++) {
      const d = document.createElement('span');
      d.className = 'rd-dot'; wrap.appendChild(d);
    }
  }

  function fillTap(i) {
    const dots = document.querySelectorAll('#rd-taps .rd-dot');
    if (dots[i]) dots[i].classList.add('on');
  }

  function pulse() {
    const p = $('#rd-pulse');
    p.classList.add('beat');
    setTimeout(() => p.classList.remove('beat'), 110);
  }

  function playPattern(then) {
    clearTimers();
    phase = 'playing';
    $('#rd-status').textContent = '播放中…';
    $('#rd-bars').innerHTML = '';
    resetTapDots();
    const onsets = trainer.onsets(0);
    onsets.forEach((t, i) => {
      timers.push(setTimeout(() => { clickSound(i === 0); pulse(); }, t));
    });
    const endAt = onsets[onsets.length - 1] + 350;
    timers.push(setTimeout(() => { if (then) then(); }, endAt));
  }

  function startTapping() {
    phase = 'tapping';
    dictOnNote = (note, time) => { if (phase === 'tapping') onTap(time); };
    $('#rd-status').textContent = `轮到你：敲回来（0/${trainer.expectedTaps}）`;
    $('#rd-replay').disabled = false;
    $('#rd-done').disabled = false;
    const fb = $('#rd-feedback'); fb.className = 'sight-feedback';
    fb.textContent = '在任意键上把刚听到的节奏敲出来——长短比例对就行，速度随你';
  }

  function onTap(time) {
    const res = trainer.feed(0, time);
    pulse();
    const done = res && res.done;
    const n = trainer.taps.length;
    fillTap(n - 1);
    $('#rd-status').textContent = `轮到你：敲回来（${n}/${trainer.expectedTaps}）`;
    if (done) finishRound(res);
  }

  function bar(iois, scoreArr, scale = 1, label = '') {
    const max = Math.max(...iois.map((v) => v * scale), 1);
    const cells = iois.map((v, i) => {
      const w = Math.max(8, Math.round((v * scale) / max * 120));
      const cls = scoreArr ? (scoreArr[i] >= 0.5 ? 'rd-good' : 'rd-off') : 'rd-tgt';
      return `<span class="rd-seg ${cls}" style="width:${w}px"></span>`;
    }).join('');
    return `<div class="rd-barrow"><span class="rd-barlbl">${label}</span>${cells}</div>`;
  }

  function finishRound(r) {
    phase = 'done';
    dictOnNote = null;
    clearTimers();
    $('#rd-replay').disabled = true;
    $('#rd-done').disabled = true;
    $('#rd-score').textContent = r.score;
    $('#rd-rhythm').textContent = Math.round(r.rhythmAccuracy * 100) + '%';
    $('#rd-count').textContent = `${r.taps}/${r.expected}`;
    $('#rd-best').textContent = trainer.best;
    recordPractice('dict', '节奏听写', r.total, r.correct, r.score);
    // 对比条：上=目标，下=你的（缩放对齐）
    const scoreArr = r.perInterval.map((p) => p.score);
    const userScaled = r.perInterval.map((p) => p.scaledUser);
    let bars = bar(trainer.targetIois, null, 1, '目标');
    if (userScaled.length) bars += bar(userScaled, scoreArr, 1, '你的');
    $('#rd-bars').innerHTML = bars;
    const fb = $('#rd-feedback');
    fb.className = 'sight-feedback ok';
    let tip;
    if (r.extra > 0) tip = `多敲了 ${r.extra} 下`;
    else if (r.extra < 0) tip = `少敲了 ${-r.extra} 下`;
    else if (r.rhythmAccuracy >= 0.85) tip = '长短关系抓得很准！';
    else tip = '注意长音和短音的比例';
    fb.textContent = `综合 ${r.score} 分 · 节奏准确 ${Math.round(r.rhythmAccuracy * 100)}% · 对 ${r.correct}/${r.total} 个间隔 —— ${tip}`;
    $('#rd-status').textContent = '完成（换一条再来）';
  }

  function listen() {
    if (phase === 'playing') return;
    newTrainer();
    $('#rd-score').textContent = '—'; $('#rd-rhythm').textContent = '—'; $('#rd-count').textContent = '—';
    playPattern(startTapping);
  }

  function replay() {
    if (phase !== 'tapping') return;
    // 重听不清空已敲（其实清空重来更直观）：重置本条采集
    const li = +$('#rd-level').value;
    const saved = { durations: trainer.durations, targetIois: trainer.targetIois };
    trainer.taps = []; trainer.finished = false; trainer.lastResult = null;
    playPattern(startTapping);
  }

  function simulate() {
    if (phase === 'playing') return;
    newTrainer();
    resetTapDots();
    // 模拟近乎完美的敲回：按目标比例 + 少量噪声，随机偶尔多/少一下
    const base = 260;
    let t = 1000; const times = [t];
    trainer.targetIois.forEach((u) => { t += u * base + (Math.random() - 0.5) * base * 0.18; times.push(t); });
    phase = 'tapping';
    times.forEach((tm) => { onTap(tm); });
  }

  $('#rd-listen').onclick = listen;
  $('#rd-replay').onclick = replay;
  $('#rd-done').onclick = () => { if (phase === 'tapping') finishRound(trainer.finish()); };
  $('#rd-new').onclick = () => { clearTimers(); dictOnNote = null; phase = 'idle'; newTrainer(); resetTapDots(); $('#rd-bars').innerHTML = ''; $('#rd-score').textContent = '—'; $('#rd-rhythm').textContent = '—'; $('#rd-count').textContent = '—'; $('#rd-replay').disabled = true; $('#rd-done').disabled = true; $('#rd-status').textContent = '已换一条，点"听一遍"'; $('#rd-feedback').className = 'sight-feedback'; $('#rd-feedback').textContent = '点"👂 听一遍"，听完后在任意键上把节奏敲回来'; };
  $('#rd-sim').onclick = simulate;
  $('#rd-level').onchange = () => { if (phase !== 'playing') { newTrainer(); resetTapDots(); } };
  $('#rd-tempo').onchange = () => { if (trainer) trainer.bpm = +$('#rd-tempo').value; };

  newTrainer();
  resetTapDots();
}

function renderSightTranspose() {
  const root = $('#module-trans');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 移调视奏</h2>
    <p style="color:var(--muted);margin-bottom:14px">练<b>看谱移调</b>：屏幕给出一段<b>原调（C）</b>里的小旋律 + 一个<b>目标调</b>，你要把同一段旋律<b>移到目标调</b>弹出来——起音落在目标的第一个音上，其余保持一样的音程关系。和"移调器"（整体升降键盘）、"视奏闪卡"（照谱原样弹）、"旋律听写"（凭听复奏原音高）都不同。忽略八度，弹对音级即可。综合分 = 音级正确率。</p>

    <div class="card-panel">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px">
        <span style="color:var(--muted);min-width:64px">原调旋律</span>
        <div id="st-source" class="st-chips"></div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="color:var(--muted);min-width:64px">移到</span>
        <span id="st-target-name" class="st-key">—</span>
        <span id="st-answer" class="st-answer" style="display:none"></span>
      </div>
    </div>

    <div class="card-panel">
      <div id="st-play" class="st-chips"></div>
      <div id="st-feedback" class="sight-feedback" style="margin-top:14px">点"换一题"出题，然后在琴上把这段旋律移到目标调弹出来</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 看答案或完成一轮后，把<b>移调后的目标音</b>按顺序画在 88 键上（带序号），照着位置弹就懂怎么移调（点键也可作答）</div>
      <div id="st-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="st-score" class="sight-stat-num">—</div><div class="sight-stat-lbl">综合分</div></div>
      <div class="sight-stat"><div id="st-note" class="sight-stat-num">—</div><div class="sight-stat-lbl">音准</div></div>
      <div class="sight-stat"><div id="st-shape" class="sight-stat-num">—</div><div class="sight-stat-lbl">旋律形状</div></div>
      <div class="sight-stat"><div id="st-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳</div></div>
    </div>

    <div class="rotate-bar">
      <button id="st-new" class="big-btn">🔁 换一题</button>
      <button id="st-hear" class="big-btn" style="background:#475569">🔊 听原调</button>
      <button id="st-reveal" class="big-btn" style="background:#475569">👁 看答案</button>
      <button id="st-sim" class="big-btn" style="background:#667eea">🎲 模拟一遍</button>
      <span id="st-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let trainer = null;
  let revealed = false;

  const stKb = new PianoKeyboard($('#st-kb'), {
    labels: 'c',
    onNoteOn: (m) => { playTone(midiToFreq(m), 0, 0.5); if (transOnNote) transOnNote(m); },
  });
  stKb.scrollToShow(55, 79);

  function midiToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); }
  function playTone(freq, when, dur) {
    try {
      _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = _audioCtx;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + when + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + dur);
      o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + when); o.stop(ctx.currentTime + when + dur + 0.02);
    } catch (e) { /* 无音频时静默 */ }
  }
  function playSeq(seq) { const step = 0.36; seq.forEach((n, i) => playTone(midiToFreq(n), i * step, 0.32)); }

  function chips(container, seq, cls) {
    const wrap = $(container); wrap.innerHTML = '';
    seq.forEach((n) => {
      const c = document.createElement('span');
      c.className = 'st-chip' + (cls ? ' ' + cls : '');
      c.textContent = CA99.noteName(n);
      wrap.appendChild(c);
    });
  }

  function drawPlayDots() {
    const wrap = $('#st-play'); wrap.innerHTML = '';
    for (let i = 0; i < trainer.total; i++) {
      const c = document.createElement('span');
      c.className = 'st-chip st-pending'; c.textContent = '·';
      wrap.appendChild(c);
    }
  }

  function showQuestion() {
    chips('#st-source', trainer.sourceSeq, 'st-src');
    $('#st-target-name').textContent = trainer.targetKey.name + `（${trainer.melody.solfa}）`;
    $('#st-answer').style.display = 'none';
    $('#st-answer').textContent = '';
    revealed = false;
    stKb.clear();
    drawPlayDots();
  }

  function fillPlay(i, ok) {
    const dots = document.querySelectorAll('#st-play .st-chip');
    if (dots[i]) {
      dots[i].textContent = CA99.noteName(trainer.played[i]);
      dots[i].classList.remove('st-pending');
    }
  }

  function finishRound(r) {
    transOnNote = null;
    // 给每个弹奏的音上色
    const dots = document.querySelectorAll('#st-play .st-chip');
    r.perNote.forEach((p, i) => { if (dots[i]) dots[i].classList.add(p.ok ? 'st-hit' : 'st-miss'); });
    $('#st-score').textContent = r.score;
    $('#st-note').textContent = Math.round(r.noteAccuracy * 100) + '%';
    $('#st-shape').textContent = Math.round(r.shapeAccuracy * 100) + '%';
    $('#st-best').textContent = trainer.best;
    recordPractice('trans', '移调视奏', r.total, r.correct, r.score);
    const fb = $('#st-feedback');
    fb.className = 'sight-feedback ok';
    let tip;
    if (r.wrongKey) tip = '旋律对了，但没移到目标调——注意起音要落在目标调上';
    else if (r.extra > 0) tip = `多弹了 ${r.extra} 个音`;
    else if (r.score >= 90) tip = '移调准确，漂亮！';
    else if (r.shapeAccuracy >= 0.8) tip = '音程关系基本对，个别音再准一点';
    else tip = '先在心里把每个音程往上搬，再弹';
    fb.textContent = `综合 ${r.score} 分 · 音准 ${Math.round(r.noteAccuracy * 100)}% · 形状 ${Math.round(r.shapeAccuracy * 100)}%（起音${r.rootOk ? '对' : '错'}） —— ${tip}`;
    $('#st-status').textContent = '完成（换一题再来）';
    stKb.highlightMany(trainer.expected.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
  }

  function arm() {
    transOnNote = (note) => {
      const i = trainer.played.length;
      const res = trainer.feed(note);
      fillPlay(i);
      $('#st-status').textContent = `${trainer.played.length}/${trainer.total}`;
      if (res && res.done) finishRound(res);
    };
  }

  function newRound() {
    transOnNote = null;
    trainer = new SightTransposeTrainer({});
    showQuestion();
    $('#st-score').textContent = '—'; $('#st-note').textContent = '—'; $('#st-shape').textContent = '—';
    $('#st-best').textContent = trainer.best;
    const fb = $('#st-feedback'); fb.className = 'sight-feedback';
    fb.textContent = `把这段旋律移到 ${trainer.targetKey.name} 弹出来（忽略八度，弹对音级即可）`;
    $('#st-status').textContent = `0/${trainer.total}`;
    arm();
  }

  function reveal() {
    if (!trainer) return;
    revealed = !revealed;
    const a = $('#st-answer');
    if (revealed) {
      a.style.display = 'inline-flex';
      a.innerHTML = '答案：' + trainer.expected.map((n) => `<b>${CA99.noteName(n)}</b>`).join(' ');
      stKb.highlightMany(trainer.expected.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
    } else {
      a.style.display = 'none';
      stKb.clear();
    }
  }

  function simulate() {
    if (!trainer) newRound();
    transOnNote = null;
    trainer.newRound({});
    showQuestion();
    $('#st-best').textContent = trainer.best;
    // 模拟：92% 弹对移调音，偶尔错一个半音
    trainer.expected.forEach((n, i) => {
      const note = Math.random() < 0.9 ? n : n + (Math.random() < 0.5 ? 1 : -1);
      const i2 = trainer.played.length;
      const res = trainer.feed(note);
      fillPlay(i2);
      if (res && res.done) finishRound(res);
    });
  }

  $('#st-new').onclick = newRound;
  $('#st-hear').onclick = () => { if (trainer) playSeq(trainer.sourceSeq); };
  $('#st-reveal').onclick = reveal;
  $('#st-sim').onclick = simulate;

  newRound();
}

// ========== 模块 41: 和弦转位听辨 ==========
function playChordNotes(notes, arpeggio) {
  if (!notes || !notes.length) return;
  if (arpeggio) {
    notes.forEach((n, i) => playTone(midiToFreq(n), i * 0.28, 0.5));
    // 琶音后再整体响一下，方便整体感受
    notes.forEach((n) => playTone(midiToFreq(n), notes.length * 0.28 + 0.1, 1.0, 0.18));
  } else {
    notes.forEach((n) => playTone(midiToFreq(n), 0, 1.2, 0.18));
  }
}

function renderChordInversion() {
  const root = $('#module-inv');
  let game = null;
  const qEnabled = new Set(INV_QUALITIES.map((q) => q.id));
  const invEnabled = new Set([0, 1, 2]);

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 和弦转位听辨</h2>
    <p style="color:var(--muted);margin-bottom:14px">听电脑播放一个三和弦，辨认它是<b>原位</b>、<b>第一转位</b>还是<b>第二转位</b>。和"和弦练习"（弹出某个和弦名、忽略转位）不同——这里专练耳朵分辨同一个和弦的<b>不同排列</b>（低音是根音/三音/五音）。诀窍：原位是两个三度叠起来；<b>第一转位</b>上方有纯四度；<b>第二转位</b>底部就是纯四度。无需连琴（电脑发声）。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>和弦类型</label>
        <div class="ear-chips" id="inv-qchips"></div></div>
      <div class="param-row" style="align-items:flex-start"><label>转位范围</label>
        <div class="ear-chips" id="inv-ichips"></div></div>
      <div class="param-row"><label>播放方式</label>
        <select id="inv-mode">
          <option value="block">柱式（同时响）</option>
          <option value="arp">琶音+柱式</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <button id="inv-replay" class="big-btn" disabled>🔊 再听一次</button>
      <div id="inv-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="inv-notes" class="inv-notes"></div>
    </div>

    <div class="ear-answers" id="inv-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把这个和弦的三个音画在 88 键上 — <span class="kb-legend" style="color:#f472b6"><i></i>低音（决定转位）</span>（点键可试听）</div>
      <div id="inv-kb"></div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把这个和弦画在 88 键上（<b style="color:#ff5da2">低</b>=最低的音/低音，数字=从低到高第几个音，点键可试听）</div>
      <div id="inv-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="inv-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="inv-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="inv-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="inv-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="inv-start" class="big-btn">▶ 开始练习</button>
      <span id="inv-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawQChips() {
    $('#inv-qchips').innerHTML = INV_QUALITIES.map((q) =>
      `<button class="ear-chip ${qEnabled.has(q.id) ? 'on' : ''}" data-q="${q.id}">${q.name}</button>`).join('');
    $('#inv-qchips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const q = b.dataset.q;
        if (qEnabled.has(q)) { if (qEnabled.size > 1) qEnabled.delete(q); } else qEnabled.add(q);
        drawQChips();
      };
    });
  }
  function drawIChips() {
    $('#inv-ichips').innerHTML = INV_OPTIONS.map((iv) =>
      `<button class="ear-chip ${invEnabled.has(iv.id) ? 'on' : ''}" data-i="${iv.id}">${iv.name}</button>`).join('');
    $('#inv-ichips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const iv = +b.dataset.i;
        if (invEnabled.has(iv)) { if (invEnabled.size > 1) invEnabled.delete(iv); } else invEnabled.add(iv);
        drawIChips(); drawAnswers();
      };
    });
  }
  drawQChips(); drawIChips();

  function drawAnswers() {
    const list = INV_OPTIONS.filter((iv) => invEnabled.has(iv.id));
    $('#inv-answers').innerHTML = list.map((iv) =>
      `<button class="ear-ans" data-i="${iv.id}" disabled>${iv.name}<small>${iv.desc}</small></button>`).join('');
    $('#inv-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(+b.dataset.i, b);
    });
  }
  drawAnswers();

  const invKb = new PianoKeyboard($('#inv-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  invKb.scrollToShow(48, 72);

  function refreshStats() {
    $('#inv-score').textContent = game.score;
    $('#inv-streak').textContent = game.streak;
    $('#inv-best').textContent = game.best;
    $('#inv-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function playCurrent() {
    if (game && game.current) playChordNotes(game.notes(), $('#inv-mode').value === 'arp');
  }

  let answering = false;
  function answer(inv, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctInv = game.current.inv;
    const q = game.current.quality;
    const notes = game.notes();
    const ok = game.check(inv);
    refreshStats();
    $('#inv-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const i = +b.dataset.i;
      if (i === correctInv) b.classList.add('correct');
      else if (i === inv) b.classList.add('wrong');
      b.disabled = true;
    });
    // 揭示具体音符 + 低音
    $('#inv-notes').innerHTML = `<span class="inv-tag">${q.name} ${inversionName(correctInv)}</span>` +
      notes.map((n, idx) => `<span class="inv-chip${idx === 0 ? ' inv-bass' : ''}">${CA99.noteName(n)}</span>`).join('');
    invKb.highlightMany(notes.map((n, idx) => ({ midi: n, color: idx === 0 ? '#f472b6' : HL_PALETTE[idx % HL_PALETTE.length], text: idx === 0 ? '低' : String(idx + 1) })));
    const fb = $('#inv-feedback');
    if (ok) { fb.textContent = `✅ 对了！是${q.name}${inversionName(correctInv)} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${q.name}${inversionName(correctInv)}`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 1400);
  }

  function nextQuestion() {
    answering = false;
    const notes = game.next();
    $('#inv-answers').querySelectorAll('.ear-ans').forEach((b) => { b.disabled = false; b.classList.remove('correct', 'wrong'); });
    $('#inv-notes').innerHTML = '';
    invKb.clear();
    $('#inv-feedback').textContent = '🎧 听一听，这是第几转位？';
    $('#inv-feedback').className = 'sight-feedback';
    playChordNotes(notes, $('#inv-mode').value === 'arp');
  }

  $('#inv-replay').onclick = playCurrent;

  $('#inv-start').onclick = () => {
    if (game) {
      recordPractice('inv', '和弦转位听辨', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#inv-start').textContent = '▶ 开始练习';
      $('#inv-start').classList.remove('running');
      $('#inv-status').textContent = '已停止';
      $('#inv-replay').disabled = true;
      $('#inv-notes').innerHTML = '';
      invKb.clear();
      $('#inv-feedback').textContent = '选好范围，按"开始"出题';
      $('#inv-feedback').className = 'sight-feedback';
      drawQChips(); drawIChips(); drawAnswers();
      return;
    }
    game = new ChordInversionGame({ qualities: [...qEnabled], inversions: [...invEnabled] });
    $('#inv-start').textContent = '⏸ 停止练习';
    $('#inv-start').classList.add('running');
    $('#inv-status').textContent = '进行中…';
    $('#inv-replay').disabled = false;
    drawAnswers();
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 42: 调号识别 ==========
function renderKeySignature() {
  const root = $('#module-keysig');
  let game = null;
  const modeEnabled = new Set(['major']);
  let maxAcc = 7;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 调号识别</h2>
    <p style="color:var(--muted);margin-bottom:14px">看一个<b>调号</b>（几个升号 ♯ 或降号 ♭），判断它是哪个大调/小调。基于<b>五度圈</b>：升号顺序 F C G D A E B、降号顺序 B E A D G C F。诀窍：升号调看<b>最后一个升号上方半音</b>就是大调主音；降号调看<b>倒数第二个降号</b>就是大调主音（只有 1 个降号时固定 F 大调）。答完可🔊听该调音阶。无需连琴（纯乐理多选）。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>调式</label>
        <div class="ear-chips" id="ks-mchips"></div></div>
      <div class="param-row"><label>最多升降号</label>
        <select id="ks-max">
          <option value="2">±2（入门）</option>
          <option value="4">±4（进阶）</option>
          <option value="7" selected>±7（全部）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div id="ks-sig" class="ks-sig" style="min-height:48px"></div>
      <div id="ks-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="ks-hint" class="ks-hint"></div>
    </div>

    <div class="ear-answers" id="ks-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把该调<b>音阶</b>从主音起依次画在 88 键上（带级数 1-7），照着弹一遍就记住这个调（点键可试听）</div>
      <div id="ks-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="ks-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ks-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ks-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ks-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="ks-start" class="big-btn">▶ 开始练习</button>
      <span id="ks-status" style="color:var(--muted)">未开始</span>
    </div>`;

  const MODES = [{ id: 'major', name: '大调' }, { id: 'minor', name: '小调' }];
  function drawMChips() {
    $('#ks-mchips').innerHTML = MODES.map((m) =>
      `<button class="ear-chip ${modeEnabled.has(m.id) ? 'on' : ''}" data-m="${m.id}">${m.name}</button>`).join('');
    $('#ks-mchips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const m = b.dataset.m;
        if (modeEnabled.has(m)) { if (modeEnabled.size > 1) modeEnabled.delete(m); } else modeEnabled.add(m);
        drawMChips();
      };
    });
  }
  drawMChips();
  $('#ks-max').onchange = () => { if (!game) maxAcc = +$('#ks-max').value; };

  const ksKb = new PianoKeyboard($('#ks-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  ksKb.scrollToShow(55, 79);

  function refreshStats() {
    $('#ks-score').textContent = game.score;
    $('#ks-streak').textContent = game.streak;
    $('#ks-best').textContent = game.best;
    $('#ks-acc').textContent = game.attempts ? game.accuracy + '%' : '—';
  }

  function drawSig(q) {
    if (q.count === 0) {
      $('#ks-sig').innerHTML = `<span class="ks-none">（无升降号）</span>`;
      return;
    }
    const sym = q.type === 'sharp' ? '♯' : '♭';
    $('#ks-sig').innerHTML = `<span class="ks-count">${q.count}${sym}</span>` +
      q.accidentals.map((a) => `<span class="ks-acc-chip">${a.replace('#', '♯').replace('b', '♭')}</span>`).join('');
  }

  function drawAnswers(q) {
    $('#ks-answers').innerHTML = q.choices.map((k) =>
      `<button class="ear-ans" data-k="${k}">${k.replace('#', '♯').replace(/m$/, ' 小调').replace(/^([A-G][♯b]?)$/, '$1 大调')}</button>`).join('');
    $('#ks-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(b.dataset.k, b);
    });
  }

  function playScale(key) {
    const seq = ksScale(key);
    seq.forEach((n, i) => playTone(midiToFreq(n), i * 0.18, 0.32, 0.18));
  }

  let answering = false;
  function answer(key, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correct = game.current.answer;
    const res = game.check(key);
    refreshStats();
    $('#ks-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const k = b.dataset.k;
      if (k === correct) b.classList.add('correct');
      else if (k === key) b.classList.add('wrong');
      b.disabled = true;
    });
    $('#ks-hint').textContent = '💡 ' + game.current.hint;
    const fb = $('#ks-feedback');
    if (res.correct) { fb.textContent = `✅ 对了！${labelKey(correct)} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${labelKey(correct)}`; fb.className = 'sight-feedback no'; }
    playScale(correct);
    const seq = ksScale(correct);
    ksKb.highlightMany(seq.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String((i % 7) + 1) })));
    setTimeout(() => { if (game) nextQuestion(); }, 1700);
  }

  function labelKey(k) {
    return k.replace('#', '♯').replace(/m$/, ' 小调').replace(/^([A-G][♯b]?)$/, '$1 大调');
  }

  function nextQuestion() {
    answering = false;
    const q = game.next();
    drawSig(q);
    drawAnswers(q);
    ksKb.clear();
    $('#ks-hint').textContent = '';
    $('#ks-feedback').textContent = '🤔 这是哪个调？';
    $('#ks-feedback').className = 'sight-feedback';
  }

  $('#ks-start').onclick = () => {
    if (game) {
      recordPractice('keysig', '调号识别', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#ks-start').textContent = '▶ 开始练习';
      $('#ks-start').classList.remove('running');
      $('#ks-status').textContent = '已停止';
      $('#ks-sig').innerHTML = '';
      $('#ks-hint').textContent = '';
      $('#ks-answers').innerHTML = '';
      ksKb.clear();
      $('#ks-feedback').textContent = '选好范围，按"开始"出题';
      $('#ks-feedback').className = 'sight-feedback';
      drawMChips();
      return;
    }
    game = new KeySignatureGame({ modes: [...modeEnabled], maxAccidentals: maxAcc });
    $('#ks-start').textContent = '⏸ 停止练习';
    $('#ks-start').classList.add('running');
    $('#ks-status').textContent = '进行中…';
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 43: 音阶指法提示 ==========
function renderScaleFingering() {
  const root = $('#module-fing');
  let session = null;
  let scaleId = 'C';
  let hand = 'rh';
  let bidir = false;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🖐️ 音阶指法提示</h2>
    <p style="color:var(--muted);margin-bottom:14px">学标准钢琴<b>音阶指法</b>：屏幕给出一个八度音阶，每个音<b>上方标注该用几号手指</b>（右手 1=拇指…5=小指；左手相反）。<b>跟着弹</b>——弹对当前音就高亮下一个，红框标出<b>穿指/跨指点</b>（右手拇指从下方穿过、左手手指从拇指上方跨过）。诀窍：右手上行 C/G/D/A/E 大调都是 <b>1 2 3 1 2 3 4 5</b>，F 大调是例外 <b>1 2 3 4 1 2 3 4</b>。需连琴弹。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>选音阶</label>
        <div class="ear-chips" id="fing-scales"></div></div>
      <div class="param-row"><label>手</label>
        <div class="ear-chips" id="fing-hand">
          <button class="ear-chip on" data-h="rh">右手 RH</button>
          <button class="ear-chip" data-h="lh">左手 LH</button>
        </div></div>
      <div class="param-row"><label>方向</label>
        <div class="ear-chips" id="fing-dir">
          <button class="ear-chip on" data-d="up">上行</button>
          <button class="ear-chip" data-d="updown">上行+下行</button>
        </div></div>
    </div>

    <div class="sight-stage">
      <div id="fing-staff" class="fing-staff"></div>
      <div id="fing-feedback" class="sight-feedback">选好音阶，按"开始"跟弹</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 整条音阶画在 88 键上，键上数字=<span class="kb-legend" style="color:#5b8cff"><i></i>该用几号手指</span>，<span class="kb-legend" style="color:#fbbf24"><i></i>▶ 当前该弹的键</span>，<span class="kb-legend" style="color:#f87171"><i></i>红=穿指/跨指点</span>（点键可试听/作答）</div>
      <div id="fing-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="fing-prog">0/0</span><span class="sight-stat-lbl">进度</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="fing-correct">0</span><span class="sight-stat-lbl">正确</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="fing-wrong">0</span><span class="sight-stat-lbl">错误</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="fing-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="fing-start" class="big-btn">▶ 开始跟弹</button>
      <button id="fing-hear" class="big-btn" disabled>🔊 听一遍</button>
      <span id="fing-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawScaleChips() {
    $('#fing-scales').innerHTML = sfList().map((id) =>
      `<button class="ear-chip ${id === scaleId ? 'on' : ''}" data-s="${id}">${SF_FINGERINGS[id].name}</button>`).join('');
    $('#fing-scales').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => { if (session) return; scaleId = b.dataset.s; drawScaleChips(); drawStaff(); };
    });
  }
  function bindToggle(sel, attr, getCur, setCur) {
    $(sel).querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (session) return;
        setCur(b.dataset[attr]);
        $(sel).querySelectorAll('.ear-chip').forEach((x) => x.classList.toggle('on', x === b));
        drawStaff();
      };
    });
  }
  drawScaleChips();
  bindToggle('#fing-hand', 'h', () => hand, (v) => { hand = v; });
  bindToggle('#fing-dir', 'd', () => bidir, (v) => { bidir = (v === 'updown'); });

  const fingKb = new PianoKeyboard($('#fing-kb'), {
    labels: 'c',
    onNoteOn: (m) => { playTone(midiToFreq(m), 0, 0.6); if (fingOnNote) fingOnNote(m); },
  });

  // 计算当前（预览或跟弹）的音符、指法、穿跨指点
  function fingData() {
    const rootMidi = sfRoot(scaleId);
    let notes, fseq;
    if (session) { notes = session.notes; fseq = session.fingerSeq; }
    else {
      notes = sfNotes(scaleId, rootMidi);
      const up = sfFingers(scaleId, hand);
      if (bidir) { notes = notes.concat(notes.slice(0, -1).reverse()); fseq = up.concat(up.slice(0, -1).reverse()); }
      else fseq = up;
    }
    const cross = sfCross(fseq.slice(0, bidir ? sfFingers(scaleId, hand).length : fseq.length), hand);
    return { notes, fseq, crossSet: new Set(cross), ptr: session ? session.pointer : -1 };
  }

  function paintKb() {
    const { notes, fseq, crossSet, ptr } = fingData();
    // 同一 midi 可能出现两次（上行/下行），用最后一次进度决定颜色，这里按位置逐个画
    const items = notes.map((n, i) => {
      let color = '#5b8cff';
      if (crossSet.has(i)) color = '#f87171';
      if (i === ptr) color = '#fbbf24';
      const badge = i === ptr ? '▶' + fseq[i] : String(fseq[i]);
      return { midi: n, color, text: badge };
    });
    fingKb.highlightMany(items, { scroll: false });
    if (notes.length) fingKb.scrollToShow(Math.min(...notes), Math.max(...notes));
  }

  // 画音阶谱面（静态预览或跟弹高亮）
  function drawStaff() {
    const rootMidi = sfRoot(scaleId);
    let notes, fseq;
    if (session) { notes = session.notes; fseq = session.fingerSeq; }
    else {
      notes = sfNotes(scaleId, rootMidi);
      const up = sfFingers(scaleId, hand);
      if (bidir) { notes = notes.concat(notes.slice(0, -1).reverse()); fseq = up.concat(up.slice(0, -1).reverse()); }
      else fseq = up;
    }
    const cross = sfCross(fseq.slice(0, bidir ? sfFingers(scaleId, hand).length : fseq.length), hand);
    const crossSet = new Set(cross);
    const ptr = session ? session.pointer : -1;
    $('#fing-staff').innerHTML = notes.map((n, i) => {
      const cls = ['fing-cell'];
      if (i === ptr) cls.push('fing-cur');
      else if (session && i < ptr) cls.push('fing-played');
      if (crossSet.has(i)) cls.push('fing-cross');
      return `<div class="${cls.join(' ')}">
        <span class="fing-num">${fseq[i]}</span>
        <span class="fing-note">${CA99.noteName(n)}</span>
      </div>`;
    }).join('');
    paintKb();
  }
  drawStaff();

  function refreshStats() {
    if (!session) { $('#fing-prog').textContent = '0/0'; return; }
    $('#fing-prog').textContent = `${session.pointer}/${session.total}`;
    $('#fing-correct').textContent = session.correct;
    $('#fing-wrong').textContent = session.wrong;
    $('#fing-acc').textContent = (session.correct + session.wrong) ? session.accuracy + '%' : '—';
  }

  function playDemo() {
    const notes = session ? session.notes : sfNotes(scaleId, sfRoot(scaleId));
    notes.forEach((n, i) => playTone(midiToFreq(n), i * 0.32, 0.42, 0.2));
  }

  function finish() {
    const sum = session.summary();
    recordPractice('fing', '音阶指法提示', session.correct + session.wrong, session.correct, 0);
    const fb = $('#fing-feedback');
    fb.textContent = `🎉 完成！${SF_FINGERINGS[scaleId].name}（${hand === 'rh' ? '右手' : '左手'}）正确率 ${sum.accuracy}%`;
    fb.className = 'sight-feedback ok';
    fingOnNote = null;
    $('#fing-start').textContent = '▶ 开始跟弹';
    $('#fing-start').classList.remove('running');
    $('#fing-status').textContent = '已完成';
    session = null;
    drawScaleChips();
  }

  function stop() {
    fingOnNote = null;
    session = null;
    $('#fing-start').textContent = '▶ 开始跟弹';
    $('#fing-start').classList.remove('running');
    $('#fing-status').textContent = '已停止';
    $('#fing-feedback').textContent = '选好音阶，按"开始"跟弹';
    $('#fing-feedback').className = 'sight-feedback';
    drawScaleChips(); drawStaff(); refreshStats();
  }

  $('#fing-hear').onclick = playDemo;

  $('#fing-start').onclick = () => {
    if (session) { stop(); return; }
    session = new ScaleFingeringSession(scaleId, { hand, bidirectional: bidir });
    $('#fing-start').textContent = '⏸ 停止';
    $('#fing-start').classList.add('running');
    $('#fing-hear').disabled = false;
    $('#fing-status').textContent = '进行中…';
    $('#fing-feedback').textContent = `🎹 跟着指法弹 ${SF_FINGERINGS[scaleId].name}（${hand === 'rh' ? '右手' : '左手'}）`;
    $('#fing-feedback').className = 'sight-feedback';
    drawStaff(); refreshStats();
    playDemo();
    fingOnNote = (note) => {
      if (!session) return;
      const r = session.feed(note);
      drawStaff(); refreshStats();
      if (r.done) finish();
      else if (!r.correct) {
        $('#fing-feedback').textContent = `❌ 不是这个音，应弹 ${CA99.noteName(session.currentNote())}（${session.currentFinger()} 号指）`;
        $('#fing-feedback').className = 'sight-feedback no';
      } else {
        $('#fing-feedback').textContent = `✅ 下一个：${CA99.noteName(session.currentNote())}（${session.currentFinger()} 号指）`;
        $('#fing-feedback').className = 'sight-feedback ok';
      }
    };
  };
}

// ---------- 模块44：音程构建 ----------
function renderIntervalBuild() {
  const root = $('#module-ivb');
  let game = null;
  let dirMode = 'up';
  // 难度档：基础（常用音程）/ 全部
  const PRESETS = {
    basic: { ids: ['M2', 'm3', 'M3', 'P4', 'P5', 'P8'], name: '基础 6 种' },
    all: { ids: IB_INTERVALS.map((i) => i.id), name: '全部 12 种' },
  };
  let presetId = 'basic';

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎯 音程构建</h2>
    <p style="color:var(--muted);margin-bottom:14px">"听音训练"的<b>反向能力</b>：屏幕给一个<b>根音</b>+一个<b>音程名</b>（如"从 C4 往上弹纯五度"），你在键盘上<b>弹出那个目标音</b>。这是即兴、移调、和声的核心手上功夫——知道音程名就能在键盘上秒构建。先 🔊 听根音找到位置，再弹目标音。需连琴弹。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>音程范围</label>
        <div class="ear-chips" id="ivb-preset"></div></div>
      <div class="param-row"><label>方向</label>
        <div class="ear-chips" id="ivb-dir">
          <button class="ear-chip on" data-d="up">向上 ↑</button>
          <button class="ear-chip" data-d="down">向下 ↓</button>
          <button class="ear-chip" data-d="both">双向 ↕</button>
        </div></div>
    </div>

    <div class="sight-stage">
      <div id="ivb-prompt" class="ivb-prompt">
        <div class="ivb-q">按"开始"出题</div>
      </div>
      <div id="ivb-feedback" class="sight-feedback">设置好后开始，跟着提示弹目标音</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 弹错或弹对都会把<span class="kb-legend" style="color:#5b8cff"><i></i>根音</span>和<span class="kb-legend" style="color:#34d399"><i></i>目标音</span>画在 88 键上，照位置就知道该弹哪个键（点键也可作答）</div>
      <div id="ivb-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="ivb-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ivb-streak">0</span><span class="sight-stat-lbl">连对</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ivb-best">0</span><span class="sight-stat-lbl">最佳连对</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ivb-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="ivb-start" class="big-btn">▶ 开始</button>
      <button id="ivb-hear" class="big-btn" disabled>🔊 听根音</button>
      <button id="ivb-skip" class="big-btn" disabled>下一题 →</button>
      <span id="ivb-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawPresets() {
    $('#ivb-preset').innerHTML = Object.entries(PRESETS).map(([id, p]) =>
      `<button class="ear-chip ${id === presetId ? 'on' : ''}" data-p="${id}">${p.name}</button>`).join('');
    $('#ivb-preset').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => { if (game) return; presetId = b.dataset.p; drawPresets(); };
    });
  }
  drawPresets();

  const ivbKb = new PianoKeyboard($('#ivb-kb'), {
    labels: 'c',
    onNoteOn: (m) => { playTone(midiToFreq(m), 0, 0.6); if (ivbOnNote) ivbOnNote(m); },
  });
  ivbKb.scrollToShow(48, 72);

  $('#ivb-dir').querySelectorAll('.ear-chip').forEach((b) => {
    b.onclick = () => {
      if (game) return;
      dirMode = b.dataset.d;
      $('#ivb-dir').querySelectorAll('.ear-chip').forEach((x) => x.classList.toggle('on', x === b));
    };
  });

  function refreshStats() {
    if (!game) return;
    $('#ivb-score').textContent = game.score;
    $('#ivb-streak').textContent = game.streak;
    $('#ivb-best').textContent = game.best;
    $('#ivb-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function showQuestion() {
    const c = game.current;
    const arrow = c.dir.sign > 0 ? '↑' : '↓';
    $('#ivb-prompt').innerHTML = `
      <div class="ivb-q">从 <span class="ivb-root">${ibNoteName(c.root)}</span> ${c.dir.name} <span class="ivb-iv">${c.interval.name}</span> <span class="ivb-arrow">${arrow}</span></div>
      <div class="ivb-hint">弹出目标音（已隐藏，弹对自动判分）</div>`;
  }

  function hearRoot() {
    if (!game || !game.current) return;
    playTone(midiToFreq(game.current.root), 0, 0.6, 0.25);
  }

  function nextQuestion() {
    game.next();
    showQuestion();
    if (typeof ivbKb !== 'undefined') ivbKb.clear();
    $('#ivb-feedback').textContent = '🎹 找到根音，往' + (game.current.dir.sign > 0 ? '上' : '下') + '弹出目标音';
    $('#ivb-feedback').className = 'sight-feedback';
    hearRoot();
  }

  function start() {
    const dirs = dirMode === 'both' ? ['up', 'down'] : [dirMode];
    game = new IntervalBuildGame({ intervals: PRESETS[presetId].ids, directions: dirs });
    $('#ivb-start').textContent = '⏸ 停止';
    $('#ivb-start').classList.add('running');
    $('#ivb-hear').disabled = false;
    $('#ivb-skip').disabled = false;
    $('#ivb-status').textContent = '进行中…';
    refreshStats();
    nextQuestion();
    ivbOnNote = (note) => {
      if (!game || !game.current) return;
      const target = game.current.target;
      const root = game.current.root;
      const correct = game.check(note);
      refreshStats();
      ivbKb.highlightMany([{ midi: root, color: '#5b8cff', text: '根' }, { midi: target, color: '#34d399', text: '标' }]);
      if (correct) {
        $('#ivb-feedback').textContent = `✅ 正确！${ibNoteName(target)}　连对 ${game.streak}`;
        $('#ivb-feedback').className = 'sight-feedback ok';
        recordPractice('ivb', '音程构建', 1, 1, 0);
        setTimeout(() => { if (game) nextQuestion(); }, 700);
      } else {
        $('#ivb-feedback').textContent = `❌ 你弹的是 ${ibNoteName(note)}，目标是 ${ibNoteName(target)}（差 ${note - target > 0 ? '+' : ''}${note - target} 半音）`;
        $('#ivb-feedback').className = 'sight-feedback no';
        recordPractice('ivb', '音程构建', 1, 0, 0);
      }
    };
  }

  function stop() {
    ivbOnNote = null;
    game = null;
    ivbKb.clear();
    $('#ivb-start').textContent = '▶ 开始';
    $('#ivb-start').classList.remove('running');
    $('#ivb-hear').disabled = true;
    $('#ivb-skip').disabled = true;
    $('#ivb-status').textContent = '已停止';
    $('#ivb-prompt').innerHTML = '<div class="ivb-q">按"开始"出题</div>';
    $('#ivb-feedback').textContent = '设置好后开始，跟着提示弹目标音';
    $('#ivb-feedback').className = 'sight-feedback';
    drawPresets();
  }

  $('#ivb-start').onclick = () => { if (game) stop(); else start(); };
  $('#ivb-hear').onclick = hearRoot;
  $('#ivb-skip').onclick = () => { if (game) nextQuestion(); };
}

// ========== 模块 45: 调式识别（教会调式）==========
function renderModeId() {
  const root = $('#module-modeid');
  let game = null;
  const enabled = new Set(MID_MODES.map((m) => m.id));
  let choiceCount = 4;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎶 调式识别</h2>
    <p style="color:var(--muted);margin-bottom:14px">🔊 听一段<b>调式音阶</b>（7 个教会调式之一），判断它是哪个调式。诀窍：听<b>每级之间的半音/全音排列</b>——多利亚像小调但<b>6 级升高</b>明亮一点；利底亚像大调但<b>4 级升高</b>更梦幻；混合利底亚像大调但<b>7 级降低</b>；弗里几亚最暗（<b>2 级降低</b>）；洛克里亚最不稳定（<b>5 级降低</b>）。无需连琴（纯听辨多选）。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>调式范围</label>
        <div class="ear-chips" id="mid-chips"></div></div>
      <div class="param-row"><label>选项数量</label>
        <select id="mid-cc">
          <option value="3">3 选 1（入门）</option>
          <option value="4" selected>4 选 1（进阶）</option>
          <option value="7">7 选 1（全部）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div id="mid-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="mid-hint" class="mid-hint"></div>
    </div>

    <div class="rotate-bar" style="justify-content:center;margin-bottom:8px">
      <button id="mid-replay" class="big-btn" disabled>🔊 再听一次</button>
    </div>

    <div class="ear-answers" id="mid-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把这条调式音阶画在 88 键上（带级数 1-7），看哪几级和大调不同就懂这个调式的色彩了（点键可试听）</div>
      <div id="mid-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="mid-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="mid-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="mid-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="mid-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="mid-start" class="big-btn">▶ 开始练习</button>
      <span id="mid-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawChips() {
    $('#mid-chips').innerHTML = MID_MODES.map((m) =>
      `<button class="ear-chip ${enabled.has(m.id) ? 'on' : ''}" data-m="${m.id}">${m.name}</button>`).join('');
    $('#mid-chips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const m = b.dataset.m;
        if (enabled.has(m)) { if (enabled.size > 2) enabled.delete(m); } else enabled.add(m);
        drawChips();
      };
    });
  }
  drawChips();
  $('#mid-cc').onchange = () => { if (!game) choiceCount = +$('#mid-cc').value; };

  const midKb = new PianoKeyboard($('#mid-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  midKb.scrollToShow(55, 79);

  function refreshStats() {
    $('#mid-score').textContent = game.score;
    $('#mid-streak').textContent = game.streak;
    $('#mid-best').textContent = game.best;
    $('#mid-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function playScale() {
    const seq = game.notes();
    seq.forEach((n, i) => playTone(midiToFreq(n), i * 0.32, 0.42, 0.2));
  }

  function drawAnswers() {
    $('#mid-answers').innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-m="${c.id}">${c.name}<small>${c.alias}</small></button>`).join('');
    $('#mid-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(b.dataset.m, b);
    });
  }

  let answering = false;
  function answer(modeId, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctId = game.current.mode.id;
    const correct = game.check(modeId);
    refreshStats();
    $('#mid-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const m = b.dataset.m;
      if (m === correctId) b.classList.add('correct');
      else if (m === modeId) b.classList.add('wrong');
      b.disabled = true;
    });
    $('#mid-hint').textContent = '💡 ' + game.current.mode.hint;
    const seq = game.notes();
    if (seq && seq.length) midKb.highlightMany(seq.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String((i % 7) + 1) })));
    const fb = $('#mid-feedback');
    if (correct) { fb.textContent = `✅ 对了！${midModeName(correctId)} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${midModeName(correctId)}`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 1800);
  }

  function nextQuestion() {
    answering = false;
    game.next();
    drawAnswers();
    midKb.clear();
    $('#mid-hint').textContent = '';
    $('#mid-feedback').textContent = '🤔 这是哪个调式？';
    $('#mid-feedback').className = 'sight-feedback';
    $('#mid-replay').disabled = false;
    playScale();
  }

  $('#mid-replay').onclick = () => { if (game && game.current) playScale(); };

  $('#mid-start').onclick = () => {
    if (game) {
      recordPractice('modeid', '调式识别', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#mid-start').textContent = '▶ 开始练习';
      $('#mid-start').classList.remove('running');
      $('#mid-status').textContent = '已停止';
      $('#mid-answers').innerHTML = '';
      $('#mid-hint').textContent = '';
      $('#mid-replay').disabled = true;
      midKb.clear();
      $('#mid-feedback').textContent = '选好范围，按"开始"出题';
      $('#mid-feedback').className = 'sight-feedback';
      drawChips();
      return;
    }
    game = new ModeIdGame({ modes: [...enabled], choiceCount });
    $('#mid-start').textContent = '⏸ 停止练习';
    $('#mid-start').classList.add('running');
    $('#mid-status').textContent = '进行中…';
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 49: 终止式辨认（cadence ID）==========
function renderCadence() {
  const root = $('#module-cad');
  let game = null;
  const enabled = new Set(CAD_LIST.map((c) => c.id));
  let choiceCount = 4;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎵 终止式辨认</h2>
    <p style="color:var(--muted);margin-bottom:14px">🔊 听一个<b>两个和弦</b>的<b>终止式</b>（乐句的和声落点），辨认它属于哪一类。诀窍：<b>正格 V→I</b> 最有"结束感"像句号；<b>变格 IV→I</b> 柔和庄重像"阿门"；<b>半终止 ?→V</b> 停在属和弦上悬而未决像逗号；<b>阻碍 V→vi</b> 本想回主却走到 vi 制造意外。这是听辨乐句结构、即兴收束、扒歌分段的核心能力。无需连琴（纯听辨多选），成绩入仪表盘。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>终止式范围</label>
        <div class="ear-chips" id="cad-chips"></div></div>
      <div class="param-row"><label>选项数量</label>
        <select id="cad-cc">
          <option value="2">2 选 1（入门）</option>
          <option value="3">3 选 1（进阶）</option>
          <option value="4" selected>4 选 1（全部）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div id="cad-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="cad-hint" class="mid-hint"></div>
    </div>

    <div class="rotate-bar" style="justify-content:center;margin-bottom:8px">
      <button id="cad-replay" class="big-btn" disabled>🔊 再听一次</button>
    </div>

    <div class="ear-answers" id="cad-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把两个和弦画在 88 键上 — <span class="kb-legend" style="color:#5b8cff"><i></i>第①个和弦</span> <span class="kb-legend" style="color:#fbbf24"><i></i>第②个和弦</span>（点键可试听）</div>
      <div id="cad-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="cad-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cad-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cad-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cad-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="cad-start" class="big-btn">▶ 开始练习</button>
      <span id="cad-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawChips() {
    $('#cad-chips').innerHTML = CAD_LIST.map((c) =>
      `<button class="ear-chip ${enabled.has(c.id) ? 'on' : ''}" data-c="${c.id}">${c.name}<small>${c.short}</small></button>`).join('');
    $('#cad-chips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const c = b.dataset.c;
        if (enabled.has(c)) { if (enabled.size > 1) enabled.delete(c); } else enabled.add(c);
        drawChips();
      };
    });
  }
  drawChips();
  $('#cad-cc').onchange = () => { if (!game) choiceCount = +$('#cad-cc').value; };

  const cadKb = new PianoKeyboard($('#cad-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  cadKb.scrollToShow(48, 72);

  function refreshStats() {
    $('#cad-score').textContent = game.score;
    $('#cad-streak').textContent = game.streak;
    $('#cad-best').textContent = game.best;
    $('#cad-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  // 依次播放两个和弦（柱式），第 2 个稍后响
  function playCadence() {
    const seq = game.notes();
    if (!seq.length) return;
    seq.forEach((chord, ci) => {
      chord.forEach((n) => playTone(midiToFreq(n), ci * 1.25, 1.1, 0.17));
    });
  }

  function drawAnswers() {
    $('#cad-answers').innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-c="${c.id}">${c.name}<small>${c.short}</small></button>`).join('');
    $('#cad-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(b.dataset.c, b);
    });
  }

  let answering = false;
  function answer(cadId, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctId = game.answerId();
    const correct = game.check(cadId);
    refreshStats();
    $('#cad-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const c = b.dataset.c;
      if (c === correctId) b.classList.add('correct');
      else if (c === cadId) b.classList.add('wrong');
      b.disabled = true;
    });
    const info = cadenceInfo(correctId);
    $('#cad-hint').textContent = '💡 ' + info.hint;
    // 把两个和弦画在键盘上：第①个蓝、第②个金，徽章标罗马数字
    const chords = game.chords();
    const items = [];
    chords.forEach((ch, ci) => {
      ch.notes.forEach((n, ni) => {
        items.push({ midi: n, color: ci === 0 ? '#5b8cff' : '#fbbf24', text: ni === 0 ? ch.roman : '' });
      });
    });
    cadKb.highlightMany(items);
    const fb = $('#cad-feedback');
    if (correct) { fb.textContent = `✅ 对了！${info.name}（${info.short}） · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${info.name}（${info.short}）`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 2000);
  }

  function nextQuestion() {
    answering = false;
    game.next();
    drawAnswers();
    cadKb.clear();
    $('#cad-hint').textContent = '';
    $('#cad-feedback').textContent = '🤔 这是什么终止式？';
    $('#cad-feedback').className = 'sight-feedback';
    $('#cad-replay').disabled = false;
    playCadence();
  }

  $('#cad-replay').onclick = () => { if (game && game.current) playCadence(); };

  $('#cad-start').onclick = () => {
    if (game) {
      recordPractice('cadence', '终止式辨认', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#cad-start').textContent = '▶ 开始练习';
      $('#cad-start').classList.remove('running');
      $('#cad-status').textContent = '已停止';
      $('#cad-answers').innerHTML = '';
      $('#cad-hint').textContent = '';
      $('#cad-replay').disabled = true;
      cadKb.clear();
      $('#cad-feedback').textContent = '选好范围，按"开始"出题';
      $('#cad-feedback').className = 'sight-feedback';
      drawChips();
      return;
    }
    game = new CadenceGame({ cadences: [...enabled], choiceCount });
    $('#cad-start').textContent = '⏸ 停止练习';
    $('#cad-start').classList.add('running');
    $('#cad-status').textContent = '进行中…';
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 50: 键盘音名认知（note ID）==========
function renderNoteId() {
  const root = $('#module-noteid');
  let game = null;
  let mode = 'name2key';   // name2key | key2name
  let whiteOnly = false;
  let useOctave = true;
  let range = { min: 48, max: 72 }; // C3..C5

  const RANGES = [
    { id: 'c3c5', name: '中音区 C3–C5', min: 48, max: 72 },
    { id: 'c2c6', name: '宽 C2–C6', min: 36, max: 84 },
    { id: 'full', name: '全 88 键 A0–C8', min: 21, max: 108 },
  ];

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🔤 键盘音名认知</h2>
    <p style="color:var(--muted);margin-bottom:14px">最基础的认键基本功：把<b>音名</b>（C4=中央 C、F#3…）和 88 键上的<b>实际键位</b>对应起来。看懂任何练习答案的前提就是知道"哪个键是哪个音"。两种练法：<b>看音名找键</b>（屏幕给音名 → 你在键盘上点对应的键）、<b>看键认音名</b>（键盘点亮一个键 → 你从选项里选出它叫什么）。新手建议先开"只白键 + 中音区 + 看音名找键"。无需连琴，成绩入仪表盘。</p>

    <div class="card-panel">
      <div class="param-row"><label>练习方式</label>
        <select id="ni-mode">
          <option value="name2key">看音名找键（点键盘）</option>
          <option value="key2name">看键认音名（选答案）</option>
        </select></div>
      <div class="param-row"><label>音域范围</label>
        <select id="ni-range">
          ${RANGES.map((r) => `<option value="${r.id}">${r.name}</option>`).join('')}
        </select></div>
      <div class="param-row"><label>只考白键</label>
        <div class="ear-chips" id="ni-white-chips">
          <button class="ear-chip on" data-w="0">含黑键</button>
          <button class="ear-chip" data-w="1">只白键</button>
        </div></div>
      <div class="param-row"><label>音名带八度</label>
        <div class="ear-chips" id="ni-oct-chips">
          <button class="ear-chip on" data-o="1">带八度 (C4)</button>
          <button class="ear-chip" data-o="0">只音名 (C)</button>
        </div></div>
    </div>

    <div class="sight-stage">
      <div id="ni-prompt" class="ni-bigname">—</div>
      <div id="ni-feedback" class="sight-feedback">选好设置，按"开始"出题</div>
    </div>

    <div class="ear-answers" id="ni-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap" id="ni-kbcap">🎹 在键盘上点出目标音</div>
      <div id="ni-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="ni-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ni-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ni-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="ni-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="ni-start" class="big-btn">▶ 开始练习</button>
      <span id="ni-status" style="color:var(--muted)">未开始</span>
    </div>`;

  $('#ni-mode').onchange = () => { if (!game) mode = $('#ni-mode').value; };
  $('#ni-range').onchange = () => {
    if (game) return;
    const r = RANGES.find((x) => x.id === $('#ni-range').value);
    if (r) { range = { min: r.min, max: r.max }; niKb.scrollToShow(r.min, Math.min(r.max, r.min + 24)); }
  };
  function bindChipGroup(sel, attr, setter) {
    const wrap = $(sel);
    wrap.querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        wrap.querySelectorAll('.ear-chip').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        setter(b.dataset[attr]);
      };
    });
  }
  bindChipGroup('#ni-white-chips', 'w', (v) => { whiteOnly = v === '1'; });
  bindChipGroup('#ni-oct-chips', 'o', (v) => { useOctave = v === '1'; });
  const niKb = new PianoKeyboard($('#ni-kb'), {
    labels: 'c',
    onNoteOn: (m) => {
      // 试听
      playTone(midiToFreq(m), 0, 0.6);
      // name2key 模式下点击即作答
      if (game && game.current && mode === 'name2key' && !answering) answerKey(m);
    },
  });
  niKb.scrollToShow(48, 72);

  function refreshStats() {
    $('#ni-score').textContent = game.score;
    $('#ni-streak').textContent = game.streak;
    $('#ni-best').textContent = game.best;
    $('#ni-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  let answering = false;

  function answerKey(m) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correct = game.check(m);
    refreshStats();
    const tgt = game.current.midi;
    const fb = $('#ni-feedback');
    // 画出正确键（绿），若点错也标出点错的键（红）
    const items = [{ midi: tgt, color: '#34d399', text: game.current.name }];
    if (!correct && m !== tgt) items.push({ midi: m, color: '#f87171', text: '✗' });
    niKb.highlightMany(items);
    if (correct) { fb.textContent = `✅ 对了！这就是 ${game.current.name} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，${game.current.name} 在这里（绿色）`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 1600);
  }

  function answerName(name, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctName = game.current.name;
    const correct = game.check(name);
    refreshStats();
    $('#ni-answers').querySelectorAll('.ear-ans').forEach((b) => {
      if (b.dataset.n === correctName) b.classList.add('correct');
      else if (b.dataset.n === name) b.classList.add('wrong');
      b.disabled = true;
    });
    // 点亮被考的键
    niKb.highlightMany([{ midi: game.current.midi, color: '#34d399', text: correctName }]);
    const fb = $('#ni-feedback');
    if (correct) { fb.textContent = `✅ 对了！连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${correctName}`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 1600);
  }

  function drawAnswers() {
    const wrap = $('#ni-answers');
    if (mode !== 'key2name') { wrap.innerHTML = ''; return; }
    wrap.innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-n="${c.name}">${c.name}</button>`).join('');
    wrap.querySelectorAll('.ear-ans').forEach((b) => { b.onclick = () => answerName(b.dataset.n, b); });
  }

  function nextQuestion() {
    answering = false;
    game.next();
    niKb.clear();
    const q = game.current;
    if (mode === 'name2key') {
      // 把目标音名显示出来，键盘上不预先点亮（让用户找）
      $('#ni-prompt').textContent = q.name;
      $('#ni-prompt').style.display = '';
      $('#ni-kbcap').textContent = '🎹 在键盘上点出目标音' + (useOctave ? '' : '（任意八度的同名键都行）');
      $('#ni-feedback').textContent = '🔍 这个音在键盘的哪里？点出来';
    } else {
      // key2name：点亮被考的键（不显示名字），用户选答案
      $('#ni-prompt').textContent = '❓';
      $('#ni-prompt').style.display = '';
      niKb.highlightMany([{ midi: q.midi, color: '#a78bfa', text: '?' }]);
      $('#ni-kbcap').textContent = '🎹 这个亮起来的键叫什么？';
      $('#ni-feedback').textContent = '👇 从下面选出它的音名';
    }
    $('#ni-feedback').className = 'sight-feedback';
    drawAnswers();
  }

  $('#ni-start').onclick = () => {
    if (game) {
      recordPractice('noteid', '键盘音名认知', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#ni-start').textContent = '▶ 开始练习';
      $('#ni-start').classList.remove('running');
      $('#ni-status').textContent = '已停止';
      $('#ni-answers').innerHTML = '';
      $('#ni-prompt').textContent = '—';
      niKb.clear();
      $('#ni-feedback').textContent = '选好设置，按"开始"出题';
      $('#ni-feedback').className = 'sight-feedback';
      ['ni-mode', 'ni-range'].forEach((id) => { const e = document.getElementById(id); if (e) e.disabled = false; });
      return;
    }
    game = new NoteIdGame({ mode, midiMin: range.min, midiMax: range.max, whiteOnly, useOctave, choiceCount: 4 });
    niKb.scrollToShow(range.min, Math.min(range.max, range.min + 24));
    $('#ni-start').textContent = '⏸ 停止练习';
    $('#ni-start').classList.add('running');
    $('#ni-status').textContent = '进行中…';
    ['ni-mode', 'ni-range'].forEach((id) => { const e = document.getElementById(id); if (e) e.disabled = true; });
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 51: 五线谱识谱卡（staff reading）==========
function renderStaffRead() {
  const root = $('#module-staffread');
  let game = null;
  let mode = 'name';     // name | key
  let clefs = 'treble';  // treble | bass | grand
  let useOctave = false;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 五线谱识谱卡</h2>
    <p style="color:var(--muted);margin-bottom:14px">看懂五线谱的<b>第一步</b>：屏幕在五线谱上画一个音符，你<b>说出它的音名</b>。这是"看谱→音名→键位"读谱链的中间环（和"键盘音名认知"配合，从此读谱不再靠数线）。两种练法：<b>看谱选音名</b>（从选项里选）、<b>看谱点键</b>（在 88 键上点出它）。答完显示<b>口诀提示</b>（高音谱号线 EGBDF·间 FACE / 低音谱号线 GBDFA·间 ACEG）并把音画在键盘上。可选谱号（高音/低音/大谱表）。和"视奏闪卡"（必须真弹）不同——这里纯认读，零基础也能上手。无需连琴，成绩入仪表盘。</p>

    <div class="card-panel">
      <div class="param-row"><label>练习方式</label>
        <select id="sr-mode">
          <option value="name">看谱选音名</option>
          <option value="key">看谱点键</option>
        </select></div>
      <div class="param-row"><label>谱号</label>
        <select id="sr-clef">
          <option value="treble">高音谱号 𝄞</option>
          <option value="bass">低音谱号 𝄢</option>
          <option value="grand">大谱表（两谱号随机）</option>
        </select></div>
      <div class="param-row"><label>音名带八度</label>
        <div class="ear-chips" id="sr-oct-chips">
          <button class="ear-chip on" data-o="0">只音名 (C)</button>
          <button class="ear-chip" data-o="1">带八度 (C4)</button>
        </div></div>
    </div>

    <div class="sight-stage">
      <div class="sight-staff-wrap"><div id="sr-staff"></div></div>
      <div id="sr-feedback" class="sight-feedback">选好设置，按"开始"出题</div>
      <div id="sr-tip" class="mid-hint"></div>
    </div>

    <div class="ear-answers" id="sr-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap" id="sr-kbcap">🎹 答完会把这个音画在 88 键上</div>
      <div id="sr-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="sr-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sr-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sr-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sr-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="sr-start" class="big-btn">▶ 开始练习</button>
      <span id="sr-status" style="color:var(--muted)">未开始</span>
    </div>`;

  const CLEF_GLYPH = { treble: '𝄞', bass: '𝄢' };
  function drawStaff(note, clef) {
    const W = 240, H = 200;
    const topY = 64, stepPx = 7;
    const yForPos = (pos) => topY + (8 - pos) * stepPx;
    let svg = `<svg viewBox="0 0 ${W} ${H}" class="sight-svg" preserveAspectRatio="xMidYMid meet">`;
    for (let p = 0; p <= 8; p += 2) {
      const y = yForPos(p);
      svg += `<line x1="30" y1="${y}" x2="${W - 16}" y2="${y}" class="staff-line"/>`;
    }
    svg += `<text x="38" y="${yForPos(2) + 6}" class="clef-glyph">${CLEF_GLYPH[clef] || CLEF_GLYPH.treble}</text>`;
    if (note != null) {
      const pos = srStaffPos(note, clef);
      const cy = yForPos(pos);
      const cx = 150;
      if (pos > 8) { for (let p = 10; p <= pos; p += 2) svg += `<line x1="${cx - 16}" y1="${yForPos(p)}" x2="${cx + 16}" y2="${yForPos(p)}" class="ledger-line"/>`; }
      if (pos < 0) { for (let p = -2; p >= pos; p -= 2) svg += `<line x1="${cx - 16}" y1="${yForPos(p)}" x2="${cx + 16}" y2="${yForPos(p)}" class="ledger-line"/>`; }
      svg += `<g transform="translate(${cx},${cy})"><ellipse rx="10" ry="7.5" transform="rotate(-20)" class="note-head"/></g>`;
    }
    svg += `</svg>`;
    $('#sr-staff').innerHTML = svg;
  }

  function flash(ok) {
    const wrap = $('#sr-staff').closest('.sight-staff-wrap');
    if (!wrap) return;
    wrap.classList.remove('flash-ok', 'flash-no');
    void wrap.offsetWidth;
    wrap.classList.add(ok ? 'flash-ok' : 'flash-no');
  }

  drawStaff(null, 'treble');

  const srKb = new PianoKeyboard($('#sr-kb'), {
    labels: 'c',
    onNoteOn: (m) => {
      playTone(midiToFreq(m), 0, 0.6);
      if (game && game.current && mode === 'key' && !answering) answerKey(m);
    },
  });
  srKb.scrollToShow(48, 79);

  $('#sr-mode').onchange = () => { if (!game) mode = $('#sr-mode').value; };
  $('#sr-clef').onchange = () => { if (!game) { clefs = $('#sr-clef').value; drawStaff(null, clefs === 'grand' ? 'treble' : clefs); } };
  $('#sr-oct-chips').querySelectorAll('.ear-chip').forEach((b) => {
    b.onclick = () => {
      if (game) return;
      $('#sr-oct-chips').querySelectorAll('.ear-chip').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      useOctave = b.dataset.o === '1';
    };
  });

  function refreshStats() {
    $('#sr-score').textContent = game.score;
    $('#sr-streak').textContent = game.streak;
    $('#sr-best').textContent = game.best;
    $('#sr-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  let answering = false;

  function showResult(correct) {
    refreshStats();
    flash(correct);
    $('#sr-tip').textContent = '💡 ' + game.current.tip;
    srKb.highlightMany([{ midi: game.current.midi, color: correct ? '#34d399' : '#fbbf24', text: game.current.name }]);
    const fb = $('#sr-feedback');
    if (correct) { fb.textContent = `✅ 对了！这是 ${game.current.name} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${game.current.name}`; fb.className = 'sight-feedback no'; }
    setTimeout(() => { if (game) nextQuestion(); }, 1800);
  }

  function answerName(name) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctName = game.current.name;
    const correct = game.check(name);
    $('#sr-answers').querySelectorAll('.ear-ans').forEach((b) => {
      if (b.dataset.n === correctName) b.classList.add('correct');
      else if (b.dataset.n === name) b.classList.add('wrong');
      b.disabled = true;
    });
    showResult(correct);
  }

  function answerKey(m) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correct = game.check(m);
    showResult(correct);
  }

  function drawAnswers() {
    const wrap = $('#sr-answers');
    if (mode !== 'name') { wrap.innerHTML = ''; return; }
    wrap.innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-n="${c}">${c}</button>`).join('');
    wrap.querySelectorAll('.ear-ans').forEach((b) => { b.onclick = () => answerName(b.dataset.n); });
  }

  function nextQuestion() {
    answering = false;
    game.next();
    srKb.clear();
    $('#sr-tip').textContent = '';
    drawStaff(game.current.midi, game.current.clef);
    if (mode === 'name') {
      $('#sr-kbcap').textContent = '🎹 答完会把这个音画在 88 键上';
      $('#sr-feedback').textContent = '🎼 五线谱上这个音叫什么？';
    } else {
      $('#sr-kbcap').textContent = '🎹 在键盘上点出五线谱上这个音' + (game.octaveAgnostic ? '（任意八度同名键都行）' : '');
      $('#sr-feedback').textContent = '🎼 在键盘上点出这个音';
    }
    $('#sr-feedback').className = 'sight-feedback';
    drawAnswers();
  }

  $('#sr-start').onclick = () => {
    if (game) {
      recordPractice('staffread', '五线谱识谱卡', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#sr-start').textContent = '▶ 开始练习';
      $('#sr-start').classList.remove('running');
      $('#sr-status').textContent = '已停止';
      $('#sr-answers').innerHTML = '';
      $('#sr-tip').textContent = '';
      srKb.clear();
      drawStaff(null, clefs === 'grand' ? 'treble' : clefs);
      $('#sr-feedback').textContent = '选好设置，按"开始"出题';
      $('#sr-feedback').className = 'sight-feedback';
      ['sr-mode', 'sr-clef'].forEach((id) => { const e = document.getElementById(id); if (e) e.disabled = false; });
      return;
    }
    game = new StaffReadGame({ mode, clefs, useOctave, octaveAgnostic: true, choiceCount: 4 });
    $('#sr-start').textContent = '⏸ 停止练习';
    $('#sr-start').classList.add('running');
    $('#sr-status').textContent = '进行中…';
    ['sr-mode', 'sr-clef'].forEach((id) => { const e = document.getElementById(id); if (e) e.disabled = true; });
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 46: 唱名/音级听辨（solfège）==========
function renderSolfege() {
  const root = $('#module-solfege');
  let game = null;
  let scaleType = 'major';
  const enabled = new Set([1, 2, 3, 4, 5, 6, 7]);
  let choiceCount = 4;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎵 唱名听辨</h2>
    <p style="color:var(--muted);margin-bottom:14px">视唱练耳的<b>地基</b>：先听一个<b>主和弦</b>建立调性（这是"Do"在哪），再听一个音，判断它是音阶里的<b>第几级</b>（唱名 Do Re Mi Fa Sol La Ti / 1-7）。诀窍：<b>Ti（7）强烈想往 Do 走</b>、<b>Fa（4）想解决到 Mi（3）</b>、<b>Sol（5）和 Do（1）最稳</b>。和"音程听辨"（听两音距离）不同——这里练<b>调性感/相对音高</b>，是即兴扒谱视唱的核心。无需连琴（纯听辨多选）。</p>

    <div class="card-panel">
      <div class="param-row"><label>调式</label>
        <div class="ear-chips" id="sol-scale">
          <button class="ear-chip on" data-s="major">大调</button>
          <button class="ear-chip" data-s="minor">小调</button>
        </div></div>
      <div class="param-row" style="align-items:flex-start"><label>音级范围</label>
        <div class="ear-chips" id="sol-degs"></div></div>
      <div class="param-row"><label>选项数量</label>
        <select id="sol-cc">
          <option value="3">3 选 1（入门）</option>
          <option value="4" selected>4 选 1（进阶）</option>
          <option value="7">7 选 1（全部）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div id="sol-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="sol-hint" class="sol-hint"></div>
    </div>

    <div class="rotate-bar" style="justify-content:center;gap:10px;margin-bottom:8px">
      <button id="sol-key" class="big-btn" disabled>🎹 再听主和弦</button>
      <button id="sol-replay" class="big-btn" disabled>🔊 再听这个音</button>
    </div>

    <div class="ear-answers" id="sol-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完显示在 88 键上 — <span class="kb-legend" style="color:#5b8cff"><i></i>主和弦(Do的位置)</span> <span class="kb-legend" style="color:#fbbf24"><i></i>这个音</span>（点键试听）</div>
      <div id="sol-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="sol-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sol-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sol-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sol-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="sol-start" class="big-btn">▶ 开始练习</button>
      <span id="sol-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawDegs() {
    $('#sol-degs').innerHTML = SOL_DEGREES.map((d) =>
      `<button class="ear-chip ${enabled.has(d.degree) ? 'on' : ''}" data-d="${d.degree}">${d.degree} ${solSyllable(d.degree, scaleType)}</button>`).join('');
    $('#sol-degs').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const d = +b.dataset.d;
        if (enabled.has(d)) { if (enabled.size > 2) enabled.delete(d); } else enabled.add(d);
        drawDegs();
      };
    });
  }
  function drawScale() {
    $('#sol-scale').querySelectorAll('.ear-chip').forEach((b) => {
      b.classList.toggle('on', b.dataset.s === scaleType);
      b.onclick = () => { if (game) return; scaleType = b.dataset.s; drawScale(); drawDegs(); };
    });
  }
  drawScale();
  drawDegs();
  $('#sol-cc').onchange = () => { if (!game) choiceCount = +$('#sol-cc').value; };

  const solKb = new PianoKeyboard($('#sol-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  solKb.scrollToShow(55, 79);

  function refreshStats() {
    $('#sol-score').textContent = game.score;
    $('#sol-streak').textContent = game.streak;
    $('#sol-best').textContent = game.best;
    $('#sol-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function playKey() {
    const tri = game.triad();
    tri.forEach((n, i) => playTone(midiToFreq(n), i * 0.16, 0.5, 0.16));
  }
  function playTarget() {
    const t = game.target();
    if (t != null) playTone(midiToFreq(t), 0, 0.7, 0.22);
  }
  function playBoth() {
    playKey();
    setTimeout(() => { if (game && game.current) playTarget(); }, 750);
  }

  function drawAnswers() {
    $('#sol-answers').innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-d="${c.degree}">${c.syllable}<small>${c.degree} · ${c.fn}</small></button>`).join('');
    $('#sol-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(+b.dataset.d, b);
    });
  }

  let answering = false;
  function answer(deg, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctDeg = game.current.degree;
    const correct = game.check(deg);
    refreshStats();
    $('#sol-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const d = +b.dataset.d;
      if (d === correctDeg) b.classList.add('correct');
      else if (d === deg) b.classList.add('wrong');
      b.disabled = true;
    });
    const info = SOL_DEGREES.find((x) => x.degree === correctDeg);
    $('#sol-hint').textContent = '💡 ' + solSyllable(correctDeg, scaleType) + '（' + info.fn + '）：' + info.hint;
    const fb = $('#sol-feedback');
    const label = correctDeg + ' ' + solSyllable(correctDeg, scaleType);
    if (correct) { fb.textContent = `✅ 对了！是 ${label} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${label}`; fb.className = 'sight-feedback no'; }
    const tri = game.triad() || [];
    const tgt = game.target();
    const items = tri.map((n) => ({ midi: n, color: '#5b8cff' }));
    if (tgt != null) items.push({ midi: tgt, color: '#fbbf24', text: String(correctDeg) });
    solKb.highlightMany(items);
    playTarget();
    setTimeout(() => { if (game) nextQuestion(); }, 1900);
  }

  function nextQuestion() {
    answering = false;
    game.next();
    solKb.clear();
    drawAnswers();
    $('#sol-hint').textContent = '';
    $('#sol-feedback').textContent = '🤔 这是第几级（哪个唱名）？';
    $('#sol-feedback').className = 'sight-feedback';
    $('#sol-key').disabled = false;
    $('#sol-replay').disabled = false;
    playBoth();
  }

  $('#sol-key').onclick = () => { if (game && game.current) playKey(); };
  $('#sol-replay').onclick = () => { if (game && game.current) playTarget(); };

  $('#sol-start').onclick = () => {
    if (game) {
      recordPractice('solfege', '唱名听辨', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#sol-start').textContent = '▶ 开始练习';
      $('#sol-start').classList.remove('running');
      $('#sol-status').textContent = '已停止';
      $('#sol-answers').innerHTML = '';
      $('#sol-hint').textContent = '';
      $('#sol-key').disabled = true;
      $('#sol-replay').disabled = true;
      $('#sol-feedback').textContent = '选好范围，按"开始"出题';
      $('#sol-feedback').className = 'sight-feedback';
      drawScale(); drawDegs();
      return;
    }
    game = new SolfegeGame({ scaleType, degrees: [...enabled], choiceCount });
    $('#sol-start').textContent = '⏸ 停止练习';
    $('#sol-start').classList.add('running');
    $('#sol-status').textContent = '进行中…';
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 47: 和弦性质听辨（chord quality）==========
function renderChordQuality() {
  const root = $('#module-cquality');
  let game = null;
  const enabled = new Set(['major', 'minor', 'augmented', 'diminished']);
  let choiceCount = 4;
  let playMode = 'both'; // chord | arp | both

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 和弦性质听辨</h2>
    <p style="color:var(--muted);margin-bottom:14px">🔊 听一个<b>和弦</b>，辨认它的<b>性质/类型</b>：大三/小三/增三/减三（三和弦）或属七/大七/小七/半减七/减七（七和弦）。诀窍：<b>大三明亮、小三忧郁</b>、<b>增三悬浮对称、减三不安想解决</b>、<b>属七想解决（蓝调）、大七柔和明亮（爵士）、减七极度紧张</b>。和"和弦转位"（练同一和弦的排列）不同——这里练<b>和弦色彩/类型</b>，是和声听觉的地基。可先听整块和弦再听琶音。无需连琴（纯听辨多选）。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>和弦范围</label>
        <div class="ear-chips" id="cq-chips"></div></div>
      <div class="param-row"><label>播放方式</label>
        <div class="ear-chips" id="cq-play">
          <button class="ear-chip" data-p="chord">仅整块</button>
          <button class="ear-chip" data-p="arp">仅琶音</button>
          <button class="ear-chip on" data-p="both">整块+琶音</button>
        </div></div>
      <div class="param-row"><label>选项数量</label>
        <select id="cq-cc">
          <option value="3">3 选 1（入门）</option>
          <option value="4" selected>4 选 1（进阶）</option>
          <option value="9">9 选 1（全部）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div id="cq-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="cq-hint" class="cq-hint"></div>
    </div>

    <div class="rotate-bar" style="justify-content:center;margin-bottom:8px">
      <button id="cq-replay" class="big-btn" disabled>🔊 再听一次</button>
    </div>

    <div class="ear-answers" id="cq-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把这个和弦的音画在 88 键上（数字=从根音起第几个音，点键可试听）</div>
      <div id="cq-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="cq-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cq-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cq-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cq-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="cq-start" class="big-btn">▶ 开始练习</button>
      <span id="cq-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawChips() {
    $('#cq-chips').innerHTML = CQ_QUALITIES.map((q) =>
      `<button class="ear-chip ${enabled.has(q.id) ? 'on' : ''}" data-q="${q.id}">${q.name}</button>`).join('');
    $('#cq-chips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const q = b.dataset.q;
        if (enabled.has(q)) { if (enabled.size > 2) enabled.delete(q); } else enabled.add(q);
        drawChips();
      };
    });
  }
  function drawPlay() {
    $('#cq-play').querySelectorAll('.ear-chip').forEach((b) => {
      b.classList.toggle('on', b.dataset.p === playMode);
      b.onclick = () => { playMode = b.dataset.p; drawPlay(); };
    });
  }
  drawChips();
  drawPlay();
  $('#cq-cc').onchange = () => { if (!game) choiceCount = +$('#cq-cc').value; };

  const cqKb = new PianoKeyboard($('#cq-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  cqKb.scrollToShow(48, 72);

  function refreshStats() {
    $('#cq-score').textContent = game.score;
    $('#cq-streak').textContent = game.streak;
    $('#cq-best').textContent = game.best;
    $('#cq-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function playChord() {
    const seq = game.notes();
    if (playMode === 'chord' || playMode === 'both') {
      seq.forEach((n) => playTone(midiToFreq(n), 0, 1.1, 0.16));
    }
    if (playMode === 'arp' || playMode === 'both') {
      const delay = playMode === 'both' ? 1.25 : 0;
      seq.forEach((n, i) => playTone(midiToFreq(n), delay + i * 0.34, 0.4, 0.18));
    }
  }

  function drawAnswers() {
    $('#cq-answers').innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-q="${c.id}">${c.name}${c.symbol ? `<small>${c.symbol}</small>` : '<small>&nbsp;</small>'}</button>`).join('');
    $('#cq-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(b.dataset.q, b);
    });
  }

  let answering = false;
  function answer(qid, btn) {
    if (!game || !game.current || answering) return;
    answering = true;
    const correctId = game.current.quality.id;
    const correct = game.check(qid);
    refreshStats();
    $('#cq-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const q = b.dataset.q;
      if (q === correctId) b.classList.add('correct');
      else if (q === qid) b.classList.add('wrong');
      b.disabled = true;
    });
    $('#cq-hint').textContent = '💡 ' + game.current.quality.hint;
    const fb = $('#cq-feedback');
    if (correct) { fb.textContent = `✅ 对了！${cqName(correctId)} · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
    else { fb.textContent = `❌ 不对，正确答案是 ${cqName(correctId)}`; fb.className = 'sight-feedback no'; }
    const seq = game.notes() || [];
    cqKb.highlightMany(seq.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
    setTimeout(() => { if (game) nextQuestion(); }, 1900);
  }

  function nextQuestion() {
    answering = false;
    game.next();
    cqKb.clear();
    drawAnswers();
    $('#cq-hint').textContent = '';
    $('#cq-feedback').textContent = '🤔 这是什么和弦？';
    $('#cq-feedback').className = 'sight-feedback';
    $('#cq-replay').disabled = false;
    playChord();
  }

  $('#cq-replay').onclick = () => { if (game && game.current) playChord(); };

  $('#cq-start').onclick = () => {
    if (game) {
      recordPractice('cquality', '和弦性质听辨', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#cq-start').textContent = '▶ 开始练习';
      $('#cq-start').classList.remove('running');
      $('#cq-status').textContent = '已停止';
      $('#cq-answers').innerHTML = '';
      $('#cq-hint').textContent = '';
      $('#cq-replay').disabled = true;
      $('#cq-feedback').textContent = '选好范围，按"开始"出题';
      $('#cq-feedback').className = 'sight-feedback';
      drawChips();
      return;
    }
    game = new ChordQualityGame({ qualities: [...enabled], choiceCount });
    $('#cq-start').textContent = '⏸ 停止练习';
    $('#cq-start').classList.add('running');
    $('#cq-status').textContent = '进行中…';
    refreshStats();
    nextQuestion();
  };
}

// ========== 模块 48: 和声进行听辨（harmonic progression）==========
function renderProgressionEar() {
  const root = $('#module-progear');
  let game = null;
  const enabled = new Set(PE_PROGS.map((p) => p.id));
  let choiceCount = 4;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎶 和声进行听辨</h2>
    <p style="color:var(--muted);margin-bottom:14px">🔊 听一段<b>大调和弦进行</b>，逐个辨认每个和弦的<b>罗马数字级数</b>（I ii iii IV V vi vii°）。第一个和弦固定是主和弦 <b>I</b>（给你当锚点），之后听辨每个和弦在调里的<b>功能/走向</b>。诀窍：<b>V 强烈想回 I</b>、<b>IV 下属明亮</b>、<b>vi 是忧郁的关系小调</b>、<b>vii° 极不稳定</b>。和"和弦进行"（看级数弹出和弦）不同——这里练<b>和声功能/进行走向听觉</b>，是扒和弦/即兴/编配的核心。无需连琴（纯听辨多选）。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>进行范围</label>
        <div class="ear-chips" id="pe-chips"></div></div>
      <div class="param-row"><label>选项数量</label>
        <select id="pe-cc">
          <option value="3">3 选 1（入门）</option>
          <option value="4" selected>4 选 1（进阶）</option>
          <option value="7">7 选 1（全部）</option>
        </select></div>
    </div>

    <div class="sight-stage">
      <div id="pe-slots" class="pe-slots"></div>
      <div id="pe-feedback" class="sight-feedback">选好范围，按"开始"出题</div>
      <div id="pe-hint" class="pe-hint"></div>
    </div>

    <div class="rotate-bar" style="justify-content:center;margin-bottom:8px">
      <button id="pe-replay" class="big-btn" disabled>🔊 再听整段</button>
    </div>

    <div class="ear-answers" id="pe-answers"></div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 答完把当前这个和弦的音画在 88 键上（数字=和弦内第几个音，点键可试听）</div>
      <div id="pe-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="pe-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="pe-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="pe-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="pe-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="pe-start" class="big-btn">▶ 开始练习</button>
      <span id="pe-status" style="color:var(--muted)">未开始</span>
    </div>`;

  function drawChips() {
    $('#pe-chips').innerHTML = PE_PROGS.map((p) =>
      `<button class="ear-chip ${enabled.has(p.id) ? 'on' : ''}" data-p="${p.id}">${p.name}</button>`).join('');
    $('#pe-chips').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (game) return;
        const p = b.dataset.p;
        if (enabled.has(p)) { if (enabled.size > 1) enabled.delete(p); } else enabled.add(p);
        drawChips();
      };
    });
  }
  drawChips();
  $('#pe-cc').onchange = () => { if (!game) choiceCount = +$('#pe-cc').value; };

  const peKb = new PianoKeyboard($('#pe-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  peKb.scrollToShow(48, 72);

  function refreshStats() {
    $('#pe-score').textContent = game.score;
    $('#pe-streak').textContent = game.streak;
    $('#pe-best').textContent = game.best;
    $('#pe-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  // slots: 已辨认显示罗马数字；当前高亮；未到的显示 ?
  function drawSlots(revealAll) {
    const chords = game.chords();
    const idx = game.index();
    $('#pe-slots').innerHTML = chords.map((c, i) => {
      let cls = 'pe-slot';
      let txt;
      if (i === 0) { txt = c.roman; cls += ' given'; }
      else if (revealAll || i < idx) { txt = c.roman; cls += ' done'; }
      else if (i === idx) { txt = '?'; cls += ' active'; }
      else { txt = '·'; cls += ' future'; }
      return `<span class="${cls}">${txt}</span>`;
    }).join('<span class="pe-arrow">→</span>');
  }

  function playProgression() {
    const seq = game.progressionNotes();
    let t = 0;
    seq.forEach((notes) => {
      notes.forEach((n) => playTone(midiToFreq(n), t, 0.92, 0.15));
      t += 1.0;
    });
  }
  function playChordAt(i) {
    const seq = game.progressionNotes();
    if (seq[i]) seq[i].forEach((n) => playTone(midiToFreq(n), 0, 1.0, 0.16));
  }

  function drawAnswers() {
    const ch = game.currentChord();
    if (!ch) { $('#pe-answers').innerHTML = ''; return; }
    $('#pe-answers').innerHTML = game.choices().map((c) =>
      `<button class="ear-ans" data-d="${c.degree}">${c.roman}<small>${c.name}</small></button>`).join('');
    $('#pe-answers').querySelectorAll('.ear-ans').forEach((b) => {
      b.onclick = () => answer(+b.dataset.d, b);
    });
  }

  let answering = false;
  function answer(deg, btn) {
    if (!game || answering || game.isComplete()) return;
    const ch = game.currentChord();
    if (!ch) return;
    answering = true;
    const correctDeg = ch.degree;
    const slotIdx = game.index();
    const correct = game.check(deg);
    refreshStats();
    $('#pe-answers').querySelectorAll('.ear-ans').forEach((b) => {
      const d = +b.dataset.d;
      if (d === correctDeg) b.classList.add('correct');
      else if (d === deg) b.classList.add('wrong');
      b.disabled = true;
    });
    const info = PE_DEGREES.find((x) => x.degree === correctDeg);
    $('#pe-hint').textContent = '💡 ' + info.roman + ' ' + info.name + '：' + info.hint;
    drawSlots(false);
    playChordAt(slotIdx);
    const seq = game.progressionNotes()[slotIdx] || [];
    peKb.highlightMany(seq.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
    const fb = $('#pe-feedback');
    if (game.isComplete()) {
      if (correct) { fb.textContent = `✅ ${info.roman} 对了！整段完成 · 连击 ${game.streak}`; fb.className = 'sight-feedback ok'; }
      else { fb.textContent = `❌ 该和弦是 ${info.roman} · 整段完成`; fb.className = 'sight-feedback no'; }
      drawSlots(true);
      setTimeout(() => { if (game) nextProgression(); }, 2100);
    } else {
      if (correct) { fb.textContent = `✅ ${info.roman} 对了！下一个和弦…`; fb.className = 'sight-feedback ok'; }
      else { fb.textContent = `❌ 该和弦是 ${info.roman}，继续下一个…`; fb.className = 'sight-feedback no'; }
      setTimeout(() => {
        if (!game) return;
        answering = false;
        peKb.clear();
        drawAnswers();
        $('#pe-hint').textContent = '';
        $('#pe-feedback').textContent = `🤔 第 ${game.index() + 1} 个和弦是什么级数？`;
        $('#pe-feedback').className = 'sight-feedback';
      }, 1400);
    }
  }

  function nextProgression() {
    answering = false;
    game.next();
    peKb.clear();
    drawSlots(false);
    drawAnswers();
    $('#pe-hint').textContent = '';
    $('#pe-feedback').textContent = '🤔 第 2 个和弦是什么级数？（第 1 个已给 = I）';
    $('#pe-feedback').className = 'sight-feedback';
    $('#pe-replay').disabled = false;
    playProgression();
  }

  $('#pe-replay').onclick = () => { if (game && game.current) playProgression(); };

  $('#pe-start').onclick = () => {
    if (game) {
      recordPractice('progear', '和声进行听辨', game.attempts, game.score, game.best);
      game = null; answering = false;
      $('#pe-start').textContent = '▶ 开始练习';
      $('#pe-start').classList.remove('running');
      $('#pe-status').textContent = '已停止';
      $('#pe-slots').innerHTML = '';
      $('#pe-answers').innerHTML = '';
      $('#pe-hint').textContent = '';
      $('#pe-replay').disabled = true;
      $('#pe-feedback').textContent = '选好范围，按"开始"出题';
      $('#pe-feedback').className = 'sight-feedback';
      drawChips();
      return;
    }
    game = new ProgressionEarGame({ progressions: [...enabled], choiceCount });
    $('#pe-start').textContent = '⏸ 停止练习';
    $('#pe-start').classList.add('running');
    $('#pe-status').textContent = '进行中…';
    refreshStats();
    nextProgression();
  };
}

// ---------- 模块切换 ----------
function switchModule(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.module === name));
  document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m.id === `module-${name}`));
  const crumb = $('#active-crumb');
  const btn = document.querySelector(`.nav-btn[data-module="${name}"]`);
  if (crumb) crumb.textContent = btn ? btn.textContent.trim() : '';
  const content = $('#content');
  if (content) content.scrollTop = 0;
  if (name === 'dash' && dashboardOnUpdate) dashboardOnUpdate();
}

// 侧边栏模块搜索：按标题文字实时过滤导航按钮，隐藏空分组
function setupNavSearch() {
  const input = $('#nav-search');
  if (!input) return;
  const groups = [...document.querySelectorAll('.nav-group')];
  const empty = $('#nav-empty');
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let anyVisible = false;
    groups.forEach((g) => {
      let groupHas = false;
      g.querySelectorAll('.nav-btn').forEach((b) => {
        const match = !q || b.textContent.toLowerCase().includes(q);
        b.classList.toggle('hide-search', !match);
        if (match) groupHas = true;
      });
      g.style.display = groupHas ? '' : 'none';
      if (groupHas) anyVisible = true;
    });
    if (empty) empty.hidden = anyVisible;
  };
  input.addEventListener('input', apply);
  // Esc 清空搜索
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; apply(); input.blur(); }
  });
}

// ---------- 模块20：练习成就仪表盘 ----------
function renderDashboard() {
  const root = $('#module-dash');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🏆 练习成就仪表盘</h2>
    <p style="color:var(--muted);margin-bottom:14px">汇总各训练模块（视奏 / 听辨 / 力度 / 音阶）的练习成绩，记录连续天数、最佳连击，解锁成就徽章。每天练一点，看着进度长大。</p>

    <div id="dash-cards" class="dash-cards"></div>

    <div class="card-panel">
      <div class="dash-section-title">最近 7 天</div>
      <div id="dash-chart" class="dash-chart"></div>
    </div>

    <div class="card-panel">
      <div class="dash-section-title">模块细分</div>
      <div id="dash-modules"></div>
    </div>

    <div class="card-panel">
      <div class="dash-section-title">成就徽章 <span id="dash-badge-count" style="color:var(--muted);font-weight:normal"></span></div>
      <div id="dash-badges" class="dash-badges"></div>
    </div>

    <div class="rotate-bar">
      <button id="dash-reset" class="big-btn" style="background:var(--panel2)">🗑 重置统计</button>
    </div>`;

  const esc = (s) => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function paint() {
    const s = practiceStats.snapshot();
    // 概览卡片
    $('#dash-cards').innerHTML = [
      ['🎵', '总练习次数', s.totalSessions],
      ['🎯', '总体正确率', s.totalAttempts ? Math.round(s.accuracy * 100) + '%' : '—'],
      ['📅', '连续天数', s.dayStreak + ' 天'],
      ['🔥', '最佳连击', s.bestStreak],
      ['💯', '累计答对', s.totalCorrect],
    ].map(([icon, lbl, val]) => `
      <div class="dash-card">
        <div class="dash-card-icon">${icon}</div>
        <div class="dash-card-num">${val}</div>
        <div class="dash-card-lbl">${lbl}</div>
      </div>`).join('');

    // 最近 7 天柱状图
    const days = practiceStats.recentDays(7);
    const max = Math.max(1, ...days.map(d => d.sessions));
    $('#dash-chart').innerHTML = days.map(d => {
      const h = Math.round((d.sessions / max) * 100);
      const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(d.day + 'T00:00:00').getDay()];
      return `<div class="dash-bar-col" title="${d.day}：${d.sessions} 次">
        <div class="dash-bar-val">${d.sessions || ''}</div>
        <div class="dash-bar" style="height:${Math.max(4, h)}%"></div>
        <div class="dash-bar-lbl">${wd}</div>
      </div>`;
    }).join('');

    // 模块细分
    const mods = practiceStats.moduleStats();
    $('#dash-modules').innerHTML = mods.length ? `
      <table class="dash-table">
        <thead><tr><th>模块</th><th>次数</th><th>答题</th><th>正确率</th><th>最佳连击</th></tr></thead>
        <tbody>${mods.map(m => `<tr>
          <td>${esc(m.label)}</td><td>${m.sessions}</td><td>${m.attempts}</td>
          <td>${m.attempts ? Math.round(m.accuracy * 100) + '%' : '—'}</td><td>${m.bestStreak}</td>
        </tr>`).join('')}</tbody>
      </table>` : '<p class="dash-empty">还没有练习记录，去做一组训练吧！</p>';

    // 成就徽章墙
    const ach = practiceStats.allAchievements();
    $('#dash-badges').innerHTML = ach.map(a => {
      const cls = a.unlocked ? 'unlocked' : (a.ready ? 'ready' : 'locked');
      return `<div class="dash-badge ${cls}" title="${esc(a.desc)}">
        <div class="dash-badge-icon">${a.unlocked || a.ready ? a.icon : '🔒'}</div>
        <div class="dash-badge-name">${esc(a.name)}</div>
        <div class="dash-badge-desc">${esc(a.desc)}</div>
      </div>`;
    }).join('');
    const unlocked = ach.filter(a => a.unlocked).length;
    $('#dash-badge-count').textContent = `${unlocked} / ${ach.length}`;
  }
  dashboardOnUpdate = paint;
  $('#dash-reset').onclick = () => {
    if (confirm('确定清空所有练习统计和成就？此操作不可撤销。')) {
      practiceStats.reset();
      paint();
      log('练习统计已重置', 'ok');
    }
  };
  paint();
}

// ---------- 模块45：曲谱跟弹（Synthesia 式）----------
function renderScoreFollow() {
  const root = $('#module-scf');
  let sf = null;            // ScoreFollow 引擎实例
  let raf = null;           // requestAnimationFrame 句柄
  let t0 = 0;               // 播放起点（performance.now() 基准 + 前导拍）
  let mode = null;          // 'demo' | 'wait' | 'practice'
  let songId = SCF_SONGS[0].id;
  let speed = 1;            // 速度倍率
  let easy = true;          // 简单模式（忽略八度）
  let hand = 'both';        // 'both' | 'r' | 'l' 练哪只手（仅 MIDI 含左右手时可选）
  const customSongs = [];   // 用户上传的 MIDI 曲目
  let groups = [];          // 等待模式的分组（同时刻音符=一组）
  let waitIdx = 0, frozen = false, waitClock = 0, lastNow = 0; // 等待模式状态机
  const LEAD_MS = 1900;     // 前导：第一个音落下前的缓冲
  const LOOK_MS = 2200;     // 下落高速路向前看的时间窗
  const HW_H = 196;         // 高速路高度（px）
  let kbFirst = 60, kbLast = 72;
  let layout = null, centerX = new Map();
  let demoPlayed = new Set();
  let labelsOn = true;      // ① 下落音符上显示音名标签
  let metroOn = false;      // ④ 节拍器（跟随播放头）
  let progSpeed = false;    // ⑨ 渐进提速
  let lastBeat = -1;        // 节拍器：上一次触发的整拍
  let hintUntil = 0;        // ⑥ 等待模式提示高亮的截止时刻
  let lastDrawT = 0;        // 最近一次绘制的播放头时间（标签切换时重绘用）
  let loopOn = false;       // ③ 区间循环开关
  let velViz = true;        // ② 力度可视化（上传 MIDI 的 velocity → 音符块亮度）
  let fxOn = true;          // ✨ 击中特效（粒子迸发 / 判定线发光 / 连击闪光）
  let realPiano = false;    // ④ 示范/提示在 CA99 真琴发声
  const realOn = new Set(); // ④ 已发 Note On 待关闭的音（防漏关）
  let loopFrom = 1, loopTo = 1;        // 循环起止小节（1-based，含）
  let loopStartBeat = 0, loopEndBeat = 0, loopStartMs = 0, loopEndMs = 0;
  let winNotes = [];        // 循环窗口内的音符（重置 judged 用）
  const SCF_PC = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const midiName = (m) => SCF_PC[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);

  // ③ 每首歌历史最高分（localStorage）：{songId: {stars,pct,score,combo,plays,ts}}
  const BEST_KEY = 'ca99_scf_best';
  function loadBest() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch { return {}; }
  }
  function bestOf(id) { return loadBest()[id] || null; }
  // 记录一遍成绩；返回 {best, isRecord}（是否刷新最高分）
  function recordBest(id, s) {
    const all = loadBest();
    const prev = all[id] || { stars: 0, pct: 0, score: 0, combo: 0, plays: 0 };
    const isRecord = s.accuracy > prev.pct || (s.accuracy === prev.pct && s.stars > prev.stars);
    all[id] = {
      stars: Math.max(prev.stars, s.stars),
      pct: Math.max(prev.pct, s.accuracy),
      score: Math.max(prev.score, s.score ?? 0),
      combo: Math.max(prev.combo, s.maxCombo ?? 0),
      plays: (prev.plays || 0) + 1,
      ts: Date.now(),
    };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(all)); } catch {}
    return { best: all[id], isRecord };
  }
  function bestBadgeText(id) {
    const b = bestOf(id);
    if (!b || !b.plays) return '';
    const star = '★'.repeat(b.stars) + '☆'.repeat(3 - b.stars);
    return `最佳 ${star} ${b.pct}%　练过 ${b.plays} 遍`;
  }
  function updateBestBadge() {
    const el = $('#scf-best'); if (!el) return;
    const txt = bestBadgeText(songId);
    el.textContent = txt || '还没有记录，弹一遍试试';
    el.classList.toggle('has', !!txt);
  }

  // ⑥ 练习足迹：每遍计分的演奏都记一条日志（最多留最近 200 条），供「每首练几次/近7天哪首练最多」统计
  const LOG_KEY = 'ca99_scf_log';
  function loadLog() {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]') || []; } catch { return []; }
  }
  function logPlay(id, title, s) {
    const log = loadLog();
    log.push({ id, title, ts: Date.now(), stars: s.stars, pct: s.accuracy });
    while (log.length > 200) log.shift();
    try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch {}
  }
  // 渲染练习足迹面板：每首练习次数排行 + 近 7 天每日柱状 + 本周练最多
  function renderHistory() {
    const el = $('#scf-history'); if (!el) return;
    const log = loadLog();
    const best = loadBest();
    if (!log.length) {
      el.innerHTML = `<div class="scf-hist-empty">还没有练习足迹——选一首用 🐢 等待练习 或 🎯 跟弹判分 弹一遍，这里就会记录你练了哪些曲子、各练了几遍、最近 7 天哪首练得最多。</div>`;
      return;
    }
    const titleOf = (id) => (allSongs().find((x) => x.id === id) || {}).title || (log.find((l) => l.id === id) || {}).title || id;
    // 每首练习次数排行
    const byId = {};
    log.forEach((l) => { (byId[l.id] = byId[l.id] || { id: l.id, plays: 0, lastTs: 0 }).plays++; byId[l.id].lastTs = Math.max(byId[l.id].lastTs, l.ts); });
    const rank = Object.values(byId).sort((a, b) => b.plays - a.plays);
    const maxPlays = rank[0].plays;
    const rel = (ts) => {
      const d = Math.floor((Date.now() - ts) / 86400000);
      if (d <= 0) return '今天'; if (d === 1) return '昨天'; if (d < 7) return `${d} 天前`;
      return `${Math.floor(d / 7)} 周前`;
    };
    const star = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
    const rows = rank.slice(0, 8).map((r) => {
      const b = best[r.id];
      const bestTxt = b ? `${star(b.stars)} ${b.pct}%` : '—';
      const w = Math.round((r.plays / maxPlays) * 100);
      return `<tr>
        <td class="scf-hist-name">${titleOf(r.id)}</td>
        <td class="scf-hist-bar"><span style="width:${w}%"></span><b>${r.plays}</b></td>
        <td class="scf-hist-best">${bestTxt}</td>
        <td class="scf-hist-last">${rel(r.lastTs)}</td>
      </tr>`;
    }).join('');
    // 近 7 天每日练习次数柱状
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const start = d.getTime(), end = start + 86400000;
      const cnt = log.filter((l) => l.ts >= start && l.ts < end).length;
      days.push({ label: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], cnt });
    }
    const dmax = Math.max(1, ...days.map((d) => d.cnt));
    const bars = days.map((d) => {
      const h = Math.round((d.cnt / dmax) * 56);
      return `<div class="scf-day"><span class="scf-day-bar" style="height:${Math.max(3, h)}px" title="${d.cnt} 遍"></span><span class="scf-day-n">${d.cnt || ''}</span><span class="scf-day-l">${d.label}</span></div>`;
    }).join('');
    // 本周（近 7 天）练最多
    const weekAgo = Date.now() - 7 * 86400000;
    const wk = {};
    log.filter((l) => l.ts >= weekAgo).forEach((l) => { wk[l.id] = (wk[l.id] || 0) + 1; });
    const topWk = Object.entries(wk).sort((a, b) => b[1] - a[1])[0];
    const weekLine = topWk
      ? `本周练最多：<b>${titleOf(topWk[0])}</b>　${topWk[1]} 遍`
      : '本周还没练，加油！';
    const totalPlays = log.length;
    el.innerHTML = `
      <div class="scf-hist-head">🎼 练习足迹　<span class="scf-hist-sum">累计 ${totalPlays} 遍 · ${rank.length} 首曲子 · ${weekLine}</span></div>
      <div class="scf-hist-grid">
        <table class="scf-hist-table"><thead><tr><th>曲目</th><th>练习次数</th><th>最佳</th><th>最近</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="scf-hist-week">
          <div class="scf-hist-week-cap">近 7 天</div>
          <div class="scf-days">${bars}</div>
        </div>
      </div>`;
  }

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 曲谱跟弹（Synthesia 式）</h2>
    <p style="color:var(--muted);margin-bottom:14px">音符像 <b>Synthesia</b> 一样从上往下<b>落到对应琴键</b>（块上直接标<b>音名</b>），上方 <b>五线谱</b>同步走光标——既练<b>识谱</b>又练<b>跟弹</b>。三档训练<b>由易到难</b>：🔊 听示范 → 🐢 等待练习（弹对才前进，卡住可按 💡 提示）→ 🎯 跟弹判分（按音高+时机给 <span style="color:#34d399">PERFECT</span>/<span style="color:#22d3ee">GOOD</span>/<span style="color:#f87171">MISS</span>，连对累计 Combo）。可开 🥁 <b>节拍器</b>、🐇 <b>渐进提速</b>，左右手分色显示。内置 7 首（含巴赫小步舞曲/致爱丽丝/肖邦夜曲），也能<b>上传任意 .mid/.midi 文件</b>。没接 MIDI 也能点屏幕琴键作答。</p>

    <div class="card-panel">
      <div class="param-row" style="align-items:flex-start"><label>选曲</label>
        <div class="ear-chips" id="scf-songs"></div></div>
      <div class="param-row"><label></label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <button class="ear-chip" id="scf-random" title="随机挑一首没在练的曲子">🎲 随机一首</button>
          <span style="color:var(--muted);font-size:13px">想换换口味？让它帮你随机选</span>
        </div></div>
      <div class="param-row" style="align-items:center"><label>上传 MIDI</label>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <label class="scf-upload-btn">📄 选择 .mid / .midi 文件
            <input type="file" id="scf-midi-file" accept=".mid,.midi,audio/midi" style="display:none">
          </label>
          <span style="color:var(--muted);font-size:13px">支持标准 MIDI 文件（多轨/和弦/双手/变速）</span>
        </div></div>
      <div class="param-row" style="align-items:flex-start"><label>📚 CA99 曲库</label>
        <div class="scf-lib" id="scf-lib">
          <div class="scf-lib-cats" id="scf-lib-cats"></div>
          <div class="scf-lib-search-row">
            <input type="text" id="scf-lib-search" class="scf-lib-search" placeholder="🔎 搜曲名 / 作曲家 / 分类…" spellcheck="false" autocomplete="off">
            <span class="scf-lib-count" id="scf-lib-count"></span>
          </div>
          <div class="scf-lib-list" id="scf-lib-list"></div>
          <div class="scf-lib-status" id="scf-lib-status">正在载入 CA99 自带曲库…</div>
        </div></div>
      <div class="param-row" style="align-items:flex-start"><label>🎵 我的曲库</label>
        <div class="scf-lib" id="scf-ulib">
          <div class="scf-ulib-root-row">
            <span class="scf-ulib-lbl">目录</span>
            <input type="text" id="scf-ulib-root" class="scf-lib-search" style="max-width:200px" placeholder="data" spellcheck="false" autocomplete="off">
            <button class="ear-chip" id="scf-ulib-scan">🔄 重新扫描</button>
            <span class="scf-ulib-hint">把你整理好的 .mid 放进 <code>app/&lt;目录&gt;/&lt;分类&gt;/歌曲.mid</code>（子目录即分类），点扫描即出现</span>
          </div>
          <div class="scf-lib-cats" id="scf-ulib-cats"></div>
          <div class="scf-lib-search-row">
            <input type="text" id="scf-ulib-search" class="scf-lib-search" placeholder="🔎 搜曲名 / 分类…" spellcheck="false" autocomplete="off">
            <span class="scf-lib-count" id="scf-ulib-count"></span>
          </div>
          <div class="scf-lib-list" id="scf-ulib-list"></div>
          <div class="scf-lib-status" id="scf-ulib-status">正在扫描你的曲库…</div>
        </div></div>
      <div class="param-row" style="align-items:flex-start"><label>📷 拍谱识别</label>
        <div class="scf-omr">
          <div class="scf-omr-line">
            <label class="scf-upload-btn">📷 选择乐谱图片
              <input type="file" id="scf-omr-file" accept="image/*,.pdf" style="display:none">
            </label>
            <span class="scf-omr-exp">实验功能</span>
          </div>
          <div class="scf-omr-line">
            <span class="scf-omr-lbl">OMR 服务地址</span>
            <input type="text" id="scf-omr-url" class="scf-omr-url" placeholder="http://127.0.0.1:8000/omr" spellcheck="false">
            <button class="ear-chip" id="scf-omr-save">保存</button>
          </div>
          <div class="scf-omr-hint">拍一张或上传乐谱图片，自动识别为可跟弹的 MIDI。需在本机运行 OMR 服务（如 homr），接收 <code>image</code> 表单字段、返回标准 MIDI 文件。还没服务时请用上面的「上传 MIDI」。</div>
          <div class="scf-omr-status" id="scf-omr-status"></div>
        </div></div>
      <div class="param-row" id="scf-hand-row" style="display:none"><label>练哪只手</label>
        <div class="ear-chips" id="scf-hand">
          <button class="ear-chip on" data-h="both">🙌 双手</button>
          <button class="ear-chip" data-h="r">✋ 右手</button>
          <button class="ear-chip" data-h="l">🤚 左手</button>
        </div></div>
      <div class="param-row"><label>速度</label>
        <div class="ear-chips" id="scf-speed">
          <button class="ear-chip" data-s="0.5">0.5×</button>
          <button class="ear-chip" data-s="0.75">0.75×</button>
          <button class="ear-chip on" data-s="1">1×</button>
        </div></div>
      <div class="param-row"><label>难度</label>
        <div class="ear-chips" id="scf-easy">
          <button class="ear-chip on" data-e="1">简单（忽略八度）</button>
          <button class="ear-chip" data-e="0">标准（要弹准八度）</button>
        </div></div>
      <div class="param-row"><label>辅助</label>
        <div class="ear-chips" id="scf-aux">
          <button class="ear-chip on" id="scf-aux-labels">🔤 音名标签</button>
          <button class="ear-chip" id="scf-aux-metro">🥁 节拍器</button>
          <button class="ear-chip" id="scf-aux-prog">🐢→🐇 渐进提速</button>
          <button class="ear-chip on" id="scf-aux-velviz">💪 力度可视化</button>
          <button class="ear-chip on" id="scf-aux-fx">✨ 击中特效</button>
          <button class="ear-chip" id="scf-aux-real">🎹 真琴发声</button>
        </div></div>
      <div class="param-row" id="scf-loop-row"><label>区间循环</label>
        <div class="scf-loop-ctl">
          <button class="ear-chip" id="scf-loop-on">🔁 循环此段</button>
          <span class="scf-loop-range">第
            <input type="number" id="scf-loop-from" min="1" value="1" class="scf-num"> –
            <input type="number" id="scf-loop-to" min="1" value="1" class="scf-num"> 小节</span>
          <span id="scf-loop-info" class="scf-loop-info"></span>
        </div></div>
    </div>

    <div class="scf-stage">
      <div class="scf-meta">
        <span class="scf-bpm-badge" id="scf-bpm">♩ = — BPM</span>
        <span class="scf-best-badge" id="scf-best"></span>
        <span class="scf-hand-legend" id="scf-legend" style="display:none">
          <span class="scf-leg-r">●</span> 右手　<span class="scf-leg-l">●</span> 左手
        </span>
        <button class="scf-hint-btn" id="scf-hint" disabled title="等待练习卡住时，按一下让该弹的键闪 3 秒">💡 提示</button>
      </div>
      <div class="scf-staff-wrap"><div id="scf-staff"></div></div>
      <div class="scf-highway-wrap">
        <div id="scf-highway" class="scf-highway"></div>
        <div class="scf-hitline"></div>
        <div id="scf-pop" class="scf-pop"></div>
      </div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 接上 CA99 后，<b>任何时候</b>弹真琴，这里对应的键都会<b>实时点亮</b>（屏幕镜像真琴）；落到判定线的音符也会在这里高亮；点屏幕琴键同样可作答</div>
      <div id="scf-kb"></div>
    </div>

    <div id="scf-feedback" class="sight-feedback">挑一首曲子或上传 MIDI，选一档训练开始</div>

    <div id="scf-next" class="scf-next" style="display:none"></div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="scf-score">0</span><span class="sight-stat-lbl">得分</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="scf-combo">0</span><span class="sight-stat-lbl">连对 Combo</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="scf-prog">0/0</span><span class="sight-stat-lbl">进度</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="scf-acc">—</span><span class="sight-stat-lbl">正确率</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="scf-stars">☆☆☆</span><span class="sight-stat-lbl">评星</span></div>
    </div>

    <div id="scf-timing" class="scf-timing" style="display:none"></div>

    <div class="scf-ladder">
      <button id="scf-demo" class="scf-mode-btn">🔊 听示范</button>
      <span class="scf-ladder-arrow">→</span>
      <button id="scf-wait" class="scf-mode-btn">🐢 等待练习</button>
      <span class="scf-ladder-arrow">→</span>
      <button id="scf-practice" class="scf-mode-btn primary">🎯 跟弹判分</button>
      <span id="scf-status" style="color:var(--muted);margin-left:6px">未开始</span>
    </div>

    <div id="scf-history" class="scf-history"></div>`;

  const scfKb = new PianoKeyboard($('#scf-kb'), {
    labels: 'c',
    onNoteOn: (m) => { playTone(midiToFreq(m), 0, 0.6); if (scfOnNote) scfOnNote(m, 96); },
  });

  // 键盘回显：真实 CA99 按键 → 屏幕 88 键实时点亮（任何模式都生效，初学者"屏幕镜像真琴"）。
  // 计分模式下 judge 仍会另用绿/红闪反馈；这里只负责"按下/抬起"的视觉回显，互不冲突。
  scfKbEcho = (midi) => { scfKb.press(midi); };
  scfKbEchoOff = (midi) => { scfKb.release(midi); };

  function allSongs() { return [...SCF_SONGS, ...customSongs]; }
  function getCurrentSong() { return allSongs().find((s) => s.id === songId) || SCF_SONGS[0]; }

  function drawSongChips() {
    $('#scf-songs').innerHTML = allSongs().map((s) =>
      `<button class="ear-chip ${s.id === songId ? 'on' : ''} ${s.beginner ? 'beginner' : ''}" data-id="${s.id}">${s.title}</button>`).join('');
    $('#scf-songs').querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => { if (mode) return; songId = b.dataset.id; loopFrom = 1; loopTo = 9999; hideTimingChart(); hideNext(); drawSongChips(); prepare(); onSongPicked(); };
    });
  }
  // 🐣 选中启蒙关卡时：自动开音名标签 + 引导用等待模式（零基础不计时）
  function onSongPicked() {
    const s = getCurrentSong();
    const wb = $('#scf-wait');
    if (s.beginner) {
      if (!labelsOn) { labelsOn = true; const lb = $('#scf-aux-labels'); if (lb) lb.classList.add('on'); if (sf) drawHighway(lastDrawT); }
      if (wb) wb.classList.add('beginner-pulse');
      const fb = $('#scf-feedback');
      const hasFgr = Array.isArray(s.seq) && s.seq.some((e) => e[2] != null);
      if (fb) fb.textContent = hasFgr
        ? '🐣 启蒙关卡：建议点 🐢 等待练习（不计时）。键盘上高亮的键写着该用第几根手指（1=拇指…5=小指），照着按——慢慢来！'
        : '🐣 启蒙关卡：建议点 🐢 等待练习（不计时，弹对才前进）。看键盘上高亮的键，找到就按下——慢慢来！';
    } else if (wb) {
      wb.classList.remove('beginner-pulse');
    }
  }
  function bindChips(sel, attr, apply) {
    $(sel).querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (mode) return;
        $(sel).querySelectorAll('.ear-chip').forEach((x) => x.classList.toggle('on', x === b));
        hideTimingChart();
        apply(b.dataset[attr]);
      };
    });
  }
  drawSongChips();
  setupCa99Library();   // 📚 异步载入 CA99 自带曲库浏览器
  setupUserLibrary();   // 🎵 异步扫描用户自定义曲库
  bindChips('#scf-speed', 's', (v) => { speed = parseFloat(v); prepare(); });
  bindChips('#scf-easy', 'e', (v) => { easy = (v === '1'); });
  bindChips('#scf-hand', 'h', (v) => { hand = v; prepare(); });

  // 辅助开关（独立布尔，点一下切换 .on）
  function bindToggle(sel, get, set) {
    const b = $(sel);
    b.classList.toggle('on', get());
    b.onclick = () => { set(!get()); b.classList.toggle('on', get()); };
  }
  bindToggle('#scf-aux-labels', () => labelsOn, (v) => { labelsOn = v; if (sf) drawHighway(lastDrawT); });
  bindToggle('#scf-aux-metro', () => metroOn, (v) => { metroOn = v; });
  bindToggle('#scf-aux-prog', () => progSpeed, (v) => { progSpeed = v; updateMeta(); });
  bindToggle('#scf-aux-velviz', () => velViz, (v) => { velViz = v; if (sf) drawHighway(lastDrawT); });
  bindToggle('#scf-aux-fx', () => fxOn, (v) => { fxOn = v; });
  bindToggle('#scf-aux-real', () => realPiano, (v) => { realPiano = v; if (!v) allRealOff(); });
  $('#scf-hint').onclick = doHint;

  // 🎲 随机一首：从内置+自定义里随机挑一首（尽量不重复当前）
  $('#scf-random').onclick = () => {
    if (mode) return;
    const pool = allSongs().filter((s) => s.id !== songId);
    const pick = (pool.length ? pool : allSongs())[Math.floor(Math.random() * (pool.length || allSongs().length))];
    if (!pick) return;
    songId = pick.id; loopFrom = 1; loopTo = 9999;
    hideTimingChart(); hideNext(); drawSongChips(); prepare(); onSongPicked();
    if (!pick.beginner) {
      $('#scf-feedback').textContent = `🎲 随机选中「${pick.title}」，选一档训练开始～`;
      $('#scf-feedback').className = 'sight-feedback';
    }
  };

  // ⑦ 完成后推荐去练「乐句视奏」，形成识谱闭环
  function hideNext() { const el = $('#scf-next'); if (el) { el.style.display = 'none'; el.innerHTML = ''; } }
  function showNextSuggestion() {
    const el = $('#scf-next'); if (!el) return;
    el.innerHTML = `<span class="scf-next-tip">🎼 想把这首弹得更稳？去 <b>乐句视奏</b> 脱离下落提示、纯读谱练一句：</span>
      <button class="ear-chip on" id="scf-next-sphrase">前往乐句视奏 →</button>`;
    el.style.display = '';
    $('#scf-next-sphrase').onclick = () => {
      const nav = document.querySelector('.nav-btn[data-module="sphrase"]');
      if (nav) { nav.click(); document.querySelector('#module-sphrase')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    };
  }

  // ① 三星庆祝彩屑：在舞台里撒一阵彩色碎片（纯 DOM，自动清理）
  function fireConfetti() {
    const host = root.querySelector('.scf-highway-wrap');
    if (!host) return;
    const colors = ['#34d399', '#22d3ee', '#fbbf24', '#f87171', '#a78bfa', '#f472b6'];
    const layer = document.createElement('div');
    layer.className = 'scf-confetti';
    for (let i = 0; i < 80; i++) {
      const p = document.createElement('i');
      const x = Math.random() * 100, dx = (Math.random() * 2 - 1) * 120;
      const delay = Math.random() * 0.25, dur = 1.1 + Math.random() * 0.9;
      const rot = Math.floor(Math.random() * 360);
      p.style.cssText = `left:${x}%;background:${colors[i % colors.length]};--dx:${dx}px;--rot:${rot}deg;animation-delay:${delay}s;animation-duration:${dur}s`;
      layer.appendChild(p);
    }
    host.appendChild(layer);
    setTimeout(() => layer.remove(), 2600);
  }

  // ✨ 击中特效层（覆盖在判定线上方，单独一层，不随高速路每帧重建）
  let fxLayer = null;
  function fxHost() {
    const host = root.querySelector('.scf-highway-wrap');
    if (!host) return null;
    if (!fxLayer || fxLayer.parentElement !== host) {
      fxLayer = document.createElement('div');
      fxLayer.className = 'scf-fx';
      host.appendChild(fxLayer);
    }
    // 火花层与音块层同宽且同样居中，保证 centerX 坐标一一对应（和下方键盘对齐）
    if (layout) fxLayer.style.width = layout.width + 'px';
    return fxLayer;
  }
  // 力度→热力配色：轻=冷蓝，重=橙红（把 MIDI velocity 直接画成火花颜色）
  function heatColor(vel) {
    const v = Math.max(0, Math.min(1, (vel == null ? 90 : vel) / 127));
    const h = (200 - v * 210 + 360) % 360;          // 200°蓝 → 350°红
    const l = 55 + v * 12;                            // 越重越亮
    return `hsl(${h.toFixed(0)},95%,${l.toFixed(0)}%)`;
  }
  // ✨ 在判定线对应琴键的位置迸发一束彩色火花（数量/大小/范围随力度 velocity 变化）
  function burstAt(midi, color, big, vel = 90) {
    if (!fxOn) return;
    const layer = fxHost(); if (!layer) return;
    const cx = centerX.get(midi);
    const x = cx != null ? cx : (layout ? layout.width / 2 : 0);
    const v = Math.max(0, Math.min(1, vel / 127));
    let n = Math.round(6 + v * 14);                  // 力度→火花数：6~20
    let spread = 22 + v * 34;                          // 力度→飞散范围
    let sz = 5 + v * 5;                                // 力度→火花大小：5~10px
    if (big) { n = Math.round(n * 1.7); spread += 18; sz += 2; } // 连击里程碑：更炸裂
    for (let k = 0; k < n; k++) {
      const p = document.createElement('i');
      const ang = (Math.PI * 2 * k) / n + Math.random() * 0.5;
      const dist = spread + Math.random() * spread * 0.7;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - (big ? 22 : 14); // 略向上飞
      const dur = 0.42 + Math.random() * 0.3;
      const s = (sz * (0.7 + Math.random() * 0.6)).toFixed(1);
      p.className = 'scf-spark';
      p.style.cssText = `left:${x}px;width:${s}px;height:${s}px;margin-left:${(-s / 2).toFixed(1)}px;background:${color};--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;animation-duration:${dur}s`;
      layer.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 80);
    }
  }
  // ✨ 判定线随命中颜色短暂发光（发光强度随力度变化）
  let hitlineEl = null;
  function pulseHitline(color, vel = 90) {
    if (!fxOn) return;
    hitlineEl = hitlineEl || root.querySelector('.scf-hitline');
    if (!hitlineEl) return;
    const v = Math.max(0, Math.min(1, vel / 127));
    hitlineEl.style.setProperty('--hit', color);
    hitlineEl.style.setProperty('--hitblur', `${(10 + v * 22).toFixed(0)}px`);
    hitlineEl.classList.remove('hit'); void hitlineEl.offsetWidth; hitlineEl.classList.add('hit');
  }
  // ✨ 命中反馈合集：火花(力度热力配色) + 判定线发光 +（每 5 连）里程碑飘字
  function hitFx(midi, grade, vel = 90) {
    if (!fxOn || grade === 'miss') return;
    const lineCol = grade === 'good' ? '#22d3ee' : '#34d399'; // 判定线＝准度色
    const sparkCol = heatColor(vel);                          // 火花＝力度热力色
    const milestone = sf && sf.combo >= 5 && sf.combo % 5 === 0;
    burstAt(midi, sparkCol, milestone, vel);
    pulseHitline(lineCol, vel);
    if (milestone) {
      const host = root.querySelector('.scf-highway-wrap'); if (!host) return;
      const f = document.createElement('div');
      f.className = 'scf-combo-flair';
      f.textContent = `🔥 连击 ${sf.combo}！`;
      host.appendChild(f);
      setTimeout(() => f.remove(), 950);
    }
  }

  // ③ 区间循环：小节 → 拍 → 毫秒
  function meterOf() { return getCurrentSong().meter || 4; }
  function totalMeasures() { return sf ? Math.max(1, Math.ceil((sf.totalBeats - 1e-6) / meterOf())) : 1; }
  function msForBeat(beat) { return scfBeatToMs(beat, sf.bpm) * sf.timeScale; }
  function computeLoop() {
    const m = meterOf();
    loopStartBeat = (loopFrom - 1) * m;
    loopEndBeat = loopTo * m;
    loopStartMs = msForBeat(loopStartBeat);
    loopEndMs = msForBeat(loopEndBeat);
    winNotes = sf ? sf.notes.filter((n) => n.beat >= loopStartBeat - 1e-6 && n.beat < loopEndBeat - 1e-6) : [];
  }
  // 刷新循环控件（夹取范围、信息、禁用态），并在预览上画出循环区
  function drawLoopControls() {
    const tm = totalMeasures();
    if (loopTo > tm || loopTo < 1) loopTo = tm;
    if (loopFrom < 1) loopFrom = 1;
    if (loopFrom > tm) loopFrom = tm;
    if (loopFrom > loopTo) loopFrom = loopTo;
    const fEl = $('#scf-loop-from'), tEl = $('#scf-loop-to');
    if (fEl) { fEl.max = tm; fEl.value = loopFrom; fEl.disabled = !loopOn; }
    if (tEl) { tEl.max = tm; tEl.value = loopTo; tEl.disabled = !loopOn; }
    const info = $('#scf-loop-info');
    if (info) info.textContent = loopOn ? `循环第 ${loopFrom}–${loopTo} / 共 ${tm} 小节` : `共 ${tm} 小节`;
    $('#scf-loop-on')?.classList.toggle('on', loopOn);
    computeLoop();
  }
  $('#scf-loop-on').onclick = () => {
    if (mode) return;
    loopOn = !loopOn;
    drawLoopControls();
    drawStaff(-LEAD_MS);
  };
  function onLoopInput() {
    if (mode) return;
    loopFrom = parseInt($('#scf-loop-from').value, 10) || 1;
    loopTo = parseInt($('#scf-loop-to').value, 10) || 1;
    drawLoopControls();
    drawStaff(-LEAD_MS);
  }
  $('#scf-loop-from').onchange = onLoopInput;
  $('#scf-loop-to').onchange = onLoopInput;

  // BPM 徽章（随选曲/速度更新）+ 左右手图例
  function updateMeta() {
    const song = getCurrentSong();
    const eff = Math.round((song.bpm || 90) * speed);
    let txt = `♩ = ${eff} BPM`;
    if (speed !== 1) txt += `　(${speed}×${progSpeed ? ' 渐进' : ''})`;
    const bpmEl = $('#scf-bpm'); if (bpmEl) bpmEl.textContent = txt;
    const leg = $('#scf-legend'); if (leg) leg.style.display = song.hands ? '' : 'none';
  }

  // ⑥ 等待练习提示：让当前该弹的整组键高亮闪 3 秒并发声
  function doHint() {
    if (mode !== 'wait' || !frozen) return;
    const g = groups[waitIdx]; if (!g) return;
    hintUntil = performance.now() + 3000;
    g.notes.filter((n) => !n.judged).forEach((n) => {
      scfKb.flash(n.midi, '#22d3ee'); playTone(midiToFreq(n.midi), 0, 0.5, 0.16);
      realNoteOn(n.midi, n.velocity, 480);   // ④ 提示也在真琴上响
    });
  }

  // ④ 真琴发声：在 CA99 上发 Note On，durMs 后自动 Note Off（防漏关用 realOn 跟踪）
  function realNoteOn(midi, velocity, durMs) {
    if (!realPiano || typeof kbMidiOn !== 'function') return;
    const vel = (velocity != null) ? Math.max(1, Math.min(127, velocity)) : 82;
    if (realOn.has(midi)) { kbMidiOff(midi, 0); }
    kbMidiOn(midi, 0, vel); realOn.add(midi);
    const hold = Math.max(120, Math.min(2200, durMs || 400));
    setTimeout(() => { if (realOn.has(midi)) { kbMidiOff(midi, 0); realOn.delete(midi); } }, hold);
  }
  function allRealOff() {
    if (typeof kbMidiOff === 'function') realOn.forEach((m) => kbMidiOff(m, 0));
    realOn.clear();
  }

  // ⑦ 完成后落点时间对比图：每个音画在"准点线"上下，抢拍在上、拖拍在下
  function hideTimingChart() {
    const el = $('#scf-timing'); if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  }
  function drawTimingChart() {
    const el = $('#scf-timing'); if (!el || !sf) return;
    const t = sf.timings();
    const played = t.notes.filter((n) => n.grade);  // 实际判过的音（含 miss）
    if (!played.length) { hideTimingChart(); return; }
    const W = 720, H = 188, padX = 30, padTop = 26, padBot = 30;
    const cy = padTop + (H - padTop - padBot) / 2;          // 准点线（0ms）
    const amp = (H - padTop - padBot) / 2;                  // 上/下最大振幅
    const span = sf.goodMs || 320;                          // ±goodMs 映射到 ±amp
    const n = played.length;
    const xOf = (i) => padX + (n === 1 ? (W - 2 * padX) / 2 : (i * (W - 2 * padX)) / (n - 1));
    const yOf = (d) => cy + Math.max(-amp, Math.min(amp, (d / span) * amp));
    const perfBand = (sf.perfectMs / span) * amp;
    const col = (g) => (g === 'perfect' ? '#34d399' : g === 'good' ? '#22d3ee' : '#f87171');
    let body = '';
    // 判定带：绿=PERFECT 窗，青=GOOD 窗
    body += `<rect x="${padX}" y="${cy - perfBand}" width="${W - 2 * padX}" height="${perfBand * 2}" fill="#34d39922"/>`;
    body += `<rect x="${padX}" y="${cy - amp}" width="${W - 2 * padX}" height="${amp - perfBand}" fill="#22d3ee14"/>`;
    body += `<rect x="${padX}" y="${cy + perfBand}" width="${W - 2 * padX}" height="${amp - perfBand}" fill="#22d3ee14"/>`;
    // 准点线
    body += `<line x1="${padX}" y1="${cy}" x2="${W - padX}" y2="${cy}" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    // 折线（仅连命中音）+ 点
    const hitPts = [];
    let dots = '';
    played.forEach((p, i) => {
      const x = xOf(i);
      if (p.grade === 'miss' || p.deltaMs == null) {
        dots += `<g><line x1="${x - 4}" y1="${H - padBot + 6}" x2="${x + 4}" y2="${H - padBot + 14}" stroke="#f87171" stroke-width="2"/><line x1="${x + 4}" y1="${H - padBot + 6}" x2="${x - 4}" y2="${H - padBot + 14}" stroke="#f87171" stroke-width="2"/></g>`;
      } else {
        const y = yOf(p.deltaMs);
        hitPts.push(`${x},${y}`);
        dots += `<line x1="${x}" y1="${cy}" x2="${x}" y2="${y}" stroke="${col(p.grade)}" stroke-width="1.5" opacity="0.55"/>`;
        dots += `<circle cx="${x}" cy="${y}" r="4.5" fill="${col(p.grade)}"/>`;
      }
    });
    if (hitPts.length >= 2) body += `<polyline points="${hitPts.join(' ')}" fill="none" stroke="#cbd5e1" stroke-width="1" opacity="0.4"/>`;
    body += dots;
    // 轴标注
    body += `<text x="${padX}" y="${padTop - 10}" fill="#94a3b8" font-size="12">抢拍 EARLY ↑</text>`;
    body += `<text x="${padX}" y="${H - 8}" fill="#94a3b8" font-size="12">拖拍 LATE ↓</text>`;
    body += `<text x="${W - padX}" y="${cy - 4}" fill="#94a3b8" font-size="11" text-anchor="end">准点 0ms</text>`;
    const tendency = t.early > t.late + 1 ? '偏抢拍（提前）' : t.late > t.early + 1 ? '偏拖拍（滞后）' : '基本均衡';
    el.innerHTML = `
      <div class="scf-timing-title">⏱️ 落点时间对比</div>
      <svg viewBox="0 0 ${W} ${H}" class="scf-timing-svg" role="img" aria-label="落点时间对比图">${body}</svg>
      <div class="scf-timing-legend">
        <span><b style="color:#22d3ee">⬆ 抢拍</b> ${t.early}</span>
        <span><b style="color:#34d399">● 准点</b> ${t.onTime}</span>
        <span><b style="color:#f59e0b">⬇ 拖拍</b> ${t.late}</span>
        <span><b style="color:#f87171">✕ 漏弹</b> ${t.miss}</span>
        <span>平均误差 <b>±${t.avgAbs}ms</b></span>
        <span>最大 <b>${t.maxAbs}ms</b></span>
        <span>整体 <b>${tendency}</b></span>
      </div>`;
    el.style.display = '';
  }

  // 上传 MIDI 文件 → 解析 → 转 ScoreFollow 曲目 → 加入选曲
  $('#scf-midi-file').onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const info = loadMidiBuffer(buf, file.name.replace(/\.(midi?|MIDI?)$/i, ''));
      $('#scf-feedback').textContent = `✅ 已载入「${info.title.replace('📄 ', '')}」：${info.notes} 个音符${info.handTxt}，约 ${info.bpm} BPM。选一档训练开始。`;
      $('#scf-feedback').className = 'sight-feedback ok';
    } catch (err) {
      $('#scf-feedback').textContent = '❌ MIDI 解析失败：' + (err && err.message ? err.message : err);
      $('#scf-feedback').className = 'sight-feedback err';
    }
    e.target.value = ''; // 允许重复上传同一文件
  };

  // 从 MIDI 字节流载入一首跟弹曲目（上传 / OMR 识别共用）
  function loadMidiBuffer(buf, rawTitle, prefix = '📄 ') {
    const parsed = parseMidi(buf);
    if (!parsed.notes.length) throw new Error('文件里没有可用的音符');
    const id = 'midi-' + Date.now() + '-' + Math.floor(Math.random() * 1e4);
    const title = prefix + rawTitle;
    const song = scfFromMidi(parsed, { id, title });
    customSongs.push(song);
    songId = id;
    loopFrom = 1; loopTo = 9999;
    drawSongChips();
    prepare();
    const rc = countHand(parsed, 'r'), lc = countHand(parsed, 'l');
    const handTxt = parsed.hasHands ? `，右手 ${rc} / 左手 ${lc}` : '';
    return { title, notes: parsed.notes.length, handTxt, bpm: parsed.bpm };
  }

  // 📚 通用曲库浏览器：CA99 内置曲库与用户自定义曲库共用。把 catalog（含 categories/songs）
  // 渲染成分类 chips + 搜索 + 分组列表，点击即 fetch 对应路径复用 loadMidiBuffer 载入跟弹。
  // els = { cats, search, list, count, status }（DOM 元素），prefix = 载入后曲名前缀，idleMsg = 空闲提示。
  function buildLibBrowser({ els, catalog, prefix, idleMsg }) {
    const escH = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const songs = catalog.songs || [];
    const cats = catalog.categories || [];
    if (!songs.length || !cats.length) {
      els.status.textContent = '⚠️ 曲库为空';
      els.status.className = 'scf-lib-status err';
      return;
    }
    let curFn = cats[0].slug;
    let query = '';
    const matches = (s, q) => s.title.toLowerCase().includes(q)
      || (s.composer || '').toLowerCase().includes(q)
      || (s.cat || '').toLowerCase().includes(q);
    function visible() {
      const q = query.trim().toLowerCase();
      if (q) return songs.filter((s) => matches(s, q)).slice(0, 400);
      return songs.filter((s) => s.fn === curFn);
    }
    function drawCats() {
      els.cats.innerHTML = cats.map((c) =>
        `<button class="scf-lib-cat${(c.slug === curFn && !query.trim()) ? ' on' : ''}" data-fn="${c.slug}">${c.emoji} ${escH(c.label)} <em>${c.count}</em></button>`).join('');
      els.cats.querySelectorAll('.scf-lib-cat').forEach((b) => {
        b.onclick = () => { curFn = b.dataset.fn; query = ''; els.search.value = ''; drawCats(); drawList(); };
      });
    }
    function drawList() {
      const vis = visible();
      const q = query.trim().toLowerCase();
      const total = q ? songs.filter((s) => matches(s, q)).length : songs.filter((s) => s.fn === curFn).length;
      els.count.textContent = `${vis.length} 首` + (vis.length < total ? ` / 共 ${total}（请用搜索缩小）` : '');
      let html = '', lastCat = null;
      vis.forEach((s) => {
        if (s.cat !== lastCat) { lastCat = s.cat; if (s.cat) html += `<div class="scf-lib-sub">${escH(s.cat)}</div>`; }
        html += `<button class="scf-lib-item" data-path="${escH(s.path)}" data-title="${escH(s.title)}">`
          + `<span class="scf-lib-t">${escH(s.title)}</span>`
          + (s.composer ? `<span class="scf-lib-c">${escH(s.composer)}</span>` : '')
          + `</button>`;
      });
      els.list.innerHTML = html || '<div class="scf-lib-empty">没有匹配的曲子</div>';
      els.list.querySelectorAll('.scf-lib-item').forEach((b) => {
        b.onclick = () => loadLibrarySong(b.dataset.path, b.dataset.title);
      });
    }
    async function loadLibrarySong(path, title) {
      els.status.textContent = '⏳ 载入「' + title + '」…';
      els.status.className = 'scf-lib-status';
      try {
        const url = String(path).split('/').map(encodeURIComponent).join('/');
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await r.arrayBuffer();
        const info = loadMidiBuffer(buf, title, prefix);
        els.status.textContent = `✅ 已载入「${title}」：${info.notes} 个音符${info.handTxt}，约 ${info.bpm} BPM。下面选一档训练开始。`;
        els.status.className = 'scf-lib-status ok';
        const sec = $('#module-scf'); if (sec && sec.scrollIntoView) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        els.status.textContent = '❌ 这首解析失败：' + (err && err.message ? err.message : err) + '（换一首试试）';
        els.status.className = 'scf-lib-status err';
      }
    }
    els.search.oninput = (e) => { query = e.target.value; drawCats(); drawList(); };
    els.status.textContent = idleMsg;
    els.status.className = 'scf-lib-status';
    drawCats();
    drawList();
  }

  // 📚 CA99 自带曲库：读取 app/midi/catalog.json（由 scripts/build_midi_catalog.py 生成）。
  async function setupCa99Library() {
    const statusEl = $('#scf-lib-status');
    if (!$('#scf-lib') || !statusEl) return;
    let catalog;
    try {
      const r = await fetch('midi/catalog.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      catalog = await r.json();
    } catch (err) {
      statusEl.textContent = '⚠️ 曲库未载入（请从 app/ 目录启动服务，确保 midi/catalog.json 可访问）：' + (err && err.message ? err.message : err);
      statusEl.className = 'scf-lib-status err';
      return;
    }
    buildLibBrowser({
      els: { cats: $('#scf-lib-cats'), search: $('#scf-lib-search'), list: $('#scf-lib-list'), count: $('#scf-lib-count'), status: statusEl },
      catalog,
      prefix: '📚 ',
      idleMsg: `共 ${catalog.total} 首 CA99 自带曲目，选分类或搜索后点击即可载入练习。`,
    });
  }

  // 🎵 用户自定义曲库：扫描用户自己整理的目录（默认 data/，子目录即分类）。
  // 优先用 <root>/userlib.json（由 scripts/build_user_catalog.py 生成，兼容静态主机）；
  // 否则运行时解析目录自动索引页（python -m http.server 即可，丢文件刷新即见）。
  async function scanUserDir(base) {
    // 先试 manifest
    try {
      const r = await fetch(base.replace(/\/+$/, '') + '/userlib.json', { cache: 'no-cache' });
      if (r.ok) {
        const cat = catalogFromManifest(await r.json());
        if (cat && cat.total) { cat.base = cat.base || base; return cat; }
      }
    } catch (_) {}
    // 再试运行时目录索引
    const rootHtml = await (await fetch(base.replace(/\/+$/, '') + '/', { cache: 'no-cache' })).text();
    const { dirs, files } = parseDirListing(rootHtml);
    const scanDirs = [];
    for (const d of dirs) {
      try {
        const sub = await (await fetch(`${base.replace(/\/+$/, '')}/${encodeURIComponent(d)}/`, { cache: 'no-cache' })).text();
        const f = parseDirListing(sub).files;
        if (f.length) scanDirs.push({ name: d, files: f });
      } catch (_) {}
    }
    return buildUserCatalog({ base: base.replace(/\/+$/, ''), rootFiles: files, dirs: scanDirs });
  }

  async function setupUserLibrary() {
    const ULIB_KEY = 'ca99_scf_userlib_root';
    const loadUlibRoot = () => { try { return localStorage.getItem(ULIB_KEY) || 'data'; } catch (_) { return 'data'; } };
    const saveUlibRoot = (v) => { try { localStorage.setItem(ULIB_KEY, v); } catch (_) {} };
    const statusEl = $('#scf-ulib-status');
    if (!$('#scf-ulib') || !statusEl) return;
    const rootInput = $('#scf-ulib-root');
    if (rootInput && !rootInput.value) rootInput.value = loadUlibRoot();
    async function run() {
      const base = (rootInput ? rootInput.value.trim() : '') || 'data';
      saveUlibRoot(base);
      statusEl.textContent = `⏳ 正在扫描「${base}/」下你整理的曲目…`;
      statusEl.className = 'scf-lib-status';
      $('#scf-ulib-cats').innerHTML = '';
      $('#scf-ulib-list').innerHTML = '';
      $('#scf-ulib-count').textContent = '';
      let catalog;
      try {
        catalog = await scanUserDir(base);
      } catch (err) {
        statusEl.textContent = `⚠️ 无法扫描「${base}/」：${err && err.message ? err.message : err}。把 .mid 放进 app/${base}/<分类>/，从 app/ 目录启动服务后点「重新扫描」。`;
        statusEl.className = 'scf-lib-status err';
        return;
      }
      if (!catalog || !catalog.total) {
        statusEl.textContent = `📭 「${base}/」下还没找到 .mid。把你整理好的曲子按「${base}/<分类>/歌曲.mid」放好，再点「🔄 重新扫描」。`;
        statusEl.className = 'scf-lib-status';
        return;
      }
      buildLibBrowser({
        els: { cats: $('#scf-ulib-cats'), search: $('#scf-ulib-search'), list: $('#scf-ulib-list'), count: $('#scf-ulib-count'), status: statusEl },
        catalog,
        prefix: '🎵 ',
        idleMsg: `共 ${catalog.total} 首你自己的曲目，选分类或搜索后点击即可载入练习。`,
      });
    }
    if ($('#scf-ulib-scan')) $('#scf-ulib-scan').onclick = run;
    run();
  }

  // ⑤ 拍谱识别（OMR）：把乐谱图片 POST 给本机 OMR 服务，返回 MIDI 后自动导入
  const OMR_KEY = 'ca99_scf_omr_url';
  const loadOmrUrl = () => { try { return localStorage.getItem(OMR_KEY) || ''; } catch (_) { return ''; } };
  const saveOmrUrl = (v) => { try { localStorage.setItem(OMR_KEY, v); } catch (_) {} };
  const setOmrStatus = (msg, cls) => {
    const el = $('#scf-omr-status'); if (!el) return;
    el.textContent = msg; el.className = 'scf-omr-status' + (cls ? ' ' + cls : '');
  };
  if ($('#scf-omr-url')) $('#scf-omr-url').value = loadOmrUrl();
  if ($('#scf-omr-save')) $('#scf-omr-save').onclick = () => {
    const v = $('#scf-omr-url').value.trim();
    saveOmrUrl(v);
    setOmrStatus(v ? '✅ 已保存服务地址' : '已清空服务地址', v ? 'ok' : '');
  };
  if ($('#scf-omr-file')) $('#scf-omr-file').onchange = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const url = loadOmrUrl();
    if (!url) { setOmrStatus('⚠️ 请先填写并保存本机 OMR 服务地址（如 http://127.0.0.1:8000/omr）。还没有服务？可先用上面的「上传 MIDI」。', 'err'); return; }
    setOmrStatus('🔍 正在识别「' + file.name + '」…（首次识别可能较慢）');
    try {
      const fd = new FormData();
      fd.append('image', file, file.name);
      const resp = await fetch(url, { method: 'POST', body: fd });
      if (!resp.ok) throw new Error('服务返回 HTTP ' + resp.status);
      const buf = await resp.arrayBuffer();
      if (!buf || buf.byteLength < 8) throw new Error('返回内容为空，可能不是 MIDI');
      const info = loadMidiBuffer(buf, '识别 · ' + file.name.replace(/\.(png|jpe?g|pdf|gif|bmp|webp)$/i, ''));
      setOmrStatus(`✅ 识别成功：${info.notes} 个音符${info.handTxt}，约 ${info.bpm} BPM。选一档训练开始跟弹。`, 'ok');
      $('#scf-feedback').textContent = `✅ 已从乐谱图片识别载入「${info.title.replace('📄 ', '')}」。`;
      $('#scf-feedback').className = 'sight-feedback ok';
    } catch (err) {
      const m = (err && err.message) ? err.message : String(err);
      const hint = /Failed to fetch|NetworkError|fetch|Load failed/i.test(m)
        ? '无法连接 OMR 服务——请确认本机已启动 homr/OMR 服务并允许跨域（CORS）。'
        : m;
      setOmrStatus('❌ 识别失败：' + hint, 'err');
    }
  };

  // 准备引擎与键盘范围（静态预览，不播放）
  function prepare() {
    const song = getCurrentSong();
    const opts = { timeScale: 1 / speed, octaveAgnostic: easy };
    if (song.hands) opts.handFilter = hand;
    sf = new ScoreFollow(song, opts);
    groups = sf.groups();
    // 仅当曲目区分左右手时显示手别选择
    $('#scf-hand-row').style.display = song.hands ? '' : 'none';
    let [lo, hi] = sf.range;
    // 补齐到完整八度边界，键盘更好看
    lo = Math.max(21, lo - ((lo % 12 === 0) ? 0 : (lo % 12)));
    hi = Math.min(108, hi + (11 - (hi % 12)));
    kbFirst = lo; kbLast = hi;
    scfKb.first = lo; scfKb.last = hi;
    scfKb.layout = kbBuildLayout(lo, hi);
    scfKb._render();
    layout = kbBuildLayout(lo, hi);
    centerX = new Map();
    layout.keys.forEach((k) => centerX.set(k.midi, k.x + k.w / 2));
    $('#scf-highway').style.width = layout.width + 'px';
    demoPlayed = new Set();
    lastBeat = -1;
    updateMeta();
    drawLoopControls();
    drawStaff(-LEAD_MS);
    drawHighway(-LEAD_MS);
    refreshStats();
    updateBestBadge();
  }

  // ---- 五线谱（整曲横向 + 光标）----
  const CLEF_GLYPH = { treble: '𝄞', bass: '𝄢' };
  function drawStaff(t) {
    if (!sf) return;
    const leftPad = 50, beatPx = 26, topY = 30, stepPx = 7, rightPad = 24;
    const W = leftPad + sf.totalBeats * beatPx + rightPad;
    const H = 150;
    const yForPos = (pos) => topY + (8 - pos) * stepPx;
    const xForBeat = (beat) => leftPad + beat * beatPx;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="scf-staff-svg" preserveAspectRatio="xMinYMid meet">`;
    // ③ 循环区高亮（画在五线谱之下）
    if (loopOn) {
      const lx0 = xForBeat(loopStartBeat), lx1 = xForBeat(loopEndBeat);
      svg += `<rect x="${lx0}" y="10" width="${Math.max(0, lx1 - lx0)}" height="${H - 20}" class="scf-loop-region"/>`;
    }
    for (let p = 0; p <= 8; p += 2) {
      const y = yForPos(p);
      svg += `<line x1="${leftPad - 14}" y1="${y}" x2="${W - 8}" y2="${y}" class="staff-line"/>`;
    }
    svg += `<text x="${leftPad - 44}" y="${yForPos(2) + 6}" class="clef-glyph">${CLEF_GLYPH[sf.clef] || CLEF_GLYPH.treble}</text>`;
    // 音符
    for (const n of sf.notes) {
      const pos = staffPosition(n.midi, sf.clef);
      const cy = yForPos(pos);
      const cx = xForBeat(n.beat);
      if (pos > 8) for (let p = 10; p <= pos; p += 2) svg += `<line x1="${cx - 12}" y1="${yForPos(p)}" x2="${cx + 12}" y2="${yForPos(p)}" class="ledger-line"/>`;
      if (pos < 0) for (let p = -2; p >= pos; p -= 2) svg += `<line x1="${cx - 12}" y1="${yForPos(p)}" x2="${cx + 12}" y2="${yForPos(p)}" class="ledger-line"/>`;
      let cls = 'note-head';
      if (n.grade === SCF_GRADE.PERFECT) cls += ' nh-perfect';
      else if (n.grade === SCF_GRADE.GOOD) cls += ' nh-good';
      else if (n.grade === SCF_GRADE.MISS) cls += ' nh-miss';
      else if (n.hand === 'l') cls += ' nh-left';
      const op = sf._handOk(n) ? '' : ' opacity="0.25"';
      svg += `<g transform="translate(${cx},${cy})"${op}><ellipse rx="6.5" ry="5" transform="rotate(-20)" class="${cls}"/></g>`;
    }
    // 光标（按引擎时间→拍位插值，兼容变速 MIDI）
    const cursorBeat = Math.max(0, sf.beatAt(t));
    const curX = xForBeat(cursorBeat);
    svg += `<line x1="${curX}" y1="14" x2="${curX}" y2="${H - 10}" class="scf-cursor-line"/>`;
    svg += `</svg>`;
    const wrap = $('#scf-staff');
    wrap.innerHTML = svg;
    // 自动滚动让光标居中
    const sw = wrap.parentElement;
    if (sw) sw.scrollLeft = Math.max(0, curX - sw.clientWidth / 2);
  }

  // ---- 下落高速路（Synthesia）----
  function drawHighway(t) {
    if (!sf) return;
    lastDrawT = t;
    const pxPerMs = HW_H / LOOK_MS;
    let html = '';
    for (const n of sf.notes) {
      if (loopOn && mode && n.judged && n.grade == null) continue;   // ③ 循环：隐藏窗外被屏蔽的音
      const dt = n.ms - t;            // >0 在上方未到，=0 到判定线
      if (dt > LOOK_MS || dt < -260) continue;
      const cx = centerX.get(n.midi);
      if (cx == null) continue;
      const isBlack = [1, 3, 6, 8, 10].includes(((n.midi % 12) + 12) % 12);
      const w = isBlack ? layout.blackW : layout.whiteW - 3;
      const h = Math.max(14, n.durMs * pxPerMs);
      const top = HW_H - dt * pxPerMs - h;
      let cls = 'scf-note';
      if (!sf._handOk(n)) cls += ' n-dim';                 // 非当前练习手 → 淡显
      else if (n.hand === 'l') cls += ' n-left';           // 左手音符 → 不同色
      if (n.grade === SCF_GRADE.PERFECT) cls += ' n-perfect';
      else if (n.grade === SCF_GRADE.GOOD) cls += ' n-good';
      else if (n.grade === SCF_GRADE.MISS) cls += ' n-miss';
      else if (sf._handOk(n) && Math.abs(dt) <= sf.goodMs) cls += ' n-due';
      // ① 音名标签：块够高且开关打开时，把音名写在音符上
      const lbl = (labelsOn && sf._handOk(n) && h >= 15)
        ? `<span class="scf-note-lbl">${midiName(n.midi)}</span>` : '';
      // 🐣 手指号：启蒙曲目带 finger（1=拇指…5=小指）时，在块顶画一个指法圆点
      const fgr = (labelsOn && sf._handOk(n) && n.finger != null && h >= 15 && n.grade == null)
        ? `<span class="scf-note-fgr">${n.finger}</span>` : '';
      // ② 力度→亮度：上传 MIDI 自带 velocity 时，强音更亮、弱音更暗（仅未判定的音）
      let vstyle = '';
      if (velViz && n.velocity != null && n.grade == null && sf._handOk(n)) {
        const br = (0.62 + (n.velocity / 127) * 0.66).toFixed(2); // 0.62~1.28
        const sat = (0.85 + (n.velocity / 127) * 0.5).toFixed(2);
        vstyle = `filter:brightness(${br}) saturate(${sat});`;
      }
      html += `<div class="${cls}" style="left:${cx - w / 2}px;top:${top}px;width:${w}px;height:${h}px;${vstyle}">${fgr}${lbl}</div>`;
    }
    $('#scf-highway').innerHTML = html;
    // 键盘高亮：等待模式高亮"当前该弹的整组"，其余模式高亮判定窗内的音
    let cue = [];
    if (mode === 'wait' && frozen && groups[waitIdx]) {
      cue = groups[waitIdx].notes.filter((n) => !n.judged);
    } else {
      cue = sf.active(t);
    }
    const hint = performance.now() < hintUntil;   // ⑥ 提示中：换更醒目的色与图标
    if (cue.length) {
      const col = hint ? '#22d3ee' : '#fbbf24';
      const tx = hint ? '💡' : '▶';
      // 🐣 启蒙曲目带指法时，键上直接显示该用第几根手指（比 ▶ 更有指导性）
      scfKb.highlightMany(cue.map((n) => ({
        midi: n.midi, color: col,
        text: (!hint && n.finger != null) ? String(n.finger) : tx,
      })), { scroll: false });
    } else scfKb.clear();
  }

  function refreshStats() {
    if (!sf) return;
    $('#scf-score').textContent = sf.score;
    $('#scf-combo').textContent = sf.combo;
    $('#scf-prog').textContent = `${sf.judgedCount}/${sf.total}`;
    $('#scf-acc').textContent = sf.judgedCount ? Math.round(sf.accuracy * 100) + '%' : '—';
    const st = sf.stars;
    $('#scf-stars').textContent = '★★★☆☆☆'.slice(3 - st, 6 - st);
  }

  let popTimer = null;
  function popGrade(grade) {
    const pop = $('#scf-pop');
    const map = {
      perfect: ['PERFECT', '#34d399'], good: ['GOOD', '#22d3ee'], miss: ['MISS', '#f87171'],
    };
    const [txt, color] = map[grade] || ['', '#fff'];
    pop.textContent = sf.combo > 1 && grade !== 'miss' ? `${txt}  ×${sf.combo}` : txt;
    pop.style.color = color;
    pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show');
    clearTimeout(popTimer); popTimer = setTimeout(() => pop.classList.remove('show'), 520);
  }

  // 节拍器：按播放头时间在每个整拍触发一次（重拍加重音）
  function tickMetro(t) {
    if (!metroOn || !sf) return;
    const b = Math.floor(sf.beatAt(t));
    if (b > lastBeat && b >= 0) {
      lastBeat = b;
      clickSound((b % (getCurrentSong().meter || 4)) === 0);
    } else if (b < lastBeat) { lastBeat = b; }
  }

  // ③ 把循环窗口内的音符判定状态重置，供下一遍循环重弹
  function resetWindow() {
    winNotes.forEach((n) => { n.judged = false; n.grade = null; n.deltaMs = null; });
  }

  function frame() {
    const now = performance.now();
    if (mode === 'wait') {
      // 等待模式：播放头推进到当前组就冻结，弹对整组才继续
      if (!frozen) {
        waitClock += now - lastNow;
        const g = groups[waitIdx];
        if (g && waitClock >= g.ms) { waitClock = g.ms; frozen = true; }
      }
      lastNow = now;
      const t = waitClock;
      tickMetro(t);
      drawHighway(t); drawStaff(t); refreshStats();
      if (waitIdx >= groups.length) {
        if (loopOn) {                       // ③ 循环：重置窗口、回到首组
          resetWindow(); waitIdx = 0; frozen = false;
          waitClock = loopStartMs - LEAD_MS; lastNow = now; lastBeat = -1;
          raf = requestAnimationFrame(frame); return;
        }
        finish(); return;
      }
      raf = requestAnimationFrame(frame);
      return;
    }
    const t = now - t0;
    tickMetro(t);
    if (mode === 'practice') {
      sf.expire(t).forEach(() => { popGrade('miss'); });
    } else if (mode === 'demo') {
      for (const n of sf.notes) {
        if (!demoPlayed.has(n.i) && !(loopOn && n.judged && n.grade == null) && t >= n.ms) {
          demoPlayed.add(n.i);
          playTone(midiToFreq(n.midi), 0, Math.min(0.9, n.durMs / 1000), 0.2);
          scfKb.flash(n.midi, n.hand === 'l' ? '#a78bfa' : '#22d3ee');
          realNoteOn(n.midi, n.velocity, n.durMs);   // ④ 同步在 CA99 真琴发声
        }
      }
    }
    drawHighway(t);
    drawStaff(t);
    refreshStats();
    if (loopOn) {                            // ③ 循环：到段尾跳回段首，不自动结束
      if (t >= loopEndMs + sf.goodMs) {
        resetWindow(); demoPlayed = new Set(); lastBeat = -1;
        t0 = performance.now() + LEAD_MS - loopStartMs;
      }
    } else if (t > sf.durationMs + sf.goodMs + 700) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  // 跟弹判分模式的击键处理
  function practiceOnNote(midi, vel = 90) {
    if (!sf || mode !== 'practice') return;
    const t = performance.now() - t0;
    const r = sf.judge(midi, t);
    if (r.grade) { popGrade(r.grade); scfKb.flash(midi, r.grade === 'perfect' ? '#34d399' : '#22d3ee'); hitFx(midi, r.grade, vel); }
    refreshStats();
  }

  // 等待模式的击键处理：只接受当前组里还没弹的音，弹齐整组才前进
  function waitOnNote(midi, vel = 90) {
    if (!sf || mode !== 'wait' || !frozen) return;
    const g = groups[waitIdx];
    if (!g) return;
    const n = g.notes.find((x) => !x.judged && sf.matches(x.midi, midi));
    if (n) {
      sf.judge(midi, g.ms);   // t 冻结在该组时刻 → 判 PERFECT
      scfKb.flash(midi, '#34d399');
      popGrade('perfect');
      hitFx(midi, 'perfect', vel);
      refreshStats();
      if (g.notes.every((x) => x.judged)) { waitIdx++; frozen = false; }
    } else {
      scfKb.flash(midi, '#f87171');  // 弹错键：红闪提示，不前进
    }
  }

  const MODE_BTN = { demo: '#scf-demo', wait: '#scf-wait', practice: '#scf-practice' };
  const MODE_LABEL = { demo: '🔊 听示范', wait: '🐢 等待练习', practice: '🎯 跟弹判分' };

  function setRunningUI(which) {
    for (const [m, sel] of Object.entries(MODE_BTN)) {
      const b = $(sel);
      if (m === which) { b.textContent = '⏸ 停止'; b.classList.add('running'); b.disabled = false; }
      else { b.disabled = true; }
    }
  }
  function resetButtons() {
    for (const [m, sel] of Object.entries(MODE_BTN)) {
      const b = $(sel);
      b.textContent = MODE_LABEL[m]; b.classList.remove('running'); b.disabled = false;
    }
  }

  function start(which) {
    if (mode) { stop(); return; }
    prepare();
    hideTimingChart();   // ⑦ 新一遍开始，清掉上次的对比图
    hideNext();
    mode = which;
    demoPlayed = new Set();
    // ③ 区间循环：屏蔽窗外音符（判 judged+null → 不画/不判/不漏），并把起点对齐段首
    const lead0 = loopOn ? (loopStartMs - LEAD_MS) : -LEAD_MS;
    if (loopOn) {
      computeLoop();
      sf.notes.forEach((n) => {
        const inWin = n.beat >= loopStartBeat - 1e-6 && n.beat < loopEndBeat - 1e-6;
        if (!inWin) { n.judged = true; n.grade = null; }
      });
    }
    if (which === 'wait') {
      groups = loopOn ? sf.groups().filter((g) => g.ms >= loopStartMs - 1 && g.ms < loopEndMs) : sf.groups();
      waitIdx = 0; frozen = false; waitClock = lead0; lastNow = performance.now();
      scfOnNote = waitOnNote;
      $('#scf-feedback').textContent = '🐢 等待模式：弹出键盘上高亮的键，弹齐当前这一组才会继续——慢慢来，不计时。';
      $('#scf-feedback').className = 'sight-feedback';
    } else if (which === 'practice') {
      t0 = performance.now() - lead0;
      scfOnNote = practiceOnNote;
      $('#scf-feedback').textContent = '🎯 音符落到判定线就弹对应键！';
      $('#scf-feedback').className = 'sight-feedback';
    } else { // demo
      t0 = performance.now() - lead0;
      scfOnNote = null;
      $('#scf-feedback').textContent = '🔊 示范播放中，看音符怎么落、听旋律…';
      $('#scf-feedback').className = 'sight-feedback';
    }
    if (loopOn) {
      $('#scf-feedback').textContent += `（🔁 循环第 ${loopFrom}–${loopTo} 小节，按对应按钮停止）`;
    }
    setRunningUI(which);
    $('#scf-hint').disabled = (which !== 'wait');   // ⑥ 仅等待模式可用提示
    hintUntil = 0;
    $('#scf-status').textContent = { demo: '示范中…', wait: '等待练习中…', practice: '跟弹中…' }[which];
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    allRealOff();   // ④ 关掉所有真琴上还响着的音
    const wasScored = mode === 'practice' || mode === 'wait';
    mode = null; scfOnNote = null;
    resetButtons();
    $('#scf-hint').disabled = true;
    $('#scf-status').textContent = '已停止';
    // ③ 循环练习靠手动停止结束，这里补记成绩
    if (loopOn && wasScored && sf && sf.judgedCount > 0) {
      const s = sf.summary();
      recordPractice('scorefollow', '曲谱跟弹', s.judgedCount || s.total, s.perfect + s.good, s.maxCombo);
      const { isRecord } = recordBest(songId, s);   // ③ 计入每首最高分
      logPlay(songId, getCurrentSong().title, s);   // ⑥ 记练习足迹
      $('#scf-feedback').textContent = `🔁 循环练习结束：弹了 ${sf.judgedCount} 个音，正确率 ${s.accuracy}%（PERFECT ${s.perfect} / GOOD ${s.good} / MISS ${s.miss}）最高连对 ${s.maxCombo}。${isRecord ? '🏅 刷新本曲最佳！' : ''}`;
      drawTimingChart();   // ⑦ 循环练习也画落点对比
      updateBestBadge();
      renderHistory();
    } else {
      $('#scf-feedback').textContent = wasScored ? '已停止。换一档训练或重来。' : '挑一首曲子或上传 MIDI，选一档训练开始';
    }
    $('#scf-feedback').className = wasScored ? 'sight-feedback ok' : 'sight-feedback';
    drawSongChips();
    prepare();
  }

  function finish() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    allRealOff();   // ④ 关掉所有真琴上还响着的音
    const wasScored = mode === 'practice' || mode === 'wait';
    const wasWait = mode === 'wait';
    mode = null; scfOnNote = null;
    resetButtons();
    $('#scf-hint').disabled = true;
    $('#scf-status').textContent = '完成';
    scfKb.clear();
    if (wasScored && sf) {
      const s = sf.summary();
      recordPractice('scorefollow', '曲谱跟弹', s.total, s.perfect + s.good, s.maxCombo);
      const { isRecord } = recordBest(songId, s);   // ③ 计入每首最高分
      logPlay(songId, getCurrentSong().title, s);   // ⑥ 记练习足迹
      // ⑨ 渐进提速：本遍正确率高就把下一遍速度 +0.05×（上限 1.5×）
      let bumped = '';
      if (progSpeed && s.accuracy >= 80 && speed < 1.5) {
        speed = Math.round((speed + 0.05) * 100) / 100;
        bumped = `　🐇 下一遍提速到 ${speed}×`;
      }
      const rec = isRecord ? '　🏅 刷新本曲最佳！' : '';
      if (wasWait) {
        $('#scf-feedback').textContent = `🎉 等待练习完成！全曲 ${s.total} 个音都弹对了，再上 🎯 跟弹判分挑战计时评分吧。${bumped}`;
      } else {
        const star = '★'.repeat(s.stars) + '☆'.repeat(3 - s.stars);
        $('#scf-feedback').textContent = `🎉 完成！${star}　正确率 ${s.accuracy}%（PERFECT ${s.perfect} / GOOD ${s.good} / MISS ${s.miss}）最高连对 ${s.maxCombo}${rec}${bumped}`;
      }
      $('#scf-feedback').className = 'sight-feedback ok';
      drawTimingChart();       // ⑦ 落点时间对比图
      updateBestBadge();
      if (s.stars >= 3) fireConfetti();   // ① 满星撒彩屑庆祝
      showNextSuggestion();    // ⑦ 推荐乐句视奏闭环
      renderHistory();         // ⑥ 刷新练习足迹
      if (bumped) prepare();   // 用新速度重建，徽章同步刷新
    } else {
      $('#scf-feedback').textContent = '示范结束，按 🐢 等待练习 或 🎯 跟弹判分 自己试试。';
      $('#scf-feedback').className = 'sight-feedback';
      drawSongChips();
      prepare();
    }
  }

  $('#scf-demo').onclick = () => start('demo');
  $('#scf-wait').onclick = () => start('wait');
  $('#scf-practice').onclick = () => start('practice');

  prepare();
  onSongPicked();    // 🐣 默认即启蒙关卡，初始就给出引导
  renderHistory();   // ⑥ 初始渲染练习足迹
}

// ---------- 模块48：乐句视奏（phrase sight-reading）----------
function renderSightPhrase() {
  const root = $('#module-sphrase');
  let game = null;
  let keyId = 'C';
  let measures = 2;
  let rhythmLv = 'easy';
  let easy = true;        // 忽略八度
  let active = false;     // 正在答题
  let previewing = false;
  const previewTimers = [];
  const CLEF = 'treble';
  const NN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  // 调号升降号在高音谱号上的标准位置（staffPosition 体系：E4=0 底线）
  const SHARP_POS = { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 };
  const FLAT_POS  = { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 };

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 乐句视奏（Phrase Sight-Reading）</h2>
    <p style="color:var(--muted);margin-bottom:14px">真正的<b>视奏</b>训练：屏幕给一句<b>标准五线谱</b>记谱的短旋律（带<b>节奏</b>与<b>调号</b>），你<b>照着谱、按自己的节奏</b>在键盘上把它<b>逐音弹出来</b>。弹对的音变绿、当前该弹的音高亮，弹错不前进——整句一次弹对才计满分。和"视奏闪卡"（只认/弹一个音）、"识谱卡"（只说音名）、"旋律听写"（靠耳朵）、"曲谱跟弹"（音符下落+计时）都不同：<b>这里脱离听觉与下落提示，纯靠读谱</b>，是从识谱迈向流畅演奏的关键一步。可选调（升降号 ≤2）、乐句长度、节奏难度。卡住可 👂 试听 或 🏳 看答案。没接 MIDI 也能点屏幕琴键作答，成绩入仪表盘。</p>

    <div class="card-panel">
      <div class="param-row"><label>调（含调号）</label>
        <select id="sp-key"></select></div>
      <div class="param-row"><label>乐句长度</label>
        <div class="ear-chips" id="sp-measures">
          <button class="ear-chip" data-m="1">1 小节</button>
          <button class="ear-chip on" data-m="2">2 小节</button>
          <button class="ear-chip" data-m="3">3 小节</button>
        </div></div>
      <div class="param-row"><label>节奏难度</label>
        <div class="ear-chips" id="sp-rhythm">
          <button class="ear-chip on" data-r="easy">入门（四分/二分）</button>
          <button class="ear-chip" data-r="medium">进阶（加八分）</button>
          <button class="ear-chip" data-r="hard">挑战（加附点）</button>
        </div></div>
      <div class="param-row"><label>难度</label>
        <div class="ear-chips" id="sp-easy">
          <button class="ear-chip on" data-e="1">简单（忽略八度）</button>
          <button class="ear-chip" data-e="0">标准（要弹准八度）</button>
        </div></div>
    </div>

    <div class="sight-stage">
      <div class="sight-staff-wrap"><div id="sp-staff" class="sp-staff"></div></div>
      <div id="sp-feedback" class="sight-feedback">选好设置，按"开始"出一句谱</div>
      <div id="sp-tip" class="mid-hint"></div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 看着上面的谱，在这里（或真琴上）<b>从左到右逐音弹出</b>这一句</div>
      <div id="sp-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="sp-score">0</span><span class="sight-stat-lbl">弹对句数</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sp-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sp-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="sp-acc">—</span><span class="sight-stat-lbl">一遍过率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="sp-start" class="big-btn">▶ 开始 / 下一句</button>
      <button id="sp-preview" class="scf-mode-btn" disabled>👂 试听</button>
      <button id="sp-reveal" class="scf-mode-btn" disabled>🏳 看答案</button>
      <span id="sp-status" style="color:var(--muted);margin-left:6px">未开始</span>
    </div>`;

  // 调下拉
  $('#sp-key').innerHTML = SP_KEYS.map((k) => `<option value="${k.id}">${k.name}</option>`).join('');
  $('#sp-key').onchange = () => { if (!active) keyId = $('#sp-key').value; };

  function bindChips(sel, attr, apply) {
    $(sel).querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (active) return;
        $(sel).querySelectorAll('.ear-chip').forEach((x) => x.classList.toggle('on', x === b));
        apply(b.dataset[attr]);
      };
    });
  }
  bindChips('#sp-measures', 'm', (v) => { measures = parseInt(v, 10); });
  bindChips('#sp-rhythm', 'r', (v) => { rhythmLv = v; });
  bindChips('#sp-easy', 'e', (v) => { easy = (v === '1'); });

  const spKb = new PianoKeyboard($('#sp-kb'), {
    labels: 'c',
    onNoteOn: (m) => { playTone(midiToFreq(m), 0, 0.6); if (spOnNote) spOnNote(m); },
  });
  spKb.scrollToShow(55, 79);

  // ---- 谱面绘制 ----
  const CLEF_GLYPH = { treble: '𝄞', bass: '𝄢' };
  function drawStaff() {
    const meter = 4;
    const leftPad = 96;       // 谱号 + 调号 + 拍号
    const beatPx = 50;
    const topY = 60, stepPx = 7, rightPad = 26;
    const totalBeats = game ? game.totalBeats : measures * meter;
    const W = leftPad + totalBeats * beatPx + rightPad;
    const H = 184;
    const yForPos = (pos) => topY + (8 - pos) * stepPx;
    const xForBeat = (beat) => leftPad + beat * beatPx;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="sp-staff-svg" preserveAspectRatio="xMinYMid meet">`;
    // 五线
    for (let p = 0; p <= 8; p += 2) {
      const y = yForPos(p);
      svg += `<line x1="26" y1="${y}" x2="${W - 10}" y2="${y}" class="staff-line"/>`;
    }
    // 谱号
    svg += `<text x="32" y="${yForPos(2) + 6}" class="clef-glyph">${CLEF_GLYPH[CLEF]}</text>`;
    // 调号
    const key = spKeyById(keyId);
    const sig = spKeySig(key.sig);
    let ax = 58;
    for (const letter of sig.letters) {
      const pos = (sig.type === 'sharp' ? SHARP_POS : FLAT_POS)[letter];
      const glyph = sig.type === 'sharp' ? '♯' : '♭';
      svg += `<text x="${ax}" y="${yForPos(pos) + 5}" class="sp-keysig">${glyph}</text>`;
      ax += 11;
    }
    // 拍号 4/4
    svg += `<text x="${ax + 4}" y="${yForPos(6) + 4}" class="sp-timesig">4</text>`;
    svg += `<text x="${ax + 4}" y="${yForPos(2) + 4}" class="sp-timesig">4</text>`;
    // 小节线
    for (let b = meter; b < totalBeats - 1e-6; b += meter) {
      const bx = xForBeat(b);
      svg += `<line x1="${bx}" y1="${yForPos(8)}" x2="${bx}" y2="${yForPos(0)}" class="sp-barline"/>`;
    }
    // 终止线
    svg += `<line x1="${W - 12}" y1="${yForPos(8)}" x2="${W - 12}" y2="${yForPos(0)}" class="sp-barline-final"/>`;
    // 音符
    if (game) {
      const pos0 = game.pos;
      game.phrase.forEach((n, idx) => {
        const pos = staffPosition(n.midi, CLEF);
        const cy = yForPos(pos);
        const cx = xForBeat(n.beat) + 14;
        const g = spDurGlyph(n.dur);
        // 当前/已弹状态
        const done = idx < pos0;
        const cur = idx === pos0 && active;
        // 当前音高亮框
        if (cur) svg += `<rect x="${cx - 15}" y="14" width="30" height="${H - 28}" rx="6" class="sp-cur-box"/>`;
        // 加线
        if (pos > 8) for (let p = 10; p <= pos; p += 2) svg += `<line x1="${cx - 11}" y1="${yForPos(p)}" x2="${cx + 11}" y2="${yForPos(p)}" class="ledger-line"/>`;
        if (pos < 0) for (let p = -2; p >= pos; p -= 2) svg += `<line x1="${cx - 11}" y1="${yForPos(p)}" x2="${cx + 11}" y2="${yForPos(p)}" class="ledger-line"/>`;
        let headCls = 'sp-head';
        if (done) headCls += ' sp-done';
        else if (cur) headCls += ' sp-current';
        const fill = g.filled;
        // 符头
        svg += `<g transform="translate(${cx},${cy})"><ellipse rx="6.5" ry="5" transform="rotate(-20)" class="${headCls}" ${fill ? '' : 'fill="none"'} style="${fill ? '' : 'stroke-width:1.6'}"/></g>`;
        // 符干
        if (g.stem) {
          const up = pos < 4;
          const sx = up ? cx + 6 : cx - 6;
          const sy2 = up ? cy - 30 : cy + 30;
          svg += `<line x1="${sx}" y1="${cy}" x2="${sx}" y2="${sy2}" class="${done ? 'sp-stem sp-done-stroke' : 'sp-stem'}"/>`;
          // 符尾旗（八分）
          if (g.flags >= 1) {
            const fy = sy2;
            svg += `<path d="M${sx},${fy} q9,4 7,16" class="${done ? 'sp-flag sp-done-stroke' : 'sp-flag'}" fill="none"/>`;
          }
        }
        // 附点
        if (g.dotted) svg += `<circle cx="${cx + 12}" cy="${cy + (pos % 2 === 0 ? -3 : 0)}" r="2" class="${done ? 'sp-head sp-done' : 'sp-head'}"/>`;
      });
    }
    svg += `</svg>`;
    const wrap = $('#sp-staff');
    wrap.innerHTML = svg;
    // 自动滚动让当前音可见
    if (game && active) {
      const sw = wrap.parentElement;
      if (sw && game.pos < game.phrase.length) {
        const curX = leftPad + game.phrase[game.pos].beat * beatPx;
        sw.scrollLeft = Math.max(0, curX - sw.clientWidth / 2);
      }
    }
  }

  function flash(ok) {
    const wrap = $('#sp-staff').closest('.sight-staff-wrap');
    if (!wrap) return;
    wrap.classList.remove('flash-ok', 'flash-no');
    void wrap.offsetWidth;
    wrap.classList.add(ok ? 'flash-ok' : 'flash-no');
  }

  function refreshStats() {
    if (!game) return;
    $('#sp-score').textContent = game.score;
    $('#sp-streak').textContent = game.streak;
    $('#sp-best').textContent = game.best;
    $('#sp-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function setKbRange() {
    const [lo, hi] = game.range();
    const klo = Math.max(21, lo - 2), khi = Math.min(108, hi + 2);
    spKb.scrollToShow(klo, khi);
  }

  function newPhrase() {
    if (!game) {
      game = new SightPhrase({ key: spKeyById(keyId), measures, rhythm: rhythmLv, octaveAgnostic: easy });
    } else {
      game.key = spKeyById(keyId); game.measures = measures; game.rhythm = rhythmLv; game.octaveAgnostic = easy;
    }
    game.next();
    active = true;
    spKb.clear();
    setKbRange();
    spOnNote = (m) => onPlay(m);
    $('#sp-preview').disabled = false;
    $('#sp-reveal').disabled = false;
    $('#sp-status').textContent = '读谱中…逐音弹出';
    $('#sp-tip').textContent = '';
    $('#sp-feedback').className = 'sight-feedback';
    $('#sp-feedback').textContent = `📖 看谱：${game.phrase.length} 个音，从左到右弹。弹对的变绿、当前音高亮。`;
    drawStaff();
  }

  function onPlay(midi) {
    if (!active || !game) return;
    const r = game.play(midi);
    if (!r) return;
    if (r.ok) {
      // 弹对：把刚弹的音点亮一下
      spKb.flash(midi, '#34d399');
      drawStaff();
      if (r.done) {
        active = false;
        spOnNote = null;
        refreshStats();
        flash(true);
        $('#sp-preview').disabled = true;
        $('#sp-reveal').disabled = true;
        if (r.mistakes === 0) {
          $('#sp-feedback').className = 'sight-feedback ok';
          $('#sp-feedback').textContent = `🎉 整句一遍弹对！连击 ${game.streak}。按"下一句"继续。`;
          recordPractice('sightphrase', '乐句视奏', game.phrase.length, game.phrase.length, game.streak);
        } else {
          $('#sp-feedback').className = 'sight-feedback';
          $('#sp-feedback').textContent = `✅ 这句弹完了（中间错了 ${r.mistakes} 次，未计满分）。再来一句巩固。`;
          recordPractice('sightphrase', '乐句视奏', game.phrase.length, Math.max(0, game.phrase.length - r.mistakes), 0);
        }
        $('#sp-status').textContent = '完成';
      } else {
        $('#sp-feedback').className = 'sight-feedback';
        $('#sp-feedback').textContent = `👍 第 ${game.pos}/${game.phrase.length} 个音对了，继续。`;
      }
    } else {
      // 弹错：闪红 + 提示该弹的音名（不前进）
      spKb.flash(midi, '#f87171');
      flash(false);
      const want = r.expected;
      $('#sp-tip').textContent = `💡 这个音不对——当前该弹的是 ${CA99.noteName(want)}（${easy ? '忽略八度，可在任意八度弹' : '需弹准八度'}）`;
    }
  }

  function reveal() {
    if (!game || !game.phrase.length) return;
    // 把整句画在键盘上，并按顺序标号
    const items = game.phrase.map((n, i) => ({ midi: n.midi, color: i < game.pos ? '#34d399' : '#7c5cff', text: String(i + 1) }));
    spKb.highlightMany(items);
    $('#sp-tip').textContent = '🏳 已把整句的音按顺序画在键盘上（数字=第几个音）。看着把它弹完吧。';
  }

  function preview() {
    if (!game || !game.phrase.length || previewing) return;
    previewing = true;
    const bpm = 96, beatMs = 60000 / bpm;
    game.phrase.forEach((n) => {
      const t = setTimeout(() => {
        playTone(midiToFreq(n.midi), 0, Math.min(1.2, n.dur * beatMs / 1000));
        spKb.flash(n.midi, '#22d3ee');
      }, n.beat * beatMs);
      previewTimers.push(t);
    });
    const endT = setTimeout(() => { previewing = false; }, game.totalBeats * beatMs + 200);
    previewTimers.push(endT);
    $('#sp-tip').textContent = '👂 试听一遍（这是辅助；视奏的目标是直接读谱弹出来）。';
  }
  function clearPreview() { while (previewTimers.length) clearTimeout(previewTimers.pop()); previewing = false; }

  $('#sp-start').onclick = () => { clearPreview(); newPhrase(); };
  $('#sp-preview').onclick = preview;
  $('#sp-reveal').onclick = reveal;

  drawStaff();
}

// ---------- 模块49：和弦视奏（chord sight-reading）----------
function renderChordSight() {
  const root = $('#module-csight');
  let game = null;
  let keyId = 'C';
  let ctype = 'triad';     // triad|seventh|mixed
  let inversions = false;
  let easy = true;         // 忽略八度
  let active = false;
  const picked = new Set(); // 屏幕琴键 latched 选择
  const CLEF = 'treble';
  const SHARP_POS = { F: 8, C: 5, G: 9, D: 6, A: 3, E: 7, B: 4 };
  const FLAT_POS  = { B: 4, E: 7, A: 3, D: 6, G: 2, C: 5, F: 1 };
  const CLEF_GLYPH = { treble: '𝄞', bass: '𝄢' };

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎹 和弦视奏（Chord Sight-Reading）</h2>
    <p style="color:var(--muted);margin-bottom:14px">真实钢琴谱里大量的音是<b>竖向叠在一起的和弦</b>。看懂一摞音符（叠置三度）、一眼认出该<b>同时按哪几个键</b>，是从"单音识谱"走向"弹真正乐曲"的核心一步。屏幕在五线谱上画一个<b>叠置和弦</b>（三和弦/七和弦，可带<b>转位</b>、带<b>调号</b>），你在键盘上<b>把整组音同时按下</b>即过关：按对的键变绿、按错闪红、集齐即判分并报出和弦名（如「C 大三和弦」）。和"和弦练习"（给<b>和弦名</b>让你弹）、"和弦性质听辨"（靠<b>耳朵</b>）、"五线谱识谱卡/视奏闪卡"（只<b>单音</b>）、"乐句视奏"（<b>横向单音旋律</b>）都不同——<b>这里读纵向叠置和弦、整组同时按</b>。可选调、和弦类型、是否转位。没接 MIDI 时可<b>逐键点选</b>（再点取消），集齐自动判定。卡住可 🏳 看答案。成绩入仪表盘。</p>

    <div class="card-panel">
      <div class="param-row"><label>调（含调号）</label>
        <select id="cs-key"></select></div>
      <div class="param-row"><label>和弦类型</label>
        <div class="ear-chips" id="cs-type">
          <button class="ear-chip on" data-t="triad">三和弦（3 音）</button>
          <button class="ear-chip" data-t="seventh">七和弦（4 音）</button>
          <button class="ear-chip" data-t="mixed">混合</button>
        </div></div>
      <div class="param-row"><label>转位</label>
        <div class="ear-chips" id="cs-inv">
          <button class="ear-chip on" data-i="0">仅原位（好读）</button>
          <button class="ear-chip" data-i="1">含转位（要弹准低音）</button>
        </div></div>
      <div class="param-row"><label>难度</label>
        <div class="ear-chips" id="cs-easy">
          <button class="ear-chip on" data-e="1">简单（忽略八度）</button>
          <button class="ear-chip" data-e="0">标准（按谱面八度）</button>
        </div></div>
    </div>

    <div class="sight-stage">
      <div class="sight-staff-wrap"><div id="cs-staff" class="sp-staff"></div></div>
      <div id="cs-feedback" class="sight-feedback">选好设置，按"开始"出一个和弦</div>
      <div id="cs-tip" class="mid-hint"></div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 看着上面的叠置和弦，在这里（或真琴上）<b>把整组音同时按下</b>（屏幕端逐键点选，集齐自动判定）</div>
      <div id="cs-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="cs-score">0</span><span class="sight-stat-lbl">弹对和弦</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cs-streak">0</span><span class="sight-stat-lbl">连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cs-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="cs-acc">—</span><span class="sight-stat-lbl">一遍过率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="cs-start" class="big-btn">▶ 开始 / 下一个</button>
      <button id="cs-reveal" class="scf-mode-btn" disabled>🏳 看答案</button>
      <span id="cs-status" style="color:var(--muted);margin-left:6px">未开始</span>
    </div>`;

  $('#cs-key').innerHTML = CS_KEYS.map((k) => `<option value="${k.id}">${k.name}</option>`).join('');
  $('#cs-key').onchange = () => { if (!active) keyId = $('#cs-key').value; };

  function bindChips(sel, attr, apply) {
    $(sel).querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (active) return;
        $(sel).querySelectorAll('.ear-chip').forEach((x) => x.classList.toggle('on', x === b));
        apply(b.dataset[attr]);
      };
    });
  }
  bindChips('#cs-type', 't', (v) => { ctype = v; });
  bindChips('#cs-inv', 'i', (v) => { inversions = (v === '1'); });
  bindChips('#cs-easy', 'e', (v) => { easy = (v === '1'); });

  const csKb = new PianoKeyboard($('#cs-kb'), {
    labels: 'c',
    onNoteOn: (m) => {
      playTone(midiToFreq(m), 0, 0.7);
      if (!active) return;
      if (picked.has(m)) picked.delete(m); else picked.add(m);
      evaluate();
    },
  });
  csKb.scrollToShow(55, 79);

  // ---- 谱面绘制 ----
  function drawStaff() {
    const topY = 56, stepPx = 7;
    const W = 300, H = 168;
    const yForPos = (pos) => topY + (8 - pos) * stepPx;
    const cx0 = 168;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="sp-staff-svg" preserveAspectRatio="xMinYMid meet">`;
    for (let p = 0; p <= 8; p += 2) {
      const y = yForPos(p);
      svg += `<line x1="20" y1="${y}" x2="${W - 14}" y2="${y}" class="staff-line"/>`;
    }
    svg += `<text x="26" y="${yForPos(2) + 6}" class="clef-glyph">${CLEF_GLYPH[CLEF]}</text>`;
    // 调号
    const key = csKeyById(keyId);
    const sig = csKeySig(key.sig);
    let ax = 56;
    for (const letter of sig.letters) {
      const pos = (sig.type === 'sharp' ? SHARP_POS : FLAT_POS)[letter];
      svg += `<text x="${ax}" y="${yForPos(pos) + 5}" class="sp-keysig">${sig.type === 'sharp' ? '♯' : '♭'}</text>`;
      ax += 11;
    }
    if (game && game.chord) {
      const ch = game.chord;
      const heldPcs = new Set([...heldNotes.notes, ...picked].map((m) => ((m % 12) + 12) % 12));
      // 计算每个音的 pos，处理相邻二度的横向错位
      const notes = ch.midis.map((m) => ({ midi: m, pos: staffPosition(m, CLEF) }))
        .sort((a, b) => a.pos - b.pos);
      let prevPos = -99, side = 0;
      notes.forEach((n) => {
        const offset = (n.pos - prevPos === 1) ? (side = side ? 0 : 1) : (side = 0);
        prevPos = n.pos;
        const cx = cx0 + offset * 13;
        const cy = yForPos(n.pos);
        // 加线
        if (n.pos > 8) for (let p = 10; p <= n.pos; p += 2) svg += `<line x1="${cx0 - 12}" y1="${yForPos(p)}" x2="${cx0 + 25}" y2="${yForPos(p)}" class="ledger-line"/>`;
        if (n.pos < 0) for (let p = -2; p >= n.pos; p -= 2) svg += `<line x1="${cx0 - 12}" y1="${yForPos(p)}" x2="${cx0 + 25}" y2="${yForPos(p)}" class="ledger-line"/>`;
        const pc = ((n.midi % 12) + 12) % 12;
        const done = active && heldPcs.has(pc);
        svg += `<g transform="translate(${cx},${cy})"><ellipse rx="7" ry="5.4" transform="rotate(-20)" class="sp-head${done ? ' sp-done' : ''}"/></g>`;
      });
      // 共用符干（叠置和弦画一根贯穿符干）
      const lowY = yForPos(notes[0].pos), hiY = yForPos(notes[notes.length - 1].pos);
      svg += `<line x1="${cx0 + 7}" y1="${hiY}" x2="${cx0 + 7}" y2="${lowY + 30}" class="sp-stem"/>`;
    }
    svg += `</svg>`;
    $('#cs-staff').innerHTML = svg;
  }

  function flash(ok) {
    const wrap = $('#cs-staff').closest('.sight-staff-wrap');
    if (!wrap) return;
    wrap.classList.remove('flash-ok', 'flash-no');
    void wrap.offsetWidth;
    wrap.classList.add(ok ? 'flash-ok' : 'flash-no');
  }

  function refreshStats() {
    if (!game) return;
    $('#cs-score').textContent = game.score;
    $('#cs-streak').textContent = game.streak;
    $('#cs-best').textContent = game.best;
    $('#cs-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function paintKb() {
    if (!game || !game.chord) { csKb.clear(); return; }
    const target = new Set(game.chord.pcs);
    const combined = [...new Set([...heldNotes.notes, ...picked])].sort((a, b) => a - b);
    const items = combined.map((m) => ({
      midi: m,
      color: target.has(((m % 12) + 12) % 12) ? '#34d399' : '#f87171',
    }));
    csKb.highlightMany(items, { keep: false, scroll: false });
  }

  function evaluate() {
    if (!game || !active) return;
    const combined = [...new Set([...heldNotes.notes, ...picked])].sort((a, b) => a - b);
    const r = game.check(combined);
    drawStaff();
    paintKb();
    if (r.done && r.correct) {
      active = false;
      chordSightOnNotesChanged = null;
      picked.clear();
      refreshStats();
      flash(true);
      $('#cs-reveal').disabled = true;
      $('#cs-status').textContent = '完成';
      const ch = r.chord;
      const invTxt = ch.inversion ? `（${ch.invName}）` : '';
      if (r.perfect) {
        $('#cs-feedback').className = 'sight-feedback ok';
        $('#cs-feedback').textContent = `🎉 正确！这是 ${ch.label}${invTxt}。连击 ${game.streak}。按"下一个"继续。`;
        recordPractice('chordsight', '和弦视奏', ch.size, ch.size, game.streak);
      } else {
        $('#cs-feedback').className = 'sight-feedback';
        $('#cs-feedback').textContent = `✅ 集齐了：${ch.label}${invTxt}（中途按过错音，未计满分）。再来一个。`;
        recordPractice('chordsight', '和弦视奏', ch.size, Math.max(1, ch.size - 1), 0);
      }
      $('#cs-tip').textContent = '';
    } else if (r.bassWrong) {
      $('#cs-tip').textContent = `🎵 音对了，但这是${game.chord.invName}——最低音要弹 ${CA99.noteName(60 + game.chord.bassPc).replace(/\d+$/, '')}（谱面最下面那个音）。`;
    } else if (r.wrong && r.wrong.length) {
      $('#cs-tip').textContent = `❌ 有 ${r.wrong.length} 个音不在这个和弦里（已标红），松开它们。已按对 ${r.correctHeld}/${r.need}。`;
    } else {
      $('#cs-tip').textContent = `已按对 ${r.correctHeld}/${r.need} 个音，继续把整组叠置和弦按齐。`;
    }
  }

  function newChord() {
    if (!game) {
      game = new ChordSight({ key: csKeyById(keyId), type: ctype, inversions, octaveAgnostic: easy });
    } else {
      game.key = csKeyById(keyId); game.type = ctype; game.inversions = inversions; game.octaveAgnostic = easy;
    }
    game.next();
    active = true;
    picked.clear();
    csKb.clear();
    const [lo, hi] = game.range();
    csKb.scrollToShow(Math.max(21, lo - 4), Math.min(108, hi + 4));
    chordSightOnNotesChanged = () => evaluate();
    $('#cs-reveal').disabled = false;
    $('#cs-status').textContent = '读谱中…把整组和弦按齐';
    $('#cs-feedback').className = 'sight-feedback';
    $('#cs-feedback').textContent = `📖 看谱：${game.chord.size} 个音叠在一起，把它们${easy ? '（任意八度）' : ''}同时按下。`;
    $('#cs-tip').textContent = '';
    drawStaff();
  }

  function reveal() {
    if (!game || !game.chord) return;
    const ch = game.chord;
    const items = ch.midis.map((m, i) => ({ midi: m, color: '#7c5cff', text: i === 0 ? '低' : '' }));
    csKb.highlightMany(items, { keep: false });
    const invTxt = ch.inversion ? `（${ch.invName}）` : '';
    $('#cs-tip').textContent = `🏳 答案：${ch.label}${invTxt} —— 该按的键已画在键盘上（紫色）。`;
    game.everWrong = true;
  }

  $('#cs-start').onclick = newChord;
  $('#cs-reveal').onclick = reveal;

  drawStaff();
}

// ---------- 模块50：节奏视奏（rhythm sight-reading）----------
function renderRhythmSight() {
  const root = $('#module-rsight');
  let game = null;
  let meter = 4;
  let measures = 2;
  let difficulty = 'easy';
  let bpm = 80;
  let recording = false;
  let taps = [];
  let startMs = 0;
  let rafId = 0;
  const timers = [];

  // 休止符字形（高音区音乐符号）
  const REST_GLYPH = { 2: '𝄼', 1: '𝄽', 0.5: '𝄾', 0.25: '𝄿' };
  function restGlyphFor(dur) {
    if (dur >= 2) return '𝄼';
    if (dur >= 1) return '𝄽';
    if (dur >= 0.5) return '𝄾';
    return '𝄿';
  }

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🥁 节奏视奏（Rhythm Sight-Reading）</h2>
    <p style="color:var(--muted);margin-bottom:14px">视奏 = 读懂<b>音高</b> + 读懂<b>节奏</b>。"乐句视奏"练音高（按自己节奏弹），这里练另一半——<b>节奏</b>：屏幕随机生成一段<b>标准节奏记谱</b>（四分/八分/十六分/附点/<b>休止符</b>、带小节线、4/4 或 3/4 拍）。先给<b>一小节预备拍</b>，然后你跟着节拍器在每个音符的落点<b>击打任意键</b>（或点大圆按钮），引擎按每次击打与谱面落点的<b>时间误差</b>判 完美/良好/漏击/多击，结束后画一张<b>落点时间图</b>告诉你偏抢还是偏拖。和"节奏跟拍"（只几个<b>预置</b>型、单小节、不画真谱）、"节奏听写"（靠<b>耳朵</b>）都不同——<b>这里看真正的节奏谱、随机多样、含休止符、跟拍击打</b>。可选拍号、小节数、难度、速度。没接 MIDI 也能点屏幕大按钮击打，成绩入仪表盘。</p>

    <div class="card-panel">
      <div class="param-row"><label>拍号</label>
        <div class="ear-chips" id="rs-meter">
          <button class="ear-chip on" data-m="4">4/4</button>
          <button class="ear-chip" data-m="3">3/4</button>
        </div></div>
      <div class="param-row"><label>小节数</label>
        <div class="ear-chips" id="rs-measures">
          <button class="ear-chip" data-x="1">1 小节</button>
          <button class="ear-chip on" data-x="2">2 小节</button>
          <button class="ear-chip" data-x="4">4 小节</button>
        </div></div>
      <div class="param-row"><label>节奏难度</label>
        <div class="ear-chips" id="rs-diff">
          <button class="ear-chip on" data-d="easy">入门（四分/八分/休止）</button>
          <button class="ear-chip" data-d="medium">进阶（加附点八分）</button>
          <button class="ear-chip" data-d="hard">挑战（加十六分）</button>
        </div></div>
      <div class="param-row"><label>速度 <span id="rs-bpm-val" style="color:var(--accent)">80</span> BPM</label>
        <input type="range" id="rs-bpm" min="50" max="132" step="2" value="80" style="flex:1"></div>
    </div>

    <div class="sight-stage">
      <div class="sight-staff-wrap"><div id="rs-staff" class="sp-staff"></div></div>
      <div id="rs-feedback" class="sight-feedback">选好设置，按"开始"出一段节奏谱</div>
      <div id="rs-tip" class="mid-hint"></div>
      <div id="rs-timing"></div>
    </div>

    <div class="kb-wrap" style="text-align:center">
      <div class="kb-cap">🥁 跟着节拍器，在每个音符的落点击打（真琴<b>任意键</b>，或点下面的大按钮）</div>
      <button id="rs-tap" class="rs-tap-btn" disabled>TAP</button>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><span class="sight-stat-num" id="rs-score">0</span><span class="sight-stat-lbl">完成段数</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="rs-streak">0</span><span class="sight-stat-lbl">全对连击</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="rs-best">0</span><span class="sight-stat-lbl">最佳</span></div>
      <div class="sight-stat"><span class="sight-stat-num" id="rs-acc">—</span><span class="sight-stat-lbl">完成率</span></div>
    </div>

    <div class="rotate-bar">
      <button id="rs-new" class="big-btn">▶ 出新节奏</button>
      <button id="rs-play" class="scf-mode-btn" disabled>🥁 预备 — 开始击打</button>
      <span id="rs-status" style="color:var(--muted);margin-left:6px">未开始</span>
    </div>`;

  function bindChips(sel, attr, apply) {
    $(sel).querySelectorAll('.ear-chip').forEach((b) => {
      b.onclick = () => {
        if (recording) return;
        $(sel).querySelectorAll('.ear-chip').forEach((x) => x.classList.toggle('on', x === b));
        apply(b.dataset[attr]);
      };
    });
  }
  bindChips('#rs-meter', 'm', (v) => { meter = parseInt(v, 10); });
  bindChips('#rs-measures', 'x', (v) => { measures = parseInt(v, 10); });
  bindChips('#rs-diff', 'd', (v) => { difficulty = v; });
  $('#rs-bpm').oninput = () => { if (recording) return; bpm = parseInt($('#rs-bpm').value, 10); $('#rs-bpm-val').textContent = bpm; };

  const LEFT = 56, BEAT_PX = 56, MIDY = 70, REST_Y = 70;
  function staffGeom() {
    const totalBeats = game ? game.totalBeats : measures * meter;
    const W = LEFT + totalBeats * BEAT_PX + 30;
    return { totalBeats, W, H: 150 };
  }

  function drawStaff(results) {
    const { totalBeats, W, H } = staffGeom();
    const xForBeat = (b) => LEFT + b * BEAT_PX;
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" class="sp-staff-svg rs-staff-svg" preserveAspectRatio="xMinYMid meet">`;
    // 单线节奏谱
    svg += `<line x1="24" y1="${MIDY}" x2="${W - 12}" y2="${MIDY}" class="staff-line"/>`;
    // 拍号
    svg += `<text x="30" y="${MIDY - 6}" class="sp-timesig">${meter}</text>`;
    svg += `<text x="30" y="${MIDY + 14}" class="sp-timesig">4</text>`;
    // 小节线
    for (let b = meter; b < totalBeats - 1e-6; b += meter) {
      const bx = xForBeat(b);
      svg += `<line x1="${bx - 6}" y1="${MIDY - 26}" x2="${bx - 6}" y2="${MIDY + 26}" class="sp-barline"/>`;
    }
    svg += `<line x1="${W - 14}" y1="${MIDY - 26}" x2="${W - 14}" y2="${MIDY + 26}" class="sp-barline-final"/>`;
    // 拍子虚线刻度（每整拍淡线）
    for (let b = 0; b <= totalBeats; b++) {
      const bx = xForBeat(b);
      svg += `<line x1="${bx}" y1="${MIDY + 20}" x2="${bx}" y2="${MIDY + 26}" class="rs-beat-tick"/>`;
    }
    // 落点序号映射到 results（按 onset 顺序）
    let onsetIdx = 0;
    if (game) {
      game.events.forEach((e) => {
        const cx = xForBeat(e.beat) + 12;
        if (e.rest) {
          svg += `<text x="${cx - 4}" y="${REST_Y + 6}" class="rs-rest">${restGlyphFor(e.dur)}</text>`;
          return;
        }
        const g = rsGlyph(e.dur);
        // 判定着色
        let cls = 'rs-head';
        if (results && results.results[onsetIdx]) {
          const j = results.results[onsetIdx].judge;
          cls += j === 'perfect' ? ' rs-perfect' : (j === 'good' ? ' rs-good' : ' rs-miss');
        }
        onsetIdx++;
        const cy = MIDY;
        svg += `<g transform="translate(${cx},${cy})"><ellipse rx="6.5" ry="5" transform="rotate(-20)" class="${cls}" ${g.filled ? '' : 'fill="none" style="stroke-width:1.6"'}/></g>`;
        if (g.stem) {
          const sx = cx + 6, sy2 = cy - 32;
          svg += `<line x1="${sx}" y1="${cy}" x2="${sx}" y2="${sy2}" class="rs-stem"/>`;
          for (let f = 0; f < g.beams; f++) {
            const fy = sy2 + f * 7;
            svg += `<path d="M${sx},${fy} q9,3 7,13" class="rs-flag" fill="none"/>`;
          }
        }
        if (g.dotted) svg += `<circle cx="${cx + 11}" cy="${cy - 3}" r="2" class="rs-head"/>`;
      });
    }
    // 播放光标
    if (recording) {
      const t = performance.now();
      const beatNow = (t - startMs) / game.beatMs;
      if (beatNow >= 0 && beatNow <= totalBeats) {
        const cx = xForBeat(beatNow);
        svg += `<line x1="${cx}" y1="${MIDY - 30}" x2="${cx}" y2="${MIDY + 30}" class="rs-cursor"/>`;
      }
    }
    svg += `</svg>`;
    $('#rs-staff').innerHTML = svg;
  }

  function refreshStats() {
    if (!game) return;
    $('#rs-score').textContent = game.score;
    $('#rs-streak').textContent = game.streak;
    $('#rs-best').textContent = game.best;
    $('#rs-acc').textContent = game.attempts ? Math.round(game.accuracy * 100) + '%' : '—';
  }

  function clearTimers() { while (timers.length) clearTimeout(timers.pop()); if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  function newRhythm() {
    clearTimers();
    recording = false;
    hideTimingChart();
    if (!game) {
      game = new RhythmSight({ meter, measures, difficulty, bpm });
    } else {
      game.meter = meter; game.measures = measures; game.difficulty = difficulty; game.bpm = bpm;
    }
    game.next();
    $('#rs-play').disabled = false;
    $('#rs-tap').disabled = true;
    $('#rs-status').textContent = '已就绪';
    $('#rs-feedback').className = 'sight-feedback';
    $('#rs-feedback').textContent = `📖 看谱：${game.onsets.length} 个落点。按"预备—开始击打"，先有一小节预备拍。`;
    $('#rs-tip').textContent = '';
    drawStaff();
  }

  function tap(t) {
    if (!recording) return;
    taps.push(t);
    clickSound(false);
    const btn = $('#rs-tap');
    btn.classList.remove('rs-tap-hit'); void btn.offsetWidth; btn.classList.add('rs-tap-hit');
  }

  function play() {
    if (!game || recording) return;
    clearTimers();
    hideTimingChart();
    taps = [];
    const beatMs = game.beatMs;
    const countIn = meter;
    const now = performance.now();
    startMs = now + countIn * beatMs;
    recording = true;
    rhythmSightTap = (t) => tap(t);
    $('#rs-tap').disabled = false;
    $('#rs-play').disabled = true;
    $('#rs-new').disabled = true;
    $('#rs-feedback').className = 'sight-feedback';
    // 预备拍 + 正式拍 的节拍器
    for (let b = 0; b < countIn; b++) {
      timers.push(setTimeout(() => {
        clickSound(b === 0);
        $('#rs-status').textContent = `预备 ${countIn - b}…`;
        $('#rs-feedback').textContent = `🎵 预备拍：${countIn - b}`;
      }, b * beatMs));
    }
    for (let b = 0; b < game.totalBeats; b++) {
      timers.push(setTimeout(() => {
        clickSound((b % meter) === 0);
      }, (countIn + b) * beatMs));
    }
    timers.push(setTimeout(() => {
      $('#rs-status').textContent = '击打中…';
      $('#rs-feedback').textContent = '🥁 开始！跟着节拍器，在每个音符落点击打。';
    }, countIn * beatMs));
    // 收尾：留一个 good 容差的尾巴
    const endDelay = countIn * beatMs + game.totalBeats * beatMs + (game.tol.good + 120);
    timers.push(setTimeout(finishPlay, endDelay));
    // 光标动画
    const loop = () => { drawStaff(); if (recording) rafId = requestAnimationFrame(loop); };
    rafId = requestAnimationFrame(loop);
  }

  function finishPlay() {
    if (!recording) return;
    recording = false;
    rhythmSightTap = null;
    if (rafId) cancelAnimationFrame(rafId); rafId = 0;
    $('#rs-tap').disabled = true;
    $('#rs-play').disabled = false;
    $('#rs-new').disabled = false;
    const g = game.submit(taps, startMs);
    refreshStats();
    drawStaff(g);
    drawTimingChart(g);
    const wrap = $('#rs-staff').closest('.sight-staff-wrap');
    if (wrap) {
      wrap.classList.remove('flash-ok', 'flash-no'); void wrap.offsetWidth;
      wrap.classList.add(g.miss === 0 && g.extra === 0 ? 'flash-ok' : 'flash-no');
    }
    const allPerfect = g.miss === 0 && g.extra === 0 && g.good === 0;
    if (allPerfect) {
      $('#rs-feedback').className = 'sight-feedback ok';
      $('#rs-feedback').textContent = `🎉 全部精准命中！连击 ${game.streak}。`;
    } else if (g.miss === 0 && g.extra === 0) {
      $('#rs-feedback').className = 'sight-feedback';
      $('#rs-feedback').textContent = `✅ 全部命中（其中 ${g.good} 个稍偏）。${g.tendency === 'early' ? '你整体偏抢拍' : g.tendency === 'late' ? '你整体偏拖拍' : '节奏很稳'}。`;
    } else {
      $('#rs-feedback').className = 'sight-feedback';
      $('#rs-feedback').textContent = `本段：完美 ${g.perfect} · 良好 ${g.good} · 漏击 ${g.miss} · 多击 ${g.extra}。`;
    }
    $('#rs-status').textContent = '完成';
    recordPractice('rhythmsight', '节奏视奏', g.total, g.perfect + g.good, allPerfect ? game.streak : 0);
  }

  // ---- 落点时间对比图（复用 Synthesia ⑦ 的设计语言）----
  function hideTimingChart() { const c = $('#rs-timing'); if (c) c.innerHTML = ''; }
  function drawTimingChart(g) {
    const c = $('#rs-timing');
    if (!c || !g.results.length) { if (c) c.innerHTML = ''; return; }
    const W = 560, H = 132, padL = 44, padR = 16, padT = 16, padB = 26;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const midY = padT + innerH / 2;
    const goodMs = game.tol.good, perfMs = game.tol.perfect;
    const yFor = (d) => midY + Math.max(-1, Math.min(1, d / goodMs)) * (innerH / 2);
    const n = g.results.length;
    const xFor = (i) => padL + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" class="rs-timing-svg">`;
    // 区带
    svg += `<rect x="${padL}" y="${yFor(-goodMs)}" width="${innerW}" height="${yFor(goodMs) - yFor(-goodMs)}" class="rs-band-good"/>`;
    svg += `<rect x="${padL}" y="${yFor(-perfMs)}" width="${innerW}" height="${yFor(perfMs) - yFor(-perfMs)}" class="rs-band-perfect"/>`;
    svg += `<line x1="${padL}" y1="${midY}" x2="${W - padR}" y2="${midY}" class="rs-zero-line"/>`;
    svg += `<text x="6" y="${padT + 8}" class="rs-axis-lbl">抢拍</text>`;
    svg += `<text x="6" y="${H - padB + 14}" class="rs-axis-lbl">拖拍</text>`;
    g.results.forEach((r, i) => {
      const x = xFor(i);
      if (r.judge === 'miss') {
        svg += `<text x="${x - 4}" y="${midY + 4}" class="rs-pt-miss">✕</text>`;
      } else {
        const y = yFor(r.deltaMs);
        const cls = r.judge === 'perfect' ? 'rs-pt-perfect' : 'rs-pt-good';
        svg += `<circle cx="${x}" cy="${y}" r="4.5" class="${cls}"/>`;
      }
    });
    svg += `</svg>`;
    const tend = g.tendency === 'early' ? '偏抢拍' : g.tendency === 'late' ? '偏拖拍' : '节奏均衡';
    svg += `<div class="rs-timing-legend"><span class="rs-lg perfect">完美 ${g.perfect}</span><span class="rs-lg good">良好 ${g.good}</span><span class="rs-lg miss">漏击 ${g.miss}</span>${g.extra ? `<span class="rs-lg extra">多击 ${g.extra}</span>` : ''}<span class="rs-lg">平均误差 ${Math.round(g.avgAbs)}ms</span><span class="rs-lg">最大 ${Math.round(g.maxAbs)}ms</span><span class="rs-lg verdict">${tend}</span></div>`;
    c.innerHTML = svg;
  }

  $('#rs-new').onclick = newRhythm;
  $('#rs-play').onclick = play;
  $('#rs-tap').onclick = () => tap(performance.now());

  drawStaff();
}

// ---------- 模块57：伴奏音型（accompaniment patterns）----------
function renderAccompaniment() {
  const root = $('#module-accomp');
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🪗 伴奏音型练习</h2>
    <p style="color:var(--muted);margin-bottom:14px">和弦不是干巴巴地按柱式——真实弹琴用<b>伴奏型</b>把同一串和弦弹出流动感。本模块把所选调上的<b>和弦进行</b>用<b>阿尔贝蒂低音 / 华尔兹 / 分解琶音 / 行进低音</b>等展开成一串"该弹的音"，照高亮在键上<b>按顺序弹出</b>即推进。没连琴可点"🔊 试听整条 / 🎹 替我弹当前"。</p>

    <div class="card-panel">
      <div class="param-row"><label>调</label>
        <select id="ac-key">${PROG_KEYS.map(k => `<option value="${k.id}">${k.name}</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>进行</label>
        <select id="ac-prog">${PROGRESSIONS.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}</select>
      </div>
      <div class="param-row"><label>伴奏型</label>
        <div id="ac-pats" class="ear-chips">${ACCOMP_PATTERNS.map((p, i) => `<button class="ear-chip${i === 0 ? ' on' : ''}" data-p="${p.id}" title="${p.desc}">${p.emoji} ${p.name}</button>`).join('')}</div>
      </div>
      <div class="param-row"><label>速度</label>
        <div class="ear-chips" id="ac-bpm">
          <button class="ear-chip" data-b="60">60</button>
          <button class="ear-chip on" data-b="90">90</button>
          <button class="ear-chip" data-b="120">120</button>
        </div></div>
      <div class="param-row"><label>判定</label>
        <div class="ear-chips" id="ac-oct">
          <button class="ear-chip on" data-o="1">忽略八度（好上手）</button>
          <button class="ear-chip" data-o="0">要弹准八度</button>
        </div></div>
    </div>

    <div class="card-panel">
      <div id="ac-patdesc" class="ac-patdesc"></div>
      <div id="ac-chips" class="cp-chips"></div>
      <div class="ac-strip-wrap"><div id="ac-strip" class="ac-strip"></div></div>
      <div id="ac-target" class="cp-target">选好后点"开始"</div>
      <div id="ac-feedback" class="sight-feedback" style="margin-top:10px">选调 / 进行 / 伴奏型，点开始</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 把<b>当前该弹的音</b>高亮在 88 键上（单音型带角色标签：低/高/中/根/三/五/八/六），照位置弹出即推进（点键可试听）</div>
      <div id="ac-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="ac-score" class="sight-stat-num">0</div><div class="sight-stat-lbl">弹对</div></div>
      <div class="sight-stat"><div id="ac-streak" class="sight-stat-num">0</div><div class="sight-stat-lbl">连击</div></div>
      <div class="sight-stat"><div id="ac-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳连击</div></div>
      <div class="sight-stat"><div id="ac-prog2" class="sight-stat-num">0/0</div><div class="sight-stat-lbl">进度</div></div>
    </div>

    <div class="rotate-bar">
      <button id="ac-start" class="big-btn">▶ 开始练习</button>
      <button id="ac-listen" class="big-btn" style="background:#667eea" disabled>🔊 试听整条</button>
      <button id="ac-auto" class="big-btn" style="background:var(--panel2)" disabled>🎹 替我弹当前</button>
      <span id="ac-status" style="color:var(--muted)">未开始</span>
    </div>`;

  let game = null, ac = null, judging = false, bestCombo = 0, demoTimer = null, patId = 'block', bpm = 90, octAg = true;
  let demoActive = false, viewIdx = null; // 试听时只改视图，不动 game.cursor
  const acKb = new PianoKeyboard($('#ac-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });
  acKb.scrollToShow(40, 76);
  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(midi, when, dur) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.2, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* 无音频环境忽略 */ }
  }
  function playStep(step, when, dur) { step.notes.forEach((n) => tone(n, when, dur)); }

  const keyObj = () => PROG_KEYS.find(k => k.id === $('#ac-key').value);
  const progObj = () => PROGRESSIONS.find(p => p.id === $('#ac-prog').value);

  function patDesc() {
    const p = accompGetPattern(patId);
    $('#ac-patdesc').textContent = `${p.emoji} ${p.name}：${p.desc}`;
  }

  function drawChips() {
    const wrap = $('#ac-chips');
    if (!game) { wrap.innerHTML = ''; return; }
    const idx = viewIdx ?? game.cursor;
    const ci = game.steps[idx] ? game.steps[idx].chordIndex : game.chords.length;
    wrap.innerHTML = game.chords.map((ch, i) => {
      let cls = 'cp-chip';
      if (i < ci) cls += ' done';
      else if (i === ci) cls += ' current';
      return `<div class="${cls}"><span class="cp-rom">${ch.roman}</span><span class="cp-sym">${ch.symbol}</span></div>`;
    }).join('');
  }

  function drawStrip() {
    const wrap = $('#ac-strip');
    const idx = viewIdx ?? (game ? game.cursor : 0);
    if (!game || idx >= game.steps.length) { wrap.innerHTML = ''; return; }
    const cur = game.steps[idx];
    const ci = cur.chordIndex;
    const cells = game.steps.filter(s => s.chordIndex === ci);
    wrap.innerHTML = cells.map((s) => {
      let cls = 'ac-cell';
      if (s === cur) cls += ' current';
      else if (s.beat < cur.beat) cls += ' done';
      const names = s.names.join('+');
      return `<div class="${cls}"><span class="ac-cell-beat">${s.beatInBar + 1}</span><span class="ac-cell-lbl">${s.label}</span><span class="ac-cell-notes">${names}</span></div>`;
    }).join('');
  }

  function showStep() {
    const idx = viewIdx ?? (game ? game.cursor : 0);
    const cur = game && game.steps[idx];
    if (!cur) { $('#ac-target').textContent = '✅ 完成整条！'; acKb.clear(); return; }
    $('#ac-target').textContent = `🎯 ${cur.symbol}（${cur.roman}）· 第 ${cur.beatInBar + 1} 拍 · ${cur.label}：弹 ${cur.names.join(' + ')}`;
    const single = cur.notes.length === 1;
    acKb.highlightMany(cur.notes.map((n, i) => ({
      midi: n,
      color: HL_PALETTE[i % HL_PALETTE.length],
      text: single ? cur.label : String(i + 1),
    })));
  }

  function updateStats() {
    if (!game) return;
    $('#ac-score').textContent = game.hits;
    $('#ac-streak').textContent = game.combo;
    $('#ac-best').textContent = bestCombo;
    $('#ac-prog2').textContent = `${game.cursor}/${game.steps.length}`;
  }

  function judge(held) {
    if (!game || judging || demoActive || game.done()) return;
    const r = game.press(new Set(held));
    const fb = $('#ac-feedback');
    if (r.advanced) {
      judging = true; // 同一把按住只判一次，松开后复位
      bestCombo = Math.max(bestCombo, game.combo);
      const justPlayed = game.steps[game.cursor - 1];
      playStep(justPlayed, ctx().currentTime + 0.01, 0.4);
      drawChips(); drawStrip(); showStep(); updateStats();
      if (r.done) {
        fb.className = 'sight-feedback ok';
        const s = game.summary();
        fb.textContent = `🎉 完成整条！弹对 ${s.hits} · 正确率 ${s.accuracy}% · ${'★'.repeat(s.stars)}${'☆'.repeat(3 - s.stars)}`;
        finishStop();
      } else {
        fb.className = 'sight-feedback ok';
        fb.textContent = `✓ 对，继续`;
      }
    } else if (held.length && game.hasWrong(new Set(held))) {
      // 按到不属于当前步的音才记一次错（避免和弦按齐过程中误判）
      if (!judging) { game.fail(); updateStats(); }
      judging = true;
      fb.className = 'sight-feedback no';
      fb.textContent = `❌ 有错音，目标是 ${game.current().names.join(' + ')}`;
    }
  }

  function stopDemo() {
    if (demoTimer) { clearTimeout(demoTimer); demoTimer = null; }
    demoActive = false; viewIdx = null;
    if (game) { drawChips(); drawStrip(); showStep(); }
  }

  function listenAll() {
    if (!game) return;
    stopDemo();
    demoActive = true;
    const beatMs = 60000 / bpm;
    const c = ctx(); let t = c.currentTime + 0.1;
    game.steps.forEach((s, i) => {
      const beats = (game.steps[i + 1]?.beat ?? s.beat + 1) - s.beat || 1;
      playStep(s, t, beatMs / 1000 * Math.max(0.5, beats) * 0.95);
      t += beatMs / 1000 * Math.max(0.5, beats);
    });
    // 视觉同步走一遍（只改 viewIdx，不影响判分）
    let i = 0;
    const tick = () => {
      if (!demoActive) return;
      if (i >= game.steps.length) { stopDemo(); return; }
      viewIdx = i;
      drawChips(); drawStrip(); showStep();
      i++;
      demoTimer = setTimeout(tick, beatMs);
    };
    tick();
  }

  function autoOne() {
    if (!game || game.done()) return;
    stopDemo();
    judging = false;
    judge(game.current().notes.slice());
  }

  function finishStop() {
    stopDemo();
    if (game) {
      const s = game.summary();
      recordPractice('accomp', '伴奏音型', s.hits + s.misses, s.hits, bestCombo);
    }
    game = null; accompOnNotesChanged = null;
    $('#ac-start').textContent = '▶ 开始练习';
    $('#ac-start').classList.remove('running');
    $('#ac-listen').disabled = true;
    $('#ac-auto').disabled = true;
    $('#ac-status').textContent = '已停止';
    acKb.clear();
  }

  function restart() {
    stopDemo();
    bestCombo = 0;
    game = new Accompaniment({ key: keyObj(), progression: progObj(), pattern: accompGetPattern(patId), bpm, octaveAgnostic: octAg });
    const [lo, hi] = game.range;
    acKb.scrollToShow(Math.max(21, lo - 2), Math.min(108, hi + 2));
    drawChips(); drawStrip(); showStep(); updateStats();
    accompOnNotesChanged = (notes) => {
      if (notes.length === 0) judging = false;
      judge(notes);
    };
    $('#ac-feedback').className = 'sight-feedback';
    $('#ac-feedback').textContent = '🎧 照高亮按顺序弹出每个音';
    $('#ac-status').textContent = '练习中';
  }

  // 选择器绑定
  $('#ac-key').onchange = () => { if (game) restart(); else { previewBuild(); } };
  $('#ac-prog').onchange = () => { if (game) restart(); else { previewBuild(); } };
  $('#ac-pats').querySelectorAll('button').forEach(b => b.onclick = () => {
    $('#ac-pats').querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); patId = b.dataset.p; patDesc();
    if (game) restart(); else previewBuild();
  });
  $('#ac-bpm').querySelectorAll('button').forEach(b => b.onclick = () => {
    $('#ac-bpm').querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); bpm = +b.dataset.b;
  });
  $('#ac-oct').querySelectorAll('button').forEach(b => b.onclick = () => {
    $('#ac-oct').querySelectorAll('button').forEach(x => x.classList.remove('on'));
    b.classList.add('on'); octAg = b.dataset.o === '1';
    if (game) restart();
  });
  $('#ac-listen').onclick = listenAll;
  $('#ac-auto').onclick = autoOne;
  $('#ac-start').onclick = () => {
    if (game) { finishStop(); return; }
    restart();
    $('#ac-start').textContent = '⏸ 停止练习';
    $('#ac-start').classList.add('running');
    $('#ac-listen').disabled = false;
    $('#ac-auto').disabled = false;
    setTimeout(listenAll, 250);
  };

  // 未开始时的静态预览（看到伴奏型样貌）
  function previewBuild() {
    const preview = new Accompaniment({ key: keyObj(), progression: progObj(), pattern: accompGetPattern(patId), bpm, octaveAgnostic: octAg });
    const tmp = game; game = preview;
    const [lo, hi] = preview.range;
    acKb.scrollToShow(Math.max(21, lo - 2), Math.min(108, hi + 2));
    drawChips(); drawStrip(); showStep();
    $('#ac-prog2').textContent = `0/${preview.steps.length}`;
    game = tmp;
  }

  patDesc();
  previewBuild();
}

// ========== 模块 58: 和弦色彩板（声光 + 和声） ==========
function renderChordColorBoard() {
  const root = $('#module-ccolor');
  // 快捷和弦芯片（让没连琴的人也能立刻看到颜色）
  const QUICK = [
    { sym: 'C',   notes: [60, 64, 67] },
    { sym: 'Dm',  notes: [62, 65, 69] },
    { sym: 'Em',  notes: [64, 67, 71] },
    { sym: 'F',   notes: [65, 69, 72] },
    { sym: 'G',   notes: [67, 71, 74] },
    { sym: 'G7',  notes: [67, 71, 74, 77] },
    { sym: 'Am',  notes: [57, 60, 64] },
    { sym: 'Bdim',notes: [71, 74, 77] },
    { sym: 'Cmaj7',notes: [60, 64, 67, 71] },
    { sym: 'Caug',notes: [60, 64, 68] },
  ];
  root.innerHTML = `
    <h2 style="margin-bottom:6px">🌈 和弦色彩板</h2>
    <p style="color:var(--muted);margin-bottom:14px">弹下任意<b>和弦</b>（≥3 个键），屏幕和琴键立刻<b>染上对应的颜色光</b>，并告诉你它的<b>名字 / 性格情绪 / 在调里的功能</b>。大调暖、小调冷、属七和减和弦会<b>闪烁</b>提醒"想回家/紧张"。没连琴就点下面的快捷和弦或直接点琴键搭和弦。</p>

    <div class="card-panel">
      <div class="param-row"><label>调（看功能）</label>
        <select id="ccb-key">${CCOLOR_KEYS.map(k => `<option value="${k.id}">${k.name}</option>`).join('')}</select>
        <span style="color:var(--muted);font-size:12px;margin-left:8px">设了调才显示罗马级数 I/ii/V7 与"想回家"提示</span>
      </div>
      <div class="param-row"><label>快捷和弦</label>
        <div id="ccb-quick" class="ear-chips">${QUICK.map(q => `<button class="ear-chip" data-n="${q.notes.join(',')}">${q.sym}</button>`).join('')}</div>
      </div>
    </div>

    <div id="ccb-stage" class="ccb-stage">
      <div id="ccb-glow" class="ccb-glow"></div>
      <div class="ccb-front">
        <div id="ccb-sym" class="ccb-sym">—</div>
        <div id="ccb-quality" class="ccb-quality">弹一个和弦试试</div>
        <div id="ccb-mood" class="ccb-mood"></div>
        <div id="ccb-func" class="ccb-func"></div>
        <div id="ccb-home" class="ccb-home"></div>
      </div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 把<b>你按下的音</b>按和声功能染色发光；若设了调且弹到"属"功能，会同时把<b>主和弦（家🏠）</b>淡淡标出，提示你可以解决回家（点键可搭和弦，再点取消）</div>
      <div id="ccb-kb"></div>
    </div>

    <div class="card-panel">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <button id="ccb-chal" class="big-btn">🎯 开始认色挑战</button>
        <div id="ccb-chal-box" style="display:none;flex:1;min-width:220px">
          <div style="color:var(--muted);font-size:13px">请弹出一个 ——</div>
          <div id="ccb-chal-target" class="ccb-chal-target">—</div>
          <div id="ccb-chal-fb" class="ccb-chal-fb"></div>
        </div>
        <div class="chord-stats">
          <span>得分 <b id="ccb-score">0</b></span>
          <span>连击 <b id="ccb-streak">0</b></span>
          <span>第 <b id="ccb-round">0</b>/8 关</span>
        </div>
      </div>
    </div>`;

  const stage = $('#ccb-stage'), glow = $('#ccb-glow');
  const symEl = $('#ccb-sym'), qualEl = $('#ccb-quality'), moodEl = $('#ccb-mood');
  const funcEl = $('#ccb-func'), homeEl = $('#ccb-home');
  let clickSet = new Set();
  let challenge = null; // {targets:[], idx, score, streak, best}

  const ccbKb = new PianoKeyboard($('#ccb-kb'), {
    labels: 'c',
    onNoteOn: (m) => {
      if (clickSet.has(m)) clickSet.delete(m); else clickSet.add(m);
      playTone(midiToFreq(m), 0, 0.6);
      update([...clickSet]);
    },
  });
  ccbKb.scrollToShow(52, 79);

  const keyObj = () => CCOLOR_KEYS.find(k => k.id === $('#ccb-key').value);

  // 8 种挑战目标（按品质名找和弦）
  const CHAL_POOL = [
    { suffix: '',   name: '大三和弦 ☀️' },
    { suffix: 'm',  name: '小三和弦 🌙' },
    { suffix: '7',  name: '属七和弦 🏃' },
    { suffix: 'dim',name: '减三和弦 😣' },
    { suffix: 'maj7',name: '大七和弦 🍷' },
    { suffix: 'm7', name: '小七和弦 🌊' },
    { suffix: 'aug',name: '增三和弦 🌀' },
    { suffix: 'sus4',name: '挂四和弦 🪂' },
  ];

  function paint(r) {
    if (!r || !r.ok) {
      stage.classList.remove('flash');
      glow.style.background = 'transparent';
      symEl.textContent = '—';
      symEl.style.color = 'var(--text)';
      qualEl.textContent = r && r.hint ? r.hint : '弹一个和弦试试';
      moodEl.textContent = '';
      funcEl.textContent = '';
      homeEl.textContent = '';
      return;
    }
    glow.style.background = `radial-gradient(circle at 50% 45%, ${r.glow} 0%, ${r.color} 38%, transparent 72%)`;
    stage.classList.toggle('flash', !!r.flash);
    symEl.textContent = r.symbol + (r.inversion ? ' （转位）' : '');
    symEl.style.color = r.glow;
    symEl.style.textShadow = `0 0 24px ${r.color}`;
    qualEl.textContent = r.quality + '（' + r.names.join(' ') + '）';
    moodEl.textContent = '情绪：' + r.mood;
    if (r.degree != null) {
      funcEl.textContent = `在${keyObj().name}里：${r.roman} 级 · ${r.func}`;
      funcEl.style.display = '';
    } else {
      funcEl.textContent = keyObj().tonicPc == null ? '（设个调可看它的级数与功能）' : '不在该调自然音阶上（离调和弦）';
      funcEl.style.display = '';
    }
    homeEl.textContent = r.hint || '';
    homeEl.style.display = r.hint ? '' : 'none';
  }

  function paintKeys(r) {
    const items = [];
    if (r && r.ok) {
      // 当前按下的音按和声色高亮
      const cur = [...clickSet];
      cur.forEach((n, i) => items.push({ midi: n, color: r.color, text: r.names[i] ?? '' }));
      // 属功能时把"家"（主和弦）淡淡标出
      if (r.wantsHome) {
        const tri = ccolorTonicTriad(keyObj());
        if (tri) {
          tri.forEach((pc) => {
            const midi = 60 + ((pc - 0 + 12) % 12); // C5 区域
            if (!clickSet.has(midi)) items.push({ midi, color: 'hsl(140,55%,45%)', text: '家' });
          });
        }
      }
    } else {
      [...clickSet].forEach((n) => items.push({ midi: n, color: 'hsl(0,0%,50%)', text: '' }));
    }
    ccbKb.clear();
    if (items.length) ccbKb.highlightMany(items);
  }

  function update(notes) {
    const r = analyzeChord(notes, keyObj());
    paint(r);
    paintKeys(r);
    if (challenge) judgeChallenge(r);
    return r;
  }

  // ---- 认色挑战 ----
  function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }
  function startChallenge() {
    challenge = { targets: shuffle(CHAL_POOL).slice(0, 8), idx: 0, score: 0, streak: 0, best: 0, locked: false };
    $('#ccb-chal').textContent = '⏹ 结束挑战';
    $('#ccb-chal').classList.add('running');
    $('#ccb-chal-box').style.display = 'block';
    nextChallenge();
    paintChalStats();
    log('和弦色彩挑战: 开始', 'ok');
  }
  function stopChallenge(finished) {
    if (challenge && challenge.score > 0) {
      recordPractice('ccolor', '和弦色彩板', challenge.idx, challenge.score, challenge.best);
    }
    challenge = null;
    $('#ccb-chal').textContent = '🎯 开始认色挑战';
    $('#ccb-chal').classList.remove('running');
    $('#ccb-chal-box').style.display = 'none';
    if (finished) log('和弦色彩挑战: 完成 🎉', 'ok'); else log('和弦色彩挑战: 结束');
  }
  function nextChallenge() {
    challenge.locked = false;
    const t = challenge.targets[challenge.idx];
    $('#ccb-chal-target').textContent = t.name;
    $('#ccb-chal-fb').textContent = '';
    $('#ccb-chal-fb').className = 'ccb-chal-fb';
    $('#ccb-round').textContent = challenge.idx;
  }
  function paintChalStats() {
    $('#ccb-score').textContent = challenge ? challenge.score : 0;
    $('#ccb-streak').textContent = challenge ? challenge.streak : 0;
    $('#ccb-round').textContent = challenge ? challenge.idx : 0;
  }
  function judgeChallenge(r) {
    if (!challenge || challenge.locked || !r || !r.ok) return;
    const want = challenge.targets[challenge.idx].suffix;
    const fb = $('#ccb-chal-fb');
    if (r.chord.suffix === want) {
      challenge.locked = true;
      challenge.score++; challenge.streak++;
      challenge.best = Math.max(challenge.best, challenge.streak);
      fb.textContent = `✓ 对！${r.symbol} 就是${challenge.targets[challenge.idx].name}`;
      fb.className = 'ccb-chal-fb ok';
      paintChalStats();
      challenge.idx++;
      if (challenge.idx >= challenge.targets.length) {
        $('#ccb-chal-target').textContent = '🎉 全部完成！';
        setTimeout(() => stopChallenge(true), 900);
      } else {
        setTimeout(() => { if (challenge) { nextChallenge(); } }, 900);
      }
    } else {
      // 弹错品质：连击清零（每个组合只扣一次，靠 wrongShown 防抖）
      if (challenge._lastWrong !== r.symbol) {
        challenge._lastWrong = r.symbol;
        challenge.streak = 0;
        fb.textContent = `这是 ${r.symbol}（${r.quality}），再找找${challenge.targets[challenge.idx].name}`;
        fb.className = 'ccb-chal-fb no';
        paintChalStats();
      }
    }
  }

  // 事件绑定
  $('#ccb-key').onchange = () => update([...clickSet]);
  $('#ccb-quick').querySelectorAll('button').forEach(b => b.onclick = () => {
    clickSet = new Set(b.dataset.n.split(',').map(Number));
    [...clickSet].forEach((n, i) => playTone(midiToFreq(n), i * 0.04, 0.6));
    update([...clickSet]);
  });
  $('#ccb-chal').onclick = () => { if (challenge) stopChallenge(false); else startChallenge(); };

  // MIDI 实弹驱动：同步到 clickSet 并刷新
  chordColorOnNotesChanged = (notes) => {
    clickSet = new Set(notes);
    update(notes);
  };

  update([]);
}

// ---------- 模块59：🎆 自由演奏灯光秀（Free-Play Light Show） ----------
function renderLightShow() {
  const root = $('#module-lightshow');
  let theme = 'heat';   // 当前配色主题
  let fxOn = true;      // ✨ 特效开关
  let soundOn = true;   // 🔊 点屏幕琴键时是否合成发声
  const combo = new LsCombo(1400);

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎆 自由演奏灯光秀</h2>
    <p style="color:var(--muted);margin-bottom:14px">不绑定任何曲目，<b>随便弹</b>！你弹的<b>每一个音</b>都会在屏幕上迸发<b>力度感应</b>的火花和光柱——弹得越用力，火花越多越暖、光柱越高。连续快弹会<b>连击</b>，到 5/10/15… 触发 🔥 大爆发。接上 CA99 就是把你的真实触键画成一场<b>声光秀</b>；没连琴直接点下面的琴键也行。很适合给小朋友玩。</p>

    <div class="card-panel">
      <div class="param-row"><label>配色主题</label>
        <div id="ls-themes" class="ear-chips">${LS_THEMES.map(t => `<button class="ear-chip${t.id === 'heat' ? ' on' : ''}" data-t="${t.id}">${t.name}</button>`).join('')}</div>
      </div>
      <div class="param-row" style="gap:18px;flex-wrap:wrap">
        <label class="ls-check"><input type="checkbox" id="ls-fx" checked> ✨ 击中特效</label>
        <label class="ls-check"><input type="checkbox" id="ls-sound" checked> 🔊 点键发声</label>
        <button id="ls-clear" class="mini-btn">🧹 清屏 / 重置连击</button>
      </div>
    </div>

    <div id="ls-stage" class="ls-stage">
      <div id="ls-fxlayer" class="ls-fxlayer"></div>
      <div class="ls-hud">
        <div class="ls-combo" id="ls-combo"></div>
        <div class="ls-stat">🎵 <b id="ls-total">0</b> 音 · 🔥 最高连击 <b id="ls-max">0</b></div>
      </div>
      <div class="ls-hint" id="ls-hint">弹一个音，或点下面的琴键 ✨</div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 你弹/点的键会随主题<b>发光</b>，并在上方舞台对应位置喷出火花光柱（接 CA99 则真实触键力度直接驱动）</div>
      <div id="ls-kb"></div>
    </div>`;

  const stage = $('#ls-stage');
  const fxLayer = $('#ls-fxlayer');
  const hintEl = $('#ls-hint');
  const comboEl = $('#ls-combo');
  const totalEl = $('#ls-total');
  const maxEl = $('#ls-max');
  let hintHidden = false;

  const kb = new PianoKeyboard($('#ls-kb'), {
    first: 21, last: 108, labels: 'c',
    onNoteOn: (m) => trigger(m, 96),
    onNoteOff: (m) => kb.release(m),
  });

  // 在舞台对应位置喷一束火花 + 升一道光柱（数量/大小/颜色/高度随力度）
  function blast(midi, vel, color, big) {
    if (!fxOn) return;
    const W = stage.clientWidth || 600;
    const x = lsStageFrac(midi) * W;
    const baseY = stage.clientHeight || 240;
    const spec = lsSparkSpec(vel, { big });

    // 光柱
    const beam = document.createElement('div');
    beam.className = 'ls-beam';
    beam.style.cssText = `left:${x}px;--bh:${lsBeamHeight(vel, baseY - 30)}px;--bc:${color}`;
    fxLayer.appendChild(beam);
    setTimeout(() => beam.remove(), 720);

    // 火花
    const topY = baseY - lsBeamHeight(vel, baseY - 30) * 0.7;
    for (let k = 0; k < spec.count; k++) {
      const p = document.createElement('i');
      const ang = (Math.PI * 2 * k) / spec.count + Math.random() * 0.6;
      const dist = spec.spread * (0.5 + Math.random() * 0.8);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - 16;
      const dur = 0.5 + Math.random() * 0.4;
      const s = (spec.size * (0.7 + Math.random() * 0.7)).toFixed(1);
      p.className = 'ls-spark';
      p.style.cssText = `left:${x}px;top:${topY}px;width:${s}px;height:${s}px;margin-left:${(-s / 2).toFixed(1)}px;background:${color};color:${color};--dx:${dx.toFixed(0)}px;--dy:${dy.toFixed(0)}px;animation-duration:${dur}s`;
      fxLayer.appendChild(p);
      setTimeout(() => p.remove(), dur * 1000 + 90);
    }
  }

  // 连击飘字（里程碑）
  function comboFlair(c) {
    comboEl.textContent = `🔥 连击 ${c}！`;
    comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop');
  }

  // 核心：触发一次灯光（来自真实 MIDI 或点屏幕键）
  function trigger(midi, vel) {
    if (!hintHidden) { hintEl.style.display = 'none'; hintHidden = true; }
    const v = (vel == null ? 90 : vel);
    const color = lsPickColor(theme, v, midi);
    // 琴键发光
    kb.press(midi);
    kb.flash(midi, color);
    // 发声（仅来自屏幕点击，真实 MIDI 由钢琴自身发声）
    // 连击
    const c = combo.hit(performance.now());
    totalEl.textContent = combo.total;
    maxEl.textContent = combo.max;
    const big = lsIsMilestone(c);
    if (big) comboFlair(c);
    else if (c >= 2) { comboEl.textContent = `× ${c}`; }
    // 特效
    blast(midi, v, color, big);
  }

  // 屏幕点击键：先发声再触发灯光（真实 MIDI 由钢琴自身发声，不在此合成）
  kb.onNoteOn = (midi) => {
    if (soundOn) { try { playTone(midiToFreq(midi), 0, 0.55, 0.2); } catch (_) { /* ignore */ } }
    trigger(midi, 96);
  };

  // 主题切换
  $('#ls-themes').querySelectorAll('button').forEach(b => b.onclick = () => {
    theme = b.dataset.t;
    $('#ls-themes').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#ls-fx').onchange = (e) => { fxOn = e.target.checked; };
  $('#ls-sound').onchange = (e) => { soundOn = e.target.checked; };
  $('#ls-clear').onclick = () => {
    fxLayer.innerHTML = '';
    combo.reset();
    totalEl.textContent = '0'; maxEl.textContent = '0'; comboEl.textContent = '';
  };

  // 真实 MIDI 驱动（带力度，不发声——钢琴自己响）
  lightShowOnNote = (midi, vel) => trigger(midi, vel);
  lightShowOffNote = (midi) => kb.release(midi);
}

// ---------- 模块60：🔁 旋律回声（Simon 式记忆游戏） ----------
function renderMelodyEcho() {
  const root = $('#module-melecho');
  let levelId = ME_LEVELS[0].id;   // 当前难度
  let ignoreOctave = true;         // 忽略八度（任意八度复奏都算对）

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🔁 旋律回声</h2>
    <p style="color:var(--muted);margin-bottom:14px">经典 <b>Simon 记忆游戏</b>：钢琴会<b>亮键 + 发声</b>播放一小段旋律，你照着<b>原样弹回来</b>。每复奏成功一次，序列就在末尾<b>多长一个音</b>——越来越长，同时练<b>耳朵 + 记忆 + 键盘地理</b>。零基础也能玩；接上 CA99 直接弹真琴，没连琴点下面的琴键也行。看你能记到多长！</p>

    <div class="card-panel">
      <div class="param-row"><label>难度（音池）</label>
        <div id="me-levels" class="ear-chips">${ME_LEVELS.map(l => `<button class="ear-chip${l.id === levelId ? ' on' : ''}" data-l="${l.id}">${l.name}</button>`).join('')}</div>
      </div>
      <div class="param-row" style="gap:18px;flex-wrap:wrap">
        <label class="ls-check"><input type="checkbox" id="me-octave" checked> 🎚️ 忽略八度（任意八度都算对，更友好）</label>
        <label>速度
          <input id="me-tempo" type="range" min="60" max="160" value="100" class="trans-slider" style="max-width:180px;vertical-align:middle">
          <span id="me-tempo-val" style="color:#667eea;font-weight:700">100/分</span>
        </label>
      </div>
    </div>

    <div class="card-panel">
      <div id="me-banner" class="me-banner">点 <b>▶ 开始</b>，听一段旋律再照着弹回来 🎧</div>
      <div id="me-track" class="me-track"></div>
      <div id="me-kb" class="me-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="me-len" class="sight-stat-num">0</div><div class="sight-stat-lbl">当前长度</div></div>
      <div class="sight-stat"><div id="me-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳长度</div></div>
      <div class="sight-stat"><div id="me-rounds" class="sight-stat-num">0</div><div class="sight-stat-lbl">完成轮数</div></div>
    </div>

    <div class="rotate-bar">
      <button id="me-start" class="big-btn">▶ 开始</button>
      <button id="me-replay" class="big-btn" style="background:#667eea" disabled>🔊 再听一遍</button>
      <button id="me-giveup" class="big-btn" style="background:var(--panel2)" disabled>👀 放弃看答案</button>
    </div>`;

  let game = null, kb = null, ac = null, playTimers = [];
  const bannerEl = $('#me-banner');
  const trackEl = $('#me-track');
  const lenEl = $('#me-len'), bestEl = $('#me-best'), roundsEl = $('#me-rounds');
  const replayBtn = $('#me-replay'), giveupBtn = $('#me-giveup'), startBtn = $('#me-start');

  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(midi, when, dur) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(0.26, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* 无音频环境忽略 */ }
  }
  function noteDur() { return 60 / (+$('#me-tempo').value); }
  function clearTimers() { playTimers.forEach(clearTimeout); playTimers = []; }
  function band(cls, html) { bannerEl.className = 'me-banner' + (cls ? ' ' + cls : ''); bannerEl.innerHTML = html; }

  function ensureKb() {
    if (kb) return;
    kb = new PianoKeyboard($('#me-kb'), {
      labels: 'c',
      onNoteOn: (m) => { try { playTone(midiToFreq(m), 0, 0.5, 0.2); } catch (_) { /* ignore */ } feed(m); },
    });
    const lo = Math.min(...meLevelById(levelId).pool), hi = Math.max(...meLevelById(levelId).pool);
    if (kb.scrollToShow) kb.scrollToShow(lo - 2, hi + 2);
  }

  // 画进度点：showing 时全部遮挡为「?」，input 时已对的填绿、当前点高亮
  function paintTrack(reveal) {
    if (!game || !game.seq.length) { trackEl.innerHTML = ''; return; }
    trackEl.innerHTML = game.seq.map((n, i) => {
      let cls = 'me-dot';
      const showing = game.state === 'showing';
      if (!showing && !reveal) {
        if (i < game.pos) cls += ' filled';
        else if (i === game.pos) cls += ' current';
      } else if (reveal) {
        cls += ' filled';
      } else {
        cls += ' masked';
      }
      const label = (reveal || (game.state === 'input' && i < game.pos)) ? CA99.noteName(n) : (showing ? '♪' : '?');
      return `<div class="${cls}" data-i="${i}">${label}</div>`;
    }).join('');
  }

  function updateStats() {
    lenEl.textContent = game ? game.seq.length : 0;
    bestEl.textContent = game ? game.best : 0;
    roundsEl.textContent = game ? game.rounds : 0;
  }

  // 播放当前序列（亮键 + 发声），结束后交给玩家
  function playSequence() {
    if (!game || !game.seq.length) return;
    clearTimers();
    game.state = 'showing';
    replayBtn.disabled = true; giveupBtn.disabled = true;
    band('show', `👀 看好这 <b>${game.seq.length}</b> 个音…`);
    paintTrack(false);
    const d = noteDur(); const c = ctx(); const start = c.currentTime + 0.18;
    game.seq.forEach((n, i) => {
      tone(n, start + i * d, d * 0.85);
      playTimers.push(setTimeout(() => {
        if (kb) kb.flash(n, '#22d3ee');
        const dot = trackEl.querySelector(`.me-dot[data-i="${i}"]`);
        if (dot) { dot.classList.add('beat'); setTimeout(() => dot.classList.remove('beat'), 260); }
      }, 180 + i * d * 1000));
    });
    playTimers.push(setTimeout(() => {
      if (!game) return;
      game.ready();
      band('input', '🎹 轮到你！照着<b>原样弹回来</b>');
      paintTrack(false);
      replayBtn.disabled = false; giveupBtn.disabled = false;
    }, 180 + game.seq.length * d * 1000 + 160));
  }

  function feed(note) {
    if (!game || game.state !== 'input') return;
    const r = game.play(note);
    if (!r) return;
    if (r.ok) {
      if (kb) kb.flash(note, '#34d399');
      paintTrack(false);
      if (r.done) {
        updateStats();
        band('win', `✅ 太棒了！记住了 <b>${r.length}</b> 个音 — 准备下一个…`);
        replayBtn.disabled = true; giveupBtn.disabled = true;
        playTimers.push(setTimeout(() => {
          if (!game) return;
          game.grow();
          updateStats();
          playSequence();
        }, 950));
      }
    } else {
      if (kb) { kb.flash(note, '#f43f5e'); kb.flash(r.expected, '#fbbf24'); }
      band('fail', `❌ 第 <b>${r.reached + 1}</b> 个弹错了！应该是 <b>${CA99.noteName(r.expected)}</b>，你弹了 ${CA99.noteName(note)}。记到了长度 <b>${r.length}</b> ✨`);
      recordPractice('melecho', '🔁 旋律回声', game.rounds + 1, game.rounds, game.best);
      paintTrack(true);
      if (kb) kb.highlightMany(game.seq.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
      replayBtn.disabled = true; giveupBtn.disabled = false;
      giveupBtn.textContent = '🔁 再来一局';
      game.state = 'fail';
    }
  }

  function beginRun() {
    ensureKb();
    if (!game) game = new MelodyEcho({ pool: meLevelById(levelId).pool, startLen: meLevelById(levelId).startLen, ignoreOctave });
    game.pool = meLevelById(levelId).pool;
    game.startLen = meLevelById(levelId).startLen;
    game.ignoreOctave = ignoreOctave;
    if (kb) kb.clear();
    game.start();
    if (typeof window !== 'undefined') window.__meGame = game;  // 调试钩子：便于排查序列/状态
    updateStats();
    startBtn.textContent = '🔄 重新开始';
    giveupBtn.textContent = '👀 放弃看答案';
    playSequence();
  }

  $('#me-levels').querySelectorAll('button').forEach(b => b.onclick = () => {
    levelId = b.dataset.l;
    $('#me-levels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    if (kb) { const lo = Math.min(...meLevelById(levelId).pool), hi = Math.max(...meLevelById(levelId).pool); if (kb.scrollToShow) kb.scrollToShow(lo - 2, hi + 2); }
  });
  $('#me-octave').onchange = (e) => { ignoreOctave = e.target.checked; };
  $('#me-tempo').oninput = (e) => { $('#me-tempo-val').textContent = e.target.value + '/分'; };

  startBtn.onclick = beginRun;
  replayBtn.onclick = () => {
    if (!game || !game.seq.length) return;
    game.pos = 0;
    playSequence();
  };
  giveupBtn.onclick = () => {
    if (!game) return;
    if (game.state === 'fail') { beginRun(); return; }   // 已结束 → 再来一局
    clearTimers();
    band('fail', `👀 答案揭晓（长度 ${game.seq.length}）：跟着键上的数字弹一遍记住它`);
    recordPractice('melecho', '🔁 旋律回声', game.rounds + 1, game.rounds, game.best);
    paintTrack(true);
    if (kb) kb.highlightMany(game.seq.map((n, i) => ({ midi: n, color: HL_PALETTE[i % HL_PALETTE.length], text: String(i + 1) })));
    game.state = 'fail';
    replayBtn.disabled = true;
    giveupBtn.textContent = '🔁 再来一局';
  };

  // 真实 MIDI 驱动（钢琴自己发声，这里只判定）
  melEchoOnNote = (midi) => feed(midi);
}

function renderCallResponse() {
  const root = $('#module-callresp');
  let levelId = CR_LEVELS[0].id;   // 当前难度（音阶/调）

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎼 即兴问答</h2>
    <p style="color:var(--muted);margin-bottom:14px">音乐对话游戏（<b>Call &amp; Response</b>）：钢琴先弹一句<b>问句</b>——它故意<b>不落在主音上</b>，听起来"还没说完、在等你回答"。你在琴上<b>即兴弹一句答句</b>回应它。<b>不用照抄！</b>只看三件事：① 尽量<b>留在音阶里</b>（用高亮的键）② 最后<b>落回主音</b>（家🏠，给人"说完了"的收束感）③ 有点<b>高低起伏</b>。怎么弹都不算错，越有乐感分越高。这是练<b>即兴 / 乐句感 / 音阶地理</b>的第一步，零基础也能玩。</p>

    <div class="card-panel">
      <div class="param-row"><label>调 / 音阶</label>
        <div id="cresp-levels" class="ear-chips">${CR_LEVELS.map(l => `<button class="ear-chip${l.id === levelId ? ' on' : ''}" data-l="${l.id}">${l.name}</button>`).join('')}</div>
      </div>
      <div class="param-row" style="gap:18px;flex-wrap:wrap">
        <label>速度
          <input id="cresp-tempo" type="range" min="60" max="160" value="100" class="trans-slider" style="max-width:180px;vertical-align:middle">
          <span id="cresp-tempo-val" style="color:#667eea;font-weight:700">100/分</span>
        </label>
      </div>
    </div>

    <div class="card-panel">
      <div id="cresp-banner" class="me-banner">点 <b>▶ 出一句</b>，听问句再<b>即兴回答</b> 🎷</div>
      <div class="cresp-phrase"><span class="cresp-phrase-lbl">❓ 问句</span><div id="cresp-q" class="me-track"></div></div>
      <div class="cresp-phrase"><span class="cresp-phrase-lbl">💬 你的答句</span><div id="cresp-a" class="me-track"></div></div>
      <div id="cresp-score" class="cresp-score" style="display:none"></div>
      <div id="cresp-kb" class="me-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="cresp-stars" class="sight-stat-num">—</div><div class="sight-stat-lbl">本次评星</div></div>
      <div class="sight-stat"><div id="cresp-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最高分</div></div>
      <div class="sight-stat"><div id="cresp-rounds" class="sight-stat-num">0</div><div class="sight-stat-lbl">问答轮数</div></div>
    </div>

    <div class="rotate-bar">
      <button id="cresp-ask" class="big-btn">▶ 出一句</button>
      <button id="cresp-replay" class="big-btn" style="background:#667eea" disabled>🔊 再听问句</button>
      <button id="cresp-done" class="big-btn" style="background:#34d399" disabled>✓ 答好了，评分</button>
    </div>`;

  let game = null, kb = null, ac = null, playTimers = [];
  const bannerEl = $('#cresp-banner');
  const qEl = $('#cresp-q'), aEl = $('#cresp-a'), scoreEl = $('#cresp-score');
  const starsEl = $('#cresp-stars'), bestEl = $('#cresp-best'), roundsEl = $('#cresp-rounds');
  const askBtn = $('#cresp-ask'), replayBtn = $('#cresp-replay'), doneBtn = $('#cresp-done');

  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(midi, when, dur, gain = 0.26) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* 无音频环境忽略 */ }
  }
  function noteDur() { return 60 / (+$('#cresp-tempo').value); }
  function clearTimers() { playTimers.forEach(clearTimeout); playTimers = []; }
  function band(cls, html) { bannerEl.className = 'me-banner' + (cls ? ' ' + cls : ''); bannerEl.innerHTML = html; }

  function curLevel() { return crLevelById(levelId); }

  function ensureKb() {
    if (kb) return;
    kb = new PianoKeyboard($('#cresp-kb'), {
      labels: 'c',
      onNoteOn: (m) => { try { playTone(midiToFreq(m), 0, 0.5, 0.2); } catch (_) { /* ignore */ } feed(m); },
    });
    paintScaleHints();
  }

  // 把当前音阶的音淡淡标在键上（主音金色），帮助"留在音阶里"
  function paintScaleHints() {
    if (!kb) return;
    const lv = curLevel();
    const lo = Math.min(...lv.pool), hi = Math.max(...lv.pool);
    if (kb.scrollToShow) kb.scrollToShow(lo - 2, hi + 2);
    if (kb.highlightMany) {
      kb.clear();
      kb.highlightMany(lv.pool.map(n => ({
        midi: n,
        color: (n % 12) === (lv.tonic % 12) ? '#fbbf24' : '#475569',
        text: (n % 12) === (lv.tonic % 12) ? '家' : '',
      })));
    }
  }

  function paintPhrase(el, seq, opt = {}) {
    if (!seq || !seq.length) { el.innerHTML = opt.placeholder || ''; return; }
    el.innerHTML = seq.map((n, i) => {
      let cls = 'me-dot';
      if (opt.home && (n % 12) === (curLevel().tonic % 12)) cls += ' filled';
      else if (opt.masked) cls += ' masked';
      else cls += ' current';
      const label = opt.masked ? '♪' : CA99.noteName(n);
      return `<div class="${cls}" data-i="${i}">${label}</div>`;
    }).join('');
  }

  function updateStats() {
    bestEl.textContent = game ? game.best : 0;
    roundsEl.textContent = game ? game.rounds : 0;
  }

  // 播放问句（亮键 + 发声），结束后轮到玩家
  function playQuestion() {
    if (!game || !game.question.length) return;
    clearTimers();
    game.state = 'question';
    replayBtn.disabled = true; doneBtn.disabled = true;
    scoreEl.style.display = 'none';
    band('show', `👂 听这一句问句（<b>${game.question.length}</b> 个音）…`);
    paintPhrase(qEl, game.question, { masked: true });
    aEl.innerHTML = '';
    const d = noteDur(); const c = ctx(); const start = c.currentTime + 0.18;
    game.question.forEach((n, i) => {
      tone(n, start + i * d, d * 0.85);
      playTimers.push(setTimeout(() => {
        if (kb) kb.flash(n, '#22d3ee');
        const dot = qEl.querySelector(`.me-dot[data-i="${i}"]`);
        if (dot) { dot.classList.add('beat'); setTimeout(() => dot.classList.remove('beat'), 260); }
      }, 180 + i * d * 1000));
    });
    playTimers.push(setTimeout(() => {
      if (!game) return;
      game.beginAnswer();
      paintPhrase(qEl, game.question, { masked: false });   // 答题时把问句音名亮出来
      band('input', '🎹 轮到你！<b>即兴弹一句</b>回应它，记得最后落回<b>主音🏠</b>');
      replayBtn.disabled = false; doneBtn.disabled = false;
    }, 180 + game.question.length * d * 1000 + 200));
  }

  function feed(note) {
    if (!game || game.state !== 'answer') return;
    if (kb) kb.flash(note, '#34d399');
    game.record(note);
    paintPhrase(aEl, game.answer, {});
  }

  function showScore() {
    if (!game || game.state !== 'answer') return;
    const s = game.finishAnswer();
    if (!s) return;
    updateStats();
    starsEl.textContent = s.stars ? '⭐'.repeat(s.stars) : '—';
    const stars = s.stars ? '⭐'.repeat(s.stars) + '☆'.repeat(3 - s.stars) : '☆☆☆';
    const fb = crFeedback(s);
    scoreEl.style.display = '';
    scoreEl.innerHTML = `
      <div class="cresp-score-stars">${stars}</div>
      <div class="cresp-score-num">${s.score} 分</div>
      <div class="cresp-score-bars">
        <span class="cresp-bar ${s.inScaleRatio >= 0.999 ? 'ok' : 'mid'}">音阶内 ${Math.round(s.inScaleRatio * 100)}%</span>
        <span class="cresp-bar ${s.resolvesHome ? 'ok' : 'no'}">${s.resolvesHome ? '✓ 落回主音🏠' : '✗ 没落回主音'}</span>
        <span class="cresp-bar ${s.hasContour ? 'ok' : 'no'}">${s.hasContour ? '✓ 有起伏' : '✗ 缺起伏'}</span>
      </div>
      <div class="cresp-score-fb">${fb}</div>`;
    if (s.stars >= 3) band('win', '🌟 漂亮的对答！');
    else if (s.stars >= 2) band('input', '👍 不错的回应！');
    else band('show', '🌱 再试一句会更好');
    paintPhrase(aEl, game.answer, { home: true });
    recordPractice('callresp', '🎼 即兴问答', game.rounds, s.stars >= 2 ? game.rounds : game.rounds - 1, game.best);
    replayBtn.disabled = true; doneBtn.disabled = true;
    askBtn.textContent = '▶ 下一句';
  }

  // 评分文案（与引擎 feedbackFor 同义，这里就地实现以便带 HTML 强调）
  function crFeedback(s) {
    if (s.stars === 3) return '🌟 太有乐感了！留在音阶里，又漂亮地落回了家（主音）';
    if (!s.resolvesHome) return '💡 试着<b>最后落回主音🏠</b>，收束感会更强';
    if (s.inScaleRatio < 1) return '💡 有几个音跑出音阶了，多用<b>高亮</b>的那些键';
    if (!s.hasContour) return '💡 加点高低起伏，别老停在一个音上';
    return '不错！再多一点变化会更出彩 ✨';
  }

  function ask() {
    ensureKb();
    const lv = curLevel();
    if (!game) game = new CallResponse({ pool: lv.pool, tonic: lv.tonic, qlen: lv.qlen });
    game.pool = lv.pool; game.tonic = lv.tonic; game.qlen = lv.qlen;
    paintScaleHints();
    game.newQuestion();
    if (typeof window !== 'undefined') window.__crGame = game;  // 调试钩子
    updateStats();
    starsEl.textContent = '—';
    playQuestion();
  }

  $('#cresp-levels').querySelectorAll('button').forEach(b => b.onclick = () => {
    levelId = b.dataset.l;
    $('#cresp-levels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    if (game) { const lv = curLevel(); game.pool = lv.pool; game.tonic = lv.tonic; game.qlen = lv.qlen; }
    paintScaleHints();
  });
  $('#cresp-tempo').oninput = (e) => { $('#cresp-tempo-val').textContent = e.target.value + '/分'; };

  // 纯音频重播问句（不改游戏状态，不清除已弹答句）
  function replayQuestionAudio() {
    if (!game || !game.question.length) return;
    const d = noteDur(); const c = ctx(); const start = c.currentTime + 0.12;
    game.question.forEach((n, i) => {
      tone(n, start + i * d, d * 0.85);
      setTimeout(() => { if (kb) kb.flash(n, '#22d3ee'); }, 120 + i * d * 1000);
    });
  }

  askBtn.onclick = ask;
  replayBtn.onclick = replayQuestionAudio;
  doneBtn.onclick = showScore;

  // 真实 MIDI 驱动（钢琴自己发声，这里只记录答句）
  callRespOnNote = (midi) => feed(midi);
}

function renderRhythmEcho() {
  const root = $('#module-rhyecho');
  let levelId = RE_LEVELS[0].id;   // 当前难度

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🥁 节奏回声</h2>
    <p style="color:var(--muted);margin-bottom:14px">节奏记忆游戏（节奏版的 <b>Simon</b>）：app 用<b>亮灯 + 打点</b>播放一段节奏型（长长短短…），你在<b>琴键 / 空格 / 敲击区</b>把它<b>拍回来</b>。拍对了，节奏型就<b>加长一个音</b>，越来越长 🎶。判定<b>与速度无关</b>——不要求你卡死在某个 BPM，只看你拍出来的<b>长短比例</b>对不对。这是「旋律回声」的<b>节奏姊妹篇</b>：那个练音高记忆，这个练<b>时值记忆 + 内在拍感</b>，零基础也能玩。</p>

    <div class="card-panel">
      <div class="param-row"><label>难度 / 时值</label>
        <div id="rhe-levels" class="ear-chips">${RE_LEVELS.map(l => `<button class="ear-chip${l.id === levelId ? ' on' : ''}" data-l="${l.id}">${l.name}</button>`).join('')}</div>
      </div>
      <div class="param-row" style="gap:18px;flex-wrap:wrap">
        <label>示范速度
          <input id="rhe-tempo" type="range" min="50" max="140" value="84" class="trans-slider" style="max-width:180px;vertical-align:middle">
          <span id="rhe-tempo-val" style="color:#667eea;font-weight:700">84/分</span>
        </label>
      </div>
    </div>

    <div class="card-panel">
      <div id="rhe-banner" class="me-banner">点 <b>▶ 开始</b>，听一段节奏再<b>拍回来</b> 🥁</div>
      <div class="cresp-phrase"><span class="cresp-phrase-lbl">🥁 节奏型</span><div id="rhe-seq" class="me-track"></div></div>
      <div class="cresp-phrase"><span class="cresp-phrase-lbl">👏 你拍的</span><div id="rhe-taps" class="me-track"></div></div>
      <div id="rhe-score" class="cresp-score" style="display:none"></div>
      <button id="rhe-pad" class="rhe-pad" disabled>👏 敲这里（或按空格 / 任意琴键）</button>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="rhe-stars" class="sight-stat-num">—</div><div class="sight-stat-lbl">本次评星</div></div>
      <div class="sight-stat"><div id="rhe-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最长节奏</div></div>
      <div class="sight-stat"><div id="rhe-rounds" class="sight-stat-num">0</div><div class="sight-stat-lbl">连过轮数</div></div>
    </div>

    <div class="rotate-bar">
      <button id="rhe-start" class="big-btn">▶ 开始</button>
      <button id="rhe-replay" class="big-btn" style="background:#667eea" disabled>🔊 再听一遍</button>
      <button id="rhe-restart" class="big-btn" style="background:#f59e0b" disabled>↺ 重新挑战</button>
    </div>`;

  let game = null, ac = null, playTimers = [];
  let taps = [];        // 本轮敲击时间戳（performance.now()）
  let capturing = false;
  const bannerEl = $('#rhe-banner');
  const seqEl = $('#rhe-seq'), tapsEl = $('#rhe-taps'), scoreEl = $('#rhe-score');
  const starsEl = $('#rhe-stars'), bestEl = $('#rhe-best'), roundsEl = $('#rhe-rounds');
  const padEl = $('#rhe-pad');
  const startBtn = $('#rhe-start'), replayBtn = $('#rhe-replay'), restartBtn = $('#rhe-restart');

  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  // 节奏打点用一个短促的木鱼/click 音（噪声脉冲 + 高频三角）
  function tick(when, accent = false) {
    try {
      const c = ctx();
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = accent ? 1320 : 880;
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(accent ? 0.4 : 0.28, when + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
      o.start(when); o.stop(when + 0.14);
    } catch { /* 无音频环境忽略 */ }
  }
  function beatMs() { return 60000 / (+$('#rhe-tempo').value); }
  function clearTimers() { playTimers.forEach(clearTimeout); playTimers = []; }
  function band(cls, html) { bannerEl.className = 'me-banner' + (cls ? ' ' + cls : ''); bannerEl.innerHTML = html; }
  function curLevel() { return reLevelById(levelId); }

  // 把节奏型画成一排"长短块"（块宽 ∝ 时值），可选高亮当前敲到第几个
  function paintSeq(el, seq, opt = {}) {
    if (!seq || !seq.length) { el.innerHTML = opt.placeholder || ''; return; }
    el.innerHTML = seq.map((d, i) => {
      const w = Math.round(20 + d * 26);   // 时值越长，块越宽
      let cls = 'rhe-block';
      if (opt.litUpTo != null && i < opt.litUpTo) cls += ' done';
      if (opt.err != null && i === opt.err) cls += ' err';
      return `<div class="${cls}" data-i="${i}" style="width:${w}px">${reDurName(d)}</div>`;
    }).join('');
  }

  // 把玩家敲的次数画成等宽点（实时反馈"已敲 k 个"）
  function paintTaps(el, k, total) {
    let html = '';
    for (let i = 0; i < total; i++) html += `<div class="rhe-tap${i < k ? ' hit' : ''}"></div>`;
    el.innerHTML = html;
  }

  function updateStats() {
    bestEl.textContent = game ? game.best : 0;
    roundsEl.textContent = game ? game.rounds : 0;
  }

  // 播放当前节奏型（亮块 + 打点），结束后轮到玩家
  function playSeq() {
    if (!game || !game.seq.length) return;
    clearTimers();
    capturing = false;
    padEl.disabled = true;
    replayBtn.disabled = true; restartBtn.disabled = true;
    scoreEl.style.display = 'none';
    starsEl.textContent = '—';
    band('show', `👂 听这段节奏（<b>${game.seq.length}</b> 个音）…`);
    paintSeq(seqEl, game.seq, { masked: true });
    paintTaps(tapsEl, 0, game.seq.length);
    const bm = beatMs(); const c = ctx(); const start = c.currentTime + 0.25;
    let acc = 0;  // 累计拍数（用于排起拍点）
    game.seq.forEach((d, i) => {
      const whenMs = 250 + acc * bm;
      tick(start + acc * (bm / 1000), i === 0);
      playTimers.push(setTimeout(() => {
        const blk = seqEl.querySelector(`.rhe-block[data-i="${i}"]`);
        if (blk) { blk.classList.add('beat'); setTimeout(() => blk.classList.remove('beat'), Math.min(260, d * bm)); }
      }, whenMs));
      acc += d;
    });
    // 播放总时长 = 累计拍 * beatMs（最后一个音的时值也算延音）
    const totalMs = 250 + acc * bm + 160;
    playTimers.push(setTimeout(() => {
      if (!game) return;
      game.ready();
      taps = [];
      capturing = true;
      padEl.disabled = false;
      replayBtn.disabled = false; restartBtn.disabled = false;
      band('input', `👏 轮到你！把这段节奏<b>拍 ${game.seq.length} 下</b>拍回来（速度随你，长短对就行）`);
    }, totalMs));
  }

  // 一次敲击
  function onTap() {
    if (!capturing || !game || game.state !== 'input') return;
    taps.push(performance.now());
    padEl.classList.remove('rhe-pad-hit'); void padEl.offsetWidth; padEl.classList.add('rhe-pad-hit');
    paintTaps(tapsEl, taps.length, game.seq.length);
    tick(ctx().currentTime, false);
    if (taps.length >= game.seq.length) {
      capturing = false;
      padEl.disabled = true;
      // 稍等一拍让最后一下"落定"，再评分
      playTimers.push(setTimeout(submitTaps, 80));
    }
  }

  function submitTaps() {
    if (!game) return;
    const g = game.submit(taps);
    if (!g) return;
    updateStats();
    const acc = Math.round(g.accuracy * 100);
    let stars = 0;
    if (g.allOk) stars = g.accuracy >= 0.85 ? 3 : 2;
    else if (g.countOk && g.accuracy >= 0.6) stars = 1;
    starsEl.textContent = stars ? '⭐'.repeat(stars) : '—';
    const starStr = stars ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '☆☆☆';
    scoreEl.style.display = '';
    let detail;
    if (!g.countOk) {
      detail = `<span class="cresp-bar no">✗ 拍了 ${g.actualTaps} 下，应是 ${g.expectedTaps} 下</span>`;
    } else {
      detail = `<span class="cresp-bar ${g.allOk ? 'ok' : 'no'}">${g.allOk ? '✓ 长短全对' : '✗ 第 ' + (g.firstError + 1) + ' 段长短不对'}</span>
                <span class="cresp-bar ${acc >= 80 ? 'ok' : 'mid'}">节奏准度 ${acc}%</span>`;
    }
    scoreEl.innerHTML = `
      <div class="cresp-score-stars">${starStr}</div>
      <div class="cresp-score-num">${g.allOk ? '过关！' : '再来一次'}</div>
      <div class="cresp-score-bars">${detail}</div>
      <div class="cresp-score-fb">${rheFeedback(g, stars)}</div>`;
    paintSeq(seqEl, game.seq, g.allOk ? {} : { err: g.firstError });
    recordPractice('rhyecho', '🥁 节奏回声', game.rounds + (g.allOk ? 0 : 1), game.rounds, game.best);
    replayBtn.disabled = true;
    if (g.allOk) {
      band('win', `🌟 拍对了！节奏长到 <b>${game.seq.length + 1}</b> 个音，继续…`);
      restartBtn.disabled = true;
      startBtn.disabled = true;
      playTimers.push(setTimeout(() => {
        if (!game) return;
        game.grow();
        startBtn.disabled = false;
        playSeq();
      }, 1100));
    } else {
      band('show', `🌱 差一点！最长记录 <b>${game.best}</b> 个音。点「↺ 重新挑战」再来`);
      restartBtn.disabled = false;
      startBtn.textContent = '▶ 开始';
      startBtn.disabled = false;
    }
  }

  function rheFeedback(g, stars) {
    if (!g.countOk) return '💡 数一数节奏里有几个音，<b>拍同样的次数</b>哦';
    if (stars === 3) return '🌟 节奏感超棒！长短比例拿捏得很稳';
    if (g.allOk) return '👍 长短都对！再稳一点就满星了';
    return `💡 注意第 <b>${g.firstError + 1}</b> 段——${g.perGap[g.firstError] && g.perGap[g.firstError].actMs > g.scale * g.perGap[g.firstError].expBeat ? '拍得太慢（太长）' : '拍得太快（太短）'}了`;
  }

  function startGame() {
    const lv = curLevel();
    if (!game) game = new RhythmEcho({ pool: lv.pool, startLen: lv.startLen, tol: lv.tol });
    game.pool = lv.pool; game.startLen = lv.startLen; game.tol = lv.tol;
    game.start();
    if (typeof window !== 'undefined') window.__rheGame = game;  // 调试钩子
    updateStats();
    startBtn.textContent = '▶ 重新开始';
    playSeq();
  }

  $('#rhe-levels').querySelectorAll('button').forEach(b => b.onclick = () => {
    levelId = b.dataset.l;
    $('#rhe-levels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    // 切换难度后下一局生效
  });
  $('#rhe-tempo').oninput = (e) => { $('#rhe-tempo-val').textContent = e.target.value + '/分'; };

  // 纯音频重播（不改状态、不清空已敲）
  function replaySeqAudio() {
    if (!game || !game.seq.length) return;
    const bm = beatMs(); const c = ctx(); const start = c.currentTime + 0.12; let acc = 0;
    game.seq.forEach((d, i) => {
      tick(start + acc * (bm / 1000), i === 0);
      const blk0 = seqEl.querySelector(`.rhe-block[data-i="${i}"]`);
      setTimeout(() => { if (blk0) { blk0.classList.add('beat'); setTimeout(() => blk0.classList.remove('beat'), 200); } }, 120 + acc * bm);
      acc += d;
    });
  }

  startBtn.onclick = startGame;
  replayBtn.onclick = replaySeqAudio;
  restartBtn.onclick = () => { if (!game) return; game.restart(); updateStats(); playSeq(); };
  padEl.onclick = onTap;

  // 空格键当一次敲击（只在本模块可见时）
  document.addEventListener('keydown', (e) => {
    if (e.code !== 'Space') return;
    const sec = $('#module-rhyecho');
    if (!sec || !sec.classList.contains('active')) return;
    e.preventDefault();
    onTap();
  });

  // 真实 MIDI 驱动：任意 note-on 当一次敲击
  rhythmEchoTap = () => onTap();
}

function renderPitchDirection() {
  const root = $('#module-pitchdir');
  let levelId = PD_LEVELS[0].id;

  root.innerHTML = `
    <h2 style="margin-bottom:6px">↕️ 高低音方向感</h2>
    <p style="color:var(--muted);margin-bottom:14px"><b>零基础音高启蒙</b>：钢琴先弹一个<b>参考音</b>（金色键🟡），再告诉你一个方向——<b>⬆️ 弹个更高的</b> 或 <b>⬇️ 弹个更低的</b>。你在琴上<b>随便弹一个音</b>，只要方向对、又差得<b>够明显</b>就算对！<b>不用找准某个音</b>，怕弹错的孩子也敢探索。这练的是最基础的一课：<b>「高的音在右边、低的音在左边」「这个音比那个高还是低」</b>。答对连击 +1，难度越高，要求你能分辨的高低差越小（大跳→五度→三度→一步之遥），越来越考耳朵。</p>

    <div class="card-panel">
      <div class="param-row"><label>难度</label>
        <div id="pd-levels" class="ear-chips">${PD_LEVELS.map(l => `<button class="ear-chip${l.id === levelId ? ' on' : ''}" data-l="${l.id}">${l.name}</button>`).join('')}</div>
      </div>
    </div>

    <div class="card-panel">
      <div id="pd-banner" class="me-banner">点 <b>▶ 出题</b>，听参考音再按方向弹一个音 🎹</div>
      <div id="pd-arrow" class="pd-arrow">↕️</div>
      <div id="pd-prompt" class="pd-prompt">准备好了吗？</div>
      <div id="pd-result" class="pd-result" style="display:none"></div>
      <div id="pd-kb" class="me-kb"></div>
    </div>

    <div class="sight-stats">
      <div class="sight-stat"><div id="pd-streak" class="sight-stat-num">0</div><div class="sight-stat-lbl">当前连击</div></div>
      <div class="sight-stat"><div id="pd-best" class="sight-stat-num">0</div><div class="sight-stat-lbl">最佳连击</div></div>
      <div class="sight-stat"><div id="pd-acc" class="sight-stat-num">—</div><div class="sight-stat-lbl">正确率</div></div>
    </div>

    <div class="rotate-bar">
      <button id="pd-ask" class="big-btn">▶ 出题</button>
      <button id="pd-replay" class="big-btn" style="background:#667eea" disabled>🔊 再听参考音</button>
    </div>`;

  let game = null, kb = null, ac = null;
  const bannerEl = $('#pd-banner');
  const arrowEl = $('#pd-arrow'), promptEl = $('#pd-prompt'), resultEl = $('#pd-result');
  const streakEl = $('#pd-streak'), bestEl = $('#pd-best'), accEl = $('#pd-acc');
  const askBtn = $('#pd-ask'), replayBtn = $('#pd-replay');

  function ctx() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); return ac; }
  function tone(midi, when, dur, gain = 0.26) {
    try {
      const c = ctx(); const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle';
      o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12);
      o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(gain, when + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.start(when); o.stop(when + dur + 0.02);
    } catch { /* 无音频环境忽略 */ }
  }
  function band(cls, html) { bannerEl.className = 'me-banner' + (cls ? ' ' + cls : ''); bannerEl.innerHTML = html; }
  function curLevel() { return pdLevelById(levelId); }

  function ensureKb() {
    if (kb) return;
    kb = new PianoKeyboard($('#pd-kb'), {
      labels: 'c',
      onNoteOn: (m) => { try { playTone(midiToFreq(m), 0, 0.5, 0.2); } catch (_) { /* ignore */ } feed(m); },
    });
  }

  function paintRef() {
    if (!kb || !game || !game.prompt) return;
    kb.clear();
    const ref = game.prompt.ref;
    if (kb.scrollToShow) kb.scrollToShow(ref - 12, ref + 12);
    if (kb.highlightMany) kb.highlightMany([{ midi: ref, color: '#fbbf24', text: '参考' }]);
  }

  function updateStats() {
    streakEl.textContent = game ? game.streak : 0;
    bestEl.textContent = game ? game.best : 0;
    accEl.textContent = game && game.attempts ? Math.round(game.accuracy() * 100) + '%' : '—';
  }

  // 播放参考音并亮键，结束后轮到玩家
  function playRef() {
    if (!game || !game.prompt) return;
    const ref = game.prompt.ref;
    const c = ctx(); tone(ref, c.currentTime + 0.1, 0.7);
    paintRef();
    if (kb) setTimeout(() => kb.flash(ref, '#fbbf24'), 100);
  }

  function ask() {
    ensureKb();
    if (!game) game = new PitchDirection({ level: curLevel() });
    game.setLevel(curLevel());
    const p = game.next();
    if (typeof window !== 'undefined') window.__pdGame = game;
    resultEl.style.display = 'none';
    arrowEl.textContent = p.dir === 'up' ? '⬆️' : '⬇️';
    arrowEl.className = 'pd-arrow ' + (p.dir === 'up' ? 'up' : 'down');
    promptEl.innerHTML = `先听这个<b>参考音</b>，然后<b>弹一个${pdDirName(p.dir)}的音</b>`;
    band('show', `🟡 参考音响起，记住它的高低…`);
    playRef();
    game.ready();
    band('input', `🎹 轮到你！弹一个 <b>${pdDirName(p.dir)}</b> 的音（差得明显点）`);
    replayBtn.disabled = false;
    askBtn.textContent = '▶ 下一题';
  }

  function feed(note) {
    if (!game || game.state !== 'answer') return;
    const j = game.answer(note);
    if (!j) return;
    updateStats();
    if (kb) kb.flash(note, j.correct ? '#34d399' : '#fb7185');
    resultEl.style.display = '';
    const dirCN = game.prompt.dir === 'up' ? '更高' : '更低';
    if (j.correct) {
      resultEl.className = 'pd-result ok';
      resultEl.innerHTML = `✅ <b>对！</b>你弹的音确实${dirCN}（相差 ${Math.abs(j.gap)} 个半音）　连击 ${game.streak} 🔥`;
      band('win', '🌟 方向正确！继续下一题');
    } else {
      resultEl.className = 'pd-result no';
      let why;
      if (!j.rightDir) why = `方向反了——要弹<b>${dirCN}</b>的音，你弹的却${j.gap > 0 ? '更高' : (j.gap < 0 ? '更低' : '一样高')}`;
      else why = `方向对，但<b>差得不够明显</b>（只差 ${Math.abs(j.gap)} 个半音，要 ≥ ${game.prompt.minGap}）`;
      resultEl.innerHTML = `❌ ${why}`;
      band('show', '🌱 再试一次，注意方向和幅度');
    }
    recordPractice('pitchdir', '↕️ 高低音方向感', game.attempts, game.correct, game.best);
    replayBtn.disabled = true;
  }

  $('#pd-levels').querySelectorAll('button').forEach(b => b.onclick = () => {
    levelId = b.dataset.l;
    $('#pd-levels').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    if (game) game.setLevel(curLevel());
  });

  askBtn.onclick = ask;
  replayBtn.onclick = playRef;

  // 真实 MIDI 驱动
  pitchDirOnNote = (midi) => feed(midi);
}

function renderCircleFifths() {
  const root = $('#module-cof');
  let selMajor = 'C';   // 当前选中大调

  root.innerHTML = `
    <h2 style="margin-bottom:6px">🎡 五度圈（Circle of Fifths）</h2>
    <p style="color:var(--muted);margin-bottom:14px">乐理中枢工具：顺时针每走一格升一个<b>五度</b>（多 1 个升号 ♯），逆时针每格降五度（多 1 个降号 ♭）。点圈上任意调，立刻看它的<b>调号</b>、<b>关系小调</b>（外环大调／内环小调共用调号）、正确拼写的<b>音阶</b>与<b>顺阶和弦 I–vii°</b>，并能在钢琴上<b>试听音阶 / 和弦 / I–IV–V–I 终止式</b>。相邻调只差一个音，是<b>转调、扒谱、即兴配和声</b>的核心地图。</p>

    <div class="cof-layout">
      <div class="cof-wheel-wrap">
        <svg id="cof-svg" viewBox="0 0 340 340" class="cof-svg" role="img" aria-label="五度圈"></svg>
        <div class="cof-legend"><span class="cof-dot maj"></span>外环=大调　<span class="cof-dot min"></span>内环=关系小调</div>
      </div>
      <div class="cof-info" id="cof-info"></div>
    </div>

    <div class="kb-wrap">
      <div class="kb-cap">🎹 当前调音阶高亮于此（主音金色）；点和弦/终止式会点亮并试听（接 CA99 则可直接弹真琴）</div>
      <div id="cof-kb"></div>
    </div>`;

  const cofKb = new PianoKeyboard($('#cof-kb'), {
    labels: 'c',
    onNoteOn: (m) => playTone(midiToFreq(m), 0, 0.6),
  });

  const CX = 170, CY = 170;
  const RR = { oOut: 162, oIn: 112, iOut: 110, iIn: 64 };
  function pt(r, deg) {
    const a = (deg - 90) * Math.PI / 180;
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  }
  function sector(rIn, rOut, a0, a1) {
    const [x0, y0] = pt(rOut, a0), [x1, y1] = pt(rOut, a1);
    const [x2, y2] = pt(rIn, a1), [x3, y3] = pt(rIn, a0);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} A${rOut},${rOut} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} `
      + `L${x2.toFixed(1)},${y2.toFixed(1)} A${rIn},${rIn} 0 0 0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`;
  }
  function wheelEntry(maj) { return COF_WHEEL.find((w) => w.major === maj || w.enharmonic === maj); }

  function buildWheel() {
    const relMin = wheelEntry(selMajor).minor;
    let segs = '', labels = '';
    COF_WHEEL.forEach((w, i) => {
      const a0 = i * 30 - 15, a1 = i * 30 + 15;
      const selO = w.major === selMajor;
      const selI = w.minor === relMin;
      segs += `<path class="cof-seg cof-major${selO ? ' sel' : ''}" data-major="${w.major}" d="${sector(RR.oIn, RR.oOut, a0, a1)}"></path>`;
      segs += `<path class="cof-seg cof-minor${selI ? ' sel' : ''}" data-major="${w.major}" d="${sector(RR.iIn, RR.iOut, a0, a1)}"></path>`;
      const [mx, my] = pt((RR.oOut + RR.oIn) / 2, i * 30);
      const majLabel = w.enharmonic ? `${w.major}/${w.enharmonic}` : w.major;
      labels += `<text class="cof-lbl cof-lbl-maj${selO ? ' sel' : ''}" x="${mx.toFixed(1)}" y="${my.toFixed(1)}">${majLabel}</text>`;
      const [nx, ny] = pt((RR.iOut + RR.iIn) / 2, i * 30);
      labels += `<text class="cof-lbl cof-lbl-min${selI ? ' sel' : ''}" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}">${w.minor}</text>`;
    });
    const w = wheelEntry(selMajor);
    const hub = `<circle class="cof-hub" cx="${CX}" cy="${CY}" r="${RR.iIn - 4}"></circle>`
      + `<text class="cof-hub-key" x="${CX}" y="${CY - 5}">${selMajor}</text>`
      + `<text class="cof-hub-sig" x="${CX}" y="${CY + 16}">${cofSigLabel(w)}</text>`;
    $('#cof-svg').innerHTML = segs + hub + labels;
    $('#cof-svg').querySelectorAll('.cof-seg').forEach((el) => {
      el.onclick = () => { selMajor = el.dataset.major; refresh(); };
    });
  }

  function paintScale() {
    const notes = cofScaleMidi(selMajor, 60);
    const spelling = cofSpelling(selMajor);
    cofKb.first = 60; cofKb.last = 84; cofKb.layout = kbBuildLayout(60, 84); cofKb._render();
    const items = notes.map((m, idx) => ({
      midi: m,
      color: (idx === 0 || idx === 7) ? '#fbbf24' : HL_PALETTE[0],
      text: spelling[idx % 7],
    }));
    cofKb.highlightMany(items, { scroll: false });
  }

  function playScale() {
    const notes = cofScaleMidi(selMajor, 60);
    notes.forEach((m, i) => setTimeout(() => {
      playTone(midiToFreq(m), 0, 0.45); cofKb.flash(m, '#fbbf24');
    }, i * 230));
    setTimeout(paintScale, notes.length * 230 + 200);
  }

  function playChord(deg, btn) {
    const notes = cofChordMidi(selMajor, deg, 60);
    notes.forEach((m) => playTone(midiToFreq(m), 0, 1.0));
    cofKb.highlightMany(notes.map((m) => ({ midi: m, color: '#34d399' })), { scroll: false });
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 420); }
    setTimeout(paintScale, 950);
  }

  function playCadence() {
    const degs = [1, 4, 5, 1];
    degs.forEach((d, i) => setTimeout(() => {
      const notes = cofChordMidi(selMajor, d, 60);
      notes.forEach((m) => playTone(midiToFreq(m), 0, 0.7));
      cofKb.highlightMany(notes.map((m) => ({ midi: m, color: '#22d3ee' })), { scroll: false });
    }, i * 640));
    setTimeout(paintScale, degs.length * 640 + 300);
  }

  function refresh() {
    buildWheel();
    const w = wheelEntry(selMajor);
    const nb = cofNeighbors(selMajor);
    const spelling = cofSpelling(selMajor);
    const chords = cofChords(selMajor);
    $('#cof-info').innerHTML = `
      <div class="cof-card">
        <div class="cof-keytitle">${selMajor} 大调 <span class="cof-rel">/ ${w.minor} 关系小调</span></div>
        <div class="cof-sigrow"><span class="cof-sig-badge">调号</span> ${cofSigLabel(w)}</div>
        <div class="cof-scale">音阶　${spelling.map((n) => `<span class="cof-deg">${n}</span>`).join('')}</div>
        <div class="cof-neigh">◄ <b>${nb.ccw}</b> 下属（少 1♯）　·　属（多 1♯）<b>${nb.cw}</b> ►</div>
      </div>
      <div class="cof-chords-title">顺阶三和弦（点按试听）</div>
      <div class="cof-chords" id="cof-chords">
        ${chords.map((c, i) => `<button class="cof-chord q-${c.quality || 'maj'}" data-deg="${i + 1}">
          <span class="cof-roman">${c.roman}</span><span class="cof-cname">${c.name}</span></button>`).join('')}
      </div>
      <div class="cof-actions">
        <button id="cof-play-scale" class="big-btn">🔊 播放音阶</button>
        <button id="cof-play-cadence" class="big-btn">🎵 I–IV–V–I 终止式</button>
      </div>`;
    paintScale();
    $('#cof-chords').querySelectorAll('.cof-chord').forEach((b) => {
      b.onclick = () => playChord(parseInt(b.dataset.deg, 10), b);
    });
    $('#cof-play-scale').onclick = playScale;
    $('#cof-play-cadence').onclick = playCadence;
  }

  refresh();
}

// ========== 🎹 MIDI 钢琴卷帘播放器（Piano-Roll Player）==========
function renderMidiPlayer() {
  const root = $('#module-mplayer');
  const PX = 0.14;          // px / ms（卷帘水平比例）
  const ROWH = 11;          // 每个半音的行高
  let songId = DEMO_SONGS[0].id;
  const customSongs = [];   // 上传的 MIDI
  let hand = 'both';        // both | r | l
  let speed = 1;
  let soundOn = true;
  let follow = true;        // 播放头自动滚动
  let practice = false;     // 跟练（按键命中统计）
  let raf = null, playing = false;
  let t = 0, prevT = 0, total = 0, lastNow = 0;
  let notes = [], view = [], roll = null;
  let lo = 48, hi = 72;
  let hits = 0, attempts = 0;
  let kb = null;
  const PC = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = (m) => PC[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  const fmt = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  const allSongs = () => [...DEMO_SONGS, ...customSongs];
  const curSong = () => allSongs().find(s => s.id === songId) || DEMO_SONGS[0];

  root.innerHTML = `
    <div class="mod-head">
      <h2>🎹 钢琴卷帘播放器</h2>
      <p class="mod-sub">把一首 MIDI 完整"画"出来：左右手不同颜色的音块从左向右流过判定线，键盘同步亮灯发声 —— 先看整首怎么弹，再去"跟弹判分"练习。可上传 .mid 文件。</p>
    </div>
    <div class="mpl-bar">
      <span class="mpl-label">曲目</span>
      <div id="mpl-songs" class="mpl-chips"></div>
      <label class="mpl-upload">📂 上传 MIDI
        <input type="file" id="mpl-file" accept=".mid,.midi,audio/midi" style="display:none">
      </label>
    </div>
    <div class="mpl-bar">
      <button id="mpl-play" class="mpl-btn mpl-primary">▶ 播放</button>
      <button id="mpl-stop" class="mpl-btn">⏹ 停止</button>
      <span class="mpl-sep"></span>
      <span class="mpl-label">手</span>
      <div class="mpl-seg" id="mpl-hand">
        <button data-h="both" class="on">双手</button>
        <button data-h="r">右手</button>
        <button data-h="l">左手</button>
      </div>
      <span class="mpl-sep"></span>
      <span class="mpl-label">速度</span>
      <input type="range" id="mpl-speed" min="0.5" max="1.5" step="0.05" value="1">
      <span id="mpl-speed-v" class="mpl-mono">1.00×</span>
      <span class="mpl-sep"></span>
      <label class="mpl-check"><input type="checkbox" id="mpl-sound" checked> 🔊 声音</label>
      <label class="mpl-check"><input type="checkbox" id="mpl-follow" checked> 🎯 跟随</label>
      <label class="mpl-check"><input type="checkbox" id="mpl-practice"> 🏓 跟练</label>
    </div>
    <div class="mpl-info">
      <span id="mpl-title" class="mpl-mono"></span>
      <span id="mpl-time" class="mpl-mono">0:00 / 0:00</span>
      <span id="mpl-counts" class="mpl-mono"></span>
      <span id="mpl-acc" class="mpl-acc" style="display:none"></span>
    </div>
    <div class="mpl-rollwrap" id="mpl-wrap">
      <div class="mpl-gutter" id="mpl-gutter"></div>
      <div class="mpl-rollscroll" id="mpl-scroll">
        <svg id="mpl-svg" class="mpl-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
    </div>
    <input type="range" id="mpl-seek" class="mpl-seek" min="0" max="1000" step="1" value="0">
    <div id="mpl-kb" class="mpl-kb"></div>
  `;

  const svg = $('#mpl-svg'), scroll = $('#mpl-scroll'), wrap = $('#mpl-wrap');
  const gutter = $('#mpl-gutter'), seek = $('#mpl-seek');
  let playhead = null;

  kb = new PianoKeyboard($('#mpl-kb'), {
    labels: 'c',
    onNoteOn: (m) => onKey(m),
  });

  function onKey(m) {
    if (soundOn) playTone(midiToFreq(m), 0, 0.32, 0.2);
    kb.flash(m, '#22d3ee');
    if (practice && playing) {
      attempts++;
      const sounding = mpActiveAt(view, t).some(n => n.midi === m);
      if (sounding) hits++;
      paintAcc();
    }
  }

  function viewNotes(song) {
    return song.notes.filter(n => hand === 'both' || (n.hand || 'r') === hand);
  }

  function buildRoll() {
    const song = curSong();
    notes = song.notes;
    view = viewNotes(song);
    [lo, hi] = mpPitchRange(view.length ? view : notes);
    roll = mpLayoutRoll(view, { pxPerMs: PX, rowH: ROWH, lo, hi, gap: 1, minW: 4 });
    total = mpTotalMs(view.length ? view : notes);
    // SVG 尺寸
    svg.setAttribute('width', String(Math.max(roll.width + 40, 600)));
    svg.setAttribute('height', String(roll.height));
    svg.setAttribute('viewBox', `0 0 ${Math.max(roll.width + 40, 600)} ${roll.height}`);
    // 背景行（黑键行加深）+ 八度线
    let bg = '';
    for (let m = lo; m <= hi; m++) {
      const y = (hi - m) * ROWH;
      const isC = (((m % 12) + 12) % 12) === 0;
      const black = mpIsBlackKey(m);
      const fill = black ? 'rgba(255,255,255,.025)' : 'transparent';
      bg += `<rect x="0" y="${y}" width="100%" height="${ROWH}" fill="${fill}"/>`;
      if (isC) bg += `<line x1="0" y1="${y}" x2="100%" y2="${y}" stroke="rgba(96,165,250,.18)" stroke-width="1"/>`;
    }
    // 节拍/秒 竖线
    let grid = '';
    for (let ms = 0; ms <= total; ms += 1000) {
      const x = ms * PX;
      grid += `<line x1="${x}" y1="0" x2="${x}" y2="${roll.height}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>`;
    }
    // 音块
    let rects = '';
    for (const r of roll.rects) {
      const op = (0.4 + 0.6 * Math.min(1, (r.velocity || 96) / 110)).toFixed(2);
      const cls = r.hand === 'l' ? 'mpl-n-l' : 'mpl-n-r';
      const rx = Math.min(4, r.h / 2);
      rects += `<rect class="${cls}" x="${r.x.toFixed(1)}" y="${r.y}" width="${r.w.toFixed(1)}" height="${r.h}" rx="${rx}" opacity="${op}"/>`;
    }
    svg.innerHTML = `${bg}${grid}${rects}<line id="mpl-head" x1="0" y1="0" x2="0" y2="${roll.height}" class="mpl-head"/>`;
    playhead = $('#mpl-head');
    // 左侧音名（每个 C）
    let g = '';
    for (let m = hi; m >= lo; m--) {
      const isC = (((m % 12) + 12) % 12) === 0;
      g += `<div class="mpl-gline" style="height:${ROWH}px">${isC ? noteName(m) : ''}</div>`;
    }
    gutter.innerHTML = g;
    // 键盘范围
    kb.scrollToShow(lo, hi);
    drawHead(0);
    paintInfo();
  }

  function drawHead(time) {
    const x = mpPlayheadX(time, PX);
    if (playhead) { playhead.setAttribute('x1', x); playhead.setAttribute('x2', x); }
    if (follow) {
      const target = x - wrap.clientWidth * 0.28;
      scroll.scrollLeft = Math.max(0, target);
    }
    seek.value = String(total > 0 ? Math.round((time / total) * 1000) : 0);
    $('#mpl-time').textContent = `${fmt(time)} / ${fmt(total)}`;
  }

  function paintInfo() {
    const st = mpRollStats(view.length ? view : notes, { title: curSong().title, bpm: curSong().bpm });
    $('#mpl-title').textContent = curSong().title;
    $('#mpl-counts').textContent = `${st.count} 音 · 右${st.right}/左${st.left}${st.bpm ? ` · ${st.bpm}bpm` : ''}`;
  }
  function paintAcc() {
    const el = $('#mpl-acc');
    if (!practice) { el.style.display = 'none'; return; }
    el.style.display = '';
    const pct = attempts ? Math.round((hits / attempts) * 100) : 0;
    el.textContent = `🏓 命中 ${hits}/${attempts}（${pct}%）`;
  }

  function highlightActive(time) {
    const act = mpActiveAt(view, time);
    kb.clear();
    for (const n of act) {
      kb.highlight(n.midi, { color: (n.hand === 'l') ? '#c084fc' : '#60a5fa' });
    }
  }

  function frame(now) {
    if (!playing) return;
    const dt = (now - lastNow) * speed;
    lastNow = now;
    prevT = t;
    t += dt;
    if (t >= total) { t = total; }
    // 触发新音：发声 + 闪键
    for (const n of mpTriggered(view, prevT, t)) {
      if (soundOn) playTone(midiToFreq(n.midi), 0, Math.min(0.6, n.durMs / 1000), 0.18);
    }
    highlightActive(t);
    drawHead(t);
    if (t >= total) { stop(true); return; }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (playing) return;
    if (t >= total) t = 0;
    playing = true;
    $('#mpl-play').innerHTML = '⏸ 暂停';
    $('#mpl-play').classList.add('mpl-on');
    lastNow = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function pause() {
    playing = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    $('#mpl-play').innerHTML = '▶ 播放';
    $('#mpl-play').classList.remove('mpl-on');
  }
  function stop(finished) {
    pause();
    t = 0; prevT = 0;
    kb.clear();
    drawHead(0);
    if (finished) {
      $('#mpl-play').innerHTML = '▶ 重播';
    }
  }

  function rebuild(reset = true) {
    if (reset) { t = 0; prevT = 0; hits = 0; attempts = 0; }
    buildRoll();
    paintAcc();
  }

  function renderChips() {
    $('#mpl-songs').innerHTML = allSongs().map(s =>
      `<button class="mpl-chip${s.id === songId ? ' on' : ''}" data-id="${s.id}">${s.title}</button>`).join('');
    $('#mpl-songs').querySelectorAll('.mpl-chip').forEach(b => {
      b.onclick = () => { songId = b.dataset.id; stop(false); renderChips(); rebuild(true); };
    });
  }

  // ---- 事件绑定 ----
  $('#mpl-play').onclick = () => { playing ? pause() : play(); };
  $('#mpl-stop').onclick = () => stop(false);
  $('#mpl-hand').querySelectorAll('button').forEach(b => {
    b.onclick = () => {
      hand = b.dataset.h;
      $('#mpl-hand').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      stop(false); rebuild(true);
    };
  });
  $('#mpl-speed').oninput = (e) => { speed = +e.target.value; $('#mpl-speed-v').textContent = speed.toFixed(2) + '×'; };
  $('#mpl-sound').onchange = (e) => { soundOn = e.target.checked; };
  $('#mpl-follow').onchange = (e) => { follow = e.target.checked; if (follow) drawHead(t); };
  $('#mpl-practice').onchange = (e) => { practice = e.target.checked; hits = 0; attempts = 0; paintAcc(); };
  $('#mpl-seek').oninput = (e) => {
    if (!total) return;
    t = (+e.target.value / 1000) * total; prevT = t;
    highlightActive(t); drawHead(t);
  };
  $('#mpl-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const parsed = parseMidi(buf);
      const id = 'up-' + Date.now();
      const title = '📂 ' + f.name.replace(/\.midi?$/i, '');
      customSongs.push({ id, title, bpm: Math.round(parsed.bpm || 0) || null, notes: parsed.notes });
      songId = id;
      stop(false); renderChips(); rebuild(true);
    } catch (err) {
      alert('MIDI 解析失败：' + (err && err.message ? err.message : err));
    }
    e.target.value = '';
  };

  renderChips();
  rebuild(true);
}

// ========== 🎼 五线谱播放器（Grand-Staff Sheet-Music Viewer）==========
function renderStaffView() {
  const root = $('#module-staffview');
  const PX = 0.18;          // px / ms
  const PAD = 74;           // 左侧谱号留白
  const HALF = 6;           // 半个谱级 = 6px（线间距 12px）
  const TOP = 40;           // 上方加线留白
  const H = TOP + 120 + 40; // 谱表总高（上 + 大谱表 120 + 下）
  const stepY = (s) => TOP + (10 - s) * HALF;
  let songId = DEMO_SONGS[0].id;
  const customSongs = [];
  let hand = 'both', speed = 1, soundOn = true, follow = true, labels = true;
  let raf = null, playing = false;
  let t = 0, prevT = 0, total = 0, lastNow = 0;
  let view = [], glyphs = [];
  let kb = null;
  const allSongs = () => [...DEMO_SONGS, ...customSongs];
  const curSong = () => allSongs().find(s => s.id === songId) || DEMO_SONGS[0];
  const fmt = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

  root.innerHTML = `
    <div class="mod-head">
      <h2>🎼 五线谱播放器</h2>
      <p class="mod-sub">把一首 MIDI <b>排成真正的五线谱</b>（高音谱号 + 低音谱号大谱表，自动加线/升号），<b>橙色光标</b>横扫时键盘同步亮灯发声、当前音符变亮 —— 边听边对着谱学读谱。内置示范曲，<b>可上传 .mid 文件</b>。和"钢琴卷帘"互为表里：卷帘看手位，五线谱看读谱。</p>
    </div>
    <div class="mpl-bar">
      <span class="mpl-label">曲目</span>
      <div id="sv-songs" class="mpl-chips"></div>
      <label class="mpl-upload">📂 上传 MIDI<input type="file" id="sv-file" accept=".mid,.midi,audio/midi" style="display:none"></label>
    </div>
    <div class="mpl-bar">
      <button id="sv-play" class="mpl-btn mpl-primary">▶ 播放</button>
      <button id="sv-stop" class="mpl-btn">⏹ 停止</button>
      <span class="mpl-sep"></span>
      <span class="mpl-label">手</span>
      <div class="mpl-seg" id="sv-hand">
        <button data-h="both" class="on">双手</button>
        <button data-h="r">右手</button>
        <button data-h="l">左手</button>
      </div>
      <span class="mpl-sep"></span>
      <span class="mpl-label">速度</span>
      <input type="range" id="sv-speed" min="0.5" max="1.5" step="0.05" value="1">
      <span id="sv-speed-v" class="mpl-mono">1.00×</span>
      <span class="mpl-sep"></span>
      <label class="mpl-check"><input type="checkbox" id="sv-sound" checked> 🔊 声音</label>
      <label class="mpl-check"><input type="checkbox" id="sv-follow" checked> 🎯 跟随</label>
      <label class="mpl-check"><input type="checkbox" id="sv-labels" checked> 🔤 音名</label>
    </div>
    <div class="mpl-info">
      <span id="sv-title" class="mpl-mono"></span>
      <span id="sv-time" class="mpl-mono">0:00 / 0:00</span>
      <span id="sv-counts" class="mpl-mono"></span>
    </div>
    <div class="sv-wrap" id="sv-wrap">
      <div class="sv-scroll" id="sv-scroll">
        <svg id="sv-svg" class="sv-svg" xmlns="http://www.w3.org/2000/svg"></svg>
      </div>
    </div>
    <input type="range" id="sv-seek" class="mpl-seek" min="0" max="1000" step="1" value="0">
    <div id="sv-kb" class="mpl-kb"></div>
  `;

  const svg = $('#sv-svg'), scroll = $('#sv-scroll'), wrap = $('#sv-wrap'), seek = $('#sv-seek');
  let cursor = null;
  kb = new PianoKeyboard($('#sv-kb'), { labels: 'c', onNoteOn: (m) => { if (soundOn) playTone(midiToFreq(m), 0, 0.32, 0.2); kb.flash(m, '#22d3ee'); } });

  function viewNotes(song) { return song.notes.filter(n => hand === 'both' || (n.hand || 'r') === hand); }

  function staffLines(x2) {
    let s = '';
    // 高音谱表 5 线（step 2..10）+ 低音谱表 5 线（step -2..-10）
    for (const st of [10, 8, 6, 4, 2, -2, -4, -6, -8, -10]) {
      const y = stepY(st);
      s += `<line x1="0" y1="${y}" x2="${x2}" y2="${y}" stroke="rgba(226,232,240,.28)" stroke-width="1"/>`;
    }
    // 谱号（unicode 谱号字符）
    s += `<text x="14" y="${stepY(4) + 6}" class="sv-clef">𝄞</text>`;
    s += `<text x="16" y="${stepY(-4) + 4}" class="sv-clef sv-clef-b">𝄢</text>`;
    // 左侧连接括线
    s += `<line x1="2" y1="${stepY(10)}" x2="2" y2="${stepY(-10)}" stroke="rgba(226,232,240,.4)" stroke-width="2"/>`;
    return s;
  }

  function build() {
    const song = curSong();
    view = viewNotes(song);
    const lay = svLayoutStaff(view, { pxPerMs: PX, leftPad: PAD, bpm: song.bpm || 120, beatsPerBar: 4 });
    glyphs = lay.glyphs;
    total = svTotalMs(view.length ? view : song.notes);
    const W = Math.max(lay.width, 640);
    svg.setAttribute('width', String(W));
    svg.setAttribute('height', String(H));
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    let body = staffLines(W);
    // 小节线
    for (const bx of lay.barlines) {
      if (bx <= PAD + 1) continue;
      body += `<line x1="${bx.toFixed(1)}" y1="${stepY(10)}" x2="${bx.toFixed(1)}" y2="${stepY(-10)}" stroke="rgba(148,163,184,.22)" stroke-width="1"/>`;
    }
    // 音符
    glyphs.forEach((g, i) => {
      const y = stepY(g.step);
      const cls = g.clef === 'bass' ? 'sv-n-l' : 'sv-n-r';
      // 加线
      for (const ls of g.ledgers) {
        const ly = stepY(ls);
        body += `<line x1="${(g.x - 9).toFixed(1)}" y1="${ly}" x2="${(g.x + 9).toFixed(1)}" y2="${ly}" stroke="rgba(226,232,240,.5)" stroke-width="1"/>`;
      }
      // 符干
      const stemUp = g.step < (g.clef === 'bass' ? -6 : 6);
      const sx = stemUp ? g.x + 5.4 : g.x - 5.4;
      const sy2 = stemUp ? y - 30 : y + 30;
      body += `<line class="sv-stem" x1="${sx.toFixed(1)}" y1="${y}" x2="${sx.toFixed(1)}" y2="${sy2}" />`;
      // 升号
      if (g.accidental) body += `<text x="${(g.x - 16).toFixed(1)}" y="${y + 4}" class="sv-acc">♯</text>`;
      // 符头
      body += `<ellipse class="sv-note ${cls}" data-i="${i}" data-midi="${g.midi}" cx="${g.x.toFixed(1)}" cy="${y}" rx="6" ry="4.6" transform="rotate(-18 ${g.x.toFixed(1)} ${y})"/>`;
      // 音名标签
      if (labels) body += `<text class="sv-lbl" data-i="${i}" x="${g.x.toFixed(1)}" y="${(stemUp ? y + 16 : y - 12).toFixed(1)}" text-anchor="middle">${svNoteName(g.midi).replace('♯', '#')}</text>`;
    });
    body += `<line id="sv-cursor" class="sv-cursor" x1="${PAD}" y1="0" x2="${PAD}" y2="${H}" />`;
    svg.innerHTML = body;
    cursor = $('#sv-cursor');
    kb.scrollToShow(view.length ? Math.min(...view.map(n => n.midi)) : 48, view.length ? Math.max(...view.map(n => n.midi)) : 72);
    drawCursor(0);
    paintInfo();
  }

  function drawCursor(time) {
    const x = svCursorX(time, { pxPerMs: PX, leftPad: PAD });
    if (cursor) { cursor.setAttribute('x1', x); cursor.setAttribute('x2', x); }
    if (follow) scroll.scrollLeft = Math.max(0, x - wrap.clientWidth * 0.32);
    seek.value = String(total > 0 ? Math.round((time / total) * 1000) : 0);
    $('#sv-time').textContent = `${fmt(time)} / ${fmt(total)}`;
  }

  function paintInfo() {
    const r = view.filter(n => (n.hand || 'r') === 'r').length;
    const l = view.length - r;
    $('#sv-title').textContent = curSong().title;
    $('#sv-counts').textContent = `${view.length} 音 · 右${r}/左${l}${curSong().bpm ? ` · ${curSong().bpm}bpm` : ''}`;
  }

  function setActiveGlyphs(time) {
    const act = new Set(svActiveAt(view, time).map(n => n.midi + ':' + n.ms));
    svg.querySelectorAll('.sv-note').forEach(el => {
      const i = +el.dataset.i; const g = glyphs[i];
      el.classList.toggle('on', g && act.has(g.midi + ':' + g.ms));
    });
    kb.clear();
    for (const n of svActiveAt(view, time)) kb.highlight(n.midi, { color: (n.hand === 'l') ? '#c084fc' : '#60a5fa' });
  }

  function frame(now) {
    if (!playing) return;
    const dt = (now - lastNow) * speed; lastNow = now;
    prevT = t; t += dt;
    if (t >= total) t = total;
    for (const n of svTriggered(view, prevT, t)) if (soundOn) playTone(midiToFreq(n.midi), 0, Math.min(0.6, n.durMs / 1000), 0.18);
    setActiveGlyphs(t); drawCursor(t);
    if (t >= total) { stop(true); return; }
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (playing) return;
    if (t >= total) t = 0;
    playing = true;
    $('#sv-play').innerHTML = '⏸ 暂停'; $('#sv-play').classList.add('mpl-on');
    lastNow = performance.now(); raf = requestAnimationFrame(frame);
  }
  function pause() {
    playing = false; if (raf) cancelAnimationFrame(raf); raf = null;
    $('#sv-play').innerHTML = '▶ 播放'; $('#sv-play').classList.remove('mpl-on');
  }
  function stop(finished) {
    pause(); t = 0; prevT = 0; kb.clear();
    svg.querySelectorAll('.sv-note.on').forEach(el => el.classList.remove('on'));
    drawCursor(0);
    if (finished) $('#sv-play').innerHTML = '▶ 重播';
  }
  function rebuild() { t = 0; prevT = 0; build(); }

  function renderChips() {
    $('#sv-songs').innerHTML = allSongs().map(s => `<button class="mpl-chip${s.id === songId ? ' on' : ''}" data-id="${s.id}">${s.title}</button>`).join('');
    $('#sv-songs').querySelectorAll('.mpl-chip').forEach(b => { b.onclick = () => { songId = b.dataset.id; stop(false); renderChips(); rebuild(); }; });
  }

  $('#sv-play').onclick = () => { playing ? pause() : play(); };
  $('#sv-stop').onclick = () => stop(false);
  $('#sv-hand').querySelectorAll('button').forEach(b => { b.onclick = () => { hand = b.dataset.h; $('#sv-hand').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); stop(false); rebuild(); }; });
  $('#sv-speed').oninput = (e) => { speed = +e.target.value; $('#sv-speed-v').textContent = speed.toFixed(2) + '×'; };
  $('#sv-sound').onchange = (e) => { soundOn = e.target.checked; };
  $('#sv-follow').onchange = (e) => { follow = e.target.checked; if (follow) drawCursor(t); };
  $('#sv-labels').onchange = (e) => { labels = e.target.checked; build(); drawCursor(t); };
  $('#sv-seek').oninput = (e) => { if (!total) return; t = (+e.target.value / 1000) * total; prevT = t; setActiveGlyphs(t); drawCursor(t); };
  $('#sv-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const parsed = parseMidi(buf);
      const id = 'up-' + Date.now();
      customSongs.push({ id, title: '📂 ' + f.name.replace(/\.midi?$/i, ''), bpm: Math.round(parsed.bpm || 0) || 120, notes: parsed.notes });
      songId = id; stop(false); renderChips(); rebuild();
    } catch (err) { alert('MIDI 解析失败：' + (err && err.message ? err.message : err)); }
    e.target.value = '';
  };

  renderChips();
  rebuild();
}

// 钢琴卷帘引擎（midi-player.js）适配器：避免与其它模块同名函数冲突
const mpPitchRange = mplPitchRange;
const mpTotalMs = mplTotalMs;
const mpLayoutRoll = mplLayoutRoll;
const mpIsBlackKey = mplIsBlackKey;
const mpPlayheadX = mplPlayheadX;
const mpTriggered = mplTriggered;
const mpActiveAt = mplActiveAt;
const mpRollStats = mplRollStats;

// ---------- 初始化 ----------
async function main() {
  await loadData();

  renderSounds(); renderVT(); renderSystem(); renderRhythm(); renderMonitor(); renderAutoRotate(); renderMorph(); renderVelocity(); renderVelVt(); renderPedal(); renderPresets(); renderChord(); renderMetro(); renderRecorder(); renderScale(); renderSight(); renderEar(); renderDynamics(); renderTransposer(); renderRhythmTrainer(); renderMelody(); renderChordProg(); renderBeatStability(); renderHandsSync(); renderArpeggio(); renderArticulation(); renderPedalTiming(); renderTrill(); renderOrnament(); renderLeap(); renderVoicing(); renderCrescendo(); renderTempoRamp(); renderPolyrhythm(); renderEvenness(); renderFingerInd(); renderScaleSpan(); renderRhythmDictation(); renderSightTranspose(); renderChordInversion(); renderKeySignature(); renderScaleFingering(); renderIntervalBuild(); renderModeId(); renderSolfege(); renderChordQuality(); renderProgressionEar(); renderScoreFollow(); renderCadence(); renderNoteId(); renderStaffRead(); renderSightPhrase(); renderChordSight(); renderRhythmSight(); renderAccompaniment(); renderChordColorBoard(); renderLightShow(); renderMelodyEcho(); renderCallResponse(); renderRhythmEcho(); renderPitchDirection(); renderMidiPlayer(); renderStaffView(); renderCircleFifths(); renderDashboard();
  document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => switchModule(b.dataset.module));
  setupNavSearch();
  // 为每个导航分组标题注入模块数量徽章
  document.querySelectorAll('.nav-group').forEach(g => {
    const title = g.querySelector('.nav-group-title');
    const n = g.querySelectorAll('.nav-btn').length;
    if (title && n && !title.querySelector('.nav-count')) {
      const badge = document.createElement('span');
      badge.className = 'nav-count';
      badge.textContent = String(n);
      title.appendChild(badge);
    }
  });
  // 初始化顶栏面包屑为当前激活模块
  const activeBtn = document.querySelector('.nav-btn.active') || document.querySelector('.nav-btn');
  const crumb = $('#active-crumb');
  if (crumb && activeBtn) crumb.textContent = activeBtn.textContent.trim();
  $('#connect-btn').onclick = connect;
  $('#output-select').onchange = (e) => { if (e.target.value) midi.selectOutput(e.target.value); };
  $('#input-select').onchange = (e) => { if (e.target.value) midi.selectInput(e.target.value); };
  log('App 已加载。点"连接"开始（需 Chrome/Edge + 已连接 CA99）。');
  // 调试钩子：无真机时可在控制台 window.__feedMidi(note, velocity) 模拟弹奏，
  // 用于测试力度感应/联动等依赖 MIDI 输入的模块。
  window.__feedMidi = (note = 60, velocity = 64) => onMidiIn([0x90, note & 0x7f, velocity & 0x7f]);
  window.__feedCC = (controller = 64, value = 127) => onMidiIn([0xB0, controller & 0x7f, value & 0x7f]);
  window.__feedNoteOff = (note = 60) => onMidiIn([0x80, note & 0x7f, 0]);
}
main();
