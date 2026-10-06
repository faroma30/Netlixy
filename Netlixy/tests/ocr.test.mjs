import assert from 'node:assert/strict';
import {createOcrService,normalizeOcrText,OCR_LANGUAGES} from '../src/ocr.js';
import {prepareImageForOcr,MAX_OCR_DIMENSION} from '../src/image-processing.js';

assert.equal(normalizeOcrText('  WiFi  \r\nSSID:   Café_5G\rPassword:\t  abc123  '),'WiFi\nSSID: Café_5G\nPassword: abc123');
assert.equal(normalizeOcrText('O I S 0 1 5'),'O I S 0 1 5','normalization must not guess characters');
assert.equal(OCR_LANGUAGES,'spa+eng');
await assert.rejects(()=>prepareImageForOcr(new Blob(['x'],{type:'text/plain'})),/fotografía válida/);
await assert.rejects(()=>prepareImageForOcr(new Blob([],{type:'image/png'})),/vacía/);

const oldBitmap=globalThis.createImageBitmap;let decodedOptions,drawDims=[],released=0,canvasDims=[];
globalThis.createImageBitmap=async(_blob,options)=>{decodedOptions=options;return {width:4000,height:2000,close(){released++;}};};
const fakeCanvas=()=>({width:0,height:0,getContext(){return {drawImage(_image,_x,_y,width,height){drawDims.push([width,height]);}};},toBlob(callback,type,quality){canvasDims.push([this.width,this.height,type,quality]);callback(new Blob(['jpeg'],{type}));}});
const prepared=await prepareImageForOcr(new Blob(['large-photo'],{type:'image/jpeg'}),{canvasFactory:fakeCanvas,urlApi:{createObjectURL(){throw Error('not needed');},revokeObjectURL(){}}});
if(oldBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=oldBitmap;
assert.deepEqual(decodedOptions,{imageOrientation:'from-image'});assert.equal(prepared.width,MAX_OCR_DIMENSION);assert.equal(prepared.height,1400);assert.equal(prepared.wasResized,true);assert.equal(prepared.orientationNormalized,true);assert.equal(released,1);assert.deepEqual(drawDims,[[2800,1400],[1200,600]]);assert.equal(canvasDims[0][3],.96);assert.equal(canvasDims[1][2],'image/jpeg');

const stages=[],progress=[];let termination=0,recognitionInput,workerConfig;
const fakeWorker={async recognize(image){recognitionInput=image;return {data:{text:'  SSID: TEST_WIFI\r\nPassword: A1B2  ',confidence:81.25}};},async terminate(){termination++;}};
const service=createOcrService({paths:()=>({workerPath:'/local/worker.js',corePath:'/local/core/',langPath:'/local/lang'}),preprocess:async(blob,{onStage})=>{onStage('Imagen preparada');return {blob:new Blob(['processed'],{type:'image/jpeg'}),previewBlob:new Blob(['preview'],{type:'image/jpeg'}),sourceWidth:3000,sourceHeight:2000,width:2800,height:1867,wasResized:true};},loadEngine:async()=>({OEM:{LSTM_ONLY:1},PSM:{AUTO:'3'},createWorker:async(langs,oem,options,config)=>{assert.equal(langs,'spa+eng');assert.equal(oem,1);assert.equal(options.workerBlobURL,false);assert.equal(options.gzip,true);workerConfig=config;options.logger({status:'recognizing text',progress:.6});return fakeWorker;}})});
const result=await service(new Blob(['original'],{type:'image/jpeg'}),{onStage:stage=>stages.push(stage),onProgress:value=>progress.push(value)});
assert.equal(result.rawText,'  SSID: TEST_WIFI\r\nPassword: A1B2  ');assert.equal(result.normalizedText,'SSID: TEST_WIFI\nPassword: A1B2');assert.equal(result.confidence,81.25);assert.ok(result.durationMs>=0);assert.equal(result.image.processedWidth,2800);assert.equal(result.processedPreviewBlob.type,'image/jpeg');assert.equal(recognitionInput.type,'image/jpeg');assert.equal(workerConfig.tessedit_pageseg_mode,'3');assert.equal(termination,1);assert.ok(stages.includes('Preparando imagen'));assert.deepEqual(progress,[{status:'Detectando texto',progress:.6}]);
await assert.rejects(()=>service(null),/fotografía válida/);

let rejectRecognition,terminatedOnCancel=0;
const cancelService=createOcrService({paths:()=>({}),preprocess:async()=>({blob:new Blob(['x'],{type:'image/jpeg'}),previewBlob:new Blob(['p'],{type:'image/jpeg'})}),loadEngine:async()=>({createWorker:async()=>({recognize:()=>new Promise((_resolve,reject)=>rejectRecognition=reject),async terminate(){terminatedOnCancel++;rejectRecognition?.(new Error('worker terminated'));}})})});
const controller=new AbortController();const pending=cancelService(new Blob(['img'],{type:'image/jpeg'}),{signal:controller.signal});await new Promise(resolve=>setTimeout(resolve,0));controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(terminatedOnCancel,1);
console.log('PASS OCR wrapper/preproceso mock: validación, NFC/saltos/espacios sin sustituciones, orientación EXIF, límite 2800 px, vista comparativa, progreso, resultado estructurado, cancelación y terminate().');
