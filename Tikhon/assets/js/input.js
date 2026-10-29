(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** Keyboard and swipe adapters; caller owns the rules. */
function bindControls(board,onMove,isBlocked){
  const keys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',A:'left',D:'right',W:'up',S:'down'};
  function onKey(event){
    if(event.ctrlKey||event.altKey||event.metaKey)return;
    const dir=keys[event.key];
    if(!dir||isBlocked())return;
    event.preventDefault();onMove(dir);
  }
  window.addEventListener('keydown',onKey);
  let start=null;
  board.addEventListener('pointerdown',event=>{start={x:event.clientX,y:event.clientY,id:event.pointerId};});
  board.addEventListener('pointerup',event=>{
    if(!start||start.id!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;start=null;
    if(isBlocked()||Math.max(Math.abs(dx),Math.abs(dy))<19)return;
    onMove(Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up');
  });
  board.addEventListener('pointercancel',()=>{start=null;});
  board.addEventListener('dragstart',event=>event.preventDefault());
  return ()=>window.removeEventListener('keydown',onKey);
}

window.Tikhon['input']={bindControls};
})();
