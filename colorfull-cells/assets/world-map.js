/* Read-only full-world map. Its camera is independent of the pawn camera. */
window.WorldMap = class WorldMap {
  constructor(dialog,canvas,palette){
    this.dialog=dialog;this.canvas=canvas;this.palette=palette;
    this.zoom=1;this.x=50;this.y=50;this.drag=null;this.geometry=null;
    canvas.addEventListener('pointerdown',e=>{this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
    canvas.addEventListener('pointermove',e=>{
      if(!this.drag||this.drag.id!==e.pointerId||!this.geometry)return;
      this.x-=(e.clientX-this.drag.x)/this.geometry.scale;this.y-=(e.clientY-this.drag.y)/this.geometry.scale;
      this.drag.x=e.clientX;this.drag.y=e.clientY;this.clamp();
    });
    const end=()=>{this.drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);dialog.addEventListener('close',end);
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.setZoom(this.zoom*Math.exp(-e.deltaY*.002),e.clientX,e.clientY);},{passive:false});
  }
  clamp(){
    this.x=Math.max(0,Math.min(100,this.x));this.y=Math.max(0,Math.min(100,this.y));
  }
  setZoom(value,clientX,clientY){
    const old=this.zoom,next=Math.max(1,Math.min(12,value));
    if(clientX!==undefined&&this.geometry){const r=this.canvas.getBoundingClientRect(),dx=clientX-r.left-r.width/2,dy=clientY-r.top-r.height/2;this.x+=dx/this.geometry.scale*(1-old/next);this.y+=dy/this.geometry.scale*(1-old/next);}
    this.zoom=next;this.clamp();document.getElementById('map-zoom').textContent=Math.round(this.zoom*100)+'%';
  }
  open(){this.x=50;this.y=50;this.setZoom(1);this.dialog.showModal();}
  draw(world,own){
    if(!this.dialog.open||!world)return;
    const canvas=this.canvas,r=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
    const width=Math.round(r.width*dpr),height=Math.round(r.height*dpr);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    const ctx=canvas.getContext('2d'),scale=Math.min(r.width-24,r.height-24)/100*this.zoom;
    if(scale<=0)return;
    this.geometry={scale};const ox=r.width/2-this.x*scale,oy=r.height/2-this.y*scale;
    ctx.setTransform(dpr,0,0,dpr,0,0);const dark=document.body.classList.contains('dark');ctx.fillStyle=dark?'#111923':'#dce6d2';ctx.fillRect(0,0,r.width,r.height);ctx.fillStyle=dark?'#202c3a':'#f2f5e9';ctx.fillRect(ox,oy,100*scale,100*scale);
    const minX=Math.max(0,Math.floor(-ox/scale)),maxX=Math.min(99,Math.ceil((r.width-ox)/scale)),minY=Math.max(0,Math.floor(-oy/scale)),maxY=Math.min(99,Math.ceil((r.height-oy)/scale));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const c=world.cells[y*100+x];if(c>=0){ctx.fillStyle=this.palette[c]+'ae';ctx.fillRect(ox+x*scale,oy+y*scale,scale,scale);}}
    if(scale>7){ctx.strokeStyle='#79856d55';ctx.lineWidth=.6;ctx.setLineDash([2,3]);ctx.beginPath();for(let x=minX;x<=maxX+1;x++){ctx.moveTo(ox+x*scale,Math.max(0,oy));ctx.lineTo(ox+x*scale,Math.min(r.height,oy+100*scale));}for(let y=minY;y<=maxY+1;y++){ctx.moveTo(Math.max(0,ox),oy+y*scale);ctx.lineTo(Math.min(r.width,ox+100*scale),oy+y*scale);}ctx.stroke();ctx.setLineDash([]);}
    for(const region of world.regions||[]){const x=ox+region.x1*scale,y=oy+region.y1*scale,w=(region.x2-region.x1+1)*scale,h=(region.y2-region.y1+1)*scale;ctx.fillStyle=this.palette[world.pawns[region.owner].color]+'30';ctx.fillRect(x,y,w,h);ctx.lineWidth=3;ctx.strokeStyle='#465044';ctx.strokeRect(x,y,w,h);ctx.lineWidth=2;ctx.strokeStyle=this.palette[world.pawns[region.owner].color];ctx.strokeRect(x,y,w,h);}
    for(const bomb of world.bombs){ctx.fillStyle=this.palette[bomb.color];ctx.strokeStyle='#465044';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ox+(bomb.x+.5)*scale,oy+(bomb.y+.5)*scale,Math.max(2,scale*.2),0,Math.PI*2);ctx.fill();ctx.stroke();}
    for(const p of [...world.pawns].sort((a,b)=>(a.id===own)-(b.id===own))){const x=ox+(p.x+.5)*scale,y=oy+(p.y+.5)*scale,size=Math.max(5,Math.min(11,scale*.38));ctx.fillStyle=this.palette[p.color];ctx.strokeStyle=p.id===own?'#fff':'#465044';ctx.lineWidth=p.id===own?3:1.5;ctx.beginPath();ctx.arc(x,y,size,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#263422';ctx.font='bold '+Math.max(9,size+1)+'px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(p.id+1),x,y);}
  }
};
