import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../assets/sync-client.js',import.meta.url),'utf8'),{window,structuredClone,Set,Map,Math,Infinity});
test('real streaming protocol: queued steps, delayed HTTP receipt, delta acknowledgements, retry safety, quotas and disconnect',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'cells-transport-'));
 const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'3341',DATA_DIR:dir},stdio:'ignore'});
 const controller=new AbortController();let reader;
 const api=async(route,body={})=>{const r=await fetch('http://localhost:3341/api/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});return {status:r.status,data:await r.json()};};
 let buffer='';const decoder=new TextDecoder();
 async function next(){
  for(;;){const end=buffer.indexOf('\n\n');if(end>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);if(event.startsWith('data: '))return JSON.parse(event.slice(6));continue;}
   const read=await reader.read();if(read.done)throw Error('unexpected end');buffer+=decoder.decode(read.value,{stream:true});
  }
 }
 async function until(ack,client){const timeout=setTimeout(()=>controller.abort(),5000);try{for(;;){const packet=await next();if(client)assert.ok(client.receive(packet));if(packet.ack>=ack)return packet;}}finally{clearTimeout(timeout);}}
 try{
  for(let n=0;n<60;n++){try{await api('health');break;}catch{}await new Promise(r=>setTimeout(r,100));}
  const joined=(await api('join',{protocol:2})).data,session=joined.token,id=joined.id,initial=joined.world.pawns[id];
  const client=new window.CellSync();client.receive(joined);assert.equal(joined.world.lockLimit,256);
  const response=await fetch('http://localhost:3341/api/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,cursor:joined.frame}),signal:controller.signal});reader=response.body.getReader();assert.equal(response.status,200);assert.equal((await next()).world,undefined);
  for(let n=0;n<8;n++)assert.ok(client.enqueue(id,'move',{dx:-1,dy:0,paintColor:5},n*120));
  assert.equal(client.view(id).pawns[id].x,initial.x-8);assert.equal(client.base.pawns[id].x,initial.x);
  const commands=client.batch();
  const delayedReceipt=api('commands',{session,commands}).then(async result=>{await new Promise(r=>setTimeout(r,600));return result;});
  const duplicate=await api('commands',{session,commands});assert.equal(duplicate.status,200);assert.equal(duplicate.data.received,8);
  const acknowledged=await until(8,client);assert.equal(acknowledged.world,undefined);assert.equal(client.pending.length,0);assert.equal(client.base.pawns[id].x,initial.x-8);
  assert.equal(client.base.cells[initial.y*100+initial.x-8],5);assert.equal((await delayedReceipt).status,200);
  const updated=await api('state',{session,protocol:2,cursor:client.frame});assert.equal(updated.data.world,undefined);assert.ok(JSON.stringify(updated.data).length<JSON.stringify(joined).length/3);
  const quota=await api('commands',{session,commands:[{seq:9,type:'lock',bounds:{x1:0,y1:0,x2:16,y2:15}}]});assert.equal(quota.status,200);
  const failed=await until(9);assert.equal(failed.results.find(r=>r.seq===9).error,'lockLimit');
  const full=await api('state',{session,protocol:2,cursor:-1});assert.equal(full.data.world.cells.length,10000);assert.equal(full.data.world.regions.length,0);
  controller.abort();let watch;
  for(let i=0;i<20;i++){watch=(await api('watch')).data;if(watch.world.pawns[id].bot)break;await new Promise(r=>setTimeout(r,50));}
  assert.equal(watch.world.pawns[id].bot,true);
 }finally{controller.abort();child.kill();}
});
