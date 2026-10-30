/* The shared world belongs to the server. SDK saves contain preferences only. */
window.Platform = (()=>{
  let sdk,user=null,ready=false,pending=null,writing=false;
  let preferences={version:1,color:6,sound:true},status='local';
  try{const v=JSON.parse(localStorage.getItem('colorfull-cells:preferences'));if(v?.version===1)preferences={...preferences,...v};}catch{}
  const bounded=p=>Promise.race([p,new Promise((_,reject)=>setTimeout(()=>reject(Error('timeout')),4000))]);
  function normalize(v){if(v?.save!==undefined)v=v.save;if(typeof v==='string')v=JSON.parse(v);if(v==null)return null;if(v.version!==1||!Number.isInteger(v.color)||v.color<0||v.color>7||typeof v.sound!=='boolean')throw Error('schema');return {version:1,color:v.color,sound:v.sound};}
  async function init(){try{if(window.parent!==window){for(let i=0;i<30&&!window.SuperCubePlatform;i++)await new Promise(r=>setTimeout(r,50));}sdk=window.SuperCubePlatform;if(!sdk)return;user=await bounded(sdk.getUser());if(user?.authenticated!==true)return;const v=normalize(await bounded(sdk.loadSave()));if(v)preferences=v;ready=true;status='cloud';}catch{status='error';}return preferences;}
  async function flush(){if(writing||!ready||!pending)return;writing=true;const value=pending;pending=null;try{await sdk.save(value);status='cloud';}catch{status='error';}finally{writing=false;if(pending)flush();}}
  return {init, get preferences(){return preferences;},get user(){return user;},get status(){return status;},save(p){preferences={version:1,color:p.color,sound:p.sound};try{localStorage.setItem('colorfull-cells:preferences',JSON.stringify(preferences));}catch{}pending={...preferences};flush();},async favorite(){if(user?.authenticated!==true||!sdk)throw Error('guest');return bounded(sdk.favorite());},track(label){try{sdk?.track('custom_click',{label})?.catch(()=>{});}catch{}}};
})();

