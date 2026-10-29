(function (M) {
  "use strict";
  const HERO_OUTLINE = [0x34, 0x37, 0x43];
  const T = 32,
    COL = {
      ink: "#393645",
      floor: "#e7d4bf",
      floorAlt: "#e9d9c6",
      wall: "#b9917b",
      wallHi: "#dbb198",
      wallShadow: "#867467",
      goal: "#a7c6aa",
      goalEdge: "#688d80",
      orange: "#eaa35e",
      orangeHi: "#f8c67d",
      fur: "#f5a254",
      furHi: "#ffbd70",
      muzzle: "#fff0db",
      eyes: "#343743",
      blush: "#e78b89",
      boxDark: "#865d50",
      boxLight: "#d4a37a",
    };
  // Consistent raster blocks create a pixel-art aesthetic, no external images/assets.
  function block(c, x, y, w, h, color) {
    c.fillStyle = color;
    c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  const dogSheet = new Image();
  dogSheet.src = "assets/images/ichi-walk.png";
  const heroDogImage = new Image();
  let heroDogSheet = null;
  heroDogImage.onload = () => {
    // Keep the loaded image drawable even if pixel processing is unavailable
    // (for example, when the game is hosted with restrictive canvas policies).
    heroDogSheet = heroDogImage;
    try {
      const inkCanvas = document.createElement("canvas");
      inkCanvas.width = heroDogImage.naturalWidth;
      inkCanvas.height = heroDogImage.naturalHeight;
      const inkContext = inkCanvas.getContext("2d", { willReadFrequently: true });
      if (!inkContext) return;
      inkContext.drawImage(heroDogImage, 0, 0);
      const pixels = inkContext.getImageData(0, 0, inkCanvas.width, inkCanvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const red = pixels.data[i];
        const green = pixels.data[i + 1];
        const blue = pixels.data[i + 2];
        const alpha = pixels.data[i + 3];
        if (alpha > 0 && red < 110 && green < 110 && blue < 125) {
          pixels.data[i] = HERO_OUTLINE[0];
          pixels.data[i + 1] = HERO_OUTLINE[1];
          pixels.data[i + 2] = HERO_OUTLINE[2];
        }
      }
      inkContext.putImageData(pixels, 0, 0);
      heroDogSheet = inkCanvas;
    } catch (error) {
      console.warn("Hero dog outline recolor skipped; using the original sprite.", error);
    }
  };
  heroDogImage.src = "assets/images/ichi-hero-sit-wag-8f.png";
  function drawDog(c, x, y, scale = 1, t = 0, face = "L", walkFrame = 0) {
    if (!dogSheet.complete || !dogSheet.naturalWidth) return;
    const frame = ((Number(walkFrame) || 0) % 4 + 4) % 4;
    const cellW = dogSheet.naturalWidth / 2;
    const cellH = dogSheet.naturalHeight / 2;
    const cropX = 0;
    const cropY = 0;
    const cropW = cellW;
    const cropH = cellH;
    const drawW = 34 * scale;
    const drawH = drawW * cropH / cropW;
    const drawX = x - scale;
    const drawY = y + (32 * scale - drawH) / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    if (face === "R") {
      c.translate(Math.round(drawX + drawW), Math.round(drawY));
      c.scale(-1, 1);
    } else {
      c.translate(Math.round(drawX), Math.round(drawY));
    }
    c.drawImage(
      dogSheet,
      (frame % 2) * cellW + cropX,
      Math.floor(frame / 2) * cellH + cropY,
      cropW,
      cropH,
      0,
      0,
      Math.round(drawW),
      Math.round(drawH),
    );
    c.restore();
  }
  function drawSittingDog(c, x, y, size, t = 0) {
    if (!heroDogSheet) return;
    // Animate within the same sprite row so Ichi stays at a fixed vertical position.
    const frame = Math.floor(t / 125) % 8;
    const cellW = heroDogSheet.width / 4;
    const cellH = heroDogSheet.height / 2;
    c.save();
    c.imageSmoothingEnabled = false;
    c.drawImage(
      heroDogSheet,
      (frame % 4) * cellW,
      Math.floor(frame / 4) * cellH,
      cellW,
      cellH,
      x,
      y,
      size,
      size,
    );
    c.restore();
  }
  function crate(c, x, y, scale = 1, t = 0, stamp = true) {
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(scale, scale);
    const b = (x, y, w, h, color) => block(c, x, y, w, h, color);
    b(3, 25, 26, 4, "#5f493f42");
    b(3, 2, 26, 26, COL.ink);
    b(6, 5, 20, 20, COL.boxDark);
    b(5, 5, 22, 18, COL.orange);
    b(5, 5, 22, 5, COL.orangeHi);
    b(7, 13, 18, 11, "#e4a66c");
    b(15, 5, 3, 19, "#f8c582");
    b(10, 6, 1, 4, "#fff0bd");
    b(20, 6, 1, 4, "#fff0bd");
    b(5, 24, 22, 3, "#8f6c54");
    b(7, 24, 18, 2, "#bb8666");
    if (stamp) {
      b(11, 14, 3, 3, "#967459");
      b(17, 14, 3, 3, "#967459");
      b(14, 17, 4, 4, "#967459");
    }
    c.restore();
  }
  function floorTile(c, x, y, a) {
    block(c, x, y, T, T, a % 3 === 0 ? "#e4d0bb" : COL.floor);
    block(c, x + 2, y + 2, 28, 28, a % 4 === 1 ? "#e5d2bd" : COL.floorAlt);
    if (a % 7 === 0) {
      block(c, x + 7, y + 23, 2, 2, "#d4bfae");
      block(c, x + 23, y + 8, 2, 2, "#d4bfae");
    }
    if (a % 9 === 1) block(c, x + 18, y + 16, 2, 2, "#dbc6b2");
  }
  function wallTile(c, x, y, i, j, t) {
    block(c, x, y, T, T, COL.ink);
    block(c, x + 3, y + 3, 26, 26, COL.wall);
    block(c, x + 3, y + 3, 26, 6, COL.wallHi);
    block(c, x + 3, y + 25, 26, 4, COL.wallShadow);
    block(c, x + 5, y + 11, 22, 2, "#997869");
    if ((i + j) % 3 === 0) {
      block(c, x + 10, y + 17, 3, 2, "#9f7b6a");
      block(c, x + 21, y + 20, 3, 2, "#9f7b6a");
    } else {
      block(c, x + 7, y + 20, 4, 2, "#d2aa8d");
    }
    block(c, x + 3, y + 3, 4, 4, "#dabb9b");
    block(c, x + 25, y + 3, 4, 4, "#dabb9b");
  }
  function bushTile(c, x, y, i, j, t) {
    const variation = Math.abs((i * 7 + j * 11) % 4);
    const greens = ["#4f7856", "#557e5b", "#5b835f", "#4b7452"];
    const leaf = greens[variation];
    const breeze = Math.sin(t * 0.003 + i * 0.7 + j * 0.6);
    const sway = breeze > 0.35 ? 1 : breeze < -0.35 ? -1 : 0;
    c.save();
    c.beginPath();
    c.rect(x, y, T, T);
    c.clip();
    block(c, x + 2, y + 10, 28, 21, "#6f916a");
    block(c, x + 3, y + 7, 26, 22, "#3e6c49");
    block(c, x + 5, y + 5, 22, 22, "#527e59");
    block(c, x + 7 + sway, y + 3, 17, 8, leaf);
    block(c, x + 4, y + 9 + sway, 11, 9, leaf);
    block(c, x + 15, y + 8 - sway, 13, 10, greens[(variation + 1) % greens.length]);
    block(c, x + 7, y + 16, 10, 8, greens[(variation + 2) % greens.length]);
    block(c, x + 18, y + 17, 9, 7, leaf);
    block(c, x + 8 + sway, y + 6, 5, 3, "#9dbb7a");
    block(c, x + 19, y + 10 - sway, 4, 3, "#8daf73");
    block(c, x + 12, y + 19, 4, 3, "#71976a");
    if (variation === 1) {
      block(c, x + 22, y + 5 + sway, 3, 3, "#f1d886");
      block(c, x + 23, y + 6 + sway, 1, 1, "#fff2bd");
    } else if (variation === 3) {
      block(c, x + 5, y + 19 - sway, 3, 3, "#e79783");
      block(c, x + 6, y + 20 - sway, 1, 1, "#ffe4b0");
    }
    c.restore();
  }
  function drawDecoration(c, x, y, i, j, time) {
    const seed = Math.abs((i * 17 + j * 29 + 5) % 23);
    if (seed === 0 || seed === 9) {
      const fx = x + (seed === 0 ? 8 : 21), fy = y + (seed === 0 ? 9 : 20);
      block(c, fx + 2, fy, 3, 3, "#f5d78d");
      block(c, fx, fy + 2, 3, 3, "#fff0ca");
      block(c, fx + 4, fy + 2, 3, 3, "#fff0ca");
      block(c, fx + 2, fy + 4, 3, 3, "#f7d9a0");
      block(c, fx + 2, fy + 2, 3, 3, "#eaa35e");
      block(c, fx + 3, fy + 7, 2, 3, "#8aa77a");
    } else if (seed === 4 || seed === 15) {
      const lx = x + (seed === 4 ? 8 : 20), ly = y + (seed === 4 ? 20 : 7);
      block(c, lx, ly + 2, 5, 3, "#92ad83");
      block(c, lx + 3, ly, 5, 3, "#a3b88c");
      block(c, lx + 3, ly + 2, 2, 3, "#719578");
    } else if (seed === 7 && Math.sin(time * 0.003 + i + j) > 0.35) {
      block(c, x + 23, y + 7, 2, 2, "#f6e8b4");
      block(c, x + 24, y + 6, 1, 4, "#fff4d6");
    }
  }
  function drawGoal(c, x, y, time) {
    block(c, x + 4, y + 6, 24, 23, COL.goalEdge);
    block(c, x + 6, y + 5, 20, 22, COL.goal);
    block(c, x + 9, y + 8, 14, 16, "#c7dfc6");
    block(c, x + 14, y + 11, 4, 6, "#eff4d9");
    block(c, x + 10, y + 15, 12, 3, "#eff4d9");
    block(c, x + 12, y + 18, 8, 2, "#eff4d9");
    block(c, x + 14, y + 20, 4, 2, "#eff4d9");
    const blink = 0.6 + Math.sin(time * 0.002) * 0.4;
    if (blink > 0.9) block(c, x + 25, y + 4, 2, 2, "#f7edd2");
  }
  function drawPit(c, x, y) {
    // Raised sandy rim and scattered soil make the hole read as a dug-out pit.
    block(c, x + 2, y + 17, 28, 11, "#a98769");
    block(c, x + 4, y + 12, 24, 9, "#c49b70");
    block(c, x + 7, y + 8, 8, 6, "#d4ad7e");
    block(c, x + 17, y + 7, 8, 6, "#bd9368");
    block(c, x + 4, y + 23, 6, 4, "#d0a678");
    block(c, x + 22, y + 24, 7, 3, "#d8b183");
    block(c, x + 5, y + 12, 22, 15, "#343743");
    block(c, x + 7, y + 14, 18, 10, "#252532");
    block(c, x + 9, y + 15, 3, 2, "#514e5d");
    block(c, x + 20, y + 19, 3, 2, "#514e5d");
    block(c, x + 6, y + 12, 5, 3, "#e0bd91");
    block(c, x + 23, y + 12, 4, 3, "#d2a879");
    block(c, x + 8, y + 25, 16, 2, "#725f57");
  }
  function drawFilledPit(c, x, y) {
    block(c, x + 4, y + 13, 24, 13, "#a98769");
    block(c, x + 6, y + 11, 20, 13, "#bf9b75");
    block(c, x + 8, y + 12, 7, 3, "#d2ae82");
    block(c, x + 18, y + 18, 5, 2, "#9f7d61");
    block(c, x + 10, y + 21, 3, 2, "#9f7d61");
  }
  function drawBone(c, x, y) {
    // A two-pixel ink silhouette keeps the bone crisp and readable over every tile.
    const ink = "#343743";
    block(c, x + 9, y + 13, 16, 8, ink);
    block(c, x + 5, y + 9, 10, 10, ink);
    block(c, x + 6, y + 7, 7, 7, ink);
    block(c, x + 5, y + 17, 9, 8, ink);
    block(c, x + 7, y + 22, 6, 4, ink);
    block(c, x + 20, y + 9, 10, 10, ink);
    block(c, x + 21, y + 7, 7, 7, ink);
    block(c, x + 21, y + 17, 9, 8, ink);
    block(c, x + 22, y + 22, 6, 4, ink);
    block(c, x + 11, y + 15, 12, 4, "#fff0db");
    block(c, x + 8, y + 11, 5, 5, "#fff0db");
    block(c, x + 8, y + 18, 4, 5, "#fff0db");
    block(c, x + 22, y + 11, 5, 5, "#fff0db");
    block(c, x + 23, y + 18, 4, 5, "#fff0db");
    block(c, x + 9, y + 10, 3, 2, "#fffaf0");
    block(c, x + 23, y + 10, 3, 2, "#fffaf0");
    block(c, x + 12, y + 15, 9, 2, "#fffaf0");
  }
  M.sprites = Object.freeze({
    T,
    block,
    drawDog,
    drawSittingDog,
    crate,
    floorTile,
    wallTile,
    bushTile,
    drawDecoration,
    drawGoal,
    drawPit,
    drawFilledPit,
    drawBone,
  });
})(window.Mochi);







