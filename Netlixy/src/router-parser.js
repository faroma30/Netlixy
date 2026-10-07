import {detectOperator} from './operator-detector.js';
import {getOperatorProfile} from './operator-profiles/index.js';

const SSID_LABELS = [
  [/^(?:ssid|ss[i1l]d)(?:\s*(?:[12]|[il])|\s+(?:2[.,]?4\s*(?:ghz|g)?|5\s*(?:ghz|g)?))?$/, 100, 'Etiqueta SSID'],
  [/^(?:wi[ -]?fi|wlan)\s*(?:name|nombre)$/, 92, 'Etiqueta de nombre Wi-Fi'],
  [/^(?:wi[ -]?fi|wlan)$/, 78, 'Etiqueta Wi-Fi/WLAN'],
  [/^(?:wireless|network)\s+name$/, 88, 'Etiqueta de nombre de red'],
  [/^(?:nombre\s+(?:de\s+)?(?:wi[ -]?fi|red)|red\s+(?:wi[ -]?fi|wlan))$/, 90, 'Etiqueta de nombre de red']
];
const PASSWORD_LABELS = [
  [/^(?:wi[ -]?fi|wlan)\s*(?:password|passvvord|passw[o0]rd|key|kev|kcy|clave|contrase[nñ]a)$/, 100, 'Etiqueta de contraseña Wi-Fi'],
  [/^(?:wpa\s*[- ]?psk|wpa[23]?\s*[- ]?(?:key|clave)|pre[ -]?shared\s+key|psk)$/, 98, 'Etiqueta de clave WPA/PSK'],
  [/^(?:wireless|network)\s+(?:key|password|clave|contrase[nñ]a)$/, 94, 'Etiqueta de clave de red'],
  [/^(?:clave\s+(?:de\s+)?(?:wi[ -]?fi|wlan|red)|contrase[nñ]a\s+(?:de\s+)?(?:wi[ -]?fi|wlan|red))$/, 98, 'Etiqueta de contraseña de red'],
  [/^(?:password|passvvord|passw[o0]rd|contrase[nñ]a|clave)$/, 52, 'Etiqueta genérica de contraseña'],
  [/^key$/, 58, 'Etiqueta genérica Key con contexto Wi-Fi']
];

const normalizeLabel = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[：＝]/g, ':').replace(/\s+/g, ' ').trim().replace(/\s*[:=]\s*$/, '').trim();
const cleanCandidate = value => String(value || '').replace(/^\s*[:=\-–—]\s*/, '').replace(/\s+$/, '').trim();
const isMac = value => /^(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}$/i.test(value.replace(/\s/g, '')) || /^(?:[0-9a-f]{4}[.]){2}[0-9a-f]{4}$/i.test(value);
const isIpOrNumericPin = value => /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || /^\d{4,10}$/.test(value);
const isSerialContext = label => /^(?:s\/?n|sn|serial(?:\s+number)?|serial number)$/i.test(label);
const isAdminContext = (label, lines, index) => {
 if ((/\b(?:admin|administrator|web|router|login)\b/.test(label) && /\b(?:password|pass|key|credential|contrase[nñ]a|clave|pin)\b/.test(label)) || /^(?:admin|administrator|web|login)$/i.test(label)) return true;
 if (!/^(?:password|passvvord|passw[o0]rd|contrase[nñ]a|clave)$/i.test(label)) return false;
 const context=lines.slice(Math.max(0,index-4),index).join(' ');
 const userContext=/^(?:username|user name|user|login|account|usuario)\s*[:=]/i.test(lines[index-1]||'')||/\b(?:username|user\s*name|1semame|usename|root|admin|login)\b/i.test(context);
 const managementIp=/\bIP\b[^\n]{0,48}\b192[. ]+168[. ]+100[. ]+1\b/i.test(context);
 return userContext || (managementIp && /\badmin/i.test(splitLabel(lines[index])[1]||''));
};
const isWpsContext = label => /\bwps\b/.test(label);
const plausible = (value, allowNumericPin = false) => value.length > 0 && value.length <= 2048 && !isMac(value) && (!isIpOrNumericPin(value) || (allowNumericPin && /^\d{4,10}$/.test(value))) && !/^https?:\/\//i.test(value);

