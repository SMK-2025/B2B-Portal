import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseConsent,publicAnalyticsPath,CONSENT_VERSION} from '../src/app/lib/analytics-consent.ts';
test('consent fails closed for malformed, outdated, expired or future preferences',()=>{
 const now=Date.parse('2026-11-19T12:00:00Z');
 const v={necessary:true,statistics:true,marketing:false,date:new Date(now).toISOString(),version:CONSENT_VERSION};
 assert.equal(parseConsent(JSON.stringify(v),now).statistics,true);
 for(const value of [null,'oops',JSON.stringify({...v,version:'v1'}),JSON.stringify({...v,date:'2025-01-01'}),JSON.stringify({...v,date:'2099-01-01'}),JSON.stringify({...v,statistics:'yes'})])assert.equal(parseConsent(value,now),null);
});
test('private routes, query strings and tokens never enter website analytics',()=>{
 for(const p of ['/portal/netzwerk/bayer04leverkusen','/registrieren','/anmelden','/konto-email-bestaetigen','/unternehmen','/dienstleister','/zugang-uebernehmen','/email-bestaetigen','/passwort-zuruecksetzen','/api/users','/entwurf-manus','/teilnahmestatus/koeln','/Koeln?email=x@example.de','/Koeln#token'])assert.equal(publicAnalyticsPath(p),null,p);
 for(const p of ['/','/Koeln','/frankfurt-am-main','/funktionen','/datenschutz/unternehmen'])assert.equal(publicAnalyticsPath(p),p);
});
test('deployed analytics IDs and consent contract remain documented and consistent',()=>{
 const contract=JSON.parse(readFileSync(new URL('../../../config/marketing-analytics.json',import.meta.url),'utf8'));
 const code=readFileSync(new URL('../src/app/components/marketing-analytics.tsx',import.meta.url),'utf8');
 assert.ok(code.includes(contract.ga4.measurementId));assert.ok(code.includes(contract.gtm.publicId));
 assert.equal(contract.consent.version,CONSENT_VERSION);
 assert.equal(contract.ga4.userProvidedData,false);assert.equal(contract.consent.loadGoogleBeforeConsent,false);
 assert.equal(contract.consent.privatePortalAnalysis,false);assert.equal(contract.consent.sendQueryStrings,false);
});
test('script is consent gated and no full browser URL or form values are sent',()=>{
 const code=readFileSync(new URL('../src/app/components/marketing-analytics.tsx',import.meta.url),'utf8');
 assert.ok(code.indexOf('if(!allowed())')<code.indexOf('document.createElement("script")'));
 assert.doesNotMatch(code,/location\.href|location\.search|\.value\b|user_id/);
 assert.match(code,/ga-disable-/);assert.match(code,/ad_user_data:"denied"/);
});
