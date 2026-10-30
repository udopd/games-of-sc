import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {World} from '../server/world.js';
const load=name=>{const window={};vm.runInNewContext(fs.readFileSync(new URL('../assets/'+name,import.meta.url),'utf8'),{window,Math});return window;};
const hotkey=load('hotkeys.js').GameHotkeys;
test('shortcuts support physical keys, Russian layout, number row and numpad',()=>{
 for(const event of [{code:'Space',key:' '},{code:'KeyF',key:'а'},{key:'f'}])assert.equal(hotkey(event).type,'paint');
 assert.equal(hotkey({code:'Digit8'}).color,7);assert.equal(hotkey({code:'Numpad1'}).color,0);
 assert.equal(hotkey({code:'KeyQ',key:'й'}).delta,-1);assert.equal(hotkey({code:'KeyR',key:'к'}).delta,1);
 assert.equal(hotkey({code:'KeyE'}).type,'erase');assert.equal(hotkey({code:'KeyW'}),null);
});
test('visible bombs produce hundreds of particles, bounded memory and finite shake; reduced motion has none',()=>{
 const Effects=load('effects.js').CellEffects,palette=Array(8).fill('#abcdef'),view={x:50,y:50,width:20,height:20};
 const fx=new Effects();fx.burst({type:'bomb',x:50,y:50,color:2},0,palette,view);assert.ok(fx.particles.length>=300);assert.ok(Math.abs(fx.shake(0).x)>0);
 for(let i=0;i<20;i++)fx.burst({type:'bomb',x:50,y:50,color:2},0,palette,view);
 assert.ok(fx.particles.length<=1800);assert.equal(fx.shake(1000).x,0);
 const ctx=new Proxy({},{get:()=>()=>{},set:()=>true});fx.draw(ctx,2000,0,0,29);assert.equal(fx.particles.length,0);
 const quiet=new Effects({reduced:true});quiet.burst({type:'bomb',x:50,y:50,color:2},0,palette,view);assert.equal(quiet.shake(0).x,0);assert.ok(quiet.particles.length<30);
});
test('only successful paint creates a paint event; coverage uses all 10000 cells',()=>{
 const w=new World(),p=w.pawns[0];w.paint(p,5);assert.equal(w.effects.at(-1).type,'paint');assert.equal(w.coverage().counts[5],1);assert.equal(w.coverage().total,10000);
 w.lock(p,{x1:p.x,y1:p.y,x2:p.x,y2:p.y});const events=w.effects.length;assert.equal(w.paint(p,1),false);assert.equal(w.effects.length,events);
 w.unlock(p);w.paint(p,-1);assert.equal(w.coverage().filled,0);
});
