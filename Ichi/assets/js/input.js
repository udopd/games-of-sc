(function (M) {
  "use strict";
  // Translate browser input into application actions; no SDK or game rules here.
  function bind({ ui, actions, getGame, canvas }) {
    const on = (id, event, handler) =>
      ui.byId(id).addEventListener(event, handler);
    on("favoriteBtn", "click", actions.favorite);
    on("syncBtn", "click", actions.sync);
    on("soundBtn", "click", actions.toggleSound);
    on("burgerBtn", "click", () =>
      ui.drawerOpen ? ui.closeDrawer() : ui.openDrawer(),
    );
    on("drawerClose", "click", ui.closeDrawer);
    const playControlsToggle = ui.byId("playControlsToggle");
    const playDpad = ui.byId("playDpad");
    const gameScreen = ui.byId("game");
    const paintPlayControlsToggle = () => {
      const expanded = playControlsToggle.getAttribute("aria-expanded") === "true";
      const english = M.i18n?.language === "en";
      playControlsToggle.textContent = `${english ? "arrows" : "стрелочки"} ${expanded ? "×" : "↓"} `;
    };
    paintPlayControlsToggle();
    document.addEventListener("mochi:languagechange", paintPlayControlsToggle);
    gameScreen.classList.toggle(
      "touch-controls-open",
      playControlsToggle.getAttribute("aria-expanded") === "true",
    );
    playControlsToggle.addEventListener("click", () => {
      const expanded = playControlsToggle.getAttribute("aria-expanded") === "true";
      const nextExpanded = !expanded;
      playControlsToggle.setAttribute("aria-expanded", String(nextExpanded));
      paintPlayControlsToggle();
      playDpad.hidden = !nextExpanded;
      gameScreen.classList.toggle("touch-controls-open", nextExpanded);
    });
    const controlsToggle = ui.byId("mobileControlsToggle");
    const controlsBody = ui.byId("mobileControls");
    controlsToggle.addEventListener("click", () => {
      const expanded = controlsToggle.getAttribute("aria-expanded") !== "false";
      const nextExpanded = !expanded;
      controlsToggle.setAttribute("aria-expanded", String(nextExpanded));
      controlsBody.hidden = !nextExpanded;
      controlsToggle.textContent = nextExpanded ? "⌄" : "⌃";
      const english = document.documentElement.lang.toLowerCase().startsWith("en");
      const label = nextExpanded
        ? (english ? "Collapse movement controls" : "Свернуть кнопки управления")
        : (english ? "Expand movement controls" : "Развернуть кнопки управления");
      controlsToggle.setAttribute("aria-label", label);
      controlsToggle.title = label;
    });
    on("drawerShade", "click", ui.closeDrawer);
    on("logo", "click", actions.showMenu);
    on("playBtn", "click", actions.play);
    on("randomBtn", "click", actions.random);
    on("menuBtn", "click", actions.showMenu);
    on("undoBtn", "click", () => {
      actions.undo();
      ui.closeDrawer();
    });
    on("restartBtn", "click", () => {
      actions.restart();
      ui.closeDrawer();
    });
    on("helpBtn", "click", () => {
      ui.closeDrawer();
      ui.openDialog("help");
    });
    on("closeDialog", "click", ui.closeDialog);
    on("overlay", "click", (event) => {
      if (event.target === ui.byId("overlay") && (ui.dialogMode === "help" || ui.dialogMode === "rating"))
        ui.closeDialog();
    });
    document.querySelectorAll("[data-dir]").forEach((button) =>
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        actions.step(button.dataset.dir);
      }),
    );
    window.addEventListener("keydown", (event) => {
      if (ui.drawerOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          ui.closeDrawer();
        }
        return;
      }
      if (ui.dialogOpen) {
        if (event.key === "Escape" && (ui.dialogMode === "help" || ui.dialogMode === "rating"))
          ui.closeDialog();
        return;
      }
      const key = event.key.toLowerCase();
      const map = {
        arrowup: "U",
        arrowdown: "D",
        arrowleft: "L",
        arrowright: "R",
        w: "U",
        s: "D",
        a: "L",
        d: "R",
      };
      if (getGame().screen !== "game") return;
      if (map[key]) {
        event.preventDefault();
        actions.step(map[key]);
      } else if (key === "z" || key === "backspace") {
        event.preventDefault();
        actions.undo();
      } else if (key === "r") actions.restart();
      else if (key === "escape") actions.showMenu();
    });
    let touchStart = null;
    canvas.addEventListener("pointerdown", (event) => {
      touchStart = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener("pointercancel", () => {
      touchStart = null;
    });
    canvas.addEventListener("pointerup", (event) => {
      if (!touchStart) return;
      const dx = event.clientX - touchStart.x,
        dy = event.clientY - touchStart.y;
      touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 15) {
        if (gameScreen.classList.contains("touch-controls-open")) return;
        actions.step(
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? "R"
              : "L"
            : dy > 0
              ? "D"
              : "U",
        );
      } else {
        const state = getGame().state;
        if (!state) return;
        const rect = canvas.getBoundingClientRect();
        const col = Math.floor(
          ((event.clientX - rect.left) / rect.width) * state.w,
        );
        const row = Math.floor(
          ((event.clientY - rect.top) / rect.height) * state.h,
        );
        const p = M.engine.position(state, state.player);
        if (col === p.x && Math.abs(row - p.y) === 1)
          actions.step(row > p.y ? "D" : "U");
        else if (row === p.y && Math.abs(col - p.x) === 1)
          actions.step(col > p.x ? "R" : "L");
      }
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  }
  M.input = Object.freeze({ bind });
})(window.Mochi);


