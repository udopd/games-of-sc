(function(root){
'use strict';
const sizes=[4,3,3,2,2,2,1,1,1,1];
function fleet(random=Math.random){let ships=[];for(const size of sizes){let placed=false;for(let attempt=0;attempt<5000&&!placed;attempt++){let x=Math.floor(random()*10),y=Math.floor(random()*10),v=random()<.5;let cells=Array.from({length:size},(_,i)=>(y+(v?i:0))*10+x+(v?0:i));if(x+(v?0:size-1)>9||y+(v?size-1:0)>9)continue;if(cells.some(c=>ships.flat().some(s=>Math.abs(s%10-c%10)<=1&&Math.abs(Math.floor(s/10)-Math.floor(c/10))<=1)))continue;ships.push(cells);placed=true;}if(!placed)return fleet(random);}return ships;}
const hit=(ships,c)=>ships.some(s=>s.includes(c));
const sunk=(ship,shots)=>ship.every(c=>shots.includes(c));
const defeated=(ships,shots)=>ships.every(s=>sunk(s,shots));
function target(ships,shots,random=Math.random){
 // A sunk ship is public information. Its full eight-cell border cannot contain ships.
 const excluded=new Set(shots);
 for(const ship of ships){if(!sunk(ship,shots))continue;for(const c of ship){const x=c%10,y=Math.floor(c/10);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&nx<10&&ny>=0&&ny<10)excluded.add(ny*10+nx);}}}
 // Infer direction from connected visible hits, never from hidden ship cells.
 const wounds=shots.filter(c=>hit(ships,c)&&!ships.some(s=>s.includes(c)&&sunk(s,shots)));
 const adjacent=c=>[c-10,c+10,c-1,c+1].filter(n=>n>=0&&n<100&&Math.abs(n%10-c%10)+Math.abs(Math.floor(n/10)-Math.floor(c/10))===1);
 const unseen=new Set(wounds),groups=[];
 for(const start of wounds){if(!unseen.delete(start))continue;const group=[start];for(let i=0;i<group.length;i++)for(const n of adjacent(group[i]))if(unseen.delete(n))group.push(n);groups.push(group);}
 groups.sort((a,b)=>b.length-a.length||shots.indexOf(b.at(-1))-shots.indexOf(a.at(-1)));
 const nearby=new Set();
 for(const group of groups){
  const ordered=[...group].sort((a,b)=>a-b);let options=[];
  if(group.length>1){const horizontal=group.every(c=>Math.floor(c/10)===Math.floor(group[0]/10));const vertical=group.every(c=>c%10===group[0]%10);
   if(horizontal){const lo=ordered[0],hi=ordered.at(-1);if(lo%10>0)options.push(lo-1);if(hi%10<9)options.push(hi+1);}
   else if(vertical)options=[ordered[0]-10,ordered.at(-1)+10];
  }else options=adjacent(group[0]);
  for(const n of options)if(n>=0&&n<100&&!excluded.has(n))nearby.add(n);
  if(nearby.size)break;
 }

 const candidates=nearby.size?[...nearby]:Array.from({length:100},(_,i)=>i).filter(c=>!excluded.has(c));
 return candidates[Math.floor(random()*candidates.length)];
}
function fresh(wins=0){return {version:1,own:[],enemy:fleet(),a:[],b:[],phase:'setup',turn:'player',wins,started:false,completed:false,updatedAt:Date.now()};}
function placement(ships,size,c,v){if(!Number.isInteger(c)||c<0||c>99||c%10+(v?0:size-1)>9||Math.floor(c/10)+(v?size-1:0)>9)return null;const cells=Array.from({length:size},(_,i)=>c+i*(v?10:1));if(cells.some(a=>ships.flat().some(b=>Math.abs(a%10-b%10)<=1&&Math.abs(Math.floor(a/10)-Math.floor(b/10))<=1)))return null;return cells;}
function fire(s,side,c){if(s.phase!=='play'||(s.turn||'player')!==side||!Number.isInteger(c)||c<0||c>=100)return null;const shots=side==='player'?s.a:s.b,ships=side==='player'?s.enemy:s.own;if(shots.includes(c))return null;shots.push(c);const didHit=hit(ships,c),didSink=ships.some(ship=>ship.includes(c)&&sunk(ship,shots));if(defeated(ships,shots)){s.phase=side==='player'?'win':'lose';if(side==='player')s.wins++;}else if(!didHit)s.turn=side==='player'?'computer':'player';return {hit:didHit,sunk:didSink,finished:s.phase!=='play'};}
function valid(s){if(s?.turn!==undefined&&!['player','computer'].includes(s.turn))return false;if(!s||s.version!==1||!['setup','play','win','lose'].includes(s.phase)||!Number.isSafeInteger(s.wins)||s.wins<0||!Number.isFinite(s.updatedAt)||typeof s.started!=='boolean'||typeof s.completed!=='boolean')return false;for(const k of ['own','enemy']){const fleet=s[k];if(!Array.isArray(fleet)||fleet.length>10||((k==='enemy'||s.phase!=='setup')&&fleet.length!==10))return false;const counts={};for(let i=0;i<fleet.length;i++){const ship=fleet[i];if(!Array.isArray(ship)||!sizes.includes(ship.length))return false;counts[ship.length]=(counts[ship.length]||0)+1;if(counts[ship.length]>sizes.filter(n=>n===ship.length).length)return false;const v=ship.length>1&&ship[1]-ship[0]===10;const cells=placement(fleet.slice(0,i),ship.length,ship[0],v);if(!cells||cells.some((c,j)=>c!==ship[j]))return false;}}for(const k of ['a','b'])if(!Array.isArray(s[k])||s[k].length>100||new Set(s[k]).size!==s[k].length||s[k].some(c=>!Number.isInteger(c)||c<0||c>99))return false;return true;}
root.Harbor=root.Harbor||{};root.Harbor.i18n={normalize:v=>typeof v==='string'&&['ru','en'].includes(v.toLowerCase().split(/[-_]/)[0])?v.toLowerCase().split(/[-_]/)[0]:null};root.Harbor.engine={sizes,placement,fire,fleet,hit,sunk,defeated,target,fresh,valid};
})(globalThis);

