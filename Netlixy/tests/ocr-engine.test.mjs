import assert from 'node:assert/strict';
import Tesseract from 'tesseract.js';
import {fileURLToPath} from 'node:url';
import {parseRouterLabel} from '../src/router-parser.js';
const {createWorker,OEM,PSM}=Tesseract;
const langPath=fileURLToPath(new URL('../vendor/tesseract/lang/',import.meta.url));
const fixture=fileURLToPath(new URL('./fixtures/router-label-test.png',import.meta.url));
const events=[];let worker;
try{
 worker=await createWorker('spa+eng',OEM.LSTM_ONLY,{langPath,gzip:true,cacheMethod:'none',logger:event=>events.push(event)},{tessedit_pageseg_mode:PSM.AUTO});
 const {data}=await worker.recognize(fixture);
 const text=String(data.text||'').toUpperCase();
 assert.match(text,/TEST[_ ]WIFI[_ ]5G/);
 assert.match(text,/TEST12345678|TEST1234567B|TEST12345678/);
 assert.match(text,/WPA2/);
 assert.ok(Number.isFinite(data.confidence));
 const parsed=parseRouterLabel({rawText:data.text,normalizedText:data.text});
 assert.match(parsed.ssid?.value||'',/TEST[_ ]WIFI[_ ]5G/i);
 assert.match(parsed.password?.value||'',/Test12345678/i);
 assert.equal(parsed.security.value,'WPA/WPA2');
 assert.equal(parsed.operator.detected,null,'la fixture OCR sin marca no debe activar perfiles');
 console.log(`PASS OCR REAL + parser fixture: propone SSID, contraseña ficticia y WPA2 (confianza OCR ${data.confidence.toFixed(1)}%; ${events.length} eventos de progreso).`);
}finally{if(worker)await worker.terminate();}
