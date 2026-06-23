/**
 * app.js — CA99 Control 统一应用主入口
 * 所有玩法模块集中在此 app 内，通过侧边栏切换。便于统一维护。
 */
import { MidiCore } from './midi-core.js';
import * as CA99 from './ca99.js';

const midi = new MidiCore();
let SOUNDS = [], SYSEX = [], VT = [], RHYTHM = [];

// ---------- 工具 ----------
const $ = (s) => document.querySelector(s);
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
  if (m.type === 'noteon') addMonitorLine(`音符 ON  ${CA99.noteName(m.note)} (${m.note}) 力度 ${m.velocity}`, 'note-on');
  else if (m.type === 'noteoff') addMonitorLine(`音符 OFF ${CA99.noteName(m.note)}`);
  else if (m.type === 'cc') addMonitorLine(`CC ${m.controller} = ${m.value}`);
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

// ---------- 模块切换 ----------
function switchModule(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.module === name));
  document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m.id === `module-${name}`));
}

// ---------- 初始化 ----------
async function main() {
  await loadData();
  renderSounds(); renderVT(); renderSystem(); renderRhythm(); renderMonitor();
  document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => switchModule(b.dataset.module));
  $('#connect-btn').onclick = connect;
  $('#output-select').onchange = (e) => { if (e.target.value) midi.selectOutput(e.target.value); };
  $('#input-select').onchange = (e) => { if (e.target.value) midi.selectInput(e.target.value); };
  log('App 已加载。点"连接"开始（需 Chrome/Edge + 已连接 CA99）。');
}
main();
