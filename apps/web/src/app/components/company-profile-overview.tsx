"use client";
import {useEffect,useState} from "react";
import {PORTAL_UPDATE_EVENT,profileProgress,readProfile,type StoredProfile} from "../lib/entrepreneur-state";

const sections=[
 ["Ansprechpartner","Name, Position, Abteilung, E-Mail und Telefon"],
 ["Berechtigung","Entscheidungs- und Vertretungsbefugnis"],
 ["Unternehmensdaten","Firmierung, Rechtsform, Anschrift und Website"],
 ["Struktur","Branche, Größe, Geschäftsgebiet und Märkte"],
 ["Unternehmensbeschreibung","Kurzprofil, Tätigkeiten, Zielgruppen und Keywords"],
 ["Beschaffungsprofil","Bedarfe, Projektgrößen und Anforderungen"],
 ["Kontostatus","Bestätigte E-Mail und optionale Nachweise"],
 ["Sichtbarkeit","Freigaben und Benachrichtigungen"]
];

export function CompanyProfileOverview(){
 const [progress,setProgress]=useState(0);
 const [profile,setProfile]=useState<StoredProfile|null>(null);
 const refresh=()=>{const current=readProfile();setProfile(current);setProgress(profileProgress(current))};
 useEffect(()=>{refresh();window.addEventListener(PORTAL_UPDATE_EVENT,refresh);return()=>window.removeEventListener(PORTAL_UPDATE_EVENT,refresh)},[]);
 return <><div className="profileHero"><div className="profileAvatar">UN</div><div><span className={`status ${progress===100?"teal":"amber"}`}>{progress===100?"Vollständig":"Unvollständig"}</span><h2>Unternehmenskonto</h2><p>{progress===100?"Alle Pflichtangaben sind vollständig gespeichert.":`${Math.max(0,(profile?.requiredTotal||0)-(profile?.requiredCompleted||0))} Pflichtangaben fehlen noch.`}</p></div><strong>{progress}<small>%</small></strong></div><div className="profileSectionGrid">{sections.map(([title,text],index)=>{const complete=profile?.requiredSections?.[index]??(progress===100);return <button key={title} type="button" aria-label={`${title} bearbeiten`}><span>{index+1}</span><div><h3>{title}</h3><p>{text}</p><small>{complete?"Pflichtangaben vollständig":profile?"Pflichtangaben fehlen":"Nicht begonnen"}</small></div><b>→</b></button>})}</div></>;
}
