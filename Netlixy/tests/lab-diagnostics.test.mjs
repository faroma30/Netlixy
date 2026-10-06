import assert from 'node:assert/strict';
import {buildLabDiagnostic,buildLabText,characterDifferences,compareLabValues,isLabMode} from '../src/lab-diagnostics.js';

assert.equal(isLabMode({hostname:'localhost',search:'?debug=1'}),true);
assert.equal(isLabMode({hostname:'127.0.0.1',search:'?x=2&debug=1'}),true);
assert.equal(isLabMode({hostname:'wifi.example',search:'?debug=1'}),false);
assert.equal(isLabMode({hostname:'localhost',search:''}),false);
assert.deepEqual(characterDifferences('ABCD0F12','ABCDOF12'),[{position:5,actual:'0',expected:'O'}]);
assert.deepEqual(characterDifferences('ab','abc'),[{position:3,actual:'',expected:'c'}]);
assert.equal(compareLabValues({detected:{ssid:'Red'},expected:{ssid:'red'}}).ssid.matches,false);
const input={timestamp:'2026-10-06T00:00:00.000Z',ocr:{rawText:'SSID: HOME\nWiFi Password: Case#2026',normalizedText:'SSID: HOME\nWiFi Password: Case#2026',confidence:73,durationMs:3200,languages:['spa','eng'],image:{sourceWidth:4000,sourceHeight:3000,processedWidth:2800,processedHeight:2100,orientationNormalized:true,originalBytes:9000,processedBytes:7000}},operatorDetection:{detected:{id:'digi',name:'DIGI',family:'digi'},confidence:'high',evidence:['DIGI explícito'],candidates:[]},parser:{ssidCandidates:[{value:'HOME',score:100,reason:'SSID etiquetado',sourceLine:'SSID: HOME'}],passwordCandidates:[{value:'Case#2026',score:100,reason:'Clave Wi-Fi',sourceLine:'WiFi Password: Case#2026'}],security:{value:'WPA/WPA2',inferred:true,reason:'No detectada'}},expected:{ssid:'HOME',password:'Case#2026',security:'WPA/WPA2',operator:'digi'}};
const full=buildLabDiagnostic(input);
assert.equal(full.image.width,4000);assert.equal(full.ocr.languages.join('+'),'spa+eng');assert.equal(full.comparison.password.matches,true);assert.equal(full.parser.passwordCandidates[0].score,100);
const json=JSON.stringify(full);assert.equal(/"(?:blob|imageData|base64|dataUrl)"/i.test(json),false);
const categorized=buildLabDiagnostic({...input,failureCategories:['ocr.character_incorrect']});assert.deepEqual(categorized.failureCategories,['ocr.character_incorrect']);
const redacted=buildLabDiagnostic({...input,hidePassword:true});const redactedJson=JSON.stringify(redacted);assert.equal(redactedJson.includes('Case#2026'),false);assert.equal(redacted.ocr.rawText.includes('[REDACTED]'),true);assert.equal(redacted.comparison.password.matches,true);
assert.equal(buildLabText(full).includes('Case#2026'),true);assert.equal(buildLabText(redacted).includes('Case#2026'),false);
console.log('lab diagnostics: mode, comparison, diffs, metadata, export/redaction, text and no-image checks passed');
