(function () {
  'use strict';
  window.Tikhon = window.Tikhon || {};
  // Only press + movement can stroke Tikhon; hover never triggers petting.
  function bind(canvas, onStroke, onPointerDown) {
    if (!canvas) return () => {};
    const card = canvas.closest('.cat-card');
    if (!card) return () => {};
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const colors = ['#ee819c', '#f6b8c6', '#fff0b6', '#a7cbb2', '#f9f4e7'];
    const particles = new Set();
    let activeId = null;
    let previous = null;
    let travelled = 0;
    let lastPet = -Infinity;
    let disposed = false;

    function locate(event) {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / (rect.width || 1);
      const y = (event.clientY - rect.top) / (rect.height || 1);
      return { x: event.clientX, y: event.clientY, hit: x >= 0.045 && x <= 0.955 && y >= 0.06 && y <= 0.96 };
    }
    function scatter(event) {
      const rect = card.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const count = reduced?.matches ? 3 : 7;
      for (let i = 0; i < count; i++) {
        const particle = document.createElement('span');
        particle.className = 'cat-pet-particle';
        particle.setAttribute('aria-hidden', 'true');
        particle.textContent = i % 3 === 0 ? '✦' : i % 3 === 1 ? '♥' : '✧';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.color = colors[i % colors.length];
        particle.style.setProperty('--dx', ((i - (count - 1) / 2) * 11 + (Math.random() - .5) * 8) + 'px');
        particle.style.setProperty('--dy', (-20 - Math.random() * 32) + 'px');
        particle.style.setProperty('--rot', ((Math.random() - .5) * 50) + 'deg');
        card.appendChild(particle);
        particles.add(particle);
        particle.addEventListener('animationend', () => { particle.remove(); particles.delete(particle); }, { once: true });
      }
      while (particles.size > 40) {
        const oldest = particles.values().next().value;
        oldest.remove();
        particles.delete(oldest);
      }
    }
    function begin(event) {
      if (disposed || activeId !== null || !event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const point = locate(event);
      if (!point.hit) return;
      activeId = event.pointerId;
      previous = point;
      travelled = 0;
      try { canvas.setPointerCapture(event.pointerId); } catch (_) { /* no capture fallback */ }
      onPointerDown?.();
      event.preventDefault();
    }
    function move(event) {
      if (disposed || event.pointerId !== activeId) return;
      if (event.pointerType === 'mouse' && !(event.buttons & 1)) { end(event); return; }
      const point = locate(event);
      if (!point.hit) { previous = null; travelled = 0; return; }
      if (!previous) { previous = point; return; }
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      previous = point;
      if (distance > 85) { travelled = 0; return; }
      travelled += distance;
      const now = performance.now();
      if (travelled < 15 || now - lastPet < 330) return;
      travelled = 0;
      lastPet = now;
      scatter(event);
      onStroke?.();
      event.preventDefault();
    }
    function end(event) {
      if (event.pointerId !== activeId) return;
      activeId = null;
      previous = null;
      travelled = 0;
      try { if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); } catch (_) {}
    }
    canvas.addEventListener('pointerdown', begin);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvas.addEventListener('lostpointercapture', end);
    return () => {
      disposed = true;
      canvas.removeEventListener('pointerdown', begin);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', end);
      canvas.removeEventListener('pointercancel', end);
      canvas.removeEventListener('lostpointercapture', end);
      for (const particle of particles) particle.remove();
      particles.clear();
    };
  }
  window.Tikhon.petting = { bind };
})();
