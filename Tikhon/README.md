# Tikhon 2048 · SUPER CUBE Games Platform · v1.6

Cozy, responsive pixel-art 2048 game starring Tikhon, a British Shorthair cat. Original visuals, 4×4 tile game, particles on merge/impact and centered 107.5% merge pulse. No external libraries or runtime URLs.

## Upload

Upload this ZIP directly to the SUPER CUBE Games Platform admin panel. `index.html` and `runtime.txt` (`browser`) must stay in the archive root. Catalog metadata is in `media/` (UTF-8). The English-only title is `Tikhon 2048`, and the capsule is **630×500 JPEG**. All game resources have relative paths. Do **not** add `allow-same-origin` to the iframe.

## Layout

```text
index.html
runtime.txt
assets/
  css/
    main.css              layout, palette, dark background and readable text colors
    responsive.css        mobile/landscape layouts
  js/
    i18n.js               RU/EN strings and UI updates (new)
    game.js               2048 rules and undo
    renderer.js           tile animation
    effects.js            pixel particles
    cat-art.js            only idle and new-highest-tile joy animations
    petting.js            stroke detection and happy particle visuals; never changes cat pose
    input.js              keyboard and swipe controls
    ui.js                 controls, modal, notifications
    sound.js              synthesized Web Audio
    platform-sdk.js       SDK wrappers + optional host UI-message bridge
    storage.js            local/cloud save serialization + validation
    main.js               orchestration and lifecycle
  images/
    tikhon-frames.png    3×3 trimmed, aligned 164×144 pixel-art atlas
  cat-icon.svg
media/
  title.txt
  description.ru.txt
  description.en.txt
  tags.ru.txt
  tags.en.txt
  capsule.jpg
  screenshots/
    01.webp
    02.webp
```

## Favorite state on startup

- The documented platform SDK exposes **`favorite()` as a toggle, but no getter** for whether this game is currently favorited. **Never toggle favorite on startup to guess its current value.**
- Now, after a successful `favorite()` call, its confirmed boolean (`result.favorite`) is saved with the game progress in cloud save: `favorite:true`/`favorite:false`. At next load, the button can say **«Убрать из любимого» / “Remove from favorites”** immediately after the save is restored. The heart changes to ♥. This is a cache of the last action acknowledged in-game, not the canonical cross-device or catalog state.
- If the host pushes `favorite` in the optional UI message shown below, that **host state takes priority** over the cached value. If your platform offers an optional `getFavoriteStatus()` / `getFavoriteState()` that returns boolean or `{favorite:boolean}`, this adapter also uses it, unless a host state has already arrived. These are **optional**, NOT documented platform SDK methods.
- To guarantee the correct label for favorites changed from a catalog card or another device, the platform **must expose a read-only favorite-state getter or push a current favorite boolean to the iframe**. The game cannot reliably infer that status from the present `getUser()` / `favorite()` contract.
- The SDK remains isolated in `platform-sdk.js`. Game rules never directly call `window.SuperCubePlatform`.

## Platform appearance and language

- RU/EN translations cover the main screen, tagline, menus, dialogs, progress/sync feedback and accessibility labels. The catalogue title remains `Tikhon 2048` in English.
- The game accepts the platform's actual message contract from `public/js/game-host.js`: `{ channel: 'SC_PLATFORM_SETTINGS', language: 'ru' | 'en', theme: 'dark' | 'light', favorite: boolean | null }`. Only messages sent by `window.parent` are accepted.
- The platform publishes settings when the iframe loads and when language or theme changes. No platform modification or new SDK method is required. The latest valid settings are cached, including messages received before the game subscribes.
- Platform language takes priority over the initial URL/browser fallback. Supported regional locales such as `en-GB`, `ru-RU` and `ru_RU` normalize to EN/RU; unsupported values are ignored. With no supported fallback locale, Russian is used.
- Language changes refresh visible dialogs, notifications, score formatting and accessibility labels without restarting the game. Numeric values remain numbers until rendering, so an open game-over dialog uses the newly selected locale.
- Legacy `supercube:ui`, `supercube:appearance` and `supercube:preferences` messages remain supported for compatibility with older hosts. The legacy `supercube:request-ui-state` request is optional; the current platform sends settings independently.
- Dark/light appearance uses the existing page color tokens. Host-provided theme takes priority over the browser media query. No parent DOM access is used.

