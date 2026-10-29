'use strict';
Object.assign(words.ru,{play:'Твой ход — выбери клетку соперника',setup:'Перетащи корабли из дока в свою бухту',expandFleet:'Раскрыть свою бухту',closeFleet:'Вернуться к бою',miniHint:'Твоя бухта',miniHelp:'Нажми, чтобы раскрыть',dragHint:'Перетащи корабль из дока в бухту'});
Object.assign(words.en,{play:'Your turn — choose an enemy cell',setup:'Drag ships from the dock into your harbor',expandFleet:'Expand your harbor',closeFleet:'Back to battle',miniHint:'Your harbor',miniHelp:'Tap to expand',dragHint:'Drag a ship from the dock into your harbor'});
const mobileLayout=matchMedia('(max-width:700px), (max-height:500px) and (max-width:1000px)');
const ownCard=$('own').closest('.sea-card'),boards=document.querySelector('.boards');
const fleetSlot=document.createComment('own-fleet');ownCard.before(fleetSlot);
const mapButton=document.createElement('button');mapButton.className='map-open';mapButton.type='button';mapButton.dataset.t='expandFleet';ownCard.append(mapButton);
const miniNote=document.createElement('div');miniNote.className='mini-note';miniNote.innerHTML='<b data-t="miniHint"></b><strong id="mini-remaining"></strong><span data-t="miniHelp"></span>';boards.append(miniNote);
const mapDialog=document.createElement('dialog');mapDialog.id='fleet-map';mapDialog.innerHTML='<div class="map-top"><h2 data-t="yourSea"></h2><button class="map-close" data-t="closeFleet"></button></div><div class="map-content"></div>';document.body.append(mapDialog);
function closeMap(){if(mapDialog.open)mapDialog.close();if(ownCard.parentElement!==boards)fleetSlot.after(ownCard);document.body.classList.remove('map-expanded');$('own').inert=state.phase!=='setup';requestAnimationFrame(fitSeas);}
mapButton.onclick=()=>{if(state.phase==='setup')return;mapDialog.querySelector('.map-content').append(ownCard);document.body.classList.add('map-expanded');$('own').inert=false;mapDialog.showModal();mapDialog.querySelector('.map-close').focus();};
mapDialog.querySelector('.map-close').onclick=closeMap;
mapDialog.addEventListener('cancel',e=>{e.preventDefault();closeMap();});mapDialog.addEventListener('click',e=>{if(e.target===mapDialog)closeMap();});
const responsiveRender=render;render=function(){if(state.phase==='setup'||$('app').hidden)closeMap();boards.classList.toggle('mobile-battle',mobileLayout.matches&&state.phase!=='setup');boards.classList.toggle('battle-overlay',state.phase!=='setup');$('own').inert=state.phase!=='setup'&&!mapDialog.open;responsiveRender();const left=state.own.filter(ship=>!E.sunk(ship,state.b)).length;$('mini-remaining').textContent=left+' / 10 '+t('fleet');mapButton.setAttribute('aria-label',t('expandFleet')+' · '+left+' / 10 '+t('fleet'));if(state.phase==='setup')$('own').setAttribute('aria-description',t('dragHint'));};
seaObserver.disconnect();window.removeEventListener('resize',fitSeas);
fitSeas=function(){
 const battle=state.phase!=='setup';const style=getComputedStyle(boards);const gap=parseFloat(style.gap)||0;
 const width=boards.clientWidth-(parseFloat(style.paddingLeft)||0)-(parseFloat(style.paddingRight)||0);
 const height=boards.clientHeight-(parseFloat(style.paddingTop)||0)-(parseFloat(style.paddingBottom)||0);
 const measure=card=>{const c=card.getBoundingClientRect(),g=card.querySelector('.grid').getBoundingClientRect();const css=getComputedStyle(card);return {x:(parseFloat(css.paddingLeft)||0)+(parseFloat(css.paddingRight)||0)+(parseFloat(css.borderLeftWidth)||0)+(parseFloat(css.borderRightWidth)||0),y:Math.max(0,c.height-g.height)};};
 if(battle){const enemy=measure(document.querySelector('.sea-card.enemy')),own=measure(ownCard);const budget=Math.max(80,height-gap-enemy.y-own.y);const enemySize=Math.max(40,Math.floor(Math.min(width-enemy.x,budget*.72)));const ownSize=Math.max(40,Math.floor(Math.min(width-own.x,budget-enemySize)));document.documentElement.style.setProperty('--sea-size',enemySize+'px');document.documentElement.style.setProperty('--own-sea-size',ownSize+'px');}
 else{const own=measure(ownCard);document.documentElement.style.setProperty('--sea-size',Math.max(40,Math.floor(Math.min(width-own.x,height-own.y)))+'px');}
};
new ResizeObserver(()=>fitSeas()).observe(boards);window.addEventListener('resize',()=>fitSeas());
mobileLayout.addEventListener('change',()=>{closeMap();render();});

