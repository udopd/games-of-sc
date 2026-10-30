import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
test('presence disconnect immediately returns pawn to bot; coverage and effects are shared',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cells-presence-'));
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,WORLD_SEED:'none',PORT:'3330',DATA_DIR:dir},stdio:'ignore'});
 const api=async(route,body={})=>{const r=await fetch('http://localhost:3330/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return r.json();};
 try{
  for(let i=0;i<60;i++){try{await api('health');break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const a=await api('join'),b=await api('join');const controller=new AbortController();
  const presence=await fetch('http://localhost:3330/api/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:a.token}),signal:controller.signal});assert.equal(presence.status,200);
  const painted=await api('action',{session:a.token,seq:1,type:'paint',color:3});assert.ok(painted.ok);assert.equal(painted.world.effects.at(-1).type,'paint');assert.ok(painted.world.coverage.counts[3]>0);
  const pawn=painted.world.pawns[a.id];
  const [dx,dy]=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>!painted.world.pawns.some(p=>p.x===pawn.x+dx&&p.y===pawn.y+dy));
  await new Promise(r=>setTimeout(r,130));
  const moved=await api('action',{session:a.token,seq:2,type:'move',dx,dy,paintColor:6});assert.ok(moved.ok);assert.equal(moved.world.cells[(pawn.y+dy)*100+pawn.x+dx],6);
  await new Promise(r=>setTimeout(r,130));
  const released=await api('action',{session:a.token,seq:3,type:'move',dx:-dx,dy:-dy});assert.ok(released.ok);assert.equal(released.world.cells[pawn.y*100+pawn.x],3);
  controller.abort();let state;
  for(let i=0;i<20;i++){state=await api('state',{session:b.token});if(state.world.pawns[a.id].bot)break;await new Promise(r=>setTimeout(r,50));}
  assert.ok(state.world.pawns[a.id].bot);assert.equal(state.world.pawns.filter(p=>!p.bot).length,1);
  await api('leave',{session:b.token});
 }finally{child.kill();}
});
