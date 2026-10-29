(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** Pure 2048 rules. No UI, storage or platform dependencies. */
const SIZE = 4;
const VALID = new Set(['up', 'down', 'left', 'right']);
const emptyBoard = () => Array.from({length: SIZE}, () => Array(SIZE).fill(0));
const cloneBoard = board => board.map(row => [...row]);
const maxTile = board => Math.max(...board.flat());

function spawn(board, random = Math.random) {
  const holes = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (board[y][x] === 0) holes.push({x,y});
  if (!holes.length) return null;
  const pick = holes[Math.min(holes.length - 1, Math.floor(random() * holes.length))];
  const value = random() < .9 ? 2 : 4;
  board[pick.y][pick.x] = value;
  return {...pick, value};
}

function newGame(best = 0, random = Math.random) {
  const board = emptyBoard();
  spawn(board, random);
  spawn(board, random);
  return {board, score:0, best, moves:0, won:false, gameOver:false, keepPlaying:false, peakTile:maxTile(board), undo:null};
}

function canMove(board) {
  if (board.some(row => row.includes(0))) return true;
  for (let y=0;y<SIZE;y++) for(let x=0;x<SIZE;x++) {
    if(x+1<SIZE && board[y][x]===board[y][x+1]) return true;
    if(y+1<SIZE && board[y][x]===board[y+1][x]) return true;
  }
  return false;
}

/** Every source tile yields one animation route, even if two combine. */
function move(state, direction, random = Math.random) {
  if (!VALID.has(direction) || state.gameOver || (state.won && !state.keepPlaying)) return {state,changed:false,routes:[],spawned:null};
  const before=cloneBoard(state.board), board=emptyBoard(), routes=[];
  const previousPeak=Math.max(state.peakTile || 0, maxTile(before));
  let gained=0, mergedAt=[];
  for(let line=0;line<SIZE;line++) {
    const coords=[];
    for(let i=0;i<SIZE;i++) {
      if(direction==='left') coords.push({x:i,y:line});
      if(direction==='right') coords.push({x:SIZE-1-i,y:line});
      if(direction==='up') coords.push({x:line,y:i});
      if(direction==='down') coords.push({x:line,y:SIZE-1-i});
    }
    const contents=coords.filter(p=>before[p.y][p.x]!==0).map(p=>({...p,value:before[p.y][p.x]}));
    let slot=0;
    for(let i=0;i<contents.length;i++) {
      const a=contents[i], b=contents[i+1];
      const dest=coords[slot++];
      if(b && a.value===b.value) {
        board[dest.y][dest.x]=a.value*2;
        gained+=a.value*2;
        mergedAt.push(dest);
        routes.push({from:{x:a.x,y:a.y},to:dest,value:a.value},{from:{x:b.x,y:b.y},to:dest,value:b.value});
        i++;
      } else {
        board[dest.y][dest.x]=a.value;
        routes.push({from:{x:a.x,y:a.y},to:dest,value:a.value});
      }
    }
  }
  if(before.every((row,y)=>row.every((v,x)=>v===board[y][x]))) return {state,changed:false,routes:[],spawned:null};
  const undo={board:before,score:state.score,moves:state.moves,won:state.won,gameOver:state.gameOver,keepPlaying:state.keepPlaying};
  // A newly generated 2 or 4 does not count. Only actual merges may celebrate.
  const highestMerge=mergedAt.reduce((peak,{x,y})=>Math.max(peak,board[y][x]),0);
  const newPeak=highestMerge>previousPeak;
  const peakTile=Math.max(previousPeak,maxTile(board));
  const spawned=spawn(board,random);
  const score=state.score+gained;
  const won=state.won || maxTile(board)>=2048;
  const next={...state,board,score,best:Math.max(state.best,score),moves:state.moves+1,won,gameOver:!canMove(board),peakTile,undo};
  return {state:next,changed:true,routes,spawned,mergedAt,gained,newPeak,justWon:!state.won && won,justLost:!state.gameOver && next.gameOver};
}

function undoMove(state) {
  if(!state.undo) return null;
  const prev=state.undo;
  return {...state,...prev,board:cloneBoard(prev.board),best:state.best,undo:null};
}

function isValidState(value) {
  if(!value || typeof value!=='object' || !Array.isArray(value.board) || value.board.length!==SIZE) return false;
  if(!value.board.every(row=>Array.isArray(row)&&row.length===SIZE&&row.every(n=>Number.isSafeInteger(n)&&n>=0&&(n===0||(n>=2&&Number.isInteger(Math.log2(n))))))) return false;
  return ['score','best','moves'].every(key=>Number.isSafeInteger(value[key])&&value[key]>=0)
    && ['won','gameOver'].every(key=>typeof value[key]==='boolean');
}
function sanitizedState(value) {
  if(!isValidState(value)) return null;
  return {board:cloneBoard(value.board),score:value.score,best:Math.max(value.best,value.score),moves:value.moves,won:value.won,gameOver:value.gameOver,keepPlaying:!!value.keepPlaying,peakTile:Math.max(maxTile(value.board),Number.isSafeInteger(value.peakTile)&&value.peakTile>=2&&Number.isInteger(Math.log2(value.peakTile))?value.peakTile:0),undo:null};
}

window.Tikhon['game']={SIZE,emptyBoard,cloneBoard,maxTile,spawn,newGame,canMove,move,undoMove,isValidState,sanitizedState};
})();
