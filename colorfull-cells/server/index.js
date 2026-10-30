import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {randomBytes} from 'node:crypto';
import {World} from './world.js';
import {WorldStore} from './world-store.js';
import {WorldStream,executeCommand,enqueueCommands} from './sync.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=process.env.DATA_DIR||path.join(root,'data');
let store=dataDir;
try{fs.mkdirSync(store,{recursive:true});fs.accessSync(store,fs.constants.W_OK);}catch{store=path.join(os.tmpdir(),'colorfull-cells');fs.mkdirSync(store,{recursive:true});console.warn('Using temporary world storage; mount DATA_DIR for durable container restarts.');}
const persistence=new WorldStore(store,{seedFile:process.env.WORLD_SEED==='none'?null:path.join(root,'server','initial-world.json.gz')});
const loaded=await persistence.load();
if(loaded?.recovered)console.warn('Map restored from '+loaded.source);
const world=new World(loaded?.world),sessions=new Map(),joins=new Map();
const stream=new WorldStream(world),watchers=new Set();
async function persist(forceBackup=false){try{return await persistence.save(world.save(),{forceBackup});}catch(e){console.error('World save failed:',e.message);throw e;}}
await persist(!loaded||loaded.recovered);
function releaseSession(token){const s=sessions.get(token);if(!s)return;world.pawns[s.id].bot=true;sessions.delete(token);world.revision++;s.presence?.end();}
function expire(){const now=Date.now();for(const [token,s]of sessions)if(now-s.seen>10000){releaseSession(token);}for(const [ip,v]of joins)if(now-v.at>60000)joins.delete(ip);}
setInterval(()=>{if(!stopping){expire();world.tick();}},650);setInterval(()=>{if(!stopping)persist().catch(()=>{});},5000);
function writePacket(res,packet){if(res.destroyed)return false;if(res.writableLength>131072){res.destroy();return false;}return res.write('data: '+JSON.stringify(packet)+'\n\n');}
function broadcast(){
  stream.refresh();
  for(const s of sessions.values())if(s.presence&&s.protocol===2&&s.cursor!==stream.frame){writePacket(s.presence,stream.packet(s.cursor,s));s.cursor=stream.frame;}
  for(const viewer of watchers)if(viewer.cursor!==stream.frame){writePacket(viewer.res,stream.packet(viewer.cursor));viewer.cursor=stream.frame;}
}
setInterval(()=>{
  if(stopping)return;
  for(const s of sessions.values())if(s.queue?.length){
    const c=s.queue.shift(),before=new Set(world.effects.map(e=>e.id));
    const result=executeCommand(world,world.pawns[s.id],c);s.seq=c.seq;
    for(const e of world.effects)if(!before.has(e.id))e.command={pawn:s.id,seq:c.seq};
    s.results.push({seq:c.seq,...result});s.results=s.results.slice(-32);
    stream.refresh();
    if(s.presence){writePacket(s.presence,stream.packet(s.cursor,s));s.cursor=stream.frame;}
  }
  broadcast();
},120);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const api=url.pathname.includes('/api/');
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data));};
  if(api){
    res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
    const route=url.pathname.slice(url.pathname.lastIndexOf('/api/'));
    try{
      if(route==='/api/health')return send(200,{ok:true});
      let body={};
      if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>8192)return send(413,{error:'payload'});}try{body=JSON.parse(raw||'{}');}catch{return send(400,{error:'json'});}}
      expire();
      if(route==='/api/join'&&req.method==='POST'){
        const ip=req.socket.remoteAddress,v=joins.get(ip)||{at:Date.now(),n:0};v.n++;joins.set(ip,v);if(v.n>40)return send(429,{error:'rate'});
        const p=world.pawns.find(p=>p.bot);if(!p)return send(409,{error:'full'});
        p.bot=false;const token=randomBytes(24).toString('hex');sessions.set(token,{id:p.id,seen:Date.now(),last:0,seq:0,received:0,queue:[],results:[],protocol:body.protocol===2?2:1,cursor:-1});world.revision++;
        stream.refresh();return send(200,{token,id:p.id,...stream.packet(-1,sessions.get(token))});
      }
      if(route==='/api/watch'&&req.method==='POST'){stream.refresh();return send(200,body.protocol===2?stream.packet(body.cursor):{world:world.snapshot()});}
      if(route==='/api/watch-stream'&&req.method==='POST'){
        stream.refresh();res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});
        const viewer={res,cursor:stream.frame};watchers.add(viewer);writePacket(res,stream.packet(body.cursor));
        const pulse=setInterval(()=>res.write(': heartbeat\n\n'),1500);
        res.on('close',()=>{clearInterval(pulse);watchers.delete(viewer);});return;
      }
      const token=typeof body?.session==='string'?body.session:String(req.headers.authorization||'').replace(/^Bearer /,''),s=sessions.get(token);
      if(!s)return send(401,{error:'session'});s.seen=Date.now();
      if(route==='/api/presence'&&req.method==='POST'){
        const previous=s.presence;s.presence=res;previous?.end();
        res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no'});
        if(s.protocol===2){stream.refresh();writePacket(res,stream.packet(body.cursor,s));s.cursor=stream.frame;}else res.write('data: connected\n\n');
        const pulse=setInterval(()=>res.write(': heartbeat\n\n'),1500);
        res.on('close',()=>{clearInterval(pulse);if(s.presence===res)releaseSession(token);});return;
      }
      if(route==='/api/state'&&['GET','POST'].includes(req.method)){stream.refresh();return send(200,body.protocol===2?stream.packet(body.cursor,s):{world:world.snapshot()});}
      if(route==='/api/ping'&&req.method==='POST')return send(200,{ok:true,ack:s.seq,received:s.received});
      if(route==='/api/commands'&&req.method==='POST'){if(s.protocol!==2)return send(400,{error:'protocol'});const result=enqueueCommands(s,body.commands);return send(result.ok?200:409,{...result,ack:s.seq});}
      if(route==='/api/leave'&&req.method==='POST'){releaseSession(token);return send(200,{ok:true});}
      if(route==='/api/action'&&req.method==='POST'){
        if(s.protocol===2)return send(400,{error:'useCommands'});
        if(!Number.isSafeInteger(body.seq)||body.seq<=s.seq)return send(409,{error:'sequence'});
        s.seq=body.seq;if(Date.now()-s.last<120)return send(429,{error:'rate'});s.last=Date.now();
        const p=world.pawns[s.id];
        let result;
        if(body.type==='lock')result=world.lock(p,body.bounds);
        else if(body.type==='unlock')result=world.unlock(p);
        else if(body.type==='paint'&&world.regionAt(p.x,p.y))result={ok:false,error:'lockedCell'};
        else result={ok:body.type==='move'?world.move(p,body.dx,body.dy,Date.now(),body.paintColor??null):body.type==='paint'?world.paint(p,body.color):false};
        const {ok,error}=result;
        return send(ok?200:400,{ok,error,world:world.snapshot()});
      }return send(404,{error:'route'});
    }catch(e){console.error(e.message);if(!res.headersSent)send(500,{error:'server'});return;}
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  const match=url.pathname.match(/(?:^|\/)(assets\/[^/]+|index\.html|favicon\.svg)$/);
  const relative=match?match[1]:url.pathname.endsWith('/')?'index.html':null;
  if(!relative){res.writeHead(404);return res.end();}
  const file=path.join(root,relative);try{const data=fs.readFileSync(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404);res.end();}
});
server.listen(Number(process.env.PORT)||1212,'0.0.0.0',()=>console.log(`Colorfull Cells: http://localhost:${server.address().port}`));
let stopping=false;
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{if(stopping)return;stopping=true;server.close();try{await persist(true);process.exit(0);}catch{process.exit(1);}});


