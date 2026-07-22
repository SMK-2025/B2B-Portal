"use client";

import {useCallback,useEffect,useState} from "react";
import Link from "next/link";
import {getPortalSession,portalRequest} from "../lib/portal-api";
import {PORTAL_UPDATE_EVENT} from "../lib/entrepreneur-state";
import {PortalEmpty,PortalPanel,Status} from "./portal-shell";

type Organization={id:string;reviewStatus:string;profileRequiredTotal?:number;profileRequiredCompleted?:number;profileData?:Record<string,string|boolean>};
type Need={id:string;title:string;categoryId:string;status:string};
type State={organization:Organization|null;needs:Need[];error:string};
const statusLabel:Record<string,string>={draft:"Entwurf",submitted:"In Prüfung",approved:"Freigegeben",changes_requested:"Änderung erforderlich",rejected:"Abgelehnt",active:"Aktiv",paused:"Pausiert",closed:"Archiv"};

function useEntrepreneurState(){
 const [state,setState]=useState<State>({organization:null,needs:[],error:""});
 const refresh=useCallback(async()=>{const token=getPortalSession();if(!token){setState(value=>({...value,error:"Bitte melden Sie sich erneut an."}));return}try{const organizations=await portalRequest<Organization[]>("/organizations/mine",{token});const organization=organizations[0]||null;const needs=organization?await portalRequest<Need[]>(`/organizations/${organization.id}/needs`,{token}):[];setState({organization,needs,error:""})}catch(error){setState(value=>({...value,error:error instanceof Error?error.message:"Die Profildaten konnten nicht geladen werden."}))}},[]);
 useEffect(()=>{void refresh();const listener=()=>void refresh();window.addEventListener(PORTAL_UPDATE_EVENT,listener);return()=>window.removeEventListener(PORTAL_UPDATE_EVENT,listener)},[refresh]);
 return {...state,refresh};
}

function completion(organization:Organization|null){const total=organization?.profileRequiredTotal||0,completed=organization?.profileRequiredCompleted||0;return total?Math.min(100,Math.round(completed/total*100)):0}

export function EntrepreneurSetupStatus(){
 const {organization,needs,error}=useEntrepreneurState();const progress=completion(organization);const profileComplete=progress===100;const profileSubmitted=organization?.reviewStatus==="submitted"||organization?.reviewStatus==="approved";const needCreated=needs.length>0;const total=25+(profileComplete?25:0)+(needCreated?25:0)+(profileSubmitted?25:0);
 return <>{error&&<p className="portalInlineAlert" role="alert">{error}</p>}<div className="portalSetup"><div><span>ERSTE SCHRITTE</span><h2>{profileSubmitted?"Ihr Profil befindet sich im Freigabeprozess.":profileComplete?"Ihr Unternehmensprofil ist vollständig.":"Vervollständigen Sie jetzt die Grundlagen."}</h2></div><b>{total} %</b><div className="setupBar"><i style={{width:`${total}%`}}/></div><ol><li className="done">E-Mail-Adresse bestätigt</li><li className={profileComplete?"done":""}>Unternehmensprofil vervollständigen{progress>0&&!profileComplete?` (${progress} %)`:""}</li><li className={needCreated?"done":""}>Ersten Bedarf erstellen</li><li className={profileSubmitted?"done":""}>Profil getrennt zur Prüfung einreichen</li></ol></div></>;
}

export function EntrepreneurProfilePanel(){
 const {organization,error,refresh}=useEntrepreneurState();const progress=completion(organization);const complete=progress===100;const canSubmit=complete&&["draft","changes_requested"].includes(organization?.reviewStatus||"");const submit=async()=>{const token=getPortalSession();if(!token||!organization)return;await portalRequest(`/organizations/${organization.id}/submit`,{token,body:{}});await refresh()};
 return <PortalPanel id="profil" title="Unternehmensprofil">{error&&<p className="portalInlineAlert" role="alert">{error}</p>}<Status tone={organization?.reviewStatus==="approved"?"teal":organization?.reviewStatus==="submitted"?"blue":complete?"teal":"amber"}>{statusLabel[organization?.reviewStatus||"draft"]||"Entwurf"} · {progress} %</Status><h3 className="planTitle">{complete?"Grundlage für präzise Matches geschaffen":"Pflichtangaben weiter vervollständigen"}</h3><p className="panelNote">{complete?"Alle erforderlichen Angaben wurden gespeichert. Die Profilprüfung ist ein eigener Vorgang und entscheidet niemals über Ihre Bedarfe.":"Die Anzeige prüft ausschließlich die verbindlichen Pflichtfelder des gespeicherten Serverprofils."}</p><button className="portalSecondary full">Unternehmensprofil bearbeiten</button>{canSubmit&&<button className="portalPrimary full" type="button" onClick={()=>void submit()}>Profil zur Prüfung einreichen</button>}{organization?.reviewStatus==="submitted"&&<p className="panelNote">Ihr Profil wartet auf eine eigenständige Entscheidung der Administration.</p>}</PortalPanel>;
}

export function EntrepreneurNeedsPanel(){
 const {needs,error}=useEntrepreneurState();
 return <PortalPanel id="bedarfe" eyebrow="BEDARFSMANAGEMENT" title="Meine Bedarfe" action={<Link className="portalLink" href="/portal/unternehmen/bedarfe">Bedarfsverwaltung öffnen →</Link>}>{error&&<p className="portalInlineAlert" role="alert">{error}</p>}{needs.length?<div className="dashboardNeedList">{needs.slice(0,3).map(need=><article key={need.id}><div><Status tone={need.status==="active"?"teal":need.status==="submitted"?"blue":["closed","rejected"].includes(need.status)?"gray":"amber"}>{statusLabel[need.status]||need.status}</Status><h3>{need.title}</h3><p>{need.categoryId}</p></div><Link href="/portal/unternehmen/bedarfe">{need.status==="draft"?"Prüfen und einreichen":"Status ansehen"} →</Link></article>)}</div>:<PortalEmpty icon="◇" title="Noch kein Bedarf angelegt" text="Beschreiben Sie die gesuchte Dienstleistung oder lassen Sie sich von der KI durch die Bedarfserstellung führen." action="Ersten Bedarf erstellen"/>}</PortalPanel>;
}
