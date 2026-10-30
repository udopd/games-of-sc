import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {gzip,gunzip} from 'node:zlib';
import {promisify} from 'node:util';
const zip=promisify(gzip),unzip=promisify(gunzip),MAX=2*1024*1024;
const hash=text=>createHash('sha256').update(text).digest('hex');
const pos=n=>Number.isInteger(n)&&n>=0&&n<100;
export function normalizeMap(v){
 if(!v||![1,2].includes(v.version)||!Array.isArray(v.cells)||v.cells.length!==10000||!v.cells.every(c=>Number.isInteger(c)&&c>=-1&&c<8))throw Error('Invalid map cells/schema');
 if(!Array.isArray(v.pawns)||v.pawns.length!==8||!v.pawns.every(p=>p&&pos(p.x)&&pos(p.y)))throw Error('Invalid map pawns');
 const pawns=v.pawns.map((p,id)=>({id,x:p.x,y:p.y,color:Number.isInteger(p.color)&&p.color>=0&&p.color<8?p.color:id,painted:Number.isSafeInteger(p.painted)&&p.painted>=0?p.painted:0}));
 if(new Set(pawns.map(p=>p.y*100+p.x)).size!==8)throw Error('Overlapping pawns');
 const bombs=v.bombs??[],regions=v.regions??[];
 if(!Array.isArray(bombs)||bombs.length>50||!bombs.every(b=>b&&pos(b.x)&&pos(b.y)&&Number.isInteger(b.color)&&b.color>=0&&b.color<8))throw Error('Invalid bombs');
 if(!Array.isArray(regions)||regions.length>10000||!regions.every(r=>r&&Number.isInteger(r.owner)&&r.owner>=0&&r.owner<8&&[r.x1,r.y1,r.x2,r.y2].every(pos)&&r.x1<=r.x2&&r.y1<=r.y2))throw Error('Invalid regions');
 return {version:2,cells:v.cells.slice(),pawns,bombs:bombs.map(({x,y,color})=>({x,y,color})),regions:regions.map(({id,owner,x1,y1,x2,y2})=>({id,owner,x1,y1,x2,y2}))};
}
export class WorldStore {
 constructor(directory,{seedFile=null,keep=6,backupInterval=60000,now=Date.now}={}){
  this.directory=path.resolve(directory);this.file=path.join(this.directory,'world.json');this.backups=path.join(this.directory,'backups');this.seedFile=seedFile;this.keep=Math.max(1,Math.min(24,keep));this.interval=backupInterval;this.now=now;this.lastHash=null;this.backupHash=null;this.backupAt=-Infinity;this.stamp=0;this.pending=null;this.running=false;this.waiters=[];
 }
 async read(file){if((await fs.stat(file)).size>MAX)throw Error('Map exceeds size limit');return fs.readFile(file);}
 async unpack(file){
  const raw=await unzip(await this.read(file),{maxOutputLength:MAX}),v=JSON.parse(raw.toString('utf8'));
  if(v.format!==1||hash(JSON.stringify(v.world))!==v.checksum)throw Error('Backup checksum mismatch');
  const world=normalizeMap(v.world);return {world,hash:hash(JSON.stringify(world)),savedAt:v.savedAt};
 }
 async entries(){try{return (await fs.readdir(this.backups)).filter(n=>/^world-\d+-[a-f0-9-]+\.json\.gz$/.test(n)).sort().reverse();}catch(e){if(e.code==='ENOENT')return [];throw e;}}
 async load(){
  await fs.mkdir(this.directory,{recursive:true});let primary,error,backup;
  try{primary=normalizeMap(JSON.parse((await this.read(this.file)).toString('utf8').replace(/^\uFEFF/,'')));}catch(e){error=e;}
  const entries=await this.entries();if(entries.length)this.stamp=Number(entries[0].split('-')[1]);
  for(const name of entries){try{backup={...(await this.unpack(path.join(this.backups,name))),source:path.join(this.backups,name)};break;}catch{}}
  if(backup){this.backupHash=backup.hash;this.backupAt=(await fs.stat(backup.source)).mtimeMs;}
  if(primary){this.lastHash=hash(JSON.stringify(primary));return {world:primary,source:this.file,recovered:false};}
  if(error?.code!=='ENOENT'){const dir=path.join(this.directory,'recovery');await fs.mkdir(dir,{recursive:true});await fs.copyFile(this.file,path.join(dir,'world-invalid-'+this.now()+'-'+randomUUID()+'.json')).catch(()=>{});}
  if(backup)return {world:backup.world,source:backup.source,recovered:true};
  if(error?.code!=='ENOENT'||entries.length)throw Error('Map damaged; no valid backup. Original files preserved.');
  if(this.seedFile){try{return {...(await this.unpack(this.seedFile)),source:this.seedFile,recovered:true};}catch(e){if(e.code!=='ENOENT')throw e;}}
  return null;
 }
 async atomic(file,bytes){
  await fs.mkdir(path.dirname(file),{recursive:true});const tmp=file+'.tmp-'+randomUUID();let handle;
  try{handle=await fs.open(tmp,'wx');await handle.writeFile(bytes);await handle.sync();await handle.close();handle=null;await fs.rename(tmp,file);}
  finally{await handle?.close();await fs.unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 }
 async encoded(world){return zip(JSON.stringify({format:1,savedAt:this.now(),checksum:hash(JSON.stringify(world)),world}),{level:3});}
 async backup(world){
  const normalized=normalizeMap(world),digest=hash(JSON.stringify(normalized));if(digest===this.backupHash)return null;
  this.stamp=Math.max(this.now(),this.stamp+1);const file=path.join(this.backups,'world-'+String(this.stamp).padStart(13,'0')+'-'+randomUUID()+'.json.gz');await this.atomic(file,await this.encoded(normalized));this.backupHash=digest;this.backupAt=this.now();
  for(const name of (await this.entries()).slice(this.keep))await fs.unlink(path.join(this.backups,name));return file;
 }
 save(world,{forceBackup=false}={}){
  this.pending={snapshot:normalizeMap(world),forceBackup:forceBackup||this.pending?.forceBackup||false};const promise=new Promise((resolve,reject)=>this.waiters.push({resolve,reject}));if(!this.running)this.drain();return promise;
 }
 async drain(){
  this.running=true;
  while(this.pending){const job=this.pending,waiters=this.waiters;this.pending=null;this.waiters=[];
   try{const text=JSON.stringify(job.snapshot),digest=hash(text),changed=digest!==this.lastHash;
    if(changed){await this.atomic(this.file,text);this.lastHash=digest;}
    if(job.forceBackup||digest!==this.backupHash&&this.now()-this.backupAt>=this.interval)await this.backup(job.snapshot);
    for(const w of waiters)w.resolve({changed});
   }catch(e){for(const w of waiters)w.reject(e);}
  }this.running=false;
 }
 async exportSeed(world,file){await this.atomic(file,await this.encoded(normalizeMap(world)));return file;}
}
