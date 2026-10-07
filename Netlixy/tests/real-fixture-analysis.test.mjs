import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeRealFixtureText,summarizeRealFixtures} from '../src/real-fixture-analysis.js';
const index=JSON.parse(fs.readFileSync(new URL('./fixtures/operators-real/index.json',import.meta.url),'utf8'));
assert.ok(Array.isArray(index.samples),'real sample index is readable');
const text='SSID: TEST_WIFI\nWLAN Key: ExampleKey123\nWPA2';
const compared=analyzeRealFixtureText(text,{operator:'unknown',ssid:'TEST_WIFI',password:'ExampleKey123',security:'WPA/WPA2'});
assert.equal(compared.generic.matches.ssid,true);assert.equal(compared.profiled.matches.password,true);assert.equal(compared.generic.top.password.value,compared.profiled.top.password.value);
assert.equal(compared.differences.passwordValueChanged,false);assert.equal(compared.differences.passwordScoreDelta,0);
const stats=summarizeRealFixtures([
 {operator:'digi',status:'reviewed',operatorCorrect:true,ssidCorrect:true,passwordCorrect:false,securityCorrect:true,manualCorrection:true,ocrCorrect:false,parserCorrect:false},
 {operator:'digi',status:'pending',operatorCorrect:false,ssidCorrect:false},
 {operator:'unknown',status:'reviewed',operatorCorrect:true,ssidCorrect:true,passwordCorrect:true,securityCorrect:true}
]);
assert.deepEqual(stats.digi,{samples:1,operatorCorrect:1,ssidCorrect:1,passwordCorrect:0,securityCorrect:1,manualCorrections:1,ocrErrors:1,parserErrors:1});
assert.equal(stats.movistar.samples,0);assert.equal(Object.keys(stats).length,7);
const huaweiText='username:root\npassword:adminHW\nSSID1:HUAWEI-2.4G-28bi\nSSID2:HUAWEI-5G-28bi\nWLAN Key: dab918ck';
const huaweiExpected={operator:'unknown',ssid:'HUAWEI-2.4G-28bi',ssids:['HUAWEI-2.4G-28bi','HUAWEI-5G-28bi'],password:'dab918ck',security:'WPA/WPA2'};
const realIndex=JSON.parse(fs.readFileSync(new URL('./fixtures/operators-real/index.json',import.meta.url),'utf8'));
const sample=realIndex.samples.find(item=>item.id==='huawei-eg8145v5-real-001');
assert.equal(sample.manufacturer,'Huawei');assert.equal(sample.model,'EchoLife EG8145V5');assert.equal(sample.operator,'unknown');assert.equal(sample.source,'real-photo-text-transcription');
assert.equal(compared.generic.top.operator,null,'Huawei label does not infer a network operator');
const huaweiAnalysis=analyzeRealFixtureText(huaweiText,huaweiExpected);
assert.equal(huaweiAnalysis.generic.matches.ssid,true,'real analysis accepts both expected SSID candidates');
assert.equal(huaweiAnalysis.generic.matches.password,true);assert.equal(huaweiAnalysis.generic.matches.security,true);assert.equal(huaweiAnalysis.generic.matches.operator,true);
assert.deepEqual(huaweiAnalysis.generic.top.ssids.map(item=>item.value),huaweiExpected.ssids);
console.log('real fixture infrastructure: Huawei photo-derived text fixture, both SSIDs, credentials, inferred security, unknown operator and per-operator stats passed');
