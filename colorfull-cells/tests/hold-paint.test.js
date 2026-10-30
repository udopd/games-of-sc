import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../server/world.js';
test('a successful step paints its destination only when a colour is supplied',()=>{
 const w=new World(),p=w.pawns[0];p.x=10;p.y=10;w.bombs=[];
 assert.ok(w.move(p,1,0,Date.now(),4));assert.equal(w.cells[1011],4);assert.equal(w.cells[1010],-1);assert.equal(w.effects.at(-1).type,'paint');
 assert.ok(w.move(p,1,0));assert.equal(w.cells[1012],-1);
});
test('held paint preserves fences, and blocked steps or invalid colours change no cells',()=>{
 const w=new World(),p=w.pawns[0];p.x=10;p.y=10;w.bombs=[];w.cells[1011]=2;w.lock(w.pawns[1],{x1:11,y1:10,x2:11,y2:10});
 assert.ok(w.move(p,1,0,Date.now(),4));assert.equal(w.cells[1011],2);
 assert.equal(w.move(p,2,0,Date.now(),4),false);assert.equal(w.move(p,1,0,Date.now(),99),false);assert.equal(p.x,11);
});
test('bomb triggers before held paint; only the destination receives the chosen brush colour',()=>{
 const w=new World(),p=w.pawns[0];p.x=10;p.y=10;w.bombs=[{x:11,y:10,color:3}];
 assert.ok(w.move(p,1,0,Date.now(),5));assert.equal(w.cells[1011],5);assert.equal(w.cells[1012],3);assert.equal(w.effects.at(-2).type,'bomb');assert.equal(w.effects.at(-1).type,'paint');
});