## Localization fix verification (2026-10-28)

Automated Node checks passed for the real platform message shape, messages before subscription, RU/EN switching, regional locales, open dialogs, notifications, menu state, number formatting, static text and accessibility hooks, invalid sources, unsupported locales and legacy messages. All game JavaScript files pass syntax checks. These checks use a simulated DOM; visual browser rendering and production upload were not tested for this fix.

## Cloud save / compatibility

`loadSave()` is called before any authorized `save()`; unknown save formats cannot be automatically overwritten. Existing v1.2 saves without `favorite` restore the game state, score and best normally. After the first successful in-game heart toggle, the new optional `favorite` field becomes part of the same save. Guest `localStorage` remains a best-effort fallback; it can be denied in a sandboxed opaque origin. The 250 KB cloud limit is respected.

Cloud state cannot reconstruct actions taken outside the game if they are not reported by the platform. If the game is already favorited in the platform but the cloud save has no favorite field, the button has no authoritative way to know this until the platform sends the value or implements a getter.

## Testing / limitations

Executed real Chromium with all project CSS and JS **inlined by the test harness** because this runtime blocks local HTTP navigation. Tested 320×480, 390×844, 667×375 and 1440×900 for page overflow and JS exceptions. Mocked `getUser()`, `loadSave()`, `save()`, `favorite()`, `track()` and tested a saved favorite `true` restored to the **Remove from favorites** button, toggled to `false`, then cloud-save payload confirmed `favorite:false`. Tested English translation including an open rules dialog. Tested in a real sandboxed `iframe sandbox="allow-scripts"` with inlined assets, runtime host appearance messages, favorite state pushes, background and foreground theme change, and RU→EN→RU switching. No JavaScript errors in those tests. Validated script syntax using Node and archive paths separately.

The test harness does **not** prove real network fetches of separate CSS/JS files, real SDK injection, production backend synchronization, or integration with the actual SUPER CUBE theme and language controls. The localization fix uses the existing SC_PLATFORM_SETTINGS messages. Do a final end-to-end test after upload.

## Credits and licenses

Code, original pixel-cat art, text, cover and sound synthesis are created for this game. No third-party source libraries, fonts, audio or art assets are bundled. The familiar 2048 mechanics are used as game rules, not by copying a third-party implementation. No license grant is asserted; set your preferred distribution license when publishing externally.

## Changed in v1.3 (relative to v1.2)

- `index.html`: added translation hooks and a separate `i18n.js` script.
- `assets/js/i18n.js`: **new** dictionary, browser locale and dynamic RU/EN rendering.
- `assets/js/ui.js`: localized all dynamic labels, notifications and dialogs; active favorite button now clearly says **Remove from favorites**.
- `assets/js/main.js`: integrate live UI settings, persist confirmed favorite with cloud save, localize dynamic gameplay feedback.
- `assets/js/platform-sdk.js`: optional read-favorite support and host UI postMessage bridge (all in SDK adapter).
- `assets/js/storage.js`: persist and parse optional `favorite` boolean in save (backward-compatible).
- `assets/css/main.css`: dark background token and formatting for translated copy.
- `README.md`: documented the new behavior, bridge contract and SDK limitation.

All other assets, game mechanics, animations and metadata are unchanged.


## Changed in v1.4 (relative to v1.3)

