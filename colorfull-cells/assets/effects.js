/* Short-lived effects use board coordinates, so they follow the camera and zoom. */
window.CellEffects = class CellEffects {
  constructor({reduced=false,random=Math.random}={}) {
    this.reduced=reduced;this.random=random;this.particles=[];this.rings=[];this.shakes=[];
  }
  burst(event,now,palette,viewport) {
    const bomb=event.type==='bomb'||!event.type;
    const x=event.x+.5,y=event.y+.5;
    if(Math.abs(x-viewport.x)>viewport.width/2+10||Math.abs(y-viewport.y)>viewport.height/2+10)return;
    const count=this.reduced?(bomb?16:4):(bomb?360:28);
    for(let i=0;i<count;i++){
      const angle=i/count*Math.PI*2+(this.random()-.5)*.2;
      const speed=bomb?2+this.random()*9:.5+this.random()*1.8;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        born:now,life:this.reduced?240:bomb?750+this.random()*600:350+this.random()*250,
        size:bomb?.06+this.random()*.16:.04+this.random()*.09,
        spin:(this.random()-.5)*12,angle:this.random()*Math.PI,
        color:palette[event.color]||'#ffffff',light:this.random()<.16});
    }
    this.particles=this.particles.slice(-1800);
    if(bomb){
      this.rings.push({x,y,born:now,color:palette[event.color]});this.rings=this.rings.slice(-12);
      const distance=Math.hypot(x-viewport.x,y-viewport.y);
      if(!this.reduced&&distance<18){this.shakes.push({born:now,strength:14*Math.max(.15,1-distance/18)});this.shakes=this.shakes.slice(-8);}
    }
  }
  shake(now){
    this.shakes=this.shakes.filter(s=>now-s.born<600);
    let x=0,y=0;
    for(const s of this.shakes){const t=Math.max(0,now-s.born),amplitude=s.strength*(1-t/600)**2;x+=Math.sin(t*.073+1.2)*amplitude;y+=Math.cos(t*.091)*amplitude*.7;}
    return {x:Math.max(-20,Math.min(20,x)),y:Math.max(-16,Math.min(16,y))};
  }
  draw(ctx,now,ox,oy,cell){
    this.particles=this.particles.filter(p=>now-p.born<p.life);
    this.rings=this.rings.filter(r=>now-r.born<650);
    ctx.save();
    for(const r of this.rings){const t=Math.max(0,now-r.born)/650;ctx.globalAlpha=(1-t)*.7;ctx.strokeStyle=r.color;ctx.lineWidth=3*(1-t)+1;ctx.beginPath();ctx.arc(ox+r.x*cell,oy+r.y*cell,cell*(this.reduced?1:5*t),0,Math.PI*2);ctx.stroke();}
    for(const p of this.particles){
      const elapsed=Math.max(0,now-p.born),t=elapsed/1000,progress=elapsed/p.life;
      const travel=this.reduced?.12:1;
      const x=ox+(p.x+p.vx*t*travel)*cell,y=oy+(p.y+(p.vy*t+1.8*t*t)*travel)*cell;
      const size=Math.max(1,p.size*cell*(1-progress*.5));
      ctx.save();ctx.globalAlpha=Math.min(1,(1-progress)*2);ctx.translate(x,y);ctx.rotate(this.reduced?0:p.angle+p.spin*t);ctx.fillStyle=p.light?'#fffbe5':p.color;ctx.fillRect(-size/2,-size/2,size,size);ctx.restore();
    }
    ctx.restore();
  }
  clear(){this.particles=[];this.rings=[];this.shakes=[];}
};
