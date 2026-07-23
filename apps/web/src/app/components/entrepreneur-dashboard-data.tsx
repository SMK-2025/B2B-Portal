"use client";

import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
import {PORTAL_UPDATE_EVENT} from "../lib/entrepreneur-state";
import {PortalEmpty,PortalPanel,PortalStats,Status} from "./portal-shell";

type Organization={id:string};
type Need={id:string;status:string};
type MatchItem={match:{id:string;score:number;status:string};service:{title:string;summary:string}};
type Activity={id:string;type:string;createdAt:string};

export function EntrepreneurDashboardData(){
 const [needs,setNeeds]=useState<Need[]>([]),[matches,setMatches]=useState<MatchItem[]>([]),[activities,setActivities]=useState<Activity[]>([]),[error,setError]=useState("");
 const refresh=useCallback(async()=>{const token=getPortalSession();if(!token){setError("Bitte melden Sie sich erneut an.");return}try{const organizations=await portalRequest<Organization[]>("/organizations/mine",{token}),organization=organizations[0];if(!organization){setNeeds([]);setMatches([]);setActivities([]);setError("");return}const [needData,matchData,timeline]=await Promise.all([portalRequest<Need[]>(`/organizations/${organization.id}/needs`,{token}),portalRequest<MatchItem[]>("/buyer/matches",{token}),portalRequest<Activity[]>(`/organizations/${organization.id}/timeline`,{token})]);setNeeds(needData);setMatches(matchData);setActivities(timeline);setError("")}catch(reason){setError(reason instanceof Error?reason.message:"Die Übersichtskennzahlen konnten nicht geladen werden.")}},[]);
 useEffect(()=>{void refresh();const listener=()=>void refresh();window.addEventListener(PORTAL_UPDATE_EVENT,listener);return()=>window.removeEventListener(PORTAL_UPDATE_EVENT,listener)},[refresh]);
 const activeNeeds=needs.filter(need=>need.status==="active").length,contacts=matches.filter(item=>item.match.status==="mutual_match").length;
 return <>{error&&<p className="portalInlineAlert" role="alert">{error}</p>}<PortalStats items={[[String(activeNeeds),"Aktive Bedarfe","Produktiv freigegeben"],[String(matches.length),"Matches","Tatsächlich berechnet"],[String(contacts),"Kontakte","Beidseitig freigegeben"],[String(activities.length),"Aktivitäten","Serverseitig dokumentiert"]]}/>
 <PortalPanel id="matches" eyebrow="MATCHING" title="Aktuelle Empfehlungen" action={<Link className="portalLink" href="/portal/unternehmen/matches">Matching-Zentrale öffnen →</Link>}>{matches.length?<div className="dashboardNeedList">{matches.slice(0,3).map(item=><article key={item.match.id}><div><Status tone="teal">{item.match.score} % passend</Status><h3>{item.service.title}</h3><p>{item.service.summary}</p></div><Link href="/portal/unternehmen/matches">Prüfen →</Link></article>)}</div>:<PortalEmpty icon="◎" title="Noch keine Matches" text="Matches erscheinen erst nach Freigabe eines Bedarfs und einer tatsächlich passenden, geprüften Leistungsseite."/>}</PortalPanel>
 <PortalPanel id="historie" eyebrow="AKTIVITÄTSDOKUMENTATION" title="Letzte Aktivitäten" action={<Link className="portalLink" href="/portal/unternehmen/aktivitaeten">Gesamte Historie öffnen →</Link>}>{activities.length?<div className="activity">{activities.slice(0,5).map(item=><p key={item.id}><span/><small>{new Date(item.createdAt).toLocaleString("de-DE")}</small><strong>{activityLabel(item.type)}</strong></p>)}</div>:<PortalEmpty icon="↗" title="Noch keine Aktivitäten" text="Gespeicherte Statusänderungen, Match-Entscheidungen, Nachrichten und Termine erscheinen nach ihrer ersten tatsächlichen Ausführung."/>}</PortalPanel></>;
}

function activityLabel(type:string){const labels:Record<string,string>={message_sent:"Nachricht gesendet",meeting_proposed:"Termin vorgeschlagen",match_released:"Match freigegeben",identity_released:"Kontaktdaten freigegeben",need_submitted:"Bedarf eingereicht"};return labels[type]??type.replaceAll("_"," ")}
