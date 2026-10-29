(function (M) {
  "use strict";
  // Sokoban rules including bone-to-pit filling; no DOM, storage, audio or timers.
  const directions = Object.freeze({ U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] });
  function parse(rows) {
    const w = rows[0].length, h = rows.length;
    const walls = new Set(), goals = new Set(), boxes = new Set(), bones = new Set(), pits = new Set();
    let player = 0;
    rows.forEach((line, y) => {
      for (let x = 0; x < w; x++) {
        const tile = line[x], key = y * w + x;
        if (tile === "#") walls.add(key);
        if (".+*".includes(tile)) goals.add(key);
        if ("$*".includes(tile)) boxes.add(key);
        if (tile === "b") bones.add(key);
        if (tile === "p") pits.add(key);
        if ("@+".includes(tile)) player = key;
      }
    });
    return { w, h, walls, goals, boxes, bones, pits, filledPits: new Set(), player, moves: 0, pushes: 0, history: [] };
  }
  function position(state, key) { return { x: key % state.w, y: Math.floor(key / state.w) }; }
  function neighbor(state, key, delta) {
    const p = position(state, key), x = p.x + delta[0], y = p.y + delta[1];
    return x < 0 || y < 0 || x >= state.w || y >= state.h ? -1 : y * state.w + x;
  }
  function isSolved(state) {
    return state.pits.size === 0 && state.bones.size === 0 && [...state.goals].every((key) => state.boxes.has(key));
  }
  function move(state, direction) {
    if (!state || !directions[direction]) return null;
    const delta = directions[direction], from = state.player, to = neighbor(state, from, delta);
    if (to < 0 || state.walls.has(to) || state.pits.has(to)) return { blocked: true, wall: true };
    let boxFrom = null, boxTo = null, boneFrom = null, boneTo = null, boneBuried = false;
    if (state.boxes.has(to)) {
      const after = neighbor(state, to, delta);
      if (after < 0 || state.walls.has(after) || state.boxes.has(after) || state.bones.has(after) || state.pits.has(after)) return { blocked: true };
      boxFrom = to; boxTo = after;
    } else if (state.bones.has(to)) {
      const after = neighbor(state, to, delta);
      if (after < 0 || state.walls.has(after) || state.boxes.has(after) || state.bones.has(after)) return { blocked: true };
      boneFrom = to;
      if (state.pits.has(after)) boneBuried = true;
      else boneTo = after;
    }
    state.history.push({ player: state.player, boxes: [...state.boxes], bones: [...state.bones], pits: [...state.pits], filledPits: [...state.filledPits], moves: state.moves, pushes: state.pushes });
    if (state.history.length > 350) state.history.shift();
    state.player = to; state.moves++;
    if (boxFrom !== null) { state.boxes.delete(boxFrom); state.boxes.add(boxTo); state.pushes++; }
    if (boneFrom !== null) {
      state.bones.delete(boneFrom);
      if (boneBuried) { state.pits.delete(neighbor(state, boneFrom, delta)); state.filledPits.add(neighbor(state, boneFrom, delta)); }
      else state.bones.add(boneTo);
      state.pushes++;
    }
    return { from, to, boxFrom, boxTo, boneFrom, boneTo, boneBuried, solved: isSolved(state) };
  }
  function undo(state) {
    if (!state || !state.history.length) return null;
    const entry = state.history.pop(), from = state.player;
    Object.assign(state, entry, { boxes: new Set(entry.boxes), bones: new Set(entry.bones), pits: new Set(entry.pits), filledPits: new Set(entry.filledPits) });
    return { from, to: state.player, boxFrom: null, boxTo: null, boneFrom: null, boneTo: null };
  }
  M.engine = Object.freeze({ parse, position, move, undo, isSolved, directions });
})(window.Mochi);