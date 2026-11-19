export const CONSENT_KEY = "b2b-matching-consent-v2";
export const CONSENT_VERSION = "2026-11-19-ga4-v1";
export type AnalyticsConsent = {necessary:true;statistics:boolean;marketing:boolean;date:string;version:string};
export function parseConsent(value:string|null,now=Date.now()):AnalyticsConsent|null {
  try { const v=JSON.parse(value||"null");
    return v?.necessary===true && typeof v.statistics==="boolean" && typeof v.marketing==="boolean" && v.version===CONSENT_VERSION && Number.isFinite(Date.parse(v.date)) && now-Date.parse(v.date)>=0 && now-Date.parse(v.date)<180*86400000 ? v : null;
  } catch { return null; }
}
export function publicAnalyticsPath(path:string) {
  if (!path.startsWith("/") || path.includes("?") || path.includes("#")) return null;
  if (/^\/(portal|api|anmelden|registrieren|konto|unternehmen|dienstleister|email-bestaetigen|passwort|team-einladung|teilnahmestatus|entwurf|uebergabe|zugang)/i.test(path)) return null;
  return /^\/[a-zA-Z0-9äöüÄÖÜß\-/]*$/.test(path) ? path : null;
}
