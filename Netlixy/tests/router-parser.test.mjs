import assert from 'node:assert/strict';
import {parseRouterLabel} from '../src/router-parser.js';

const parse=text=>parseRouterLabel({rawText:text,normalizedText:text});
const one=parse('SSID: TEST_WIFI_5G\nPassword: Test12345678\nWPA2');
assert.equal(one.ssid.value,'TEST_WIFI_5G');assert.equal(one.password.value,'Test12345678');assert.equal(one.security.value,'WPA/WPA2');assert.equal(one.security.inferred,false);
assert.equal(one.ssid.sourceLine,'SSID: TEST_WIFI_5G');
assert.equal(parseRouterLabel({rawText:'SSID: RAW_NAME',normalizedText:''}).ssid,null,'el texto normalizado explícitamente vacío no debe resucitar datos del bruto');assert.ok(one.ssid.score>one.ssidCandidates.at(-1).score||one.ssidCandidates.length===1);

const two=parse('WiFi Name\nCASA_FIBRA\nWiFi Key\nABCD12345678');
assert.equal(two.ssid.value,'CASA_FIBRA');assert.equal(two.password.value,'ABCD12345678');

const three=parse('SSID 2.4GHz: CASA\nSSID 5GHz: CASA_5G\nWLAN Key: FIBRA2026');
assert.deepEqual(three.ssidCandidates.filter(c=>c.score>=70).map(c=>c.value),['CASA','CASA_5G']);assert.equal(three.password.value,'FIBRA2026');assert.ok(three.warnings.some(x=>x.includes('varios SSID')));

const four=parse('SSID: CASA123\nAdmin Password: admin\nWiFi Password: MiClaveWifi987');
assert.equal(four.password.value,'MiClaveWifi987');assert.ok(four.excludedCandidates.some(c=>c.reason.includes('administrativa')));

const five=parse('MAC: AB:CD:EF:12:34:56\nSerial Number: ABC123456789\nSSID: TEST\nWPA Key: QWERTY98765');
assert.equal(five.ssid.value,'TEST');assert.equal(five.password.value,'QWERTY98765');assert.ok(!five.passwordCandidates.some(c=>/AB:CD|ABC123/.test(c.value)));

const six=parse('SSID\nMI_RED\nWPS PIN\n12345670\nWLAN Key\nH7K2L9P4M6');
assert.equal(six.ssid.value,'MI_RED');assert.equal(six.password.value,'H7K2L9P4M6');assert.ok(!six.passwordCandidates.some(c=>c.value==='12345670'));

const seven=parse('SSlD: MOVISTAR_A73F\nPassvvord: R8K2M7L4Q9\nWPA2');
assert.equal(seven.ssid.value,'MOVISTAR_A73F');assert.equal(seven.password.value,'R8K2M7L4Q9');

const eight=parse('Network Name: My Home WiFi\nWireless Key: Casa#2026!wifi');
assert.equal(eight.ssid.value,'My Home WiFi');assert.equal(eight.password.value,'Casa#2026!wifi');

const nine=parse('Router Model XYZ\nMAC address\nAB:CD:EF:12:34:56\nSerial Number\nABC123456789\n192.168.1.1');
assert.equal(nine.ssid,null);assert.equal(nine.password,null);assert.equal(nine.security.inferred,true);

const ten=parse('SSID: WIFI-GUEST\nSecurity: Open');
assert.equal(ten.ssid.value,'WIFI-GUEST');assert.equal(ten.security.value,'Sin contraseña');assert.equal(ten.security.inferred,false);

