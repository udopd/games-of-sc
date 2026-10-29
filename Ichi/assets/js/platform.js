(function (M) {
  "use strict";
  // Only this adapter accesses window.SuperCubePlatform.
  // UI callbacks keep cloud synchronization independent from the game engine and DOM rendering.
  const { normalise: normaliseProgress, merge: mergeProgress } = M.progress;
  const hasOwn = (object, key) =>
    Object.prototype.hasOwnProperty.call(object, key);
  function createPlatform({
    store,
    getActiveLevel,
    onProgress,
    onStatus,
    onRestore,
    onNotice,
    onFavorite,
    onBusy,
  }) {
    let started = false;
    // SDK releases may wrap the JSON data differently. Never interpret an unknown
    // nonempty save as a blank one: doing so could overwrite completed levels.
    function decodeCloudProgress(response) {
      if (response?.requiresSignIn || response?.data?.requiresSignIn)
        throw Error("Sign-in required");
      if (response == null) return { save: null, updatedAt: 0 };
      let result = response;
      if (typeof result === "string") {
        try {
          result = JSON.parse(result);
        } catch (_) {
          throw Error("Invalid cloud-save JSON");
        }
      }
      if (!result || typeof result !== "object" || Array.isArray(result))
        throw Error("Invalid cloud-save response");
      let raw;
      if (hasOwn(result, "save")) raw = result.save;
      else if (
        result.data &&
        typeof result.data === "object" &&
        hasOwn(result.data, "save")
      )
        raw = result.data.save;
      else if (result.data?.data && hasOwn(result.data.data, "save"))
        raw = result.data.data.save;
      else if (
        hasOwn(result, "completed") ||
        hasOwn(result, "best") ||
        hasOwn(result, "last")
      )
        raw = result;
      else if (
        result.data &&
        typeof result.data === "object" &&
        (hasOwn(result.data, "completed") ||
          hasOwn(result.data, "best") ||
          hasOwn(result.data, "last"))
      )
        raw = result.data;
      else throw Error("Cloud response has no recognized save field");
      for (let depth = 0; depth < 3; depth++) {
        if (typeof raw === "string") {
          try {
            raw = JSON.parse(raw);
          } catch (_) {
            throw Error("Invalid cloud-save JSON");
          }
          continue;
        }
        if (
          raw &&
          typeof raw === "object" &&
          !Array.isArray(raw) &&
          !hasOwn(raw, "completed") &&
          !hasOwn(raw, "best") &&
          !hasOwn(raw, "last") &&
          hasOwn(raw, "data")
        ) {
          raw = raw.data;
          continue;
        }
        break;
      }
      if (raw == null) return { save: null, updatedAt: 0 };
      if (
        !raw ||
        typeof raw !== "object" ||
        Array.isArray(raw) ||
        !["completed", "best", "last"].some((k) => hasOwn(raw, k))
      ) {
        throw Error(
          "Unrecognized saved progress format (not overwriting cloud)",
        );
      }
      if (hasOwn(raw, "completed") && !Array.isArray(raw.completed))
        throw Error("Invalid completed levels array");
      const stamp = result.updatedAt ?? result.data?.updatedAt ?? raw.updatedAt;
      const updatedAt =
        typeof stamp === "number"
          ? stamp
          : typeof stamp === "string"
            ? Date.parse(stamp) || Number(stamp) || 0
            : 0;
      return {
        save: normaliseProgress({
          ...raw,
          updatedAt: raw.updatedAt ?? updatedAt,
        }),
        updatedAt,
      };
    }
    function sdkRequest(name, handler, timeout = 8000) {
      let timeoutId;
      return Promise.race([
        Promise.resolve().then(handler),
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(Error(name + " timed out")),
            timeout,
          );
        }),
      ]).finally(() => clearTimeout(timeoutId));
    }
    const cloud = {
      sdk: null,
      authenticated: false,
      ready: false,
      dirty: false,
      userId: null,
      saveTimer: null,
      queue: Promise.resolve(),
      syncing: false,
      revision: 0,
      retryMs: 1500,
      lastAttempt: 0,
      readFailed: false,
      connectionPromise: null,
      loadedOnce: false,
    };
    const pendingLevelEvents = [];
    const platformStatus = onStatus;
    const showRestoreMessage = onRestore;
    function showRestoredCount() {
      const n = store.value.completed.length;
      onRestore(
        n
          ? `✓ Из облака восстановлено: ${n} из 50 уровней`
          : "✓ Облачное сохранение загружено · уровни ещё не пройдены",
      );
    }
    function guestStatus() {
      return store.available
        ? "Гость · сохранено на устройстве"
        : "Гость · прогресс только до закрытия игры. Войдите в аккаунт для облака";
    }
    platformStatus(guestStatus());
    function cloudError(action, error) {
      // Failures must not stop gameplay; do not log personal user data.
      console.warn(
        "[Mochi] " + action + ":",
        error instanceof Error ? error.message : String(error),
      );
    }
    function storeLocal() {
      store.write();
    }
    function persist(immediate = false) {
      store.value.updatedAt = Date.now();
      storeLocal();
      cloud.revision++;
      cloud.dirty = true;
      if (cloud.ready && cloud.authenticated) {
        if (immediate) void flushCloudSave();
        else scheduleCloudSave(180);
      } else if (!cloud.authenticated) {
        platformStatus(guestStatus());
      }
    }
    // Only save after a successful cloud read. A save is sequential, never fire-and-forget
    // concurrently; a new move during an in-flight save is queued as a fresh snapshot.
    function scheduleCloudSave(delay = 180) {
      if (
        !cloud.ready ||
        !cloud.authenticated ||
        typeof cloud.sdk?.save !== "function"
      )
        return;
      clearTimeout(cloud.saveTimer);
      cloud.saveTimer = setTimeout(() => {
        void flushCloudSave();
      }, delay);
    }
    function flushCloudSave() {
      clearTimeout(cloud.saveTimer);
      if (
        !cloud.ready ||
        !cloud.authenticated ||
        typeof cloud.sdk?.save !== "function"
      )
        return Promise.resolve(false);
      cloud.queue = cloud.queue
        .catch(() => false)
        .then(async () => {
          if (!cloud.dirty || !cloud.ready || !cloud.authenticated) return true;
          const snapshot = normaliseProgress(store.value);
          const revision = cloud.revision;
          cloud.dirty = false;
          platformStatus("⟳ Сохраняю прогресс в облаке…");
          try {
            const result = await sdkRequest("save", () =>
              cloud.sdk.save(snapshot),
            );
            if (result?.requiresSignIn || result?.ok === false)
              throw Error("Cloud save declined");
            cloud.retryMs = 1500;
            if (cloud.revision !== revision || cloud.dirty) {
              cloud.dirty = true;
              scheduleCloudSave(0);
            } else {
              platformStatus("✓ Прогресс сохранён в облаке");
            }
            return true;
          } catch (error) {
            cloud.dirty = true;
            cloudError("Ошибка сохранения", error);
            platformStatus(
              store.available
                ? "Не удалось сохранить в облако · попробую снова"
                : "Ошибка облачного сохранения · повторная попытка",
            );
            const delay = cloud.retryMs;
            cloud.retryMs = Math.min(cloud.retryMs * 2, 15000);
            scheduleCloudSave(delay);
            return false;
          }
        });
      return cloud.queue;
    }
    async function trackLevel(event, index) {
      const payload = { label: "level-" + (index + 1) };
      if (typeof cloud.sdk?.track !== "function") {
        if (pendingLevelEvents.length < 100)
          pendingLevelEvents.push({ event, payload });
        return;
      }
      try {
        await sdkRequest("track", () => cloud.sdk.track(event, payload));
      } catch (error) {
        cloudError("Событие " + event, error);
      }
    }
    async function flushPendingLevelEvents() {
      if (typeof cloud.sdk?.track !== "function") return;
      const batch = pendingLevelEvents.splice(0);
      for (const item of batch) {
        try {
          await sdkRequest("track", () =>
            cloud.sdk.track(item.event, item.payload),
          );
        } catch (error) {
          cloudError("Отложенное событие " + item.event, error);
        }
      }
    }
    // A manual sync must always read from the backend, including when this
    // iframe previously loaded a save. Coalesce simultaneous startup/focus calls.
    function connectPlatform(forceReload = false) {
      if (cloud.connectionPromise) return cloud.connectionPromise;
      cloud.connectionPromise = performPlatformConnect(forceReload).finally(
        () => {
          cloud.connectionPromise = null;
        },
      );
      return cloud.connectionPromise;
    }
    async function performPlatformConnect(forceReload = false) {
      const sdk = window.SuperCubePlatform;
      if (!sdk || typeof sdk.getUser !== "function") {
        platformStatus(
          store.available
            ? "Облачный SDK недоступен · локальное сохранение"
            : "Ожидаю SDK SUPER CUBE · прогресс пока в памяти",
        );
        return false;
      }
      cloud.sdk = sdk;
      void flushPendingLevelEvents();
      cloud.syncing = true;
      cloud.lastAttempt = Date.now();
      try {
        if (!cloud.loadedOnce)
          showRestoreMessage("⟳ Загружаю пройденные уровни…");
        platformStatus("⟳ Проверяю облачное сохранение…");
        const user = await sdkRequest("getUser", () => sdk.getUser());
        if (!user?.authenticated) {
          cloud.authenticated = false;
          cloud.ready = false;
          cloud.userId = null;
          cloud.loadedOnce = false;
          showRestoreMessage(
            "Гостевой режим · вход нужен для загрузки прогресса",
          );
          platformStatus(guestStatus());
          return false;
        }
        const playerId = user.playerId == null ? null : String(user.playerId);
        if (
          !forceReload &&
          cloud.ready &&
          cloud.authenticated &&
          cloud.userId === playerId
        ) {
          if (cloud.dirty) scheduleCloudSave(0);
          else platformStatus("✓ Облачный прогресс синхронизирован");
          return true;
        }
        // Invalidate any pending write from another session while reading the save.
        cloud.authenticated = true;
        cloud.ready = false;
        cloud.userId = playerId;
        clearTimeout(cloud.saveTimer);
        if (typeof sdk.loadSave !== "function")
          throw Error("loadSave is not available");
        const response = await sdkRequest(
          "loadSave",
          () => sdk.loadSave(),
          10000,
        );
        const decoded = decodeCloudProgress(response);
        const remote = decoded.save;
        const local = normaliseProgress(store.value);
        const merged = mergeProgress(local, remote);
        const activeLevel = getActiveLevel();
        if (activeLevel !== null) merged.last = activeLevel;
        store.value = merged;
        storeLocal();
        cloud.readFailed = false;
        cloud.ready = true;
        cloud.loadedOnce = true;
        // Only upload after receiving a valid cloud response. Keep all wins from
        // this session even when a load finishes while the player is solving.
        // Never create an empty save just because loadSave() returned null:
        // backend auth/save initialization can be eventually consistent.
        const hasUnsavedProgress =
          merged.completed.length > 0 ||
          Object.keys(merged.best).length > 0 ||
          merged.updatedAt > 0;
        cloud.dirty =
          cloud.dirty ||
          (remote
            ? JSON.stringify(normaliseProgress(remote)) !==
              JSON.stringify(merged)
            : hasUnsavedProgress);
        onProgress(store.value);
        showRestoredCount();
        platformStatus(
          `✓ Из облака загружено ${store.value.completed.length} из 50 уровней`,
        );
        if (cloud.dirty) scheduleCloudSave(0);
        return true;
      } catch (error) {
        cloudError("Подключение/загрузка", error);
        cloud.readFailed = true;
        cloud.ready = false; // Never overwrite an unreadable/unknown cloud save.
        platformStatus("Не удалось загрузить уровни · повторяю попытку");
        showRestoreMessage(
          "⚠ Не удалось загрузить прогресс · откройте ☰ для синхронизации",
        );
        return false;
      } finally {
        cloud.syncing = false;
      }
    }
    // The iframe SDK and the host login often become ready asynchronously. Retry
    // quickly during the first minute rather than waiting 12 seconds after a guest
    // or an SDK-startup response. Slow down thereafter to avoid polling overload.
    function initialisePlatform() {
      if (started) return cloud.connectionPromise || Promise.resolve(false);
      started = true;
      const initialTime = Date.now();
      const initialConnection = connectPlatform();
      setInterval(() => {
        if (document.visibilityState === "hidden" || cloud.syncing) return;
        if (!window.SuperCubePlatform) return;
        const warm = Date.now() - initialTime < 45000;
        const interval = warm ? 1600 : 12000;
        const sdkChanged = window.SuperCubePlatform !== cloud.sdk;
        const reloadNeeded = sdkChanged || !cloud.ready;
        if (reloadNeeded && Date.now() - cloud.lastAttempt >= interval)
          void connectPlatform(sdkChanged);
        else if (cloud.dirty && cloud.ready) scheduleCloudSave(0);
      }, 800);
      window.addEventListener("focus", () => {
        if (!cloud.syncing)
          void connectPlatform(Date.now() - cloud.lastAttempt > 30000);
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          if (!cloud.syncing)
            void connectPlatform(Date.now() - cloud.lastAttempt > 30000);
        } else if (cloud.dirty && cloud.ready) void flushCloudSave();
      });
      return initialConnection;
    }
    // Favorite API is a server-side toggle. The SDK provides no getter for
    // initial favorite state; only update the heart after a confirmed response.
    let favoriteState = null,
      favoriteBusy = false,
      ratingValue = null;
    function paintFavorite() {
      onFavorite(favoriteState);
    }
    // The host keeps favorite state and the game theme in sync with the platform.
    window.addEventListener("message", (event) => {
      const data = event.data;
      if (data?.channel !== "SC_PLATFORM_SETTINGS") return;
      if (data.theme === "dark" || data.theme === "light") {
        document.documentElement.dataset.theme = data.theme;
      }
      const platformLanguage = data.language ?? data.lang ?? data.locale;
      if (typeof platformLanguage === "string") M.i18n?.setLanguage(platformLanguage);
      if (typeof data.favorite === "boolean") {
        favoriteState = data.favorite;
        paintFavorite();
      }
      if (Number.isInteger(data.rating) && data.rating >= 0 && data.rating <= 5)
        ratingValue = data.rating;
    });
    async function submitRating(rating) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) return false;
      const sdk = window.SuperCubePlatform;
      if (typeof sdk?.getUser !== "function" || typeof sdk?.rate !== "function") {
        onNotice("Оценка доступна на платформе SUPER CUBE");
        return false;
      }
      try {
        const user = await sdkRequest("getUser", () => sdk.getUser());
        if (!user?.authenticated) {
          onNotice("Войдите в аккаунт SUPER CUBE, чтобы оценить игру");
          return false;
        }
        await sdkRequest("rate", () => sdk.rate(rating));
        ratingValue = rating;
        onNotice("Спасибо за оценку! Ichi машет лапкой ♡");
        return true;
      } catch (error) {
        cloudError("Оценка игры", error);
        onNotice("Не удалось сохранить оценку. Попробуйте ещё раз");
        return false;
      }
    }
    async function toggleFavorite() {
      if (favoriteBusy) return;
      const sdk = window.SuperCubePlatform;
      if (
        typeof sdk?.getUser !== "function" ||
        typeof sdk?.favorite !== "function"
      ) {
        onNotice("Избранное доступно на платформе SUPER CUBE");
        return;
      }
      favoriteBusy = true;
      onBusy("favorite", true);
      try {
        const user = await sdkRequest("getUser", () => sdk.getUser());
        if (!user?.authenticated) {
          onNotice("Войдите в аккаунт SUPER CUBE, чтобы добавить игру");
          return;
        }
        const result = await sdkRequest("favorite", () => sdk.favorite());
        if (typeof result?.favorite !== "boolean")
          throw Error("Invalid favorite response");
        favoriteState = result.favorite;
        paintFavorite();
        onNotice(
          favoriteState
            ? "♥ Ichi теперь в любимом!"
            : "Игра убрана из любимого",
        );
      } catch (error) {
        cloudError("Избранное", error);
        onNotice("Не удалось обновить любимое. Попробуйте ещё раз");
      } finally {
        favoriteBusy = false;
        onBusy("favorite", false);
      }
    }
    async function syncNow() {
      onBusy("sync", true);
      try {
        await connectPlatform(true);
        if (cloud.ready && cloud.authenticated) {
          if (cloud.dirty) await flushCloudSave();
          else
            platformStatus(
              `✓ Загружено ${store.value.completed.length} из 50 уровней`,
            );
        } else if (!cloud.authenticated && !cloud.readFailed) {
          onNotice("Войдите в аккаунт SUPER CUBE для облачных сохранений");
        }
      } catch (error) {
        cloudError("Ручная синхронизация", error);
      } finally {
        onBusy("sync", false);
      }
    }
    return Object.freeze({
      start: initialisePlatform,
      persist,
      trackLevel,
      sync: syncNow,
      favorite: toggleFavorite,
      rate: submitRating,
      hasRated() { return Number.isInteger(ratingValue) && ratingValue > 0; },
      reconnect() {
        if (cloud.sdk && !cloud.ready && !cloud.syncing) void connectPlatform();
      },
    });
  }
  M.platform = Object.freeze({ create: createPlatform });
})(window.Mochi);
