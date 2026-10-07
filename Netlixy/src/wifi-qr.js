import jsQR from '../vendor/jsQR.js';
const escapeField=value=>String(value||'').replace(/\\(.)/gs,'$1');

export function parseWifiQrPayload(payload){
 const text=String(payload||'').trim();
 if(!/^WIFI:/i.test(text))return null;
 const fields={};let key='',value='',readingKey=true,escaped=false;
 const commit=()=>{if(key)fields[key.toUpperCase()]=escapeField(value);key='';value='';readingKey=true;};
 for(let index=5;index<text.length;index++){
  const char=text[index];
  if(escaped){(readingKey?key+=char:value+=char);escaped=false;continue;}
  if(char==='\\'){escaped=true;continue;}
  if(readingKey&&char===':'){readingKey=false;continue;}
  if(char===';'){commit();if(text[index+1]===';')break;continue;}
  if(readingKey)key+=char;else value+=char;
 }
 if(key||value)commit();
 const ssid=fields.S||'',securityToken=String(fields.T||'').trim().toUpperCase();
 if(!ssid)return null;
 let security;
 if(!securityToken||/^(?:NOPASS|NONE|OPEN)$/.test(securityToken))security='Sin contraseña';
 else if(/^(?:WPA|WPA2|WPA3|WPA\/WPA2|WPA\/WPA2\/WPA3|SAE)$/.test(securityToken))security=securityToken==='WPA3'||securityToken==='SAE'?'WPA3':'WPA/WPA2';
 else if(securityToken==='WEP')security='WEP';
 else return null;
 const password=fields.P||'';
 if(security!=='Sin contraseña'&&!password)return null;
 return {type:'wifi',ssid,password,security,hidden:/^(?:true|1|yes)$/i.test(fields.H||'')};
}

async function imageFromBlob(blob){
 if(typeof globalThis.createImageBitmap==='function')try{return {image:await createImageBitmap(blob,{imageOrientation:'from-image'}),close:true};}catch{}
 if(typeof globalThis.Image!=='function'||!globalThis.URL?.createObjectURL)throw new Error('Image decoding is unavailable');
 const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;if(typeof image.decode==='function')await image.decode();else await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;});return {image,close:false};}finally{URL.revokeObjectURL(url);}
}

export async function decodeQrPayloadFromImage(blob,{barcodeDetector=globalThis.BarcodeDetector,canvasFactory=()=>document.createElement('canvas'),fallback=globalThis.jsQR||jsQR}={}){
 if(!blob||!String(blob.type||'').startsWith('image/'))return {status:'unavailable',reason:'invalid-image'};
 let decoded,canvas;
 try{
  decoded=await imageFromBlob(blob);const image=decoded.image,width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
  if(!width||!height)return {status:'unavailable',reason:'invalid-dimensions'};
  if(typeof barcodeDetector==='function')try{const detector=new barcodeDetector({formats:['qr_code']});const hits=await detector.detect(image);const payload=hits?.[0]?.rawValue;if(payload){const wifi=parseWifiQrPayload(payload);if(wifi)return {status:'wifi',source:'BarcodeDetector',...wifi};}}catch{}
  if(typeof fallback!=='function')return {status:'unavailable',reason:'decoder-unavailable'};
  canvas=canvasFactory();canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return {status:'unavailable',reason:'canvas-unavailable'};context.drawImage(image,0,0,width,height);const pixels=context.getImageData(0,0,width,height);const hit=fallback(pixels.data,width,height,{inversionAttempts:'attemptBoth'});if(!hit?.data)return {status:'not-found'};const wifi=parseWifiQrPayload(hit.data);return wifi?{status:'wifi',source:'jsQR',...wifi}:{status:'ignored',reason:'not-wifi-qr'};
 }catch{return {status:'unavailable',reason:'decode-failed'};}finally{if(decoded?.close)try{decoded.image.close();}catch{}if(canvas){canvas.width=0;canvas.height=0;}}
}
