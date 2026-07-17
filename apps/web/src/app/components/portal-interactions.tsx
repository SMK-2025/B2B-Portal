"use client";
import type {MouseEvent,ReactNode} from "react";
import {useState} from "react";

type Role="admin"|"unternehmen"|"dienstleister";
type Dialog={title:string;kind:string;context?:string}|null;
const moduleCopy:Record<string,[string,string]>={
 "Freigaben":["Freigabezentrum","Prüfen Sie neue Profile, KI-Hinweise, Nachweise und bisherige Entscheidungen."],
 "Mitglieder":["Mitgliederverwaltung","Suchen, filtern, freigeben, sperren und Rollen verwalten."],
 "Bedarfe":["Bedarfsverwaltung","Alle aktiven, pausierten und archivierten Bedarfe zentral verwalten."],
 "Matches":["Matching-Zentrale","Passungen prüfen, neu berechnen, freigeben oder dokumentiert ablehnen."],
 "Kommunikation":["Kommunikationsübersicht","Unterhaltungen und gemeldete Inhalte nachvollziehen."],
 "Abonnements":["Abonnements","Tarife, Zahlungsstatus und Laufzeiten verwalten."],
 "Prüfprotokoll":["Prüfprotokoll","Lückenlose Historie administrativer und automatisierter Prüfungen."],
 "Einstellungen":["Einstellungen","Konto, Benachrichtigungen, Datenschutz und Sicherheit konfigurieren."],
 "Meine Bedarfe":["Meine Bedarfe","Bedarfe bearbeiten, pausieren, archivieren und ihre Reichweite prüfen."],
 "Nachrichten":["Nachrichten","Gespräche, Anhänge und Terminabstimmungen an einem Ort."],
 "Favoriten":["Favoriten","Gespeicherte Unternehmen und Dienstleister organisieren."],
 "Profilaufrufe":["Profilaufrufe","Entwicklung, Herkunft und freigegebene Besucher auswerten."],
 "Historie":["Aktivitätshistorie","Aufrufe, Entscheidungen und Statusänderungen nachvollziehen."],
 "Unternehmensprofil":["Unternehmensprofil","Stammdaten, Ansprechpartner, Branche und Sichtbarkeit bearbeiten."],
 "Leistungsprofil":["Leistungsprofil","Leistungen, Spezialisierungen, Referenzen und Landingpage pflegen."],
 "Geschäftschancen":["Geschäftschancen","Freigegebene Bedarfe nach Passung und Status bearbeiten."],
 "Profilbesucher":["Profilbesucher","Sehen Sie freigegebene Besucher und anonyme Aufrufzahlen."],
 "Abonnement":["Abonnement","Tarif, Rechnungen, Laufzeit und Zahlungsart verwalten."],
 "Verfügbarkeit":["Verfügbarkeit","Kapazität, Regionen, Projektstart und Arbeitsmodell einstellen."]
};