const symbols=parse('Wi-Fi Name: Café_5G\nWPA-PSK: Casa#2026!wifi');
assert.equal(symbols.ssid.value,'Café_5G');assert.equal(symbols.password.value,'Casa#2026!wifi');
const numeric=parse('SSID: CASA\nWiFi Password: 12345678\nWPA2');
assert.equal(numeric.password.value,'12345678','una contraseña numérica no se descarta si lleva una etiqueta Wi-Fi explícita');
const ambiguous=parse('SSID: CASA\nSSID: CASA_5G\nWPA2');
assert.deepEqual(ambiguous.ssidCandidates.filter(c=>c.score>=70).map(c=>c.value),['CASA','CASA_5G']);
const huaweiText='username:root\npassword:adminHW\nSSID1:HUAWEI-2.4G-28bi\nSSID2:HUAWEI-5G-28bi\nWLAN Key: dab918ck';
const huawei=parse(huaweiText);
assert.deepEqual(huawei.ssidCandidates.filter(c=>c.score>=70).map(c=>c.value),['HUAWEI-2.4G-28bi','HUAWEI-5G-28bi'],'Huawei dual-band SSIDs stay independently selectable');
assert.equal(huawei.password.value,'dab918ck');assert.deepEqual(huawei.passwordCandidates.map(c=>c.value),['dab918ck']);assert.ok(huawei.excludedCandidates.some(c=>c.value==='adminHW'&&c.reason.includes('administrativa')));assert.equal(huawei.security.value,'WPA/WPA2');assert.equal(huawei.security.inferred,true);assert.equal(huawei.operator.detected,null,'Huawei is the manufacturer, not an inferred operator');
for(const label of ['SSID1','SSID 1','SSID2','SSID 2','SSIDI','SSIDl']){const candidates=parse(`${label}: RED_PRUEBA_24`).ssidCandidates;assert.equal(candidates.length,1,`${label} is accepted as an OCR-tolerant SSID label`);}
for(const label of ['WLAN Key','WLAN KEY','WLANKey','WLAN Kev','WLAN Kcy','WLAN Key:']){const result=parse(`${label}: Clave_Exacta123`);assert.equal(result.password.value,'Clave_Exacta123',`${label} is a high-confidence Wi-Fi password label`);}
for(const prefix of ['| WLAN Key:','— WLAN Key:','... WLAN Key:','# WLAN Key:','xx WLAN Key:']){const result=parse(`${prefix} dab918ck`);assert.equal(result.password.value,'dab918ck',`${prefix} is found inside a short OCR-noisy line without changing its value`);}
const realPhotoOcr=parse('IP:192 168 100 1\n1semame roo t\npassword: adminHWw a\nSSID2: HUAWEI-5G-28bi\n] ] | ] WLAN Key: dab918ck');assert.equal(realPhotoOcr.password.value,'dab918ck');assert.ok(!realPhotoOcr.passwordCandidates.some(candidate=>/adminHW/i.test(candidate.value)));assert.ok(realPhotoOcr.excludedCandidates.some(candidate=>/adminHW/i.test(candidate.value)&&candidate.reason.includes('administrativa')),'generic admin password near a management IP and OCR-damaged username is excluded');
const genericPriority=parse('password: CasaClave123\nSSID: CASA\nWLAN Key: wifiClave456');assert.equal(genericPriority.password.value,'wifiClave456');assert.ok(!genericPriority.passwordCandidates.some(candidate=>candidate.value==='CasaClave123'),'generic password labels are not offered when an explicit WLAN Key is present');assert.ok(genericPriority.excludedCandidates.some(candidate=>candidate.value==='CasaClave123'&&candidate.reason.includes('WLAN Key')));
const reviewPasses=[{id:'color',confidence:67,normalizedText:'SSID1: HUAWEI-2 4G-28bi 1'},{id:'grayscale-contrast',confidence:63,normalizedText:'SSID1: HUAWEI-2 4G-28bi -—'}];const reviewParsed=parseRouterLabel({normalizedText:reviewPasses.map(pass=>pass.normalizedText).join('\n'),passes:reviewPasses});assert.ok(reviewParsed.ssidCandidates.filter(candidate=>candidate.needsReview).length>=2,'inter-pass disagreement marks SSID1 candidates for human review');assert.equal(reviewParsed.ssidCandidates.find(candidate=>candidate.needsReview).sourcePasses.length,1,'SSID candidate records OCR pass provenance');
const huaweiNoisy=parse('SSID1: HUAWEI-2 4G-28bi -—\nSSID2: HUAWEI-5G-28bi\nWLAN Key: dab918ck');const huaweiProposal=huaweiNoisy.ssidCandidates.find(candidate=>candidate.band==='2.4 GHz');assert.equal(huaweiProposal.value,'HUAWEI-2 4G-28bi -—');assert.equal(huaweiProposal.proposedValue,'HUAWEI-2.4G-28bi');assert.equal(huaweiProposal.corrected,true);assert.equal(huaweiProposal.correctionType,'wifi-band-context');assert.equal(huaweiProposal.correctionConfidence,'high');assert.equal(huaweiProposal.proposedFrom,huaweiProposal.value);assert.equal(huaweiNoisy.ssidCandidates.find(candidate=>candidate.band==='5 GHz').value,'HUAWEI-5G-28bi');assert.equal(huaweiNoisy.password.value,'dab918ck');
const pairedGeneric=parse('SSID1: CASA-2 4G-A1\nSSID2: CASA-5G-A1');assert.equal(pairedGeneric.ssidCandidates.find(candidate=>candidate.band==='2.4 GHz').proposedValue,'CASA-2.4G-A1');
const loneBand=parse('SSID: CASA-2 4G');assert.equal(loneBand.ssidCandidates[0].proposedValue,undefined,'a lone fuzzy band is not automatically reconstructed');assert.equal(loneBand.ssidCandidates[0].possibleBand,'2.4 GHz');
const games=parse('SSID: CASA-24GAMES');assert.equal(games.ssidCandidates[0].proposedValue,undefined,'24GAMES is not parsed as a band');
const name24=parse('Nombre red: WIFI 24G');assert.equal(name24.ssidCandidates[0].proposedValue,undefined,'a weak network-name context does not authorize reconstruction');
const orangeLabel=parse('RED Wi-Fi RouterDemo-DFD9\nCLAVE Wi-Fi DemoClave987\nFabricante: Orange Espagne\nModelo: Livebox 6');assert.equal(orangeLabel.ssid.value,'RouterDemo-DFD9');assert.equal(orangeLabel.password.value,'DemoClave987');assert.equal(orangeLabel.operator.detected.id,'orange');assert.equal(orangeLabel.security.inferred,true);assert.equal(orangeLabel.ssid.band,undefined,'a network label without band evidence does not infer Wi-Fi bands');
for(const label of ['RED Wi-Fi','RED WIFI','Red WiFi','Nombre Wi-Fi','Nombre WiFi']){const result=parse(`${label}: RouterDemo-DFD9`);assert.equal(result.ssid.value,'RouterDemo-DFD9',`${label} is accepted without modifying the SSID`);}
for(const label of ['CLAVE Wi-Fi','CLAVE WIFI','Clave WiFi']){const result=parse(`SSID: RouterDemo-DFD9\n${label}: DemoClave987`);assert.equal(result.password.value,'DemoClave987',`${label} is a Wi-Fi password label`);}
for(const label of ['Contrasenya WPA','Contrasenya WPA2','Contrasenya Wi-Fi','Clau Wi-Fi','Clau de xarxa']){const result=parse(`Nom de xarxa: RouterDemo-DFD9\n${label}\nDemoPass987`);assert.equal(result.password.value,'DemoPass987',`${label} accepts a password on the following line`);}
assert.equal(parse('SSID: RouterDemo-DFD9\nContrasenva WPA\nDemoPass987').password.value,'DemoPass987','moderate OCR y/v confusion in the Catalan label is tolerated without touching its value');
for(const label of ['Contrasenya WPA','Contrasenya WPA2','Contrasenya Wi-Fi','Clau Wi-Fi','Clau de xarxa']){const result=parse(`Xarxa Wi-Fi: RouterDemo-DFD9\n${label}: DemoPass987`);assert.equal(result.password.value,'DemoPass987',`${label} accepts a same-line password`);}
for(const label of ['Nom de xarxa','Xarxa Wi-Fi','Nom Wi-Fi','SSID']){const result=parse(`${label}\nRouterDemo-DFD9\nClau Wi-Fi\nDemoPass987`);assert.equal(result.ssid.value,'RouterDemo-DFD9',`${label} accepts a network name on the following line`);}
const catalanOrphanLabel=parse('Vera_B96AB4\nContrasenya WPA\nDemoPass987');assert.equal(catalanOrphanLabel.ssid.value,'Vera_B96AB4','an SSID-shaped value immediately before an explicit Catalan Wi-Fi password label can be recovered when OCR drops the SSID label');assert.equal(catalanOrphanLabel.password.value,'DemoPass987');assert.equal(catalanOrphanLabel.security.value,'WPA/WPA2');assert.equal(catalanOrphanLabel.security.inferred,false);assert.equal(catalanOrphanLabel.ssid.band,undefined);
const catalanAdmin=parse('Nom de xarxa: RouterDemo-DFD9\nusername: admin\nContrasenya: AdminDemo987');assert.ok(!catalanAdmin.passwordCandidates.some(candidate=>candidate.value==='AdminDemo987'),'generic Catalan password remains excluded in administrative context');
assert.equal(parse('Modelo: Livebox 6\nSSID: CASA').operator.detected,null,'Livebox model alone does not infer Orange');
const qrAgree=parseRouterLabel({normalizedText:'RED Wi-Fi: RouterDemo-DFD9\nCLAVE Wi-Fi: DemoClave987',qr:{type:'wifi',ssid:'RouterDemo-DFD9',password:'DemoClave987',security:'WPA/WPA2'}});assert.equal(qrAgree.ssidCandidates.find(candidate=>candidate.value==='RouterDemo-DFD9').source,'qr+ocr');assert.ok(qrAgree.warnings.some(warning=>warning.includes('coinciden')));
const conflictText='RED Wi-Fi: OtherNetwork\nCLAVE Wi-Fi OtherPass1234';const qrConflict=parseRouterLabel({normalizedText:conflictText,passes:[{id:'color',normalizedText:conflictText,confidence:92},{id:'grayscale-contrast',normalizedText:conflictText,confidence:90}],qr:{type:'wifi',ssid:'RouterDemo-DFD9',password:'DemoClave987',security:'WPA/WPA2'}});assert.ok(qrConflict.warnings.some(warning=>warning.includes('no coinciden')));assert.ok(qrConflict.ssidCandidates.filter(candidate=>candidate.score>=70).every(candidate=>candidate.needsReview));assert.ok(qrConflict.passwordCandidates.filter(candidate=>candidate.score>=70).every(candidate=>candidate.needsReview));
for(const text of ['username:root\npassword:adminHW\nWLAN Key: dab918ck','username:admin\npassword:adminHW\nWLAN Key: dab918ck','username:root\npassword:adminHW\nSSID: CASA_WIFI']){const result=parse(text);assert.ok(!result.passwordCandidates.some(c=>c.value==='adminHW'),'generic password following username/root/admin is excluded from Wi-Fi credentials');}
console.log('PASS parser fixtures: generic regressions, symbols, dual SSIDs, WLAN Key OCR variants, admin credential exclusion and unknown operator.');
