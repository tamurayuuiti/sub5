import { handleSolveButtonClick } from '../solver/solverHandler.js';

// --------------------------------------------------------------------------
// ヒント矛盾チェック・バリデーション
// --------------------------------------------------------------------------
function parseHintsTextArea(text) {
  // 各行ごとに分割し、カンマまたはスペースで区切る
  return text.trim().split('\n').map(row =>
    row.split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && n > 0)
  );
}

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

// --------------------------------------------------------------------------
// ピクロスグリッド生成・描画
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// タイマー・リセット処理
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// エラー表示
// --------------------------------------------------------------------------
window.showErrorPopup = function(msg) {
  alert(msg);
}

// --------------------------------------------------------------------------
// グローバル公開
// --------------------------------------------------------------------------
window.validateHints = validateHints;
window.resetSolveDisplay = resetSolveDisplay;
window.parseHintsTextArea = parseHintsTextArea;
window.renderGridOnPicrossArea = renderGridOnPicrossArea;
window.renderPreview = renderPreview;
window.startTimer = startTimer;
window.stopTimer = stopTimer;

// --------------------------------------------------------------------------
// イベント登録
// --------------------------------------------------------------------------
document.getElementById('solveBtn').addEventListener('click', handleSolveButtonClick);

document.getElementById('generateGridBtn').addEventListener('click', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  if (window.resetEditors) {
    window.resetEditors(rows, cols);
  }
});

// --------------------------------------------------------------------------
// 初期表示処理
// --------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
});