function fields(kind:string,role:Role){
 if(kind==="new-need")return <><label>Titel des Bedarfs<input defaultValue="Externe Unterstützung gesucht"/></label><label>Kategorie<select defaultValue=""><option value="" disabled>Kategorie wählen</option><option>IT & Digitalisierung</option><option>Marketing & Kommunikation</option><option>Personal & Organisation</option><option>Beratung & Strategie</option></select></label><label className="full">Was soll erreicht werden?<textarea rows={5} placeholder="Ziel, Ausgangslage und gewünschte Unterstützung beschreiben …"/></label><div className="dialogSplit"><label>Gewünschter Start<input type="date"/></label><label>Zusammenarbeit<select><option>Flexibel</option><option>Vor Ort</option><option>Remote</option><option>Hybrid</option></select></label></div></>;
 if(kind==="ai")return <><div className="dialogAiHint">✦ Die KI formuliert aus Ihren Angaben einen strukturierten, anonymisierten Bedarf.</div><label className="full">Beschreiben Sie Ihre Situation<textarea rows={7} placeholder="Wir möchten … Uns fehlt derzeit … Wichtig ist uns …"/></label><label><input type="checkbox" defaultChecked/> Unternehmensidentität weiterhin verbergen</label></>;
 if(kind==="profile")return <><div className="dialogSplit"><label>Unternehmensname<input defaultValue={role==="dienstleister"?"Nordlicht Digital GmbH":"Bergwerk GmbH"}/></label><label>Branche<input defaultValue={role==="dienstleister"?"IT & Cybersecurity":"Maschinenbau"}/></label></div><label className="full">{role==="dienstleister"?"Leistungsversprechen":"Unternehmensbeschreibung"}<textarea rows={5} defaultValue={role==="dienstleister"?"Wir schützen mittelständische Unternehmen durch verständliche und umsetzbare IT-Sicherheit.":"Innovativer Mittelständler mit deutschlandweiter Geschäftstätigkeit."}/></label><div className="dialogSplit"><label>Region<input defaultValue="Deutschlandweit"/></label><label>Website<input defaultValue="https://"/></label></div></>;
 if(kind==="member")return <><div className="dialogSplit"><label>Unternehmen<input placeholder="Firmenname"/></label><label>Rolle<select><option>Unternehmer</option><option>Dienstleister</option><option>Administrator</option></select></label></div><div className="dialogSplit"><label>Ansprechpartner<input placeholder="Vor- und Nachname"/></label><label>E-Mail<input type="email" placeholder="name@unternehmen.de"/></label></div><label><input type="checkbox" defaultChecked/> Einladungs-E-Mail versenden</label></>;
 if(kind==="message")return <><div className="dialogMessage"><b>Bergwerk GmbH</b><p>Vielen Dank für Ihr Interesse. Wir würden gern die nächsten Schritte abstimmen.</p><small>Heute, 09:42 Uhr</small></div><label className="full">Nachricht<textarea rows={5} placeholder="Ihre Nachricht …"/></label><div className="dialogSplit"><button type="button" className="portalSecondary">＋ Datei anhängen</button><button type="button" className="portalSecondary">Termin vorschlagen</button></div></>;
 if(kind==="review")return <><div className="reviewSummary"><span>91%</span><div><b>Automatische Qualitätsbewertung</b><p>Unternehmensdaten plausibel · Leistungstexte vollständig · ein Nachweis offen</p></div></div><label>Prüfentscheidung<select><option>Profil freigeben</option><option>Rückfrage senden</option><option>Zurückstellen</option><option>Ablehnen</option></select></label><label className="full">Interne Notiz<textarea rows={4} placeholder="Entscheidung dokumentieren …"/></label></>;
 if(kind==="search")return <><label className="full">Portal durchsuchen<input autoFocus placeholder="Unternehmen, Bedarf, Dienstleistung oder Nachricht …"/></label><div className="searchSuggestions"><button type="button">Nordlicht Digital GmbH <small>Dienstleister</small></button><button type="button">Externe IT-Sicherheitsprüfung <small>Bedarf</small></button><button type="button">IT & Digitalisierung <small>Kategorie</small></button></div></>;
 return <><p className="dialogIntro">{moduleCopy[kind]?.[1]||"Öffnen Sie Details, bearbeiten Sie den Status und dokumentieren Sie den nächsten Schritt."}</p><div className="dialogFeatureGrid"><button type="button">Übersicht anzeigen</button><button type="button">Filtern und suchen</button><button type="button">Aktivität exportieren</button><button type="button">Einstellungen öffnen</button></div></>;
}

