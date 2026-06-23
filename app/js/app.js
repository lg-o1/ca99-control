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

const midi = new MidiCore();
let SOUNDS = [], SYSEX = [], VT = [], RHYTHM = [];
let rotateEngine = null;   // 自动换音色引擎（模块6使用，提前声明避免 TDZ）
let morphEngine = null;    // VT 渐变引擎（模块7使用，提前声明避免 TDZ）
let velocityRouter = null; // 力度换音色路由（模块8使用，提前声明避免 TDZ）
let velVtLink = null;      // 力度→VT 联动（模块9使用，提前声明避免 TDZ）
let pedalController = null;// 踏板控制扩展（模块10使用，提前声明避免 TDZ）
let presetStore = null;    // 演出预设存储（模块11使用，提前声明避免 TDZ）
const heldNotes = new HeldNotes(); // 当前按下的音符（模块12和弦练习用）
let chordOnNotesChanged = null;    // 和弦面板的音符变化回调（模块12注册）

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
  }
  else if (m.type === 'noteoff') {
    addMonitorLine(`音符 OFF ${CA99.noteName(m.note)}`);
    heldNotes.off(m.note);
    if (chordOnNotesChanged) chordOnNotesChanged(heldNotes.notes);
  }
  else if (m.type === 'cc') {
    addMonitorLine(`CC ${m.controller} = ${m.value}`);
    // 驱动踏板控制扩展
    if (pedalController) pedalController.feedCC(m.controller, m.value);
  }
  else if (m.type === 'sysex') addMonitorLine(`SysEx ← ${CA99.toHex(m.data)}`);
}

function send(bytes) {
  try { midi.send(bytes); }
  catch (e) { log(e.message, 'err'); }
}
function sendMulti(msgs) { msgs.forEach(send); }

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
    <div class="sound-grid" id="sound-grid"></div>`;
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
      <select id="sys-mode"><option value="0">单键盘</option><option value="1">双层(Dual)</option><option value="2">分键(Split)</option><option value="3">四手</option></select></div>`;
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
    <div class="btn-grid" id="rhythm-grid"></div>`;
  const grid = $('#rhythm-grid');
  grid.innerHTML = items.slice(0, 100).map((r, i) => {
    const name = (r && (r.name || r.nameEn || r.value)) || `节奏 ${i}`;
    return `<button class="grid-btn" data-idx="${i}">${i}: ${name}</button>`;
  }).join('');
  grid.querySelectorAll('.grid-btn').forEach(b => {
    b.onclick = () => { send(CA99.buildRhythmSelect(+b.dataset.idx)); log(`节奏 ${b.dataset.idx}`, 'ok'); };
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
    </div>`;

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
      log('和弦挑战: 结束');
      return;
    }
    challenge = new ChordChallenge();
    challenge.onCorrect = () => paintStats();
    challenge.onNew = (q) => { $('#chord-target').textContent = `${q.root} ${q.label}`; };
    challenge.next();
    paintStats();
    $('#chord-start').textContent = '⏸ 结束挑战';
    $('#chord-start').classList.add('running');
    $('#chord-quiz').style.display = 'block';
    log('和弦挑战: 开始', 'ok');
  };
}

// ---------- 模块切换 ----------
function switchModule(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.module === name));
  document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m.id === `module-${name}`));
}

// ---------- 初始化 ----------
async function main() {
  await loadData();
  renderSounds(); renderVT(); renderSystem(); renderRhythm(); renderMonitor(); renderAutoRotate(); renderMorph(); renderVelocity(); renderVelVt(); renderPedal(); renderPresets(); renderChord();
  document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => switchModule(b.dataset.module));
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
