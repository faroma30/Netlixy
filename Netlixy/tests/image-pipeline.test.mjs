import assert from 'node:assert/strict';
import {analyzeRouterImage} from '../src/router-image-analysis.js';
const input=new Blob(['x'],{type:'image/jpeg'}),calls=[];let qrPassed;
const result=await analyzeRouterImage(input,{decodeQr:async()=>{calls.push('qr');return {type:'wifi',status:'wifi',ssid:'ExampleNet',password:'ExamplePass123',security:'WPA/WPA2'};},recognize:async(_blob,options)=>{calls.push('ocr');qrPassed=options.qrResult;return {rawText:'RED Wi-Fi ExampleNet',normalizedText:'RED Wi-Fi ExampleNet',confidence:90,passes:[]};}});
assert.deepEqual(calls,['qr','ocr']);assert.equal(qrPassed.status,'wifi');assert.equal(result.parsed.ssid.value,'ExampleNet');assert.equal(result.source,'qr');
const fallback=await analyzeRouterImage(input,{decodeQr:async()=>({type:'wifi',status:'wifi',ssid:'QRNet',password:'QRPass1234',security:'WPA/WPA2'}),recognize:async()=>{throw Error('OCR failed');}});assert.equal(fallback.parsed.ssid.value,'QRNet');assert.match(fallback.ocrError,/OCR failed/);
await assert.rejects(()=>analyzeRouterImage(new Blob(['x'],{type:'text/plain'})),/fotografía válida/);
console.log('router-image-analysis: QR-first, shared OCR/parser and local fallback passed');