// Pointer capture keeps the same gesture alive when a finger leaves the dock.
let shipDrag=null,suppressClickUntil=0;
function cellAt(x,y){const r=$('own').getBoundingClientRect();if(x<r.left||x>=r.right||y<r.top||y>=r.bottom)return null;return Math.floor((y-r.top)/r.height*10)*10+Math.floor((x-r.left)/r.width*10);}
function clearDrag(){if(!shipDrag)return;shipDrag.ghost?.remove();try{shipDrag.source.releasePointerCapture(shipDrag.id);}catch{}shipDrag=null;hoverCell=null;preview();document.body.classList.remove('dragging-ship');}
function beginDrag(e){if(e.button!==0||blocked()||state.phase!=='setup')return;const button=e.target.closest('.dock-ship'),cell=e.target.closest('#own .cell');let size,original=null;if(button&&!button.disabled)size=Number(button.dataset.size);else if(cell){original=state.own.find(s=>s.includes(Number(cell.dataset.cell)));size=original?.length;}if(!size)return;const source=button?$('dock'):$('own');shipDrag={id:e.pointerId,x:e.clientX,y:e.clientY,size,original,source,touch:e.pointerType==='touch',moved:false};source.setPointerCapture(e.pointerId);}
function moveDrag(e){const d=shipDrag;if(!d||e.pointerId!==d.id)return;if(!d.moved&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<7)return;e.preventDefault();if(!d.moved){d.moved=true;selected=d.size;d.ghost=document.createElement('img');d.ghost.src='assets/ship-'+d.size+'.svg';d.ghost.className='drag-vessel';document.body.append(d.ghost);document.body.classList.add('dragging-ship');}const y=e.clientY-(d.touch?30:0);d.ghost.style.left=e.clientX+'px';d.ghost.style.top=y+'px';d.ghost.style.width=($('own').clientWidth/10*d.size)+'px';d.ghost.classList.toggle('vertical',vertical);hoverCell=cellAt(e.clientX,y);preview();if(d.original&&hoverCell!=null){$('own').querySelectorAll('.preview').forEach(b=>b.classList.remove('preview','invalid'));const cells=E.placement(state.own.filter(s=>s!==d.original),d.size,hoverCell,vertical);for(const c of cells||[hoverCell])$('own').children[c].classList.add('preview',...(cells?[]:['invalid']));}}
function endDrag(e){const d=shipDrag;if(!d||d.id!==e.pointerId)return;const moved=d.moved,c=hoverCell;clearDrag();if(!moved)return;suppressClickUntil=performance.now()+500;if(blocked()||state.phase!=='setup')return;const fleet=d.original?state.own.filter(s=>s!==d.original):state.own;const cells=c==null?null:E.placement(fleet,d.size,c,vertical);if(cells){state.own=[...fleet,cells];persist();render();tone('splash');}else{render();if(c!=null)toast('invalid');}}
for(const el of [$('dock'),$('own')]){el.addEventListener('pointerdown',beginDrag);el.addEventListener('pointermove',moveDrag,{passive:false});el.addEventListener('pointerup',endDrag);el.addEventListener('pointercancel',clearDrag);el.addEventListener('click',e=>{if(performance.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);}
document.addEventListener('visibilitychange',()=>{if(document.hidden)clearDrag();});
const stableDock=dock;dock=function(){stableDock();$('dock').querySelectorAll('.dock-ship').forEach((b,i)=>b.dataset.size=[4,3,2,1][i]);};
render();
