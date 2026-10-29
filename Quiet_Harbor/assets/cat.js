(function () {
  'use strict';
  window.Harbor = window.Harbor || {};

  const FRAME_WIDTH = 224;
  const FRAME_HEIGHT = 196;
  const COLUMNS = 4;

  const IDLE = [
    { frame: 0, ms: 360 },
    { frame: 1, ms: 340 },
    { frame: 2, ms: 320 },
    { frame: 3, ms: 180 },
    { frame: 4, ms: 260 },
    { frame: 5, ms: 340 },
    { frame: 6, ms: 420 },
    { frame: 7, ms: 360 }
  ];

  const HAPPY = [
    { frame: 8, ms: 100 },
    { frame: 9, ms: 110 },
    { frame: 10, ms: 120 },
    { frame: 11, ms: 130 },
    { frame: 12, ms: 125 },
    { frame: 13, ms: 120 },
    { frame: 14, ms: 120 },
    { frame: 15, ms: 150 }
  ];

  const PET = [
    { frame: 16, ms: 190 },
    { frame: 17, ms: 190 },
    { frame: 18, ms: 190 },
    { frame: 19, ms: 195 },
    { frame: 20, ms: 195 },
    { frame: 21, ms: 195 },
    { frame: 22, ms: 200 },
    { frame: 23, ms: 220 }
  ];

  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function startCat(canvas) {
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return Object.assign(() => {}, { react() {} });
    const card = canvas.closest('.cat-card');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    ctx.imageSmoothingEnabled = false;

    const sprite = new Image();
    sprite.decoding = 'async';

    let ready = false;
    let disposed = false;
    let timer = null;
    let petTimer = null;
    let happyTimer = null;
    let action = null;
    let actionIndex = 0;
    let idleIndex = 0;
    let shownFrame = -1;

    function renderFrame(frame) {
      const tileW=sprite.naturalWidth/4,tileH=sprite.naturalHeight/6;const sx = (frame % COLUMNS) * tileW;
      const sy = Math.floor(frame / COLUMNS) * tileH;
      ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
      ctx.drawImage(sprite, sx, sy, tileW, tileH, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    }

    function fit() {
      if (!card) return;
      const style = getComputedStyle(card);
      const availableW = card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 10;
      const availableH = card.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom) - 10;
      const scale = Math.max(.05, Math.min(1.55, availableW / FRAME_WIDTH, availableH / FRAME_HEIGHT));
      canvas.style.width = Math.floor(FRAME_WIDTH * scale) + 'px';
      canvas.style.height = Math.floor(FRAME_HEIGHT * scale) + 'px';
    }
    const resizeObserver = typeof ResizeObserver === 'function' && card ? new ResizeObserver(fit) : null;
    resizeObserver?.observe(card);
    if (!resizeObserver) window.addEventListener('resize', fit);
    fit();

    function draw(frame) {
      if (disposed || !ready || frame === shownFrame) return;
      shownFrame = frame;
      renderFrame(frame);
    }

    function schedule(ms) {
      if (disposed) return;
      clearTimeout(timer);
      timer = setTimeout(tick, ms);
    }

    function tick() {
      if (disposed || !ready) return;
      if (document.hidden) { schedule(500); return; }
      if (reduced?.matches) {
        draw(action === HAPPY ? 10 : action === PET ? 18 : 0);
        action = null;
        schedule(1000);
        return;
      }
      if (action) {
        const step = action[actionIndex++];
        draw(step.frame);
        if (actionIndex >= action.length) {
          action = null;
          actionIndex = 0;
          idleIndex = 0;
        }
        schedule(step.ms);
      } else {
        const step = IDLE[idleIndex++ % IDLE.length];
        draw(step.frame);
        schedule(step.ms);
      }
    }

    function pulseClass(name, duration, timerRef) {
      if (!card) return timerRef;
      card.classList.remove(name);
      void card.offsetWidth;
      card.classList.add(name);
      clearTimeout(timerRef);
      return setTimeout(() => card.classList.remove(name), duration);
    }

    function pulsePet() { petTimer = pulseClass('is-petted', 560, petTimer); }
    function pulseHappy() { happyTimer = pulseClass('is-happy', 760, happyTimer); }

    function react(kind) {
      if (kind === 'pet') {
        pulsePet();
        if (action === HAPPY) return;
        action = PET;
        actionIndex = 0;
        if (ready) {
          clearTimeout(timer);
          tick();
        }
        return;
      }
      if (kind !== 'new-peak') return;
      pulseHappy();
      action = HAPPY;
      actionIndex = 0;
      if (ready) {
        clearTimeout(timer);
        tick();
      }
    }

    sprite.addEventListener('load', () => {
      if (disposed) return;
      ready = true;
      shownFrame = -1;
      draw(0);
      schedule(1000);
    });
    sprite.addEventListener('error', () => {
      console.warn('Harbor sprite atlas was not loaded');
    });
    sprite.src = 'assets/captain-pirate.png';

    const stop = () => {
      disposed = true;
      clearTimeout(timer);
      clearTimeout(petTimer);
      clearTimeout(happyTimer);
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', fit);
      card?.classList.remove('is-petted');
      card?.classList.remove('is-happy');
    };
    stop.react = react;
    stop.currentFrame = () => shownFrame;
    return stop;
  }

  window.Harbor.cat_art = { startCat };
})();

