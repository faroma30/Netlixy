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
 assert.equal(ignored.status,'ignored');assert.equal(ignored.reason,'not-wifi-qr','non-Wi-Fi QR payloads are discarded');
 const fallback=await decodeQrPayloadFromImage(blob,{barcodeDetector:undefined,fallback:()=>({data:valid}),canvasFactory});
 assert.equal(fallback.status,'wifi');assert.equal(fallback.source,'jsQR');
 let scaleCalls=0;const retry=await decodeQrPayloadFromImage(blob,{barcodeDetector:undefined,fallback:()=>++scaleCalls===1?null:{data:valid},canvasFactory});assert.equal(retry.status,'wifi');assert.equal(retry.attempts.length,2,'jsQR retries once at a distinct image scale after a miss');assert.notEqual(`${retry.attempts[0].width}x${retry.attempts[0].height}`,`${retry.attempts[1].width}x${retry.attempts[1].height}`);
}finally{if(originalBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=originalBitmap;}

const matching=parseRouterLabel({normalizedText:'RED Wi-Fi RouterDemo-DFD9\nCLAVE Wi-Fi DemoClave987',qr:parseWifiQrPayload(valid)});
assert.ok(matching.warnings.some(text=>text.includes('coinciden')));
const conflictText='RED Wi-Fi OtherNetwork\nCLAVE Wi-Fi OtherPassword123';const conflict=parseRouterLabel({normalizedText:conflictText,passes:[{id:'color',normalizedText:conflictText,confidence:91},{id:'grayscale-contrast',normalizedText:conflictText,confidence:90}],qr:parseWifiQrPayload(valid)});assert.ok(conflict.warnings.some(text=>text.includes('no coinciden')));
assert.ok(conflict.ssidCandidates.filter(item=>item.score>=70).every(item=>item.needsReview));
assert.ok(conflict.passwordCandidates.filter(item=>item.score>=70).every(item=>item.needsReview));
const securityConflict=parseRouterLabel({normalizedText:'RED Wi-Fi RouterDemo-DFD9\nCLAVE Wi-Fi DemoClave987\nSecurity: WEP',qr:parseWifiQrPayload(valid)});
assert.ok(securityConflict.warnings.some(text=>text.includes('no coinciden')));assert.equal(securityConflict.security.value,'WEP');assert.equal(securityConflict.security.needsReview,true);
assert.equal(securityConflict.password.needsReview,false,'an OCR security discrepancy does not invalidate the QR password');
console.log('Wi-Fi QR parser/reader: WPA/open payloads, escaping, native/fallback decoding, non-Wi-Fi rejection and OCR conflicts passed');
