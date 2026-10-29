(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** Original Web Audio tones, queued synchronously during user gestures. */
let enabled=true,context=null,lastPurr=0,resumePromise=null,gestureUntil=0;
function setSound(value){enabled=!!value;}
function isSoundOn(){return enabled;}
function getContext(){
  try{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext)return null;
    if(!context||context.state==='closed'){
      context=new AudioContext({latencyHint:'interactive'});
      resumePromise=null;
    }
    return context;
  }catch{return null;}
}
function unlockAudio(){
  if(!enabled||document.hidden)return Promise.resolve(null);
  const ctx=getContext();
  if(!ctx)return Promise.resolve(null);
  if(ctx.state==='running')return Promise.resolve(ctx);
  if(!resumePromise){
    // Start the silent buffer before resume, within the touch/key handler.
    try{
      const silent=ctx.createBufferSource();
      silent.buffer=ctx.createBuffer(1,1,ctx.sampleRate);
      silent.connect(ctx.destination);
      silent.onended=()=>silent.disconnect();
      silent.start(0);
    }catch{/* Some browsers need only resume. */}
    try{
      const pending=Promise.resolve(ctx.resume())
        .then(()=>ctx.state==='running'?ctx:null)
        .catch(()=>null)
        .finally(()=>{if(resumePromise===pending)resumePromise=null;});
      resumePromise=pending;
    }catch{return Promise.resolve(null);}
  }
  return resumePromise;
}
function withAudio(play){
  if(!enabled||document.hidden)return;
  const target=getContext();
  if(!target)return;
  const requested=performance.now();
  if(target.state==='running'||requested<gestureUntil){
    // Schedule now; waiting for resume().then() loses the iOS gesture timing.
    try{play();}catch{/* The device may disappear during playback. */}
    if(target.state!=='running')void unlockAudio();
    return;
  }
  void unlockAudio().then(ready=>{
    if(!ready||!enabled||document.hidden||target!==context||performance.now()-requested>500)return;
    try{play();}catch{/* Audio device unavailable. */}
  });
}
function unlockFromGesture(){
  if(!enabled||document.hidden)return;
  gestureUntil=performance.now()+900;
  void unlockAudio();
}
for(const event of ['touchstart','touchend','pointerdown','pointerup','keydown','click']){
  document.addEventListener(event,unlockFromGesture,{capture:true,passive:true});
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden)gestureUntil=0;
});
function playSound(kind='slide'){
  if(!enabled)return;
  withAudio(()=>{
    const notes=kind==='win'?[523,659,784]:kind==='merge'?[392,523]:kind==='bump'?[196]:[294];
    notes.forEach((frequency,i)=>{
      const oscillator=context.createOscillator(),gain=context.createGain();
      const start=context.currentTime+i*.09;
      oscillator.type=kind==='bump'?'triangle':'sine';oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(kind==='bump'?.012:kind==='slide'?.017:.04,start+.008);gain.gain.exponentialRampToValueAtTime(.0001,start+.13);
      oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.14);
    });
  });
}

/** Quiet synthetic, fluttering purr. Starts only on a pointer stroke. */
function playPurr(){
  if(!enabled || performance.now()-lastPurr<440)return;
  lastPurr=performance.now();
  withAudio(()=>{
    const t=context.currentTime, duration=.52;
    const out=context.createGain(), flutter=context.createGain(), filter=context.createBiquadFilter();
    const carrier=context.createOscillator(),lfo=context.createOscillator(),depth=context.createGain();
    filter.type='lowpass';filter.frequency.value=220;
    carrier.type='triangle';carrier.frequency.setValueAtTime(72,t);
    carrier.frequency.linearRampToValueAtTime(63,t+duration);
    lfo.type='sine';lfo.frequency.value=24;depth.gain.value=.014;
    // Fade the entire modulated signal: the LFO must not bypass the release.
    flutter.gain.value=.02;
    out.gain.setValueAtTime(0,t);
    out.gain.linearRampToValueAtTime(1,t+.045);
    out.gain.setValueAtTime(1,t+duration-.11);
    out.gain.exponentialRampToValueAtTime(.0001,t+duration-.01);
    out.gain.linearRampToValueAtTime(0,t+duration);
    lfo.connect(depth);depth.connect(flutter.gain);
    carrier.connect(filter);filter.connect(flutter);flutter.connect(out);out.connect(context.destination);
    carrier.start(t);lfo.start(t);carrier.stop(t+duration+.01);lfo.stop(t+duration+.01);
    carrier.onended=()=>{carrier.disconnect();lfo.disconnect();depth.disconnect();filter.disconnect();flutter.disconnect();out.disconnect();};
  });
}
window.Tikhon['sound']={setSound,isSoundOn,playSound,playPurr,unlockAudio};
})();
