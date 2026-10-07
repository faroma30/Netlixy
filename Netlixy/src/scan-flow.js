/** Select the smallest safe next step for the production scan UX. */
export function buildScanPlan(parsed,{selectedCandidate=null}={}){
 const candidates=(parsed?.ssidCandidates||[]).filter(candidate=>candidate.score>=60);
 const bands=new Map();
 for(const candidate of candidates){if(!candidate.band)continue;const list=bands.get(candidate.band)||[];list.push(candidate);bands.set(candidate.band,list);}
 const choices=[...bands.entries()].filter(([,items])=>items.length).map(([band,items])=>({...items.sort((a,b)=>Number(Boolean(b.corrected))-Number(Boolean(a.corrected))||Number(Boolean(b.qrAgreement))-Number(Boolean(a.qrAgreement))||b.score-a.score)[0],band}));
 if(choices.length>1&&!selectedCandidate)return {state:'choose-band',choices};
 const primary=selectedCandidate||candidates.find(candidate=>candidate.value===parsed?.ssid?.value)||candidates[0]||parsed?.ssid;
 if(!primary){if(!parsed?.password)return {state:'error',choices:[]};return {state:'review',choices:[],candidate:null,fields:['ssid']};}
 const ssidConflict=Boolean(parsed?.qrConflicts?.ssid),passwordConflict=Boolean(parsed?.qrConflicts?.password);
 const qrTrusted=candidate=>candidate?.source?.startsWith('qr');
 const taggedOcrCandidate=(candidate,field)=>candidate?.score>=90&&candidate?.source!=='qr'&&new RegExp(`Etiqueta ${field==='ssid'?'SSID':'de contraseña Wi-Fi'}`,'i').test(candidate?.reason||'');
 const highConfidenceTaggedOcr=taggedOcrCandidate(primary,'ssid')||primary?.corrected&&primary.correctionConfidence==='high'&&Number(primary.correctionScore)>=7;
 const highConfidencePassword=taggedOcrCandidate(parsed?.password,'password');
 const trustedProposal=primary.corrected&&primary.correctionConfidence==='high'&&Number(primary.correctionScore)>=7;
 const ssidNeedsReview=Boolean(ssidConflict||primary.needsReview&&!primary.qrAgreement&&!qrTrusted(primary)&&!highConfidenceTaggedOcr&&!trustedProposal);
 const passwordNeedsReview=parsed?.security?.value!=='Sin contraseña'&&(!parsed?.password||passwordConflict||parsed.password.needsReview&&!parsed.password.qrAgreement&&!qrTrusted(parsed.password)&&!highConfidencePassword);
 const fields=[...(ssidNeedsReview?['ssid']:[]),...(passwordNeedsReview?['password']:[])];
 if(fields.length)return {state:'review',choices:[primary],candidate:primary,fields};
 return {state:'ready',choices:[primary],candidate:primary,fields:[]};
}

export function createScannedNetwork(parsed,candidate,qr={}){
 return {ssid:candidate?.proposedValue||candidate?.value||'',password:parsed?.password?.value||'',security:parsed?.security?.value||'WPA/WPA2',hidden:Boolean(qr.hidden),note:'',source:'router_scan',origin:'router_scan',band:candidate?.band||''};
}

/** Keep the recent write ahead of the Red lista render. */
export async function persistRecentBeforeReady(network,{saveRecent,showReady}){
 const recent=await saveRecent(network);
 await showReady(recent);
 return recent;
}
