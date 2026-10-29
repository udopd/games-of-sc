(function (M) {
  "use strict";
  let language = "ru";
  let uiController = null;
  const originals = new Map();
  const originalTitle = document.title;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const originalDescription = descriptionMeta?.content || "";
  const names = ["First Paws", "The Bone Is Here", "Quiet Little Yard", "Two Boxes", "After the Walk", "Everything in Its Place", "Little Maze", "A Cozy Evening", "Next Door", "The Long Way Around", "No Rush", "Ichi's Corner", "Nimble Paws", "A Special Path", "Tidying Up Again", "Clever Tail", "A Tasty Reward", "Secret Passage", "A Tricky Turn", "Four Tasks", "The Art of Tidying", "Box Zen", "Almost Home", "One Last Push", "Paw Master"];
names.push(
    "Bone Bridge", "Pit in the Way", "Buried Passage", "Two Steps to the Goal", "First Trail",
    "Bone and Box", "Sand Barrier", "Following the Trail", "Hidden Yard", "Pawprint",
    "Two Routes", "Bone Trail", "Yard Pit", "Sandy Turn", "Nose First",
    "Bone Trap", "There and Back", "Two Bones", "Deep Pit", "Obstacle Course",
    "Solid Ground", "Buried Find", "Ichi's Tracks", "Tricky Yard", "Yard in Order",
  );
  const strings = {
    "Гость · сохранено на устройстве": "Guest · saved on this device",
    "Гость · прогресс только до закрытия игры. Войдите в аккаунт для облака": "Guest · progress lasts until you close the game. Sign in for cloud saves",
    "⟳ Сохраняю прогресс в облаке…": "⟳ Saving progress to the cloud…",
    "✓ Прогресс сохранён в облаке": "✓ Progress saved to the cloud",
    "Не удалось сохранить в облако · попробую снова": "Could not save to the cloud · will retry",
    "Ошибка облачного сохранения · повторная попытка": "Cloud save failed · retrying",
    "⟳ Загружаю пройденные уровни…": "⟳ Loading completed levels…",
    "⟳ Проверяю облачное сохранение…": "⟳ Checking cloud save…",
    "Гостевой режим · вход нужен для загрузки прогресса": "Guest mode · sign in to load progress",
    "✓ Облачный прогресс синхронизирован": "✓ Cloud progress synced",
    "Облачный SDK недоступен · локальное сохранение": "Cloud SDK unavailable · saved locally",
    "Ожидаю SDK SUPER CUBE · прогресс пока в памяти": "Waiting for SUPER CUBE SDK · progress is stored temporarily",
    "Не удалось загрузить уровни · повторяю попытку": "Could not load levels · retrying",
    "⚠ Не удалось загрузить прогресс · откройте ☰ для синхронизации": "⚠ Could not load progress · open ☰ to sync",
    "Избранное доступно на платформе SUPER CUBE": "Favorites are available on SUPER CUBE",
    "Войдите в аккаунт SUPER CUBE, чтобы добавить игру": "Sign in to SUPER CUBE to add this game to favorites",
    "♥ Ichi теперь в любимом!": "♥ Ichi is now in your favorites!",
    "Игра убрана из любимого": "Game removed from favorites",
    "Не удалось обновить любимое. Попробуйте ещё раз": "Could not update favorites. Please try again",
    "Войдите в аккаунт SUPER CUBE для облачных сохранений": "Sign in to SUPER CUBE to use cloud saves",
    "Начинаем с чистого листа ✿": "Starting fresh ✿",
    "УРОВЕНЬ 25 ПРОЙДЕН": "LEVEL 25 CLEARED",
    "УРОВЕНЬ 50 ПРОЙДЕН": "LEVEL 50 CLEARED",
    "Сначала пройди первые 25 уровней, чтобы открыть вторую страницу": "Complete the first 25 levels to unlock page two",
    "Косточки закапывают ямы. Освободи путь коробкам.": "Bones fill the pits. Clear a path for the boxes.", "Закопай все косточки в ямы, затем передвинь коробочки на зелёные подушечки.": "Bury all bones in the pits, then push every box onto a green cushion.", "Передвинь все коробочки на зелёные подушечки.": "Push all boxes onto the green cushions.",
    "Остались непройденные уровни": "Some levels are still unfinished",
    "Вернуться к непройденным уровням": "Return to unfinished levels",
    "Гостевой режим": "Guest mode",
    "Помоги Ichi убрать все коробочки!<br>Толкай их на зелёные подушечки. Косточки толкай в ямы: они засыплются, и по ним смогут проехать коробки.": "Help Ichi tidy up all the boxes!<br>Push them onto the green cushions. Push bones into pits to fill them so boxes can pass.",
    "ПРАВИЛА": "HOW TO PLAY", "Как играть": "How to play", "Понятно, гав!": "Got it, woof!", "УРА, ПОБЕДА!": "LEVEL CLEARED!", "ВАУ! ВСЕ УРОВНИ!": "WOW! ALL LEVELS!", "Ты — легенда!": "You are a legend!", "Ichi счастлив!": "Ichi is happy!", "Следующий →": "Next →", "Меню уровней": "Level menu", "Закрыть меню": "Close menu", "Открыть меню": "Open menu", "♥ В любимом": "♥ In favorites", "♡ Добавить в любимое": "♡ Add to favorites", "Убрать игру из любимого": "Remove game from favorites", "Добавить игру в любимое": "Add game to favorites",
    "✓ Облачное сохранение загружено · уровни ещё не пройдены": "✓ Cloud save loaded · no levels completed yet",
    "✦ ПЯТЬ УРОВНЕЙ ПРОЙДЕНО": "✦ FIVE LEVELS CLEARED", "Оценить игру?": "Enjoying the game?", "Как тебе приключение с Ichi? Выбери количество звёзд:": "How are you enjoying the adventure with Ichi? Pick a star rating:", "Оценка игры": "Game rating", "звёзд": "stars", "Не сейчас": "Not now", "Оценка доступна на платформе SUPER CUBE": "Ratings are available on SUPER CUBE", "Войдите в аккаунт SUPER CUBE, чтобы оценить игру": "Sign in to SUPER CUBE to rate this game", "Спасибо за оценку! Ichi машет лапкой ♡": "Thanks for rating! Ichi waves a paw ♡", "Не удалось сохранить оценку. Попробуйте ещё раз": "Could not save your rating. Please try again"
  };
  function translate(value) {
    if (language !== "en" || typeof value !== "string") return value;
    if (strings[value]) return strings[value];
    let match = value.match(/^✦ (\d+) \/ 50 уровней$/); if (match) return "✦ " + match[1] + " / 50 levels";
    match = value.match(/^(\d+) из 50$/); if (match) return match[1] + " of 50";
    match = value.match(/^✓ Из облака восстановлено: (\d+) из 50 уровней$/); if (match) return "✓ Restored from cloud: " + match[1] + " of 50 levels";
    match = value.match(/^✓ Из облака загружено (\d+) из 50 уровней$/); if (match) return "✓ Loaded " + match[1] + " of 50 levels from cloud";
    match = value.match(/^✓ Загружено (\d+) из 50 уровней$/); if (match) return "✓ Loaded " + match[1] + " of 50 levels";
    match = value.match(/^Пройдено (\d+) из (\d+) уровней\. Вернуться к непройденным\?$/); if (match) return "Completed " + match[1] + " of " + match[2] + " levels. Return to the unfinished ones?";
    match = value.match(/^✓ Облако восстановило (\d+) из 50 уровней$/); if (match) return "✓ Cloud restored " + match[1] + " of 50 levels";
    match = value.match(/^Уровень (\d+) пройден за (\d+) ходов и (\d+) толчков\. Хорошая работа!$/); if (match) return `Level ${match[1]} cleared in ${match[2]} moves and ${match[3]} pushes. Great job!`;
    match = value.match(/^Все 50 уровней пройдены! (\d+) ходов на последнем\. Ichi гордится тобой ♡$/); if (match) return `All 50 levels cleared! ${match[1]} moves on the last one. Ichi is proud of you ♡`;
    match = value.match(/^Событие (.*)$/); if (match) return `Event ${match[1]}`;
    return value;
  }
  function text(selector, value, html = false) {
    const el = document.querySelector(selector); if (!el) return;
    if (html) el.innerHTML = value; else el.textContent = value;
  }
  function applyStatic() {
    if (language !== "en") return;
    document.documentElement.lang = "en";
    document.title = "Ichi and the Little Boxes";
    document.querySelector('meta[name="description"]')?.setAttribute("content", "A cozy pixel-art Sokoban game starring Ichi the Shiba Inu. 50 levels, smooth animations, guest mode, and SUPER CUBE cloud saves.");
    const labels = [
      ["#logo", "Home", "aria-label"], ["#burgerBtn", "Open menu", "aria-label"],
      [".hero-copy .eyebrow", "✳ A SMALL, COZY ADVENTURE"], ["#mainTitle", "Ichi and<br /><span>the little boxes</span>", "html"],
      [".hero-copy p", "Our Shiba Inu has started tidying up. Help him put all the little boxes where they belong. Woof!"],
      [".levels-head .eyebrow", "YOUR ADVENTURE"], ["#levelsTitle", "Choose a level"], [".level-count", "50 LEVELS"],
      ["#levelsDesc", "All levels are unlocked. Play at your own pace."], [".meter", "Completion progress", "aria-label"], [".meter-copy span:first-child", "Your collection of wins"],
      [".footnote", "MADE WITH LOVE AND PAW PRINTS ♡ · 50 LEVELS"], ["#game", "Game board", "aria-label"],
      [".game-meta .metric:nth-child(1) .metric-label", "MOVES"], [".game-meta .metric:nth-child(2) .metric-label", "PUSHES"], [".game-footer", "TAKE YOUR TIME. YOU'VE GOT THIS ♡"],
      ["#drawer", "Game menu", "aria-label"], [".drawer-heading h2", "Ichi's Menu"], ["#drawerClose", "Close menu", "aria-label"],
      ["#helpBtn", "? How to play"], ["#soundBtn", "♫ Sound: on"], ["#heroCanvas", "Pixel-art Shiba Inu Ichi sitting and wagging his tail", "aria-label"], ["#favoriteBtn", "♡ Add to favorites"], ["#favoriteBtn", "Add game to favorites", "aria-label"],
      ["#syncBtn", "⟳ Sync progress"], ["#randomBtn", "✦ Random level"], [".side-card.level-card .side-head", "✦ MISSION"],
      [".side-description", "Push all the boxes onto the green cushions."], [".controls-card .side-head", "↗ CONTROLS"],
      ["#undoBtn", "↶ Undo"], ["#undoBtn", "Undo move (Z)", "title"], ["#restartBtn", "⟳"], ["#restartBtn", "Restart", "aria-label"], ["#restartBtn", "Restart (R)", "title"], ["#menuBtn", "▦ Level menu"],
      [".control-hint", '<span class="keys">W A S D</span> or <span class="keys">↑ ↓ ← →</span><br /><span class="keys">Z</span> undo · <span class="keys">R</span> restart', "html"],
      [".dpad", "On-screen controls", "aria-label"], [".dpad .up", "Up", "aria-label"], [".dpad .left", "Left", "aria-label"], [".dpad .down", "Down", "aria-label"], [".dpad .right", "Right", "aria-label"],
      [".helper", "Or swipe across the game board"], [".tip-card", '✿ Ichi says: Don’t push a box into a corner unless there’s a cushion there!'],
      [".cloud-status", "Guest mode"], [".drawer-foot", "ICHI AND THE LITTLE BOXES"], ["#closeDialog", "Close", "aria-label"]
    ];
    for (const [selector, value, mode] of labels) { const el = document.querySelector(selector); if (!el) continue; const key = `${selector}|${mode || "text"}`; if (!originals.has(key)) originals.set(key, { el, mode, value: mode && mode !== "html" ? el.getAttribute(mode) : mode === "html" ? el.innerHTML : el.textContent }); if (mode === "html") el.innerHTML = value; else if (mode) el.setAttribute(mode, value); else el.textContent = value; }
  }
  function setLanguage(value) {
    language = String(value || "ru").toLowerCase().startsWith("en") ? "en" : "ru";
    document.documentElement.lang = language;
    if (language === "en") applyStatic();
    else {
      document.title = originalTitle;
      if (descriptionMeta) descriptionMeta.content = originalDescription;
      for (const { el, mode, value } of originals.values()) { if (mode === "html") el.innerHTML = value; else if (mode) { if (value == null) el.removeAttribute(mode); else el.setAttribute(mode, value); } else el.textContent = value; }
    }
    uiController?.setLanguage?.();
  }
  M.i18n = Object.freeze({ translate, setLanguage, bindUI(controller) { uiController = controller; }, levelName(index, russian) { return language === "en" ? names[index] : russian; }, get language() { return language; } });
})(window.Mochi);

