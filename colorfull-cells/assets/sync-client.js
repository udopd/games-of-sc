/* Authoritative base + a bounded queue replayed locally after each confirmation. */
window.CellSync = class CellSync {
  constructor(){this.reset();}
  reset(){for(const c of this.pending||[])c.resolve?.({ok:false,error:'disconnected'});this.epoch=null;this.base=null;this.frame=-1;this.ack=0;this.received=0;this.next=0;this.pending=[];this.lastInput=-Infinity;this.needsResync=false;this.predictedEffects=new Set();}
  receive(packet){
    if(this.epoch&&packet.epoch&&packet.epoch!==this.epoch)this.reset();
    if(packet.epoch)this.epoch=packet.epoch;
    if(packet.world&&packet.frame>=this.frame){this.base=structuredClone(packet.world);this.frame=packet.frame;this.needsResync=false;}
    if(!this.base)return false;
    for(const p of packet.patches||[]){
      if(p.to<=this.frame)continue;
      if(p.from!==this.frame){this.needsResync=true;return false;}
      for(const [i,color]of p.cells||[])this.base.cells[i]=color;
      for(const key of ['pawns','regions','bombs','coverage'])if(p[key]!==undefined)this.base[key]=structuredClone(p[key]);
      if(p.effects){const seen=new Set(this.base.effects.map(e=>e.id));this.base.effects.push(...p.effects.filter(e=>!seen.has(e.id)));}
      this.frame=p.to;this.base.time=p.time;
    }
    this.base.time=Math.max(this.base.time,packet.time||0);this.base.effects=this.base.effects.filter(e=>this.base.time-e.at<1400).slice(-128);
    this.received=Math.max(this.received,packet.received||0);this.ack=Math.max(this.ack,packet.ack||0);
    const results=new Map((packet.results||[]).map(r=>[r.seq,r]));
    const done=this.pending.filter(c=>c.seq<=this.ack);this.pending=this.pending.filter(c=>c.seq>this.ack);
    for(const c of done)c.resolve?.(results.get(c.seq)||{ok:true,seq:c.seq});
    return true;
  }
  regionAt(view,x,y){return (view.regions||[]).find(r=>x>=r.x1&&x<=r.x2&&y>=r.y1&&y<=r.y2);}
  predict(view,id,c){
    const p=view.pawns[id];if(!p)return false;
    const paint=color=>{if(!Number.isInteger(color)||color< -1||color>7||this.regionAt(view,p.x,p.y))return false;view.cells[p.y*100+p.x]=color;if(color>=0){p.color=color;p.painted++;}return true;};
    if(c.type==='move'){
      if(!Number.isInteger(c.dx)||!Number.isInteger(c.dy)||Math.abs(c.dx)+Math.abs(c.dy)!==1)return false;
      const x=p.x+c.dx,y=p.y+c.dy;
      if(x<0||x>99||y<0||y>99||view.pawns.some(q=>q.id!==id&&q.x===x&&q.y===y))return false;
      p.x=x;p.y=y;if(c.paintColor!==undefined)paint(c.paintColor);return true;
    }
    if(c.type==='paint')return paint(c.color);
    return true; // Fences and bomb explosions are only applied after server confirmation.
  }
  view(id){if(!this.base)return null;const view={...this.base,cells:this.base.cells.slice(),pawns:this.base.pawns.map(p=>({...p}))};for(const c of this.pending)this.predict(view,id,c);return view;}
  enqueue(id,type,args,now){
    if(!this.base||this.needsResync||this.pending.length>=12||now-this.lastInput<120)return null;
    if(this.pending.length&&now-this.pending[0].at>2500)return null;
    const c={type,...structuredClone(args),seq:this.next+1,at:now};
    if(!this.predict(this.view(id),id,c))return null;
    this.next++;this.lastInput=now;this.pending.push(c);return c;
  }
  batch(){return this.pending.filter(c=>c.seq>this.received).map(({resolve,at,...wire})=>wire);}
};
