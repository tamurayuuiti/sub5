export async function handleSolveButtonClick() {
  window.currentSolverId = (window.currentSolverId || 0) + 1;
  const thisSolverId = window.currentSolverId;
  if (window.stopTimer) window.stopTimer();
  window.currentSolveGen = null;

  const rows = parseInt(document.getElementById('rowSize').value, 10);
  const cols = parseInt(document.getElementById('colSize').value, 10);

  // 入力取得・バリデーション
  const hints = window.getHints(rows, cols);
  if (!hints) {
    // エラー時はUIリセットのみ（計算時間・試行回数はリセットしない）
    return;
  }
  const { rowHints, colHints } = hints;
  if (rowHints.length !== rows || colHints.length !== cols) {
    window.showErrorPopup('ヒント入力数が正しくありません');
    return;
  }

  // ソルバー初期化
  let solveGen;
  try {
    solveGen = window.solvePicross(rowHints, colHints);
  } catch (err) {
    window.showErrorPopup("ソルバーの初期化に失敗しました");
    return;
  }
  window.currentSolveGen = solveGen;

  // UIリセット・計算時間/試行回数リセット・グリッド初期化
  window.resetSolveDisplay(rows, cols);

  // DOM描画待ち
  await new Promise(resolve => setTimeout(resolve, 20));
  if (window.startTimer) window.startTimer();

  let stoppedByTrialLimit = false;

  handleSolverStep(solveGen.next());

  function handleSolverStep(prevRes) {
    if (thisSolverId !== window.currentSolverId || window.currentSolveGen !== solveGen || stoppedByTrialLimit) {
      if (window.stopTimer) window.stopTimer();
      return;
    }
    const result = prevRes !== undefined ? prevRes : solveGen.next();
    if (result.done) {
      if (window.stopTimer) window.stopTimer();
      return;
    }
    const data = result.value;
    if (data.partial) {
      window.renderGridOnPicrossArea(data.partial);
      if (data.count !== undefined) {
        document.getElementById('count').textContent = `試行回数: ${data.count}`;
        if (data.count > 10000) {
          stoppedByTrialLimit = true;
          window.createPicrossArea(rows, cols);
          window.renderPreview([]);
          setTimeout(() => {
            alert("試行回数が1万回を超えたため処理を中断しました。解が存在しない可能性があります。");
          }, 150);
          return;
        }
      }
      setTimeout(() => handleSolverStep(), 0);
    } else if (data.solution) {
      window.renderGridOnPicrossArea(data.solution);
      window.renderPreview(data.solution);
      if (data.count !== undefined) {
        document.getElementById('count').textContent = `試行回数: ${data.count}`;
      }
      if (window.stopTimer) window.stopTimer();
      setTimeout(() => {
        alert("処理が完了しました。");
      }, 150);
    } else if (data.error) {
      // エラー時は必ずUIリセット
      window.createPicrossArea(rows, cols);
      window.renderPreview([]);
      document.getElementById('count').textContent = '試行回数: 0';
      document.getElementById('time').textContent = `計算時間: 0.00秒 `;
      window.showErrorPopup(data.error);
      if (window.stopTimer) window.stopTimer();
    } else {
      setTimeout(() => handleSolverStep(), 0);
    }
  }
}
