import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RECENT_TTL_MS,createRecentRecord,formatRecentExpiry,isRecentExpired,migrateLegacyNetwork,promoteRecentRecord,renewRecentRecord,sameNetworkIdentity,toSaved} from '../src/network-lifecycle.js';

const start=Date.parse('2026-01-10T12:00:00.000Z');
const legacy={id:'legacy-1',ssid:'Casa',password:'Clave1234',security:'WPA/WPA2',note:'Salón',createdAt:'2025-01-01T00:00:00.000Z',origin:'manual'};
const migrated=migrateLegacyNetwork(legacy);
assert.equal(migrated.type,'saved');
for(const [key,value] of Object.entries(legacy))assert.equal(migrated[key],value,`migration preserves ${key}`);
assert.equal(migrateLegacyNetwork(migrated),migrated,'migration is idempotent');

const recent=createRecentRecord({ssid:'Casa',password:'Clave1234',security:'WPA/WPA2',note:'Cliente · salón'},{now:start});
assert.equal(recent.type,'recent');
assert.equal(Date.parse(recent.expiresAt)-Date.parse(recent.lastUsedAt),RECENT_TTL_MS);
assert.equal(Date.parse(recent.expiresAt),start+48*60*60*1000);
assert.equal(isRecentExpired(recent,start+47*60*60*1000+59*60*1000),false,'47h59m remains available');
assert.equal(isRecentExpired(recent,start+48*60*60*1000+60*1000),true,'48h01m is expired');
assert.equal(formatRecentExpiry(recent.expiresAt,start+11*60*60*1000),'Caduca en 37 h');
assert.equal(formatRecentExpiry(recent.expiresAt,start+47*60*60*1000),'Caduca en 1 h');
assert.equal(formatRecentExpiry(recent.expiresAt,start+47*60*60*1000+30*60*1000),'Caduca en menos de 1 h');

const touched=renewRecentRecord(recent,start+43*60*60*1000);
assert.equal(Date.parse(touched.expiresAt)-Date.parse(touched.lastUsedAt),RECENT_TTL_MS,'use renews a full 48 hours');
assert.equal(Date.parse(touched.expiresAt),start+91*60*60*1000);
assert.equal(touched.id,recent.id);
assert.equal(sameNetworkIdentity(recent,{ssid:'casa',security:'WPA/WPA2'}),false,'SSID matching preserves case because SSIDs may differ by case');
assert.equal(sameNetworkIdentity(recent,{ssid:'Casa',security:'WPA3'}),false,'security participates in the duplicate key');

const refreshed=createRecentRecord({ssid:'Casa',password:'ClaveNueva',security:'WPA/WPA2',note:''},{existing:recent,now:start+1000});
assert.equal(refreshed.id,recent.id,'same recent network keeps one record');
assert.equal(refreshed.password,'ClaveNueva','reviewed recent credentials update');
assert.equal(refreshed.note,'Cliente · salón','an empty note does not erase the prior note');
assert.equal(refreshed.createdAt,recent.createdAt);
assert.equal(Date.parse(refreshed.expiresAt),start+1000+RECENT_TTL_MS);

const permanent=toSaved(recent,start+2000);
assert.equal(permanent.type,'saved');
assert.equal('expiresAt' in permanent,false,'saved network has no expiration');
assert.equal('lastUsedAt' in permanent,false);
assert.equal(permanent.note,recent.note);
const promoted=promoteRecentRecord(recent,null,{now:start+3000});
assert.equal(promoted.network.type,'saved');
assert.deepEqual(promoted.removeIds,[],'promotion keeps the same recent entry ID');
assert.equal(promoted.network.id,recent.id);

