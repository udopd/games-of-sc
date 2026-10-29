(function(){
'use strict';
const overlay=document.getElementById('preloader');
const app=document.getElementById('app');
const bar=document.getElementById('loading-progress');
const label=document.getElementById('loading-label');
const {t,subscribe}=window.Tikhon.i18n;
const started=performance.now();
let active=true,progress=0,key='loading.connecting',finishing=null;
app.inert=true;app.setAttribute('aria-busy','true');
function render(){label.textContent=t(key);bar.setAttribute('aria-valuetext',t(key));}
const unsubscribe=subscribe(render);
function stage(value,nextKey){
 if(!active||finishing||value<progress)return;
 progress=value;key=nextKey;
 overlay.style.setProperty('--loading-progress',String(value/100));
 bar.setAttribute('aria-valuenow',String(value));render();
}
function finish(){
 if(finishing)return finishing;
 stage(100,'loading.ready');
 // Keep the completed bar visible briefly and the whole overlay for at least 1 s.
 finishing=new Promise(resolve=>setTimeout(()=>{
  active=false;overlay.hidden=true;app.inert=false;app.removeAttribute('aria-busy');
  unsubscribe();resolve();
 },Math.max(300,1000-(performance.now()-started))));
 return finishing;
}
stage(10,'loading.connecting');
window.Tikhon.preloader={stage,finish,isActive:()=>active};
})();
