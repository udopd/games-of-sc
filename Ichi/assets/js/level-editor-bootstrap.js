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

  async function startEditor() {
    try {
      await loadClassicScript("namespace.js");
      await loadClassicScript("level-data.js");
      try {
        const maps = await window.Mochi.loadChapterMaps();
        window.Mochi.chapter1Maps = Object.freeze(maps.chapter1Maps.map((rows) => Object.freeze(rows)));
        window.Mochi.chapter2Maps = Object.freeze(maps.chapter2Maps.map((rows) => Object.freeze(rows)));
      } catch (error) {
        console.warn("[Ichi editor] Не удалось загрузить source/*.levels.json; использую встроенную копию.", error);
        await loadClassicScript("chapter1.generated.js");
        await loadClassicScript("chapter2.generated.js");
      }
      await loadClassicScript("levels.js");
      await loadClassicScript("level-editor.js");
    } catch (error) {
      console.error("[Ichi editor] Ошибка запуска:", error);
      const note = document.getElementById("saveNote");
      if (note) note.textContent = "Не удалось загрузить уровни: " + (error?.message || "проверь JSON-файлы.");
    }
  }

  void startEditor();
})();