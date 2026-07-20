"use client";

import {useEffect,useMemo,useState} from "react";
import type {FormEvent,ReactNode} from "react";
import {PORTAL_UPDATE_EVENT,readNeeds,type StoredNeed,writeNeeds} from "../lib/entrepreneur-state";
import {getPortalSession,portalRequest} from "../lib/portal-api";

const tabs=["Alle","Entwürfe","In Prüfung","Aktiv","Pausiert","Archiv"];
const tabStatus:Record<string,StoredNeed["status"]|undefined>={"Entwürfe":"Entwurf","In Prüfung":"In Prüfung","Aktiv":"Aktiv","Pausiert":"Pausiert","Archiv":"Archiv"};
type IconName="edit"|"copy"|"eye"|"trash"|"pause"|"play";

function Icon({name}:{name:IconName}){
 const paths:Record<IconName,ReactNode>={
  edit:<><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  copy:<><rect width="13" height="13" x="9" y="9" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
  eye:<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
  trash:<><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></>,
  pause:<><path d="M8 5v14M16 5v14"/></>,
  play:<path d="m8 5 11 7-11 7Z"/>
 };
 return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function Action({label,icon,tone,onClick}:{label:string;icon:IconName;tone?:string;onClick:()=>void}){
 return <button type="button" className={`needIconAction ${tone||""}`} aria-label={label} title={label} onClick={event=>{event.stopPropagation();onClick()}}><Icon name={icon}/><span>{label}</span></button>;
}

export function NeedsWorkspace(){
 const [needs,setNeeds]=useState<StoredNeed[]>([]);
 const [tab,setTab]=useState("Alle");
 const [query,setQuery]=useState("");
 const [editing,setEditing]=useState<StoredNeed|null>(null);
 const [preview,setPreview]=useState<StoredNeed|null>(null);
 const [deleting,setDeleting]=useState<StoredNeed|null>(null);
 const [syncMessage,setSyncMessage]=useState("");
 const refresh=()=>setNeeds(readNeeds());
 useEffect(()=>{const stored=readNeeds();setNeeds(stored);const previewId=sessionStorage.getItem("b2b-matching-preview-need");if(previewId){setPreview(stored.find(need=>need.id===previewId)||null);sessionStorage.removeItem("b2b-matching-preview-need")}void syncSubmitted(stored);window.addEventListener(PORTAL_UPDATE_EVENT,refresh);return()=>window.removeEventListener(PORTAL_UPDATE_EVENT,refresh)},[]);
 const visible=useMemo(()=>needs.filter(need=>(!tabStatus[tab]||need.status===tabStatus[tab])&&(!query||`${need.title} ${need.category} ${need.summary}`.toLowerCase().includes(query.toLowerCase()))),[needs,query,tab]);

 function replace(next:StoredNeed){writeNeeds(needs.map(need=>need.id===next.id?next:need));setNeeds(readNeeds())}
 async function syncSubmitted(source:StoredNeed[]){
  const token=getPortalSession();if(!token)return;
  const pending=source.filter(need=>need.status==="In Prüfung"&&!need.remoteId);
  try{
   const organizations=await portalRequest<Array<{id:string}>>("/organizations/mine",{token});const organization=organizations[0];if(!organization)return;
   let next=[...source];
   for(const need of pending){
    const remote=await portalRequest<{id:string}>(`/organizations/${organization.id}/needs`,{token,body:{title:need.title,description:need.summary||need.title,categoryId:need.category||"Sonstige Dienstleistungen",requiredSkills:need.details?.filter(item=>/keyword|fachkennt|kompetenz/i.test(item.label)).flatMap(item=>item.value.split(",").map(value=>value.trim()).filter(Boolean))||[],preferredIndustries:[],region:null,deliveryModes:["hybrid"],details:need.details||[],submitForReview:true}});
    next=next.map(item=>item.id===need.id?{...item,remoteId:remote.id}:item);
   }
   const remoteNeeds=await portalRequest<Array<{id:string;status:string}>>(`/organizations/${organization.id}/needs`,{token});
   const statusMap:Record<string,StoredNeed["status"]>={draft:"Entwurf",submitted:"In Prüfung",active:"Aktiv",changes_requested:"Entwurf",rejected:"Archiv",paused:"Pausiert",closed:"Archiv"};
   next=next.map(item=>item.remoteId?{...item,status:statusMap[remoteNeeds.find(remote=>remote.id===item.remoteId)?.status||""]||item.status}:item);
   writeNeeds(next);setNeeds(next);setSyncMessage("Der Bedarf wurde an die zentrale Prüfung übermittelt.");
  }catch(error){setSyncMessage(error instanceof Error?error.message:"Die zentrale Übermittlung ist fehlgeschlagen.")}
 }
 function update(need:StoredNeed,status:StoredNeed["status"]){const next={...need,status,updatedAt:new Date().toISOString()};replace(next);setPreview(status==="In Prüfung"?null:preview);if(status==="In Prüfung")void syncSubmitted(readNeeds())}
 function duplicate(need:StoredNeed){writeNeeds([{...need,id:crypto.randomUUID(),title:`${need.title} (Kopie)`,status:"Entwurf",updatedAt:new Date().toISOString()},...needs]);refresh()}
 function remove(need:StoredNeed){writeNeeds(needs.filter(item=>item.id!==need.id));setDeleting(null);refresh()}
 function saveEdit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!editing)return;
  const data=new FormData(event.currentTarget);
  const details=editing.details?.map((detail,index)=>({...detail,value:String(data.get(`detail-${index}`)??detail.value).trim()}));
  const next={...editing,title:String(data.get("title")||"").trim(),category:String(data.get("category")||"").trim(),summary:String(data.get("summary")||"").trim(),details,status:"Entwurf" as const,updatedAt:new Date().toISOString()};
  replace(next);setEditing(null);setPreview(next);
 }

 return <><div className="workspaceToolbar"><div className="workspaceTabs">{tabs.map(item=><button type="button" className={tab===item?"active":""} key={item} onClick={event=>{event.stopPropagation();setTab(item)}}>{item} <b>{item==="Alle"?needs.length:needs.filter(need=>need.status===tabStatus[item]).length}</b></button>)}</div><label className="workspaceFilter"><span>⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Bedarfe filtern" aria-label="Bedarfe filtern"/></label></div>
 <div className="portalStats">{[[""+needs.length,"Gesamte Bedarfe"],[""+needs.filter(n=>n.status==="Aktiv").length,"Aktive Suchen"],["0","Gefundene Matches"],["0","Profilaufrufe"]].map(([value,label])=><article key={label}><strong>{value}</strong><span>{label}<small>{needs.length?"Aktueller Stand":"Noch keine Einträge"}</small></span></article>)}</div>
 <section className="portalPanel"><div className="portalPanelTitle"><span>BEDARFSZENTRALE</span><h2>Ihre Bedarfe</h2></div>{visible.length?<div className="needRows">{visible.map(need=><article key={need.id}><div><span className={`status ${need.status==="Aktiv"?"teal":need.status==="In Prüfung"?"blue":need.status==="Archiv"?"gray":"amber"}`}>{need.status}</span><h3>{need.title}</h3><p>{need.category}{need.summary?` · ${need.summary}`:""}</p><small>Zuletzt geändert: {new Date(need.updatedAt).toLocaleDateString("de-DE")}</small></div><div className="needIconActions">{need.status==="Entwurf"&&<Action label="Bedarf bearbeiten" icon="edit" onClick={()=>setEditing(need)}/>}<Action label="Dienstleisteransicht prüfen" icon="eye" tone="primary" onClick={()=>setPreview(need)}/><Action label="Bedarf duplizieren" icon="copy" onClick={()=>duplicate(need)}/>{need.status==="Aktiv"&&<Action label="Bedarf pausieren" icon="pause" onClick={()=>update(need,"Pausiert")}/>} {need.status==="Pausiert"&&<Action label="Bedarf reaktivieren" icon="play" onClick={()=>update(need,"Aktiv")}/>}<Action label="Bedarf löschen" icon="trash" tone="danger" onClick={()=>setDeleting(need)}/></div></article>)}</div>:<div className="portalEmpty"><span aria-hidden="true">◇</span><h3>{needs.length?"Keine Bedarfe in dieser Ansicht":"Erstellen Sie Ihren ersten Bedarf"}</h3><p>{needs.length?"Ändern Sie Filter oder Statusauswahl.":"Nutzen Sie die ausführliche Erfassung oder lassen Sie einen strukturierten Entwurf mit dem KI-Assistenten erstellen."}</p>{!needs.length&&<button className="portalSecondary">Ersten Bedarf erstellen</button>}</div>}</section>
 {editing&&<div className="needModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditing(null)}}><section className="needManageModal" role="dialog" aria-modal="true" aria-labelledby="edit-need-title"><header><div><span>BEDARF BEARBEITEN</span><h2 id="edit-need-title">{editing.title}</h2></div><button type="button" aria-label="Schließen" onClick={()=>setEditing(null)}>×</button></header><form onSubmit={saveEdit}><label>Titel des Bedarfs<input name="title" required defaultValue={editing.title}/></label><label>Kategorie<input name="category" required defaultValue={editing.category}/></label><label>Beschreibung und gewünschte Unterstützung<textarea name="summary" required rows={8} defaultValue={editing.summary}/></label>{editing.details?.map((detail,index)=><label key={`${detail.label}-${index}`}>{detail.label}<textarea name={`detail-${index}`} rows={3} defaultValue={detail.value}/></label>)}<p>Nach dem Speichern öffnet sich automatisch die anonymisierte Dienstleisteransicht.</p><footer><button type="button" className="portalSecondary" onClick={()=>setEditing(null)}>Abbrechen</button><button type="submit" className="portalPrimary">Speichern und Vorschau öffnen</button></footer></form></section></div>}
 {preview&&<div className="needModalBackdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setPreview(null)}}><section className="needManageModal preview" role="dialog" aria-modal="true" aria-labelledby="preview-need-title"><header><div><span>ANONYMISIERTE DIENSTLEISTERANSICHT</span><h2 id="preview-need-title">So wird Ihr Bedarf angezeigt</h2></div><button type="button" aria-label="Schließen" onClick={()=>setPreview(null)}>×</button></header><div className="needProviderPreview"><div className="anonymousPreview"><span>◉</span><div><b>Anonymisiertes Unternehmen</b><small>Firmenname und Kontaktdaten bleiben bis zu Ihrer Freigabe verborgen.</small></div></div><span className="status amber">{preview.status}</span><h2>{preview.title}</h2><p className="previewCategory">{preview.category}</p><section><h3>Ausgangslage und gewünschte Unterstützung</h3><p>{preview.summary||"Noch keine Beschreibung hinterlegt."}</p></section>{preview.details&&preview.details.length>0&&<section><h3>Weitere matchingrelevante Angaben</h3><dl>{preview.details.filter(detail=>detail.value!==preview.title&&detail.value!==preview.summary).slice(0,18).map((detail,index)=><div key={`${detail.label}-${index}`}><dt>{detail.label}</dt><dd>{detail.value}</dd></div>)}</dl></section>}<div className="previewPrivacyNote">Ihre Unternehmensidentität wird nicht angezeigt. Sie entscheiden später für jeden Match einzeln über die Freigabe.</div></div><footer><button type="button" className="portalSecondary" onClick={()=>setPreview(null)}>Zurück</button>{preview.status==="Entwurf"&&<button type="button" className="portalPrimary" onClick={()=>update(preview,"In Prüfung")}>Zur Prüfung einreichen</button>}</footer></section></div>}
 {deleting&&<div className="needModalBackdrop" role="presentation"><section className="needManageModal confirm" role="alertdialog" aria-modal="true" aria-labelledby="delete-need-title"><header><div><span>BEDARF LÖSCHEN</span><h2 id="delete-need-title">Bedarf wirklich löschen?</h2></div></header><p>„{deleting.title}“ wird dauerhaft aus dieser Ansicht entfernt. Dieser Schritt kann nicht rückgängig gemacht werden.</p><footer><button type="button" className="portalSecondary" onClick={()=>setDeleting(null)}>Abbrechen</button><button type="button" className="portalDanger" onClick={()=>remove(deleting)}>Endgültig löschen</button></footer></section></div>}
 </>;
}
