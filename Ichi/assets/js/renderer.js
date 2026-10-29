(function (M) {
  "use strict";
  const { T, block, drawDog, drawSittingDog, crate, floorTile, wallTile, bushTile, drawDecoration, drawGoal, drawPit, drawFilledPit, drawBone } =
    M.sprites;
  function createRenderer({ canvas, hero, getScreen }) {
    const ctx = canvas.getContext("2d", { alpha: false }),
      hctx = hero.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    hctx.imageSmoothingEnabled = false;
    let state = null,
      anim = null,
      particles = [],
      goalEffects = [],
      shake = 0,
      facing = "L",
      started = false;
    const xy = (key) => M.engine.position(state, key);
    function directionBetween(from, to) {
      const delta = to - from;
      if (delta === 1) return "R";
      if (delta === -1) return "L";
      return facing;
    }
    function drawBoard(t) {
      if (!state) return;
      const c = ctx,
        w = state.w,
        h = state.h;
      c.clearRect(0, 0, w * T, h * T);
      const dx = shake ? (Math.random() - 0.5) * shake : 0;
      shake = Math.max(0, shake - 0.35);
      c.save();
      c.translate(Math.round(dx), 0);
      for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
          const k = j * w + i,
            x = i * T,
            y = j * T;
          if (state.walls.has(k)) {
            const isOuterEdge = i === 0 || j === 0 || i === w - 1 || j === h - 1;
            if (isOuterEdge) wallTile(c, x, y, i, j, t);
            else {
              floorTile(c, x, y, i * 13 + j * 31);
              bushTile(c, x, y, i, j, t);
            }
          }
          else {
            floorTile(c, x, y, i * 13 + j * 31);
            if (state.goals.has(k)) drawGoal(c, x, y, t);
            else if (state.pits.has(k)) drawPit(c, x, y);
            else if (state.filledPits.has(k)) drawFilledPit(c, x, y);
            else drawDecoration(c, x, y, i, j, t);
          }
        }
      }
      const active = anim && t - anim.start < anim.duration;
      goalEffects = goalEffects.filter((effect) => t - effect.start < effect.duration && state.boxes.has(effect.key));
      for (const effect of goalEffects) {
        const elapsed = t - effect.start;
        if (elapsed < 0) continue;
        const progress = Math.max(0, Math.min(1, elapsed / effect.duration));
        const eased = 1 - Math.pow(1 - progress, 2);
        const p = xy(effect.key);
        const centerX = p.x * T + 16;
        const bottomY = p.y * T + 30;
        const width = 12 + eased * 22;
        const height = 4 + eased * 8;
        const alpha = 1 - progress;
        c.fillStyle = "rgba(255, 255, 255, " + alpha.toFixed(3) + ")";
        c.fillRect(Math.round(centerX - width / 2), Math.round(bottomY - height), Math.round(width), 2);
        c.fillRect(Math.round(centerX - width / 2), Math.round(bottomY), Math.round(width), 2);
        c.fillRect(Math.round(centerX - width / 2), Math.round(bottomY - height), 2, Math.round(height));
        c.fillRect(Math.round(centerX + width / 2 - 2), Math.round(bottomY - height), 2, Math.round(height));
      }
      let boxFrom = active ? anim.boxFrom : null,
        boxTo = active ? anim.boxTo : null;
      for (const b of state.boxes) {
        let p = xy(b),
          x = p.x * T,
          y = p.y * T,
          scale = 1;
        if (b === boxTo && boxFrom !== null) {
          const from = xy(boxFrom),
            frac = Math.max(0, Math.min(1, (t - anim.start) / anim.duration));
          const e = 1 - Math.pow(1 - frac, 3);
          x = (from.x + (p.x - from.x) * e) * T;
          y = (from.y + (p.y - from.y) * e) * T;
          scale = 1 + Math.sin(frac * Math.PI) * 0.08;
        }
        const offset = (1 - scale) * 16;
        crate(c, x + offset, y + offset, scale, t);
      }
      const boneFrom = active ? anim.boneFrom : null;
      const boneTo = active ? anim.boneTo : null;
      function drawMovingBone(fromKey, toKey, frac) {
        const from = xy(fromKey);
        const playerFrom = xy(anim.from);
        const playerTo = xy(anim.to);
        const to = toKey === null
          ? { x: from.x + playerTo.x - playerFrom.x, y: from.y + playerTo.y - playerFrom.y }
          : xy(toKey);
        const eased = 1 - Math.pow(1 - frac, 3);
        drawBone(c, (from.x + (to.x - from.x) * eased) * T, (from.y + (to.y - from.y) * eased) * T);
      }
      for (const bone of state.bones) {
        if (boneFrom !== null && bone === boneTo) {
          const frac = Math.max(0, Math.min(1, (t - anim.start) / anim.duration));
          drawMovingBone(boneFrom, boneTo, frac);
        } else {
          const p = xy(bone);
          drawBone(c, p.x * T, p.y * T);
        }
      }
      if (active && anim.boneBuried && boneFrom !== null) {
        const frac = Math.max(0, Math.min(1, (t - anim.start) / anim.duration));
        drawMovingBone(boneFrom, null, frac);
      }
      let pp = xy(state.player),
        px = pp.x * T,
        py = pp.y * T,
        bounce = 0;
      if (active) {
        const from = xy(anim.from),
          f = Math.max(0, Math.min(1, (t - anim.start) / anim.duration)),
          e = 1 - Math.pow(1 - f, 3);
        px = (from.x + (pp.x - from.x) * e) * T;
        py = (from.y + (pp.y - from.y) * e) * T;
        bounce = Math.sin(f * Math.PI) * 3;
      }
      const face = active ? anim.face : facing;
      block(c, px + 8, py + 27, 18, 3, "#aa8c8066");
      const walkFrame = active ? Math.floor((t - anim.start) / 42) % 4 : null;
      drawDog(c, px + 1, py - bounce + 1, 1, t, face, walkFrame);
      for (const p of particles) {
        p.life -= p.type === "soil" ? 0.035 : 0.055;
        if (p.type === "soil") {
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.025;
          if (p.life > 0) {
            c.globalAlpha = p.life;
            block(c, p.x, p.y, p.size, p.size, p.color);
            c.globalAlpha = 1;
          }
        } else if (p.life > 0) {
          c.globalAlpha = p.life;
          block(c, p.x - 4 - p.life * 3, p.y - 6, 4, 4, "#fff8df");
          block(c, p.x + 9 + p.life * 2, p.y + 4, 3, 3, "#8cb7a7");
          c.globalAlpha = 1;
        }
      }
      particles = particles.filter((p) => p.life > 0);
      c.restore();
    }
    function drawHero(t) {
      const c = hctx;
      c.clearRect(0, 0, 500, 440);
      block(c, 20, 408, 460, 15, "#ddbd8c");
      block(c, 64, 396, 372, 12, "#e6c997");
      crate(c, 0, 319, 3.2, t, false);
      block(c, 20, 96, 12, 12, "#d58d73");
      block(c, 32, 86, 10, 10, "#d58d73");
      block(c, 462, 101, 12, 12, "#d58d73");
      block(c, 458, 112, 8, 8, "#d58d73");
      block(c, 476, 264, 11, 11, "#b2b38f");
      drawSittingDog(c, 100, 25, 400, t);
    }
    function frame(t) {
      if (getScreen() === "game") drawBoard(t);
      if (getScreen() === "menu") drawHero(t);
      requestAnimationFrame(frame);
    }
    // Fit the entire board inside remaining viewport space in both orientations.
    const boardArea = document.querySelector(".board-area"),
      boardFrame = document.querySelector(".board-frame");
    function fitBoard() {
      if (getScreen() !== "game" || !state) return;
      const areaW = boardArea.clientWidth,
        areaH = boardArea.clientHeight;
      if (areaW < 25 || areaH < 25) return;
      const chrome = 22,
        ratio = state.w / state.h;
      const boardW = Math.max(
        16,
        Math.min(areaW - chrome, (areaH - chrome) * ratio),
      );
      const frameW = Math.floor(boardW + 18);
      boardFrame.style.width = Math.min(areaW, frameW) + "px";
    }
    if (window.ResizeObserver) {
      const sizeWatch = new ResizeObserver(() =>
        requestAnimationFrame(fitBoard),
      );
      sizeWatch.observe(boardArea);
    }
    window.addEventListener("resize", () => requestAnimationFrame(fitBoard));
    window.visualViewport?.addEventListener("resize", () =>
      requestAnimationFrame(fitBoard),
    );
    return Object.freeze({
      start() {
        if (!started) {
          started = true;
          requestAnimationFrame(frame);
        }
      },
      reset(nextState) {
        state = nextState;
        facing = "L";
        anim = null;
        particles = [];
        goalEffects = [];
        shake = 0;
        canvas.width = state.w * T;
        canvas.height = state.h * T;
        ctx.imageSmoothingEnabled = false;
        requestAnimationFrame(fitBoard);
      },
      move(result, start) {
        const pushed = result.boxFrom !== null || result.boneFrom !== null;
        facing = directionBetween(result.from, result.to);
        anim = { ...result, face: facing, start, duration: pushed ? 170 : 132 };
        if (result.boxFrom !== null) {
          goalEffects = goalEffects.filter((effect) => effect.key !== result.boxFrom);
          if (state.goals.has(result.boxTo)) {
            goalEffects.push({ key: result.boxTo, start: start + anim.duration, duration: 360 });
          }
        }
        if (pushed) {
          const targetKey = result.boxTo ?? result.boneTo ?? (result.boneBuried ? result.boneFrom + result.to - result.from : null);
          if (targetKey !== null) {
            const p = xy(targetKey);
            particles.push({ x: p.x * T + 16, y: p.y * T + 16, life: 1, type: "dust" });
          }
        }
        if (result.boneBuried) {
          const pitKey = result.boneFrom + result.to - result.from;
          const pit = xy(pitKey);
          const soilColors = ["#d4ad7e", "#bd9368", "#e0bd91", "#a98769"];
          for (let i = 0; i < 20; i++) {
            particles.push({
              x: pit.x * T + 16,
              y: pit.y * T + 27,
              vx: ((i % 5) - 2) * 0.28,
              vy: -1.4 - (i % 4) * 0.3,
              size: i % 3 === 0 ? 4 : 3,
              color: soilColors[i % soilColors.length],
              life: 1,
              type: "soil",
            });
          }
        }
      },
      undo(result) {
        facing = directionBetween(result.from, result.to);
        anim = { ...result, face: facing, start: performance.now(), duration: 118 };
      },
      bump() {
        shake = 4;
      },
    });
  }
  M.renderer = Object.freeze({ create: createRenderer });
})(window.Mochi);




