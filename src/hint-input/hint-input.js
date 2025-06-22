// --------------------------------------------------------------------------
// エディタ風ヒント入力欄の生成・操作
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// エディタ風ヒント入力欄の値取得・バリデーション
// --------------------------------------------------------------------------
function getHints(rows, cols) {
  const rowLines = getEditorValues('rowHintTable');
  const colLines = getEditorValues('colHintTable');
  if (rowLines.length !== rows || colLines.length !== cols) {
    showErrorPopup(`行ヒントは${rows}行、列ヒントは${cols}行で入力してください`);
    return null;
  }
  const rowHints = parseHintsEditor(rowLines);
  const colHints = parseHintsEditor(colLines);

  // validateHintsを利用してバリデーション
  if (window.validateHints) {
    const { errors } = window.validateHints(rowHints, colHints);
    if (errors && errors.length > 0) {
      showErrorPopup(errors.join('\n'));
      return null;
    }
  }
  return { rowHints, colHints };
}

function resetEditors(rows, cols) {
  createEditorRows('rowHintTable', rows);
  createEditorRows('colHintTable', cols);
}

// --------------------------------------------------------------------------
// テキストエリア入力・スクロール時に番号を同期
// --------------------------------------------------------------------------
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

// --------------------------------------------------------------------------
// シンプルなテキストボックス型ヒント入力欄
// --------------------------------------------------------------------------
/**
 * シンプルなテキストボックス型ヒント入力欄を生成
 * @param {number} rows
 * @param {number} cols
 */
function createSimpleTextboxHintInputs(rows, cols) {
  // .hints-inputs直下をクリア
  const hintsInputs = document.querySelector('.hints-inputs');
  if (!hintsInputs) return;
  hintsInputs.innerHTML = '';

  // 行ヒント
  const rowDiv = document.createElement('div');
  rowDiv.className = 'simple-hint-block';
  const rowLabel = document.createElement('label');
  rowLabel.htmlFor = 'rowHintTextbox';
  rowLabel.textContent = '行（横方向）ヒント';
  const rowBox = document.createElement('textarea');
  rowBox.id = 'rowHintTextbox';
  rowBox.className = 'simple-hint-textbox';
  // サイズ調節機能を削除: rows属性の自動調整をやめて固定値に
  rowBox.rows = 10;
  rowBox.placeholder = '各行のヒントを1行ずつ入力（例: 2 1 3）';
  rowDiv.appendChild(rowLabel);
  rowDiv.appendChild(rowBox);

  // 列ヒント
  const colDiv = document.createElement('div');
  colDiv.className = 'simple-hint-block';
  const colLabel = document.createElement('label');
  colLabel.htmlFor = 'colHintTextbox';
  colLabel.textContent = '列（縦方向）ヒント';
  const colBox = document.createElement('textarea');
  colBox.id = 'colHintTextbox';
  colBox.className = 'simple-hint-textbox';
  // サイズ調節機能を削除: rows属性の自動調整をやめて固定値に
  colBox.rows = 10;
  colBox.placeholder = '各列のヒントを1行ずつ入力（例: 1 4）';
  colDiv.appendChild(colLabel);
  colDiv.appendChild(colBox);

  hintsInputs.appendChild(rowDiv);
  hintsInputs.appendChild(colDiv);
}

/**
 * シンプルなテキストボックス型ヒント入力欄の値を取得
 * @returns {{rowLines: string[], colLines: string[]}}
 */
function getSimpleTextboxHintValues(rows, cols) {
  const rowBox = document.getElementById('rowHintTextbox');
  const colBox = document.getElementById('colHintTextbox');
  const rowLines = rowBox ? rowBox.value.trim().split('\n').slice(0, rows) : [];
  const colLines = colBox ? colBox.value.trim().split('\n').slice(0, cols) : [];
  return { rowLines, colLines };
}

/**
 * シンプルなテキストボックス型ヒント入力欄のリセット
 * @param {number} rows
 * @param {number} cols
 */
function resetSimpleTextboxHintInputs(rows, cols) {
  createSimpleTextboxHintInputs(rows, cols);
}

/**
 * シンプルなテキストボックス型ヒント入力欄の値をパース
 * @param {string[]} lines
 * @returns {number[][]}
 */
function parseSimpleTextboxHints(lines) {
  return lines.map(row =>
    row.split(/[\s,]+/).map(Number).filter(n => !isNaN(n) && n > 0)
  );
}

