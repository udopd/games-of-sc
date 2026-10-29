(function () {
  "use strict";
  const baseUrl = new URL("./", document.currentScript.src);

  function loadClassicScript(filename) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(filename, baseUrl).href;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Не удалось загрузить " + filename));
      document.head.appendChild(script);
    });
  }

  function showLoadError(error) {
    const title = document.getElementById("preloaderLabel");
    const caption = document.getElementById("preloaderCaption");
    if (title) title.textContent = "Не удалось открыть игру";
    if (caption) caption.textContent = error?.message || "Проверь файлы уровней.";
  }

  async function start() {
    try {
      await loadClassicScript("namespace.js");
      await loadClassicScript("level-data.js");
      try {
        const maps = await window.Mochi.loadChapterMaps();
        window.Mochi.chapter1Maps = Object.freeze(maps.chapter1Maps.map((rows) => Object.freeze(rows)));
        window.Mochi.chapter2Maps = Object.freeze(maps.chapter2Maps.map((rows) => Object.freeze(rows)));
      } catch (error) {
        console.warn("[Ichi] Не удалось загрузить source/*.levels.json; использую встроенную копию.", error);
        await loadClassicScript("chapter1.generated.js");
        await loadClassicScript("chapter2.generated.js");
      }

      const scripts = [
        "i18n.js", "levels.js", "engine.js", "progress.js", "platform.js",
        "audio.js", "sprites.js", "renderer.js", "ui.js", "input.js", "app.js",
      ];
      for (const filename of scripts) await loadClassicScript(filename);
    } catch (error) {
      console.error("[Ichi] Ошибка запуска:", error);
      showLoadError(error);
    }
  }

  void start();
})();