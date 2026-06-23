/**
 * app.js — CA99 Control 统一应用主入口
 * 所有玩法模块集中在此 app 内，通过侧边栏切换。便于统一维护。
 */
import { MidiCore } from './midi-core.js';
import * as CA99 from './ca99.js';
import { RotateEngine, diversePool } from './auto-rotate.js';
import { MorphEngine } from './vt-morph.js';
import { VelocityRouter, splitZones } from './velocity-switch.js';

const midi = new MidiCore();
let SOUNDS = [], SYSEX = [], VT = [], RHYTHM = [];
let rotateEngine = null;   // 自动换音色引擎（模块6使用，提前声明避免 TDZ）
let morphEngine = null;    // VT 渐变引擎（模块7使用，提前声明避免 TDZ）
let velocityRouter = null; // 力度换音色路由（模块8使用，提前声明避免 TDZ）

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
  if (m.type === 'noteon') {
    addMonitorLine(`音符 ON  ${CA99.noteName(m.note)} (${m.note}) 力度 ${m.velocity}`, 'note-on');
    // 驱动 beat 模式的自动换音色
    if (rotateEngine && rotateEngine.running && rotateEngine.mode === 'beat') rotateEngine.tick();
    // 驱动力度感应换音色
    if (velocityRouter) velocityRouter.feed(m.velocity);
  }
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
  // 取「连续数值型」VT 参数：v1=0x50 且恰好 2 条（首=最小值标签，次=最大值标签）
  // 例：StringResonance ['Off','127'] / DamperResonance ['Off','10']。
  // 排除枚举型（Voicing 7 条等离散模式）和 PerNote 命令（1 条）。
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
  const continuous = Object.entries(byParam)
    .filter(([, entries]) => entries.length === 2)
    .map(([pname, entries]) => {
      const min = parseRange(entries[0].value);
      const max = parseRange(entries[1].value);
      return { name: pname, v2: CA99.hex(entries[0].v2), min, max };
    })
    // 只保留 0..max 的正区间（可直接映射到 0-127 数据字节）
    .filter(c => c.min !== null && c.max !== null && c.min >= 0 && c.max > c.min);

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

// ---------- 模块切换 ----------
function switchModule(name) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.module === name));
  document.querySelectorAll('.module').forEach(m => m.classList.toggle('active', m.id === `module-${name}`));
}

// ---------- 初始化 ----------
async function main() {
  await loadData();
  renderSounds(); renderVT(); renderSystem(); renderRhythm(); renderMonitor(); renderAutoRotate(); renderMorph(); renderVelocity();
  document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => switchModule(b.dataset.module));
  $('#connect-btn').onclick = connect;
  $('#output-select').onchange = (e) => { if (e.target.value) midi.selectOutput(e.target.value); };
  $('#input-select').onchange = (e) => { if (e.target.value) midi.selectInput(e.target.value); };
  log('App 已加载。点"连接"开始（需 Chrome/Edge + 已连接 CA99）。');
}
main();
