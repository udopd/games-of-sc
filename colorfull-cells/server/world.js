export const SIZE = 100;
export const LOCK_LIMIT = 256;
export const COLORS = ['#ed729e','#f39b59','#efca58','#9acb7b','#60bbb4','#72a4e3','#ac91d6','#d4a179'];
export class World {
  constructor(saved, random = Math.random) {
    this.random = random;
    this.cells = Array(10000).fill(-1);
    this.regions=[]; this.locks=Array(10000).fill(-1); this.nextRegion=1;
    this.pawns = Array.from({length:8}, (_,id)=>({id,x:46+id%4*2,y:48+Math.floor(id/4)*3,color:id,bot:true,moved:0,painted:0}));
    this.bombs=[]; this.effects=[]; this.effectSequence=0; this.revision=0; this.lastSpawn=0;
    if([1,2].includes(saved?.version) && Array.isArray(saved.cells) && saved.cells.length===10000 && saved.cells.every(c=>Number.isInteger(c)&&c>=-1&&c<8)) {
      this.cells=saved.cells;
      if (Array.isArray(saved.pawns) && saved.pawns.length===8 && saved.pawns.every(p=>Number.isInteger(p.x)&&p.x>=0&&p.x<100&&Number.isInteger(p.y)&&p.y>=0&&p.y<100)) this.pawns=saved.pawns.map((p,id)=>({...this.pawns[id],x:p.x,y:p.y,color:Number.isInteger(p.color)&&p.color>=0&&p.color<8?p.color:id,painted:Number.isSafeInteger(p.painted)&&p.painted>=0?p.painted:0}));
      if(Array.isArray(saved.bombs)) this.bombs=saved.bombs.filter(b=>Number.isInteger(b.x)&&b.x>=0&&b.x<100&&Number.isInteger(b.y)&&b.y>=0&&b.y<100&&Number.isInteger(b.color)&&b.color>=0&&b.color<8).slice(0,50);
    }
    if(saved?.version===2 && Array.isArray(saved.regions)) {
      for(const region of saved.regions.slice(0,10000)) {
        if(Number.isInteger(region?.owner)&&region.owner>=0&&region.owner<8)
          this.restoreRegion(this.pawns[region.owner],region);
      }
    }
    if(!this.bombs.length) for(let i=0;i<20;i++) this.spawn();
  }
  restoreRegion(p,r){
    const {x1,y1,x2,y2}=r;
    if(![x1,y1,x2,y2].every(n=>Number.isInteger(n)&&n>=0&&n<100)||x2<x1||y2<y1)return;
    const remaining=LOCK_LIMIT-this.lockedCount(p.id),width=x2-x1+1,area=width*(y2-y1+1);
    if(area<=remaining){this.lock(p,r);return;}
    if(remaining<=0)return;
    const rows=Math.floor(remaining/width),tail=remaining%width;
    if(rows)this.lock(p,{x1,y1,x2,y2:y1+rows-1});
    if(tail)this.lock(p,{x1,y1:y1+rows,x2:x1+tail-1,y2:y1+rows});
  }
  spawn() {
    if(this.bombs.length>=40)return;
    const x=Math.floor(this.random()*100),y=Math.floor(this.random()*100);
    if(this.locks[y*100+x]>=0||this.bombs.some(b=>b.x===x&&b.y===y)||this.pawns.some(p=>p.x===x&&p.y===y))return;
    this.bombs.push({x,y,color:Math.floor(this.random()*8)});this.revision++;
  }
  move(p,dx,dy,now=Date.now(),paintColor=null) {
    if(paintColor!==null&&(!Number.isInteger(paintColor)||paintColor<0||paintColor>7))return false;
    if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)+Math.abs(dy)!==1)return false;
    const x=p.x+dx,y=p.y+dy;
    if(x<0||y<0||x>=100||y>=100||this.pawns.some(q=>q!==p&&q.x===x&&q.y===y))return false;
    p.x=x;p.y=y;p.moved=now;this.revision++;
    const bomb=this.bombs.find(b=>b.x===x&&b.y===y);
    if(bomb){this.bombs=this.bombs.filter(b=>b!==bomb);for(let yy=Math.max(0,y-5);yy<=Math.min(99,y+5);yy++)for(let xx=Math.max(0,x-5);xx<=Math.min(99,x+5);xx++)if((xx-x)**2+(yy-y)**2<=25&&this.locks[yy*100+xx]<0)this.cells[yy*100+xx]=bomb.color;
      this.emitEffect('bomb',bomb.x,bomb.y,bomb.color,now);
    }
    if(paintColor!==null)this.paint(p,paintColor);
    return true;
  }
  paint(p,color){if(this.locks[p.y*100+p.x]>=0)return false;if(!Number.isInteger(color)||color< -1||color>7)return false;this.cells[p.y*100+p.x]=color;if(color>=0){p.color=color;p.painted++;}this.revision++;if(color>=0)this.emitEffect('paint',p.x,p.y,color);return true;}
  emitEffect(type,x,y,color,now=Date.now()){this.effects.push({type,x,y,color,id:now+'-'+(++this.effectSequence),at:now});this.effects=this.effects.slice(-128);}
  regionAt(x,y){return this.regions.find(r=>r.id===this.locks[y*100+x]);}
  lockedCount(owner){return this.regions.filter(r=>r.owner===owner).reduce((sum,r)=>sum+(r.x2-r.x1+1)*(r.y2-r.y1+1),0);}
  lock(p,bounds={}) {
    const {x1,y1,x2,y2}=bounds||{};
    if(![x1,y1,x2,y2].every(n=>Number.isInteger(n)&&n>=0&&n<100)||x2<x1||y2<y1)return {ok:false,error:'invalidArea'};
    const area=(x2-x1+1)*(y2-y1+1);
    if(this.lockedCount(p.id)+area>LOCK_LIMIT)return {ok:false,error:'lockLimit'};
    for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)if(this.locks[y*100+x]>=0)return {ok:false,error:'overlap'};
    const region={id:this.nextRegion++,owner:p.id,x1,y1,x2,y2};
    this.regions.push(region);
    for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)this.locks[y*100+x]=region.id;
    this.revision++;return {ok:true};
  }
  unlock(p) {
    const region=this.regionAt(p.x,p.y);
    if(!region||region.owner!==p.id)return {ok:false,error:'notOwner'};
    for(let y=region.y1;y<=region.y2;y++)for(let x=region.x1;x<=region.x2;x++)this.locks[y*100+x]=-1;
    this.regions=this.regions.filter(r=>r!==region);this.revision++;return {ok:true};
  }
  tick(now=Date.now()) {
    if(now-this.lastSpawn>2500){this.spawn();this.lastSpawn=now;}
    for(const p of this.pawns)if(p.bot&&this.random()<.45){const d=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(this.random()*4)];this.move(p,...d,now);if(this.random()<.7)this.paint(p,p.color);}
    this.effects=this.effects.filter(e=>now-e.at<1400);
  }
  save(){return {version:2,cells:this.cells,pawns:this.pawns,bombs:this.bombs,regions:this.regions};}
  coverage(){const counts=Array(8).fill(0);for(const c of this.cells)if(c>=0)counts[c]++;return {counts,filled:counts.reduce((a,b)=>a+b,0),total:10000};}
  snapshot(){return {lockLimit:LOCK_LIMIT,coverage:this.coverage(),...this.save(),effects:this.effects,revision:this.revision,time:Date.now()};}
}
