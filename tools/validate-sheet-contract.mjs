// 校验 OMR 产出的 index.json 是否符合「跟谱契约」(Architecture A)。
// 用真实 parseSheetIndex 解析，逐项断言：playback 顺序 / 重复格同 file /
// beat 单调 / hasBeats / 新字段 (printed_measure·pass·octave_shift) / png 齐全。
// 用法: node tools/validate-sheet-contract.mjs [dataRoot]
import fs from 'node:fs';
import path from 'node:path';
import { parseSheetIndex } from '../app/js/sheet-index.js';

const root = process.argv[2] || 'app/data';
let totalFail = 0, totalOk = 0;

function findIndexes(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...findIndexes(p));
    else if (e.name === 'index.json') out.push(p);
  }
  return out;
}

for (const idxPath of findIndexes(root).sort()) {
  const folder = path.dirname(idxPath);
  const rel = path.relative('.', idxPath);
  const errs = [], warns = [];
  let json;
  try { json = JSON.parse(fs.readFileSync(idxPath, 'utf8')); }
  catch (e) { console.log(`x ${rel}\n    JSON parse error: ${e.message}`); totalFail++; continue; }

  const sheet = parseSheetIndex(json);
  const ms = sheet.measures;

  if (ms.length === 0) errs.push('measures[] 为空');

  for (const m of ms) {
    if (!m.file) errs.push(`#${m.i} 缺 file`);
    else if (!fs.existsSync(path.join(folder, m.file))) errs.push(`png 缺失: ${m.file}`);
    if (!(m.w >= 1)) errs.push(`#${m.i} 非法宽度 w=${m.w}`);
  }

  if (!sheet.hasBeats) errs.push('hasBeats=false（beat_start 非单调 / beatEnd<=beatStart / 缺拍区间）');

  let prev = -Infinity;
  for (const m of ms) {
    if (m.beatStart == null) { warns.push(`#${m.i} 无 beat_start（走均匀回退）`); continue; }
    if (!(m.beatEnd > m.beatStart)) errs.push(`#${m.i} beatEnd(${m.beatEnd})<=beatStart(${m.beatStart})`);
    if (m.beatStart < prev) errs.push(`#${m.i} beat_start ${m.beatStart} < 前一格 ${prev}（非 playback 顺序）`);
    prev = m.beatStart;
  }

  const byPrinted = new Map();
  for (const m of ms) {
    if (!byPrinted.has(m.printedMeasure)) byPrinted.set(m.printedMeasure, new Set());
    byPrinted.get(m.printedMeasure).add(m.file);
  }
  for (const [pm, files] of byPrinted) {
    if (files.size > 1) errs.push(`印刷小节 ${pm} 的多个条目指向不同 file: ${[...files].join(',')}`);
  }

  if (sheet.structure.length) {
    for (const s of sheet.structure) {
      if (!s.type) warns.push('structure 项缺 type');
      if (s.from_printed == null || s.to_printed == null) warns.push(`structure(${s.type}) 缺 from/to_printed`);
    }
  }

  const stem = path.basename(folder);
  const midGuess = path.join(path.dirname(folder), stem + '.mid');
  if (!fs.existsSync(midGuess)) warns.push(`未找到配套 MIDI: ${stem}.mid`);

  const tag = sheet.hasRepeats ? '[反复展开]' : '[一次性]';
  if (errs.length) {
    console.log(`x ${rel} ${tag} meas=${ms.length}`);
    for (const e of errs) console.log(`    x ${e}`);
    for (const w of warns) console.log(`    . ${w}`);
    totalFail++;
  } else {
    console.log(`OK ${rel} ${tag} meas=${ms.length} hasBeats=${sheet.hasBeats} struct=${sheet.structure.length}`);
    for (const w of warns) console.log(`    . ${w}`);
    totalOk++;
  }
}

console.log(`\n=== ${totalOk} 通过, ${totalFail} 失败 ===`);
process.exit(totalFail ? 1 : 0);
