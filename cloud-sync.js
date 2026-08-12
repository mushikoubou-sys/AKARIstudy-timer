import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {getAuth,setPersistence,browserLocalPersistence,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {initializeFirestore,persistentLocalCache,persistentMultipleTabManager,doc,getDoc,setDoc,onSnapshot,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

const app=initializeApp(window.AKARI_FIREBASE_CONFIG);
const auth=getAuth(app);
const db=initializeFirestore(app,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})});
let user=null,unsubscribe=null,remoteHandler=null,readyResolve;
const ready=new Promise(resolve=>readyResolve=resolve);

await setPersistence(auth,browserLocalPersistence);
onAuthStateChanged(auth,current=>{
  user=current;
  if(unsubscribe){unsubscribe();unsubscribe=null}
  window.dispatchEvent(new CustomEvent('akari-auth',{detail:{user:current?{uid:current.uid,email:current.email}:null}}));
  readyResolve?.(current);readyResolve=null;
  if(current&&remoteHandler){subscribe(remoteHandler)}
});

function dataRef(){if(!user)throw new Error('ログインが必要です');return doc(db,'users',user.uid,'app','state')}
function subscribe(handler){remoteHandler=handler;if(!user)return;unsubscribe?.();unsubscribe=onSnapshot(dataRef(),{includeMetadataChanges:true},snapshot=>{handler(snapshot.exists()?snapshot.data().payload:null,{fromCache:snapshot.metadata.fromCache,pending:snapshot.metadata.hasPendingWrites})},error=>window.dispatchEvent(new CustomEvent('akari-sync-error',{detail:error})))}
async function write(payload){await ready;if(!user)throw new Error('ログインが必要です');await setDoc(dataRef(),{payload,updatedAt:serverTimestamp(),schemaVersion:2},{merge:true})}
async function read(){await ready;if(!user)return null;const snapshot=await getDoc(dataRef());return snapshot.exists()?snapshot.data().payload:null}

window.AKARI_CLOUD={
  ready,login:(email,password)=>signInWithEmailAndPassword(auth,email,password),
  register:(email,password)=>createUserWithEmailAndPassword(auth,email,password),logout:()=>signOut(auth),
  currentUser:()=>user,read,write,subscribe
};
window.dispatchEvent(new Event('akari-cloud-ready'));
