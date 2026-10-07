import {recognizeRouterLabel} from './ocr.js';
import {decodeQrPayloadFromImage} from './wifi-qr.js';
import {parseRouterLabel} from './router-parser.js';

/** The single camera, gallery, and fixture pipeline. Image and credentials stay in memory on-device. */
export async function analyzeRouterImage(blob,options={}){
 const signal=options.signal,onProgress=options.onProgress||(()=>{}),onStage=options.onStage||(()=>{}),recognize=options.recognize||recognizeRouterLabel,decodeQr=options.decodeQr||decodeQrPayloadFromImage,parse=options.parse||parseRouterLabel;
 if(!blob||typeof blob.arrayBuffer!=='function'||!String(blob.type||'').startsWith('image/')||!blob.size)throw new TypeError('Selecciona una fotografía válida para analizar.');
 const started=performance.now();let qr={status:'unavailable'},qrDurationMs=0,ocr=null,ocrError=null;
 onStage('Comprobando imagen');
 const qrStarted=performance.now();try{qr=await decodeQr(blob,{signal})||{status:'unavailable'};}catch(error){if(error?.name==='AbortError')throw error;qr={status:'unavailable'};}finally{qrDurationMs=Math.round(performance.now()-qrStarted);}
 if(signal?.aborted){const error=new Error('Análisis cancelado.');error.name='AbortError';throw error;}
 onStage('Analizando router');
 try{ocr=await recognize(blob,{signal,qrResult:qr,onProgress,onStage});}
 catch(error){if(error?.name==='AbortError')throw error;ocrError=String(error?.message||'OCR unavailable');if(qr.status!=='wifi')throw error;ocr={rawText:'',normalizedText:'',confidence:null,durationMs:0,passes:[],languages:'spa+eng',error:ocrError};}
 if(signal?.aborted){const error=new Error('Análisis cancelado.');error.name='AbortError';throw error;}
 const parsed=parse({...ocr,qr:qr.status==='wifi'?qr:null});
 return {qr,qrDurationMs,ocr,ocrError,parsed,durationMs:Math.round(performance.now()-started),source:qr.status==='wifi'?(parsed.qrAgreement?'qr+ocr':'qr'):'ocr'};
}


