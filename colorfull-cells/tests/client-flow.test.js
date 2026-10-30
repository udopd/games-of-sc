import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {World} from '../server/world.js';
import {WorldStream,executeCommand} from '../server/sync.js';
class Element {
 constructor(id=''){this.id=id;this.children=[];this.style={};this.dataset={};this.attrs={};this.hidden=id==='stats-panel';this.inert=false;this.open=false;this.clientWidth=800;this.clientHeight=600;this.classList={toggle(){},add(){},remove(){}};}
 append(...nodes){for(const node of nodes){if(node.parent)node.parent.children=node.parent.children.filter(c=>c!==node);node.parent=this;this.children.push(node);}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 setAttribute(k,v){this.attrs[k]=String(v);}
 removeAttribute(){}
 addEventListener(){}
 getContext(){return new Proxy({},{get:()=>()=>{},set:()=>true});}
 getBoundingClientRect(){return {width:800,height:600,left:0,top:0,right:800,bottom:600};}
 cloneNode(){const e=new Element();e.style={...this.style};e.textContent=this.textContent;return e;}
 contains(){return false;}
 focus(){}
}
test('actual client action updates pawn and paint before HTTP reply, then consumes authoritative acknowledgement once',async()=>{
 const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 const body=new Element();body.insertBefore=(node)=>body.append(node);
 const document={body,hidden:false,documentElement:{},getElementById:el,createElement:()=>new Element(),querySelectorAll:q=>q==='.swatch'?el('palette').children:[],addEventListener(){}};
 const window={addEventListener(){}};window.parent=window;
 let clock=0,completeRequest,wire;
 const context=vm.createContext({window,document,location:{href:'http://localhost/',search:''},navigator:{language:'ru'},matchMedia:q=>({matches:q.includes('801'),addEventListener(){}}),performance:{now:()=>clock},URL,URLSearchParams,AbortController,TextDecoder,structuredClone,Intl,setTimeout,clearTimeout,requestAnimationFrame(){},Platform:{preferences:{color:3,sound:false},status:'local',save(){},track(){}},CellEffects:class{burst(){}clear(){}},WorldMap:class{},fetch:async(url,options)=>{wire=JSON.parse(options.body);return new Promise(resolve=>completeRequest=()=>resolve({ok:true,json:async()=>({ok:true,received:1})}));}});
 vm.runInContext(fs.readFileSync(new URL('../assets/sync-client.js',import.meta.url),'utf8'),context);context.CellSync=window.CellSync;
 let source=fs.readFileSync(new URL('../assets/game.js',import.meta.url),'utf8');source=source.replace('}start();','}');
 const marker=source.lastIndexOf('})();');
 source=source.slice(0,marker)+`window.testClient={setup(packet){id=0;token='test';joined=true;sound=false;sync.reset();acceptPacket(packet);},action,packet:acceptPacket,held(value){paintHeld=value;},read(){return {x:world.pawns[0].x,y:world.pawns[0].y,cells:world.cells.slice(),pending:sync.pending.length};}};`+source.slice(marker);
 vm.runInContext(source,context);
 const w=new World();w.pawns[0].x=10;w.pawns[0].y=10;w.bombs=[];const hub=new WorldStream(w);
 window.testClient.setup(hub.packet(-1));window.testClient.held(true);
 const confirmation=window.testClient.action('move',{dx:1,dy:0});
 assert.equal(window.testClient.read().x,11);assert.equal(window.testClient.read().cells[1011],6);assert.equal(w.pawns[0].x,10);assert.equal(wire.commands[0].paintColor,6);
 // Server simulation is advanced only after local feedback has been verified.
 clock=800;const result=executeCommand(w,w.pawns[0],wire.commands[0]);hub.refresh();window.testClient.packet(hub.packet(0,{seq:1,received:1,results:[{seq:1,...result}]}));
 assert.equal(await confirmation,true);assert.equal(window.testClient.read().pending,0);assert.equal(window.testClient.read().x,11);
 completeRequest();await new Promise(r=>setImmediate(r));
});
