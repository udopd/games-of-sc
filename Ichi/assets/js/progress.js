(function (M) {
  "use strict";
  const LEVELS = M.levels.maps;
  const storageKey = "mochi-sokoban-v1"; // keep pre-migration local progress
  const emptyProgress = () => ({
    version: 1,
    completed: [],
    best: {},
    last: 0,
    updatedAt: 0,
  });
  function normaliseProgress(value) {
    const result = emptyProgress();
    if (!value || typeof value !== "object" || Array.isArray(value))
      return result;
    if (Array.isArray(value.completed))
      result.completed = [
        ...new Set(
          value.completed.filter(
            (n) => Number.isInteger(n) && n >= 0 && n < LEVELS.length,
          ),
        ),
      ].sort((a, b) => a - b);
    if (
      value.best &&
      typeof value.best === "object" &&
      !Array.isArray(value.best)
    ) {
      for (let i = 0; i < LEVELS.length; i++) {
        const n = value.best[i];
        if (Number.isSafeInteger(n) && n > 0 && n <= 1000000)
          result.best[i] = n;
      }
    }
    if (
      Number.isInteger(value.last) &&
      value.last >= 0 &&
      value.last < LEVELS.length
    )
      result.last = value.last;
    if (Number.isFinite(value.updatedAt) && value.updatedAt > 0)
      result.updatedAt = Math.min(value.updatedAt, 4102444800000);
    return result;
  }
  function mergeProgress(a, b) {
    const local = normaliseProgress(a),
      remote = normaliseProgress(b),
      merged = emptyProgress();
    merged.completed = [
      ...new Set([...local.completed, ...remote.completed]),
    ].sort((x, y) => x - y);
    for (let i = 0; i < LEVELS.length; i++) {
      const x = local.best[i],
        y = remote.best[i];
      if (x || y) merged.best[i] = x && y ? Math.min(x, y) : x || y;
    }
    // Current selection uses the most recent save; completed/best never regress.
    const localHasProgress =
      local.completed.length > 0 ||
      Object.keys(local.best).length > 0 ||
      local.updatedAt > 0;
    merged.last =
      !localHasProgress || remote.updatedAt > local.updatedAt
        ? remote.last
        : local.last;
    merged.updatedAt = Math.max(local.updatedAt, remote.updatedAt);
    return merged;
  }
  // Retain the v1 storage key and progress schema for existing players.
  function createStore() {
    let available = false,
      value = emptyProgress();
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) value = normaliseProgress(JSON.parse(raw));
      available = true;
    } catch (_) {
      /* Storage is unavailable in an opaque-origin iframe. */
    }
    return {
      get value() {
        return value;
      },
      set value(next) {
        value = normaliseProgress(next);
      },
      get available() {
        return available;
      },
      write() {
        if (!available) return;
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (_) {
          available = false;
        }
      },
      select(index) {
        value.last = index;
      },
      complete(index, moves) {
        if (!value.completed.includes(index)) value.completed.push(index);
        value.best[index] = Math.min(value.best[index] || Infinity, moves);
        value.last = Math.min(M.levels.maps.length - 1, index + 1);
      },
    };
  }
  M.progress = Object.freeze({
    empty: emptyProgress,
    normalise: normaliseProgress,
    merge: mergeProgress,
    createStore,
  });
})(window.Mochi);
