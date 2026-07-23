"use client";

import { useEffect, useState } from "react";
import { getPortalSession, portalRequest } from "../lib/portal-api";
import { PortalEmpty, PortalPanel, PortalStats, Status } from "./portal-shell";

type Page = { id:string; title:string; summary:string; reviewStatus:string };
type Chance = { match:{id:string;score:number;status:string}; need:{title:string;description:string} };
type Provider = {
  organization:{id:string;displayName:string;reviewStatus:string};
  pages:Page[];
  chances:Chance[];
};

export function AdminProviderSnapshot(){
  const [providers,setProviders]=useState<Provider[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [message,setMessage]=useState("Produktive Dienstleisterdaten werden geladen …");
  useEffect(()=>{
    const token=getPortalSession();
    if(!token){setMessage("Bitte melden Sie sich erneut als Plattformadministrator an.");return}
    portalRequest<{organizations:Provider[]}>("/admin/reviews/providers/snapshot",{token})
      .then(result=>{setProviders(result.organizations);setSelectedId(result.organizations[0]?.organization.id??"");setMessage("")})
      .catch(error=>setMessage(error instanceof Error?error.message:"Die Dienstleisterdaten konnten nicht geladen werden."));
  },[]);
  const selected=providers.find(item=>item.organization.id===selectedId);
  return <>
    {message&&<p className="portalInlineAlert" role="status">{message}</p>}
    {providers.length>0&&<label className="portalSnapshotSelector">Dienstleister auswählen<select value={selectedId} onChange={event=>setSelectedId(event.target.value)}>{providers.map(item=><option key={item.organization.id} value={item.organization.id}>{item.organization.displayName}</option>)}</select></label>}
    {!message&&!selected&&<PortalEmpty icon="◇" title="Noch kein Dienstleisterkonto vorhanden" text="Sobald sich ein Unternehmen als Dienstleister registriert, erscheint sein tatsächlicher Status hier. Es werden keine Beispieldaten eingesetzt."/>}
    {selected&&<>
      <PortalStats items={[[String(selected.pages.length),"Leistungsseiten","Tatsächlich gespeichert"],[String(selected.chances.length),"Geschäftschancen","Vom Unternehmen freigegeben"],[String(selected.pages.filter(page=>page.reviewStatus==="submitted").length),"In Prüfung","Eigener Prüfstatus"],[String(selected.chances.filter(chance=>chance.match.status==="mutual_match").length),"Kontakte","Beidseitig freigegeben"]]}/>
      <div className="portalGrid wideLeft">
        <PortalPanel eyebrow="POSITIONIERUNG" title="Leistungsseiten">{selected.pages.length?<div className="needRows">{selected.pages.map(page=><article key={page.id}><div><Status tone={page.reviewStatus==="approved"?"teal":page.reviewStatus==="submitted"?"blue":"amber"}>{page.reviewStatus}</Status><h3>{page.title}</h3><p>{page.summary}</p></div></article>)}</div>:<PortalEmpty icon="◇" title="Keine Leistungsseite" text="Dieses Dienstleisterkonto hat noch keine Leistungsseite gespeichert."/>}</PortalPanel>
        <PortalPanel eyebrow="GESCHÄFTSCHANCEN" title="Freigegebene Bedarfe">{selected.chances.length?<div className="needRows">{selected.chances.map(item=><article key={item.match.id}><div><Status tone="teal">{item.match.score} % passend</Status><h3>{item.need.title}</h3><p>{item.need.description}</p></div></article>)}</div>:<PortalEmpty icon="◎" title="Keine freigegebenen Bedarfe" text="Für dieses Konto wurde noch keine Geschäftschance freigegeben."/>}</PortalPanel>
      </div>
    </>}
  </>;
}
