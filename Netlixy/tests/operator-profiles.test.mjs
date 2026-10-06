import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {parseRouterLabel} from '../src/router-parser.js';
import {detectOperator} from '../src/operator-detector.js';
import {operatorProfiles} from '../src/operator-profiles/index.js';

const fixture=path=>readFile(fileURLToPath(new URL(`./fixtures/operators/${path}`,import.meta.url)),'utf8');
const parsed=async path=>parseRouterLabel({rawText:await fixture(path)});

const digi=await parsed('digi/digi-synthetic-01.txt');
assert.equal(digi.operator.detected.id,'digi');assert.equal(digi.operator.confidence,'high');
assert.equal(digi.ssid.value,'DIGIFIBRA-TEST');assert.equal(digi.password.value,'DigiTest12345');assert.equal(digi.security.value,'WPA/WPA2');
assert.deepEqual(digi.appliedProfiles,['digi']);

for(const [path,id,ssid,password] of [
 ['movistar/movistar-synthetic-01.txt','movistar','MOVISTAR_TEST','MovistarTest123'],
 ['o2/o2-synthetic-01.txt','o2','O2_TEST','O2Test12345'],
 ['orange/orange-synthetic-01.txt','orange','ORANGE_TEST','OrangeTest123'],
 ['jazztel/jazztel-synthetic-01.txt','jazztel','JAZZTEL_TEST','JazztelTest123'],
 ['vodafone/vodafone-synthetic-01.txt','vodafone','VODAFONE_TEST','VodafoneTest123'],
 ['lowi/lowi-synthetic-01.txt','lowi','LOWI_TEST','LowiTest123']
]){const result=await parsed(path);assert.equal(result.operator.detected.id,id,`${id} is detected as a separate profile`);assert.equal(result.ssid.value,ssid);assert.equal(result.password.value,password);}

const unknown=await parsed('unknown/unknown-synthetic-01.txt');
assert.equal(unknown.operator.detected,null);assert.equal(unknown.ssid.value,'CASA_WIFI');assert.equal(unknown.password.value,'CasaWifi12345');
const unknownOff=parseRouterLabel({rawText:await fixture('unknown/unknown-synthetic-01.txt')},{operatorProfiles:false});
assert.equal(unknown.ssid.score,unknownOff.ssid.score,'un operador desconocido no penaliza los candidatos genéricos');assert.equal(unknown.password.score,unknownOff.password.score);
const admin=await parsed('digi/digi-admin-synthetic-01.txt');
assert.equal(admin.operator.detected.id,'digi');assert.equal(admin.password.value,'RealWifi9876');assert.ok(admin.excludedCandidates.some(c=>c.reason.includes('administrativa')));
const ambiguous=detectOperator({rawText:await fixture('unknown/vodafone-lowi-ambiguous-synthetic-01.txt')});
assert.equal(ambiguous.detected,null);assert.equal(ambiguous.ambiguous,true);assert.deepEqual(ambiguous.candidates.slice(0,2).map(c=>c.id),['vodafone','lowi']);
const phoneFamily=detectOperator({rawText:'Telefónica'});assert.equal(phoneFamily.detected.id,'telefonica','Telefónica alone does not force Movistar');
const ocrTypo=detectOperator({rawText:'MOVlSTAR\nSSID: CASA'});
assert.equal(ocrTypo.detected,null);assert.equal(ocrTypo.candidates[0].id,'movistar');assert.equal(ocrTypo.confidence,'low');

const comparisonText=await fixture('digi/digi-synthetic-01.txt');
const generic=parseRouterLabel({rawText:comparisonText},{operatorProfiles:false});
const enriched=parseRouterLabel({rawText:comparisonText});
assert.equal(generic.operator,null);assert.deepEqual(generic.appliedProfiles,[]);
for(const field of ['ssid','password']){
 assert.equal(enriched[field].value,generic[field].value,`${field} is never rewritten by a profile`);
 assert.equal(enriched[field].scoreBeforeProfile,generic[field].score);
 assert.equal(enriched[field].score,generic[field].score+5);
}
assert.ok(enriched.profileDiagnostics.every(d=>d.scoreAfter===d.scoreBefore+d.delta));
assert.equal(enriched.ssidCandidates.length,generic.ssidCandidates.length,'profiles do not invent extra candidate values');
assert.equal(enriched.passwordCandidates.length,generic.passwordCandidates.length,'profiles do not invent credentials');

const open=parseRouterLabel({rawText:'WiFi Guest\nSSID: GUEST\nSecurity: Open'});
assert.equal(open.security.value,'Sin contraseña');assert.equal(open.operator.detected,null);
const regressionText='DIGI\nSSID 2.4GHz: CASA\nSSID 5GHz: CASA_5G\nWPS PIN: 12345670\nAdmin Password: admin123\nMAC: AB:CD:EF:12:34:56\nSerial Number: ABC123456\nWLAN Key: Casa#2026!wifi\nSecurity: Open';
const regressionOn=parseRouterLabel({rawText:regressionText});const regressionOff=parseRouterLabel({rawText:regressionText},{operatorProfiles:false});
assert.deepEqual(regressionOn.ssidCandidates.map(c=>c.value),regressionOff.ssidCandidates.map(c=>c.value));assert.deepEqual(regressionOn.passwordCandidates.map(c=>c.value),regressionOff.passwordCandidates.map(c=>c.value));assert.equal(regressionOn.security.value,'Sin contraseña');assert.equal(regressionOn.password.value,'Casa#2026!wifi');assert.ok(regressionOn.excludedCandidates.some(c=>c.reason.includes('WPS')));assert.ok(regressionOn.excludedCandidates.some(c=>c.reason.includes('administrativa')));
const genericWps=parseRouterLabel({rawText:'SSID\nCASA\nWPS PIN\n12345670\nWLAN Key\nWifiCasa9876'});
assert.equal(genericWps.password.value,'WifiCasa9876');assert.ok(!genericWps.passwordCandidates.some(c=>c.value==='12345670'));
assert.ok(operatorProfiles.every(profile=>profile.vocabulary&&profile.ssidLabels&&profile.passwordLabels&&profile.securityLabels&&profile.negativeClues&&profile.ocrLabelTransforms&&profile.scoringRules));
console.log('PASS perfiles sintéticos: DIGI, Movistar, O2, Orange, Jazztel, Vodafone, Lowi, desconocido y ambiguo; exclusiones, profiles ON/OFF y score explicable.');
