// Picross Solver Core Logic in JavaScript (no server code, just pure logic)

function isValidLine(line, hints) {
  const segments = [];
  let count = 0;
  for (const cell of line) {
    if (cell === 1) {
      count++;
    } else if (count > 0) {
      segments.push(count);
      count = 0;
    }
  }
  if (count > 0) segments.push(count);
  return JSON.stringify(segments) === JSON.stringify(hints);
}

function getLinePossibilities(length, hints) {
  function helper(hints, idx, line) {
    if (hints.length === 0) {
      if (line.length <= length) {
        return [line.concat(Array(length - line.length).fill(0))];
      }
      return [];
    }
    const res = [];
    const maxStart = length - hints.reduce((a, b) => a + b, 0) - (hints.length - 1);
    for (let i = idx; i <= maxStart; i++) {
      let newLine = line.concat(Array(i - line.length).fill(0), Array(hints[0]).fill(1));
      if (newLine.length < length) newLine.push(0);
      res.push(...helper(hints.slice(1), newLine.length, newLine));
    }
    return res;
  }
  return helper(hints, 0, []);
}

function filterPossibilitiesByFixed(possibilities, fixed) {
  return possibilities.filter(poss =>
    poss.every((v, i) => fixed[i] == null || fixed[i] === -1 || fixed[i] === v)
  );
}

function getCertaintiesFromPoss(possList) {
  if (!possList || possList.some(c => c.length === 0)) return null;
  const length = possList[0][0].length;
  return possList.map(cands => {
    return Array.from({ length }, (_, i) => {
      const values = new Set(cands.map(row => row[i]));
      return values.size === 1 ? [...values][0] : null;
    });
  });
}

function checkHintSumValid(rowHints, colHints) {
  const errors = [];
  const height = rowHints.length;
  const width = colHints.length;
  for (let i = 0; i < height; i++) {
    const minRequired = rowHints[i].reduce((a, b) => a + b, 0) + Math.max(0, rowHints[i].length - 1);
    if (minRequired > width) {
      errors.push(`${i + 1}行目のヒントが多すぎます`);
    }
  }
  for (let i = 0; i < width; i++) {
    const minRequired = colHints[i].reduce((a, b) => a + b, 0) + Math.max(0, colHints[i].length - 1);
    if (minRequired > height) {
      errors.push(`${i + 1}列目のヒントが多すぎます`);
    }
  }
  return errors;
}

function applyHumanistic(rowHints, colHints) {
  const height = rowHints.length;
  const width = colHints.length;
  const grid = Array.from({ length: height }, () => Array(width).fill(null));
  let rowPoss = rowHints.map(h => getLinePossibilities(width, h));
  let colPoss = colHints.map(h => getLinePossibilities(height, h));
  let changed = true;
  let count = 0;

  while (changed) {
    changed = false;
    count++;

    rowPoss = rowPoss.map((poss, i) => filterPossibilitiesByFixed(poss, grid[i]));
    if (rowPoss.some(p => p.length === 0)) {
      return { error: "矛盾: 行の候補が存在しません", grid: null, rowPoss, colPoss, count };
    }

    const rowCerts = getCertaintiesFromPoss(rowPoss);
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        if (rowCerts[i][j] != null && grid[i][j] == null) {
          grid[i][j] = rowCerts[i][j];
          changed = true;
        }
      }
    }

    colPoss = colPoss.map((poss, j) => {
      const col = grid.map(row => row[j]);
      return filterPossibilitiesByFixed(poss, col);
    });
    if (colPoss.some(p => p.length === 0)) {
      return { error: "矛盾: 列の候補が存在しません", grid: null, rowPoss, colPoss, count };
    }

    const colCerts = getCertaintiesFromPoss(colPoss);
    for (let j = 0; j < width; j++) {
      for (let i = 0; i < height; i++) {
        if (colCerts[j][i] != null && grid[i][j] == null) {
          grid[i][j] = colCerts[j][i];
          changed = true;
        }
      }
    }
  }

  return { grid, rowPoss, colPoss, count };
}

function isValidSoFarLine(line, hints) {
  const segs = [];
  let cnt = 0;
  for (const v of line) {
    if (v === 1) {
      cnt++;
    } else if (cnt > 0) {
      segs.push(cnt);
      cnt = 0;
    }
  }
  if (cnt > 0) segs.push(cnt);
  for (let i = 0; i < segs.length; i++) {
    if (i >= hints.length || segs[i] > hints[i]) return false;
  }
  return segs.length <= hints.length;
}

function* solvePicross(rowHints, colHints) {
  const hintErrors = checkHintSumValid(rowHints, colHints);
  if (hintErrors.length > 0) {
    yield { error: hintErrors.join(" / "), count: 0 };
    return;
  }

  const height = rowHints.length;
  const width = colHints.length;
  const { grid: initialGrid, rowPoss, colPoss, count: humanisticCount, error } = applyHumanistic(rowHints, colHints);
  if (error) {
    yield { error, count: humanisticCount };
    return;
  }

  const count = { value: 0 };
  const grid = initialGrid.map(row => row.map(cell => (cell == null ? -1 : cell)));
  const rowCandidates = rowPoss.map((poss, i) => filterPossibilitiesByFixed(poss, grid[i]));

  if (rowCandidates.some(r => r.length === 0)) {
    yield { error: "矛盾: 行の候補が存在しません（バックトラック前）", count: humanisticCount };
    return;
  }

  function* backtrack(grid, rowIdx) {
    if (rowIdx === height) {
      for (let j = 0; j < width; j++) {
        const col = grid.map(row => row[j]);
        if (!isValidLine(col, colHints[j])) return false;
      }
      yield { solution: grid, done: true, count: humanisticCount + count.value };
      return true;
    }

    for (const cand of rowCandidates[rowIdx]) {
      const newGrid = grid.map(row => [...row]);
      newGrid[rowIdx] = [...cand];

      let valid = true;
      for (let j = 0; j < width; j++) {
        const colSoFar = newGrid.slice(0, rowIdx + 1).map(row => row[j]);
        if (!isValidSoFarLine(colSoFar, colHints[j])) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;

      count.value++;
      const result = yield* backtrack(newGrid, rowIdx + 1);
      if (result === true) return true;

      if (count.value % 10 === 0) {
        const partial = newGrid.map(row => row.map(c => (c === -1 ? -1 : c)));
        yield { partial, count: humanisticCount + count.value };
      }
    }

    return false;
  }

  let found = false;
  for (const result of backtrack(grid, 0)) {
    yield result;
    if (result.solution) {
      found = true;
      break;
    }
  }

  if (!found) {
    yield { error: "No solution found", count: humanisticCount + count.value };
  }
}

window.solvePicross = solvePicross;
