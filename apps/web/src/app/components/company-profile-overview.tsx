"use client";
import {useEffect,useState} from "react";
import {PORTAL_UPDATE_EVENT,profileProgress,readProfile} from "../lib/entrepreneur-state";

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
 const refresh=()=>setProgress(profileProgress(readProfile()));
 useEffect(()=>{refresh();window.addEventListener(PORTAL_UPDATE_EVENT,refresh);return()=>window.removeEventListener(PORTAL_UPDATE_EVENT,refresh)},[]);
 return <><div className="profileHero"><div className="profileAvatar">UN</div><div><span className={`status ${progress===100?"teal":"amber"}`}>{progress===100?"Vollständig":"Unvollständig"}</span><h2>Unternehmenskonto</h2><p>Ihre Identität bleibt bis zu einer bewussten Match-Freigabe geschützt.</p></div><strong>{progress}<small>%</small></strong></div><div className="profileSectionGrid">{sections.map(([title,text],index)=>{const threshold=(index+1)*12;const complete=progress>=threshold;return <button key={title} type="button" aria-label={`${title} bearbeiten`}><span>{index+1}</span><div><h3>{title}</h3><p>{text}</p><small>{complete?"Angaben gespeichert":progress?"Weiter vervollständigen":"Nicht begonnen"}</small></div><b>→</b></button>})}</div></>;
}
