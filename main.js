import { handleSolveButtonClick } from './solverHandler.js';

// --- ヒント入力UI用ロジック ---
const hintData = { cols: [], rows: [] };
let activeColInput = null, activeRowInput = null;

/**
 * ヒント矛盾チェック（行・列ヒントの合計値や不正値・空欄などを検出）
 * @param {number[][]} rowHints
 * @param {number[][]} colHints
 * @returns {{errors: string[], errorTargets: {type: 'row'|'col', index: number}[]}}
 */
function validateHints(rowHints, colHints) {
  const errors = [];
  const errorTargets = [];
  const height = rowHints.length;
  const width = colHints.length;

  // 各行・列ごとのチェック
  for (let i = 0; i < height; i++) {
    const hint = rowHints[i];
    if (!Array.isArray(hint) || hint.length === 0) {
      errors.push(`${i + 1}行目のヒントが空です`);
      errorTargets.push({ type: 'row', index: i });
      continue;
    }
    if (hint.some(n => !Number.isInteger(n) || n <= 0)) {
      errors.push(`${i + 1}行目のヒントに不正な値があります`);
      errorTargets.push({ type: 'row', index: i });
    }
    const minRequired = hint.reduce((a, b) => a + b, 0) + Math.max(0, hint.length - 1);
    if (minRequired > width) {
      errors.push(`${i + 1}行目のヒントが多すぎます`);
      errorTargets.push({ type: 'row', index: i });
    }
  }

  for (let i = 0; i < width; i++) {
    const hint = colHints[i];
    if (!Array.isArray(hint) || hint.length === 0) {
      errors.push(`${i + 1}列目のヒントが空です`);
      errorTargets.push({ type: 'col', index: i });
      continue;
    }
    if (hint.some(n => !Number.isInteger(n) || n <= 0)) {
      errors.push(`${i + 1}列目のヒントに不正な値があります`);
      errorTargets.push({ type: 'col', index: i });
    }
    const minRequired = hint.reduce((a, b) => a + b, 0) + Math.max(0, hint.length - 1);
    if (minRequired > height) {
      errors.push(`${i + 1}列目のヒントが多すぎます`);
      errorTargets.push({ type: 'col', index: i });
    }
  }

  // 全行・全列の合計値チェック
  const rowSum = rowHints.reduce((sum, hint) => sum + (Array.isArray(hint) ? hint.reduce((a, b) => a + b, 0) : 0), 0);
  const colSum = colHints.reduce((sum, hint) => sum + (Array.isArray(hint) ? hint.reduce((a, b) => a + b, 0) : 0), 0);
  if (rowSum !== colSum) {
    errors.push(`全行ヒントの合計値(${rowSum})と全列ヒントの合計値(${colSum})が一致しません`);
    // errorTargetsへの追加はしない
  }

  return { errors, errorTargets };
}

function createHintInputList(type, size) {
  const list = document.getElementById(type === 'cols' ? 'colHintList' : 'rowHintList');
  list.innerHTML = '';
  hintData[type] = Array.from({ length: size }, () => []);
  for (let i = 0; i < size; i++) {
    const row = document.createElement('div');
    row.className = 'hint-input-row';
    const label = document.createElement('span');
    label.className = 'hint-input-label';
    label.textContent = i + 1;
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.pattern = '[0-9, ]*'; // スペースも許可
    input.className = 'hint-input-field';
    input.placeholder = '例: 3,1,2';
    input.addEventListener('focus', () => {
      if (type === 'cols') activeColInput = input;
      else activeRowInput = input;
    });
    input.addEventListener('input', (e) => {
      // 数字・カンマ・スペース以外を除去
      const cleaned = e.target.value.replace(/[^0-9, ]/g, '');
      e.target.value = cleaned;
      // カンマとスペースで分割し、空要素除去
      hintData[type][i] = cleaned.trim().split(/[\s,]+/).map(Number).filter(n => n > 0);
      // 入力ごとに矛盾チェック
      const rows = hintData.rows.length;
      const cols = hintData.cols.length;
      getHints(rows, cols);
    });
    row.appendChild(label);
    row.appendChild(input);
    list.appendChild(row);
  }
}

function setupCommaButton(type) {
  const btn = document.getElementById(type === 'cols' ? 'colCommaBtn' : 'rowCommaBtn');
  btn.addEventListener('mousedown', () => {
    const activeInput = type === 'cols' ? activeColInput : activeRowInput;
    if (activeInput) {
      let val = activeInput.value.replace(/,(\s*)$/, '').trim();
      if (val === '' || val.endsWith(',')) {
        activeInput.focus();
        return;
      }
      activeInput.value = val + ',';
      activeInput.dispatchEvent(new Event('input'));
      activeInput.focus();
    }
  });
}

