import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {World} from '../server/world.js';
import {WorldStream,enqueueCommands,executeCommand} from '../server/sync.js';
const window={};vm.runInNewContext(fs.readFileSync(new URL('../assets/sync-client.js',import.meta.url),'utf8'),{window,structuredClone,Math,Infinity,Set,Map});
const Client=window.CellSync;
function setup(){const w=new World();w.pawns[0].x=10;w.pawns[0].y=10;w.bombs=[];return {w,hub:new WorldStream(w)};}
test('one changed cell is sent as a delta, revision gaps recover with a full snapshot',()=>{
 const {w,hub}=setup(),initial=hub.packet(-1);w.paint(w.pawns[0],3);hub.refresh();const update=hub.packet(initial.frame);
 assert.equal(update.world,undefined);assert.equal(update.patches[0].cells.length,1);
 assert.ok(JSON.stringify(update).length<JSON.stringify(initial).length/5);
 for(let i=0;i<270;i++){w.paint(w.pawns[0],i%8);hub.refresh();}assert.ok(hub.packet(0).world);
});
test('eight steps and painting are predicted without waiting for a 960ms delayed confirmation',()=>{
 const {w,hub}=setup(),client=new Client();client.receive(hub.packet(-1));
 for(let n=0;n<8;n++)assert.ok(client.enqueue(0,'move',{dx:1,dy:0,paintColor:4},n*120));
 assert.equal(client.view(0).pawns[0].x,18);assert.equal(w.pawns[0].x,10);assert.equal(client.view(0).cells[1018],4);
 const s={seq:0,received:0,queue:[],results:[]};assert.ok(enqueueCommands(s,client.batch()).ok);
 for(const c of s.queue){s.results.push({seq:c.seq,...executeCommand(w,w.pawns[0],c)});s.seq=c.seq;}
 hub.refresh();client.receive(hub.packet(client.frame,s));assert.equal(client.pending.length,0);assert.deepEqual(client.view(0).cells,w.cells);assert.equal(client.view(0).pawns[0].x,18);
});
test('reconciliation removes refused movement and replays remaining commands against actual occupancy',()=>{
 const {w,hub}=setup(),client=new Client();client.receive(hub.packet(-1));
 for(let n=0;n<6;n++)client.enqueue(0,'move',{dx:1,dy:0,paintColor:4},n*120);
 w.pawns[1].x=13;w.pawns[1].y=10;const commands=client.batch();const s={seq:0,received:6,results:[]};
 for(const c of commands.slice(0,3)){s.results.push({seq:c.seq,...executeCommand(w,w.pawns[0],c)});s.seq=c.seq;}
 hub.refresh();client.receive(hub.packet(client.frame,s));assert.equal(client.pending.length,3);assert.equal(client.view(0).pawns[0].x,12);assert.equal(client.view(0).cells[1013],-1);
 for(const c of commands.slice(3)){s.results.push({seq:c.seq,...executeCommand(w,w.pawns[0],c)});s.seq=c.seq;}
 client.receive(hub.packet(client.frame,s));assert.equal(client.pending.length,0);assert.equal(client.view(0).pawns[0].x,12);
});
test('retries enqueue each sequence once, gaps and oversized batches do not partially mutate a queue',()=>{
 const s={received:0,queue:[]},commands=[{seq:1,type:'paint',color:3},{seq:2,type:'move',dx:1,dy:0}];
 assert.ok(enqueueCommands(s,commands).ok);assert.ok(enqueueCommands(s,commands).ok);assert.equal(s.queue.length,2);
 assert.equal(enqueueCommands(s,[{seq:4,type:'paint',color:4}]).error,'sequence');assert.equal(s.queue.length,2);
 assert.equal(enqueueCommands(s,Array.from({length:13},(_,i)=>({seq:i+3,type:'paint',color:2}))).error,'queue');assert.equal(s.received,2);
});
test('prediction queue is bounded, release cancels it, and a server restart resets the spectator cursor',()=>{
 const {hub}=setup(),client=new Client();client.receive(hub.packet(-1));
 for(let n=0;n<12;n++)assert.ok(client.enqueue(0,'move',{dx:1,dy:0},n*120));assert.equal(client.enqueue(0,'move',{dx:1,dy:0},1440),null);
 let cancelled=0;for(const c of client.pending)c.resolve=()=>cancelled++;client.reset();assert.equal(cancelled,12);assert.equal(client.pending.length,0);
 client.receive({...hub.packet(-1),frame:99});const restarted=setup();assert.ok(client.receive(restarted.hub.packet(-1)));assert.equal(client.frame,0);
});
test('out-of-order updates do not roll back the map; missing patches request resynchronization',()=>{
 const {w,hub}=setup(),client=new Client();const initial=hub.packet(-1);client.receive(initial);w.paint(w.pawns[0],2);hub.refresh();const first=hub.packet(0);client.receive(first);client.receive(initial);assert.equal(client.view(0).cells[1010],2);
 const corrupt={frame:4,patches:[{from:3,to:4,time:Date.now(),cells:[[1010,6]]}]};assert.equal(client.receive(corrupt),false);assert.equal(client.needsResync,true);assert.equal(client.view(0).cells[1010],2);
 client.receive(hub.packet(-1));assert.equal(client.needsResync,false);
});
