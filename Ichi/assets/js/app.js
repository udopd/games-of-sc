(function (M) {
  "use strict";
  // Composition root: coordinates features without embedding SDK calls or Sokoban rules.
  const game = {
    screen: "menu",
    levelIndex: 0,
    state: null,
    winPending: false,
  };
  const store = M.progress.createStore(),
    audio = M.audio.create();
  let lastInput = 0,
    completedEventSent = false,
    winTimer = null;
  const actions = {
    openLevel,
    showMenu,
    step,
    undo,
    restart,
    play: () => openLevel(store.value.last),
    random: () => openLevel(Math.floor(Math.random() * M.levels.maps.length)),
    rate: async (value) => { if (await platform.rate(value)) ui.closeDialog(); },
    ratingClosed: () => { if (game.screen === "game" && game.winPending && game.state) ui.openDialog("win", game.levelIndex, game.state); },
    resumeUnfinished: (index) => openLevel(index),
    favorite: () => {
      void platform.favorite();
    },
    sync: () => {
      void platform.sync();
    },
    toggleSound: () => {
      const enabled = audio.toggle();
      ui.updateSoundState(enabled);
    },
  };
  const ui = M.ui.create(actions);
  M.i18n.bindUI(ui);
  const canvas = ui.byId("board");
  const renderer = M.renderer.create({
    canvas,
    hero: ui.byId("heroCanvas"),
    getScreen: () => game.screen,
  });
  const platform = M.platform.create({
    store,
    getActiveLevel: () => (game.screen === "game" ? game.levelIndex : null),
    onProgress: ui.updateMenu,
    onStatus: ui.status,
    onRestore: ui.restoreMessage,
    onNotice: ui.toast,
    onFavorite: ui.paintFavorite,
    onBusy: ui.busy,
  });
function firstChapterComplete() {
    const completed = new Set(store.value.completed);
    return Array.from({ length: 25 }, (_, level) => completed.has(level)).every(Boolean);
  }
  function openLevel(index) {
    if (index >= 25 && !firstChapterComplete()) {
      ui.toast("Сначала пройди первые 25 уровней, чтобы открыть вторую страницу");
      return;
    }
    ui.setLevelPage(Math.floor(index / 25));
    platform.reconnect();
    clearTimeout(winTimer);
    ui.closeDrawer();
    ui.closeDialog(true);
    game.levelIndex =
      ((index % M.levels.maps.length) + M.levels.maps.length) %
      M.levels.maps.length;
    game.state = M.engine.parse(M.levels.maps[game.levelIndex]);
    game.screen = "game";
    game.winPending = false;
    completedEventSent = false;
    lastInput = 0;
    store.select(game.levelIndex);
    platform.persist();
    void platform.trackLevel("level_start", game.levelIndex);
    ui.showScreen(game.screen, game.levelIndex);
    renderer.reset(game.state);
    ui.updateHUD(game.state, game.winPending);
    audio.play("start");
  }
  function showMenu() {
    platform.reconnect();
    clearTimeout(winTimer);
    ui.closeDrawer();
    ui.closeDialog(true);
    game.screen = "menu";
    game.winPending = false;
    ui.showScreen(game.screen);
    ui.updateMenu(store.value);
  }
  function step(direction) {
    if (game.screen !== "game" || !game.state || game.winPending) return;
    const now = performance.now();
    if (now - lastInput < 112) return;
    const result = M.engine.move(game.state, direction);
    if (!result) return;
    if (result.blocked) {
      renderer.bump();
      if (result.wall) audio.play("wall");
      return;
    }
    lastInput = now;
    renderer.move(result, now);
    audio.play(result.boxFrom !== null || result.boneFrom !== null ? "push" : "step");
    game.winPending = result.solved;
    ui.updateHUD(game.state, game.winPending);
    if (result.solved) winTimer = setTimeout(finishLevel, 500);
  }
  function undo() {
    if (game.screen !== "game" || game.winPending) return;
    const result = M.engine.undo(game.state);
    if (!result) return;
    renderer.undo(result);
    ui.updateHUD(game.state, game.winPending);
    audio.play("undo");
  }
  function restart() {
    if (game.screen !== "game") return;
    openLevel(game.levelIndex);
    ui.toast("Начинаем с чистого листа ✿");
  }
  function finishLevel() {
    if (!game.winPending || game.screen !== "game" || completedEventSent)
      return;
    completedEventSent = true;
    void platform.trackLevel("level_complete", game.levelIndex);
    audio.play("win");
    store.complete(game.levelIndex, game.state.moves);
    platform.persist(true);
    ui.updateMenu(store.value);
    ui.launchConfetti();
if (game.levelIndex === 24 && !firstChapterComplete())
      ui.openDialog("incomplete", game.levelIndex, game.state);
    else if (game.levelIndex === M.levels.maps.length - 1) {
      if (new Set(store.value.completed).size === M.levels.maps.length)
        ui.openDialog("win", game.levelIndex, game.state);
      else ui.openDialog("incomplete", game.levelIndex, game.state);
    } else if (game.levelIndex === 4 && !platform.hasRated())
      ui.openDialog("rating", game.levelIndex, game.state);
    else ui.openDialog("win", game.levelIndex, game.state);
  }
  M.input.bind({ ui, actions, getGame: () => game, canvas });
  ui.updateMenu(store.value);
  ui.updateSoundState(audio.enabled());
  ui.startPreloader();
  renderer.start();
  void Promise.resolve(platform.start()).finally(() => ui.finishPreloader());
  function scheduleDogBark() {
    setTimeout(() => {
      if (game.screen === "menu" && !document.hidden && audio.enabled() && !ui.drawerOpen && !ui.dialogOpen)
        audio.play("bark");
      scheduleDogBark();
    }, 26000 + Math.random() * 28000);
  }
  scheduleDogBark();
})(window.Mochi);

