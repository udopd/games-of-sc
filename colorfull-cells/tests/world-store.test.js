import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {gzip,gunzip} from 'node:zlib';
import {promisify} from 'node:util';
import {WorldStore,normalizeMap} from '../server/world-store.js';
import {World} from '../server/world.js';
const dir=()=>fs.mkdtemp(path.join(os.tmpdir(),'cells-backup-'));
const map=()=>new World().save();
test('asynchronous save is atomic, ignores transient state and skips unchanged maps',async()=>{
 const root=await dir(),store=new WorldStore(root),world=map();
 assert.ok((await store.save(world)).changed);const before=await fs.stat(store.file);
 world.pawns[0].bot=!world.pawns[0].bot;world.pawns[0].moved=Date.now();
 assert.equal((await store.save(world)).changed,false);assert.equal((await fs.stat(store.file)).mtimeMs,before.mtimeMs);
 assert.equal((await store.entries()).length,1);assert.ok(!(await fs.readdir(root)).some(n=>n.includes('.tmp-')));
});
test('coalesced saves keep the latest map, never an earlier queued version',async()=>{
 const store=new WorldStore(await dir()),world=map(),tasks=[];
 for(let i=0;i<20;i++){world.cells[0]=i%8;tasks.push(store.save(world));}
 await Promise.all(tasks);assert.equal(JSON.parse(await fs.readFile(store.file,'utf8')).cells[0],3);
});
test('corrupt main file restores the latest valid gzip backup and preserves the broken original',async()=>{
 const root=await dir(),store=new WorldStore(root),world=map();world.cells[123]=6;await store.save(world);
 await fs.writeFile(store.file,'broken json');const restored=new WorldStore(root),loaded=await restored.load();
 assert.ok(loaded.recovered);assert.equal(loaded.world.cells[123],6);assert.equal((await fs.readdir(path.join(root,'recovery'))).length,1);
 await restored.save(loaded.world);assert.equal(JSON.parse(await fs.readFile(store.file,'utf8')).cells[123],6);
});
test('corrupt latest backup is skipped, checksums are checked and history has bounded retention',async()=>{
 const root=await dir(),store=new WorldStore(root,{keep:3}),world=map();
 for(let i=0;i<6;i++){world.cells[0]=i;await store.save(world,{forceBackup:true});}
 assert.equal((await store.entries()).length,3);const newest=path.join(store.backups,(await store.entries())[0]);
 const envelope=JSON.parse((await promisify(gunzip)(await fs.readFile(newest))).toString());envelope.world.cells[0]=7;
 await fs.writeFile(newest,await promisify(gzip)(JSON.stringify(envelope)));await fs.writeFile(store.file,'{}');
 const loaded=await new WorldStore(root).load();assert.equal(loaded.world.cells[0],4);
});
test('seed loads only into empty storage; an existing world always wins',async()=>{
 const root=await dir(),seed=path.join(await dir(),'initial.json.gz'),world=map(),exporter=new WorldStore(await dir());world.cells[50]=5;
 await exporter.exportSeed(world,seed);const store=new WorldStore(root,{seedFile:seed});const loaded=await store.load();assert.equal(loaded.world.cells[50],5);
 world.cells[50]=2;await store.save(world);assert.equal((await new WorldStore(root,{seedFile:seed}).load()).world.cells[50],2);
});
test('unrecoverable damaged storage never silently starts a blank map or overwrites evidence',async()=>{
 const root=await dir();await fs.writeFile(path.join(root,'world.json'),'bad');await assert.rejects(new WorldStore(root).load(),/no valid backup/);
 assert.equal(await fs.readFile(path.join(root,'world.json'),'utf8'),'bad');
});
test('old plain snapshots load; invalid cells and overlapping pawns are rejected',async()=>{
 const root=await dir(),world=map();world.version=1;await fs.writeFile(path.join(root,'world.json'),JSON.stringify(world));assert.ok(await new WorldStore(root).load());
 world.cells[5]=20;assert.throws(()=>normalizeMap(world));world.cells[5]=-1;world.pawns[1].x=world.pawns[0].x;world.pawns[1].y=world.pawns[0].y;assert.throws(()=>normalizeMap(world),/Overlapping/);
});
test('failed saves can be retried, and unchanged final state receives a scheduled backup',async()=>{
 let now=Date.now();const store=new WorldStore(await dir(),{now:()=>now}),world=map();await store.save(world);
 world.cells[0]=1;now+=1000;await store.save(world);assert.equal((await store.entries()).length,1);
 now+=60000;await store.save(world);assert.equal((await store.entries()).length,2);
 const real=store.atomic.bind(store);let fail=true;store.atomic=async(...args)=>{if(fail){fail=false;throw Error('disk');}return real(...args);};
 world.cells[1]=2;await assert.rejects(store.save(world),/disk/);await store.save(world);assert.equal(JSON.parse(await fs.readFile(store.file,'utf8')).cells[1],2);
});
test('loading a valid map does not create new bombs that were absent in the saved state',async()=>{
 const world=map();world.bombs=[];const store=new WorldStore(await dir());await store.save(world);
 const loaded=await new WorldStore(store.directory).load();assert.equal(new World(loaded.world).bombs.length,0);
});
