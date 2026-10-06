const DB_NAME='wifi-connect-local';
const DB_VERSION=1;
let dbPromise;
function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)){reject(new Error('IndexedDB no está disponible en este navegador.'));return;}
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('networks')){const store=db.createObjectStore('networks',{keyPath:'id'});store.createIndex('createdAt','createdAt');}}
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  return dbPromise;
}
function transaction(mode,operation){return openDB().then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('networks',mode);const store=tx.objectStore('networks');let result;try{result=operation(store);}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(result?.result??result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Operación cancelada'));}));}
export const getAllNetworks=()=>transaction('readonly',s=>{const req=s.getAll();return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));req.onerror=()=>reject(req.error);});});
export const getNetwork=id=>transaction('readonly',s=>{const req=s.get(id);return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});});
export const saveNetwork=data=>transaction('readwrite',s=>s.put(data));
export const deleteNetwork=id=>transaction('readwrite',s=>s.delete(id));
export const clearNetworks=()=>transaction('readwrite',s=>s.clear());
