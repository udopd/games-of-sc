(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** Renderer only; no game rules, persistence or SDK calls. */
const layer=document.getElementById('tile-layer');
let latest=null;
let resizeObserver=null;
let active=null;
const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const MOVE_MS=140;
function cellGeometry() {
  // Percentage grid gaps follow each axis; retain fractional CSS pixels.
  const {width,height}=layer.getBoundingClientRect();
  const gapX=width*.02,gapY=height*.02;
  return {width:(width-gapX*3)/4,height:(height-gapY*3)/4,gapX,gapY};
}
function translate(x,y,geometry) {
  return `translate3d(${(x*(geometry.width+geometry.gapX)).toFixed(3)}px,${(y*(geometry.height+geometry.gapY)).toFixed(3)}px,0)`;
}
function tileNode(value,x,y,{newTile=false,merge=false}={}) {
  const geometry=cellGeometry();
  const tile=document.createElement('div');
  tile.className='tile'+(newTile?' new':'')+(merge?' merged':'');
  tile.dataset.value=String(value);
  if(value>=1024)tile.dataset.long='true';
  if(value>=16384)tile.dataset.longest='true';
  tile.style.width=`${geometry.width}px`;
  tile.style.height=`${geometry.height}px`;
  // Keep the logical top-left anchored when the tile briefly scales after merging.
  // CSS animations must include this translation, never animate the independent
  // `scale` property: scale + translate3d would shift tiles diagonally.
  const position=translate(x,y,geometry);
  tile.style.setProperty('--tile-position',position);
  tile.style.transform=position;
  const label=document.createElement('span');label.textContent=String(value);tile.append(label);
  if(value>=512){const mark=document.createElement('span');mark.className='tile-mark';mark.textContent='✦';tile.append(mark);}
  return tile;
}
function stopActive() {
  if(!active)return;
  const old=active;
  active=null;
  cancelAnimationFrame(old.frame);
  old.done?.();
}
function renderBoard(board,{spawned=null,mergedAt=[]}={}) {
  if(active)stopActive();
  latest=board;
  const fragment=document.createDocumentFragment();
  const merges=new Set(mergedAt.map(({x,y})=>`${x},${y}`));
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){
    const value=board[y][x];if(!value)continue;
    fragment.append(tileNode(value,x,y,{newTile:!!spawned&&spawned.x===x&&spawned.y===y,merge:merges.has(`${x},${y}`)}));
  }
  // The old and new tiles are swapped in one frame, at the exact same coordinates.
  layer.replaceChildren(fragment);
}
function animateMove(result,done,direction) {
  if(active)stopActive();
  const effects=window.Tikhon.effects;
  if(reduced?.matches){
    renderBoard(result.state.board);
    done?.();
    return;
  }
  const geometry=cellGeometry();
  const fragment=document.createDocumentFragment();
  const routes=result.routes.map(route=>{
    const el=tileNode(route.value,route.from.x,route.from.y);
    // Animation owns transforms; CSS never starts its own competing movement.
    el.style.transition='none';
    fragment.append(el);
    return {el,route};
  });
  layer.replaceChildren(fragment);
  latest=result.state.board;
  const start=performance.now();
  const transition={frame:0,done};
  active=transition;
  function finish(){
    if(active!==transition)return;
    active=null;
    renderBoard(result.state.board,{spawned:result.spawned,mergedAt:result.mergedAt});
    effects?.merge(result.mergedAt,result.state.board);
    if(direction)effects?.wall(direction,effects.edgeContacts(result.state.board,direction,result.routes));
    done?.();
  }
  function step(now){
    if(active!==transition)return;
    const p=Math.min(1,Math.max(0,(now-start)/MOVE_MS));
    const ease=1-Math.pow(1-p,3); // continuous, subpixel motion; no fixed timer swap
    for(const {el,route} of routes){
      const x=route.from.x+(route.to.x-route.from.x)*ease;
      const y=route.from.y+(route.to.y-route.from.y)*ease;
      el.style.transform=translate(x,y,geometry);
    }
    if(p<1)transition.frame=requestAnimationFrame(step);
    else finish();
  }
  transition.frame=requestAnimationFrame(step);
}
function wallBump(board,direction){
  const effects=window.Tikhon.effects;
  if(!effects)return false;
  const contacts=effects.edgeContacts(board,direction);
  effects.wall(direction,contacts);
  return contacts.length>0;
}
function observeBoard(onResize=()=>{}) {
  if(!('ResizeObserver'in window))return;
  resizeObserver=new ResizeObserver(()=>{
    // A resize changes tile geometry; settle any in-flight move before recomputing.
    if(active) {
      const board=latest;
      stopActive();
      renderBoard(board);
    } else if(latest)renderBoard(latest);
    window.Tikhon.effects?.resize();
    onResize();
  });
  resizeObserver.observe(layer);
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden && active){
    const board=latest;
    stopActive();
    renderBoard(board);
  }
});
window.Tikhon.renderer={renderBoard,animateMove,wallBump,observeBoard};
})();
