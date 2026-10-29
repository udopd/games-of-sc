/* Countdown follows the exact delay promise used by the turn controller. */
(function(){
'use strict';
const bar=document.getElementById('turn-timer'),fill=bar.querySelector('i'),label=document.getElementById('turn-seconds');
let frame=0,generation=0,lastPaint=0;
function stop(){generation++;cancelAnimationFrame(frame);frame=0;bar.hidden=true;bar.setAttribute('aria-valuenow','0');fill.style.transform='scaleX(0)';}
function wait(ms){
 stop();const id=generation;const end=performance.now()+ms;bar.hidden=false;lastPaint=0;
 const paint=now=>{if(id!==generation)return;const remaining=Math.max(0,end-now);if(now-lastPaint>=40||remaining===0){lastPaint=now;fill.style.transform='scaleX('+remaining/ms+')';bar.setAttribute('aria-valuenow',String(Math.round(remaining/ms*100)));label.textContent=(remaining/1000).toFixed(1)+' s';}if(remaining>0)frame=requestAnimationFrame(paint);};
 fill.style.transform='scaleX(1)';bar.setAttribute('aria-valuenow','100');label.textContent=(ms/1000).toFixed(1)+' s';frame=requestAnimationFrame(paint);
 return new Promise(resolve=>setTimeout(()=>{if(id===generation)stop();resolve();},ms));
}
window.Harbor.turnTimer={wait,stop};
})();
