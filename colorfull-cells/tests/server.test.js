import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
test('real HTTP: eight slots, shared paint, server validation, bot replacement and persistence',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cells-test-'));const port=3328;
 const start=()=>spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),DATA_DIR:dir},stdio:['ignore','pipe','pipe']});let child=start();
 const wait=async()=>{for(let i=0;i<60;i++){try{if((await fetch(`http://localhost:${port}/api/health`)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('startup');};
 const api=async(route,body,token)=>{const r=await fetch(`http://localhost:${port}/api/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,...(token?{session:token}:{})})});return {status:r.status,data:await r.json()};};
 try{await wait();const players=[];for(let i=0;i<8;i++){const r=await api('join',{});assert.equal(r.status,200);players.push(r.data);}assert.equal((await api('join',{})).status,409);const a=players[0],p=a.world.pawns[a.id];assert.equal((await api('action',{seq:1,type:'paint',color:5},a.token)).status,200);const missing=await api('state',{});assert.equal(missing.status,401);const s=await api('state',null,players[1].token);assert.equal(s.data.world.cells[p.y*100+p.x],5);assert.equal((await api('action',{seq:1,type:'paint',color:2},a.token)).status,409);await new Promise(r=>setTimeout(r,130));
 const lock=await api('action',{seq:2,type:'lock',bounds:{x1:p.x,y1:p.y,x2:p.x,y2:p.y}},a.token);assert.equal(lock.status,200);assert.equal(lock.data.world.regions[0].owner,a.id);
 const other=await api('action',{seq:1,type:'unlock'},players[1].token);assert.equal(other.status,400);assert.equal(other.data.error,'notOwner');
 await new Promise(r=>setTimeout(r,130));const blocked=await api('action',{seq:3,type:'paint',color:1},a.token);assert.equal(blocked.status,400);assert.equal(blocked.data.error,'lockedCell');assert.equal(blocked.data.world.cells[p.y*100+p.x],5);
 await new Promise(r=>setTimeout(r,130));assert.equal((await api('action',{seq:4,type:'move',dx:30,dy:0},a.token)).status,400);assert.equal((await api('state',null,'fake')).status,401);await api('leave',{},a.token);const b=await api('join',{});assert.equal(b.data.id,a.id);assert.equal(b.data.world.regions[0].owner,a.id);await api('leave',{},b.data.token);await new Promise(r=>setTimeout(r,5200));assert.ok(JSON.parse(fs.readFileSync(path.join(dir,'world.json'))).cells.some(c=>c>=0));child.kill();await new Promise(r=>child.once('exit',r));child=start();await wait();const restored=await api('join',{});assert.ok(restored.data.world.cells.some(c=>c>=0));assert.equal(restored.data.world.pawns.filter(p=>p.bot).length,7);assert.equal(restored.data.world.regions.length,1);
 }finally{child.kill();}
});

