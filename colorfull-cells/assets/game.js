(()=>{
'use strict';
const $=id=>document.getElementById(id), colors=['#ed729e','#f39b59','#efca58','#9acb7b','#60bbb4','#72a4e3','#ac91d6','#d4a179'];
const words={ru:{loading:'Готовим общий холст…',menu:'Меню',eyebrow:'ОБЩИЙ МИР · БЕСКОНЕЧНОЕ ТВОРЧЕСТВО',tagline:'Маленькая пешка. Большой общий холст.',live:'МИР ЖИВЁТ',boardHint:'Каждая клетка — чья-то история',yourPawn:'ВАША ПЕШКА',painted:'Закрашено вами',palette:'Палитра',paint:'Закрасить клетку',erase:'⌫ Стереть клетку',paintHint:'Пробел — цвет · E — ластик',residents:'Жители мира',botsHint:'Боты рисуют, пока вас нет. Друзьям всегда найдётся место.',bombTitle:'Осторожно, цветной взрыв!',bombText:'Наступите на бомбу — и цвет разлетится на 5 клеток вокруг.',moveHint:'или WASD — шаг на одну клетку',footer:'Никакой спешки. Просто оставьте свой цвет.',how:'Оставьте свой след',rules:'Перемещайтесь стрелками, WASD, свайпами или касанием соседней клетки. Выбирайте цвет и нажимайте пробел, чтобы закрасить клетку под пешкой. E стирает цвет. Бомба красит круг радиусом 5 клеток. В мире всегда 8 пешек: свободные места занимают самостоятельные боты.',favorite:'♡ В избранное',unfavorite:'♥ В избранном',sync:'Синхронизировать настройки',leave:'Выйти из мира',join:'Вернуться в мир',online:'● На связи',offline:'Переподключение…',full:'Мир заполнен. Ожидаем место…',guest:'Гость',you:'Вы',bot:'Бот',human:'Игрок',soundOn:'♫ Звук включён',soundOff:'♫ Звук выключен',error:'Не удалось выполнить действие',signIn:'Войдите через SUPER CUBE',local:'Настройки на устройстве',cloud:'Настройки в облаке',saveError:'Облако недоступно · настройки локально',watch:'Наблюдение за миром',color:'Цвет',board:'Поле: стрелки — шаг, пробел — краска',center:'К пешке'},en:{loading:'Preparing the shared canvas…',menu:'Menu',eyebrow:'SHARED WORLD · ENDLESS CREATIVITY',tagline:'A little pawn. A big shared canvas.',live:'WORLD IS ALIVE',boardHint:'Every cell has a story',yourPawn:'YOUR PAWN',painted:'Painted by you',palette:'Palette',paint:'Paint this cell',erase:'⌫ Erase this cell',paintHint:'Space — paint · E — erase',residents:'World residents',botsHint:'Bots paint while you are away. There is always room for friends.',bombTitle:'A little burst of colour!',bombText:'Step on a bomb to paint everything within 5 cells.',moveHint:'or WASD — move one cell',footer:'No rush. Just leave a little colour.',how:'Leave your mark',rules:'Move with arrows, WASD, swipes or by tapping a neighbouring cell. Pick a colour and press Space to paint beneath your pawn. E erases. Bombs paint a circle with a radius of 5 cells. Eight pawns always inhabit the world; independent bots fill empty places.',favorite:'♡ Add to favourites',unfavorite:'♥ In favourites',sync:'Sync preferences',leave:'Leave world',join:'Rejoin world',online:'● Connected',offline:'Reconnecting…',full:'World is full. Waiting for a place…',guest:'Guest',you:'You',bot:'Bot',human:'Player',soundOn:'♫ Sound on',soundOff:'♫ Sound off',error:'Could not complete action',signIn:'Sign in through SUPER CUBE',local:'Preferences on this device',cloud:'Preferences in the cloud',saveError:'Cloud unavailable · saved locally',watch:'Watching the world',color:'Colour',board:'Board: arrows to move, Space to paint',center:'Find my pawn'}};
Object.assign(words.ru,{fence:'Оградить',unfence:'Снять забор',cancelFence:'Отмена',firstCorner:'Выберите первый угол области',secondCorner:'Выберите второй угол ·',lockedCell:'Клетка защищена забором — сначала снимите его',lockLimit:'Лимит пешки: 256 защищённых клеток',overlap:'Область пересекается с установленным забором',notOwner:'Встаньте в свою область, чтобы снять забор',invalidArea:'Выберите область внутри поля',fenced:'Область защищена',unfenced:'Забор снят',fenceRules:' Заборы: нажмите «Оградить» и выберите два угла прямоугольника. До 256 клеток на пешку суммарно. Защита действует даже против владельца и бомб. Для снятия встаньте в свою область и нажмите «Снять забор». Проход свободный.'});
Object.assign(words.en,{fence:'Fence area',unfence:'Remove fence',cancelFence:'Cancel',firstCorner:'Choose the first corner',secondCorner:'Choose the second corner ·',lockedCell:'This cell is protected — remove its fence first',lockLimit:'Pawn limit: 256 protected cells',overlap:'This area overlaps an existing fence',notOwner:'Stand inside your own area to remove its fence',invalidArea:'Choose an area inside the board',fenced:'Area protected',unfenced:'Fence removed',fenceRules:' Fences: select Fence area, then choose two rectangle corners. Each pawn can protect up to 256 cells in total. Protection blocks even the owner and bombs. Stand inside your own area and select Remove fence to unlock it. Movement stays unrestricted.'});
Object.assign(words.ru,{mapTitle:'Карта мира',mapHint:'Перетаскивайте карту · колёсико — масштаб',mapReset:'Всё поле',openMap:'Открыть карту',closeMap:'Закрыть карту'});
Object.assign(words.en,{mapTitle:'World map',mapHint:'Drag to pan · scroll to zoom',mapReset:'Whole board',openMap:'Open map',closeMap:'Close map'});
Object.assign(words.ru,{statistics:'Статистика',movement:'Движение',movementHint:'Стрелки / WASD · Пробел + шаг — рисовать'});
Object.assign(words.en,{statistics:'Statistics',movement:'Movement',movementHint:'Arrows / WASD · Space + move to paint'});
words.ru.ranking='Рейтинг цветов';words.en.ranking='Colour ranking';
words.ru.paintHint='Пробел / F — краска · E — ластик · 1–8 — цвета · Q/R — сменить';
words.en.paintHint='Space / F — paint · E — erase · 1–8 — colours · Q/R — cycle';
words.ru.rules+=' Удерживайте пробел при движении, чтобы красить каждую новую клетку. Клавиши: пробел или F — закрасить, 1–8 — выбрать цвет, Q/R или [/] — предыдущий/следующий цвет, E — ластик. Работает и в русской раскладке.';
words.en.rules+=' Hold Space while moving to paint each destination cell. Shortcuts: Space or F to paint, 1–8 to select a colour, Q/R or [/] to cycle colours, E to erase.';
words.ru.rules+=words.ru.fenceRules;words.en.rules+=words.en.fenceRules;
let presenceController=null,joining=false,paintHeld=false,presenceOpen=false,lastStreamAt=0,lastHeartbeat=0,nextJoin=0,sending=false;
const sync=new CellSync();
let fenceMode=false,anchor=null,hover=null;
let lang='ru' ,theme='light',favorite=false,sound=true,color=6,world=null,id=null,token=null,seq=0,busy=false,joined=false,leaving=false,network='offline',cell=29,view={x:50,y:50},geo={},lastWorld=0,poses=new Map(),seenEffects=new Set(),audio,toastTimer;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
words.ru.slowConnection='Ожидаем связь с сервером…';words.en.slowConnection='Waiting for the server…';
const effects=new CellEffects({reduced});
const mapView=new WorldMap($('map-dialog'),$('map-view'),colors);
$('minimap-trigger').onclick=()=>{closeStatistics();paintHeld=false;resetFence();effects.clear();mapView.open();};
$('map-close').onclick=()=>{$('map-dialog').close();$('minimap-trigger').focus();};
$('map-out').onclick=()=>mapView.setZoom(mapView.zoom/1.35);
$('map-in').onclick=()=>mapView.setZoom(mapView.zoom*1.35);
$('map-reset').onclick=()=>{mapView.x=mapView.y=50;mapView.setZoom(1);};
$('map-dialog').addEventListener('close',()=>{$('minimap-trigger').focus();});
const tr=k=>words[lang][k]||k;
let pingMs=null,pingAt=0;
const desktopLayout=matchMedia('(min-width: 801px)');
const statsPanel=$('stats-panel');
function positionStatistics(){
  if(desktopLayout.matches||statsPanel.hidden)return;
  const rect=$('statistics').getBoundingClientRect(),width=Math.min(320,innerWidth-24);
  const below=innerHeight-rect.bottom-12,above=rect.top-12,up=below<300&&above>below;
  const maxHeight=Math.max(80,up?above:below);
  statsPanel.style.width=width+'px';statsPanel.style.maxHeight=maxHeight+'px';
  statsPanel.style.left=Math.max(12,Math.min(innerWidth-width-12,rect.right-width))+'px';
  statsPanel.style.top=(up?Math.max(12,rect.top-8-Math.min(statsPanel.scrollHeight,maxHeight)):rect.bottom+8)+'px';
}
function closeStatistics(restoreFocus=false){if(desktopLayout.matches)return;statsPanel.hidden=true;$('statistics').setAttribute('aria-expanded','false');if(restoreFocus)$('statistics').focus();}
$('statistics').onclick=()=>{paintHeld=false;if(statsPanel.hidden){resetFence();statsPanel.hidden=false;$('statistics').setAttribute('aria-expanded','true');positionStatistics();}else closeStatistics();};
document.addEventListener('pointerdown',e=>{if(statisticsOverlayOpen()&&!statsPanel.contains(e.target)&&!$('statistics').contains(e.target))closeStatistics();});
window.addEventListener('resize',positionStatistics);
function statisticsOverlayOpen(){return !desktopLayout.matches&&!statsPanel.hidden;}
function syncStatisticsLayout(){
  statsPanel.removeAttribute('style');
  const desktop=desktopLayout.matches;
  if(desktop){$('desktop-stats').append(statsPanel);statsPanel.hidden=false;statsPanel.setAttribute('aria-labelledby','desktop-stats-title');}
  else{document.body.insertBefore(statsPanel,$('map-dialog'));statsPanel.hidden=true;statsPanel.setAttribute('aria-labelledby','statistics');}
  $('statistics').setAttribute('aria-expanded','false');
}
desktopLayout.addEventListener('change',syncStatisticsLayout);
syncStatisticsLayout();


function toast(k){$('toast').textContent=tr(k);$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2800);}
function language(){document.documentElement.lang=lang;document.querySelectorAll('[data-t]').forEach(e=>e.textContent=tr(e.dataset.t));$('sound').textContent=tr(sound?'soundOn':'soundOff');$('sound').setAttribute('aria-pressed',String(sound));$('favorite').textContent=tr(favorite?'unfavorite':'favorite');$('favorite').setAttribute('aria-pressed',String(favorite));$('leave').textContent=tr(joined?'leave':'join');$('save-status').textContent=tr(Platform.status==='cloud'?'cloud':Platform.status==='error'?'saveError':'local');$('board').setAttribute('aria-label',tr('board'));$('center').setAttribute('aria-label',tr('center'));$('progress')?.setAttribute('aria-label',tr('loading'));$('close').setAttribute('aria-label',lang==='ru'?'Закрыть':'Close');$('minimap-trigger').setAttribute('aria-label',tr('openMap'));$('map-close').setAttribute('aria-label',tr('closeMap'));$('map-view').setAttribute('aria-label',tr('mapHint'));renderUI();fenceUI();positionStatistics();}
window.addEventListener('message',e=>{if(e.source!==window.parent||!e.data||e.data.channel!=='SC_PLATFORM_SETTINGS')return;const d=e.data;if(typeof d.language==='string'&&words[d.language.split(/[-_]/)[0]])lang=d.language.split(/[-_]/)[0];if(d.theme==='dark'||d.theme==='light'){theme=d.theme;document.body.classList.toggle('dark',theme==='dark');}if(typeof d.favorite==='boolean')favorite=d.favorite;language();});
const urlParams=new URLSearchParams(location.search);lang=/^en/i.test(urlParams.get('lang')||navigator.language)?'en':'ru';theme=urlParams.get('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.body.classList.toggle('dark',theme==='dark');
const base=new URL('./',location.href);
async function request(route,body={}) {
  const began=performance.now();
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const r=await fetch(new URL('api/'+route,base),{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...body,...(token?{session:token}:{})}),signal:controller.signal
    });
    const data=await r.json();
    if(!r.ok)throw Object.assign(Error(data.error),{status:r.status,data});
    if(['join','state','watch','ping'].includes(route)){pingMs=Math.max(0,Math.round(performance.now()-began));pingAt=performance.now();}
    return data;
  } finally { clearTimeout(timer); }
}
function accept(w){if(!w||w.time<lastWorld)return;const hadWorld=!!world;lastWorld=w.time;const now=performance.now();for(const p of w.pawns){const old=poses.get(p.id);if(!old||p.x!==old.x||p.y!==old.y){const t=old?Math.min(1,(now-old.at)/(old.duration||170)):1;poses.set(p.id,{x:p.x,y:p.y,fromX:old?old.fromX+(old.x-old.fromX)*t:p.x,fromY:old?old.fromY+(old.y-old.fromY)*t:p.y,at:now,duration:p.id===id?120:Math.max(120,Math.min(350,now-(old?.at??now-120)))});}}world=w;network='online';for(const e of w.effects)if(!seenEffects.has(e.id)){seenEffects.add(e.id);if(hadWorld&&!document.hidden&&w.time-e.at<1400){const box=$('board').getBoundingClientRect();if(!(e.type==='paint'&&e.command?.pawn===id&&sync.predictedEffects.has(e.command.seq)))effects.burst(e,now,colors,{x:view.x,y:view.y,width:box.width/cell,height:box.height/cell});if(e.type==='bomb'||!e.type)beep(130,.15);}}if(seenEffects.size>100)seenEffects=new Set(w.effects.map(e=>e.id));renderUI();}
function acceptPacket(packet){
  if(!sync.receive(packet))return;
  const view=sync.view(id);if(view)accept(view);
}
async function join(){
  if(leaving||document.hidden||joining||performance.now()<nextJoin)return;joining=true;
  try{const r=await request('join',{protocol:2});token=r.token;
    if(document.hidden||leaving){releaseWorld();return;}
    id=r.id;seq=0;joined=true;sync.reset();lastWorld=0;seenEffects.clear();acceptPacket(r);startPresence(token);Platform.track('colorfull-cells:join');language();
  }catch(e){network=e.status===409?'full':'offline';nextJoin=performance.now()+2000;renderUI();}finally{joining=false;}
}
async function poll(){
  if(!document.hidden)try{
    if(!token&&!leaving)await join();
    else if(leaving){
      if((sync.needsResync||!presenceOpen)&&performance.now()-lastHeartbeat>1500){lastHeartbeat=performance.now();const r=await request('watch',{protocol:2,cursor:sync.needsResync?-1:sync.frame});acceptPacket(r);startPresence(null);}
    }else if(token){
      if(sync.needsResync||!presenceOpen||performance.now()-lastStreamAt>5000){const session=token;const r=await request('state',{protocol:2,cursor:sync.needsResync?-1:sync.frame});if(token===session)acceptPacket(r);}
      else if(performance.now()-lastHeartbeat>2000){lastHeartbeat=performance.now();await request('ping');renderUI();}
    }
  }catch(e){network='offline';pingMs=null;if(e.status===401){token=null;joined=false;sync.reset();presenceController?.abort();}renderUI();}
  setTimeout(poll,Math.max(250,Math.min(1000,(pingMs||200)*1.2)));
}
function releaseWorld(){
  paintHeld=false;pingMs=null;const previous=token;token=null;joined=false;presenceOpen=false;sync.reset();
  if(world&&id!==null)world.pawns[id].bot=true;presenceController?.abort();presenceController=null;
  if(previous)fetch(new URL('api/leave',base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:previous}),keepalive:true}).catch(()=>{});
  renderUI();
}
async function startPresence(session){
  presenceController?.abort();const controller=new AbortController();presenceController=controller;presenceOpen=false;
  try{
    const response=await fetch(new URL('api/'+(session?'presence':'watch-stream'),base),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session,cursor:sync.frame}),signal:controller.signal});
    if(!response.ok||!response.body)throw Object.assign(Error('presence'),{status:response.status});
    const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';presenceOpen=true;lastStreamAt=performance.now();
    while(true){const {value,done}=await reader.read();if(done)break;lastStreamAt=performance.now();buffer+=decoder.decode(value,{stream:true});
      let end;while((end=buffer.indexOf('\n\n'))>=0){const event=buffer.slice(0,end);buffer=buffer.slice(end+2);if(event.startsWith('data: ')&&!controller.signal.aborted&&token===session)acceptPacket(JSON.parse(event.slice(6)));}
      if(buffer.length>1000000)throw Error('stream size');
    }
  }catch{}finally{if(presenceController===controller){presenceOpen=false;if(!controller.signal.aborted){network='offline';pingMs=null;renderUI();}}}
}
async function flushCommands(){
  if(sending||!joined||!token)return;const batch=sync.batch();if(!batch.length)return;
  sending=true;const session=token;
  try{const r=await request('commands',{commands:batch});if(token===session)sync.received=Math.max(sync.received,r.received||0);}
  catch(e){if(token===session){if(e.status===401){releaseWorld();}else{network='offline';pingMs=null;renderUI();}}}
  finally{sending=false;if(joined&&sync.batch().length)setTimeout(flushCommands,250);}
}
function beep(freq=420,length=.045){if(!sound)return;try{audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{}}
async function action(type,args){
  if(fenceMode&&type==='move')return false;
  if(!joined||busy||$('dialog').open||$('map-dialog').open||statisticsOverlayOpen()||$('app').inert)return false;
  const payload={...args};if(type==='move'&&paintHeld)payload.paintColor=color;
  const command=sync.enqueue(id,type,payload,performance.now());if(!command){if(type==='paint'&&world?.pawns[id]&&sync.regionAt(world,world.pawns[id].x,world.pawns[id].y))toast('lockedCell');else if(sync.pending.length>=12)toast('slowConnection');return false;}
  const view=sync.view(id);if(view)accept(view);beep(type==='move'?300:550);
  if(type==='paint'&&args.color>=0||type==='move'&&payload.paintColor!==undefined){
    const p=view.pawns[id];if(!sync.regionAt(view,p.x,p.y)){effects.burst({type:'paint',x:p.x,y:p.y,color:type==='paint'?args.color:payload.paintColor},performance.now(),colors,{x:p.x+.5,y:p.y+.5,width:$('board').clientWidth/cell,height:$('board').clientHeight/cell});sync.predictedEffects.add(command.seq);}
  }
  if(sync.predictedEffects.size>128)sync.predictedEffects=new Set([...sync.predictedEffects].slice(-64));
  const blocking=type==='lock'||type==='unlock';if(blocking)busy=true;
  const confirmed=new Promise(resolve=>command.resolve=resolve);flushCommands();
  const result=await confirmed;if(blocking)busy=false;
  if(!result.ok&&words[lang][result.error])toast(result.error);return result.ok;
}
function choose(n){color=n;document.querySelectorAll('.swatch').forEach((b,i)=>{b.setAttribute('aria-pressed',String(i===color));b.setAttribute('aria-label',tr('color')+' '+(i+1));b.title=tr('color')+' '+(i+1);b.dataset.key=String(i+1);});Platform.save({color,sound});}
for(let i=0;i<8;i++){const b=document.createElement('button');b.className='swatch';b.style.background=colors[i];b.onclick=()=>choose(i);$('palette').append(b);}
function renderUI(){drawMinimap();$('connection').textContent=tr(leaving?'watch':network)+(!leaving&&network==='online'&&pingMs!==null&&performance.now()-pingAt<6000?' · '+new Intl.NumberFormat(lang).format(pingMs)+(lang==='ru'?' мс':' ms'):'');if(!world)return;const p=world.pawns[id];renderRanking();fenceUI();$('coords').textContent=p?`${String(p.x+1).padStart(2,'0')} : ${String(p.y+1).padStart(2,'0')}`:'—';$('painted').textContent=new Intl.NumberFormat(lang).format(p?.painted||0);$('player-name').textContent=joined?tr('you')+' / '+String(id+1).padStart(2,'0'):tr('watch');$('identity').textContent=Platform.user?.displayName||tr('guest');$('population').textContent=world.pawns.filter(p=>!p.bot).length+' '+(lang==='ru'?'игр.':'players')+' / 8';$('roster').replaceChildren(...world.pawns.map(p=>{const d=document.createElement('div');d.className='resident';d.style.color=colors[p.color];d.textContent='♟';d.title=(p.id===id&&joined?tr('you'):p.bot?tr('bot'):tr('human'))+' '+(p.id+1);const s=document.createElement('small');s.textContent=p.bot?'AI':'●';d.append(s);return d;}));const pc=$('portrait').getContext('2d');pc.clearRect(0,0,100,100);pawn(pc,50,80,6,colors[p?.color??color],0);}
const sprite=['0001111000','0012222100','0012222100','0001111000','0001221000','0001221000','0012222100','0012222100','0112222110','0122222210','1111111111'];
function pawn(ctx,x,y,scale,fill,tilt){ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.fillStyle='#36443930';ctx.beginPath();ctx.ellipse(0,0,scale*5,scale*1.2,0,0,Math.PI*2);ctx.fill();for(let yy=0;yy<sprite.length;yy++)for(let xx=0;xx<10;xx++){const v=sprite[yy][xx];if(v==='0')continue;ctx.fillStyle=v==='1'?'#465044':fill;ctx.fillRect(Math.round((xx-5)*scale),Math.round((yy-11)*scale),Math.ceil(scale),Math.ceil(scale));}ctx.fillStyle='#ffffffa0';ctx.fillRect(-scale*2,-scale*9,scale,scale*2);ctx.restore();}
function draw(now){requestAnimationFrame(draw);if(document.hidden||!world)return;if($('map-dialog').open)mapView.draw(world,id);const canvas=$('board'),box=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=box.width,h=box.height;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const me=world.pawns[id];if(me){const ease=reduced?1:.12;view.x+=(me.x+.5-view.x)*ease;view.y+=(me.y+.5-view.y)*ease;}
const shake=effects.shake(now);const ox=w/2-view.x*cell+shake.x,oy=h/2-view.y*cell+shake.y;geo={ox,oy};const minX=Math.max(0,Math.floor(-ox/cell)),maxX=Math.min(99,Math.ceil((w-ox)/cell)),minY=Math.max(0,Math.floor(-oy/cell)),maxY=Math.min(99,Math.ceil((h-oy)/cell));
for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const c=world.cells[y*100+x];if(c>=0){ctx.fillStyle=colors[c]+'85';ctx.fillRect(ox+x*cell+1,oy+y*cell+1,cell-2,cell-2);}}
ctx.strokeStyle=theme==='dark'?'#a4c8ce50':'#79856d48';ctx.lineWidth=.7;ctx.setLineDash([2,4]);ctx.beginPath();for(let x=minX;x<=maxX+1;x++){ctx.moveTo(ox+x*cell,Math.max(0,oy));ctx.lineTo(ox+x*cell,Math.min(h,oy+100*cell));}for(let y=minY;y<=maxY+1;y++){ctx.moveTo(Math.max(0,ox),oy+y*cell);ctx.lineTo(Math.min(w,ox+100*cell),oy+y*cell);}ctx.stroke();ctx.setLineDash([]);
drawFences(ctx,ox,oy);
for(const b of world.bombs){const x=ox+(b.x+.5)*cell,y=oy+(b.y+.5)*cell;ctx.fillStyle='#475343';ctx.fillRect(x-3,y-cell*.34,5,5);ctx.strokeStyle='#7c7852';ctx.beginPath();ctx.moveTo(x,y-cell*.3);ctx.lineTo(x+4,y-cell*.48);ctx.stroke();ctx.fillStyle=colors[b.color];ctx.beginPath();ctx.arc(x,y,cell*.24,0,7);ctx.fill();ctx.strokeStyle='#465044';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#fff9';ctx.fillRect(x-cell*.12,y-cell*.13,3,3);}
for(const p of [...world.pawns].sort((a,b)=>a.y-b.y)){const pose=poses.get(p.id),t=reduced?1:Math.min(1,(now-pose.at)/(pose.duration||170)),hop=reduced?0:Math.sin(t*Math.PI)*cell*.18;const x=ox+(pose.fromX+(p.x-pose.fromX)*t+.5)*cell,y=oy+(pose.fromY+(p.y-pose.fromY)*t+.72)*cell-hop;if(p.id===id&&joined){ctx.strokeStyle='#46504490';ctx.lineWidth=1.6;ctx.strokeRect(ox+p.x*cell+3,oy+p.y*cell+3,cell-6,cell-6);ctx.fillStyle='#465044';ctx.font='bold 9px Arial';ctx.textAlign='center';ctx.fillText(tr('you').toUpperCase(),x,y-cell*.98);}pawn(ctx,x,y,cell/16,colors[p.color],reduced?0:Math.sin(t*Math.PI*2)*.08);}
effects.draw(ctx,now,ox,oy,cell);
}
function renderRanking(){
  const counts=world.coverage?.counts||Array(8).fill(0);const filled=world.coverage?.filled||0;
  const format=new Intl.NumberFormat(lang,{maximumFractionDigits:1});
  $('coverage-total').textContent=format.format(filled/100)+'%';
  $('color-ranking').setAttribute('aria-label',tr('ranking'));
  $('color-ranking').replaceChildren(...counts.map((count,index)=>({count,index})).sort((a,b)=>b.count-a.count||a.index-b.index).map(({count,index})=>{
    const row=document.createElement('li');row.title=tr('color')+' '+(index+1)+': '+count+' / 10000';
    const dot=document.createElement('span');dot.className='ranking-dot';dot.style.background=colors[index];dot.textContent=String(index+1);
    const bar=document.createElement('span');bar.className='ranking-track';const fill=document.createElement('span');fill.style.width=(count/100)+'%';fill.style.background=colors[index];bar.append(fill);
    const value=document.createElement('span');value.textContent=format.format(count/100)+'%';row.append(dot,bar,value);return row;
  }));
  $('map-ranking').setAttribute('aria-label',tr('ranking'));$('map-ranking').replaceChildren(...Array.from($('color-ranking').children,row=>row.cloneNode(true)));
}
function drawMinimap(){
  const mini=$('minimap'),ctx=mini.getContext('2d');
  mini.setAttribute('aria-label',lang==='ru'?'Мини-карта областей и восьми пешек':'Map of protected areas and eight pawns');
  ctx.fillStyle=theme==='dark'?'#202c3a':'#f2f5e9';ctx.fillRect(0,0,200,200);if(!world)return;
  for(let i=0;i<10000;i++)if(world.cells[i]>=0){ctx.fillStyle=colors[world.cells[i]]+'80';ctx.fillRect(i%100*2,Math.floor(i/100)*2,2,2);}
  for(const r of world.regions||[]){ctx.fillStyle=colors[world.pawns[r.owner].color]+'55';ctx.strokeStyle=colors[world.pawns[r.owner].color];ctx.lineWidth=2;ctx.fillRect(r.x1*2,r.y1*2,(r.x2-r.x1+1)*2,(r.y2-r.y1+1)*2);ctx.strokeRect(r.x1*2+1,r.y1*2+1,(r.x2-r.x1+1)*2-2,(r.y2-r.y1+1)*2-2);}
  const box=$('board').getBoundingClientRect();ctx.strokeStyle='#46504488';ctx.lineWidth=1;ctx.setLineDash([3,2]);ctx.strokeRect((view.x-box.width/cell/2)*2,(view.y-box.height/cell/2)*2,box.width/cell*2,box.height/cell*2);ctx.setLineDash([]);
  for(const p of [...world.pawns.filter(p=>p.id!==id),...world.pawns.filter(p=>p.id===id)]){const x=(p.x+.5)*2,y=(p.y+.5)*2;ctx.beginPath();ctx.arc(x,y,p.id===id?6:4,0,Math.PI*2);ctx.fillStyle=colors[p.color];ctx.fill();ctx.strokeStyle='#364631';ctx.lineWidth=p.id===id?2:1;ctx.stroke();if(p.id===id){ctx.fillStyle='#fff';ctx.fillRect(x-1,y-1,2,2);}}
}
function fenceUI(){
  $('fence').textContent=tr(fenceMode?'cancelFence':'fence');
  $('fence').setAttribute('aria-pressed',String(fenceMode));
  const regions=world?.regions||[],p=world?.pawns[id];
  const count=regions.filter(r=>r.owner===id).reduce((n,r)=>n+(r.x2-r.x1+1)*(r.y2-r.y1+1),0);
  $('fence-count').textContent=new Intl.NumberFormat(lang).format(count)+' / 256';
  const region=p&&regions.find(r=>p.x>=r.x1&&p.x<=r.x2&&p.y>=r.y1&&p.y<=r.y2);
  $('unfence').disabled=!joined||!region||region.owner!==id||fenceMode;
  $('paint').disabled=$('erase').disabled=!joined||!!region||fenceMode;
  $('fence-hint').hidden=!fenceMode;
  const area=anchor&&hover?(Math.abs(hover.x-anchor.x)+1)*(Math.abs(hover.y-anchor.y)+1):0;
  $('fence-hint').textContent=tr(anchor?'secondCorner':'firstCorner')+(anchor?' '+area+' / '+(256-count):'');
}
function resetFence(){fenceMode=false;anchor=null;hover=null;fenceUI();}
$('fence').onclick=()=>{paintHeld=false;if(fenceMode)resetFence();else if(joined){fenceMode=true;anchor=null;hover=null;fenceUI();$('board').focus();}};
$('unfence').onclick=async()=>{if(await action('unlock',{}))toast('unfenced');};
function drawFences(ctx,ox,oy){
  for(const r of world.regions||[]){
    const x=ox+r.x1*cell,y=oy+r.y1*cell,w=(r.x2-r.x1+1)*cell,h=(r.y2-r.y1+1)*cell;
    if(x>ctx.canvas.width||y>ctx.canvas.height||x+w<0||y+h<0)continue;
    const c=colors[world.pawns[r.owner].color];
    ctx.fillStyle=c+'15';ctx.fillRect(x,y,w,h);
    ctx.lineWidth=5;ctx.strokeStyle='#465044aa';ctx.strokeRect(x+2,y+2,w-4,h-4);
    ctx.lineWidth=3;ctx.strokeStyle=c;ctx.strokeRect(x+2,y+2,w-4,h-4);
    ctx.fillStyle=c;
    for(let px=Math.max(x,Math.floor(-ox/cell)*cell+ox);px<=Math.min(x+w,ctx.canvas.width);px+=cell){ctx.fillRect(px-2,y-3,4,10);ctx.fillRect(px-2,y+h-7,4,10);}
    for(let py=Math.max(y,Math.floor(-oy/cell)*cell+oy);py<=Math.min(y+h,ctx.canvas.height);py+=cell){ctx.fillRect(x-3,py-2,10,4);ctx.fillRect(x+w-7,py-2,10,4);}
  }
  if(fenceMode&&anchor){const end=hover||anchor;ctx.fillStyle=colors[color]+'44';ctx.strokeStyle='#465044';ctx.lineWidth=2;ctx.setLineDash([5,4]);const x=ox+Math.min(anchor.x,end.x)*cell,y=oy+Math.min(anchor.y,end.y)*cell,w=(Math.abs(anchor.x-end.x)+1)*cell,h=(Math.abs(anchor.y-end.y)+1)*cell;ctx.fillRect(x,y,w,h);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);}
}
function pointCell(e){const r=$('board').getBoundingClientRect();return {x:Math.floor((e.clientX-r.left-geo.ox)/cell),y:Math.floor((e.clientY-r.top-geo.oy)/cell)};}
$('board').addEventListener('pointermove',e=>{if(fenceMode){hover=pointCell(e);fenceUI();}});
async function fenceClick(e){
  if(busy)return;
  const c=pointCell(e);if(c.x<0||c.x>99||c.y<0||c.y>99){toast('invalidArea');return;}
  if(!anchor){anchor=c;hover=c;fenceUI();return;}
  const bounds={x1:Math.min(anchor.x,c.x),x2:Math.max(anchor.x,c.x),y1:Math.min(anchor.y,c.y),y2:Math.max(anchor.y,c.y)};
  if(await action('lock',{bounds})){resetFence();toast('fenced');}
}
$('paint').onclick=()=>action('paint',{color});$('erase').onclick=()=>action('paint',{color:-1});$('menu').onclick=()=>{closeStatistics();paintHeld=false;$('dialog').showModal();language();};$('close').onclick=()=>{$('dialog').close();$('menu').focus();};$('dialog').onclick=e=>{if(e.target===$('dialog')){const r=$('dialog').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('dialog').close();}};
$('sound').onclick=()=>{sound=!sound;Platform.save({color,sound});language();beep();};$('favorite').onclick=async()=>{$('favorite').disabled=true;try{const r=await Platform.favorite();if(typeof r.favorite==='boolean')favorite=r.favorite;else if(typeof r.isFavorite==='boolean')favorite=r.isFavorite;else throw Error('invalid');language();}catch(e){toast(e.message==='guest'?'signIn':'error');}finally{$('favorite').disabled=false;}};
$('sync').onclick=async()=>{$('sync').disabled=true;await Platform.init();color=Platform.preferences.color;sound=Platform.preferences.sound;choose(color);language();$('sync').disabled=false;};
$('leave').onclick=async()=>{if(joined){leaving=true;releaseWorld();resetFence();}else{leaving=false;await join();}$('dialog').close();language();};
function zoom(d){cell=Math.max(7,Math.min(55,cell+d));$('zoom-value').textContent=Math.round(cell/29*100)+'%';}$('out').onclick=()=>zoom(-5);$('in').onclick=()=>zoom(5);$('center').onclick=()=>{if(world&&id!==null){view={x:world.pawns[id].x+.5,y:world.pawns[id].y+.5};}};
const keys={ArrowLeft:[-1,0],a:[-1,0],ф:[-1,0],ArrowRight:[1,0],d:[1,0],в:[1,0],ArrowUp:[0,-1],w:[0,-1],ц:[0,-1],ArrowDown:[0,1],s:[0,1],ы:[0,1]};
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&statisticsOverlayOpen()){closeStatistics(true);return;}if(e.key==='Escape'&&fenceMode){resetFence();return;}
  if($('app').inert||$('dialog').open||$('map-dialog').open||statisticsOverlayOpen()||e.ctrlKey||e.metaKey||e.altKey||e.isComposing)return;
  if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  // Keep Space activation for utility buttons; palette focus still permits painting.
  if((e.code==='Space'||e.key===' ')&&e.target.closest('button')&&!e.target.closest('#palette,#paint,#erase,#touch-controls'))return;
  if(e.code==='Space'||e.key===' ')paintHeld=true;
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(keys[key]){e.preventDefault();action('move',{dx:keys[key][0],dy:keys[key][1]});return;}
  const hotkey=GameHotkeys(e);if(!hotkey)return;e.preventDefault();if(e.repeat||fenceMode)return;
  if(hotkey.type==='paint')action('paint',{color});
  else if(hotkey.type==='erase')action('paint',{color:-1});
  else if(hotkey.type==='color')choose(hotkey.color);
  else choose((color+hotkey.delta+8)%8);
});
window.addEventListener('keyup',e=>{if(e.code==='Space'||e.key===' ')paintHeld=false;});
window.addEventListener('blur',()=>{paintHeld=false;});
document.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{const [dx,dy]=b.dataset.d.split(',').map(Number);action('move',{dx,dy});});
let pointer=null;$('board').addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};$('board').setPointerCapture(e.pointerId);});$('board').addEventListener('pointercancel',()=>pointer=null);$('board').addEventListener('pointerup',e=>{if(!pointer)return;if(fenceMode){pointer=null;fenceClick(e);return;}const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;pointer=null;if(Math.hypot(dx,dy)>16)action('move',{dx:Math.abs(dx)>Math.abs(dy)?Math.sign(dx):0,dy:Math.abs(dy)>=Math.abs(dx)?Math.sign(dy):0});else if(world&&joined){const r=$('board').getBoundingClientRect(),p=world.pawns[id],x=Math.floor((e.clientX-r.left-geo.ox)/cell),y=Math.floor((e.clientY-r.top-geo.oy)/cell);if(Math.abs(x-p.x)+Math.abs(y-p.y)===1)action('move',{dx:x-p.x,dy:y-p.y});}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){effects.clear();releaseWorld();}else if(!leaving&&!token)join();});
window.addEventListener('pagehide',()=>{effects.clear();releaseWorld();});
async function start(){const began=performance.now();language();$('progress').value=30;await Platform.init();color=Number.isInteger(Platform.preferences.color)&&Platform.preferences.color>=0&&Platform.preferences.color<8?Platform.preferences.color:6;sound=Platform.preferences.sound!==false;$('progress').value=65;await join();$('progress').value=100;await new Promise(r=>setTimeout(r,Math.max(300,1000-(performance.now()-began))));$('loading').remove();$('app').inert=false;$('app').setAttribute('aria-busy','false');choose(color);language();requestAnimationFrame(draw);poll();}start();
})();




