(function (M) {
  "use strict";
  function createAudio() {
    let soundOn = true,
      audioContext = null,
      resumePromise = null,
      gestureUntil = 0;
    try {
      soundOn = window.localStorage.getItem("ichi:sound") !== "off";
    } catch (e) {}

    function context() {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return null;
        if (!audioContext) audioContext = new AudioContextClass();
        return audioContext;
      } catch (e) {
        return null;
      }
    }

    function unlock() {
      const ctx = context();
      if (!ctx) return Promise.resolve(null);
      if (ctx.state === "running") return Promise.resolve(ctx);
      if (!resumePromise) {
        // iOS Safari needs a source started synchronously inside a user gesture.
        try {
          const silent = ctx.createBufferSource();
          silent.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
          silent.connect(ctx.destination);
          silent.start(0);
        } catch (e) {}
        try {
          resumePromise = Promise.resolve(ctx.resume())
            .then(() => (ctx.state === "running" ? ctx : null))
            .catch(() => null)
            .finally(() => { resumePromise = null; });
        } catch (e) {
          resumePromise = Promise.resolve(null).finally(() => { resumePromise = null; });
        }
      }
      return resumePromise;
    }

    function tones(type) {
      return type === "win"
        ? [660, 830, 990]
        : type === "push"
          ? [170, 260]
          : type === "undo"
            ? [190]
            : type === "start"
              ? [420, 530]
              : [300];
    }

    function playBark(ctx) {
      const now = ctx.currentTime;
      [0, 0.19].forEach((offset, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + offset;
        osc.type = "triangle";
        osc.frequency.setValueAtTime(index === 0 ? 560 : 660, start);
        osc.frequency.exponentialRampToValueAtTime(index === 0 ? 180 : 220, start + 0.11);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.075, start + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.15);
      });
    }

    function playSound(ctx, type) {
      if (!soundOn || !ctx) return;
      if (type === "bark") {
        playBark(ctx);
        return;
      }
      tones(type).forEach((pitch, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + i * 0.09;
        osc.type = "sine";
        osc.frequency.setValueAtTime(pitch, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.045, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.13);
      });
    }

    function sound(type) {
      if (!soundOn) return;
      const ctx = context();
      if (!ctx) return;
      if (ctx.state === "running" || performance.now() < gestureUntil) {
        // Schedule while still inside the trusted tap/key event; iOS can resume afterward.
        playSound(ctx, type);
        if (ctx.state !== "running") void unlock();
        return;
      }
      void unlock().then((readyContext) => playSound(readyContext, type));
    }

    function unlockFromGesture() {
      if (!soundOn) return;
      gestureUntil = performance.now() + 900;
      void unlock();
    }
    ["pointerdown", "touchstart", "touchend", "click", "keydown"].forEach((eventName) => {
      document.addEventListener(eventName, unlockFromGesture, { capture: true, passive: true });
    });

    function toggle() {
      soundOn = !soundOn;
      try {
        window.localStorage.setItem("ichi:sound", soundOn ? "on" : "off");
      } catch (e) {}
      if (soundOn) void unlock();
      return soundOn;
    }

    return Object.freeze({ play: sound, toggle, enabled: () => soundOn });
  }
  M.audio = Object.freeze({ create: createAudio });
})(window.Mochi);