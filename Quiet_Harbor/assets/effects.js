/* Transient screen effects never read or mutate game state. */
(function(){
'use strict';
const active=new Set();const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function clear(){for(const item of active){clearTimeout(item.timer);item.node.remove();}active.clear();}
function burst(grid,cell,hit){
 if(document.hidden)return;
 const board=document.getElementById(grid);if(!board)return;
 const size=board.clientWidth/10;
 const node=document.createElement('div');node.className='impact '+(hit?'explosion':'splash');node.setAttribute('aria-hidden','true');node.style.left=(cell%10*10+5)+'%';node.style.top=(Math.floor(cell/10)*10+5)+'%';
 const ring=document.createElement('i');ring.className='impact-ring';node.append(ring);
 const count=reduced.matches?0:hit?22:16;
 for(let i=0;i<count;i++){
  const p=document.createElement('i');p.className='particle';
  const angle= (i/count)*Math.PI*2+Math.random()*.25;
  const radius=size*(.45+Math.random()*(hit?1.3:1));
  const dx=Math.cos(angle)*radius,dy=Math.sin(angle)*radius-(hit?size*.15:size*.45);
  p.style.setProperty('--dx',dx+'px');p.style.setProperty('--dy',dy+'px');p.style.setProperty('--fall',(size*(.5+Math.random()*.6))+'px');p.style.setProperty('--spin',(Math.random()*270-135)+'deg');
  p.style.setProperty('--life',(550+Math.random()*400)+'ms');
  p.style.width=(hit?3+Math.floor(Math.random()*4):2+Math.floor(Math.random()*3))+'px';p.style.height=(hit?3+Math.floor(Math.random()*4):4+Math.floor(Math.random()*5))+'px';
  p.style.background=(hit?['#fff2b0','#ffcf63','#ee8947','#b64c3e','#5b4740']:['#e5fff2','#b6e8e4','#88cbdc','#5aa2c0'])[i%(hit?5:4)];node.append(p);
 }
 const item={node,timer:null};while(active.size>=4){const oldest=active.values().next().value;clearTimeout(oldest.timer);oldest.node.remove();active.delete(oldest);}
 board.append(node);active.add(item);item.timer=setTimeout(()=>{node.remove();active.delete(item);},1100);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});window.addEventListener('pagehide',clear);
window.Harbor.effects={burst,clear};
})();
