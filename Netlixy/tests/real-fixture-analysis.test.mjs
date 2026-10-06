import assert from 'node:assert/strict';
import fs from 'node:fs';
import {analyzeRealFixtureText,summarizeRealFixtures} from '../src/real-fixture-analysis.js';
const index=JSON.parse(fs.readFileSync(new URL('./fixtures/operators-real/index.json',import.meta.url),'utf8'));
assert.deepEqual(index.samples,[],'no real samples are fabricated');
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
console.log('real fixture infrastructure: empty real index, profiles ON/OFF comparison and per-operator stats passed');
