import {analyzeRouterImage} from '../src/router-image-analysis.js';

const output=document.querySelector('#results');
const log=(text)=>{output.textContent+=`\n${text}`;};
const assert=(condition,message)=>{if(!condition)throw new Error(message);};
async function fixture(id){
 const root=`./fixtures/operators-real/${id}/`;
 const [photoResponse,expectedResponse]=await Promise.all([fetch(`${root}input.local.jpg`),fetch(`${root}expected.local.json`)]);
 if(!photoResponse.ok||!expectedResponse.ok)throw new Error(`Falta la imagen privada o expected.local.json de ${id}.`);
 return {blob:await photoResponse.blob(),expected:await expectedResponse.json()};
}
async function run(){
 try{
  const huawei=await fixture('huawei-eg8145v5-real-001');assert(huawei.blob.type==='image/jpeg','Huawei debe ser JPEG');
  const h=await analyzeRouterImage(huawei.blob);const candidates=h.parsed.ssidCandidates;
  const band24=candidates.find(candidate=>candidate.band==='2.4 GHz'&&(candidate.proposedValue||candidate.value)===huawei.expected.ssid);
  const band5=candidates.find(candidate=>candidate.band==='5 GHz'&&candidate.value===huawei.expected.ssids[1]);
  assert(Boolean(band24),'Huawei real: no se recuperó ni propuso el SSID 2.4 GHz desde OCR.');
  assert(Boolean(band5),'Huawei real: no se detectó el SSID 5 GHz.');
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
  log(`PASS Orange real · OCR ${o.ocr.confidence}% · pases ${o.ocr.passes.map(pass=>pass.id).join('+')} · QR/OCR coinciden · sin banda · OCR ${o.ocr.durationMs} ms + QR ${o.qrDurationMs} ms`);

  const bitmap=await createImageBitmap(huawei.blob,{imageOrientation:'from-image'});const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d',{alpha:false}).drawImage(bitmap,0,0);bitmap.close();
  const cameraBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.94));canvas.width=canvas.height=0;assert(cameraBlob?.type==='image/jpeg','La conversión estilo captura debe generar image/jpeg');
  const camera=await analyzeRouterImage(cameraBlob);assert(camera.parsed.ssidCandidates.some(candidate=>candidate.band==='5 GHz'&&candidate.value===huawei.expected.ssids[1]),'Blob JPEG estilo captura: no se mantuvo la ruta OCR de producción.');
  assert(camera.parsed.passwordCandidates.some(candidate=>candidate.value===huawei.expected.password),'Blob JPEG estilo captura: WLAN Key no recuperada.');
  log(`PASS Blob JPEG estilo cámara · ${cameraBlob.size} bytes · ${camera.ocr.image.processedWidth}×${camera.ocr.image.processedHeight} procesados · mismo analyzeRouterImage() · ${camera.durationMs} ms`);
  document.body.dataset.status='pass';log('RESULTADO: PASS');
 }catch(error){document.body.dataset.status='fail';log(`FAIL: ${String(error?.message||error)}`);console.error('[Real image E2E]',error);}
}
run();
