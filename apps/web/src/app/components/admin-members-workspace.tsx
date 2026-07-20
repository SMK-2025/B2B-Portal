"use client";

import {useEffect,useMemo,useState} from "react";
import {getPortalSession,portalRequest} from "../lib/portal-api";
import {PortalPanel} from "./portal-shell";

type Member={id:string;legalName:string;displayName:string;role:"buyer"|"provider"|"both";websiteUrl:string|null;reviewStatus:"draft"|"submitted"|"changes_requested"|"approved"|"rejected"|"suspended";createdAt:string;users:Array<{id:string;firstName:string;lastName:string;email:string;role:string;lastActiveAt:string|null}>};
const statusLabels:Record<Member["reviewStatus"],string>={draft:"Entwurf",submitted:"In Prüfung",changes_requested:"Änderung angefordert",approved:"Freigegeben",rejected:"Abgelehnt",suspended:"Gesperrt"};
const roleLabels:Record<Member["role"],string>={buyer:"Unternehmer",provider:"Dienstleister",both:"Unternehmer und Dienstleister"};

export function AdminMembersWorkspace(){
 const [members,setMembers]=useState<Member[]>([]);
 const [query,setQuery]=useState("");
 const [status,setStatus]=useState("Alle");
 const [message,setMessage]=useState("Mitglieder werden geladen …");
 useEffect(()=>{const token=getPortalSession();if(!token){setMessage("Bitte erneut als Administrator anmelden.");return}portalRequest<Member[]>("/admin/reviews/members",{token}).then(result=>{setMembers(result);setMessage("")}).catch(error=>setMessage(error instanceof Error?error.message:"Mitglieder konnten nicht geladen werden."))},[]);
 const visible=useMemo(()=>members.filter(member=>(status==="Alle"||statusLabels[member.reviewStatus]===status)&&(!query||`${member.displayName} ${member.legalName} ${member.users.map(user=>`${user.firstName} ${user.lastName} ${user.email}`).join(" ")}`.toLowerCase().includes(query.toLowerCase()))),[members,query,status]);
 return <PortalPanel id="mitglieder" eyebrow="MITGLIEDER & ROLLEN" title="Mitgliederverwaltung">
  <div className="adminMemberToolbar"><label><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Unternehmen, Person oder E-Mail suchen"/></label><select value={status} onChange={event=>setStatus(event.target.value)} aria-label="Mitgliederstatus filtern"><option>Alle</option><option>Entwurf</option><option>In Prüfung</option><option>Freigegeben</option><option>Änderung angefordert</option><option>Abgelehnt</option><option>Gesperrt</option></select></div>
  <div className="adminMemberSummary"><span><b>{members.length}</b> Unternehmen</span><span><b>{members.reduce((total,member)=>total+member.users.length,0)}</b> Zugänge</span><span><b>{members.filter(member=>member.reviewStatus==="approved").length}</b> freigegeben</span></div>
  {message?<p className="panelNote">{message}</p>:visible.length?<div className="adminMemberRows">{visible.map(member=><article key={member.id}><span className="networkMemberAvatar">{member.displayName.slice(0,2).toUpperCase()}</span><div><h3>{member.displayName}</h3><p>{roleLabels[member.role]} · {member.websiteUrl||"Keine Website hinterlegt"}</p><small>{member.users.length?member.users.map(user=>`${user.firstName} ${user.lastName} · ${user.email}`).join(" | "):"Noch kein Benutzer zugeordnet"} · Registriert am {new Date(member.createdAt).toLocaleDateString("de-DE")}</small></div><b className={`portalStatus ${member.reviewStatus==="approved"?"teal":member.reviewStatus==="submitted"?"blue":member.reviewStatus==="rejected"?"red":"amber"}`}>{statusLabels[member.reviewStatus]}</b></article>)}</div>:<div className="portalEmpty"><span>◇</span><h3>Keine passenden Mitglieder gefunden</h3><p>Ändern Sie Suche oder Statusfilter.</p></div>}
 </PortalPanel>;
}