export function PortalInteractions({role,children}:{role:Role;children:ReactNode}){
 const [dialog,setDialog]=useState<Dialog>(null);const [toast,setToast]=useState("");
 function open(title:string,kind:string,context?:string){setDialog({title,kind,context})}
 function click(e:MouseEvent<HTMLDivElement>){
  const target=e.target as HTMLElement;const link=target.closest("a");const button=target.closest("button");
  if(target.closest(".portalSearch")){open("Portal durchsuchen","search");return}
  if(link){const href=link.getAttribute("href")||"";if(href.startsWith("#")){const label=(link.textContent||"").trim().replace(/\d+$/,"");const targetEl=document.querySelector(href);if(targetEl){targetEl.scrollIntoView({behavior:"smooth"});return}e.preventDefault();open(moduleCopy[label]?.[0]||label,label)}return}
  if(!button&&target.closest(".conversationRows article")){open("Nachricht und Terminabstimmung","message");return}
  if(!button&&target.closest(".compactPeople p")){open("Profil im Detail","profile-preview");return}
  if(!button&&target.closest(".activity p")){open("Aktivitätsdetails","Historie");return}
  if(!button||button.closest(".portalDialog"))return;
  const text=(button.getAttribute("aria-label")||button.textContent||"").trim();
  if(button.closest(".portalUser"))return open("Mein Konto","Einstellungen");
  if(text.includes("Benachrichtig"))return open("Benachrichtigungen","notifications");
  if(text.includes("Neuen Bedarf")||text.includes("Ersten Bedarf"))return open("Neuen Bedarf erstellen","new-need");
  if(text.includes("KI erstellen")||text.includes("Bedarf mit KI"))return open("KI-Bedarfsassistent","ai");
  if(text.includes("Mitglied anlegen")||text.includes("Mitglied einladen"))return open("Mitglied anlegen","member");
  if(text.includes("Leistungsseite")||text.includes("Profil vervollständigen")||text.includes("Unternehmensprofil"))return open(role==="dienstleister"?"Leistungsprofil bearbeiten":"Unternehmensprofil bearbeiten","profile");
  if(text.includes("Prüfen")||text.includes("bearbeiten")||text.includes("Prüfzentrum"))return open(text.includes("Profil")?"Dienstleisterprofil prüfen":"Profilprüfung","review");
  if(text.includes("Chance ansehen"))return open("Geschäftschance im Detail","Geschäftschancen");
  if(text.includes("Vorschau"))return open("Öffentliche Profilvorschau","profile-preview");
  if(text.includes("Abonnement")||text.includes("Tarife"))return open("Tarife und Abonnement","Abonnement");
  if(text.includes("Ablehnen")){setToast("Match wurde abgelehnt und in der Historie dokumentiert.");return}
  if(text.includes("entfernen")){setToast("Favorit wurde entfernt.");return}
  if(text.includes("Alle Bedarfe"))return open("Alle Bedarfe","Meine Bedarfe");
  if(text.includes("Matching")||text.includes("Chancen"))return open(text.replace("→",""),role==="dienstleister"?"Geschäftschancen":"Matches");
  if(text==="Jetzt bearbeiten")return open("Offene Profilprüfungen","review");
  open(text||"Details","generic");
 }
 function submit(e:React.FormEvent){e.preventDefault();setDialog(null);setToast(dialog?.kind==="ai"?"KI-Entwurf wurde erstellt und zur Prüfung vorgemerkt.":"Änderungen wurden in der Frontend-Demonstration übernommen.")}
 return <div onClick={click}>{children}{dialog&&<div className="portalDialogBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setDialog(null)}}><section className="portalDialog" role="dialog" aria-modal="true" aria-labelledby="portal-dialog-title"><header><div><span>{role.toUpperCase()}</span><h2 id="portal-dialog-title">{dialog.title}</h2></div><button type="button" onClick={()=>setDialog(null)} aria-label="Dialog schließen">×</button></header><form onSubmit={submit}>{fields(dialog.kind,role)}<div className="portalDialogActions"><button type="button" className="portalSecondary" onClick={()=>setDialog(null)}>Abbrechen</button><button type="submit" className="portalPrimary">{dialog.kind==="ai"?"Entwurf generieren":dialog.kind==="message"?"Nachricht senden":"Speichern und fortfahren"}</button></div></form></section></div>}{toast&&<div className="portalToast" role="status"><span>✓</span>{toast}<button onClick={()=>setToast("")} aria-label="Meldung schließen">×</button></div>}</div>
}
