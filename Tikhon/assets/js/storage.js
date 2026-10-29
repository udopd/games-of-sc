(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** Local guest persistence, cloud decoding, and conflict handling; SDK not imported. */
const {sanitizedState}=window.Tikhon.game;
const KEY='tikhon2048:v1';
function readLocal(){try{const raw=window.localStorage.getItem(KEY);return raw?JSON.parse(raw):null;}catch{return null;}}
function writeLocal(data){try{window.localStorage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
function snapshot(state,favorite=null){
 const result={version:1,game:{board:state.board,score:state.score,best:state.best,moves:state.moves,won:state.won,gameOver:state.gameOver,keepPlaying:state.keepPlaying,peakTile:state.peakTile||Math.max(...state.board.flat())},updatedAt:new Date().toISOString()};
 if(typeof favorite==='boolean')result.favorite=favorite;
 return result;
}
function parseSave(result){
  if(result==null)return {kind:'empty'};
  if(typeof result==='object' && (result.requiresSignIn===true||result.authenticated===false))return {kind:'guest'};
  let raw=result;
  // Support the documented loadSave() result {save,updatedAt} and plain data.
  if(typeof raw==='object'&&Object.prototype.hasOwnProperty.call(raw,'save'))raw=raw.save;
  if(raw==null)return {kind:'empty'};
  if(typeof raw==='string') {try{raw=JSON.parse(raw)}catch{return {kind:'unknown'}}}
  if(!raw||typeof raw!=='object')return {kind:'unknown'};
  const game=sanitizedState(raw.game??raw);
  if(!game)return {kind:'unknown'};
  return {kind:'valid',data:{game,favorite:typeof raw.favorite==='boolean'?raw.favorite:null,updatedAt:raw.updatedAt??result?.updatedAt??null}};
}
/** Cloud and local sessions: avoid losing the larger score/best. */
function mergeSaves(local,cloud){
  const a=parseSave(local),b=parseSave(cloud);
  const localGame=a.kind==='valid'?a.data.game:null, cloudGame=b.kind==='valid'?b.data.game:null;
  if(!localGame&&!cloudGame)return null;
  if(!localGame)return cloudGame;
  if(!cloudGame)return localGame;
  // Pick most advanced run, while preserving best-ever across both.
  const winner=(localGame.score>cloudGame.score || (localGame.score===cloudGame.score&&localGame.moves>cloudGame.moves))?localGame:cloudGame;
  return {...winner,best:Math.max(localGame.best,cloudGame.best)};
}

window.Tikhon['storage']={readLocal,writeLocal,snapshot,parseSave,mergeSaves};
})();
