import crypto from 'node:crypto';
import '../assets/engine.js';
const E=globalThis.Harbor.engine;
export class Rooms {
 constructor({clock=Date.now,disconnectMs=15000,setupMs=60000,turnMs=10000}={}){this.clock=clock;this.disconnectMs=disconnectMs;this.setupMs=setupMs;this.turnMs=turnMs;this.rooms=new Map();}
 error(message){throw Object.assign(new Error(message),{status:400});}
 create(){this.tick();if(this.rooms.size>=500)this.error('roomsFull');let code;do{code=crypto.randomBytes(4).toString('hex').slice(0,6).toUpperCase();}while(this.rooms.has(code));const now=this.clock();const room={code,phase:'lobby',players:[],version:1,created:now,deadline:0,readyAt:0,turn:0,winner:null,reason:null,event:null};this.rooms.set(code,room);return this.join(code);}
 join(code){this.tick();const room=this.rooms.get(String(code).toUpperCase());if(!room)this.error('roomMissing');if(room.phase!=='lobby'||room.players.length>=2)this.error('roomFull');const player={token:crypto.randomBytes(32).toString('hex'),fleet:[],shots:[],ready:false,lastSeen:this.clock()};room.players.push(player);room.version++;return {code:room.code,token:player.token,view:this.view(room,room.players.length-1)};}
 member(code,token){const r=this.rooms.get(String(code).toUpperCase());if(!r)this.error('roomMissing');const index=r.players.findIndex(p=>p.token===token);if(index<0)this.error('notMember');return [r,index];}
 finish(r,winner,reason){if(r.phase==='done')return;r.phase='done';r.winner=winner;r.reason=reason;r.ended=this.clock();r.deadline=0;r.version++;}
 fleetValid(fleet,complete=false){const s=E.fresh();s.own=fleet;s.phase=complete?'play':'setup';return E.valid(s);}
 fill(partial){
  const remaining=[...E.sizes];for(const ship of partial){const i=remaining.indexOf(ship.length);if(i<0)this.error('badFleet');remaining.splice(i,1);}
  let budget=20000;const search=(ships,index)=>{if(--budget<0)return null;if(index===remaining.length)return ships;const options=[];for(let c=0;c<100;c++)for(const v of [false,true]){const cells=E.placement(ships,remaining[index],c,v);if(cells)options.push(cells);}for(let i=options.length-1;i>0;i--){const j=crypto.randomInt(i+1);[options[i],options[j]]=[options[j],options[i]];}for(const cells of options){const result=search([...ships,cells],index+1);if(result)return result;}return null;};
  return search(partial.map(s=>[...s]),0)||E.fleet();
 }
 begin(r){r.phase='play';r.turn=0;r.readyAt=this.clock()+900;r.deadline=r.readyAt+this.turnMs;r.version++;}
 action(code,token,action,payload={}){this.tick();const [r,i]=this.member(code,token),p=r.players[i];p.lastSeen=this.clock();if(action==='poll')return this.view(r,i);if(action==='leave'){this.finish(r,r.players.length===2?1-i:null,'left');return this.view(r,i);}if(r.phase==='done')this.error('gameOver');
  if(action==='start'){if(i!==0||r.phase!=='lobby'||r.players.length!==2)this.error('waitOpponent');r.phase='setup';r.deadline=this.clock()+this.setupMs;r.version++;}
  else if(action==='fleet'||action==='ready'){if(r.phase!=='setup'||p.ready)this.error('notSetup');if(!this.fleetValid(payload.fleet,action==='ready'))this.error('badFleet');p.fleet=payload.fleet.map(s=>[...s]);if(action==='ready')p.ready=true;r.version++;if(r.players.every(p=>p.ready))this.begin(r);}
  else if(action==='shoot'){if(r.phase!=='play'||r.turn!==i||this.clock()<r.readyAt)this.error('notYourTurn');const c=payload.cell;if(!Number.isInteger(c)||c<0||c>99||p.shots.includes(c))this.error('badShot');p.shots.push(c);const enemy=r.players[1-i],hit=E.hit(enemy.fleet,c);r.event={id:++r.version,player:i,cell:c,hit};if(E.defeated(enemy.fleet,p.shots))this.finish(r,i,'fleet');else{if(!hit)r.turn=1-i;r.readyAt=this.clock()+(hit?700:1000);r.deadline=r.readyAt+this.turnMs;}}
  else this.error('badAction');return this.view(r,i);
 }
 tick(){const now=this.clock();for(const [key,r] of this.rooms){if((r.phase==='done'&&now-r.ended>1800000)||(r.phase==='lobby'&&now-r.created>900000)){this.rooms.delete(key);continue;}if(r.phase==='done')continue;const absent=r.players.map((p,i)=>now-p.lastSeen>this.disconnectMs?i:-1).filter(i=>i>=0);if(absent.length){this.finish(r,r.players.length===2&&absent.length===1?1-absent[0]:null,'disconnected');continue;}if(r.phase==='setup'&&now>=r.deadline){for(const p of r.players){if(!p.ready)p.fleet=this.fill(p.fleet);p.ready=true;}this.begin(r);}else if(r.phase==='play'&&now>=r.deadline){r.turn=1-r.turn;r.readyAt=now+700;r.deadline=r.readyAt+this.turnMs;r.event={id:++r.version,type:'timeout'};}}}
 view(r,i){const p=r.players[i],enemy=r.players[1-i];const hits=p.shots.filter(c=>enemy&&E.hit(enemy.fleet,c));return {code:r.code,self:i,host:i===0,phase:r.phase,players:r.players.length,ready:p.ready,opponentReady:enemy?.ready||false,own:p.fleet,shots:p.shots,incoming:enemy?.shots||[],enemyHits:hits,enemyShips:!enemy?[]:r.phase==='done'?enemy.fleet:enemy.fleet.filter(s=>E.sunk(s,p.shots)),enemyRemaining:enemy?enemy.fleet.filter(s=>!E.sunk(s,p.shots)).length:10,turn:r.turn,readyAt:r.readyAt,deadline:r.deadline,serverTime:this.clock(),winner:r.winner,reason:r.reason,version:r.version,event:r.event};}
}
