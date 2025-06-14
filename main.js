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

function createPicrossArea(rows, cols) {
  const area = document.getElementById('picrossArea');
  area.innerHTML = '';

  // テーブル作成
  const table = document.createElement('table');
  table.className = 'picross-table';

  // 純粋なグリッドのみ
  for (let r = 0; r < rows; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < cols; c++) {
      const td = document.createElement('td');
      td.className = 'unknown';
      td.id = `cell-${r}-${c}`;
      // 5マスごとに太線クラスを追加
      if ((c + 1) % 5 === 0 && c !== cols - 1) td.classList.add('border-right-bold');
      if ((r + 1) % 5 === 0 && r !== rows - 1) td.classList.add('border-bottom-bold');
      // 外周太線
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

function updateHintLabels(rows, cols) {
  // 行番号
  const rowLabels = document.getElementById('rowHintLabels');
  const rowInput = document.getElementById('rowHintsInput');
  if (rowLabels && rowInput) {
    rowLabels.innerHTML = '';
    const lines = rowInput.value.split('\n').length || rows;
    for (let i = 1; i <= Math.max(lines, rows); i++) {
      const div = document.createElement('div');
      div.textContent = i;
      rowLabels.appendChild(div);
    }
    // スクロール同期
    rowLabels.scrollTop = rowInput.scrollTop;
  }
  // 列番号
  const colLabels = document.getElementById('colHintLabels');
  const colInput = document.getElementById('colHintsInput');
  if (colLabels && colInput) {
    colLabels.innerHTML = '';
    const lines = colInput.value.split('\n').length || cols;
    for (let i = 1; i <= Math.max(lines, cols); i++) {
      const div = document.createElement('div');
      div.textContent = i;
      colLabels.appendChild(div);
    }
    colLabels.scrollTop = colInput.scrollTop;
  }
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

function renderGridOnPicrossArea(grid) {
  // グリッド部分だけを更新
  const rows = grid.length;
  const cols = grid[0].length;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const td = document.getElementById(`cell-${r}-${c}`);
      if (!td) continue;
      // solver.jsの仕様: 1=filled, 0=empty, -1/undefined/null=unknown
      td.className = grid[r][c] === 1 ? 'filled'
        : grid[r][c] === 0 ? 'empty'
        : 'unknown';
    }
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

let startTime = 0;
let timerInterval = null;
let currentSolverId = 0;
let currentSolveGen = null;

function resetGridCellsToUnknown(rows, cols) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const td = document.getElementById(`cell-${r}-${c}`);
      if (td) {
        // 太線などのclassは維持しつつ、状態classだけunknownに
        td.classList.remove('filled', 'empty');
        td.classList.add('unknown');
      }
    }
  }
}

function resetSolveDisplay(rows, cols) {
  resetGridCellsToUnknown(rows, cols);
  renderPreview([]);
  document.getElementById('time').textContent = `計算時間: 0.00秒 `;
  document.getElementById('count').textContent = '試行回数: 0';
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = ((Date.now() - startTime) / 1000);
    document.getElementById('time').textContent = `計算時間: ${elapsed.toFixed(2)}秒 `;
  }, 10);
}

document.getElementById('solveBtn').addEventListener('click', handleSolveButtonClick);

document.getElementById('generateGridBtn').addEventListener('click', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  resetEditors(rows, cols);
});

// 初期表示でグリッドとヒント入力欄を生成
window.addEventListener('DOMContentLoaded', () => {
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  createPicrossArea(rows, cols);
  resetEditors(rows, cols);
});
