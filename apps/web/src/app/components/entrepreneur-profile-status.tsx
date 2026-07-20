"use client";

import {useEffect,useState} from "react";
import Link from "next/link";
import {PORTAL_UPDATE_EVENT,profileProgress,readNeeds,readProfile,type StoredNeed} from "../lib/entrepreneur-state";
import {PortalEmpty,PortalPanel,Status} from "./portal-shell";

function useProfileState(){
 const [progress,setProgress]=useState(0);
 const [missing,setMissing]=useState(0);
 const [needs,setNeeds]=useState(0);
 const [submitted,setSubmitted]=useState(false);
 useEffect(()=>{
  const refresh=()=>{const profile=readProfile();const storedNeeds=readNeeds();setProgress(profileProgress(profile));setMissing(Math.max(0,(profile?.requiredTotal||0)-(profile?.requiredCompleted||0)));setNeeds(storedNeeds.length);setSubmitted(storedNeeds.some(need=>need.status==="In Prüfung"||need.status==="Aktiv"))};
  refresh();window.addEventListener(PORTAL_UPDATE_EVENT,refresh);window.addEventListener("storage",refresh);
  return()=>{window.removeEventListener(PORTAL_UPDATE_EVENT,refresh);window.removeEventListener("storage",refresh)};
 },[]);
 return {progress,missing,needs,submitted};
}

export function EntrepreneurSetupStatus(){
 const {progress,needs,submitted}=useProfileState();
 const profileComplete=progress===100;
 const total=25+(profileComplete?25:0)+(needs>0?25:0)+(submitted?25:0);
 return <div className="portalSetup"><div><span>ERSTE SCHRITTE</span><h2>{profileComplete?"Ihr Unternehmensprofil ist vollständig.":"Ihr Konto ist bereit. Vervollständigen Sie jetzt die Grundlagen."}</h2></div><b>{total} %</b><div className="setupBar"><i style={{width:`${total}%`}}/></div><ol><li className="done">E-Mail-Adresse bestätigt</li><li className={profileComplete?"done":""}>Unternehmensprofil vervollständigen{!profileComplete&&progress>0?` (${progress} % profilbezogen)`:""}</li><li className={needs>0?"done":""}>Ersten Bedarf erstellen</li><li className={submitted?"done":""}>Profil zur Prüfung einreichen</li></ol></div>;
}

export function EntrepreneurProfilePanel(){
 const {progress,missing}=useProfileState();
 const complete=progress===100;
 return <PortalPanel id="profil" title="Unternehmensprofil"><Status tone={complete?"teal":"amber"}>{complete?"Vollständig":`${progress} % vollständig`}</Status><h3 className="planTitle">{complete?"Grundlage für präzise Matches geschaffen":"Pflichtangaben weiter vervollständigen"}</h3><p className="panelNote">{complete?"Alle erforderlichen Unternehmensangaben wurden gespeichert.":missing?`${missing} Pflichtangaben fehlen noch. Optionale Angaben zählen nicht.`:"Speichern Sie das Profil erneut, damit die Pflichtfelder geprüft werden."}</p><button className="portalSecondary full">Unternehmensprofil bearbeiten</button></PortalPanel>;
}

export function EntrepreneurNeedsPanel(){
 const [needs,setNeeds]=useState<StoredNeed[]>([]);
 useEffect(()=>{const refresh=()=>setNeeds(readNeeds());refresh();window.addEventListener(PORTAL_UPDATE_EVENT,refresh);window.addEventListener("storage",refresh);return()=>{window.removeEventListener(PORTAL_UPDATE_EVENT,refresh);window.removeEventListener("storage",refresh)}},[]);
 return <PortalPanel id="bedarfe" eyebrow="BEDARFSMANAGEMENT" title="Meine Bedarfe" action={<Link className="portalLink" href="/portal/unternehmen/bedarfe">Bedarfsverwaltung öffnen →</Link>}>{needs.length?<div className="dashboardNeedList">{needs.slice(0,3).map(need=><article key={need.id}><div><Status tone={need.status==="Aktiv"?"teal":need.status==="In Prüfung"?"blue":need.status==="Archiv"?"gray":"amber"}>{need.status}</Status><h3>{need.title}</h3><p>{need.category}</p></div><Link href="/portal/unternehmen/bedarfe">{need.status==="Entwurf"?"Prüfen und einreichen":"Status ansehen"} →</Link></article>)}</div>:<PortalEmpty icon="◇" title="Noch kein Bedarf angelegt" text="Beschreiben Sie die gesuchte Dienstleistung manuell oder lassen Sie sich von der KI durch die Bedarfserstellung führen." action="Ersten Bedarf erstellen"/>}</PortalPanel>;
}
