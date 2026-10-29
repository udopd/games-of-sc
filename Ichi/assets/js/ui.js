(function (M) {
  "use strict";
  const { maps: LEVELS, names: NAMES } = M.levels;
  const byId = (id) => document.getElementById(id);
  const t = (value) => M.i18n?.translate(value) ?? value;
  function createUI(actions) {
    let toastTimer = null, toastMessage = "", dialogMode = "", dialogArgs = null, saved = null, currentScreen = "menu", currentLevel = 0, levelPage = 0;
    let cloudMessage = "", levelsMessage = "", favoriteState = null, soundEnabled = true;
    let preloaderStartedAt = 0, preloaderProgress = 0, preloaderFinishing = false, preloaderFrame = 0, preloaderHideTimer = null;
    function updatePreloader(now) {
      const overlay = byId("preloader");
      if (overlay.classList.contains("is-hidden")) return;
      const elapsed = now - preloaderStartedAt;
      const target = preloaderFinishing ? 1 : Math.min(0.9, 0.06 + elapsed / 6500 * 0.84);
      preloaderProgress = preloaderFinishing ? 1 : preloaderProgress + (target - preloaderProgress) * 0.12;
      const percent = Math.round(preloaderProgress * 100);
      byId("preloaderFill").style.width = percent + "%";
      byId("preloaderTrack").setAttribute("aria-valuenow", String(percent));
      byId("preloaderDog").style.left = (6 + preloaderProgress * 88) + "%";
      const dog = byId("preloaderDog"), ctx = dog.getContext("2d");
      ctx.clearRect(0, 0, dog.width, dog.height);
      M.sprites.drawDog(ctx, 5, 3, 1, now, "R", Math.floor(now / 105) % 4);
      preloaderFrame = requestAnimationFrame(updatePreloader);
    }
    function refreshPreloaderText() {
      const english = M.i18n?.language === "en";
      byId("preloaderLabel").textContent = english ? "Loading player data…" : "Загружаем данные игрока…";
      byId("preloaderCaption").textContent = english ? "Ichi is on the way!" : "Ичи уже в пути!";
    }
    function startPreloader() {
      const overlay = byId("preloader");
      if (!overlay.classList.contains("is-hidden") && preloaderStartedAt) return;
      clearTimeout(preloaderHideTimer);
      cancelAnimationFrame(preloaderFrame);
      preloaderStartedAt = performance.now();
      preloaderProgress = 0;
      preloaderFinishing = false;
      overlay.classList.remove("is-hidden");
      overlay.setAttribute("aria-hidden", "false");
      refreshPreloaderText();
      preloaderFrame = requestAnimationFrame(updatePreloader);
    }
    function finishPreloader() {
      if (!preloaderStartedAt) startPreloader();
      preloaderFinishing = true;
      const wait = Math.max(0, 1000 - (performance.now() - preloaderStartedAt));
      clearTimeout(preloaderHideTimer);
      preloaderHideTimer = setTimeout(() => {
        cancelAnimationFrame(preloaderFrame);
        const overlay = byId("preloader");
        overlay.classList.add("is-hidden");
        overlay.setAttribute("aria-hidden", "true");
        preloaderStartedAt = 0;
      }, wait);
    }
    function chapterTwoUnlocked(progress = saved) {
      const completed = new Set(progress?.completed || []);
      return Array.from({ length: 25 }, (_, index) => completed.has(index)).every(Boolean);
    }
    function setLevelPage(page) {
      if (page === 1 && !chapterTwoUnlocked()) { toast('Сначала пройди первые 25 уровней, чтобы открыть вторую страницу'); return; }
      levelPage = page === 1 ? 1 : 0;
      if (saved) updateMenu(saved);
    }
    function updateMenu(progress) {
      saved = progress;
      const completed = new Set(progress.completed), english = M.i18n?.language === 'en';
      const unlocked = chapterTwoUnlocked(progress);
      if (!unlocked) levelPage = 0;
      const start = levelPage * 25;
      byId('levelGrid').innerHTML = LEVELS.slice(start, start + 25).map((_, offset) => {
        const i = start + offset, done = completed.has(i), selected = i === progress.last;
        return `<button class='level-tile ${done ? 'complete' : ''} ${selected ? 'active' : ''}' data-level='${i}' aria-label='${english ? 'Level' : 'Уровень'} ${i + 1}${done ? (english ? ', completed' : ', пройден') : ''}' title='${M.i18n?.levelName(i, NAMES[i]) || NAMES[i]}'>${String(i + 1).padStart(2, '0')}${done ? '<span class=\'tick\'>✔</span>' : ''}<small>${done ? (english ? 'DONE' : 'ГОТОВО') : selected ? (english ? 'SELECTED' : 'ВЫБРАН') : ''}</small></button>`;
      }).join('');
      byId('levelGrid').querySelectorAll('[data-level]').forEach((btn) => btn.addEventListener('click', () => actions.openLevel(Number(btn.dataset.level))));
      const amount = completed.size;
      byId('topProgress').textContent = `✦ ${amount} / 50 ${english ? 'levels' : 'уровней'}`;
      byId('meterFill').style.width = (amount / 50) * 100 + '%';
      byId('meterText').textContent = `${amount} ${english ? 'of' : 'из'} 50`;
      byId('playText').textContent = amount ? (english ? 'Continue' : 'Продолжить') : (english ? 'Start game' : 'Начать игру');
      const firstLevel = start + 1, lastLevel = Math.min(start + 25, LEVELS.length);
      byId('levelCount').textContent = english ? `LEVELS ${firstLevel}–${lastLevel}` : `УРОВНИ ${firstLevel}–${lastLevel}`;
      byId('levelPageLabel').textContent = english ? `Page ${levelPage + 1} of 2` : `Страница ${levelPage + 1} из 2`;
      byId('levelPagePrev').disabled = levelPage === 0;
      byId('levelPageNext').disabled = !unlocked || levelPage === 1;
      byId('levelPageNext').title = !unlocked ? (english ? 'Complete levels 1–25 to unlock' : 'Пройди уровни 1–25, чтобы открыть') : '';
      if (!levelsMessage) byId('levelsDesc').textContent = levelPage === 1 ? t('Косточки закапывают ямы. Освободи путь коробкам.') : t('Все уровни открыты. Проходи в своём темпе');
    }
    byId('levelPagePrev').addEventListener('click', () => setLevelPage(0));
    byId('levelPageNext').addEventListener('click', () => setLevelPage(1));
    function updateHUD(state, winPending) {
      if (!state) return;
      byId("moveCounter").textContent = state.moves;
      byId("pushCounter").textContent = state.pushes;
      byId("undoBtn").disabled = state.history.length === 0 || winPending;
      const good = [...state.boxes].filter((v) => state.goals.has(v)).length;
      byId("goalPills").innerHTML = [...state.goals].map((_, i) => `<span class="goal-pill ${i < good ? "done" : ""}">${i < good ? "✓" : ""}</span>`).join("");
    }
    function toast(message) { toastMessage = message; const el = byId("toast"); el.textContent = t(message); el.classList.add("show");
      clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.classList.remove("show"); toastMessage = ""; }, 1600);
    }
    function launchConfetti() {
      const colors = ["#eea869", "#a7c6aa", "#e48578", "#f5db9b", "#fff2de"];
      for (let i = 0; i < 40; i++) { const item = document.createElement("span"); item.className = "confetti"; item.style.left = Math.random() * 100 + "vw"; item.style.background = colors[i % colors.length]; item.style.animationDelay = Math.random() * 0.7 + "s"; item.style.setProperty("--drift", Math.random() * 280 - 140 + "px"); document.body.appendChild(item); setTimeout(() => item.remove(), 3400); }
    }
    function launchRatingParticles(button, rating) {
      const rect = button.getBoundingClientRect();
      const originX = rect.left + rect.width / 2;
      const originY = rect.top + rect.height / 2;
      const count = rating * 8;
      for (let i = 0; i < count; i++) {
        const particle = document.createElement("span");
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.25;
        const distance = 34 + Math.random() * 44;
        particle.className = "rating-particle";
        particle.setAttribute("aria-hidden", "true");
        particle.textContent = i % 3 === 0 ? "★" : "✦";
        particle.style.left = `${originX}px`;
        particle.style.top = `${originY}px`;
        particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
        particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
        particle.style.setProperty("--spin", `${Math.random() * 100 - 50}deg`);
        particle.style.setProperty("--particle-delay", `${Math.random() * 100}ms`);
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 1000);
      }
    }
    function openDialog(mode, levelIndex = 0, state = null) {
      dialogMode = mode;
      dialogArgs = [mode, levelIndex, state];
      const overlay = byId("overlay"), acts = byId("dialogActions");
      overlay.classList.toggle("rating-open", mode === "rating");
      overlay.classList.toggle("incomplete-open", mode === "incomplete");
      overlay.classList.remove("hidden");
      if (mode === "win") {
        byId("dialogEmoji").textContent = levelIndex === 49 ? "🏆" : "🐕";
        byId("dialogKicker").textContent = t(levelIndex === 49 ? "ВАУ! ВСЕ УРОВНИ!" : "УРА, ПОБЕДА!");
        byId("dialogTitle").textContent = t(levelIndex === 49 ? "Ты — легенда!" : "Ichi счастлив!");
        const copy = levelIndex === 49 ? `Все 50 уровней пройдены! ${state.moves} ходов на последнем. Ichi гордится тобой ♡` : `Уровень ${levelIndex + 1} пройден за ${state.moves} ходов и ${state.pushes} толчков. Хорошая работа!`;
        byId("dialogCopy").textContent = t(copy);
        acts.innerHTML = `${levelIndex < 49 ? `<button class="btn primary" id="nextLevel">${t("Следующий →")}</button>` : ""}<button class="btn" id="menuDialog">${t("Меню уровней")}</button>`;
        byId("nextLevel")?.addEventListener("click", () => actions.openLevel(levelIndex + 1));
        byId("menuDialog").addEventListener("click", actions.showMenu);
      } else if (mode === "incomplete") {
        const completed = new Set(saved?.completed || []);
        const levelLimit = levelIndex === 24 ? 25 : LEVELS.length;
        const firstIncomplete = Array.from({ length: levelLimit }, (_, index) => index).findIndex((index) => !completed.has(index));
        byId("dialogEmoji").textContent = "🐾";
        byId("dialogKicker").textContent = t(levelIndex === 24 ? "УРОВЕНЬ 25 ПРОЙДЕН" : "УРОВЕНЬ 50 ПРОЙДЕН");
        byId("dialogTitle").textContent = t("Остались непройденные уровни");
        byId("dialogCopy").textContent = t(`Пройдено ${completed.size} из ${levelLimit} уровней. Вернуться к непройденным?`);
        acts.innerHTML = `${firstIncomplete >= 0 ? `<button class="btn primary" id="resumeUnfinished">${t("Вернуться к непройденным уровням")}</button>` : ""}<button class="btn" id="menuDialog">${t("Меню уровней")}</button>`;
        byId("resumeUnfinished")?.addEventListener("click", () => actions.resumeUnfinished(firstIncomplete));
        byId("menuDialog").addEventListener("click", actions.showMenu);
      } else if (mode === "rating") {
        byId("dialogEmoji").textContent = "🐾";
        byId("dialogKicker").textContent = t("✦ ПЯТЬ УРОВНЕЙ ПРОЙДЕНО");
        byId("dialogTitle").textContent = t("Оценить игру?");
        byId("dialogCopy").textContent = t("Как тебе приключение с Ichi? Выбери количество звёзд:");
        acts.innerHTML = `<div class="rating-stars" role="group" aria-label="${t("Оценка игры")}">${[1,2,3,4,5].map((rating) => `<button type="button" data-game-rating="${rating}" aria-label="${rating} ${t("звёзд")}">★</button>`).join("")}</div><button class="btn rating-later" id="ratingLater">${t("Не сейчас")}</button>`;
        const starsGroup = acts.querySelector(".rating-stars");
        const starButtons = [...acts.querySelectorAll("[data-game-rating]")];
        const previewStars = (rating) => starButtons.forEach((button, index) => button.classList.toggle("is-preview", index < rating));
        starButtons.forEach((button) => {
          const rating = Number(button.dataset.gameRating);
          button.addEventListener("pointerenter", () => previewStars(rating));
          button.addEventListener("focus", () => previewStars(rating));
          button.addEventListener("click", () => { launchRatingParticles(button, rating); actions.rate(rating); });
        });
        starsGroup.addEventListener("pointerleave", () => previewStars(0));
        starsGroup.addEventListener("focusout", (event) => { if (!starsGroup.contains(event.relatedTarget)) previewStars(0); });
        byId("ratingLater").addEventListener("click", closeDialog);
      } else {
        byId("dialogEmoji").textContent = "🐾";
        byId("dialogKicker").textContent = t("ПРАВИЛА");
        byId("dialogTitle").textContent = t("Как играть");
        byId("dialogCopy").innerHTML = t("Помоги Ichi убрать все коробочки!<br>Толкай их на зелёные подушечки. Косточки толкай в ямы: они засыплются, и по ним смогут проехать коробки.");
        acts.innerHTML = `<button class="btn primary wide" id="gotIt">${t("Понятно, гав!")}</button>`;
        byId("gotIt").addEventListener("click", closeDialog);
      }
    }
    function closeDialog(suppressRatingFollowup = false) { const wasRating = dialogMode === "rating"; byId("overlay").classList.add("hidden"); byId("overlay").classList.remove("rating-open", "incomplete-open"); dialogMode = ""; dialogArgs = null; if (wasRating && !suppressRatingFollowup) actions.ratingClosed?.(); }
    function openDrawer() {
      document.body.classList.add("drawer-open"); byId("drawerShade").classList.remove("hidden"); byId("drawer").removeAttribute("inert"); byId("drawer").setAttribute("aria-hidden", "false"); byId("burgerBtn").setAttribute("aria-expanded", "true"); byId("burgerBtn").setAttribute("aria-label", t("Закрыть меню"));
    }
    function closeDrawer() {
      document.body.classList.remove("drawer-open"); byId("drawerShade").classList.add("hidden"); byId("drawer").setAttribute("inert", ""); byId("drawer").setAttribute("aria-hidden", "true"); byId("burgerBtn").setAttribute("aria-expanded", "false"); byId("burgerBtn").setAttribute("aria-label", t("Открыть меню"));
    }
    function updateSoundState(enabled) {
      soundEnabled = Boolean(enabled);
      const english = M.i18n?.language === "en";
      const button = byId("soundBtn");
      button.textContent = english
        ? `${soundEnabled ? "♫ Sound: on" : "♪ Sound: off"}`
        : `${soundEnabled ? "♫ Звук: включён" : "♪ Звук: выключен"}`;
      button.setAttribute("aria-pressed", String(soundEnabled));
      button.setAttribute("aria-label", english
        ? (soundEnabled ? "Turn sound off" : "Turn sound on")
        : (soundEnabled ? "Выключить звук" : "Включить звук"));
    }
    function paintFavorite(value) {
      favoriteState = value; const btn = byId("favoriteBtn"); btn.classList.toggle("is-favorite", value === true);
      btn.textContent = t(value === true ? "♥ В любимом" : "♡ Добавить в любимое");
      btn.setAttribute("aria-label", t(value === true ? "Убрать игру из любимого" : "Добавить игру в любимое"));
      if (value === null) btn.removeAttribute("aria-pressed"); else btn.setAttribute("aria-pressed", String(value));
    }
    function showScreen(screen, levelIndex = 0) {
      currentScreen = screen; currentLevel = levelIndex; const playing = screen === "game";
      document.body.classList.toggle("playing", playing); byId("home").classList.toggle("hidden", playing); byId("game").classList.toggle("hidden", !playing);
      if (playing) { byId("gameKicker").textContent = `${M.i18n?.language === "en" ? "LEVEL" : "УРОВЕНЬ"} ${String(levelIndex + 1).padStart(2, "0")} / 50`; const name = M.i18n?.levelName(levelIndex, NAMES[levelIndex]) || NAMES[levelIndex]; byId("gameTitle").textContent = name; byId("sideTitle").textContent = name; byId("missionDescription").textContent = t(levelIndex >= 25 ? "Закопай все косточки в ямы, затем передвинь коробочки на зелёные подушечки." : "Передвинь все коробочки на зелёные подушечки."); setTimeout(() => byId("board").focus({ preventScroll: true }), 0); }
    }
    function setLanguage() { refreshPreloaderText();
      if (saved) updateMenu(saved); showScreen(currentScreen, currentLevel);
      if (cloudMessage) status(cloudMessage); if (levelsMessage) restoreMessage(levelsMessage);
      paintFavorite(favoriteState);
      updateSoundState(soundEnabled);
      if (dialogMode && dialogArgs) openDialog(...dialogArgs);
      if (toastMessage && byId("toast").classList.contains("show")) byId("toast").textContent = t(toastMessage);
    }
    function status(message) { cloudMessage = message; byId("cloudStatus").textContent = t(message); }
    function restoreMessage(message) { levelsMessage = message; byId("levelsDesc").textContent = t(message); }
    return Object.freeze({ byId, updateMenu, updateHUD, toast, showScreen, setLevelPage, launchConfetti, openDialog, closeDialog, openDrawer, closeDrawer, paintFavorite, updateSoundState, setLanguage, startPreloader, finishPreloader,
      get dialogMode() { return dialogMode; }, get drawerOpen() { return document.body.classList.contains("drawer-open"); }, get dialogOpen() { return !byId("overlay").classList.contains("hidden"); },
      status, restoreMessage, busy(feature, busy) { byId(feature === "favorite" ? "favoriteBtn" : "syncBtn").disabled = busy; } });
  }
  M.ui = Object.freeze({ create: createUI });
})(window.Mochi);
