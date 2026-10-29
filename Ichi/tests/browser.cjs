// npm install --no-save playwright; npx playwright install chromium
// node tests/browser.cjs
// Optional: BROWSER_EXECUTABLE and TEST_OUTPUT; runtime game has no npm dependencies.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { pathToFileURL } = require("node:url");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const output = path.resolve(
  process.env.TEST_OUTPUT || path.join(root, "test-results"),
);
fs.mkdirSync(output, { recursive: true });
const scenarios = new Map();
let nextScenario = 1;
const results = [],
  errors = [],
  warnings = [],
  badResponses = [],
  failedRequests = [];

// The test host simulates the documented backend contract over postMessage.
// This fixture is NEVER loaded by the packaged index.html.
function hostMarkup(config, id) {
  return `<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style></head><body>
  <script>
  window.fixture = Object.assign({ authenticated: true, remote: null, format: 'object', log: [], failLoad: 0, failSave: 0, failFavorite: false, favorite: false, activeSaves: 0, maxSaves: 0, loadDelay: 0, saveDelay: 0, sourceOrigins: [] }, ${JSON.stringify(config)});
  window.addEventListener('message', async event => {
    if (!event.data || event.data.channel !== 'mochi-test-request') return;
    const f = window.fixture, { method, args, id } = event.data;
    f.log.push({ method, args }); f.sourceOrigins.push(event.origin);
    let result, error;
    try {
      if (method === 'getUser') result = { authenticated: f.authenticated, playerId: 'test-player' };
      else if (method === 'loadSave') {
        if (f.loadDelay) await new Promise(resolve => setTimeout(resolve, f.loadDelay));
        if (f.failLoad > 0) { f.failLoad--; throw Error('Expected test load failure'); }
        const save = f.remote;
        if (f.format === 'invalid') result = { unexpected: true };
        else if (f.format === 'string') result = { save: JSON.stringify(save) };
        else if (f.format === 'nested') result = { data: { save } };
        else if (f.format === 'deep') result = { data: { data: { save } } };
        else if (f.format === 'direct') result = save;
        else if (f.format === 'dataDirect') result = { data: save };
        else if (f.format === 'wrappedString') result = JSON.stringify({ save: { data: save } });
        else result = { save };
      } else if (method === 'save') {
        f.activeSaves++; f.maxSaves = Math.max(f.maxSaves, f.activeSaves);
        if (f.saveDelay) await new Promise(resolve => setTimeout(resolve, f.saveDelay));
        f.activeSaves--;
        if (f.failSave > 0) { f.failSave--; throw Error('Expected test save failure'); }
        f.remote = args[0]; result = { ok: true };
      } else if (method === 'favorite') {
        if (f.failFavorite) throw Error('Expected test favorite failure');
        f.favorite = !f.favorite; result = { favorite: f.favorite };
      } else if (method === 'track') result = { ok: true };
      else throw Error('Unsupported fixture method');
    } catch (failure) { error = failure.message; }
    event.source.postMessage({ channel: 'mochi-test-response', id, result, error }, '*');
  });
  </script><iframe title="Mochi test" sandbox="allow-scripts" src="/games/mochi/index.html?fixture=${id}"></iframe></body></html>`;
}

