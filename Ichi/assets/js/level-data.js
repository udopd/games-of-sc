(function (M) {
  "use strict";
  const sourceBase = new URL("../../source/", document.currentScript.src);

  async function readChapterFile(name, firstLevel) {
    const response = await fetch(new URL(name, sourceBase), { cache: "no-cache" });
    if (!response.ok) throw new Error(name + " returned HTTP " + response.status);
    const payload = await response.json();
    const entries = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.levels)
        ? payload.levels
        : Array.isArray(payload?.maps)
          ? payload.maps
          : null;
    if (!entries || entries.length !== 25) {
      throw new Error(name + " must contain exactly 25 levels");
    }
    return entries.map((entry, index) => {
      const rows = Array.isArray(entry) ? entry : entry?.rows ?? entry?.map;
      if (!Array.isArray(rows) || rows.length < 5 || rows.some((row) => typeof row !== "string")) {
        throw new Error(name + " has an invalid map at level " + (firstLevel + index));
      }
      const width = rows[0].length;
      if (width < 5 || rows.some((row) => row.length !== width)) {
        throw new Error(name + " has an invalid map width at level " + (firstLevel + index));
      }
      return rows.slice();
    });
  }

  M.loadChapterMaps = async function () {
    const [chapter1Maps, chapter2Maps] = await Promise.all([
      readChapterFile("chapter1.levels.json", 1),
      readChapterFile("chapter2.levels.json", 26),
    ]);
    return { chapter1Maps, chapter2Maps };
  };
})(window.Mochi);