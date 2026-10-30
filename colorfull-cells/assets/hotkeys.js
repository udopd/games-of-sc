window.GameHotkeys = function(event) {
  const code=event.code||'',key=(event.key||'').toLowerCase();
  if(code==='Space'||code==='KeyF'||key===' '||key==='f'||key==='а')return {type:'paint'};
  if(code==='KeyE'||key==='e'||key==='у')return {type:'erase'};
  const digit=/^(?:Digit|Numpad)([1-8])$/.exec(code)||/^([1-8])$/.exec(key);
  if(digit)return {type:'color',color:Number(digit[1])-1};
  if(code==='KeyQ'||code==='BracketLeft'||key==='q'||key==='й'||key==='[')return {type:'cycle',delta:-1};
  if(code==='KeyR'||code==='BracketRight'||key==='r'||key==='к'||key===']')return {type:'cycle',delta:1};
  return null;
};
