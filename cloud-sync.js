(function(){
  const endpoint='https://firestore.googleapis.com/v1/projects/akari-study-timer/databases/(default)/documents/public/mikabu';
  const PUBLIC_USER={uid:'public-mikabu',email:'ログイン不要'};
  let handler=null,lastRevision=0,pollTimer=null;

  async function request(url,options={}){
    const response=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
    if(response.status===404)return null;
    if(!response.ok)throw new Error(`クラウド通信エラー: ${response.status}`);
    return response.json();
  }
  function decode(document){
    if(!document?.fields?.payload?.stringValue)return null;
    try{return JSON.parse(document.fields.payload.stringValue)}catch{return null}
  }
  async function read(){return decode(await request(endpoint))}
  async function write(payload){
    await request(`${endpoint}?updateMask.fieldPaths=payload&updateMask.fieldPaths=revision&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=schemaVersion`,{method:'PATCH',body:JSON.stringify({fields:{payload:{stringValue:JSON.stringify(payload)},revision:{integerValue:String(payload.revision||Date.now())},updatedAt:{timestampValue:new Date().toISOString()},schemaVersion:{integerValue:'4'}}})});
    lastRevision=payload.revision||lastRevision;
  }
  async function poll(){
    if(!handler)return;
    try{const payload=await read();if(payload&&(payload.revision||0)>lastRevision){lastRevision=payload.revision||0;handler(payload,{fromCache:false,pending:false})}}catch(error){window.dispatchEvent(new CustomEvent('akari-sync-error',{detail:error}))}
  }
  function subscribe(next){handler=next;clearInterval(pollTimer);poll();pollTimer=setInterval(poll,2000)}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)poll()});window.addEventListener('focus',poll);

  window.AKARI_CLOUD={ready:Promise.resolve(PUBLIC_USER),currentUser:()=>PUBLIC_USER,read,write,subscribe,logout:async()=>{}};
  window.dispatchEvent(new Event('akari-cloud-ready'));
})();