- `assets/css/main.css`: define page typography theme tokens; switch page headings, descriptions, header and footer text to light tones on a deeper dark background. Preserve dark text on pale fixed surfaces for readable contrast. No changes to tile colors, borders, drawing or animation.
- `assets/js/main.js`: update the browser theme-color meta tag for the deeper dark background.
- `README.md`: document theme foreground behavior and test boundaries.

Theme changes are still driven by the existing platform context bridge; no SDK or gameplay logic has changed.


## Changed in v1.6 · Tikhon character and animated sprites

- `assets/images/tikhon-frames.png` **added**: nine transparent pixel-cat frames based on the grey, round-faced, amber-eyed British Shorthair on the new cover. Includes idle poses (4), happy poses (3), and sleeping poses (2). All frames share the same 160×160 canvas to eliminate jitter when poses change.
- `assets/js/cat-art.js` **replaced**: the former procedural 52px cat is now a sprite animation controller. Idle blinking/breathing, sleeping after inactivity, quick happy reaction on tile merging / winning, blink on a wall bump, and tap-to-pet reaction. Honors `prefers-reduced-motion` and pauses when hidden.
- `assets/js/main.js` **changed**: forwards game events to the isolated character animation controller, without modifying game rules, save logic, or the SDK adapter.
- `media/capsule.jpg` **updated**: matches the latest Tikhon pixel-art capsule, resized to 630×500 JPEG for platform upload.
- `README.md` **changed**: documented the new assets, behavior and attribution.

No third-party runtime libraries or remote image URLs. The sprite artwork and cover were generated specifically for this game; no outside artist attribution is required by these assets. The transparent atlas is displayed through a local relative URL. In sandboxed iframes, the browser may give the document an opaque origin; drawing a loaded image onto canvas is allowed for display, but do not attempt pixel reads or exporting from the canvas.

## v1.6 — Two cat animations and petting

The character now uses **only two animation states**: idle (with a gentle blink) and joy. The joy sequence runs **exclusively after a merge creates a tile that exceeds the highest tile previously achieved in the current run**; ordinary merges, moves, wall bumps, undo, a new game, and petting do not start the joy animation. The highest achieved tile (`peakTile`) is saved alongside the 2048 board so reloads and undo do not replay a previously earned milestone. Legacy saves without `peakTile` derive the baseline from the current board. A new game resets the baseline.

Players can **pet Tikhon** by stroking back-and-forth over his image with a mouse or finger. Once a real stroke is detected, the game plays a short synthesised purr (if game sound is enabled) and emits little hearts and sparkles locally over the cat. These are independent visual effects, **not a third cat animation**. Static hover and one tap don't count as strokes. Effects have cooldowns, a node cap and reduced-motion support. The purr is Web Audio with no new media files or external dependencies. Purring respects the hamburger-menu mute setting.

Files updated: `assets/js/cat-art.js`, `assets/js/game.js`, `assets/js/storage.js`, `assets/js/main.js`, `assets/js/sound.js`, `assets/js/i18n.js`, `assets/css/main.css`, `assets/css/responsive.css`, `index.html`, and `README.md`. New: `assets/js/petting.js`.

Production platform SDK, server-side save persistence and audio unlock behavior depend on the hosting browser/platform. Verify those after uploading; there are no additional SDK calls for petting.

On touchscreens, the first pointer press unlocks Web Audio when permitted. On desktop browsers that prohibit autoplay, move-only hover strokes still show particles, but synthesized purring may require the first click/tap or another user gesture to authorize audio.


## v1.7
- Tikhon now reacts visually to petting with a soft squash/wiggle feedback while purring and spawning happy particles.
- Cat sprite frames are normalized to a consistent draw box so idle and joy animations no longer jump in apparent size.
- Responsive cat-card sizing was rebalanced to prevent frame clipping by the container on compact screens.


## v1.8 — invisible Tikhon fix
- Removed canvas pixel reads from animation preparation (`getImageData`). Sandboxed opaque-origin iframes may taint images even when `drawImage` succeeds, which formerly caused the entire cat initialization to fail.
- Frame bounds are now precomputed statically, and active idle/happy sprites are rendered in the same anchored box.
- Changed the packaging to place `index.html`, `runtime.txt`, `assets/` and `media/` directly at the ZIP root.