const existingSaved={...legacy,type:'saved'};
const conflict=promoteRecentRecord({...recent,password:'Different123'},existingSaved,{now:start+4000});
assert.equal(conflict.conflict,true,'different saved credentials require explicit confirmation');
assert.equal(conflict.saved.password,legacy.password,'conflict never mutates the saved record');
const replaced=promoteRecentRecord({...recent,password:'Different123'},existingSaved,{replaceExisting:true,now:start+4000});
assert.equal(replaced.network.id,existingSaved.id,'promotion does not duplicate an existing saved network');
assert.equal(replaced.network.password,'Different123');
assert.equal(replaced.network.type,'saved');
assert.deepEqual(replaced.removeIds,[recent.id]);
const sameCredentials=promoteRecentRecord(recent,{...existingSaved,password:recent.password},{now:start+5000});
assert.equal(sameCredentials.network.id,existingSaved.id);
assert.deepEqual(sameCredentials.removeIds,[recent.id]);

const storage=fs.readFileSync(new URL('../src/storage.js',import.meta.url),'utf8');
assert.match(storage,/const DB_VERSION=2/,'IndexedDB schema version is incremented');
assert.match(storage,/event\.oldVersion>0[\s\S]*?openCursor\(\)[\s\S]*?migrateLegacyNetwork/,'upgrade walks and migrates existing IndexedDB records');
for(const api of ['saveRecentNetwork','savePermanentNetwork','promoteRecentToSaved','touchRecentNetwork','cleanupExpiredRecents','listRecentNetworks','listSavedNetworks','clearRecentNetworks','clearSavedNetworks'])assert.match(storage,new RegExp(`export async function ${api}|export const ${api}`),`${api} is centralized in storage`);
assert.match(storage,/export async function getAllNetworks\(/,'legacy storage listing API remains available');
assert.match(storage,/export const saveNetwork=/,'legacy storage save API remains available');
assert.match(storage,/export const deleteNetwork=/,'legacy storage delete API remains available');

class FakeRequest { result=undefined;error=undefined;onsuccess=null;onerror=null; }
class FakeStore {
  constructor(records,tx){this.records=records;this.tx=tx;this.indexNames={contains:()=>true};}
  createIndex(){}
  getAll(){const req=new FakeRequest();this.tx.enqueue(()=>{req.result=[...this.records.values()].map(value=>structuredClone(value));req.onsuccess?.();});return req;}
  get(id){const req=new FakeRequest();this.tx.enqueue(()=>{const value=this.records.get(id);req.result=value===undefined?undefined:structuredClone(value);req.onsuccess?.();});return req;}
  put(value){const req=new FakeRequest();this.tx.enqueue(()=>{this.records.set(value.id,structuredClone(value));req.result=value.id;req.onsuccess?.();});return req;}
  delete(id){const req=new FakeRequest();this.tx.enqueue(()=>{this.records.delete(id);req.result=undefined;req.onsuccess?.();});return req;}
  clear(){const req=new FakeRequest();this.tx.enqueue(()=>{this.records.clear();req.onsuccess?.();});return req;}
  openCursor(){const req=new FakeRequest();let entries=[...this.records.entries()],index=0;req.start=done=>{const next=()=>queueMicrotask(()=>{if(index>=entries.length){req.result=null;req.onsuccess?.();done();return;}const [key,value]=entries[index++];req.result={value:structuredClone(value),update:nextValue=>this.records.set(key,structuredClone(nextValue)),continue:next};req.onsuccess?.();});next();};(this.tx.cursorRequests||= []).push(req);return req;}
}
class FakeTransaction {
  pending=0;completeHandler=null;completed=false;
  constructor(records){this.store=new FakeStore(records,this);}
  objectStore(){return this.store;}
  enqueue(callback){this.pending++;queueMicrotask(()=>{callback();this.pending--;this.maybeComplete();});}
  set oncomplete(handler){this.completeHandler=handler;this.maybeComplete();}
  get oncomplete(){return this.completeHandler;}
  maybeComplete(){if(!this.completed&&this.pending===0&&this.completeHandler){this.completed=true;queueMicrotask(()=>this.completeHandler?.());}}
}
class FakeDatabase {
  constructor(records,version){this.records=records;this.version=version;this.objectStoreNames={contains:name=>name==='networks'};}
  createObjectStore(){return new FakeStore(this.records,new FakeTransaction(this.records));}
  transaction(){return new FakeTransaction(this.records);}
}
const fakeRecords=new Map([[legacy.id,legacy]]);
const fakeDatabase=new FakeDatabase(fakeRecords,1);
const fakeIndexedDB={open(_name,version){const req=new FakeRequest();queueMicrotask(()=>{const oldVersion=fakeDatabase.version;req.result=fakeDatabase;if(version>oldVersion){fakeDatabase.version=version;req.transaction=new FakeTransaction(fakeRecords);req.onupgradeneeded?.({oldVersion});const cursors=req.transaction.cursorRequests||[];if(cursors.length)cursors.at(-1).start(()=>req.onsuccess?.());else req.onsuccess?.();}else req.onsuccess?.();});return req;}};
globalThis.window=globalThis;
globalThis.indexedDB=fakeIndexedDB;
const dbStorage=await import('../src/storage.js?network-test=1');
const oldSaved=await dbStorage.getNetwork('legacy-1');
assert.equal(oldSaved.type,'saved','real storage upgrade marks the legacy record as saved');
assert.equal(oldSaved.password,legacy.password,'IndexedDB migration keeps the existing credential');
assert.equal(oldSaved.note,legacy.note,'IndexedDB migration keeps the existing note');
await dbStorage.saveNetwork({...oldSaved,note:'Nota editada'});
assert.equal((await dbStorage.getNetwork('legacy-1')).note,'Nota editada','legacy CRUD update remains compatible');
const storedRecent=await dbStorage.saveRecentNetwork({ssid:'Temporal',password:'Temp12345',security:'WPA/WPA2',note:'Cliente A'},{now:start});
const updatedRecent=await dbStorage.saveRecentNetwork({ssid:'Temporal',password:'Actualizada123',security:'WPA/WPA2',note:''},{now:start+1000});
assert.equal(updatedRecent.id,storedRecent.id,'storage deduplicates repeated recent networks');
assert.equal(updatedRecent.password,'Actualizada123');
assert.equal(updatedRecent.note,'Cliente A');
assert.equal((await dbStorage.listRecentNetworks({now:start+1000})).length,1);
const closedRecent=await dbStorage.getNetwork(storedRecent.id,{now:start+90*60*1000});
assert.equal(closedRecent.type,'recent','closing without Save leaves the confirmed scan temporary');
assert.equal(closedRecent.note,'Cliente A','the note stays on the recent entry');
const renewed=await dbStorage.touchRecentNetwork(updatedRecent.id,{now:start+2*60*60*1000});
assert.equal(Date.parse(renewed.expiresAt),start+50*60*60*1000,'opening a recent renews from the injected clock');
const copiedAt=await dbStorage.touchRecentNetwork(updatedRecent.id,{now:start+4*60*60*1000});
assert.equal(Date.parse(copiedAt.expiresAt),start+52*60*60*1000,'copying a recent credential can renew its expiry');
const qrAt=await dbStorage.touchRecentNetwork(updatedRecent.id,{now:start+6*60*60*1000});
assert.equal(Date.parse(qrAt.expiresAt),start+54*60*60*1000,'showing the QR for a recent can renew its expiry');
const promotion=await dbStorage.promoteRecentToSaved(updatedRecent.id,{now:start+3*60*60*1000});
assert.equal(promotion.network.type,'saved');
assert.equal(promotion.network.id,updatedRecent.id);
assert.equal('expiresAt' in promotion.network,false);
assert.equal((await dbStorage.listRecentNetworks({now:start+3*60*60*1000})).length,0);
assert.equal((await dbStorage.listSavedNetworks({now:start+3*60*60*1000})).length,2);
const exactSaved=await dbStorage.savePermanentNetwork({id:'saved-current',ssid:'Guardada',password:'SavedPass123',security:'WPA/WPA2',note:'Cliente · salón',createdAt:new Date(start).toISOString()},{now:start});
const scanMatchingSaved=await dbStorage.saveRecentNetwork({ssid:'Guardada',password:'SavedPass123',security:'WPA/WPA2',note:exactSaved.note},{now:start+1000});
assert.equal(scanMatchingSaved.id,exactSaved.id,'a reviewed scan matching a saved network reuses it without a temporary duplicate');
assert.equal(scanMatchingSaved.type,'saved');
assert.equal((await dbStorage.listRecentNetworks({now:start+1000})).some(n=>n.ssid==='Guardada'),false);
const scanChangedSaved=await dbStorage.saveRecentNetwork({ssid:'Guardada',password:'NewPass123',security:'WPA/WPA2',note:exactSaved.note},{now:start+2000});
assert.equal(scanChangedSaved.type,'recent','changed reviewed credentials remain temporary pending an explicit choice');
const expiring=await dbStorage.saveRecentNetwork({ssid:'Caduca',password:'Temp12345',security:'WPA/WPA2'},{now:start});
assert.equal((await dbStorage.listRecentNetworks({now:start+47*60*60*1000+59*60*1000})).some(n=>n.id===expiring.id),true);
assert.equal((await dbStorage.listRecentNetworks({now:start+48*60*60*1000+60*1000})).some(n=>n.id===expiring.id),false,'access cleans recently expired rows');
const removable=await dbStorage.saveRecentNetwork({ssid:'Borrar',password:'Temp12345',security:'WPA/WPA2'},{now:start});
await dbStorage.deleteNetwork(removable.id);
assert.equal(await dbStorage.getNetwork(removable.id),undefined,'legacy delete API still removes rows');
const anotherRecent=await dbStorage.saveRecentNetwork({ssid:'Temporal 2',password:'Temp12345',security:'WPA/WPA2'},{now:start});
assert.equal(await dbStorage.clearRecentNetworks(),1);
assert.equal((await dbStorage.listRecentNetworks({now:start})).length,0);
const savedConflict=await dbStorage.savePermanentNetwork({id:'saved-conflict',ssid:'Cliente',password:'Saved12345',security:'WPA/WPA2',note:'Router anterior',createdAt:new Date(start).toISOString()},{now:start});
const recentConflict=await dbStorage.saveRecentNetwork({ssid:'Cliente',password:'NewPass123',security:'WPA/WPA2',note:'Router revisado'},{now:start});
const declinedConflict=await dbStorage.promoteRecentToSaved(recentConflict.id,{now:start});
assert.equal(declinedConflict.conflict,true,'storage asks the UI to confirm changed saved credentials');
assert.equal((await dbStorage.getNetwork(savedConflict.id,{now:start})).password,'Saved12345','unconfirmed promotion leaves saved credentials intact');
const confirmedConflict=await dbStorage.promoteRecentToSaved(recentConflict.id,{replaceExisting:true,now:start});
assert.equal(confirmedConflict.network.id,savedConflict.id,'confirmed replacement does not create a saved duplicate');
assert.equal(confirmedConflict.network.password,'NewPass123');
assert.equal(confirmedConflict.network.note,'Router revisado');
assert.equal((await dbStorage.listRecentNetworks({now:start})).length,0);
await dbStorage.saveNetwork({...legacy,id:'legacy-2',type:'saved'});
assert.equal(await dbStorage.clearSavedNetworks(),5,'saved cleanup is scoped to permanent rows');
assert.equal((await dbStorage.getAllNetworks()).length,0,'legacy all-networks API reads the migrated database');
assert.ok(anotherRecent.id);

console.log('networks: deterministic 48h expiry, renewal, deduplication, password conflict, promotion, legacy migration, and storage API compatibility passed');
