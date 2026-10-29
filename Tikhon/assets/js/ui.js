(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** UI knows only translations and DOM; no game rules or SDK. */
const el=id=>document.getElementById(id);
const {t,subscribe,number}=window.Tikhon.i18n;
let toastTimer=null,modalHandler=null,activeModal=null,lastToast=null;
let status={key:'status.initial',args:null},speech={key:'cat.idle',args:null};
let cloud={key:'cloud.loading',args:null},soundEnabled=true,favoriteStatus=null,scoreState={score:0,best:0};
const drawer=el('drawer'),menuOpen=el('menu-open'),scrim=el('menu-scrim'),modal=el('modal');
function openDrawer(){drawer.inert=false;drawer.classList.add('open');drawer.setAttribute('aria-hidden','false');menuOpen.setAttribute('aria-expanded','true');scrim.classList.remove('hidden');el('menu-close').focus();}
function closeDrawer(){drawer.classList.remove('open');drawer.setAttribute('aria-hidden','true');drawer.inert=true;menuOpen.setAttribute('aria-expanded','false');scrim.classList.add('hidden');menuOpen.focus();}
function isDrawerOpen(){return drawer.classList.contains('open');}
function isModalOpen(){return !modal.classList.contains('hidden');}
function toast(message){lastToast=null;const node=el('toast');node.textContent=message;node.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),2750);}
function toastKey(key,args){lastToast={key,args};toast(t(key,args));lastToast={key,args};}
function setStatusKey(key,args){status={key,args};el('status').lastChild.textContent=' '+t(key,args);}
function setScores(state){scoreState={score:state.score,best:state.best};el('score').textContent=number(state.score);el('best').textContent=number(state.best);}
function sayKey(key,args){speech={key,args};el('cat-speech').textContent=t(key,args);}
function setCloudStatusKey(key,args){cloud={key,args};el('cloud-label').textContent=t(key,args);}
function setSoundUI(on){soundEnabled=on;el('sound-label').textContent=t(on?'sound.enabled':'sound.disabled');}
function setFavoriteUI(value){
 favoriteStatus=typeof value==='boolean'?value:null;
 const active=favoriteStatus===true,button=el('favorite');
 button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
 el('favorite-icon').textContent=active?'♥':'♡';
 el('favorite-label').textContent=t(active?'favorite.remove':'favorite.add');
 el('favorite-detail').textContent=t(active?'favorite.removeDetail':'favorite.addDetail');
}
function closeModal(){modal.classList.add('hidden');activeModal=null;const handler=modalHandler;modalHandler=null;if(handler)handler();}
function renderModal(){
 if(!activeModal)return;
 const {eyebrow,title,copy,copyArgs,actions=[]}=activeModal;
 el('modal-eyebrow').textContent=t(eyebrow||'modal.defaultEyebrow');
 el('modal-title').textContent=t(title||'');el('modal-copy').textContent=t(copy||'',copyArgs);
 const container=el('modal-actions');container.replaceChildren();
 for(const {label,primary,action} of actions){
  const b=document.createElement('button');b.type='button';b.textContent=t(label);b.classList.toggle('primary',!!primary);
  b.addEventListener('click',()=>{closeModal();action?.();});container.append(b);
 }
}
function showModal({eyebrow,title,copy,copyArgs,actions=[],onClose}={}){
 activeModal={eyebrow,title,copy,copyArgs,actions};modalHandler=onClose||null;
 renderModal();modal.classList.remove('hidden');el('modal-close').focus();
}
function refreshLocale(){
 setScores(scoreState);setStatusKey(status.key,status.args);sayKey(speech.key,speech.args);
 setCloudStatusKey(cloud.key,cloud.args);setSoundUI(soundEnabled);setFavoriteUI(favoriteStatus);
 if(activeModal)renderModal();
 if(lastToast && el('toast').classList.contains('show'))el('toast').textContent=t(lastToast.key,lastToast.args);
}
function setupBaseUI(){
 menuOpen.addEventListener('click',openDrawer);
 el('menu-close').addEventListener('click',closeDrawer);
 scrim.addEventListener('click',closeDrawer);
 el('modal-close').addEventListener('click',closeModal);
 modal.addEventListener('click',event=>{if(event.target===modal)closeModal();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(isModalOpen())closeModal();else if(isDrawerOpen())closeDrawer();}});
 subscribe(refreshLocale);
}
window.Tikhon.ui={openDrawer,closeDrawer,isDrawerOpen,isModalOpen,toast,toastKey,setStatusKey,setScores,sayKey,setCloudStatusKey,setSoundUI,setFavoriteUI,closeModal,showModal,setupBaseUI};
})();