## v1.9
- Changed Tikhon's joy animation: it is now more expressive and springy when a new maximum tile appears.
- Added a dedicated petting animation: Tikhon now visibly wiggles and leans into the stroke while purring.


## v2.0 · Press-and-stroke interactions and trimmed sprite atlas
- Petting is possible **only while the primary mouse button / touch pointer is held and moved** across Tikhon. Hovering does not trigger sounds, visual reactions, or particles. The stroke ends on pointerup/pointercancel, even outside the canvas thanks to pointer capture.
- The sprite atlas has been rebuilt at 3×3 cells of 164×144 px with complete character silhouettes, no forced distortion, centered horizontally and anchored on a shared paw baseline. No pixel reads at runtime, compatible with sandboxed opaque-origin iframes.
- Canvas is fitted proportionally to the actual card size through ResizeObserver without clipping on mobile.
- Joy still starts only on a new maximum tile; petting only triggers the pet-specific reaction. Game logic, cloud saves, localization and catalog files are unchanged.


## v2.1
- Redrew the cat sprite atlas so each animation now contains 8 frames.
- The game now uses three 8-frame sequences: idle, joy and petting.


## v2.2
- Fixed only the animation atlas: widened side safety margins and re-centered frames so cat sprites are no longer clipped at the sides.


## v2.5 — исправление запуска

Исправлена несовместимость модулей при возврате кота: `assets/js/ui.js` теперь снова предоставляет `sayKey()`, используемый игровым модулем `main.js` и обработчиком поглаживания. В предыдущей сборке это останавливало выполнение игрового скрипта до отрисовки игрового поля и кота.

Восстановлены локализованные метаданные версии с Тихоном. Вся игровая логика, разделение SDK, облачные сохранения и 2048 сохранены.

### Проверка v2.5

- Тест в Chromium: автономный `sandbox="allow-scripts"` iframe с встроенными локальными копиями CSS, JS и спрайта (без `allow-same-origin`). Проверены экраны 320×480, 390×844, 667×375 и 1440×900, создание плиток, управление, бургер-меню, поглаживание и отрисовка персонажа.
- Проверено восстановление тестового облачного сохранения через mock `SuperCubePlatform`: поле, 256 очков, рекорд 512.
- Все относительные пути ресурсов проверены по структуре проекта, JS-модули проверены на синтаксис.
- Ограничение: прямое открытие игрового URL по HTTP в тестовом Chromium блокировалось окружением (`ERR_BLOCKED_BY_ADMINISTRATOR`); реальный сервер SUPER CUBE не тестировался.

## v2.6 — Player-data preloader

The initial HTML includes a full-screen loading overlay and an inert game container. The overlay waits for player authentication and cloud-save restoration and stays visible for at least 1,000 ms. The completed bar is shown for at least 300 ms. Stages are connection (10), player data (30), saved progress (65), and ready (100); these represent initialization stages, not downloaded-byte percentages.

An original inline pixel-style SVG cat walks along the progress bar using alternating leg animations. No external images, libraries or network assets are required. Reduced-motion preferences disable the walk and progress transitions. Labels follow the platform RU/EN setting while loading.

Embedded startup waits up to 1,500 ms for late SDK injection. Missing SDK, guest mode, or rejected SDK requests release the overlay after initialization settles; the platform SDK itself enforces its request timeouts. Existing cloud retry behavior continues after startup. Game keyboard/swipe controls remain locked while the overlay is active. Later background synchronization does not reopen it.

Validation: JavaScript syntax, the existing localization regression suite, and deterministic startup tests passed for the minimum duration, slow loading, late/missing SDK, error cleanup, stage monotonicity and localization. Browser visual verification was unavailable because the browser tool blocked local-file navigation.