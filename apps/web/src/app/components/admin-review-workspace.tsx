"use client";

import {useEffect,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";

type Organization={id:string;legalName:string;displayName:string;role:string;websiteUrl:string|null;submittedAt:string|null;profileUpdatedAt?:string|null;profileData?:Record<string,string|boolean>};
type Need={id:string;title:string;description:string;categoryId:string;submittedAt?:string|null;details?:Array<{label:string;value:string}>;organization?:Organization};
const profileLabels=["Anrede","Vorname","Nachname","Position / Funktion","Abteilung / Bereich","Geschäftliche E-Mail-Adresse","Geschäftliche Telefonnummer","Bevorzugter Kontaktweg","Berechtigungsstatus","Name der freigabeberechtigten Person","Funktion der freigabeberechtigten Person","Registrierungsberechtigung bestätigt","Geschäftliche Nutzung bestätigt","Vollständige Firmierung","Rechtsform","Handelsname / Kurzbezeichnung","Gründungsjahr","Straße","Hausnummer","Adresszusatz","Postleitzahl","Ort","Land","Website","Zentrale Telefonnummer","Allgemeine E-Mail-Adresse","Weitere Standorte","Hauptbranche","Mitarbeitendenzahl","Jahresumsatz","Geschäftsgebiet","Kundenausrichtung","Weitere Branchen","Kurzprofil","Unternehmensbeschreibung","Produkte und Leistungen","Zielgruppen und Märkte","Unternehmens-Keywords","Typischer Beschaffungsbedarf","Bevorzugte Zusammenarbeit","Übliche Projektgröße","Bevorzugtes Arbeitsmodell","Anforderungen an Dienstleister","Unternehmensdaten verbergen","Daten nach Freigabe anzeigen","Ansprechpartner anzeigen","Matching-E-Mails"];

export function AdminReviewWorkspace(){
 const [organizations,setOrganizations]=useState<Organization[]>([]);
 const [needs,setNeeds]=useState<Need[]>([]);
 const [selected,setSelected]=useState<Organization|Need|null>(null);
 const [kind,setKind]=useState<"profile"|"need">("profile");
 const [message,setMessage]=useState("Prüfdaten werden geladen …");

 async function load(){
  const token=getPortalSession();if(!token){setMessage("Bitte melden Sie sich erneut als Plattformadministrator an.");return}
  try{
   const [profiles,submittedNeeds]=await Promise.all([portalRequest<Organization[]>("/admin/reviews",{token}),portalRequest<Need[]>("/admin/reviews/needs/queue",{token})]);
   setOrganizations(profiles);setNeeds(submittedNeeds);setMessage("");
  }catch(error){setMessage(error instanceof Error?error.message:"Die Prüfliste konnte nicht geladen werden.")}
 }
 useEffect(()=>{void load()},[]);

 async function decide(decision:"approved"|"changes_requested"|"rejected"){
  if(!selected)return;const token=getPortalSession();if(!token)return;
  const defaultReason=decision==="approved"?"Inhalt und Pflichtangaben geprüft.":"Bitte Angaben prüfen und überarbeiten.";
  const reason=window.prompt("Begründung für die dokumentierte Entscheidung:",defaultReason);if(!reason)return;
  try{
   const path=kind==="profile"?`/admin/reviews/${selected.id}/decision`:`/admin/reviews/needs/${selected.id}/decision`;
   await portalRequest(path,{token,body:{decision,reason}});setSelected(null);setMessage("Die Entscheidung wurde gespeichert.");await load();
  }catch(error){setMessage(error instanceof Error?error.message:"Die Entscheidung konnte nicht gespeichert werden.")}
 }

 const profileEntries=kind==="profile"&&selected&&"profileData" in selected?Object.entries(selected.profileData||{}).filter(([,value])=>value===true||(typeof value==="string"&&value.trim())):[];
 return <div className="adminReviewWorkspace">
  {message&&<div className="adminAlert"><span>i</span><div><strong>Prüfzentrum</strong><p>{message}</p></div></div>}
  <div className="portalStats">{[[organizations.length,"Profile in Prüfung"],[needs.length,"Bedarfe in Prüfung"],[organizations.length+needs.length,"Offene Entscheidungen"],[0,"Offene Rückfragen"]].map(([value,label])=><article key={label}><strong>{value}</strong><span>{label}</span></article>)}</div>
  <div className="adminReviewColumns">
   <section className="portalPanel"><header><div><span>UNTERNEHMENSPROFILE</span><h2>Offene Profilprüfungen</h2></div></header>{organizations.length?<div className="reviewRows">{organizations.map(item=><article key={item.id}><b>{item.displayName.slice(0,2).toUpperCase()}</b><div><h3>{item.displayName}</h3><p>{item.role==="buyer"?"Unternehmer":item.role==="provider"?"Dienstleister":"Unternehmer und Dienstleister"} · {item.websiteUrl||"Keine Website"}</p></div><button className="portalSecondary" onClick={()=>{setKind("profile");setSelected(item)}}>Profil vollständig prüfen</button></article>)}</div>:<p className="panelNote">Aktuell liegen keine eingereichten Unternehmensprofile vor.</p>}</section>
   <section className="portalPanel"><header><div><span>BEDARFSMITTEILUNGEN</span><h2>Bedarfe zur Freigabe</h2></div></header>{needs.length?<div className="reviewRows">{needs.map(item=><article key={item.id}><b>BE</b><div><h3>{item.title}</h3><p>{item.organization?.displayName||"Unternehmen"} · {item.categoryId}</p></div><button className="portalSecondary" onClick={()=>{setKind("need");setSelected(item)}}>Bedarf vollständig prüfen</button></article>)}</div>:<p className="panelNote">Aktuell liegen keine eingereichten Bedarfe vor.</p>}</section>
  </div>
  {selected&&<div className="needModalBackdrop" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}><section className="needManageModal adminReviewModal" role="dialog" aria-modal="true"><header><div><span>{kind==="profile"?"UNTERNEHMENSPROFIL PRÜFEN":"BEDARF PRÜFEN"}</span><h2>{kind==="profile"?(selected as Organization).displayName:(selected as Need).title}</h2></div><button onClick={()=>setSelected(null)} aria-label="Schließen">×</button></header><div className="adminReviewDetails">{kind==="profile"?<><dl><div><dt>Unternehmen</dt><dd>{(selected as Organization).legalName}</dd></div><div><dt>Rolle</dt><dd>{(selected as Organization).role}</dd></div><div><dt>Website</dt><dd>{(selected as Organization).websiteUrl||"Nicht angegeben"}</dd></div><div><dt>Eingereicht</dt><dd>{(selected as Organization).submittedAt?new Date((selected as Organization).submittedAt!).toLocaleString("de-DE"):"—"}</dd></div></dl><section><h3>Vollständige Profilangaben</h3>{profileEntries.length?<div className="adminProfileData">{profileEntries.map(([key,value])=>{const index=Number(key.replace("field-",""));return <div key={key}><b>{profileLabels[index]||`Profilangabe ${index+1}`}</b><p>{value===true?"Ja":String(value)}</p></div>})}</div>:<p>Noch keine ausführlichen Profildaten zentral gespeichert. Öffnet der Unternehmer sein Profil und speichert erneut, werden sie automatisch übertragen.</p>}</section></>:<><dl><div><dt>Unternehmen</dt><dd>{(selected as Need).organization?.displayName||"—"}</dd></div><div><dt>Kategorie</dt><dd>{(selected as Need).categoryId}</dd></div><div><dt>Eingereicht</dt><dd>{(selected as Need).submittedAt?new Date((selected as Need).submittedAt!).toLocaleString("de-DE"):"—"}</dd></div></dl><section><h3>Beschreibung</h3><p>{(selected as Need).description}</p></section>{(selected as Need).details?.map((detail,index)=><section key={`${detail.label}-${index}`}><h3>{detail.label}</h3><p>{detail.value}</p></section>)}</>}</div><footer><button className="portalReject" onClick={()=>void decide("rejected")}>Ablehnen</button><button className="portalSecondary" onClick={()=>void decide("changes_requested")}>Änderungen anfordern</button><button className="portalPrimary" onClick={()=>void decide("approved")}>Freigeben</button></footer></section></div>}
 </div>;
}
