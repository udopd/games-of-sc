(function () {
'use strict';
window.Tikhon = window.Tikhon || {};
/** Short-lived, pixel-shaped bursts. Effects never change the board or saved state. */
const canvas = document.getElementById('fx-layer');
const board = document.getElementById('board');
const ctx = canvas?.getContext('2d', { alpha: true });
const motionPreference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const MAX_PARTICLES = 110;
const colors = ['#fff7d9', '#f1d277', '#ebafbd', '#b4d4bd', '#f8efe7', '#e7b292'];
let particles = [];
let frame = 0;
let last = 0;
let logicalWidth = 0;
let logicalHeight = 0;

function resize() {
  if (!ctx || !board) return;
  const width = board.clientWidth;
  const height = board.clientHeight;
  if (!width || !height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (width !== logicalWidth || height !== logicalHeight ||
      canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    logicalWidth = width;
    logicalHeight = height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
}

function cellCenter(x, y) {
  resize();
  const gapX = logicalWidth * .02, gapY = logicalHeight * .02;
  const width = (logicalWidth - gapX * 3) / 4;
  const height = (logicalHeight - gapY * 3) / 4;
  return { x: x * (width + gapX) + width / 2, y: y * (height + gapY) + height / 2, cell: Math.min(width, height) };
}
function add(particle) {
  if (particles.length >= MAX_PARTICLES) particles.shift();
  particles.push(particle);
}
function animate(now) {
  frame = 0;
  if (!ctx || !particles.length) { last = 0; return; }
  resize();
  const dt = Math.min(34, last ? now - last : 16.7);
  last = now;
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);
  particles = particles.filter(p => {
    p.age += dt;
    if (p.age >= p.life) return false;
    const progress = p.age / p.life;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(.984, dt / 16);
    p.vy += p.gravity * dt;
    ctx.globalAlpha = (1 - progress) ** 1.3;
    ctx.fillStyle = p.color;
    const side = Math.max(1, p.size * (1 - progress * .35));
    const x = Math.round(p.x - side / 2);
    const y = Math.round(p.y - side / 2);
    ctx.fillRect(x, y, Math.ceil(side), Math.ceil(side));
    if (p.cross) {
      ctx.fillRect(x - Math.ceil(side * .65), y + Math.ceil(side * .35), Math.ceil(side * 2.3), Math.max(1, Math.ceil(side * .3)));
      ctx.fillRect(x + Math.ceil(side * .35), y - Math.ceil(side * .65), Math.max(1, Math.ceil(side * .3)), Math.ceil(side * 2.3));
    }
    return true;
  });
  ctx.globalAlpha = 1;
  if (particles.length) frame = requestAnimationFrame(animate);
  else last = 0;
}
function run() {
  if (ctx && !frame && particles.length) frame = requestAnimationFrame(animate);
}

function merge(cells = [], finalBoard = []) {
  if (motionPreference?.matches || !ctx) return;
  for (const { x, y } of cells.slice(0, 4)) {
    const { x: cx, y: cy, cell } = cellCenter(x, y);
    const value = finalBoard[y]?.[x] || 2;
    const count = Math.min(18, 10 + Math.log2(value));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + (Math.random() - .5) * .24;
      const speed = cell * (.00095 + Math.random() * .0014);
      add({x:cx + Math.cos(angle) * cell * .065,y:cy + Math.sin(angle) * cell * .065,
        vx:Math.cos(angle) * speed,vy:Math.sin(angle) * speed - .013,gravity:.00015,
        size:Math.max(2,Math.min(5,cell*.035)) * (.7 + Math.random() * .65),
        life:280 + Math.random() * 230,age:0,
        color:colors[(i + Math.floor(Math.log2(value))) % colors.length],cross:i % 6 === 0});
    }
  }
  run();
}

/** Emit dust only for tiles that actually contact the outermost row/column. */
function wall(direction, cells = []) {
  if (motionPreference?.matches || !ctx || !cells.length) return;
  const directionVectors = {left:[1,0],right:[-1,0],up:[0,1],down:[0,-1]};
  const vector = directionVectors[direction];
  if (!vector) return;
  const unique = [...new Map(cells.map(p => [`${p.x},${p.y}`,p])).values()].slice(0, 3);
  for (const {x,y} of unique) {
    const center = cellCenter(x,y);
    const origin = {
      x:direction === 'left' ? 3 : direction === 'right' ? logicalWidth - 3 : center.x,
      y:direction === 'up' ? 3 : direction === 'down' ? logicalHeight - 3 : center.y
    };
    const size = center.cell;
    for (let i = 0; i < 8; i++) {
      const tangent = (Math.random() - .5) * size * .003;
      const speed = size * (.00075 + Math.random() * .0015);
      add({x:origin.x,y:origin.y,
        vx:vector[0] * speed + (vector[1] ? tangent : 0),
        vy:vector[1] * speed + (vector[0] ? tangent : 0),
        gravity:0,age:0,life:190 + Math.random() * 170,
        size:Math.max(2,Math.min(4,size*.035)) * (.7 + Math.random() * .5),
        color:colors[(i+1) % colors.length],cross:i === 0});
    }
  }
  run();
}
function edgeContacts(boardState, direction, routes = null) {
  const onEdge = p => direction === 'left' ? p.x === 0 : direction === 'right' ? p.x === 3
    : direction === 'up' ? p.y === 0 : p.y === 3;
  if (routes) return routes.filter(route => (route.from.x !== route.to.x || route.from.y !== route.to.y) && onEdge(route.to))
    .map(route => route.to);
  const cells = [];
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    if (boardState[y]?.[x] && onEdge({x,y})) cells.push({x,y});
  }
  return cells;
}
function clear() {
  if(frame) cancelAnimationFrame(frame);
  frame = 0;last = 0;particles = [];
  if(ctx)ctx.clearRect(0,0,logicalWidth,logicalHeight);
}
resize();
window.addEventListener('resize', resize, {passive:true});
window.Tikhon.effects = {merge,wall,edgeContacts,clear,resize};
})();
