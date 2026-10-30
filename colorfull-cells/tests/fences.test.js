import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
const box=(x1,y1,x2,y2)=>({x1,y1,x2,y2});
test('separate areas share a per-pawn inclusive limit; all eight get their own budget',()=>{
 const w=new World(),p=w.pawns[0];
 assert.ok(w.lock(p,box(0,0,7,15)).ok);
 assert.ok(w.lock(p,box(8,0,15,15)).ok);
 assert.equal(w.lockedCount(0),256);
 assert.equal(w.lock(p,box(50,0,50,0)).error,'lockLimit');
 assert.equal(w.lockedCount(0),256);
 assert.ok(w.lock(w.pawns[1],box(20,0,35,15)).ok);
 assert.equal(w.lockedCount(1),256);
});
test('everyone including the owner is blocked from painting and erasing; walking remains allowed',()=>{
 const w=new World(),p=w.pawns[0],q=w.pawns[1];p.x=10;p.y=10;q.x=12;q.y=10;
 w.paint(p,2);assert.ok(w.lock(p,box(10,10,11,10)).ok);
 assert.equal(w.paint(p,3),false);assert.equal(w.paint(p,-1),false);assert.equal(w.cells[1010],2);
 assert.ok(w.move(q,-1,0));assert.equal(w.paint(q,5),false);
 assert.equal(w.unlock(q).error,'notOwner');assert.ok(w.unlock(p).ok);assert.ok(w.paint(p,3));assert.equal(w.lockedCount(0),0);
});
test('bombs skip every protected cell, including the owner triggering a bomb',()=>{
 const w=new World(),p=w.pawns[0];p.x=19;p.y=20;w.cells.fill(4);
 assert.ok(w.lock(p,box(20,20,21,20)).ok);w.bombs=[{x:20,y:20,color:2}];
 assert.ok(w.move(p,1,0));assert.equal(w.cells[2020],4);assert.equal(w.cells[2021],4);assert.equal(w.cells[2022],2);
});
test('overlaps and malformed bounds fail atomically; unlocking only removes the current owned area',()=>{
 const w=new World(),p=w.pawns[0];w.lock(p,box(1,1,3,3));w.lock(p,box(5,5,6,6));
 assert.equal(w.lock(w.pawns[1],box(0,0,2,2)).error,'overlap');assert.equal(w.locks[0],-1);
 for(const b of [box(-1,0,1,1),box(0,0,100,1),box(3,3,2,2),box(0.5,0,1,1),null])assert.equal(w.lock(p,b).error,'invalidArea');
 p.x=2;p.y=2;w.unlock(p);assert.equal(w.lockedCount(0),4);assert.ok(w.regionAt(5,5));assert.equal(w.regionAt(1,1),undefined);
});
test('fences survive restart and pawn-to-bot transition, v1 worlds migrate without losing paint',()=>{
 const w=new World(),p=w.pawns[0];w.lock(p,box(0,0,15,15));p.color=5;
 const r=new World(JSON.parse(JSON.stringify(w.save())));assert.equal(r.lockedCount(0),256);assert.equal(r.regionAt(0,0).owner,0);assert.equal(r.pawns[0].color,5);assert.ok(r.pawns[0].bot);
 const old=w.save();old.version=1;delete old.regions;old.cells[0]=4;const migrated=new World(old);assert.equal(migrated.cells[0],4);assert.equal(migrated.regions.length,0);
});
test('hostile saved regions cannot exceed budgets or overlap other owners',()=>{
 const w=new World();const saved=w.save();saved.regions=[{owner:0,...box(0,0,24,49)},{owner:0,...box(50,0,99,99)},{owner:1,...box(0,0,2,2)},{owner:200,...box(0,0,1,1)}];const r=new World(saved);assert.equal(r.regions.length,2);assert.equal(r.regionAt(5,10).owner,0);assert.equal(r.regionAt(6,10),undefined);assert.equal(r.lockedCount(0),256);
});
