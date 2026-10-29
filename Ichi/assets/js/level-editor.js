(function (M) {
  "use strict";

  const STORAGE_KEY = "ichi-level-editor-v1";
  const BASE = {
    1: M.chapter1Maps.map((rows) => rows.slice()),
    2: M.chapter2Maps.map((rows) => rows.slice()),
  };
  const names = M.levels.names;
  const maps = {
    1: BASE[1].map((rows) => rows.slice()),
    2: BASE[2].map((rows) => rows.slice()),
  };
  let chapter = 1;
  let selected = 0;
  let tool = "floor";

  const byId = (id) => document.getElementById(id);
  const glyphs = {
    " ": "",
    "#": "♣",
    "@": "И",
    "+": "И",
    "$": "▣",
    "*": "▣",
    ".": "✦",
    b: "🦴",
    p: "●",
  };
  const labels = {
    " ": "пол",
    "#": "куст",
    "@": "Ичи",
    "+": "Ичи на подушечке",
    "$": "коробка",
    "*": "коробка на подушечке",
    ".": "подушечка",
    b: "косточка",
    p: "яма",
  };

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    for (const id of [1, 2]) {
      if (Array.isArray(saved?.[id]) && saved[id].length === 25 &&
          saved[id].every((rows) => Array.isArray(rows) && rows.every((row) => typeof row === "string"))) {
        maps[id] = saved[id].map((rows) => rows.slice());
      }
    }
  } catch (_) {
    // The editor still works and exports files if browser storage is unavailable.
  }

  function levelNumber(index = selected) {
    return (chapter === 1 ? 1 : 26) + index;
  }

  function getRows(index = selected, chapterId = chapter) {
    return maps[chapterId][index];
  }

  function cellCounts(rows) {
    const cells = rows.join("");
    return {
      players: [...cells].filter((tile) => tile === "@" || tile === "+").length,
      boxes: [...cells].filter((tile) => tile === "$" || tile === "*").length,
      goals: [...cells].filter((tile) => tile === "." || tile === "*" || tile === "+").length,
      bones: [...cells].filter((tile) => tile === "b").length,
      pits: [...cells].filter((tile) => tile === "p").length,
      bushes: rows.reduce((total, row, y) => total + [...row].filter((tile, x) => tile === "#" && y > 0 && y < rows.length - 1 && x > 0 && x < row.length - 1).length, 0),
    };
  }

  function validate(rows, chapterId = chapter) {
    const errors = [];
    if (!rows.length || rows.some((row) => row.length !== rows[0].length)) {
      errors.push("Все строки поля должны быть одинаковой длины.");
      return { valid: false, errors, counts: cellCounts(rows) };
    }

    const { players, boxes, goals, bones, pits, bushes } = cellCounts(rows);
    if (players !== 1) errors.push("На уровне должен быть ровно один Ичи.");
    if (boxes < 1 || goals < 1 || boxes !== goals) errors.push("Число коробок должно совпадать с числом подушечек.");
    if (bones !== pits) errors.push("Для каждой косточки нужна одна яма.");
    if (chapterId === 2 && (bones < 1 || pits < 1)) errors.push("Во второй главе добавь хотя бы одну косточку и яму.");

    const width = rows[0].length, height = rows.length;
    for (let x = 0; x < width; x++) {
      if (rows[0][x] !== "#" || rows[height - 1][x] !== "#") {
        errors.push("Верхняя и нижняя границы должны быть стенами.");
        break;
      }
    }
    for (let y = 0; y < height; y++) {
      if (rows[y][0] !== "#" || rows[y][width - 1] !== "#") {
        errors.push("Боковые границы должны быть стенами.");
        break;
      }
    }
    if ([...rows.join("")].some((tile) => !Object.prototype.hasOwnProperty.call(labels, tile))) {
      errors.push("На поле есть неизвестный тип клетки.");
    }
    return { valid: errors.length === 0, errors, counts: { players, boxes, goals, bones, pits, bushes } };
  }

  function renderLevels() {
    const list = byId("levelList");
    list.innerHTML = "";
    maps[chapter].forEach((rows, index) => {
      const button = document.createElement("button");
      const result = validate(rows, chapter);
      button.type = "button";
      button.className = "level-button" + (index === selected ? " active" : "") + (result.valid ? " valid" : " invalid");
      button.textContent = String(levelNumber(index)).padStart(2, "0");
      button.title = (names[levelNumber(index) - 1] || "Уровень") + (result.valid ? "" : " · проверь уровень");
      button.setAttribute("aria-label", "Уровень " + levelNumber(index));
      button.addEventListener("click", () => {
        selected = index;
        render();
      });
      list.appendChild(button);
    });
  }

  function renderBoard() {
    const rows = getRows();
    const board = byId("board");
    const width = rows[0]?.length || 0;
    board.style.gridTemplateColumns = "repeat(" + width + ", var(--cell))";
    board.innerHTML = "";
    rows.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        const cell = document.createElement("button");
        const isGoal = tile === "." || tile === "*" || tile === "+";
        const isEdge = x === 0 || y === 0 || x === width - 1 || y === rows.length - 1;
        const kind = tile === "#" ? (isEdge ? "wall" : "bush") :
          tile === "@" || tile === "+" ? "player" :
          tile === "$" || tile === "*" ? "box" :
          tile === "." ? "goal" : tile === "b" ? "bone" :
          tile === "p" ? "pit" : "floor";
        cell.type = "button";
        cell.className = "cell cell-" + kind + (isGoal ? " has-goal" : "");
        const tileLabel = tile === "#" ? (isEdge ? "стена" : "куст") : labels[tile];
        cell.setAttribute("role", "gridcell");
        cell.setAttribute("aria-label", "Колонка " + (x + 1) + ", строка " + (y + 1) + ": " + tileLabel);
        cell.title = tileLabel + " · " + (x + 1) + ", " + (y + 1);
        const mark = document.createElement("span");
        mark.className = "tile-mark";
        mark.textContent = tile === "#" ? (isEdge ? "▧" : "♣") : glyphs[tile];
        cell.appendChild(mark);
        cell.addEventListener("click", () => paint(x, y));
        cell.addEventListener("contextmenu", (event) => {
          event.preventDefault();
          if (isEdge) {
            byId("saveNote").textContent = "Периметр поля остаётся стеной.";
            return;
          }
          paint(x, y, "floor");
        });
        board.appendChild(cell);
      });
    });
    byId("dimensions").textContent = width + " × " + rows.length;
    byId("widthInput").value = width;
    byId("heightInput").value = rows.length;
  }

  function clearBoard() {
    if (!window.confirm("Очистить уровень " + levelNumber() + "? Все внутренние клетки станут пустыми, периметр стен сохранится.")) return;
    const rows = getRows();
    const width = rows[0].length;
    const height = rows.length;
    maps[chapter][selected] = Array.from({ length: height }, (_, y) =>
      y === 0 || y === height - 1
        ? "#".repeat(width)
        : "#" + " ".repeat(width - 2) + "#",
    );
    save();
    render();
  }
  function resizeBoard() {
    const nextWidth = Number(byId("widthInput").value);
    const nextHeight = Number(byId("heightInput").value);
    if (!Number.isInteger(nextWidth) || !Number.isInteger(nextHeight) ||
        nextWidth < 5 || nextWidth > 21 || nextHeight < 5 || nextHeight > 21) {
      byId("validation").classList.add("error");
      byId("validation").textContent = "Размер поля должен быть от 5 до 21 клетки.";
      return;
    }

    const oldRows = getRows();
    const oldHeight = oldRows.length;
    const oldWidth = oldRows[0].length;
    const removed = [];
    for (let y = 1; y < oldHeight - 1; y++) {
      for (let x = 1; x < oldWidth - 1; x++) {
        if (x >= nextWidth - 1 || y >= nextHeight - 1) {
          const tile = oldRows[y][x];
          if (tile !== " " && tile !== "#") removed.push(tile);
        }
      }
    }
    if (removed.length && !window.confirm(
      "Уменьшение поля удалит " + removed.length + " игровых объектов. Продолжить?",
    )) {
      byId("widthInput").value = oldWidth;
      byId("heightInput").value = oldHeight;
      return;
    }

    const resized = [];
    for (let y = 0; y < nextHeight; y++) {
      if (y === 0 || y === nextHeight - 1) {
        resized.push("#".repeat(nextWidth));
        continue;
      }
      let row = "#";
      for (let x = 1; x < nextWidth - 1; x++) {
        const sourceY = y < oldHeight - 1;
        const sourceX = x < oldWidth - 1;
        row += sourceY && sourceX ? oldRows[y][x] : " ";
      }
      row += "#";
      resized.push(row);
    }
    maps[chapter][selected] = resized;
    save();
    render();
  }
  function updateStatus() {
    const rows = getRows();
    const { valid, errors, counts } = validate(rows);
    byId("counts").textContent =
      "Ичи: " + counts.players + " · Коробки: " + counts.boxes + "/" + counts.goals +
      " · Косточки: " + counts.bones + "/" + counts.pits + " · Кусты: " + counts.bushes;
    const validation = byId("validation");
    validation.classList.toggle("error", !valid);
    validation.textContent = valid ? "Уровень готов к игре" : errors.join(" ");
    byId("selectedTitle").textContent =
      "Уровень " + levelNumber() + " · " + (names[levelNumber() - 1] || "");
  }

  function render() {
    byId("chapterTitle").textContent = "Глава " + chapter;
    byId("levelTotal").textContent = maps[chapter].length + " уровней";
    document.querySelectorAll(".chapter-button").forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.chapter) === chapter);
    });
    renderLevels();
    renderBoard();
    updateStatus();
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(maps));
    } catch (_) {
      byId("saveNote").textContent = "Браузер не разрешил локальное сохранение. Скачай JSON или JS главы.";
      return;
    }
    byId("saveNote").textContent = "Изменения сохранены в этом браузере. Экспортируй JS главы, чтобы применить их в игре.";
  }

  function goalUnder(tile) {
    return tile === "." || tile === "*" || tile === "+";
  }

  function paint(x, y, activeTool = tool) {
    const rowsForEdge = getRows();
    const isEdge = y === 0 || x === 0 || y === rowsForEdge.length - 1 || x === rowsForEdge[0].length - 1;
    if (activeTool === "wall" && !isEdge) {
      byId("saveNote").textContent = "Стены можно ставить только по периметру поля.";
      return;
    }
    if (activeTool === "bush" && isEdge) {
      byId("saveNote").textContent = "Кусты можно ставить только внутри поля.";
      return;
    }
    const rows = getRows();
    const grid = rows.map((row) => [...row]);
    let current = grid[y][x];

    if (activeTool === "player") {
      for (let row = 0; row < grid.length; row++) {
        for (let col = 0; col < grid[row].length; col++) {
          if (grid[row][col] === "@") grid[row][col] = " ";
          else if (grid[row][col] === "+") grid[row][col] = ".";
        }
      }
      current = grid[y][x];
    }

    const tile = {
      floor: " ",
      wall: "#",
      bush: "#",
      player: goalUnder(current) ? "+" : "@",
      box: goalUnder(current) ? "*" : "$",
      goal: current === "$" || current === "*" ? "*" : current === "@" || current === "+" ? "+" : ".",
      bone: "b",
      pit: "p",
    }[activeTool];
    grid[y][x] = tile;
    maps[chapter][selected] = grid.map((row) => row.join(""));
    save();
    render();
  }

  function setTool(value) {
    tool = value;
    document.querySelectorAll(".tool").forEach((button) => {
      button.classList.toggle("active", button.dataset.tool === tool);
    });
  }

  function switchChapter(value) {
    chapter = value;
    selected = 0;
    render();
  }

  function chapterErrors() {
    const errors = [];
    maps[chapter].forEach((rows, index) => {
      const result = validate(rows, chapter);
      if (!result.valid) errors.push("Уровень " + ((chapter === 1 ? 1 : 26) + index) + ": " + result.errors.join(" "));
    });
    return errors;
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportJS() {
    const errors = chapterErrors();
    if (errors.length) {
      byId("validation").classList.add("error");
      byId("validation").textContent = errors.slice(0, 3).join(" ");
      byId("saveNote").textContent = "Исправь ошибки уровней перед экспортом JS.";
      return;
    }
    const chapterMaps = maps[chapter];
    const payload = JSON.stringify(chapterMaps);
    const output = '(function (M) { "use strict"; M.chapter' + chapter +
      'Maps = Object.freeze(' + payload + '.map((rows) => Object.freeze(rows))); })(window.Mochi);\n';
    download("chapter" + chapter + ".generated.js", output, "text/javascript;charset=utf-8");
    byId("saveNote").textContent = "Готово. Замени файл assets/js/chapter" + chapter + ".generated.js в проекте.";
  }

  async function importJSON(file) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const sourceLevels = Array.isArray(data)
        ? data
        : Array.isArray(data?.levels)
          ? data.levels
          : Array.isArray(data?.maps)
            ? data.maps
            : null;
      if (!sourceLevels || sourceLevels.length !== 25) {
        throw new Error("В JSON должно быть ровно 25 уровней одной главы.");
      }

      const importedMaps = sourceLevels.map((entry, index) => {
        let rows = Array.isArray(entry) ? entry : entry?.rows ?? entry?.map;
        if (typeof rows === "string") rows = rows.split(/\r?\n/);
        if (!Array.isArray(rows) || rows.length < 5 || rows.length > 21 ||
            rows.some((row) => typeof row !== "string" || row.length < 5 || row.length > 21)) {
          throw new Error("Уровень " + (index + 1) + ": строки карты должны иметь размер от 5 до 21 клетки.");
        }
        if (rows.some((row) => row.length !== rows[0].length)) {
          throw new Error("Уровень " + (index + 1) + ": все строки карты должны быть одинаковой длины.");
        }
        return rows.slice();
      });

      const chapterFromData = Number(data?.chapter);
      const chapterFromName = /chapter[-_ ]?2/i.test(file.name) ? 2 :
        /chapter[-_ ]?1/i.test(file.name) ? 1 : null;
      chapter = chapterFromData === 1 || chapterFromData === 2
        ? chapterFromData
        : chapterFromName || chapter;
      maps[chapter] = importedMaps;
      selected = 0;
      save();
      render();
      const invalidCount = maps[chapter].filter((rows) => !validate(rows, chapter).valid).length;
      byId("saveNote").textContent = invalidCount
        ? "Загружена глава " + chapter + ". Проверь уровни с красной отметкой: таких " + invalidCount + "."
        : "Глава " + chapter + " загружена. Можно редактировать уровни.";
    } catch (error) {
      byId("saveNote").textContent = "Не удалось загрузить JSON: " + error.message;
    } finally {
      byId("importJsonInput").value = "";
    }
  }
  function exportJSON() {
    const chapterMaps = maps[chapter];
    const levels = chapterMaps.map((rows, index) => {
      const counts = cellCounts(rows);
      return {
        number: (chapter === 1 ? 1 : 26) + index,
        name: names[(chapter === 1 ? 0 : 25) + index],
        rows,
        crates: counts.boxes,
        bones: counts.bones,
        pits: counts.pits,
        bushes: counts.bushes,
      };
    });
    const data = {
      chapter,
      first_level: chapter === 1 ? 1 : 26,
      rules: chapter === 2 ? [
        "The player pushes crates onto all green goals.",
        "Bones are pushable. Push each bone into a pit to bury it and fill the pit.",
        "The player cannot enter an open pit.",
        "Crates cannot be pushed into bones or open pits.",
        "Optional interior # tiles render as impassable bushes from chapter one.",
        "A level is complete only when every crate is on a goal and every bone is buried.",
      ] : [],
      levels,
    };
    download("chapter" + chapter + ".levels.json", JSON.stringify(data, null, 2), "application/json;charset=utf-8");
  }

  document.querySelectorAll(".chapter-button").forEach((button) =>
    button.addEventListener("click", () => switchChapter(Number(button.dataset.chapter))),
  );
  document.querySelectorAll(".tool").forEach((button) =>
    button.addEventListener("click", () => setTool(button.dataset.tool)),
  );
  byId("resizeButton").addEventListener("click", resizeBoard);
  byId("clearBoardButton").addEventListener("click", clearBoard);
  byId("importJsonButton").addEventListener("click", () => byId("importJsonInput").click());
  byId("importJsonInput").addEventListener("change", (event) => importJSON(event.target.files?.[0]));
  byId("jsButton").addEventListener("click", exportJS);
  byId("jsonButton").addEventListener("click", exportJSON);
  byId("resetButton").addEventListener("click", () => {
    if (!window.confirm("Сбросить все изменения главы " + chapter + "?")) return;
    maps[chapter] = BASE[chapter].map((rows) => rows.slice());
    save();
    render();
  });
  window.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const keyTools = { "1": "floor", "2": "wall", "3": "bush", "4": "player", "5": "box", "6": "goal", "7": "bone", "8": "pit" };
    if (keyTools[event.key] && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      setTool(keyTools[event.key]);
    }
  });

  render();
})(window.Mochi);