function findLabel(label, table) {
  const key = normalizeLabel(label);
  return table.find(([pattern]) => pattern.test(key));
}
function splitLabel(line) {
  const match = line.match(/^\s*(.{1,64}?)\s*[:=：＝]\s*(.*?)\s*$/);
  if (!match) return { label: line.trim(), value: '' };
  return { label: match[1].trim(), value: match[2].trim() };
}
function embeddedWlanKey(line){
 if(String(line).length>180)return null;
 const match=String(line).match(/(?:^|[^\p{L}\p{N}])WLAN\s*K(?:ey|ev|cy)\s*(?::|=|：|＝|[’'`])\s*(.*?)\s*$/iu);
 if(!match)return null;
 return {label:'WLAN Key',value:match[1].trim(),delimiter:/[:=：＝]/.test(match[0])};
}
function ssidBand(sourceLine){const match=String(sourceLine).match(/(?:^|[^\p{L}\p{N}])SS[i1l]D\s*([12]|[il])\b/i);return match?String(match[1]).toLowerCase().replace(/[il]/,'1'):null;}
function scoreValue(value, base, kind) {
  let score = base;
  if (!value) return score;
  if (value.length >= 8 && value.length <= 63) score += kind === 'password' ? 8 : 4;
  else if (value.length <= 3) score -= 18;
  else if (value.length > 63) score -= 16;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)) score += 3;
  if (/[\s]/.test(value) && kind === 'ssid') score += 2;
  return Math.max(0, Math.min(100, score));
}
function addCandidate(list, value, score, reason, sourceLine, kind) {
  const candidateValue = cleanCandidate(value);
  const explicitPassword = kind === 'password' && /Etiqueta|contexto Wi-Fi/.test(reason);
  if (!plausible(candidateValue, explicitPassword)) return;
  const old = list.find(item => item.value === candidateValue);
  const candidate = { value: candidateValue, score: scoreValue(candidateValue, score, kind), reason, sourceLine };
  if (old) {
    if (candidate.score > old.score) Object.assign(old, candidate);
    return;
  }
  list.push(candidate);
}
const stopLine = line => {
  const { label } = splitLabel(line);
  return Boolean(findLabel(label, SSID_LABELS) || findLabel(label, PASSWORD_LABELS) || /^(?:security|encryption|wpa[23]?|wep|mac(?: address)?|wps(?: pin)?|s\/?n|sn|serial(?: number)?|pin|ip|gateway|username)$/i.test(normalizeLabel(label)));
};

export function parseRouterLabel(input = {}, {operatorProfiles: profilesEnabled = true} = {}) {
  const rawText = input?.rawText ?? '';
  const text = String(input?.normalizedText !== undefined ? input.normalizedText : rawText);
  const lines = text.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(Boolean);
  const ssidCandidates = [];
  const passwordCandidates = [];
  const excluded = [];
  const excludedValueLines = new Set();

  lines.forEach((line, index) => {
    if (excludedValueLines.has(index)) { excluded.push({ value: line, sourceLine: lines[index - 1] || line, reason: 'Valor de identificador/credencial excluida' }); return; }
    const embeddedKey=embeddedWlanKey(line);
    const split=splitLabel(line);
    const { label, value } = embeddedKey||split;
    const normalizedLabel = normalizeLabel(label);
    const ssidLabel = findLabel(label, SSID_LABELS);
    let passwordLabel = findLabel(label, PASSWORD_LABELS);
    if(embeddedKey&&passwordLabel&&!embeddedKey.delimiter)passwordLabel=[passwordLabel[0],Math.min(passwordLabel[1],50),passwordLabel[2]];

    if (isSerialContext(normalizedLabel) || /^mac(?:\s+address)?$/i.test(normalizedLabel) || isWpsContext(normalizedLabel) || isAdminContext(normalizedLabel, lines, index)) {
      if (value) excluded.push({ value, sourceLine: line, reason: isWpsContext(normalizedLabel) ? 'WPS PIN excluido' : isAdminContext(normalizedLabel, lines, index) ? 'Credencial administrativa excluida' : 'Identificador excluido' });
      else if (lines[index + 1]) excludedValueLines.add(index + 1);
      return;
    }

    if (ssidLabel) {
      if (value) addCandidate(ssidCandidates, value, ssidLabel[1], `${ssidLabel[2]}: valor en la misma línea`, line, 'ssid');
      else {
        const next = lines[index + 1];
        if (next && !stopLine(next)) addCandidate(ssidCandidates, next, Math.max(68, ssidLabel[1] - 28), `${ssidLabel[2]}: valor en la línea siguiente`, line, 'ssid');
      }
    }

    if (passwordLabel) {
      if (value) addCandidate(passwordCandidates, value, passwordLabel[1], `${passwordLabel[2]}: valor en la misma línea`, line, 'password');
      else {
        const next = lines[index + 1];
        if (next && !stopLine(next)) addCandidate(passwordCandidates, next, Math.max(62, passwordLabel[1] - 28), `${passwordLabel[2]}: valor en la línea siguiente`, line, 'password');
      }
    }

    // A standalone “Key” is weak evidence; accept only when the document also has Wi-Fi context.
    if (normalizeLabel(label) === 'key' && value && /\b(?:wi[ -]?fi|wlan|ssid|wpa)\b/i.test(text)) {
      addCandidate(passwordCandidates, value, 58, 'Key con contexto Wi-Fi', line, 'password');
    }

    // Preserve plausible unlabelled SSID-like values as low-score diagnostic candidates.
    if (!ssidLabel && !passwordLabel && !value && /^[\p{L}\p{N}][\p{L}\p{N}_ .-]{2,63}$/u.test(line) && !stopLine(line) && !/\b(?:router|model|gateway|internet|security|encryption|wifi|wi-fi|wlan|ssid|password|serial|mac|pin)\b/i.test(line)) {
      addCandidate(ssidCandidates, line, 22, 'Cadena plausible sin etiqueta', line, 'ssid');
    }
  });

  const operator = profilesEnabled ? detectOperator({rawText, normalizedText:text}) : null;
  const appliedProfiles = [];
  const profileDiagnostics = [];
  const selectedOperator = operator?.detected;
  const profile = selectedOperator && operator.confidence !== 'low' ? getOperatorProfile(selectedOperator.id) : null;
  if (profile) {
    appliedProfiles.push(profile.id);
    for (const [field, list] of [['ssid',ssidCandidates],['password',passwordCandidates]]) {
      for (const candidate of list) {
        for (const rule of profile.scoringRules.filter(item=>item.field===field && item.label.test(`${candidate.sourceLine} ${candidate.reason}`))) {
          const scoreBefore = candidate.score;
          candidate.score += rule.delta;
          candidate.scoreBeforeProfile ??= scoreBefore;
          candidate.profileReasons ??= [];
          candidate.profileReasons.push(rule.reason);
          candidate.reason += `; perfil ${profile.name}: +${rule.delta} (${rule.id})`;
          profileDiagnostics.push({profileId:profile.id,field,ruleId:rule.id,delta:rule.delta,scoreBefore,scoreAfter:candidate.score,reason:rule.reason});
        }
      }
    }
  }
  ssidCandidates.sort((a, b) => b.score - a.score);
  passwordCandidates.sort((a, b) => b.score - a.score);
  const security = detectSecurity(lines);
  const ssid = ssidCandidates[0] ? { ...ssidCandidates[0], confidence: Math.min(1, ssidCandidates[0].score / 100) } : null;
  const password = passwordCandidates[0] ? { ...passwordCandidates[0], confidence: Math.min(1, passwordCandidates[0].score / 100) } : null;
  const warnings = [];
  const passRecords=Array.isArray(input?.passes)?input.passes:[];
  for(const candidate of [...ssidCandidates,...passwordCandidates]){
    const sources=passRecords.filter(pass=>String(pass.normalizedText||'').split(/\r?\n/).some(source=>source.trim()===candidate.sourceLine)).map(pass=>({pass:pass.id,text:candidate.sourceLine,score:Number.isFinite(pass.confidence)?pass.confidence:null}));
    if(sources.length){candidate.sourcePasses=sources;candidate.ocrScore=Math.max(...sources.map(item=>item.score??0));candidate.sourceText=candidate.sourceLine;if(candidate.ocrScore<72)candidate.needsReview=true;}
  }
  if(ssid&&ssidCandidates[0])Object.assign(ssid,ssidCandidates[0],{confidence:Math.min(1,ssidCandidates[0].score/100)});
  if(password&&passwordCandidates[0])Object.assign(password,passwordCandidates[0],{confidence:Math.min(1,passwordCandidates[0].score/100)});
  const bandCandidates=new Map();
  for(const candidate of ssidCandidates){const band=ssidBand(candidate.sourceLine);if(band){const items=bandCandidates.get(band)||[];items.push(candidate);bandCandidates.set(band,items);}}
  for(const candidates of bandCandidates.values())if(new Set(candidates.map(candidate=>candidate.value)).size>1)for(const candidate of candidates)candidate.needsReview=true;
  if (ssidCandidates.filter(c => c.score >= 70).length > 1) warnings.push('Se han encontrado varios SSID; selecciona el correcto.');
  if (!ssid) warnings.push('No se ha podido identificar el nombre Wi-Fi.');
  if (!password && security.value !== 'Sin contraseña') warnings.push('No se ha podido identificar la contraseña Wi-Fi.');
  if (security.inferred) warnings.push('La seguridad no aparece en el texto; se propone WPA/WPA2 por defecto.');
  return { ssid, password, security, ssidCandidates, passwordCandidates, excludedCandidates: excluded, warnings, operator, appliedProfiles, profileDiagnostics, parserVersion: '2.1-generic+profiles' };
}

function detectSecurity(lines) {
  const joined = lines.join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const open = /(?:SECURITY|ENCRYPTION|SEGURIDAD|CIFRADO)\s*[:=]?\s*(?:OPEN|NONE|NO|NONE\b|OPEN\b)|\bOPEN NETWORK\b|\bSIN CONTRASENA\b|\bNO PASSWORD\b/.test(joined);
  if (open) return { value: 'Sin contraseña', detected: 'Open', inferred: false, confidence: 0.95, reason: 'Indicación explícita de red abierta' };
  const wpa3 = /WPA\s*[- ]?3|WPA3|SAE/.test(joined);
  if (wpa3) return { value: 'WPA3', detected: 'WPA3/SAE', inferred: false, confidence: 0.9, reason: 'Texto WPA3 o SAE detectado' };
  const wep = /\bWEP\b/.test(joined);
  if (wep) return { value: 'WEP', detected: 'WEP', inferred: false, confidence: 0.9, reason: 'Texto WEP detectado' };
  const wpa2 = /WPA\s*[- ]?2|WPA2/.test(joined);
  const wpa = /\bWPA\b/.test(joined);
  if (wpa2 || wpa) return { value: 'WPA/WPA2', detected: wpa2 ? 'WPA2' : 'WPA', inferred: false, confidence: 0.86, reason: 'Texto WPA detectado' };
  return { value: 'WPA/WPA2', detected: null, inferred: true, confidence: 0.4, reason: 'Seguridad predeterminada; no detectada' };
}
