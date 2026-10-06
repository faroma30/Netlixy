import {parseRouterLabel} from './router-parser.js';

function fieldMatch(value, expected) {
  return expected == null || expected === '' || expected === 'REDACTED' ? null : String(value ?? '').normalize('NFC') === String(expected).normalize('NFC');
}

export function analyzeRealFixtureText(text, expected = {}) {
  const generic = parseRouterLabel({rawText:text, normalizedText:text}, {operatorProfiles:false});
  const profiled = parseRouterLabel({rawText:text, normalizedText:text}, {operatorProfiles:true});
  const top = result => ({ssid:result.ssidCandidates[0] ?? null, password:result.passwordCandidates[0] ?? null, security:result.security, operator:result.operator?.detected ?? null});
  const genericTop = top(generic), profiledTop = top(profiled);
  const matches = result => ({
    operator: fieldMatch(result.operator?.id, expected.operator),
    ssid: fieldMatch(result.ssid?.value, expected.ssid),
    password: fieldMatch(result.password?.value, expected.password),
    security: fieldMatch(result.security?.value, expected.security),
  });
  const match = matches(profiledTop);
  return {
    generic: {top:genericTop, matches:matches(genericTop)},
    profiled: {top:profiledTop, matches:match, appliedProfiles:profiled.appliedProfiles, profileDiagnostics:profiled.profileDiagnostics},
    differences: {
      ssidValueChanged:genericTop.ssid?.value !== profiledTop.ssid?.value,
      passwordValueChanged:genericTop.password?.value !== profiledTop.password?.value,
      ssidScoreDelta:(profiledTop.ssid?.score ?? 0)-(genericTop.ssid?.score ?? 0),
      passwordScoreDelta:(profiledTop.password?.score ?? 0)-(genericTop.password?.score ?? 0),
    },
  };
}

export function summarizeRealFixtures(records = []) {
  const operators = ['digi','movistar','o2','orange','jazztel','vodafone','lowi'];
  return Object.fromEntries(operators.map(operator => {
    const samples=records.filter(item=>item.operator===operator && item.status==='reviewed');
    const count=field=>samples.filter(item=>item[field]===true).length;
    return [operator,{
      samples:samples.length,
      operatorCorrect:count('operatorCorrect'), ssidCorrect:count('ssidCorrect'), passwordCorrect:count('passwordCorrect'), securityCorrect:count('securityCorrect'),
      manualCorrections:samples.filter(item=>item.manualCorrection===true).length,
      ocrErrors:samples.filter(item=>item.ocrCorrect===false).length,
      parserErrors:samples.filter(item=>item.parserCorrect===false).length,
    }];
  }));
}