function sdkMarkup(delay) {
  return `<script>
  (() => {
    function inject() {
      let serial = 0; const requests = new Map();
      window.addEventListener('message', event => {
        const data = event.data;
        if (!data || data.channel !== 'mochi-test-response') return;
        const request = requests.get(data.id); if (!request) return;
        requests.delete(data.id);
        data.error ? request.reject(Error(data.error)) : request.resolve(data.result);
      });
      const request = (method, args) => new Promise((resolve, reject) => {
        const id = ++serial; requests.set(id, { resolve, reject });
        window.parent.postMessage({ channel: 'mochi-test-request', method, args, id }, '*');
      });
      window.SuperCubePlatform = Object.fromEntries(['getUser', 'loadSave', 'save', 'favorite', 'track'].map(method => [method, (...args) => request(method, args)]));
    }
    ${delay ? `setTimeout(inject, ${Number(delay)});` : "inject();"}
  })();
  </script>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  if (url.pathname === "/__test__/host") {
    const id = url.searchParams.get("id");
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(hostMarkup(scenarios.get(id), id));
    return;
  }
  const prefix = "/games/mochi/";
  if (!url.pathname.startsWith(prefix)) {
    response.writeHead(404);
    response.end();
    return;
  }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length));
  const file = path.resolve(root, relative);
  if (
    !file.startsWith(root + path.sep) ||
    !fs.existsSync(file) ||
    !fs.statSync(file).isFile()
  ) {
    response.writeHead(404);
    response.end();
    return;
  }
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
  };
  response.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  let body = fs.readFileSync(file);
  if (relative === "index.html" && url.searchParams.has("fixture")) {
    const config = scenarios.get(url.searchParams.get("fixture"));
    if (!config.noSDK)
      body = body
        .toString()
        .replace("<head>", "<head>" + sdkMarkup(config.sdkDelay || 0));
  }
  response.end(body);
});

async function waitFor(check, message, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 70));
  }
  throw Error("Timeout: " + message);
}
function record(name) {
  results.push(name);
  console.log("PASS:", name);
}
function observe(page) {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
    if (message.type() === "warning") warnings.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400)
      badResponses.push(response.url() + ": " + response.status());
  });
  page.on("requestfailed", (request) =>
    failedRequests.push(request.url() + ": " + request.failure()?.errorText),
  );
}

// A shortest solution for level 1 keeps the real keyboard test quick.
function firstSolution() {
  const context = vm.createContext({ window: {} });
  for (const name of ["namespace", "levels", "engine"])
    vm.runInContext(
      fs.readFileSync(path.join(root, "assets/js", name + ".js"), "utf8"),
      context,
    );
  const { engine, levels } = context.window.Mochi;
  const start = engine.parse(levels.maps[0]),
    queue = [[start, ""]],
    seen = new Set();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const [state, route] = queue[cursor];
    if (engine.isSolved(state)) return route;
    for (const direction of Object.keys(engine.directions)) {
      const copy = { ...state, boxes: new Set(state.boxes), history: [] };
      const move = engine.move(copy, direction);
      if (move.blocked) continue;
      const key =
        copy.player + ":" + [...copy.boxes].sort((a, b) => a - b).join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([copy, route + direction]);
    }
  }
  throw Error("Level 1 cannot be solved");
}

(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  const version = browser.version();
  const context = await browser.newContext();
  async function scenario(
    config = {},
    size = { width: 390, height: 844 },
    browserContext = context,
  ) {
    const id = String(nextScenario++);
    scenarios.set(id, config);
    const page = await browserContext.newPage();
    observe(page);
    await page.setViewportSize(size);
    await page.goto(origin + "/__test__/host?id=" + id);
    const frame = page.frames().find((frame) => frame !== page.mainFrame());
    await frame.waitForSelector(".level-tile");
    return { page, frame };
  }
  async function assertLayout(frame, selector) {
    const info = await frame.evaluate((selector) => {
      const elements = [...document.querySelectorAll(selector)].filter(
        (element) => element.getClientRects().length > 0,
      );
      return {
        width: innerWidth,
        height: innerHeight,
        sw: document.documentElement.scrollWidth,
        sh: document.documentElement.scrollHeight,
        boxes: elements.map((element) => {
          const b = element.getBoundingClientRect();
          return {
            x: b.x,
            y: b.y,
            right: b.right,
            bottom: b.bottom,
            width: b.width,
            height: b.height,
          };
        }),
      };
    }, selector);
    assert(
      info.sw <= info.width + 1 && info.sh <= info.height + 1,
      "Page must not scroll: " + JSON.stringify(info),
    );
    assert(info.boxes.length > 0);
    for (const box of info.boxes)
      assert(
        box.x >= -1 &&
          box.y >= -1 &&
          box.right <= info.width + 1 &&
          box.bottom <= info.height + 1 &&
          box.width > 10 &&
          box.height > 10,
        JSON.stringify(box),
      );
  }
  try {
    for (const [width, height] of [
      [320, 480],
      [320, 568],
      [390, 844],
      [667, 375],
      [1440, 900],
    ]) {
      const { page, frame } = await scenario(
        { noSDK: true },
        { width, height },
      );
      assert.equal(await frame.locator(".level-tile").count(), 25);
      await assertLayout(frame, ".level-tile, #playBtn, #burgerBtn");
      await page.screenshot({
        path: path.join(output, `menu-${width}x${height}.png`),
      });
      await frame.locator('[data-level="24"]').click();
      await frame.waitForSelector("#game:not(.hidden)");
      await assertLayout(frame, "#board, #burgerBtn, .game-meta");
      await page.screenshot({
        path: path.join(output, `game-${width}x${height}.png`),
      });
      await frame.locator("#burgerBtn").click();
      await frame.locator("#favoriteBtn").click();
      assert.match(
        await frame.locator("#toast").textContent(),
        /платформе SUPER CUBE/,
      );
      await frame.locator("#helpBtn").click();
      await frame.locator("#gotIt").click();
      assert(
        await frame.evaluate(() => {
          try {
            localStorage.getItem("test");
            return false;
          } catch (_) {
            return true;
          }
        }),
      );
      await page.close();
      record(`Opaque sandbox, no SDK, layout and menu ${width}x${height}`);
    }

    const saved = {
      version: 1,
      completed: [0, 1, 2, 4],
      best: { 0: 20, 1: 30 },
      last: 7,
      updatedAt: 0,
    };
    for (const format of [
      "object",
      "string",
      "nested",
      "deep",
      "direct",
      "dataDirect",
      "wrappedString",
    ]) {
      const { page, frame } = await scenario({ remote: saved, format });
      await waitFor(
        async () => (await frame.locator(".level-tile.complete").count()) === 4,
        format,
      );
      assert.equal(await frame.locator("#meterText").textContent(), "4 из 25");
      assert.match(await frame.locator("#levelsDesc").textContent(), /4 из 25/);
      assert.equal(
        await frame.locator(".level-tile.active").getAttribute("data-level"),
        "7",
      );
      assert(
        await page.evaluate(() =>
          fixture.sourceOrigins.every((origin) => origin === "null"),
        ),
      );
      await frame.locator("#playBtn").click();
      assert.match(await frame.locator("#gameKicker").textContent(), /08/);
      await page.close();
      record(
        `Cloud restoration (${format}), old timestamp, selected level, postMessage origin=null`,
      );
    }

    {
      const { page, frame } = await scenario({ remote: null });
      await waitFor(
        async () =>
          (await frame.locator("#levelsDesc").textContent()).includes(
            "загружено",
          ),
        "empty save",
      );
      assert.equal(
        await page.evaluate(
          () => fixture.log.filter((x) => x.method === "save").length,
        ),
        0,
      );
      for (let level = 0; level < 25; level++) {
        await frame.locator(`[data-level="${level}"]`).click();
        await assertLayout(frame, "#board");
        await frame.locator("#logo").click();
      }
      await frame.locator('[data-level="0"]').click();
      await page.keyboard.press("ArrowUp");
      await waitFor(
        async () => (await frame.locator("#moveCounter").textContent()) === "1",
        "keyboard move",
      );
      await page.keyboard.press("z");
      assert.equal(await frame.locator("#moveCounter").textContent(), "0");
      await page.keyboard.press("r");
      const keys = {
        U: "ArrowUp",
        D: "ArrowDown",
        L: "ArrowLeft",
        R: "ArrowRight",
      };
      for (const direction of firstSolution()) {
        await new Promise((resolve) => setTimeout(resolve, 125));
        await page.keyboard.press(keys[direction]);
      }
      await frame.waitForSelector("#nextLevel");
      await waitFor(
        () => page.evaluate(() => fixture.remote?.completed.includes(0)),
        "victory saved",
      );
      assert.equal(
        await page.evaluate(
          () =>
            fixture.log.filter(
              (x) => x.method === "track" && x.args[0] === "level_complete",
            ).length,
        ),
        1,
      );
      assert(
        await page.evaluate(() =>
          fixture.log.some(
            (x) => x.method === "track" && x.args[0] === "level_start",
          ),
        ),
      );
      await page.evaluate(() => {
        document.querySelector("iframe").src += "&reload=1";
      });
      await waitFor(
        async () =>
          (await page
            .frames()
            .find((f) => f !== page.mainFrame())
            .locator(".level-tile.complete")
            .count()) === 1,
        "new instance restoration",
      );
      await page.close();
      record(
        "All 25 boards fit; keyboard, undo, restart, real level 1 win, events, cloud save and fresh iframe restoration",
      );
    }

    {
      const { page, frame } = await scenario({
        remote: saved,
        sdkDelay: 700,
        authenticated: false,
      });
      await frame.locator('[data-level="0"]').click();
      await waitFor(
        () =>
          page.evaluate(() => fixture.log.some((x) => x.method === "getUser")),
        "late SDK",
      );
      assert.equal(
        await page.evaluate(
          () => fixture.log.filter((x) => x.method === "loadSave").length,
        ),
        0,
      );
      await page.evaluate(() => {
        fixture.authenticated = true;
      });
      await waitFor(
        async () => (await frame.locator(".level-tile.complete").count()) === 4,
        "late login",
      );
      assert.match(await frame.locator("#gameKicker").textContent(), /01/);
      await waitFor(
        () =>
          page.evaluate(() => fixture.log.some((x) => x.method === "track")),
        "buffered event",
      );
      await frame.locator("#burgerBtn").click();
      await frame.locator("#favoriteBtn").click();
      await waitFor(
        async () =>
          (await frame.locator("#favoriteBtn").getAttribute("aria-pressed")) ===
          "true",
        "favorite added",
      );
      await frame.locator("#favoriteBtn").click();
      await waitFor(
        async () =>
          (await frame.locator("#favoriteBtn").getAttribute("aria-pressed")) ===
          "false",
        "favorite removed",
      );
      await page.evaluate(() => {
        fixture.failFavorite = true;
      });
      await frame.locator("#favoriteBtn").click();
      await waitFor(
        async () =>
          (await frame.locator("#toast").textContent()).includes("Не удалось"),
        "favorite failure",
      );
      assert.equal(
        await frame.locator("#favoriteBtn").getAttribute("aria-pressed"),
        "false",
      );
      await page.evaluate(() => {
        fixture.remote.completed.push(20);
      });
      const reads = await page.evaluate(
        () => fixture.log.filter((x) => x.method === "loadSave").length,
      );
      await frame.locator("#syncBtn").click();
      await waitFor(
        async () => (await frame.locator(".level-tile.complete").count()) === 5,
        "manual refresh",
      );
      assert(
        await page.evaluate(
          (reads) =>
            fixture.log.filter((x) => x.method === "loadSave").length > reads,
          reads,
        ),
      );
      await page.close();
      record(
        "Late SDK/login, buffered events, active-level preservation, favorites success/failure and manual cloud refresh",
      );
    }

    for (const failure of ["load", "format"]) {
      const { page, frame } = await scenario({
        remote: saved,
        failLoad: failure === "load" ? 99 : 0,
        format: failure === "format" ? "invalid" : "object",
      });
      await waitFor(
        async () =>
          (await frame.locator("#levelsDesc").textContent()).includes(
            "Не удалось",
          ),
        "read failure",
      );
      await frame.locator('[data-level="3"]').click();
      assert.equal(
        await page.evaluate(
          () => fixture.log.filter((x) => x.method === "save").length,
        ),
        0,
      );
      await page.evaluate(() => {
        fixture.failLoad = 0;
        fixture.format = "object";
      });
      await frame.locator("#burgerBtn").click();
      await frame.locator("#syncBtn").click();
      await waitFor(
        async () => (await frame.locator(".level-tile.complete").count()) === 4,
        "read recovery",
      );
      await page.close();
      record(
        `No cloud writes after ${failure} failure; manual retry restores progress`,
      );
    }

    {
      const { page, frame } = await scenario({
        remote: saved,
        failSave: 1,
        saveDelay: 400,
      });
      await waitFor(
        async () => (await frame.locator(".level-tile.complete").count()) === 4,
        "save queue load",
      );
      await frame.locator('[data-level="10"]').click();
      await waitFor(
        () => page.evaluate(() => fixture.log.some((x) => x.method === "save")),
        "first save started",
      );
      await frame.locator("#logo").click();
      await frame.locator('[data-level="12"]').click();
      await waitFor(
        () =>
          page.evaluate(
            () =>
              fixture.remote?.last === 12 &&
              fixture.log.filter((x) => x.method === "save").length >= 2,
          ),
        "save retry latest state",
      );
      assert.equal(await page.evaluate(() => fixture.maxSaves), 1);
      assert.equal(
        await page.evaluate(() => fixture.remote.completed.length),
        4,
      );
      await page.close();
      record(
        "Save failure retry, serialized queue and latest selected level retained",
      );
    }

    {
      const page = await context.newPage();
      observe(page);
      await page.goto(origin + "/games/mochi/index.html");
      await page.evaluate(() =>
        localStorage.setItem(
          "mochi-sokoban-v1",
          JSON.stringify({ completed: [0, 4, 9], best: { 0: 22 }, last: 9 }),
        ),
      );
      await page.reload();
      await page.waitForSelector(".level-tile.complete");
      assert.equal(await page.locator(".level-tile.complete").count(), 3);
      await page.locator("#playBtn").click();
      assert.match(await page.locator("#gameKicker").textContent(), /10/);
      await page.close();
      record("Standalone HTTP restores existing v1 localStorage saves");
      const filePage = await context.newPage();
      observe(filePage);
      await filePage.goto(pathToFileURL(path.join(root, "index.html")).href);
      await filePage.waitForSelector(".level-tile");
      assert.equal(await filePage.locator(".level-tile").count(), 25);
      await filePage.locator("#playBtn").click();
      await filePage.waitForSelector("#game:not(.hidden)");
      await filePage.close();
      record("Direct file:// launch and ordered classic-script loading");
    }

    {
      const touchContext = await browser.newContext({ hasTouch: true });
      const { page, frame } = await scenario(
        { noSDK: true },
        { width: 390, height: 844 },
        touchContext,
      );
      await frame.locator('[data-level="0"]').click();
      const board = await frame.locator("#board").boundingBox();
      const point = (x, y) => ({
        x: board.x + (board.width * (x + 0.5)) / 7,
        y: board.y + (board.height * (y + 0.5)) / 7,
      });
      const adjacent = point(4, 5);
      await page.touchscreen.tap(adjacent.x, adjacent.y);
      await waitFor(
        async () => (await frame.locator("#moveCounter").textContent()) === "1",
        "touch tap",
      );
      await page.keyboard.press("z");
      await new Promise((resolve) => setTimeout(resolve, 130));
      const cdp = await touchContext.newCDPSession(page);
      const start = point(3, 5);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [start],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: start.x, y: start.y - 50 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await waitFor(
        async () => (await frame.locator("#pushCounter").textContent()) === "1",
        "touch swipe",
      );
      await frame.locator("#burgerBtn").click();
      await frame.locator("#soundBtn").click();
      assert.match(await frame.locator("#soundBtn").textContent(), /включены/);
      await frame.locator("#soundBtn").click();
      await frame.locator("#undoBtn").click();
      assert.equal(await frame.locator("#moveCounter").textContent(), "0");
      await frame.locator("#burgerBtn").click();
      await frame.locator('[data-dir="R"]').click();
      await waitFor(
        async () => (await frame.locator("#moveCounter").textContent()) === "1",
        "direction pad",
      );
      await touchContext.close();
      record(
        "Real touch tap/swipe, drawer direction pad, undo and Web Audio toggle",
      );
    }

    assert.deepEqual(errors, [], "Unexpected browser console/page errors");
    assert.deepEqual(badResponses, [], "Broken paths");
    // Navigation during asynchronous SDK requests can abort a resource; failed script/style requests are never acceptable.
    assert.deepEqual(
      failedRequests.filter((x) => /\.(?:js|css)(?:[?:]|$)/.test(x)),
      [],
    );
    record("No JavaScript/console errors or missing resources");
  } finally {
    fs.writeFileSync(
      path.join(output, "browser-results.json"),
      JSON.stringify(
        {
          browser: version,
          results,
          errors,
          warnings,
          badResponses,
          failedRequests,
        },
        null,
        2,
      ),
    );
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  server.close();
});
