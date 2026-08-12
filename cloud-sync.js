import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const app=initializeApp(window.AKARI_FIREBASE_CONFIG);
const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
const PUBLIC_USER={uid:'public-mikabu',email:'ログイン不要'};
const ready=Promise.resolve(PUBLIC_USER);
let unsubscribe=null;

function dataRef(){return doc(db,'public','mikabu')}
function subscribe(handler){unsubscribe?.();unsubscribe=onSnapshot(dataRef(),{includeMetadataChanges:true},snapshot=>{handler(snapshot.exists()?snapshot.data().payload:null,{fromCache:snapshot.metadata.fromCache,pending:snapshot.metadata.hasPendingWrites})},error=>window.dispatchEvent(new CustomEvent('akari-sync-error',{detail:error})))}
async function write(payload){await setDoc(dataRef(),{payload,updatedAt:serverTimestamp(),schemaVersion:3},{merge:true})}
async function read(){const snapshot=await getDoc(dataRef());return snapshot.exists()?snapshot.data().payload:null}

window.AKARI_CLOUD={ready,currentUser:()=>PUBLIC_USER,read,write,subscribe,logout:async()=>{}};
window.dispatchEvent(new Event('akari-cloud-ready'));
