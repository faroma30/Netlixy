import assert from 'node:assert/strict';
import {parseWifiQrPayload,decodeQrPayloadFromImage} from '../src/wifi-qr.js';
import {parseRouterLabel} from '../src/router-parser.js';

const valid='WIFI:T:WPA;S:RouterDemo-DFD9;P:DemoClave987;;';
assert.deepEqual(parseWifiQrPayload(valid),{type:'wifi',ssid:'RouterDemo-DFD9',password:'DemoClave987',security:'WPA/WPA2',hidden:false});
assert.deepEqual(parseWifiQrPayload('WIFI:T:nopass;S:Guest;;'),{type:'wifi',ssid:'Guest',password:'',security:'Sin contraseña',hidden:false});
assert.deepEqual(parseWifiQrPayload('WIFI:T:WPA;S:Casa\\;sala;P:p\\;ass\\:1;;'),{type:'wifi',ssid:'Casa;sala',password:'p;ass:1',security:'WPA/WPA2',hidden:false});
assert.equal(parseWifiQrPayload('https://example.com/wifi'),null,'URLs are not Wi-Fi payloads');
assert.equal(parseWifiQrPayload('WIFI:T:UNKNOWN;S:Guest;P:password;;'),null,'unknown security types are ignored');

const originalBitmap=globalThis.createImageBitmap;
globalThis.createImageBitmap=async()=>({width:8,height:8,close(){}});
const blob=new Blob(['local photo'],{type:'image/jpeg'});
const canvasFactory=()=>({width:0,height:0,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(8*8*4)})})});
try{
 class NativeQr {async detect(){return [{rawValue:valid}];}}
 const native=await decodeQrPayloadFromImage(blob,{barcodeDetector:NativeQr,fallback:()=>{throw new Error('fallback should not run after a valid native result');}});
 assert.equal(native.status,'wifi');assert.equal(native.source,'BarcodeDetector');assert.equal(native.ssid,'RouterDemo-DFD9');
 class UrlQr {async detect(){return [{rawValue:'https://example.com'}];}}
 const ignored=await decodeQrPayloadFromImage(blob,{barcodeDetector:UrlQr,fallback:()=>({data:'https://example.com'}),canvasFactory});
 assert.deepEqual(ignored,{status:'ignored',reason:'not-wifi-qr'},'non-Wi-Fi QR payloads are discarded');
 const fallback=await decodeQrPayloadFromImage(blob,{barcodeDetector:undefined,fallback:()=>({data:valid}),canvasFactory});
 assert.equal(fallback.status,'wifi');assert.equal(fallback.source,'jsQR');
}finally{if(originalBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=originalBitmap;}

const matching=parseRouterLabel({normalizedText:'RED Wi-Fi RouterDemo-DFD9\nCLAVE Wi-Fi DemoClave987',qr:parseWifiQrPayload(valid)});
assert.ok(matching.warnings.some(text=>text.includes('coinciden')));
const conflict=parseRouterLabel({normalizedText:'RED Wi-Fi OtherNetwork\nCLAVE Wi-Fi OtherPassword123',qr:parseWifiQrPayload(valid)});
assert.ok(conflict.warnings.some(text=>text.includes('no coinciden')));
assert.ok(conflict.ssidCandidates.filter(item=>item.score>=70).every(item=>item.needsReview));
assert.ok(conflict.passwordCandidates.filter(item=>item.score>=70).every(item=>item.needsReview));
const securityConflict=parseRouterLabel({normalizedText:'RED Wi-Fi RouterDemo-DFD9\nCLAVE Wi-Fi DemoClave987\nSecurity: WEP',qr:parseWifiQrPayload(valid)});
assert.ok(securityConflict.warnings.some(text=>text.includes('no coinciden')));assert.equal(securityConflict.security.value,'WEP');assert.equal(securityConflict.security.needsReview,true);
console.log('Wi-Fi QR parser/reader: WPA/open payloads, escaping, native/fallback decoding, non-Wi-Fi rejection and OCR conflicts passed');
