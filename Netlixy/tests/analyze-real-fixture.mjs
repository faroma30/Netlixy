import fs from 'node:fs/promises';
import path from 'node:path';
import Tesseract from 'tesseract.js';
import {fileURLToPath} from 'node:url';
import {analyzeRealFixtureText,summarizeRealFixtures} from '../src/real-fixture-analysis.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot=path.join(root,'fixtures/operators-real');
const index=JSON.parse(await fs.readFile(path.join(fixtureRoot,'index.json'),'utf8'));
const args=process.argv.slice(2),showValues=args.includes('--show-values'),arg=args.find(x=>!x.startsWith('--'));
function yn(value){return value==null?'—':value?'sí':'no';}
function safeTop(item){if(!item)return {found:false,score:null};return {found:true,score:item.score};}
function printStats(){const stats=summarizeRealFixtures(index.samples);console.log('ESTADÍSTICAS DE MUESTRAS REALES REVISADAS');for(const [operator,s] of Object.entries(stats)){console.log(`${operator.toUpperCase()} · muestras ${s.samples} · operador ${s.operatorCorrect}/${s.samples} · SSID ${s.ssidCorrect}/${s.samples} · contraseña ${s.passwordCorrect}/${s.samples} · seguridad ${s.securityCorrect}/${s.samples} · correcciones ${s.manualCorrections} · errores OCR ${s.ocrErrors} · errores parser ${s.parserErrors}`);}if(!index.samples.length)console.log('Etiquetas reales: 0');}
if(!arg||arg==='--stats'){printStats();}
else {
 const sample=index.samples.find(x=>x.id===arg);
 if(!sample){console.error(`No existe ${arg} en index.json. No se modificó ningún archivo.`);process.exitCode=2;}
 else {
  const dir=path.join(fixtureRoot,sample.id);let imagePath,text='';
  for(const name of ['input.local.jpg','input.local.jpeg','input.local.png','input.jpg','input.jpeg','input.png'])try{imagePath=path.join(dir,name);await fs.access(imagePath);break;}catch{imagePath=null;}
  let expected={};for(const name of ['expected.local.json','expected.json'])try{expected=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));break;}catch{}
  if(imagePath){
   let worker;try{const {createWorker,OEM,PSM}=Tesseract;worker=await createWorker('spa+eng',OEM.LSTM_ONLY,{workerPath:fileURLToPath(new URL('../vendor/tesseract/worker.min.js',import.meta.url)),corePath:fileURLToPath(new URL('../vendor/tesseract/core/',import.meta.url)),langPath:fileURLToPath(new URL('../vendor/tesseract/lang/',import.meta.url)),gzip:true,cacheMethod:'none'},{tessedit_pageseg_mode:PSM.AUTO});const result=await worker.recognize(imagePath);text=String(result.data.text||'');}finally{if(worker)await worker.terminate();}
  } else {
   for(const name of ['ocr.local.txt','ocr.txt'])try{text=await fs.readFile(path.join(dir,name),'utf8');break;}catch{}
  }
  if(!text){console.error(`No se encontró imagen local ni ocr.local.txt para ${sample.id}.`);process.exitCode=2;}
  else {
   const report=analyzeRealFixtureText(text,expected);const g=report.generic,p=report.profiled;
   console.log(`MUESTRA ${sample.id} · operador esperado ${expected.operator||'—'} · OCR local spa+eng / fuente ${imagePath?'imagen':'texto OCR guardado'}`);
   console.log(`GENÉRICO: SSID ${yn(g.matches.ssid)} score ${safeTop(g.top.ssid).score??'—'} · contraseña ${yn(g.matches.password)} score ${safeTop(g.top.password).score??'—'} · seguridad ${yn(g.matches.security)} · operador ${yn(g.matches.operator)}`);
   console.log(`PERFILES: operador ${p.top.operator?.id||'no identificado'} · SSID ${yn(p.matches.ssid)} score ${safeTop(p.top.ssid).score??'—'} · contraseña ${yn(p.matches.password)} score ${safeTop(p.top.password).score??'—'} · seguridad ${yn(p.matches.security)}`);
   console.log(`DIFERENCIAS: SSID elegido cambió ${report.differences.ssidValueChanged?'sí':'no'}; contraseña elegida cambió ${report.differences.passwordValueChanged?'sí':'no'}; Δscore SSID ${report.differences.ssidScoreDelta}; Δscore contraseña ${report.differences.passwordScoreDelta}.`);
   if(showValues)console.log('VALORES (sensibles):',JSON.stringify({generic:{ssid:g.top.ssid?.value,password:g.top.password?.value},profiled:{ssid:p.top.ssid?.value,password:p.top.password?.value},expected:{ssid:expected.ssid,password:expected.password}},null,2));
  }
 }
}
