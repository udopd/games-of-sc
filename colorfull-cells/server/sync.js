import {randomUUID} from 'node:crypto';
/* Bounded revision journal. Full snapshots are reserved for entry and gap recovery. */
export class WorldStream {
  constructor(world){this.world=world;this.epoch=randomUUID();this.frame=0;this.history=[];this.current=structuredClone(world.snapshot());}
  refresh(){
    const next=structuredClone(this.world.snapshot()),old=this.current,cells=[];
    for(let i=0;i<10000;i++)if(next.cells[i]!==old.cells[i])cells.push([i,next.cells[i]]);
    const delta={from:this.frame,to:this.frame+1,time:next.time};
    if(cells.length){delta.cells=cells;delta.coverage=next.coverage;}
    for(const key of ['pawns','bombs','regions'])if(JSON.stringify(next[key])!==JSON.stringify(old[key]))delta[key]=next[key];
    const seen=new Set(old.effects.map(e=>e.id));const effects=next.effects.filter(e=>!seen.has(e.id));if(effects.length)delta.effects=effects;
    this.current=next;
    if(Object.keys(delta).length===3)return false;
    this.frame++;this.history.push(delta);this.history=this.history.slice(-256);return true;
  }
  packet(cursor,session){
    const meta={epoch:this.epoch,frame:this.frame,ack:session?.seq||0,received:session?.received||0,results:session?.results||[],time:Date.now()};
    if(!Number.isInteger(cursor)||cursor<0||cursor>this.frame||cursor<(this.history[0]?.from??this.frame))return {...meta,world:this.current};
    const patches=this.history.filter(p=>p.to>cursor);
    if(JSON.stringify(patches).length>24000)return {...meta,world:this.current};
    return {...meta,patches};
  }
}
export function executeCommand(world,p,command){
  if(command.type==='lock')return world.lock(p,command.bounds);
  if(command.type==='unlock')return world.unlock(p);
  if(command.type==='paint'&&world.regionAt(p.x,p.y))return {ok:false,error:'lockedCell'};
  return {ok:command.type==='move'?world.move(p,command.dx,command.dy,Date.now(),command.paintColor??null):command.type==='paint'?world.paint(p,command.color):false};
}
export function enqueueCommands(session,commands){
  if(!Array.isArray(commands)||commands.length>12)return {ok:false,error:'queue'};
  let next=session.received;const fresh=[];
  for(const c of commands){
    if(!c||!Number.isSafeInteger(c.seq)||c.seq<1)return {ok:false,error:'sequence'};
    if(c.seq<=next)continue;
    if(c.seq!==next+1)return {ok:false,error:'sequence',expected:next+1};
    if(!['move','paint','lock','unlock'].includes(c.type))return {ok:false,error:'command'};
    fresh.push(c);next=c.seq;
  }
  if(session.queue.length+fresh.length>12)return {ok:false,error:'queue'};
  session.queue.push(...fresh);session.received=next;return {ok:true,received:next};
}
