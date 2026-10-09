import {analyzeRouterImage} from '../src/router-image-analysis.js';
import {buildScanPlan,persistRecentBeforeReady} from '../src/scan-flow.js';

const output=document.querySelector('#results');
const log=(text)=>{output.textContent+=`\n${text}`;};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
assert.equal=(actual,expected,message='')=>{if(actual!==expected)throw new Error(message||`Se esperaba ${String(expected)} y se obtuvo ${String(actual)}.`);};
assert.deepEqual=(actual,expected,message='')=>{if(JSON.stringify(actual)!==JSON.stringify(expected))throw new Error(message||`Se esperaba ${JSON.stringify(expected)} y se obtuvo ${JSON.stringify(actual)}.`);};
async function fixture(id){
 const root=`./fixtures/operators-real/${id}/`;
 const [photoResponse,expectedResponse]=await Promise.all([fetch(`${root}input.local.jpg`),fetch(`${root}expected.local.json`)]);
 if(!photoResponse.ok||!expectedResponse.ok)throw new Error(`Falta la imagen privada o expected.local.json de ${id}.`);
 return {blob:await photoResponse.blob(),expected:await expectedResponse.json()};
}
async function run(){
 try{
  const vera=await fixture('vera-real-001');assert(vera.blob.type==='image/jpeg','Vera debe ser JPEG');
  const v=await analyzeRouterImage(vera.blob);assert(v.parsed.ssidCandidates.some(candidate=>candidate.value===vera.expected.ssid),'Vera real: SSID no recuperado desde la fotografía.');assert.equal(v.parsed.ssid.value,vera.expected.ssid,'Vera real: candidato SSID incorrecto seleccionado.');
  assert(v.parsed.passwordCandidates.some(candidate=>candidate.value===vera.expected.password),'Vera real: contraseña no recuperada desde la fotografía.');assert.equal(v.parsed.password.value,vera.expected.password,'Vera real: candidato de contraseña incorrecto seleccionado.');
  assert(v.parsed.security.value===vera.expected.security&&!v.parsed.security.inferred,'Vera real: WPA debe proceder de la etiqueta.');
  assert(!v.parsed.ssidCandidates.some(candidate=>candidate.band),'Vera real: se inventó una banda Wi-Fi.');
  assert.equal(v.qr.status,'not-found','Vera no debe depender de QR.');
  assert.equal(buildScanPlan(v.parsed).state,'ready','Vera real: nombre y clave claros deben llegar directamente a Red lista.');
  const veraOrder=[];await persistRecentBeforeReady({ssid:vera.expected.ssid},{saveRecent:async network=>{veraOrder.push('recent');return {...network,type:'recent'};},showReady:async network=>{assert.equal(network.type,'recent');veraOrder.push('ready');}});assert.deepEqual(veraOrder,['recent','ready'],'Vera debe crearse como Reciente antes de Red lista.');
  log(`PASS Vera real · OCR ${v.ocr.confidence}% · pases ${v.ocr.passes.map(pass=>pass.id).join('+')} · SSID/clave recuperados · WPA explícita · sin QR/banda · ${v.durationMs} ms`);

  const huawei=await fixture('huawei-eg8145v5-real-001');assert(huawei.blob.type==='image/jpeg','Huawei debe ser JPEG');
  const h=await analyzeRouterImage(huawei.blob);const candidates=h.parsed.ssidCandidates;
  const band24=candidates.find(candidate=>candidate.band==='2.4 GHz'&&(candidate.proposedValue||candidate.value)===huawei.expected.ssid);
  const band5=candidates.find(candidate=>candidate.band==='5 GHz'&&candidate.value===huawei.expected.ssids[1]);
  assert(Boolean(band24),'Huawei real: no se recuperó ni propuso el SSID 2.4 GHz desde OCR.');
  assert(Boolean(band5),'Huawei real: no se detectó el SSID 5 GHz.');
  assert.equal(buildScanPlan(h.parsed).state,'choose-band','Huawei real: debe pedir únicamente elegir banda.');
  assert.equal(buildScanPlan(h.parsed,{selectedCandidate:band24}).state,'ready','Huawei real: la propuesta contextual fuerte de 2.4 GHz debe ir directa a Red lista.');
  assert.equal(buildScanPlan(h.parsed,{selectedCandidate:band5}).state,'ready','Huawei real: la banda 5 GHz debe ir directa a Red lista.');
  assert(h.parsed.passwordCandidates.some(candidate=>candidate.value===huawei.expected.password),'Huawei real: no se recuperó WLAN Key.');
  assert(!h.parsed.passwordCandidates.some(candidate=>candidate.value==='adminHW'||/^adminHW\b/.test(candidate.value)),'Huawei real: la credencial admin se ofreció como contraseña Wi-Fi.');
  log(`PASS Huawei real · OCR ${h.ocr.confidence}% · pases ${h.ocr.passes.map(pass=>pass.id).join('+')} · 2.4/5 GHz y WLAN Key detectadas · admin excluida · ${h.durationMs} ms`);

  const orange=await fixture('orange-livebox6-real-001');assert(orange.blob.type==='image/jpeg','Orange debe ser JPEG');
  const o=await analyzeRouterImage(orange.blob);assert(o.parsed.ssidCandidates.some(candidate=>candidate.value===orange.expected.ssid),'Orange real: SSID no detectado.');
  assert(o.parsed.passwordCandidates.some(candidate=>candidate.value===orange.expected.password),'Orange real: clave no detectada.');
  assert(o.parsed.operator?.detected?.id===orange.expected.operator,'Orange real: operador no reconocido desde el OCR.');
  assert(o.qr.status==='wifi','Orange real: QR Wi-Fi local no decodificado.');
  assert(o.parsed.ssidCandidates.find(candidate=>candidate.value===orange.expected.ssid)?.qrAgreement,'Orange real: OCR y QR no quedaron fusionados.');
  assert(!o.parsed.ssidCandidates.some(candidate=>candidate.band),'Orange real: se inventó una banda.');
  assert(o.parsed.security.value===orange.expected.security,'Orange real: seguridad no coincide.');
  assert.equal(buildScanPlan(o.parsed).state,'ready','Orange real: SSID + clave confirmados por OCR/QR deben ir directamente a Red lista.');
  log(`PASS Orange real · OCR ${o.ocr.confidence}% · pases ${o.ocr.passes.map(pass=>pass.id).join('+')} · QR/OCR coinciden · sin banda · OCR ${o.ocr.durationMs} ms + QR ${o.qrDurationMs} ms`);

  const orangeBitmap=await createImageBitmap(orange.blob,{imageOrientation:'from-image'});const orangeCanvas=document.createElement('canvas');orangeCanvas.width=orangeBitmap.width;orangeCanvas.height=orangeBitmap.height;orangeCanvas.getContext('2d',{alpha:false}).drawImage(orangeBitmap,0,0);orangeBitmap.close();const orangeCameraBlob=await new Promise(resolve=>orangeCanvas.toBlob(resolve,'image/jpeg',0.92));orangeCanvas.width=orangeCanvas.height=0;assert(orangeCameraBlob?.type==='image/jpeg','La conversión Orange tipo cámara debe generar image/jpeg');const orangeCamera=await analyzeRouterImage(orangeCameraBlob);assert(orangeCamera.parsed.ssidCandidates.some(candidate=>candidate.value===orange.expected.ssid),'Orange JPEG estilo cámara: SSID no recuperado.');assert(orangeCamera.parsed.passwordCandidates.some(candidate=>candidate.value===orange.expected.password),'Orange JPEG estilo cámara: clave QR no conservada.');assert.equal(buildScanPlan(orangeCamera.parsed).state,'ready','Orange JPEG estilo cámara: credenciales QR válidas deben llegar a Red lista.');assert(!orangeCamera.parsed.ssidCandidates.some(candidate=>candidate.band),'Orange JPEG estilo cámara: no inferir banda.');log(`PASS Orange JPEG estilo cámara · ${orangeCameraBlob.size} bytes · fuente clave ${orangeCamera.parsed.password.source||'OCR'} · QR ${orangeCamera.qr.status} · Red lista`);

  const recentOrder=[];await persistRecentBeforeReady({ssid:orange.expected.ssid},{saveRecent:async network=>{recentOrder.push('recent');return {...network,type:'recent'};},showReady:async network=>{assert.equal(network.type,'recent');recentOrder.push('ready');}});assert.deepEqual(recentOrder,['recent','ready'],'Orange: Reciente debe quedar guardada antes de Red lista.');
  log('PASS Flujo UX real · Orange 0 toques tras analizar · Huawei 1 toque para elegir banda · Reciente antes de Red lista');

  const bitmap=await createImageBitmap(huawei.blob,{imageOrientation:'from-image'});const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0);bitmap.close();
  const cameraBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.94));canvas.width=canvas.height=0;assert(cameraBlob?.type==='image/jpeg','La conversión estilo captura debe generar image/jpeg');
  const camera=await analyzeRouterImage(cameraBlob);assert(camera.parsed.ssidCandidates.some(candidate=>candidate.band==='5 GHz'&&candidate.value===huawei.expected.ssids[1]),'Blob JPEG estilo captura: no se mantuvo la ruta OCR de producción.');
  assert(camera.parsed.passwordCandidates.some(candidate=>candidate.value===huawei.expected.password),'Blob JPEG estilo captura: WLAN Key no recuperada.');
  log(`PASS Blob JPEG estilo cámara · ${cameraBlob.size} bytes · ${camera.ocr.image.processedWidth}×${camera.ocr.image.processedHeight} procesados · mismo analyzeRouterImage() · ${camera.durationMs} ms`);
  document.body.dataset.status='pass';log('RESULTADO: PASS');
 }catch(error){document.body.dataset.status='fail';log(`FAIL: ${String(error?.message||error)}`);console.error('[Real image E2E]',error);}
}
await run();
