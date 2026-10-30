import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../assets/game.js',import.meta.url),'utf8');
function layout(desktop){
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='stats-panel',style:{},scrollHeight:320,attrs:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(){this.style={};},append(child){child.parent=this;},contains(){return false;},focus(){},getBoundingClientRect(){return {top:400,bottom:432,right:300};}});return nodes.get(id);};
 const media={matches:desktop,addEventListener(_,fn){this.change=fn;}};
 const body={insertBefore(child){child.parent=this;}};
 const context=vm.createContext({$:node,matchMedia:()=>media,document:{body,addEventListener(){}},window:{addEventListener(){}},innerWidth:1000,innerHeight:800,paintHeld:false,resetFence(){}});
 vm.runInContext(source.slice(source.indexOf('const desktopLayout='),source.indexOf('function toast(')),context);
 return {node,media,body,context};
}
test('desktop docks visible statistics without blocking game input or closing on outside clicks',()=>{
 const state=layout(true),panel=state.node('stats-panel');
 assert.equal(panel.parent,state.node('desktop-stats'));assert.equal(panel.hidden,false);
 assert.equal(vm.runInContext('statisticsOverlayOpen()',state.context),false);
 vm.runInContext('closeStatistics()',state.context);assert.equal(panel.hidden,false);
});
test('switching screen size moves the same statistics nodes and restores a mobile dropdown',()=>{
 const state=layout(true),panel=state.node('stats-panel');state.media.matches=false;state.media.change();
 assert.equal(panel.parent,state.body);assert.equal(panel.hidden,true);
 state.node('statistics').onclick();assert.equal(panel.hidden,false);assert.equal(vm.runInContext('statisticsOverlayOpen()',state.context),true);
 state.media.matches=true;state.media.change();assert.equal(panel.parent,state.node('desktop-stats'));assert.equal(panel.hidden,false);assert.equal(vm.runInContext('statisticsOverlayOpen()',state.context),false);
});
test('ping uses measured response time; rejected responses do not replace the last valid measurement',async()=>{
 let clock=100,ok=true;
 const context=vm.createContext({performance:{now:()=>clock},AbortController,URL,JSON,setTimeout,clearTimeout,base:new URL('http://example.invalid/'),token:null,pingMs:null,pingAt:0,fetch:async()=>{clock+=37;return {ok,status:500,json:async()=>({error:'server'})};}});
 vm.runInContext(source.slice(source.indexOf('async function request('),source.indexOf('function accept(')),context);
 await vm.runInContext("request('state')",context);assert.equal(context.pingMs,37);
 ok=false;await assert.rejects(vm.runInContext("request('state')",context));assert.equal(context.pingMs,37);
});
