/* Short synthesized effects; no network or sound files are needed. */
(function(){
'use strict';
let context=null,master=null,enabled=true,lastPurr=-Infinity,resumeContext=null,resumeStarted=0,hadGesture=false,primedContext=null;const voices=new Set(),buffers=new Map();
// Safari must receive resume() AND a silent source.start() synchronously in a user gesture.
function unlock(gesture=false){
 if(!enabled||document.hidden)return null;
 try{
  const now=Date.now();
  if(context?.state==='closed'||(context&&gesture&&resumeContext===context&&context?.state!=='running'&&now-resumeStarted>1800)){close();}
  if(!context){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return null;context=new Audio();master=context.createGain();master.gain.value=.65;master.connect(context.destination);const owned=context;context.onstatechange=()=>{if(context===owned&&owned.state==='running'){resumeContext=null;resumeStarted=0;}};}
  if(gesture)hadGesture=true;const needsPrime=gesture&&(primedContext!==context||context.state!=='running');
  if(['suspended','interrupted'].includes(context.state)&&resumeContext!==context){const owned=context;resumeContext=owned;resumeStarted=now;try{Promise.resolve(owned.resume()).then(()=>{if(context===owned&&owned.state==='running'){resumeContext=null;resumeStarted=0;}}).catch(()=>{if(resumeContext===owned){resumeContext=null;resumeStarted=0;}});}catch{resumeContext=null;resumeStarted=0;}}
  // One inaudible sample primes the iOS audio hardware; retain gesture listeners for interruptions.
  if(needsPrime){const source=context.createBufferSource();source.buffer=context.createBuffer(1,1,context.sampleRate);source.connect(context.destination);source.onended=()=>{try{source.disconnect();}catch{}};source.start(0);primedContext=context;}
  return context;
 }catch{return null;}
}
function gestureUnlock(event){if(event.isTrusted===false)return;unlock(true);}
for(const type of ['pointerdown','touchstart','touchend','click','keydown'])document.addEventListener(type,gestureUnlock,{capture:true,passive:true});
function dispose(voice){clearTimeout(voice.timer);for(const n of voice.nodes){try{if(typeof n.stop==='function')n.stop();n.disconnect();}catch{}}voices.delete(voice);}
function stop(){for(const voice of [...voices])dispose(voice);}
function setEnabled(value){enabled=Boolean(value);if(master)master.gain.setValueAtTime(enabled ? .65 : 0,context.currentTime);if(!enabled)stop();}
function noiseBuffer(){const rate=context.sampleRate;if(buffers.has(rate))return buffers.get(rate);const b=context.createBuffer(1,Math.ceil(rate*1.6),rate),data=b.getChannelData(0);let seed=731;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=seed/2147483648-1;}buffers.set(rate,b);return b;}
function play(kind){const c=unlock();if(!c)return false;const now=c.currentTime;if(kind==='purr'&&now-lastPurr<1)return false;if(kind==='purr')lastPurr=now;
 while(voices.size>=6)dispose(voices.values().next().value);
 const duration=kind==='purr'?1.12:kind==='explosion'?.85:kind==='splash'?.55:.16;const voice={nodes:[],timer:null};voices.add(voice);const add=n=>{voice.nodes.push(n);return n;};
 function envelope(level,attack,length,at=now){const g=add(c.createGain());g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(level,at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+length);g.connect(master);return g;}
 function oscillator(type,from,to,level,length,delay=0){const at=now+delay,o=add(c.createOscillator());o.type=type;o.frequency.setValueAtTime(from,at);o.frequency.exponentialRampToValueAtTime(to,at+length);o.connect(envelope(level,.012,length,at));o.start(at);o.stop(at+length+.02);return o;}
 function noise(type,freq,to,level,length){const source=add(c.createBufferSource()),filter=add(c.createBiquadFilter());source.buffer=noiseBuffer();filter.type=type;filter.frequency.setValueAtTime(freq,now);filter.frequency.exponentialRampToValueAtTime(to,now+length);filter.Q.value=.7;source.connect(filter);filter.connect(envelope(level,.018,length));source.start(now);source.stop(now+length+.02);return source;}
 try{
 if(kind==='explosion'){
  noise('lowpass',2100,170,.34,.8);noise('bandpass',1800,500,.12,.21);oscillator('sine',94,29,.24,.62);
 }else if(kind==='splash'){
  noise('bandpass',1300,420,.17,.48);oscillator('sine',560,110,.1,.2);oscillator('sine',390,170,.055,.16,.12);oscillator('sine',610,270,.035,.12,.23);
 }else if(kind==='purr'){
  const rumble=add(c.createBufferSource()),filter=add(c.createBiquadFilter()),body=add(c.createOscillator()),tremolo=add(c.createGain()),lfo=add(c.createOscillator()),depth=add(c.createGain()),breath=add(c.createGain());
  rumble.buffer=noiseBuffer();filter.type='lowpass';filter.frequency.value=190;rumble.connect(filter);filter.connect(tremolo);body.type='triangle';body.frequency.value=76;const bodyGain=add(c.createGain());bodyGain.gain.value=.14;body.connect(bodyGain);bodyGain.connect(tremolo);
  tremolo.gain.value=.15;lfo.type='sine';lfo.frequency.value=26;depth.gain.value=.11;lfo.connect(depth);depth.connect(tremolo.gain);tremolo.connect(breath);breath.connect(master);
  breath.gain.setValueAtTime(.0001,now);breath.gain.linearRampToValueAtTime(.65,now+.16);breath.gain.linearRampToValueAtTime(.3,now+.53);breath.gain.linearRampToValueAtTime(.55,now+.7);breath.gain.exponentialRampToValueAtTime(.0001,now+1.1);
  for(const n of [rumble,body,lfo]){n.start(now);n.stop(now+1.12);}
 }else{oscillator('sine',kind==='error'?150:430,kind==='error'?90:330,.045,.12);}
 voice.timer=setTimeout(()=>dispose(voice),(duration+.12)*1000);return true;
 }catch{dispose(voice);return false;}
}
function close(){stop();const old=context;context=null;master=null;resumeContext=null;resumeStarted=0;primedContext=null;if(old){old.onstatechange=null;try{Promise.resolve(old.close()).catch(()=>{});}catch{}}buffers.clear();lastPurr=-Infinity;}
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(hadGesture&&enabled)unlock();});window.addEventListener('pageshow',()=>{if(hadGesture&&enabled)unlock();});window.addEventListener('pagehide',close);
window.Harbor.sound={play,unlock,setEnabled,stop,close};
})();
