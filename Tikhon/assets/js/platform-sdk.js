(function(){
'use strict';
window.Tikhon=window.Tikhon||{};
/** Only module talking to SuperCubePlatform and the parent window (postMessage only). */
const sdk=()=>window.SuperCubePlatform;
const hasPlatform=()=>!!sdk()&&typeof sdk().getUser==='function';
async function getUser(){if(!hasPlatform())return {authenticated:false,unavailable:true};return await sdk().getUser();}
async function loadSave(){if(!hasPlatform()||typeof sdk().loadSave!=='function')throw Error('SDK loadSave unavailable');return await sdk().loadSave();}
async function save(data){if(!hasPlatform()||typeof sdk().save!=='function')throw Error('SDK save unavailable');return await sdk().save(data);}
async function track(event,metadata){if(!hasPlatform()||typeof sdk().track!=='function')return null;return await sdk().track(event,metadata);}
async function favorite(){if(!hasPlatform()||typeof sdk().favorite!=='function')throw Error('SDK favorite unavailable');return await sdk().favorite();}
/** Optional integration: NOT part of the current published SDK contract. */
async function getFavoriteStatus(){
 const s=sdk();
 if(!s)return null;
 const fn=typeof s.getFavoriteStatus==='function'?s.getFavoriteStatus:typeof s.getFavoriteState==='function'?s.getFavoriteState:null;
 if(!fn)return null;
 const result=await fn.call(s);
 if(typeof result==='boolean')return result;
 if(typeof result?.favorite==='boolean')return result.favorite;
 if(typeof result?.isFavorite==='boolean')return result.isFavorite;
 return null;
}
const contextCallbacks=new Set();
const VALID_MESSAGE_TYPES=new Set(['supercube:ui','supercube:appearance','supercube:preferences']);
function normalizeTheme(theme){
 if(typeof theme!=='string')return null;
 if(['dark','night'].includes(theme.toLowerCase()))return 'dark';
 if(['light','day'].includes(theme.toLowerCase()))return 'light';
 return null;
}
function readContext(payload){
 if(!payload||typeof payload!=='object')return null;
 const context={};
 const language=payload.language??payload.lang??payload.locale;
 const normalizedLanguage=window.Tikhon.i18n.normalize(language);
 if(normalizedLanguage)context.language=normalizedLanguage;
 const theme=normalizeTheme(payload.theme??payload.colorScheme);
 if(theme)context.theme=theme;
 if(typeof payload.favorite==='boolean')context.favorite=payload.favorite;
 else if(typeof payload.isFavorite==='boolean')context.favorite=payload.isFavorite;
 return Object.keys(context).length?context:null;
}
function emitContext(context){if(!context)return;Object.assign(currentContext,context);for(const cb of contextCallbacks){try{cb({...context})}catch(error){console.warn('Platform appearance listener failed:',error);}}}
window.addEventListener('message',event=>{
 // Do not read or manipulate parent DOM. Accept visual state only from the enclosing host.
 if(window.parent===window||event.source!==window.parent)return;
 const data=event.data;
 if(!data||typeof data!=='object')return;
 const isPlatformSettings=data.channel==='SC_PLATFORM_SETTINGS';
 if(!isPlatformSettings&&!VALID_MESSAGE_TYPES.has(data.type))return;
 const context=readContext(isPlatformSettings?data:(data.payload??data.detail??data));
 if(context?.theme)explicitTheme=true;
 emitContext(context);
});
const media=window.matchMedia?.('(prefers-color-scheme: dark)');
let explicitTheme=false;
const params=new URLSearchParams(window.location.search);
const initialTheme=normalizeTheme(params.get('theme'))||(media?.matches?'dark':'light');
if(normalizeTheme(params.get('theme')))explicitTheme=true;
const currentContext={theme:initialTheme,language:window.Tikhon.i18n.normalize(params.get('lang'))||window.Tikhon.i18n.normalize(params.get('language'))||window.Tikhon.i18n.normalize(navigator.language)||'ru'};
media?.addEventListener?.('change',event=>{if(!explicitTheme)emitContext({theme:event.matches?'dark':'light'});});
function subscribeContext(callback){
 contextCallbacks.add(callback);callback({...currentContext});
 return()=>contextCallbacks.delete(callback);
}
function setHostTheme(theme){if(normalizeTheme(theme))explicitTheme=true;}
function requestContext(){
 if(window.parent===window)return;
 // This optional UI-only request does not affect SDK traffic or expose private data.
 window.parent.postMessage({type:'supercube:request-ui-state'},'*');
}
window.Tikhon.platform_sdk={hasPlatform,getUser,loadSave,save,track,favorite,getFavoriteStatus,subscribeContext,setHostTheme,requestContext};
})();
