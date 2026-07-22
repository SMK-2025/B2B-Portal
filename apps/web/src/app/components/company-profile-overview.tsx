"use client";
import {useCallback,useEffect,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
import {PORTAL_UPDATE_EVENT} from "../lib/entrepreneur-state";

type Organization={reviewStatus:string;profileRequiredTotal?:number;profileRequiredCompleted?:number;profileRequiredSections?:boolean[]};
const sections=[["Ansprechpartner","Name, Position, Abteilung, E-Mail und Telefon"],["Berechtigung","Entscheidungs- und Vertretungsbefugnis"],["Unternehmensdaten","Firmierung, Rechtsform, Anschrift und Website"],["Struktur","Branche, Größe, Geschäftsgebiet und Märkte"],["Unternehmensbeschreibung","Kurzprofil, Tätigkeiten, Zielgruppen und Keywords"],["Beschaffungsprofil","Bedarfe, Projektgrößen und Anforderungen"],["Kontostatus","Bestätigte E-Mail und optionale Nachweise"],["Sichtbarkeit","Freigaben und Benachrichtigungen"]];
const labels:Record<string,string>={draft:"Entwurf",submitted:"In Prüfung",approved:"Freigegeben",changes_requested:"Änderung erforderlich",rejected:"Abgelehnt"};

export function CompanyProfileOverview(){
 const [profile,setProfile]=useState<Organization|null>(null),[error,setError]=useState("");
 const refresh=useCallback(async()=>{const token=getPortalSession();if(!token)return;try{const organizations=await portalRequest<Organization[]>("/organizations/mine",{token});setProfile(organizations[0]||null);setError("")}catch(reason){setError(reason instanceof Error?reason.message:"Das Profil konnte nicht geladen werden.")}},[]);
 useEffect(()=>{void refresh();const listener=()=>void refresh();window.addEventListener(PORTAL_UPDATE_EVENT,listener);return()=>window.removeEventListener(PORTAL_UPDATE_EVENT,listener)},[refresh]);
 const total=profile?.profileRequiredTotal||0,completed=profile?.profileRequiredCompleted||0,progress=total?Math.min(100,Math.round(completed/total*100)):0;
 return <>{error&&<p className="portalInlineAlert" role="alert">{error}</p>}<div className="profileHero"><div className="profileAvatar">UN</div><div><span className={`status ${profile?.reviewStatus==="approved"?"teal":profile?.reviewStatus==="submitted"?"blue":"amber"}`}>{labels[profile?.reviewStatus||"draft"]||"Entwurf"}</span><h2>Unternehmenskonto</h2><p>{progress===100?"Alle Pflichtangaben sind serverseitig gespeichert.":`${Math.max(0,total-completed)} Pflichtangaben fehlen noch.`}</p></div><strong>{progress}<small>%</small></strong></div><div className="profileSectionGrid">{sections.map(([title,text],index)=>{const complete=profile?.profileRequiredSections?.[index]??false;return <button key={title} type="button" aria-label={`${title} bearbeiten`}><span>{index+1}</span><div><h3>{title}</h3><p>{text}</p><small>{complete?"Pflichtangaben vollständig":profile?"Pflichtangaben fehlen":"Nicht begonnen"}</small></div><b>→</b></button>})}</div></>;
}