function resetHintInputs(rows, cols) {
  createHintInputList('cols', cols);
  createHintInputList('rows', rows);
}

/**
 * ユーザー入力ヒントの検証・取得
 * - 検証のみの場合は {errors, errorTargets} を返す
 * - 問題なければ {rowHints, colHints} を返す
 */
function getHints(rows, cols) {
  if (hintData.rows.length !== rows || hintData.cols.length !== cols) {
    return { errors: [`行ヒントは${rows}行、列ヒントは${cols}行で入力してください`], errorTargets: [] };
  }
  // 各行・列の配列の中身がすべて正の整数か判定
  const valid = arr => Array.isArray(arr) && arr.every(n => Number.isInteger(n) && n > 0);
  if (!hintData.rows.every(valid) || !hintData.cols.every(valid)) {
    return { errors: ["ヒントは正の整数のみで入力してください（例: 2,1,3）"], errorTargets: [] };
  }
  // validateHintsを利用
  const { errors, errorTargets } = validateHints(hintData.rows, hintData.cols);
  if (errors.length > 0) {
    return { errors, errorTargets };
  }
  return { rowHints: hintData.rows, colHints: hintData.cols };
}

// --- ピクロスグリッド・プレビュー等 ---
function createPicrossArea(rows, cols) {
  const area = document.getElementById('picrossArea');
  area.innerHTML = '';
  const table = document.createElement('table');
  table.className = 'picross-table';
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'unknown';
      td.id = `cell-${r}-${c}`;
      if ((c + 1) % 5 === 0 && c !== cols - 1) td.classList.add('border-right-bold');
      if ((r + 1) % 5 === 0 && r !== rows - 1) td.classList.add('border-bottom-bold');
      if (c === 0) td.classList.add('border-left-bold');
      if (c === cols - 1) td.classList.add('border-right-bold');
      if (r === 0) td.classList.add('border-top-bold');
      if (r === rows - 1) td.classList.add('border-bottom-bold');
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
  area.appendChild(table);
  document.getElementById('solveBtn').disabled = false;
}

function renderGridOnPicrossArea(grid) {
  const rows = grid.length, cols = grid[0].length;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const td = document.getElementById(`cell-${r}-${c}`);
    if (!td) continue;
    td.className = grid[r][c] === 1 ? 'filled'
      : grid[r][c] === 0 ? 'empty'
      : 'unknown';
  }
}

function renderPreview(grid) {
  const previewArea = document.getElementById('previewArea');
  if (!grid || !grid.length) {
    previewArea.innerHTML = '';
    return;
  }
  let html = '<div style="margin-bottom:4px;font-size:0.95em;color:#555;">全体プレビュー</div>';
  html += '<table class="preview-table">';
  for (let r = 0; r < grid.length; r++) {
    html += '<tr>';
    for (let c = 0; c < grid[0].length; c++) {
      let cls = grid[r][c] === 1 ? 'filled'
              : grid[r][c] === 0 ? 'empty'
              : 'unknown';
      html += `<td class="${cls}"></td>`;
    }
    html += '</tr>';
  }
  html += '</table>';
  previewArea.innerHTML = html;
}

let startTime = 0, timerInterval = null;
function resetGridCellsToUnknown(rows, cols) {
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const td = document.getElementById(`cell-${r}-${c}`);
    if (td) {
      td.classList.remove('filled', 'empty');
      td.classList.add('unknown');
    }
  }
}

function resetSolveDisplay(rows, cols) {
  stopTimer();
  resetGridCellsToUnknown(rows, cols);
  renderPreview([]);
  document.getElementById('time').textContent = `計算時間: 0.00秒 `;
  document.getElementById('count').textContent = '試行回数: 0';
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  startTime = 0;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000);
    document.getElementById('time').textContent = `計算時間: ${elapsed.toFixed(2)}秒 `;
  }, 10);
}

// --- イベントバインド ---
document.getElementById('solveBtn').addEventListener('click', handleSolveButtonClick);

document.getElementById('generateGridBtn').addEventListener('click', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  resetHintInputs(rows, cols);
});

window.addEventListener('DOMContentLoaded', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  resetHintInputs(rows, cols);
  setupCommaButton('cols');
  setupCommaButton('rows');
});

// エラー表示の一元化
window.showErrorPopup = function(msg) {
  alert(msg);
}

// グローバル公開
window.getHints = getHints;
window.validateHints = validateHints; // ← 追加
window.resetSolveDisplay = resetSolveDisplay;
window.renderGridOnPicrossArea = renderGridOnPicrossArea;
window.renderPreview = renderPreview;
window.startTimer = startTimer;
window.stopTimer = stopTimer;
