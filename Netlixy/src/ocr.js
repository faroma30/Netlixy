import {prepareImageForOcr,throwIfAborted,MAX_OCR_DIMENSION} from './image-processing.js';

export const OCR_LANGUAGES='spa+eng';
export const OCR_ENGINE_VERSION='tesseract.js 7.0.0 / tesseract.js-core 7.0.0';
export function normalizeOcrText(text=''){
 return String(text).normalize('NFC').replace(/\r\n?/g,'\n').split('\n').map(line=>line.replace(/[\t\u00a0 ]{2,}/g,' ').trim()).join('\n').trim();
}
function abortError(){const error=new Error('OCR cancelado.');error.name='AbortError';return error;}
function waitFor(promise,signal){if(!signal)return promise;if(signal.aborted)return Promise.reject(abortError());return new Promise((resolve,reject)=>{const onAbort=()=>reject(abortError());signal.addEventListener('abort',onAbort,{once:true});promise.then(value=>{signal.removeEventListener('abort',onAbort);resolve(value);},error=>{signal.removeEventListener('abort',onAbort);reject(error);});});}
const defaultPaths=()=>({workerPath:new URL('../vendor/tesseract/core/worker.min.js',import.meta.url).href,corePath:new URL('../vendor/tesseract/core/',import.meta.url).href,langPath:new URL('../vendor/tesseract/lang',import.meta.url).href});
export function createOcrService({loadEngine=()=>import('../vendor/tesseract/tesseract.esm.min.js'),preprocess=prepareImageForOcr,paths=defaultPaths}={}){
 return async function recognizeRouterLabel(blob,{signal,onProgress=()=>{},onStage=()=>{}}={}){
  if(!blob||typeof blob.arrayBuffer!=='function'||!String(blob.type||'').startsWith('image/')||!blob.size)throw new TypeError('Selecciona una fotografía válida para analizar.');
  const started=performance.now();let worker=null,workerPromise=null,terminated=false,prepared=null,abortHandler=null;
  const terminate=async target=>{if(!target||terminated)return;terminated=true;try{await target.terminate();}catch{}};
  try{
   throwIfAborted(signal);onStage('Preparando imagen');prepared=await preprocess(blob,{signal,onStage});throwIfAborted(signal);
   onStage('Cargando reconocimiento');const loadedEngine=await waitFor(loadEngine(),signal);const engine=loadedEngine?.createWorker?loadedEngine:loadedEngine?.default;throwIfAborted(signal);
   const p=paths();const logger=message=>{if(message?.status){onStage(mapStatus(message.status));}if(Number.isFinite(message?.progress)&&message.progress>=0&&message.progress<=1)onProgress({status:mapStatus(message.status||'Procesando'),progress:message.progress});};
   workerPromise=engine.createWorker(OCR_LANGUAGES,engine.OEM?.LSTM_ONLY??1,{...p,workerBlobURL:false,gzip:true,cacheMethod:'write',logger,errorHandler:error=>console.error('[Netlixy OCR] Error del worker:',error?.message||error)},{tessedit_pageseg_mode:engine.PSM?.AUTO??'3'});
   // createWorker resolves after worker initialization. If canceled during setup, terminate immediately when it becomes available.
   workerPromise=workerPromise.then(instance=>{worker=instance;if(signal?.aborted)void terminate(instance);return instance;});
   if(signal){abortHandler=()=>{if(worker)void terminate(worker);else if(workerPromise)void workerPromise.then(terminate).catch(()=>{});};signal.addEventListener('abort',abortHandler,{once:true});}
   worker=await waitFor(workerPromise,signal);throwIfAborted(signal);onStage('Detectando texto');
   const recognized=await waitFor(worker.recognize(prepared.blob),signal);throwIfAborted(signal);onStage('Finalizando');
   const rawText=String(recognized?.data?.text??'');const confidence=Number.isFinite(recognized?.data?.confidence)?recognized.data.confidence:null;
   const result={rawText,normalizedText:normalizeOcrText(rawText),confidence,durationMs:Math.round(performance.now()-started),languages:OCR_LANGUAGES,engine:OCR_ENGINE_VERSION,image:{originalBytes:blob.size,sourceWidth:prepared.sourceWidth,sourceHeight:prepared.sourceHeight,processedWidth:prepared.width,processedHeight:prepared.height,processedBytes:prepared.blob.size,wasResized:prepared.wasResized,maxDimension:MAX_OCR_DIMENSION},processedPreviewBlob:prepared.previewBlob};
   return result;
  }catch(error){if(error?.name!=='AbortError')console.error('[Netlixy OCR] No se pudo reconocer la etiqueta:',error?.message||error);throw error;}
  finally{
   if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);
   if(worker)await terminate(worker);else if(workerPromise)void workerPromise.then(terminate).catch(()=>{});
   // Drop references to the full processed bitmap/blob. The returned preview is deliberately small.
   prepared=null;
  }
 };
}
export const recognizeRouterLabel=createOcrService();
function mapStatus(status){const value=String(status).toLowerCase();if(value.includes('core')||value.includes('worker'))return 'Cargando reconocimiento';if(value.includes('language')||value.includes('traineddata')||value.includes('initializ'))return 'Cargando idiomas';if(value.includes('recogniz'))return 'Detectando texto';if(value.includes('load'))return 'Cargando reconocimiento';return 'Procesando resultado';}
