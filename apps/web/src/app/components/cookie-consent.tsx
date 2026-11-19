"use client";
import { useEffect, useRef, useState } from "react";
import {usePathname} from "next/navigation";
import {CONSENT_KEY,CONSENT_VERSION,parseConsent} from "../lib/analytics-consent";
type Choice = {
  necessary: true;
  statistics: boolean;
  marketing: boolean;
  date: string;
  version: string;
};
const KEY = CONSENT_KEY;
export function CookieConsent() {
  const pathname=usePathname();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous=document.activeElement as HTMLElement|null;
    const focusable=()=>Array.from(dialog.current?.querySelectorAll<HTMLElement>('button,a[href],input:not([disabled])')||[]);
    focusable()[0]?.focus();
    const trap=(event:KeyboardEvent)=>{
      if(event.key!=="Tab")return;
      const items=focusable(),first=items[0],last=items[items.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    document.addEventListener("keydown",trap);
    return ()=>{document.removeEventListener("keydown",trap);previous?.focus();};
  },[open]);
  useEffect(() => {
    let saved=null;try{saved=parseConsent(localStorage.getItem(KEY));}catch{}
    setStatistics(saved?.statistics||false);
    setMarketing(saved?.marketing||false);
    const legal=/^\/(cookies|impressum|agb|datenschutz|barrierefreiheit)/.test(pathname);
    setOpen(!saved&&!legal);
    const handler = () => {let value=null;try{value=parseConsent(localStorage.getItem(KEY));}catch{}setStatistics(value?.statistics||false);setMarketing(value?.marketing||false);setOpen(true);};
    window.addEventListener("open-cookie-settings", handler);
    return () => window.removeEventListener("open-cookie-settings", handler);
  }, [pathname]);
  function save(stats: boolean, ads: boolean) {
    const choice: Choice = {
      necessary: true,
      statistics: stats,
      marketing: ads,
      date: new Date().toISOString(),
      version: CONSENT_VERSION,
    };
    try {localStorage.setItem(KEY, JSON.stringify(choice));}catch{setOpen(false);return;}
    setOpen(false);
    window.dispatchEvent(
      new CustomEvent("consent-updated", { detail: choice }),
    );
  }
  if (!open) return null;
  return (
    <div className="consentBackdrop">
      <section
        ref={dialog}
        className="consentDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
      >
        <span className="consentIcon" aria-hidden="true">
          B2
        </span>
        <div>
          <h2 id="consent-title">Ihre Privatsphäre. Ihre Entscheidung.</h2>
          <p>
            Notwendige Technologien sichern Anmeldung, Einstellungen und
            Betrieb. Statistik und Marketing bleiben deaktiviert, bis Sie
            ausdrücklich zustimmen. Mit Ihrer Zustimmung nutzen wir Google Analytics 4
            über Google Tag Manager zur Reichweitenmessung unserer öffentlichen Website.
            Dabei können Daten durch Google auch in den USA verarbeitet werden.
            Im geschützten Mitgliederbereich wird diese Website-Analyse nicht eingesetzt.
            Die optionale persönliche Mailingauswertung ordnet außerdem Aufrufe von Netzwerk-Mailings und daraus entstandene Registrierungen zu; diese Daten gehen nicht an Google Analytics.
          </p>
        </div>
        {details && (
          <div className="consentOptions">
            <label>
              <span>
                <strong>Notwendig</strong>
                <small>
                  Immer aktiv · Sicherheit, Sitzung, Consent und Web-App
                </small>
              </span>
              <input type="checkbox" checked disabled />
            </label>
            <label>
              <span>
                <strong>Statistik</strong>
                <small>
                  Google Analytics 4 über Google Tag Manager · pseudonyme Reichweitenanalyse · nur nach Zustimmung
                </small>
              </span>
              <input
                type="checkbox"
                checked={statistics}
                onChange={(e) => setStatistics(e.target.checked)}
              />
            </label>
            <label><span><strong>Persönliche Mailingauswertung</strong><small>Zuordnung persönlicher Netzwerk-Mailings, Linkaufrufe und Registrierungen; zusätzlich gelten die <a href="/datenschutz/mailings">Mailing-Datenschutzhinweise</a>. Keine Weitergabe dieser Zuordnung an Google Analytics.</small></span><input type="checkbox" checked={marketing} onChange={event=>setMarketing(event.target.checked)}/></label>
          </div>
        )}
        <div className="consentActions">
          <button
            className="consentSecondary"
            onClick={() => setDetails(!details)}
          >
            {details ? "Einstellungen schließen" : "Individuelle Einstellungen"}
          </button>
          <button
            className="consentPrimary"
            onClick={() => save(false, false)}
          >
            Alle ablehnen
          </button>
          <button
            className="consentPrimary"
            onClick={() =>
              save(details ? statistics : true, details ? marketing : true)
            }
          >
            {details ? "Auswahl speichern" : "Alle akzeptieren"}
          </button>
        </div>
        <p className="consentLinks">
          <a href="/cookies">Cookie-Richtlinie</a> ·{" "}
          <a href="/datenschutz/unternehmen">Datenschutz</a> · <a href="/impressum">Impressum</a>
        </p>
      </section>
    </div>
  );
}
export function CookieSettingsButton() {
  return (
    <button
      className="cookieSettings"
      onClick={() => window.dispatchEvent(new Event("open-cookie-settings"))}
    >
      Cookie-Einstellungen
    </button>
  );
}