// --------------------------------------------------------------------------
// スタイル切り替えUI生成
// --------------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', () => {
  // スタイル切り替えUIのイベントのみ設定
  const radioTextbox = document.getElementById('hintStyleTextbox');
  const radioEditor = document.getElementById('hintStyleEditor');
  if (radioTextbox && radioEditor) {
    radioTextbox.addEventListener('change', () => {
      if (radioTextbox.checked) {
        const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
        const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
        switchHintInputStyle('textbox', rows, cols);
      }
    });
    radioEditor.addEventListener('change', () => {
      if (radioEditor.checked) {
        const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
        const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
        switchHintInputStyle('editor', rows, cols);
      }
    });
  }
  const rows = parseInt(document.getElementById('rowSize').value, 10) || 15;
  const cols = parseInt(document.getElementById('colSize').value, 10) || 15;
  switchHintInputStyle('textbox', rows, cols);
});

// --------------------------------------------------------------------------
// スタイル切り替えロジック
// --------------------------------------------------------------------------
/**
 * ヒント入力欄のスタイルを切り替える
 * @param {'textbox'|'editor'} style
 * @param {number} rows
 * @param {number} cols
 */
function switchHintInputStyle(style, rows, cols) {
  const textboxBlock = document.getElementById('hintInputTextboxBlock');
  const editorBlock = document.getElementById('hintInputEditorBlock');
  if (!textboxBlock || !editorBlock) return;
  if (style === 'textbox') {
    textboxBlock.style.display = '';
    editorBlock.style.display = 'none';
    // 横並びを維持
    textboxBlock.style.flexDirection = 'row';
    document.getElementById('rowHintTextbox').value = '';
    document.getElementById('colHintTextbox').value = '';
  } else {
    textboxBlock.style.display = 'none';
    editorBlock.style.display = '';
    editorBlock.style.flexDirection = 'row';
    createEditorRows('rowHintTable', rows);
    createEditorRows('colHintTable', cols);
  }
  const radioTextbox = document.getElementById('hintStyleTextbox');
  const radioEditor = document.getElementById('hintStyleEditor');
  if (radioTextbox && radioEditor) {
    radioTextbox.checked = style === 'textbox';
    radioEditor.checked = style === 'editor';
  }
  window.currentHintInputStyle = style;
}

/**
 * 現在のヒント入力欄スタイルで値を取得
 * @param {number} rows
 * @param {number} cols
 * @returns {{rowHints:number[][], colHints:number[][]}|null}
 */
function getHintsUnified(rows, cols) {
  const style = window.currentHintInputStyle || 'textbox';
  let rowHints, colHints;
  if (style === 'textbox') {
    const { rowLines, colLines } = getSimpleTextboxHintValues(rows, cols);
    if (rowLines.length !== rows || colLines.length !== cols) {
      showErrorPopup(`行ヒントは${rows}行、列ヒントは${cols}行で入力してください`);
      return null;
    }
    rowHints = parseSimpleTextboxHints(rowLines);
    colHints = parseSimpleTextboxHints(colLines);
  } else {
    const rowLines = getEditorValues('rowHintTable');
    const colLines = getEditorValues('colHintTable');
    if (rowLines.length !== rows || colLines.length !== cols) {
      showErrorPopup(`行ヒントは${rows}行、列ヒントは${cols}行で入力してください`);
      return null;
    }
    rowHints = parseHintsEditor(rowLines);
    colHints = parseHintsEditor(colLines);
  }
  // validateHintsを利用してバリデーション
  if (window.validateHints) {
    const { errors } = window.validateHints(rowHints, colHints);
    if (errors && errors.length > 0) {
      showErrorPopup(errors.join('\n'));
      return null;
    }
  }
  return { rowHints, colHints };
}

/**
 * 現在のヒント入力欄スタイルでリセット
 * @param {number} rows
 * @param {number} cols
 */
function resetHintsUnified(rows, cols) {
  const style = window.currentHintInputStyle || 'textbox';
  if (style === 'textbox') {
    document.getElementById('rowHintTextbox').value = '';
    document.getElementById('colHintTextbox').value = '';
  } else {
    createEditorRows('rowHintTable', rows);
    createEditorRows('colHintTable', cols);
  }
}

// --------------------------------------------------------------------------
// グローバル公開
// --------------------------------------------------------------------------
window.getHints = getHintsUnified;
window.resetEditors = resetHintsUnified;
window.createEditorRows = createEditorRows;
window.getEditorValues = getEditorValues;
window.parseHintsEditor = parseHintsEditor;
window.setupHintLabelSync = setupHintLabelSync;
window.switchHintInputStyle = switchHintInputStyle;
window.getSimpleTextboxHintValues = getSimpleTextboxHintValues;
window.parseSimpleTextboxHints = parseSimpleTextboxHints;
window.resetSimpleTextboxHintInputs = resetSimpleTextboxHintInputs;
