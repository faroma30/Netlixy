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
for(const label of ['WLAN Key','WLAN KEY','WLANKey','WLAN Kev','WLAN Key:']){const result=parse(`${label}: Clave_Exacta123`);assert.equal(result.password.value,'Clave_Exacta123',`${label} is a high-confidence Wi-Fi password label`);}
for(const text of ['username:root\npassword:adminHW\nWLAN Key: dab918ck','username:admin\npassword:adminHW\nWLAN Key: dab918ck','username:root\npassword:adminHW\nSSID: CASA_WIFI']){const result=parse(text);assert.ok(!result.passwordCandidates.some(c=>c.value==='adminHW'),'generic password following username/root/admin is excluded from Wi-Fi credentials');}
console.log('PASS parser fixtures: generic regressions, symbols, dual SSIDs, WLAN Key OCR variants, admin credential exclusion and unknown operator.');
