(function(){
'use strict';
const {newGame,move,undoMove,sanitizedState,maxTile}=window.Tikhon.game;
const {renderBoard,animateMove,wallBump,observeBoard}=window.Tikhon.renderer;
const {startCat}=window.Tikhon.cat_art;
const {bindControls}=window.Tikhon.input;
const {readLocal,writeLocal,snapshot,parseSave,mergeSaves}=window.Tikhon.storage;
const platform=window.Tikhon.platform_sdk;
const preloader=window.Tikhon.preloader;
const {t,setLanguage,applyStatic}=window.Tikhon.i18n;
const {playSound,playPurr,unlockAudio,setSound,isSoundOn}=window.Tikhon.sound;
const ui=window.Tikhon.ui;
const $=id=>document.getElementById(id);
const local=readLocal();
let state=sanitizedState(parseSave(local).data?.game) || newGame();
let blocked=false, authenticated=false, cloudReady=false,cloudInFlight=false;
let pendingCloud=false,saveTimer=null,gameRevision=0;
let hasTrackedStart=state.moves>0,hasTrackedWin=state.won;
let favourite=null, favouriteBusy=false, favouriteRevision=0, signedInPlayerId=null, hostFavoriteKnown=false;
let greetingDone=false, sdkWaitCount=0;
let lifecycleClosed=false;

const initialSound=(()=>{try{return localStorage.getItem('tikhon2048:sound')!=='off'}catch{return true}})();
setSound(initialSound);
ui.setupBaseUI();ui.setSoundUI(isSoundOn());ui.setScores(state);ui.setFavoriteUI(null);
applyStatic();ui.setStatusKey('status.initial');ui.sayKey('cat.idle');ui.setCloudStatusKey('cloud.loading');
platform.subscribeContext(context=>{
  if(context.language)setLanguage(context.language);
  if(context.theme){document.documentElement.dataset.platformTheme=context.theme;
   const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=context.theme==='dark'?'#293348':'#f7f1e5';}
  // The host may publish authoritative favorite state using the optional UI bridge.
  if(typeof context.favorite==='boolean'){hostFavoriteKnown=true;favourite=context.favorite;favouriteRevision++;ui.setFavoriteUI(favourite);
   if(cloudReady)persist();}
});
platform.requestContext();
renderBoard(state.board);observeBoard();const catAnimator=startCat($('cat-canvas'));
const stopPetting=window.Tikhon.petting.bind($('cat-canvas'),()=>{playPurr();catAnimator.react('pet');ui.sayKey('cat.pet');},unlockAudio);

function persist({cloud=true}={}) {
  writeLocal(snapshot(state,favourite));
  gameRevision++;
  if(cloud)markCloudDirty();
}
function markCloudDirty(){
  pendingCloud=true;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>void flushCloud(),320);
}
async function flushCloud(){
  if(!cloudReady||!authenticated||cloudInFlight||!pendingCloud)return;
  cloudInFlight=true;
  try{
    while(pendingCloud && cloudReady && authenticated){
      pendingCloud=false;
      const data=snapshot(state,favourite);
      await platform.save(data);
      ui.setCloudStatusKey('cloud.saved');
    }
  }catch(error){
    console.warn('Cloud save unavailable:',error);
    pendingCloud=true;ui.setCloudStatusKey('cloud.saveError');
  }finally{cloudInFlight=false;}
}
async function safeTrack(type,label){
  try{await platform.track(type,{label});}catch(error){console.warn('Platform track failed:',error);}
}
async function initCloud({manual=false}={}) {
  if(lifecycleClosed)return;
  if(cloudInFlight) {if(manual)ui.toastKey('toast.syncing');return;}
  cloudInFlight=true;
  try{
    if(!platform.hasPlatform()){
      ui.setCloudStatusKey('cloud.guestSdk');
      if(manual)ui.toastKey('toast.platformMissing');
      return;
    }
    preloader.stage(30,'loading.player');
    const user=await platform.getUser();
    if(!user?.authenticated){
      signedInPlayerId=null;
      authenticated=false;cloudReady=false;
      ui.setCloudStatusKey('cloud.guest');
      if(manual)ui.toastKey('toast.loginCloud');
      return;
    }
    const incomingId=String(user.playerId??'');
    if(signedInPlayerId!==null&&signedInPlayerId!==incomingId){
      favourite=null;favouriteRevision++;ui.setFavoriteUI(null);
    }
    signedInPlayerId=incomingId;
    const revisionAtLoad=favouriteRevision;
    // Read first; NEVER write until a valid or explicitly empty cloud answer is obtained.
    preloader.stage(65,'loading.save');
    const result=await platform.loadSave();
    const remote=parseSave(result);
    if(remote.kind==='unknown'||remote.kind==='guest'){
      authenticated=true;cloudReady=false;
      ui.setCloudStatusKey('cloud.unknown');
      if(manual)ui.toastKey('toast.unknownSave');
      return;
    }
    const loaded=remote.kind==='valid';
    // SDK favorite() only toggles and has no documented getter. Restore the
    // last status confirmed by the SDK and recorded alongside this game's save.
    // If the host exposes an optional getter, it overrides this cached status.
    if(favouriteRevision===revisionAtLoad){
      if(!hostFavoriteKnown && typeof remote.data?.favorite==='boolean')favourite=remote.data.favorite;
      try{
        const fromPlatform=await platform.getFavoriteStatus();
        if(!hostFavoriteKnown && typeof fromPlatform==='boolean' && favouriteRevision===revisionAtLoad)favourite=fromPlatform;
      }catch(error){console.warn('Favorite status read failed:',error);}
      if(favouriteRevision===revisionAtLoad)ui.setFavoriteUI(favourite);
    }
    const localCandidate=snapshot(state,favourite);
    const combined=mergeSaves(localCandidate,loaded?remote.data: null);
    if(combined){
      // If the player moved while loading, preserve the more advanced board.
      const sanitized=sanitizedState(combined);
      if(sanitized){
        state=sanitized;
        renderBoard(state.board);ui.setScores(state);
        hasTrackedStart ||=state.moves>0;hasTrackedWin ||=state.won;
      }
    }
    authenticated=true;cloudReady=true;greetingDone=true;
    writeLocal(snapshot(state,favourite));
    ui.setCloudStatusKey(loaded?'cloud.restored':'cloud.connected');
    if(manual)ui.toastKey(loaded?'toast.restored':'toast.connected');
    // Merge may advance beyond cloud. Save only after load succeeded, never on a load error.
    pendingCloud=true;
  }catch(error){
    cloudReady=false;
    ui.setCloudStatusKey('cloud.loadError');
    console.warn('Cloud load failed:',error);
    if(manual)ui.toastKey('toast.loadError');
  }finally{
    cloudInFlight=false;
    if(cloudReady)void flushCloud();
  }
}

function moveDirection(dir){
  if(preloader.isActive()||blocked||ui.isDrawerOpen()||ui.isModalOpen())return;
  const result=move(state,dir);
  if(!result.changed){if(wallBump(state.board,dir))playSound('bump');return;}
  blocked=true;state=result.state;persist();ui.setScores(state);
  if(!hasTrackedStart){hasTrackedStart=true;void safeTrack('level_start','classic-2048');}
  if(result.justWon && !hasTrackedWin){hasTrackedWin=true;void safeTrack('level_complete','classic-2048');}
  playSound(result.justWon?'win':result.gained?'merge':'slide');
  // Normal slides and ordinary merges leave Tikhon in his idle animation.
  ui.setStatusKey(result.gained?'status.gain':'status.move',result.gained?{amount:result.gained}:{moves:state.moves});
  animateMove(result,()=>{
    blocked=false;
    if(result.newPeak){catAnimator.react('new-peak');ui.sayKey('cat.newPeak');}
    if(result.justWon){ui.showModal({eyebrow:'modal.winEyebrow',title:'modal.winTitle',copy:'modal.winCopy',actions:[{label:'modal.keepPlaying',primary:true,action:()=>{state.keepPlaying=true;persist();}},{label:'modal.newGame',action:startNewGame}],onClose:()=>{state.keepPlaying=true;persist();}});}
    else if(result.justLost){ui.showModal({eyebrow:'modal.loseEyebrow',title:'modal.loseTitle',copy:'modal.loseCopy',copyArgs:{score:state.score},actions:[{label:'modal.newGame',primary:true,action:startNewGame},{label:'modal.viewBoard'}]});}
  },dir);
}
function startNewGame(){
  window.Tikhon.effects?.clear();
  state=newGame(state.best);hasTrackedStart=false;hasTrackedWin=false;
  renderBoard(state.board);ui.setScores(state);ui.setStatusKey('status.new');ui.sayKey('cat.idle');persist();
}
function undo(){
  if(blocked)return;
  const previous=undoMove(state);
  if(!previous){ui.toastKey('toast.noUndo');return;}
  window.Tikhon.effects?.clear();
  state=previous;renderBoard(state.board);ui.setScores(state);ui.setStatusKey('status.undo');persist();playSound('slide');
}
function bindMenu(id,handler){$(id).addEventListener('click',()=>{ui.closeDrawer();handler();});}
bindMenu('undo',undo);
bindMenu('restart',()=>ui.showModal({eyebrow:'modal.restartEyebrow',title:'modal.restartTitle',copy:'modal.restartCopy',actions:[{label:'modal.cancel'},{label:'modal.start',primary:true,action:startNewGame}]}));
bindMenu('rules',()=>ui.showModal({eyebrow:'modal.rulesEyebrow',title:'modal.rulesTitle',copy:'modal.rulesCopy',actions:[{label:'modal.gotIt',primary:true}]}));
$('sound').addEventListener('click',()=>{
  setSound(!isSoundOn());ui.setSoundUI(isSoundOn());
  try{localStorage.setItem('tikhon2048:sound',isSoundOn()?'on':'off')}catch{}
  playSound();
});
$('cloud-sync').addEventListener('click',()=>void initCloud({manual:true}));
$('favorite').addEventListener('click',async()=>{
  if(favouriteBusy)return;
  favouriteBusy=true;$('favorite').disabled=true;
  try{
    const user=await platform.getUser();
    if(!user?.authenticated){ui.toastKey('toast.loginFavorite');return;}
    const result=await platform.favorite();
    if(typeof result?.favorite==='boolean')favourite=result.favorite;
    else if(typeof result?.isFavorite==='boolean')favourite=result.isFavorite;
    else throw new Error('SDK favorite() returned no state; refusing to guess');
    favouriteRevision++;ui.setFavoriteUI(favourite);persist();
    ui.toastKey(favourite?'toast.favoriteAdded':'toast.favoriteRemoved');
  }catch(error){console.warn('Favorite action failed:',error);ui.toastKey('toast.favoriteError');}
  finally{favouriteBusy=false;$('favorite').disabled=false;}
});
bindControls($('board'),moveDirection,()=>preloader.isActive()||blocked||ui.isDrawerOpen()||ui.isModalOpen());

// SDK may be injected after the game module evaluates. Keep checking periodically
// so a player logging in later can restore progress without reloading the iframe.
async function startLoading(){
 try{
  // Give a late-injected SDK a bounded opportunity to connect inside the host.
  const deadline=performance.now()+1500;
  while(window.parent!==window&&!platform.hasPlatform()&&performance.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,50));
  }
  await initCloud();
 }finally{await preloader.finish();}
}
void startLoading();
const sdkPoll=window.setInterval(()=>{
  sdkWaitCount++;
  if(!preloader.isActive() && !cloudReady && !cloudInFlight)void initCloud();
  if(sdkWaitCount>120)window.clearInterval(sdkPoll);
},3000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){platform.requestContext();if(!preloader.isActive()&&!cloudInFlight&&!cloudReady)void initCloud();}});
window.addEventListener('pagehide',()=>{lifecycleClosed=true;catAnimator();stopPetting();writeLocal(snapshot(state,favourite));});
})();
