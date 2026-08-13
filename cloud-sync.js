(function(){
  const endpoint='https://firestore.googleapis.com/v1/projects/akari-study-timer/databases/(default)/documents/public/mikabu';
  const PUBLIC_USER={uid:'public-mikabu',email:'ログイン不要'};
  let handler=null,pollTimer=null,polling=false,lastRevision=0;

  async function request(url,options={}){
    const response=await fetch(url,{cache:'no-store',...options,headers:{'Content-Type':'application/json','Cache-Control':'no-cache',...(options.headers||{})}});
    if(response.status===404)return null;
    if(!response.ok){const error=new Error(`クラウド通信エラー: ${response.status}`);error.status=response.status;throw error}
    return response.json();
  }
  function decode(document){
    if(!document?.fields?.payload?.stringValue)return null;
    try{return JSON.parse(document.fields.payload.stringValue)}catch{return null}
  }
  async function readDocument(){return request(`${endpoint}?t=${Date.now()}`)}
  async function read(){return decode(await readDocument())}
  async function write(payload,updateTime=null){
    const precondition=updateTime?`&currentDocument.updateTime=${encodeURIComponent(updateTime)}`:'';
    await request(`${endpoint}?updateMask.fieldPaths=payload&updateMask.fieldPaths=revision&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=schemaVersion${precondition}`,{
      method:'PATCH',
      body:JSON.stringify({fields:{payload:{stringValue:JSON.stringify(payload)},revision:{integerValue:String(payload.revision||Date.now())},updatedAt:{timestampValue:new Date().toISOString()},schemaVersion:{integerValue:'5'}}})
    });
    lastRevision=Math.max(lastRevision,payload.revision||0);
    return payload;
  }
  async function writeMerged(localPayload,merge){
    for(let attempt=0;attempt<4;attempt+=1){
      const document=await readDocument();
      const remote=decode(document);
      const combined=merge(remote,localPayload);
      combined.revision=Math.max(Date.now(),remote?.revision||0,localPayload?.revision||0,combined.revision||0);
      try{return await write(combined,document?.updateTime||null)}catch(error){if(![409,412].includes(error.status)||attempt===3)throw error}
    }
  }
  async function poll({force=false}={}){
    if(polling)return null;
    polling=true;
    try{
      const document=await readDocument(),payload=decode(document),revision=payload?.revision||0;
      const changed=revision>lastRevision;
      lastRevision=Math.max(lastRevision,revision);
      if(handler&&(force||changed||payload))handler(payload,{fromCache:false,pending:false,changed,receivedAt:Date.now(),serverUpdatedAt:document?.fields?.updatedAt?.timestampValue||null});
      return payload;
    }catch(error){window.dispatchEvent(new CustomEvent('akari-sync-error',{detail:error}));throw error}
    finally{polling=false}
  }
  function schedulePoll(){
    clearTimeout(pollTimer);
    pollTimer=setTimeout(async()=>{try{await poll()}catch{}schedulePoll()},2500);
  }
  function subscribe(next){handler=next;poll({force:true}).catch(()=>{});schedulePoll();return()=>{handler=null;clearTimeout(pollTimer)}}
  function refresh(){return poll({force:true})}
  function resume(){refresh().catch(()=>{});schedulePoll()}

  document.addEventListener('visibilitychange',()=>{if(!document.hidden)resume()});
  window.addEventListener('focus',resume);
  window.addEventListener('pageshow',resume);
  window.addEventListener('online',resume);
  window.addEventListener('offline',()=>window.dispatchEvent(new Event('akari-offline')));

  window.AKARI_CLOUD={ready:Promise.resolve(PUBLIC_USER),currentUser:()=>PUBLIC_USER,read,write,writeMerged,subscribe,refresh,logout:async()=>{}};
  window.dispatchEvent(new Event('akari-cloud-ready'));
})();
