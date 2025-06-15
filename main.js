import { handleSolveButtonClick } from './solverHandler.js';

function parseHintsTextArea(text) {
  // 各行ごとに分割し、カンマまたはスペースで区切る
  return text.trim().split('\n').map(row =>
    row.split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && n > 0)
  );
}

function createEditorRows(tableId, count) {
  const tbody = document.getElementById(tableId).querySelector('tbody');
  tbody.innerHTML = '';
  for (let i = 1; i <= count; i++) {
    const row = document.createElement('tr');
    row.className = 'line-row';

    const numCell = document.createElement('td');
    numCell.className = 'line-number';
    // 行・列の判定
    if (tableId === 'rowHintTable') {
      numCell.textContent = `${i}行`;
    } else if (tableId === 'colHintTable') {
      numCell.textContent = `${i}列`;
    } else {
      numCell.textContent = i;
    }

    const contentCell = document.createElement('td');
    contentCell.className = 'line-content';
    contentCell.contentEditable = true;
    contentCell.dataset.line = i;
    contentCell.addEventListener('input', () => {
      // 行番号は固定なので何もしない
    });
    contentCell.addEventListener('keydown', (e) => {
      // Enterで下へ
      if (e.key === 'Enter') {
        e.preventDefault();
        const currentRow = e.target.closest('tr');
        const nextRow = currentRow.nextElementSibling;
        if (nextRow) {
          const nextCell = nextRow.querySelector('.line-content');
          nextCell.focus();
        }
      }
      // 上下矢印で移動
      else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const currentRow = e.target.closest('tr');
        let targetRow;
        if (e.key === 'ArrowUp') {
          targetRow = currentRow.previousElementSibling;
        } else {
          targetRow = currentRow.nextElementSibling;
        }
        if (targetRow) {
          const targetCell = targetRow.querySelector('.line-content');
          // キャレット位置を維持
          const sel = window.getSelection();
          const pos = sel && sel.focusOffset ? sel.focusOffset : null;
          targetCell.focus();
          if (pos !== null) {
            // キャレット位置を再現
            const range = document.createRange();
            range.selectNodeContents(targetCell);
            range.collapse(true);
            // 文字数を超えないように
            const len = targetCell.textContent.length;
            const caret = Math.min(pos, len);
            range.setStart(targetCell.firstChild || targetCell, caret);
            range.setEnd(targetCell.firstChild || targetCell, caret);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
      // 先頭でDeleteなら前の段に移動
      else if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        // キャレットが先頭にあるかつ、空欄または先頭にいる場合
        if (
          sel &&
          sel.anchorNode &&
          sel.anchorOffset === 0 &&
          (
            sel.anchorNode === contentCell ||
            sel.anchorNode === contentCell.firstChild ||
            contentCell.textContent.length === 0
          )
        ) {
          const currentRow = e.target.closest('tr');
          const prevRow = currentRow.previousElementSibling;
          if (prevRow) {
            e.preventDefault();
            const prevCell = prevRow.querySelector('.line-content');
            prevCell.focus();
            // キャレットを末尾に
            const range = document.createRange();
            range.selectNodeContents(prevCell);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      }
    });

    row.appendChild(numCell);
    row.appendChild(contentCell);
    tbody.appendChild(row);
  }
}

function getEditorValues(tableId) {
  const tbody = document.getElementById(tableId).querySelector('tbody');
  return Array.from(tbody.querySelectorAll('.line-content')).map(cell => cell.textContent.trim());
}

function parseHintsEditor(lines) {
  // 各行ごとに分割し、カンマまたはスペースで区切る
  return lines.map(row =>
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

// テキストエリア入力・スクロール時に番号を同期
function setupHintLabelSync() {
  const rowInput = document.getElementById('rowHintsInput');
  const colInput = document.getElementById('colHintsInput');
  if (rowInput) {
    rowInput.addEventListener('input', () => {
      updateHintLabels(
        parseInt(document.getElementById('rowSize').value, 10),
        parseInt(document.getElementById('colSize').value, 10)
      );
    });
    rowInput.addEventListener('scroll', () => {
      document.getElementById('rowHintLabels').scrollTop = rowInput.scrollTop;
    });
  }
  if (colInput) {
    colInput.addEventListener('input', () => {
      updateHintLabels(
        parseInt(document.getElementById('rowSize').value, 10),
        parseInt(document.getElementById('colSize').value, 10)
      );
    });
    colInput.addEventListener('scroll', () => {
      document.getElementById('colHintLabels').scrollTop = colInput.scrollTop;
    });
  }
}

function getHints(rows, cols) {
  const rowLines = getEditorValues('rowHintTable');
  const colLines = getEditorValues('colHintTable');
  if (rowLines.length !== rows || colLines.length !== cols) {
    showErrorPopup(`行ヒントは${rows}行、列ヒントは${cols}行で入力してください`);
    return null;
  }
  const rowHints = parseHintsEditor(rowLines);
  const colHints = parseHintsEditor(colLines);

  // 入力値バリデーション
  let invalid = false;
  rowHints.forEach(arr => {
    if (!arr.every(n => Number.isInteger(n) && n > 0)) invalid = true;
  });
  colHints.forEach(arr => {
    if (!arr.every(n => Number.isInteger(n) && n > 0)) invalid = true;
  });
  if (invalid) {
    showErrorPopup("ヒントは正の整数のみで入力してください（例: 2,1,3 または 2 1 3）");
    return null;
  }
  return { rowHints, colHints };
}

function resetEditors(rows, cols) {
  createEditorRows('rowHintTable', rows);
  createEditorRows('colHintTable', cols);
}

// 初期表示でグリッドとヒント入力欄を生成
window.addEventListener('DOMContentLoaded', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  resetEditors(rows, cols);
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

document.getElementById('solveBtn').addEventListener('click', handleSolveButtonClick);

document.getElementById('generateGridBtn').addEventListener('click', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  resetEditors(rows, cols);
});
