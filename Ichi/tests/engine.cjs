// Run with node tests/engine.cjs. No dependencies.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const context = vm.createContext({ window: {} });
for (const name of ["namespace", "levels", "engine", "progress"]) {
  vm.runInContext(
    fs.readFileSync(path.join(root, "assets/js", name + ".js"), "utf8"),
    context,
  );
}
const { levels, engine, progress } = context.window.Mochi;
const source = JSON.parse(
  fs.readFileSync(path.join(root, "source/levels.json"), "utf8"),
);
assert.equal(levels.maps.length, 25);
assert.equal(levels.names.length, 25);
for (let index = 0; index < levels.maps.length; index++) {
  const rows = levels.maps[index];
  assert.equal(JSON.stringify(rows), JSON.stringify(source[index].rows));
  assert(rows.every((row) => row.length === rows[0].length));
  assert.equal((rows.join("").match(/[@+]/g) || []).length, 1);
  const state = engine.parse(rows);
  assert.equal(state.boxes.size, state.goals.size);
  // Supplied solutions exercise the original boards, box pushes and undo.
  for (const direction of source[index].solution) {
    const before = JSON.stringify({
      ...state,
      walls: [...state.walls],
      goals: [...state.goals],
      boxes: [...state.boxes],
    });
    const result = engine.move(state, direction);
    if (!result.blocked) {
      engine.undo(state);
      assert.equal(
        JSON.stringify({
          ...state,
          walls: [...state.walls],
          goals: [...state.goals],
          boxes: [...state.boxes],
        }),
        before,
      );
      engine.move(state, direction);
    }
  }
  assert(engine.isSolved(state), `Level ${index + 1} solution must still work`);
}
const merged = progress.merge(
  { completed: [0, 2], best: { 0: 40, 2: 20 }, last: 2, updatedAt: 100 },
  { completed: [0, 1], best: { 0: 30, 1: 50 }, last: 5, updatedAt: 200 },
);
assert.equal(
  JSON.stringify(merged),
  JSON.stringify({
    version: 1,
    completed: [0, 1, 2],
    best: { 0: 30, 1: 50, 2: 20 },
    last: 5,
    updatedAt: 200,
  }),
);
assert.equal(
  progress.merge(progress.empty(), { completed: [1], last: 6 }).last,
  6,
);
const guest = progress.createStore();
assert.equal(guest.available, false);
guest.complete(0, 20);
guest.write();
assert.equal(guest.value.completed[0], 0);
console.log(
  "PASS: 25 unchanged maps, 25 supplied solutions, undo, progress merge and unavailable storage.",
);
